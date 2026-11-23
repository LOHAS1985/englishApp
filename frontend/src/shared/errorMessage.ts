/**
 * 失敗したときに画面に出す文言。API の呼び出し(`api/http.ts`)は日本語の文言を付けた Error を投げるので、
 * それを使い、それ以外(想定外の値)は既定の文言にする
 */
export function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
