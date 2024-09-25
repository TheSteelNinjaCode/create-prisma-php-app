import { createProxyMiddleware } from "http-proxy-middleware";
import { readFileSync, writeFileSync } from "fs";
import chokidar from "chokidar";
import browserSync from "browser-sync";
// import prismaPhpConfig from "../prisma-php.json" assert { type: "json" };
import { generateFileListJson } from "./files-list.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const bs = browserSync.create();
const prismaPhpConfig = JSON.parse(readFileSync(join(__dirname, "..", "prisma-php.json")).toString("utf-8"));
// Watch for file changes (create, delete, save)
const watcher = chokidar.watch("src/app/**/*", {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    persistent: true,
    usePolling: true,
    interval: 1000,
});
// Perform specific actions for file events
watcher
    .on("add", (path) => {
    generateFileListJson();
})
    .on("change", (path) => {
    generateFileListJson();
})
    .on("unlink", (path) => {
    generateFileListJson();
});
// BrowserSync initialization
bs.init({
    proxy: "http://localhost:3000",
    middleware: [
        (req, res, next) => {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
            next();
        },
        createProxyMiddleware({
            target: prismaPhpConfig.bsTarget,
            changeOrigin: true,
            pathRewrite: prismaPhpConfig.ngrok ? {} : prismaPhpConfig.bsPathRewrite,
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
}, (err, bsInstance) => {
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
    writeFileSync(join(__dirname, "bs-config.json"), JSON.stringify(urls, null, 2));
});
