#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import chalk from "chalk";
import prompts from "prompts";
import https from "https";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let updateAnswer = null;
const nonBackendFiles = [
  "favicon.ico",
  "\\src\\app\\index.php",
  "metadata.php",
  "not-found.php",
];
const dockerFiles = [
  ".dockerignore",
  "docker-compose.yml",
  "Dockerfile",
  "apache.conf",
];
function bsConfigUrls(projectRootPath) {
  // Identify the base path dynamically up to and including 'htdocs'
  const htdocsIndex = projectRootPath.indexOf("\\htdocs\\");
  if (htdocsIndex === -1) {
    console.error(
      "Invalid PROJECT_ROOT_PATH. The path does not contain \\htdocs\\"
    );
    return {
      bsTarget: "",
      bsPathRewrite: {},
    };
  }
  // Extract the path up to and including 'htdocs\\'
  const basePathToRemove = projectRootPath.substring(
    0,
    htdocsIndex + "\\htdocs\\".length
  );
  // Escape backslashes for the regex pattern
  const escapedBasePathToRemove = basePathToRemove.replace(/\\/g, "\\\\");
  // Remove the base path and replace backslashes with forward slashes for URL compatibility
  const relativeWebPath = projectRootPath
    .replace(new RegExp(`^${escapedBasePathToRemove}`), "")
    .replace(/\\/g, "/");
  // Construct the Browser Sync command with the correct proxy URL, being careful not to affect the protocol part
  let proxyUrl = `http://localhost/${relativeWebPath}`;
  // Ensure the proxy URL does not end with a slash before appending '/public'
  proxyUrl = proxyUrl.endsWith("/") ? proxyUrl.slice(0, -1) : proxyUrl;
  // Clean the URL by replacing "//" with "/" but not affecting "http://"
  // We replace instances of "//" that are not preceded by ":"
  const cleanUrl = proxyUrl.replace(/(?<!:)(\/\/+)/g, "/");
  const cleanRelativeWebPath = relativeWebPath.replace(/\/\/+/g, "/");
  // Correct the relativeWebPath to ensure it does not start with a "/"
  const adjustedRelativeWebPath = cleanRelativeWebPath.startsWith("/")
    ? cleanRelativeWebPath.substring(1)
    : cleanRelativeWebPath;
  return {
    bsTarget: `${cleanUrl}/`,
    bsPathRewrite: {
      "^/": `/${adjustedRelativeWebPath}/`,
    },
  };
}
function configureBrowserSyncCommand(baseDir) {
  // TypeScript content to write
  const bsConfigTsContent = `const { createProxyMiddleware } = require("http-proxy-middleware");
const fs = require("fs");

const jsonData = fs.readFileSync("prisma-php.json", "utf8");
const config = JSON.parse(jsonData);

module.exports = {
  proxy: "http://localhost:3000",
  middleware: [
    (req, res, next) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      next();
    },
    createProxyMiddleware({
      target: config.bsTarget,
      changeOrigin: true,
      pathRewrite: config.bsPathRewrite,
    }),
  ],
  files: "src/**/*.*",
  notify: false,
  open: false,
  ghostMode: false,
  codeSync: true, // Disable synchronization of code changes across clients
};`;
  // Determine the path and write the bs-config.js
  const bsConfigPath = path.join(baseDir, "settings", "bs-config.cjs");
  fs.writeFileSync(bsConfigPath, bsConfigTsContent, "utf8");
  // Return the Browser Sync command string, using the cleaned URL
  return `browser-sync start --config settings/bs-config.cjs`;
}
async function updatePackageJson(baseDir, answer) {
  const packageJsonPath = path.join(baseDir, "package.json");
  if (checkExcludeFiles(packageJsonPath)) return;
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  // Use the new function to configure the Browser Sync command
  const browserSyncCommand = configureBrowserSyncCommand(baseDir);
  packageJson.scripts = Object.assign(Object.assign({}, packageJson.scripts), {
    projectName: "node settings/project-name.cjs",
  });
  let answersToInclude = [];
  if (answer.tailwindcss) {
    packageJson.scripts = Object.assign(
      Object.assign({}, packageJson.scripts),
      {
        tailwind:
          "postcss ./src/app/css/tailwind.css -o ./src/app/css/styles.css --watch",
      }
    );
    answersToInclude.push("tailwind");
  }
  if (answer.websocket) {
    packageJson.scripts = Object.assign(
      Object.assign({}, packageJson.scripts),
      { websocket: "node ./settings/restart-websocket.cjs" }
    );
    answersToInclude.push("websocket");
  }
  // if (answer.prisma) {
  //   packageJson.scripts = {
  //     ...packageJson.scripts,
  //     postinstall: "prisma generate",
  //   };
  // }
  if (answer.docker) {
    packageJson.scripts = Object.assign(
      Object.assign({}, packageJson.scripts),
      { docker: "docker-compose up" }
    );
    answersToInclude.push("docker");
  }
  if (answer.swaggerDocs) {
    packageJson.scripts = Object.assign(
      Object.assign({}, packageJson.scripts),
      { "create-swagger-docs": "node settings/swagger-setup.js" }
    );
    answersToInclude.push("create-swagger-docs");
  }
  // Initialize with existing scripts
  let updatedScripts = Object.assign({}, packageJson.scripts);
  // Conditionally add "browser-sync" command
  updatedScripts.browserSync = browserSyncCommand;
  updatedScripts._dev =
    answersToInclude.length > 0
      ? `npm-run-all -p ${answersToInclude.join(" ")}`
      : 'echo "No additional scripts to run"';
  updatedScripts.startDev = `node settings/start-dev.js`;
  updatedScripts.dev = `npm run startDev`;
  // Finally, assign the updated scripts back to packageJson
  packageJson.scripts = updatedScripts;
  packageJson.type = "module";
  if (answer.prisma)
    packageJson.prisma = {
      seed: "node prisma/seed.js",
    };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}
async function updateComposerJson(baseDir, answer) {
  const composerJsonPath = path.join(baseDir, "composer.json");
  if (checkExcludeFiles(composerJsonPath)) return;
  let composerJson;
  // Check if the composer.json file exists
  if (fs.existsSync(composerJsonPath)) {
    // Read the current composer.json content
    const composerJsonContent = fs.readFileSync(composerJsonPath, "utf8");
    composerJson = JSON.parse(composerJsonContent);
  } else {
    console.error("composer.json does not exist.");
    return;
  }
  // Conditionally add WebSocket dependency
  if (answer.websocket) {
    composerJson.require = Object.assign(
      Object.assign({}, composerJson.require),
      { "cboden/ratchet": "^0.4.4" }
    );
  }
  if (answer.prisma) {
    composerJson.require = Object.assign(
      Object.assign({}, composerJson.require),
      { "ramsey/uuid": "5.x-dev", "hidehalo/nanoid-php": "1.x-dev" }
    );
  }
  // Write the modified composer.json back to the file
  fs.writeFileSync(composerJsonPath, JSON.stringify(composerJson, null, 2));
  console.log("composer.json updated successfully.");
}
async function updateIndexJsForWebSocket(baseDir, answer) {
  if (!answer.websocket) {
    return;
  }
  const indexPath = path.join(baseDir, "src", "app", "js", "index.js");
  if (checkExcludeFiles(indexPath)) return;
  let indexContent = fs.readFileSync(indexPath, "utf8");
  // WebSocket initialization code to be appended
  const webSocketCode = `
// WebSocket initialization
const ws = new WebSocket("ws://localhost:8080");
`;
  // Append WebSocket code if user chose to use WebSocket
  indexContent += webSocketCode;
  fs.writeFileSync(indexPath, indexContent, "utf8");
  console.log("WebSocket code added to index.js successfully.");
}
// This function updates the .gitignore file
async function createUpdateGitignoreFile(baseDir, additions) {
  const gitignorePath = path.join(baseDir, ".gitignore");
  if (checkExcludeFiles(gitignorePath)) return;
  let gitignoreContent = "";
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
function copyRecursiveSync(src, dest, answer) {
  var _a;
  console.log("🚀 ~ copyRecursiveSync ~ dest:", dest);
  console.log("🚀 ~ copyRecursiveSync ~ src:", src);
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats && stats.isDirectory();
  if (isDirectory) {
    const destLower = dest.toLowerCase();
    if (!answer.websocket && destLower.includes("src\\lib\\websocket")) return;
    if (!answer.prisma && destLower.includes("src\\lib\\prisma")) return;
    if (
      (answer.backendOnly && destLower.includes("src\\app\\js")) ||
      (answer.backendOnly && destLower.includes("src\\app\\css"))
    )
      return;
    if (!answer.swaggerDocs && destLower.includes("src\\app\\swagger-docs"))
      return;
    const destModified = dest.replace(/\\/g, "/");
    if (
      (_a =
        updateAnswer === null || updateAnswer === void 0
          ? void 0
          : updateAnswer.excludeFilePath) === null || _a === void 0
        ? void 0
        : _a.includes(destModified)
    )
      return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
        answer
      );
    });
  } else {
    if (checkExcludeFiles(dest)) return;
    if (
      !answer.tailwindcss &&
      (dest.includes("tailwind.css") || dest.includes("styles.css"))
    )
      return;
    if (
      !answer.websocket &&
      (dest.includes("restart-websocket.cjs") ||
        dest.includes("restart-websocket.bat"))
    )
      return;
    if (!answer.docker && dockerFiles.some((file) => dest.includes(file))) {
      return;
    }
    if (
      answer.backendOnly &&
      nonBackendFiles.some((file) => dest.includes(file))
    ) {
      return;
    }
    if (!answer.backendOnly && dest.includes("route.php")) return;
    if (
      answer.backendOnly &&
      !answer.swaggerDocs &&
      (dest.includes("start-dev.js") || dest.includes("swagger-setup.js"))
    ) {
      return;
    }
    fs.copyFileSync(src, dest, 0);
  }
}
// Function to execute the recursive copy for entire directories
async function executeCopy(baseDir, directoriesToCopy, answer) {
  directoriesToCopy.forEach(({ srcDir, destDir }) => {
    const sourcePath = path.join(__dirname, srcDir);
    const destPath = path.join(baseDir, destDir);
    copyRecursiveSync(sourcePath, destPath, answer);
  });
}
function createOrUpdateTailwindConfig(baseDir) {
  console.log("🚀 ~ createOrUpdateTailwindConfig ~ baseDir:", baseDir);
  const filePath = path.join(baseDir, "tailwind.config.js");
  if (checkExcludeFiles(filePath)) return;
  const newContent = [
    "./src/app/**/*.{html,js,php}",
    // Add more paths as needed
  ];
  let configData = fs.readFileSync(filePath, "utf8");
  console.log("🚀 ~ createOrUpdateTailwindConfig ~ configData:", configData);
  const contentArrayString = newContent
    .map((item) => `    "${item}"`)
    .join(",\n");
  configData = configData.replace(
    /content: \[\],/g,
    `content: [\n${contentArrayString}\n],`
  );
  fs.writeFileSync(filePath, configData, { flag: "w" });
  console.log(chalk.green("Tailwind configuration updated successfully."));
}
function modifyPostcssConfig(baseDir) {
  const filePath = path.join(baseDir, "postcss.config.js");
  if (checkExcludeFiles(filePath)) return;
  const newContent = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    cssnano: {},
  },
};`;
  fs.writeFileSync(filePath, newContent, { flag: "w" });
  console.log(chalk.green("postcss.config.js updated successfully."));
}
function modifyLayoutPHP(baseDir, answer) {
  const layoutPath = path.join(baseDir, "src", "app", "layout.php");
  if (checkExcludeFiles(layoutPath)) return;
  try {
    let indexContent = fs.readFileSync(layoutPath, "utf8");
    let stylesAndLinks = "";
    if (!answer.backendOnly) {
      stylesAndLinks = `\n    <link href="<?= $baseUrl; ?>/css/index.css" rel="stylesheet">\n    <script src="<?= $baseUrl; ?>/js/index.js"></script>`;
    }
    // Tailwind CSS link or CDN script
    let tailwindLink = "";
    if (!answer.backendOnly) {
      tailwindLink = answer.tailwindcss
        ? `    <link href="<?= $baseUrl; ?>/css/styles.css" rel="stylesheet"> ${stylesAndLinks}`
        : `    <script src="https://cdn.tailwindcss.com"></script> ${stylesAndLinks}`;
    }
    // Insert before the closing </head> tag
    const breakLine = tailwindLink.length > 0 ? "\n" : "";
    indexContent = indexContent.replace(
      "</head>",
      `${tailwindLink}${breakLine}    <!-- Dynamic Head -->
    <?= implode("\\n", $mainLayoutHead); ?>
</head>`
    );
    fs.writeFileSync(layoutPath, indexContent, { flag: "w" });
    console.log(
      chalk.green(
        `layout.php modified successfully for ${
          answer.tailwindcss ? "local Tailwind CSS" : "Tailwind CSS CDN"
        }.`
      )
    );
  } catch (error) {
    console.error(chalk.red("Error modifying layout.php:"), error);
  }
}
// This function updates or creates the .env file
async function createOrUpdateEnvFile(baseDir, content) {
  const envPath = path.join(baseDir, ".env");
  if (checkExcludeFiles(envPath)) return;
  console.log("🚀 ~ content:", content);
  fs.writeFileSync(envPath, content, { flag: "w" });
}
function checkExcludeFiles(destPath) {
  var _a, _b;
  if (
    !(updateAnswer === null || updateAnswer === void 0
      ? void 0
      : updateAnswer.isUpdate)
  )
    return false;
  return (_b =
    (_a =
      updateAnswer === null || updateAnswer === void 0
        ? void 0
        : updateAnswer.excludeFilePath) === null || _a === void 0
      ? void 0
      : _a.includes(destPath.replace(/\\/g, "/"))) !== null && _b !== void 0
    ? _b
    : false;
}
async function createDirectoryStructure(baseDir, answer) {
  console.log("🚀 ~ baseDir:", baseDir);
  console.log("🚀 ~ answer:", answer);
  const filesToCopy = [
    { src: "/bootstrap.php", dest: "/bootstrap.php" },
    { src: "/.htaccess", dest: "/.htaccess" },
    { src: "/../composer.json", dest: "/composer.json" },
  ];
  if (
    updateAnswer === null || updateAnswer === void 0
      ? void 0
      : updateAnswer.isUpdate
  ) {
    filesToCopy.push({ src: "/tsconfig.json", dest: "/tsconfig.json" });
    if (updateAnswer.tailwindcss) {
      filesToCopy.push(
        { src: "/postcss.config.js", dest: "/postcss.config.js" },
        { src: "/tailwind.config.js", dest: "/tailwind.config.js" }
      );
    }
  }
  const directoriesToCopy = [
    {
      srcDir: "/settings",
      destDir: "/settings",
    },
    {
      srcDir: "/src",
      destDir: "/src",
    },
  ];
  if (answer.backendOnly && answer.swaggerDocs) {
    directoriesToCopy.push({
      srcDir: "/swagger-docs-layout.php",
      destDir: "/src/app/layout.php",
    });
  }
  if (answer.swaggerDocs) {
    directoriesToCopy.push({
      srcDir: "/swagger-docs-index.php",
      destDir: "/src/app/swagger-docs/index.php",
    });
  }
  if (answer.prisma) {
    directoriesToCopy.push({
      srcDir: "/prisma",
      destDir: "/prisma",
    });
  }
  if (answer.docker) {
    directoriesToCopy.push(
      { srcDir: "/.dockerignore", destDir: "/.dockerignore" },
      { srcDir: "/docker-compose.yml", destDir: "/docker-compose.yml" },
      { srcDir: "/Dockerfile", destDir: "/Dockerfile" },
      { srcDir: "/apache.conf", destDir: "/apache.conf" }
    );
  }
  console.log("🚀 ~ directoriesToCopy:", directoriesToCopy);
  filesToCopy.forEach(({ src, dest }) => {
    const sourcePath = path.join(__dirname, src);
    const destPath = path.join(baseDir, dest);
    if (checkExcludeFiles(destPath)) return;
    const code = fs.readFileSync(sourcePath, "utf8");
    fs.writeFileSync(destPath, code, { flag: "w" });
  });
  await executeCopy(baseDir, directoriesToCopy, answer);
  await updatePackageJson(baseDir, answer);
  await updateComposerJson(baseDir, answer);
  if (!answer.backendOnly) {
    await updateIndexJsForWebSocket(baseDir, answer);
  }
  if (answer.tailwindcss) {
    createOrUpdateTailwindConfig(baseDir);
    modifyPostcssConfig(baseDir);
  }
  if (answer.tailwindcss || !answer.backendOnly || answer.swaggerDocs) {
    modifyLayoutPHP(baseDir, answer);
  }
  const prismaPHPEnvContent = `# Prisma PHP Auth Secret Key For development only - Change this in production
AUTH_SECRET=uxsjXVPHN038DEYls2Kw0QUgBcXKUyrjv416nIFWPY4=  
  
# PHPMailer
# SMTP_HOST=smtp.gmail.com or your SMTP host
# SMTP_USERNAME=john.doe@gmail.com or your SMTP username
# SMTP_PASSWORD=123456
# SMTP_PORT=587 for TLS, 465 for SSL or your SMTP port
# SMTP_ENCRYPTION=ssl or tls
# MAIL_FROM=john.doe@gmail.com
# MAIL_FROM_NAME="John Doe"

# SHOW ERRORS - Set to true to show errors in the browser for development only - Change this in production to false
SHOW_ERRORS=true

# ChatGPT API Key
# CHATGPT_API_KEY=sk-your-api-key

# APP TIMEZONE - Set your application timezone - Default is "UTC"
APP_TIMEZONE="UTC"`;
  if (answer.prisma) {
    const prismaEnvContent = `# Environment variables declared in this file are automatically made available to Prisma.
# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema

# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.
# See the documentation for all the connection string options: https://pris.ly/d/connection-strings

DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"`;
    const envContent = `${prismaEnvContent}\n\n${prismaPHPEnvContent}`;
    await createOrUpdateEnvFile(baseDir, envContent);
  } else {
    await createOrUpdateEnvFile(baseDir, prismaPHPEnvContent);
  }
  // Add vendor to .gitignore
  await createUpdateGitignoreFile(baseDir, ["vendor", ".env", "node_modules"]);
}
async function getAnswer(predefinedAnswers = {}) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
  console.log("🚀 ~ predefinedAnswers:", predefinedAnswers);
  const questionsArray = [];
  if (!predefinedAnswers.projectName) {
    questionsArray.push({
      type: "text",
      name: "projectName",
      message: "What is your project named?",
      initial: "my-app",
    });
  }
  if (!predefinedAnswers.backendOnly) {
    questionsArray.push({
      type: "toggle",
      name: "backendOnly",
      message: "Would you like to create a backend-only project?",
      initial: false,
      active: "Yes",
      inactive: "No",
    });
  }
  // Execute the initial questionsArray first
  const onCancel = () => {
    console.log(chalk.red("Operation cancelled by the user."));
    process.exit(0);
  };
  const initialResponse = await prompts(questionsArray, { onCancel });
  console.log("🚀 ~ initialResponse:", initialResponse);
  const nonBackendOnlyQuestionsArray = [];
  if (initialResponse.backendOnly || predefinedAnswers.backendOnly) {
    // If it's a backend-only project, skip Tailwind CSS, but ask other questions
    if (!predefinedAnswers.swaggerDocs) {
      nonBackendOnlyQuestionsArray.push({
        type: "toggle",
        name: "swaggerDocs",
        message: `Would you like to use ${chalk.blue("Swagger Docs")}?`,
        initial: false,
        active: "Yes",
        inactive: "No",
      });
    }
    if (!predefinedAnswers.websocket) {
      nonBackendOnlyQuestionsArray.push({
        type: "toggle",
        name: "websocket",
        message: `Would you like to use ${chalk.blue("Websocket")}?`,
        initial: true,
        active: "Yes",
        inactive: "No",
      });
    }
    if (!predefinedAnswers.prisma) {
      nonBackendOnlyQuestionsArray.push({
        type: "toggle",
        name: "prisma",
        message: `Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,
        initial: true,
        active: "Yes",
        inactive: "No",
      });
    }
    if (!predefinedAnswers.docker) {
      nonBackendOnlyQuestionsArray.push({
        type: "toggle",
        name: "docker",
        message: `Would you like to use ${chalk.blue("Docker")}?`,
        initial: false,
        active: "Yes",
        inactive: "No",
      });
    }
  } else {
    // If it's not a backend-only project, ask Tailwind CSS as well
    if (!predefinedAnswers.swaggerDocs) {
      nonBackendOnlyQuestionsArray.push({
        type: "toggle",
        name: "swaggerDocs",
        message: `Would you like to use ${chalk.blue("Swagger Docs")}?`,
        initial: false,
        active: "Yes",
        inactive: "No",
      });
    }
    if (!predefinedAnswers.tailwindcss) {
      nonBackendOnlyQuestionsArray.push({
        type: "toggle",
        name: "tailwindcss",
        message: `Would you like to use ${chalk.blue("Tailwind CSS")}?`,
        initial: true,
        active: "Yes",
        inactive: "No",
      });
    }
    if (!predefinedAnswers.websocket) {
      nonBackendOnlyQuestionsArray.push({
        type: "toggle",
        name: "websocket",
        message: `Would you like to use ${chalk.blue("Websocket")}?`,
        initial: true,
        active: "Yes",
        inactive: "No",
      });
    }
    if (!predefinedAnswers.prisma) {
      nonBackendOnlyQuestionsArray.push({
        type: "toggle",
        name: "prisma",
        message: `Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,
        initial: true,
        active: "Yes",
        inactive: "No",
      });
    }
    if (!predefinedAnswers.docker) {
      nonBackendOnlyQuestionsArray.push({
        type: "toggle",
        name: "docker",
        message: `Would you like to use ${chalk.blue("Docker")}?`,
        initial: false,
        active: "Yes",
        inactive: "No",
      });
    }
  }
  const nonBackendOnlyResponse = await prompts(nonBackendOnlyQuestionsArray, {
    onCancel,
  });
  console.log("🚀 ~ nonBackendOnlyResponse:", nonBackendOnlyResponse);
  return {
    projectName: initialResponse.projectName
      ? String(initialResponse.projectName).trim().replace(/ /g, "-")
      : (_a = predefinedAnswers.projectName) !== null && _a !== void 0
      ? _a
      : "my-app",
    backendOnly:
      (_c =
        (_b = initialResponse.backendOnly) !== null && _b !== void 0
          ? _b
          : predefinedAnswers.backendOnly) !== null && _c !== void 0
        ? _c
        : false,
    swaggerDocs:
      (_e =
        (_d = nonBackendOnlyResponse.swaggerDocs) !== null && _d !== void 0
          ? _d
          : predefinedAnswers.swaggerDocs) !== null && _e !== void 0
        ? _e
        : false,
    tailwindcss:
      (_g =
        (_f = nonBackendOnlyResponse.tailwindcss) !== null && _f !== void 0
          ? _f
          : predefinedAnswers.tailwindcss) !== null && _g !== void 0
        ? _g
        : false,
    websocket:
      (_j =
        (_h = nonBackendOnlyResponse.websocket) !== null && _h !== void 0
          ? _h
          : predefinedAnswers.websocket) !== null && _j !== void 0
        ? _j
        : false,
    prisma:
      (_l =
        (_k = nonBackendOnlyResponse.prisma) !== null && _k !== void 0
          ? _k
          : predefinedAnswers.prisma) !== null && _l !== void 0
        ? _l
        : false,
    docker:
      (_o =
        (_m = nonBackendOnlyResponse.docker) !== null && _m !== void 0
          ? _m
          : predefinedAnswers.docker) !== null && _o !== void 0
        ? _o
        : false,
  };
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
  if (!fs.existsSync(path.join(baseDir, "package.json")))
    execSync("npm init -y", {
      stdio: "inherit",
      cwd: baseDir,
    });
  // Log the dependencies being installed
  console.log(
    `${
      isDev ? "Installing development dependencies" : "Installing dependencies"
    }:`
  );
  dependencies.forEach((dep) => console.log(`- ${chalk.blue(dep)}`));
  // Prepare the npm install command with the appropriate flag for dev dependencies
  const npmInstallCommand = `npm install ${
    isDev ? "--save-dev" : ""
  } ${dependencies.join(" ")}`;
  // Execute the npm install command
  execSync(npmInstallCommand, {
    stdio: "inherit",
    cwd: baseDir,
  });
}
async function uninstallDependencies(baseDir, dependencies, isDev = false) {
  console.log("Uninstalling dependencies:");
  dependencies.forEach((dep) => console.log(`- ${chalk.blue(dep)}`));
  // Prepare the npm uninstall command with the appropriate flag for dev dependencies
  const npmUninstallCommand = `npm uninstall ${
    isDev ? "--save-dev" : "--save"
  } ${dependencies.join(" ")}`;
  // Execute the npm uninstall command
  execSync(npmUninstallCommand, {
    stdio: "inherit",
    cwd: baseDir,
  });
}
function fetchPackageVersion(packageName) {
  return new Promise((resolve, reject) => {
    https
      .get(`https://registry.npmjs.org/${packageName}`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed["dist-tags"].latest);
          } catch (error) {
            reject(new Error("Failed to parse JSON response"));
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}
const readJsonFile = (filePath) => {
  const jsonData = fs.readFileSync(filePath, "utf8");
  return JSON.parse(jsonData);
};
function compareVersions(installedVersion, currentVersion) {
  const installedVersionArray = installedVersion.split(".").map(Number);
  const currentVersionArray = currentVersion.split(".").map(Number);
  for (let i = 0; i < installedVersionArray.length; i++) {
    if (installedVersionArray[i] > currentVersionArray[i]) {
      return 1;
    } else if (installedVersionArray[i] < currentVersionArray[i]) {
      return -1;
    }
  }
  return 0;
}
function getInstalledPackageVersion(packageName) {
  try {
    const output = execSync(`npm list -g ${packageName} --depth=0`).toString();
    const versionMatch = output.match(
      new RegExp(`${packageName}@(\\d+\\.\\d+\\.\\d+)`)
    );
    if (versionMatch) {
      return versionMatch[1];
    } else {
      console.error(`Package ${packageName} is not installed`);
      return null;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return null;
  }
}
async function main() {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j;
  try {
    const args = process.argv.slice(2);
    let projectName = args[0];
    let answer = null;
    if (projectName) {
      let useBackendOnly = args.includes("--backend-only");
      let useSwaggerDocs = args.includes("--swagger-docs");
      let useTailwind = args.includes("--tailwindcss");
      let useWebsocket = args.includes("--websocket");
      let usePrisma = args.includes("--prisma");
      let useDocker = args.includes("--docker");
      const predefinedAnswers = {
        projectName,
        backendOnly: useBackendOnly,
        swaggerDocs: useSwaggerDocs,
        tailwindcss: useTailwind,
        websocket: useWebsocket,
        prisma: usePrisma,
        docker: useDocker,
      };
      console.log("🚀 ~ main ~ predefinedAnswers:", predefinedAnswers);
      answer = await getAnswer(predefinedAnswers);
      if (answer === null) {
        console.log(chalk.red("Installation cancelled."));
        return;
      }
      const currentDir = process.cwd();
      const configPath = path.join(currentDir, "prisma-php.json");
      const localSettings = readJsonFile(configPath);
      let excludeFiles = [];
      (_a = localSettings.excludeFiles) === null || _a === void 0
        ? void 0
        : _a.map((file) => {
            const filePath = path.join(currentDir, file);
            if (fs.existsSync(filePath))
              excludeFiles.push(filePath.replace(/\\/g, "/"));
          });
      updateAnswer = {
        projectName,
        backendOnly:
          (_b =
            answer === null || answer === void 0
              ? void 0
              : answer.backendOnly) !== null && _b !== void 0
            ? _b
            : false,
        swaggerDocs:
          (_c =
            answer === null || answer === void 0
              ? void 0
              : answer.swaggerDocs) !== null && _c !== void 0
            ? _c
            : false,
        tailwindcss:
          (_d =
            answer === null || answer === void 0
              ? void 0
              : answer.tailwindcss) !== null && _d !== void 0
            ? _d
            : false,
        websocket:
          (_e =
            answer === null || answer === void 0
              ? void 0
              : answer.websocket) !== null && _e !== void 0
            ? _e
            : false,
        prisma:
          (_f =
            answer === null || answer === void 0 ? void 0 : answer.prisma) !==
            null && _f !== void 0
            ? _f
            : false,
        docker:
          (_g =
            answer === null || answer === void 0 ? void 0 : answer.docker) !==
            null && _g !== void 0
            ? _g
            : false,
        isUpdate: true,
        excludeFiles:
          (_h = localSettings.excludeFiles) !== null && _h !== void 0 ? _h : [],
        excludeFilePath:
          excludeFiles !== null && excludeFiles !== void 0 ? excludeFiles : [],
        filePath: currentDir,
      };
    } else {
      answer = await getAnswer();
    }
    if (answer === null) {
      console.warn(chalk.red("Installation cancelled."));
      return;
    }
    const latestVersionOfCreatePrismaPhpApp = await fetchPackageVersion(
      "create-prisma-php-app"
    );
    const isCreatePrismaPhpAppInstalled = getInstalledPackageVersion(
      "create-prisma-php-app"
    );
    if (isCreatePrismaPhpAppInstalled) {
      if (
        compareVersions(
          isCreatePrismaPhpAppInstalled,
          latestVersionOfCreatePrismaPhpApp
        ) === -1
      ) {
        execSync(`npm uninstall -g create-prisma-php-app`, {
          stdio: "inherit",
        });
        execSync(`npm install -g create-prisma-php-app`, {
          stdio: "inherit",
        });
      }
    } else {
      execSync("npm install -g create-prisma-php-app", { stdio: "inherit" });
    }
    const latestVersionOfBrowserSync = await fetchPackageVersion(
      "browser-sync"
    );
    const isBrowserSyncInstalled = getInstalledPackageVersion("browser-sync");
    if (isBrowserSyncInstalled) {
      if (
        compareVersions(isBrowserSyncInstalled, latestVersionOfBrowserSync) ===
        -1
      ) {
        execSync(`npm uninstall -g browser-sync`, {
          stdio: "inherit",
        });
        execSync(`npm install -g browser-sync`, {
          stdio: "inherit",
        });
      }
    } else {
      execSync("npm install -g browser-sync", { stdio: "inherit" });
    }
    // Create the project directory
    if (!projectName) fs.mkdirSync(answer.projectName);
    const currentDir = process.cwd();
    let projectPath = projectName
      ? currentDir
      : path.join(currentDir, answer.projectName);
    if (!projectName) process.chdir(answer.projectName);
    const dependencies = [
      "typescript",
      "@types/node",
      "ts-node",
      "http-proxy-middleware@^3.0.0",
      "chalk",
      "npm-run-all",
    ];
    if (answer.swaggerDocs) {
      dependencies.push("swagger-jsdoc");
    }
    if (answer.tailwindcss) {
      dependencies.push(
        "tailwindcss",
        "autoprefixer",
        "postcss",
        "postcss-cli",
        "cssnano"
      );
    }
    if (answer.websocket) {
      dependencies.push("chokidar-cli");
    }
    if (answer.prisma) {
      dependencies.push("prisma", "@prisma/client");
    }
    await installDependencies(projectPath, dependencies, true);
    if (!projectName) {
      execSync(`npx tsc --init`, { stdio: "inherit" });
    }
    if (answer.tailwindcss)
      execSync(`npx tailwindcss init -p`, { stdio: "inherit" });
    if (answer.prisma) {
      if (!fs.existsSync(path.join(projectPath, "prisma")))
        execSync(`npx prisma init`, { stdio: "inherit" });
    }
    await createDirectoryStructure(projectPath, answer);
    const publicDirPath = path.join(projectPath, "public");
    if (!fs.existsSync(publicDirPath)) {
      fs.mkdirSync(publicDirPath);
    }
    if (
      updateAnswer === null || updateAnswer === void 0
        ? void 0
        : updateAnswer.isUpdate
    ) {
      const updateUninstallDependencies = [];
      if (updateAnswer.backendOnly) {
        nonBackendFiles.forEach((file) => {
          const filePath = path.join(projectPath, "src", "app", file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Delete each file if it exists
            console.log(`${file} was deleted successfully.`);
          } else {
            console.log(`${file} does not exist.`);
          }
        });
        const backendOnlyFolders = ["js", "css"];
        backendOnlyFolders.forEach((folder) => {
          const folderPath = path.join(projectPath, "src", "app", folder);
          if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true }); // Use fs.rmSync instead of fs.rmdirSync
            console.log(`${folder} was deleted successfully.`);
          } else {
            console.log(`${folder} does not exist.`);
          }
        });
      }
      if (!updateAnswer.swaggerDocs) {
        const swaggerDocsFolder = path.join(
          projectPath,
          "src",
          "app",
          "swagger-docs"
        );
        if (fs.existsSync(swaggerDocsFolder)) {
          fs.rmSync(swaggerDocsFolder, { recursive: true, force: true }); // Use fs.rmSync instead of fs.rmdirSync
          console.log(`swagger-docs was deleted successfully.`);
        }
        updateUninstallDependencies.push("swagger-jsdoc");
      }
      if (!updateAnswer.tailwindcss) {
        const tailwindFiles = ["postcss.config.js", "tailwind.config.js"];
        tailwindFiles.forEach((file) => {
          const filePath = path.join(projectPath, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Delete each file if it exists
            console.log(`${file} was deleted successfully.`);
          } else {
            console.log(`${file} does not exist.`);
          }
        });
        updateUninstallDependencies.push(
          "tailwindcss",
          "autoprefixer",
          "postcss",
          "postcss-cli",
          "cssnano"
        );
      }
      if (!updateAnswer.websocket) {
        updateUninstallDependencies.push("chokidar-cli");
      }
      if (!updateAnswer.prisma) {
        updateUninstallDependencies.push("prisma", "@prisma/client");
      }
      if (!updateAnswer.docker) {
        const dockerFiles = [
          ".dockerignore",
          "docker-compose.yml",
          "Dockerfile",
          "apache.conf",
        ];
        dockerFiles.forEach((file) => {
          const filePath = path.join(projectPath, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Delete each file if it exists
            console.log(`${file} was deleted successfully.`);
          } else {
            console.log(`${file} does not exist.`);
          }
        });
      }
      if (updateUninstallDependencies.length > 0) {
        await uninstallDependencies(
          projectPath,
          updateUninstallDependencies,
          true
        );
      }
    }
    const projectPathModified = projectPath.replace(/\\/g, "\\");
    const bsConfig = bsConfigUrls(projectPathModified);
    const phpGenerateClassPath = answer.prisma ? "src/Lib/Prisma/Classes" : "";
    const prismaPhpConfig = {
      projectName: answer.projectName,
      projectRootPath: projectPathModified,
      phpEnvironment: "XAMPP",
      phpRootPathExe: "C:\\xampp\\php\\php.exe",
      phpGenerateClassPath,
      bsTarget: bsConfig.bsTarget,
      bsPathRewrite: bsConfig.bsPathRewrite,
      backendOnly: answer.backendOnly,
      swaggerDocs: answer.swaggerDocs,
      tailwindcss: answer.tailwindcss,
      websocket: answer.websocket,
      prisma: answer.prisma,
      docker: answer.docker,
      version: latestVersionOfCreatePrismaPhpApp,
      excludeFiles:
        (_j =
          updateAnswer === null || updateAnswer === void 0
            ? void 0
            : updateAnswer.excludeFiles) !== null && _j !== void 0
          ? _j
          : [],
    };
    fs.writeFileSync(
      path.join(projectPath, "prisma-php.json"),
      JSON.stringify(prismaPhpConfig, null, 2),
      { flag: "w" }
    );
    if (
      updateAnswer === null || updateAnswer === void 0
        ? void 0
        : updateAnswer.isUpdate
    ) {
      execSync(
        `C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar update`,
        {
          stdio: "inherit",
        }
      );
    } else {
      execSync(
        `C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar install`,
        {
          stdio: "inherit",
        }
      );
    }
    console.log(
      `${chalk.green("Success!")} Prisma PHP project successfully created in ${
        answer.projectName
      }!`
    );
  } catch (error) {
    console.error("Error while creating the project:", error);
    process.exit(1);
  }
}
main();
