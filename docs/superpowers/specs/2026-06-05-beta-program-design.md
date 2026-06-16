# EQMonitor v3 Beta Program Design Spec

## Overview

EQMonitor v3 iOS beta program enrollment system. Users authenticate via Sign in with Apple, select platform (iOS only for now), enter email, agree to terms, and get automatically added to a TestFlight beta group via App Store Connect API.

## Architecture

Two-worker architecture:

1. **eqmonitor-site** (existing TanStack Start) — Frontend, BetterAuth (Apple Sign-In), registration API, D1
2. **eqmonitor-beta-worker** (new Hono) — App Store Connect API wrapper, Cloudflare Workflow, D1 (same DB)

Communication: Service Binding + Hono RPC (type-safe)

## User Flow

1. Visit `/beta`
2. Sign in with Apple (@better-auth-ui/heroui)
3. After auth: form appears — platform (iOS selected, Android disabled), email
4. Click next -> terms modal (4 checkboxes, all required)
5. Click "Beta Program ni Sanka" -> POST /api/beta/register
6. Main site: insert D1 (status=pending) -> call beta-worker -> get workflow_id -> update D1
7. Workflow (async): call ASC API -> update D1 status
8. Success screen

## Worker 2: eqmonitor-beta-worker

- Hono + Valibot
- POST /register — start Workflow, return workflow_id
- BetaRegistrationWorkflow — call ASC API, update D1
- D1 binding to same database as main site
- Export AppType for Hono RPC

## D1 Schema

```sql
CREATE TABLE beta_registrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  status TEXT NOT NULL DEFAULT 'pending',
  workflow_id TEXT,
  created_at TEXT NOT NULL,
  testflight_added_at TEXT,
  error_message TEXT
);
```

BetterAuth tables (user, session, account, verification) via migration.

## Environment Variables

eqmonitor-site:
- APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY

eqmonitor-beta-worker:
- APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_PRIVATE_KEY
- BETA_GROUP_ID

## Terms (modal checkboxes)

1. Beta version; service may stop without notice
2. Auto-distributed; may receive multiple builds per day
3. Beta program may end after official release
4. Report issues via feedback page, not SNS
