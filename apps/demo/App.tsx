import React, { useState } from 'react';

import BasicCounterDemo from './components/BasicCounterDemo';
import CustomSelectorDemo from './components/CustomSelectorDemo';
import DependencyTrackingDemo from './components/DependencyTrackingDemo';
import GetterDemo from './components/GetterDemo';
import IsolatedCounterDemo from './components/IsolatedCounterDemo';
import LifecycleDemo from './components/LifecycleDemo';
import MultiInstanceDemo from './components/MultiInstanceDemo';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/Card'; // Removing Card components for simpler styling
import { Blac } from '@blac/core';
import BlocToBlocCommsDemo from './components/BlocToBlocCommsDemo';
import ConditionalDependencyDemo from './components/ConditionalDependencyDemo';
import KeepAliveDemo from './components/KeepAliveDemo';
import TodoBlocDemo from './components/TodoBlocDemo';
import { Button } from './components/ui/Button';
import UserProfileDemo from './components/UserProfileDemo';
import {
  APP_CONTAINER_STYLE, // For potentially lighter description text or default card text
  COLOR_PRIMARY_ACCENT,
  COLOR_SECONDARY_ACCENT, // For description text
  COLOR_TEXT_SECONDARY,
  DEMO_COMPONENT_CONTAINER_STYLE, // For title text, potentially
  FONT_FAMILY_SANS, // For any links
  FOOTER_STYLE,
  HEADER_STYLE,
  LINK_STYLE,
  SECTION_STYLE,
} from './lib/styles'; // Import the styles

// Simple Card replacement for demo purposes, adapted for modern look
const DemoCard: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
  titleColor?: string;
  titleBg?: string;
  show: boolean;
  setShow: (show: boolean) => void;
}> = ({ title, description, children, show, setShow }) => {
  // Removed titleColor and titleBg logic as titles will be more uniform with the new flat style

  return (
    <div style={SECTION_STYLE}>
      <div>
        <Button onClick={() => setShow(!show)}>
          {show ? 'Hide' : 'Show'}
        </Button>
      </div>
      {' '}
      {/* Uses new flat SECTION_STYLE */}
      <h2
        style={{
          fontFamily: FONT_FAMILY_SANS,
          color: COLOR_PRIMARY_ACCENT, // Title color from new palette
          paddingBottom: '10px', // Space below title
          marginBottom: '15px', // Space between title and description
          fontSize: '1.3em',
          fontWeight: '600',
          borderBottom: `1px solid ${COLOR_SECONDARY_ACCENT}`, // Subtle separator
          textTransform: 'none', // No uppercase
          letterSpacing: 'normal', // Normal spacing
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: FONT_FAMILY_SANS,
          marginBottom: '20px',
          fontSize: '1em',
          color: COLOR_TEXT_SECONDARY,
          lineHeight: '1.6',
        }}
      >
        {description}
      </p>
      <div style={DEMO_COMPONENT_CONTAINER_STYLE}>
        {show && children}
      </div>
    </div>
  );
};

function App() {
  const showDefault = false;
  const [show, setShow] = useState({
    basic: showDefault,
    isolated: showDefault,
    userProfile: showDefault,
    getter: showDefault,
    multiInstance: showDefault,
    lifecycle: showDefault,
    dependencyTracking: showDefault,
    customSelector: showDefault,
    conditionalDependency: showDefault,
    todoBloc: showDefault,
    blocToBlocComms: showDefault,
    keepAlive: showDefault,
  });

  return (
    <div style={APP_CONTAINER_STYLE}>
      <header style={HEADER_STYLE}>
        {/* Simplified header text, no longer LCARS specific */}
        <h1
          style={{ fontSize: '1.8em', margin: '0 0 5px 0', fontWeight: 'bold' }}
        >
          Blac/React Showcase
        </h1>
        <p style={{ fontSize: '1em', margin: 0 }}>
          Demonstrating core features and usage patterns
        </p>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Removed titleBg and titleColor props as DemoCard styling is now more uniform */}
        <DemoCard
          title="Basic Shared Counter"
          description="Demonstrates useBloc with a shared Cubit instance."
          show={show.basic}
          setShow={() => setShow({ ...show, basic: !show.basic })}
        >
          <BasicCounterDemo />
        </DemoCard>

        <DemoCard
          title="Isolated Counter"
          description="useBloc with isolated Cubit (static isolated = true). Multiple instances shown."
          show={show.isolated}
          setShow={() => setShow({ ...show, isolated: !show.isolated })}
        >
          <IsolatedCounterDemo />
          <IsolatedCounterDemo initialCount={10} />
        </DemoCard>

        <DemoCard
          title="User Profile (Bloc)"
          description="Isolated bloc, props, and getters for derived state logic."
          show={show.userProfile}
          setShow={() => setShow({ ...show, userProfile: !show.userProfile })}
        >
          <UserProfileDemo defaultFirstName="Alice" />
        </DemoCard>

        <DemoCard
          title="Getter Dependency"
          description="Component re-renders based on getter value changes."
          show={show.getter}
          setShow={() => setShow({ ...show, getter: !show.getter })}
        >
          <GetterDemo />
        </DemoCard>

        <DemoCard
          title="Multiple Instances"
          description="Independent Cubit instances managed by custom IDs."
          show={show.multiInstance}
          setShow={() =>
            setShow({ ...show, multiInstance: !show.multiInstance })
          }
        >
          <MultiInstanceDemo />
        </DemoCard>

        <DemoCard
          title="Lifecycle Demo"
          description="onMount/onUnmount behavior with an isolated Cubit."
          show={show.lifecycle}
          setShow={() => setShow({ ...show, lifecycle: !show.lifecycle })}
        >
          <LifecycleDemo />
        </DemoCard>

        <DemoCard
          title="Fine-Grained Deps"
          description="Re-render control using state slices & getters in dependency arrays."
          show={show.dependencyTracking}
          setShow={() =>
            setShow({ ...show, dependencyTracking: !show.dependencyTracking })
          }
        >
          <DependencyTrackingDemo />
        </DemoCard>

        <DemoCard
          title="Custom Selector"
          description="Advanced re-render control with a custom dependencySelector function."
          show={show.customSelector}
          setShow={() =>
            setShow({ ...show, customSelector: !show.customSelector })
          }
        >
          <CustomSelectorDemo />
        </DemoCard>

        <DemoCard
          title="Conditional Dependency Tracking"
          description="Demonstrates how useBloc automatically tracks dependencies based on conditional rendering and getter usage."
          show={show.conditionalDependency}
          setShow={() =>
            setShow({
              ...show,
              conditionalDependency: !show.conditionalDependency,
            })
          }
        >
          <ConditionalDependencyDemo />
        </DemoCard>

        <DemoCard
          title="Todo List (Bloc with Event Handlers)"
          description="A classic todo list example using a Bloc with the new event-handler pattern (this.on, this.add) to manage state."
          show={show.todoBloc}
          setShow={() => setShow({ ...show, todoBloc: !show.todoBloc })}
        >
          <TodoBlocDemo />
        </DemoCard>

        <DemoCard
          title="Bloc-to-Bloc Communication (Blac.getBloc)"
          description="Shows an isolated Cubit (DashboardStatsCubit) accessing a shared Cubit (AuthCubit) using Blac.getBloc() to fetch data based on auth state."
          show={show.blocToBlocComms}
          setShow={() =>
            setShow({ ...show, blocToBlocComms: !show.blocToBlocComms })
          }
        >
          <BlocToBlocCommsDemo />
        </DemoCard>

        <DemoCard
          title="KeepAlive Cubit"
          description="Demonstrates a Cubit with 'static keepAlive = true'. Its state persists even when components unmount and remount."
          show={show.keepAlive}
          setShow={() => setShow({ ...show, keepAlive: !show.keepAlive })}
        >
          <KeepAliveDemo />
        </DemoCard>
      </main>

      <footer style={FOOTER_STYLE}>
        {/* Simplified footer */}
        <p style={{ margin: '0 0 8px 0', fontSize: '0.9em' }}>
          Blac Demo Application
        </p>
        <p style={{ fontSize: '0.8em', margin: 0 }}>
          <a href="#" style={LINK_STYLE}>
            Documentation
          </a>{' '}
          |{' '}
          <a href="#" style={LINK_STYLE}>
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;

Blac.enableLog = true;
window.blac = Blac;
console.log(Blac.instance);
