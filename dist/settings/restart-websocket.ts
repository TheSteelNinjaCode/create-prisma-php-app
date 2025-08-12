import { join } from "path";
import {
  createRestartableProcess,
  createSrcWatcher,
  DebouncedWorker,
  DEFAULT_AWF,
  onExit,
} from "./utils.js";

// Config
const phpPath = process.env.PHP_PATH ?? "php";
const SRC_DIR = join(process.cwd(), "src");
const serverScriptPath = join(
  SRC_DIR,
  "Lib",
  "Websocket",
  "websocket-server.php"
);

// Restartable WS server
const ws = createRestartableProcess({
  name: "WebSocket",
  cmd: phpPath,
  args: [serverScriptPath],
  windowsKillTree: true,
});

ws.start();

// Debounced restarter
const restarter = new DebouncedWorker(
  async () => {
    await ws.restart("file change");
  },
  400,
  "ws-restart"
);

// Watch ./src recursively; restart on code/data file changes
createSrcWatcher(SRC_DIR, {
  exts: [".php", ".ts", ".js", ".json"],
  onEvent: (ev, _abs, rel) => restarter.schedule(`${ev}: ${rel}`),
  awaitWriteFinish: DEFAULT_AWF,
  logPrefix: "WS watch",
  usePolling: true,
  interval: 1000,
});

// Graceful shutdown
onExit(async () => {
  await ws.stop();
});
