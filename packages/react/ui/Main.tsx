import { Cubit } from "blac";
import React, { FC } from "react";
import { useBloc } from "../src";

import CounterLocalScoped from "./examples/CounterLocalDemo";
import CounterLocalScopedAsText from "./examples/CounterLocalDemo.tsx?raw";

import CounterWithBloc from "./examples/CounterWithBloc";
import CounterWithBlocAsText from "./examples/CounterWithBloc.tsx?raw";

import CounterWithCubit from "./examples/CounterWithCubit";
import CounterWICubitAsText from "./examples/CounterWithCubit.tsx?raw";

import CounterWithCubitGlobal from "./examples/CounterWithCubitGlobal";
import CounterWithCubitGlobalAsText from "./examples/CounterWithCubitGlobal.tsx?raw";

import CounterMultipleConsumers from "./examples/CounterMultipleConsumers";
import CounterMultipleConsumersAsText from "./examples/CounterMultipleConsumers.tsx?raw";

import "./styles.css";
import Setup from "./examples/Setup";
import Code from "./components/Code";

interface DemoData {
  name: string;
  description: React.ReactNode;
  component: React.ReactNode;
  code?: string;
}

interface MainBlocState {
  current?: DemoData;
}

class MainBloc extends Cubit<MainBlocState> {
  readonly docs: DemoData[] = [
    {
      name: "Setup",
      description: "",
      component: <Setup />
    }
  ];

  readonly examples: DemoData[] = [
    {
      name: "Counter with Bloc",
      description:
        "Simple counter following the Bloc pattern with events",
      component: <CounterWithBloc />,
      code: CounterWithBlocAsText
    },
    {
      name: "Counter with Cubit",
      description:
        "Simple counter following the Cubit pattern with methods instead of events",
      component: <CounterWithCubit />,
      code: CounterWICubitAsText
    },
    {
      name: "Counter \"global\"",
      description: <div>
        <p>BLAC has no concept of global state, a Bloc is created when it is needed and disposed when it is no longer
          needed.</p>
        <p>By default all components that use the same Bloc will all use the same instance and so will share the same
          state,
          and when there are no more components mounted that use the Bloc, the Bloc will be disposed.</p>
        <p><strong>Tip:</strong> by setting a static property `keepAlive = true` on your Bloc, it will never be
          disposed. With this option you can re-create a global state</p>
      </div>,
      component: <CounterWithCubitGlobal />,
      code: CounterWithCubitGlobalAsText
    },
    {
      name: "Counter Shared State",
      description: "Share one Bloc between multiple components",
      component: <CounterMultipleConsumers />,
      code: CounterMultipleConsumersAsText
    },
    {
      name: "Counter Multiple Instances",
      description: "By default all components that use the same Bloc will all use the same instance and so will share the same state. If a Bloc has the static property `allowMultipleInstances = true` set, then each component will get its own instance of the Bloc every time it is mounted.",
      component: <CounterLocalScoped />,
      code: CounterLocalScopedAsText
    }
  ];

  constructor() {
    super({ current: undefined });
    this.init();
  }

  init() {
    const selectedName = window.location.hash.replace("#", "");
    const page = [...this.examples, ...this.docs].find(
      (example) => this.slugify(example.name) === selectedName
    );

    if (page) {
      this.setSelected(page);
    } else {
      this.setSelected(this.docs[0]);
    }

    this.addEventListeners();
  }

  addEventListeners() {
    window.addEventListener("hashchange", () => {
      const selectedName = window.location.hash.replace("#", "");
      const page = [...this.examples, ...this.docs].find(
        (example) => this.slugify(example.name) === selectedName
      );

      if (page) {
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
      .replace(/\s+/g, "-") // Replace spaces with -
      .replace(/[^\w\-]+/g, "") // Remove all non-word chars
      .replace(/\-\-+/g, "-") // Replace multiple - with single -
      .trim();
}

const Main: FC = () => {
  const [{ current }, { examples, docs, setSelected }] = useBloc(MainBloc);

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
                <p className="read">{current.description}</p>
                <div className="example">{current.component}</div>
                {current.code && (
                  <Code code={current.code} />
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
