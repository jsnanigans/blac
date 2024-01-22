// Run with Bun

const packageJsonConfig = {
  main: 'index.cjs.js',
  module: 'index.es.js',
  typings: 'src/index.d.ts',
  types: 'src/index.d.ts',
};

const filesToCopy = ['README.md', 'LICENSE', 'CHANGELOG.md', 'package.json'];
const outputDir = 'dist';

(async () => {
  // copy files to outputDir
  for (const file of filesToCopy) {
    const input = Bun.file(file);
    const output = Bun.file(`${outputDir}/${file}`);
    await Bun.write(output, input);
  }

  // update package.json
  const packageJson = Bun.file(`${outputDir}/package.json`);
  const content = await packageJson.text();
  const json = JSON.parse(content);
  const newContent = JSON.stringify({ ...json, ...packageJsonConfig }, null, 2);
  await Bun.write(`${outputDir}/package.json`, newContent);
})();
