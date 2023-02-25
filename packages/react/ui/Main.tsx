import React, { FC } from 'react';
import CounterWithBloc from './examples/CounterWithBloc';
import CounterWithCubit from './examples/CounterWithCubit';

const Main: FC = () => {
  const examples = [
    {
      name: 'Counter with Bloc',
      component: <CounterWithBloc />,
    },
    {
      name: 'Counter with Cubit',
      component: <CounterWithCubit />,
    }
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
      {currentExample && <>
      <hr />
      <h2>{currentExample.name}</h2>
      {/* example */}
      <div>{currentExample.component}</div>
      </>}
    </div>
  );
};

export default Main;
