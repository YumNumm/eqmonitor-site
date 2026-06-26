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

## OGP画像生成（別Workers）

### 構成

`workers/og-worker/` に別の Cloudflare Worker として配置。

使用ライブラリ:
- `satori` (`satori/standalone`)
- `@resvg/resvg-wasm`

### エンドポイント

`GET /blog/:slug?title=...`

クエリパラメータで `title` を受け取りOGP画像を生成。Worker 側で記事ファイルを読む必要がなく、独立性が保てる。

### 画像仕様

- サイズ: 1200x630px（OGP標準）
- デザイン: EQMonitor ロゴ + 記事タイトル + サイト名
- 配色: サイトのダークテーマに準拠

### フォント

Noto Sans JP を Workers 内にバンドル。

### キャッシュ

`Cache-Control` ヘッダーで長期キャッシュ。記事タイトルが変わらない限り同じ画像が返る。

### ブログ側での参照

個別記事の `head` で `og:image` に OGP Worker の URL を設定。

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
