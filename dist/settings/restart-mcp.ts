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

const mcp = createRestartableProcess({
  name: "MCP",
  cmd: phpPath,
  args: [serverScriptPath],
  windowsKillTree: true,
});

mcp.start();

const restarter = new DebouncedWorker(
  async () => {
    await mcp.restart("file change");
  },
  250,
  "mcp-restart"
);

createSrcWatcher(watchRoot, {
  exts: [".php", ".ts", ".js", ".json"],
  onEvent: (ev, _abs, rel) => restarter.schedule(`${ev}: ${rel}`),
  awaitWriteFinish: DEFAULT_AWF,
  logPrefix: "MCP watch",
  usePolling: true,
  interval: 1000,
});

onExit(async () => {
  await mcp.stop();
});
