// BlaC type definitions for Monaco Editor
export const blacCoreTypes = `
declare module '@blac/core' {
  export interface BlocState<T> {
    [key: string]: any;
  }

  export interface BlocEvent {
    type: string;
    payload?: any;
  }

  export type BlocEventConstraint = object;

  export abstract class BlocBase<S = any> {
    protected state: S;
    protected _name: string;
    
    constructor(initialState: S);
    
    emit(newState: S): void;
    subscribe(listener: (state: S) => void): () => void;
    dispose(): void;
    
    get currentState(): S;
  }

  export class Cubit<S = any> extends BlocBase<S> {
    constructor(initialState: S);
  }

  export class Bloc<S = any, E extends BlocEventConstraint = BlocEventConstraint> extends BlocBase<S> {
    constructor(initialState: S);
    
    add(event: E): void;
    on<T extends E>(
      eventClass: new (...args: any[]) => T,
      handler: (event: T, emit: (newState: S) => void) => void | Promise<void>
    ): void;
  }

  export class Blac {
    static setConfig(config: any): void;
    static addPlugin(plugin: any): void;
    static getInstance(): Blac;
  }
}
`;

export const blacReactTypes = `
declare module '@blac/react' {
  import { BlocBase, Cubit, Bloc } from '@blac/core';
  
  export interface UseBlocOptions<T extends BlocBase> {
    selector?: (currentState: any, previousState: any, instance: T) => any;
    dependencies?: any[];
  }
  
  export function useBloc<T extends BlocBase>(
    BlocClass: new (...args: any[]) => T,
    options?: UseBlocOptions<T>
  ): [ReturnType<T['currentState']>, T];
  
  export function useExternalBlocStore<T extends BlocBase>(
    bloc: T
  ): ReturnType<T['currentState']>;
}
`;

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
      // HTML elements
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
    { content: reactTypes, filePath: 'file:///node_modules/react/index.d.ts' },
  ];

  // Add type definitions to both typescript and typescriptreact
  libSource.forEach((lib) => {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      lib.content,
      lib.filePath,
    );
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      lib.content,
      lib.filePath,
    );
  });

  // Configure TypeScript compiler options for TSX
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    lib: ['es2020', 'dom', 'dom.iterable'],
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    noEmit: true,
    typeRoots: ['node_modules/@types'],
    skipLibCheck: true,
    allowJs: true,
    strict: false,
  });

  // Configure JavaScript/JSX compiler options as well
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    lib: ['es2020', 'dom', 'dom.iterable'],
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
  });

  // Set diagnostic options
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
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
