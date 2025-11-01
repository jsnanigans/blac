import { Cubit } from '@blac/core';
import type { ThemeState, ThemeMode, PrimaryColor, FontSize } from './types';
import { COLOR_VALUES, FONT_SIZE_VALUES } from './types';

const STORAGE_KEY = 'blac-theme-preferences';

export class ThemeBloc extends Cubit<ThemeState> {
  constructor() {
    // Load from localStorage or use defaults
    const stored = localStorage.getItem(STORAGE_KEY);
    const initialState: ThemeState = stored
      ? JSON.parse(stored)
      : {
          mode: 'system',
          primaryColor: 'blue',
          fontSize: 'medium',
          reducedMotion: false,
        };

    super(initialState);

    // Subscribe to state changes to save to localStorage
    this.subscribe((state) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      this.applyTheme(state);
    });

    // Apply initial theme
    this.applyTheme(initialState);

    // Lifecycle
    this.onDispose = () => {
      console.log('[ThemeBloc] Disposed - theme preferences saved');
    };
  }

  // Actions
  setMode = (mode: ThemeMode) => {
    this.patch({ mode });
  };

  setPrimaryColor = (primaryColor: PrimaryColor) => {
    this.patch({ primaryColor });
  };

  setFontSize = (fontSize: FontSize) => {
    this.patch({ fontSize });
  };

  toggleReducedMotion = () => {
    this.patch({ reducedMotion: !this.state.reducedMotion });
  };

  resetToDefaults = () => {
    this.emit({
      mode: 'system',
      primaryColor: 'blue',
      fontSize: 'medium',
      reducedMotion: false,
    });
  };

  // Getters
  get effectiveMode(): 'light' | 'dark' {
    if (this.state.mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return this.state.mode;
  }

  // Apply theme to document
  private applyTheme = (state: ThemeState) => {
    const root = document.documentElement;

    // Apply mode (light/dark)
    const effectiveMode = this.effectiveMode;
    root.setAttribute('data-theme', effectiveMode);

    // Apply primary color
    root.style.setProperty('--color-primary', COLOR_VALUES[state.primaryColor]);

    // Apply font size
    root.style.setProperty('font-size', FONT_SIZE_VALUES[state.fontSize]);

    // Apply reduced motion
    if (state.reducedMotion) {
      root.style.setProperty('--transition-speed', '0s');
    } else {
      root.style.setProperty('--transition-speed', '0.2s');
    }

    console.log(
      `[ThemeBloc] Applied theme: mode=${effectiveMode}, color=${state.primaryColor}, fontSize=${state.fontSize}`,
    );
  };
}
