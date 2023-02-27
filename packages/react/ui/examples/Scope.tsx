import React, { FC, ReactNode } from "react";

const Scope: FC<{ children: ReactNode; name: string }> = ({ children, name }) => {
  return (
    <div
      className="scope"
    >
      <h4>
        {name}
      </h4>
      <div>{children}</div>
    </div>
  );
};

export default Scope;
