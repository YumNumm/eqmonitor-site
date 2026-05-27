# eqmonitor-site

EQMonitor のランディングページ。問い合わせ・フィードバック受付機能を備える。

- **Framework**: [TanStack Start](https://tanstack.com/start) (React) + Vite
- **Styling**: Tailwind CSS v4 + daisyUI (night テーマ)
- **Hosting**: Cloudflare Workers
- **Storage**: Cloudflare D1 (問い合わせ格納) / KV (レート制限)
- **認証**: Cloudflare Turnstile
- **通知/管理**: Slack (interactive button) → GitHub Issue

## コマンド

| Command | Action |
| :-- | :-- |
| `pnpm dev` | ローカル開発サーバー (http://localhost:3000) |
| `pnpm build` | 本番ビルド + 型チェック |
| `pnpm deploy` | ビルドして Cloudflare Workers へデプロイ |
| `pnpm cf-typegen` | `wrangler.jsonc` から binding の型を生成 |
| `pnpm db:migrate:local` | ローカル D1 にマイグレーション適用 |
| `pnpm db:migrate:remote` | 本番 D1 にマイグレーション適用 |

## 問い合わせ機能のアーキテクチャ

```
[フォーム + Turnstile] --POST /api/inquiry--> [Turnstile検証 → KVレート制限 → D1保存 → Slack通知(ボタン付)]
                                                                                          │
[Slackボタン] --POST /api/slack/actions--> [署名検証 → GitHub Issue作成 → D1更新 → chat.update]
```

問い合わせは Slack/GitHub への通知より先に D1 へ保存される（外部通知が失敗しても問い合わせは失われない）。

主なソース:
- `src/routes/contact.tsx` / `src/components/ContactForm.tsx` — フォーム UI
- `src/routes/api/inquiry.ts` — 受信 API
- `src/routes/api/slack.actions.ts` — Slack interactivity callback
- `src/server/*` — turnstile / ratelimit / db / slack / github のロジック
- `migrations/0001_init.sql` — D1 スキーマ

## 初回セットアップ

### 1. D1 / KV を作成し wrangler.jsonc に反映

```sh
pnpm wrangler d1 create eqmonitor-site-inquiries
pnpm wrangler kv namespace create RATE_LIMIT_KV
```

出力された `database_id` と KV の `id` を `wrangler.jsonc` のプレースホルダ
(`REPLACE_WITH_D1_DATABASE_ID` / `REPLACE_WITH_KV_NAMESPACE_ID`) に貼り付ける。
その後マイグレーションを適用:

```sh
pnpm db:migrate:local   # ローカル
pnpm db:migrate:remote  # 本番
```

### 2. 環境変数

public な値は `wrangler.jsonc` の `vars` に記載済み（`TURNSTILE_SITE_KEY`,
`SLACK_CHANNEL_ID`, `GITHUB_OWNER`, `GITHUB_REPO`）。`SLACK_CHANNEL_ID` は通知先に合わせて設定する。

secret は `.dev.vars`（ローカル、gitignore 済み）と `wrangler secret`（本番）で投入:

```sh
pnpm wrangler secret put TURNSTILE_SECRET_KEY
pnpm wrangler secret put SLACK_BOT_TOKEN
pnpm wrangler secret put SLACK_SIGNING_SECRET
pnpm wrangler secret put GITHUB_TOKEN
pnpm wrangler secret put IP_HASH_SALT
```

### 3. Slack App

1. https://api.slack.com/apps で App を作成
2. **OAuth & Permissions** → Bot Token Scopes に `chat:write` を追加 → ワークスペースにインストール → `SLACK_BOT_TOKEN` (`xoxb-...`) を取得
3. **Basic Information** → Signing Secret を `SLACK_SIGNING_SECRET` に設定
4. **Interactivity & Shortcuts** を ON → Request URL に `https://<本番ドメイン>/api/slack/actions`
5. 通知先チャンネルに Bot を招待し、そのチャンネル ID を `SLACK_CHANNEL_ID` に設定

### 4. GitHub Token

`GITHUB_REPO`（既定 `YumNumm/eqmonitor-backend`）に対して **issues:write** 権限を持つ
fine-grained PAT を発行し、`GITHUB_TOKEN` に設定する。

Issue には種別ラベル（`inquiry` / `feedback` / `bug`）が付与される。repo にそのラベルが
存在しない場合はラベルなしで作成される（事前に作成しておくと triage が捗る）。

### 5. Cloudflare Turnstile

ダッシュボードで site key / secret key を発行し、`TURNSTILE_SITE_KEY`（public）と
`TURNSTILE_SECRET_KEY`（secret）に設定する。ローカル検証はテストキーも利用可:
- site: `1x00000000000000000000AA` / secret: `1x0000000000000000000000000000000AA`

## デプロイ

Cloudflare Pages から Workers へ移行済み。`pnpm deploy` で `wrangler deploy` が走る。
カスタムドメインは Workers 側で再設定する。
