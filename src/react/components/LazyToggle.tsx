import { Button, FormControlLabel, Switch } from '@material-ui/core';
import { ToggleButton } from '@material-ui/lab';
import React from 'react';
import { Bloc } from '../../lib';
import { BlocBuilder, useBloc } from '../state';

const to = (): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(-1);
    }, 1500);
  });
}

class CounterEvent {}
class CounterIncrementPressed extends CounterEvent {}

class LazyBloc extends Bloc<CounterEvent, number> {
  constructor() {
    super(0);

    this.on(CounterIncrementPressed, async (event, emit) => {
      emit(this.state + 1);
      const add = await to(); 
      emit(this.state + add);
    });
  }
}

const LazyToggle = () => {
  const [state, bloc] = useBloc(LazyBloc, {
    create: () => new LazyBloc(),
  });

  return <Button onClick={() => bloc.add(CounterIncrementPressed)}>{state}</Button>;
};

export default LazyToggle;
