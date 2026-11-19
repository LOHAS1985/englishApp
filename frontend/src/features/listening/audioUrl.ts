/**
 * あらかじめ作って GitHub Releases に置いたリスニングの音声(scripts/audio/pregenerate.py)の URL。
 * 音声は初めて再生したときにサーバーで作ると、Render のディスクがデプロイで消えるたびに作り直しになり、
 * 音声を作る edge-tts が止まるとブラウザの声に切り替わって品質も下がるので、先に作って置いておく。
 */
const RELEASE_BASE = "https://github.com/LOHAS1985/englishApp/releases/download";

/**
 * セット ID(l0467 など)の音声の URL。置き場所のリリース名は ID 1000 ごとに分ける
 * (1つのリリースに置けるのは1000ファイルまで。pregenerate.py の release_tag と同じ規則)。
 * リスニングのセット ID 以外は null
 */
export function pregeneratedAudioUrl(setId: string): string | null {
  const m = /^l(\d+)$/.exec(setId);
  if (!m) return null;
  const bucket = Math.floor(Number(m[1]) / 1000) + 1;
  return `${RELEASE_BASE}/audio-${bucket}/${setId}.mp3`;
}

/**
 * 音声を先に読み込んでおく(再生ボタンを押したときに待たないように)。音声があると分かったら(メタデータを読めたら)
 * その要素を返す。要素は preload="auto" なので、その後も裏で読み込みを続け、同じ要素で再生すれば読み込み直さない
 * (iPhone の Safari は再生するまで本体を読まないことがあるので、canplay は待たない)。
 * 置いていない音声・通信の失敗・時間切れは null(サーバーで作る方法に切り替える)
 */
export function preloadAudio(src: string, timeoutMs = 5000): Promise<HTMLAudioElement | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      audio.removeEventListener("loadedmetadata", onReady);
      audio.removeEventListener("error", onError);
      if (!ok) {
        audio.removeAttribute("src");
        audio.load();
      }
      resolve(ok ? audio : null);
    };
    const onReady = () => finish(true);
    const onError = () => finish(false);
    const timer = setTimeout(() => finish(false), timeoutMs);
    audio.addEventListener("loadedmetadata", onReady);
    audio.addEventListener("error", onError);
    audio.preload = "auto";
    audio.src = src;
    audio.load();
  });
}
