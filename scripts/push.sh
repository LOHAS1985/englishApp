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

# backend は Java 25 でビルドするため、JAVA_HOME が 21 などを指していると ./mvnw が失敗する。
# 入っている JDK 25 を探して JAVA_HOME に設定する(見つからなければ false を返す)
ensure_jdk25() {
  if [ -n "${JAVA_HOME:-}" ] && "$JAVA_HOME/bin/java" -version 2>&1 | grep -q 'version "25'; then
    return 0
  fi
  local d
  for d in /usr/lib/jvm/java-25-* /usr/lib/jvm/temurin-25* /usr/lib/jvm/jdk-25* \
    "/c/Program Files/Eclipse Adoptium/jdk-25"* "/c/Program Files/Java/jdk-25"* "$HOME"/.jdks/*25*; do
    if [ -x "$d/bin/java" ] && "$d/bin/java" -version 2>&1 | grep -q 'version "25'; then
      export JAVA_HOME="$d"
      export PATH="$JAVA_HOME/bin:$PATH"
      echo "JAVA_HOME を JDK 25 に設定: $JAVA_HOME"
      return 0
    fi
  done
  return 1
}
if ! ensure_jdk25; then
  echo "!! JDK 25 が見つかりません。backend のテストは JDK 25 が無いと失敗します(JAVA_HOME を設定してください)" >&2
fi

# 日付付与フックを有効化(初回のみ実質的に効く)
git config core.hooksPath .githooks

# 問題集を変えたら、画面に同梱する問題集(frontend/src/generated/questions)も書き出し直す
if [ -n "$(git status --porcelain -- backend/src/main/resources/questions backend/src/main/java/com/example/backend/common)" ]; then
  if command -v java >/dev/null 2>&1 || [ -n "${JAVA_HOME:-}" ]; then
    echo "== export questions for frontend =="
    ./scripts/export-questions.sh
  fi
fi

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
