// Run with Bun

const packageJsonConfig = {
  main: 'index.cjs.js',
  module: 'index.es.js',
  typings: 'src/index.d.ts',
  types: 'src/index.d.ts',
};

const filesToCopy = ['README.md', '.npmignore'];
const outputDir = 'dist';

(async () => {
  // copy files to outputDir
  for (const file of filesToCopy) {
    const input = Bun.file(file);
    const output = Bun.file(`${outputDir}/${file}`);
    await Bun.write(output, input);
  }

  // update package.json
  const packageJson = Bun.file(`package.json`);
  const content = await packageJson.text();
  const json = JSON.parse(content);

  // patch version
  const currentVersion = json.version;
  const versionParts = currentVersion.split('.');
  versionParts[2] = Number(versionParts[2]) + 1;
  const newVersion = versionParts.join('.');

  // update package.json version
  json.version = newVersion;
  await Bun.write(packageJson, JSON.stringify(json, null, 2));

  // write package.json in outputDir for publishing
  const publishContent = JSON.stringify(
    { ...json, ...packageJsonConfig },
    null,
    2,
  );
  await Bun.write(`${outputDir}/package.json`, publishContent);

  console.log('Files Copied to dist and modified');
})();
