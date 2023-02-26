import { Cubit } from 'blac';
import React, { FC, ReactNode, useMemo } from 'react';
import { useBloc } from '../../src';
import BlocProvider from '../../src/BlocProvider';
import Scope from './Scope';

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
