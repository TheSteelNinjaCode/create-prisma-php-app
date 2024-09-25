import { spawn } from "child_process";
import path, { dirname } from "path";
import chokidar from "chokidar";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Define paths
const phpPath = "php"; // Adjust if necessary to include the full path to PHP
const serverScriptPath = path.join(__dirname, "..", "src", "Lib", "Websocket", "server.php");
// Hold the server process
let serverProcess = null;
const restartServer = () => {
    // If a server process already exists, kill it
    if (serverProcess) {
        console.log("Stopping WebSocket server...");
        serverProcess.kill("SIGINT"); // Adjust the signal as necessary for your environment
        serverProcess = null;
    }
    // Start a new WebSocket server process
    console.log("Starting WebSocket server...");
    serverProcess = spawn(phpPath, [serverScriptPath]);
    serverProcess.stdout?.on("data", (data) => {
        console.log(`WebSocket Server: ${data.toString()}`);
    });
    serverProcess.stderr?.on("data", (data) => {
        console.error(`WebSocket Server Error: ${data.toString()}`);
    });
    serverProcess.on("close", (code) => {
        console.log(`WebSocket server process exited with code ${code}`);
    });
};
// Initial start
restartServer();
// Watch for changes and restart the server
chokidar
    .watch(path.join(__dirname, "..", "src", "Lib", "Websocket", "**", "*"))
    .on("change", (path) => {
    console.log(`File changed: ${path}`);
    restartServer();
});
