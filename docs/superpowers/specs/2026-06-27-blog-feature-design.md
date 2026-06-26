# ブログ機能 設計書

## 概要

eqmonitor-site に技術ブログ機能を追加する。記事はリポジトリ内の Markdown ファイルで管理し、unified エコシステムでSSRレンダリングする。OGP画像は別 Workers で satori + resvg-wasm により生成する。

既存の `marked` ベースの Markdown レンダリングも unified パイプラインに統一する。

## 記事データの管理とパース

### ファイル配置

`src/content/blog/` に Markdown ファイルを配置。ファイル名がそのまま slug になる。

例: `src/content/blog/cloudflare-workers-tips.md`

### frontmatter 形式

```yaml
---
title: "Cloudflare Workers のパフォーマンスTips"
date: 2026-06-27
description: "Workers で気をつけるべきポイントまとめ"
tags: ["cloudflare", "workers"]
---
```

必須フィールド: `title`, `date`, `description`
任意フィールド: `tags`

### パース処理

`src/lib/blog.ts` に実装:

- `gray-matter` で frontmatter を抽出
- 共通 unified パイプライン（後述）でHTML生成
- TanStack Start の `serverFn` としてサーバー側で実行

### 記事一覧の取得

`import.meta.glob` で `src/content/blog/*.md` を一括読み込み → frontmatter のみ抽出して日付降順ソート。

## ルーティングとページ構成

### ルート

| パス | ファイル | 内容 |
|------|----------|------|
| `/blog` | `src/routes/blog/index.tsx` | 記事一覧 |
| `/blog/$slug` | `src/routes/blog/$slug.tsx` | 個別記事 |

### 一覧ページ (`/blog`)

- route の `loader` で全記事の frontmatter を取得（serverFn 経由）
- 日付降順でカード形式表示（タイトル、日付、description、タグ）
- Navbar に「Blog」リンクを追加

### 個別記事ページ (`/blog/$slug`)

- route の `loader` で slug に対応する記事を取得・パース（serverFn 経由）
- `head` で記事タイトル・description の SEO メタ + OGP メタを設定
- OGP画像URLは OGP Worker のエンドポイントを指す
- slug に対応する記事が見つからない場合は `notFound()` を throw

## Markdown レンダリングパイプライン

### 共通パイプライン (`src/lib/markdown.ts`)

```
remark-parse → remark-gfm → remark-rehype → rehype-shiki → rehype-stringify
```

- `remark-gfm`: GitHub Flavored Markdown サポート（テーブル、タスクリスト、脚注）
- `rehype-shiki`: shiki によるシンタックスハイライト（テーマ: `github-dark`）
- サーバー側で実行するため shiki のバンドルサイズは問題にならない

### 既存 Markdown レンダリングの統一

- `MarkdownArticle` コンポーネントを共通 unified パイプラインに移行
- 既存ページ（guideline, privacy_policy, term_of_service, asctl）も SSR の serverFn 経由でパースする形に変更
- `?raw` インポートでクライアントにMarkdownテキストを送る現行方式から、SSRでHTMLのみ送信する方式に改善
- `marked` パッケージは依存から削除

### HTMLの表示

パース済みHTMLを `dangerouslySetInnerHTML` で表示。信頼できる自リポジトリ内コンテンツのみを対象とする。

## OGP画像生成（内部 Worker）

### 構成

`workers/og-worker/` に Cloudflare Worker として配置。beta-worker と同じパターンで、メインの eqmonitor-site Worker からサービスバインディング (`OG_WORKER: Fetcher`) 経由で内部ルーティングする。独自ドメインは不要。

使用ライブラリ:
- `satori` (`satori/standalone`)
- `@resvg/resvg-wasm`

### wrangler 設定

**workers/og-worker/wrangler.jsonc**:
- `workers_dev: false`（外部公開しない）

**wrangler.jsonc（メイン）** に追加:
```jsonc
"services": [
  // 既存
  { "binding": "BETA_WORKER", "service": "eqmonitor-beta-worker" },
  // 追加
  { "binding": "OG_WORKER", "service": "eqmonitor-og-worker" }
]
```

**src/server/env.ts** に `OG_WORKER: Fetcher` を追加。

### エンドポイント

`GET /?title=...`

メイン Worker 側からは `appEnv.OG_WORKER.fetch(new Request('https://dummy/?title=...'))` のようにサービスバインディング経由で呼び出す。

### 画像仕様

- サイズ: 1200x630px（OGP標準）
- デザイン: EQMonitor ロゴ + 記事タイトル + サイト名
- 配色: サイトのダークテーマに準拠

### フォント

Noto Sans JP を Workers 内にバンドル。

### キャッシュ

`Cache-Control` ヘッダーで長期キャッシュ。記事タイトルが変わらない限り同じ画像が返る。

### ブログ側での参照

個別記事ページの `loader` で OGP Worker をサービスバインディング経由で呼び出し、生成された画像のURLを `head` の `og:image` に設定。メイン Worker 側に `/api/og` のようなプロキシエンドポイントを用意し、外部からのOGPクローラーがアクセスできるようにする。

## 追加依存パッケージ

### eqmonitor-site

追加:
- `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-stringify`, `rehype-shiki`, `shiki`, `gray-matter`

削除:
- `marked`

### workers/og-worker (新規)

- `hono`
- `satori`
- `@resvg/resvg-wasm`
