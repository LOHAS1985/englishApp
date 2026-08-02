CREATE TABLE reading_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    article_id VARCHAR(500) NOT NULL,
    article_title VARCHAR(500) NOT NULL,
    word_count INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    wpm INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_reading_records_user_id ON reading_records(user_id);