# Repository Guidelines

## プロジェクト構成とモジュール整理
- `src/main.ts`: Discord クライアント初期化とコマンド登録をまとめるエントリーポイント。
- `src/commands/`: スラッシュコマンド実装を機能別に分割。新規追加時は `CommandBase` を継承し、`getSlashCommand` を必ず提供してください。
- `src/features/`: 常駐タスクやゲームなど、ボットの常時稼働機能を配置。Twitter 関連処理はここに統一します。
- `src/database/` と `twitter-links.db`: SQLite ベースの重複検知データを保持。スキーマ変更時はマイグレーションスクリプトを同ディレクトリへ追加してください。
- `src/utils/`: 共通ユーティリティ。副作用のない純粋関数のみを置くことを推奨します。
- `dist/`: `tsc` の出力先。手動編集は避け、ビルドでのみ生成します。

## ビルド・テスト・開発コマンド
- `npm run build`: TypeScript を `tsconfig.json` に基づいてビルドし、型チェックを同時に実行。
- `npm start`: 最新の `dist/main.js` を本番相当で実行。
- `npm run dev`: `nodemon` で `src/**/*.ts` を監視し、変更時に再ビルドと再起動を自動化。
- 型のみ検証したい場合は `npx tsc --noEmit` を手動で実行してください。

## コーディングスタイルと命名規約
- インデントは現行ファイルに合わせて 2 スペースを維持。タブの混在は禁止です。
- クラスは `PascalCase`、関数・変数は `camelCase`、定数や環境変数は `SCREAMING_SNAKE_CASE` を使用。
- ファイル名は `kebab-case.ts` で統一 (`three-three-four-game.ts` など)。
- 自動整形ツールは未導入のため、PR では `prettier --parser typescript` などローカル整形を推奨します。

## テストガイドライン
- 現在は自動テスト未整備です。新機能は少なくとも Discord 上での手動動作確認ログを PR に添付してください。
- 将来的なテスト導入を見越し、`src/**/__tests__` もしくは `tests/` 直下にモジュール単位で配置する構成を想定しています。
- 外部 API を利用する処理は DI を用いてモック化しやすい形に抽象化してください。

## コミットおよび Pull Request ガイドライン
- Git 履歴は `feat: ...` や `fix: ...` のような Conventional Commits 形式を採用しています。50 文字以内で意図を明確に記述してください。
- 複数変更が混在する場合は commit を機能ごとに分割し、`docs:` や `refactor:` など適切なタイプを選択します。
- PR 説明には 1) 目的の概要、2) 主要変更点、3) テスト結果やスクリーンショット、4) 関連 Issue 番号 (#123 など) を含めてください。
- Secrets (.env) や生成された `dist/` の差分は PR から除外し、必要な環境変数 (`DISCORD_TOKEN` など) は README への追記で共有します。

## セキュリティと設定のヒント
- `.env` に保存する `DISCORD_TOKEN` `CLIENT_ID` `GUILD_ID` `GOOGLE_API_KEY` は必ずローカル環境限定で管理。Git へのコミットは禁止です。
- Bot を初期化する前に `npm install` で依存関係を揃え、SQLite ファイルに書き込み権限があることを確認してください。
- 外部サービス API キーを更新した際は README とこのドキュメントの該当箇所を同時に修正し、履歴の一貫性を保ちます。
