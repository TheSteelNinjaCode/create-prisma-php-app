#!/usr/bin/env node
import{execSync,spawnSync}from"child_process";import fs from"fs";import{fileURLToPath}from"url";import path from"path";import chalk from"chalk";import prompts from"prompts";import https from"https";import{randomBytes}from"crypto";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);let updateAnswer=null;const nonBackendFiles=["favicon.ico","\\src\\app\\index.php","metadata.php","not-found.php","error.php"],dockerFiles=[".dockerignore","docker-compose.yml","Dockerfile","apache.conf"],STARTER_KITS={basic:{id:"basic",name:"Basic PHP Application",description:"Simple PHP backend with minimal dependencies",features:{backendOnly:!0,tailwindcss:!1,websocket:!1,prisma:!1,docker:!1,swaggerDocs:!1,mcp:!1},requiredFiles:["bootstrap.php",".htaccess","src/app/layout.php","src/app/index.php"]},fullstack:{id:"fullstack",name:"Full-Stack Application",description:"Complete web application with frontend and backend",features:{backendOnly:!1,tailwindcss:!0,websocket:!1,prisma:!0,docker:!1,swaggerDocs:!0,mcp:!1},requiredFiles:["bootstrap.php",".htaccess","postcss.config.js","src/app/layout.php","src/app/index.php","src/app/js/index.js","src/app/css/tailwind.css"]},api:{id:"api",name:"REST API",description:"Backend API with database and documentation",features:{backendOnly:!0,tailwindcss:!1,websocket:!1,prisma:!0,docker:!0,swaggerDocs:!0,mcp:!1},requiredFiles:["bootstrap.php",".htaccess","docker-compose.yml","Dockerfile"]},realtime:{id:"realtime",name:"Real-time Application",description:"Application with WebSocket support and MCP",features:{backendOnly:!1,tailwindcss:!0,websocket:!0,prisma:!0,docker:!1,swaggerDocs:!0,mcp:!0},requiredFiles:["bootstrap.php",".htaccess","postcss.config.js","src/lib/websocket","src/lib/mcp"]},ecommerce:{id:"ecommerce",name:"E-commerce Starter",description:"Full e-commerce application with cart, payments, and admin",features:{backendOnly:!1,tailwindcss:!0,websocket:!1,prisma:!0,docker:!0,swaggerDocs:!0,mcp:!1},requiredFiles:[],source:{type:"git",url:"https://github.com/your-org/prisma-php-ecommerce-starter",branch:"main"}},blog:{id:"blog",name:"Blog CMS",description:"Blog content management system",features:{backendOnly:!1,tailwindcss:!0,websocket:!1,prisma:!0,docker:!1,swaggerDocs:!1,mcp:!1},requiredFiles:[],source:{type:"git",url:"https://github.com/your-org/prisma-php-blog-starter"}}};function bsConfigUrls(e){const s=e.indexOf("\\htdocs\\");if(-1===s)return{bsTarget:"",bsPathRewrite:{}};const t=e.substring(0,s+"\\htdocs\\".length).replace(/\\/g,"\\\\"),c=e.replace(new RegExp(`^${t}`),"").replace(/\\/g,"/");let n=`http://localhost/${c}`;n=n.endsWith("/")?n.slice(0,-1):n;const i=n.replace(/(?<!:)(\/\/+)/g,"/"),r=c.replace(/\/\/+/g,"/");return{bsTarget:`${i}/`,bsPathRewrite:{"^/":`/${r.startsWith("/")?r.substring(1):r}/`}}}async function updatePackageJson(e,s){const t=path.join(e,"package.json");if(checkExcludeFiles(t))return;const c=JSON.parse(fs.readFileSync(t,"utf8"));c.scripts={...c.scripts,projectName:"tsx settings/project-name.ts"};let n=[];if(s.tailwindcss&&(c.scripts={...c.scripts,tailwind:"postcss src/app/css/tailwind.css -o src/app/css/styles.css --watch","tailwind:build":"postcss src/app/css/tailwind.css -o src/app/css/styles.css"},n.push("tailwind")),s.websocket&&(c.scripts={...c.scripts,websocket:"tsx settings/restart-websocket.ts"},n.push("websocket")),s.mcp&&(c.scripts={...c.scripts,mcp:"tsx settings/restart-mcp.ts"},n.push("mcp")),s.docker&&(c.scripts={...c.scripts,docker:"docker-compose up"},n.push("docker")),s.swaggerDocs){const e=s.prisma?"tsx settings/auto-swagger-docs.ts":"tsx settings/swagger-config.ts";c.scripts={...c.scripts,"create-swagger-docs":e}}let i={...c.scripts};i.browserSync="tsx settings/bs-config.ts",i["browserSync:build"]="tsx settings/build.ts",i.dev=`npm-run-all projectName -p browserSync ${n.join(" ")}`,i.build=`npm-run-all${s.tailwindcss?" tailwind:build":""} browserSync:build`,c.scripts=i,c.type="module",fs.writeFileSync(t,JSON.stringify(c,null,2))}async function updateComposerJson(e){checkExcludeFiles(path.join(e,"composer.json"))}async function updateIndexJsForWebSocket(e,s){if(!s.websocket)return;const t=path.join(e,"src","app","js","index.js");if(checkExcludeFiles(t))return;let c=fs.readFileSync(t,"utf8");c+='\n// WebSocket initialization\nvar ws = new WebSocket("ws://localhost:8080");\n',fs.writeFileSync(t,c,"utf8")}function generateAuthSecret(){return randomBytes(33).toString("base64")}function generateHexEncodedKey(e=16){return randomBytes(e).toString("hex")}function copyRecursiveSync(e,s,t){const c=fs.existsSync(e),n=c&&fs.statSync(e);if(c&&n&&n.isDirectory()){const c=s.toLowerCase();if(!t.websocket&&c.includes("src\\lib\\websocket"))return;if(!t.mcp&&c.includes("src\\lib\\mcp"))return;if(t.backendOnly&&c.includes("src\\app\\js")||t.backendOnly&&c.includes("src\\app\\css")||t.backendOnly&&c.includes("src\\app\\assets"))return;if(!t.swaggerDocs&&c.includes("src\\app\\swagger-docs"))return;const n=s.replace(/\\/g,"/");if(updateAnswer?.excludeFilePath?.includes(n))return;fs.existsSync(s)||fs.mkdirSync(s,{recursive:!0}),fs.readdirSync(e).forEach((c=>{copyRecursiveSync(path.join(e,c),path.join(s,c),t)}))}else{if(checkExcludeFiles(s))return;if(!t.tailwindcss&&(s.includes("tailwind.css")||s.includes("styles.css")))return;if(!t.websocket&&s.includes("restart-websocket.ts"))return;if(!t.mcp&&s.includes("restart-mcp.ts"))return;if(!t.docker&&dockerFiles.some((e=>s.includes(e))))return;if(t.backendOnly&&nonBackendFiles.some((e=>s.includes(e))))return;if(!t.backendOnly&&s.includes("route.php"))return;if(t.backendOnly&&!t.swaggerDocs&&s.includes("layout.php"))return;if(!t.swaggerDocs&&s.includes("swagger-config.ts"))return;if(t.tailwindcss&&s.includes("index.css"))return;if((!t.swaggerDocs||!t.prisma)&&(s.includes("auto-swagger-docs.ts")||s.includes("prisma-schema-config.json")))return;fs.copyFileSync(e,s,0)}}async function executeCopy(e,s,t){s.forEach((({src:s,dest:c})=>{copyRecursiveSync(path.join(__dirname,s),path.join(e,c),t)}))}function modifyPostcssConfig(e){const s=path.join(e,"postcss.config.js");if(checkExcludeFiles(s))return;fs.writeFileSync(s,'export default {\n  plugins: {\n    "@tailwindcss/postcss": {},\n    cssnano: {},\n  },\n};',{flag:"w"})}function modifyLayoutPHP(e,s){const t=path.join(e,"src","app","layout.php");if(!checkExcludeFiles(t))try{let e=fs.readFileSync(t,"utf8"),c="";s.backendOnly||(s.tailwindcss||(c='\n    <link href="<?= Request::baseUrl; ?>/css/index.css" rel="stylesheet" />'),c+='\n    <script src="<?= Request::baseUrl; ?>/js/morphdom-umd.min.js"><\/script>\n    <script src="<?= Request::baseUrl; ?>/js/json5.min.js"><\/script>\n    <script src="<?= Request::baseUrl; ?>/js/index.js"><\/script>');let n="";s.backendOnly||(n=s.tailwindcss?`    <link href="<?= Request::baseUrl; ?>/css/styles.css" rel="stylesheet" /> ${c}`:c),e=e.replace("</head>",`${n}\n</head>`),fs.writeFileSync(t,e,{flag:"w"})}catch(e){}}async function createOrUpdateEnvFile(e,s){const t=path.join(e,".env");checkExcludeFiles(t)||fs.writeFileSync(t,s,{flag:"w"})}function checkExcludeFiles(e){return!!updateAnswer?.isUpdate&&(updateAnswer?.excludeFilePath?.includes(e.replace(/\\/g,"/"))??!1)}async function createDirectoryStructure(e,s){const t=[{src:"/bootstrap.php",dest:"/bootstrap.php"},{src:"/.htaccess",dest:"/.htaccess"},{src:"/tsconfig.json",dest:"/tsconfig.json"},{src:"/app-gitignore",dest:"/.gitignore"}];s.tailwindcss&&t.push({src:"/postcss.config.js",dest:"/postcss.config.js"});const c=[{src:"/settings",dest:"/settings"},{src:"/src",dest:"/src"}];s.docker&&c.push({src:"/.dockerignore",dest:"/.dockerignore"},{src:"/docker-compose.yml",dest:"/docker-compose.yml"},{src:"/Dockerfile",dest:"/Dockerfile"},{src:"/apache.conf",dest:"/apache.conf"}),t.forEach((({src:s,dest:t})=>{const c=path.join(__dirname,s),n=path.join(e,t);if(checkExcludeFiles(n))return;const i=fs.readFileSync(c,"utf8");fs.writeFileSync(n,i,{flag:"w"})})),await executeCopy(e,c,s),await updatePackageJson(e,s),await updateComposerJson(e),s.backendOnly||await updateIndexJsForWebSocket(e,s),s.tailwindcss&&modifyPostcssConfig(e),(s.tailwindcss||!s.backendOnly||s.swaggerDocs)&&modifyLayoutPHP(e,s);const n=generateAuthSecret(),i=generateHexEncodedKey(),r=`# Authentication secret key for JWT or session encryption.\nAUTH_SECRET="${n}"\n# Name of the authentication cookie.\nAUTH_COOKIE_NAME="${generateHexEncodedKey(8)}"\n\n# Show errors in the browser (development only). Set to false in production.\nSHOW_ERRORS="true"\n\n# Application timezone (default: UTC)\nAPP_TIMEZONE="UTC"\n\n# Application environment (development or production)\nAPP_ENV="development"\n\n# Enable or disable application cache (default: false)\nCACHE_ENABLED="false"\n# Cache time-to-live in seconds (default: 600)\nCACHE_TTL="600"\n\n# Local storage key for browser storage (auto-generated if not set).\n# Spaces will be replaced with underscores and converted to lowercase.\nLOCALSTORE_KEY="${i}"\n\n# Secret key for encrypting function calls.\nFUNCTION_CALL_SECRET="${generateHexEncodedKey(32)}"\n\n# Single or multiple origins (CSV or JSON array)\nCORS_ALLOWED_ORIGINS=[]\n\n# If you need cookies/Authorization across origins, keep this true\nCORS_ALLOW_CREDENTIALS="true"\n\n# Optional tuning\nCORS_ALLOWED_METHODS="GET,POST,PUT,PATCH,DELETE,OPTIONS"\nCORS_ALLOWED_HEADERS="Content-Type,Authorization,X-Requested-With"\nCORS_EXPOSE_HEADERS=""\nCORS_MAX_AGE="86400"`;if(s.prisma){const s=`${'# Environment variables declared in this file are automatically made available to Prisma.\n# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema\n\n# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.\n# See the documentation for all the connection string options: https://pris.ly/d/connection-strings\n\nDATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"'}\n\n${r}`;await createOrUpdateEnvFile(e,s)}else await createOrUpdateEnvFile(e,r)}async function getAnswer(e={}){if(e.starterKit){const s=e.starterKit;let t=null;if(STARTER_KITS[s]&&(t=STARTER_KITS[s]),t){const c={projectName:e.projectName??"my-app",starterKit:s,starterKitSource:e.starterKitSource,backendOnly:t.features.backendOnly??!1,tailwindcss:t.features.tailwindcss??!1,websocket:t.features.websocket??!1,prisma:t.features.prisma??!1,docker:t.features.docker??!1,swaggerDocs:t.features.swaggerDocs??!1,mcp:t.features.mcp??!1},n=process.argv.slice(2);return n.includes("--backend-only")&&(c.backendOnly=!0),n.includes("--swagger-docs")&&(c.swaggerDocs=!0),n.includes("--tailwindcss")&&(c.tailwindcss=!0),n.includes("--websocket")&&(c.websocket=!0),n.includes("--mcp")&&(c.mcp=!0),n.includes("--prisma")&&(c.prisma=!0),n.includes("--docker")&&(c.docker=!0),c}if(e.starterKitSource){const t={projectName:e.projectName??"my-app",starterKit:s,starterKitSource:e.starterKitSource,backendOnly:!1,tailwindcss:!0,websocket:!1,prisma:!0,docker:!1,swaggerDocs:!0,mcp:!1},c=process.argv.slice(2);return c.includes("--backend-only")&&(t.backendOnly=!0),c.includes("--swagger-docs")&&(t.swaggerDocs=!0),c.includes("--tailwindcss")&&(t.tailwindcss=!0),c.includes("--websocket")&&(t.websocket=!0),c.includes("--mcp")&&(t.mcp=!0),c.includes("--prisma")&&(t.prisma=!0),c.includes("--docker")&&(t.docker=!0),t}}const s=[];e.projectName||s.push({type:"text",name:"projectName",message:"What is your project named?",initial:"my-app"}),e.backendOnly||updateAnswer?.isUpdate||s.push({type:"toggle",name:"backendOnly",message:`Would you like to create a ${chalk.blue("backend-only project")}?`,initial:!1,active:"Yes",inactive:"No"});const t=()=>{process.exit(0)},c=await prompts(s,{onCancel:t}),n=[];c.backendOnly??e.backendOnly??!1?(e.swaggerDocs||n.push({type:"toggle",name:"swaggerDocs",message:`Would you like to use ${chalk.blue("Swagger Docs")}?`,initial:!1,active:"Yes",inactive:"No"}),e.websocket||n.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!1,active:"Yes",inactive:"No"}),e.mcp||n.push({type:"toggle",name:"mcp",message:`Would you like to use ${chalk.blue("MCP (Model Context Protocol)")}?`,initial:!1,active:"Yes",inactive:"No"}),e.prisma||n.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,initial:!1,active:"Yes",inactive:"No"}),e.docker||n.push({type:"toggle",name:"docker",message:`Would you like to use ${chalk.blue("Docker")}?`,initial:!1,active:"Yes",inactive:"No"})):(e.swaggerDocs||n.push({type:"toggle",name:"swaggerDocs",message:`Would you like to use ${chalk.blue("Swagger Docs")}?`,initial:!1,active:"Yes",inactive:"No"}),e.tailwindcss||n.push({type:"toggle",name:"tailwindcss",message:`Would you like to use ${chalk.blue("Tailwind CSS")}?`,initial:!1,active:"Yes",inactive:"No"}),e.websocket||n.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!1,active:"Yes",inactive:"No"}),e.mcp||n.push({type:"toggle",name:"mcp",message:`Would you like to use ${chalk.blue("MCP (Model Context Protocol)")}?`,initial:!1,active:"Yes",inactive:"No"}),e.prisma||n.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,initial:!1,active:"Yes",inactive:"No"}),e.docker||n.push({type:"toggle",name:"docker",message:`Would you like to use ${chalk.blue("Docker")}?`,initial:!1,active:"Yes",inactive:"No"}));const i=await prompts(n,{onCancel:t});return{projectName:c.projectName?String(c.projectName).trim().replace(/ /g,"-"):e.projectName??"my-app",backendOnly:c.backendOnly??e.backendOnly??!1,swaggerDocs:i.swaggerDocs??e.swaggerDocs??!1,tailwindcss:i.tailwindcss??e.tailwindcss??!1,websocket:i.websocket??e.websocket??!1,mcp:i.mcp??e.mcp??!1,prisma:i.prisma??e.prisma??!1,docker:i.docker??e.docker??!1}}async function uninstallNpmDependencies(e,s,t=!1){s.forEach((e=>{}));const c=`npm uninstall ${t?"--save-dev":"--save"} ${s.join(" ")}`;execSync(c,{stdio:"inherit",cwd:e})}async function uninstallComposerDependencies(e,s){s.forEach((e=>{}));const t=`C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar remove ${s.join(" ")}`;execSync(t,{stdio:"inherit",cwd:e})}function fetchPackageVersion(e){return new Promise(((s,t)=>{https.get(`https://registry.npmjs.org/${e}`,(e=>{let c="";e.on("data",(e=>c+=e)),e.on("end",(()=>{try{const e=JSON.parse(c);s(e["dist-tags"].latest)}catch(e){t(new Error("Failed to parse JSON response"))}}))})).on("error",(e=>t(e)))}))}const readJsonFile=e=>{const s=fs.readFileSync(e,"utf8");return JSON.parse(s)};function compareVersions(e,s){const t=e.split(".").map(Number),c=s.split(".").map(Number);for(let e=0;e<t.length;e++){if(t[e]>c[e])return 1;if(t[e]<c[e])return-1}return 0}function getInstalledPackageVersion(e){try{const s=execSync(`npm list -g ${e} --depth=0`).toString().match(new RegExp(`${e}@(\\d+\\.\\d+\\.\\d+)`));return s?s[1]:null}catch(e){return null}}
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
    return { cmd: "composer", baseArgs: [] };
  } catch {
    return {
      cmd: "C:\\xampp\\php\\php.exe",
      baseArgs: ["C:\\ProgramData\\ComposerSetup\\bin\\composer.phar"],
    };
  }
}
export async function installComposerDependencies(baseDir, dependencies) {
  const { cmd, baseArgs } = getComposerCmd();
  const composerJsonPath = path.join(baseDir, "composer.json");
  const existsAlready = fs.existsSync(composerJsonPath);
  console.log(
    chalk.green(
      `Composer project initialization: ${
        existsAlready ? "Updating existing project…" : "Setting up new project…"
      }`
    )
  );
  /* ------------------------------------------------------------------ */
  /* 1. Try composer init (quietly fall back if it fails)               */
  /* ------------------------------------------------------------------ */
  if (!existsAlready) {
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
    const res = spawnSync(cmd, initArgs, { cwd: baseDir });
    if (res.status !== 0) {
      // Silent fallback: no logs, just write a minimal composer.json
      fs.writeFileSync(
        composerJsonPath,
        JSON.stringify(
          {
            name: "tsnc/prisma-php-app",
            type: "project",
            version: "1.0.0",
            require: { php: "^8.2" },
            autoload: { "psr-4": { "": "src/" } },
          },
          null,
          2
        )
      );
    }
  }
  /* 2. Ensure PSR-4 autoload entry ---------------------------------- */
  const json = JSON.parse(fs.readFileSync(composerJsonPath, "utf8"));
  json.autoload ??= {};
  json.autoload["psr-4"] ??= {};
  json.autoload["psr-4"][""] ??= "src/";
  fs.writeFileSync(composerJsonPath, JSON.stringify(json, null, 2));
  /* 3. Install dependencies ----------------------------------------- */
  if (dependencies.length) {
    console.log("Installing Composer dependencies:");
    dependencies.forEach((d) => console.log(`- ${chalk.blue(d)}`));
    execSync(
      `${cmd} ${[
        ...baseArgs,
        "require",
        "--no-interaction",
        ...dependencies,
      ].join(" ")}`,
      { stdio: "inherit", cwd: baseDir }
    );
  }
  /* 4. Refresh lock when updating ----------------------------------- */
  if (existsAlready) {
    execSync(
      `${cmd} ${[
        ...baseArgs,
        "update",
        "--lock",
        "--no-install",
        "--no-interaction",
      ].join(" ")}`,
      { stdio: "inherit", cwd: baseDir }
    );
  }
  /* 5. Regenerate autoloader ---------------------------------------- */
  execSync(`${cmd} ${[...baseArgs, "dump-autoload", "--quiet"].join(" ")}`, {
    stdio: "inherit",
    cwd: baseDir,
  });
}
const npmPinnedVersions = {
  "@tailwindcss/postcss": "^4.1.11",
  "@types/browser-sync": "^2.29.0",
  "@types/node": "^24.2.1",
  "@types/prompts": "^2.4.9",
  "browser-sync": "^3.0.4",
  chalk: "^5.5.0",
  cssnano: "^7.1.0",
  "http-proxy-middleware": "^3.0.5",
  "npm-run-all": "^4.1.5",
  "php-parser": "^3.2.5",
  postcss: "^8.5.6",
  "postcss-cli": "^11.0.1",
  prompts: "^2.4.2",
  tailwindcss: "^4.1.11",
  tsx: "^4.20.3",
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
async function setupStarterKit(baseDir, answer) {
  if (!answer.starterKit) return;
  let starterKit = null;
  // Check if it's a built-in starter kit
  if (STARTER_KITS[answer.starterKit]) {
    starterKit = STARTER_KITS[answer.starterKit];
  }
  // Handle custom starter kit URL
  else if (answer.starterKitSource) {
    starterKit = {
      id: answer.starterKit,
      name: `Custom Starter Kit (${answer.starterKit})`,
      description: "Custom starter kit from external source",
      features: {}, // Will be determined from the downloaded kit
      requiredFiles: [],
      source: {
        type: "git", // Assume git for now, could be enhanced
        url: answer.starterKitSource,
      },
    };
  }
  if (!starterKit) {
    console.warn(
      chalk.yellow(`Starter kit '${answer.starterKit}' not found. Skipping...`)
    );
    return;
  }
  console.log(chalk.green(`Setting up ${starterKit.name}...`));
  // If it's a custom starter kit with source, clone it directly to the target directory
  if (starterKit.source) {
    try {
      // Clone directly to the target directory
      const cloneCommand = starterKit.source.branch
        ? `git clone -b ${starterKit.source.branch} --depth 1 ${starterKit.source.url} ${baseDir}`
        : `git clone --depth 1 ${starterKit.source.url} ${baseDir}`;
      execSync(cloneCommand, { stdio: "inherit" });
      // Remove .git directory
      const gitDir = path.join(baseDir, ".git");
      if (fs.existsSync(gitDir)) {
        fs.rmSync(gitDir, { recursive: true, force: true });
      }
      console.log(chalk.blue("Starter kit cloned successfully!"));
      // Update the project name in the existing prisma-php.json
      const configPath = path.join(baseDir, "prisma-php.json");
      if (fs.existsSync(configPath)) {
        try {
          const existingConfig = JSON.parse(
            fs.readFileSync(configPath, "utf8")
          );
          // Only update project-specific fields, preserve everything else
          const projectPathModified = baseDir.replace(/\\/g, "\\");
          const bsConfig = bsConfigUrls(projectPathModified);
          existingConfig.projectName = answer.projectName;
          existingConfig.projectRootPath = projectPathModified;
          existingConfig.bsTarget = bsConfig.bsTarget;
          existingConfig.bsPathRewrite = bsConfig.bsPathRewrite;
          // Update version to latest
          const latestVersion = await fetchPackageVersion(
            "create-prisma-php-app"
          );
          existingConfig.version = latestVersion;
          fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
          console.log(
            chalk.green("Updated prisma-php.json with new project details")
          );
        } catch (error) {
          console.warn(
            chalk.yellow(
              "Failed to update prisma-php.json, will create new one"
            )
          );
        }
      }
    } catch (error) {
      console.error(chalk.red(`Failed to setup starter kit: ${error}`));
      throw error;
    }
  }
  // Run custom setup if defined
  if (starterKit.customSetup) {
    await starterKit.customSetup(baseDir, answer);
  }
  console.log(chalk.green(`✓ ${starterKit.name} setup complete!`));
}
function showStarterKits() {
  console.log(chalk.blue("\n🚀 Available Starter Kits:\n"));
  Object.values(STARTER_KITS).forEach((kit) => {
    const isCustom = kit.source ? " (Custom)" : " (Built-in)";
    console.log(chalk.green(`  ${kit.id}${chalk.gray(isCustom)}`));
    console.log(`    ${kit.name}`);
    console.log(chalk.gray(`    ${kit.description}`));
    if (kit.source) {
      console.log(chalk.cyan(`    Source: ${kit.source.url}`));
    }
    const features = Object.entries(kit.features)
      .filter(([, value]) => value === true)
      .map(([key]) => key)
      .join(", ");
    if (features) {
      console.log(chalk.magenta(`    Features: ${features}`));
    }
    console.log();
  });
  console.log(chalk.yellow("Usage:"));
  console.log(`  npx create-prisma-php-app my-project --starter-kit=basic`);
  console.log(
    `  npx create-prisma-php-app my-project --starter-kit=custom --starter-kit-source=https://github.com/user/repo`
  );
  console.log();
}
async function main() {
  try {
    const args = process.argv.slice(2);
    let projectName = args[0];
    // Parse starter kit arguments
    const starterKitArg = args.find((arg) => arg.startsWith("--starter-kit="));
    const starterKitFromArgs = starterKitArg?.split("=")[1];
    // Parse custom starter kit source
    const starterKitSourceArg = args.find((arg) =>
      arg.startsWith("--starter-kit-source=")
    );
    const starterKitSource = starterKitSourceArg?.split("=")[1];
    // Show help
    if (args.includes("--list-starter-kits")) {
      showStarterKits();
      return;
    }
    let answer = null;
    let isStarterKitProject = false;
    if (projectName) {
      const currentDir = process.cwd();
      const configPath = path.join(currentDir, "prisma-php.json");
      // Check if it's a starter kit project
      if (starterKitFromArgs && starterKitSource) {
        isStarterKitProject = true;
        const predefinedAnswers = {
          projectName,
          starterKit: starterKitFromArgs,
          starterKitSource: starterKitSource,
          backendOnly: args.includes("--backend-only"),
          swaggerDocs: args.includes("--swagger-docs"),
          tailwindcss: args.includes("--tailwindcss"),
          websocket: args.includes("--websocket"),
          mcp: args.includes("--mcp"),
          prisma: args.includes("--prisma"),
          docker: args.includes("--docker"),
        };
        answer = await getAnswer(predefinedAnswers);
      } else if (fs.existsSync(configPath)) {
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
        // New project
        const predefinedAnswers = {
          projectName,
          starterKit: starterKitFromArgs,
          starterKitSource: starterKitSource,
          backendOnly: args.includes("--backend-only"),
          swaggerDocs: args.includes("--swagger-docs"),
          tailwindcss: args.includes("--tailwindcss"),
          websocket: args.includes("--websocket"),
          mcp: args.includes("--mcp"),
          prisma: args.includes("--prisma"),
          docker: args.includes("--docker"),
        };
        answer = await getAnswer(predefinedAnswers);
      }
      if (answer === null) {
        console.log(chalk.red("Installation cancelled."));
        return;
      }
    } else {
      // Interactive mode
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
    const currentDir = process.cwd();
    let projectPath;
    if (projectName) {
      if (isStarterKitProject) {
        // For starter kit projects, create directory first
        const projectNamePath = path.join(currentDir, projectName);
        if (!fs.existsSync(projectNamePath)) {
          fs.mkdirSync(projectNamePath, { recursive: true });
        }
        projectPath = projectNamePath;
        // Clone the starter kit first
        await setupStarterKit(projectPath, answer);
        // Change to project directory
        process.chdir(projectPath);
        // Now check if it has prisma-php.json and treat as update
        const configPath = path.join(projectPath, "prisma-php.json");
        if (fs.existsSync(configPath)) {
          // Read the existing config and merge with CLI overrides
          const existingConfig = JSON.parse(
            fs.readFileSync(configPath, "utf8")
          );
          // Override with CLI arguments if provided
          if (args.includes("--backend-only"))
            existingConfig.backendOnly = true;
          if (args.includes("--swagger-docs"))
            existingConfig.swaggerDocs = true;
          if (args.includes("--tailwindcss")) existingConfig.tailwindcss = true;
          if (args.includes("--websocket")) existingConfig.websocket = true;
          if (args.includes("--mcp")) existingConfig.mcp = true;
          if (args.includes("--prisma")) existingConfig.prisma = true;
          if (args.includes("--docker")) existingConfig.docker = true;
          // Update answer with existing config
          answer = {
            ...answer,
            backendOnly: existingConfig.backendOnly,
            swaggerDocs: existingConfig.swaggerDocs,
            tailwindcss: existingConfig.tailwindcss,
            websocket: existingConfig.websocket,
            mcp: existingConfig.mcp,
            prisma: existingConfig.prisma,
            docker: existingConfig.docker,
          };
          // Set up as an update
          let excludeFiles = [];
          existingConfig.excludeFiles?.map((file) => {
            const filePath = path.join(projectPath, file);
            if (fs.existsSync(filePath))
              excludeFiles.push(filePath.replace(/\\/g, "/"));
          });
          updateAnswer = {
            ...answer,
            isUpdate: true,
            excludeFiles: existingConfig.excludeFiles ?? [],
            excludeFilePath: excludeFiles ?? [],
            filePath: projectPath,
          };
        }
      } else {
        // Regular project handling (existing logic)
        const configPath = path.join(currentDir, "prisma-php.json");
        const projectNamePath = path.join(currentDir, projectName);
        const projectNameConfigPath = path.join(
          projectNamePath,
          "prisma-php.json"
        );
        if (fs.existsSync(configPath)) {
          projectPath = currentDir;
        } else if (
          fs.existsSync(projectNamePath) &&
          fs.existsSync(projectNameConfigPath)
        ) {
          projectPath = projectNamePath;
          process.chdir(projectNamePath);
        } else {
          if (!fs.existsSync(projectNamePath)) {
            fs.mkdirSync(projectNamePath, { recursive: true });
          }
          projectPath = projectNamePath;
          process.chdir(projectNamePath);
        }
      }
    } else {
      // Interactive mode
      fs.mkdirSync(answer.projectName, { recursive: true });
      projectPath = path.join(currentDir, answer.projectName);
      process.chdir(answer.projectName);
    }
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
      composerPkg("tsnc/prisma-php"),
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
    // Only setup starter kit if it's not already done
    if (answer.starterKit && !isStarterKitProject) {
      await setupStarterKit(projectPath, answer);
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
    // Skip creating prismaPhpConfig if it's a starter kit project that already has one
    if (
      !isStarterKitProject ||
      !fs.existsSync(path.join(projectPath, "prisma-php.json"))
    ) {
      // Create prisma-php.json with all the existing logic
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
    }
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
        projectPath.replace(/\\/g, "/")
      )}!`
    );
    console.log("\n=========================");
  } catch (error) {
    console.error("Error while creating the project:", error);
    process.exit(1);
  }
}
main();
