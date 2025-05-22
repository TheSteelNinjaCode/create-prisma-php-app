import { writeFileSync } from "fs";
import browserSync from "browser-sync";
import { getFileMeta } from "./utils.js";
import { join } from "path";
import { generateFileListJson } from "./files-list.js";
import { updateAllClassLogs } from "./class-log.js";
import {
  analyzeImportsInFile,
  getAllPhpFiles,
  SRC_DIR,
  updateComponentImports,
} from "./class-imports";
import { checkComponentImports } from "./component-import-checker";
import prismaPhpConfigJson from "../prisma-php.json";
import { exec as execCb } from "child_process";
import { promisify } from "util";

const exec = promisify(execCb);
const { __dirname } = getFileMeta();

(async () => {
  console.log("📦 Generating files for production...");

  // 1) Run all watchers logic ONCE
  await generateFileListJson();
  await updateAllClassLogs();
  await updateComponentImports();

  // 2) Start BrowserSync to extract URLs (and shut down immediately)
  await new Promise<void>((resolve, reject) => {
    const bs = browserSync.create();
    bs.init(
      {
        proxy: "http://localhost:3000",
        middleware: [],
        notify: false,
        open: false,
        ghostMode: false,
        codeSync: false,
        watchOptions: {
          usePolling: true,
          interval: 1000,
        },
      },
      (err, bsInstance) => {
        if (err) {
          console.error("❌ BrowserSync failed:", err);
          process.exit(1);
          return reject(err);
        }

        const options = bsInstance.getOption("urls");
        const urls = {
          local: options.get("local"),
          external: options.get("external"),
          ui: options.get("ui"),
          uiExternal: options.get("ui-external"),
        };

        writeFileSync(
          join(__dirname, "bs-config.json"),
          JSON.stringify(urls, null, 2)
        );

        console.log("✅ BrowserSync URLs extracted; shutting down.");
        bs.exit();
        resolve();
      }
    );
  });

  // 3) Run `npx ppo generate` and wait for it to finish
  if (prismaPhpConfigJson.prisma) {
    try {
      console.log("🚀 Running `npx ppo generate`...");
      const { stdout, stderr } = await exec("npx ppo generate");
      if (stderr) console.error(stderr);
      console.log(`stdout:\n${stdout}`);
    } catch (error: any) {
      console.error(`Error executing ppo generate: ${error.message}`);
      process.exit(1);
    }
  }

  // 4) Process all PHP files for component-import checks
  const phpFiles = await getAllPhpFiles(join(SRC_DIR, "app"));
  for (const file of phpFiles) {
    const rawFileImports = await analyzeImportsInFile(file);

    // Normalize imports into array-of-objects format
    const fileImports: Record<
      string,
      { className: string; filePath: string; importer?: string }[]
    > = {};

    for (const key in rawFileImports) {
      const val = rawFileImports[key];
      if (typeof val === "string") {
        fileImports[key] = [{ className: key, filePath: val }];
      } else {
        fileImports[key] = val;
      }
    }

    await checkComponentImports(file, fileImports);
  }

  console.log("✅ Generating files for production completed.");
})();
