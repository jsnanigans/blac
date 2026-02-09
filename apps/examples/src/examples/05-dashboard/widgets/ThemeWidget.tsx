import { useBloc } from '@blac/react';
import { ThemeCubit } from '../ThemeCubit';
import { Button } from '../../../shared/components';

const accentColors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
const fontSizes = ['small', 'medium', 'large'] as const;

export function ThemeWidget() {
  const [state, bloc] = useBloc(ThemeCubit);

  return (
    <div className="widget">
      <h3>Theme Settings</h3>
      <p className="text-xs text-muted">
        <code>keepAlive: true</code> — navigate away and back, settings persist
      </p>
      <div className="theme-controls">
        <label>
          Mode
          <Button variant={state.mode === 'dark' ? 'primary' : 'ghost'} onClick={bloc.toggleMode} style={{ padding: '4px 12px', fontSize: '0.8125rem' }}>
            {state.mode === 'light' ? 'Light' : 'Dark'}
          </Button>
        </label>

        <label>
          Accent Color
          <div className="row-xs">
            {accentColors.map((color) => (
              <span
                key={color}
                className="color-swatch"
                style={{
                  backgroundColor: color,
                  borderColor: state.accentColor === color ? color : undefined,
                  boxShadow: state.accentColor === color ? `0 0 0 2px ${color}40` : undefined,
                }}
                onClick={() => bloc.setAccentColor(color)}
              />
            ))}
          </div>
        </label>

        <label>
          Font Size
          <div className="row-xs">
            {fontSizes.map((size) => (
              <Button
                key={size}
                variant={state.fontSize === size ? 'primary' : 'ghost'}
                onClick={() => bloc.setFontSize(size)}
                style={{ padding: '4px 10px', fontSize: '0.75rem', textTransform: 'capitalize' }}
              >
                {size}
              </Button>
            ))}
          </div>
        </label>
      </div>
    </div>
  );
}
