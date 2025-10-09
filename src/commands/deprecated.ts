import {
  CacheType,
  Events,
  Interaction,
  SharedSlashCommand,
  SlashCommandBuilder,
} from "discord.js";
import { HannarikoBot } from "../main";
import { CommandBase } from "./command-base";
import { TwitterLinksDatabase } from "../database/twitter-links";

export class DeprecatedCommand extends CommandBase {
  private readonly database: TwitterLinksDatabase;
  private readonly initPromise: Promise<void>;

  constructor(protected readonly bot: HannarikoBot) {
    super(bot);
    this.database = new TwitterLinksDatabase();
    this.initPromise = this.database.initialize();
    this.register();
  }

  private register(): void {
    const { client } = this.bot;
    client.on(Events.InteractionCreate, async (interaction) =>
      this.handleInteraction(interaction)
    );
  }

  getSlashCommand(): SharedSlashCommand {
    return new SlashCommandBuilder()
      .setName("deprecated")
      .setDescription("メンバーごとの重複投稿回数を表示");
  }

  async handleInteraction(interaction: Interaction<CacheType>): Promise<void> {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "deprecated") return;

    try {
      await this.initPromise;
    } catch (error) {
      console.error("Failed to initialize database for /deprecated:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("データベース初期化でエラーが発生しました。");
      } else {
        await interaction.reply("データベース初期化でエラーが発生しました。");
      }
      return;
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    try {
      const duplicates = await this.database.getAllUserDuplicateCounts();

      if (duplicates.length === 0) {
        await interaction.editReply("まだ重複投稿は記録されていません。");
        return;
      }

      const lines = duplicates.map((entry, index) =>
        `${index + 1}. <@${entry.user_id}> — ${entry.duplicate_count}回`
      );
      const message = [
        "重複投稿の累計回数ランキング:",
        ...lines,
      ].join("\n");

      await interaction.editReply(message);
    } catch (error) {
      console.error("Failed to fetch duplicate stats:", error);
      await interaction.editReply("重複投稿の集計取得に失敗しました。");
    }
  }
}
