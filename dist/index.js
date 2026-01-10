#!/usr/bin/env node
<<<<<<< HEAD
import{execSync,spawnSync}from"child_process";import fs from"fs";import{fileURLToPath}from"url";import path from"path";import chalk from"chalk";import prompts from"prompts";import https from"https";import{randomBytes}from"crypto";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);let updateAnswer=null;const nonBackendFiles=["favicon.ico","\\src\\app\\index.php","metadata.php","not-found.php","error.php"],dockerFiles=[".dockerignore","docker-compose.yml","Dockerfile","apache.conf"];function bsConfigUrls(e){const s=e.indexOf("\\htdocs\\");if(-1===s)return{bsTarget:"",bsPathRewrite:{}};const t=e.substring(0,s+"\\htdocs\\".length).replace(/\\/g,"\\\\"),n=e.replace(new RegExp(`^${t}`),"").replace(/\\/g,"/");let c=`http://localhost/${n}`;c=c.endsWith("/")?c.slice(0,-1):c;const o=c.replace(/(?<!:)(\/\/+)/g,"/"),i=n.replace(/\/\/+/g,"/");return{bsTarget:`${o}/`,bsPathRewrite:{"^/":`/${i.startsWith("/")?i.substring(1):i}/`}}}async function updatePackageJson(e,s){const t=path.join(e,"package.json");if(checkExcludeFiles(t))return;const n=JSON.parse(fs.readFileSync(t,"utf8"));n.scripts={...n.scripts,projectName:"tsx settings/project-name.ts"};let c=[];if(s.tailwindcss&&(n.scripts={...n.scripts,tailwind:"postcss src/app/css/tailwind.css -o src/app/css/styles.css --watch","tailwind:build":"postcss src/app/css/tailwind.css -o src/app/css/styles.css"},c.push("tailwind")),s.websocket&&(n.scripts={...n.scripts,websocket:"tsx settings/restart-websocket.ts"},c.push("websocket")),s.mcp&&(n.scripts={...n.scripts,mcp:"tsx settings/restart-mcp.ts"},c.push("mcp")),s.docker&&(n.scripts={...n.scripts,docker:"docker-compose up"},c.push("docker")),s.swaggerDocs){const e=s.prisma?"tsx settings/auto-swagger-docs.ts":"tsx settings/swagger-config.ts";n.scripts={...n.scripts,"create-swagger-docs":e}}let o={...n.scripts};o.browserSync="tsx settings/bs-config.ts",o["browserSync:build"]="tsx settings/build.ts",o.dev=`npm-run-all projectName -p browserSync ${c.join(" ")}`,o.build=`npm-run-all${s.tailwindcss?" tailwind:build":""} browserSync:build`,n.scripts=o,n.type="module",fs.writeFileSync(t,JSON.stringify(n,null,2))}async function updateComposerJson(e){checkExcludeFiles(path.join(e,"composer.json"))}async function updateIndexJsForWebSocket(e,s){if(!s.websocket)return;const t=path.join(e,"src","app","js","index.js");if(checkExcludeFiles(t))return;let n=fs.readFileSync(t,"utf8");n+='\n// WebSocket initialization\nvar ws = new WebSocket("ws://localhost:8080");\n',fs.writeFileSync(t,n,"utf8")}function generateAuthSecret(){return randomBytes(33).toString("base64")}function generateHexEncodedKey(e=16){return randomBytes(e).toString("hex")}function copyRecursiveSync(e,s,t){const n=fs.existsSync(e),c=n&&fs.statSync(e);if(n&&c&&c.isDirectory()){const n=s.toLowerCase();if(!t.websocket&&n.includes("src\\lib\\websocket"))return;if(!t.mcp&&n.includes("src\\lib\\mcp"))return;if(t.backendOnly&&n.includes("src\\app\\js")||t.backendOnly&&n.includes("src\\app\\css")||t.backendOnly&&n.includes("src\\app\\assets"))return;if(!t.swaggerDocs&&n.includes("src\\app\\swagger-docs"))return;const c=s.replace(/\\/g,"/");if(updateAnswer?.excludeFilePath?.includes(c))return;fs.existsSync(s)||fs.mkdirSync(s,{recursive:!0}),fs.readdirSync(e).forEach((n=>{copyRecursiveSync(path.join(e,n),path.join(s,n),t)}))}else{if(checkExcludeFiles(s))return;if(!t.tailwindcss&&(s.includes("tailwind.css")||s.includes("styles.css")))return;if(!t.websocket&&s.includes("restart-websocket.ts"))return;if(!t.mcp&&s.includes("restart-mcp.ts"))return;if(!t.docker&&dockerFiles.some((e=>s.includes(e))))return;if(t.backendOnly&&nonBackendFiles.some((e=>s.includes(e))))return;if(!t.backendOnly&&s.includes("route.php"))return;if(t.backendOnly&&!t.swaggerDocs&&s.includes("layout.php"))return;if(!t.swaggerDocs&&s.includes("swagger-config.ts"))return;if(t.tailwindcss&&s.includes("index.css"))return;if((!t.swaggerDocs||!t.prisma)&&(s.includes("auto-swagger-docs.ts")||s.includes("prisma-schema-config.json")))return;fs.copyFileSync(e,s,0)}}async function executeCopy(e,s,t){s.forEach((({src:s,dest:n})=>{copyRecursiveSync(path.join(__dirname,s),path.join(e,n),t)}))}function modifyPostcssConfig(e){const s=path.join(e,"postcss.config.js");if(checkExcludeFiles(s))return;fs.writeFileSync(s,'export default {\n  plugins: {\n    "@tailwindcss/postcss": {},\n    cssnano: {},\n  },\n};',{flag:"w"})}function modifyLayoutPHP(e,s){const t=path.join(e,"src","app","layout.php");if(!checkExcludeFiles(t))try{let e=fs.readFileSync(t,"utf8"),n="";s.backendOnly||(s.tailwindcss||(n='\n    <link href="<?= Request::baseUrl; ?>/css/index.css" rel="stylesheet" />'),n+='\n    <script src="<?= Request::baseUrl; ?>/js/morphdom-umd.min.js"><\/script>\n    <script src="<?= Request::baseUrl; ?>/js/json5.min.js"><\/script>\n    <script src="<?= Request::baseUrl; ?>/js/index.js"><\/script>');let c="";s.backendOnly||(c=s.tailwindcss?`    <link href="<?= Request::baseUrl; ?>/css/styles.css" rel="stylesheet" /> ${n}`:n),e=e.replace("</head>",`${c}\n</head>`),fs.writeFileSync(t,e,{flag:"w"})}catch(e){}}async function createOrUpdateEnvFile(e,s){const t=path.join(e,".env");checkExcludeFiles(t)||fs.writeFileSync(t,s,{flag:"w"})}function checkExcludeFiles(e){return!!updateAnswer?.isUpdate&&(updateAnswer?.excludeFilePath?.includes(e.replace(/\\/g,"/"))??!1)}async function createDirectoryStructure(e,s){const t=[{src:"/bootstrap.php",dest:"/bootstrap.php"},{src:"/.htaccess",dest:"/.htaccess"},{src:"/tsconfig.json",dest:"/tsconfig.json"},{src:"/app-gitignore",dest:"/.gitignore"}];s.tailwindcss&&t.push({src:"/postcss.config.js",dest:"/postcss.config.js"});const n=[{src:"/settings",dest:"/settings"},{src:"/src",dest:"/src"}];s.docker&&n.push({src:"/.dockerignore",dest:"/.dockerignore"},{src:"/docker-compose.yml",dest:"/docker-compose.yml"},{src:"/Dockerfile",dest:"/Dockerfile"},{src:"/apache.conf",dest:"/apache.conf"}),t.forEach((({src:s,dest:t})=>{const n=path.join(__dirname,s),c=path.join(e,t);if(checkExcludeFiles(c))return;const o=fs.readFileSync(n,"utf8");fs.writeFileSync(c,o,{flag:"w"})})),await executeCopy(e,n,s),await updatePackageJson(e,s),await updateComposerJson(e),s.backendOnly||await updateIndexJsForWebSocket(e,s),s.tailwindcss&&modifyPostcssConfig(e),(s.tailwindcss||!s.backendOnly||s.swaggerDocs)&&modifyLayoutPHP(e,s);const c=generateAuthSecret(),o=generateHexEncodedKey(),i=`# Authentication secret key for JWT or session encryption.\nAUTH_SECRET="${c}"\n# Name of the authentication cookie.\nAUTH_COOKIE_NAME="${generateHexEncodedKey(8)}"\n\n# PHPMailer SMTP configuration (uncomment and set as needed)\n# SMTP_HOST="smtp.gmail.com"           # Your SMTP host\n# SMTP_USERNAME="john.doe@gmail.com"   # Your SMTP username\n# SMTP_PASSWORD="123456"               # Your SMTP password\n# SMTP_PORT="587"                      # 587 for TLS, 465 for SSL, or your SMTP port\n# SMTP_ENCRYPTION="ssl"                # ssl or tls\n# MAIL_FROM="john.doe@gmail.com"       # Sender email address\n# MAIL_FROM_NAME="John Doe"            # Sender name\n\n# Show errors in the browser (development only). Set to false in production.\nSHOW_ERRORS="true"\n\n# Application timezone (default: UTC)\nAPP_TIMEZONE="UTC"\n\n# Application environment (development or production)\nAPP_ENV="development"\n\n# Enable or disable application cache (default: false)\nCACHE_ENABLED="false"\n# Cache time-to-live in seconds (default: 600)\nCACHE_TTL="600"\n\n# Local storage key for browser storage (auto-generated if not set).\n# Spaces will be replaced with underscores and converted to lowercase.\nLOCALSTORE_KEY="${o}"\n\n# Secret key for encrypting function calls.\nFUNCTION_CALL_SECRET="${generateHexEncodedKey(32)}"\n\n# Single or multiple origins (CSV or JSON array)\nCORS_ALLOWED_ORIGINS=[]\n\n# If you need cookies/Authorization across origins, keep this true\nCORS_ALLOW_CREDENTIALS="true"\n\n# Optional tuning\nCORS_ALLOWED_METHODS="GET,POST,PUT,PATCH,DELETE,OPTIONS"\nCORS_ALLOWED_HEADERS="Content-Type,Authorization,X-Requested-With"\nCORS_EXPOSE_HEADERS=""\nCORS_MAX_AGE="86400"`;if(s.prisma){const s=`${'# Environment variables declared in this file are automatically made available to Prisma.\n# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema\n\n# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.\n# See the documentation for all the connection string options: https://pris.ly/d/connection-strings\n\nDATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"'}\n\n${i}`;await createOrUpdateEnvFile(e,s)}else await createOrUpdateEnvFile(e,i)}async function getAnswer(e={}){const s=[];e.projectName||s.push({type:"text",name:"projectName",message:"What is your project named?",initial:"my-app"}),e.backendOnly||updateAnswer?.isUpdate||s.push({type:"toggle",name:"backendOnly",message:`Would you like to create a ${chalk.blue("backend-only project")}?`,initial:!1,active:"Yes",inactive:"No"});const t=()=>{process.exit(0)},n=await prompts(s,{onCancel:t}),c=[];n.backendOnly??e.backendOnly??!1?(e.swaggerDocs||c.push({type:"toggle",name:"swaggerDocs",message:`Would you like to use ${chalk.blue("Swagger Docs")}?`,initial:!1,active:"Yes",inactive:"No"}),e.websocket||c.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!1,active:"Yes",inactive:"No"}),e.mcp||c.push({type:"toggle",name:"mcp",message:`Would you like to use ${chalk.blue("MCP (Model Context Protocol)")}?`,initial:!1,active:"Yes",inactive:"No"}),e.prisma||c.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,initial:!1,active:"Yes",inactive:"No"}),e.docker||c.push({type:"toggle",name:"docker",message:`Would you like to use ${chalk.blue("Docker")}?`,initial:!1,active:"Yes",inactive:"No"})):(e.swaggerDocs||c.push({type:"toggle",name:"swaggerDocs",message:`Would you like to use ${chalk.blue("Swagger Docs")}?`,initial:!1,active:"Yes",inactive:"No"}),e.tailwindcss||c.push({type:"toggle",name:"tailwindcss",message:`Would you like to use ${chalk.blue("Tailwind CSS")}?`,initial:!1,active:"Yes",inactive:"No"}),e.websocket||c.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!1,active:"Yes",inactive:"No"}),e.mcp||c.push({type:"toggle",name:"mcp",message:`Would you like to use ${chalk.blue("MCP (Model Context Protocol)")}?`,initial:!1,active:"Yes",inactive:"No"}),e.prisma||c.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,initial:!1,active:"Yes",inactive:"No"}),e.docker||c.push({type:"toggle",name:"docker",message:`Would you like to use ${chalk.blue("Docker")}?`,initial:!1,active:"Yes",inactive:"No"}));const o=await prompts(c,{onCancel:t});return{projectName:n.projectName?String(n.projectName).trim().replace(/ /g,"-"):e.projectName??"my-app",backendOnly:n.backendOnly??e.backendOnly??!1,swaggerDocs:o.swaggerDocs??e.swaggerDocs??!1,tailwindcss:o.tailwindcss??e.tailwindcss??!1,websocket:o.websocket??e.websocket??!1,mcp:o.mcp??e.mcp??!1,prisma:o.prisma??e.prisma??!1,docker:o.docker??e.docker??!1}}async function uninstallNpmDependencies(e,s,t=!1){s.forEach((e=>{}));const n=`npm uninstall ${t?"--save-dev":"--save"} ${s.join(" ")}`;execSync(n,{stdio:"inherit",cwd:e})}async function uninstallComposerDependencies(e,s){s.forEach((e=>{}));const t=`C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar remove ${s.join(" ")}`;execSync(t,{stdio:"inherit",cwd:e})}function fetchPackageVersion(e){return new Promise(((s,t)=>{https.get(`https://registry.npmjs.org/${e}`,(e=>{let n="";e.on("data",(e=>n+=e)),e.on("end",(()=>{try{const e=JSON.parse(n);s(e["dist-tags"].latest)}catch(e){t(new Error("Failed to parse JSON response"))}}))})).on("error",(e=>t(e)))}))}const readJsonFile=e=>{const s=fs.readFileSync(e,"utf8");return JSON.parse(s)};function compareVersions(e,s){const t=e.split(".").map(Number),n=s.split(".").map(Number);for(let e=0;e<t.length;e++){if(t[e]>n[e])return 1;if(t[e]<n[e])return-1}return 0}function getInstalledPackageVersion(e){try{const s=execSync(`npm list -g ${e} --depth=0`).toString().match(new RegExp(`${e}@(\\d+\\.\\d+\\.\\d+)`));return s?s[1]:null}catch(e){return null}}
/**
 * Install dependencies in the specified directory.
 * @param {string} baseDir - The base directory where to install the dependencies.
 * @param {string[]} dependencies - The list of dependencies to install.
 * @param {boolean} [isDev=false] - Whether to install the dependencies as devDependencies.
 */
async function installNpmDependencies(baseDir, dependencies, isDev = false) {
  if (!fs.existsSync(path.join(baseDir, "package.json"))) {
    console.log("Initializing new Node.js project...");
  } else {
    console.log("Updating existing Node.js project...");
  }
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
function getComposerCmd() {
    try {
        execSync("composer --version", { stdio: "ignore" });
        console.log("✓ Using global composer command");
        return { cmd: "composer", baseArgs: [] };
    }
    catch {
        const phpPath = "C:\\xampp\\php\\php.exe";
        const composerPath = "C:\\ProgramData\\ComposerSetup\\bin\\composer.phar";
        // Check if PHP exists
        if (!fs.existsSync(phpPath)) {
            console.error(`✗ PHP not found at ${phpPath}`);
            throw new Error(`PHP executable not found at ${phpPath}`);
        }
        // Check if Composer phar exists
        if (!fs.existsSync(composerPath)) {
            console.error(`✗ Composer not found at ${composerPath}`);
            throw new Error(`Composer phar not found at ${composerPath}`);
        }
        console.log("✓ Using XAMPP PHP with Composer phar");
        return {
            cmd: phpPath,
            baseArgs: [composerPath],
        };
    }
}
export async function installComposerDependencies(baseDir, dependencies) {
    const { cmd, baseArgs } = getComposerCmd();
    const composerJsonPath = path.join(baseDir, "composer.json");
    const existsAlready = fs.existsSync(composerJsonPath);
    console.log(chalk.green(`Composer project initialization: ${existsAlready ? "Updating existing project…" : "Setting up new project…"}`));
    /* ------------------------------------------------------------------ */
    /* 1. Ensure base directory exists                                     */
    /* ------------------------------------------------------------------ */
    if (!fs.existsSync(baseDir)) {
        console.log(`Creating base directory: ${baseDir}`);
        fs.mkdirSync(baseDir, { recursive: true });
    }
    /* ------------------------------------------------------------------ */
    /* 2. Create composer.json directly (more reliable)                    */
    /* ------------------------------------------------------------------ */
    if (!existsAlready) {
        // Try composer init first, but don't rely on it
        const initArgs = [
            ...baseArgs,
            "init",
            "--no-interaction",
            "--name",
            "tsnc/prisma-php-app",
            "--require",
            "php:^8.2",
            "--type",
            "project",
            "--version",
            "1.0.0",
        ];
        console.log(`Attempting composer init...`);
        const res = spawnSync(cmd, initArgs, {
            cwd: baseDir,
            stdio: ["ignore", "pipe", "pipe"],
            encoding: "utf8",
        });
        // Check if composer.json was actually created
        const composerJsonCreated = fs.existsSync(composerJsonPath);
        if (res.status === 0 && composerJsonCreated) {
            console.log("✓ Composer init successful and composer.json created");
        }
        else {
            if (res.status !== 0) {
                console.log(`Composer init failed with status ${res.status}`);
                if (res.stderr)
                    console.log(`Stderr: ${res.stderr}`);
            }
            else {
                console.log(`Composer init reported success but didn't create composer.json`);
            }
            // Always create composer.json manually
            console.log("Creating composer.json manually...");
            const defaultComposerJson = {
                name: "tsnc/prisma-php-app",
                type: "project",
                version: "1.0.0",
                require: {
                    php: "^8.2",
                },
                autoload: {
                    "psr-4": {
                        "": "src/",
                    },
                },
            };
            try {
                // Ensure we're writing to the correct absolute path
                const absoluteComposerPath = path.resolve(baseDir, "composer.json");
                console.log(`Writing composer.json to: ${absoluteComposerPath}`);
                fs.writeFileSync(absoluteComposerPath, JSON.stringify(defaultComposerJson, null, 2), { encoding: "utf8" });
                // Verify the file was actually created
                if (fs.existsSync(absoluteComposerPath)) {
                    console.log(`✓ Successfully created composer.json`);
                }
                else {
                    throw new Error("File creation appeared to succeed but file doesn't exist");
                }
            }
            catch (writeError) {
                console.error(`✗ Failed to create composer.json:`, writeError);
                // Additional debugging
                console.error(`Base directory: ${baseDir}`);
                console.error(`Absolute base directory: ${path.resolve(baseDir)}`);
                console.error(`Target file path: ${composerJsonPath}`);
                console.error(`Absolute target file path: ${path.resolve(composerJsonPath)}`);
                console.error(`Current working directory: ${process.cwd()}`);
                console.error(`Base directory exists: ${fs.existsSync(baseDir)}`);
                if (fs.existsSync(baseDir)) {
                    try {
                        const stats = fs.statSync(baseDir);
                        console.error(`Base directory is writable: ${stats.isDirectory()}`);
                    }
                    catch (statError) {
                        console.error(`Cannot stat base directory: ${statError}`);
                    }
                }
                throw new Error(`Cannot create composer.json: ${writeError}`);
            }
        }
    }
    /* ------------------------------------------------------------------ */
    /* 3. Final verification that composer.json exists                    */
    /* ------------------------------------------------------------------ */
    const finalComposerPath = path.resolve(baseDir, "composer.json");
    if (!fs.existsSync(finalComposerPath)) {
        console.error(`✗ composer.json still not found at ${finalComposerPath}`);
        console.error(`Directory contents:`, fs.readdirSync(baseDir));
        throw new Error("Failed to create composer.json - file does not exist after all attempts");
    }
    /* ------------------------------------------------------------------ */
    /* 4. Read and update composer.json                                   */
    /* ------------------------------------------------------------------ */
    let json;
    try {
        const jsonContent = fs.readFileSync(finalComposerPath, "utf8");
        console.log("✓ Successfully read composer.json");
        json = JSON.parse(jsonContent);
    }
    catch (readError) {
        console.error("✗ Failed to read/parse composer.json:", readError);
        throw new Error(`Cannot read composer.json: ${readError}`);
    }
    // Ensure PSR-4 autoload entry
    json.autoload ??= {};
    json.autoload["psr-4"] ??= {};
    json.autoload["psr-4"][""] ??= "src/";
    try {
        fs.writeFileSync(finalComposerPath, JSON.stringify(json, null, 2));
        console.log("✓ Updated composer.json with PSR-4 autoload");
    }
    catch (writeError) {
        console.error("✗ Failed to update composer.json:", writeError);
        throw writeError;
    }
    /* ------------------------------------------------------------------ */
    /* 5. Install dependencies                                             */
    /* ------------------------------------------------------------------ */
    if (dependencies.length) {
        console.log("Installing Composer dependencies:");
        dependencies.forEach((d) => console.log(`- ${chalk.blue(d)}`));
        try {
            const requireCmd = `${cmd} ${[
                ...baseArgs,
                "require",
                "--no-interaction",
                ...dependencies,
            ].join(" ")}`;
            // console.log(`Executing: ${requireCmd}`);
            // console.log(`Working directory: ${baseDir}`);
            execSync(requireCmd, {
                stdio: "inherit",
                cwd: baseDir,
                // Ensure the working directory is correct
                env: { ...process.env },
            });
            console.log("✓ Composer dependencies installed");
        }
        catch (installError) {
            console.error("✗ Failed to install composer dependencies:", installError);
            throw installError;
        }
    }
    /* ------------------------------------------------------------------ */
    /* 6. Refresh lock when updating                                      */
    /* ------------------------------------------------------------------ */
    if (existsAlready) {
        try {
            execSync(`${cmd} ${[
                ...baseArgs,
                "update",
                "--lock",
                "--no-install",
                "--no-interaction",
            ].join(" ")}`, { stdio: "inherit", cwd: baseDir });
            console.log("✓ Composer lock updated");
        }
        catch (updateError) {
            console.error("✗ Failed to update composer lock:", updateError);
            throw updateError;
        }
    }
    /* ------------------------------------------------------------------ */
    /* 7. Regenerate autoloader                                           */
    /* ------------------------------------------------------------------ */
    try {
        execSync(`${cmd} ${[...baseArgs, "dump-autoload", "--quiet"].join(" ")}`, {
            stdio: "inherit",
            cwd: baseDir,
        });
        console.log("✓ Composer autoloader regenerated");
    }
    catch (autoloadError) {
        console.error("✗ Failed to regenerate autoloader:", autoloadError);
        throw autoloadError;
    }
}
const npmPinnedVersions = {
    "@tailwindcss/postcss": "^4.1.12",
    "@types/browser-sync": "^2.29.0",
    "@types/node": "^24.3.0",
    "@types/prompts": "^2.4.9",
    "browser-sync": "^3.0.4",
    chalk: "^5.6.0",
    "chokidar-cli": "^3.0.0",
    cssnano: "^7.1.1",
    "http-proxy-middleware": "^3.0.5",
    "npm-run-all": "^4.1.5",
    "php-parser": "^3.2.5",
    postcss: "^8.5.6",
    "postcss-cli": "^11.0.1",
    prompts: "^2.4.2",
    tailwindcss: "^4.1.12",
    tsx: "^4.20.5",
    typescript: "^5.9.2",
};
function npmPkg(name) {
  return npmPinnedVersions[name] ? `${name}@${npmPinnedVersions[name]}` : name;
}
const composerPinnedVersions = {
  "vlucas/phpdotenv": "^5.6.2",
  "firebase/php-jwt": "^6.11.1",
  "phpmailer/phpmailer": "^6.10.0",
  "guzzlehttp/guzzle": "^7.9.3",
  "ezyang/htmlpurifier": "^4.18.0",
  "symfony/uid": "^7.2.0",
  "brick/math": "^0.13.1",
  "cboden/ratchet": "^0.4.4",
  "tsnc/prisma-php": "^1.0.0",
  "php-mcp/server": "3.3.0",
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
      // Check if it's an update FIRST
      const currentDir = process.cwd();
      const configPath = path.join(currentDir, "prisma-php.json");
      if (fs.existsSync(configPath)) {
        // It's an update - read existing settings
        const localSettings = readJsonFile(configPath);
        let excludeFiles = [];
        localSettings.excludeFiles?.map((file) => {
          const filePath = path.join(currentDir, file);
          if (fs.existsSync(filePath))
            excludeFiles.push(filePath.replace(/\\/g, "/"));
        });
        // Set updateAnswer with OLD settings initially (for checkExcludeFiles function)
        updateAnswer = {
          projectName,
          backendOnly: localSettings.backendOnly,
          swaggerDocs: localSettings.swaggerDocs,
          tailwindcss: localSettings.tailwindcss,
          websocket: localSettings.websocket,
          mcp: localSettings.mcp,
          prisma: localSettings.prisma,
          docker: localSettings.docker,
          isUpdate: true,
          excludeFiles: localSettings.excludeFiles ?? [],
          excludeFilePath: excludeFiles ?? [],
          filePath: currentDir,
        };
        // For updates, use existing settings but allow CLI overrides
        const predefinedAnswers = {
          projectName,
          backendOnly:
            args.includes("--backend-only") || localSettings.backendOnly,
          swaggerDocs:
            args.includes("--swagger-docs") || localSettings.swaggerDocs,
          tailwindcss:
            args.includes("--tailwindcss") || localSettings.tailwindcss,
          websocket: args.includes("--websocket") || localSettings.websocket,
          prisma: args.includes("--prisma") || localSettings.prisma,
          docker: args.includes("--docker") || localSettings.docker,
          mcp: args.includes("--mcp") || localSettings.mcp,
        };
        answer = await getAnswer(predefinedAnswers);
        // IMPORTANT: Update updateAnswer with the NEW answer after getting user input
        if (answer !== null) {
          updateAnswer = {
            projectName,
            backendOnly: answer.backendOnly,
            swaggerDocs: answer.swaggerDocs,
            tailwindcss: answer.tailwindcss,
            websocket: answer.websocket,
            mcp: answer.mcp,
            prisma: answer.prisma,
            docker: answer.docker,
            isUpdate: true,
            excludeFiles: localSettings.excludeFiles ?? [],
            excludeFilePath: excludeFiles ?? [],
            filePath: currentDir,
          };
        }
      } else {
        // It's a new project - use CLI arguments
        let useBackendOnly = args.includes("--backend-only");
        let useSwaggerDocs = args.includes("--swagger-docs");
        let useTailwind = args.includes("--tailwindcss");
        let useWebsocket = args.includes("--websocket");
        let useMcp = args.includes("--mcp");
        let usePrisma = args.includes("--prisma");
        let useDocker = args.includes("--docker");
        const predefinedAnswers = {
          projectName,
          backendOnly: useBackendOnly,
          swaggerDocs: useSwaggerDocs,
          tailwindcss: useTailwind,
          websocket: useWebsocket,
          mcp: useMcp,
          prisma: usePrisma,
          docker: useDocker,
        };
        answer = await getAnswer(predefinedAnswers);
      }
      if (answer === null) {
        console.log(chalk.red("Installation cancelled."));
        return;
      }
    } else {
      // No project name provided - interactive mode
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
      // composerPkg("tsnc/prisma-php"),
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
      composerDependencies.push("cboden/ratchet");
    }
    if (answer.mcp) {
      composerDependencies.push("php-mcp/server");
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
      // Helper function to check if a composer package is installed
      const isComposerPackageInstalled = (packageName) => {
        try {
          const composerJsonPath = path.join(projectPath, "composer.json");
          if (fs.existsSync(composerJsonPath)) {
            const composerJson = JSON.parse(
              fs.readFileSync(composerJsonPath, "utf8")
            );
            return !!(
              composerJson.require && composerJson.require[packageName]
            );
          }
          return false;
        } catch {
          return false;
        }
      };
      // Helper function to check if an npm package is installed
      const isNpmPackageInstalled = (packageName) => {
        try {
          const packageJsonPath = path.join(projectPath, "package.json");
          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(
              fs.readFileSync(packageJsonPath, "utf8")
            );
            return !!(
              (packageJson.dependencies &&
                packageJson.dependencies[packageName]) ||
              (packageJson.devDependencies &&
                packageJson.devDependencies[packageName])
            );
          }
          return false;
        } catch {
          return false;
        }
      };
      if (updateAnswer.backendOnly) {
        nonBackendFiles.forEach((file) => {
          const filePath = path.join(projectPath, "src", "app", file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`${file} was deleted successfully.`);
          }
        });
        const backendOnlyFolders = ["js", "css"];
        backendOnlyFolders.forEach((folder) => {
          const folderPath = path.join(projectPath, "src", "app", folder);
          if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log(`${folder} was deleted successfully.`);
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
          fs.rmSync(swaggerDocsFolder, { recursive: true, force: true });
          console.log(`swagger-docs was deleted successfully.`);
        }
        const swaggerFiles = ["swagger-config.ts"];
        swaggerFiles.forEach((file) => {
          const filePath = path.join(projectPath, "settings", file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`${file} was deleted successfully.`);
          }
        });
        // Only add to uninstall list if packages are actually installed
        if (isNpmPackageInstalled("swagger-jsdoc")) {
          updateUninstallNpmDependencies.push("swagger-jsdoc");
        }
        if (isNpmPackageInstalled("@types/swagger-jsdoc")) {
          updateUninstallNpmDependencies.push("@types/swagger-jsdoc");
        }
        if (isNpmPackageInstalled("prompts")) {
          updateUninstallNpmDependencies.push("prompts");
        }
        if (isNpmPackageInstalled("@types/prompts")) {
          updateUninstallNpmDependencies.push("@types/prompts");
        }
      }
      if (!updateAnswer.tailwindcss) {
        const tailwindFiles = ["postcss.config.js"];
        tailwindFiles.forEach((file) => {
          const filePath = path.join(projectPath, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`${file} was deleted successfully.`);
          }
        });
        // Only add to uninstall list if packages are actually installed
        const tailwindPackages = [
          "tailwindcss",
          "postcss",
          "postcss-cli",
          "@tailwindcss/postcss",
          "cssnano",
        ];
        tailwindPackages.forEach((pkg) => {
          if (isNpmPackageInstalled(pkg)) {
            updateUninstallNpmDependencies.push(pkg);
          }
        });
      }
      if (!updateAnswer.websocket) {
        const websocketFiles = ["restart-websocket.ts"];
        websocketFiles.forEach((file) => {
          const filePath = path.join(projectPath, "settings", file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`${file} was deleted successfully.`);
          }
        });
        const websocketFolder = path.join(
          projectPath,
          "src",
          "Lib",
          "Websocket"
        );
        if (fs.existsSync(websocketFolder)) {
          fs.rmSync(websocketFolder, { recursive: true, force: true });
          console.log(`Websocket folder was deleted successfully.`);
        }
        // composer package for websocket only
        if (isComposerPackageInstalled("cboden/ratchet")) {
          updateUninstallComposerDependencies.push("cboden/ratchet");
        }
      }
      if (!updateAnswer.mcp) {
        const mcpFiles = ["restart-mcp.ts"];
        mcpFiles.forEach((file) => {
          const filePath = path.join(projectPath, "settings", file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`${file} was deleted successfully.`);
          }
        });
        const mcpFolder = path.join(projectPath, "src", "Lib", "MCP");
        if (fs.existsSync(mcpFolder)) {
          fs.rmSync(mcpFolder, { recursive: true, force: true });
          console.log(`MCP folder was deleted successfully.`);
        }
        // composer package for MCP only
        if (isComposerPackageInstalled("php-mcp/server")) {
          updateUninstallComposerDependencies.push("php-mcp/server");
        }
      }
      if (!updateAnswer.prisma) {
        const prismaPackages = [
          "prisma",
          "@prisma/client",
          "@prisma/internals",
        ];
        prismaPackages.forEach((pkg) => {
          if (isNpmPackageInstalled(pkg)) {
            updateUninstallNpmDependencies.push(pkg);
          }
        });
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
            fs.unlinkSync(filePath);
            console.log(`${file} was deleted successfully.`);
          }
        });
      }
      // Only uninstall if there are packages to uninstall
      const uniq = (arr) => Array.from(new Set(arr));
      const npmToUninstall = uniq(updateUninstallNpmDependencies);
      const composerToUninstall = uniq(updateUninstallComposerDependencies);
      if (npmToUninstall.length > 0) {
        console.log(`Uninstalling npm packages: ${npmToUninstall.join(", ")}`);
        await uninstallNpmDependencies(projectPath, npmToUninstall, true);
      }
      if (composerToUninstall.length > 0) {
        console.log(
          `Uninstalling composer packages: ${composerToUninstall.join(", ")}`
        );
        await uninstallComposerDependencies(projectPath, composerToUninstall);
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
      mcp: answer.mcp,
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
=======
import{execSync,spawnSync}from"child_process";import fs from"fs";import{fileURLToPath}from"url";import path from"path";import chalk from"chalk";import prompts from"prompts";import https from"https";import{randomBytes}from"crypto";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);let updateAnswer=null;const nonBackendFiles=["favicon.ico","\\src\\app\\index.php","metadata.php","not-found.php","error.php"],dockerFiles=[".dockerignore","docker-compose.yml","Dockerfile","apache.conf"],STARTER_KITS={basic:{id:"basic",name:"Basic PHP Application",description:"Simple PHP backend with minimal dependencies",features:{backendOnly:!0,tailwindcss:!1,websocket:!1,prisma:!1,docker:!1,swaggerDocs:!1,mcp:!1},requiredFiles:["bootstrap.php",".htaccess","src/app/layout.php","src/app/index.php"]},fullstack:{id:"fullstack",name:"Full-Stack Application",description:"Complete web application with frontend and backend",features:{backendOnly:!1,tailwindcss:!0,websocket:!1,prisma:!0,docker:!1,swaggerDocs:!0,mcp:!1},requiredFiles:["bootstrap.php",".htaccess","postcss.config.js","src/app/layout.php","src/app/index.php","public/js/main.js","src/app/globals.css"]},api:{id:"api",name:"REST API",description:"Backend API with database and documentation",features:{backendOnly:!0,tailwindcss:!1,websocket:!1,prisma:!0,docker:!0,swaggerDocs:!0,mcp:!1},requiredFiles:["bootstrap.php",".htaccess","docker-compose.yml","Dockerfile"]},realtime:{id:"realtime",name:"Real-time Application",description:"Application with WebSocket support and MCP",features:{backendOnly:!1,tailwindcss:!0,websocket:!0,prisma:!0,docker:!1,swaggerDocs:!0,mcp:!0},requiredFiles:["bootstrap.php",".htaccess","postcss.config.js","src/lib/websocket","src/lib/mcp"]},ecommerce:{id:"ecommerce",name:"E-commerce Starter",description:"Full e-commerce application with cart, payments, and admin",features:{backendOnly:!1,tailwindcss:!0,websocket:!1,prisma:!0,docker:!0,swaggerDocs:!0,mcp:!1},requiredFiles:[],source:{type:"git",url:"https://github.com/your-org/prisma-php-ecommerce-starter",branch:"main"}},blog:{id:"blog",name:"Blog CMS",description:"Blog content management system",features:{backendOnly:!1,tailwindcss:!0,websocket:!1,prisma:!0,docker:!1,swaggerDocs:!1,mcp:!1},requiredFiles:[],source:{type:"git",url:"https://github.com/your-org/prisma-php-blog-starter"}}};function bsConfigUrls(e){const s=e.indexOf("\\htdocs\\");if(-1===s)return console.error("Invalid PROJECT_ROOT_PATH. The path does not contain \\htdocs\\"),{bsTarget:"",bsPathRewrite:{}};const t=e.substring(0,s+8).replace(/\\/g,"\\\\"),c=e.replace(new RegExp(`^${t}`),"").replace(/\\/g,"/");let o=`http://localhost/${c}`;o=o.endsWith("/")?o.slice(0,-1):o;const n=o.replace(/(?<!:)(\/\/+)/g,"/"),r=c.replace(/\/\/+/g,"/");return{bsTarget:`${n}/`,bsPathRewrite:{"^/":`/${r.startsWith("/")?r.substring(1):r}/`}}}async function updatePackageJson(e,s){const t=path.join(e,"package.json");if(checkExcludeFiles(t))return;const c=JSON.parse(fs.readFileSync(t,"utf8"));c.scripts={...c.scripts,projectName:"tsx settings/project-name.ts"};let o=[];if(s.tailwindcss&&(c.scripts={...c.scripts,tailwind:"postcss src/app/globals.css -o public/css/styles.css --watch","tailwind:build":"postcss src/app/globals.css -o public/css/styles.css"},o.push("tailwind")),s.typescript&&!s.backendOnly&&(c.scripts={...c.scripts,"ts:watch":"vite build --watch","ts:build":"vite build"},o.push("ts:watch")),s.websocket&&(c.scripts={...c.scripts,websocket:"tsx settings/restart-websocket.ts"},o.push("websocket")),s.mcp&&(c.scripts={...c.scripts,mcp:"tsx settings/restart-mcp.ts"},o.push("mcp")),s.docker&&(c.scripts={...c.scripts,docker:"docker-compose up"},o.push("docker")),s.swaggerDocs){const e=s.prisma?"tsx settings/auto-swagger-docs.ts":"tsx settings/swagger-config.ts";c.scripts={...c.scripts,"create-swagger-docs":e}}let n={...c.scripts};n.browserSync="tsx settings/bs-config.ts",n["browserSync:build"]="tsx settings/build.ts",n.dev=`npm-run-all projectName -p browserSync ${o.join(" ")}`;let r=["browserSync:build"];s.tailwindcss&&r.unshift("tailwind:build"),s.typescript&&!s.backendOnly&&r.unshift("ts:build"),n.build=`npm-run-all ${r.join(" ")}`,c.scripts=n,c.type="module",fs.writeFileSync(t,JSON.stringify(c,null,2))}async function updateComposerJson(e){checkExcludeFiles(path.join(e,"composer.json"))}async function updateIndexJsForWebSocket(e,s){if(!s.websocket)return;const t=path.join(e,"public","js","main.js");if(checkExcludeFiles(t))return;let c=fs.readFileSync(t,"utf8");c+='\nwindow.ws = new WebSocket("ws://localhost:8080");\n',fs.writeFileSync(t,c,"utf8")}function generateAuthSecret(){return randomBytes(33).toString("base64")}function generateHexEncodedKey(e=16){return randomBytes(e).toString("hex")}function copyRecursiveSync(e,s,t){const c=fs.existsSync(e),o=c&&fs.statSync(e);if(c&&o&&o.isDirectory()){const c=s.toLowerCase();if(!t.websocket&&c.includes("src\\lib\\websocket"))return;if(!t.mcp&&c.includes("src\\lib\\mcp"))return;if((!t.typescript||t.backendOnly)&&(c.endsWith("\\ts")||c.includes("\\ts\\")))return;if((!t.typescript||t.backendOnly)&&(c.endsWith("\\vite-plugins")||c.includes("\\vite-plugins\\")||c.includes("\\vite-plugins")))return;if(t.backendOnly&&c.includes("public\\js")||t.backendOnly&&c.includes("public\\css")||t.backendOnly&&c.includes("public\\assets"))return;if(!t.swaggerDocs&&c.includes("src\\app\\swagger-docs"))return;const o=s.replace(/\\/g,"/");if(updateAnswer?.excludeFilePath?.includes(o))return;fs.existsSync(s)||fs.mkdirSync(s,{recursive:!0}),fs.readdirSync(e).forEach(c=>{copyRecursiveSync(path.join(e,c),path.join(s,c),t)})}else{if(checkExcludeFiles(s))return;if(!t.tailwindcss&&(s.includes("globals.css")||s.includes("styles.css")))return;if(!t.websocket&&s.includes("restart-websocket.ts"))return;if(!t.mcp&&s.includes("restart-mcp.ts"))return;if(!t.docker&&dockerFiles.some(e=>s.includes(e)))return;if(t.backendOnly&&nonBackendFiles.some(e=>s.includes(e)))return;if(!t.backendOnly&&s.includes("route.php"))return;if(t.backendOnly&&!t.swaggerDocs&&s.includes("layout.php"))return;if(!t.swaggerDocs&&s.includes("swagger-config.ts"))return;if(t.tailwindcss&&s.includes("index.css"))return;if((!t.swaggerDocs||!t.prisma)&&(s.includes("auto-swagger-docs.ts")||s.includes("prisma-schema-config.json")))return;fs.copyFileSync(e,s,0)}}async function executeCopy(e,s,t){s.forEach(({src:s,dest:c})=>{copyRecursiveSync(path.join(__dirname,s),path.join(e,c),t)})}function modifyPostcssConfig(e){const s=path.join(e,"postcss.config.js");if(checkExcludeFiles(s))return;fs.writeFileSync(s,'export default {\n  plugins: {\n    "@tailwindcss/postcss": {},\n    cssnano: {},\n  },\n};',{flag:"w"})}function modifyLayoutPHP(e,s){const t=path.join(e,"src","app","layout.php");if(!checkExcludeFiles(t))try{let e=fs.readFileSync(t,"utf8"),c="";s.backendOnly||(s.tailwindcss||(c='\n    <link href="/css/index.css" rel="stylesheet" />'),c+='\n    <script type="module" src="/js/main.js"><\/script>');let o="";s.backendOnly||(o=s.tailwindcss?`    <link href="/css/styles.css" rel="stylesheet" /> ${c}`:c),e=e.replace("</head>",`${o}\n</head>`),fs.writeFileSync(t,e,{flag:"w"})}catch(e){console.error(chalk.red("Error modifying layout.php:"),e)}}async function createOrUpdateEnvFile(e,s){const t=path.join(e,".env");checkExcludeFiles(t)||fs.writeFileSync(t,s,{flag:"w"})}function checkExcludeFiles(e){return!!updateAnswer?.isUpdate&&(updateAnswer?.excludeFilePath?.includes(e.replace(/\\/g,"/"))??!1)}async function createDirectoryStructure(e,s){const t=[{src:"/bootstrap.php",dest:"/bootstrap.php"},{src:"/.htaccess",dest:"/.htaccess"},{src:"/tsconfig.json",dest:"/tsconfig.json"},{src:"/app-gitignore",dest:"/.gitignore"}];s.tailwindcss&&t.push({src:"/postcss.config.js",dest:"/postcss.config.js"}),s.typescript&&!s.backendOnly&&t.push({src:"/vite.config.ts",dest:"/vite.config.ts"});const c=[{src:"/settings",dest:"/settings"},{src:"/src",dest:"/src"},{src:"/public",dest:"/public"}];s.typescript&&!s.backendOnly&&c.push({src:"/ts",dest:"/ts"}),s.docker&&c.push({src:"/.dockerignore",dest:"/.dockerignore"},{src:"/docker-compose.yml",dest:"/docker-compose.yml"},{src:"/Dockerfile",dest:"/Dockerfile"},{src:"/apache.conf",dest:"/apache.conf"}),t.forEach(({src:s,dest:t})=>{const c=path.join(__dirname,s),o=path.join(e,t);if(checkExcludeFiles(o))return;const n=fs.readFileSync(c,"utf8");fs.writeFileSync(o,n,{flag:"w"})}),await executeCopy(e,c,s),await updatePackageJson(e,s),await updateComposerJson(e),s.backendOnly||await updateIndexJsForWebSocket(e,s),s.tailwindcss&&modifyPostcssConfig(e),(s.tailwindcss||!s.backendOnly||s.swaggerDocs)&&modifyLayoutPHP(e,s);const o=generateAuthSecret(),n=generateHexEncodedKey(),r=`# Authentication secret key for JWT or session encryption.\nAUTH_SECRET="${o}"\n# Name of the authentication cookie.\nAUTH_COOKIE_NAME="${generateHexEncodedKey(8)}"\n\n# Show errors in the browser (development only). Set to false in production.\nSHOW_ERRORS="true"\n\n# Application timezone (default: UTC)\nAPP_TIMEZONE="UTC"\n\n# Application environment (development or production)\nAPP_ENV="development"\n\n# Enable or disable application cache (default: false)\nCACHE_ENABLED="false"\n# Cache time-to-live in seconds (default: 600)\nCACHE_TTL="600"\n\n# Local storage key for browser storage (auto-generated if not set).\n# Spaces will be replaced with underscores and converted to lowercase.\nLOCALSTORE_KEY="${n}"\n\n# Secret key for encrypting function calls.\nFUNCTION_CALL_SECRET="${generateHexEncodedKey(32)}"\n\n# Single or multiple origins (CSV or JSON array)\nCORS_ALLOWED_ORIGINS=[]\n\n# If you need cookies/Authorization across origins, keep this true\nCORS_ALLOW_CREDENTIALS="true"\n\n# Optional tuning\nCORS_ALLOWED_METHODS="GET,POST,PUT,PATCH,DELETE,OPTIONS"\nCORS_ALLOWED_HEADERS="Content-Type,Authorization,X-Requested-With"\nCORS_EXPOSE_HEADERS=""\nCORS_MAX_AGE="86400"`;if(s.prisma){const s=`${'# Environment variables declared in this file are automatically made available to Prisma.\n# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema\n\n# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.\n# See the documentation for all the connection string options: https://pris.ly/d/connection-strings\n\nDATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"'}\n\n${r}`;await createOrUpdateEnvFile(e,s)}else await createOrUpdateEnvFile(e,r)}async function getAnswer(e={},s=!1){if(s)return{projectName:e.projectName??"my-app",backendOnly:e.backendOnly??!1,swaggerDocs:e.swaggerDocs??!1,tailwindcss:e.tailwindcss??!1,typescript:e.typescript??!1,websocket:e.websocket??!1,mcp:e.mcp??!1,prisma:e.prisma??!1,docker:e.docker??!1};if(e.starterKit){const s=e.starterKit;let t=null;if(STARTER_KITS[s]&&(t=STARTER_KITS[s]),t){const c={projectName:e.projectName??"my-app",starterKit:s,starterKitSource:e.starterKitSource,backendOnly:t.features.backendOnly??!1,tailwindcss:t.features.tailwindcss??!1,websocket:t.features.websocket??!1,prisma:t.features.prisma??!1,docker:t.features.docker??!1,swaggerDocs:t.features.swaggerDocs??!1,mcp:t.features.mcp??!1,typescript:t.features.typescript??!1},o=process.argv.slice(2);return o.includes("--backend-only")&&(c.backendOnly=!0),o.includes("--swagger-docs")&&(c.swaggerDocs=!0),o.includes("--tailwindcss")&&(c.tailwindcss=!0),o.includes("--websocket")&&(c.websocket=!0),o.includes("--mcp")&&(c.mcp=!0),o.includes("--prisma")&&(c.prisma=!0),o.includes("--docker")&&(c.docker=!0),o.includes("--typescript")&&(c.typescript=!0),c}if(e.starterKitSource){const t={projectName:e.projectName??"my-app",starterKit:s,starterKitSource:e.starterKitSource,backendOnly:!1,tailwindcss:!0,websocket:!1,prisma:!0,docker:!1,swaggerDocs:!0,mcp:!1,typescript:!1},c=process.argv.slice(2);return c.includes("--backend-only")&&(t.backendOnly=!0),c.includes("--swagger-docs")&&(t.swaggerDocs=!0),c.includes("--tailwindcss")&&(t.tailwindcss=!0),c.includes("--websocket")&&(t.websocket=!0),c.includes("--mcp")&&(t.mcp=!0),c.includes("--prisma")&&(t.prisma=!0),c.includes("--docker")&&(t.docker=!0),c.includes("--typescript")&&(t.typescript=!0),t}}const t=[];e.projectName||t.push({type:"text",name:"projectName",message:"What is your project named?",initial:"my-app"}),e.backendOnly||updateAnswer?.isUpdate||t.push({type:"toggle",name:"backendOnly",message:`Would you like to create a ${chalk.blue("backend-only project")}?`,initial:!1,active:"Yes",inactive:"No"});const c=()=>{console.warn(chalk.red("Operation cancelled by the user.")),process.exit(0)},o=await prompts(t,{onCancel:c}),n=[];o.backendOnly??e.backendOnly??!1?(e.swaggerDocs||n.push({type:"toggle",name:"swaggerDocs",message:`Would you like to use ${chalk.blue("Swagger Docs")}?`,initial:!1,active:"Yes",inactive:"No"}),e.websocket||n.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!1,active:"Yes",inactive:"No"}),e.mcp||n.push({type:"toggle",name:"mcp",message:`Would you like to use ${chalk.blue("MCP (Model Context Protocol)")}?`,initial:!1,active:"Yes",inactive:"No"}),e.prisma||n.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma ORM")}?`,initial:!1,active:"Yes",inactive:"No"}),e.docker||n.push({type:"toggle",name:"docker",message:`Would you like to use ${chalk.blue("Docker")}?`,initial:!1,active:"Yes",inactive:"No"})):(e.swaggerDocs||n.push({type:"toggle",name:"swaggerDocs",message:`Would you like to use ${chalk.blue("Swagger Docs")}?`,initial:!1,active:"Yes",inactive:"No"}),e.tailwindcss||n.push({type:"toggle",name:"tailwindcss",message:`Would you like to use ${chalk.blue("Tailwind CSS")}?`,initial:!1,active:"Yes",inactive:"No"}),e.typescript||n.push({type:"toggle",name:"typescript",message:`Would you like to use ${chalk.blue("TypeScript")}?`,initial:!1,active:"Yes",inactive:"No"}),e.websocket||n.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!1,active:"Yes",inactive:"No"}),e.mcp||n.push({type:"toggle",name:"mcp",message:`Would you like to use ${chalk.blue("MCP (Model Context Protocol)")}?`,initial:!1,active:"Yes",inactive:"No"}),e.prisma||n.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma ORM")}?`,initial:!1,active:"Yes",inactive:"No"}),e.docker||n.push({type:"toggle",name:"docker",message:`Would you like to use ${chalk.blue("Docker")}?`,initial:!1,active:"Yes",inactive:"No"}));const r=await prompts(n,{onCancel:c});return{projectName:o.projectName?String(o.projectName).trim().replace(/ /g,"-"):e.projectName??"my-app",backendOnly:o.backendOnly??e.backendOnly??!1,swaggerDocs:r.swaggerDocs??e.swaggerDocs??!1,tailwindcss:r.tailwindcss??e.tailwindcss??!1,typescript:r.typescript??e.typescript??!1,websocket:r.websocket??e.websocket??!1,mcp:r.mcp??e.mcp??!1,prisma:r.prisma??e.prisma??!1,docker:r.docker??e.docker??!1}}async function uninstallNpmDependencies(e,s,t=!1){console.log("Uninstalling Node dependencies:"),s.forEach(e=>console.log(`- ${chalk.blue(e)}`));const c=`npm uninstall ${t?"--save-dev":"--save"} ${s.join(" ")}`;execSync(c,{stdio:"inherit",cwd:e})}async function uninstallComposerDependencies(e,s){console.log("Uninstalling Composer dependencies:"),s.forEach(e=>console.log(`- ${chalk.blue(e)}`));const t=`C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar remove ${s.join(" ")}`;execSync(t,{stdio:"inherit",cwd:e})}function fetchPackageVersion(e){return new Promise((s,t)=>{https.get(`https://registry.npmjs.org/${e}`,e=>{let c="";e.on("data",e=>c+=e),e.on("end",()=>{try{const e=JSON.parse(c);s(e["dist-tags"].latest)}catch(e){t(new Error("Failed to parse JSON response"))}})}).on("error",e=>t(e))})}const readJsonFile=e=>{const s=fs.readFileSync(e,"utf8");return JSON.parse(s)};function compareVersions(e,s){const t=e.split(".").map(Number),c=s.split(".").map(Number);for(let e=0;e<t.length;e++){if(t[e]>c[e])return 1;if(t[e]<c[e])return-1}return 0}function getInstalledPackageVersion(e){try{const s=execSync(`npm list -g ${e} --depth=0`).toString().match(new RegExp(`${e}@(\\d+\\.\\d+\\.\\d+)`));return s?s[1]:(console.error(`Package ${e} is not installed`),null)}catch(e){return console.error(e instanceof Error?e.message:String(e)),null}}async function installNpmDependencies(e,s,t=!1){fs.existsSync(path.join(e,"package.json"))?console.log("Updating existing Node.js project..."):console.log("Initializing new Node.js project..."),fs.existsSync(path.join(e,"package.json"))||execSync("npm init -y",{stdio:"inherit",cwd:e}),console.log((t?"Installing development dependencies":"Installing dependencies")+":"),s.forEach(e=>console.log(`- ${chalk.blue(e)}`));const c=`npm install ${t?"--save-dev":""} ${s.join(" ")}`;execSync(c,{stdio:"inherit",cwd:e})}function getComposerCmd(){try{return execSync("composer --version",{stdio:"ignore"}),console.log("✓ Using global composer command"),{cmd:"composer",baseArgs:[]}}catch{const e="C:\\xampp\\php\\php.exe",s="C:\\ProgramData\\ComposerSetup\\bin\\composer.phar";if(!fs.existsSync(e))throw console.error(`✗ PHP not found at ${e}`),new Error(`PHP executable not found at ${e}`);if(!fs.existsSync(s))throw console.error(`✗ Composer not found at ${s}`),new Error(`Composer phar not found at ${s}`);return console.log("✓ Using XAMPP PHP with Composer phar"),{cmd:e,baseArgs:[s]}}}export async function installComposerDependencies(e,s){const{cmd:t,baseArgs:c}=getComposerCmd(),o=path.join(e,"composer.json"),n=fs.existsSync(o);if(console.log(chalk.green("Composer project initialization: "+(n?"Updating existing project…":"Setting up new project…"))),fs.existsSync(e)||(console.log(`Creating base directory: ${e}`),fs.mkdirSync(e,{recursive:!0})),!n){const s=[...c,"init","--no-interaction","--name","tsnc/prisma-php-app","--require","php:^8.2","--type","project","--version","1.0.0"];console.log("Attempting composer init...");const n=spawnSync(t,s,{cwd:e,stdio:["ignore","pipe","pipe"],encoding:"utf8"}),r=fs.existsSync(o);if(0===n.status&&r)console.log("✓ Composer init successful and composer.json created");else{0!==n.status?(console.log(`Composer init failed with status ${n.status}`),n.stderr&&console.log(`Stderr: ${n.stderr}`)):console.log("Composer init reported success but didn't create composer.json"),console.log("Creating composer.json manually...");const s={name:"tsnc/prisma-php-app",type:"project",version:"1.0.0",require:{php:"^8.2"},autoload:{"psr-4":{"":"src/"}}};try{const t=path.resolve(e,"composer.json");if(console.log(`Writing composer.json to: ${t}`),fs.writeFileSync(t,JSON.stringify(s,null,2),{encoding:"utf8"}),!fs.existsSync(t))throw new Error("File creation appeared to succeed but file doesn't exist");console.log("✓ Successfully created composer.json")}catch(s){if(console.error("✗ Failed to create composer.json:",s),console.error(`Base directory: ${e}`),console.error(`Absolute base directory: ${path.resolve(e)}`),console.error(`Target file path: ${o}`),console.error(`Absolute target file path: ${path.resolve(o)}`),console.error(`Current working directory: ${process.cwd()}`),console.error(`Base directory exists: ${fs.existsSync(e)}`),fs.existsSync(e))try{const s=fs.statSync(e);console.error(`Base directory is writable: ${s.isDirectory()}`)}catch(e){console.error(`Cannot stat base directory: ${e}`)}throw new Error(`Cannot create composer.json: ${s}`)}}}const r=path.resolve(e,"composer.json");if(!fs.existsSync(r))throw console.error(`✗ composer.json still not found at ${r}`),console.error("Directory contents:",fs.readdirSync(e)),new Error("Failed to create composer.json - file does not exist after all attempts");let i;try{const e=fs.readFileSync(r,"utf8");console.log("✓ Successfully read composer.json"),i=JSON.parse(e)}catch(e){throw console.error("✗ Failed to read/parse composer.json:",e),new Error(`Cannot read composer.json: ${e}`)}i.autoload??={},i.autoload["psr-4"]??={},i.autoload["psr-4"][""]??="src/";try{fs.writeFileSync(r,JSON.stringify(i,null,2)),console.log("✓ Updated composer.json with PSR-4 autoload")}catch(e){throw console.error("✗ Failed to update composer.json:",e),e}if(s.length){console.log("Installing Composer dependencies:"),s.forEach(e=>console.log(`- ${chalk.blue(e)}`));try{const o=`${t} ${[...c,"require","--no-interaction","-W",...s].join(" ")}`;execSync(o,{stdio:"inherit",cwd:e,env:{...process.env}}),console.log("✓ Composer dependencies installed")}catch(e){throw console.error("✗ Failed to install composer dependencies:",e),e}}if(n)try{execSync(`${t} ${[...c,"update","--lock","--no-install","--no-interaction"].join(" ")}`,{stdio:"inherit",cwd:e}),console.log("✓ Composer lock updated")}catch(e){throw console.error("✗ Failed to update composer lock:",e),e}try{execSync(`${t} ${[...c,"dump-autoload","--quiet"].join(" ")}`,{stdio:"inherit",cwd:e}),console.log("✓ Composer autoloader regenerated")}catch(e){throw console.error("✗ Failed to regenerate autoloader:",e),e}}const npmPinnedVersions={"@tailwindcss/postcss":"4.1.18","@types/browser-sync":"2.29.1","@types/node":"25.0.3","@types/prompts":"2.4.9","browser-sync":"3.0.4",chalk:"5.6.2","chokidar-cli":"3.0.0",cssnano:"7.1.2","http-proxy-middleware":"3.0.5","npm-run-all":"4.1.5","php-parser":"3.2.5",postcss:"8.5.6","postcss-cli":"11.0.1",prompts:"2.4.2",tailwindcss:"4.1.18",tsx:"4.21.0",typescript:"5.9.3",vite:"7.3.0","fast-glob":"3.3.3"};function npmPkg(e){return npmPinnedVersions[e]?`${e}@${npmPinnedVersions[e]}`:e}const composerPinnedVersions={"vlucas/phpdotenv":"5.6.3","firebase/php-jwt":"7.0.2","phpmailer/phpmailer":"7.0.1","guzzlehttp/guzzle":"7.10.0","symfony/uid":"7.4.0","brick/math":"0.14.1","cboden/ratchet":"0.4.4","tsnc/prisma-php":"1.0.0","php-mcp/server":"3.3.0","gehrisandro/tailwind-merge-php":"1.1.2"};function composerPkg(e){return composerPinnedVersions[e]?`${e}:${composerPinnedVersions[e]}`:e}async function setupStarterKit(e,s){if(!s.starterKit)return;let t=null;if(STARTER_KITS[s.starterKit]?t=STARTER_KITS[s.starterKit]:s.starterKitSource&&(t={id:s.starterKit,name:`Custom Starter Kit (${s.starterKit})`,description:"Custom starter kit from external source",features:{},requiredFiles:[],source:{type:"git",url:s.starterKitSource}}),t){if(console.log(chalk.green(`Setting up ${t.name}...`)),t.source)try{const c=t.source.branch?`git clone -b ${t.source.branch} --depth 1 ${t.source.url} ${e}`:`git clone --depth 1 ${t.source.url} ${e}`;execSync(c,{stdio:"inherit"});const o=path.join(e,".git");fs.existsSync(o)&&fs.rmSync(o,{recursive:!0,force:!0}),console.log(chalk.blue("Starter kit cloned successfully!"));const n=path.join(e,"prisma-php.json");if(fs.existsSync(n))try{const t=JSON.parse(fs.readFileSync(n,"utf8")),c=e.replace(/\\/g,"\\"),o=bsConfigUrls(c);t.projectName=s.projectName,t.projectRootPath=c,t.bsTarget=o.bsTarget,t.bsPathRewrite=o.bsPathRewrite;const r=await fetchPackageVersion("create-prisma-php-app");t.version=t.version||r,fs.writeFileSync(n,JSON.stringify(t,null,2)),console.log(chalk.green("Updated prisma-php.json with new project details"))}catch(e){console.warn(chalk.yellow("Failed to update prisma-php.json, will create new one"))}}catch(e){throw console.error(chalk.red(`Failed to setup starter kit: ${e}`)),e}t.customSetup&&await t.customSetup(e,s),console.log(chalk.green(`✓ ${t.name} setup complete!`))}else console.warn(chalk.yellow(`Starter kit '${s.starterKit}' not found. Skipping...`))}function showStarterKits(){console.log(chalk.blue("\n🚀 Available Starter Kits:\n")),Object.values(STARTER_KITS).forEach(e=>{const s=e.source?" (Custom)":" (Built-in)";console.log(chalk.green(`  ${e.id}${chalk.gray(s)}`)),console.log(`    ${e.name}`),console.log(chalk.gray(`    ${e.description}`)),e.source&&console.log(chalk.cyan(`    Source: ${e.source.url}`));const t=Object.entries(e.features).filter(([,e])=>!0===e).map(([e])=>e).join(", ");t&&console.log(chalk.magenta(`    Features: ${t}`)),console.log()}),console.log(chalk.yellow("Usage:")),console.log("  npx create-prisma-php-app my-project --starter-kit=basic"),console.log("  npx create-prisma-php-app my-project --starter-kit=custom --starter-kit-source=https://github.com/user/repo"),console.log()}async function main(){try{const e=process.argv.slice(2),s=e.includes("-y");let t=e[0];const c=e.find(e=>e.startsWith("--starter-kit=")),o=c?.split("=")[1],n=e.find(e=>e.startsWith("--starter-kit-source=")),r=n?.split("=")[1];if(e.includes("--list-starter-kits"))return void showStarterKits();let i=null,a=!1;if(t){const c=process.cwd(),n=path.join(c,"prisma-php.json");if(o&&r){a=!0;const c={projectName:t,starterKit:o,starterKitSource:r,backendOnly:e.includes("--backend-only"),swaggerDocs:e.includes("--swagger-docs"),tailwindcss:e.includes("--tailwindcss"),typescript:e.includes("--typescript"),websocket:e.includes("--websocket"),mcp:e.includes("--mcp"),prisma:e.includes("--prisma"),docker:e.includes("--docker")};i=await getAnswer(c,s)}else if(fs.existsSync(n)){const o=readJsonFile(n);let r=[];o.excludeFiles?.map(e=>{const s=path.join(c,e);fs.existsSync(s)&&r.push(s.replace(/\\/g,"/"))}),updateAnswer={projectName:t,backendOnly:o.backendOnly,swaggerDocs:o.swaggerDocs,tailwindcss:o.tailwindcss,websocket:o.websocket,mcp:o.mcp,prisma:o.prisma,docker:o.docker,typescript:o.typescript,isUpdate:!0,componentScanDirs:o.componentScanDirs??[],excludeFiles:o.excludeFiles??[],excludeFilePath:r??[],filePath:c};const a={projectName:t,backendOnly:e.includes("--backend-only")||o.backendOnly,swaggerDocs:e.includes("--swagger-docs")||o.swaggerDocs,tailwindcss:e.includes("--tailwindcss")||o.tailwindcss,typescript:e.includes("--typescript")||o.typescript,websocket:e.includes("--websocket")||o.websocket,prisma:e.includes("--prisma")||o.prisma,docker:e.includes("--docker")||o.docker,mcp:e.includes("--mcp")||o.mcp};i=await getAnswer(a,s),null!==i&&(updateAnswer={projectName:t,backendOnly:i.backendOnly,swaggerDocs:i.swaggerDocs,tailwindcss:i.tailwindcss,websocket:i.websocket,mcp:i.mcp,prisma:i.prisma,docker:i.docker,typescript:i.typescript,isUpdate:!0,componentScanDirs:o.componentScanDirs??[],excludeFiles:o.excludeFiles??[],excludeFilePath:r??[],filePath:c})}else{const c={projectName:t,starterKit:o,starterKitSource:r,backendOnly:e.includes("--backend-only"),swaggerDocs:e.includes("--swagger-docs"),tailwindcss:e.includes("--tailwindcss"),typescript:e.includes("--typescript"),websocket:e.includes("--websocket"),mcp:e.includes("--mcp"),prisma:e.includes("--prisma"),docker:e.includes("--docker")};i=await getAnswer(c,s)}if(null===i)return void console.log(chalk.red("Installation cancelled."))}else i=await getAnswer({},s);if(null===i)return void console.warn(chalk.red("Installation cancelled."));const p=await fetchPackageVersion("create-prisma-php-app"),l=getInstalledPackageVersion("create-prisma-php-app");l?-1===compareVersions(l,p)&&(execSync("npm uninstall -g create-prisma-php-app",{stdio:"inherit"}),execSync("npm install -g create-prisma-php-app",{stdio:"inherit"})):execSync("npm install -g create-prisma-php-app",{stdio:"inherit"});const d=process.cwd();let u;if(t)if(a){const s=path.join(d,t);fs.existsSync(s)||fs.mkdirSync(s,{recursive:!0}),u=s,await setupStarterKit(u,i),process.chdir(u);const c=path.join(u,"prisma-php.json");if(fs.existsSync(c)){const s=JSON.parse(fs.readFileSync(c,"utf8"));e.includes("--backend-only")&&(s.backendOnly=!0),e.includes("--swagger-docs")&&(s.swaggerDocs=!0),e.includes("--tailwindcss")&&(s.tailwindcss=!0),e.includes("--typescript")&&(s.typescript=!0),e.includes("--websocket")&&(s.websocket=!0),e.includes("--mcp")&&(s.mcp=!0),e.includes("--prisma")&&(s.prisma=!0),e.includes("--docker")&&(s.docker=!0),i={...i,backendOnly:s.backendOnly,swaggerDocs:s.swaggerDocs,tailwindcss:s.tailwindcss,typescript:s.typescript,websocket:s.websocket,mcp:s.mcp,prisma:s.prisma,docker:s.docker};let t=[];s.excludeFiles?.map(e=>{const s=path.join(u,e);fs.existsSync(s)&&t.push(s.replace(/\\/g,"/"))}),updateAnswer={...i,isUpdate:!0,componentScanDirs:s.componentScanDirs??[],excludeFiles:s.excludeFiles??[],excludeFilePath:t??[],filePath:u}}}else{const e=path.join(d,"prisma-php.json"),s=path.join(d,t),c=path.join(s,"prisma-php.json");fs.existsSync(e)?u=d:fs.existsSync(s)&&fs.existsSync(c)?(u=s,process.chdir(s)):(fs.existsSync(s)||fs.mkdirSync(s,{recursive:!0}),u=s,process.chdir(s))}else fs.mkdirSync(i.projectName,{recursive:!0}),u=path.join(d,i.projectName),process.chdir(i.projectName);let g=[npmPkg("typescript"),npmPkg("@types/node"),npmPkg("tsx"),npmPkg("http-proxy-middleware"),npmPkg("chalk"),npmPkg("npm-run-all"),npmPkg("browser-sync"),npmPkg("@types/browser-sync"),npmPkg("php-parser")],m=[composerPkg("vlucas/phpdotenv"),composerPkg("firebase/php-jwt"),composerPkg("phpmailer/phpmailer"),composerPkg("guzzlehttp/guzzle"),composerPkg("symfony/uid"),composerPkg("brick/math"),composerPkg("tsnc/prisma-php")];if(i.swaggerDocs&&g.push(npmPkg("swagger-jsdoc"),npmPkg("@types/swagger-jsdoc")),i.swaggerDocs&&i.prisma&&g.push(npmPkg("prompts"),npmPkg("@types/prompts")),i.tailwindcss&&(g.push(npmPkg("tailwindcss"),npmPkg("postcss"),npmPkg("postcss-cli"),npmPkg("@tailwindcss/postcss"),npmPkg("cssnano")),m.push("gehrisandro/tailwind-merge-php")),i.websocket&&m.push("cboden/ratchet"),i.mcp&&m.push("php-mcp/server"),i.prisma&&execSync("npm install -g prisma-client-php@latest",{stdio:"inherit"}),i.typescript&&!i.backendOnly&&g.push(npmPkg("vite"),npmPkg("fast-glob")),i.starterKit&&!a&&await setupStarterKit(u,i),await installNpmDependencies(u,g,!0),await installComposerDependencies(u,m),t||execSync("npx tsc --init",{stdio:"inherit"}),await createDirectoryStructure(u,i),i.prisma&&execSync("npx ppo init --prisma-php",{stdio:"inherit"}),i.swaggerDocs){const e=path.join(u,"src","app","swagger-docs"),s=path.join(e,"apis"),t=path.join(u,"public","assets"),c=path.join(t,"dist");fs.existsSync(e)&&fs.readdirSync(e).length>0&&(console.log("Removing existing swagger-docs directory..."),fs.rmSync(e,{recursive:!0,force:!0})),console.log(chalk.blue("Cloning swagger-docs repository...")),execSync(`git clone https://github.com/TheSteelNinjaCode/prisma-php-swagger-docs.git ${e}`,{stdio:"inherit"});const o=path.join(e,".git");fs.existsSync(o)&&fs.rmSync(o,{recursive:!0,force:!0}),fs.existsSync(t)||(console.log(chalk.blue("Creating public/assets directory...")),fs.mkdirSync(t,{recursive:!0}));const n=path.join(e,"dist");fs.existsSync(n)?(console.log(chalk.blue("Moving dist folder to public/assets/dist...")),fs.existsSync(c)&&fs.rmSync(c,{recursive:!0,force:!0}),fs.renameSync(n,c),console.log(chalk.green("✓ Moved dist to public/assets/dist"))):console.warn(chalk.yellow("Warning: dist folder not found in cloned repository")),fs.existsSync(s)?console.log(chalk.green("✓ APIs folder preserved in src/app/swagger-docs/apis")):console.warn(chalk.yellow("Warning: apis folder not found in cloned repository")),console.log(chalk.green("✓ Swagger docs setup complete"))}if(updateAnswer?.isUpdate){const e=[],s=[],t=e=>{try{const s=path.join(u,"composer.json");if(fs.existsSync(s)){const t=JSON.parse(fs.readFileSync(s,"utf8"));return!(!t.require||!t.require[e])}return!1}catch{return!1}},c=e=>{try{const s=path.join(u,"package.json");if(fs.existsSync(s)){const t=JSON.parse(fs.readFileSync(s,"utf8"));return!!(t.dependencies&&t.dependencies[e]||t.devDependencies&&t.devDependencies[e])}return!1}catch{return!1}};if(updateAnswer.backendOnly){nonBackendFiles.forEach(e=>{const s=path.join(u,"src","app",e);fs.existsSync(s)&&(fs.unlinkSync(s),console.log(`${e} was deleted successfully.`))});["js","css"].forEach(e=>{const s=path.join(u,"src","app",e);fs.existsSync(s)&&(fs.rmSync(s,{recursive:!0,force:!0}),console.log(`${e} was deleted successfully.`))})}if(!updateAnswer.swaggerDocs){const s=path.join(u,"src","app","swagger-docs");fs.existsSync(s)&&(fs.rmSync(s,{recursive:!0,force:!0}),console.log("swagger-docs was deleted successfully."));["swagger-config.ts"].forEach(e=>{const s=path.join(u,"settings",e);fs.existsSync(s)&&(fs.unlinkSync(s),console.log(`${e} was deleted successfully.`))}),c("swagger-jsdoc")&&e.push("swagger-jsdoc"),c("@types/swagger-jsdoc")&&e.push("@types/swagger-jsdoc"),c("prompts")&&e.push("prompts"),c("@types/prompts")&&e.push("@types/prompts")}if(!updateAnswer.tailwindcss){["postcss.config.js"].forEach(e=>{const s=path.join(u,e);fs.existsSync(s)&&(fs.unlinkSync(s),console.log(`${e} was deleted successfully.`))});["tailwindcss","postcss","postcss-cli","@tailwindcss/postcss","cssnano"].forEach(s=>{c(s)&&e.push(s)});const o="gehrisandro/tailwind-merge-php";t(o)&&s.push(o)}if(!updateAnswer.websocket){["restart-websocket.ts"].forEach(e=>{const s=path.join(u,"settings",e);fs.existsSync(s)&&(fs.unlinkSync(s),console.log(`${e} was deleted successfully.`))});const e=path.join(u,"src","Lib","Websocket");fs.existsSync(e)&&(fs.rmSync(e,{recursive:!0,force:!0}),console.log("Websocket folder was deleted successfully.")),t("cboden/ratchet")&&s.push("cboden/ratchet")}if(!updateAnswer.mcp){["restart-mcp.ts"].forEach(e=>{const s=path.join(u,"settings",e);fs.existsSync(s)&&(fs.unlinkSync(s),console.log(`${e} was deleted successfully.`))});const e=path.join(u,"src","Lib","MCP");fs.existsSync(e)&&(fs.rmSync(e,{recursive:!0,force:!0}),console.log("MCP folder was deleted successfully.")),t("php-mcp/server")&&s.push("php-mcp/server")}if(!updateAnswer.prisma){["prisma","@prisma/client","@prisma/internals","better-sqlite3","@prisma/adapter-better-sqlite3","mariadb","@prisma/adapter-mariadb","pg","@prisma/adapter-pg","@types/pg"].forEach(s=>{c(s)&&e.push(s)})}if(!updateAnswer.docker){[".dockerignore","docker-compose.yml","Dockerfile","apache.conf"].forEach(e=>{const s=path.join(u,e);fs.existsSync(s)&&(fs.unlinkSync(s),console.log(`${e} was deleted successfully.`))})}if(!updateAnswer.typescript||updateAnswer.backendOnly){["vite.config.ts"].forEach(e=>{const s=path.join(u,e);fs.existsSync(s)&&(fs.unlinkSync(s),console.log(`${e} was deleted successfully.`))});const s=path.join(u,"ts");fs.existsSync(s)&&(fs.rmSync(s,{recursive:!0,force:!0}),console.log("ts folder was deleted successfully."));["vite","fast-glob"].forEach(s=>{c(s)&&e.push(s)})}const o=e=>Array.from(new Set(e)),n=o(e),r=o(s);n.length>0&&(console.log(`Uninstalling npm packages: ${n.join(", ")}`),await uninstallNpmDependencies(u,n,!0)),r.length>0&&(console.log(`Uninstalling composer packages: ${r.join(", ")}`),await uninstallComposerDependencies(u,r))}if(!a||!fs.existsSync(path.join(u,"prisma-php.json"))){const e=u.replace(/\\/g,"\\"),s=bsConfigUrls(e),t={projectName:i.projectName,projectRootPath:e,phpEnvironment:"XAMPP",phpRootPathExe:"C:\\xampp\\php\\php.exe",bsTarget:s.bsTarget,bsPathRewrite:s.bsPathRewrite,backendOnly:i.backendOnly,swaggerDocs:i.swaggerDocs,tailwindcss:i.tailwindcss,websocket:i.websocket,mcp:i.mcp,prisma:i.prisma,docker:i.docker,typescript:i.typescript,version:p,componentScanDirs:updateAnswer?.componentScanDirs??["src","vendor/tsnc/prisma-php/src"],excludeFiles:updateAnswer?.excludeFiles??[]};fs.writeFileSync(path.join(u,"prisma-php.json"),JSON.stringify(t,null,2),{flag:"w"})}execSync(updateAnswer?.isUpdate?"C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar update":"C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar install",{stdio:"inherit"}),console.log("\n=========================\n"),console.log(`${chalk.green("Success!")} Prisma PHP project successfully created in ${chalk.green(u.replace(/\\/g,"/"))}!`),console.log("\n=========================")}catch(e){console.error("Error while creating the project:",e),process.exit(1)}}main();
>>>>>>> v4-dev
