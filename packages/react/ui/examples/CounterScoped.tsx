import { Cubit } from 'blac';
import React, { Children, FC, ReactNode } from 'react';
import { useBloc } from '../../src';
import BlocProvider from '../../src/BlocProvider';
import { CounterGlobalCubit, globalCounterGlobalState } from './state';

const Scope: FC<{ children: ReactNode; name }> = ({ children, name }) => {
  return (
    <div
      style={{
        borderLeft: '1px solid black',
        padding: '1em 0 1em 1em',
        margin: '1em 0 1em 0',
      }}
    >
      <h4
        style={{
          margin: '0 0 1em 0',
        }}
      >
        {name}
      </h4>
      <div>{Children.only(children)}</div>
    </div>
  );
};

export class LocalCounterCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  };
  decrement = () => {
    this.emit(this.state - 1);
  };
}

const SingleCounter: FC<{ children?: ReactNode; name: string }> = ({
  children,
  name,
}) => {
  const [count, { increment, decrement }] = useBloc(LocalCounterCubit);
  return (
    <div>
      <strong>
        {name}
        {': '}
      </strong>
      <button onClick={decrement}>-</button>: {count} :
      <button onClick={increment}>+</button>
      {children}
    </div>
  );
};

const CounterScoped: FC = () => {
  return (
    <div>
      <Scope name="Scope A">
        <BlocProvider bloc={() => new LocalCounterCubit(1)}>
          <SingleCounter name="A" />
        </BlocProvider>
      </Scope>

      <Scope name="Scope B">
        <BlocProvider bloc={() => new LocalCounterCubit(3)}>
          <SingleCounter name="B">
            <Scope name="Scope C, inside B">
              <BlocProvider bloc={() => new LocalCounterCubit(4)}>
                <SingleCounter name="C" />
              </BlocProvider>
            </Scope>
          </SingleCounter>
        </BlocProvider>
      </Scope>

      {/* <Scope name="Scope D">
        <BlocProvider bloc={() => new CounterGlobalCubit(3)}>
          <SingleCounter name="D">
            <Scope name="Scope Global, inside D">
              <BlocProvider bloc={() => globalCounterGlobalState}>
                <SingleCounter name="Global" />
              </BlocProvider>
            </Scope>
          </SingleCounter>
        </BlocProvider>
      </Scope> */}

      {/* <Scope name="Scope Global">
        <BlocProvider bloc={CounterGlobalCubit}>
          <SingleCounter name="Global" />
        </BlocProvider>
      </Scope> */}
    </div>
  );
};

export default CounterScoped;
