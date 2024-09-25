import fs, { readFileSync } from "fs";
import { join, basename, dirname, normalize, sep } from "path";
import { fileURLToPath } from "url";
// import prismaPhpConfig from "../prisma-php.json" assert { type: "json" };
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const prismaPhpConfig = JSON.parse(readFileSync(join(__dirname, "..", "prisma-php.json")).toString("utf-8"));
const newProjectName = basename(join(__dirname, ".."));
// Function to update the project name and paths in the JSON config
function updateProjectNameInConfig(filePath, newProjectName) {
    const filePathDir = dirname(filePath);
    // Update the projectName directly in the imported config
    prismaPhpConfig.projectName = newProjectName;
    // Update other paths
    prismaPhpConfig.projectRootPath = filePathDir;
    const targetPath = getTargetPath(filePathDir, prismaPhpConfig.phpEnvironment);
    prismaPhpConfig.bsTarget = `http://localhost${targetPath}`;
    prismaPhpConfig.bsPathRewrite["^/"] = targetPath;
    // Save the updated config back to the JSON file
    fs.writeFile(filePath, JSON.stringify(prismaPhpConfig, null, 2), "utf8", (err) => {
        if (err) {
            console.error("Error writing the updated JSON file:", err);
            return;
        }
        console.log("The project name, PHP path, and other paths have been updated successfully.");
    });
}
// Function to determine the target path for browser-sync
function getTargetPath(fullPath, environment) {
    const normalizedPath = normalize(fullPath);
    const webDirectories = {
        XAMPP: join("htdocs"),
        WAMP: join("www"),
        MAMP: join("htdocs"),
        LAMP: join("var", "www", "html"),
        LEMP: join("usr", "share", "nginx", "html"),
        AMPPS: join("www"),
        UniformServer: join("www"),
        EasyPHP: join("data", "localweb"),
    };
    const webDir = webDirectories[environment.toUpperCase()];
    if (!webDir) {
        throw new Error(`Unsupported environment: ${environment}`);
    }
    const indexOfWebDir = normalizedPath
        .toLowerCase()
        .indexOf(normalize(webDir).toLowerCase());
    if (indexOfWebDir === -1) {
        throw new Error(`Web directory not found in path: ${webDir}`);
    }
    const startIndex = indexOfWebDir + webDir.length;
    const subPath = normalizedPath.slice(startIndex);
    const safeSeparatorRegex = new RegExp(sep.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "g");
    const finalPath = subPath.replace(safeSeparatorRegex, "/") + "/";
    return finalPath;
}
// Path to your JSON configuration file (for saving changes)
const configFilePath = join(__dirname, "..", "prisma-php.json");
// Run the function with your config file path and the new project name
updateProjectNameInConfig(configFilePath, newProjectName);
