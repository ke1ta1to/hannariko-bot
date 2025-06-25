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
3. `getSlashCommand()` でスラッシュコマンドを定義（SlashCommandBuilder を返す）
4. `handleInteraction()` でコマンドロジックを実装
5. `src/main.ts` の `HannarikoBot` クラスで登録

新規コマンド実装例：
```typescript
export class NewCommand extends CommandBase {
  constructor(protected readonly bot: HannarikoBot) {
    super(bot);
    this.register();
  }

  getSlashCommand(): SharedSlashCommand {
    return new SlashCommandBuilder()
      .setName('commandname')
      .setDescription('コマンドの説明');
  }

  async handleInteraction(interaction: Interaction<CacheType>) {
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply();
    // 処理実装
    await interaction.editReply('結果');
  }
}
```

### 主要クラス構造

- **HannarikoBot** (`src/main.ts`): メインのボットクラス
  - Discord クライアント、REST API、Google AI の管理
  - コマンドの登録とイベントハンドリング
  - 機能クラス（TwitterDuplicateDetector など）の初期化
- **CommandBase** (`src/commands/command-base.ts`): コマンドの基底クラス
  - スラッシュコマンドの構築とインタラクション処理の抽象化
  - 自動的な interactionCreate イベントリスナー登録
- **TwitterDuplicateDetector** (`src/features/twitter-duplicate-detector.ts`): Twitter/X リンク重複検知
  - SQLite データベースで投稿履歴を管理
  - 重複時に「deprecated!」警告を自動送信

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

## データベース

- SQLite3 を使用（`twitter_links.db`）
- テーブル定義は `src/database/twitter-links.ts` で管理
- 必要に応じて自動的にテーブルを作成

## 既存コマンド一覧

- `/talk` - AI による太郎と花子の対話生成
  - オプション: お題、太郎の性格、花子の性格、ターン数
- `/history` - チャンネルの最新100メッセージを分析
  - オプション: プロンプト（分析内容のカスタマイズ）
