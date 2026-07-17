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

  async generate(): Promise<LlmGenerateResponse> {
    throw new Error("OpenAI adapter is not configured yet.");
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

export function createLlmAdapter(provider: LlmAdapterType): LlmAdapter {
  const adapters: Record<LlmAdapterType, LlmAdapter> = {
    openai: new OpenAIAdapter(),
    claude: new ClaudeAdapter(),
    ollama: new OllamaAdapter()
  };

  return adapters[provider];
}
