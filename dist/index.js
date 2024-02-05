#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import chalk from "chalk";
import prompts from "prompts";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function configureBrowserSyncCommand(projectSettings) {
    // Identify the base path dynamically up to and including 'htdocs'
    const htdocsIndex = projectSettings.PROJECT_ROOT_PATH.indexOf("\\htdocs\\");
    if (htdocsIndex === -1) {
        console.error("Invalid PROJECT_ROOT_PATH. The path does not contain \\htdocs\\");
        return ""; // Return an empty string or handle the error as appropriate
    }
    // Extract the path up to and including 'htdocs\\'
    const basePathToRemove = projectSettings.PROJECT_ROOT_PATH.substring(0, htdocsIndex + "\\htdocs\\".length);
    // Escape backslashes for the regex pattern
    const escapedBasePathToRemove = basePathToRemove.replace(/\\/g, "\\\\");
    // Remove the base path and replace backslashes with forward slashes for URL compatibility
    const relativeWebPath = projectSettings.PROJECT_ROOT_PATH.replace(new RegExp(`^${escapedBasePathToRemove}`), "").replace(/\\/g, "/");
    // Construct the Browser Sync command with the correct proxy URL, being careful not to affect the protocol part
    let proxyUrl = `http://localhost/${relativeWebPath}`;
    // Ensure the proxy URL does not end with a slash before appending '/public'
    proxyUrl = proxyUrl.endsWith("/") ? proxyUrl.slice(0, -1) : proxyUrl;
    // Clean the URL by replacing "//" with "/" but not affecting "http://"
    // We replace instances of "//" that are not preceded by ":"
    const cleanUrl = proxyUrl.replace(/(?<!:)(\/\/+)/g, "/");
    // Return the Browser Sync command string, using the cleaned URL
    return `browser-sync start --proxy ${cleanUrl}/public --files public/**/*.*`;
}
async function updatePackageJson(baseDir, projectSettings, answer) {
    const packageJsonPath = path.join(baseDir, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    // Use the new function to configure the Browser Sync command
    const browserSyncCommand = configureBrowserSyncCommand(projectSettings);
    packageJson.scripts = Object.assign(Object.assign({}, packageJson.scripts), { postinstall: "prisma generate" });
    if (answer.tailwindcss) {
        packageJson.scripts = Object.assign(Object.assign({}, packageJson.scripts), { tailwind: "tailwindcss -i ./public/css/tailwind.css -o ./public/css/styles.css --minify --watch", "browser-sync": browserSyncCommand, dev: "npm-run-all --parallel browser-sync tailwind" });
    }
    else {
        packageJson.scripts = Object.assign(Object.assign({}, packageJson.scripts), { dev: browserSyncCommand });
    }
    packageJson.type = "module";
    packageJson.prisma = {
        seed: "node prisma/seed.js",
    };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}
// This function updates the .gitignore file
async function createUpdateGitignoreFile(baseDir, additions) {
    const gitignorePath = path.join(baseDir, ".gitignore");
    // Check if the .gitignore file exists, create if it doesn't
    let gitignoreContent = "";
    if (fs.existsSync(gitignorePath)) {
        gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
    }
    additions.forEach((addition) => {
        if (!gitignoreContent.includes(addition)) {
            gitignoreContent += `\n${addition}`;
        }
    });
    // Ensure there's no leading newline if the file was just created
    gitignoreContent = gitignoreContent.trimStart();
    fs.writeFileSync(gitignorePath, gitignoreContent);
}
// Recursive copy function
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats && stats.isDirectory(); // Add type guard to check if stats is truthy
    if (isDirectory) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach((childItemName) => copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName)));
    }
    else {
        fs.copyFileSync(src, dest);
    }
}
// Function to execute the recursive copy for entire directories
async function executeCopy(baseDir, directoriesToCopy) {
    directoriesToCopy.forEach(({ srcDir, destDir }) => {
        const sourcePath = path.join(__dirname, srcDir);
        const destPath = path.join(baseDir, destDir);
        copyRecursiveSync(sourcePath, destPath);
    });
}
function modifyTailwindConfig(baseDir) {
    const filePath = path.join(baseDir, "tailwind.config.js");
    const newContent = [
        "./public/**/*.php",
        "./public/**/*.html",
        // Add more paths as needed
    ];
    let configData = fs.readFileSync(filePath, "utf8");
    const contentArrayString = newContent
        .map((item) => `    "${item}"`)
        .join(",\n");
    configData = configData.replace(/content: \[\],/g, `content: [\n${contentArrayString}\n  ],`);
    fs.writeFileSync(filePath, configData, "utf8");
    console.log(chalk.green("Tailwind configuration updated successfully."));
}
function modifyIndexPHP(baseDir, useTailwind) {
    const indexPath = path.join(baseDir, "public", "index.php");
    try {
        let indexContent = fs.readFileSync(indexPath, "utf8");
        // Tailwind CSS link or CDN script
        const tailwindLink = useTailwind
            ? '    <link href="css/styles.css" rel="stylesheet"> <!-- Stylesheet link to the tailwind compiled css -->'
            : '    <script src="https://cdn.tailwindcss.com"></script>';
        // Insert before the closing </head> tag
        indexContent = indexContent.replace("</head>", `${tailwindLink}\n</head>`);
        fs.writeFileSync(indexPath, indexContent, "utf8");
        console.log(chalk.green(`index.php modified successfully for ${useTailwind ? "local Tailwind CSS" : "Tailwind CSS CDN"}.`));
    }
    catch (error) {
        console.error(chalk.red("Error modifying index.php:"), error);
    }
}
async function createDirectoryStructure(baseDir, answer, projectSettings) {
    await updatePackageJson(baseDir, projectSettings, answer);
    const filesToCopy = [
        { src: "/public/favicon.ico", dest: "/public/favicon.ico" },
        { src: "/public/index.php", dest: "/public/index.php" },
        { src: "/bootstrap.php", dest: "/bootstrap.php" },
        { src: "/../composer.json", dest: "/composer.json" },
        { src: "/../composer.lock", dest: "/composer.lock" },
    ];
    const directoriesToCopy = [
        {
            srcDir: "/settings",
            destDir: "/settings",
        },
        {
            srcDir: "/prisma",
            destDir: "/prisma",
        },
        {
            srcDir: "/src",
            destDir: "/src",
        },
        {
            srcDir: "/../vendor",
            destDir: "/vendor",
        },
    ];
    if (answer.tailwindcss) {
        directoriesToCopy.push({
            srcDir: "/public/css/",
            destDir: "/public/css/",
        });
    }
    directoriesToCopy.push({
        srcDir: "/public/assets/",
        destDir: "/public/assets/",
    });
    await executeCopy(baseDir, directoriesToCopy);
    filesToCopy.forEach(({ src, dest }) => {
        const sourcePath = path.join(__dirname, src);
        const destPath = path.join(baseDir, dest);
        const code = fs.readFileSync(sourcePath, "utf8");
        fs.writeFileSync(destPath, code);
    });
    if (answer.tailwindcss) {
        modifyTailwindConfig(baseDir);
        modifyIndexPHP(baseDir, true);
    }
    else {
        modifyIndexPHP(baseDir, false);
    }
}
async function getAnswer() {
    const questions = [
        {
            type: "text",
            name: "projectName",
            message: "What is your project named?",
            initial: "my-app",
        },
        {
            type: "toggle",
            name: "tailwindcss",
            message: `Would you like to use ${chalk.blue("Tailwind CSS")}?`,
            initial: true,
            active: "Yes",
            inactive: "No",
        },
    ];
    const onCancel = () => {
        return false;
    };
    try {
        const response = await prompts(questions, { onCancel });
        if (Object.keys(response).length === 0) {
            return null;
        }
        return {
            projectName: String(response.projectName).trim().replace(/ /g, "-"),
            tailwindcss: response.tailwindcss,
        };
    }
    catch (error) {
        console.error(chalk.red("Prompt error:"), error);
        return null;
    }
}
/**
 * Install dependencies in the specified directory.
 * @param {string} baseDir - The base directory where to install the dependencies.
 * @param {string[]} dependencies - The list of dependencies to install.
 * @param {boolean} [isDev=false] - Whether to install the dependencies as devDependencies.
 */
async function installDependencies(baseDir, dependencies, isDev = false) {
    console.log("Initializing new Node.js project...");
    // Initialize a package.json if it doesn't exist
    execSync("npm init -y", {
        stdio: "inherit",
        cwd: baseDir,
    });
    // Log the dependencies being installed
    console.log(`${isDev ? "Installing development dependencies" : "Installing dependencies"}:`);
    dependencies.forEach((dep) => console.log(`- ${chalk.blue(dep)}`));
    // Prepare the npm install command with the appropriate flag for dev dependencies
    const npmInstallCommand = `npm install ${isDev ? "--save-dev" : ""} ${dependencies.join(" ")}`;
    // Execute the npm install command
    execSync(npmInstallCommand, {
        stdio: "inherit",
        cwd: baseDir,
    });
}
async function main() {
    try {
        const answer = await getAnswer();
        if (answer === null) {
            console.log(chalk.red("Installation cancelled."));
            return;
        }
        execSync(`npm install -g create-prisma-php-app`, { stdio: "inherit" });
        // Support for browser-sync
        execSync(`npm install -g browser-sync`, { stdio: "inherit" });
        // Create the project directory
        fs.mkdirSync(answer.projectName);
        const projectPath = path.join(process.cwd(), answer.projectName);
        process.chdir(answer.projectName);
        const dependencies = [
            "prisma",
            "@prisma/client",
            "typescript",
            "@types/node",
            "ts-node",
            "npm-run-all",
        ];
        if (answer.tailwindcss) {
            dependencies.push("tailwindcss", "autoprefixer", "postcss");
        }
        await installDependencies(projectPath, dependencies, true);
        execSync(`npx prisma init`, { stdio: "inherit" });
        execSync(`npx tsc --init`, { stdio: "inherit" });
        if (answer.tailwindcss) {
            execSync(`npx tailwindcss init -p`, { stdio: "inherit" });
        }
        const projectSettings = {
            PROJECT_NAME: answer.projectName,
            PROJECT_ROOT_PATH: projectPath.replace(/\\/g, "\\\\"),
            PHP_ROOT_PATH_EXE: "D:\\\\xampp\\\\php\\\\php.exe",
            PHP_GENERATE_CLASS_PATH: "src/app/classes/prisma",
        };
        await createDirectoryStructure(projectPath, answer, projectSettings);
        if (answer.tailwindcss) {
            execSync(`npx tailwindcss -i ./public/css/tailwind.css -o ./public/css/styles.css --minify`, { stdio: "inherit" });
        }
        // execSync(`composer install`, { stdio: "inherit" });
        // execSync(`composer dump-autoload`, { stdio: "inherit" });
        // Create settings file
        const settingsPath = path.join(projectPath, "settings", "project-settings.js");
        const settingsCode = `export const projectSettings = {
        PROJECT_NAME: "${answer.projectName}",
        PROJECT_ROOT_PATH: "${projectPath.replace(/\\/g, "\\\\")}",
        PHP_ROOT_PATH_EXE: "D:\\\\xampp\\\\php\\\\php.exe",
        PHP_GENERATE_CLASS_PATH: "src/app/classes/prisma",
        };`;
        fs.writeFileSync(settingsPath, settingsCode);
        console.log(`${chalk.green("Success!")} Prisma PHP project successfully created in ${answer.projectName}!`);
    }
    catch (error) {
        console.error("Error while creating the project:", error);
        process.exit(1);
    }
}
main();
