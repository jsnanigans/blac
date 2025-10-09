/**
 * Loads actual TypeScript type definitions from built packages
 * This ensures Monaco's IntelliSense matches the real BlaC API
 */

export interface TypeDefinition {
  content: string;
  filePath: string;
}

/**
 * Fetches the actual type definitions from the built packages
 * These files are served by Vite's dev server
 */
export async function loadPackageTypeDefinitions(): Promise<TypeDefinition[]> {
  const typeFiles = [
    // Core BlaC types - order matters for dependencies
    {
      path: '/node_modules/@blac/core/dist/types.d.ts',
      monaco: 'file:///node_modules/@blac/core/types.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/events.d.ts',
      monaco: 'file:///node_modules/@blac/core/events.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/subscription/types.d.ts',
      monaco: 'file:///node_modules/@blac/core/subscription/types.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/subscription/SubscriptionManager.d.ts',
      monaco:
        'file:///node_modules/@blac/core/subscription/SubscriptionManager.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/subscription/index.d.ts',
      monaco: 'file:///node_modules/@blac/core/subscription/index.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/lifecycle/BlocLifecycle.d.ts',
      monaco: 'file:///node_modules/@blac/core/lifecycle/BlocLifecycle.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/lifecycle/index.d.ts',
      monaco: 'file:///node_modules/@blac/core/lifecycle/index.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/utils/uuid.d.ts',
      monaco: 'file:///node_modules/@blac/core/utils/uuid.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/utils/shallowEqual.d.ts',
      monaco: 'file:///node_modules/@blac/core/utils/shallowEqual.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/utils/generateInstanceId.d.ts',
      monaco: 'file:///node_modules/@blac/core/utils/generateInstanceId.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/utils/RerenderLogger.d.ts',
      monaco: 'file:///node_modules/@blac/core/utils/RerenderLogger.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/utils/BatchingManager.d.ts',
      monaco: 'file:///node_modules/@blac/core/utils/BatchingManager.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/testing.d.ts',
      monaco: 'file:///node_modules/@blac/core/testing.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/adapter/BlacAdapter.d.ts',
      monaco: 'file:///node_modules/@blac/core/adapter/BlacAdapter.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/adapter/ProxyFactory.d.ts',
      monaco: 'file:///node_modules/@blac/core/adapter/ProxyFactory.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/adapter/index.d.ts',
      monaco: 'file:///node_modules/@blac/core/adapter/index.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/plugins/types.d.ts',
      monaco: 'file:///node_modules/@blac/core/plugins/types.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/plugins/BlocPluginRegistry.d.ts',
      monaco: 'file:///node_modules/@blac/core/plugins/BlocPluginRegistry.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/plugins/SystemPluginRegistry.d.ts',
      monaco:
        'file:///node_modules/@blac/core/plugins/SystemPluginRegistry.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/plugins/index.d.ts',
      monaco: 'file:///node_modules/@blac/core/plugins/index.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/errors/BlacError.d.ts',
      monaco: 'file:///node_modules/@blac/core/errors/BlacError.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/errors/index.d.ts',
      monaco: 'file:///node_modules/@blac/core/errors/index.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/BlocBase.d.ts',
      monaco: 'file:///node_modules/@blac/core/BlocBase.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/Cubit.d.ts',
      monaco: 'file:///node_modules/@blac/core/Cubit.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/Bloc.d.ts',
      monaco: 'file:///node_modules/@blac/core/Bloc.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/Blac.d.ts',
      monaco: 'file:///node_modules/@blac/core/Blac.d.ts',
    },
    {
      path: '/node_modules/@blac/core/dist/index.d.ts',
      monaco: 'file:///node_modules/@blac/core/index.d.ts',
    },

    // React integration types
    {
      path: '/node_modules/@blac/react/dist/useBloc.d.ts',
      monaco: 'file:///node_modules/@blac/react/useBloc.d.ts',
    },
    {
      path: '/node_modules/@blac/react/dist/useExternalBlocStore.d.ts',
      monaco: 'file:///node_modules/@blac/react/useExternalBlocStore.d.ts',
    },
    {
      path: '/node_modules/@blac/react/dist/index.d.ts',
      monaco: 'file:///node_modules/@blac/react/index.d.ts',
    },
  ];

  const definitions: TypeDefinition[] = [];

  // Try to load from actual built files first
  for (const file of typeFiles) {
    try {
      const response = await fetch(file.path);
      if (response.ok) {
        const content = await response.text();
        definitions.push({
          content,
          filePath: file.monaco,
        });
      }
    } catch (error) {
      console.warn(`Could not load type definition from ${file.path}:`, error);
    }
  }

  // If we couldn't load the actual files, return empty array
  // The fallback manual definitions will be used instead
  return definitions;
}

// Basic React types that are always needed
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

// WeakRef polyfill for older environments
export const weakRefPolyfill = `
declare global {
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
