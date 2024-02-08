#!/usr/bin/env node
import{execSync}from"child_process";import fs from"fs";import{fileURLToPath}from"url";import path from"path";import chalk from"chalk";import prompts from"prompts";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);function configureBrowserSyncCommand(e,t){const s=t.PROJECT_ROOT_PATH.indexOf("\\htdocs\\");if(-1===s)return"";const i=t.PROJECT_ROOT_PATH.substring(0,s+"\\htdocs\\".length).replace(/\\/g,"\\\\");let n=`http://localhost/${t.PROJECT_ROOT_PATH.replace(new RegExp(`^${i}`),"").replace(/\\/g,"/")}`;n=n.endsWith("/")?n.slice(0,-1):n;const c=n.replace(/(?<!:)(\/\/+)/g,"/"),r=c.replace("http://localhost",""),a=`\n  const { createProxyMiddleware } = require("http-proxy-middleware");\n\n  module.exports = {\n    // Use the 'middleware' option to create a proxy that masks the deep URL.\n    middleware: [\n      // This middleware intercepts requests to the root and proxies them to the deep path.\n      createProxyMiddleware("/", {\n        target:\n          "${c}",\n        changeOrigin: true,\n        pathRewrite: {\n          "^/": "${r}", // Rewrite the path.\n        },\n      }),\n    ],\n    proxy: "http://localhost:3000", // Proxy the BrowserSync server.\n    serveStatic: ["src/app"], // Serve static files from this directory.\n    notify: false,\n  };`,o=path.join(e,"settings","bs-config.cjs");return fs.writeFileSync(o,a,"utf8"),"browser-sync start --config settings/bs-config.cjs"}async function updatePackageJson(e,t,s){const i=path.join(e,"package.json"),n=JSON.parse(fs.readFileSync(i,"utf8")),c=configureBrowserSyncCommand(e,t);n.scripts=Object.assign(Object.assign({},n.scripts),{postinstall:"prisma generate"}),s.tailwindcss?n.scripts=Object.assign(Object.assign({},n.scripts),{tailwind:"tailwindcss -i ./src/app/css/tailwind.css -o ./src/app/css/styles.css --minify --watch","browser-sync":c,dev:"npm-run-all --parallel browser-sync tailwind"}):n.scripts=Object.assign(Object.assign({},n.scripts),{dev:c}),n.type="module",n.prisma={seed:"node prisma/seed.js"},fs.writeFileSync(i,JSON.stringify(n,null,2))}async function createUpdateGitignoreFile(e,t){const s=path.join(e,".gitignore");let i="";fs.existsSync(s)&&(i=fs.readFileSync(s,"utf8")),t.forEach((e=>{i.includes(e)||(i+=`\n${e}`)})),i=i.trimStart(),fs.writeFileSync(s,i)}function copyRecursiveSync(e,t){const s=fs.existsSync(e),i=s&&fs.statSync(e);s&&i&&i.isDirectory()?(fs.mkdirSync(t,{recursive:!0}),fs.readdirSync(e).forEach((s=>copyRecursiveSync(path.join(e,s),path.join(t,s))))):fs.copyFileSync(e,t)}async function executeCopy(e,t){t.forEach((({srcDir:t,destDir:s})=>{copyRecursiveSync(path.join(__dirname,t),path.join(e,s))}))}function modifyTailwindConfig(e){const t=path.join(e,"tailwind.config.js");let s=fs.readFileSync(t,"utf8");const i=["./src/app/**/*.{php,html,js}"].map((e=>`    "${e}"`)).join(",\n");s=s.replace(/content: \[\],/g,`content: [\n${i}\n],`),fs.writeFileSync(t,s,"utf8")}function modifyIndexPHP(e,t){const s=path.join(e,"src","app","layout.php");try{let i=fs.readFileSync(s,"utf8");const n=t?'    <link href="<?php echo $baseUrl; ?>css/styles.css" rel="stylesheet">':'    <script src="https://cdn.tailwindcss.com"><\/script>';if(i=i.replace("</head>",`${n}\n</head>`),fs.writeFileSync(s,i,"utf8"),!t){const t=path.join(e,"src","app","css");fs.rm(t,{recursive:!0},(e=>{if(e)throw e}))}}catch(e){}}async function createDirectoryStructure(e,t,s){await executeCopy(e,[{srcDir:"/settings",destDir:"/settings"},{srcDir:"/prisma",destDir:"/prisma"},{srcDir:"/public",destDir:"/public"},{srcDir:"/src",destDir:"/src"},{srcDir:"/../vendor",destDir:"/vendor"}]),await updatePackageJson(e,s,t),[{src:"/bootstrap.php",dest:"/bootstrap.php"},{src:"/.htaccess",dest:"/.htaccess"},{src:"/../composer.json",dest:"/composer.json"},{src:"/../composer.lock",dest:"/composer.lock"}].forEach((({src:t,dest:s})=>{const i=path.join(__dirname,t),n=path.join(e,s),c=fs.readFileSync(i,"utf8");fs.writeFileSync(n,c)})),t.tailwindcss?(modifyTailwindConfig(e),modifyIndexPHP(e,!0)):modifyIndexPHP(e,!1)}async function getAnswer(){const e=[{type:"text",name:"projectName",message:"What is your project named?",initial:"my-app"},{type:"toggle",name:"tailwindcss",message:`Would you like to use ${chalk.blue("Tailwind CSS")}?`,initial:!0,active:"Yes",inactive:"No"}],t=()=>!1;try{const s=await prompts(e,{onCancel:t});return 0===Object.keys(s).length?null:{projectName:String(s.projectName).trim().replace(/ /g,"-"),tailwindcss:s.tailwindcss}}catch(e){return null}}async function installDependencies(e,t,s=!1){execSync("npm init -y",{stdio:"inherit",cwd:e}),t.forEach((e=>{}));const i=`npm install ${s?"--save-dev":""} ${t.join(" ")}`;execSync(i,{stdio:"inherit",cwd:e})}async function main(){try{const e=await getAnswer();if(null===e)return;execSync("npm install -g create-prisma-php-app",{stdio:"inherit"}),execSync("npm install -g browser-sync",{stdio:"inherit"}),fs.mkdirSync(e.projectName);const t=path.join(process.cwd(),e.projectName);process.chdir(e.projectName);const s=["prisma","@prisma/client","typescript","@types/node","ts-node","http-proxy-middleware"];e.tailwindcss&&s.push("npm-run-all","tailwindcss","autoprefixer","postcss"),await installDependencies(t,s,!0),execSync("npx prisma init",{stdio:"inherit"}),execSync("npx tsc --init",{stdio:"inherit"}),e.tailwindcss&&execSync("npx tailwindcss init -p",{stdio:"inherit"});const i={PROJECT_NAME:e.projectName,PROJECT_ROOT_PATH:t.replace(/\\/g,"\\\\"),PHP_ROOT_PATH_EXE:"D:\\\\xampp\\\\php\\\\php.exe",PHP_GENERATE_CLASS_PATH:"src/lib/prisma/classes"};await createDirectoryStructure(t,e,i),e.tailwindcss&&execSync("npx tailwindcss -i ./src/app/css/tailwind.css -o ./src/app/css/styles.css --minify",{stdio:"inherit"});const n=path.join(t,"settings","project-settings.js"),c=`export const projectSettings = {\n      PROJECT_NAME: "${e.projectName}",\n      PROJECT_ROOT_PATH: "${t.replace(/\\/g,"\\\\")}",\n      PHP_ROOT_PATH_EXE: "D:\\\\xampp\\\\php\\\\php.exe",\n      PHP_GENERATE_CLASS_PATH: "src/lib/prisma/classes",\n    };`;fs.writeFileSync(n,c)}catch(e){process.exit(1)}}main();