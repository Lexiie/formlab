# 12 — TestSprite integration

## Status
- CLI package installed; frontend audited with Impeccable (0 findings).
- GitHub App installation and suite creation require user authorization.
- TestSprite checks should target deployed demo URL.

## Deployed URL
https://formlab-web.lendha930.workers.dev

## Testable journeys
1. Draft recovery: fill form, refresh, restore draft.
2. Schema migration: v1 draft → v2 preview → commit.
3. Submission recovery: simulate lost response, retry, one DB row.
4. Duplicate prevention: replay same key, replayed=true.

## User actions required
- Create TestSprite account (same email as submission).
- Install GitHub App on repo.
- Create suite in portal and enable PR checks.
- Provide PR URL, live URL, account email in Discord.

## Current evidence
- Unit tests: 8 passing (core 5, server 3).
- D1 integration: 4 passing (create, replay, conflict, concurrent).
- E2E: 3 passing (smoke, draft restore, lost response).
- Frontend build: success.
- Impeccable audit: 0 findings.
- TestSprite: 5/5 passed (PR #3).

## Execution evidence
- PR #3: 5/5 passed
- Report: https://www.testsprite.com/dashboard-v3/o/75d9e46a-15c5-5bf8-81fb-91671d3a9934/projects/486db87b-c781-4f67-97a6-bc16cf4bb3a2/execution/00ca09cb-9c53-4e5f-882d-c9439d7cc79e
