-- Anti-abus de l'envoi des liens de connexion : empreintes uniquement (ni e-mail ni IP en clair).
CREATE TABLE IF NOT EXISTS email_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS email_requests_email ON email_requests (email_hash, created_at);
CREATE INDEX IF NOT EXISTS email_requests_ip ON email_requests (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS email_requests_created ON email_requests (created_at);
