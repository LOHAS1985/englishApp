"""問題集 JSON の典型的な書き間違い(値の後の余分なカンマ)を直し、構文と ID 範囲を検査する。
usage: python check.py <file>...
"""
import json, re, sys
for p in sys.argv[1:]:
    s = open(p, encoding="utf-8").read()
    fixed = re.sub(r'","\}', '"}', s)
    if fixed != s:
        print(f"fixed {s.count(chr(34)+','+chr(34)+'}')} trailing commas in {p}")
        open(p, "w", encoding="utf-8").write(fixed)
    try:
        items = json.loads(fixed)
        ids = [i["id"] for i in items]
        print(f"OK {p.split('/')[-1]}: {len(items)} items {ids[0]}..{ids[-1]}")
    except Exception as e:
        print(f"ERROR {p}: {e}")
