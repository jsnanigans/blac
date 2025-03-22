# Blac Demo React App

A beautiful, interactive demonstration of the Blac state management library with React, showcasing the "cute neon cyberpunk" aesthetic with a modern twist.

![Blac Demo App](public/blac-demo-screenshot.png)

## 🚀 Introduction

The Blac Demo React application showcases the power, simplicity, and flexibility of the Blac state management library in real-world scenarios. This application demonstrates how Blac's unidirectional data flow and elegant state management patterns make building interactive, responsive applications a breeze.

### Key Features

- ✨ Elegant "cute neon cyberpunk" UI design with modern patterns
- 🎯 Multiple practical examples showing different Blac patterns
- 🧪 Code samples with syntax highlighting and live demos
- 🔄 Smart instance management demonstrations
- 🐾 Interactive Pet Finder demonstrating complex state flows
- 🎨 Light/dark theme toggle with smooth transitions
- 📱 Fully responsive design for all screen sizes
- 👓 Accessible color schemes and component design
- 🗺️ Routing powered by @tanstack/react-router

### Target Audience

This demo is designed for:

- React developers looking for a more intuitive state management solution
- Teams seeking to understand the benefits of Blac over other libraries
- Developers who want to see practical Blac implementations
- Anyone interested in modern, clean state management patterns

## 💻 Installation

Clone the repository and install dependencies:

```bash
# Navigate to the demo app directory
cd apps/demo-react

# Install dependencies
npm install

# Start the development server
npm run dev
```

The development server will run on port 3033. Verify successful installation by navigating to `http://localhost:3033` in your browser.

## 🧠 Core Concepts

### The Blac Pattern

Blac implements a unidirectional data flow pattern that separates business logic from UI components:

1. **UI Components**: Pure renderers that display state and dispatch user intentions
2. **Blocs/Cubits**: State containers that handle business logic and state transitions
3. **State**: Immutable data that flows from Blocs to UI components

```tsx
// Example of the Blac pattern in Counter component
import { useBloc } from '@blac/react';
import { Cubit } from 'blac-next';

// Business logic container
class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

// Pure UI component
function Counter() {
  const [{ count }, { increment }] = useBloc(CounterBloc);
  return (
    <button onClick={increment}>
      {count}
    </button>
  );
}
```

### State Management Patterns

The demo app showcases three key state management patterns:

1. **Shared State**: Default pattern where all components share a single instance
2. **Isolated State**: Each component gets its own state instance
3. **Persistent State**: State persists even when no components are using it

### Arrow Functions Requirement

⚠️ **Important**: All methods in Bloc or Cubit classes must use arrow function syntax:

```tsx
// Correct way (will maintain context)
increment = () => {
  this.emit({ count: this.state.count + 1 });
};

// Incorrect way (will lose 'this' context)
increment() { 
  this.emit({ count: this.state.count + 1 });
}
```

## 🧩 API Reference

### Core Classes

| Name | Type | Description |
|------|------|-------------|
| `Cubit<S, P>` | Class | Simple state container with `emit()` and `patch()` methods |
| `Bloc<S, A, P>` | Class | Action-based state container with reducer pattern |
| `BlocBase<S, P>` | Class | Base class for state containers |

### React Hooks

| Name | Type | Description |
|------|------|-------------|
| `useBloc<B>()` | Hook | Connect React components to a Bloc |

### Key Methods

| Name | Belongs To | Description |
|------|------------|-------------|
| `emit(state)` | Cubit/Bloc | Replace the entire state |
| `patch(partialState)` | Cubit/Bloc | Update specific state properties |
| `add(action)` | Bloc | Dispatch an action to the reducer |

## 📋 Practical Use Cases

### Counter Example

A simple counter demonstrating basic state management:

```tsx
// Basic counter with shared state
class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}
```

### Pet Finder Application

A more complex example showing async data handling:

```tsx
// PetfinderBloc excerpt
export class PetfinderBloc extends Cubit<PetfinderState> {
  searchAnimals = async () => {
    try {
      // Show loading state
      this.patch({ 
        loadingState: { 
          ...this.state.loadingState,
          isInitialLoading: true 
        } 
      });
      
      // Fetch data
      const response = await petfinderAPI.getAnimals(this.state.searchParams);
      
      // Update state with results
      this.patch({
        animals: response.animals,
        loadingState: { 
          ...this.state.loadingState,
          isInitialLoading: false 
        },
        pagination: {
          currentPage: response.pagination.current_page,
          totalPages: response.pagination.total_pages,
          totalCount: response.pagination.total_count,
        },
      });
    } catch (error) {
      // Handle errors
      this.patch({
        loadingState: { 
          ...this.state.loadingState,
          isInitialLoading: false 
        },
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };
}
```

### Theme Toggling

Example of using Blac for application-wide settings:

```tsx
class ThemeCubit extends Cubit<{ theme: 'light' | 'dark' }> {
  static keepAlive = true; // Keep the theme state persistent
  
  constructor() {
    // Initialize from localStorage or default to system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    super({ theme: initialTheme as 'light' | 'dark' });
  }

  toggleTheme = () => {
    const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    this.emit({ theme: newTheme });
  };
}
```

## 🔧 Advanced Features

### Fine-Grained Dependency Tracking

Blac only re-renders components when accessed properties change:

```tsx
function UserProfile() {
  const [state, userBloc] = useBloc(UserBloc);
  
  // Only re-renders when state.name changes
  return <h1>{state.name}</h1>;
}
```

### Custom Dependency Selection

Control exactly which state changes trigger re-renders:

```tsx
const [state, bloc] = useBloc(TodoBloc, {
  dependencySelector: (state) => [
    state.todos.length, // Re-render when todo count changes
    state.filter        // Re-render when filter changes
  ]
});
```

### Props & Dependency Injection

Pass configuration to blocs during initialization:

```tsx
class ThemeCubit extends Cubit<ThemeState, ThemeProps> {
  constructor(props: ThemeProps) {
    super({ theme: props.defaultTheme });
  }
}

// In component:
const [state, bloc] = useBloc(ThemeCubit, {
  props: { defaultTheme: 'dark' }
});
```

## 🌟 Best Practices

1. **Separate Business Logic**: Keep business logic in Blocs, UI logic in components
2. **Use Arrow Functions**: Always use arrow functions for methods in Bloc/Cubit classes
3. **Smart Instance Management**: Choose the right instance pattern for your needs
4. **Predictable State Changes**: Make state transitions explicit through well-named methods
5. **Proper Error Handling**: Handle errors gracefully within your Blocs
6. **Single Responsibility**: Each Bloc should manage a single aspect of your application state
7. **TypeScript Integration**: Leverage TypeScript for better type safety and development experience

## 🛠️ Technology Stack

This demo app is built with:

- **React 18.3**: Using the latest React features
- **TypeScript**: For type safety and better developer experience
- **Vite**: Fast, modern build tool
- **TailwindCSS**: For styling with our custom "cute neon cyberpunk" theme
- **@tanstack/react-router**: Type-safe routing solution
- **React Syntax Highlighter**: For code samples and demos

## 📄 License

MIT

---

## 👨‍💻 Contributors

- The Blac Team
- Open Source Contributors

## 🙏 Acknowledgements

- React Team
- TypeScript Team
- Vite & Vitest
- TailwindCSS
