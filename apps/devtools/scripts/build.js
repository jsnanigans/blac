/*
Folder structure:
- scripts
  - build.js (this script)
- src
  - tools
    - Panel.html
    - index.ts
  - popup
    - Panel.html
    - index.ts
  - background
    - index.ts
  - content
    - index.ts


 Run esbuild to bundle the app:

 Output folder structure:
 - dist
  - tools
    - Panel.html
    - index.js
  - popup
    - Panel.html
    - index.js
  - background
    - index.js
  - content
    - index.js
 */

import esbuild from "esbuild";
import fs from "fs";

const watchArg = process.argv[2];
const watch = watchArg === "--watch";

const outputDir = "dist";

// clear output dir
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true });
}
fs.mkdirSync(outputDir);

const buildPopup = async () => {
  if (!watch) {
    console.log("Building popup");
    await esbuild.build({
      entryPoints: ["src/popup/index.ts"],
      bundle: true,
      outfile: "dist/popup/index.js"
    });
    fs.copyFileSync("src/popup/Panel.html", "dist/popup/Panel.html");
    return;
  }

  //   watch for changes in the src folder
  if (watch) {
    const context = await esbuild.context({
      entryPoints: ["src/popup/index.ts"],
      bundle: true,
      outfile: "dist/popup/index.js"
    });

    await context.rebuild();
    fs.copyFileSync("src/popup/index.html", "dist/popup/index.html");
    console.log("Watching popup");

    let isRebuilding = false;
    //   watch for changes in the src folder
    fs.watch("src/popup", async (event, filename) => {
      if (isRebuilding) {
        return;
      }
      isRebuilding = true;
      console.log("Rebuilding popup");
      await context.rebuild();
      fs.copyFileSync("src/popup/index.html", "dist/popup/index.html");
      console.log("Watching popup");
      isRebuilding = false;
    });
  }
};

const buildContent = async () => {
  if (!watch) {
    console.log("Building content");
    await esbuild.build({
      entryPoints: ["src/content/index.ts"],
      bundle: true,
      outfile: "dist/content/index.js"
    });
    return;
  }

  //   watch for changes in the src folder
  if (watch) {
    const context = await esbuild.context({
      entryPoints: ["src/content/index.ts"],
      bundle: true,
      outfile: "dist/content/index.js"
    });

    await context.rebuild();
    console.log("Watching content");

    let isRebuilding = false;
    //   watch for changes in the src folder
    fs.watch("src/content", async (event, filename) => {
      if (isRebuilding) {
        return;
      }
      isRebuilding = true;
      console.log("Rebuilding content");
      await context.rebuild();
      console.log("Watching content");
      isRebuilding = false;
    });
  }
};


const buildBackground = async () => {
  if (!watch) {
    console.log("Building background");
    await esbuild.build({
      entryPoints: ["src/background/index.ts"],
      bundle: true,
      outfile: "dist/background/index.js"
    });
    return;
  }

  //   watch for changes in the src folder
  if (watch) {
    const context = await esbuild.context({
      entryPoints: ["src/background/index.ts"],
      bundle: true,
      outfile: "dist/background/index.js"
    });

    await context.rebuild();
    console.log("Watching background");

    let isRebuilding = false;
    //   watch for changes in the src folder
    fs.watch("src/background", async (event, filename) => {
      if (isRebuilding) {
        return;
      }
      isRebuilding = true;
      console.log("Rebuilding background");
      await context.rebuild();
      console.log("Watching background");
      isRebuilding = false;
    });
  }
};

const buildTools = async () => {
  if (!watch) {
    console.log("Building tools");
    await esbuild.build({
      entryPoints: ["src/tools/index.ts", "src/tools/panel.ts", "src/tools/content_script.ts"],
      bundle: true,
      outdir: "dist/tools"
    });
    fs.copyFileSync("src/tools/Panel.html", "dist/tools/Panel.html");
    fs.copyFileSync("src/tools/index.html", "dist/tools/index.html");
    return;
  }

  //   watch for changes in the src folder
  //           text: 'You can mark the path "@types/chrome" as external to exclude it from the bundle, which will remove this error.'
  if (watch) {
    const context = await esbuild.context({
      entryPoints: ["src/tools/index.ts", "src/tools/panel.ts", "src/tools/content_script.ts"],
      bundle: true,
      outdir: "dist/tools",
      external: ["@types/chrome"]
    });

    await context.rebuild();
    fs.copyFileSync("src/tools/Panel.html", "dist/tools/Panel.html");
    fs.copyFileSync("src/tools/index.html", "dist/tools/index.html");
    console.log("Watching tools");

    let isRebuilding = false;
    //   watch for changes in the src folder
    fs.watch("src/tools", async (event, filename) => {
      if (isRebuilding) {
        return;
      }
      isRebuilding = true;
      console.log("Rebuilding tools");
      await context.rebuild();
      fs.copyFileSync("src/tools/Panel.html", "dist/tools/Panel.html");
      console.log("Watching tools");
      isRebuilding = false;
    });
  }
};


buildPopup();
buildContent();
buildBackground();
buildTools();