import type { FC } from "react";
import React, { useMemo } from "react";
import Highlight from "react-highlight";
import "highlight.js/styles/vs2015.css";

const Code: FC<{ code: string }> = ({ code }) => {
    const formatted = useMemo(() => {
        let f = code.trim();
        f = f.replace(/from\s+["']\.\.\/\.\.\/src["']/g, "from \"@blac/react\"");

        return f;
    }, [code]);


    return <div className={"code-wrap"}>
        <Highlight className="chl">
            {formatted}
        </Highlight>
    </div>;
};

export default Code;
