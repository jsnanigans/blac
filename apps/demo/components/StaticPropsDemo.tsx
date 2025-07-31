import { useBloc } from '@blac/react';
import React from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Cubit } from '@blac/core';

// Demo Cubit that uses staticProps
interface UserDetailsState {
  data: any;
  loading: boolean;
  error: string | null;
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

class UserDetailsCubit extends Cubit<UserDetailsState, UserDetailsProps> {
  constructor(props: UserDetailsProps) {
    super({ data: null, loading: false, error: null });
    console.log('UserDetailsCubit created with props:', props);
    console.log('Instance ID:', (this as any)._id);
  }

  loadUser = async () => {
    this.emit({ ...this.state, loading: true, error: null });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.emit({
      data: {
        id: this.props!.userId,
        name: `User ${this.props!.userId}`,
        includeProfile: this.props!.includeProfile,
        apiVersion: this.props!.apiVersion,
      },
      loading: false,
      error: null,
    });
  };

  clear = () => {
    this.emit({ data: null, loading: false, error: null });
  };
}

// Component that uses UserDetailsCubit
const UserDetailsComponent: React.FC<{ 
  userId: string; 
  includeProfile?: boolean; 
  showInstanceId?: boolean 
}> = ({ userId, includeProfile, showInstanceId }) => {
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

  return (
    <Card className="p-4">
      <div className="space-y-2">
        <h4 className="font-semibold">User Details Component</h4>
        <p className="text-sm text-muted-foreground">
          UserId: {userId}, Include Profile: {includeProfile ? 'Yes' : 'No'}
        </p>
        {showInstanceId && (
          <p className="text-xs font-mono bg-muted p-2 rounded">
            Instance ID: {(cubit as any)._id}
          </p>
        )}
        
        <div className="space-y-2">
          {state.loading && <p className="text-sm">Loading...</p>}
          {state.data && (
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify(state.data, null, 2)}
            </pre>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button onClick={cubit.loadUser} size="sm" disabled={state.loading}>
            Load User
          </Button>
          <Button onClick={cubit.clear} size="sm" variant="outline">
            Clear
          </Button>
        </div>
      </div>
    </Card>
  );
};

const StaticPropsDemo: React.FC = () => {
  const [showInstanceIds, setShowInstanceIds] = React.useState(true);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Static Props with Auto-Generated Instance IDs</h3>
        <p className="text-sm text-muted-foreground">
          When using <code className="bg-muted px-1 py-0.5 rounded">staticProps</code>, BlaC can automatically 
          generate instance IDs from primitive values (string, number, boolean, null, undefined).
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
        <label htmlFor="showIds" className="text-sm">Show Instance IDs</label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium">Same User ID = Same Instance</h4>
          <UserDetailsComponent userId="user123" includeProfile={true} showInstanceId={showInstanceIds} />
          <UserDetailsComponent userId="user123" includeProfile={false} showInstanceId={showInstanceIds} />
          <p className="text-xs text-muted-foreground">
            Both components share the same instance because they have the same userId. 
            The generated ID is: <code className="bg-muted px-1">apiVersion:2|includeProfile:true|userId:user123</code>
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Different User ID = Different Instance</h4>
          <UserDetailsComponent userId="user456" includeProfile={true} showInstanceId={showInstanceIds} />
          <UserDetailsComponent userId="user789" includeProfile={true} showInstanceId={showInstanceIds} />
          <p className="text-xs text-muted-foreground">
            Different userIds create different instances with unique generated IDs.
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
        <h4 className="font-medium">Key Features:</h4>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Instance IDs are generated deterministically from primitive staticProps values</li>
          <li>Complex objects, arrays, and functions in staticProps are ignored for ID generation</li>
          <li>Props are sorted alphabetically to ensure consistent IDs</li>
          <li>You can still provide an explicit <code className="bg-background px-1 py-0.5 rounded">instanceId</code> to override auto-generation</li>
          <li>The <code className="bg-background px-1 py-0.5 rounded">id</code> option is deprecated in favor of <code className="bg-background px-1 py-0.5 rounded">instanceId</code></li>
        </ul>
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