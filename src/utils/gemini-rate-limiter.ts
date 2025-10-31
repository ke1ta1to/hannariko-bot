import { GoogleGenAI } from "@google/genai";

type GenerateContentArgs = Parameters<
  GoogleGenAI["models"]["generateContent"]
>;
type GenerateContentResult = ReturnType<
  GoogleGenAI["models"]["generateContent"]
>;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class GeminiRateLimiter {
  private nextTask: Promise<void> = Promise.resolve();
  private lastCallTimestamp = 0;

  constructor(
    private readonly ai: GoogleGenAI,
    private readonly minIntervalMs = 1100,
    private readonly maxRetries = 3
  ) {}

  async generateContent(
    ...args: GenerateContentArgs
  ): Promise<Awaited<GenerateContentResult>> {
    const task = async () => {
      return this.executeWithRetry(() =>
        this.ai.models.generateContent(...args)
      );
    };

    const resultPromise = this.nextTask.then(task);
    this.nextTask = resultPromise.then(
      () => undefined,
      () => undefined
    );

    return resultPromise;
  }

  private async waitForTurn() {
    const now = Date.now();
    const waitTime = Math.max(
      0,
      this.minIntervalMs - (now - this.lastCallTimestamp)
    );
    if (waitTime > 0) {
      await sleep(waitTime);
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      await this.waitForTurn();
      try {
        const result = await fn();
        this.lastCallTimestamp = Date.now();
        return result;
      } catch (error) {
        this.lastCallTimestamp = Date.now();

        if (attempt >= this.maxRetries || !this.isRateLimitError(error)) {
          throw error;
        }

        const backoff = this.minIntervalMs * Math.pow(2, attempt + 1);
        await sleep(backoff);
        attempt += 1;
      }
    }
  }

  private isRateLimitError(error: unknown): boolean {
    if (!error) return false;

    const maybeStatus = (error as { status?: number }).status;
    const maybeCode = (error as { code?: number | string }).code;
    const message =
      typeof error === "string"
        ? error
        : (error as Error)?.message ?? "";

    if (maybeStatus === 429) return true;
    if (maybeCode === 429 || maybeCode === "RESOURCE_EXHAUSTED") return true;
    if (typeof message === "string") {
      const normalized = message.toLowerCase();
      if (normalized.includes("rate limit")) return true;
      if (normalized.includes("429")) return true;
      if (normalized.includes("resource has been exhausted")) return true;
    }

    return false;
  }
}
