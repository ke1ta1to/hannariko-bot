import { CacheType, Interaction, Routes, SharedSlashCommand } from "discord.js";
import { HannarikoBot } from "../main";

export abstract class CommandBase {
  constructor(protected readonly bot: HannarikoBot) {}

  static async registerCommand(
    slashCommands: SharedSlashCommand[],
    bot: HannarikoBot
  ) {
    const { rest } = bot;
    try {
      await rest.put(
        Routes.applicationGuildCommands(bot.clientId, bot.guildId),
        {
          body: slashCommands.map((cmd) => cmd.toJSON()),
        }
      );
      console.log("Successfully registered application commands.");
    } catch (error) {
      console.error("Error registering commands:", error);
    }
  }

  abstract handleInteraction(
    interaction: Interaction<CacheType>
  ): Promise<void>;

  abstract getSlashCommand(): SharedSlashCommand;
}
