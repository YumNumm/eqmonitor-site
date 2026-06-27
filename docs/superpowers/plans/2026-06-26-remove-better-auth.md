# better-auth剥がし + Turnstileベータ登録 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** better-authを完全に削除し、Cloudflare Turnstile + メール入力でベータ登録できるようにし、登録後のWorkflow進捗をポーリングして表示する。

**Architecture:** フロントエンド（TanStack Start + React）からTurnstile検証付きのserver functionでベータ登録し、Beta Worker（Hono + Cloudflare Workflows）にservice bindingで処理を委譲する。登録後はBeta Workerの新規ステータスエンドポイントを2秒ポーリングして進捗UIを表示する。

**Tech Stack:** React, TanStack Start (server functions), Valibot, Cloudflare Workers (D1, Workflows, Turnstile), Hono, DaisyUI

## Global Constraints

- パッケージマネージャは `pnpm` を使用（npx禁止）
- Turnstile site key: `0x4AAAAAADXHIKnSew1W7HAw`（public、wrangler.jsonc vars）
- D1データベース名: `eqmonitor-site-inquiries`
- Beta Worker service binding名: `BETA_WORKER`
- Workflow binding名: `BETA_WORKFLOW`

---

### Task 1: D1マイグレーション — better-authテーブル削除 + beta_registrations変更

**Files:**
- Create: `migrations/0005_remove_better_auth.sql`

**Interfaces:**
- Consumes: なし
- Produces: `beta_registrations` テーブルから `user_id` カラムが除去された状態。以降のタスクは `email` をキーとして使う。

- [ ] **Step 1: マイグレーションファイルを作成**

```sql
-- 0005_remove_better_auth.sql

-- Drop BetterAuth tables
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS "user";

-- Recreate beta_registrations without user_id
-- D1 does not support DROP COLUMN, so we recreate the table
CREATE TABLE beta_registrations_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  status TEXT NOT NULL DEFAULT 'pending',
  workflow_id TEXT,
  created_at TEXT NOT NULL,
  testflight_added_at TEXT,
  error_message TEXT
);

INSERT INTO beta_registrations_new (id, email, platform, status, workflow_id, created_at, testflight_added_at, error_message)
  SELECT id, email, platform, status, workflow_id, created_at, testflight_added_at, error_message
  FROM beta_registrations;

DROP TABLE beta_registrations;
ALTER TABLE beta_registrations_new RENAME TO beta_registrations;
```

- [ ] **Step 2: ローカルで適用して確認**

Run: `pnpm run db:migrate:local`
Expected: 成功メッセージ。better-authテーブルが消え、beta_registrationsにuser_idカラムがない。

- [ ] **Step 3: Commit**

```bash
git add migrations/0005_remove_better_auth.sql
git commit -m "chore(db): remove better-auth tables and user_id from beta_registrations"
```

---

### Task 2: better-auth依存関係とファイルを削除

**Files:**
- Delete: `src/server/auth.ts`
- Delete: `src/server/auth-client.ts`
- Delete: `src/routes/api/auth/$.ts`
- Modify: `package.json` — better-auth関連パッケージを削除
- Modify: `src/server/env.ts` — Apple OAuth / BetterAuth環境変数を削除

**Interfaces:**
- Consumes: なし
- Produces: `src/server/env.ts` から `AppEnv` の型が以下のみになる:
  ```typescript
  export interface AppEnv {
    DB: D1Database
    BETA_WORKER: Fetcher
    TURNSTILE_SITE_KEY: string
    GITHUB_OWNER: string
    GITHUB_REPO: string
    TURNSTILE_SECRET_KEY: string
    GITHUB_TOKEN: string
    BETA_GROUP_ID: string
  }
  ```

- [ ] **Step 1: ファイルを削除**

```bash
rm src/server/auth.ts src/server/auth-client.ts src/routes/api/auth/$.ts
```

- [ ] **Step 2: package.json から better-auth 関連パッケージを削除**

`package.json` の `dependencies` から以下を削除:
```
"@better-auth/infra": "^0.2.11",
"better-auth": "^1.6.14",
"better-auth-cloudflare": "^0.3.0",
"jose": "^6.2.3",
```

`jose` は `src/server/auth.ts` でのみ使用されていたため一緒に削除する。

- [ ] **Step 3: src/server/env.ts から不要な環境変数を削除**

`src/server/env.ts` を以下に変更:

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

  // Beta config
  BETA_GROUP_ID: string
}

export const appEnv = env as unknown as AppEnv
```

- [ ] **Step 4: pnpm install で依存関係を更新**

Run: `pnpm install`
Expected: lockfile更新、better-auth関連パッケージが除去される。

- [ ] **Step 5: ビルド確認**

Run: `pnpm run build`
Expected: `src/server/auth.ts` や `src/server/auth-client.ts` への参照でビルドエラーが出る（Task 3 で修正予定）。この時点でエラーを確認しておく。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove better-auth dependencies and auth files"
```

---

### Task 3: バックエンド — beta-register.ts と beta-db.ts を Turnstile ベースに変更

**Files:**
- Modify: `src/server/beta-register.ts`
- Modify: `src/server/beta-db.ts`
- Modify: `src/lib/betaSchema.ts`

**Interfaces:**
- Consumes: `verifyTurnstile()` from `src/server/turnstile.ts`, `appEnv` from `src/server/env.ts`
- Produces:
  - `registerBeta` server function: `{ data: { platform: string, email: string, turnstileToken: string } }` → `RegisterResult`
  - `getBetaStatus` server function: `{ data: { workflowId: string } }` → `StatusResult`
  - `getBetaRegistrationByEmail(db, email)` → `BetaRegistration | null`

- [ ] **Step 1: src/lib/betaSchema.ts にturnstileTokenを追加**

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
  turnstileToken: v.pipe(
    v.string(),
    v.minLength(1, '認証を完了してください'),
  ),
})

export type BetaRegistrationFormInput = v.InferInput<
  typeof BetaRegistrationFormSchema
>
```

- [ ] **Step 2: src/server/beta-db.ts を email ベースに変更**

```typescript
export interface BetaRegistration {
  id: string
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
    email: string
    platform: string
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO beta_registrations (id, email, platform, status, created_at)
       VALUES (?, ?, ?, 'pending', ?)`,
    )
    .bind(
      registration.id,
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

export async function getBetaRegistrationByEmail(
  db: D1Database,
  email: string,
): Promise<BetaRegistration | null> {
  return await db
    .prepare('SELECT * FROM beta_registrations WHERE email = ?')
    .bind(email)
    .first<BetaRegistration>()
}
```

- [ ] **Step 3: src/server/beta-register.ts を Turnstile ベースに変更**

```typescript
import { createServerFn } from '@tanstack/react-start'
import * as v from 'valibot'
import { hc } from 'hono/client'
import type { AppType } from 'eqmonitor-beta-worker'
import { appEnv } from './env'
import {
  insertBetaRegistration,
  updateWorkflowId,
  getBetaRegistrationByEmail,
} from './beta-db'
import { verifyTurnstile } from './turnstile'
import { BetaRegistrationFormSchema } from '~/lib/betaSchema'

type RegisterResult =
  | { ok: true; id: string; workflowId: string }
  | { ok: false; error: 'turnstile_failed' | 'already_registered' | 'workflow_failed' }

export const registerBeta = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => v.parse(BetaRegistrationFormSchema, d))
  .handler(async ({ data }): Promise<RegisterResult> => {
    const turnstileOk = await verifyTurnstile({
      secretKey: appEnv.TURNSTILE_SECRET_KEY,
      token: data.turnstileToken,
    })
    if (!turnstileOk) {
      return { ok: false, error: 'turnstile_failed' }
    }

    const existing = await getBetaRegistrationByEmail(appEnv.DB, data.email)
    if (existing) {
      return { ok: false, error: 'already_registered' }
    }

    const id = crypto.randomUUID()
    await insertBetaRegistration(appEnv.DB, {
      id,
      email: data.email,
      platform: data.platform,
    })

    const client = hc<AppType>('http://dummy', {
      fetch: appEnv.BETA_WORKER.fetch.bind(appEnv.BETA_WORKER),
    })
    const res = await client.register.$post({
      json: {
        email: data.email,
        betaGroupId: appEnv.BETA_GROUP_ID,
        registrationId: id,
      },
    })

    if (!res.ok) {
      return { ok: false, error: 'workflow_failed' }
    }

    const result = await res.json()
    await updateWorkflowId(appEnv.DB, id, result.workflowId)

    return { ok: true, id, workflowId: result.workflowId }
  })
```

- [ ] **Step 4: ビルド確認**

Run: `pnpm run build`
Expected: beta-register.ts, beta-db.ts 関連のエラーがなくなる。BetaForm.tsx側はまだエラーが出る可能性あり（Task 5で修正）。

- [ ] **Step 5: Commit**

```bash
git add src/server/beta-register.ts src/server/beta-db.ts src/lib/betaSchema.ts
git commit -m "feat(beta): switch registration from better-auth to Turnstile verification"
```

---

### Task 4: Beta Worker — ステータスエンドポイント追加

**Files:**
- Modify: `workers/beta-worker/src/app.ts` — `GET /status/:workflowId` ルートを追加

**Interfaces:**
- Consumes: `env.BETA_WORKFLOW` binding (Cloudflare Workflows)
- Produces: `GET /status/:workflowId` エンドポイント。レスポンス型:
  ```typescript
  { status: 'queued' | 'running' | 'complete' | 'errored'; output?: unknown; error?: string }
  ```
  Hono の型付きクライアント `AppType` にこのルートが含まれる。

- [ ] **Step 1: workers/beta-worker/src/app.ts にステータスルートを追加**

```typescript
import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { RegisterRequestSchema } from './schemas'

const app = new Hono<{ Bindings: Cloudflare.Env }>()

const route = app
  .post(
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
  .get('/status/:workflowId', async (c) => {
    const workflowId = c.req.param('workflowId')

    try {
      const instance = await c.env.BETA_WORKFLOW.get(workflowId)
      const status = await instance.status()

      return c.json({
        status: status.status,
        output: status.output,
        error: status.error,
      })
    } catch {
      return c.json({ status: 'errored' as const, error: 'Workflow not found' }, 404)
    }
  })

export type AppType = typeof route
export { app }
```

- [ ] **Step 2: workers/beta-worker/src/index.ts の Env type import を削除（app.ts側で Cloudflare.Env を使用）**

`workers/beta-worker/src/app.ts` で既に `import type { Env } from './index'` していた場合、これを削除して `Cloudflare.Env` に統一する。`workers/beta-worker/src/index.ts` から `export type Env` の行があれば確認し、不要なら削除する。

- [ ] **Step 3: ビルド確認**

Run: `cd workers/beta-worker && pnpm run build` (もしくは `pnpm run typecheck`)
Expected: 型チェック通過

- [ ] **Step 4: Commit**

```bash
git add workers/beta-worker/src/app.ts
git commit -m "feat(beta-worker): add GET /status/:workflowId endpoint"
```

---

### Task 5: サーバーサイド — getBetaStatus server function 追加

**Files:**
- Modify: `src/server/beta-register.ts` — `getBetaStatus` server function を追加

**Interfaces:**
- Consumes: Beta Worker `GET /status/:workflowId` via service binding (`hc<AppType>`)
- Produces: `getBetaStatus` server function: `{ data: { workflowId: string } }` → `{ status: string; output?: unknown; error?: string }`

- [ ] **Step 1: src/server/beta-register.ts に getBetaStatus を追加**

ファイル末尾に追加:

```typescript
const BetaStatusInputSchema = v.object({
  workflowId: v.pipe(v.string(), v.minLength(1)),
})

export const getBetaStatus = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => v.parse(BetaStatusInputSchema, d))
  .handler(async ({ data }) => {
    const client = hc<AppType>('http://dummy', {
      fetch: appEnv.BETA_WORKER.fetch.bind(appEnv.BETA_WORKER),
    })
    const res = await client.status[':workflowId'].$get({
      param: { workflowId: data.workflowId },
    })

    return await res.json()
  })
```

- [ ] **Step 2: ビルド確認**

Run: `pnpm run build`
Expected: 型エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/server/beta-register.ts
git commit -m "feat(beta): add getBetaStatus server function for workflow polling"
```

---

### Task 6: フロントエンド — BetaForm.tsx を Turnstile + ポーリングUIに書き換え

**Files:**
- Modify: `src/components/BetaForm.tsx`
- Modify: `src/routes/beta.tsx` — siteKey の loader を追加

**Interfaces:**
- Consumes:
  - `registerBeta({ data: { platform, email, turnstileToken } })` from `src/server/beta-register.ts`
  - `getBetaStatus({ data: { workflowId } })` from `src/server/beta-register.ts`
  - Turnstile explicit rendering パターン from `ContactForm.tsx`
  - `BetaTermsModal` from `src/components/BetaTermsModal.tsx` (変更なし)
- Produces: 完全なベータ登録UI

- [ ] **Step 1: src/routes/beta.tsx に siteKey loader を追加**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { appEnv } from '~/server/env'
import { seo } from '~/utils/seo'
import { BetaForm } from '~/components/BetaForm'

const getSiteKey = createServerFn().handler(() => {
  return { siteKey: appEnv.TURNSTILE_SITE_KEY }
})

export const Route = createFileRoute('/beta')({
  head: () => ({
    meta: seo({
      title: 'ベータプログラム | EQMonitor',
      description:
        'EQMonitor v3 ベータプログラムに参加して、最新の機能をいち早く体験しましょう。',
    }),
  }),
  loader: () => getSiteKey(),
  component: BetaPage,
})

function BetaPage() {
  const { siteKey } = Route.useLoaderData()
  return (
    <div className="p-8 max-w-[1024px] mx-auto">
      <h1 className="text-3xl font-bold mb-2">EQMonitor v3 ベータプログラム</h1>
      <p className="text-base-content/70 mb-8">
        EQMonitor v3の最新機能をいち早く体験できるベータプログラムです。
        <br />
        TestFlight経由で最新ビルドが自動配信されます。
      </p>
      <BetaForm siteKey={siteKey} />
    </div>
  )
}
```

- [ ] **Step 2: src/components/BetaForm.tsx を書き換え**

```tsx
import { useEffect, useRef, useState } from 'react'
import * as v from 'valibot'
import { BetaRegistrationFormSchema } from '~/lib/betaSchema'
import { registerBeta, getBetaStatus } from '~/server/beta-register'
import { BetaTermsModal } from './BetaTermsModal'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

const TURNSTILE_SCRIPT =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

const WORKFLOW_STEPS = [
  { key: 'add-to-testflight', label: 'TestFlightに追加' },
  { key: 'send-testflight-invitation', label: 'TestFlight招待メール送信' },
  { key: 'update-registration-status', label: '登録ステータス更新' },
  { key: 'send-email', label: '登録完了メール送信' },
] as const

type FormStatus = 'idle' | 'submitting' | 'polling' | 'success' | 'error'

export function BetaForm({ siteKey }: { siteKey: string }) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [workflowStatus, setWorkflowStatus] = useState<string>('running')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    function renderWidget() {
      if (cancelled || !widgetRef.current || !window.turnstile) return
      if (widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: siteKey,
        theme: 'auto',
        callback: (t) => setToken(t),
        'expired-callback': () => setToken(''),
        'error-callback': () => setToken(''),
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else if (!document.querySelector(`script[src="${TURNSTILE_SCRIPT}"]`)) {
      const script = document.createElement('script')
      script.src = TURNSTILE_SCRIPT
      script.async = true
      script.defer = true
      script.onload = renderWidget
      document.head.appendChild(script)
    } else {
      const timer = setInterval(() => {
        if (window.turnstile) {
          clearInterval(timer)
          renderWidget()
        }
      }, 200)
      return () => clearInterval(timer)
    }

    return () => {
      cancelled = true
    }
  }, [siteKey])

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  function startPolling(workflowId: string) {
    setStatus('polling')
    setWorkflowStatus('running')
    pollCountRef.current = 0

    pollingRef.current = setInterval(async () => {
      pollCountRef.current++

      if (pollCountRef.current > 30) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setErrorMsg('タイムアウトしました。しばらく経ってからメールをご確認ください。')
        setStatus('error')
        return
      }

      try {
        const result = await getBetaStatus({ data: { workflowId } })
        setWorkflowStatus(result.status)

        if (result.status === 'complete') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setStatus('success')
        } else if (result.status === 'errored') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setErrorMsg(result.error ?? '登録処理中にエラーが発生しました。')
          setStatus('error')
        }
      } catch {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setErrorMsg('ステータスの取得に失敗しました。')
        setStatus('error')
      }
    }, 2000)
  }

  function handleNext() {
    const validated = v.safeParse(BetaRegistrationFormSchema, {
      platform: 'ios',
      email,
      turnstileToken: token,
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
    setShowModal(false)
    try {
      const result = await registerBeta({
        data: { platform: 'ios', email, turnstileToken: token },
      })
      if (result.ok) {
        startPolling(result.workflowId)
      } else {
        if (result.error === 'already_registered') {
          setErrorMsg('既にベータプログラムに登録されています。')
        } else if (result.error === 'turnstile_failed') {
          setErrorMsg('認証に失敗しました。もう一度お試しください。')
        } else {
          setErrorMsg('登録に失敗しました。時間をおいて再度お試しください。')
        }
        setStatus('error')
      }
    } catch {
      setErrorMsg('通信エラーが発生しました。')
      setStatus('error')
    } finally {
      setToken('')
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current)
      }
    }
  }

  if (status === 'polling') {
    return (
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-6">ベータプログラム登録中...</h2>
        <ul className="steps steps-vertical w-full">
          {WORKFLOW_STEPS.map((step) => {
            const isComplete = workflowStatus === 'complete'
            return (
              <li key={step.key} className={`step ${isComplete ? 'step-primary' : ''}`}>
                <div className="flex items-center gap-2">
                  {isComplete ? '✅' : '⏳'}
                  <span>{step.label}</span>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="flex justify-center mt-6">
          <span className="loading loading-spinner loading-md" />
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="alert alert-success max-w-md mx-auto">
        <span>
          ベータプログラムへの登録が完了しました。TestFlight
          の招待メールをご確認ください。
        </span>
      </div>
    )
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

        <div ref={widgetRef} />

        {status === 'error' && (
          <div className="alert alert-error">
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={!email.trim() || !token || status === 'submitting'}
          onClick={handleNext}
        >
          {status === 'submitting' ? '処理中…' : '次へ'}
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
```

- [ ] **Step 3: ビルド確認**

Run: `pnpm run build`
Expected: ビルド成功、型エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/components/BetaForm.tsx src/routes/beta.tsx
git commit -m "feat(beta): rewrite BetaForm with Turnstile and workflow progress polling"
```

---

### Task 7: クリーンアップ — routeTree再生成 + 最終ビルド確認

**Files:**
- Modify: `src/routeTree.gen.ts` (自動生成)

**Interfaces:**
- Consumes: すべての前タスクの成果物
- Produces: ビルドが通る完全な状態

- [ ] **Step 1: routeTree を再生成**

`/api/auth/$` ルートを削除したので、ルートツリーを再生成する。

Run: `pnpm run build`

TanStack Router はビルド時に自動で `routeTree.gen.ts` を再生成する。`/api/auth/$` がルートツリーから消えていることを確認する。

- [ ] **Step 2: 未使用の import がないか確認**

Run: `grep -rn "auth-client\|getAuth\|better-auth\|authClient" src/ --include="*.ts" --include="*.tsx"`
Expected: ヒットなし（すべて削除済み）

- [ ] **Step 3: dev server で動作確認**

Run: `pnpm run dev`

確認項目:
1. `/beta` にアクセスしてフォームが表示される（Apple Sign Inボタンがないこと）
2. Turnstileウィジェットが表示される
3. メール入力 + Turnstile検証 → 「次へ」→ 注意事項モーダルが表示される
4. `/api/auth/signin/apple` に直接アクセスすると404になる

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: regenerate route tree and final cleanup"
```
