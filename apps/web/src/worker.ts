import { Hono } from 'hono';
import { processSubmission } from '../../../packages/server/src/index.ts';

type Env = { DB: any };

const app = new Hono<{ Bindings: Env }>();

app.get('/api/health', (c) => c.json({ ok: true }));

app.post('/api/submissions', async (c) => {
  const key = c.req.header('Idempotency-Key');
  if (!key) return c.json({ code: 'VALIDATION_ERROR', message: 'Missing Idempotency-Key' }, 400);
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.formId !== 'string' || body.payload === undefined) {
    return c.json({ code: 'VALIDATION_ERROR', message: 'Invalid body' }, 400);
  }
  const result = await processSubmission(c.env.DB, key, { formId: body.formId, payload: body.payload });
  // Test-only fault injection: commit succeeded, but drop the response so the
  // client observes an ambiguous (5xx) outcome and transitions to UNCERTAIN.
  if (c.req.header('X-Demo-Drop-Response') === '1') {
    return c.json({ code: 'DEMO_DROPPED_RESPONSE', message: 'Response dropped after commit' }, 500);
  }
  return c.json(result.body, result.status as 200);
});

export default app;