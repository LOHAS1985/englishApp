-- ddl-auto=update で作られていた可能性があるため、すべて存在チェック付きで作成する
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles VARCHAR(255) NOT NULL DEFAULT 'USER';

CREATE TABLE IF NOT EXISTS words (
    id BIGSERIAL PRIMARY KEY,
    word VARCHAR(255),
    meaning_en TEXT,
    example_en TEXT,
    meaning_ja TEXT,
    example_ja TEXT,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recordings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    filename VARCHAR(255) NOT NULL,
    duration_ms INTEGER,
    transcript TEXT,
    score DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
