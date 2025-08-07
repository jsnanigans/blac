import React from 'react';
import {
  Search,
  ChevronRight,
  Package,
  Layers,
  Zap,
  Puzzle,
} from 'lucide-react';

export function ApiPage() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const apiSections = [
    {
      title: 'Core',
      icon: Package,
      items: [
        {
          name: 'Cubit',
          description: 'Simple state container with direct state emission',
        },
        {
          name: 'Bloc',
          description: 'Event-driven state container with event handlers',
        },
        {
          name: 'BlocBase',
          description: 'Base class for all state containers',
        },
        {
          name: 'Blac',
          description: 'Global configuration and instance management',
        },
      ],
    },
    {
      title: 'React Hooks',
      icon: Layers,
      items: [
        {
          name: 'useBloc',
          description: 'Hook for using Bloc/Cubit in React components',
        },
        {
          name: 'useExternalBlocStore',
          description: 'Hook for external Bloc instances',
        },
      ],
    },
    {
      title: 'Utilities',
      icon: Zap,
      items: [
        { name: 'BlocTest', description: 'Testing utilities for Bloc/Cubit' },
        { name: 'MockCubit', description: 'Mock implementation for testing' },
        {
          name: 'Selectors',
          description: 'Performance optimization with selectors',
        },
      ],
    },
    {
      title: 'Plugins',
      icon: Puzzle,
      items: [
        {
          name: 'PersistencePlugin',
          description: 'Automatic state persistence',
        },
        {
          name: 'RenderLoggingPlugin',
          description: 'Debug render performance',
        },
        { name: 'Custom Plugins', description: 'Create your own plugins' },
      ],
    },
  ];

  const filteredSections = apiSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="container py-10">
      {/* Header */}
      <div className="mx-auto max-w-[980px] mb-8">
        <h1 className="text-3xl font-bold mb-4">API Reference</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Complete API documentation for BlaC state management framework.
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search API..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* API Sections */}
      <div className="mx-auto max-w-[980px]">
        {filteredSections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>

              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.name}
                    className="group border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-mono font-semibold group-hover:text-primary">
                          {item.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Examples */}
      <section className="mx-auto max-w-[980px] mt-12">
        <h2 className="text-2xl font-bold mb-6">Quick Examples</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-3">Creating a Cubit</h3>
            <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-md text-xs overflow-x-auto">
              <code>{`class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ todos: [], filter: 'all' });
  }
  
  addTodo = (text: string) => {
    this.patch({
      todos: [...this.state.todos, {
        id: Date.now(),
        text,
        completed: false
      }]
    });
  };
}`}</code>
            </pre>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-3">Using with React</h3>
            <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-md text-xs overflow-x-auto">
              <code>{`function TodoList() {
  const [state, cubit] = useBloc(TodoCubit);
  
  return (
    <div>
      {state.todos.map(todo => (
        <TodoItem 
          key={todo.id}
          todo={todo}
        />
      ))}
    </div>
  );
}`}</code>
            </pre>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-3">Event-Driven Bloc</h3>
            <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-md text-xs overflow-x-auto">
              <code>{`class AuthBloc extends Bloc<AuthState, AuthEvent> {
  constructor() {
    super({ status: 'idle' });
    
    this.on(LoginEvent, async (event, emit) => {
      emit({ status: 'loading' });
      try {
        const user = await api.login(event.credentials);
        emit({ status: 'authenticated', user });
      } catch (error) {
        emit({ status: 'error', error });
      }
    });
  }
}`}</code>
            </pre>
          </div>

          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-3">Testing</h3>
            <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-md text-xs overflow-x-auto">
              <code>{`describe('CounterCubit', () => {
  beforeEach(() => BlocTest.setUp());
  afterEach(() => BlocTest.tearDown());
  
  it('increments count', () => {
    const cubit = BlocTest.createBloc(CounterCubit);
    cubit.increment();
    expect(cubit.state).toBe(1);
  });
});`}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
