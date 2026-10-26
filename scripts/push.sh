#!/usr/bin/env bash
# 変更をチェック → 日付付きでコミット → GitHub へ push する。
#
# 使い方:
#   ./scripts/push.sh "修正内容の要約" ["補足の本文"]
# 例:
#   ./scripts/push.sh "fix(speaking): 録音アップロードにトークンを付与"
#
# コミットメッセージ:
#   1行目   YYYYMMDD - <修正内容の要約>   (日付は .githooks/prepare-commit-msg が付与)
#   本文    変更ファイル一覧(自動) + 補足の本文
#
# main への push は本番デプロイ(GitHub Pages / Render)になるため、
# push 前に lint・build・test を実行し、失敗したら中断する。
set -euo pipefail

SUMMARY="${1:-}"
EXTRA_BODY="${2:-}"
if [ -z "$SUMMARY" ]; then
  echo "usage: $0 \"修正内容の要約\" [\"補足の本文\"]" >&2
  exit 1
fi

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

# 日付付与フックを有効化(初回のみ実質的に効く)
git config core.hooksPath .githooks

git add -A
if git diff --cached --quiet; then
  echo "コミットする変更がありません" >&2
  exit 1
fi

CHANGED=$(git diff --cached --name-only)

# --- push 前チェック ---
if echo "$CHANGED" | grep -q '^frontend/'; then
  echo "== frontend: lint / build =="
  (cd frontend && { [ -d node_modules ] || npm ci; } && npm run lint && npm run build)
fi

if echo "$CHANGED" | grep -q '^backend/'; then
  if command -v java >/dev/null 2>&1 || [ -n "${JAVA_HOME:-}" ]; then
    echo "== backend: test =="
    # テストはコンテキスト起動のみのため、APIキーはダミーでよい
    (cd backend && GEMINI_API_KEY="${GEMINI_API_KEY:-dummy}" \
      JWT_SECRET="${JWT_SECRET:-local-test-secret-local-test-secret-0123}" \
      ./mvnw -q -B test)
  else
    echo "!! Java が見つからないため backend テストをスキップします(GitHub Actions の Backend CI で実行されます)" >&2
  fi
fi

# --- コミット ---
MSG_FILE=$(mktemp)
{
  echo "$SUMMARY"
  echo
  echo "変更ファイル:"
  git diff --cached --name-status | sed 's/^/- /'
  if [ -n "$EXTRA_BODY" ]; then
    echo
    echo "$EXTRA_BODY"
  fi
} > "$MSG_FILE"
git commit -F "$MSG_FILE"
rm -f "$MSG_FILE"

# --- push ---
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$BRANCH"
echo "pushed: $(git log -1 --format='%h %s') -> origin/$BRANCH"
