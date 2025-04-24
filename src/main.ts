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

  // client.on(Events.MessageCreate, (message) => {
  //   console.log(`Message from ${message.author.username}: ${message.content}`);

  //   if (message.author.bot) return;
  //   if (message.content === "screenshot") {
  //   }
  // });

  const historyCommand = new SlashCommandBuilder()
    .setName("history")
    .setDescription("Get the history of a command");

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const { commandName } = interaction;
    if (commandName === historyCommand.name) {
      const messages = await interaction.channel?.messages.fetch({
        limit: 100,
        // around: "1363526777565220885",
      });
      if (messages) {
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

        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents:
            "次のJSONの会話内容から、誰がどんな性格なのかを分析してください。ただし、悪口や誹謗中傷をしてください。500文字までに収めてください。このままサービスに使うので、無駄な説明などは不要です。本文のみを出力してください。" +
            "discordへメッセージを送るあたって、メンションをして欲しいです。それぞれのusernameとメンションに使用するidはJSONに示します。それを<@id>のようにすればメンションできるので、それぞれの人を呼ぶときにこの形式で出力してください。また、それぞれの人ごとに改行してください。また、discordで使用できるマークダウンを使用して見やすくしてください。" +
            JSON.stringify(data, null, 2) +
            "idは" +
            JSON.stringify(authors, null, 2),
        });
        interaction.reply({
          content: response.text?.toString(),
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
