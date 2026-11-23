-- 使われていない表を消す(利用者の指示。2026-11-24)。どのコードからも読み書きしていない、以前の機能の名残。
-- 中の記録は戻せない(Guardian 記事の多読の過去の記録 reading_records も含む)。
--   reading_records     : Guardian 記事の多読(廃止)
--   reading_speeds      : 読解速度の計測(2026-11-23 に削除)
--   grammar_questions   : Gemini で文法問題を作っていた頃の出題中の問題(問題集に移行)
--   listening_records   : 問題集に移る前のリスニングの記録(今は practice_records)
--   listening_questions : 問題集に移る前のリスニングの問題
--   words               : 単語帳を作る前の単語の表(今は wordbook_words)
--   recordings          : 録音のアップロード(廃止。録音はブラウザ内だけで扱う)
DROP TABLE IF EXISTS reading_records CASCADE;
DROP TABLE IF EXISTS reading_speeds CASCADE;
DROP TABLE IF EXISTS grammar_questions CASCADE;
DROP TABLE IF EXISTS listening_records CASCADE;
DROP TABLE IF EXISTS listening_questions CASCADE;
DROP TABLE IF EXISTS words CASCADE;
DROP TABLE IF EXISTS recordings CASCADE;
