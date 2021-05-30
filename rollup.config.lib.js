import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import pkg from "./package.json";
import external from "rollup-plugin-peer-deps-external";


const name = require("./package.json").main.replace(/\.js$/, "");

const bundle = config => ({
  ...config,
  input: "src/lib/index.ts",
  external: id => !/^[./]/.test(id)
});

export default [
  bundle({
    plugins: [esbuild()],
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