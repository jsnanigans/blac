import React, { FC } from 'react';
import CounterWithBloc from './examples/CounterWithBloc';
import CounterWithCubit from './examples/CounterWithCubit';
import CounterWithCubitGlobal from './examples/CounterWithCubitGlobal';

const Main: FC = () => {
  const examples = [
    {
      name: 'Counter with Bloc',
      description:
        'Simple Bloc example, the state is reset when the component is unmounted',
      component: <CounterWithBloc />,
    },
    {
      name: 'Counter with Cubit',
      description:
        'Simple Cubit example, the state is reset when the component is unmounted',
      component: <CounterWithCubit />,
    },
    {
      name: 'Counter with Cubit (global)',
      description:
        'This cubit is created in the global scope, the state persists also after the component is unmounted',
      component: <CounterWithCubitGlobal />,
    },
  ];

  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const currentExample = examples[selectedIndex];

  React.useEffect(() => {
    const example = localStorage.getItem('example');
    if (example) {
      setSelectedIndex(Number(example));
    } else {
      setSelectedIndex(0);
    }
  }, []);

  return (
    <div>
      <h1>Examples</h1>
      {/* buttons */}
      <div>
        {examples.map((example, index) => (
          <button
            key={example.name}
            disabled={index === selectedIndex}
            onClick={() => {
              setSelectedIndex(index);
              localStorage.setItem('example', String(index));
            }}
          >
            {example.name}
          </button>
        ))}
      </div>
      {currentExample && (
        <>
          <hr />
          {/* info */}
          <h2>{currentExample.name}</h2>
          <p>{currentExample.description}</p>
          {/* example */}
          <div>{currentExample.component}</div>
        </>
      )}
    </div>
  );
};

export default Main;
