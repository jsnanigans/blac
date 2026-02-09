import { Cubit } from '@blac/core';

export interface ActivityEntry {
  id: string;
  message: string;
  time: string;
}

export interface ActivityState {
  entries: ActivityEntry[];
}

export class ActivityCubit extends Cubit<ActivityState> {
  constructor() {
    super({
      entries: [
        { id: '1', message: 'Dashboard initialized', time: new Date().toLocaleTimeString() },
      ],
    });
  }

  addEntry = (message: string) => {
    this.patch({
      entries: [
        ...this.state.entries,
        {
          id: crypto.randomUUID(),
          message,
          time: new Date().toLocaleTimeString(),
        },
      ].slice(-20), // Keep last 20
    });
  };
}
