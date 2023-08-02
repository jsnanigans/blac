const dts = require("rollup-plugin-dts").default;
const external = require("rollup-plugin-peer-deps-external");
const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("rollup-plugin-typescript2");
const name = "blac-react";

const bundle = config => ({
  ...config,
  input: "src/index.ts",
  external: [
    "blac",
    "react",
    "react-dom"
  ]
});

module.exports = [
  bundle({
    plugins: [
      external(),
      resolve(),
      commonjs(),
      typescript({ useTsconfigDeclarationDir: true })
    ],
    output: [
      { file: "dist/blac-react.js", format: "cjs", sourcemap: true },
      { file: "dist/blac-react.esm.js", format: "esm", sourcemap: true }
    ]
  }),
  bundle({
    plugins: [
      external(),
      dts()
    ],
    output: {
      file: `dist/${name}.d.ts`,
      format: "es"
    }
  })
];
