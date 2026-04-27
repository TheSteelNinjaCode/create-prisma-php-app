import { spawn } from "node:child_process";
import process from "node:process";

const mode: "watch" | "build" =
  process.argv[2] === "watch" ? "watch" : "build";

const args: string[] = [
  "--max-old-space-size=6144",
  "./node_modules/postcss-cli/index.js",
  "src/app/globals.css",
  "-o",
  "public/css/styles.css",
];

if (mode === "watch") {
  args.push("--watch");
}

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PP_POSTCSS_MODE: mode,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
