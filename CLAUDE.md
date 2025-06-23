# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

hannariko-bot は Discord 上で動作する AI 対話ボットです。Google Gemini AI を使用して「太郎」と「花子」という2つのキャラクターの対話を生成します。

## 開発コマンド

```bash
# 開発サーバー起動（nodemon で自動再起動）
npm run dev

# TypeScript のビルド
npm run build

# 本番実行（ビルド済みコードを実行）
npm start
```

## アーキテクチャ

### コマンドシステム

すべてのコマンドは `CommandBase` クラスを継承し、以下のパターンに従います：

1. `src/commands/` ディレクトリに新規ファイルを作成
2. `CommandBase` を継承したクラスを実装
3. `buildSlashCommand()` でスラッシュコマンドを定義
4. `handleInteraction()` でコマンドロジックを実装
5. `src/main.ts` の `HannarikoBot` クラスで登録

### 主要クラス構造

- **HannarikoBot** (`src/main.ts`): メインのボットクラス
  - Discord クライアント、REST API、Google AI の管理
  - コマンドの登録とイベントハンドリング
- **CommandBase** (`src/commands/command-base.ts`): コマンドの基底クラス
  - スラッシュコマンドの構築とインタラクション処理の抽象化

### AI 統合パターン

Google Gemini AI の使用パターン：

- モデル: `gemini-2.0-flash`
- 長いメッセージの分割: 2000文字を超える場合は自動分割
- エラーハンドリング: AI 生成エラーは適切にキャッチして Discord に通知

### Discord API パターン

- インタラクション: `defer()` → 処理 → `editReply()` のパターンを使用
- メッセージ更新: 長時間処理では進行状況を逐次更新
- メンション変換: `<@ユーザーID>` 形式でユーザーメンションを処理

## 環境変数

必須の環境変数（`.env` ファイル）：

- `DISCORD_TOKEN`: Discord ボットトークン
- `CLIENT_ID`: Discord アプリケーション ID
- `GUILD_ID`: Discord サーバー ID
- `GOOGLE_API_KEY`: Google Generative AI API キー

## コード規約

- TypeScript strict モードを使用
- async/await パターンの一貫した使用
- エラーは Discord メッセージとして適切に通知
- 既存のコマンドパターンに従って新機能を実装
