# タスク管理ボード（フロントエンド / MVP）

要件定義書に基づく、カンバン形式のタスク管理アプリのフロントエンドです。
現段階ではバックエンド（Supabase）に接続せず、ブラウザの `localStorage` を使うモックAPIで動作します。

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 実装範囲（今回）

- 新規登録 / ログイン / ログアウト（モック認証、保護ルートへのリダイレクト）
- 単一ボード表示（未対応 / 進行中 / 完了 の3列固定）
- タスクの作成・詳細表示・編集・削除（タイトル必須、詳細、期限、ステータス）
- ドラッグ＆ドロップ（dnd-kit：同一列内の並べ替え・別列への移動）
- 招待リンクのコピー（オーナーのみ有効）と、招待リンクからの参加（`/join/[token]`）

## 今後の作業（未実装）

- Supabase 接続（`src/lib/mock-api.ts` を Supabase クライアントに置き換え）
- RLS によるアクセス制御、Supabase Realtime による同期
- 楽観的更新の失敗時ロールバックの強化

## ディレクトリ構成

```
src/
  app/            … ルーティング（App Router）
  components/     … 画面コンポーネント
  lib/
    types.ts      … 型定義・列定義
    mock-api.ts   … データアクセス層（Supabase 移行時に差し替え）
    board-utils.ts… 並べ替え・移動ロジック（純粋関数）
    auth-context.tsx… 認証状態の提供
```

## 注意

モック段階のため、パスワードは平文で localStorage に保存されます。本番では Supabase Auth を使用してください。
