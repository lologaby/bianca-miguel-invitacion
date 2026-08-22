CREATE TABLE IF NOT EXISTS guest_sessions (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at
ON guest_sessions(expires_at);

CREATE TABLE IF NOT EXISTS guest_access_attempts (
  fingerprint TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL
);
