import { Cubit } from 'blac';
import React, { FC } from 'react';
import { useBloc } from '@blac/react';

import CounterMultiInstance from './examples/CounterMultiInstance';
import CounterMultiInstancesText from './examples/CounterMultiInstance.tsx?raw';

import CounterWithBloc from './examples/CounterWithBloc';
import CounterWithBlocAsText from './examples/CounterWithBloc.tsx?raw';

import CounterPersist from './examples/CounterPersist';
import CounterPersistAsText from './examples/CounterPersist.tsx?raw';

import CounterWithCubit from './examples/CounterWithCubit';
import CounterWICubitAsText from './examples/CounterWithCubit.tsx?raw';

import CounterWithCubitGlobal from './examples/CounterWithCubitGlobal';
import CounterWithCubitGlobalAsText from './examples/CounterWithCubitGlobal.tsx?raw';

import CounterMultipleConsumers from './examples/CounterMultipleConsumers';
import CounterMultipleConsumersAsText from './examples/CounterMultipleConsumers.tsx?raw';

import Props from './examples/Props';
import PropsAsText from './examples/Props.tsx?raw';

import './styles.css';
import Setup from './docs/Setup';
import Code from './components/Code';
import BlocDocs from './docs/BlocDocs';
import RerenderTest from './examples/RerenderTest';
import RerenderTestAsText from './examples/RerenderTest.tsx?raw';
import NoSharedState from './examples/NoSharedState';
import NoSharedStateText from './examples/NoSharedState.tsx?raw';
import QueryOtherBlocs from './examples/QueryOtherBlocs';
import QueryOtherBlocsText from './examples/QueryOtherBlocs.tsx?raw';

interface DemoData {
  name: string;
  description?: React.ReactNode;
  component?: React.ReactNode;
  code?: string;
}

interface MainBlocState {
  current?: DemoData;
}

class DemoPageBloc extends Cubit<MainBlocState> {
  readonly docs: DemoData[] = [
    {
      name: 'Setup',
      description: <Setup />,
    },
    {
      name: 'BLoC Pattern',
      description: (
        <>
          <p>
            The BLoC pattern is a way of structuring your app code to separate
            business logic from UI code.
          </p>
        </>
      ),
    },
    {
      name: 'Bloc Class',
      description: <BlocDocs />,
    },
    {
      name: 'Cubit Class',
    },
  ];

  readonly examples: DemoData[] = [
    {
      name: 'Counter with Bloc',
      description: <p>Simple counter following the Bloc pattern with events</p>,
      component: <CounterWithBloc />,
      code: CounterWithBlocAsText,
    },
    {
      name: 'Counter Persist',
      description: (
        <p>
          Simple counter following the Bloc pattern with events, but this one
          persists the state to localStorage
        </p>
      ),
      component: <CounterPersist />,
      code: CounterPersistAsText,
    },
    {
      name: 'Counter with Cubit',
      description:
        'Simple counter following the Cubit pattern with methods instead of events',
      component: <CounterWithCubit />,
      code: CounterWICubitAsText,
    },
    {
      name: 'Counter "global"',
      description: (
        <div>
          <p>
            BLAC has no concept of global state, a Bloc is created when it is
            needed and disposed when it is no longer needed.
          </p>
          <p>
            By default all components that use the same Bloc will all use the
            same instance and so will share the same state, and when there are
            no more components mounted that use the Bloc, the Bloc will be
            disposed.
          </p>
          <p>
            <strong>Tip:</strong> by setting a static property `keepAlive =
            true` on your Bloc, it will never be disposed. With this option you
            can re-create a global state
          </p>
        </div>
      ),
      component: <CounterWithCubitGlobal />,
      code: CounterWithCubitGlobalAsText,
    },
    {
      name: 'Counter Shared State',
      description: 'Share one Bloc between multiple ui',
      component: <CounterMultipleConsumers />,
      code: CounterMultipleConsumersAsText,
    },
    {
      name: 'Counter Multiple Instances',
      description: (
        <>
          <p>
            By default there is always only one instance of each Bloc, if you
            need multiple instanced then specify the "ID" in the `useBloc` hook.
            All consumers that have the same ID will share the same instance of
            the Bloc
          </p>
        </>
      ),
      component: <CounterMultiInstance />,
      code: CounterMultiInstancesText,
    },
    {
      name: 'Dependency Array (Render Test)',
      description: (
        <>
          <p>
            The state contains both email and name, add a dependency check to
            see if the state should trigger a rerender or not.
          </p>
        </>
      ),
      component: <RerenderTest />,
      code: RerenderTestAsText,
    },
    {
      name: 'Props',
      description: (
        <>
          <p></p>
        </>
      ),
      component: <Props />,
      code: PropsAsText,
    },
    {
      name: 'Isolated',
      description: (
        <>
          <p>
            Isolated Blocs never share the state between other components that
            use them, there is always a new instance. Set a static property
            `isolated = true`
          </p>
        </>
      ),
      component: <NoSharedState />,
      code: NoSharedStateText,
    },
    {
      name: 'Query other Blocs',
      description: (
        <>
          <p>
            Inside a bloc, you might want to reference other blocs, in this
            example all circles have their own Bloc instance and know where the
            others are, they can find each other and will avoid them,
            `this.blac.findAllBlocs(Cubit) returns all active Cubits of that
            kind`
          </p>
        </>
      ),
      component: <QueryOtherBlocs />,
      code: QueryOtherBlocsText,
    },
  ];

  constructor() {
    super({ current: undefined });
    this.init();
  }

  init() {
    const selectedName = window.location.hash.replace('#', '');
    const page = [...this.examples, ...this.docs].find(
      (example) => this.slugify(example.name) === selectedName,
    );

    if (page) {
      this.setSelected(page);
    } else {
      this.setSelected(this.docs[0]);
    }

    this.addEventListeners();
  }

  addEventListeners() {
    window.addEventListener('hashchange', () => {
      const selectedName = window.location.hash.replace('#', '');
      const page = [...this.examples, ...this.docs].find(
        (example) => this.slugify(example.name) === selectedName,
      );

      if (page && page !== this.state.current) {
        this.setSelected(page);
      }
    });
  }

  setSelected = (el: DemoData) => {
    this.emit({ current: el });
    window.location.hash = this.slugify(el.name);
  };

  slugify = (text: string) =>
    text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .trim();
}

const cleanCode = (code?: string) => {
  if (!code) return undefined;

  let c = code;
  // remove all imports
  c = c.replace(/import.*from.*;/g, '');

  c = c.trim();

  return c;
};

const Main: FC = () => {
  const [{ current }, { examples, docs, setSelected }] = useBloc(DemoPageBloc);

  return (
    <main>
      <>
        <nav>
          <h3>Docs</h3>
          <div className="btn-list">
            {docs.map((example) => (
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
          <h3>Examples</h3>
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
        </nav>
        {current && (
          <section>
            <div className="content" key={current.name}>
              <div>
                <h2>{current.name}</h2>
                {current.description && (
                  <div className="read">{current.description}</div>
                )}
                {current.component && (
                  <div className="example">{current.component}</div>
                )}
                {cleanCode(current.code) && (
                  <Code code={cleanCode(current.code)} />
                )}
              </div>
            </div>
          </section>
        )}
      </>
    </main>
  );
};

export default Main;
