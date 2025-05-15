import { GoogleGenAI } from "@google/genai";
import { Client, Events, GatewayIntentBits, REST } from "discord.js";
import "dotenv/config";
import { HistoryCommand } from "./commands/history";
import { TalkCommand } from "./commands/talk";
import { CommandBase } from "./commands/command-base";

export class HannarikoBot {
  public readonly client: Client;
  public readonly rest: REST;
  public readonly ai: GoogleGenAI;

  constructor(
    public readonly token: string,
    public readonly clientId: string,
    public readonly guildId: string,
    public readonly geminiApiKey: string
  ) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });
    this.rest = new REST().setToken(token);
    this.ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });

    this.client.once(Events.ClientReady, async (readyClient) => {
      console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    });
  }
}

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  const googleApiKey = process.env.GOOGLE_API_KEY;
  if (!token || !clientId || !guildId || !googleApiKey) {
    console.error("All required environment variables are not set");
    process.exit(1);
  }

  const bot = new HannarikoBot(token, clientId, guildId, googleApiKey);
  const commands = [
    new TalkCommand(bot).getSlashCommand(),
    new HistoryCommand(bot).getSlashCommand(),
  ];
  await CommandBase.registerCommand(commands, bot);

  await bot.client.login(token);
}

main();
