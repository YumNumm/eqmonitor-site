# ブログ機能 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** eqmonitor-site に技術ブログ機能を追加し、既存の Markdown レンダリングを unified パイプラインに統一する。OGP画像生成は内部 Worker として実装する。

**Architecture:** 記事は `src/content/blog/` に Markdown ファイルとして配置し、frontmatter で メタデータを管理する。unified (remark/rehype) パイプラインでサーバーサイドレンダリングし、shiki でシンタックスハイライトを行う。OGP画像は `workers/og-worker/` の内部 Worker で satori + resvg-wasm により生成し、メインの Worker からサービスバインディング経由で呼び出す。

**Tech Stack:** unified, remark-parse, remark-gfm, remark-rehype, rehype-stringify, rehype-shiki, shiki, gray-matter, satori, @resvg/resvg-wasm, hono

## Global Constraints

- パッケージマネージャは pnpm（`npx` 禁止、`pnpm dlx` / `pnpm run` を使用）
- Cloudflare Workers + TanStack Start (React SSR) + Vite
- スタイリングは Tailwind CSS v4 + daisyUI
- pnpm workspace: `workers/*` が workspace パッケージ
- `?raw` インポートでのクライアント送信を廃止し SSR に移行

---

### Task 1: 共通 Markdown パイプラインの構築

unified エコシステムの依存を追加し、`src/lib/markdown.ts` に共通パイプラインを作成する。既存の `marked` ベースの `MarkdownArticle` を置き換える。

**Files:**
- Create: `src/lib/markdown.ts`
- Modify: `src/components/MarkdownArticle.tsx`
- Modify: `src/routes/guideline.tsx`
- Modify: `src/routes/privacy_policy.tsx`
- Modify: `src/routes/term_of_service.tsx`
- Modify: `src/routes/asctl.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `renderMarkdown(markdown: string): Promise<string>` — Markdown 文字列を受け取り HTML 文字列を返す関数。Task 2 のブログ記事パース処理がこれを使う。

- [ ] **Step 1: unified 関連パッケージをインストール**

```bash
pnpm add unified remark-parse remark-gfm remark-rehype rehype-stringify rehype-shiki shiki gray-matter
```

- [ ] **Step 2: 共通パイプライン `src/lib/markdown.ts` を作成**

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeShiki from 'rehype-shiki'
import rehypeStringify from 'rehype-stringify'

export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeShiki, { theme: 'github-dark' })
    .use(rehypeStringify)
    .process(markdown)

  return String(result)
}
```

注意: `rehype-shiki` の API は実際のパッケージバージョンに合わせて調整が必要な場合がある。`@shikijs/rehype` が現在の推奨パッケージ名の可能性があるため、インストール時にパッケージの README を確認すること。

- [ ] **Step 3: `MarkdownArticle` を SSR 対応に変更**

`MarkdownArticle` は Markdown 文字列ではなくパース済み HTML を受け取る形に変更する。

```tsx
export function MarkdownArticle({
  title,
  html,
}: {
  title: string
  html: string
}) {
  return (
    <div className="max-w-[1024px] mx-auto">
      <h1 className="text-4xl font-bold text-center pt-8 pb-4">{title}</h1>
      <article
        className="prose md:prose-lg lg:prose-xl prose-invert max-w-none p-8"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: 信頼できる自リポジトリ内 markdown のみ
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
```

- [ ] **Step 4: 共通の serverFn を作成して各ルートを移行**

Markdown をサーバー側でレンダリングする serverFn を作成する。各ルートファイル内で `import markdown from '...?raw'` と `loader` を使って SSR パイプラインに移行する。

`src/routes/guideline.tsx` の例:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { seo } from '~/utils/seo'
import { MarkdownArticle } from '~/components/MarkdownArticle'
import { renderMarkdown } from '~/lib/markdown'
import markdown from '~/content/guideline.md?raw'

const loadGuidelineHtml = createServerFn().handler(async () => {
  return renderMarkdown(markdown)
})

export const Route = createFileRoute('/guideline')({
  loader: () => loadGuidelineHtml(),
  head: () => ({
    meta: seo({
      title: '気象庁ガイドライン対応状況 | EQMonitor',
      description:
        '緊急地震速報に関する気象庁のガイドラインに対するEQMonitorの対応状況について記載しています。',
    }),
  }),
  component: Guideline,
})

function Guideline() {
  const html = Route.useLoaderData()
  return (
    <MarkdownArticle
      title="緊急地震速報に関する気象庁のガイドライン対応状況 (仮)"
      html={html}
    />
  )
}
```

同様に `privacy_policy.tsx`, `term_of_service.tsx`, `asctl.tsx` も移行する。各ファイルのパターンは同一:
1. `createServerFn` で `renderMarkdown(markdown)` を呼ぶ `loader` 関数を作成
2. `Route` の `loader` にそれを設定
3. コンポーネントで `Route.useLoaderData()` から HTML を取得して `MarkdownArticle` に `html` として渡す

- [ ] **Step 5: `marked` を依存から削除**

`projects.tsx` でも `marked` を使っている（Issue body のレンダリング）。この用途は GitHub Issue body をサニタイズして表示しているもので、unified パイプラインとは用途が異なる（外部入力のサニタイズが必要）。`projects.tsx` の `marked` 使用はそのまま残す。

`marked` を削除する前に、`projects.tsx` 以外で `marked` が使われていないことを確認する:

```bash
grep -rn "from 'marked'\|from \"marked\"" src/ --include="*.ts" --include="*.tsx"
```

`projects.tsx` のみが残っている場合、`marked` はそのまま依存に残す（projects.tsx が使用中のため）。

もし `projects.tsx` も unified に移行する場合は、外部入力用のサニタイズ済みパイプライン（`rehype-sanitize` を追加）を別途用意する必要があるが、この計画のスコープ外とする。

- [ ] **Step 6: dev server を起動して既存ページの表示確認**

```bash
pnpm run dev
```

ブラウザで以下のページにアクセスし、Markdown が正しくレンダリングされていることを確認:
- `/guideline`
- `/privacy_policy`
- `/term_of_service`
- `/asctl`

シンタックスハイライトが適用されたコードブロックがあるページ（guideline にコードブロックがあれば）も確認。

- [ ] **Step 7: コミット**

```bash
git add src/lib/markdown.ts src/components/MarkdownArticle.tsx src/routes/guideline.tsx src/routes/privacy_policy.tsx src/routes/term_of_service.tsx src/routes/asctl.tsx package.json pnpm-lock.yaml
git commit -m "refactor: migrate Markdown rendering from marked to unified pipeline with SSR"
```

---

### Task 2: ブログ記事のデータ層

ブログ記事の frontmatter パース、一覧取得、個別取得の関数を `src/lib/blog.ts` に実装する。

**Files:**
- Create: `src/lib/blog.ts`
- Create: `src/content/blog/hello-world.md` (テスト用サンプル記事)

**Interfaces:**
- Consumes: `renderMarkdown(markdown: string): Promise<string>` from `src/lib/markdown.ts` (Task 1)
- Produces:
  - `type BlogPost = { slug: string; title: string; date: string; description: string; tags: string[] }`
  - `type BlogPostWithHtml = BlogPost & { html: string }`
  - `getAllPosts(): Promise<BlogPost[]>` — 全記事の frontmatter を日付降順で返す
  - `getPostBySlug(slug: string): Promise<BlogPostWithHtml | null>` — slug に対応する記事をパース済み HTML 付きで返す

- [ ] **Step 1: テスト用サンプル記事を作成**

`src/content/blog/hello-world.md`:

```markdown
---
title: "Hello World - ブログ始めました"
date: 2026-06-27
description: "EQMonitor の技術ブログを始めました。開発で使っている技術について書いていきます。"
tags: ["お知らせ"]
---

## はじめに

EQMonitor の技術ブログを始めました。

## コードブロックのテスト

TypeScript のコード:

\`\`\`typescript
const greeting = "Hello, World!"
console.log(greeting)
\`\`\`

## テーブルのテスト

| 技術 | 用途 |
|------|------|
| TanStack Start | SSR フレームワーク |
| Cloudflare Workers | ホスティング |
| Tailwind CSS | スタイリング |
```

- [ ] **Step 2: `src/lib/blog.ts` を作成**

```ts
import matter from 'gray-matter'
import { renderMarkdown } from './markdown'

export interface BlogPost {
  slug: string
  title: string
  date: string
  description: string
  tags: string[]
}

export interface BlogPostWithHtml extends BlogPost {
  html: string
}

const blogModules = import.meta.glob('../content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function slugFromPath(path: string): string {
  const filename = path.split('/').pop() ?? ''
  return filename.replace(/\.md$/, '')
}

function parseFrontmatter(raw: string, slug: string): BlogPost {
  const { data } = matter(raw)
  return {
    slug,
    title: data.title,
    date: data.date instanceof Date ? data.date.toISOString().split('T')[0] : String(data.date),
    description: data.description,
    tags: data.tags ?? [],
  }
}

export function getAllPosts(): BlogPost[] {
  const posts: BlogPost[] = []
  for (const [path, raw] of Object.entries(blogModules)) {
    const slug = slugFromPath(path)
    posts.push(parseFrontmatter(raw, slug))
  }
  posts.sort((a, b) => (a.date > b.date ? -1 : 1))
  return posts
}

export async function getPostBySlug(slug: string): Promise<BlogPostWithHtml | null> {
  const entry = Object.entries(blogModules).find(
    ([path]) => slugFromPath(path) === slug,
  )
  if (!entry) return null

  const raw = entry[1]
  const { content } = matter(raw)
  const post = parseFrontmatter(raw, slug)
  const html = await renderMarkdown(content)

  return { ...post, html }
}
```

- [ ] **Step 3: dev server で import エラーがないことを確認**

```bash
pnpm run dev
```

ビルドエラーが出ないことを確認。

- [ ] **Step 4: コミット**

```bash
git add src/lib/blog.ts src/content/blog/hello-world.md
git commit -m "feat(blog): add blog data layer with frontmatter parsing"
```

---

### Task 3: ブログ一覧ページと個別記事ページ

ブログのルーティング（`/blog`, `/blog/$slug`）とページコンポーネントを実装する。Navbar にリンクを追加する。

**Files:**
- Create: `src/routes/blog/index.tsx`
- Create: `src/routes/blog/$slug.tsx`
- Modify: `src/components/Navbar.tsx`

**Interfaces:**
- Consumes:
  - `getAllPosts(): BlogPost[]` from `src/lib/blog.ts` (Task 2)
  - `getPostBySlug(slug: string): Promise<BlogPostWithHtml | null>` from `src/lib/blog.ts` (Task 2)
  - `seo({title, description, image?})` from `src/utils/seo.ts`

- [ ] **Step 1: ブログ一覧ページ `src/routes/blog/index.tsx` を作成**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { seo } from '~/utils/seo'
import { getAllPosts } from '~/lib/blog'

const loadBlogPosts = createServerFn().handler(async () => {
  return getAllPosts()
})

export const Route = createFileRoute('/blog/')({
  loader: () => loadBlogPosts(),
  head: () => ({
    meta: seo({
      title: 'Blog | EQMonitor',
      description: 'EQMonitor の技術ブログ',
    }),
  }),
  component: BlogIndex,
})

function BlogIndex() {
  const posts = Route.useLoaderData()

  return (
    <div className="max-w-[1024px] mx-auto p-8">
      <h1 className="text-4xl font-bold text-center pt-8 pb-8">Blog</h1>
      <div className="space-y-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            to="/blog/$slug"
            params={{ slug: post.slug }}
            className="block"
          >
            <article className="card bg-base-200/50 border border-base-300 hover:border-primary/50 transition-colors">
              <div className="card-body">
                <h2 className="card-title text-xl">{post.title}</h2>
                <p className="text-base-content/60 text-sm">{post.date}</p>
                <p className="text-base-content/80">{post.description}</p>
                {post.tags.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="badge badge-sm badge-outline"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 個別記事ページ `src/routes/blog/$slug.tsx` を作成**

```tsx
import { createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { seo } from '~/utils/seo'
import { getPostBySlug } from '~/lib/blog'

const loadBlogPost = createServerFn()
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const post = await getPostBySlug(slug)
    if (!post) throw notFound()
    return post
  })

export const Route = createFileRoute('/blog/$slug')({
  loader: ({ params }) => loadBlogPost({ data: params.slug }),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? seo({
          title: `${loaderData.title} | EQMonitor Blog`,
          description: loaderData.description,
        })
      : [],
  }),
  component: BlogPost,
})

function BlogPost() {
  const post = Route.useLoaderData()

  return (
    <div className="max-w-[1024px] mx-auto">
      <div className="pt-8 pb-4 px-8">
        <p className="text-base-content/60 text-sm text-center">{post.date}</p>
        <h1 className="text-4xl font-bold text-center mt-2">{post.title}</h1>
        {post.tags.length > 0 && (
          <div className="flex justify-center gap-2 mt-4">
            {post.tags.map((tag) => (
              <span key={tag} className="badge badge-sm badge-outline">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <article
        className="prose md:prose-lg lg:prose-xl prose-invert max-w-none p-8"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: 信頼できる自リポジトリ内 markdown のみ
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Navbar に Blog リンクを追加**

`src/components/Navbar.tsx` を修正。既存のロゴリンクとストアアイコンの間に Blog リンクを追加する:

```tsx
import { Link } from '@tanstack/react-router'
import appicon from '~/assets/appicon.webp'

export function Navbar() {
  return (
    <div className="navbar bg-base-100/75 sticky top-0 backdrop-blur z-50 justify-between">
      <Link to="/">
        <button type="button" className="btn btn-ghost text-xl px-2">
          <img
            src={appicon}
            alt="appicon"
            loading="eager"
            className="rounded-md h-8 w-8 mr-1"
          />
          EQMonitor
        </button>
      </Link>
      <div className="flex items-center">
        <Link to="/blog" className="btn btn-ghost btn-sm mx-1">
          Blog
        </Link>
        {/* 既存のストアアイコン群はそのまま */}
```

既存の App Store / Google Play / GitHub アイコンリンクはそのまま残す。`Blog` リンクをアイコン群の前に追加。

- [ ] **Step 4: dev server で動作確認**

```bash
pnpm run dev
```

ブラウザで確認:
1. Navbar に「Blog」リンクが表示される
2. `/blog` で記事一覧が表示される（hello-world 記事が1件表示）
3. 記事カードをクリックすると `/blog/hello-world` に遷移
4. 個別記事ページでタイトル、日付、タグ、本文が正しく表示される
5. コードブロックにシンタックスハイライトが適用されている
6. テーブルが正しくレンダリングされている
7. 存在しない slug（例: `/blog/nonexistent`）で 404 が表示される

- [ ] **Step 5: コミット**

```bash
git add src/routes/blog/index.tsx src/routes/blog/\$slug.tsx src/components/Navbar.tsx
git commit -m "feat(blog): add blog listing and post pages with Navbar link"
```

---

### Task 4: OGP画像生成 Worker

`workers/og-worker/` に satori + resvg-wasm を使った OGP 画像生成 Worker を作成し、メイン Worker からサービスバインディングで接続する。メイン Worker 側に `/api/og` プロキシエンドポイントを用意する。

**Files:**
- Create: `workers/og-worker/package.json`
- Create: `workers/og-worker/tsconfig.json`
- Create: `workers/og-worker/wrangler.jsonc`
- Create: `workers/og-worker/src/index.ts`
- Create: `src/routes/api/og.ts` (プロキシエンドポイント)
- Modify: `wrangler.jsonc` (メイン: サービスバインディング追加)
- Modify: `src/server/env.ts` (`OG_WORKER` 追加)
- Modify: `src/routes/blog/$slug.tsx` (OGP メタタグ追加)

**Interfaces:**
- Consumes: `appEnv.OG_WORKER: Fetcher` (サービスバインディング)
- Produces: `GET /api/og?title=...` — PNG 画像を返すプロキシエンドポイント

- [ ] **Step 1: `workers/og-worker/` のプロジェクトをセットアップ**

`workers/og-worker/package.json`:

```json
{
  "name": "eqmonitor-og-worker",
  "private": true,
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "satori": "^0.12.0",
    "@resvg/resvg-wasm": "^2.6.0"
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "wrangler": "^4.95.0"
  }
}
```

`workers/og-worker/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src"]
}
```

`workers/og-worker/wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "eqmonitor-og-worker",
  "main": "src/index.ts",
  "compatibility_date": "2025-09-24",
  "compatibility_flags": ["nodejs_compat"],
  "workers_dev": false,
  "observability": {
    "enabled": true
  }
}
```

- [ ] **Step 2: 依存をインストール**

```bash
cd workers/og-worker && pnpm install
```

pnpm workspace が `workers/*` をカバーしているため自動的に workspace パッケージとして認識される。

- [ ] **Step 3: フォントファイルを配置**

Noto Sans JP の Regular (400) と Bold (700) ウェイトの ttf ファイルを取得して `workers/og-worker/src/fonts/` に配置する。

```bash
mkdir -p workers/og-worker/src/fonts
```

Google Fonts から Noto Sans JP の ttf を取得する方法:
- https://fonts.google.com/noto/specimen/Noto+Sans+JP からダウンロード
- `NotoSansJP-Bold.ttf` を `workers/og-worker/src/fonts/` に配置

Workers のバンドルサイズ制限（無料プラン: 10MB, 有料: 25MB）に注意。日本語フォントは大きいため、サブセット化を検討する。Noto Sans JP の Bold のみを使い、必要に応じて `pyftsubset` 等でサブセット化する。

- [ ] **Step 4: OGP 画像生成 Worker `workers/og-worker/src/index.ts` を実装**

```tsx
import { Hono } from 'hono'
import satori from 'satori'
import { Resvg, initWasm } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import notoSansJPBold from './fonts/NotoSansJP-Bold.ttf'

let wasmInitialized = false

const app = new Hono()

app.get('/', async (c) => {
  const title = c.req.query('title')
  if (!title) {
    return c.text('title query parameter is required', 400)
  }

  if (!wasmInitialized) {
    await initWasm(resvgWasm)
    wasmInitialized = true
  }

  const svg = await satori(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '60px 80px',
        background: 'linear-gradient(135deg, #0c0f1a 0%, #141826 50%, #232a40 100%)',
        fontFamily: 'Noto Sans JP',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            fontSize: '28px',
            color: '#5be0d8',
            fontWeight: 700,
          }}
        >
          EQMonitor Blog
        </div>
      </div>
      <div
        style={{
          fontSize: title.length > 30 ? '48px' : '56px',
          fontWeight: 700,
          color: '#f8f7fd',
          lineHeight: 1.3,
          wordBreak: 'break-word',
        }}
      >
        {title}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Noto Sans JP',
          data: notoSansJPBold as unknown as ArrayBuffer,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  )

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  })
  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  return new Response(pngBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
})

export default app
```

注意:
- `resvgWasm` と `notoSansJPBold` のインポート方法は実際のバンドラー設定に依存する。Wrangler は `.wasm` と `.ttf` をバイナリモジュールとしてインポートできる。エラーが出る場合は `import` の形式を調整する。
- satori の JSX は `hono/jsx` を使用する（tsconfig で `jsxImportSource: "hono/jsx"` を指定済み）。
- フォントの ArrayBuffer 変換は実行環境によって異なる可能性がある。

- [ ] **Step 5: メイン Worker にサービスバインディングを追加**

`wrangler.jsonc`（メイン）の `services` 配列に追加:

```jsonc
"services": [
  {
    "binding": "BETA_WORKER",
    "service": "eqmonitor-beta-worker"
  },
  {
    "binding": "OG_WORKER",
    "service": "eqmonitor-og-worker"
  }
]
```

`src/server/env.ts` に `OG_WORKER` を追加:

```ts
export interface AppEnv {
  // bindings
  DB: D1Database
  PROJECTS_KV: KVNamespace

  // service bindings
  BETA_WORKER: Fetcher
  OG_WORKER: Fetcher

  // ... 残りはそのまま
}
```

- [ ] **Step 6: `/api/og` プロキシエンドポイントを作成**

`src/routes/api/og.ts`:

```ts
import { createFileRoute } from '@tanstack/react-router'
import { appEnv } from '~/server/env'

export const Route = createFileRoute('/api/og')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const title = url.searchParams.get('title')

        if (!title) {
          return new Response('title query parameter is required', { status: 400 })
        }

        const ogUrl = new URL('https://og-worker.internal/')
        ogUrl.searchParams.set('title', title)

        const response = await appEnv.OG_WORKER.fetch(ogUrl.toString())
        return new Response(response.body, {
          status: response.status,
          headers: {
            'Content-Type': response.headers.get('Content-Type') ?? 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
```

- [ ] **Step 7: ブログ記事ページに OGP メタタグを追加**

`src/routes/blog/$slug.tsx` の `head` を更新:

```tsx
head: ({ loaderData }) => ({
  meta: loaderData
    ? seo({
        title: `${loaderData.title} | EQMonitor Blog`,
        description: loaderData.description,
        image: `/api/og?title=${encodeURIComponent(loaderData.title)}`,
      })
    : [],
}),
```

- [ ] **Step 8: OGP Worker を単体テスト**

```bash
cd workers/og-worker && pnpm run dev
```

ブラウザで `http://localhost:XXXX/?title=テスト記事タイトル` にアクセスし、PNG 画像が返ることを確認:
- 1200x630px の画像が返る
- ダークテーマの背景に白いテキストでタイトルが表示される
- 日本語が正しくレンダリングされている

- [ ] **Step 9: メイン側との統合テスト**

```bash
pnpm run dev
```

ブラウザで確認:
1. `/api/og?title=テスト` にアクセスして PNG 画像が返る
2. `/blog/hello-world` のページソースで `og:image` メタタグが `/api/og?title=...` を指している
3. OGP デバッガツール等で確認（オプション）

- [ ] **Step 10: コミット**

```bash
git add workers/og-worker/ src/routes/api/og.ts wrangler.jsonc src/server/env.ts src/routes/blog/\$slug.tsx
git commit -m "feat(og): add OGP image generation worker with service binding proxy"
```
