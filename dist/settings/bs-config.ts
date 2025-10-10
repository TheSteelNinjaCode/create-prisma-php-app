import { createProxyMiddleware } from "http-proxy-middleware";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import browserSync, { BrowserSyncInstance } from "browser-sync";
import prismaPhpConfigJson from "../prisma-php.json";
import { generateFileListJson } from "./files-list.js";
import { join, dirname } from "path";
import { getFileMeta, PUBLIC_DIR, SRC_DIR } from "./utils.js";
import { updateAllClassLogs } from "./class-log.js";
import {
  analyzeImportsInFile,
  getAllPhpFiles,
  updateComponentImports,
} from "./class-imports";
import { checkComponentImports } from "./component-import-checker";
import { DebouncedWorker, createSrcWatcher, DEFAULT_AWF } from "./utils.js";

const { __dirname } = getFileMeta();

const bs: BrowserSyncInstance = browserSync.create();

const pipeline = new DebouncedWorker(
  async () => {
    await generateFileListJson();
    await updateAllClassLogs();
    await updateComponentImports();

    const phpFiles = await getAllPhpFiles(SRC_DIR);
    for (const file of phpFiles) {
      const rawFileImports = await analyzeImportsInFile(file);
      const fileImports: Record<
        string,
        { className: string; filePath: string; importer?: string }[]
      > = {};
      for (const key in rawFileImports) {
        const v = rawFileImports[key];
        fileImports[key] = Array.isArray(v)
          ? v
          : [{ className: key, filePath: v }];
      }
      await checkComponentImports(file, fileImports);
    }

    if (bs.active) {
      bs.reload();
    }
  },
  350,
  "bs-pipeline"
);

const publicPipeline = new DebouncedWorker(
  async () => {
    console.log("→ Public directory changed, reloading browser...");
    if (bs.active) {
      bs.reload();
    }
  },
  350,
  "bs-public-pipeline"
);

createSrcWatcher(join(SRC_DIR, "**", "*"), {
  onEvent: (_ev, _abs, rel) => pipeline.schedule(rel),
  awaitWriteFinish: DEFAULT_AWF,
  logPrefix: "watch-src",
  usePolling: true,
  interval: 1000,
});

createSrcWatcher(join(PUBLIC_DIR, "**", "*"), {
  onEvent: (_ev, _abs, rel) => publicPipeline.schedule(rel),
  awaitWriteFinish: DEFAULT_AWF,
  logPrefix: "watch-public",
  usePolling: true,
  interval: 1000,
});

const viteFlagFile = join(__dirname, "..", ".pp", ".vite-build-complete");
mkdirSync(dirname(viteFlagFile), { recursive: true });
writeFileSync(viteFlagFile, "");

if (!existsSync(viteFlagFile)) {
  writeFileSync(viteFlagFile, "0");
}

createSrcWatcher(viteFlagFile, {
  onEvent: (ev) => {
    if (ev === "change" && bs.active) {
      console.log("→ Vite build complete, reloading browser...");
      bs.reload();
    }
  },
  awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  logPrefix: "watch-vite",
  usePolling: true,
  interval: 500,
});

bs.init(
  {
    proxy: "http://localhost:3000",
    middleware: [
      (_req, res, next) => {
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

    notify: false,
    open: false,
    ghostMode: false,
    codeSync: true,
  },
  (err, bsInstance) => {
    if (err) {
      console.error("BrowserSync failed to start:", err);
      return;
    }

    const urls = bsInstance.getOption("urls");
    const out = {
      local: urls.get("local"),
      external: urls.get("external"),
      ui: urls.get("ui"),
      uiExternal: urls.get("ui-external"),
    };

    writeFileSync(
      join(__dirname, "bs-config.json"),
      JSON.stringify(out, null, 2)
    );
    console.log("\n\x1b[90mPress Ctrl+C to stop.\x1b[0m\n");
  }
);
