import { exec, spawn } from "child_process";
import chalk from "chalk";
import { writeFileSync } from "fs";
import readline from "readline";

const BROWSERSYNC_PREFIX = "[Browsersync]";
const REGEX_PATTERNS = {
  BROWSERSYNC: /^\[Browsersync\]\s*(.+)$/,
  PROXYING: /Proxying/,
  ACCESS_URLS: /Access URLs:/,
  LOCAL_URL: /Local:\s*(http:\/\/.+)/,
  EXTERNAL_URL: /External:\s*(http:\/\/\S+)/,
  UI_URL: /UI:\s*(http:\/\/.+)/,
  UI_EXTERNAL_URL: /UI External:\s*(http:\/\/.+)/,
  WATCHING_FILES: /Watching files/,
};

async function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const process = exec(command, options);

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data;
    });

    process.stderr.on("data", (data) => {
      stderr += data;
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(`Command "${command}" exited with code ${code}\n${stderr}`)
        );
      }
    });
  });
}

async function startDev() {
  let browserSync;
  let devProcess;
  try {
    // Step 1: Start projectName and wait for it to complete
    console.log("Starting projectName...");
    const projectName = await runCommand("npm run projectName");
    console.log(projectName.stdout);

    // Step 2: Start browserSync and process its output
    console.log("Starting browser-sync...");
    browserSync = spawn("npm", ["run", "browserSync"], { shell: true });

    const formattedLog = {
      local: "",
      external: "",
      ui: "",
      uiExternal: "",
    };

    const rl = readline.createInterface({
      input: browserSync.stdout,
      crlfDelay: Infinity,
    });

    let browserSyncReady = false;

    rl.on("line", (line) => {
      if (REGEX_PATTERNS.PROXYING.test(line)) {
        const match = line.match(REGEX_PATTERNS.BROWSERSYNC);
        if (match) {
          console.log(`${chalk.blue(BROWSERSYNC_PREFIX)} ${match[1]}`);
        }
      } else if (REGEX_PATTERNS.ACCESS_URLS.test(line)) {
        const match = line.match(REGEX_PATTERNS.BROWSERSYNC);
        if (match) {
          console.log(`${chalk.blue(BROWSERSYNC_PREFIX)} ${match[1]}`);
        }
      } else if (REGEX_PATTERNS.LOCAL_URL.test(line)) {
        const match = line.match(REGEX_PATTERNS.LOCAL_URL);
        if (match) {
          const localUrl = match[1];
          formattedLog.local = localUrl;
          console.log(`${chalk.white("Local: ")}${chalk.cyanBright(localUrl)}`);
        }
      } else if (/^ {4}External:/.test(line)) {
        const match = line.match(REGEX_PATTERNS.EXTERNAL_URL);
        if (match) {
          const externalUrl = match[1];
          formattedLog.external = externalUrl;
          console.log(
            `${chalk.white("External: ")}${chalk.magentaBright(externalUrl)}`
          );
        }
      } else if (REGEX_PATTERNS.UI_URL.test(line)) {
        const match = line.match(REGEX_PATTERNS.UI_URL);
        if (match) {
          const uiUrl = match[1];
          formattedLog.ui = uiUrl;
          console.log(`${chalk.yellow("UI: ")}${chalk.cyanBright(uiUrl)}`);
        }
      } else if (REGEX_PATTERNS.UI_EXTERNAL_URL.test(line)) {
        const match = line.match(REGEX_PATTERNS.UI_EXTERNAL_URL);
        if (match) {
          const uiExternalUrl = match[1];
          formattedLog.uiExternal = uiExternalUrl;
          console.log(
            `${chalk.yellow("UI External: ")}${chalk.magentaBright(
              uiExternalUrl
            )}`
          );
        }
      } else if (REGEX_PATTERNS.WATCHING_FILES.test(line)) {
        console.log(`${chalk.blue(BROWSERSYNC_PREFIX)} Watching files...`);
        const outputPath = "./settings/bs-output.json";
        writeFileSync(
          outputPath,
          JSON.stringify(formattedLog, null, 2),
          "utf-8"
        );
        console.log(`Browser-sync output saved to ${outputPath}`);

        if (!browserSyncReady) {
          browserSyncReady = true;
          // Start npmRunAll after browserSync is ready
          startDevProcess();
        }
      } else if (REGEX_PATTERNS.BROWSERSYNC.test(line)) {
        const match = line.match(REGEX_PATTERNS.BROWSERSYNC);
        if (match) {
          console.log(`${chalk.blue(BROWSERSYNC_PREFIX)} ${match[1]}`);
        }
      } else {
        // Print any other notifications
        console.log(line);
      }
    });

    browserSync.stderr.on("data", (data) => {
      console.error(`browser-sync error: ${data.toString()}`);
    });

    browserSync.on("error", (err) => {
      console.error(`Failed to start browserSync process: ${err.message}`);
    });

    // Function to start npmRunAll process
    function startDevProcess() {
      console.log("Starting npmRunAll...");
      devProcess = spawn("npm", ["run", "npmRunAll"], { shell: true });

      devProcess.stdout.on("data", (data) => {
        process.stdout.write(data);
      });

      devProcess.stderr.on("data", (data) => {
        process.stderr.write(data);
      });

      devProcess.on("close", (code) => {
        console.log(`Dev process exited with code ${code}`);
      });

      devProcess.on("error", (err) => {
        console.error(`Failed to start dev process: ${err.message}`);
      });
    }

    // Handle browserSync close event
    browserSync.on("close", (code) => {
      console.log(`browserSync process exited with code ${code}`);
    });

    // Handle process exit and cleanup
    function handleExit() {
      if (browserSync) {
        browserSync.kill();
      }
      if (devProcess) {
        devProcess.kill();
      }
    }

    process.on("exit", handleExit);
    process.on("SIGINT", () => {
      handleExit();
      process.exit();
    });
    process.on("SIGTERM", () => {
      handleExit();
      process.exit();
    });
  } catch (error) {
    console.error("An error occurred:", error.message);
    process.exit(1);
  }
}

startDev();
