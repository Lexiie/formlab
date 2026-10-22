# FormLab — Resilient Forms for React

FormLab is a local-first TypeScript SDK that helps existing React forms survive browser refreshes, draft schema changes, and ambiguous network outcomes during submission.

It includes a React adapter, a Hono-based Cloudflare Worker, and a D1-backed idempotency helper, plus an interactive demo with a Failure Lab.

## Problem

Web forms lose user input on refresh, break when schemas change, and create duplicate submissions when network responses are lost. FormLab addresses these by persisting drafts locally, migrating schemas safely, and enforcing idempotent submissions on the backend.

## Live Demo

- App: https://formlab-web.lendha930.workers.dev
- Repository: https://github.com/Lexiie/formlab

## Key Features

- Draft autosave and restore after refresh
- Schema migration with preview and rollback safety
- Sensitive field exclusion before storage
- Idempotent submission with stable idempotency keys
- Lost-response recovery (status becomes `uncertain`, retry reuses key/body)
- Pending submission recovery after refresh
- Failure Lab for deterministic fault injection (demo-only)

## How It Works

1. Form changes are debounced and saved to IndexedDB.
2. On load, the SDK previews a migration and asks for restore confirmation.
3. Submission creates an immutable intent before the network call.
4. If the response is lost after commit, the client marks the submission `uncertain`.
5. Retry reuses the same key and canonical payload; the server replays the original result.

## Quick Start

Prerequisites: Node 22+, pnpm, and Playwright browsers.

```bash
pnpm install
npx playwright install chromium
pnpm build
pnpm test
pnpm test:integration
pnpm test:e2e
```

Run the web app (frontend + local Worker API):

```bash
cd apps/web
pnpm dev
# in another terminal: npx wrangler dev --port 8787
```

Deploy (Cloudflare):

```bash
cd apps/web
npx wrangler d1 migrations apply formlab-db --remote
npx wrangler deploy
```

## SDK Usage

```tsx
const methods = useForm<Application>({ resolver: zodResolver(schema), defaultValues });
const lab = useFormLab({
  form: methods,
  formId: 'grant-demo',
  schemaVersion: 2,
  migrations: { 1: migrateV1ToV2 },
  exclude: ['secretNote'],
});

// Restore a saved draft
if (lab.restorePreview?.status === 'available') {
  await lab.restore(); // or lab.discard()
}

// Submit (idempotent)
await lab.submit();

// Retry after an uncertain outcome
if (lab.submissionStatus === 'uncertain') {
  await lab.retry();
}
```

## Architecture

- `packages/core`: persistence, migrations, intent, events (no React)
- `packages/react`: React Hook Form adapter
- `packages/server`: D1 idempotency processing helper
- `apps/web`: React + Vite + Tailwind UI, Hono Worker, D1 migrations

## Testing & TestSprite

- Unit tests: 8 passing
- D1 integration tests: 4 passing
- Playwright E2E: 5 passing
- TestSprite: 5/5 passed (PR #3)
- Report: `testsprite_tests/testsprite-mcp-test-report.md`
- Evidence: https://www.testsprite.com/dashboard-v3/o/75d9e46a-15c5-5bf8-81fb-91671d3a9934/projects/486db87b-c781-4f67-97a6-bc16cf4bb3a2/execution/00ca09cb-9c53-4e5f-882d-c9439d7cc79e

## Limitations

- No exactly-once network delivery; guarantees apply only to same key + same payload within the retention window.
- D1 concurrency not load-tested under production traffic.
- E2E coverage limited to 3 scenarios.
- TestSprite suite covers the happy path (5 tests).