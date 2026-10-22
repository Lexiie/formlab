# Coding agent operating instructions

You are the lead engineer implementing FormLab. The repository currently contains specifications only. Build real working code; no simulated success banners, fake test output, or TODO placeholders in P0 paths.

## Priorities
1. Correct backend atomic idempotency (including concurrent requests and response-loss retry).
2. Persistent client submission intent and recovery after reload.
3. Draft save/restore, exclusions, version migrations without data loss.
4. React Hook Form integration and polished demo with controllable fault injection.
5. Automated tests, Cloudflare deployment, TestSprite GitHub App integration, documentation.

## Required engineering decisions
- pnpm workspace; TypeScript strict; React 19 + Vite; Hono on Cloudflare Worker; D1 SQL; Dexie IndexedDB; React Hook Form + Zod; Vitest; Playwright; Tailwind CSS v4. Optional shadcn/ui; do not waste time on styling dependencies.
- Packages: `packages/core`, `packages/react`, `packages/server`, `apps/web`.
- Frontend and API same origin in one Worker deployment, with D1 binding.
- D1 idempotency: atomically insert BOTH a completed idempotency record and one submission in a single `env.DB.batch([...])` call, with uniqueness constraints and a payload hash; if conflict, reread record and return cached result only if hash matches. Check actual D1 transactional semantics before relying on them. If needed use a single SQL statement / verified atomic pattern; never use check-then-insert alone.
- The demo simulates a lost response **after commit** using a special endpoint mode: server commits normally, then returns a non-success / deliberately interrupted response that client maps to `uncertain`. For deterministic browser testing, `X-Demo-Drop-Response: 1` should produce a connection-style failure by using a test-only fetch adapter that drops the response *after the server has committed*. Avoid depending on unreliable TCP stream abortion in Workers. The test must verify the DB committed first.
- Do not automatically retry on ambiguous outcomes; show explicit Retry, preserving intent/key/body.
- Hash a canonical serialized payload; reject same key with different payload. Never trust client-provided hash alone.
- `pending`/`uncertain` intent survives reload. Confirmation clears draft and pending intent only after server confirmation.
- Schema migration runs on a deep clone; persist migrated draft only after full chain validates. Original stays intact if migration fails.
- Sensitive field exclusions apply before storage and logging; password/secret demo fields should not be persisted.

## Work process
- Start with workspace scaffolding and one POST `/api/submissions` route plus D1 migrations and integration tests.
- Build `createFormLab` core and server helper with typed public contracts.
- Implement React adapter and 4-step demo; use actual SDK in demo, no duplicate demo-only logic.
- Make Failure Lab injectable via dev/demo mode; verify faults are disabled for ordinary production requests.
- Create GitHub Actions checks and configure TestSprite as official instructions require. External account linking requires user action; document precise steps rather than claim completed.
- Do not ask routine questions; choose sensible defaults. Stop only for credentials, account actions, or genuinely blocking unknowns.

## Definition of done
- All P0 invariants in `docs/08-testing-plan.md` pass.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` succeed; Playwright E2E passes against a running app.
- Demo shows real refresh restore, schema migration, ambiguous response retry, and one DB submission after duplicate attempts.
- README includes setup, Cloudflare D1 migration/deploy, SDK example, limitations and TestSprite proof links (only real links).
- Output final implementation summary: what was built, test results, deployed URL (if deployed), TestSprite evidence (if connected), remaining risks.

## Implementation status
- Milestones 1-4 completed (scaffolding, backend helper, core SDK, React adapter, demo UI).
- Milestone 5 partially complete: 8 unit tests passing (core 5, server 3); E2E not yet implemented.
- Milestone 6 not complete: D1 not provisioned, Worker not deployed, TestSprite not connected.
- Frontend audited with Impeccable: 0 findings.

## Implementation status (updated)
- M1-M4 complete.
- M5 partial: 8 unit tests passing; E2E not implemented.
- M6 partial: Cloudflare Worker deployed and D1 migrated; TestSprite not connected.
- Deployed URL: https://formlab-web.lendha930.workers.dev

## Implementation status (final)
- M1-M4 complete.
- M5 partial but improved: 8 unit tests + 4 D1 integration tests + 1 Playwright E2E smoke test passing.
- M6 partial: deployed at https://formlab-web.lendha930.workers.dev; TestSprite not connected.

## TestSprite status (updated)
- TestSprite executed on PR #3: 5/5 passed.
- Report: testsprite_tests/testsprite-mcp-test-report.md
