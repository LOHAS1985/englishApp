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
 * 音声を読み込めるか確かめる。置いていない音声や通信の失敗は、すぐ(または時間切れで)false になるので、
 * その場合は今までどおりサーバーで作る方法に切り替える。
 */
export function canLoadAudio(src: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      // 読み込みを止める(確かめるだけなので、全部は読まない)
      audio.removeAttribute("src");
      audio.load();
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    audio.addEventListener("loadedmetadata", () => finish(true));
    audio.addEventListener("error", () => finish(false));
    audio.preload = "metadata";
    audio.src = src;
  });
}
