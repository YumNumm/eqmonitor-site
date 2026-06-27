# Contact Form Device Info Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** アプリ内 WebView から問い合わせフォームを開いた際に、deviceId・デバイス情報JSON・アプリバージョン・ビルドNumber・OS情報をクエリパラメータで受け取り、フォームに自動挿入して送信できるようにする。

**Architecture:** TanStack Router の `validateSearch` でクエリパラメータをパースし、ContactForm にpropsとして渡す。デバイス情報がある場合はトグル付きのセクションを表示し、ユーザーが送信有無を選択できる。サーバー側は `device_info` TEXT カラムにすべてのデバイス情報をJSON形式で保存する。

**Tech Stack:** TanStack Router (validateSearch), React, valibot, daisyUI (modal/checkbox), D1 (SQLite), GitHub REST API

## Global Constraints

- パッケージマネージャは `pnpm` を使用（npx 禁止）
- クエリパラメータは camelCase: `deviceId`, `appVersion`, `buildNumber`, `os`, `deviceInfo`
- テストフレームワークは未導入のため、手動テストで確認
- 既存の `app_version`, `platform` フィールドは後方互換のため維持

---

### Task 1: D1 マイグレーション — `device_info` カラム追加

**Files:**
- Create: `migrations/0006_add_device_info.sql`
- Modify: `src/server/db.ts:1-19` (Inquiry 型と insertInquiry)

**Interfaces:**
- Consumes: なし
- Produces: `Inquiry.device_info: string | null`, `NewInquiry.device_info: string | null`

- [ ] **Step 1: マイグレーション SQL を作成**

```sql
ALTER TABLE inquiries ADD COLUMN device_info TEXT;
```

- [ ] **Step 2: `src/server/db.ts` の `Inquiry` 型に `device_info` を追加**

`Inquiry` interface に追加:

```typescript
device_info: string | null
```

- [ ] **Step 3: `insertInquiry` に `device_info` を追加**

INSERT 文のカラムリストとプレースホルダーに `device_info` を追加し、`.bind()` に `inquiry.device_info` を追加する。

変更前 (`src/server/db.ts:27-28`):
```typescript
      `INSERT INTO inquiries
        (id, created_at, type, name, email, subject, message, app_version, platform, user_agent, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
```

変更後:
```typescript
      `INSERT INTO inquiries
        (id, created_at, type, name, email, subject, message, app_version, platform, user_agent, device_info, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
```

`.bind()` に `inquiry.device_info` を末尾（`inquiry.user_agent` の後）に追加する。

- [ ] **Step 4: ローカルで D1 マイグレーション適用を確認**

```bash
pnpm wrangler d1 migrations apply eqmonitor-site-inquiries --local
```

- [ ] **Step 5: コミット**

```bash
git add migrations/0006_add_device_info.sql src/server/db.ts
git commit -m "feat(db): add device_info column to inquiries table"
```

---

### Task 2: API スキーマ拡張 — `device_info` フィールド受け付け

**Files:**
- Modify: `src/routes/api/inquiry.ts:9-14` (InquirySchema)
- Modify: `src/routes/api/inquiry.ts:48-59` (insertInquiry 呼び出し)

**Interfaces:**
- Consumes: `NewInquiry.device_info` (Task 1)
- Produces: API POST `/api/inquiry` が `device_info` (optional string) を受け付ける

- [ ] **Step 1: `InquirySchema` に `device_info` を追加**

`src/routes/api/inquiry.ts` の `InquirySchema` に追加:

```typescript
const InquirySchema = v.object({
  ...ContactFormSchema.entries,
  token: v.pipe(v.string(), v.minLength(1, 'Turnstile token が必要です')),
  app_version: v.optional(v.pipe(v.string(), v.maxLength(50))),
  platform: v.optional(v.pipe(v.string(), v.maxLength(50))),
  device_info: v.optional(v.pipe(v.string(), v.maxLength(10000))),
})
```

- [ ] **Step 2: `insertInquiry` 呼び出しに `device_info` を渡す**

`src/routes/api/inquiry.ts` の `insertInquiry` 呼び出し箇所に追加:

```typescript
await insertInquiry(appEnv.DB, {
  id,
  created_at: new Date().toISOString(),
  type: parsed.type,
  name: parsed.name,
  email: parsed.email,
  subject: parsed.subject,
  message: parsed.message,
  app_version: parsed.app_version ?? null,
  platform: parsed.platform ?? null,
  user_agent: request.headers.get('user-agent'),
  device_info: parsed.device_info ?? null,
})
```

- [ ] **Step 3: curl で API 動作確認**

開発サーバー起動後、`device_info` 付きリクエストが 400 (turnstile) になることを確認（スキーマバリデーションは通る）:

```bash
curl -X POST http://localhost:3000/api/inquiry \
  -H 'Content-Type: application/json' \
  -d '{"type":"bug","name":"test","email":"a@b.com","subject":"test","message":"test","token":"dummy","device_info":"{\"model\":\"iPhone 15\"}"}'
```

- [ ] **Step 4: コミット**

```bash
git add src/routes/api/inquiry.ts
git commit -m "feat(api): accept device_info in inquiry endpoint"
```

---

### Task 3: GitHub Issue 本文にデバイス情報を含める

**Files:**
- Modify: `src/server/github.ts:70-84` (createIssue の body 生成)

**Interfaces:**
- Consumes: `Inquiry.device_info` (Task 1)
- Produces: GitHub Issue 本文に `<details>` 折りたたみでデバイス情報を含める

- [ ] **Step 1: `createIssue` の body 生成を修正**

`src/server/github.ts` の `createIssue` 関数内で、`body` 配列生成部分を修正する。

変更前 (`src/server/github.ts:71-84`):
```typescript
  const body = [
    `## ${inquiry.subject}`,
    '',
    inquiry.message,
    '',
    '---',
    `- 受信日時: ${inquiry.created_at}`,
    `- お名前: ${inquiry.name}`,
    `- 連絡先: ${inquiry.email}`,
    inquiry.platform ? `- Platform: ${inquiry.platform}` : null,
    inquiry.app_version ? `- App version: ${inquiry.app_version}` : null,
    `- Inquiry ID: ${inquiry.id}`,
  ]
    .filter((line) => line !== null)
    .join('\n')
```

変更後:
```typescript
  const lines: (string | null)[] = [
    `## ${inquiry.subject}`,
    '',
    inquiry.message,
    '',
    '---',
    `- 受信日時: ${inquiry.created_at}`,
    `- お名前: ${inquiry.name}`,
    `- 連絡先: ${inquiry.email}`,
    inquiry.platform ? `- Platform: ${inquiry.platform}` : null,
    inquiry.app_version ? `- App version: ${inquiry.app_version}` : null,
    `- Inquiry ID: ${inquiry.id}`,
  ]

  if (inquiry.device_info) {
    try {
      const info = JSON.parse(inquiry.device_info)
      const formatted = JSON.stringify(info, null, 2)
      lines.push(
        '',
        '<details>',
        '<summary>デバイス情報</summary>',
        '',
        info.deviceId ? `- Device ID: ${info.deviceId}` : null,
        info.appVersion ? `- App Version: ${info.appVersion}` : null,
        info.buildNumber ? `- Build Number: ${info.buildNumber}` : null,
        info.os ? `- OS: ${info.os}` : null,
        '',
        '```json',
        formatted,
        '```',
        '',
        '</details>',
      )
    } catch {
      lines.push(`- Device Info (raw): ${inquiry.device_info}`)
    }
  }

  const body = lines.filter((line) => line !== null).join('\n')
```

- [ ] **Step 2: コミット**

```bash
git add src/server/github.ts
git commit -m "feat(github): include device info in issue body"
```

---

### Task 4: クエリパラメータスキーマとルート設定

**Files:**
- Create: `src/lib/contactSearchSchema.ts`
- Modify: `src/routes/contact.tsx:1-21` (validateSearch 追加、ContactForm に props 渡し)

**Interfaces:**
- Consumes: なし
- Produces: `ContactSearch` 型、`contactSearchSchema` (valibot schema)。ContactForm が `deviceInfo: ContactSearch | undefined` props を受け取る。

- [ ] **Step 1: クエリパラメータ用のスキーマファイルを作成**

`src/lib/contactSearchSchema.ts`:

```typescript
import * as v from 'valibot'

export const contactSearchSchema = v.object({
  deviceId: v.optional(v.pipe(v.string(), v.maxLength(200))),
  appVersion: v.optional(v.pipe(v.string(), v.maxLength(50))),
  buildNumber: v.optional(v.pipe(v.string(), v.maxLength(50))),
  os: v.optional(v.pipe(v.string(), v.maxLength(100))),
  deviceInfo: v.optional(v.pipe(v.string(), v.maxLength(10000))),
})

export type ContactSearch = v.InferOutput<typeof contactSearchSchema>
```

- [ ] **Step 2: `/contact` ルートに `validateSearch` を追加**

`src/routes/contact.tsx` を修正:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as v from 'valibot'
import { appEnv } from '~/server/env'
import { seo } from '~/utils/seo'
import { ContactForm } from '~/components/ContactForm'
import {
  contactSearchSchema,
  type ContactSearch,
} from '~/lib/contactSearchSchema'

const getSiteKey = createServerFn().handler(() => {
  return { siteKey: appEnv.TURNSTILE_SITE_KEY }
})

export const Route = createFileRoute('/contact')({
  head: () => ({
    meta: seo({
      title: 'お問い合わせ | EQMonitor',
      description:
        'EQMonitor へのお問い合わせ・フィードバック・バグ報告はこちらから。',
    }),
  }),
  validateSearch: (search) => v.parse(contactSearchSchema, search),
  loader: () => getSiteKey(),
  component: Contact,
})

function Contact() {
  const { siteKey } = Route.useLoaderData()
  const search = Route.useSearch()
  const deviceInfo: ContactSearch | undefined = search.deviceId
    ? search
    : undefined

  return (
    <div className="p-8 max-w-[1024px] mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">お問い合わせ</h1>
      <p className="text-center text-base-content/70 mb-8">
        ご意見・ご要望・不具合のご報告をお寄せください。
      </p>
      <div className="alert max-w-xl mx-auto mb-8 border border-info/40 bg-info/20 text-base-content shadow-sm">
        <span>
          いただいたお問い合わせには、基本的に個別の返信は行っておりません。
          ただし、内容はすべて開発者が拝見し、今後の改善の参考にさせていただいています。
        </span>
      </div>
      <ContactForm siteKey={siteKey} deviceInfo={deviceInfo} />
    </div>
  )
}
```

- [ ] **Step 3: コミット**

```bash
git add src/lib/contactSearchSchema.ts src/routes/contact.tsx
git commit -m "feat(contact): add query param validation for device info"
```

---

### Task 5: ContactForm UI — デバイス情報トグルとモーダル

**Files:**
- Modify: `src/components/ContactForm.tsx` (全体)

**Interfaces:**
- Consumes: `ContactSearch` 型 (Task 4), API `device_info` フィールド (Task 2)
- Produces: デバイス情報トグル付きの問い合わせフォームUI

- [ ] **Step 1: `ContactForm` の props に `deviceInfo` を追加**

型定義を変更:

```typescript
import type { ContactSearch } from '~/lib/contactSearchSchema'

export function ContactForm({
  siteKey,
  deviceInfo,
}: {
  siteKey: string
  deviceInfo?: ContactSearch
}) {
```

- [ ] **Step 2: デバイス情報の送信トグル state を追加**

既存の state 宣言の後に追加:

```typescript
const [includeDeviceInfo, setIncludeDeviceInfo] = useState(true)
const [showDeviceInfoModal, setShowDeviceInfoModal] = useState(false)
```

- [ ] **Step 3: `handleSubmit` で `device_info` をペイロードに含める**

送信時、`includeDeviceInfo` が true かつ `deviceInfo` が存在する場合、`device_info` フィールドに JSON 文字列として含める。

`handleSubmit` 内の `fetch` 呼び出しを修正:

```typescript
const payload: Record<string, unknown> = { token, ...validated.output }
if (deviceInfo && includeDeviceInfo) {
  let extra: Record<string, unknown> = {}
  if (deviceInfo.deviceInfo) {
    try {
      extra = JSON.parse(deviceInfo.deviceInfo)
    } catch {
      extra = { raw: deviceInfo.deviceInfo }
    }
  }
  payload.device_info = JSON.stringify({
    deviceId: deviceInfo.deviceId,
    appVersion: deviceInfo.appVersion,
    buildNumber: deviceInfo.buildNumber,
    os: deviceInfo.os,
    ...extra,
  })
}

const res = await fetch('/api/inquiry', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
```

- [ ] **Step 4: フォーム内にデバイス情報セクションを追加**

種別セレクトの前（フォーム先頭）に、`deviceInfo` が存在する場合のみ表示するセクションを追加:

```tsx
{deviceInfo && (
  <div className="flex flex-col gap-2">
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        className="checkbox checkbox-primary"
        checked={includeDeviceInfo}
        onChange={() => setIncludeDeviceInfo(!includeDeviceInfo)}
      />
      <span className="label-text font-medium">
        デバイス情報を含めて送信する
      </span>
    </label>
    <p className="text-sm text-base-content/70 ml-9">
      デバイス情報を含めることで、開発者がエラーログや通知の配信状況を確認できるようになります。
      また、デバイス情報と問い合わせ情報（名前・メールアドレスなど）が紐付けられます。
    </p>
    <button
      type="button"
      className="link link-primary text-sm ml-9 w-fit"
      onClick={() => setShowDeviceInfoModal(true)}
    >
      含まれる情報
    </button>
  </div>
)}
```

- [ ] **Step 5: デバイス情報モーダルを追加**

フォームの外（`</form>` の後）に、daisyUI の `<dialog>` モーダルを追加:

```tsx
{deviceInfo && (
  <dialog className={`modal ${showDeviceInfoModal ? 'modal-open' : ''}`}>
    <div className="modal-box max-w-lg">
      <h3 className="text-lg font-bold mb-4">デバイス情報</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {deviceInfo.deviceId && (
          <>
            <dt className="font-medium text-base-content/70">Device ID</dt>
            <dd className="break-all">{deviceInfo.deviceId}</dd>
          </>
        )}
        {deviceInfo.appVersion && (
          <>
            <dt className="font-medium text-base-content/70">App Version</dt>
            <dd>{deviceInfo.appVersion}</dd>
          </>
        )}
        {deviceInfo.buildNumber && (
          <>
            <dt className="font-medium text-base-content/70">Build Number</dt>
            <dd>{deviceInfo.buildNumber}</dd>
          </>
        )}
        {deviceInfo.os && (
          <>
            <dt className="font-medium text-base-content/70">OS</dt>
            <dd>{deviceInfo.os}</dd>
          </>
        )}
      </dl>
      {deviceInfo.deviceInfo && (
        <div className="mt-4">
          <p className="text-sm font-medium text-base-content/70 mb-2">
            デバイス詳細
          </p>
          <pre className="text-xs bg-base-200 rounded-lg p-3 overflow-x-auto max-h-60 overflow-y-auto">
            {(() => {
              try {
                return JSON.stringify(
                  JSON.parse(deviceInfo.deviceInfo),
                  null,
                  2,
                )
              } catch {
                return deviceInfo.deviceInfo
              }
            })()}
          </pre>
        </div>
      )}
      <div className="modal-action">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setShowDeviceInfoModal(false)}
        >
          閉じる
        </button>
      </div>
    </div>
    <form method="dialog" className="modal-backdrop">
      <button
        type="button"
        onClick={() => setShowDeviceInfoModal(false)}
      >
        close
      </button>
    </form>
  </dialog>
)}
```

- [ ] **Step 6: 開発サーバーで手動テスト**

```bash
pnpm dev
```

以下のURLでフォームを開き、デバイス情報セクションが表示されることを確認:
```
http://localhost:3000/contact?deviceId=test-device-123&appVersion=1.2.3&buildNumber=456&os=iOS%2018.0&deviceInfo=%7B%22model%22%3A%22iPhone%2015%22%2C%22systemVersion%22%3A%2218.0%22%7D
```

確認項目:
1. トグルがデフォルトONで表示される
2. 「含まれる情報」リンクでモーダルが開く
3. モーダルに Device ID, App Version, Build Number, OS, デバイス詳細 JSON が表示される
4. トグルOFFで送信するとデバイス情報がペイロードに含まれない
5. パラメータなしの `/contact` ではデバイス情報セクションが非表示
6. カードが多用されず、すっきりしたレイアウトになっている

- [ ] **Step 7: コミット**

```bash
git add src/components/ContactForm.tsx
git commit -m "feat(contact): add device info toggle and modal to contact form"
```
