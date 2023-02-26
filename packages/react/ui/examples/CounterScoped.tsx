import { Cubit } from 'blac';
import React, { Children, FC, ReactNode, useCallback, useMemo } from 'react';
import { useBloc } from '../../src';
import BlocProvider from '../../src/BlocProvider';
import { CounterGlobalCubit, globalCounterGlobalState } from './state';

const Scope: FC<{ children: ReactNode; name }> = ({ children, name }) => {
  return (
    <div
      style={{
        borderLeft: '2px solid black',
        padding: '1em 0 1em 1em',
        margin: '1em 0 1em 1em',
        background: 'rgba(30,50,100,0.1)',
      }}
    >
      <h4
        style={{
          margin: '0 0 0.5em 0',
        }}
      >
        {name}
      </h4>
      <div>{children}</div>
    </div>
  );
};

export class CounterCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  };
}

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
            <Scope name="Scope C, inside B">
              <BlocProvider bloc={() => new CounterCubit(0)}>
                <LocalCounter name="C" />

                <Scope name="Scope A, inside C">
                  <BlocProvider bloc={cubitA}>
                    <LocalCounter name="A" />
                  </BlocProvider>
                </Scope>
              </BlocProvider>
            </Scope>
          </LocalCounter>
        </BlocProvider>
      </Scope>
    </div>
  );
};

export default CounterScoped;
