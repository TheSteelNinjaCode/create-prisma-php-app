import { createProxyMiddleware } from "http-proxy-middleware";
<<<<<<< HEAD
import { writeFileSync } from "fs";
=======
import { writeFileSync, existsSync, mkdirSync } from "fs";
>>>>>>> v4-dev
import browserSync, { BrowserSyncInstance } from "browser-sync";
import prismaPhpConfigJson from "../prisma-php.json";
import { generateFileListJson } from "./files-list.js";
import { join, dirname, relative } from "path";
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

<<<<<<< HEAD
// ---------- Watcher (whole ./src) ----------
=======
const PUBLIC_IGNORE_DIRS = [''];

>>>>>>> v4-dev
const pipeline = new DebouncedWorker(
  async () => {
    await generateFileListJson();
    await updateAllClassLogs();
    await updateComponentImports();

<<<<<<< HEAD
    // Scan all PHP files in the whole SRC tree
    const phpFiles = await getAllPhpFiles(SRC_DIR);
    for (const file of phpFiles) {
      const rawFileImports = await analyzeImportsInFile(file);

      // Normalize to array-of-objects shape expected by the checker
=======
    const phpFiles = await getAllPhpFiles(SRC_DIR);
    for (const file of phpFiles) {
      const rawFileImports = await analyzeImportsInFile(file);
>>>>>>> v4-dev
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
<<<<<<< HEAD
=======

    if (bs.active) {
      bs.reload();
    }
>>>>>>> v4-dev
  },
  350,
  "bs-pipeline"
);

<<<<<<< HEAD
// watch the entire src; we don’t need an extension filter here
createSrcWatcher(join(SRC_DIR, "**", "*"), {
  onEvent: (_ev, _abs, rel) => pipeline.schedule(rel),
  awaitWriteFinish: DEFAULT_AWF,
  logPrefix: "watch",
=======
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
>>>>>>> v4-dev
  usePolling: true,
  interval: 1000,
});

<<<<<<< HEAD
// ---------- BrowserSync ----------
=======
createSrcWatcher(join(PUBLIC_DIR, "**", "*"), {
  onEvent: (_ev, abs, _) => {
    const relFromPublic = relative(PUBLIC_DIR, abs);
    const normalized = relFromPublic.replace(/\\/g, "/");

    const segments = normalized.split("/").filter(Boolean);
    const firstSegment = segments[0] || "";

    if (PUBLIC_IGNORE_DIRS.includes(firstSegment)) {
      return;
    }

    publicPipeline.schedule(relFromPublic);
  },
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

>>>>>>> v4-dev
bs.init(
  {
    /**
     * Proxy your PHP app (from prisma-php.json).
     * Use object form to enable WebSocket proxying.
     */
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

<<<<<<< HEAD
    files: `${SRC_DIR}/**/*.*`, // still do file-level reloads as a safety net
=======
>>>>>>> v4-dev
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

<<<<<<< HEAD
    // Write live URLs for other tooling
=======
>>>>>>> v4-dev
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
