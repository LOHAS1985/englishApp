#!/usr/bin/env python3
"""
リスニングの音声をあらかじめ作り、GitHub Releases に置く。

なぜ: 音声は初めて再生したときにサーバーで作っているが、Render のディスクはデプロイで消える(毎日 push するので毎日消える)。
また、音声は edge-tts(公式ではない Microsoft のサービス)に頼っていて、止まるとブラウザの声に切り替わり品質が下がる。
あらかじめ作って置いておけば、最初の再生から速く、サービスの不具合の影響も受けない。

しくみ: ローカルで動かしたバックエンドの `POST /api/listening/practice/{id}/audio` を、全セットに対して呼ぶ
(Part 2 の台本の組み立てや行の結合を、バックエンドの処理のまま使う)。できた mp3 を `<セットID>.mp3` の名前で
リリース `audio-<ID を1000で割った商 + 1>` に添付する(1つのリリースに置けるのは1000ファイルまでなので、ID 1000ごとに分ける)。
画面は `frontend/src/shared/audioUrl.ts` で同じ名前の URL を組み立てて再生し、無ければ今までどおりサーバーで作る。

使い方(リポジトリのルートで。バックエンドを `./mvnw spring-boot:run` で起動しておく):
  python scripts/audio/pregenerate.py                 # 全セットのうち、まだ置いていないものを作って置く
  python scripts/audio/pregenerate.py --limit 3       # 先頭の3セットだけ(試すとき)
  python scripts/audio/pregenerate.py --ids l0467     # 指定したセットだけ(台本を直したあとの作り直しにも使う)
  python scripts/audio/pregenerate.py --no-upload     # 作るだけ(アップロードしない)
途中で止まっても、同じコマンドをもう一度実行すれば、リリースに置いていない分だけ続きから作る(別のPCで置いた分も飛ばす。台本を直したセットは --ids か --force で作り直す)。
"""
import argparse
import concurrent.futures
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUESTIONS = ROOT / "backend" / "src" / "main" / "resources" / "questions" / "listening"
# バックエンドを backend/ で起動したときの、音声の保存先(TtsService の genDir)
GENERATED = ROOT / "backend" / "static" / "audio" / "generated"
WORK = ROOT / "build" / "audio"
STATE = WORK / "state.json"

# 1ファイルが小さすぎるときは、作成に失敗したとみなす(正常なら 10 秒でも 100KB 前後ある)
MIN_BYTES = 20_000
UPLOAD_BATCH = 20
# 続けて失敗したら、edge-tts が止められている(403 など)と考えて中断する
MAX_CONSECUTIVE_FAILURES = 8


LOG_FILE = None


def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    # 予約実行では PowerShell を通すと文字化けするので、ログは自分でファイルに書く(UTF-8)
    if LOG_FILE:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")


def release_tag(set_id):
    """セット ID(l0467 など)を置くリリース名。1つのリリースは1000ファイルまでなので、ID 1000ごとに分ける"""
    n = int(re.sub(r"\D", "", set_id))
    return f"audio-{n // 1000 + 1}"


def all_set_ids():
    ids = []
    for f in sorted(QUESTIONS.glob("*.json")):
        for s in json.loads(f.read_text(encoding="utf-8")):
            ids.append(s["id"])
    return ids


def load_state():
    if STATE.exists():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {}


def save_state(state):
    WORK.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")


def synthesize(backend, set_id, attempts=3):
    """バックエンドで音声を作り、できたファイルのパスとキー(台本+声の設定のハッシュ)を返す"""
    last = None
    for attempt in range(1, attempts + 1):
        try:
            req = urllib.request.Request(f"{backend}/api/listening/practice/{set_id}/audio", method="POST")
            with urllib.request.urlopen(req, timeout=300) as res:
                body = json.loads(res.read().decode("utf-8"))
            url = body.get("audioUrl")
            if not url:
                urls = body.get("audioUrls") or []
                raise RuntimeError(f"1ファイルにまとまっていない: {len(urls)} 個")
            path = GENERATED / Path(url).name
            if not path.exists() or path.stat().st_size < MIN_BYTES:
                raise RuntimeError(f"ファイルが無い、または小さすぎる: {path.name}")
            return path, path.stem
        except Exception as e:  # noqa: BLE001 - 失敗の理由は問わず、待って再試行する
            last = e
            detail = getattr(e, "read", None)
            if detail:
                try:
                    last = f"{e} {e.read().decode('utf-8', 'replace')[:200]}"
                except Exception:  # noqa: BLE001
                    pass
            if attempt < attempts:
                wait = 20 * attempt
                log(f"  {set_id}: 失敗({str(last)[:120]})。{wait} 秒待って再試行 {attempt}/{attempts - 1}")
                time.sleep(wait)
    raise RuntimeError(str(last)[:300])


def duration_seconds(path):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=30,
        ).stdout.strip()
        return float(out)
    except Exception:  # noqa: BLE001
        return None


def existing_assets(tags):
    """リリースにすでに置いてあるファイル名の集合(別のPC・別の実行で置いた分も含めて、作り直さないため)"""
    names = set()
    for tag in tags:
        r = subprocess.run(["gh", "api", f"repos/{{owner}}/{{repo}}/releases/tags/{tag}", "-q", ".id"],
                           capture_output=True, text=True, cwd=ROOT)
        if r.returncode != 0 or not r.stdout.strip():
            continue  # リリースがまだ無い
        rid = r.stdout.strip()
        r = subprocess.run(["gh", "api", "--paginate", f"repos/{{owner}}/{{repo}}/releases/{rid}/assets?per_page=100",
                            "-q", ".[].name"], capture_output=True, text=True, cwd=ROOT)
        if r.returncode == 0:
            names.update(line.strip() for line in r.stdout.splitlines() if line.strip())
    return names


def ensure_release(tag):
    if subprocess.run(["gh", "release", "view", tag], capture_output=True, cwd=ROOT).returncode == 0:
        return
    log(f"リリース {tag} を作る")
    subprocess.run(
        ["gh", "release", "create", tag, "--title", f"リスニングの音声 {tag}",
         "--notes", "リスニング問題の音声(scripts/audio/pregenerate.py で作成)。画面が `<セットID>.mp3` の名前で再生する。",
         "--target", "main"],
        check=True, cwd=ROOT,
    )


def upload(tag, files):
    ensure_release(tag)
    for attempt in range(1, 4):
        r = subprocess.run(["gh", "release", "upload", tag, "--clobber", *map(str, files)],
                           capture_output=True, text=True, cwd=ROOT)
        if r.returncode == 0:
            return
        log(f"  アップロード失敗({r.stderr.strip()[:160]})。再試行 {attempt}/2")
        time.sleep(15 * attempt)
    raise RuntimeError("アップロードに失敗した")


def main():
    # ログをファイルに出すとき(予約実行)に、日本語が文字化けしないようにする
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--backend", default="http://localhost:8080")
    ap.add_argument("--workers", type=int, default=3, help="同時に作る数(多いと Microsoft に止められやすい)")
    ap.add_argument("--limit", type=int, default=0, help="先頭からこの数のセットだけ処理する(0 は全部)")
    ap.add_argument("--ids", default="", help="処理するセット ID をカンマ区切りで指定する")
    ap.add_argument("--no-upload", action="store_true", help="作るだけで、アップロードしない")
    ap.add_argument("--force", action="store_true", help="アップロード済みでも作り直して置き換える")
    ap.add_argument("--log-file", default="", help="ログをこのファイルにも追記する(UTF-8)")
    args = ap.parse_args()
    global LOG_FILE
    LOG_FILE = args.log_file or None

    ids = [i for i in args.ids.split(",") if i] or all_set_ids()
    if args.limit:
        ids = ids[: args.limit]
    state = load_state()
    WORK.mkdir(parents=True, exist_ok=True)
    # すでにリリースにあるセットは飛ばす。台本を直したあとの作り直しは --ids か --force で行う(内容の変化までは見ない)
    if not args.ids and not args.force and not args.no_upload:
        present = existing_assets(sorted({release_tag(i) for i in ids}))
        skipped = [i for i in ids if f"{i}.mp3" in present]
        ids = [i for i in ids if f"{i}.mp3" not in present]
        log(f"リリースにすでにある {len(skipped)} セットは飛ばす")
    started = time.time()
    log(f"対象 {len(ids)} セット / 同時 {args.workers} / アップロード {'しない' if args.no_upload else 'する'}")

    ok, failed = [], []
    pending_upload = {}  # tag -> [(set_id, key, path)]
    consecutive = 0

    def flush(force=False):
        for tag, items in list(pending_upload.items()):
            if not items or (len(items) < UPLOAD_BATCH and not force):
                continue
            upload(tag, [p for _, _, p in items])
            for set_id, key, _ in items:
                state[set_id] = key
            save_state(state)
            log(f"  {tag} に {len(items)} ファイルをアップロード")
            pending_upload[tag] = []

    def work(set_id):
        path, key = synthesize(args.backend, set_id)
        dst = WORK / f"{set_id}.mp3"
        shutil.copyfile(path, dst)
        return set_id, key, dst

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {}
        for set_id in ids:
            futures[pool.submit(work, set_id)] = set_id
        done_count = 0
        for fut in concurrent.futures.as_completed(futures):
            set_id = futures[fut]
            done_count += 1
            try:
                _, key, dst = fut.result()
            except Exception as e:  # noqa: BLE001
                failed.append((set_id, str(e)))
                consecutive += 1
                log(f"[{done_count}/{len(ids)}] {set_id} 失敗: {str(e)[:160]}")
                if consecutive >= MAX_CONSECUTIVE_FAILURES:
                    log(f"続けて {consecutive} 回失敗したので中断する(edge-tts が止められている可能性)")
                    for f in futures:
                        f.cancel()
                    break
                continue
            consecutive = 0
            ok.append(set_id)
            d = duration_seconds(dst)
            log(f"[{done_count}/{len(ids)}] {set_id} {dst.stat().st_size // 1024}KB {d and round(d)}秒")
            if args.no_upload:
                continue
            # 置いてあって内容も同じなら、アップロードを飛ばす
            if not args.force and state.get(set_id) == key:
                continue
            pending_upload.setdefault(release_tag(set_id), []).append((set_id, key, dst))
            try:
                flush()
            except Exception as e:  # noqa: BLE001
                log(f"アップロードで失敗: {e}")
                failed.append((set_id, f"upload: {e}"))

    if not args.no_upload:
        try:
            flush(force=True)
        except Exception as e:  # noqa: BLE001
            log(f"アップロードで失敗: {e}")
            failed.append(("(最後のアップロード)", str(e)))

    minutes = (time.time() - started) / 60
    report = {"finished": datetime.now().isoformat(timespec="seconds"), "minutes": round(minutes, 1),
              "target": len(ids), "ok": len(ok), "failed": [{"id": i, "reason": r} for i, r in failed]}
    (WORK / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"完了: 成功 {len(ok)} / 失敗 {len(failed)} / {minutes:.1f} 分")
    if failed:
        log("失敗したセット: " + ", ".join(i for i, _ in failed[:30]) + (" ..." if len(failed) > 30 else ""))
        log("もう一度同じコマンドを実行すると、置いていない分だけ続きから作る")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
