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

// Restartable MCP server
const mcp = createRestartableProcess({
  name: "MCP",
  cmd: phpPath,
  args: [serverScriptPath],
  windowsKillTree: true,
});

mcp.start();

// Debounced restarter
const restarter = new DebouncedWorker(
  async () => {
    await mcp.restart("file change");
  },
  250,
  "mcp-restart"
);

// Watch ./src for relevant changes
createSrcWatcher(watchRoot, {
  exts: [".php", ".ts", ".js", ".json"],
  onEvent: (ev, _abs, rel) => restarter.schedule(`${ev}: ${rel}`),
  awaitWriteFinish: DEFAULT_AWF,
  logPrefix: "MCP watch",
  usePolling: true,
  interval: 1000,
});

// Graceful shutdown
onExit(async () => {
  await mcp.stop();
});
