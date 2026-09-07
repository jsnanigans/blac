import { Cubit, blac } from '@blac/core';

export interface ThemeState {
  mode: 'light' | 'dark';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
}

export const ThemeCubit = blac({ keepAlive: true })(
  class ThemeCubit extends Cubit<ThemeState> {
    constructor() {
      super({
        mode: 'light',
        accentColor: '#6366f1',
        fontSize: 'medium',
      });
    }

    toggleMode = () => {
      this.patch({ mode: this.state.mode === 'light' ? 'dark' : 'light' });
    };

    setAccentColor = (color: string) => {
      this.patch({ accentColor: color });
    };

    setFontSize = (size: ThemeState['fontSize']) => {
      this.patch({ fontSize: size });
    };
  },
);
