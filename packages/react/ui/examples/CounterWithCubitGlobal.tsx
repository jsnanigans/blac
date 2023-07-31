import React, { FC, useState } from "react";
import { useBloc } from '../../src';
import { CounterGlobalCubit } from './state';

const CounterWithCubitGlobal: FC<{showChild?: boolean}> = ({showChild = true}) => {
  const [count, { increment, decrement }] = useBloc(CounterGlobalCubit);
  const [showDynamic, setShowDynamic] = useState(true);

  return (
    <div>
      <>
      <button onClick={decrement}>-</button>: {count} :
      <button onClick={increment}>+</button>
      </>

      {showChild && (
        <>
          <hr />
          <div>
            <button onClick={() => setShowDynamic(!showDynamic)}>
              {showDynamic ? 'Hide' : 'Show'} Second Counter
            </button>
            <br />
            <br />
            {showDynamic && (
              <div>
                <CounterWithCubitGlobal showChild={false} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CounterWithCubitGlobal;
