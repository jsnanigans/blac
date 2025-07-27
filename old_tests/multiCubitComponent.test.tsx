import { Blac, Cubit } from '@blac/core';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { FC } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useBloc } from '../src';

// Define NameCubit
// Props type for NameCubit
interface NameCubitProps {
  initialName?: string;
}
class NameCubit extends Cubit<{ name: string }, NameCubitProps> {
  static isolated = true;
  constructor(props?: NameCubitProps) {
    super({ name: props?.initialName ?? 'Anonymous' });
  }

  setName = (newName: string) => {
    this.patch({ name: newName });
  };
}

// Props type for AgeCubit
interface AgeCubitProps {
  initialAge?: number;
}
class AgeCubit extends Cubit<{ age: number }, AgeCubitProps> {
  static isolated = true;
  constructor(props?: AgeCubitProps) {
    super({ age: props?.initialAge ?? 0 });
  }

  setAge = (newAge: number) => {
    this.patch({ age: newAge });
  };

  incrementAge = () => {
    this.patch({ age: this.state.age + 1 });
  };
}

let componentRenderCount = 0;

const MultiCubitComponent: FC<{
  initialName?: string;
  initialAge?: number;
}> = ({ initialName, initialAge }) => {
  const [nameState, nameCubit] = useBloc(NameCubit, {
    props: { initialName },
  });
  const [ageState, ageCubit] = useBloc(AgeCubit, {
    props: { initialAge },
  });

  componentRenderCount++;

  return (
    <div>
      <div data-testid="name">Name: {nameState.name}</div>
      <div data-testid="age">Age: {ageState.age}</div>
      <button
        data-testid="set-name"
        onClick={() => {
          nameCubit.setName('John Doe');
        }}
      >
        Set Name
      </button>
      <button
        data-testid="set-age"
        onClick={() => {
          ageCubit.setAge(30);
        }}
      >
        Set Age
      </button>
      <button
        data-testid="increment-age"
        onClick={() => {
          ageCubit.incrementAge();
        }}
      >
        Increment Age
      </button>
    </div>
  );
};

describe('MultiCubitComponent render behavior', () => {
  beforeEach(() => {
    componentRenderCount = 0;
    Blac.resetInstance();
    vi.clearAllMocks();
  });

  test('initial render with default props', () => {
    render(<MultiCubitComponent />);
    expect(screen.getByTestId('name')).toHaveTextContent('Name: Anonymous');
    expect(screen.getByTestId('age')).toHaveTextContent('Age: 0');
    expect(componentRenderCount).toBe(1);
  });

  test('initial render with custom props', () => {
    render(<MultiCubitComponent initialName="Alice" initialAge={25} />);
    expect(screen.getByTestId('name')).toHaveTextContent('Name: Alice');
    expect(screen.getByTestId('age')).toHaveTextContent('Age: 25');
    expect(componentRenderCount).toBe(1);
  });

  test('updating NameCubit state only re-renders if name is used', async () => {
    render(<MultiCubitComponent />);
    expect(componentRenderCount).toBe(1);

    await act(async () => {
      await userEvent.click(screen.getByTestId('set-name'));
    });
    expect(screen.getByTestId('name')).toHaveTextContent('Name: John Doe');
    expect(componentRenderCount).toBe(2);
  });

  test('updating AgeCubit state only re-renders if age is used', async () => {
    render(<MultiCubitComponent />);
    expect(componentRenderCount).toBe(1);

    await act(async () => {
      await userEvent.click(screen.getByTestId('set-age'));
    });
    expect(screen.getByTestId('age')).toHaveTextContent('Age: 30');
    expect(componentRenderCount).toBe(2);

    await act(async () => {
      await userEvent.click(screen.getByTestId('increment-age'));
    });
    expect(screen.getByTestId('age')).toHaveTextContent('Age: 31');
    expect(componentRenderCount).toBe(3);
  });

  test('updating one cubit does not cause unnecessary re-renders due to the other', async () => {
    render(<MultiCubitComponent />);
    expect(componentRenderCount).toBe(1);

    // Update name
    await act(async () => {
      await userEvent.click(screen.getByTestId('set-name'));
    });
    expect(screen.getByTestId('name')).toHaveTextContent('Name: John Doe');
    expect(screen.getByTestId('age')).toHaveTextContent('Age: 0');
    expect(componentRenderCount).toBe(2);

    // Update age
    await act(async () => {
      await userEvent.click(screen.getByTestId('set-age'));
    });
    expect(screen.getByTestId('name')).toHaveTextContent('Name: John Doe');
    expect(screen.getByTestId('age')).toHaveTextContent('Age: 30');
    expect(componentRenderCount).toBe(3);
  });

  test("component not using a specific cubit's state should not re-render when that cubit updates", async () => {
    componentRenderCount = 0;
    const ComponentOnlyUsingName: FC = () => {
      const [nameState, nameCubit] = useBloc(NameCubit);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, ageCubit] = useBloc(AgeCubit);

      componentRenderCount++;

      return (
        <div>
          <div data-testid="name-only">Name: {nameState.name}</div>
          <button
            data-testid="set-name-only"
            onClick={() => {
              nameCubit.setName('Jane Doe');
            }}
          >
            Set Name Only
          </button>
          <button
            data-testid="increment-age-unused"
            onClick={() => {
              ageCubit.incrementAge();
            }}
          >
            Increment Age (Unused State)
          </button>
        </div>
      );
    };

    render(<ComponentOnlyUsingName />);
    expect(componentRenderCount).toBe(1);
    expect(screen.getByTestId('name-only')).toHaveTextContent(
      'Name: Anonymous',
    );

    await act(async () => {
      await userEvent.click(screen.getByTestId('set-name-only'));
    });
    expect(screen.getByTestId('name-only')).toHaveTextContent('Name: Jane Doe');
    expect(componentRenderCount).toBe(2);

    await act(async () => {
      await userEvent.click(screen.getByTestId('increment-age-unused'));
    });
    // Should NOT re-render - ageState is not accessed in the component
    expect(componentRenderCount).toBe(2);
  });

  test("component using cubit's class instance properties", async () => {
    componentRenderCount = 0;

    // Props type for AdvancedAgeCubit
    interface AdvancedAgeCubitProps {
      initialAge?: number;
    }
    class AdvancedAgeCubit extends Cubit<
      { age: number },
      AdvancedAgeCubitProps
    > {
      static isolated = true;
      constructor(props?: AdvancedAgeCubitProps) {
        super({ age: props?.initialAge ?? 0 });
      }
      get isAdult(): boolean {
        return this.state.age >= 18;
      }
      setAge = (newAge: number) => {
        this.patch({ age: newAge });
      };
    }

    const ComponentUsingAgeInstanceProp: FC = () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, nameCubit] = useBloc(NameCubit);
      const [ageState, ageCubit] = useBloc(AdvancedAgeCubit);

      componentRenderCount++;

      return (
        <div>
          <div data-testid="age-value">Age: {ageState.age}</div>
          <div data-testid="is-adult">
            Adult: {ageCubit.isAdult ? 'Yes' : 'No'}
          </div>
          <button
            data-testid="set-age-adult"
            onClick={() => {
              ageCubit.setAge(15);
            }}
          >
            Set Age to 15
          </button>
          <button
            data-testid="set-age-adult-2"
            onClick={() => {
              ageCubit.setAge(20);
            }}
          >
            Set Age to 20
          </button>
          <button
            data-testid="set-name-irrelevant"
            onClick={() => {
              nameCubit.setName('Irrelevant');
            }}
          >
            Set Name Irrelevant
          </button>
        </div>
      );
    };

    render(<ComponentUsingAgeInstanceProp />);
    expect(componentRenderCount).toBe(1);
    expect(screen.getByTestId('age-value')).toHaveTextContent('Age: 0');
    expect(screen.getByTestId('is-adult')).toHaveTextContent('Adult: No');

    await act(async () => {
      await userEvent.click(screen.getByTestId('set-age-adult'));
    });
    expect(screen.getByTestId('age-value')).toHaveTextContent('Age: 15');
    expect(screen.getByTestId('is-adult')).toHaveTextContent('Adult: No');
    expect(componentRenderCount).toBe(2);

    await act(async () => {
      await userEvent.click(screen.getByTestId('set-age-adult-2'));
    });
    expect(screen.getByTestId('age-value')).toHaveTextContent('Age: 20');
    expect(screen.getByTestId('is-adult')).toHaveTextContent('Adult: Yes');
    expect(componentRenderCount).toBe(3);

    await act(async () => {
      await userEvent.click(screen.getByTestId('set-name-irrelevant'));
    });
    // Should NOT re-render - nameState is not accessed in the component
    expect(componentRenderCount).toBe(3);
  });

  test('cross-cubit update in onMount', async () => {
    componentRenderCount = 0;
    const CrossUpdateComponent: FC = () => {
      const [nameState, nameCubit] = useBloc(NameCubit);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [, ageCubit] = useBloc(AgeCubit, {
        onMount: () => {
          nameCubit.setName('Mounted Name');
        },
      });

      componentRenderCount++;
      return (
        <div>
          <div data-testid="name-cross">Name: {nameState.name}</div>
        </div>
      );
    };

    render(<CrossUpdateComponent />);
    await screen.findByText('Name: Mounted Name');
    expect(screen.getByTestId('name-cross')).toHaveTextContent(
      'Name: Mounted Name',
    );
    expect(componentRenderCount).toBe(2);
  });

  test('rapid sequential updates to multiple cubits', async () => {
    render(<MultiCubitComponent />);
    expect(componentRenderCount).toBe(1);

    const setNameButton = screen.getByTestId('set-name');
    const incrementAgeButton = screen.getByTestId('increment-age');

    act(() => {
      void userEvent.click(setNameButton);
      void userEvent.click(incrementAgeButton);
      void userEvent.click(incrementAgeButton);
    });

    await screen.findByText('Name: John Doe');
    await screen.findByText('Age: 2');

    expect(screen.getByTestId('name')).toHaveTextContent('Name: John Doe');
    expect(screen.getByTestId('age')).toHaveTextContent('Age: 2');
    expect(componentRenderCount).toBe(4);
  });

  test('cubits updating each other indirectly via component logic', async () => {
    componentRenderCount = 0;
    let effectExecutionCount = 0;

    const IndirectLoopComponent: FC = () => {
      const [nameState, nameCubit] = useBloc(NameCubit);
      const [ageState, ageCubit] = useBloc(AgeCubit);

      componentRenderCount++;

      React.useEffect(() => {
        effectExecutionCount++;
        if (nameState.name === 'Trigger Age Change' && ageState.age === 0) {
          ageCubit.setAge(10);
        }
      }, [nameState.name, ageState.age, ageCubit]);

      return (
        <div>
          <div data-testid="name-indirect">Name: {nameState.name}</div>
          <div data-testid="age-indirect">Age: {ageState.age}</div>
          <button
            data-testid="trigger-indirect-loop"
            onClick={() => {
              nameCubit.setName('Trigger Age Change');
            }}
          >
            Trigger Indirect
          </button>
        </div>
      );
    };

    render(<IndirectLoopComponent />);
    expect(componentRenderCount).toBe(1);
    expect(effectExecutionCount).toBe(1);
    expect(screen.getByTestId('name-indirect')).toHaveTextContent(
      'Name: Anonymous',
    );
    expect(screen.getByTestId('age-indirect')).toHaveTextContent('Age: 0');

    await act(async () => {
      await userEvent.click(screen.getByTestId('trigger-indirect-loop'));
    });

    expect(screen.getByTestId('name-indirect')).toHaveTextContent(
      'Name: Trigger Age Change',
    );
    expect(screen.getByTestId('age-indirect')).toHaveTextContent('Age: 10');
    expect(componentRenderCount).toBe(3);
    expect(effectExecutionCount).toBe(3);
  });
});
