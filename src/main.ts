import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { GoogleGenAI } from "@google/genai";

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  if (!token) {
    console.error("DISCORD_TOKEN is not set");
    process.exit(1);
  }
  if (!clientId) {
    console.error("CLIENT_ID is not set");
    process.exit(1);
  }
  const guildId = process.env.GUILD_ID;
  if (!guildId) {
    console.error("GUILD_ID is not set");
    process.exit(1);
  }
  const googleApiKey = process.env.GOOGLE_API_KEY;
  if (!googleApiKey) {
    console.error("GOOGLE_API_KEY is not set");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      // GatewayIntentBits.GuildMessages,
      // GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  });

  const historyCommand = new SlashCommandBuilder()
    .setName("history")
    .setDescription("Get the history of a command")
    .addStringOption((option) =>
      option.setName("プロンプト").setDescription("AIに与えるプロンプト")
    );

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const { commandName } = interaction;
    if (commandName === historyCommand.name) {
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

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      let results = [response.text];
      if (response.text.length > 2000) {
        results = response.text.match(/.{1,2000}/g) || [response.text];
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
  });

  const rest = new REST().setToken(token);
  const commands = [historyCommand].map((command) => command.toJSON());
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log("Successfully registered application commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }

  client.login(token);
}

main();
