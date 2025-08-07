import React from 'react';
import { Blac } from '@blac/core';
import {
  RenderLoggingPlugin,
  RenderLoggingConfig,
} from '@blac/plugin-render-logging';
import { COLOR_TEXT_SECONDARY, FONT_FAMILY_SANS } from '../lib/styles';

// Main component for configuring render logging
export default function RerenderLoggingDemo() {
  const [loggingLevel, setLoggingLevel] = React.useState<
    'minimal' | 'normal' | 'detailed'
  >('normal');
  const [includeStackTrace, setIncludeStackTrace] = React.useState(false);
  const [groupRerenders, setGroupRerenders] = React.useState(true);
  const [filterType, setFilterType] = React.useState<
    'none' | 'component' | 'bloc'
  >('none');
  const [filterValue, setFilterValue] = React.useState('');
  const [plugin, setPlugin] = React.useState<RenderLoggingPlugin | null>(null);

  // Initialize the plugin on mount
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

  // Update the plugin configuration
  const updateLoggingConfig = React.useCallback(() => {
    if (!plugin) return;

    const config: RenderLoggingConfig = {
      enabled: true,
      level: loggingLevel,
      includeStackTrace,
      groupRerenders,
    };

    // Add filter if needed
    if (filterType === 'component' && filterValue) {
      config.filter = ({ componentName }) =>
        componentName.includes(filterValue);
    } else if (filterType === 'bloc' && filterValue) {
      config.filter = ({ blocName }) => blocName.includes(filterValue);
    }

    plugin.updateConfig(config);
  }, [
    plugin,
    loggingLevel,
    includeStackTrace,
    groupRerenders,
    filterType,
    filterValue,
  ]);

  // Update plugin when settings change
  React.useEffect(() => {
    updateLoggingConfig();
  }, [updateLoggingConfig]);

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <div
        style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
        }}
      >
        <h2
          style={{
            fontWeight: 'bold',
            marginBottom: '20px',
            fontFamily: FONT_FAMILY_SANS,
            fontSize: '1.5em',
          }}
        >
          Render Logging Configuration
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Logging Level */}
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 'bold',
                marginBottom: '8px',
                fontSize: '0.95em',
              }}
            >
              Logging Level:
            </label>
            <select
              value={loggingLevel}
              onChange={(e) => setLoggingLevel(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                width: '200px',
                fontSize: '0.95em',
              }}
            >
              <option value="minimal">Minimal - Basic info only</option>
              <option value="normal">Normal - Standard logging</option>
              <option value="detailed">Detailed - Full debugging</option>
            </select>
          </div>

          {/* Stack Trace */}
          <div>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <input
                type="checkbox"
                checked={includeStackTrace}
                onChange={(e) => setIncludeStackTrace(e.target.checked)}
                style={{ borderRadius: '4px' }}
              />
              <span style={{ fontWeight: 'bold', fontSize: '0.95em' }}>
                Include Stack Trace
              </span>
            </label>
            <p
              style={{
                fontSize: '0.875em',
                color: COLOR_TEXT_SECONDARY,
                marginTop: '4px',
                marginLeft: '24px',
              }}
            >
              Shows where rerenders are triggered from (useful for debugging)
            </p>
          </div>

          {/* Group Rerenders */}
          <div>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <input
                type="checkbox"
                checked={groupRerenders}
                onChange={(e) => setGroupRerenders(e.target.checked)}
                style={{ borderRadius: '4px' }}
              />
              <span style={{ fontWeight: 'bold', fontSize: '0.95em' }}>
                Group Rerenders
              </span>
            </label>
            <p
              style={{
                fontSize: '0.875em',
                color: COLOR_TEXT_SECONDARY,
                marginTop: '4px',
                marginLeft: '24px',
              }}
            >
              Groups multiple rapid rerenders into collapsed console groups
            </p>
          </div>

          {/* Filter Configuration */}
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 'bold',
                marginBottom: '8px',
                fontSize: '0.95em',
              }}
            >
              Filter Logs:
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '0.95em',
                }}
              >
                <option value="none">No Filter</option>
                <option value="component">By Component Name</option>
                <option value="bloc">By Bloc Name</option>
              </select>

              {filterType !== 'none' && (
                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder={`Filter ${filterType}s containing...`}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    flex: 1,
                    fontSize: '0.95em',
                  }}
                />
              )}
            </div>
          </div>

          {/* Current Configuration Display */}
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              style={{
                fontSize: '0.95em',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              Current Configuration:
            </h3>
            <pre
              style={{
                fontSize: '0.875em',
                margin: 0,
                color: '#333',
              }}
            >
              {JSON.stringify(
                {
                  enabled: true,
                  level: loggingLevel,
                  includeStackTrace,
                  groupRerenders,
                  filter:
                    filterType === 'none'
                      ? 'none'
                      : `${filterType} contains "${filterValue}"`,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '0.875em',
        }}
      >
        <h3
          style={{
            fontWeight: 'bold',
            marginBottom: '8px',
            fontSize: '1.1em',
          }}
        >
          How to Use:
        </h3>
        <ol style={{ paddingLeft: '20px', color: COLOR_TEXT_SECONDARY }}>
          <li>Open your browser's Developer Console (F12)</li>
          <li>Adjust the settings above to configure logging behavior</li>
          <li>Navigate to other demos to see the render logs in action</li>
          <li>Use filters to focus on specific components or blocs</li>
        </ol>

        <p style={{ marginTop: '12px', fontStyle: 'italic' }}>
          Note: Render logging is always enabled in this demo. Settings are
          applied globally and will affect all BlaC components in the
          application.
        </p>
      </div>
    </div>
  );
}
