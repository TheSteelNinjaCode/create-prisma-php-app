import { createProxyMiddleware } from "http-proxy-middleware";
import { writeFileSync } from "fs";
import chokidar from "chokidar";
import browserSync from "browser-sync";
import prismaPhpConfig from "../prisma-php.json";
import { generateFileListJson } from "./files-list.js";
import { join } from "path";
import { getFileMeta } from "./utils.js";
const { __dirname } = getFileMeta();
const bs = browserSync.create();
// Watch for file changes (create, delete, save)
const watcher = chokidar.watch("src/app/**/*", {
  ignored: /(^|[\/\\])\../, // Ignore dotfiles
  persistent: true,
  usePolling: true,
  interval: 1000,
});
// Perform specific actions for file events
watcher
  .on("add", () => {
    generateFileListJson();
  })
  .on("change", () => {
    generateFileListJson();
  })
  .on("unlink", () => {
    generateFileListJson();
  });
// BrowserSync initialization
bs.init(
  {
    proxy: "http://localhost:3000",
    middleware: [
      (_, res, next) => {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        next();
      },
      createProxyMiddleware({
        target: prismaPhpConfig.bsTarget,
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
