import * as sqlite3 from "sqlite3";
import * as path from "path";

export interface TwitterLink {
  id?: number;
  tweet_id: string;
  first_posted_at?: Date;
  first_posted_by: string;
  channel_id: string;
  message_id: string;
  post_count?: number;
}

export class TwitterLinksDatabase {
  private db: sqlite3.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), "twitter-links.db");
    this.db = new sqlite3.Database(dbPath);
  }

  async initialize(): Promise<void> {
    const run = (sql: string, params: unknown[] = []) =>
      new Promise<void>((resolve, reject) => {
        this.db.run(sql, params, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

    await run(
      `
        CREATE TABLE IF NOT EXISTS twitter_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tweet_id TEXT NOT NULL UNIQUE,
          first_posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          first_posted_by TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          message_id TEXT,
          post_count INTEGER DEFAULT 1
        );
      `
    );

    await new Promise<void>((resolve) => {
      this.db.run("ALTER TABLE twitter_links ADD COLUMN message_id TEXT", (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.error("Failed to add message_id column:", err);
        }
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_tweet_id ON twitter_links(tweet_id)",
        (err) => {
          if (err) {
            console.error("Failed to create tweet_id index:", err);
          }
          resolve();
        }
      );
    });

    await run(
      `
        CREATE TABLE IF NOT EXISTS user_duplicate_counts (
          user_id TEXT PRIMARY KEY,
          duplicate_count INTEGER NOT NULL DEFAULT 0
        );
      `
    );

    await new Promise<void>((resolve) => {
      this.db.run(
        "CREATE INDEX IF NOT EXISTS idx_duplicate_count ON user_duplicate_counts(duplicate_count DESC)",
        (err) => {
          if (err) {
            console.error("Failed to create duplicate count index:", err);
          }
          resolve();
        }
      );
    });
  }

  async findByTweetId(tweetId: string): Promise<TwitterLink | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM twitter_links WHERE tweet_id = ?",
        [tweetId],
        (err, row: TwitterLink) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || null);
          }
        }
      );
    });
  }

  async insert(link: TwitterLink): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO twitter_links (tweet_id, first_posted_by, channel_id, message_id) VALUES (?, ?, ?, ?)",
        [link.tweet_id, link.first_posted_by, link.channel_id, link.message_id],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async incrementPostCount(tweetId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE twitter_links SET post_count = post_count + 1 WHERE tweet_id = ?",
        [tweetId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async incrementUserDuplicateCount(userId: string): Promise<number> {
    await new Promise<void>((resolve, reject) => {
      this.db.run(
        `INSERT INTO user_duplicate_counts (user_id, duplicate_count)
         VALUES (?, 1)
         ON CONFLICT(user_id) DO UPDATE SET duplicate_count = duplicate_count + 1`,
        [userId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    return new Promise<number>((resolve, reject) => {
      this.db.get(
        "SELECT duplicate_count FROM user_duplicate_counts WHERE user_id = ?",
        [userId],
        (err, row: { duplicate_count: number }) => {
          if (err) {
            reject(err);
          } else {
            resolve(row?.duplicate_count ?? 0);
          }
        }
      );
    });
  }

  async getAllUserDuplicateCounts(): Promise<
    { user_id: string; duplicate_count: number }[]
  > {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT user_id, duplicate_count FROM user_duplicate_counts
         WHERE duplicate_count > 0
         ORDER BY duplicate_count DESC, user_id ASC`,
        (err, rows: { user_id: string; duplicate_count: number }[] = []) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  close(): void {
    this.db.close();
  }
}
