import { spawn, ChildProcess } from "child_process";
import { join } from "path";
import chokidar from "chokidar";
import { getFileMeta } from "./utils.js";

const { __dirname } = getFileMeta();

const phpPath = "php";
const serverScriptPath = join(
  __dirname,
  "..",
  "src",
  "Lib",
  "Websocket",
  "websocket-server.php"
);

let serverProcess: ChildProcess | null = null;

const restartServer = (): void => {
  if (serverProcess) {
    console.log("Stopping WebSocket server...");
    serverProcess.kill("SIGINT");
    serverProcess = null;
  }

  console.log("Starting WebSocket server...");
  serverProcess = spawn(phpPath, [serverScriptPath]);

  serverProcess.stdout?.on("data", (data: Buffer) => {
    console.log(`WebSocket Server: ${data.toString()}`);
  });

  serverProcess.stderr?.on("data", (data: Buffer) => {
    console.error(`WebSocket Server Error: ${data.toString()}`);
  });

  serverProcess.on("close", (code: number) => {
    console.log(`WebSocket server exited with code ${code}`);
  });
};

// Initial start
restartServer();

// Watch for changes
chokidar
  .watch(join(__dirname, "..", "src", "Websocket", "**", "*"))
  .on("change", (path: string) => {
    const fileChanged = path.split("\\").pop();
    console.log(`File changed: src/Lib/Websocket/${fileChanged}`);
    restartServer();
  });
