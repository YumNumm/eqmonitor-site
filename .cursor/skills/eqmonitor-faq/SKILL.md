---
name: eqmonitor-faq
description: EQMonitor サイトの FAQ コンテンツを追加・編集する。src/content/faq/ 配下のMarkdownファイルを操作するとき、よくある質問ページのセクションや項目を追加・変更・削除するときに使う。
---

# EQMonitor FAQ コンテンツ管理

## ファイル構成

```
src/content/faq/
  {section-id}/
    _index.md       ← セクション定義（必須）
    {item-id}.md    ← Q&A 1件
    {item-id}.md    ← Q&A 1件
  {section-id}/
    _index.md
    ...
```

- セクション ID・項目 ID はURLハッシュになる（英数字・ハイフン推奨）
- `_index.md` が存在しないディレクトリは無視される
- ファイルを追加するだけで自動的に表示される（コード変更不要）

## セクション定義 (`_index.md`)

```markdown
---
title: セクションのタイトル
description: セクションの説明文（Markdown可）
order: 1
---
```

- `order` の昇順でセクションが並ぶ
- `description` は Markdown で書ける（省略可）

## Q&A ファイル (`{item-id}.md`)

```markdown
---
question: 質問文をここに書く
order: 1
---

回答を Markdown で書く。

- リスト
- **強調**
- [リンク](https://example.com)

コードブロックも使える（shiki でシンタックスハイライト）。
```

- `order` の昇順でセクション内の項目が並ぶ
- 本文は GFM (GitHub Flavored Markdown) + shiki ハイライト

## 実装の場所

| ファイル | 役割 |
|---|---|
| `src/lib/faq.ts` | `import.meta.glob` でファイル読み込み・レンダリング |
| `src/routes/faq.tsx` | ページコンポーネント・ハッシュリンク制御 |
| `src/content/faq/` | コンテンツ（Markdownファイル） |

コンテンツ追加時はこのディレクトリのみ編集すればよい。

## 対応言語（シンタックスハイライト）

`typescript` `javascript` `json` `yaml` `bash` `markdown` `html` `css` `dart` `swift` `kotlin` `sql` `diff` `dockerfile` `toml`
