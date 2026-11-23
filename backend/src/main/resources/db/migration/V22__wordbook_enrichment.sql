-- 手動・読解から登録した語に、Gemini で例文・品詞・品詞ごとの意味を補う(WordbookEnrichmentService)。
-- senses_json は品詞ごとの主な意味([{"pos":"動詞","meaningJa":"..."}])。同梱語は問題集から引くので使わない。
-- enriched_at は補った(または補えないと判断した)日時。NULL の語だけを次の調査で補う。
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS senses_json TEXT;
ALTER TABLE wordbook_words ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP;
