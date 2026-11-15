import { useEffect, type RefObject } from "react";

/**
 * 問題画面のキーボード操作。
 * - 1〜9 / a〜z で選択肢を選ぶ(1 = A、2 = B …。選択肢の数を超えるキーは無視する)
 * - Enter で「解答する」「次の問題」
 */

/** 押したキーが指す選択肢の位置(0始まり)。選択肢でないキー・範囲外は null */
export function choiceIndexFromKey(key: string, count: number): number | null {
  let index: number;
  if (/^[1-9]$/.test(key)) index = Number(key) - 1;
  else if (/^[a-zA-Z]$/.test(key)) index = key.toLowerCase().charCodeAt(0) - "a".charCodeAt(0);
  else return null;
  return index < count ? index : null;
}

/** 文字を入力中の場所(入力欄など)では、ショートカットを効かせない */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export interface QuizKeyActions {
  /** 選択肢のキー。index は 0 始まりの表示順 */
  onChoice?: (index: number) => void;
  /** Enter。ボタンにフォーカスがあるときは、そのボタン自身の動作に任せるので呼ばれない */
  onEnter?: () => void;
}

/**
 * @param enabled false の間はキーを受け付けない(解答済み・通信中など)
 * @param actions 最新の操作を入れた ref。呼び出し側が毎回の描画後に更新する(リスナーは作り直さない)
 */
export function useQuizKeys(enabled: boolean, actions: RefObject<QuizKeyActions>) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || isTypingTarget(e.target)) return;
      if (e.key === "Enter") {
        // ボタンで Enter を押したときは、そのボタンのクリックが動くので二重に動かさない
        if (e.target instanceof HTMLElement && ["BUTTON", "A", "SUMMARY"].includes(e.target.tagName)) return;
        const onEnter = actions.current.onEnter;
        if (onEnter) {
          e.preventDefault();
          onEnter();
        }
        return;
      }
      const handler = actions.current.onChoice;
      if (!handler) return;
      const index = choiceIndexFromKey(e.key, 26);
      if (index !== null) {
        e.preventDefault();
        handler(index);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, actions]);
}
