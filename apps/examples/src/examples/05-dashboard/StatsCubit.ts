import { Cubit } from '@blac/core';
import { ThemeCubit } from './ThemeCubit';

export interface StatsState {
  visitors: number;
  revenue: number;
  orders: number;
}

export class StatsCubit extends Cubit<StatsState> {
  private getTheme = this.depend(ThemeCubit);

  constructor() {
    super({
      visitors: 1_234,
      revenue: 48_250,
      orders: 312,
    });
  }

  get formattedRevenue(): string {
    const theme = this.getTheme();
    const locale = theme.state.mode === 'dark' ? 'en-GB' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(this.state.revenue);
  }

  simulateUpdate = () => {
    this.patch({
      visitors: this.state.visitors + Math.floor(Math.random() * 50),
      revenue: this.state.revenue + Math.floor(Math.random() * 500),
      orders: this.state.orders + Math.floor(Math.random() * 10),
    });
  };
}
