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
            description: "Setup the bloc",
            component: <Setup />
        },
        {
            name: "Global State",
            description: "When initializing Blac, you can pass a global state",
            component: <div>
                <p>src/blacState.ts</p>
                <Code code={`
export const blacState = new Blac({
    global: {
        counter: new CounterGlobalCubit(0);
    }
});
`} />
            </div>
        }
    ];

    readonly examples: DemoData[] = [
        {
            name: "Counter with Bloc",
            description:
                "Simple Bloc example, the state is reset when the component is unmounted",
            component: <CounterWithBloc />,
            code: CounterWithBlocAsText
        },
        {
            name: "Counter with Cubit",
            description:
                "Simple Cubit example, the state is reset when the component is unmounted",
            component: <CounterWithCubit />,
            code: CounterWICubitAsText
        },
        {
            name: "Counter (global)",
            description: <div>This cubit is created in the global scope, the state persists also after the component is
                unmounted <br /><p className="read">for this we first need to setup <a href={"/#global-state"}>Global
                    State</a></p></div>,
            component: <CounterWithCubitGlobal />,
            code: CounterWithCubitGlobalAsText
        },
        {
            name: "Counter Local",
            description: "This cubit is created in the component scope",
            component: <CounterLocalScoped />,
            code: CounterLocalScopedAsText
        },
        {
            name: "Counter Local Shared",
            description: "Share one Bloc between multiple components",
            component: <CounterMultipleConsumers />,
            code: CounterMultipleConsumersAsText
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
    const [{ current }, { examples, docs, setSelected }] = useBloc(MainBloc, {
        create: true
    });

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
