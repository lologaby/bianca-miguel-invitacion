export const rsvpSchema = `
CREATE TABLE IF NOT EXISTS rsvps (
  guest_id TEXT PRIMARY KEY,
  guest_name TEXT NOT NULL,
  attendance TEXT NOT NULL CHECK (attendance IN ('yes', 'no')),
  party_size INTEGER NOT NULL DEFAULT 0,
  plus_one_name TEXT NOT NULL DEFAULT '',
  song TEXT NOT NULL DEFAULT '',
  dietary TEXT NOT NULL DEFAULT '',
  accessibility TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
)
`;

export const guestSessionSchema = `
CREATE TABLE IF NOT EXISTS guest_sessions (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)
`;

export const guestSessionExpiryIndexSchema = `
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at
ON guest_sessions(expires_at)
`;

export const guestAccessAttemptSchema = `
CREATE TABLE IF NOT EXISTS guest_access_attempts (
  fingerprint TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL
)
`;
