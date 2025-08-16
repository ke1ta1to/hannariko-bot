import {
  CacheType,
  Events,
  Interaction,
  SharedSlashCommand,
  SlashCommandBuilder,
} from "discord.js";
import { HannarikoBot } from "../main";
import { CommandBase } from "./command-base";

export class CuneiformCommand extends CommandBase {
  private readonly cuneiforms: Record<string, string> = {
    "0": "𐏐",
    "1": "𐏑",
    "2": "𐏒",
    "3": "𐏑𐏒",
    "4": "𐏒𐏒",
    "5": "𐏒𐏒𐏑",
    "6": "𐏒𐏒𐏒",
    "7": "𐏒𐏒𐏒𐏑",
    "8": "𐏒𐏒𐏒𐏒",
    "9": "𐏒𐏒𐏒𐏒𐏑",
    a: "𐎠",
    b: "𐎲",
    c: "𐎨",
    d: "𐎭",
    e: "𐎡",
    f: "𐎳",
  };

  private readonly reverseCuneiforms: Record<string, string>;

  constructor(protected readonly bot: HannarikoBot) {
    super(bot);
    this.reverseCuneiforms = this.createReverseMapping();
    this.register();
  }

  private createReverseMapping(): Record<string, string> {
    const reverse: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.cuneiforms)) {
      reverse[value] = key;
    }
    return reverse;
  }

  async register() {
    const { client } = this.bot;

    client.on(Events.InteractionCreate, async (interaction) =>
      this.handleInteraction(interaction)
    );
  }

  getSlashCommand(): SharedSlashCommand {
    return new SlashCommandBuilder()
      .setName("cuneiform")
      .setDescription("16進数と楔形文字の相互変換")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("hex2ct")
          .setDescription("16進数を楔形文字に変換")
          .addStringOption((option) =>
            option
              .setName("hex")
              .setDescription("変換する16進数文字列")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("ct2hex")
          .setDescription("楔形文字を16進数に変換")
          .addStringOption((option) =>
            option
              .setName("cuneiform")
              .setDescription("変換する楔形文字文字列（スペース区切り）")
              .setRequired(true)
          )
      );
  }

  async handleInteraction(interaction: Interaction<CacheType>) {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    if (commandName !== "cuneiform") return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "hex2ct") {
      const hexString = interaction.options.getString("hex", true);
      const result = this.hex2ct(hexString);

      if (result) {
        await interaction.reply({
          content: `**16進数 → 楔形文字**\n入力: \`${hexString}\`\n結果: ${result}`,
          ephemeral: false,
        });
      } else {
        await interaction.reply({
          content:
            "変換できませんでした。有効な16進数文字（0-9, a-f）を入力してください。",
          ephemeral: true,
        });
      }
    } else if (subcommand === "ct2hex") {
      const cuneiformString = interaction.options.getString("cuneiform", true);
      const result = this.ct2hex(cuneiformString);

      if (result) {
        await interaction.reply({
          content: `**楔形文字 → 16進数**\n入力: ${cuneiformString}\n結果: \`${result}\``,
          ephemeral: false,
        });
      } else {
        await interaction.reply({
          content: "変換できませんでした。有効な楔形文字を入力してください。",
          ephemeral: true,
        });
      }
    }
  }

  private hex2ct(hexString: string): string | null {
    const lowerHex = hexString.toLowerCase();
    const result: string[] = [];

    for (const char of lowerHex) {
      if (char in this.cuneiforms) {
        result.push(this.cuneiforms[char]);
      } else if (!/\s/.test(char)) {
        return null;
      }
    }

    return result.join(" ");
  }

  private ct2hex(cuneiformString: string): string | null {
    const result: string[] = [];
    const chars = cuneiformString.trim().split(/\s+/);

    for (const char of chars) {
      if (char in this.reverseCuneiforms) {
        result.push(this.reverseCuneiforms[char]);
      } else if (char !== "") {
        return null;
      }
    }

    return result.join("");
  }
}
