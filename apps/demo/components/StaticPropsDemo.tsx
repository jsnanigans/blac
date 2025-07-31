import { useBloc } from '@blac/react';
import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Cubit } from '@blac/core';

// Demo Cubit that uses staticProps
interface UserDetailsState {
  data: any;
  loading: boolean;
  error: string | null;
  updateCount: number;
  lastUpdated: string | null;
}

interface UserDetailsProps {
  userId: string;
  includeProfile?: boolean;
  apiVersion?: number;
  // Complex object - will be ignored for instanceId generation
  filters?: {
    fields: string[];
    sort: 'asc' | 'desc';
  };
}

class UserDetailsCubit extends Cubit<UserDetailsState> {
  private static instanceCount = 0;
  private static instanceMap = new Map<string, number>();
  private instanceNumber: number;
  private props: UserDetailsProps;

  constructor(props: UserDetailsProps) {
    super({
      data: null,
      loading: false,
      error: null,
      updateCount: 0,
      lastUpdated: null,
    });

    this.props = props;

    const instanceId = (this as any)._id;
    if (!UserDetailsCubit.instanceMap.has(instanceId)) {
      UserDetailsCubit.instanceCount++;
      UserDetailsCubit.instanceMap.set(
        instanceId,
        UserDetailsCubit.instanceCount,
      );
    }
    this.instanceNumber = UserDetailsCubit.instanceMap.get(instanceId)!;

    console.log('UserDetailsCubit created with props:', props);
    console.log('Instance ID:', instanceId);
    console.log('Instance Number:', this.instanceNumber);
  }

  loadUser = async () => {
    this.emit({ ...this.state, loading: true, error: null });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const updateCount = this.state.updateCount + 1;
    this.emit({
      data: {
        id: this.props.userId,
        name: `User ${this.props.userId}`,
        email: `${this.props.userId}@example.com`,
        includeProfile: this.props.includeProfile,
        apiVersion: this.props.apiVersion,
        instanceNumber: this.instanceNumber,
        profile: this.props.includeProfile
          ? {
              bio: `Bio for user ${this.props.userId}`,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.props.userId}`,
              joinDate: new Date(
                2024,
                0,
                this.instanceNumber,
              ).toLocaleDateString(),
            }
          : undefined,
      },
      loading: false,
      error: null,
      updateCount,
      lastUpdated: new Date().toLocaleTimeString(),
    });
  };

  clear = () => {
    this.emit({
      data: null,
      loading: false,
      error: null,
      updateCount: this.state.updateCount,
      lastUpdated: this.state.lastUpdated,
    });
  };

  getInstanceNumber = () => this.instanceNumber;
}

// Component that uses UserDetailsCubit
const UserDetailsComponent: React.FC<{
  userId: string;
  includeProfile?: boolean;
  showInstanceId?: boolean;
  highlightColor?: string;
  componentId: string;
}> = ({
  userId,
  includeProfile,
  showInstanceId,
  highlightColor,
  componentId,
}) => {
  const [state, cubit] = useBloc(UserDetailsCubit, {
    staticProps: {
      userId,
      includeProfile,
      apiVersion: 2,
      // This complex object will be ignored for instanceId generation
      filters: {
        fields: ['name', 'email'],
        sort: 'asc',
      },
    },
  });

  const instanceNumber = cubit.getInstanceNumber();
  const borderColor = highlightColor || '#e5e7eb';

  return (
    <Card
      className="p-4 transition-all duration-300"
      style={{
        borderColor: borderColor,
        borderWidth: '2px',
        borderStyle: 'solid',
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            Component {componentId}
            <span
              className="text-xs px-2 py-1 rounded-full font-normal"
              style={{
                backgroundColor: highlightColor || '#f3f4f6',
                color: highlightColor ? 'white' : 'black',
              }}
            >
              Instance #{instanceNumber}
            </span>
          </h4>
          {state.updateCount > 0 && (
            <span className="text-xs text-muted-foreground">
              Updates: {state.updateCount}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          UserId: <code className="bg-muted px-1 rounded">{userId}</code>,
          Profile: {includeProfile ? '✅' : '❌'}
        </p>

        {showInstanceId && (
          <div className="text-xs font-mono bg-muted p-2 rounded space-y-1">
            <div>Instance ID: {(cubit as any)._id}</div>
            {state.lastUpdated && (
              <div className="text-muted-foreground">
                Last updated: {state.lastUpdated}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {state.loading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              <p className="text-sm">Loading...</p>
            </div>
          )}
          {state.data && (
            <div className="space-y-2">
              <div className="bg-muted p-3 rounded space-y-1">
                <p className="text-sm">
                  <strong>Name:</strong> {state.data.name}
                </p>
                <p className="text-sm">
                  <strong>Email:</strong> {state.data.email}
                </p>
                {state.data.profile && (
                  <>
                    <p className="text-sm">
                      <strong>Bio:</strong> {state.data.profile.bio}
                    </p>
                    <p className="text-sm">
                      <strong>Joined:</strong> {state.data.profile.joinDate}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={cubit.loadUser} size="sm" disabled={state.loading}>
            {state.data ? 'Reload' : 'Load'} User
          </Button>
          <Button onClick={cubit.clear} size="sm" variant="outline">
            Clear
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Interactive demo component
const InteractivePropsDemo: React.FC = () => {
  const [userId, setUserId] = useState('user123');
  const [includeProfile, setIncludeProfile] = useState(true);
  const [apiVersion, setApiVersion] = useState(2);
  const [useCustomId, setUseCustomId] = useState(false);
  const [customId, setCustomId] = useState('my-custom-instance');

  const [state, cubit] = useBloc(UserDetailsCubit, {
    ...(useCustomId ? { instanceId: customId } : {}),
    staticProps: {
      userId,
      includeProfile,
      apiVersion,
    },
  });

  const generatedId = `apiVersion:${apiVersion}|includeProfile:${includeProfile}|userId:${userId}`;

  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-4">Interactive Instance ID Generator</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="text-sm font-medium">API Version</label>
            <input
              type="number"
              value={apiVersion}
              onChange={(e) => setApiVersion(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeProfile"
              checked={includeProfile}
              onChange={(e) => setIncludeProfile(e.target.checked)}
            />
            <label htmlFor="includeProfile" className="text-sm">
              Include Profile Data
            </label>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="useCustom"
                checked={useCustomId}
                onChange={(e) => setUseCustomId(e.target.checked)}
              />
              <label htmlFor="useCustom" className="text-sm font-medium">
                Use Custom Instance ID
              </label>
            </div>
            {useCustomId && (
              <input
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter custom ID"
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h5 className="font-medium">Instance Information</h5>
            <div className="text-sm space-y-1">
              <p>
                <strong>Actual ID:</strong>
              </p>
              <code className="block text-xs bg-background p-2 rounded break-all">
                {useCustomId ? customId : generatedId}
              </code>
              {!useCustomId && (
                <p className="text-xs text-muted-foreground mt-2">
                  Auto-generated from primitive props (sorted alphabetically)
                </p>
              )}
            </div>
          </div>

          {state.data && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-medium mb-2">Loaded Data</h5>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(state.data, null, 2)}
              </pre>
            </div>
          )}

          <Button
            onClick={cubit.loadUser}
            disabled={state.loading}
            className="w-full"
          >
            {state.loading ? 'Loading...' : 'Load User Data'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

const StaticPropsDemo: React.FC = () => {
  const [showInstanceIds, setShowInstanceIds] = useState(true);
  const [scenario, setScenario] = useState<
    'basic' | 'advanced' | 'interactive'
  >('basic');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">
          Static Props with Auto-Generated Instance IDs
        </h3>
        <p className="text-sm text-muted-foreground">
          When using{' '}
          <code className="bg-muted px-1 py-0.5 rounded">staticProps</code>,
          BlaC can automatically generate instance IDs from primitive values
          (string, number, boolean, null, undefined).
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="showIds"
          checked={showInstanceIds}
          onChange={(e) => setShowInstanceIds(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="showIds" className="text-sm">
          Show Instance IDs
        </label>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setScenario('basic')}
          variant={scenario === 'basic' ? 'default' : 'outline'}
          size="sm"
        >
          Basic Demo
        </Button>
        <Button
          onClick={() => setScenario('advanced')}
          variant={scenario === 'advanced' ? 'default' : 'outline'}
          size="sm"
        >
          Advanced Scenarios
        </Button>
        <Button
          onClick={() => setScenario('interactive')}
          variant={scenario === 'interactive' ? 'default' : 'outline'}
          size="sm"
        >
          Interactive Playground
        </Button>
      </div>

      {scenario === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              Same Props = Same Instance
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                Shared
              </span>
            </h4>
            <UserDetailsComponent
              componentId="A"
              userId="user123"
              includeProfile={true}
              showInstanceId={showInstanceIds}
              highlightColor="#10b981"
            />
            <UserDetailsComponent
              componentId="B"
              userId="user123"
              includeProfile={true}
              showInstanceId={showInstanceIds}
              highlightColor="#10b981"
            />
            <div className="bg-green-50 p-3 rounded-lg text-sm">
              <p className="font-medium text-green-900">
                ✨ Instance Sharing Benefits:
              </p>
              <ul className="mt-1 space-y-1 text-green-800">
                <li>• Both components show the same data</li>
                <li>• Updates in one reflect in the other</li>
                <li>• Single API call serves both components</li>
                <li>• Reduced memory usage</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              Different Props = Different Instances
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                Isolated
              </span>
            </h4>
            <UserDetailsComponent
              componentId="C"
              userId="user456"
              includeProfile={true}
              showInstanceId={showInstanceIds}
              highlightColor="#3b82f6"
            />
            <UserDetailsComponent
              componentId="D"
              userId="user789"
              includeProfile={true}
              showInstanceId={showInstanceIds}
              highlightColor="#8b5cf6"
            />
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium text-blue-900">
                🔒 Instance Isolation Benefits:
              </p>
              <ul className="mt-1 space-y-1 text-blue-800">
                <li>• Independent state management</li>
                <li>• Separate API calls for each user</li>
                <li>• No cross-contamination of data</li>
                <li>• Can load/update independently</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {scenario === 'advanced' && (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">
              Scenario 1: Profile Flag Creates Different Instances
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UserDetailsComponent
                componentId="E"
                userId="user999"
                includeProfile={true}
                showInstanceId={showInstanceIds}
                highlightColor="#f59e0b"
              />
              <UserDetailsComponent
                componentId="F"
                userId="user999"
                includeProfile={false}
                showInstanceId={showInstanceIds}
                highlightColor="#ef4444"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Same user ID but different <code>includeProfile</code> values
              create separate instances. This allows different components to
              fetch different levels of detail for the same user.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-3">
              Scenario 2: Complex Objects Are Ignored
            </h4>
            <Card className="p-4">
              <p className="text-sm mb-2">
                The following props generate the same instance ID:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                  {`{
  userId: "user777",
  includeProfile: true,
  apiVersion: 2,
  filters: {
    fields: ['name', 'email'],
    sort: 'asc'
  }
}`}
                </pre>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                  {`{
  userId: "user777",
  includeProfile: true,
  apiVersion: 2,
  filters: {
    fields: ['id', 'avatar'],
    sort: 'desc'
  }
}`}
                </pre>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Both generate:{' '}
                <code className="bg-muted px-1 rounded">
                  apiVersion:2|includeProfile:true|userId:user777
                </code>
              </p>
            </Card>
          </div>

          <div>
            <h4 className="font-medium mb-3">
              Scenario 3: Real-World Use Case - User Dashboard
            </h4>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
              <p className="text-sm mb-4">
                Imagine a dashboard showing the same user in multiple widgets.
                Using auto-generated IDs ensures all widgets share the same data
                instance:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded shadow-sm">
                  <h5 className="text-xs font-medium mb-2">Profile Widget</h5>
                  <UserDetailsComponent
                    componentId="Widget1"
                    userId="dashboard-user"
                    includeProfile={true}
                    showInstanceId={false}
                    highlightColor="#a855f7"
                  />
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <h5 className="text-xs font-medium mb-2">Activity Feed</h5>
                  <UserDetailsComponent
                    componentId="Widget2"
                    userId="dashboard-user"
                    includeProfile={true}
                    showInstanceId={false}
                    highlightColor="#a855f7"
                  />
                </div>
                <div className="bg-white p-3 rounded shadow-sm">
                  <h5 className="text-xs font-medium mb-2">Settings Panel</h5>
                  <UserDetailsComponent
                    componentId="Widget3"
                    userId="dashboard-user"
                    includeProfile={true}
                    showInstanceId={false}
                    highlightColor="#a855f7"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                All three widgets share the same instance (Instance #4). Loading
                data in any widget updates all of them!
              </p>
            </div>
          </div>
        </div>
      )}

      {scenario === 'interactive' && <InteractivePropsDemo />}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <span className="text-lg">🎯</span> Key Features
          </h4>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>
                IDs are generated deterministically from primitive props
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Complex objects, arrays, and functions are ignored</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Props are sorted alphabetically for consistency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>
                Override with explicit{' '}
                <code className="bg-muted px-1 rounded text-xs">
                  instanceId
                </code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Automatic instance sharing for identical props</span>
            </li>
          </ul>
        </Card>

        <Card className="p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <span className="text-lg">💡</span> Best Practices
          </h4>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                Use primitive props for entity IDs (userId, productId, etc.)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                Keep complex configuration in a separate options object
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                Use boolean flags for feature toggles (includeProfile, etc.)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                Consider performance when many components share instances
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Use explicit IDs when you need precise control</span>
            </li>
          </ul>
        </Card>
      </div>

      <div className="mt-6 p-4 border border-dashed rounded-lg">
        <h4 className="font-medium mb-2">Example Usage:</h4>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">{`// Auto-generated instance ID from primitives
const [state, cubit] = useBloc(UserDetailsCubit, {
  staticProps: {
    userId: 'user123',        // Used for ID
    includeProfile: true,     // Used for ID
    apiVersion: 2,            // Used for ID
    filters: { ... }          // Ignored (complex object)
  }
});
// Generated ID: "apiVersion:2|includeProfile:true|userId:user123"

// Explicit instance ID (overrides auto-generation)
const [state, cubit] = useBloc(UserDetailsCubit, {
  instanceId: 'my-custom-id',
  staticProps: { userId: 'user123' }
});`}</pre>
      </div>
    </div>
  );
};

export default StaticPropsDemo;
