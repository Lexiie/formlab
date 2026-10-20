import { describe, it, expect } from 'vitest';
import { processSubmission } from './index';

function makeDb() {
  const records = new Map();
  const submissions = new Map();
  const db: any = {
    prepare(sql: string) {
      return {
        bind(...args: any[]) {
          return {
            async first() {
              if (sql.includes('idempotency_records')) {
                return records.get(args[0]) ?? null;
              }
              return null;
            },
            async run() { return {}; },
          };
        },
      };
    },
    async batch(stmts: any[]) {
      // execute inserts
      // stmts are objects with _sql/_args captured? We'll instead parse by calling bind? 
      // Simpler: store from args passed via closure
      return [];
    },
  };
  // We need capture inserts. Override prepare to record.
  const origPrepare = db.prepare;
  db.prepare = (sql: string) => {
    const stmt = origPrepare(sql);
    const origBind = stmt.bind;
    stmt.bind = (...args: any[]) => {
      const bound = origBind(...args);
      const origRun = bound.run;
      bound.run = async () => {
        if (sql.includes('idempotency_records')) {
          records.set(args[0], { key: args[0], formId: args[1], payloadHash: args[2], submissionId: args[3], createdAt: args[4] });
        } else if (sql.includes('submissions')) {
          submissions.set(args[0], { id: args[0], formId: args[1], payload: args[2], createdAt: args[3] });
        }
        return {};
      };
      // first already uses records map via closure over args? Need first to use args at call time.
      // Reimplement first with args captured.
      bound.first = async () => {
        if (sql.includes('idempotency_records')) {
          return records.get(args[0]) ?? null;
        }
        return null;
      };
      return bound;
    };
    return stmt;
  };
  // batch: run each statement's run
  db.batch = async (stmts: any[]) => {
    for (const s of stmts) await s.run();
    return [];
  };
  return { db, records, submissions };
}

describe('processSubmission', () => {
  it('creates new submission', async () => {
    const { db, submissions } = makeDb();
    const r = await processSubmission(db, 'k1', { formId: 'f', payload: { a: 1 } });
    expect(r.status).toBe(201);
    expect((r.body as any).replayed).toBe(false);
    expect(submissions.size).toBe(1);
  });

  it('replays same key+payload', async () => {
    const { db } = makeDb();
    const r1 = await processSubmission(db, 'k2', { formId: 'f', payload: { a: 1 } });
    const r2 = await processSubmission(db, 'k2', { formId: 'f', payload: { a: 1 } });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(200);
    expect((r2.body as any).replayed).toBe(true);
    expect((r2.body as any).submissionId).toBe((r1.body as any).submissionId);
  });

  it('rejects same key different payload', async () => {
    const { db } = makeDb();
    await processSubmission(db, 'k3', { formId: 'f', payload: { a: 1 } });
    const r = await processSubmission(db, 'k3', { formId: 'f', payload: { a: 2 } });
    expect(r.status).toBe(409);
    expect((r.body as any).code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
});