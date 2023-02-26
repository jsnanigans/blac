import React, { FC } from 'react';
import CounterScoped from './examples/CounterScoped';
import CounterWithBloc from './examples/CounterWithBloc';
import CounterWithCubit from './examples/CounterWithCubit';
import CounterWithCubitGlobal from './examples/CounterWithCubitGlobal';
import './styles.css';

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
      name: 'Counter (global)',
      description:
        'This cubit is created in the global scope, the state persists also after the component is unmounted',
      component: <CounterWithCubitGlobal />,
    },
    {
      name: 'Counter Local',
      description: 'This cubit is created in the local scope',
      component: <CounterScoped />,
    },
  ];

  const slugify = (text: string) =>
    text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text

  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const currentExample = examples[selectedIndex];

  React.useEffect(() => {
    const selectedName = window.location.hash.replace('#', '');
    const example = examples.findIndex(
      (example) => slugify(example.name) === selectedName
    );

    if (example) {
      setSelectedIndex(Number(example));
    } else {
      setSelectedIndex(0);
    }
  }, []);

  return (
    <main>
      <h1>Examples</h1>
      {/* buttons */}
      <div className="btn-list">
        {examples.map((example, index) => (
          <button
            key={example.name}
            disabled={index === selectedIndex}
            onClick={() => {
              setSelectedIndex(index);
              window.location.hash = slugify(example.name);
            }}
          >
            {example.name}
          </button>
        ))}
      </div>
      <hr />
      {currentExample && (
        <div className="content" key={currentExample.name}>
          <div>
            {/* info */}
            <h2>{currentExample.name}</h2>
            <p>{currentExample.description}</p>
            {/* example */}
            <div className="example">{currentExample.component}</div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Main;
