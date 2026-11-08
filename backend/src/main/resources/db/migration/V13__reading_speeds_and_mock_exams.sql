-- 読解速度の計測(本文を読み終えるまでの秒数と語数)。Part 7 などの長文練習で記録し、語/分の推移に使う
CREATE TABLE IF NOT EXISTS reading_speeds (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    set_id VARCHAR(40) NOT NULL,
    item_type VARCHAR(40) NOT NULL,
    words INTEGER NOT NULL,
    reading_seconds INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reading_speeds_user_created ON reading_speeds(user_id, created_at);

-- 模試の結果(TOEIC の区切りごとの正解数・推定点・時間)。推定点は参考値で、保存時の換算をそのまま残す
CREATE TABLE IF NOT EXISTS mock_exams (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    exam VARCHAR(20) NOT NULL,
    listening_correct INTEGER NOT NULL,
    listening_total INTEGER NOT NULL,
    reading_correct INTEGER NOT NULL,
    reading_total INTEGER NOT NULL,
    listening_score INTEGER NOT NULL,
    reading_score INTEGER NOT NULL,
    listening_seconds INTEGER NOT NULL,
    reading_seconds INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mock_exams_user_created ON mock_exams(user_id, created_at);
