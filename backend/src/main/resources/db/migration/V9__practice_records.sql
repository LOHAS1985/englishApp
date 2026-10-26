-- 問題集(語彙・リーディング・リスニング)の解答記録。1設問につき1行
CREATE TABLE IF NOT EXISTS practice_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    feature VARCHAR(20) NOT NULL,
    item_id VARCHAR(20) NOT NULL,
    question_no INTEGER NOT NULL,
    selected_choice VARCHAR(1),
    is_correct BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_records_user_feature ON practice_records(user_id, feature, created_at);

-- リスニングを Gemini 生成から問題集に移行したため、生成問題の保存用テーブルを削除する
-- (解答記録は practice_records に記録する。本番DBは現在インメモリH2のため既存データの移行は不要)
DROP TABLE IF EXISTS listening_records;
DROP TABLE IF EXISTS listening_questions;
