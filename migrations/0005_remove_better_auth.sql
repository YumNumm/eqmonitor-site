-- 0005_remove_better_auth.sql

-- Drop BetterAuth tables
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS "user";

-- Recreate beta_registrations without user_id
-- D1 does not support DROP COLUMN, so we recreate the table
CREATE TABLE beta_registrations_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  status TEXT NOT NULL DEFAULT 'pending',
  workflow_id TEXT,
  created_at TEXT NOT NULL,
  testflight_added_at TEXT,
  error_message TEXT
);

INSERT INTO beta_registrations_new (id, email, platform, status, workflow_id, created_at, testflight_added_at, error_message)
  SELECT id, email, platform, status, workflow_id, created_at, testflight_added_at, error_message
  FROM beta_registrations;

DROP TABLE beta_registrations;
ALTER TABLE beta_registrations_new RENAME TO beta_registrations;
