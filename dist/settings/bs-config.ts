import { createProxyMiddleware } from "http-proxy-middleware";
import { writeFileSync } from "fs";
import chokidar from "chokidar";
import browserSync, { BrowserSyncInstance } from "browser-sync";
import prismaPhpConfigJson from "../prisma-php.json";
import { generateFileListJson } from "./files-list.js";
import { join } from "path";
import { getFileMeta } from "./utils.js";
import { updateAllClassLogs } from "./class-log.js";
import {
  analyzeImportsInFile,
  getAllPhpFiles,
  SRC_DIR,
  updateComponentImports,
} from "./class-imports";
import { checkComponentImports } from "./component-import-checker";

const { __dirname } = getFileMeta();

const bs: BrowserSyncInstance = browserSync.create();

// Watch for file changes (create, delete, save)
const watcher = chokidar.watch("src/app/**/*", {
  ignored: /(^|[\/\\])\../, // Ignore dotfiles
  persistent: true,
  usePolling: true,
  interval: 1000,
});

// On changes, generate file list and also update the class log
const handleFileChange = async () => {
  await generateFileListJson();
  await updateAllClassLogs();
  await updateComponentImports();

  // Optionally, run the component check on each PHP file.
  const phpFiles = await getAllPhpFiles(SRC_DIR + "/app");
  for (const file of phpFiles) {
    const rawFileImports = await analyzeImportsInFile(file);
    // Convert Record<string, string> to Record<string, { className: string; filePath: string; importer?: string }[]>
    const fileImports: Record<
      string,
      | { className: string; filePath: string; importer?: string }[]
      | { className: string; filePath: string; importer?: string }
    > = {};
    for (const key in rawFileImports) {
      if (typeof rawFileImports[key] === "string") {
        fileImports[key] = [
          {
            className: key,
            filePath: rawFileImports[key],
          },
        ];
      } else {
        fileImports[key] = rawFileImports[key];
      }
    }
    await checkComponentImports(file, fileImports);
  }
};

// Perform specific actions for file events
watcher
  .on("add", handleFileChange)
  .on("change", handleFileChange)
  .on("unlink", handleFileChange);

// BrowserSync initialization
bs.init(
  {
    proxy: "http://localhost:3000",
    middleware: [
      (_: any, res: any, next: any) => {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        next();
      },
      createProxyMiddleware({
        target: prismaPhpConfigJson.bsTarget,
        changeOrigin: true,
        pathRewrite: {},
      }),
    ],
    files: "src/**/*.*",
    notify: false,
    open: false,
    ghostMode: false,
    codeSync: true, // Disable synchronization of code changes across clients
    watchOptions: {
      usePolling: true,
      interval: 1000,
    },
  },
  (err, bsInstance) => {
    if (err) {
      console.error("BrowserSync failed to start:", err);
      return;
    }

    // Retrieve the active URLs from the BrowserSync instance
    const options = bsInstance.getOption("urls");
    const localUrl = options.get("local");
    const externalUrl = options.get("external");
    const uiUrl = options.get("ui");
    const uiExternalUrl = options.get("ui-external");

    // Construct the URLs dynamically
    const urls = {
      local: localUrl,
      external: externalUrl,
      ui: uiUrl,
      uiExternal: uiExternalUrl,
    };

    writeFileSync(
      join(__dirname, "bs-config.json"),
      JSON.stringify(urls, null, 2)
    );
  }
);
