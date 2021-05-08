
# BLoC React

[![codecov](https://codecov.io/gh/jsnanigans/bloc-react/branch/main/graph/badge.svg?token=0FPH6ZMZD3)](https://codecov.io/gh/jsnanigans/bloc-react)
[![liscence](https://img.shields.io/badge/license-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Known Vulnerabilities](https://snyk.io/test/github/jsnanigans/bloc-react/badge.svg)](https://snyk.io/test/github/jsnanigans/bloc-react)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=jsnanigans_bloc-react&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=jsnanigans_bloc-react)
---
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=jsnanigans_bloc-react&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=jsnanigans_bloc-react)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=jsnanigans_bloc-react&metric=security_rating)](https://sonarcloud.io/dashboard?id=jsnanigans_bloc-react)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=jsnanigans_bloc-react&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=jsnanigans_bloc-react)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=jsnanigans_bloc-react&metric=bugs)](https://sonarcloud.io/dashboard?id=jsnanigans_bloc-react)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=jsnanigans_bloc-react&metric=code_smells)](https://sonarcloud.io/dashboard?id=jsnanigans_bloc-react)

TypeScript BLoC pattern implementation for react using RxJS and heavily inspired by flutter_react - https://bloclibrary.dev

The BLoC Pattern (**B**usiness **Lo**gic **C**omponent) is a battle-tested design pattern for state management coming from Flutter and Dart. It tries to separate business logic from UI as much as possible while still being simple and flexible.

Everything revolves around [**subjects**](https://rxjs-dev.firebaseapp.com/guide/subject) which are native to Dart, for JS there is a solid implementation by RxJS.


# Quickstart
### 1. Create a new **Bloc/Cubit**
```typescript  
// CounterCubit.ts  
export default class CounterCubit extends Cubit<number> {  
 increment = (): void => { this.emit(this.state + 1); };}  
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
 const [count, { increment }] = useBloc(CounterCubit); return <button onClick={() => increment()}>count is: {count}</button>; }  
```  


# Documentation
[TODO]
## BlocReact
The `BlocReact` class handles the global state and manages all communication between individual BLoCs.
When initializing pass all the BLoCs for the global state in an array as first parameter.
```typescript  
const state = new BlocReact([new MyBloc(), new MyCubit()]);  
```  

You can add an observer to all state changes *global and local*
```typescript  
state.observer = new BlocObserver({
  // onChange is called for all changes (Cubits and Blocs)
  onChange: (bloc, event) => console.log({bloc, event}),
  // onTransition is called only when Blocs transition from one state to another,
  // it is not called for Cubits
  onTransition: (bloc, event) => console.log({bloc, event}),
});
```  
## Cubit
A Cubit is a simplofied version `Bloc` class. Create your custom Cubit by extending the `Cubit` class, pass the initial state to the `super` constructor.

The Cubits' state is updated by calling the `this.emit` method with the new state.

```typescript
export default class CounterCubit extends Cubit<number> {  
  constructor() {  
    super(0);  
  }  
  
  increment = (): void => {  
    this.emit(this.state + 1);  
  };  
  decrement = (): void => {  
    this.emit(this.state - 1);  
  };  
}
```

## Bloc
Most of the time the `Cubit` class will be the easiest way to manage a peace of state but for the more critical parts of your application where there can be various reasons why the state changes to the same value, for example user authentication. It might be nice to know if the user got logged out because an error occured, the token expired or if they just clickd on the logout button.
This is especially helpful when debugging some unexpected behaviour.

in the `BlocObserver` you can then use the `onTransition` to see why the state changes, it will pass the previous state, the event itself and the next state.

```typescript
export enum AuthEvent {  
  unknown = "unknown",  
  authenticated = "authenticated",  
  unauthenticated = "unauthenticated",  
}  
  
export default class AuthBloc extends Bloc<AuthEvent, boolean> {  
  constructor() {  
    super(false)  
  
    this.mapEventToState = (event) => {  
      switch (event) {  
        case AuthEvent.unknown:  
          return false;  
        case AuthEvent.unauthenticated:  
          return false;  
        case AuthEvent.authenticated:  
          return true;  
    }
  };
}
```

In your app you can then update the state by "adding" an event. Use the `useBloc` hook to get access to the BLoC class and add an event.

```ts
const Component: FC = (): ReactElement => {  
  const [state, bloc] = useBloc<AuthBloc>(AuthBloc);  
  return <>  
    {state === true && <Button onClick={() => bloc.add(AuthEvent.unauthenticated)}>Logout</Button>}  
  </>  
}
```

## useBloc
[TODO: Add docs for hook]

## BlocProvider
[TODO: Add docs for hook alternative for class components]

## BlocBuilder
[TODO: Add docs for local state]