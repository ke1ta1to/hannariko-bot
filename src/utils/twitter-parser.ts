export class TwitterParser {
  private static readonly TWITTER_URL_PATTERN =
    /https?:\/\/(twitter\.com|x\.com|fxtwitter\.com|vxtwitter\.com)\/([^\/]+)\/status\/(\d+)/i;

  /**
   * URLからツイートIDを抽出
   * @param url 検査するURL
   * @returns ツイートID、またはnull（TwitterのURLでない場合）
   */
  static extractTweetId(url: string): string | null {
    const match = url.match(this.TWITTER_URL_PATTERN);
    return match ? match[3] : null;
  }

  /**
   * URLがTwitter/XのURLかどうかを判定
   * @param url 検査するURL
   * @returns TwitterのURLの場合true
   */
  static isTwitterUrl(url: string): boolean {
    return this.TWITTER_URL_PATTERN.test(url);
  }

  /**
   * メッセージ内のすべてのTwitter URLを抽出
   * @param message メッセージテキスト
   * @returns ツイートIDの配列
   */
  static extractAllTweetIds(message: string): string[] {
    const urls =
      message.match(
        /https?:\/\/(twitter\.com|x\.com|fxtwitter\.com|vxtwitter\.com)\/[^\s]+/gi
      ) || [];
    const tweetIds: string[] = [];

    for (const url of urls) {
      const tweetId = this.extractTweetId(url);
      if (tweetId) {
        tweetIds.push(tweetId);
      }
    }

    return tweetIds;
  }
}
