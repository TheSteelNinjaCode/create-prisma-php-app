#!/usr/bin/env node
import{execSync}from"child_process";import fs from"fs";import{fileURLToPath}from"url";import path from"path";import chalk from"chalk";import prompts from"prompts";import https from"https";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);let updateAnswer=null;const nonBackendFiles=["favicon.ico","\\src\\app\\index.php","metadata.php","not-found.php"],dockerFiles=[".dockerignore","docker-compose.yml","Dockerfile","apache.conf"];function bsConfigUrls(e){const s=e.indexOf("\\htdocs\\");if(-1===s)return{bsTarget:"",bsPathRewrite:{}};const t=e.substring(0,s+"\\htdocs\\".length).replace(/\\/g,"\\\\"),n=e.replace(new RegExp(`^${t}`),"").replace(/\\/g,"/");let i=`http://localhost/${n}`;i=i.endsWith("/")?i.slice(0,-1):i;const c=i.replace(/(?<!:)(\/\/+)/g,"/"),o=n.replace(/\/\/+/g,"/");return{bsTarget:`${c}/`,bsPathRewrite:{"^/":`/${o.startsWith("/")?o.substring(1):o}/`}}}async function updatePackageJson(e,s){const t=path.join(e,"package.json");if(checkExcludeFiles(t))return;const n=JSON.parse(fs.readFileSync(t,"utf8"));n.scripts=Object.assign(Object.assign({},n.scripts),{projectName:"node settings/project-name.js"});let i=[];s.tailwindcss&&(n.scripts=Object.assign(Object.assign({},n.scripts),{tailwind:"postcss src/app/css/tailwind.css -o src/app/css/styles.css --watch"}),i.push("tailwind")),s.websocket&&(n.scripts=Object.assign(Object.assign({},n.scripts),{websocket:"node settings/restart-websocket.js"}),i.push("websocket")),s.docker&&(n.scripts=Object.assign(Object.assign({},n.scripts),{docker:"docker-compose up"}),i.push("docker")),s.swaggerDocs&&(n.scripts=Object.assign(Object.assign({},n.scripts),{"create-swagger-docs":"node settings/swagger-config.js"}),i.push("create-swagger-docs"));let c=Object.assign({},n.scripts);c.browserSync="node settings/bs-config.js",c.dev=`npm-run-all -p projectName browserSync ${i.join(" ")}`,n.scripts=c,n.type="module",s.prisma&&(n.prisma={seed:"node prisma/seed.js"}),fs.writeFileSync(t,JSON.stringify(n,null,2))}async function updateComposerJson(e,s){const t=path.join(e,"composer.json");if(checkExcludeFiles(t))return;let n;if(fs.existsSync(t)){{const e=fs.readFileSync(t,"utf8");n=JSON.parse(e)}s.websocket&&(n.require=Object.assign(Object.assign({},n.require),{"cboden/ratchet":"^0.4.4"})),s.prisma&&(n.require=Object.assign(Object.assign({},n.require),{"ramsey/uuid":"5.x-dev","hidehalo/nanoid-php":"1.x-dev"})),fs.writeFileSync(t,JSON.stringify(n,null,2))}}async function updateIndexJsForWebSocket(e,s){if(!s.websocket)return;const t=path.join(e,"src","app","js","index.js");if(checkExcludeFiles(t))return;let n=fs.readFileSync(t,"utf8");n+='\n// WebSocket initialization\nconst ws = new WebSocket("ws://localhost:8080");\n',fs.writeFileSync(t,n,"utf8")}async function createUpdateGitignoreFile(e,s){const t=path.join(e,".gitignore");if(checkExcludeFiles(t))return;let n="";s.forEach((e=>{n.includes(e)||(n+=`\n${e}`)})),n=n.trimStart(),fs.writeFileSync(t,n)}function copyRecursiveSync(e,s,t){var n;const i=fs.existsSync(e),c=i&&fs.statSync(e);if(i&&c&&c.isDirectory()){const i=s.toLowerCase();if(!t.websocket&&i.includes("src\\lib\\websocket"))return;if(!t.prisma&&i.includes("src\\lib\\prisma"))return;if(t.backendOnly&&i.includes("src\\app\\js")||t.backendOnly&&i.includes("src\\app\\css"))return;if(!t.swaggerDocs&&i.includes("src\\app\\swagger-docs"))return;const c=s.replace(/\\/g,"/");if(null===(n=null==updateAnswer?void 0:updateAnswer.excludeFilePath)||void 0===n?void 0:n.includes(c))return;fs.existsSync(s)||fs.mkdirSync(s,{recursive:!0}),fs.readdirSync(e).forEach((n=>{copyRecursiveSync(path.join(e,n),path.join(s,n),t)}))}else{if(checkExcludeFiles(s))return;if(!t.tailwindcss&&(s.includes("tailwind.css")||s.includes("styles.css")))return;if(!t.websocket&&(s.includes("restart-websocket.cjs")||s.includes("restart-websocket.bat")))return;if(!t.docker&&dockerFiles.some((e=>s.includes(e))))return;if(t.backendOnly&&nonBackendFiles.some((e=>s.includes(e))))return;if(!t.backendOnly&&s.includes("route.php"))return;if(!t.swaggerDocs&&s.includes("swagger-config.js"))return;fs.copyFileSync(e,s,0)}}async function executeCopy(e,s,t){s.forEach((({src:s,dest:n})=>{copyRecursiveSync(path.join(__dirname,s),path.join(e,n),t)}))}function createOrUpdateTailwindConfig(e){const s=path.join(e,"tailwind.config.js");if(checkExcludeFiles(s))return;let t=fs.readFileSync(s,"utf8");const n=["./src/**/*.{html,js,php}"].map((e=>`    "${e}"`)).join(",\n");t=t.replace(/content: \[\],/g,`content: [\n${n}\n],`),fs.writeFileSync(s,t,{flag:"w"})}function modifyPostcssConfig(e){const s=path.join(e,"postcss.config.js");if(checkExcludeFiles(s))return;fs.writeFileSync(s,"export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n    cssnano: {},\n  },\n};",{flag:"w"})}function modifyLayoutPHP(e,s){const t=path.join(e,"src","app","layout.php");if(!checkExcludeFiles(t))try{let e=fs.readFileSync(t,"utf8"),n="";s.backendOnly||(n='\n    <link href="<?= $baseUrl; ?>/css/index.css" rel="stylesheet">\n    <script src="<?= $baseUrl; ?>/js/index.js"><\/script>');let i="";s.backendOnly||(i=s.tailwindcss?`    <link href="<?= $baseUrl; ?>/css/styles.css" rel="stylesheet"> ${n}`:`    <script src="https://cdn.tailwindcss.com"><\/script> ${n}`);const c=i.length>0?"\n":"";e=e.replace("</head>",`${i}${c}    \x3c!-- Dynamic Head --\x3e\n    <?= implode("\\n", $mainLayoutHead); ?>\n</head>`),fs.writeFileSync(t,e,{flag:"w"})}catch(e){}}async function createOrUpdateEnvFile(e,s){const t=path.join(e,".env");checkExcludeFiles(t)||fs.writeFileSync(t,s,{flag:"w"})}function checkExcludeFiles(e){var s,t;return!!(null==updateAnswer?void 0:updateAnswer.isUpdate)&&(null!==(t=null===(s=null==updateAnswer?void 0:updateAnswer.excludeFilePath)||void 0===s?void 0:s.includes(e.replace(/\\/g,"/")))&&void 0!==t&&t)}async function createDirectoryStructure(e,s){const t=[{src:"/bootstrap.php",dest:"/bootstrap.php"},{src:"/.htaccess",dest:"/.htaccess"},{src:"/../composer.json",dest:"/composer.json"},{src:"/tsconfig.json",dest:"/tsconfig.json"}];s.tailwindcss&&t.push({src:"/postcss.config.js",dest:"/postcss.config.js"},{src:"/tailwind.config.js",dest:"/tailwind.config.js"});const n=[{src:"/settings",dest:"/settings"},{src:"/src",dest:"/src"}];s.backendOnly&&s.swaggerDocs&&n.push({src:"/swagger-docs-layout.php",dest:"/src/app/layout.php"}),s.prisma&&n.push({src:"/prisma",dest:"/prisma"}),s.docker&&n.push({src:"/.dockerignore",dest:"/.dockerignore"},{src:"/docker-compose.yml",dest:"/docker-compose.yml"},{src:"/Dockerfile",dest:"/Dockerfile"},{src:"/apache.conf",dest:"/apache.conf"}),t.forEach((({src:s,dest:t})=>{const n=path.join(__dirname,s),i=path.join(e,t);if(checkExcludeFiles(i))return;const c=fs.readFileSync(n,"utf8");fs.writeFileSync(i,c,{flag:"w"})})),await executeCopy(e,n,s),await updatePackageJson(e,s),await updateComposerJson(e,s),s.backendOnly||await updateIndexJsForWebSocket(e,s),s.tailwindcss&&(createOrUpdateTailwindConfig(e),modifyPostcssConfig(e)),(s.tailwindcss||!s.backendOnly||s.swaggerDocs)&&modifyLayoutPHP(e,s);const i='# Prisma PHP Auth Secret Key For development only - Change this in production\nAUTH_SECRET=uxsjXVPHN038DEYls2Kw0QUgBcXKUyrjv416nIFWPY4=  \n  \n# PHPMailer\n# SMTP_HOST=smtp.gmail.com or your SMTP host\n# SMTP_USERNAME=john.doe@gmail.com or your SMTP username\n# SMTP_PASSWORD=123456\n# SMTP_PORT=587 for TLS, 465 for SSL or your SMTP port\n# SMTP_ENCRYPTION=ssl or tls\n# MAIL_FROM=john.doe@gmail.com\n# MAIL_FROM_NAME="John Doe"\n\n# SHOW ERRORS - Set to true to show errors in the browser for development only - Change this in production to false\nSHOW_ERRORS=true\n\n# APP TIMEZONE - Set your application timezone - Default is "UTC"\nAPP_TIMEZONE="UTC"\n\n# APP ENV - Set your application environment - Default is "development" - Change this in production to "production"\nAPP_ENV=development';if(s.prisma){const s=`${'# Environment variables declared in this file are automatically made available to Prisma.\n# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema\n\n# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.\n# See the documentation for all the connection string options: https://pris.ly/d/connection-strings\n\nDATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"'}\n\n${i}`;await createOrUpdateEnvFile(e,s)}else await createOrUpdateEnvFile(e,i);await createUpdateGitignoreFile(e,["vendor",".env","node_modules"])}async function getAnswer(e={}){var s,t,n,i,c,o,a,r,l,p,d,u,g;const m=[];e.projectName||m.push({type:"text",name:"projectName",message:"What is your project named?",initial:"my-app"}),e.backendOnly||m.push({type:"toggle",name:"backendOnly",message:"Would you like to create a backend-only project?",initial:!1,active:"Yes",inactive:"No"});const f=()=>{process.exit(0)},h=await prompts(m,{onCancel:f}),y=[];h.backendOnly||e.backendOnly?(e.swaggerDocs||y.push({type:"toggle",name:"swaggerDocs",message:`Would you like to use ${chalk.blue("Swagger Docs")}?`,initial:!1,active:"Yes",inactive:"No"}),e.websocket||y.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!0,active:"Yes",inactive:"No"}),e.prisma||y.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,initial:!0,active:"Yes",inactive:"No"}),e.docker||y.push({type:"toggle",name:"docker",message:`Would you like to use ${chalk.blue("Docker")}?`,initial:!1,active:"Yes",inactive:"No"})):(e.swaggerDocs||y.push({type:"toggle",name:"swaggerDocs",message:`Would you like to use ${chalk.blue("Swagger Docs")}?`,initial:!1,active:"Yes",inactive:"No"}),e.tailwindcss||y.push({type:"toggle",name:"tailwindcss",message:`Would you like to use ${chalk.blue("Tailwind CSS")}?`,initial:!0,active:"Yes",inactive:"No"}),e.websocket||y.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!0,active:"Yes",inactive:"No"}),e.prisma||y.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,initial:!0,active:"Yes",inactive:"No"}),e.docker||y.push({type:"toggle",name:"docker",message:`Would you like to use ${chalk.blue("Docker")}?`,initial:!1,active:"Yes",inactive:"No"}));const w=await prompts(y,{onCancel:f});return{projectName:h.projectName?String(h.projectName).trim().replace(/ /g,"-"):null!==(s=e.projectName)&&void 0!==s?s:"my-app",backendOnly:null!==(n=null!==(t=h.backendOnly)&&void 0!==t?t:e.backendOnly)&&void 0!==n&&n,swaggerDocs:null!==(c=null!==(i=w.swaggerDocs)&&void 0!==i?i:e.swaggerDocs)&&void 0!==c&&c,tailwindcss:null!==(a=null!==(o=w.tailwindcss)&&void 0!==o?o:e.tailwindcss)&&void 0!==a&&a,websocket:null!==(l=null!==(r=w.websocket)&&void 0!==r?r:e.websocket)&&void 0!==l&&l,prisma:null!==(d=null!==(p=w.prisma)&&void 0!==p?p:e.prisma)&&void 0!==d&&d,docker:null!==(g=null!==(u=w.docker)&&void 0!==u?u:e.docker)&&void 0!==g&&g}}async function installDependencies(e,s,t=!1){fs.existsSync(path.join(e,"package.json"))||execSync("npm init -y",{stdio:"inherit",cwd:e}),s.forEach((e=>{}));const n=`npm install ${t?"--save-dev":""} ${s.join(" ")}`;execSync(n,{stdio:"inherit",cwd:e})}async function uninstallDependencies(e,s,t=!1){s.forEach((e=>{}));const n=`npm uninstall ${t?"--save-dev":"--save"} ${s.join(" ")}`;execSync(n,{stdio:"inherit",cwd:e})}function fetchPackageVersion(e){return new Promise(((s,t)=>{https.get(`https://registry.npmjs.org/${e}`,(e=>{let n="";e.on("data",(e=>n+=e)),e.on("end",(()=>{try{const e=JSON.parse(n);s(e["dist-tags"].latest)}catch(e){t(new Error("Failed to parse JSON response"))}}))})).on("error",(e=>t(e)))}))}const readJsonFile=e=>{const s=fs.readFileSync(e,"utf8");return JSON.parse(s)};function compareVersions(e,s){const t=e.split(".").map(Number),n=s.split(".").map(Number);for(let e=0;e<t.length;e++){if(t[e]>n[e])return 1;if(t[e]<n[e])return-1}return 0}function getInstalledPackageVersion(e){try{const s=execSync(`npm list -g ${e} --depth=0`).toString().match(new RegExp(`${e}@(\\d+\\.\\d+\\.\\d+)`));return s?s[1]:null}catch(e){return null}}
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
      "http-proxy-middleware",
      "chalk",
      "npm-run-all",
      "browser-sync",
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
    if (answer.swaggerDocs) {
      const swaggerDocsPath = path.join(
        projectPath,
        "src",
        "app",
        "swagger-docs"
      );
      // Check if the directory exists, if not, create it
      if (!fs.existsSync(swaggerDocsPath)) {
        fs.mkdirSync(swaggerDocsPath, { recursive: true }); // 'recursive: true' creates parent directories if they don't exist
      }
      // Clone the Git repository into the swagger-docs directory
      execSync(
        `git clone https://github.com/TheSteelNinjaCode/prisma-php-swagger-docs.git ${swaggerDocsPath}`,
        { stdio: "inherit" }
      );
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
        const swaggerFiles = ["swagger-setup.js"];
        swaggerFiles.forEach((file) => {
          const filePath = path.join(projectPath, "settings", file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Delete each file if it exists
            console.log(`${file} was deleted successfully.`);
          } else {
            console.log(`${file} does not exist.`);
          }
        });
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
        const websocketFiles = [
          "restart-websocket.js",
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
      ngrok: false,
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
