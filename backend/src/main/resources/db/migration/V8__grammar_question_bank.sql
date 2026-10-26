-- 文法問題は Gemini 生成のストックからリポジトリ内の問題集(JSON)に移行したため、ストック用テーブルを削除する
DROP TABLE IF EXISTS grammar_questions;

-- どの問題に答えたかを残し、苦手問題の復習に使う
ALTER TABLE grammar_records ADD COLUMN IF NOT EXISTS question_id VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_grammar_records_user_question ON grammar_records(user_id, question_id);
