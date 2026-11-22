-- 解答履歴の読み込みは「新しい順(id 降順)」で行うため、created_at ではなく id で引ける索引を足す。
-- 既存の索引(created_at を含むもの)は残す(画面の日付順の集計で使う)。
CREATE INDEX IF NOT EXISTS idx_practice_records_user_feature_id ON practice_records(user_id, feature, id);
CREATE INDEX IF NOT EXISTS idx_grammar_records_user_id_desc ON grammar_records(user_id, id);
CREATE INDEX IF NOT EXISTS idx_writing_records_user_id_desc ON writing_records(user_id, id);
