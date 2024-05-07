#!/usr/bin/env node
import{execSync}from"child_process";import fs from"fs";import{fileURLToPath}from"url";import path from"path";import chalk from"chalk";import prompts from"prompts";import https from"https";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);let updateAnswer=null;function bsConfigUrls(e){const s=e.indexOf("\\htdocs\\");if(-1===s)return{bsTarget:"",bsPathRewrite:{}};const t=e.substring(0,s+"\\htdocs\\".length).replace(/\\/g,"\\\\"),n=e.replace(new RegExp(`^${t}`),"").replace(/\\/g,"/");let i=`http://localhost/${n}`;i=i.endsWith("/")?i.slice(0,-1):i;const c=i.replace(/(?<!:)(\/\/+)/g,"/"),r=n.replace(/\/\/+/g,"/");return{bsTarget:`${c}/`,bsPathRewrite:{"^/":`/${r.startsWith("/")?r.substring(1):r}/`}}}function configureBrowserSyncCommand(e){const s=path.join(e,"settings","bs-config.cjs");return fs.writeFileSync(s,'const { createProxyMiddleware } = require("http-proxy-middleware");\nconst fs = require("fs");\n\nconst jsonData = fs.readFileSync("prisma-php.json", "utf8");\nconst config = JSON.parse(jsonData);\n\nmodule.exports = {\n  proxy: "http://localhost:3000",\n  middleware: [\n    (req, res, next) => {\n      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");\n      res.setHeader("Pragma", "no-cache");\n      res.setHeader("Expires", "0");\n      next();\n    },\n    createProxyMiddleware({\n      target: config.bsTarget,\n      changeOrigin: true,\n      pathRewrite: config.bsPathRewrite,\n    }),\n  ],\n  files: "src/**/*.*",\n  notify: false,\n  open: false,\n  ghostMode: false,\n};',"utf8"),"browser-sync start --config settings/bs-config.cjs"}async function updatePackageJson(e,s){const t=path.join(e,"package.json");if(checkExcludeFiles(t))return;const n=JSON.parse(fs.readFileSync(t,"utf8")),i=configureBrowserSyncCommand(e);n.scripts=Object.assign(Object.assign({},n.scripts),{projectName:"node settings/project-name.cjs"});let c=[];s.tailwindcss&&(n.scripts=Object.assign(Object.assign({},n.scripts),{tailwind:"postcss ./src/app/css/tailwind.css -o ./src/app/css/styles.css --watch"}),c.push("tailwind")),s.websocket&&(n.scripts=Object.assign(Object.assign({},n.scripts),{websocket:"node ./settings/restart-websocket.cjs"}),c.push("websocket"));const r=Object.assign({},n.scripts);r["browser-sync"]=i,r.dev=c.length>0?`npm-run-all --parallel projectName browser-sync ${c.join(" ")}`:"npm-run-all --parallel projectName browser-sync",n.scripts=r,n.type="module",s.prisma&&(n.prisma={seed:"node prisma/seed.js"}),fs.writeFileSync(t,JSON.stringify(n,null,2))}async function updateComposerJson(e,s){const t=path.join(e,"composer.json");if(checkExcludeFiles(t))return;let n;if(fs.existsSync(t)){{const e=fs.readFileSync(t,"utf8");n=JSON.parse(e)}s.websocket&&(n.require=Object.assign(Object.assign({},n.require),{"cboden/ratchet":"^0.4.4"})),s.prisma&&(n.require=Object.assign(Object.assign({},n.require),{"ramsey/uuid":"5.x-dev","hidehalo/nanoid-php":"1.x-dev"})),fs.writeFileSync(t,JSON.stringify(n,null,2))}}async function updateIndexJsForWebSocket(e,s){if(!s.websocket)return;const t=path.join(e,"src","app","js","index.js");if(checkExcludeFiles(t))return;let n=fs.readFileSync(t,"utf8");n+='\n// WebSocket initialization\nconst ws = new WebSocket("ws://localhost:8080");\n',fs.writeFileSync(t,n,"utf8")}async function createUpdateGitignoreFile(e,s){const t=path.join(e,".gitignore");if(checkExcludeFiles(t))return;let n="";s.forEach((e=>{n.includes(e)||(n+=`\n${e}`)})),n=n.trimStart(),fs.writeFileSync(t,n)}function copyRecursiveSync(e,s,t){var n;const i=fs.existsSync(e),c=i&&fs.statSync(e);if(i&&c&&c.isDirectory()){const i=s.toLowerCase();if(!t.websocket&&i.includes("src\\lib\\websocket"))return;if(!t.prisma&&i.includes("src\\lib\\prisma"))return;const c=s.replace(/\\/g,"/");if(null===(n=null==updateAnswer?void 0:updateAnswer.excludeFilePath)||void 0===n?void 0:n.includes(c))return;fs.existsSync(s)||fs.mkdirSync(s,{recursive:!0}),fs.readdirSync(e).forEach((n=>{copyRecursiveSync(path.join(e,n),path.join(s,n),t)}))}else{if(checkExcludeFiles(s))return;if(!t.tailwindcss&&(s.includes("tailwind.css")||s.includes("styles.css")))return;if(!t.websocket&&(s.includes("restart-websocket.cjs")||s.includes("restart-websocket.bat")))return;fs.copyFileSync(e,s,0)}}async function executeCopy(e,s,t){s.forEach((({srcDir:s,destDir:n})=>{copyRecursiveSync(path.join(__dirname,s),path.join(e,n),t)}))}function createOrUpdateTailwindConfig(e){const s=path.join(e,"tailwind.config.js");if(checkExcludeFiles(s))return;let t=fs.readFileSync(s,"utf8");const n=["./src/app/**/*.{html,js,php}"].map((e=>`    "${e}"`)).join(",\n");t=t.replace(/content: \[\],/g,`content: [\n${n}\n],`),fs.writeFileSync(s,t,{flag:"w"})}function modifyPostcssConfig(e){const s=path.join(e,"postcss.config.js");if(checkExcludeFiles(s))return;fs.writeFileSync(s,"export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n    cssnano: {},\n  },\n};",{flag:"w"})}function modifyLayoutPHP(e,s){const t=path.join(e,"src","app","layout.php");if(!checkExcludeFiles(t))try{let e=fs.readFileSync(t,"utf8");const n='\n    <link href="<?php echo $baseUrl; ?>css/index.css" rel="stylesheet">\n    <script src="<?php echo $baseUrl; ?>js/index.js"><\/script>\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">',i=s?`    <link href="<?php echo $baseUrl; ?>css/styles.css" rel="stylesheet"> ${n}`:`    <script src="https://cdn.tailwindcss.com"><\/script> ${n}`;e=e.replace("</head>",`${i}\n</head>`),fs.writeFileSync(t,e,{flag:"w"})}catch(e){}}async function createOrUpdateEnvFile(e,s){const t=path.join(e,".env");checkExcludeFiles(t)||fs.writeFileSync(t,s,{flag:"w"})}function checkExcludeFiles(e){var s,t;return!!(null==updateAnswer?void 0:updateAnswer.isUpdate)&&(null!==(t=null===(s=null==updateAnswer?void 0:updateAnswer.excludeFilePath)||void 0===s?void 0:s.includes(e.replace(/\\/g,"/")))&&void 0!==t&&t)}async function createDirectoryStructure(e,s){const t=[{src:"/bootstrap.php",dest:"/bootstrap.php"},{src:"/.htaccess",dest:"/.htaccess"},{src:"/../composer.json",dest:"/composer.json"}];(null==updateAnswer?void 0:updateAnswer.isUpdate)&&(t.push({src:"/tsconfig.json",dest:"/tsconfig.json"}),updateAnswer.tailwindcss&&t.push({src:"/postcss.config.js",dest:"/postcss.config.js"},{src:"/tailwind.config.js",dest:"/tailwind.config.js"}));const n=[{srcDir:"/settings",destDir:"/settings"},{srcDir:"/src",destDir:"/src"}];s.prisma&&n.push({srcDir:"/prisma",destDir:"/prisma"}),t.forEach((({src:s,dest:t})=>{const n=path.join(__dirname,s),i=path.join(e,t);if(checkExcludeFiles(i))return;const c=fs.readFileSync(n,"utf8");fs.writeFileSync(i,c,{flag:"w"})})),await executeCopy(e,n,s),await updatePackageJson(e,s),await updateComposerJson(e,s),await updateIndexJsForWebSocket(e,s),s.tailwindcss?(createOrUpdateTailwindConfig(e),modifyLayoutPHP(e,!0),modifyPostcssConfig(e)):modifyLayoutPHP(e,!1);const i='# Prisma PHP Auth Secret Key For development only - Change this in production\nAUTH_SECRET=uxsjXVPHN038DEYls2Kw0QUgBcXKUyrjv416nIFWPY4=  \n  \n# PHPMailer\n# SMTP_HOST=smtp.gmail.com or your SMTP host\n# SMTP_USERNAME=john.doe@gmail.com or your SMTP username\n# SMTP_PASSWORD=123456\n# SMTP_PORT=587 for TLS, 465 for SSL or your SMTP port\n# SMTP_ENCRYPTION=ssl or tls\n# MAIL_FROM=john.doe@gmail.com\n# MAIL_FROM_NAME="John Doe"';if(s.prisma){const s=`${'# Environment variables declared in this file are automatically made available to Prisma.\n# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema\n\n# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.\n# See the documentation for all the connection string options: https://pris.ly/d/connection-strings\n\nDATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"'}\n\n${i}`;await createOrUpdateEnvFile(e,s)}else await createOrUpdateEnvFile(e,i);await createUpdateGitignoreFile(e,["vendor",".env","node_modules"])}async function getAnswer(e={}){var s,t,n,i;const c=[];e.projectName||c.push({type:"text",name:"projectName",message:"What is your project named?",initial:"my-app"}),e.tailwindcss||c.push({type:"toggle",name:"tailwindcss",message:`Would you like to use ${chalk.blue("Tailwind CSS")}?`,initial:!0,active:"Yes",inactive:"No"}),e.websocket||c.push({type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!0,active:"Yes",inactive:"No"}),e.prisma||c.push({type:"toggle",name:"prisma",message:`Would you like to use ${chalk.blue("Prisma PHP ORM")}?`,initial:!0,active:"Yes",inactive:"No"});const r=c;if(0===r.length&&e.projectName)return e;const a=()=>{process.exit(0)};try{const c=await prompts(r,{onCancel:a});return 0===Object.keys(c).length?null:{projectName:c.projectName?String(c.projectName).trim().replace(/ /g,"-"):null!==(s=e.projectName)&&void 0!==s?s:"my-app",tailwindcss:null!==(t=c.tailwindcss)&&void 0!==t?t:e.tailwindcss,websocket:null!==(n=c.websocket)&&void 0!==n?n:e.websocket,prisma:null!==(i=c.prisma)&&void 0!==i?i:e.prisma}}catch(e){return null}}async function installDependencies(e,s,t=!1){fs.existsSync(path.join(e,"package.json"))||execSync("npm init -y",{stdio:"inherit",cwd:e}),s.forEach((e=>{}));const n=`npm install ${t?"--save-dev":""} ${s.join(" ")}`;execSync(n,{stdio:"inherit",cwd:e})}async function uninstallDependencies(e,s,t=!1){s.forEach((e=>{}));const n=`npm uninstall ${t?"--save-dev":"--save"} ${s.join(" ")}`;execSync(n,{stdio:"inherit",cwd:e})}function fetchPackageVersion(e){return new Promise(((s,t)=>{https.get(`https://registry.npmjs.org/${e}`,(e=>{let n="";e.on("data",(e=>n+=e)),e.on("end",(()=>{try{const e=JSON.parse(n);s(e["dist-tags"].latest)}catch(e){t(new Error("Failed to parse JSON response"))}}))})).on("error",(e=>t(e)))}))}const readJsonFile=e=>{const s=fs.readFileSync(e,"utf8");return JSON.parse(s)};async function main(){var e,s,t,n,i,c;try{const r=process.argv.slice(2);let a=r[0],o=null;if(a){const c={projectName:a,tailwindcss:r.includes("--tailwindcss"),websocket:r.includes("--websocket"),prisma:r.includes("--prisma")};if(o=await getAnswer(c),null===o)return;const l=process.cwd(),p=path.join(l,"prisma-php.json"),d=readJsonFile(p);let u=[];null===(e=d.excludeFiles)||void 0===e||e.map((e=>{const s=path.join(l,e);fs.existsSync(s)&&u.push(s.replace(/\\/g,"/"))})),updateAnswer={projectName:a,tailwindcss:null!==(s=null==o?void 0:o.tailwindcss)&&void 0!==s&&s,websocket:null!==(t=null==o?void 0:o.websocket)&&void 0!==t&&t,prisma:null!==(n=null==o?void 0:o.prisma)&&void 0!==n&&n,isUpdate:!0,excludeFiles:null!==(i=d.excludeFiles)&&void 0!==i?i:[],excludeFilePath:null!=u?u:[],filePath:l}}else o=await getAnswer();if(null===o)return;execSync("npm uninstall -g create-prisma-php-app",{stdio:"inherit"}),execSync("npm install -g create-prisma-php-app",{stdio:"inherit"}),execSync("npm uninstall -g  browser-sync",{stdio:"inherit"}),execSync("npm install -g browser-sync",{stdio:"inherit"}),a||fs.mkdirSync(o.projectName);const l=process.cwd();let p=a?l:path.join(l,o.projectName);a||process.chdir(o.projectName);const d=["typescript","@types/node","ts-node","http-proxy-middleware@^3.0.0","npm-run-all"];o.tailwindcss&&d.push("tailwindcss","autoprefixer","postcss","postcss-cli","cssnano"),o.websocket&&d.push("chokidar-cli"),o.prisma&&d.push("prisma","@prisma/client"),await installDependencies(p,d,!0),a||execSync("npx tsc --init",{stdio:"inherit"}),o.tailwindcss&&execSync("npx tailwindcss init -p",{stdio:"inherit"}),o.prisma&&(fs.existsSync(path.join(p,"prisma"))||execSync("npx prisma init",{stdio:"inherit"})),await createDirectoryStructure(p,o);const u=path.join(p,"public");if(fs.existsSync(u)||fs.mkdirSync(u),null==updateAnswer?void 0:updateAnswer.isUpdate){const e=[];if(!updateAnswer.tailwindcss){["postcss.config.js","tailwind.config.js"].forEach((e=>{const s=path.join(p,e);fs.existsSync(s)&&fs.unlinkSync(s)})),e.push("tailwindcss","autoprefixer","postcss","postcss-cli","cssnano")}updateAnswer.websocket||e.push("chokidar-cli"),updateAnswer.prisma||e.push("prisma","@prisma/client"),e.length>0&&await uninstallDependencies(p,e,!0)}const h=await fetchPackageVersion("create-prisma-php-app"),m=p.replace(/\\/g,"\\"),f=bsConfigUrls(m),w=o.prisma?"src/Lib/Prisma/Classes":"",y={projectName:o.projectName,projectRootPath:m,phpEnvironment:"XAMPP",phpRootPathExe:"C:\\xampp\\php\\php.exe",phpGenerateClassPath:w,bsTarget:f.bsTarget,bsPathRewrite:f.bsPathRewrite,tailwindcss:o.tailwindcss,websocket:o.websocket,prisma:o.prisma,version:h,excludeFiles:null!==(c=null==updateAnswer?void 0:updateAnswer.excludeFiles)&&void 0!==c?c:[]};fs.writeFileSync(path.join(p,"prisma-php.json"),JSON.stringify(y,null,2),{flag:"w"}),(null==updateAnswer?void 0:updateAnswer.isUpdate)?execSync("C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar update",{stdio:"inherit"}):execSync("C:\\xampp\\php\\php.exe C:\\ProgramData\\ComposerSetup\\bin\\composer.phar install",{stdio:"inherit"})}catch(e){process.exit(1)}}main();