import { Cubit } from 'blac';
import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { useBloc } from '../../src';
import BlocProvider from '../../src/BlocProvider';
import Scope from './Scope';
import { CounterGlobalCubit } from './state';

export class CounterCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
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
const LocalCounter: FC<{ children?: ReactNode; name: string; cubit?: any }> = ({
  children,
  name,
}) => {
  const [count, { increment }] = useBloc(CounterCubit);
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

const CounterScoped: FC = () => {
  const cubitA = useMemo(() => new CounterCubit(0), []);
  const [showDynamic, setShowDynamic] = useState(true);
  return (
    <div>
      <Scope name="Scope A">
        <BlocProvider bloc={cubitA}>
          <LocalCounter name="A" />
        </BlocProvider>
      </Scope>

      <Scope name="Scope B">
        <BlocProvider bloc={() => new CounterCubit(0)}>
          <LocalCounter name="B">
            <br />
            <br />
            <label>
              <input
                type="checkbox"
                checked={showDynamic}
                onChange={() => setShowDynamic((e) => !e)}
              ></input>
              Show:
            </label>
            {showDynamic && (
              <Scope name="Scope C, inside B">
                <BlocProvider bloc={() => new CounterCubit(0)}>
                  <LocalCounter name="C" />

                  <Scope name="Scope A, inside C">
                    <BlocProvider bloc={cubitA} debug>
                      <LocalCounter name="A" />
                    </BlocProvider>
                  </Scope>

                  <Scope name="Global bloc here">
                    <GlobalCounter name={'Global'} />
                  </Scope>
                </BlocProvider>
              </Scope>
            )}
          </LocalCounter>
        </BlocProvider>
      </Scope>
    </div>
  );
};

export default CounterScoped;
