import type { FC } from "react";
import React, { useMemo } from "react";
import Highlight from "react-highlight";
import "highlight.js/styles/atom-one-dark-reasonable.css";

const Code: FC<{ code: string }> = ({ code }) => {
  const formatted = useMemo(() => {
    let f = code.trim();
    f = f.replace(/from\s+["']\.\.\/\.\.\/src["']/g, "from \"@blac/react\"");
    f = f.replace("from \"blac/src\"", "from \"blac\"");

    return f;
  }, [code]);


  return <div className={"code-wrap"}>
    <h3>Code:</h3>
    <Highlight className="chl">
      {formatted}
    </Highlight>
  </div>;
};

export default Code;
