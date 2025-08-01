import React, { useEffect, useState } from 'react';
import { Bloc, Cubit, BlocStreams } from '@blac/core';
import { 
  useBloc, 
  useBlocStream, 
  useBlocEvents, 
  useDerivedState, 
  useCombinedState 
} from '@blac/react';

// Example: Search with debouncing
interface SearchState {
  query: string;
  results: string[];
  isLoading: boolean;
}

class SearchCubit extends Cubit<SearchState> {
  constructor() {
    super({ query: '', results: [], isLoading: false });
  }

  updateQuery = (query: string) => {
    this.emit({ ...this.state, query, isLoading: true });
  };

  setResults = (results: string[]) => {
    this.emit({ ...this.state, results, isLoading: false });
  };
}

// Example: Shopping cart with events
abstract class CartEvent {}
class AddItemEvent extends CartEvent {
  constructor(public item: { id: string; name: string; price: number }) {
    super();
  }
}
class RemoveItemEvent extends CartEvent {
  constructor(public itemId: string) {
    super();
  }
}
class ClearCartEvent extends CartEvent {}

interface CartState {
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
}

class CartBloc extends Bloc<CartState, CartEvent> {
  constructor() {
    super({ items: [] });

    this.on(AddItemEvent, (event, emit) => {
      const existingItem = this.state.items.find(i => i.id === event.item.id);
      if (existingItem) {
        emit({
          items: this.state.items.map(i =>
            i.id === event.item.id 
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        });
      } else {
        emit({
          items: [...this.state.items, { ...event.item, quantity: 1 }]
        });
      }
    });

    this.on(RemoveItemEvent, (event, emit) => {
      emit({
        items: this.state.items.filter(i => i.id !== event.itemId)
      });
    });

    this.on(ClearCartEvent, (event, emit) => {
      emit({ items: [] });
    });
  }
}

// Example: User preferences
interface UserState {
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      name: 'Guest',
      email: '',
      preferences: { theme: 'light', notifications: true }
    });
  }

  login = (name: string, email: string) => {
    this.emit({ ...this.state, name, email });
  };

  toggleTheme = () => {
    this.emit({
      ...this.state,
      preferences: {
        ...this.state.preferences,
        theme: this.state.preferences.theme === 'light' ? 'dark' : 'light'
      }
    });
  };
}

// Component Examples
function SearchExample() {
  const { state, bloc, stream } = useBlocStream(SearchCubit);
  
  // Debounced search
  useEffect(() => {
    const abortController = new AbortController();
    
    (async () => {
      // Use debounced stream for API calls
      for await (const debouncedState of BlocStreams.debounce(bloc, 500)) {
        if (abortController.signal.aborted) break;
        
        if (debouncedState.query) {
          // Simulate API call
          const results = await new Promise<string[]>(resolve => 
            setTimeout(() => 
              resolve([
                `Result 1 for "${debouncedState.query}"`,
                `Result 2 for "${debouncedState.query}"`,
                `Result 3 for "${debouncedState.query}"`
              ]), 
              300
            )
          );
          
          bloc.setResults(results);
        } else {
          bloc.setResults([]);
        }
      }
    })();
    
    return () => abortController.abort();
  }, [bloc]);
  
  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-bold mb-2">Search with Debouncing</h3>
      <input
        type="text"
        value={state.query}
        onChange={(e) => bloc.updateQuery(e.target.value)}
        placeholder="Type to search..."
        className="w-full p-2 border rounded"
      />
      {state.isLoading && <p className="mt-2 text-gray-500">Searching...</p>}
      <ul className="mt-2">
        {state.results.map((result, i) => (
          <li key={i} className="p-1">{result}</li>
        ))}
      </ul>
    </div>
  );
}

function CartExample() {
  const [state, bloc] = useBloc(CartBloc);
  const [eventLog, setEventLog] = useState<string[]>([]);
  
  // Track all cart events
  useBlocEvents(CartBloc, {
    onEvent: (event) => {
      const eventName = event.constructor.name;
      setEventLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${eventName}`]);
    }
  });
  
  // Derive total price
  const totalPrice = useDerivedState(
    CartBloc,
    (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  
  // Derive item count
  const itemCount = useDerivedState(
    CartBloc,
    (state) => state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  
  const sampleItems = [
    { id: '1', name: 'Apple', price: 0.99 },
    { id: '2', name: 'Banana', price: 1.29 },
    { id: '3', name: 'Orange', price: 0.89 }
  ];
  
  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-bold mb-2">Shopping Cart with Events</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold">Add Items:</h4>
        <div className="flex gap-2 mt-2">
          {sampleItems.map(item => (
            <button
              key={item.id}
              onClick={() => bloc.add(new AddItemEvent(item))}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {item.name} (${item.price})
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="font-semibold">Cart ({itemCount} items, ${totalPrice.toFixed(2)} total):</h4>
        {state.items.length === 0 ? (
          <p className="text-gray-500">Cart is empty</p>
        ) : (
          <ul className="mt-2">
            {state.items.map(item => (
              <li key={item.id} className="flex justify-between items-center p-2 border-b">
                <span>{item.name} x{item.quantity} = ${(item.price * item.quantity).toFixed(2)}</span>
                <button
                  onClick={() => bloc.add(new RemoveItemEvent(item.id))}
                  className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {state.items.length > 0 && (
          <button
            onClick={() => bloc.add(new ClearCartEvent())}
            className="mt-2 px-3 py-1 bg-gray-500 text-white rounded"
          >
            Clear Cart
          </button>
        )}
      </div>
      
      <div>
        <h4 className="font-semibold">Event Log:</h4>
        <ul className="mt-2 text-sm text-gray-600">
          {eventLog.map((log, i) => (
            <li key={i}>{log}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DashboardExample() {
  const [userState, userBloc] = useBloc(UserCubit);
  const [cartState] = useBloc(CartBloc);
  
  // Combine multiple bloc states
  const dashboardData = useCombinedState(
    { user: UserCubit, cart: CartBloc },
    ({ user, cart }) => ({
      greeting: user.name === 'Guest' ? 'Welcome!' : `Hello, ${user.name}!`,
      theme: user.preferences.theme,
      cartSummary: cart.items.length === 0 
        ? 'Your cart is empty' 
        : `${cart.items.length} items in cart`,
      totalSpent: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    })
  );
  
  return (
    <div className={`p-4 border rounded ${dashboardData.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <h3 className="text-lg font-bold mb-2">Combined State Dashboard</h3>
      
      <div className="mb-4">
        <h4 className="text-xl">{dashboardData.greeting}</h4>
        <p className="text-sm">{dashboardData.cartSummary}</p>
        {dashboardData.totalSpent > 0 && (
          <p className="text-sm">Total: ${dashboardData.totalSpent.toFixed(2)}</p>
        )}
      </div>
      
      <div className="flex gap-2">
        {userState.name === 'Guest' ? (
          <button
            onClick={() => userBloc.login('John Doe', 'john@example.com')}
            className="px-3 py-1 bg-green-500 text-white rounded"
          >
            Login as John
          </button>
        ) : (
          <button
            onClick={() => userBloc.login('Guest', '')}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            Logout
          </button>
        )}
        
        <button
          onClick={() => userBloc.toggleTheme()}
          className="px-3 py-1 bg-purple-500 text-white rounded"
        >
          Toggle Theme
        </button>
      </div>
    </div>
  );
}

export default function GeneratorHooksExample() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Generator-Based React Hooks Examples</h2>
      
      <div className="space-y-6">
        <SearchExample />
        <CartExample />
        <DashboardExample />
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="font-bold mb-2">Key Features Demonstrated:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>useBlocStream</strong>: Debounced search with async iteration</li>
          <li><strong>useBlocEvents</strong>: Event logging and analytics tracking</li>
          <li><strong>useDerivedState</strong>: Computed values (cart total, item count)</li>
          <li><strong>useCombinedState</strong>: Dashboard combining user and cart state</li>
          <li><strong>BlocStreams utilities</strong>: Debouncing for search optimization</li>
        </ul>
      </div>
    </div>
  );
}