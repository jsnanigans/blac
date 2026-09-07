import { useEffect } from 'react';
import { getPluginManager } from '@blac/core/plugins';
import { useBloc } from '@blac/react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { Card } from '../../shared/components';
import { analyticsPlugin, clearAnalyticsEntries } from './AnalyticsPlugin';
import { ThemeWidget } from './widgets/ThemeWidget';
import { StatsWidget } from './widgets/StatsWidget';
import { ActivityWidget } from './widgets/ActivityWidget';
import { AnalyticsWidget } from './widgets/AnalyticsWidget';
import { ThemeCubit } from './ThemeCubit';

const FONT_SCALE = { small: '0.875rem', medium: '1rem', large: '1.125rem' };

/**
 * Applies the theme as scoped CSS custom properties. Reads only `accentColor`
 * and `fontSize`, so toggling `mode` never re-renders this wrapper — the
 * StatsWidget handles that path on its own.
 */
function ThemedDashboard() {
  const [theme] = useBloc(ThemeCubit);

  return (
    <div
      className="dashboard-grid"
      style={
        {
          '--color-primary': theme.accentColor,
          '--dashboard-font-size': FONT_SCALE[theme.fontSize],
        } as React.CSSProperties
      }
    >
      <ThemeWidget />
      <StatsWidget />
      <ActivityWidget />
      <AnalyticsWidget />
    </div>
  );
}

export function DashboardDemo() {
  useEffect(() => {
    const pm = getPluginManager();
    if (!pm.hasPlugin(analyticsPlugin.name)) {
      clearAnalyticsEntries();
      pm.install(analyticsPlugin);
    }
    return () => {
      if (pm.hasPlugin(analyticsPlugin.name)) {
        pm.uninstall(analyticsPlugin.name);
      }
    };
  }, []);

  return (
    <ExampleLayout
      title="Dashboard"
      description="A widget-based dashboard demonstrating custom plugins, cross-bloc dependencies via depend(), and keepAlive persistence."
      features={[
        'Custom BlacPlugin for real-time analytics logging',
        'depend() — StatsCubit depends on ThemeCubit for formatting',
        'blac({ keepAlive: true }) — ThemeCubit persists across navigations',
        'Plugin lifecycle: onInstall, onInstanceCreated, onStateChanged, onInstanceDisposed',
      ]}
    >
      <section>
        <ThemedDashboard />
      </section>

      <section className="stack-md">
        <Card>
          <h4>Key Concepts</h4>
          <div className="stack-xs text-small text-muted">
            <p>
              <strong>Custom Plugin:</strong> The <code>AnalyticsPlugin</code>{' '}
              implements the <code>BlacPlugin</code> interface. It hooks into{' '}
              <code>onInstanceCreated</code>, <code>onStateChanged</code>, and{' '}
              <code>onInstanceDisposed</code> to build a real-time event log.
              The plugin is installed when this page mounts and uninstalled when
              you navigate away.
            </p>
            <p>
              <strong>depend():</strong> <code>StatsCubit</code> calls{' '}
              <code>this.depend(ThemeCubit)</code> to access theme state. The{' '}
              <code>formattedRevenue</code> getter reaches it with{' '}
              <code>.track()</code>, so toggling Mode re-renders StatsWidget
              alone and reformats the currency (<code>$</code> →{' '}
              <code>US$</code>). Accent and font size are read by the wrapper
              instead, so those controls leave StatsWidget untouched — watch the
              render badge.
            </p>
            <p>
              <strong>keepAlive:</strong> <code>ThemeCubit</code> uses{' '}
              <code>blac({'{ keepAlive: true }'})</code> so its instance is
              never disposed. Navigate to another page and back — theme settings
              are preserved.
            </p>
          </div>
        </Card>
      </section>
    </ExampleLayout>
  );
}
