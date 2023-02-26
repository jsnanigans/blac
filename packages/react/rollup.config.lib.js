import dts from "rollup-plugin-dts";
import external from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
const name = 'blac-react';

const bundle = config => ({
  ...config,
  input: "src/index.ts",
  external: [
    'blac',
    'react',
    'react-dom'
  ],
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
      { file: 'dist/blac-react.cjs.js', format: "cjs", sourcemap: true },
      { file: 'dist/blac-react.esm.js', format: "esm", sourcemap: true }
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
