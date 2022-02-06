import { BlocReact } from "../lib";
declare const state: BlocReact;
export declare const useBloc: <T extends import("../lib/BlocBase").default<any>>(blocClass: import("../lib/types").BlocClass<T>, options?: import("../lib/react/BlocReact").BlocHookOptions<T>) => import("../lib/types").BlocHookData<T>, BlocBuilder: <T extends import("../lib/BlocBase").default<any>>(props: {
    blocClass: import("../lib/types").BlocClass<T>;
    builder: (data: import("../lib/types").BlocHookData<T>) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    shouldUpdate?: ((event: import("../lib/types").ChangeEvent<import("../lib/types").ValueType<T>>) => boolean) | undefined;
}) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>> | null, BlocProvider: <T extends import("../lib/BlocBase").default<any>>(props: {
    children?: false | import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>> | import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>[] | undefined;
    bloc: T | ((id: string) => T);
}) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>, withBlocProvider: <P extends object>(bloc: import("../lib/BlocBase").default<any> | (() => import("../lib/BlocBase").default<any>)) => (Component: import("react").ComponentType<P>) => import("react").ComponentType<P>;
export default state;
