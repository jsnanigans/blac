import { useBloc } from '@blac/react';
import { GenericBloc, type Item } from './GenericBloc';

// Specific item type for testing
type Product = Item & {
  price: number;
  category: string;
};

const testProducts: Product[] = [
  { id: '1', label: 'Apple', price: 1.99, category: 'Fruit' },
  { id: '2', label: 'Banana', price: 0.99, category: 'Fruit' },
  { id: '3', label: 'Carrot', price: 0.79, category: 'Vegetable' },
];

/**
 * Test component to verify type inference with generic blocs
 * This should reproduce the issue from the consuming project
 */
export function GenericBlocTest() {
  // Explicitly provide the type parameter to useBloc for proper inference:
  // - state will be GenericBlocState<Product>
  // - bloc will be GenericBloc<Product>
  const [state, bloc] = useBloc<GenericBloc<Product>>(GenericBloc, {
    staticProps: testProducts,
  });

  // These property accesses should all be correctly typed
  // If types aren't inferred, we'll get errors here
  const selectedItem = state.selectedItem; // Should be Product | null
  const items = state.items; // Should be Product[]

  // Method calls should also be correctly typed
  const handleSelect = (item: Product) => {
    bloc.selectItem(item); // Should accept Product
  };

  return (
    <div className="stack-md">
      <h2>Generic Bloc Type Inference Test</h2>

      <div>
        <h3>Items:</h3>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button onClick={() => handleSelect(item)}>
                {item.label} - ${item.price} ({item.category})
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedItem && (
        <div>
          <h3>Selected:</h3>
          <p>
            {selectedItem.label} - ${selectedItem.price} (
            {selectedItem.category})
          </p>
          <button onClick={bloc.clearSelection}>Clear</button>
        </div>
      )}

      {!selectedItem && <p>No item selected</p>}
    </div>
  );
}
