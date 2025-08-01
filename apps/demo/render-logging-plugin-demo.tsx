import React, { useState } from 'react';
import { Blac, Cubit } from '@blac/core';
import {
  RenderLoggingPlugin,
  RenderLoggingConfig,
} from '@blac/plugin-render-logging';
import useBloc from '@blac/react';

// Example Cubit for testing logging
class ExampleCubit extends Cubit<{ value: number; text: string }> {
  constructor() {
    super({ value: 0, text: 'Hello' });
  }

  updateValue = () => {
    this.emit({ ...this.state, value: this.state.value + 1 });
  };

  updateText = () => {
    this.emit({
      ...this.state,
      text: `Updated at ${new Date().toLocaleTimeString()}`,
    });
  };

  updateBoth = () => {
    this.emit({
      value: this.state.value + 1,
      text: `Both updated: ${this.state.value + 1}`,
    });
  };
}

// Component to demonstrate real-time plugin configuration
function RenderLoggingPluginDemo() {
  const [logLevel, setLogLevel] = useState<'normal' | 'detailed'>('normal');
  const [includeStackTrace, setIncludeStackTrace] = useState(false);
  const [groupRerenders, setGroupRerenders] = useState(true);
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [plugin, setPlugin] = useState<RenderLoggingPlugin | null>(null);

  const [example, exampleCubit] = useBloc(ExampleCubit);

  // Initialize plugin on mount
  React.useEffect(() => {
    const plugins = Blac.getInstance().plugins;
    let existingPlugin = plugins.get('RenderLoggingPlugin') as
      | RenderLoggingPlugin
      | undefined;

    if (!existingPlugin) {
      existingPlugin = new RenderLoggingPlugin({
        enabled: true,
        level: 'normal',
        includeStackTrace: false,
        groupRerenders: true,
      });
      plugins.add(existingPlugin);
    }

    setPlugin(existingPlugin);
  }, []);

  const updatePluginConfig = React.useCallback(() => {
    if (!plugin) return;

    const config: RenderLoggingConfig = {
      enabled: true,
      level: logLevel,
      includeStackTrace,
      groupRerenders,
    };

    if (filterEnabled) {
      config.filter = ({ componentName }) =>
        componentName !== 'IgnoredComponent';
    }

    plugin.updateConfig(config);
  }, [plugin, logLevel, includeStackTrace, groupRerenders, filterEnabled]);

  // Update config when settings change
  React.useEffect(() => {
    updatePluginConfig();
  }, [updatePluginConfig]);

  const handleLevelChange = (level: 'normal' | 'detailed') => {
    setLogLevel(level);
  };

  const handleStackTraceToggle = () => {
    setIncludeStackTrace(!includeStackTrace);
  };

  const handleGroupToggle = () => {
    setGroupRerenders(!groupRerenders);
  };

  const handleFilterToggle = () => {
    setFilterEnabled(!filterEnabled);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>Render Logging Plugin Configuration</h2>

      <div
        style={{
          marginBottom: 30,
          padding: 15,
          backgroundColor: '#f0f0f0',
          borderRadius: 5,
        }}
      >
        <h3>Plugin Settings</h3>

        <div style={{ marginBottom: 10 }}>
          <label>
            <strong>Log Level:</strong>{' '}
            <select
              value={logLevel}
              onChange={(e) =>
                handleLevelChange(e.target.value as 'normal' | 'detailed')
              }
              style={{ marginLeft: 10 }}
            >
              <option value="normal">Normal</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>
            <input
              type="checkbox"
              checked={includeStackTrace}
              onChange={handleStackTraceToggle}
            />{' '}
            Include Stack Trace
          </label>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>
            <input
              type="checkbox"
              checked={groupRerenders}
              onChange={handleGroupToggle}
            />{' '}
            Group Re-renders
          </label>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>
            <input
              type="checkbox"
              checked={filterEnabled}
              onChange={handleFilterToggle}
            />{' '}
            Enable Filter (exclude 'IgnoredComponent')
          </label>
        </div>
      </div>

      <div
        style={{
          marginBottom: 30,
          padding: 15,
          backgroundColor: '#e8f4f8',
          borderRadius: 5,
        }}
      >
        <h3>Test Component</h3>
        <p>Value: {example.value}</p>
        <p>Text: {example.text}</p>

        <div style={{ marginTop: 10 }}>
          <button
            onClick={exampleCubit.updateValue}
            style={{ marginRight: 10 }}
          >
            Update Value
          </button>
          <button onClick={exampleCubit.updateText} style={{ marginRight: 10 }}>
            Update Text
          </button>
          <button onClick={exampleCubit.updateBoth}>Update Both</button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#666' }}>
        <p>
          <strong>Instructions:</strong>
        </p>
        <ul>
          <li>Open browser DevTools console to see render logs</li>
          <li>Adjust settings above to change logging behavior</li>
          <li>Click buttons to trigger state updates and see logs</li>
          <li>Settings are applied immediately to the active plugin</li>
        </ul>
      </div>
    </div>
  );
}

export default RenderLoggingPluginDemo;
