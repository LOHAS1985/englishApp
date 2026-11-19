import { synthesizeListeningAudio, toAbsoluteApiUrl } from "../../api/client";
import { preloadAudio, pregeneratedAudioUrl } from "./audioUrl";

/** 再生の準備の結果。音声ファイル(読み込み済みの要素つき)か、ブラウザの読み上げ */
export type Prepared = { kind: "audio"; urls: string[]; first: HTMLAudioElement | null } | { kind: "browser" };

/**
 * 音声を用意する。置いてある音声 → サーバーで作る音声 → ブラウザの読み上げ の順に試す。
 * 再生ボタンを押す前(問題を出した時点)に始めて、押したときの待ちをなくす。
 */
export async function prepareAudio(setId: string): Promise<Prepared> {
  const prepared = pregeneratedAudioUrl(setId);
  if (prepared) {
    const audio = await preloadAudio(prepared);
    if (audio) return { kind: "audio", urls: [prepared], first: audio };
  }
  try {
    const res = await synthesizeListeningAudio(setId);
    const urls = (res.audioUrls ?? (res.audioUrl ? [res.audioUrl] : [])).map(toAbsoluteApiUrl);
    if (urls.length === 0) throw new Error("no audio");
    // 先頭のファイルも読み込んでおく(失敗しても、再生時に読み込み直す)
    return { kind: "audio", urls, first: await preloadAudio(urls[0]!) };
  } catch {
    return { kind: "browser" };
  }
}

/**
 * 先に準備を始めた音声(次のセットなど)。表示したときに使い、使ったら消す。
 * 解答中に次のセットの音声を読み込んでおき、「次の問題」で出したセットをすぐ再生できるようにする
 */
const warmed = new Map<string, Promise<Prepared>>();

/** 音声の準備を先に始める(画面にまだ出していないセット)。持つのは数件だけにする */
export function warmUpListeningAudio(setId: string) {
  if (warmed.has(setId)) return;
  warmed.set(setId, prepareAudio(setId));
  while (warmed.size > 3) warmed.delete(warmed.keys().next().value!);
}

/** 表示するセットの音声の準備。先に始めていればそれを使い(使ったら消す)、無ければここで始める */
export function takePreparedAudio(setId: string): Promise<Prepared> {
  const promise = warmed.get(setId) ?? prepareAudio(setId);
  warmed.delete(setId);
  return promise;
}
