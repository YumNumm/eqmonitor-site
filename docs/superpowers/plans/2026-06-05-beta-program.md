# EQMonitor v3 Beta Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-worker beta program enrollment system: users authenticate via Sign in with Apple, agree to terms, and get automatically added to a TestFlight beta group.

**Architecture:** eqmonitor-site (TanStack Start) handles frontend + auth (BetterAuth). eqmonitor-beta-worker (Hono) wraps App Store Connect API and runs the Cloudflare Workflow. Workers communicate via Service Binding + Hono RPC. Both bind to the same D1 database.

**Tech Stack:** TanStack Start, React 19, BetterAuth, @better-auth-ui/heroui, @heroui/react, daisyUI, Hono, Valibot, jose, Cloudflare Workers, D1, Workflows, App Store Connect API

---

## File Structure

### New Files

```
workers/beta-worker/
├── src/
│   ├── index.ts          # Entry: Hono fetch + BetaRegistrationWorkflow export
│   ├── app.ts            # Hono routes (POST /register)
│   ├── schemas.ts        # Valibot request/response schemas
│   ├── asc-jwt.ts        # App Store Connect ES256 JWT generation
│   └── asc-api.ts        # App Store Connect API client
├── package.json
├── tsconfig.json
└── wrangler.jsonc

src/
├── server/
│   ├── auth.ts           # BetterAuth server factory (per-request, D1)
│   ├── auth-client.ts    # BetterAuth client for browser
│   └── beta-db.ts        # beta_registrations D1 CRUD
├── lib/
│   └── betaSchema.ts     # Beta form Valibot schemas
├── routes/
│   ├── api/
│   │   ├── auth/
│   │   │   └── $.ts      # BetterAuth catch-all handler
│   │   └── beta/
│   │       └── register.ts # Beta registration API
│   └── beta.tsx          # Beta program page
└── components/
    ├── BetaForm.tsx       # Auth + form + modal orchestration
    └── BetaTermsModal.tsx # Terms checklist modal

migrations/
└── 0003_beta_registrations.sql
```

### Modified Files

```
pnpm-workspace.yaml       # Add packages: ['workers/*']
wrangler.jsonc             # Add Service Binding + D1 shared
src/server/env.ts          # Add BETA_WORKER, BetterAuth env vars
package.json               # Add BetterAuth + HeroUI dependencies
src/styles/app.css         # Add @heroui/styles import
```

---

### Task 1: Workspace + Beta Worker Project Setup

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `workers/beta-worker/package.json`
- Create: `workers/beta-worker/tsconfig.json`
- Create: `workers/beta-worker/wrangler.jsonc`

- [ ] **Step 1: Update pnpm-workspace.yaml**

Add `packages` field at the top of the file:

```yaml
packages:
  - 'workers/*'

allowBuilds:
  esbuild: true
  sharp: true
  workerd: true
minimumReleaseAgeExclude:
  - '@cloudflare/vite-plugin@1.39.0'
  - '@tanstack/react-start-client@1.168.5'
  - '@tanstack/react-start@1.168.14'
  - miniflare@4.20260526.0
  - wrangler@4.95.0
```

- [ ] **Step 2: Create beta-worker directory**

```bash
mkdir -p workers/beta-worker/src
```

- [ ] **Step 3: Create `workers/beta-worker/package.json`**

```json
{
  "name": "eqmonitor-beta-worker",
  "private": true,
  "type": "module",
  "version": "0.0.1",
  "exports": {
    ".": {
      "types": "./src/index.ts"
    }
  },
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "cf-typegen": "wrangler types"
  },
  "dependencies": {
    "@hono/valibot-validator": "^0.5.0",
    "hono": "^4.7.0",
    "jose": "^6.0.0",
    "valibot": "^1.1.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250525.0",
    "typescript": "^6.0.3",
    "wrangler": "^4.95.0"
  }
}
```

- [ ] **Step 4: Create `workers/beta-worker/tsconfig.json`**

```json
{
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", ".wrangler"],
  "compilerOptions": {
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "noEmit": true
  }
}
```

- [ ] **Step 5: Create `workers/beta-worker/wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "eqmonitor-beta-worker",
  "main": "src/index.ts",
  "compatibility_date": "2025-09-24",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "eqmonitor-site-inquiries",
      "database_id": "d98dba26-a8c3-4f4a-8b89-66ffc07c1901"
    }
  ],
  "workflows": [
    {
      "name": "beta-registration-workflow",
      "binding": "BETA_WORKFLOW",
      "class_name": "BetaRegistrationWorkflow"
    }
  ]
}
```

- [ ] **Step 6: Install dependencies**

```bash
cd workers/beta-worker && pnpm install
```

- [ ] **Step 7: Generate Cloudflare types**

```bash
cd workers/beta-worker && pnpm cf-typegen
```

- [ ] **Step 8: Commit**

```bash
git add pnpm-workspace.yaml workers/beta-worker/package.json workers/beta-worker/tsconfig.json workers/beta-worker/wrangler.jsonc workers/beta-worker/pnpm-lock.yaml
git commit -m "feat(beta): scaffold eqmonitor-beta-worker workspace package"
```

---

### Task 2: Beta Worker — Valibot Schemas

**Files:**
- Create: `workers/beta-worker/src/schemas.ts`

- [ ] **Step 1: Create `workers/beta-worker/src/schemas.ts`**

```typescript
import * as v from 'valibot'

export const RegisterRequestSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
  firstName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
  lastName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100))),
  betaGroupId: v.pipe(v.string(), v.minLength(1)),
  registrationId: v.pipe(v.string(), v.minLength(1)),
})

export type RegisterRequest = v.InferOutput<typeof RegisterRequestSchema>

export const RegisterResponseSchema = v.object({
  ok: v.literal(true),
  workflowId: v.string(),
})

export type RegisterResponse = v.InferOutput<typeof RegisterResponseSchema>

export const ErrorResponseSchema = v.object({
  ok: v.literal(false),
  error: v.string(),
})

export type ErrorResponse = v.InferOutput<typeof ErrorResponseSchema>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd workers/beta-worker && npx tsc --noEmit
```

Expected: No errors (or only missing module errors for files not yet created).

- [ ] **Step 3: Commit**

```bash
git add workers/beta-worker/src/schemas.ts
git commit -m "feat(beta-worker): add Valibot request/response schemas"
```

---

### Task 3: Beta Worker — App Store Connect JWT + API Client

**Files:**
- Create: `workers/beta-worker/src/asc-jwt.ts`
- Create: `workers/beta-worker/src/asc-api.ts`

- [ ] **Step 1: Create `workers/beta-worker/src/asc-jwt.ts`**

```typescript
import { importPKCS8, SignJWT } from 'jose'

export async function generateASCJwt(
  keyId: string,
  issuerId: string,
  privateKey: string,
): Promise<string> {
  const key = await importPKCS8(privateKey, 'ES256')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setIssuedAt(now)
    .setExpirationTime(now + 20 * 60)
    .setAudience('appstoreconnect-v1')
    .sign(key)
}
```

- [ ] **Step 2: Create `workers/beta-worker/src/asc-api.ts`**

```typescript
import { generateASCJwt } from './asc-jwt'

const ASC_BASE = 'https://api.appstoreconnect.apple.com/v1'

interface ASCEnv {
  APP_STORE_CONNECT_KEY_ID: string
  APP_STORE_CONNECT_ISSUER_ID: string
  APP_STORE_CONNECT_PRIVATE_KEY: string
}

export interface AddTesterResult {
  testerId: string
}

export async function addBetaTester(
  env: ASCEnv,
  params: {
    email: string
    firstName?: string
    lastName?: string
    betaGroupId: string
  },
): Promise<AddTesterResult> {
  const jwt = await generateASCJwt(
    env.APP_STORE_CONNECT_KEY_ID,
    env.APP_STORE_CONNECT_ISSUER_ID,
    env.APP_STORE_CONNECT_PRIVATE_KEY,
  )

  const body = {
    data: {
      type: 'betaTesters',
      attributes: {
        email: params.email,
        firstName: params.firstName ?? '',
        lastName: params.lastName ?? '',
      },
      relationships: {
        betaGroups: {
          data: [{ type: 'betaGroups', id: params.betaGroupId }],
        },
      },
    },
  }

  const res = await fetch(`${ASC_BASE}/betaTesters`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`App Store Connect API error (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { data: { id: string } }
  return { testerId: json.data.id }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd workers/beta-worker && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add workers/beta-worker/src/asc-jwt.ts workers/beta-worker/src/asc-api.ts
git commit -m "feat(beta-worker): add App Store Connect JWT auth and API client"
```

---

### Task 4: Beta Worker — Hono App + Workflow + Entry Point

**Files:**
- Create: `workers/beta-worker/src/app.ts`
- Create: `workers/beta-worker/src/index.ts`

- [ ] **Step 1: Create `workers/beta-worker/src/app.ts`**

```typescript
import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { RegisterRequestSchema } from './schemas'
import type { Env } from './index'

const app = new Hono<{ Bindings: Env }>()

const route = app.post(
  '/register',
  vValidator('json', RegisterRequestSchema),
  async (c) => {
    const data = c.req.valid('json')

    const instance = await c.env.BETA_WORKFLOW.create({
      params: {
        registrationId: data.registrationId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        betaGroupId: data.betaGroupId,
      },
    })

    return c.json({ ok: true as const, workflowId: instance.id }, 201)
  },
)

export type AppType = typeof route
export { app }
```

- [ ] **Step 2: Create `workers/beta-worker/src/index.ts`**

```typescript
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from 'cloudflare:workers'
import { app } from './app'
import { addBetaTester } from './asc-api'

export interface Env {
  DB: D1Database
  BETA_WORKFLOW: Workflow
  APP_STORE_CONNECT_KEY_ID: string
  APP_STORE_CONNECT_ISSUER_ID: string
  APP_STORE_CONNECT_PRIVATE_KEY: string
  BETA_GROUP_ID: string
}

interface BetaRegistrationParams {
  registrationId: string
  email: string
  firstName?: string
  lastName?: string
  betaGroupId: string
}

export class BetaRegistrationWorkflow extends WorkflowEntrypoint<
  Env,
  BetaRegistrationParams
> {
  async run(
    event: WorkflowEvent<BetaRegistrationParams>,
    step: WorkflowStep,
  ) {
    const { registrationId, email, firstName, lastName, betaGroupId } =
      event.payload

    const result = await step.do(
      'add-to-testflight',
      {
        retries: { limit: 3, delay: '5 seconds', backoff: 'linear' },
      },
      async () => {
        return await addBetaTester(this.env, {
          email,
          firstName,
          lastName,
          betaGroupId,
        })
      },
    )

    await step.do('update-registration-status', async () => {
      await this.env.DB.prepare(
        `UPDATE beta_registrations
         SET status = 'added', testflight_added_at = ?
         WHERE id = ?`,
      )
        .bind(new Date().toISOString(), registrationId)
        .run()
    })

    return { testerId: result.testerId }
  }
}

export type { AppType } from './app'
export default app
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd workers/beta-worker && npx tsc --noEmit
```

- [ ] **Step 4: Verify worker starts locally**

```bash
cd workers/beta-worker && pnpm dev
```

Expected: Worker starts on a local port. Press Ctrl+C to stop.

- [ ] **Step 5: Commit**

```bash
git add workers/beta-worker/src/app.ts workers/beta-worker/src/index.ts
git commit -m "feat(beta-worker): add Hono routes and BetaRegistrationWorkflow"
```

---

### Task 5: Main Site — D1 Migration

**Files:**
- Create: `migrations/0003_beta_registrations.sql`

- [ ] **Step 1: Create `migrations/0003_beta_registrations.sql`**

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

- [ ] **Step 2: Apply migration locally**

```bash
pnpm db:migrate:local
```

Expected: Migration applied successfully.

- [ ] **Step 3: Verify table exists**

```bash
wrangler d1 execute eqmonitor-site-inquiries --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name='beta_registrations'"
```

Expected: `beta_registrations` が表示される。

- [ ] **Step 4: Commit**

```bash
git add migrations/0003_beta_registrations.sql
git commit -m "feat(beta): add beta_registrations D1 migration"
```

---

### Task 6: Main Site — Dependencies + Config Updates

**Files:**
- Modify: `package.json`
- Modify: `wrangler.jsonc`
- Modify: `src/server/env.ts`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Install BetterAuth + HeroUI + dependencies**

```bash
pnpm add better-auth jose @better-auth-ui/heroui @better-auth-ui/react @better-auth-ui/core @heroui/react @heroui/styles @tanstack/react-query @tanstack/react-pacer @gravity-ui/icons @internationalized/date bowser eqmonitor-beta-worker@workspace:*
```

- [ ] **Step 2: Update `wrangler.jsonc` — add Service Binding**

Add `services` array after the `d1_databases` block:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "eqmonitor-site",
  "compatibility_date": "2025-09-24",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "main": "@tanstack/react-start/server-entry",
  "observability": {
    "enabled": true
  },
  "vars": {
    "TURNSTILE_SITE_KEY": "0x4AAAAAADXHIKnSew1W7HAw",
    "GITHUB_OWNER": "YumNumm",
    "GITHUB_REPO": "eqmonitor-backend"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "eqmonitor-site-inquiries",
      "migrations_dir": "migrations",
      "database_id": "d98dba26-a8c3-4f4a-8b89-66ffc07c1901"
    }
  ],
  "services": [
    {
      "binding": "BETA_WORKER",
      "service": "eqmonitor-beta-worker"
    }
  ],
  "routes": [
    {
      "custom_domain": true,
      "pattern": "eqmonitor.app"
    }
  ]
}
```

- [ ] **Step 3: Update `src/server/env.ts`**

```typescript
import { env } from 'cloudflare:workers'

export interface AppEnv {
  // bindings
  DB: D1Database

  // service bindings
  BETA_WORKER: Fetcher

  // public vars (wrangler.jsonc)
  TURNSTILE_SITE_KEY: string
  GITHUB_OWNER: string
  GITHUB_REPO: string

  // secrets (.dev.vars / wrangler secret)
  TURNSTILE_SECRET_KEY: string
  GITHUB_TOKEN: string

  // BetterAuth Apple OAuth secrets
  APPLE_CLIENT_ID: string
  APPLE_TEAM_ID: string
  APPLE_KEY_ID: string
  APPLE_PRIVATE_KEY: string

  // Beta config
  BETA_GROUP_ID: string
}

export const appEnv = env as unknown as AppEnv
```

- [ ] **Step 4: Add HeroUI styles to `src/styles/app.css`**

`@import "@heroui/styles";` の行を `@import "tailwindcss";` の直後に追加:

```css
@import "tailwindcss";
@import "@heroui/styles";
@plugin "daisyui" {
  themes: false;
}
/* ... rest of file unchanged ... */
```

- [ ] **Step 5: Regenerate Cloudflare types**

```bash
pnpm cf-typegen
```

- [ ] **Step 6: Verify build**

```bash
pnpm build
```

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml wrangler.jsonc src/server/env.ts src/styles/app.css
git commit -m "feat(beta): add BetterAuth + HeroUI deps, Service Binding, env config"
```

---

### Task 7: Main Site — BetterAuth Server + Client + API Route

**Files:**
- Create: `src/server/auth.ts`
- Create: `src/server/auth-client.ts`
- Create: `src/routes/api/auth/$.ts`

- [ ] **Step 1: Create `src/server/auth.ts`**

```typescript
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { importPKCS8, SignJWT } from 'jose'
import type { AppEnv } from './env'

async function generateAppleClientSecret(env: AppEnv): Promise<string> {
  const key = await importPKCS8(env.APPLE_PRIVATE_KEY, 'ES256')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env.APPLE_KEY_ID })
    .setIssuer(env.APPLE_TEAM_ID)
    .setSubject(env.APPLE_CLIENT_ID)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key)
}

let cachedAuth: ReturnType<typeof betterAuth> | null = null
let cachedSecretExpiry = 0

export async function getAuth(env: AppEnv) {
  const now = Date.now()
  if (cachedAuth && now < cachedSecretExpiry) return cachedAuth

  const clientSecret = await generateAppleClientSecret(env)

  cachedAuth = betterAuth({
    database: env.DB,
    trustedOrigins: ['https://appleid.apple.com'],
    socialProviders: {
      apple: {
        clientId: env.APPLE_CLIENT_ID,
        clientSecret,
      },
    },
    plugins: [tanstackStartCookies()],
  })

  cachedSecretExpiry = now + 90 * 24 * 60 * 60 * 1000

  return cachedAuth
}
```

- [ ] **Step 2: Create `src/server/auth-client.ts`**

```typescript
import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient()
```

- [ ] **Step 3: Create API route directory**

```bash
mkdir -p src/routes/api/auth
```

- [ ] **Step 4: Create `src/routes/api/auth/$.ts`**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '~/server/auth'
import { appEnv } from '~/server/env'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await getAuth(appEnv)
        return auth.handler(request)
      },
      POST: async ({ request }) => {
        const auth = await getAuth(appEnv)
        return auth.handler(request)
      },
    },
  },
})
```

- [ ] **Step 5: Run BetterAuth migration programmatically**

BetterAuth のテーブルは初回リクエスト時に自動生成される（Kysely adapter + D1 の場合）。ローカルで確認するため、dev サーバーを起動して `/api/auth/ok` にアクセスする:

```bash
pnpm dev &
sleep 3
curl -s http://localhost:3000/api/auth/ok
kill %1
```

Expected: レスポンスが返る。D1 に user, session, account, verification テーブルが作成される。

もしテーブルが自動作成されない場合、以下のスクリプトを一度実行する:

```bash
wrangler d1 execute eqmonitor-site-inquiries --local --command "
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user(id),
  token TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user(id),
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  idToken TEXT,
  password TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);"
```

- [ ] **Step 6: Commit**

```bash
git add src/server/auth.ts src/server/auth-client.ts src/routes/api/auth
git commit -m "feat(beta): add BetterAuth server, client, and API catch-all route"
```

---

### Task 8: Main Site — Beta Registration Backend

**Files:**
- Create: `src/server/beta-db.ts`
- Create: `src/lib/betaSchema.ts`
- Create: `src/routes/api/beta/register.ts`

- [ ] **Step 1: Create `src/lib/betaSchema.ts`**

```typescript
import * as v from 'valibot'

export const BetaRegistrationFormSchema = v.object({
  platform: v.picklist(['ios']),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'メールアドレスを入力してください'),
    v.email('メールアドレスの形式が不正です'),
  ),
})

export type BetaRegistrationFormInput = v.InferInput<
  typeof BetaRegistrationFormSchema
>
```

- [ ] **Step 2: Create `src/server/beta-db.ts`**

```typescript
export interface BetaRegistration {
  id: string
  user_id: string
  email: string
  platform: string
  status: string
  workflow_id: string | null
  created_at: string
  testflight_added_at: string | null
  error_message: string | null
}

export async function insertBetaRegistration(
  db: D1Database,
  registration: {
    id: string
    userId: string
    email: string
    platform: string
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO beta_registrations (id, user_id, email, platform, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    )
    .bind(
      registration.id,
      registration.userId,
      registration.email,
      registration.platform,
      new Date().toISOString(),
    )
    .run()
}

export async function updateWorkflowId(
  db: D1Database,
  id: string,
  workflowId: string,
): Promise<void> {
  await db
    .prepare('UPDATE beta_registrations SET workflow_id = ? WHERE id = ?')
    .bind(workflowId, id)
    .run()
}

export async function getBetaRegistrationByUserId(
  db: D1Database,
  userId: string,
): Promise<BetaRegistration | null> {
  return await db
    .prepare('SELECT * FROM beta_registrations WHERE user_id = ?')
    .bind(userId)
    .first<BetaRegistration>()
}
```

- [ ] **Step 3: Create API route directory**

```bash
mkdir -p src/routes/api/beta
```

- [ ] **Step 4: Create `src/routes/api/beta/register.ts`**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import * as v from 'valibot'
import { hc } from 'hono/client'
import type { AppType } from 'eqmonitor-beta-worker'
import { getAuth } from '~/server/auth'
import { appEnv } from '~/server/env'
import {
  insertBetaRegistration,
  updateWorkflowId,
  getBetaRegistrationByUserId,
} from '~/server/beta-db'
import { BetaRegistrationFormSchema } from '~/lib/betaSchema'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/beta/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await getAuth(appEnv)
        const session = await auth.api.getSession({
          headers: request.headers,
        })
        if (!session) {
          return json({ error: 'unauthorized' }, 401)
        }

        let parsed: v.InferOutput<typeof BetaRegistrationFormSchema>
        try {
          const raw = await request.json()
          parsed = v.parse(BetaRegistrationFormSchema, raw)
        } catch {
          return json({ error: 'invalid_request' }, 400)
        }

        const existing = await getBetaRegistrationByUserId(
          appEnv.DB,
          session.user.id,
        )
        if (existing) {
          return json({ error: 'already_registered', registration: existing }, 409)
        }

        const id = crypto.randomUUID()
        await insertBetaRegistration(appEnv.DB, {
          id,
          userId: session.user.id,
          email: parsed.email,
          platform: parsed.platform,
        })

        const client = hc<AppType>('http://dummy', {
          fetch: appEnv.BETA_WORKER.fetch.bind(appEnv.BETA_WORKER),
        })
        const res = await client.register.$post({
          json: {
            email: parsed.email,
            betaGroupId: appEnv.BETA_GROUP_ID,
            registrationId: id,
          },
        })

        if (!res.ok) {
          return json({ error: 'workflow_failed' }, 500)
        }

        const result = await res.json()
        await updateWorkflowId(appEnv.DB, id, result.workflowId)

        return json({ ok: true, id, workflowId: result.workflowId })
      },
    },
  },
})
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/betaSchema.ts src/server/beta-db.ts src/routes/api/beta
git commit -m "feat(beta): add registration API with D1 + Service Binding"
```

---

### Task 9: Main Site — Beta Page UI

**Files:**
- Create: `src/components/BetaTermsModal.tsx`
- Create: `src/components/BetaForm.tsx`
- Create: `src/routes/beta.tsx`

- [ ] **Step 1: Create `src/components/BetaTermsModal.tsx`**

```tsx
import { useState } from 'react'

const TERMS = [
  'このベータプログラムで配信されるアプリケーションはベータ版であり、事前の予告なしにサービスの全体もしくは一部が動作停止する可能性があります。',
  '自動的に配布されるため、1日に複数回配布される可能性があります。',
  '正式版リリース後は、ベータプログラムを終了する可能性があります。',
  '要望・不具合があった場合は、SNSで呟いたり投稿せず、フィードバックページにご連絡をお願いいたします。',
] as const

interface BetaTermsModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  submitting: boolean
}

export function BetaTermsModal({
  open,
  onClose,
  onConfirm,
  submitting,
}: BetaTermsModalProps) {
  const [checked, setChecked] = useState<boolean[]>(
    Array(TERMS.length).fill(false),
  )
  const allChecked = checked.every(Boolean)

  function toggle(index: number) {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)))
  }

  return (
    <dialog className={`modal ${open ? 'modal-open' : ''}`}>
      <div className="modal-box max-w-lg">
        <h3 className="text-lg font-bold mb-4">注意事項</h3>
        <p className="text-sm text-base-content/70 mb-4">
          以下の注意事項をすべて確認し、チェックを入れてください。
        </p>
        <div className="flex flex-col gap-3">
          {TERMS.map((term, i) => (
            <label key={i} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-primary mt-1 shrink-0"
                checked={checked[i]}
                onChange={() => toggle(i)}
              />
              <span className="text-sm">{term}</span>
            </label>
          ))}
        </div>
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allChecked || submitting}
            onClick={onConfirm}
          >
            {submitting ? '処理中…' : 'ベータプログラムに参加'}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  )
}
```

- [ ] **Step 2: Create `src/components/BetaForm.tsx`**

```tsx
import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import * as v from 'valibot'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, SignIn } from '@better-auth-ui/heroui'
import { HeroUIProvider } from '@heroui/react'
import { authClient } from '~/server/auth-client'
import { BetaRegistrationFormSchema } from '~/lib/betaSchema'
import { BetaTermsModal } from './BetaTermsModal'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const queryClient = new QueryClient()

function BetaFormInner() {
  const [email, setEmail] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const session = authClient.useSession()

  if (session.isPending) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (!session.data) {
    return (
      <div className="max-w-md mx-auto">
        <p className="text-base-content/70 mb-6 text-center">
          ベータプログラムに参加するには、Apple
          アカウントでサインインしてください。
        </p>
        <SignIn socialLayout="horizontal" />
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="alert alert-success max-w-md mx-auto">
        <span>
          ベータプログラムへの参加登録が完了しました。TestFlight
          への招待をお待ちください。
        </span>
      </div>
    )
  }

  function handleNext() {
    const validated = v.safeParse(BetaRegistrationFormSchema, {
      platform: 'ios',
      email,
    })
    if (!validated.success) {
      setErrorMsg(validated.issues[0].message)
      setStatus('error')
      return
    }
    setErrorMsg('')
    setShowModal(true)
  }

  async function handleConfirm() {
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/beta/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'ios', email }),
      })
      if (res.ok) {
        setStatus('success')
        setShowModal(false)
      } else {
        const data = await res.json().catch(() => ({}))
        const error = (data as { error?: string }).error
        if (error === 'already_registered') {
          setErrorMsg('既にベータプログラムに登録されています。')
        } else {
          setErrorMsg('登録に失敗しました。時間をおいて再度お試しください。')
        }
        setStatus('error')
        setShowModal(false)
      }
    } catch {
      setErrorMsg('通信エラーが発生しました。')
      setStatus('error')
      setShowModal(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 max-w-md mx-auto">
        <label className="form-control w-full">
          <span className="label-text mb-1">プラットフォーム</span>
          <select className="select select-bordered w-full" disabled>
            <option value="ios">iOS</option>
            <option value="android" disabled>
              Android（近日対応予定）
            </option>
          </select>
        </label>

        <label className="form-control w-full">
          <span className="label-text mb-1">メールアドレス</span>
          <input
            type="email"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <span className="label-text-alt mt-1 text-base-content/50">
            TestFlight の招待に使用されます
          </span>
        </label>

        {status === 'error' && (
          <div className="alert alert-error">
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={!email.trim() || status === 'submitting'}
          onClick={handleNext}
        >
          次へ
        </button>
      </div>

      <BetaTermsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        submitting={status === 'submitting'}
      />
    </>
  )
}

export function BetaForm() {
  const router = useRouter()
  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <AuthProvider
          authClient={authClient}
          navigate={({ to, replace }) => router.navigate({ to, replace })}
          socialProviders={['apple']}
        >
          <BetaFormInner />
        </AuthProvider>
      </HeroUIProvider>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Create `src/routes/beta.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { seo } from '~/utils/seo'
import { BetaForm } from '~/components/BetaForm'

export const Route = createFileRoute('/beta')({
  head: () => ({
    meta: seo({
      title: 'ベータプログラム | EQMonitor',
      description:
        'EQMonitor v3 ベータプログラムに参加して、最新の機能をいち早く体験しましょう。',
    }),
  }),
  component: BetaPage,
})

function BetaPage() {
  return (
    <div className="p-8 max-w-[1024px] mx-auto">
      <h1 className="text-3xl font-bold mb-2">EQMonitor v3 ベータプログラム</h1>
      <p className="text-base-content/70 mb-8">
        EQMonitor v3
        の最新機能をいち早く体験できるベータプログラムです。TestFlight
        経由で最新ビルドが自動配信されます。
      </p>
      <BetaForm />
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build
```

- [ ] **Step 5: Start dev server and verify page**

```bash
pnpm dev
```

ブラウザで `http://localhost:3000/beta` を開き:
1. Sign in with Apple ボタンが表示されること（ローカルでは Apple Sign-In は動作しないため、表示確認のみ）
2. ページのレイアウトが崩れていないこと

- [ ] **Step 6: Commit**

```bash
git add src/components/BetaTermsModal.tsx src/components/BetaForm.tsx src/routes/beta.tsx
git commit -m "feat(beta): add beta program page with sign-in, form, and terms modal"
```

---

### Task 10: Deploy + Verify

- [ ] **Step 1: Set secrets for eqmonitor-beta-worker**

```bash
cd workers/beta-worker
wrangler secret put APP_STORE_CONNECT_KEY_ID
wrangler secret put APP_STORE_CONNECT_ISSUER_ID
wrangler secret put APP_STORE_CONNECT_PRIVATE_KEY
wrangler secret put BETA_GROUP_ID
```

- [ ] **Step 2: Deploy beta-worker**

```bash
cd workers/beta-worker && pnpm deploy
```

- [ ] **Step 3: Set secrets for eqmonitor-site**

```bash
wrangler secret put APPLE_CLIENT_ID
wrangler secret put APPLE_TEAM_ID
wrangler secret put APPLE_KEY_ID
wrangler secret put APPLE_PRIVATE_KEY
wrangler secret put BETA_GROUP_ID
```

- [ ] **Step 4: Apply D1 migration to remote**

```bash
pnpm db:migrate:remote
```

- [ ] **Step 5: Deploy main site**

```bash
pnpm deploy
```

- [ ] **Step 6: Verify end-to-end**

1. `https://eqmonitor.app/beta` にアクセス
2. Sign in with Apple でサインイン
3. メールアドレスを入力、「次へ」をクリック
4. 注意事項モーダルで 4 つ全てにチェック
5. 「ベータプログラムに参加」をクリック
6. 成功メッセージが表示されることを確認
7. D1 で beta_registrations にレコードが作成されていることを確認:

```bash
wrangler d1 execute eqmonitor-site-inquiries --remote --command "SELECT * FROM beta_registrations"
```
