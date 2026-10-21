import { Cubit } from '@blac/core';
import { idle, resource, type AsyncState } from './async';
import {
  fakeFetch,
  AUTHORS,
  type Article,
  type Author,
} from '../02-async/FeedCubit';

interface State {
  authorId: number;
  feed: AsyncState<{ author: Author; articles: Article[] }>;
}

export class FeedCubit extends Cubit<State> {
  constructor() {
    super({ authorId: AUTHORS[0].id, feed: idle() });
  }

  private feed = resource(
    this,
    'feed',
    (signal) => fakeFetch(this.state.authorId, signal),
    { auto: true },
  );

  loadAuthor = (authorId: number) => {
    this.patch({ authorId });
    return this.feed.reload();
  };

  retry = () => this.feed.reload();
}
