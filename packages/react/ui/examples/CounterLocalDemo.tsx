import { Cubit } from 'blac';
import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { BlocProvider, useBloc } from '../../src';
import Scope from './Scope';
import { CounterGlobalCubit } from './state';


export class CounterCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  };

  static create = () => new CounterCubit(0);
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

const LocalCounter: FC<{ children?: ReactNode; name: string; cubit?: any }> = ({
  children,
  name,
}) => {
  const [count, { increment }] = useBloc(CounterCubit, {
    create: true
  });

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


const CounterLocalDemo: FC = () => {
  const [showDynamic, setShowDynamic] = useState(true);
  return (
    <div>
      <Scope name="Stanadlone">
        <LocalCounter name="A" />
      </Scope>

      <Scope name="Dynamic">
        <button onClick={() => setShowDynamic(!showDynamic)}>
          {showDynamic ? 'Hide' : 'Show'}
        </button>
        {showDynamic && <LocalCounter name="B" />}
      </Scope>
    </div>
  );
};

export default CounterLocalDemo;
