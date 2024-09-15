#!/usr/bin/env node
import chalk from "chalk";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import prompts from "prompts";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const args = process.argv.slice(2);
const readJsonFile = (filePath) => {
  const jsonData = fs.readFileSync(filePath, "utf8");
  return JSON.parse(jsonData);
};
const executeCommand = (command, args = [], options = {}) => {
  return new Promise((resolve, reject) => {
    const process = spawn(
      command,
      args,
      Object.assign({ stdio: "inherit", shell: true }, options)
    );
    process.on("error", (error) => {
      console.error(`Execution error: ${error.message}`);
      reject(error);
    });
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
};
async function getAnswer() {
  const questions = [
    {
      type: "toggle",
      name: "shouldProceed",
      message: `This command will update the ${chalk.blue(
        "create-prisma-php-app"
      )} package and overwrite all default files. ${chalk.blue(
        "Do you want to proceed"
      )}?`,
      initial: false,
      active: "Yes",
      inactive: "No",
    },
  ];
  const onCancel = () => {
    console.log(chalk.red("Operation cancelled by the user."));
    process.exit(0);
  };
  const response = await prompts(questions, { onCancel });
  if (Object.keys(response).length === 0) {
    return null;
  }
  return response;
}
const commandsToExecute = {
  generateClass: "npx php generate class",
  update: "npx php update project",
};
const main = async () => {
  if (args.length === 0) {
    console.log("No command provided.");
    return;
  }
  const formattedCommand = `npx php ${args.join(" ")}`;
  const commandsArray = Object.values(commandsToExecute);
  if (!commandsArray.includes(formattedCommand)) {
    console.log("Command not recognized or not allowed.");
    return;
  }
  if (formattedCommand === commandsToExecute.update) {
    try {
      const answer = await getAnswer();
      if (
        !(answer === null || answer === void 0 ? void 0 : answer.shouldProceed)
      ) {
        console.log(chalk.red("Operation cancelled by the user."));
        return;
      }
      const currentDir = process.cwd();
      const configPath = path.join(currentDir, "prisma-php.json");
      if (!fs.existsSync(configPath)) {
        console.error(
          chalk.red(
            "The configuration file 'prisma-php.json' was not found in the current directory."
          )
        );
        return;
      }
      const localSettings = readJsonFile(configPath);
      const commandArgs = [localSettings.projectName];
      if (localSettings.backendOnly) commandArgs.push("--backend-only");
      if (localSettings.swaggerDocs) commandArgs.push("--swagger-docs");
      if (localSettings.tailwindcss) commandArgs.push("--tailwindcss");
      if (localSettings.websocket) commandArgs.push("--websocket");
      if (localSettings.prisma) commandArgs.push("--prisma");
      if (localSettings.docker) commandArgs.push("--docker");
      console.log("Executing command...\n");
      await executeCommand("npx", [
        "create-prisma-php-app@latest",
        ...commandArgs,
      ]);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("no such file or directory")) {
          console.error(
            chalk.red(
              "The configuration file 'prisma-php.json' was not found in the current directory."
            )
          );
        }
      } else {
        console.error("Error in script execution:", error);
      }
    }
  }
  if (formattedCommand === commandsToExecute.generateClass) {
    try {
      const currentDir = process.cwd();
      const configPath = path.join(currentDir, "prisma-php.json");
      if (!fs.existsSync(configPath)) {
        console.error(
          chalk.red(
            "The configuration file 'prisma-php.json' was not found in the current directory."
          )
        );
        return;
      }
      const localSettings = readJsonFile(configPath);
      if (!localSettings.prisma) {
        console.error(
          chalk.red(
            "Install the 'Prisma PHP ORM' package by running the command 'npx php update project'."
          )
        );
        return;
      }
      const prismaClientPath = path.join(
        __dirname,
        "prisma-client-php",
        "index.js"
      );
      if (!fs.existsSync(prismaClientPath)) {
        console.error(
          chalk.red(
            "The 'prisma-client-php' package was not found in the current directory."
          )
        );
        return;
      }
      console.log("Executing command...\n");
      await executeCommand("node", [prismaClientPath]);
    } catch (error) {
      console.error("Error in script execution:", error);
    }
  }
};
main().catch((error) => {
  console.error("Unhandled error in main function:", error);
});
