import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { env } from 'cloudflare:test';
import { processSubmission } from '../packages/server/src/index';

describe('D1 idempotency integration', () => {
  beforeAll(async () => {
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, formId TEXT NOT NULL, payload TEXT NOT NULL, createdAt INTEGER NOT NULL);`);
    await env.DB.exec(`CREATE TABLE IF NOT EXISTS idempotency_records (key TEXT PRIMARY KEY, formId TEXT NOT NULL, payloadHash TEXT NOT NULL, submissionId TEXT NOT NULL, createdAt INTEGER NOT NULL, FOREIGN KEY (submissionId) REFERENCES submissions(id));`);
  });
  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM idempotency_records').run();
    await env.DB.prepare('DELETE FROM submissions').run();
  });

  it('creates submission', async () => {
    const r = await processSubmission(env.DB, 'k1', { formId: 'f', payload: { a: 1 } });
    expect(r.status).toBe(201);
    const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM submissions').first();
    expect((count as any).c).toBe(1);
  });

  it('replays same key+payload', async () => {
    const r1 = await processSubmission(env.DB, 'k2', { formId: 'f', payload: { a: 1 } });
    const r2 = await processSubmission(env.DB, 'k2', { formId: 'f', payload: { a: 1 } });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(200);
    const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM submissions').first();
    expect((count as any).c).toBe(1);
  });

  it('rejects same key different payload', async () => {
    await processSubmission(env.DB, 'k3', { formId: 'f', payload: { a: 1 } });
    const r = await processSubmission(env.DB, 'k3', { formId: 'f', payload: { a: 2 } });
    expect(r.status).toBe(409);
    const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM submissions').first();
    expect((count as any).c).toBe(1);
  });

  it('concurrent same key+payload creates one submission', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => processSubmission(env.DB, 'k4', { formId: 'f', payload: { a: 1 } })),
    );
    const created = results.filter(r => r.status === 201).length;
    const replayed = results.filter(r => r.status === 200).length;
    expect(created + replayed).toBe(10);
    const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM submissions').first();
    expect((count as any).c).toBe(1);
  });
});