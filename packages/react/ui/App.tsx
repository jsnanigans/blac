import React, { FC } from 'react';
import BlacApp from '../src/BlacApp';
import { blac } from './examples/state';
import Main from './main';

const App: FC = () => {
  return (
    <BlacApp blac={blac}>
      <Main />
    </BlacApp>
  );
};

export default App;
