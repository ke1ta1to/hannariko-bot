import * as sqlite3 from "sqlite3";
import * as path from "path";

export interface TwitterLink {
  id?: number;
  tweet_id: string;
  first_posted_at?: Date;
  first_posted_by: string;
  channel_id: string;
  post_count?: number;
}

export class TwitterLinksDatabase {
  private db: sqlite3.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), "twitter-links.db");
    this.db = new sqlite3.Database(dbPath);
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
                CREATE TABLE IF NOT EXISTS twitter_links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tweet_id TEXT NOT NULL UNIQUE,
                    first_posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    first_posted_by TEXT NOT NULL,
                    channel_id TEXT NOT NULL,
                    post_count INTEGER DEFAULT 1
                );
            `,
        (err) => {
          if (err) {
            reject(err);
          } else {
            // Create index on tweet_id for better performance
            this.db.run(
              "CREATE INDEX IF NOT EXISTS idx_tweet_id ON twitter_links(tweet_id)",
              (indexErr) => {
                if (indexErr) {
                  console.error("Failed to create index:", indexErr);
                }
                resolve();
              }
            );
          }
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
        "INSERT INTO twitter_links (tweet_id, first_posted_by, channel_id) VALUES (?, ?, ?)",
        [link.tweet_id, link.first_posted_by, link.channel_id],
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

  close(): void {
    this.db.close();
  }
}
