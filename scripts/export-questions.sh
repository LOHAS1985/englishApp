#!/usr/bin/env bash
# バックエンドの問題集(難易度・Part 2 の台本を含む)を、画面に同梱する
# frontend/src/generated/questions/*.json に書き出す。問題集を変えたら実行する
# (push.sh も自動で実行する。書き出し忘れは QuestionExportTests が CI で検出する)。
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT/backend"
GEMINI_API_KEY="${GEMINI_API_KEY:-dummy}" ./mvnw -q -B test -Dtest=QuestionExportTests -Dexport.write=true \
  -Dsurefire.failIfNoSpecifiedTests=false
echo "exported: frontend/src/generated/questions/"
