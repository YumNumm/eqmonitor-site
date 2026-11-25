# EQMonitor Site

EQMonitor のランディングページ

- **Framework**: [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5) + [Vite+](https://viteplus.dev/)
- **UI**: Tailwind CSS v4 + daisyUI / [Bits UI](https://bits-ui.com/) (Dialog)
- **Hosting**: Cloudflare Workers (`@sveltejs/adapter-cloudflare`)
- **Storage**: Cloudflare D1 (問い合わせ・ベータ登録) / KV (開発ロードマップのキャッシュ)
- **認証**: Cloudflare Turnstile
- **通知/管理**: GitHub Issue

## コマンド

| Command | Action |
| :-- | :-- |
| `pnpm dev` | ローカル開発サーバー (`vp dev`) |
| `pnpm build` | 本番ビルド (`vp build`) |
| `pnpm check` | `wrangler types` + `svelte-check` による型チェック |
| `pnpm lint` | Oxlint (`vp lint`) |
| `pnpm deploy` | ビルドして Cloudflare Workers へデプロイ |
| `pnpm cf-typegen` | `wrangler.jsonc` から binding の型を生成 |
| `pnpm db:migrate:local` | ローカル D1 にマイグレーション適用 |
| `pnpm db:migrate:remote` | 本番 D1 にマイグレーション適用 |
