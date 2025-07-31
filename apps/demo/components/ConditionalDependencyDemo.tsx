import { useBloc } from '@blac/react';
import React from 'react';
import { ConditionalUserProfileCubit } from '../blocs/ConditionalUserProfileCubit';
import { DEMO_COMPONENT_CONTAINER_STYLE, LCARS_ORANGE } from '../lib/styles';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

const UserProfileDisplay: React.FC = () => {
  const [state, cubit] = useBloc(ConditionalUserProfileCubit);

  const renderCountRef = React.useRef(0);
  React.useEffect(() => {
    renderCountRef.current += 1;
  });
  return (
    <div
      style={{
        ...DEMO_COMPONENT_CONTAINER_STYLE, // Base container style
        // Tailwind: p-4 border rounded-md bg-background-component
        // DEMO_COMPONENT_CONTAINER_STYLE already has padding, border, borderRadius, backgroundColor
        // If specific overrides are needed, they can be added here.
        // For instance, bg-background-component might map to a specific color if not covered.
      }}
    >
      <div
        style={{
          fontSize: '0.875rem',
          color: '#6c757d' /* text-sm text-muted-foreground */,
        }}
      >
        Component Render Count: {renderCountRef.current}
      </div>
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          marginBottom: '0.5rem' /* text-lg font-semibold mb-2 */,
        }}
      >
        User Profile Display
      </h3>
      {state.showFullName ? (
        <p>
          Name (via getter):{' '}
          <span
            style={{
              fontWeight: 'bold',
              color:
                LCARS_ORANGE /* font-bold text-primary (assuming primary is orange) */,
            }}
          >
            {cubit.fullName}
          </span>
        </p>
      ) : (
        <p>
          First Name:{' '}
          <span
            style={{
              fontWeight: 'bold',
              color: LCARS_ORANGE /* font-bold text-primary */,
            }}
          >
            {state.firstName}
          </span>
        </p>
      )}
      <p>
        Age:{' '}
        <span
          style={{
            fontWeight: 'bold',
            color: LCARS_ORANGE /* font-bold text-primary */,
          }}
        >
          {state.age}
        </span>
      </p>
    </div>
  );
};

const NameInputs: React.FC = () => {
  const [state, cubit] = useBloc(ConditionalUserProfileCubit);

  const renderCountRef = React.useRef(0);

  React.useEffect(() => {
    renderCountRef.current += 1;
  });

  return (
    <div
      style={{
        // Tailwind: grid grid-cols-1 md:grid-cols-2 gap-4
        display: 'grid',
        gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', // default mobile
        gap: '1rem',
        // Responsive styling for md:grid-cols-2 needs a bit more thought,
        // typically handled with media queries or a helper. For now, let's keep it simple or assume mobile-first.
        // A proper solution might involve useWindowSize hook or CSS-in-JS media queries.
        // For simplicity here, we'll just use single column.
        // To truly replicate md:grid-cols-2, a media query approach in styles.ts or a resize listener would be needed.
      }}
    >
      <div
        style={{
          fontSize: '0.875rem',
          color: '#6c757d' /* text-sm text-muted-foreground */,
        }}
      >
        Component Render Count: {renderCountRef.current}
      </div>
      {/* Tailwind: space-y-2 -> direct children have margin-top: 0.5rem except first */}
      {/* This is tricky with inline styles without specific child targeting. */}
      {/* We'll apply margin to the div directly or to each child. */}
      <div style={{ marginBottom: '0.5rem' }}>
        <Label htmlFor="firstNameConditional">First Name:</Label>
        <Input
          id="firstNameConditional"
          type="text"
          value={state.firstName}
          onChange={(e) => cubit.setFirstName(e.target.value)}
          placeholder="Set First Name"
        />
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        {' '}
        {/* Simplified space-y-2 for the second item */}
        <Label htmlFor="lastNameConditional">Last Name:</Label>
        <Input
          id="lastNameConditional"
          type="text"
          value={state.lastName}
          onChange={(e) => cubit.setLastName(e.target.value)}
          placeholder="Set Last Name"
        />
      </div>
    </div>
  );
};

const ActionButtons: React.FC = () => {
  const [state, cubit] = useBloc(ConditionalUserProfileCubit);
  return (
    <div
      style={{
        // Tailwind: flex flex-wrap gap-2 items-center
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center',
      }}
    >
      <Button onClick={cubit.toggleShowFullName}>
        Toggle Full Name Display (Currently: {state.showFullName ? 'ON' : 'OFF'}
        )
      </Button>
      <Button onClick={() => cubit.setFirstName('Alex')}>
        Set First to Alex
      </Button>
      <Button onClick={() => cubit.setLastName('Jones')}>
        Set Last to Jones
      </Button>
      <Button onClick={cubit.incrementAge}>Increment Age</Button>
      <Button onClick={cubit.incrementAccessCount}>
        Increment Access Count (No UI Change Expected)
      </Button>
      <Button onClick={cubit.resetState}>Reset Cubit State</Button>
    </div>
  );
};

const InfoSection: React.FC = () => {
  return (
    <div
      style={{
        // Tailwind: text-xs text-muted-foreground mt-2 space-y-1
        fontSize: '0.75rem',
        color: '#6c757d', // text-muted-foreground
        marginTop: '0.5rem',
        // For space-y-1, children <p> tags will need margin.
      }}
    >
      <p style={{ marginBottom: '0.25rem' }}>
        <strong>How it works:</strong> When "Toggle Full Name Display" is OFF,
        the component only depends on `state.firstName` (and `state.age`,
        `state.showFullName`). Changing `state.lastName` will NOT cause a
        re-render.
      </p>
      <p style={{ marginBottom: '0.25rem' }}>
        When "Toggle Full Name Display" is ON, the component uses
        `cubit.fullName` (getter), which depends on both `state.firstName` and
        `state.lastName`. Now, changing *either* `firstName` or `lastName` WILL
        cause a re-render.
      </p>
      <p>
        {' '}
        {/* Last p doesn't need bottom margin from space-y-1 */}
        `incrementAccessCount` changes state not used in render output, so it
        shouldn't trigger re-renders unless `accessCount` is added as a
        dependency elsewhere (e.g. console log, or if the getter used it).
      </p>
    </div>
  );
};

const ConditionalDependencyDemo: React.FC = () => {
  return (
    // Tailwind: space-y-4. Children components will have margin-top: 1rem
    // This needs to be applied to children or use a wrapper for each.
    // Applying to the parent div with display: flex and flexDirection: column and gap would be one way.
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <UserProfileDisplay />
      <NameInputs />
      <ActionButtons />
      <InfoSection />
    </div>
  );
};

export default ConditionalDependencyDemo;
