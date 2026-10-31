-- 学習ログ。全技能の解答1回(セット問題は1セット)につき1行。技能別の学習時間・回数・正答率の集計に使う
CREATE TABLE IF NOT EXISTS study_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    feature VARCHAR(20) NOT NULL,
    item_type VARCHAR(40) NOT NULL,
    item_id VARCHAR(40),
    correct_count INTEGER,
    total_count INTEGER,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_logs_user_created ON study_logs(user_id, created_at);

-- 間違えた問題の復習(間隔反復)。stage が進むごとに出題間隔を 1→3→7→14日 と延ばす
CREATE TABLE IF NOT EXISTS review_items (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    feature VARCHAR(20) NOT NULL,
    item_id VARCHAR(20) NOT NULL,
    stage INTEGER NOT NULL,
    due_date DATE NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_review_items UNIQUE (user_id, feature, item_id)
);

CREATE INDEX IF NOT EXISTS idx_review_items_due ON review_items(user_id, feature, due_date);
