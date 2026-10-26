-- API へのアクセス記録(どこから使われているかの確認用)。保存期間は access-log.retention-days(既定90日)
CREATE TABLE IF NOT EXISTS access_logs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    ip VARCHAR(64) NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    user_agent VARCHAR(500),
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    isp VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);
