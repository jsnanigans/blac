import { useBloc } from '@blac/react';
import React, { useState } from 'react';
import { AuthCubit } from '../blocs/AuthCubit';
import { DashboardStatsCubit } from '../blocs/DashboardStatsCubit';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

const BlocToBlocCommsDemo: React.FC = () => {
  // AuthCubit is shared by default (no static isolated = true)
  const [authState, authCubit] = useBloc(AuthCubit);
  // DashboardStatsCubit is isolated (static isolated = true)
  const [dashboardState, dashboardStatsCubit] = useBloc(DashboardStatsCubit);
  console.log('dashboardState', dashboardStatsCubit);

  const [userNameInput, setUserNameInput] = useState('DemoUser');

  const handleLogin = () => {
    if (userNameInput.trim()) {
      authCubit.login(userNameInput.trim());
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Auth Section */}
      <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Authentication Control</h3>
        {authState.isLoading && <p>Auth loading...</p>}
        {authState.isAuthenticated ? (
          <div>
            <p>Logged in as: <strong style={{color: 'green'}}>{authState.userName}</strong></p>
            <Button onClick={authCubit.logout} variant="destructive">Logout</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Label htmlFor="userNameComms">Username:</Label>
            <Input
              id="userNameComms"
              type="text"
              value={userNameInput}
              onChange={(e) => setUserNameInput(e.target.value)}
              placeholder="Enter username"
            />
            <Button onClick={handleLogin} variant="default" disabled={authState.isLoading || !userNameInput.trim()}>
              Login
            </Button>
            <p style={{color: '#555', fontSize: '0.9em'}}>Not logged in.</p>
          </div>
        )}
      </div>

      {/* Dashboard Section */}
      <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Dashboard Stats</h3>
        <Button onClick={dashboardStatsCubit.loadDashboard} variant="default" disabled={dashboardState.isLoading}>
          {dashboardState.isLoading ? 'Loading Stats...' : 'Load/Refresh Dashboard Stats'}
        </Button>
        <Button onClick={dashboardStatsCubit.resetStats} variant="outline" style={{marginLeft: '0.5rem'}} disabled={dashboardState.isLoading}>
          Reset Stats View
        </Button>
        <div style={{ marginTop: '1rem', padding: '0.5rem', backgroundColor: '#f9f9f9' }}>
          <p><strong>Stats:</strong> {dashboardState.statsMessage}</p>
          {dashboardState.lastLoadedForUser && (
            <p style={{fontSize: '0.8em', color: '#777'}}>Last loaded for: {dashboardState.lastLoadedForUser}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        This demo illustrates communication between Blocs/Cubits. 
        The <code>DashboardStatsCubit</code> (isolated instance) uses <code>Blac.getBloc(AuthCubit)</code> to access the state of the shared <code>AuthCubit</code>.
        The dashboard stats will reflect the current authentication status.
      </p>
    </div>
  );
};

export default BlocToBlocCommsDemo; 