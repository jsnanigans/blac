import { Cubit } from '@blac/core';
import { idle, mutation, resource, type AsyncState } from './async';
import { scoreApi, type Score, type ScoreInput } from './service';

interface State {
  score: AsyncState<Score>;
  save: AsyncState<Score>;
}

export class ConsistencyScoreCubit extends Cubit<State, { userId: string }> {
  constructor() {
    super({ score: idle(), save: idle() });
  }

  score = resource(
    this,
    'score',
    (signal) => scoreApi.get(this.args!.userId, signal),
    { auto: true },
  );

  save = mutation(this, 'save', (input: ScoreInput) => scoreApi.update(input));
}
