import { useBloc } from '@blac/react';
import { ThemeBloc } from './ThemeBloc';
import { Button, Card, RenderCounter } from '../../shared/components';
import type { ThemeMode, PrimaryColor, FontSize } from './types';
import { COLOR_VALUES } from './types';

export function ThemeControls() {
  const [state, theme] = useBloc(ThemeBloc);

  console.log('[ThemeControls] Rendering');

  const modes: ThemeMode[] = ['light', 'dark', 'system'];
  const colors: PrimaryColor[] = ['blue', 'green', 'purple', 'red'];
  const fontSizes: { label: string; value: FontSize }[] = [
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' },
  ];

  return (
    <Card>
      <div className="stack-md">
        <div className="flex-between">
          <h2>Theme Controls</h2>
          <RenderCounter name="Controls" />
        </div>

        {/* Mode Selection */}
        <div className="stack-sm">
          <h3 className="text-small">Theme Mode</h3>
          <div className="row-sm flex-wrap">
            {modes.map((mode) => (
              <Button
                key={mode}
                variant={state.mode === mode ? 'primary' : 'ghost'}
                onClick={() => theme.setMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted">
            Current effective mode: {theme.effectiveMode}
          </p>
        </div>

        {/* Primary Color */}
        <div className="stack-sm">
          <h3 className="text-small">Primary Color</h3>
          <div className="row-sm flex-wrap">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => theme.setPrimaryColor(color)}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  backgroundColor: COLOR_VALUES[color],
                  border:
                    state.primaryColor === color
                      ? '3px solid var(--color-text)'
                      : '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
                aria-label={`Set primary color to ${color}`}
              />
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="stack-sm">
          <h3 className="text-small">Font Size</h3>
          <div className="row-sm flex-wrap">
            {fontSizes.map(({ label, value }) => (
              <Button
                key={value}
                variant={state.fontSize === value ? 'primary' : 'ghost'}
                onClick={() => theme.setFontSize(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Reduced Motion */}
        <div className="stack-sm">
          <h3 className="text-small">Accessibility</h3>
          <label className="row-sm">
            <input
              type="checkbox"
              checked={state.reducedMotion}
              onChange={theme.toggleReducedMotion}
            />
            <span>Reduce motion</span>
          </label>
        </div>

        {/* Reset Button */}
        <Button variant="ghost" onClick={theme.resetToDefaults}>
          Reset to Defaults
        </Button>

        <p className="text-xs text-muted">
          💡 Changes are automatically saved to localStorage
        </p>
      </div>
    </Card>
  );
}
