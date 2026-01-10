import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  createRestartableProcess,
  createSrcWatcher,
  DebouncedWorker,
  DEFAULT_AWF,
  onExit,
} from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const phpPath = process.env.PHP_PATH || "php";
const serverScriptPath = join(
  __dirname,
  "..",
  "src",
  "Lib",
  "MCP",
  "mcp-server.php"
);
const watchRoot = join(__dirname, "..", "src");

<<<<<<< HEAD
// Restartable MCP server
=======
>>>>>>> v4-dev
const mcp = createRestartableProcess({
  name: "MCP",
  cmd: phpPath,
  args: [serverScriptPath],
  windowsKillTree: true,
});

mcp.start();

<<<<<<< HEAD
// Debounced restarter
=======
>>>>>>> v4-dev
const restarter = new DebouncedWorker(
  async () => {
    await mcp.restart("file change");
  },
  250,
  "mcp-restart"
);

<<<<<<< HEAD
// Watch ./src for relevant changes
=======
>>>>>>> v4-dev
createSrcWatcher(watchRoot, {
  exts: [".php", ".ts", ".js", ".json"],
  onEvent: (ev, _abs, rel) => restarter.schedule(`${ev}: ${rel}`),
  awaitWriteFinish: DEFAULT_AWF,
  logPrefix: "MCP watch",
  usePolling: true,
  interval: 1000,
});

<<<<<<< HEAD
// Graceful shutdown
=======
>>>>>>> v4-dev
onExit(async () => {
  await mcp.stop();
});
