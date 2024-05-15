#!/usr/bin/env node
import chalk from"chalk";import{spawn}from"child_process";import fs from"fs";import path from"path";import prompts from"prompts";import{fileURLToPath}from"url";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename),args=process.argv.slice(2),readJsonFile=e=>{const t=fs.readFileSync(e,"utf8");return JSON.parse(t)},executeCommand=(e,t=[],o={})=>new Promise(((r,a)=>{const s=spawn(e,t,Object.assign({stdio:"inherit",shell:!0},o));s.on("error",(e=>{a(e)})),s.on("close",(e=>{0===e?r():a(new Error(`Process exited with code ${e}`))}))}));async function getAnswer(){const e=[{type:"toggle",name:"shouldProceed",message:`This command will update the ${chalk.blue("create-prisma-php-app")} package and overwrite all default files. ${chalk.blue("Do you want to proceed")}?`,initial:!1,active:"Yes",inactive:"No"}],t=await prompts(e,{onCancel:()=>{process.exit(0)}});return 0===Object.keys(t).length?null:t}const commandsToExecute={generateClass:"npx php generate class",update:"npx php update project"};
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
