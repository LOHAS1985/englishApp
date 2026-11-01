-- アクセスを許可する端末(最大3台)。端末ごとの鍵はハッシュ(SHA-256)だけを保存する
CREATE TABLE IF NOT EXISTS devices (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP
);
