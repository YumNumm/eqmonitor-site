CREATE TABLE beta_registrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  status TEXT NOT NULL DEFAULT 'pending',
  workflow_id TEXT,
  created_at TEXT NOT NULL,
  testflight_added_at TEXT,
  error_message TEXT
);
