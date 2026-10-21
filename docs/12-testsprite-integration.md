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
- D1 integration: local + remote migrations applied; API verified.
- Frontend build: success.
- Impeccable audit: 0 findings.
