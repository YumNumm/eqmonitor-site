-- 問い合わせフォームに 名前 / 件名 を追加 (いずれも必須入力)
-- 既存行が存在しうるため DEFAULT '' を付与する
ALTER TABLE inquiries ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE inquiries ADD COLUMN subject TEXT NOT NULL DEFAULT '';
