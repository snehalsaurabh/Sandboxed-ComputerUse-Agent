export {};

declare global {
  interface Window {
    agentDesktop: {
      run(goal: string, provider: "mock" | "ollama" | "openai-compatible"): Promise<unknown>;
      onEvent(listener: (event: unknown) => void): void;
    };
  }
}

