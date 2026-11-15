-- スピーキング(英検二次の面接形式)の AI 採点の記録。1パート(ナレーションまたは Q&A の1問)につき1行
CREATE TABLE IF NOT EXISTS speaking_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    set_id VARCHAR(20) NOT NULL,
    part_no INTEGER NOT NULL,
    transcript TEXT NOT NULL,
    speaking_seconds INTEGER,
    content_score INTEGER NOT NULL,
    structure_score INTEGER NOT NULL,
    vocabulary_score INTEGER NOT NULL,
    grammar_score INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    feedback_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speaking_records_user ON speaking_records(user_id, created_at);
