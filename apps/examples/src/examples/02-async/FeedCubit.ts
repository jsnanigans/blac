import { Cubit } from '@blac/core';

export interface Article {
  id: number;
  title: string;
  preview: string;
  readTime: number;
}

export interface Author {
  id: number;
  name: string;
  role: string;
}

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface FeedState {
  status: LoadStatus;
  authorId: number;
  author: Author | null;
  articles: Article[];
  error: string | null;
}

export const AUTHORS: Author[] = [
  { id: 1, name: 'Alice Chen', role: 'Frontend Engineer' },
  { id: 2, name: 'Bob Rodriguez', role: 'Fullstack Developer' },
  { id: 3, name: 'Carol Zhang', role: 'TypeScript Advocate' },
  { id: 4, name: 'Dana Kowalski', role: 'Open Source Maintainer' },
];

const ARTICLES: Record<number, Article[]> = {
  1: [
    {
      id: 1,
      title: 'Why I switched from Redux to BlaC',
      preview:
        'After years of boilerplate, BlaC finally gets out of the way and lets me focus on the problem.',
      readTime: 6,
    },
    {
      id: 2,
      title: 'Proxy-based auto-tracking explained',
      preview:
        'Under the hood, BlaC uses JavaScript Proxies to know exactly which state properties your component reads.',
      readTime: 8,
    },
    {
      id: 3,
      title: 'Patterns for async state',
      preview:
        'Loading, error, and success — here is how to model async operations cleanly in a Cubit.',
      readTime: 5,
    },
  ],
  2: [
    {
      id: 4,
      title: 'Building a chat app with BlaC',
      preview:
        'Real-time features like typing indicators and message receipts fit naturally into named Cubit instances.',
      readTime: 12,
    },
    {
      id: 5,
      title: 'Cross-bloc dependencies without pain',
      preview:
        'The depend() API lets you share state between Cubits without coupling your components.',
      readTime: 7,
    },
  ],
  3: [
    {
      id: 6,
      title: 'TypeScript-first state management',
      preview:
        'BlaC was designed for TypeScript. Every API is fully typed with no escape hatches needed.',
      readTime: 4,
    },
    {
      id: 7,
      title: 'Getter tracking: computed values done right',
      preview:
        'BlaC tracks getter access just like plain state, so components only re-render when computed values actually change.',
      readTime: 6,
    },
    {
      id: 8,
      title: 'Testing Cubits in isolation',
      preview:
        'Cubits are just classes. Unit-test them directly without React wrappers or testing library overhead.',
      readTime: 5,
    },
    {
      id: 9,
      title: 'Error boundaries and error state patterns',
      preview:
        'How to handle errors gracefully — from async failures to validation, always model it in state.',
      readTime: 4,
    },
  ],
  4: [
    {
      id: 10,
      title: 'The plugin system deep-dive',
      preview:
        'Plugins give you first-class observability. Build logging, persistence, and analytics with the same simple API.',
      readTime: 9,
    },
    {
      id: 11,
      title: 'Migrating a Redux codebase to BlaC',
      preview:
        'I migrated 50 kloc in three days. Here is what made it smooth and what to watch out for.',
      readTime: 11,
    },
  ],
};

async function fakeFetch(
  authorId: number,
): Promise<{ author: Author; articles: Article[] }> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
  if (Math.random() < 0.3) {
    throw new Error('Network timeout — please try again.');
  }
  const author = AUTHORS.find((a) => a.id === authorId) ?? AUTHORS[0];
  return { author, articles: ARTICLES[authorId] ?? [] };
}

export class FeedCubit extends Cubit<FeedState> {
  private _reqId = 0;

  constructor() {
    super({
      status: 'idle',
      authorId: AUTHORS[0].id,
      author: null,
      articles: [],
      error: null,
    });
  }

  loadAuthor = async (authorId: number) => {
    const myId = ++this._reqId;
    this.emit({
      status: 'loading',
      authorId,
      author: null,
      articles: [],
      error: null,
    });
    try {
      const { author, articles } = await fakeFetch(authorId);
      if (this._reqId !== myId) return;
      this.emit({ status: 'success', authorId, author, articles, error: null });
    } catch (err) {
      if (this._reqId !== myId) return;
      this.emit({
        status: 'error',
        authorId,
        author: null,
        articles: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  retry = () => {
    void this.loadAuthor(this.state.authorId);
  };
}
