#!/usr/bin/env node
import{execSync}from"child_process";import fs from"fs";import{fileURLToPath}from"url";import path from"path";import chalk from"chalk";import prompts from"prompts";import https from"https";import{randomBytes}from"crypto";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);let updateAnswer=null;const nonBackendFiles=["favicon.ico","\\src\\app\\index.php","metadata.php","not-found.php","error.php"],dockerFiles=[".dockerignore","docker-compose.yml","Dockerfile","apache.conf"];function bsConfigUrls(e){const s=e.indexOf("\\htdocs\\");if(-1===s)return{bsTarget:"",bsPathRewrite:{}};const t=e.substring(0,s+"\\htdocs\\".length).replace(/\\/g,"\\\\"),n=e.replace(new RegExp(`^${t}`),"").replace(/\\/g,"/");let c=`http://localhost/${n}`;c=c.endsWith("/")?c.slice(0,-1):c;const o=c.replace(/(?<!:)(\/\/+)/g,"/"),i=n.replace(/\/\/+/g,"/");return{bsTarget:`${o}/`,bsPathRewrite:{"^/":`/${i.startsWith("/")?i.substring(1):i}/`}}}async function updatePackageJson(e,s){const t=path.join(e,"package.json");if(checkExcludeFiles(t))return;const n=JSON.parse(fs.readFileSync(t,"utf8"));n.scripts={...n.scripts,projectName:"tsx settings/project-name.ts"};let c=[];if(s.tailwindcss&&(n.scripts={...n.scripts,tailwind:"postcss src/app/css/tailwind.css -o src/app/css/styles.css --watch"},c.push("tailwind")),s.websocket&&(n.scripts={...n.scripts,websocket:"tsx settings/restart-websocket.ts"},c.push("websocket")),s.docker&&(n.scripts={...n.scripts,docker:"docker-compose up"},c.push("docker")),s.swaggerDocs){const e=s.prisma?"tsx settings/auto-swagger-docs.ts":"tsx settings/swagger-config.ts";n.scripts={...n.scripts,"create-swagger-docs":e}}let o={...n.scripts};o.browserSync="tsx settings/bs-config.ts",o.dev=`npm-run-all projectName -p browserSync ${c.join(" ")}`,n.scripts=o,n.type="module",fs.writeFileSync(t,JSON.stringify(n,null,2))}async function updateComposerJson(e){const s=path.join(e,"composer.json");if(checkExcludeFiles(s))return;let t;if(fs.existsSync(s)){{const e=fs.readFileSync(s,"utf8");t=JSON.parse(e)}t.autoload={"psr-4":{"":"src/"}},t.version="1.0.0",fs.writeFileSync(s,JSON.stringify(t,null,2))}}async function updateIndexJsForWebSocket(e,s){if(!s.websocket)return;const t=path.join(e,"src","app","js","index.js");if(checkExcludeFiles(t))return;let n=fs.readFileSync(t,"utf8");n+='\n// WebSocket initialization\nvar ws = new WebSocket("ws://localhost:8080");\n',fs.writeFileSync(t,n,"utf8")}function generateAuthSecret(){return randomBytes(33).toString("base64")}function generateHexEncodedKey(e=16){return randomBytes(e).toString("hex")}function copyRecursiveSync(e,s,t){const n=fs.existsSync(e),c=n&&fs.statSync(e);if(n&&c&&c.isDirectory()){const n=s.toLowerCase();if(!t.websocket&&n.includes("src\\lib\\websocket"))return;if(t.backendOnly&&n.includes("src\\app\\js")||t.backendOnly&&n.includes("src\\app\\css")||t.backendOnly&&n.includes("src\\app\\assets"))return;if(!t.swaggerDocs&&n.includes("src\\app\\swagger-docs"))return;const c=s.replace(/\\/g,"/");if(updateAnswer?.excludeFilePath?.includes(c))return;fs.existsSync(s)||fs.mkdirSync(s,{recursive:!0}),fs.readdirSync(e).forEach((n=>{copyRecursiveSync(path.join(e,n),path.join(s,n),t)}))}else{if(checkExcludeFiles(s))return;if(!t.tailwindcss&&(s.includes("tailwind.css")||s.includes("styles.css")))return;if(!t.websocket&&(s.includes("restart-websocket.ts")||s.includes("restart-websocket.bat")))return;if(!t.docker&&dockerFiles.some((e=>s.includes(e))))return;if(t.backendOnly&&nonBackendFiles.some((e=>s.includes(e))))return;if(!t.backendOnly&&s.includes("route.php"))return;if(t.backendOnly&&!t.swaggerDocs&&s.includes("layout.php"))return;if(!t.swaggerDocs&&s.includes("swagger-config.ts"))return;if(t.tailwindcss&&s.includes("index.css"))return;if((!t.swaggerDocs||!t.prisma)&&(s.includes("auto-swagger-docs.ts")||s.includes("prisma-schema-config.json")))return;fs.copyFileSync(e,s,0)}}async function executeCopy(e,s,t){s.forEach((({src:s,dest:n})=>{copyRecursiveSync(path.join(__dirname,s),path.join(e,n),t)}))}function modifyPostcssConfig(e){const s=path.join(e,"postcss.config.js");if(checkExcludeFiles(s))return;fs.writeFileSync(s,'export default {\n  plugins: {\n    "@tailwindcss/postcss": {},\n    cssnano: {},\n  },\n};',{flag:"w"})}function modifyLayoutPHP(e,s){const t=path.join(e,"src","app","layout.php");if(!checkExcludeFiles(t))try{let e=fs.readFileSync(t,"utf8"),n="";s.backendOnly||(s.tailwindcss||(n='\n    <link href="<?= Request::baseUrl; ?>/css/index.css" rel="stylesheet" />'),n+='\n    <script src="<?= Request::baseUrl; ?>/js/json5.min.js"><\/script>\n    <script src="<?= Request::baseUrl; ?>/js/index.js"><\/script>');let c="";s.backendOnly||(c=s.tailwindcss?`    <link href="<?= Request::baseUrl; ?>/css/styles.css" rel="stylesheet" /> ${n}`:n),e=e.replace("</head>",`${c}\n</head>`),fs.writeFileSync(t,e,{flag:"w"})}catch(e){}}async function createOrUpdateEnvFile(e,s){const t=path.join(e,".env");checkExcludeFiles(t)||fs.writeFileSync(t,s,{flag:"w"})}function checkExcludeFiles(e){return!!updateAnswer?.isUpdate&&(updateAnswer?.excludeFilePath?.includes(e.replace(/\\/g,"/"))??!1)}async function createDirectoryStructure(e,s){const t=[{src:"/bootstrap.php",dest:"/bootstrap.php"},{src:"/.htaccess",dest:"/.htaccess"},{src:"/tsconfig.json",dest:"/tsconfig.json"},{src:"/app-gitignore",dest:"/.gitignore"}];s.tailwindcss&&t.push({src:"/postcss.config.js",dest:"/postcss.config.js"});const n=[{src:"/settings",dest:"/settings"},{src:"/src",dest:"/src"}];s.docker&&n.push({src:"/.dockerignore",dest:"/.dockerignore"},{src:"/docker-compose.yml",dest:"/docker-compose.yml"},{src:"/Dockerfile",dest:"/Dockerfile"},{src:"/apache.conf",dest:"/apache.conf"}),t.forEach((({src:s,dest:t})=>{const n=path.join(__dirname,s),c=path.join(e,t);if(checkExcludeFiles(c))return;const o=fs.readFileSync(n,"utf8");fs.writeFileSync(c,o,{flag:"w"})})),await executeCopy(e,n,s),await updatePackageJson(e,s),await updateComposerJson(e),s.backendOnly||await updateIndexJsForWebSocket(e,s),s.tailwindcss&&modifyPostcssConfig(e),(s.tailwindcss||!s.backendOnly||s.swaggerDocs)&&modifyLayoutPHP(e,s);const c=generateAuthSecret(),o=generateHexEncodedKey(),i=`# Prisma PHP Auth Secret Key\nAUTH_SECRET="${c}"\nAUTH_COOKIE_NAME="${generateHexEncodedKey(8)}"\n\n# PHPMailer\n# SMTP_HOST="smtp.gmail.com" or your SMTP host\n# SMTP_USERNAME="john.doe@gmail.com" or your SMTP username\n# SMTP_PASSWORD="123456"\n# SMTP_PORT="587" for TLS, 465 for SSL or your SMTP port\n# SMTP_ENCRYPTION="ssl" or tls\n# MAIL_FROM="john.doe@gmail.com"\n# MAIL_FROM_NAME="John Doe"\n\n# SHOW ERRORS - Set to true to show errors in the browser for development only - Change this in production to false\nSHOW_ERRORS="true"\n\n# APP TIMEZONE - Set your application timezone - Default is "UTC"\nAPP_TIMEZONE="UTC"\n\n# APP ENV - Set your application environment - Default is "development" - Change this in production to "production"\nAPP_ENV="development"\n\n# APP CACHE ENABLED - Set to true to enable caching - Default is false\nCACHE_ENABLED="false"\n# APP CACHE TTL - Set the cache time to live in seconds - Default is 600 seconds (10 minutes)\nCACHE_TTL="600"\n\n# LOCAL STORAGE KEY - Define a custom key for local storage.\n# If not set, it defaults to "pphp_local_store_59e13".\n# Spaces in the value will be replaced with underscores, and the key will be converted to lowercase automatically.\nLOCALSTORE_KEY="${o}"`;if(s.prisma){const s=`${'# Environment variables declared in this file are automatically made available to Prisma.\n# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema\n\n# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.\n# See the documentation for all the connection string options: https://pris.ly/d/connection-strings\n\nDATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"'}\n\n${i}`;await createOrUpdateEnvFile(e,s)}else await createOrUpdateEnvFile(e,i)}async function getAnswer(e={}){const s=[];e.projectName||s.push({type:"text",name:"projectName",message:"What is your project named?",initial:"my-app"}),e.backendOnly||s.push({type:"toggle",name:"backendOnly",message:`Would you like to create a ${chalk.blue("backend-only project")}?`,initial:!1,active:"Yes",inactive:"No"});const t=()=>{process.exit(0)},n=await prompts(s,{onCancel:t}),c=[];n.backendOnly||e.backendOnly?(e.swaggerDocs||c.push({type:"toggle",name:"swaggerDocs",message:`Would you like to use ${chalk.blue("Swagger Docs")}?`,initial:!1,active:"Yes",inactive:"No"}),e.websocket||c.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!0,active:"Yes",inactive:"No"}),e.prisma||c.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,initial:!0,active:"Yes",inactive:"No"}),e.docker||c.push({type:"toggle",name:"docker",message:`Would you like to use ${chalk.blue("Docker")}?`,initial:!1,active:"Yes",inactive:"No"})):(e.swaggerDocs||c.push({type:"toggle",name:"swaggerDocs",message:`Would you like to use ${chalk.blue("Swagger Docs")}?`,initial:!1,active:"Yes",inactive:"No"}),e.tailwindcss||c.push({type:"toggle",name:"tailwindcss",message:`Would you like to use ${chalk.blue("Tailwind CSS")}?`,initial:!1,active:"Yes",inactive:"No"}),e.websocket||c.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!1,active:"Yes",inactive:"No"}),e.prisma||c.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,initial:!1,active:"Yes",inactive:"No"}),e.docker||c.push({type:"toggle",name:"docker",message:`Would you like to use ${chalk.blue("Docker")}?`,initial:!1,active:"Yes",inactive:"No"}));const o=await prompts(c,{onCancel:t});return{projectName:n.projectName?String(n.projectName).trim().replace(/ /g,"-"):e.projectName??"my-app",backendOnly:n.backendOnly??e.backendOnly??!1,swaggerDocs:o.swaggerDocs??e.swaggerDocs??!1,tailwindcss:o.tailwindcss??e.tailwindcss??!1,websocket:o.websocket??e.websocket??!1,prisma:o.prisma??e.prisma??!1,docker:o.docker??e.docker??!1}}async function uninstallNpmDependencies(e,s,t=!1){s.forEach((e=>{}));const n=`npm uninstall ${t?"--save-dev":"--save"} ${s.join(" ")}`;execSync(n,{stdio:"inherit",cwd:e})}async function uninstallComposerDependencies(e,s){s.forEach((e=>{}));const t=`C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar remove ${s.join(" ")}`;execSync(t,{stdio:"inherit",cwd:e})}function fetchPackageVersion(e){return new Promise(((s,t)=>{https.get(`https://registry.npmjs.org/${e}`,(e=>{let n="";e.on("data",(e=>n+=e)),e.on("end",(()=>{try{const e=JSON.parse(n);s(e["dist-tags"].latest)}catch(e){t(new Error("Failed to parse JSON response"))}}))})).on("error",(e=>t(e)))}))}const readJsonFile=e=>{const s=fs.readFileSync(e,"utf8");return JSON.parse(s)};function compareVersions(e,s){const t=e.split(".").map(Number),n=s.split(".").map(Number);for(let e=0;e<t.length;e++){if(t[e]>n[e])return 1;if(t[e]<n[e])return-1}return 0}function getInstalledPackageVersion(e){try{const s=execSync(`npm list -g ${e} --depth=0`).toString().match(new RegExp(`${e}@(\\d+\\.\\d+\\.\\d+)`));return s?s[1]:null}catch(e){return null}}
/**
 * Install dependencies in the specified directory.
 * @param {string} baseDir - The base directory where to install the dependencies.
 * @param {string[]} dependencies - The list of dependencies to install.
 * @param {boolean} [isDev=false] - Whether to install the dependencies as devDependencies.
 */
async function installNpmDependencies(baseDir, dependencies, isDev = false) {
  console.log("Initializing new Node.js project...");
  // Initialize a package.json if it doesn't exist
  if (!fs.existsSync(path.join(baseDir, "package.json"))) {
    execSync("npm init -y", {
      stdio: "inherit",
      cwd: baseDir,
    });
  }
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
async function installComposerDependencies(baseDir, dependencies) {
  console.log("Initializing new Composer project...");
  // Initialize a composer.json if it doesn't exist
  if (!fs.existsSync(path.join(baseDir, "composer.json"))) {
    execSync(`composer init -n --name="vendor/package" --require="php:^8.2"`, {
      stdio: "inherit",
      cwd: baseDir,
    });
  }
  // Log the dependencies being installed
  console.log("Installing Composer dependencies:");
  dependencies.forEach((dep) => console.log(`- ${chalk.blue(dep)}`));
  // Prepare the composer require command
  const composerRequireCommand = `C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar require ${dependencies.join(
    " "
  )}`;
  // Execute the composer require command
  execSync(composerRequireCommand, {
    stdio: "inherit",
    cwd: baseDir,
  });
}
const npmPinnedVersions = {
  "@tailwindcss/postcss": "^4.1.1",
  "@types/browser-sync": "^2.29.0",
  "@types/node": "^22.14.0",
  "@types/prompts": "^2.4.9",
  "browser-sync": "^3.0.4",
  chalk: "^5.4.1",
  "chokidar-cli": "^3.0.0",
  cssnano: "^7.0.6",
  "http-proxy-middleware": "^3.0.3",
  "npm-run-all": "^4.1.5",
  "php-parser": "^3.2.2",
  postcss: "^8.5.3",
  "postcss-cli": "^11.0.1",
  prompts: "^2.4.2",
  tailwindcss: "^4.1.1",
  tsx: "^4.19.3",
  typescript: "^5.8.2",
};
function npmPkg(name) {
  return npmPinnedVersions[name] ? `${name}@${npmPinnedVersions[name]}` : name;
}
const composerPinnedVersions = {
  "vlucas/phpdotenv": "^5.6.1",
  "firebase/php-jwt": "^6.10.2",
  "phpmailer/phpmailer": "^6.9.3",
  "guzzlehttp/guzzle": "^7.9.2",
  "ezyang/htmlpurifier": "^4.18.0",
  "symfony/uid": "^7.2.0",
  "brick/math": "^0.13.0",
  "cboden/ratchet": "^0.4.4",
};
function composerPkg(name) {
  return composerPinnedVersions[name]
    ? `${name}:${composerPinnedVersions[name]}`
    : name;
}
async function main() {
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
      answer = await getAnswer(predefinedAnswers);
      if (answer === null) {
        console.log(chalk.red("Installation cancelled."));
        return;
      }
      const currentDir = process.cwd();
      const configPath = path.join(currentDir, "prisma-php.json");
      if (fs.existsSync(configPath)) {
        const localSettings = readJsonFile(configPath);
        let excludeFiles = [];
        localSettings.excludeFiles?.map((file) => {
          const filePath = path.join(currentDir, file);
          if (fs.existsSync(filePath))
            excludeFiles.push(filePath.replace(/\\/g, "/"));
        });
        updateAnswer = {
          projectName,
          backendOnly: answer?.backendOnly ?? false,
          swaggerDocs: answer?.swaggerDocs ?? false,
          tailwindcss: answer?.tailwindcss ?? false,
          websocket: answer?.websocket ?? false,
          prisma: answer?.prisma ?? false,
          docker: answer?.docker ?? false,
          isUpdate: true,
          excludeFiles: localSettings.excludeFiles ?? [],
          excludeFilePath: excludeFiles ?? [],
          filePath: currentDir,
        };
      }
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
        execSync("npm uninstall -g create-prisma-php-app", {
          stdio: "inherit",
        });
        execSync("npm install -g create-prisma-php-app", {
          stdio: "inherit",
        });
      }
    } else {
      execSync("npm install -g create-prisma-php-app", { stdio: "inherit" });
    }
    // Create the project directory
    if (!projectName) fs.mkdirSync(answer.projectName);
    const currentDir = process.cwd();
    let projectPath = projectName
      ? currentDir
      : path.join(currentDir, answer.projectName);
    if (!projectName) process.chdir(answer.projectName);
    let npmDependencies = [
      npmPkg("typescript"),
      npmPkg("@types/node"),
      npmPkg("tsx"),
      npmPkg("http-proxy-middleware"),
      npmPkg("chalk"),
      npmPkg("npm-run-all"),
      npmPkg("browser-sync"),
      npmPkg("@types/browser-sync"),
      npmPkg("php-parser"),
    ];
    let composerDependencies = [
      composerPkg("vlucas/phpdotenv"),
      composerPkg("firebase/php-jwt"),
      composerPkg("phpmailer/phpmailer"),
      composerPkg("guzzlehttp/guzzle"),
      composerPkg("ezyang/htmlpurifier"),
      composerPkg("symfony/uid"),
      composerPkg("brick/math"),
    ];
    if (answer.swaggerDocs) {
      npmDependencies.push(
        npmPkg("swagger-jsdoc"),
        npmPkg("@types/swagger-jsdoc")
      );
    }
    if (answer.swaggerDocs && answer.prisma) {
      npmDependencies.push(npmPkg("prompts"), npmPkg("@types/prompts"));
    }
    if (answer.tailwindcss) {
      npmDependencies.push(
        npmPkg("tailwindcss"),
        npmPkg("postcss"),
        npmPkg("postcss-cli"),
        npmPkg("@tailwindcss/postcss"),
        npmPkg("cssnano")
      );
    }
    if (answer.websocket) {
      npmDependencies.push(npmPkg("chokidar-cli"));
      composerDependencies.push("cboden/ratchet");
    }
    if (answer.prisma) {
      execSync("npm install -g prisma-client-php", { stdio: "inherit" });
    }
    await installNpmDependencies(projectPath, npmDependencies, true);
    await installComposerDependencies(projectPath, composerDependencies);
    if (!projectName) {
      execSync("npx tsc --init", { stdio: "inherit" });
    }
    await createDirectoryStructure(projectPath, answer);
    if (answer.prisma) {
      execSync("npx ppo init --prisma-php", { stdio: "inherit" });
    }
    if (answer.swaggerDocs) {
      const swaggerDocsPath = path.join(
        projectPath,
        "src",
        "app",
        "swagger-docs"
      );
      // Check if the directory exists
      if (fs.existsSync(swaggerDocsPath)) {
        // If it exists and is not empty, remove it before cloning
        if (fs.readdirSync(swaggerDocsPath).length > 0) {
          console.log("Removing existing swagger-docs directory...");
          fs.rmSync(swaggerDocsPath, { recursive: true, force: true });
        }
      }
      // Clone the Git repository into the swagger-docs directory
      execSync(
        `git clone https://github.com/TheSteelNinjaCode/prisma-php-swagger-docs.git ${swaggerDocsPath}`,
        { stdio: "inherit" }
      );
      // delete the folder .git
      fs.rmSync(path.join(swaggerDocsPath, ".git"), {
        recursive: true,
        force: true,
      });
    }
    if (updateAnswer?.isUpdate) {
      const updateUninstallNpmDependencies = [];
      const updateUninstallComposerDependencies = [];
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
        const swaggerFiles = ["swagger-config.ts"];
        swaggerFiles.forEach((file) => {
          const filePath = path.join(projectPath, "settings", file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Delete each file if it exists
            console.log(`${file} was deleted successfully.`);
          } else {
            console.log(`${file} does not exist.`);
          }
        });
        updateUninstallNpmDependencies.push(
          "swagger-jsdoc",
          "@types/swagger-jsdoc",
          "prompts",
          "@types/prompts"
        );
      }
      if (!updateAnswer.tailwindcss) {
        const tailwindFiles = ["postcss.config.js"];
        tailwindFiles.forEach((file) => {
          const filePath = path.join(projectPath, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Delete each file if it exists
            console.log(`${file} was deleted successfully.`);
          } else {
            console.log(`${file} does not exist.`);
          }
        });
        updateUninstallNpmDependencies.push(
          "tailwindcss",
          "postcss",
          "postcss-cli",
          "@tailwindcss/postcss",
          "cssnano"
        );
      }
      if (!updateAnswer.websocket) {
        const websocketFiles = [
          "restart-websocket.ts",
          "restart-websocket.bat",
        ];
        websocketFiles.forEach((file) => {
          const filePath = path.join(projectPath, "settings", file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Delete each file if it exists
            console.log(`${file} was deleted successfully.`);
          } else {
            console.log(`${file} does not exist.`);
          }
        });
        const websocketFolder = path.join(
          projectPath,
          "src",
          "Lib",
          "Websocket"
        );
        if (fs.existsSync(websocketFolder)) {
          fs.rmSync(websocketFolder, { recursive: true, force: true }); // Use fs.rmSync instead of fs.rmdirSync
          console.log(`Websocket folder was deleted successfully.`);
        }
        updateUninstallNpmDependencies.push("chokidar-cli");
        updateUninstallComposerDependencies.push("cboden/ratchet");
      }
      if (!updateAnswer.prisma) {
        updateUninstallNpmDependencies.push(
          "prisma",
          "@prisma/client",
          "@prisma/internals"
        );
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
      if (updateUninstallNpmDependencies.length > 0) {
        await uninstallNpmDependencies(
          projectPath,
          updateUninstallNpmDependencies,
          true
        );
      }
      if (updateUninstallComposerDependencies.length > 0) {
        await uninstallComposerDependencies(
          projectPath,
          updateUninstallComposerDependencies
        );
      }
    }
    const projectPathModified = projectPath.replace(/\\/g, "\\");
    const bsConfig = bsConfigUrls(projectPathModified);
    const prismaPhpConfig = {
      projectName: answer.projectName,
      projectRootPath: projectPathModified,
      phpEnvironment: "XAMPP",
      phpRootPathExe: "C:\\xampp\\php\\php.exe",
      bsTarget: bsConfig.bsTarget,
      bsPathRewrite: bsConfig.bsPathRewrite,
      backendOnly: answer.backendOnly,
      swaggerDocs: answer.swaggerDocs,
      tailwindcss: answer.tailwindcss,
      websocket: answer.websocket,
      prisma: answer.prisma,
      docker: answer.docker,
      version: latestVersionOfCreatePrismaPhpApp,
      excludeFiles: updateAnswer?.excludeFiles ?? [],
    };
    fs.writeFileSync(
      path.join(projectPath, "prisma-php.json"),
      JSON.stringify(prismaPhpConfig, null, 2),
      { flag: "w" }
    );
    if (updateAnswer?.isUpdate) {
      execSync(
        "C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar update",
        {
          stdio: "inherit",
        }
      );
    } else {
      execSync(
        "C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar install",
        {
          stdio: "inherit",
        }
      );
    }
    console.log("\n=========================\n");
    console.log(
      `${chalk.green(
        "Success!"
      )} Prisma PHP project successfully created in ${chalk.green(
        `${currentDir.replace(/\\/g, "/")}/${answer.projectName}`
      )}!`
    );
    console.log("\n=========================");
  } catch (error) {
    console.error("Error while creating the project:", error);
    process.exit(1);
  }
}
main();
