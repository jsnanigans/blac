# Theme Toggle Example

The Theme Toggle example demonstrates how to use Blac for application-wide settings with persistent state. This is a common use case for features like theme switching, language selection, or user preferences.

## Persistent State Pattern

This example uses the `keepAlive` static property to ensure that the theme state persists even when no components are using it. This is useful for settings that should be preserved throughout the application lifecycle.

## Implementation

### Theme Cubit

```tsx
import { Cubit } from 'blac-next';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  systemPreference: Theme | null;
}

class ThemeCubit extends Cubit<ThemeState> {
  // Make this instance persistent
  static keepAlive = true;
  
  constructor() {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemPreference = prefersDark ? 'dark' : 'light';
    
    // Use saved theme or fall back to system preference
    const initialTheme = savedTheme || systemPreference;
    
    super({
      theme: initialTheme,
      systemPreference
    });
    
    // Apply theme to document
    this.applyTheme(initialTheme);
    
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.handleSystemPreferenceChange);
  }
  
  // Toggle between light and dark themes
  toggleTheme = () => {
    const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  };
  
  // Set a specific theme
  setTheme = (theme: Theme) => {
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Update state
    this.patch({ theme });
    
    // Apply to document
    this.applyTheme(theme);
  };
  
  // Use system preference
  useSystemPreference = () => {
    // Remove from localStorage
    localStorage.removeItem('theme');
    
    // Update state to use system preference
    this.patch({ theme: this.state.systemPreference || 'light' });
    
    // Apply to document
    this.applyTheme(this.state.systemPreference || 'light');
  };
  
  // Handle system preference changes
  handleSystemPreferenceChange = (e: MediaQueryListEvent) => {
    const newSystemPreference = e.matches ? 'dark' : 'light';
    
    this.patch({ systemPreference: newSystemPreference });
    
    // If we're using system preference, update the theme
    if (!localStorage.getItem('theme')) {
      this.patch({ theme: newSystemPreference });
      this.applyTheme(newSystemPreference);
    }
  };
  
  // Apply theme to document
  private applyTheme(theme: Theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
  }
}

export default ThemeCubit;
```

### Theme Toggle Component

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import ThemeCubit from './ThemeCubit';

function ThemeToggle() {
  const [state, bloc] = useBloc(ThemeCubit);
  
  return (
    <div className="theme-toggle">
      <h2>Theme Settings</h2>
      
      <div className="toggle-buttons">
        <button
          className={`theme-button ${state.theme === 'light' ? 'active' : ''}`}
          onClick={() => bloc.setTheme('light')}
        >
          ☀️ Light
        </button>
        
        <button
          className={`theme-button ${state.theme === 'dark' ? 'active' : ''}`}
          onClick={() => bloc.setTheme('dark')}
        >
          🌙 Dark
        </button>
        
        <button
          className="theme-button system"
          onClick={bloc.useSystemPreference}
        >
          💻 Use System Preference
        </button>
      </div>
      
      <div className="theme-info">
        <p>Current theme: <strong>{state.theme}</strong></p>
        <p>System preference: <strong>{state.systemPreference}</strong></p>
      </div>
    </div>
  );
}

export default ThemeToggle;
```

### Simple Theme Toggle Button

A simpler component that just provides a toggle button:

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import ThemeCubit from './ThemeCubit';

function ThemeToggleButton() {
  const [{ theme }, bloc] = useBloc(ThemeCubit);
  
  return (
    <button 
      className="theme-toggle-button" 
      onClick={bloc.toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

export default ThemeToggleButton;
```

### Using the Theme in Components

You can access the theme state in any component:

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import ThemeCubit from './ThemeCubit';

function ThemedComponent() {
  const [{ theme }] = useBloc(ThemeCubit);
  
  return (
    <div className={`themed-component ${theme}-theme`}>
      <h3>This component is using the {theme} theme</h3>
      <p>Content adapts to the current theme automatically.</p>
    </div>
  );
}

export default ThemedComponent;
```

## CSS Implementation

Here's a simple CSS implementation to support the theme switching:

```css
/* Base variables */
:root {
  --light-bg: #ffffff;
  --light-text: #333333;
  --light-primary: #4a90e2;
  --light-secondary: #f0f0f0;
  
  --dark-bg: #222222;
  --dark-text: #f0f0f0;
  --dark-primary: #61dafb;
  --dark-secondary: #444444;
}

/* Light theme (default) */
:root, .light-theme {
  --bg-color: var(--light-bg);
  --text-color: var(--light-text);
  --primary-color: var(--light-primary);
  --secondary-color: var(--light-secondary);
}

/* Dark theme */
.dark-theme {
  --bg-color: var(--dark-bg);
  --text-color: var(--dark-text);
  --primary-color: var(--dark-primary);
  --secondary-color: var(--dark-secondary);
}

/* Apply variables */
body {
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Theme toggle buttons */
.theme-button {
  background-color: var(--secondary-color);
  color: var(--text-color);
  border: 1px solid var(--primary-color);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-button.active {
  background-color: var(--primary-color);
  color: var(--bg-color);
}
```

## Key Takeaways

1. **Persistent State**: The `keepAlive` static property ensures that the theme state persists even when no components are using it.

2. **Initialization Logic**: The `ThemeCubit` constructor handles the initial state by checking localStorage and system preferences.

3. **Side Effects**: The cubit manages side effects like updating the DOM and saving to localStorage.

4. **Event Listeners**: The cubit sets up and responds to system preference changes.

5. **Simple API**: Components have a simple API to interact with the theme state. 