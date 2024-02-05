#!/usr/bin/env node
import * as fs from "fs";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import CryptoJS from "crypto-js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const args = process.argv.slice(2);
const getSecretKey = () => {
    const data = fs.readFileSync(`${__dirname}/key.enc`, "utf8");
    if (data.length < 400) {
        throw new Error("File content is less than 400 characters.");
    }
    return data.substring(289, 335);
};
const decryptData = (encryptedData, secretKey) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
};
const executePHP = (command) => {
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution error: ${error}`);
            return;
        }
        if (stderr) {
            console.error(`Standard error: ${stderr}`);
            return;
        }
        console.log(`Standard output...\n${stdout}`);
    });
};
const main = async () => {
    if (args[0] === "generate" && args[1] === "class") {
        try {
            const currentDir = process.cwd();
            console.log("🚀 ~ main ~ currentDir:", currentDir);
            console.log("🚀 ~ __dirname:", __dirname);
            const settingsURL = pathToFileURL(path.join(currentDir, "settings", "project-settings.js"));
            const localSettings = await import(settingsURL.href);
            const projectSettings = localSettings.projectSettings;
            console.log("🚀 ~ main ~ projectSettings:", projectSettings);
            const phpGenerateClassPath = projectSettings.PHP_GENERATE_CLASS_PATH;
            const phpFile = `${__dirname}/index.php`;
            console.log("🚀 ~ main ~ phpFile:", phpFile);
            const encryptedFilePath = `${__dirname}/index.enc`;
            const secretKey = getSecretKey();
            const encryptedData = fs.readFileSync(encryptedFilePath, {
                encoding: "utf8",
            });
            const decryptedData = decryptData(encryptedData, secretKey);
            fs.writeFileSync(`${__dirname}/index.php`, decryptedData);
            const command = `${projectSettings.PHP_ROOT_PATH_EXE} ${phpFile} ${phpGenerateClassPath}`;
            console.log("Executing command...\n");
            executePHP(command);
        }
        catch (error) {
            console.error("Error in script execution:", error);
        }
    }
    else {
        console.log("Command not recognized.");
    }
};
main().catch((error) => {
    console.error("Unhandled error in main function:", error);
});
