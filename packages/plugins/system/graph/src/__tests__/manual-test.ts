/**
 * Manual test script to verify GraphPlugin functionality
 * Run with: pnpm tsx src/__tests__/manual-test.ts
 */

import { Blac } from '@blac/core';
import { Cubit, Bloc } from '@blac/core';
import { GraphPlugin } from '../GraphPlugin';

// Simple Counter Cubit
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };
}

// User state interface
interface UserState {
  name: string;
  age: number;
  email: string;
}

// User Cubit with object state
class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      name: 'Alice',
      age: 30,
      email: 'alice@example.com',
    });
  }

  updateName = (name: string) => {
    this.emit({ ...this.state, name });
  };

  updateAge = (age: number) => {
    this.emit({ ...this.state, age });
  };
}

// Test events
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

// Counter Bloc (event-driven)
class CounterBloc extends Bloc<number, IncrementEvent | ResetEvent> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(ResetEvent, (_event, emit) => {
      emit(0);
    });
  }

  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };

  reset = () => {
    this.add(new ResetEvent());
  };
}

// Main test function
async function test() {
  console.log('='.repeat(60));
  console.log('GraphPlugin Manual Test');
  console.log('='.repeat(60));

  // 1. Register the plugin
  console.log('\n1. Registering GraphPlugin...');
  const plugin = new GraphPlugin({
    throttleInterval: 50, // Faster for testing
    maxStateDepth: 2,
    maxStateStringLength: 100,
  });
  const blac = Blac.instance;
  blac.plugins.add(plugin);
  console.log('✅ Plugin registered');

  // 2. Subscribe to graph updates
  console.log('\n2. Subscribing to graph updates...');
  let updateCount = 0;
  const unsubscribe = plugin.subscribeToGraph((snapshot) => {
    updateCount++;
    console.log(`\n📊 Graph Update #${updateCount}:`);
    console.log(`   Nodes: ${snapshot.nodes.length}`);
    console.log(`   Edges: ${snapshot.edges.length}`);
    console.log(`   Timestamp: ${snapshot.timestamp}`);

    // Show node details
    const rootNode = snapshot.nodes.find((n) => n.type === 'root');
    if (rootNode && rootNode.type === 'root') {
      console.log(`   Root Stats:`);
      console.log(`     - Total Blocs: ${rootNode.stats.totalBlocs}`);
      console.log(`     - Active: ${rootNode.stats.activeBlocs}`);
      console.log(`     - Disposed: ${rootNode.stats.disposedBlocs}`);
      console.log(`     - Total Consumers: ${rootNode.stats.totalConsumers}`);
    }

    const blocNodes = snapshot.nodes.filter(
      (n) => n.type === 'bloc' || n.type === 'cubit'
    );
    if (blocNodes.length > 0) {
      console.log(`   Bloc/Cubit Nodes:`);
      blocNodes.forEach((node) => {
        if (node.type === 'bloc' || node.type === 'cubit') {
          console.log(
            `     - ${node.name} (${node.type}): consumers=${node.consumerCount}, lifecycle=${node.lifecycle}`
          );
        }
      });
    }

    const stateRootNodes = snapshot.nodes.filter((n) => n.type === 'state-root');
    if (stateRootNodes.length > 0) {
      console.log(`   State Root Nodes:`);
      stateRootNodes.forEach((node) => {
        if (node.type === 'state-root') {
          console.log(`     - valueType: ${node.valueType}`);
        }
      });
    }

    const statePropertyNodes = snapshot.nodes.filter((n) =>
      n.type === 'state-object' ||
      n.type === 'state-array' ||
      n.type === 'state-array-item' ||
      n.type === 'state-primitive'
    );
    if (statePropertyNodes.length > 0) {
      console.log(`   State Property Nodes: ${statePropertyNodes.length} total`);
    }
  });

  // Wait for initial update
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 3. Create a CounterCubit
  console.log('\n3. Creating CounterCubit...');
  const counter = blac.getBloc(CounterCubit);
  const counterSub = counter.subscribe((state) => {
    console.log(`   Counter state: ${state}`);
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  // 4. Update counter state
  console.log('\n4. Incrementing counter...');
  counter.increment();
  await new Promise((resolve) => setTimeout(resolve, 100));

  counter.increment();
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 5. Create a UserCubit
  console.log('\n5. Creating UserCubit...');
  const user = blac.getBloc(UserCubit);
  const userSub = user.subscribe((state) => {
    console.log(`   User state:`, state);
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  // 6. Update user state
  console.log('\n6. Updating user...');
  user.updateName('Bob');
  await new Promise((resolve) => setTimeout(resolve, 100));

  user.updateAge(35);
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 7. Create a CounterBloc (event-driven)
  console.log('\n7. Creating CounterBloc...');
  const blocCounter = blac.getBloc(CounterBloc);
  const blocSub = blocCounter.subscribe((state) => {
    console.log(`   Bloc counter state: ${state}`);
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  // 8. Trigger events
  console.log('\n8. Triggering Bloc events...');
  blocCounter.increment(5);
  await new Promise((resolve) => setTimeout(resolve, 100));

  blocCounter.increment(3);
  await new Promise((resolve) => setTimeout(resolve, 100));

  blocCounter.reset();
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 9. Get final snapshot
  console.log('\n9. Getting final snapshot...');
  const finalSnapshot = plugin.getGraphSnapshot();
  console.log('\n📸 Final Snapshot:');
  console.log(JSON.stringify(finalSnapshot, null, 2));

  // 10. Cleanup
  console.log('\n10. Cleaning up...');
  counterSub();
  userSub();
  blocSub();
  unsubscribe();

  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log('\n✅ Test complete!');
  console.log(`   Total graph updates: ${updateCount}`);
  console.log('='.repeat(60));
}

// Run the test
test().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
