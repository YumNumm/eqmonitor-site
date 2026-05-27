-- 問い合わせ・フィードバックの格納テーブル
CREATE TABLE IF NOT EXISTS inquiries (
  id                  TEXT PRIMARY KEY,             -- crypto.randomUUID()
  created_at          TEXT NOT NULL,                -- ISO8601 (UTC)
  type                TEXT NOT NULL,                -- 'inquiry' | 'feedback' | 'bug'
  email               TEXT,                         -- 任意
  message             TEXT NOT NULL,
  app_version         TEXT,
  platform            TEXT,                         -- 'ios' | 'android' | 'web' 等
  user_agent          TEXT,
  ip_hash             TEXT,                         -- 生IPは保存せずハッシュ
  status              TEXT NOT NULL DEFAULT 'new',  -- 'new' | 'issue_created' | 'dismissed'
  slack_message_ts    TEXT,                         -- Slack chat.update 用
  github_issue_number INTEGER
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries (created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries (status);
