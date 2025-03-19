import { createFileRoute } from '@tanstack/react-router';
import React, { useEffect, useRef, useState } from 'react';
import { Cubit } from 'blac-next';
import { useBloc } from '@blac/react';

export const Route = createFileRoute('/demo/dependency-tracking')({
  component: DependencyTrackingDemo,
});

// Complex state with multiple properties to demonstrate dependency tracking
interface UserPreferencesState {
  theme: 'light' | 'dark';
  fontSize: number;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  language: string;
  refreshRate: number;
}

// Cubit to manage the complex state
class UserPreferencesCubit extends Cubit<UserPreferencesState> {
  constructor() {
    super({
      theme: 'light',
      fontSize: 16,
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      language: 'en',
      refreshRate: 60,
    });
  }

  setTheme(theme: 'light' | 'dark') {
    this.patch({ theme });
  }

  setFontSize(fontSize: number) {
    this.patch({ fontSize });
  }

  toggleEmailNotifications() {
    this.patch({
      notifications: {
        ...this.state.notifications,
        email: !this.state.notifications.email,
      },
    });
  }

  togglePushNotifications() {
    this.patch({
      notifications: {
        ...this.state.notifications,
        push: !this.state.notifications.push,
      },
    });
  }

  toggleSmsNotifications() {
    this.patch({
      notifications: {
        ...this.state.notifications,
        sms: !this.state.notifications.sms,
      },
    });
  }

  setLanguage(language: string) {
    this.patch({ language });
  }

  setRefreshRate(refreshRate: number) {
    this.patch({ refreshRate });
  }
}

// Component that only renders when theme changes
function ThemeComponent() {
  const renderCount = useRef(0);
  const [{ theme }, prefsCubit] = useBloc(UserPreferencesCubit);
  
  useEffect(() => {
    renderCount.current += 1;
  });

  return (
    <div className="p-4 border rounded-lg relative mb-4 bg-white dark:bg-gray-800">
      <span className="render-badge px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
        Renders: {renderCount.current}
      </span>
      <h3 className="font-bold mb-2">Theme Component</h3>
      <p className="mb-2">This component only uses the <code>theme</code> property.</p>
      <p className="mb-4">Current theme: <strong>{theme}</strong></p>
      <button
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => prefsCubit.setTheme(theme === 'light' ? 'dark' : 'light')}
      >
        Toggle Theme
      </button>
    </div>
  );
}

// Component that only renders when font size changes
function FontSizeComponent() {
  const renderCount = useRef(0);
  const [{ fontSize }, prefsCubit] = useBloc(UserPreferencesCubit);
  
  useEffect(() => {
    renderCount.current += 1;
  });

  return (
    <div className="p-4 border rounded-lg relative mb-4 bg-white dark:bg-gray-800">
      <span className="render-badge px-2 py-1 bg-green-500 text-white text-xs rounded-full">
        Renders: {renderCount.current}
      </span>
      <h3 className="font-bold mb-2">Font Size Component</h3>
      <p className="mb-2">This component only uses the <code>fontSize</code> property.</p>
      <p className="mb-4" style={{ fontSize: `${fontSize}px` }}>
        Current font size: <strong>{fontSize}px</strong>
      </p>
      <div className="flex gap-2">
        <button
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={() => prefsCubit.setFontSize(Math.max(10, fontSize - 2))}
        >
          Decrease
        </button>
        <button
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={() => prefsCubit.setFontSize(Math.min(24, fontSize + 2))}
        >
          Increase
        </button>
      </div>
    </div>
  );
}

// Component that only renders when notifications change
function NotificationsComponent() {
  const renderCount = useRef(0);
  const [{ notifications }, prefsCubit] = useBloc(UserPreferencesCubit);
  
  useEffect(() => {
    renderCount.current += 1;
  });

  return (
    <div className="p-4 border rounded-lg relative mb-4 bg-white dark:bg-gray-800">
      <span className="render-badge px-2 py-1 bg-purple-500 text-white text-xs rounded-full">
        Renders: {renderCount.current}
      </span>
      <h3 className="font-bold mb-2">Notifications Component</h3>
      <p className="mb-2">This component only uses the <code>notifications</code> property.</p>
      <div className="space-y-2 mb-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="email-notifications"
            checked={notifications.email}
            onChange={() => prefsCubit.toggleEmailNotifications()}
            className="mr-2"
          />
          <label htmlFor="email-notifications">Email notifications</label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="push-notifications"
            checked={notifications.push}
            onChange={() => prefsCubit.togglePushNotifications()}
            className="mr-2"
          />
          <label htmlFor="push-notifications">Push notifications</label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="sms-notifications"
            checked={notifications.sms}
            onChange={() => prefsCubit.toggleSmsNotifications()}
            className="mr-2"
          />
          <label htmlFor="sms-notifications">SMS notifications</label>
        </div>
      </div>
    </div>
  );
}

// Component that only renders when language changes
function LanguageComponent() {
  const renderCount = useRef(0);
  const [{ language }, prefsCubit] = useBloc(UserPreferencesCubit);
  
  useEffect(() => {
    renderCount.current += 1;
  });

  const languages = ['en', 'es', 'fr', 'de', 'ja'];

  return (
    <div className="p-4 border rounded-lg relative mb-4 bg-white dark:bg-gray-800">
      <span className="render-badge px-2 py-1 bg-amber-500 text-white text-xs rounded-full">
        Renders: {renderCount.current}
      </span>
      <h3 className="font-bold mb-2">Language Component</h3>
      <p className="mb-2">This component only uses the <code>language</code> property.</p>
      <p className="mb-4">Current language: <strong>{language}</strong></p>
      <select
        value={language}
        onChange={(e) => prefsCubit.setLanguage(e.target.value)}
        className="px-3 py-1 border rounded"
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {lang.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}

// Component that only renders when refresh rate changes
function RefreshRateComponent() {
  const renderCount = useRef(0);
  const [{ refreshRate }, prefsCubit] = useBloc(UserPreferencesCubit);
  
  useEffect(() => {
    renderCount.current += 1;
  });

  return (
    <div className="p-4 border rounded-lg relative mb-4 bg-white dark:bg-gray-800">
      <span className="render-badge px-2 py-1 bg-red-500 text-white text-xs rounded-full">
        Renders: {renderCount.current}
      </span>
      <h3 className="font-bold mb-2">Refresh Rate Component</h3>
      <p className="mb-2">This component only uses the <code>refreshRate</code> property.</p>
      <p className="mb-4">Current refresh rate: <strong>{refreshRate}s</strong></p>
      <input
        type="range"
        min="15"
        max="120"
        step="15"
        value={refreshRate}
        onChange={(e) => prefsCubit.setRefreshRate(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

// Component showing all state for reference
function StateInspector() {
  const [state] = useBloc(UserPreferencesCubit);

  return (
    <div className="p-4 border rounded-lg mb-4 bg-white dark:bg-gray-800">
      <h3 className="font-bold mb-2">Current State</h3>
      <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto text-xs">
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
}

// Main demo component
function DependencyTrackingDemo() {
  return (
    <div className="dependency-tracking-demo p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Dependency Tracking Demo</h1>
      
      <p className="mb-6">
        This demo shows Blac's automatic dependency tracking. Each component below only 
        re-renders when the specific properties it uses change. Notice how the render count 
        only increases for components whose data changes.
      </p>
      
      <div className="mb-8">
        <StateInspector />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ThemeComponent />
        <FontSizeComponent />
        <NotificationsComponent />
        <LanguageComponent />
        <RefreshRateComponent />
      </div>
      
      <style>{`
        .dependency-tracking-demo .render-badge {
          position: absolute;
          right: 10px;
          top: 0;
          transform: translateY(-50%);
          display: inline-block;
        }
      `}</style>
    </div>
  );
}