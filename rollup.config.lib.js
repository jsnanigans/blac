import dts from "rollup-plugin-dts";
import pkg from "./package.json";
import external from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";


const name = require("./package.json").main.replace(/\.js$/, "");

const bundle = config => ({
  ...config,
  input: "src/lib/index.ts",
  external: id => !/^[./]/.test(id)
});

export default [
  bundle({
    plugins: [
      external(),
      resolve(),
      commonjs(),
      typescript({ useTsconfigDeclarationDir: true }),
    ],
    output: [
      { file: pkg.main, format: "cjs", sourcemap: true },
      { file: pkg.module, format: "esm", sourcemap: true }
    ]
  }),
  bundle({
    plugins: [
      external(),
      dts()
    ],
    output: {
      file: `${name}.d.ts`,
      format: "es"
    }
  })
];