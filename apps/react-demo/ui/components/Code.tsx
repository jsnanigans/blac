import type { FC } from "react";
import React, { useMemo } from "react";
import Highlight from "react-highlight";
import "highlight.js/styles/github-dark.css";

const Code: FC<{ code: string }> = ({ code }) => {
  const formatted = useMemo(() => {
    let f = code.trim();

    // remove all imports
    // f = f.replace(/import.*?;/g, "");

    // replace `import x from "../../src"` with `import x from "@blac/react"`
    f = f.replace(/ from "\.\.\/\.\.\/src";/g, " from \"@blac/react\";");


    // remove default exports
    f = f.replace(/export default.*?;/g, "");
    // remove all export keywords
    f = f.replace(/export /g, "");


    // trim again
    f = f.trim();

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
