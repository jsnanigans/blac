// bun runtime

// watch for any changes in ./src and run `npm run build` if any changes are detected

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const srcDir = path.join(__dirname, 'src');
let building = false;

const build = () => {
  console.log('Building...');
  exec('npm run build', (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      building = false;
      return;
    }
    console.log(stdout);
    console.log(stderr);
    building = false;
  });
};

const watch = () => {
  console.log('Watching for changes...');
  fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (building) {
      return;
    }
    building = true;
    console.log(`Change detected in ${filename}`);
    build();
  });
};

const main = () => {
  build();
  watch();
};

main();
