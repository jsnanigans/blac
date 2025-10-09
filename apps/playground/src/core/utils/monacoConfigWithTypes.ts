/**
 * Monaco Editor configuration with actual BlaC type definitions
 * This file contains the real type definitions extracted from the built packages
 */

// Actual BlaC Core type definitions
export const blacCoreTypes = `
declare module '@blac/core' {
  // From types.d.ts
  export type BlocEventConstraint = object;
  export type BlocConstructor<T extends BlocBase<any>> = new (...args: any[]) => T;
  export type StateType<T> = T extends BlocBase<infer S> ? S : never;
  export type EventType<T> = T extends Bloc<any, infer E> ? E : never;
  
  export interface BlocConfig {
    proxyDependencyTracking?: boolean;
    enableLogging?: boolean;
    enableDevTools?: boolean;
    batchUpdates?: boolean;
    performanceMonitoring?: boolean;
  }
  
  export interface Stream<T> {
    subscribe(observer: (value: T) => void): { unsubscribe(): void };
  }
  
  // From BlocBase.d.ts
  export type BlocInstanceId = string | number | undefined;
  
  export abstract class BlocBase<S> {
    uid: string;
    blacInstance?: Blac;
    static isolated: boolean;
    get isIsolated(): boolean;
    static keepAlive: boolean;
    get isKeepAlive(): boolean;
    _isolated: boolean;
    _id: BlocInstanceId;
    _instanceRef?: string;
    _name: string;
    _state: S;
    _keepAlive: boolean;
    lastUpdate?: number;
    onDispose?: () => void;
    
    constructor(initialState: S);
    
    get state(): S;
    subscribe(callback: (state: S) => void): () => void;
    subscribeWithSelector<T>(
      selector: (state: S) => T,
      callback: (value: T) => void,
      equalityFn?: (a: T, b: T) => boolean
    ): () => void;
    subscribeComponent(componentRef: WeakRef<object>, callback: () => void): () => void;
    get subscriptionCount(): number;
    trackAccess(subscriptionId: string, path: string, value?: unknown): void;
    protected emit(newState: S, action?: unknown): void;
    _pushState(newState: S, oldState: S, action?: unknown): void;
    _batchUpdates(callback: () => void): void;
    addPlugin(plugin: any): void;
    removePlugin(plugin: any): void;
    get plugins(): ReadonlyArray<any>;
    get isDisposed(): boolean;
    dispose(): Promise<void>;
    _scheduleDisposal(): void;
    setDisposalHandler(handler: (bloc: BlocBase<unknown>) => void): void;
    checkDisposal(): void;
    _cancelDisposalIfRequested(): void;
    
    // Stream API
    get stream(): Stream<S>;
  }
  
  // From Cubit.d.ts
  export abstract class Cubit<S> extends BlocBase<S> {
    emit(state: S): void;
    patch(statePatch: S extends object ? Partial<S> : S, ignoreChangeCheck?: boolean): void;
  }
  
  // From Bloc.d.ts
  export abstract class Bloc<S, A extends BlocEventConstraint = BlocEventConstraint> extends BlocBase<S> {
    readonly eventHandlers: Map<new (...args: any[]) => A, (event: A, emit: (newState: S) => void) => void | Promise<void>>;
    
    protected on<E extends A>(
      eventConstructor: new (...args: any[]) => E,
      handler: (event: E, emit: (newState: S) => void) => void | Promise<void>
    ): void;
    
    add: (action: A) => Promise<void>;
  }
  
  // From Blac.d.ts
  export class Blac {
    static setConfig(config: BlocConfig): void;
    static addPlugin(plugin: any): void;
    static getInstance(): Blac;
    static resetInstance(): void;
    static getBloc<T extends BlocBase<any>>(
      BlocClass: new (...args: any[]) => T,
      id?: string
    ): T | undefined;
    
    private constructor();
    setConfig(config: BlocConfig): void;
    addPlugin(plugin: any): void;
    removePlugin(plugin: any): void;
    getBloc<T extends BlocBase<any>>(
      BlocClass: new (...args: any[]) => T,
      id?: string
    ): T | undefined;
    getAllBlocs(): Map<string, BlocBase<any>>;
    clearBlocs(): void;
    dispose(): void;
  }
  
  // Export everything
  export { Blac as default };
}
`;

// Actual BlaC React type definitions
export const blacReactTypes = `
declare module '@blac/react' {
  import { BlocBase, BlocConstructor } from '@blac/core';
  
  export interface UseBlocOptions<T extends BlocBase<any>> {
    selector?: (currentState: any, previousState: any, instance: T) => any;
    dependencies?: any[];
    id?: string;
  }
  
  export interface UseBlocResult<T extends BlocBase<any>> {
    state: T extends BlocBase<infer S> ? S : never;
    bloc: T;
  }
  
  export default function useBloc<T extends BlocBase<any>>(
    BlocClass: BlocConstructor<T>,
    options?: UseBlocOptions<T>
  ): [T extends BlocBase<infer S> ? S : never, T];
  
  export function useBloc<T extends BlocBase<any>>(
    BlocClass: BlocConstructor<T>,
    options?: UseBlocOptions<T>
  ): [T extends BlocBase<infer S> ? S : never, T];
  
  export function useBlocNext<T extends BlocBase<any>>(
    BlocClass: BlocConstructor<T>,
    options?: UseBlocOptions<T>
  ): [T extends BlocBase<infer S> ? S : never, T];
  
  export default function useExternalBlocStore<T extends BlocBase<any>>(
    bloc: T
  ): T extends BlocBase<infer S> ? S : never;
  
  export function useExternalBlocStore<T extends BlocBase<any>>(
    bloc: T
  ): T extends BlocBase<infer S> ? S : never;
}
`;

// React types
export const reactTypes = `
declare module 'react' {
  export = React;
  export as namespace React;
  
  namespace React {
    type FC<P = {}> = FunctionComponent<P>;
    type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];
    type ReactElement<P = any> = { type: any; props: P; key: any };
    
    interface FunctionComponent<P = {}> {
      (props: P): ReactElement | null;
    }
    
    function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void];
    function useEffect(effect: () => void | (() => void), deps?: any[]): void;
    function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
    function useMemo<T>(factory: () => T, deps: any[]): T;
    function useRef<T>(initialValue: T): { current: T };
    function createElement(type: any, props?: any, ...children: any[]): ReactElement;
    
    const Fragment: any;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: any;
      span: any;
      button: any;
      input: any;
      h1: any;
      h2: any;
      h3: any;
      h4: any;
      h5: any;
      h6: any;
      p: any;
      a: any;
      img: any;
      ul: any;
      ol: any;
      li: any;
      form: any;
      label: any;
      select: any;
      option: any;
      textarea: any;
      table: any;
      thead: any;
      tbody: any;
      tr: any;
      td: any;
      th: any;
      nav: any;
      header: any;
      footer: any;
      main: any;
      section: any;
      article: any;
      aside: any;
      pre: any;
      code: any;
      [elemName: string]: any;
    }
    
    interface Element extends React.ReactElement<any, any> { }
    interface ElementClass extends React.Component<any> {
      render(): React.ReactNode;
    }
    interface ElementAttributesProperty { props: {}; }
    interface ElementChildrenAttribute { children: {}; }
    
    interface IntrinsicAttributes {
      key?: React.Key;
    }
    interface IntrinsicClassAttributes<T> {
      ref?: React.Ref<T>;
    }
  }
  
  // WeakRef support
  interface WeakRef<T extends object> {
    readonly [Symbol.toStringTag]: "WeakRef";
    deref(): T | undefined;
  }
  
  interface WeakRefConstructor {
    new<T extends object>(target: T): WeakRef<T>;
    readonly prototype: WeakRef<any>;
  }
  
  var WeakRef: WeakRefConstructor;
}
`;

export function configureMonaco(monaco: any) {
  // Configure for both TypeScript and TSX
  const libSource = [
    {
      content: blacCoreTypes,
      filePath: 'file:///node_modules/@blac/core/index.d.ts',
    },
    {
      content: blacReactTypes,
      filePath: 'file:///node_modules/@blac/react/index.d.ts',
    },
    {
      content: reactTypes,
      filePath: 'file:///node_modules/react/index.d.ts',
    },
  ];

  // IMPORTANT: Add type definitions to ALL language services
  // TypeScript has separate services for .ts and .tsx files
  libSource.forEach((lib) => {
    // For .ts files
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      lib.content,
      lib.filePath,
    );
    // For .js files
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      lib.content,
      lib.filePath,
    );
  });

  // Configure compiler options for TypeScript AND TypeScriptReact (TSX)
  const tsCompilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    lib: ['es2020', 'dom', 'dom.iterable', 'esnext'],
    jsx: monaco.languages.typescript.JsxEmit.React,
    jsxFactory: 'React.createElement',
    jsxFragmentFactory: 'React.Fragment',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    noEmit: true,
    typeRoots: ['node_modules/@types'],
    skipLibCheck: true,
    allowJs: true,
    strict: false,
    resolveJsonModule: true,
    isolatedModules: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noImplicitAny: false,
    strictNullChecks: false,
    forceConsistentCasingInFileNames: true,
  };

  // Apply to TypeScript (.ts and .tsx)
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
    tsCompilerOptions,
  );

  // Configure JavaScript/JSX compiler options as well
  const jsCompilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    lib: ['es2020', 'dom', 'dom.iterable', 'esnext'],
    jsx: monaco.languages.typescript.JsxEmit.React,
    jsxFactory: 'React.createElement',
    jsxFragmentFactory: 'React.Fragment',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    noEmit: true,
    allowJs: true,
    checkJs: false,
  };

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
    jsCompilerOptions,
  );

  // Set diagnostic options - enable all validations
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  // Add custom theme
  monaco.editor.defineTheme('blac-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#09090b',
    },
  });
}
