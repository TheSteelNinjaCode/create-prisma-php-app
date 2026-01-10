import { join } from "path";
import {
  createRestartableProcess,
  createSrcWatcher,
  DebouncedWorker,
  DEFAULT_AWF,
  onExit,
} from "./utils.js";

const phpPath = process.env.PHP_PATH ?? "php";
const SRC_DIR = join(process.cwd(), "src");
const serverScriptPath = join(
  SRC_DIR,
  "Lib",
  "Websocket",
  "websocket-server.php"
);

const ws = createRestartableProcess({
  name: "WebSocket",
  cmd: phpPath,
  args: [serverScriptPath],
  windowsKillTree: true,
});

ws.start();

const restarter = new DebouncedWorker(
  async () => {
    await ws.restart("file change");
  },
  400,
  "ws-restart"
);

createSrcWatcher(SRC_DIR, {
  exts: [".php", ".ts", ".js", ".json"],
  onEvent: (ev, _abs, rel) => restarter.schedule(`${ev}: ${rel}`),
  awaitWriteFinish: DEFAULT_AWF,
  logPrefix: "WS watch",
  usePolling: true,
  interval: 1000,
});

onExit(async () => {
  await ws.stop();
});
