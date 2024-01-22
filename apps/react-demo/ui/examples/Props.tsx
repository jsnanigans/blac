import { useBloc } from '@blac/react';
import { Cubit } from 'blac';
import React, { FC } from 'react';

type ExampleProps = {
  name: string;
};

class PropsBloc extends Cubit<{ display: string }, ExampleProps> {
  constructor() {
    super({ display: '' });
    this.updateDisplay();
  }

  updateDisplay = () => {
    const { name } = this.props ?? {};
    this.emit({ display: name ?? 'nothing' });
  };
}

const Props: FC = () => {
  const [{ display }] = useBloc(PropsBloc);

  return <div>{display}</div>;
};

function PropsExample() {
  const [] = useBloc(PropsBloc, {
    props: {
      name: `Date: ${new Date().toLocaleTimeString()}`,
    },
  });

  return (
    <div>
      <Props />
      <Props />
      <Props />
    </div>
  );
}

export default PropsExample;
