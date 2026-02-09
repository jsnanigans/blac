import { useEffect } from 'react';
import { getPluginManager } from '@blac/core';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { Card } from '../../shared/components';
import { analyticsPlugin, clearAnalyticsEntries } from './AnalyticsPlugin';
import { ThemeWidget } from './widgets/ThemeWidget';
import { StatsWidget } from './widgets/StatsWidget';
import { ActivityWidget } from './widgets/ActivityWidget';
import { AnalyticsWidget } from './widgets/AnalyticsWidget';

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
        <div className="dashboard-grid">
          <ThemeWidget />
          <StatsWidget />
          <ActivityWidget />
          <AnalyticsWidget />
        </div>
      </section>

      <section className="stack-md">
        <Card>
          <h4>Key Concepts</h4>
          <div className="stack-xs text-small text-muted">
            <p>
              <strong>Custom Plugin:</strong> The <code>AnalyticsPlugin</code> implements the{' '}
              <code>BlacPlugin</code> interface. It hooks into <code>onInstanceCreated</code>,{' '}
              <code>onStateChanged</code>, and <code>onInstanceDisposed</code> to build a
              real-time event log. The plugin is installed when this page mounts and uninstalled
              when you navigate away.
            </p>
            <p>
              <strong>depend():</strong> <code>StatsCubit</code> calls{' '}
              <code>this.depend(ThemeCubit)</code> to access theme state. The{' '}
              <code>formattedRevenue</code> getter formats currency using the theme's mode.
              Changing the theme triggers a re-render in StatsWidget.
            </p>
            <p>
              <strong>keepAlive:</strong> <code>ThemeCubit</code> uses{' '}
              <code>blac({'{ keepAlive: true }'})</code> so its instance is never disposed. Navigate
              to another page and back — theme settings are preserved.
            </p>
          </div>
        </Card>
      </section>
    </ExampleLayout>
  );
}
