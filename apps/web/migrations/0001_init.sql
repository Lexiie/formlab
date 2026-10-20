CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  formId TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS idempotency_records (
  key TEXT PRIMARY KEY,
  formId TEXT NOT NULL,
  payloadHash TEXT NOT NULL,
  submissionId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (submissionId) REFERENCES submissions(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_records(key);
