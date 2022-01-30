---
sidebar_position: 1
---

# Bloc . Basics

> A Bloc is a class that manages a peace of state, to update the state you add events to the Bloc.

A key feature and limitation of a Bloc is that you do not pass the new state to the Bloc, instead you add the event to add to the Bloc, and a "handler" then sets the new state. This makes the Bloc highly predictable and easy to test.

If you are familiar with redux, this is like a reducer and actions.


## Create a Bloc 
Create a new class extending the Bloc class and pass the initial state to the `super` constructor, if you do not define the constructor you need to pass the state when initiating your Bloc.

```ts title="CounterEvent.ts"
enum CounterEvent {
  Increment = 'Increment',
  Decrement = 'Decrement',
}

class CounterBloc extends Bloc<CounterEvent, number> {
  constructor() {
    super(0);
  }
}
```

### Add events to the Bloc
Put this to use in your UI using the `useBloc` hook, add the event to the bloc with the `add` method for example:
```ts {5} title="Count.tsx"
const Count = () => {
  const [state, bloc] = useBloc(CounterBloc, { create: () => new CounterBloc() });

  const handleClick = () => {
    bloc.add(CounterEvent.Increment);
  };

  return <button onClick={handleClick}>{state}</button>;
};
```

### Handle events in the Bloc
Now we need to react to that event being added to the Bloc, we do this with `this.on`. The first argument is the event we are listening for, the second argument is the handler function that will be called when the event is added to the Bloc.

In the handler function you have access to the `emit` function with which you can update the state of the Bloc.

```ts {6-8} title="CounterEvent.ts"
...
class CounterBloc extends Bloc<CounterEvent, number> {
  constructor() {
    super(0);

    this.on(CounterEvent.Increment, (event, emit) => {
      emit(this.state + 1);
    });
  }
}
```

Thats the basics, you can read more about the Bloc and best practices when using it in the [Bloc Advanced](/docs/blac-core/bloc-advanced) section.

You can get the code here: https://github.com/jsnanigans/blac-basic-bloc


### Exercises
Solidify what you learned here by completing this exercise.

#### 1. Decrement
- [ ] Add a second button to the `Count` component that decrements the count.
- [ ] Add a handler for the decrement event.
