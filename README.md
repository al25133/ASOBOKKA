# ASOBOKKA

Supabase 認証 + リアルタイム同期で、5桁の合言葉を使ってグループ参加・選択内容の同時共有を行う Next.js アプリです。

## セットアップ

1. 依存関係をインストール

```bash
pnpm install
```

2. 環境変数を設定

```bash
cp .env.example .env.local
```

`.env.local` に以下を設定します。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

3. Supabase SQL を実行

Supabase ダッシュボードの SQL Editor で [supabase/schema.sql](supabase/schema.sql) を実行してください。

## 開発サーバー

```bash
pnpm dev
```

ブラウザで `http://localhost:3000` を開きます。

## 実装済み機能

- メールアドレス登録 / ログイン
- 匿名ログイン
- 5桁合言葉の重複なしグループ作成
- 合言葉検索とグループ参加
- ルーム内の選択情報保存（エリア・目的・価値観・待機完了）
- Supabase Realtime によるメンバー状態の即時同期
- 全員待機完了時の結果画面自動遷移
- RLS によるグループ外アクセス制御

## 動作確認チェック

1. PC とスマホで `login/register/create/search/group/result` 画面のレイアウト確認
2. 2 端末以上で同一合言葉に参加し、選択内容が即時同期されるか確認
3. 全員が「待機完了」で結果画面へ自動遷移するか確認
4. Vercel の本番 URL で同様のシナリオを再確認

## GitHub Actions での環境変数設定

`CI` ワークフロー（`.github/workflows/ci.yml`）は、以下の GitHub Secrets を必須で参照します。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`（推奨）

設定場所: `GitHub Repository > Settings > Secrets and variables > Actions`

Secrets を追加した後は、`main` への push か `Actions > CI > Run workflow` で実行してください。

## Vercel での環境変数設定

Vercel でも同じ名前で環境変数を設定します。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

設定場所: `Vercel Project > Settings > Environment Variables`

設定後は再デプロイ（Redeploy）してください。
