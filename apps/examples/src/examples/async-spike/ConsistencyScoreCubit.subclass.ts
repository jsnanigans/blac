import { AsyncCubit, idle, type AsyncState } from './async';
import { scoreApi, type Score, type ScoreInput } from './service';

interface State {
  score: AsyncState<Score>;
  save: AsyncState<Score>;
}

export class ConsistencyScoreCubit extends AsyncCubit<
  State,
  { userId: string }
> {
  constructor() {
    super({ score: idle(), save: idle() });
  }

  score = this.resource(
    'score',
    (signal) => scoreApi.get(this.args!.userId, signal),
    { auto: true },
  );

  save = this.mutation('save', (input: ScoreInput) => scoreApi.update(input));
}
