-- 解答の再送で記録が二重にならないよう、画面が付ける解答ごとの ID(送信待ちの列の ID)を学習ログに持つ。
-- 同じ ID の解答は2回目以降を保存しない。古い記録・ID を送らない機能は NULL(NULL は重複とみなさない)
ALTER TABLE study_logs ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS ux_study_logs_client_request ON study_logs(user_id, client_request_id);
