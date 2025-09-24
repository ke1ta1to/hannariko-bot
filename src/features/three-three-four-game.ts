import { Events, Message } from "discord.js";
import { HannarikoBot } from "../main";

interface ScoreEntry {
  userId: string;
  username: string;
  millisecondsPast334: number;
  timestamp: Date;
  messageId: string;
}

export class ThreeThreeFourGame {
  private dailyScores: Map<string, ScoreEntry[]> = new Map(); // channelId -> scores

  constructor(private bot: HannarikoBot) {}

  async initialize(): Promise<void> {
    try {
      console.log("334 game initialized");

      // メッセージイベントのリスナー登録
      this.bot.client.on(Events.MessageCreate, async (message) => {
        await this.handleMessage(message);
      });
    } catch (error) {
      console.error("Failed to initialize 334 game:", error);
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    // ボットのメッセージは無視
    if (message.author.bot) return;

    // メッセージが "334" でない場合は無視
    if (message.content !== "334") return;

    try {
      await this.check334Time(message);
    } catch (error) {
      console.error("Error handling 334 message:", error);
    }
  }

  private async check334Time(message: Message): Promise<void> {
    const messageTime = new Date(message.createdTimestamp);

    // 現在の日付の3時34分を作成（JST）
    const jstOffset = 9 * 60 * 60 * 1000; // 9時間のオフセット
    const jstTime = new Date(messageTime.getTime() + jstOffset);

    // JSTの3時34分を計算
    const target334 = new Date(jstTime);
    target334.setUTCHours(3 - 9, 34, 0, 0); // JSTの3:34はUTCの前日18:34

    // もし現在時刻が3時34分より前の場合、次の3時34分を設定
    if (jstTime.getHours() < 3 || (jstTime.getHours() === 3 && jstTime.getMinutes() < 34)) {
      // 今日の3時34分
    } else if (jstTime.getHours() > 3 || (jstTime.getHours() === 3 && jstTime.getMinutes() >= 34)) {
      // 次の日の3時34分
      target334.setDate(target334.getDate() + 1);
    }

    // 15時34分バージョンも考慮（午後3時34分）
    const target1534 = new Date(jstTime);
    target1534.setUTCHours(15 - 9, 34, 0, 0); // JSTの15:34はUTCの6:34

    // 最も近い3:34を選択
    let targetTime: Date;
    let timeString: string;
    const diffTo334 = Math.abs(jstTime.getTime() - target334.getTime());
    const diffTo1534 = Math.abs(jstTime.getTime() - target1534.getTime());

    if (diffTo334 < diffTo1534) {
      targetTime = target334;
      timeString = "3:34";
    } else {
      targetTime = target1534;
      timeString = "15:34";
    }

    const timeDiff = jstTime.getTime() - targetTime.getTime();

    // 3時34分より前の場合
    if (timeDiff < 0) {
      const minutesEarly = Math.floor(Math.abs(timeDiff) / (1000 * 60));
      const secondsEarly = Math.floor((Math.abs(timeDiff) % (1000 * 60)) / 1000);
      await message.reply(
        `❌ アウト！${timeString}より${minutesEarly}分${secondsEarly}秒早いです。`
      );
      return;
    }

    // 3時34分ぴったりまたは過ぎている場合
    const millisecondsPast = timeDiff;
    const minutesPast = Math.floor(millisecondsPast / (1000 * 60));
    const secondsPast = Math.floor((millisecondsPast % (1000 * 60)) / 1000);
    const millisecondRemainder = millisecondsPast % 1000;

    // チャンネルごとのスコアを記録
    const channelId = message.channel.id;
    if (!this.dailyScores.has(channelId)) {
      this.dailyScores.set(channelId, []);
    }

    const scores = this.dailyScores.get(channelId)!;
    const newEntry: ScoreEntry = {
      userId: message.author.id,
      username: message.author.displayName || message.author.username,
      millisecondsPast334: millisecondsPast,
      timestamp: jstTime,
      messageId: message.id,
    };

    scores.push(newEntry);
    scores.sort((a, b) => a.millisecondsPast334 - b.millisecondsPast334);

    // 今日のベストスコアを取得
    const todayScores = scores.filter(score => {
      const scoreDate = new Date(score.timestamp);
      return scoreDate.toDateString() === jstTime.toDateString();
    });

    const rank = todayScores.findIndex(s => s.messageId === message.id) + 1;
    const isNewRecord = rank === 1;

    let replyMessage = "";

    if (millisecondsPast === 0) {
      replyMessage = `🎯 **完璧！** ${timeString}ちょうど！素晴らしいタイミングです！`;
    } else if (secondsPast === 0) {
      replyMessage = `🏆 ほぼ完璧！${timeString}から${millisecondRemainder}ミリ秒遅れ！`;
    } else if (minutesPast === 0) {
      replyMessage = `✨ 素晴らしい！${timeString}から${secondsPast}秒${millisecondRemainder}ミリ秒遅れ`;
    } else {
      replyMessage = `⏰ ${timeString}から${minutesPast}分${secondsPast}秒遅れ`;
    }

    if (isNewRecord && todayScores.length > 1) {
      replyMessage += `\n🥇 **新記録！** 今日の最高タイム更新！`;
    } else if (rank <= 3) {
      const medals = ["🥇", "🥈", "🥉"];
      replyMessage += `\n${medals[rank - 1]} 現在${rank}位`;
    } else {
      replyMessage += `\n📊 現在${rank}位`;
    }

    // トップ3を表示
    if (todayScores.length > 1) {
      replyMessage += "\n\n**今日のランキング:**";
      const top3 = todayScores.slice(0, 3);
      top3.forEach((score, index) => {
        const medals = ["🥇", "🥈", "🥉"];
        const mins = Math.floor(score.millisecondsPast334 / (1000 * 60));
        const secs = Math.floor((score.millisecondsPast334 % (1000 * 60)) / 1000);
        const ms = score.millisecondsPast334 % 1000;
        let timeStr = "";
        if (mins > 0) {
          timeStr = `${mins}分${secs}秒`;
        } else if (secs > 0) {
          timeStr = `${secs}.${String(ms).padStart(3, '0')}秒`;
        } else {
          timeStr = `${ms}ミリ秒`;
        }
        replyMessage += `\n${medals[index]} ${score.username}: +${timeStr}`;
      });
    }

    await message.reply(replyMessage);
  }

}