# FormLab — implementation-ready specification

**Status:** Build specification, not implemented code. **Target:** TestSprite Hackathon S4 (deadline: 2026-10-22; verify timezone and submission requirements on official event page before submitting).

FormLab is an open-source, local-first TypeScript SDK that helps existing React forms survive browser refreshes, draft schema changes, and ambiguous network outcomes during submission. It includes a small Hono server-side idempotency helper and an interactive grant application demo / Failure Lab.

## Read in order
1. `AGENTS.md` — autonomous coding-agent instructions and completion gate.
2. `docs/01-product-spec.md` — exact scope and user journeys.
3. `docs/02-architecture.md` — packages, data flow, deployment.
4. `docs/03-sdk-api-contract.md` — public interfaces and semantics.
5. `docs/04-recovery-state-machine.md` — submission recovery and invariants.
6. `docs/05-storage-and-migration.md` — draft persistence, migration and privacy.
7. `docs/06-server-idempotency.md` — atomic D1 writes and conflict behavior.
8. `docs/07-demo-ux.md` — demo UI and genuine fault injection.
9. `docs/08-testing-plan.md` — tests, TestSprite and PR evidence.
10. `docs/09-implementation-plan.md` — milestones and delivery checklist.
11. `docs/10-security-and-threat-model.md` — limits and mitigations.
12. `docs/11-deployment-and-submission.md` — deploy and submit.

## Non-negotiables
- No claim of exactly-once network delivery. Guarantees apply only to same key + same payload within server retention window and a successful atomic commit.
- Frontend may label lost responses **uncertain**, not **failed**.
- **Never** use client-only duplicate prevention as evidence of backend idempotency.
- A persisted submission intent is immutable while retrying.
- Never silently discard original draft on migration failure.
- Never persist excluded fields; demo contains no real sensitive information.
- Failure Lab faults must be real and confined to non-production/demo controls.
- Tests must assert observable behavior and database state, not just UI text.

## Recommended commands after implementation
`pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.

## Agent starting prompt
> Implement this repository from scratch, following AGENTS.md and all docs in order. Build the smallest end-to-end vertical slice first. Keep scope strict. Do not mark requirements done without tests. If a cloud-specific API differs from assumptions, consult current official documentation and document the deviation. Run lint/typecheck/unit/integration/E2E/build, fix failures, and report any remaining blockers. Do not invent TestSprite passes or deploy success.

## Current implementation status
- Frontend builds and passes Impeccable audit.
- Unit tests: 8 passing.
- Deployment and TestSprite integration pending user authorization.

## Test results
- Unit: 8 passing
- D1 integration: 4 passing
- E2E smoke: 1 passing
