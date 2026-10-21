export interface Score {
  value: number;
}

export interface ScoreInput {
  userId: string;
  value: number;
}

export const scoreApi = {
  async get(userId: string, signal: AbortSignal): Promise<Score> {
    signal.throwIfAborted();
    return { value: userId.length };
  },
  async update(input: ScoreInput): Promise<Score> {
    return { value: input.value };
  },
};
