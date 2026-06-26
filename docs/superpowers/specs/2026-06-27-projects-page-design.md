# /projects ページ設計

GitHub Projects v2 のデータを定期取得し、EQMonitor サイトの `/projects` ページに公開 Issue を表示する。

## アーキテクチャ

```
GitHub Projects v2 (GraphQL API)
        │
        │ cron (毎時0分)
        ▼
  メインサイト Worker (scheduled handler)
        │
        │ JSON 書き込み
        ▼
   Cloudflare KV (projects:items)
        │
        │ createServerFn (loader)
        ▼
   /projects ページ (SSR)
```

## データ取得 (cron job)

### wrangler.jsonc の変更

- KV namespace バインディング `PROJECTS_KV` を追加
- secret `GITHUB_TOKEN` を追加 (PAT classic, `read:project` スコープ)
- cron trigger `"0 * * * *"` を追加

### GitHub GraphQL クエリ

```graphql
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
              state
              labels(first: 10) { nodes { name } }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}
```

### フィルタリング

- `labels` に `public` を含むアイテムのみ抽出
- Draft Issue や PR は除外（`content` が `Issue` の場合のみ）

### KV に保存するデータ構造

```typescript
type ProjectItem = {
  title: string
  body: string       // Markdown (生テキスト)
  url: string        // GitHub Issue URL
  priority: 'P0' | 'P1' | 'P2' | 'P3' | null
  milestone: string | null
}
```

KV キー: `projects:items`
KV 値: `ProjectItem[]` (JSON)

### cron handler の実装場所

`src/server/projects.ts` に GitHub API 呼び出しとデータ整形ロジックを配置。
メインサイト Worker の `app.ts` もしくはエントリポイントで `scheduled` イベントハンドラを登録。

## フロントエンド

### ルート

`src/routes/projects.tsx`

### データ取得

```typescript
const getProjectItems = createServerFn().handler(async () => {
  const data = await env.PROJECTS_KV.get('projects:items')
  return data ? JSON.parse(data) as ProjectItem[] : []
})
```

loader で `getProjectItems()` を呼び出し、SSR でデータを含む。

### ページレイアウト

```
┌─────────────────────────────────────────────┐
│  ヘッダー: "プロジェクト"                      │
│  サブテキスト: 開発の進捗状況を公開しています    │
│                                             │
│  ┌─ Milestone: v3.0 ──────────────────────┐ │
│  │  🔴 P0  Issue Title                    │ │
│  │       body (折りたたみ)                  │ │
│  │  🟠 P1  Issue Title                    │ │
│  │       body (折りたたみ)                  │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ Milestone: v3.1 ──────────────────────┐ │
│  │  🟡 P2  Issue Title                    │ │
│  │  🟢 P3  Issue Title                    │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ Milestone なし ────────────────────────┐ │
│  │  ...                                   │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ┌─ CTA ───────────────────────────────────┐ │
│  │ 機能のリクエストや不具合の報告は          │ │
│  │ お問い合わせフォーム からお願いします      │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 表示ルール

- Milestone ごとにカードでグループ化
- 各グループ内は Priority 順にソート（P0 → P1 → P2 → P3 → null）
- Priority はバッジで色分け:
  - P0: `badge-error` (赤)
  - P1: `badge-warning` (オレンジ)
  - P2: `badge-info` (青)
  - P3: `badge-success` (緑)
- body は DaisyUI collapse で折りたたみ（初期: 閉じている）
- body は既存の MarkdownArticle コンポーネント (marked) でレンダリング
- Milestone が null のアイテムは「未分類」として最後に表示
- 各アイテムに GitHub Issue へのリンクアイコン

### Navbar

既存の Navbar に「プロジェクト」リンクを追加（`/projects`）。

### 問い合わせフォームへの誘導

ページ下部に CTA バナーを配置。「機能のリクエストや不具合の報告はお問い合わせフォームからお願いします」のテキストと `/contact` へのリンクボタン。

## ファイル構成

```
src/
├── routes/
│   └── projects.tsx          # /projects ページ
├── server/
│   └── projects.ts           # GitHub API + KV 操作
├── components/
│   └── (既存の MarkdownArticle.tsx を再利用)
wrangler.jsonc                 # KV バインディング + cron trigger 追加
```

## エラーハンドリング

- KV にデータがない場合: 「データを取得中です。しばらくお待ちください。」を表示
- cron job の GitHub API エラー: console.error でログ出力、KV の既存データはそのまま保持
