import type { LlmRuntimeConfig } from "./config";

export type LlmAdapterType = "openai" | "claude" | "ollama";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmGenerateRequest = {
  provider: LlmAdapterType;
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseFormat?: "text" | "json";
};

export type LlmGenerateResponse = {
  content: string;
  raw?: unknown;
};

export interface LlmAdapter {
  provider: LlmAdapterType;
  generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse>;
}

class OpenAIAdapter implements LlmAdapter {
  provider: LlmAdapterType = "openai";

  constructor(private readonly config: LlmRuntimeConfig) {}

  async generate(request: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    if (!this.config.apiKey) {
      throw new Error("LLM_API_KEY is not configured.");
    }

    const controller = new AbortController();
    const timeoutMs = request.timeoutMs ?? this.config.timeoutMs;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: request.model || this.config.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens,
          response_format: request.responseFormat === "json" ? { type: "json_object" } : undefined
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`OpenAI-compatible request failed: ${response.status} ${details}`);
      }

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("OpenAI-compatible response did not include message content.");
      }

      return {
        content,
        raw: payload
      };
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`LLM request timed out after ${timeoutMs}ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

class ClaudeAdapter implements LlmAdapter {
  provider: LlmAdapterType = "claude";

  async generate(): Promise<LlmGenerateResponse> {
    throw new Error("Claude adapter is not configured yet.");
  }
}

class OllamaAdapter implements LlmAdapter {
  provider: LlmAdapterType = "ollama";

  async generate(): Promise<LlmGenerateResponse> {
    throw new Error("Ollama adapter is not configured yet.");
  }
}

export function createLlmAdapter(provider: LlmAdapterType, config: LlmRuntimeConfig): LlmAdapter {
  const adapters: Record<LlmAdapterType, LlmAdapter> = {
    openai: new OpenAIAdapter(config),
    claude: new ClaudeAdapter(),
    ollama: new OllamaAdapter()
  };

  return adapters[provider];
}
