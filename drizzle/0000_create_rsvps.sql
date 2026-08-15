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
);
