import React, { FC } from 'react';
import BlacApp from '../src/BlacApp';
import { blac } from './examples/state';
import Main from './Main';

const App: FC = () => {
  return (
    <BlacApp blac={blac}>
      APP
      <Main />
    </BlacApp>
  );
};

export default App;
