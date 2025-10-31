import {
  CacheType,
  Events,
  Interaction,
  Routes,
  SharedSlashCommand,
  SlashCommandBuilder,
} from "discord.js";
import { HannarikoBot } from "../main";
import { CommandBase } from "./command-base";

export class HistoryCommand extends CommandBase {
  constructor(protected readonly bot: HannarikoBot) {
    super(bot);
    this.register();
  }

  async register() {
    const { client } = this.bot;

    // コマンドの実行
    // アロー関数を使用してthisのバインドを保持する
    client.on(Events.InteractionCreate, (interaction) =>
      this.handleInteraction(interaction)
    );
  }

  getSlashCommand(): SharedSlashCommand {
    return new SlashCommandBuilder()
      .setName("history")
      .setDescription("Get the history of a command")
      .addStringOption((option) =>
        option.setName("プロンプト").setDescription("AIに与えるプロンプト")
      );
  }

  async handleInteraction(interaction: Interaction<CacheType>) {
    const { gemini } = this.bot;

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const { commandName } = interaction;
    if (commandName === "history") {
      const promptMessage = interaction.options.getString("プロンプト");

      const messages = await interaction.channel?.messages.fetch({
        limit: 100,
      });
      if (!messages) {
        interaction.reply({
          content: "メッセージの取得に失敗しました。",
        });
        return;
      }
      const authors: Record<string, string> = {};

      const data = messages.map((message) => {
        const text = message.content;
        const author = message.author.username;
        authors[message.author.username] = message.author.id;

        const date = message.createdAt;
        const dateString = date.toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        return {
          text,
          author,
          date: dateString,
        };
      });

      const prompt = `
- 次のJSONの会話内容から、誰がどんな性格なのかを分析（最大500文字）
- 本文のみ出力
- 追加のプロンプトに従うこと
- Discord用メッセージ：
  - ユーザー名の代わりに、メンションを使用
  - メンションは<@id>形式
  - 各ユーザーごとに改行
  - Discordマークダウンで見やすく（バッククオートで囲わない）

---

追加のプロンプト
${promptMessage}

---

会話内容
${JSON.stringify(data, null, 2)}

---

ユーザー名とIDの対応 
${JSON.stringify(authors, null, 2)}
`;

      await interaction.deferReply();
      const response = await gemini.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      if (!response.text) {
        await interaction.editReply({
          content: "No response generated.",
        });
        return;
      }
      if (response.text.length > 2000) {
        const results = response.text.match(/.{1,2000}/g) || [response.text];
        await interaction.editReply({
          content: "メッセージが長すぎるため、分割して送信します。",
        });
        for (const result of results) {
          await interaction.followUp({
            content: result,
          });
        }
      } else {
        await interaction.editReply({
          content: response.text || "No response generated.",
        });
      }
    }
  }
}
