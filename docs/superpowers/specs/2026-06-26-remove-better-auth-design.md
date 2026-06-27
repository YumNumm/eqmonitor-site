# better-auth剥がし + Turnstileベータ登録設計

## 概要

better-authを完全に削除し、ベータプログラム登録を「Cloudflare Turnstile + メール入力」のシンプルなフローに変更する。

## 背景

現在のベータ登録フローはApple Sign In（better-auth経由）による認証が必要だが、認証は不要と判断された。Turnstileによるbot防止のみで十分であり、TestFlightの招待メールが実質的なメールアドレス有効性確認の役割を果たす。

## 削除対象

### 依存関係（package.json）

- `better-auth`
- `better-auth-cloudflare`
- `@better-auth/infra`

### ファイル削除

- `src/server/auth.ts` — better-auth初期化
- `src/server/auth-client.ts` — クライアント側初期化
- `src/routes/api/auth/$.ts` — `/api/auth/*` ルート

### D1マイグレーション

better-authの4テーブルをDROP:

```sql
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS user;
```

`beta_registrations`テーブルから`user_id`カラムを削除:

```sql
ALTER TABLE beta_registrations DROP COLUMN user_id;
```

既存データは破棄してよい。

## 新しいベータ登録フロー

```
[ユーザー] → /beta アクセス
  ↓
[BetaForm] メール + プラットフォーム入力 + Turnstileウィジェット
  ↓
[BetaTermsModal] 注意事項6項目チェック → 「参加」ボタン
  ↓
[POST] サーバーサイド処理
  ├─ Turnstileトークン検証（既存 verifyTurnstile() 再利用）
  ├─ メール形式バリデーション（Valibot）
  ├─ 重複チェック（emailベース）
  ├─ D1にINSERT (status: 'pending')
  └─ Beta Worker呼び出し（service binding）
      └─ BetaRegistrationWorkflow（既存: TestFlight追加 → 招待 → ステータス更新 → メール送信）
```

## フロントエンド変更

### BetaForm.tsx

- Apple Sign Inステップを完全削除
- `authClient.useSession()` の参照をすべて削除
- ステップ1: メール入力 + プラットフォーム選択 + Turnstileウィジェット
- ステップ2: 注意事項モーダル（既存のBetaTermsModal再利用）
- Turnstile実装は既存の`ContactForm.tsx`のパターンを踏襲

### Navbar.tsx / Footer.tsx

- 認証関連のUI要素があれば削除

## バックエンド変更

### src/server/beta-register.ts

- `auth.api.getSession()` 呼び出しを削除
- 重複チェックを `user_id` ベースから `email` ベースに変更
- Turnstileトークン検証を追加（`verifyTurnstile()` 再利用）
- 引数にTurnstileトークンを追加

### Beta Worker（workers/beta-worker/）

- **新規: `GET /status/:workflowId`** — Workflow進捗取得エンドポイント
- 既存のWorkflowロジックは変更なし

## Workflow進捗ポーリング

### 概要

登録送信後、フロントエンドが2秒間隔でWorkflowの進捗をポーリングし、リアルタイムに進捗を表示する。エラー時はエラー表示に切り替える。

### フロー

```
[登録送信] → registerBeta() → { ok: true, workflowId }
  ↓
[ポーリング開始] setInterval(2000ms)
  ↓
[GET /api/beta/status] → Beta Worker GET /status/:workflowId
  ↓                        → env.BETA_WORKFLOW.get(workflowId).status()
  ↓
[UIに進捗表示]
  ├─ running: 現在のステップを表示
  ├─ complete: 完了表示 → ポーリング停止
  └─ errored: エラー表示 → ポーリング停止
```

### Beta Worker: GET /status/:workflowId

Cloudflare Workflows の `instance.status()` を利用。レスポンス:

```typescript
// Cloudflare Workflow status() の返り値を整形して返す
{
  status: 'running' | 'complete' | 'errored',
  output?: { testerId: string },  // complete時
  error?: string,                 // errored時
}
```

### サーバーサイド: getBetaStatus server function

- `createServerFn` で `GET` の server function を作成
- 入力: `workflowId`
- Beta Worker の `GET /status/:workflowId` を service binding 経由で呼び出し

### フロントエンド: 進捗UI

登録送信後、フォームを進捗表示UIに切り替え:

```
┌────────────────────────────────────┐
│  ベータプログラム登録中...          │
│                                    │
│  ✅ TestFlightに追加               │
│  ⏳ 招待メール送信中...             │
│  ○  登録完了メール送信              │
│                                    │
│  [ステータスバーまたはスピナー]      │
└────────────────────────────────────┘
```

ステップ表示（ユーザー向けに分かりやすいラベル）:

| Workflowステップ名 | UI表示 |
|---|---|
| `add-to-testflight` | TestFlightに追加 |
| `send-testflight-invitation` | TestFlight招待メール送信 |
| `update-registration-status` | 登録ステータス更新 |
| `send-email` | 登録完了メール送信 |

状態表示:
- ✅ 完了済みステップ
- ⏳ 実行中ステップ（スピナー）
- ○ 未実行ステップ
- ❌ エラー発生ステップ（エラーメッセージ付き）

ポーリング停止条件:
- `status === 'complete'` → 完了表示
- `status === 'errored'` → エラー表示
- 最大60秒（30回）でタイムアウト → タイムアウトエラー表示

## 収集情報

- メールアドレス（必須）
- プラットフォーム（iOS / Android選択、将来のAndroid対応に備える）

## テスト計画

1. Turnstileウィジェットが表示され、検証が通ること
2. メール入力 + プラットフォーム選択 → 注意事項モーダル → 登録が完了すること
3. 同じメールでの重複登録がブロックされること
4. 不正なTurnstileトークンが拒否されること
5. better-auth関連のルート（`/api/auth/*`）がなくなっていること
6. Beta Workerのワークフローが正常に動作すること（TestFlight追加 → メール送信）
7. 登録後にポーリングが開始され、進捗が表示されること
8. Workflow完了時にポーリングが停止し、完了表示になること
9. Workflowエラー時にエラー表示になること
10. 60秒タイムアウト時にタイムアウトエラーが表示されること
