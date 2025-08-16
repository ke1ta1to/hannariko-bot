import {
  CacheType,
  Events,
  Interaction,
  SharedSlashCommand,
  SlashCommandBuilder,
} from "discord.js";
import { HannarikoBot } from "../main";
import { CommandBase } from "./command-base";

export class OCRCommand extends CommandBase {
  constructor(protected readonly bot: HannarikoBot) {
    super(bot);
    this.register();
  }

  async register() {
    const { client } = this.bot;

    client.on(Events.InteractionCreate, async (interaction) =>
      this.handleInteraction(interaction)
    );
  }

  getSlashCommand(): SharedSlashCommand {
    return new SlashCommandBuilder()
      .setName("ocr")
      .setDescription("画像から文字を認識してマークダウン形式で返す")
      .addAttachmentOption((option) =>
        option
          .setName("image")
          .setDescription("文字認識する画像")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("prompt")
          .setDescription("追加の指示（例：表形式で整理して）")
          .setRequired(false)
      );
  }

  async handleInteraction(interaction: Interaction<CacheType>) {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    if (commandName !== "ocr") return;

    const attachment = interaction.options.getAttachment("image", true);
    const additionalPrompt = interaction.options.getString("prompt");

    // 画像ファイルかどうかチェック
    if (!attachment.contentType?.startsWith("image/")) {
      await interaction.reply({
        content: "画像ファイルを添付してください。",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      // 画像をダウンロード
      const response = await fetch(attachment.url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Google Gemini AIで画像を解析
      const { ai } = this.bot;

      // プロンプトを構築
      let prompt = `以下の画像に含まれる文字を認識して、マークダウン形式で出力してください。

要件：
- 画像内のすべてのテキストを正確に読み取る
- 構造（見出し、段落、リスト、表など）を保持する
- 適切なマークダウン記法を使用する
- 画像内のレイアウトをできるだけ再現する`;

      if (additionalPrompt) {
        prompt += `\n\n追加の指示: ${additionalPrompt}`;
      }

      const model = ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: attachment.contentType,
                  data: buffer.toString("base64"),
                },
              },
            ],
          },
        ],
      });

      const result = await model;
      const text = result.text?.trim();

      if (!text) {
        await interaction.editReply("画像から文字を認識できませんでした。");
        return;
      }

      // 結果を送信（2000文字を超える場合は分割）
      const messages = this.splitMessage(text);

      if (messages.length === 1) {
        await interaction.editReply({
          content: `## 📝 OCR結果\n\n${messages[0]}`,
        });
      } else {
        await interaction.editReply({
          content: `## 📝 OCR結果 (1/${messages.length})\n\n${messages[0]}`,
        });

        for (let i = 1; i < messages.length; i++) {
          await interaction.followUp({
            content: `## 📝 OCR結果 (${i + 1}/${messages.length})\n\n${
              messages[i]
            }`,
          });
        }
      }
    } catch (error) {
      console.error("OCR処理中にエラーが発生しました:", error);
      await interaction.editReply(
        "画像の文字認識中にエラーが発生しました。別の画像でお試しください。"
      );
    }
  }

  private splitMessage(text: string, maxLength: number = 1900): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const messages: string[] = [];
    const lines = text.split("\n");
    let currentMessage = "";

    for (const line of lines) {
      if (currentMessage.length + line.length + 1 > maxLength) {
        if (currentMessage) {
          messages.push(currentMessage);
          currentMessage = line;
        } else {
          // 単一行が長すぎる場合は強制的に分割
          let remainingLine = line;
          while (remainingLine.length > maxLength) {
            messages.push(remainingLine.substring(0, maxLength));
            remainingLine = remainingLine.substring(maxLength);
          }
          if (remainingLine) {
            currentMessage = remainingLine;
          }
        }
      } else {
        currentMessage += (currentMessage ? "\n" : "") + line;
      }
    }

    if (currentMessage) {
      messages.push(currentMessage);
    }

    return messages;
  }
}
