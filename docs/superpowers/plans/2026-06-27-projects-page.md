# /projects ページ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GitHub Projects v2 のデータを1時間おきに取得し、public ラベル付き Issue を `/projects` ページに Milestone グループ化 + Priority ソートで表示する。

**Architecture:** メインサイト Worker に cron trigger を追加し、GitHub GraphQL API でプロジェクトアイテムを取得して KV に保存。`/projects` ページは `createServerFn` の loader で KV からデータを読み、SSR で表示する。

**Tech Stack:** TanStack React Start, Cloudflare Workers (KV, Cron Triggers), GitHub GraphQL API, Valibot, DaisyUI, marked

## Global Constraints

- パッケージマネージャ: `pnpm` のみ（`npx` 禁止）
- スキーマ定義: Valibot
- スタイリング: Tailwind CSS v4 + DaisyUI v5 (テーマ: eqmonitor)
- ルーティング: TanStack React Router (ファイルベース自動生成)
- サーバー関数: `createServerFn` (`@tanstack/react-start`)
- 環境変数: `src/server/env.ts` の `AppEnv` に型を追加

---

### Task 1: Valibot スキーマ定義 + wrangler.jsonc 設定

**Files:**
- Create: `src/lib/projectsSchema.ts`
- Modify: `wrangler.jsonc`
- Modify: `src/server/env.ts`

**Produces:**
- `ProjectItemSchema`, `ProjectsDataSchema` — Valibot スキーマ
- `ProjectItem`, `ProjectsData` — 型
- `AppEnv.PROJECTS_KV` — KV バインディング型

- [ ] **Step 1: Valibot スキーマファイルを作成**

`src/lib/projectsSchema.ts` を作成する:

```typescript
import * as v from 'valibot'

export const ProjectItemSchema = v.object({
  title: v.string(),
  body: v.string(),
  url: v.pipe(v.string(), v.url()),
  priority: v.nullable(v.picklist(['P0', 'P1', 'P2', 'P3'])),
  milestone: v.nullable(v.string()),
})

export const ProjectsDataSchema = v.object({
  items: v.array(ProjectItemSchema),
  updatedAt: v.string(),
})

export type ProjectItem = v.InferOutput<typeof ProjectItemSchema>
export type ProjectsData = v.InferOutput<typeof ProjectsDataSchema>
```

- [ ] **Step 2: wrangler.jsonc に KV バインディングと cron trigger を追加**

`wrangler.jsonc` に以下を追加:

```jsonc
"kv_namespaces": [
  {
    "binding": "PROJECTS_KV",
    "id": "<KV_NAMESPACE_ID>"
  }
],
"triggers": {
  "crons": ["0 * * * *"]
}
```

KV namespace ID はデプロイ時に `pnpm wrangler kv namespace create PROJECTS_KV` で生成した値に置き換える。開発時は `preview_id` を使用するか、`--local` で自動的にローカル KV が使われる。

- [ ] **Step 3: AppEnv に KV バインディングを追加**

`src/server/env.ts` の `AppEnv` インターフェースに追加:

```typescript
// bindings
PROJECTS_KV: KVNamespace
```

- [ ] **Step 4: 型チェックが通ることを確認**

Run: `pnpm tsc --noEmit`
Expected: エラーなし (KV namespace ID が仮でも型チェックは通る)

- [ ] **Step 5: コミット**

```bash
git add src/lib/projectsSchema.ts wrangler.jsonc src/server/env.ts
git commit -m "feat(projects): add Valibot schemas and KV/cron config"
```

---

### Task 2: GitHub GraphQL API クライアント + cron handler

**Files:**
- Create: `src/server/projects.ts`
- Create: `src/server/server-entry.ts`

**Consumes:**
- `ProjectsDataSchema`, `ProjectItem`, `ProjectsData` from `src/lib/projectsSchema.ts`
- `AppEnv` from `src/server/env.ts`

**Produces:**
- `fetchAndStoreProjects(env: AppEnv): Promise<void>` — cron handler から呼ばれる関数
- `getProjectsData(kv: KVNamespace): Promise<ProjectsData | null>` — フロントエンドの loader から呼ばれる関数

- [ ] **Step 1: GitHub GraphQL クライアントを実装**

`src/server/projects.ts` を作成する:

```typescript
import type { AppEnv } from './env'
import type { ProjectItem, ProjectsData } from '~/lib/projectsSchema'

const GRAPHQL_QUERY = `
query($cursor: String) {
  user(login: "YumNumm") {
    projectV2(number: 12) {
      items(first: 100, after: $cursor) {
        nodes {
          fieldValues(first: 8) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldIterationValue {
                title
                field { ... on ProjectV2FieldCommon { name } }
              }
              ... on ProjectV2ItemFieldTextValue {
                text
                field { ... on ProjectV2FieldCommon { name } }
              }
            }
          }
          content {
            ... on Issue {
              title
              body
              url
              labels(first: 10) { nodes { name } }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}
`

interface GraphQLFieldValue {
  name?: string
  title?: string
  text?: string
  field?: { name?: string }
}

interface GraphQLIssueContent {
  title: string
  body: string
  url: string
  labels: { nodes: Array<{ name: string }> }
}

interface GraphQLProjectItem {
  fieldValues: { nodes: GraphQLFieldValue[] }
  content: GraphQLIssueContent | null
}

interface GraphQLResponse {
  data: {
    user: {
      projectV2: {
        items: {
          nodes: GraphQLProjectItem[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      }
    }
  }
}

function extractField(
  fieldValues: GraphQLFieldValue[],
  fieldName: string,
): string | null {
  for (const fv of fieldValues) {
    if (fv.field?.name === fieldName) {
      return fv.name ?? fv.title ?? fv.text ?? null
    }
  }
  return null
}

function toProjectItem(node: GraphQLProjectItem): ProjectItem | null {
  if (!node.content) return null

  const labels = node.content.labels.nodes.map((l) => l.name)
  if (!labels.includes('public')) return null

  const priorityRaw = extractField(node.fieldValues.nodes, 'Priority')
  const priority =
    priorityRaw === 'P0' ||
    priorityRaw === 'P1' ||
    priorityRaw === 'P2' ||
    priorityRaw === 'P3'
      ? priorityRaw
      : null

  return {
    title: node.content.title,
    body: node.content.body ?? '',
    url: node.content.url,
    priority,
    milestone: extractField(node.fieldValues.nodes, 'Milestone'),
  }
}

async function fetchAllProjectItems(token: string): Promise<ProjectItem[]> {
  const items: ProjectItem[] = []
  let cursor: string | null = null

  do {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'eqmonitor-site',
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: { cursor },
      }),
    })

    if (!res.ok) {
      throw new Error(`GitHub GraphQL API error: ${res.status} ${await res.text()}`)
    }

    const json = (await res.json()) as GraphQLResponse
    const page = json.data.user.projectV2.items

    for (const node of page.nodes) {
      const item = toProjectItem(node)
      if (item) items.push(item)
    }

    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
  } while (cursor)

  return items
}

export async function fetchAndStoreProjects(env: AppEnv): Promise<void> {
  const items = await fetchAllProjectItems(env.GITHUB_TOKEN)

  const data: ProjectsData = {
    items,
    updatedAt: new Date().toISOString(),
  }

  await env.PROJECTS_KV.put('projects:items', JSON.stringify(data))
}

export async function getProjectsData(
  kv: KVNamespace,
): Promise<ProjectsData | null> {
  const raw = await kv.get('projects:items')
  if (!raw) return null
  return JSON.parse(raw) as ProjectsData
}
```

- [ ] **Step 2: カスタム server entry を作成**

`src/server/server-entry.ts` を作成する:

```typescript
import handler from '@tanstack/react-start/server-entry'
import { fetchAndStoreProjects } from './projects'
import type { AppEnv } from './env'

export default {
  ...handler,

  async scheduled(
    _event: ScheduledEvent,
    env: AppEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(fetchAndStoreProjects(env))
  },
}
```

- [ ] **Step 3: wrangler.jsonc の main を server entry に変更**

`wrangler.jsonc` の `"main"` を変更:

```jsonc
"main": "src/server/server-entry.ts"
```

- [ ] **Step 4: 型チェックが通ることを確認**

Run: `pnpm tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/server/projects.ts src/server/server-entry.ts wrangler.jsonc
git commit -m "feat(projects): add GitHub GraphQL client and cron handler"
```

---

### Task 3: /projects ページ (フロントエンド)

**Files:**
- Create: `src/routes/projects.tsx`
- Modify: `src/components/Navbar.tsx`

**Consumes:**
- `getProjectsData(kv: KVNamespace): Promise<ProjectsData | null>` from `src/server/projects.ts`
- `ProjectItem`, `ProjectsData` from `src/lib/projectsSchema.ts`
- `AppEnv` from `src/server/env.ts`
- `MarkdownArticle` のレンダリングパターン (marked + dangerouslySetInnerHTML)
- `seo()` from `src/utils/seo.ts`

- [ ] **Step 1: /projects ルートを作成**

`src/routes/projects.tsx` を作成する:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { marked } from 'marked'
import { appEnv } from '~/server/env'
import { getProjectsData } from '~/server/projects'
import { seo } from '~/utils/seo'
import type { ProjectItem } from '~/lib/projectsSchema'

const loadProjectsData = createServerFn().handler(async () => {
  return await getProjectsData(appEnv.PROJECTS_KV)
})

export const Route = createFileRoute('/projects')({
  head: () => ({
    meta: seo({
      title: 'プロジェクト | EQMonitor',
      description: 'EQMonitor の開発進捗状況を公開しています。',
    }),
  }),
  loader: () => loadProjectsData(),
  component: ProjectsPage,
})

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 }

const PRIORITY_BADGE: Record<string, string> = {
  P0: 'badge-error',
  P1: 'badge-warning',
  P2: 'badge-info',
  P3: 'badge-success',
}

function sortByPriority(a: ProjectItem, b: ProjectItem): number {
  const pa = a.priority ? PRIORITY_ORDER[a.priority] ?? 99 : 99
  const pb = b.priority ? PRIORITY_ORDER[b.priority] ?? 99 : 99
  return pa - pb
}

function groupByMilestone(
  items: ProjectItem[],
): Array<{ milestone: string | null; items: ProjectItem[] }> {
  const map = new Map<string | null, ProjectItem[]>()
  for (const item of items) {
    const key = item.milestone
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }

  const groups = Array.from(map.entries()).map(([milestone, groupItems]) => ({
    milestone,
    items: groupItems.sort(sortByPriority),
  }))

  groups.sort((a, b) => {
    if (a.milestone === null) return 1
    if (b.milestone === null) return -1
    return a.milestone.localeCompare(b.milestone)
  })

  return groups
}

function formatUpdatedAt(isoString: string): string {
  const date = new Date(isoString)
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const day = jst.getUTCDate()
  const hours = String(jst.getUTCHours()).padStart(2, '0')
  const minutes = String(jst.getUTCMinutes()).padStart(2, '0')
  return `${day}日 ${hours}:${minutes}`
}

function ProjectsPage() {
  const data = Route.useLoaderData()

  if (!data || data.items.length === 0) {
    return (
      <div className="p-8 max-w-[1024px] mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">プロジェクト</h1>
        <p className="text-center text-base-content/70">
          データを取得中です。しばらくお待ちください。
        </p>
      </div>
    )
  }

  const groups = groupByMilestone(data.items)

  return (
    <div className="p-8 max-w-[1024px] mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">プロジェクト</h1>
      <p className="text-center text-base-content/70 mb-1">
        開発の進捗状況を公開しています。
      </p>
      <p className="text-center text-base-content/50 text-sm mb-8">
        最終更新: {formatUpdatedAt(data.updatedAt)}
      </p>

      <div className="space-y-8">
        {groups.map((group) => (
          <MilestoneGroup
            key={group.milestone ?? '__none__'}
            milestone={group.milestone}
            items={group.items}
          />
        ))}
      </div>

      <div className="alert mt-12 border border-info/40 bg-info/20 text-base-content shadow-sm">
        <div>
          <p>
            機能のリクエストや不具合の報告は{' '}
            <Link to="/contact" className="link link-info">
              お問い合わせフォーム
            </Link>{' '}
            からお願いします。
          </p>
        </div>
      </div>
    </div>
  )
}

function MilestoneGroup({
  milestone,
  items,
}: {
  milestone: string | null
  items: ProjectItem[]
}) {
  return (
    <div className="card bg-base-200/50 shadow">
      <div className="card-body">
        <h2 className="card-title text-xl">
          {milestone ?? '未分類'}
        </h2>
        <div className="space-y-2">
          {items.map((item) => (
            <ProjectItemCard key={item.url} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProjectItemCard({ item }: { item: ProjectItem }) {
  const html = item.body
    ? (marked.parse(item.body, { async: false }) as string)
    : ''

  return (
    <div className="collapse collapse-arrow bg-base-100">
      <input type="checkbox" />
      <div className="collapse-title flex items-center gap-2">
        {item.priority && (
          <span className={`badge badge-sm ${PRIORITY_BADGE[item.priority]}`}>
            {item.priority}
          </span>
        )}
        <span className="font-medium">{item.title}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto link link-hover text-base-content/50 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          GitHub
        </a>
      </div>
      {html && (
        <div className="collapse-content">
          <article
            className="prose prose-sm prose-invert max-w-none"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: GitHub Issue body from KV cache
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Navbar に「プロジェクト」リンクを追加**

`src/components/Navbar.tsx` の `<Link to="/">` ボタンの閉じタグ `</Link>` の直後に追加:

```tsx
<Link
  to="/projects"
  className="btn btn-ghost btn-sm text-base-content/70"
>
  プロジェクト
</Link>
```

- [ ] **Step 3: 開発サーバーで動作確認**

Run: `pnpm dev`

1. http://localhost:3000/projects にアクセスし、空データ時のメッセージが表示されることを確認
2. Navbar に「プロジェクト」リンクが表示されることを確認
3. リンクをクリックして `/projects` に遷移することを確認

- [ ] **Step 4: cron handler のローカルテスト**

新しいターミナルで実行:
```bash
curl "http://localhost:3000/cdn-cgi/handler/scheduled?cron=0+*+*+*+*"
```

実行後、http://localhost:3000/projects をリロードしてデータが表示されることを確認。

- [ ] **Step 5: コミット**

```bash
git add src/routes/projects.tsx src/components/Navbar.tsx src/routeTree.gen.ts
git commit -m "feat(projects): add /projects page with milestone grouping and priority sorting"
```

---

### Task 4: ビルド確認 + secret 登録

**Files:**
- なし（設定のみ）

- [ ] **Step 1: ビルドが通ることを確認**

Run: `pnpm build`
Expected: エラーなし

- [ ] **Step 2: KV namespace を作成**

Run: `pnpm wrangler kv namespace create PROJECTS_KV`

出力された `id` を `wrangler.jsonc` の `kv_namespaces[0].id` に設定する。

- [ ] **Step 3: GITHUB_TOKEN を secret として登録**

Run: `pnpm wrangler secret put GITHUB_TOKEN`

プロンプトが表示されたら PAT を入力する。

- [ ] **Step 4: wrangler.jsonc の KV ID を更新してコミット**

```bash
git add wrangler.jsonc
git commit -m "chore(projects): set KV namespace ID"
```
