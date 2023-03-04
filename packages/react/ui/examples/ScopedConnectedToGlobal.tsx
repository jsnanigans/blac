import { Cubit } from 'blac';
import React, { FC, ReactNode, useMemo } from 'react';
import { useBloc } from '../../src';
import BlocProvider from '../../src/BlocProvider';
import Scope from './Scope';
import { CounterGlobalCubit } from './state';

export class LocalConnectedToGlobalBloc extends Cubit<number> {
  constructor() {
    super(0);
  }

  get globalCount(): number {
    return this.getGlobalBloc(CounterGlobalCubit)?.state ?? 0;
  }

  increment = () => {
    const glo = this.globalCount;
    this.emit(this.state + glo);
  };
}

const GlobalCounter: FC<{ children?: ReactNode; name: string; cubit?: any }> = ({
  children,
  name,
}) => {
  const [count, { increment }] = useBloc(CounterGlobalCubit);
  return (
    <div>
      <strong>
        {name}
        {': '}
      </strong>
      <button onClick={increment}>
        <>{count} - Increment</>
      </button>
      {children}
    </div>
  );
};


const LocalConnectedToGlobal: FC<{ children?: ReactNode; name: string; cubit?: any }> = ({
  children,
  name,
}) => {
  const [count, { increment }] = useBloc(LocalConnectedToGlobalBloc);
  return (
    <div>
      <strong>
        {name}
        {': '}
      </strong>
      <button onClick={increment}>
        <>{count} - Increment</>
      </button>
      {children}
    </div>
  );
};

const ScopedConnectedToGlobal: FC = () => {
  const cubitA = useMemo(() => new LocalConnectedToGlobalBloc(), []);
  
  return (
    <div>
      <Scope name="Local">
        <BlocProvider bloc={cubitA}>
          <LocalConnectedToGlobal name="Local, adds >Global< to count on click" />
        </BlocProvider>
      </Scope>

      <Scope name="Global">
        <GlobalCounter name="Global" />
      </Scope>
    </div>
  );
};

export default ScopedConnectedToGlobal;
