#!/usr/bin/env node
import chalk from"chalk";import{spawn}from"child_process";import fs from"fs";import path from"path";import prompts from"prompts";const args=process.argv.slice(2),readJsonFile=e=>{const o=fs.readFileSync(e,"utf8");return JSON.parse(o)},executeCommand=(e,o=[],t={})=>new Promise(((r,s)=>{const a=spawn(e,o,{stdio:"inherit",shell:!0,...t});a.on("error",(e=>{s(e)})),a.on("close",(e=>{0===e?r():s(new Error(`Process exited with code ${e}`))}))}));async function getAnswer(){const e=[{type:"toggle",name:"shouldProceed",message:`This command will update the ${chalk.blue("create-prisma-php-app")} package and overwrite all default files. ${chalk.blue("Do you want to proceed")}?`,initial:!1,active:"Yes",inactive:"No"}],o=await prompts(e,{onCancel:()=>{process.exit(0)}});return 0===Object.keys(o).length?null:o}const commandsToExecute={update:"npx php update project"};
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
      if (!answer?.shouldProceed) {
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
};
main().catch((error) => {
  console.error("Unhandled error in main function:", error);
});
