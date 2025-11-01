import { useBloc } from '@blac/react';
import { ThemeBloc } from './ThemeBloc';
import {
  Card,
  Button,
  Badge,
  Alert,
  StatCard,
  RenderCounter,
} from '../../shared/components';

export function ThemePreview() {
  const [state] = useBloc(ThemeBloc);

  console.log('[ThemePreview] Rendering');

  return (
    <Card>
      <div className="stack-md">
        <div className="flex-between">
          <h2>Component Preview</h2>
          <RenderCounter name="Preview" />
        </div>

        <p className="text-muted">
          See how all components look with your current theme settings
        </p>

        <ul>
          <li className="text-small">Theme Mode: {state.mode}</li>
        </ul>

        {/* Buttons */}
        <div className="stack-sm">
          <h3 className="text-small">Buttons</h3>
          <div className="row-sm flex-wrap">
            <Button variant="default">Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </div>

        {/* Badges */}
        <div className="stack-sm">
          <h3 className="text-small">Badges</h3>
          <div className="row-sm flex-wrap">
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
          </div>
        </div>

        {/* Alerts */}
        <div className="stack-sm">
          <h3 className="text-small">Alerts</h3>
          <div className="stack-xs">
            <Alert variant="info">This is an info alert</Alert>
            <Alert variant="success">This is a success alert</Alert>
            <Alert variant="warning">This is a warning alert</Alert>
            <Alert variant="danger">This is a danger alert</Alert>
          </div>
        </div>

        {/* Stats */}
        <div className="stack-sm">
          <h3 className="text-small">Stat Cards</h3>
          <div className="stats-grid">
            <StatCard label="Total Users" value={1234} />
            <StatCard label="Active" value={892} />
            <StatCard label="Pending" value={156} />
          </div>
        </div>

        {/* Typography */}
        <div className="stack-sm">
          <h3 className="text-small">Typography</h3>
          <div className="stack-xs">
            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
            <h3>Heading 3</h3>
            <p>Regular paragraph text</p>
            <p className="text-muted">Muted text</p>
            <p className="text-small">Small text</p>
            <code>Code snippet</code>
          </div>
        </div>

        <p className="text-xs text-muted">
          💡 This preview re-renders when any theme setting changes
        </p>
      </div>
    </Card>
  );
}
