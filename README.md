# EQMonitor Site

EQMonitor のランディングページ

- **Framework**: [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5) + [Vite+](https://viteplus.dev/)
- **UI**: Tailwind CSS v4 + daisyUI / [Bits UI](https://bits-ui.com/) (Dialog)
- **Hosting**: Cloudflare Workers (`@sveltejs/adapter-cloudflare`)
- **Storage**: Cloudflare D1 (問い合わせ・ベータ登録) / KV (開発ロードマップのキャッシュ)
- **認証**: Cloudflare Turnstile
- **通知/管理**: GitHub Issue

## 開発環境

ツールのバージョンは [mise](https://mise.jdx.dev/) で管理する（`mise.toml` / `mise.lock`）。

```sh
mise install   # Node.js (LTS)・pnpm・hk などを入れ、hk の Git フックも設定する
pnpm install
```

commit 時に hk が書式・lint・秘密情報・ワークフローを検査する。書式と lint の自動修正は `hk fix`（または `pnpm exec vp fmt` / `pnpm exec vp lint --fix`）で行う。

## コマンド

| Command                  | Action                                             |
| :----------------------- | :------------------------------------------------- |
| `pnpm dev`               | ローカル開発サーバー (`vp dev`)                    |
| `pnpm build`             | 本番ビルド (`vp build`)                            |
| `pnpm check`             | `wrangler types` + `svelte-check` による型チェック |
| `pnpm lint`              | Oxlint (`vp lint`)                                 |
| `pnpm format`            | 書式の整形 (`vp fmt`)                              |
| `pnpm deploy`            | ビルドして Cloudflare Workers へデプロイ           |
| `pnpm cf-typegen`        | `wrangler.jsonc` から binding の型を生成           |
| `pnpm db:migrate:local`  | ローカル D1 にマイグレーション適用                 |
| `pnpm db:migrate:remote` | 本番 D1 にマイグレーション適用                     |
