# Twitter重複リンク検知機能 - 実装方針

## 概要

同じTwitter/Xのリンクが投稿された際に「deprecated!」と警告する機能を実装します。

## 技術構成

- **データベース**: SQLite3（軽量で組み込み可能）
- **検知対象**: `https://x.com/*/status/<id>` 形式のURL
- **実装場所**: 専用クラス（TwitterDuplicateDetector）として実装

## 実装詳細

### 1. データベース設計

```sql
CREATE TABLE twitter_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tweet_id TEXT NOT NULL UNIQUE,
    first_posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    first_posted_by TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    post_count INTEGER DEFAULT 1
);
```

### 2. URLパース処理

- 正規表現: `/https?:\/\/(twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/i`
- クエリパラメータ（`?s=`など）は無視
- ツイートIDのみを抽出して比較

### 3. メッセージ処理フロー

1. メッセージ受信時にTwitter/XのURLを検出
2. URLからツイートIDを抽出
3. SQLiteでツイートIDの重複確認
4. 新規の場合：DBに記録
5. 重複の場合：「⚠️ deprecated! このリンクは既に投稿されています」と返信

### 4. ディレクトリ構成

```
src/
├── database/
│   └── twitter-links.ts    # SQLite接続・クエリ
├── features/
│   └── twitter-duplicate-detector.ts  # Twitter重複検知機能のメインクラス
├── utils/
│   └── twitter-parser.ts   # URL解析ユーティリティ
└── main.ts                 # TwitterDuplicateDetectorのインスタンス化のみ
```

### 5. エラーハンドリング

- DB接続エラー：ログ出力のみ（機能停止しない）
- URL解析エラー：スキップ（通常メッセージとして処理）
- 重複検知エラー：デフォルトで許可（安全側に倒す）

### 6. パフォーマンス考慮

- ツイートIDにインデックス作成
- 非同期処理でメッセージ処理をブロックしない
- 定期的な古いレコード削除（オプション）

### 7. クラス設計

#### TwitterDuplicateDetector クラス

- **責務**: メッセージイベントの処理とTwitterリンク重複検知の統括
- **初期化**: HannarikoBotインスタンスを受け取り、MessageCreateイベントをリッスン
- **主要メソッド**:
  - `initialize()`: データベース初期化とイベントリスナー登録
  - `handleMessage(message)`: メッセージ処理のエントリーポイント
  - `checkDuplicate(tweetId)`: 重複チェックと警告送信

#### main.tsでの統合

```typescript
// HannarikoBotクラスのコンストラクタ内
const twitterDetector = new TwitterDuplicateDetector(this);
await twitterDetector.initialize();
```

この設計により、main.tsへの変更は最小限に抑えられ、機能は独立したクラスで管理されます。
