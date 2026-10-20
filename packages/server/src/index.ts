export interface D1Database {
  batch: (stmts: unknown[]) => Promise<unknown[]>;
  prepare: (sql: string) => { bind: (...args: unknown[]) => { first: <T>() => Promise<T | null>; run: () => Promise<unknown> } };
}

export interface SubmissionRequest {
  formId: string;
  payload: unknown;
}

export interface SubmissionResult {
  submissionId: string;
  status: 'confirmed';
  replayed: boolean;
}

export interface IdempotencyRecord {
  key: string;
  formId: string;
  payloadHash: string;
  submissionId: string;
  createdAt: number;
}

// Canonical JSON same as core.
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function processSubmission(
  db: D1Database,
  key: string,
  req: SubmissionRequest,
): Promise<{ status: number; body: SubmissionResult | { code: string; message: string } }> {
  const canonical = canonicalize({ formId: req.formId, payload: req.payload });
  const hash = await sha256Hex(canonical);

  // Try insert idempotency record + submission atomically via batch.
  // D1 batch is atomic. Use INSERT ... ON CONFLICT? We'll do explicit.
  // First check existing
  const existing = await db.prepare('SELECT * FROM idempotency_records WHERE key = ?').bind(key).first<IdempotencyRecord>();
  if (existing) {
    if (existing.payloadHash !== hash || existing.formId !== req.formId) {
      return { status: 409, body: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Same key with different payload' } };
    }
    return { status: 200, body: { submissionId: existing.submissionId, status: 'confirmed', replayed: true } };
  }

  const submissionId = crypto.randomUUID();
  try {
    await db.batch([
      db.prepare('INSERT INTO submissions (id, formId, payload, createdAt) VALUES (?, ?, ?, ?)').bind(submissionId, req.formId, JSON.stringify(req.payload), Date.now()),
      db.prepare('INSERT INTO idempotency_records (key, formId, payloadHash, submissionId, createdAt) VALUES (?, ?, ?, ?, ?)').bind(key, req.formId, hash, submissionId, Date.now()),
    ]);
  } catch (err) {
    const raced = await db.prepare('SELECT * FROM idempotency_records WHERE key = ?').bind(key).first<IdempotencyRecord>();
    if (raced) {
      if (raced.payloadHash !== hash || raced.formId !== req.formId) {
        return { status: 409, body: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Same key with different payload' } };
      }
      return { status: 200, body: { submissionId: raced.submissionId, status: 'confirmed', replayed: true } };
    }
    throw err;
  }

  return { status: 201, body: { submissionId, status: 'confirmed', replayed: false } };
}
