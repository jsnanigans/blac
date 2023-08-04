import type { FC, ReactNode } from "react";
import React from "react";
import { Cubit } from "blac";
import { useBloc } from "@blac/react";


class DemoCubit extends Cubit<{
  name: string;
  email: string;
}> {
  static create = () => new DemoCubit({
    name: "John Doe",
    email: ""
  });

  setName = (name: string) => this.emit({ ...this.state, name });
  setEmail = (email: string) => this.emit({ ...this.state, email });
}

const Flash: FC<{ children?: ReactNode }> = ({ children }) => {
  const rnd = Math.random();
  return <div className="flash">
    {children}
    <div className="highlight" key={rnd} />
  </div>;
};

const ShowName: FC = () => {
  const [{ name }] = useBloc(DemoCubit, ({ name }) => name);
  return <Flash>
    <p>Name: {name}</p>
  </Flash>;
};
const ChangeName: FC = () => {
  const [{ name }, { setName }] = useBloc(DemoCubit, ({ name }) => name);
  return <Flash>
    <label>
      Name: <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
    </label>
  </Flash>;
};

const ShowEmail: FC = () => {
  const [{ email }] = useBloc(DemoCubit, ({ email }) => email);
  return <Flash>
    <p>Email: {email}</p>
  </Flash>;
};
const ChangeEmail: FC = () => {
  const [{ email }, { setEmail }] = useBloc(DemoCubit, ({ email }) => email);
  return <Flash>
    <label>
      Email: <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
    </label>
  </Flash>;
};

const ShowAll: FC = () => {
  const [{ name, email }] = useBloc(DemoCubit);
  return <Flash>
    <p>Name: {name}</p>
    <p>Email: {email}</p>
  </Flash>;
};

const RerenderTest: FC = () => {
  return <div>
    <ShowName />
    <ShowEmail />
    <ShowAll />
    <hr />
    <ChangeName />
    <ChangeEmail />
  </div>;
};

export default RerenderTest;
