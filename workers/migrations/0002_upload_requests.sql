-- Limite des envois de photos par membre (empreinte de l'uid uniquement, effacée après 1 h).
CREATE TABLE IF NOT EXISTS upload_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS upload_requests_uid ON upload_requests (uid_hash, created_at);
