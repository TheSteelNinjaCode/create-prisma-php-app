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

const { __dirname } = getFileMeta();

(async () => {
  console.log("📦 Generating files for production...");

  // Run all watchers logic ONCE
  await generateFileListJson();
  await updateAllClassLogs();
  await updateComponentImports();

  const phpFiles = await getAllPhpFiles(SRC_DIR + "/app");
  for (const file of phpFiles) {
    const fileImports = await analyzeImportsInFile(file);
    await checkComponentImports(file, fileImports);
  }

  // Start BrowserSync just to extract URLs (and shut down immediately)
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

      console.log("✅ Generating files for production completed.");
      bs.exit(); // Shut down immediately
    }
  );
})();
