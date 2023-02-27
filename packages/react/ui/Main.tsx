import { Cubit } from 'blac';
import React, { FC } from 'react';
import { useBloc } from '../src';
import CounterScoped from './examples/CounterScoped';
import CounterWithBloc from './examples/CounterWithBloc';
import CounterWithCubit from './examples/CounterWithCubit';
import CounterWithCubitGlobal from './examples/CounterWithCubitGlobal';
import './styles.css';

interface DemoData {
  name: string;
  description: string;
  component: React.ReactNode;
}

interface MainBlocState {
  current?: DemoData;
}

class MainBloc extends Cubit<MainBlocState> {
  readonly examples: DemoData[] = [
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

  constructor() {
    super({ current: undefined });
    this.init();
  }

  init() {
    const selectedName = window.location.hash.replace('#', '');
    const example = this.examples.find(
      (example) => this.slugify(example.name) === selectedName
    );
    if (example) {
      this.setSelected(example);
    } else {
      this.setSelected(this.examples[0]);
    }
  }

  setSelected = (el: DemoData) => {
    this.emit({ current: el });
    window.location.hash = this.slugify(el.name);
  };

  select = (index: number) => {
    this.emit({ current: this.state.current });
  };

  slugify = (text: string) =>
    text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text
}

const Main: FC = () => {
  const [{ current }, { examples, setSelected }] = useBloc(MainBloc, {
    create: true,
  });

  return (
    <main>
      <>
        <h1>Examples</h1>
        <div className="btn-list">
          {examples.map((example) => (
            <button
              key={example.name}
              disabled={example === current}
              onClick={() => {
                setSelected(example);
              }}
            >
              {example.name}
            </button>
          ))}
        </div>
        <hr />
        {current && (
          <div className="content" key={current.name}>
            <div>
              <h2>{current.name}</h2>
              <p>{current.description}</p>
              <div className="example">{current.component}</div>
            </div>
          </div>
        )}
      </>
    </main>
  );
};

export default Main;
