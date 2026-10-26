-- 出題中の問題と正解をサーバー再起動後も保持するためのテーブル
CREATE TABLE IF NOT EXISTS grammar_questions (
    id VARCHAR(36) PRIMARY KEY,
    sentence TEXT NOT NULL,
    choice_a VARCHAR(255) NOT NULL,
    choice_b VARCHAR(255) NOT NULL,
    choice_c VARCHAR(255) NOT NULL,
    choice_d VARCHAR(255) NOT NULL,
    correct_choice VARCHAR(1) NOT NULL,
    explanation TEXT NOT NULL,
    translation TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listening_questions (
    id BIGSERIAL PRIMARY KEY,
    dialog_text TEXT NOT NULL,
    question TEXT NOT NULL,
    choices TEXT NOT NULL,
    correct_choice VARCHAR(1) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listening_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    question_id BIGINT NOT NULL REFERENCES listening_questions(id),
    selected_choice VARCHAR(1) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listening_records_user_id ON listening_records(user_id);
