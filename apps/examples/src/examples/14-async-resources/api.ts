export interface Profile {
  id: string;
  name: string;
}

export const USERS = ['alice', 'bob', 'carol'];

const profiles: Record<string, Profile> = Object.fromEntries(
  USERS.map((id) => [id, { id, name: id[0].toUpperCase() + id.slice(1) }]),
);
const activity: Record<string, string[]> = Object.fromEntries(
  USERS.map((id) => [id, ['Account created']]),
);

export const flaky = { failNext: false };

async function delay(signal?: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 500);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
  if (flaky.failNext) {
    flaky.failNext = false;
    throw new Error('Network timeout — try again.');
  }
}

export const api = {
  async getProfile(id: string, signal: AbortSignal): Promise<Profile> {
    await delay(signal);
    return { ...profiles[id] };
  },
  async getActivity(id: string, signal: AbortSignal): Promise<string[]> {
    await delay(signal);
    return [...activity[id]];
  },
  async rename(id: string, name: string): Promise<Profile> {
    await delay();
    profiles[id] = { id, name };
    activity[id].push(`Renamed to ${name}`);
    return { ...profiles[id] };
  },
};
