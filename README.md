# EQMonitor Site

EQMonitor のランディングページ

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
