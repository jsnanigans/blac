
## Inspiration
> "standing on the shoulders of giants"

### BLoC Pattern

Google introduced BLoC (Business Logic Components) as a design pattern to streamline state and event management in Flutter development. By isolating the business logic from the UI, BLoC enhances code clarity, simplifies maintenance, and improves the testability of Flutter applications.

Blac takes inspiration from the BLoC pattern for how business logic and state are managed, but extends it to include a Cubit class that is more ergonomic and easier to use than the Bloc class. The idea for the Cubit class was inspired by the [flutter_bloc](https://bloclibrary.dev/) library. The first version of Blac was actually a port of the flutter_bloc library from Dart/Flutter to TypeScript/React but has since diverged and has become its own unique library.

### React

Although Blac is framework agnostic, it was initially created to be used with React. the `@blac/react` package provides a React hook for using Blac in your React components, solving some of my frustrations with React's state and lifecycle management.

> Although I have some frustrations with React, I still love working with it and use it for most of my projects. This list is not meant to be a critique, but rather an explanation of why Blac was created.

#### useState
The bread and butter of React state management, useState is great for managing the state of a single component, as long as the component is very simple and the state is not shared with other components.
During development, I often find myself reaching the limit of what I am comfortable with useState, usually when I reach a unspecific amount of `useState` calls and my component becomes cluttered with `setState` calls.

#### useEffect
Using `useEffect` for lifecycle management is confusing and error prone, not to mention the pain it is to test with unit tests.
Handling side effects is incredibly error prone and hard to reason about.

#### Context API
Although the Context API is a godsend to avoid prop drilling and setting the context for a branch in the render tree. When overused it can lead to a tight coupling between components and make it hard to move or reuse components outside of the current context tree.

#### Component Props
Most of the props passed to components are references to the business logic and state of the component. This is mostly just boilerplate to pass the state and callbacks to the component. When refactoring, updating props takes up a lot of time and causes a lot of noise in the code.
