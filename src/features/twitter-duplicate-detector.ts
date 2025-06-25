import { Events, Message } from "discord.js";
import { HannarikoBot } from "../main";
import { TwitterLinksDatabase } from "../database/twitter-links";
import { TwitterParser } from "../utils/twitter-parser";

export class TwitterDuplicateDetector {
  private database: TwitterLinksDatabase;

  constructor(private bot: HannarikoBot) {
    this.database = new TwitterLinksDatabase();
  }

  async initialize(): Promise<void> {
    try {
      // データベースの初期化
      await this.database.initialize();
      console.log("Twitter duplicate detector initialized");

      // メッセージイベントのリスナー登録
      this.bot.client.on(Events.MessageCreate, async (message) => {
        await this.handleMessage(message);
      });
    } catch (error) {
      console.error("Failed to initialize Twitter duplicate detector:", error);
      // エラーが発生しても機能停止しない
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    // ボットのメッセージは無視
    if (message.author.bot) return;

    try {
      // メッセージからツイートIDを抽出
      const tweetIds = TwitterParser.extractAllTweetIds(message.content);

      for (const tweetId of tweetIds) {
        await this.checkDuplicate(tweetId, message);
      }
    } catch (error) {
      console.error(
        "Error handling message for Twitter duplicate check:",
        error
      );
      // エラーが発生しても処理を継続
    }
  }

  private async checkDuplicate(
    tweetId: string,
    message: Message
  ): Promise<void> {
    try {
      // データベースで重複確認
      const existingLink = await this.database.findByTweetId(tweetId);

      if (existingLink) {
        // 重複の場合
        await this.database.incrementPostCount(tweetId);

        // 元のメッセージリンクを生成
        let warningMessage = "⚠️ deprecated! このリンクは既に投稿されています";
        
        if (existingLink.message_id && existingLink.channel_id) {
          const guildId = message.guild?.id;
          if (guildId) {
            const messageLink = `https://discord.com/channels/${guildId}/${existingLink.channel_id}/${existingLink.message_id}`;
            warningMessage += `\n元の投稿: ${messageLink}`;
          }
        }

        // 警告メッセージを送信
        await message.reply(warningMessage);
      } else {
        // 新規の場合はデータベースに記録
        await this.database.insert({
          tweet_id: tweetId,
          first_posted_by: message.author.id,
          channel_id: message.channel.id,
          message_id: message.id,
        });
      }
    } catch (error) {
      console.error("Error checking duplicate for tweet ID:", tweetId, error);
      // エラーの場合はデフォルトで許可（安全側に倒す）
    }
  }
}
