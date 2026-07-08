CREATE TABLE writing_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    topic VARCHAR(500) NOT NULL,
    prompt VARCHAR(500) NOT NULL,
    points TEXT NOT NULL,
    answer TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    content_score INTEGER NOT NULL,
    content_feedback TEXT NOT NULL,
    structure_score INTEGER NOT NULL,
    structure_feedback TEXT NOT NULL,
    vocabulary_score INTEGER NOT NULL,
    vocabulary_feedback TEXT NOT NULL,
    grammar_score INTEGER NOT NULL,
    grammar_feedback TEXT NOT NULL,
    total_score INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_writing_records_user_id ON writing_records(user_id);