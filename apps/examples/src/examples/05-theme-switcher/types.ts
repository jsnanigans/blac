export type ThemeMode = 'light' | 'dark' | 'system';
export type PrimaryColor = 'blue' | 'green' | 'purple' | 'red';
export type FontSize = 'small' | 'medium' | 'large';

export interface ThemeState {
  mode: ThemeMode;
  primaryColor: PrimaryColor;
  fontSize: FontSize;
  reducedMotion: boolean;
}

export const COLOR_VALUES: Record<PrimaryColor, string> = {
  blue: '#2563eb',
  green: '#16a34a',
  purple: '#9333ea',
  red: '#dc2626',
};

export const FONT_SIZE_VALUES: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};
