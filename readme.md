# BLoC React
[Coverage: 100%]

TypeScript BLoC pattern implementation for react using RxJS and heavily inspired by flutter_react - https://bloclibrary.dev

The BLoC Pattern (**B**usiness **Lo**gic **C**omponent) is a battle-tested design pattern for state management coming from Flutter and Dart. It tries to separate business logic from UI as much as possible while still being simple and flexible.

Everything revolves around [**subjects**](https://rxjs-dev.firebaseapp.com/guide/subject) which are native to Dart, for JS there is a solid implementation by RxJS.


# Quickstart
[TODO: Add plain JS examples]
### 1. Create a new **Bloc/Cubit**
```typescript
// CounterCubit.ts
export default class CounterCubit extends Cubit<number> {
  increment = (): void => {
    this.emit(this.state + 1);
  };
}
```

### 2. Create a new **BlocReact** instance and export `useBloc` from it
```typescript
// state.ts
const state = new BlocReact([new CounterCubit(0)]);
export const { useBloc } = state;
```

### 3. Use the hook to access the state and class methods
```typescript
// CounterButton.tsx
import { useBloc } from "../state";

export default function CounterButton() {
  const [count, { increment }] = useBloc(CounterCubit);
  return <button onClick={() => increment()}>count is: {count}</button>;  
}
```


# Documentation
[TODO]
## BlocReact
[TODO]
## Bloc
[TODO]
## Cubit
[TODO]
## BlocObserver
[TODO]