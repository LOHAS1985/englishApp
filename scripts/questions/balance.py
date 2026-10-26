"""問題集の正解記号を A〜D に均等に並べ替え、1問1行の JSON に整形する。

usage: python balance.py <questions/<feature> ディレクトリ> <choice|set> [ファイル名のglob]
- choice: 文法・語彙(choices が {label,text} の配列、answer が記号)
- set:    読解・リスニング(questions[].choices が文字列配列、answer が記号)
解説(explanation)に選択肢の記号が書かれていると並べ替えで食い違うため、見つけたら警告する。
"""
import glob
import json
import os
import random
import re
import sys

LETTERS = "ABCD"
LETTER_REF = re.compile(r"(?<![A-Za-z'’])[A-D](?![A-Za-z'’.])")


def targets(n, k, rng):
    t = list(LETTERS[:k] * ((n + k - 1) // k))[:n]
    rng.shuffle(t)
    return t


def move(choices, answer_idx, target_idx):
    ans = choices[answer_idx]
    others = [c for i, c in enumerate(choices) if i != answer_idx]
    others.insert(target_idx, ans)
    return others


def main():
    folder, kind = sys.argv[1], sys.argv[2]
    pattern = sys.argv[3] if len(sys.argv) > 3 else "*.json"
    rng = random.Random(20261026)
    warnings = []
    for path in sorted(glob.glob(os.path.join(folder, pattern))):
        items = json.load(open(path, encoding="utf-8"))
        if kind == "choice":
            for q, t in zip(items, targets(len(items), 4, rng)):
                texts = [c["text"] for c in q["choices"]]
                texts = move(texts, LETTERS.index(q["answer"]), LETTERS.index(t))
                q["choices"] = [{"label": l, "text": x} for l, x in zip(LETTERS, texts)]
                q["answer"] = t
                if LETTER_REF.search(q["explanation"]):
                    warnings.append(f"{q['id']}: {q['explanation'][:60]}")
            body = ",\n".join("  " + json.dumps(q, ensure_ascii=False) for q in items)
        else:
            qs = [q for s in items for q in s["questions"]]
            ts = iter(targets(len(qs), 4, rng))
            for s in items:
                for q in s["questions"]:
                    k = len(q["choices"])
                    t = next(ts)
                    if LETTERS.index(t) >= k:
                        t = rng.choice(LETTERS[:k])
                    q["choices"] = move(q["choices"], LETTERS.index(q["answer"]), LETTERS.index(t))
                    q["answer"] = t
                    if LETTER_REF.search(q["explanation"]):
                        warnings.append(f"{s['id']}: {q['explanation'][:60]}")
            body = ",\n".join("  " + json.dumps(s, ensure_ascii=False) for s in items)
        with open(path, "w", encoding="utf-8") as w:
            w.write("[\n" + body + "\n]\n")
    for w in warnings:
        print("WARN letter in explanation ->", w)
    print("done", folder)


if __name__ == "__main__":
    main()
