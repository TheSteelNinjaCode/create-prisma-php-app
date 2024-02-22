#!/usr/bin/env node
import{execSync}from"child_process";import fs from"fs";import{fileURLToPath}from"url";import path from"path";import chalk from"chalk";import prompts from"prompts";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);function configureBrowserSyncCommand(e,s){const t=s.PROJECT_ROOT_PATH.indexOf("\\htdocs\\");if(-1===t)return"";const n=s.PROJECT_ROOT_PATH.substring(0,t+"\\htdocs\\".length).replace(/\\/g,"\\\\"),i=s.PROJECT_ROOT_PATH.replace(new RegExp(`^${n}`),"").replace(/\\/g,"/");let c=`http://localhost/${i}`;c=c.endsWith("/")?c.slice(0,-1):c;const r=c.replace(/(?<!:)(\/\/+)/g,"/"),o=i.replace(/\/\/+/g,"/"),a=`\n  const { createProxyMiddleware } = require("http-proxy-middleware");\n\n  module.exports = {\n    // First middleware: Set Cache-Control headers\n    function (req, res, next) {\n      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");\n      res.setHeader("Pragma", "no-cache");\n      res.setHeader("Expires", "0");\n      next();\n    },\n    // Use the 'middleware' option to create a proxy that masks the deep URL.\n    middleware: [\n      // This middleware intercepts requests to the root and proxies them to the deep path.\n      createProxyMiddleware("/", {\n        target:\n          "${r}",\n        changeOrigin: true,\n        pathRewrite: {\n          "^/": "${o.startsWith("/")?o.substring(1):o}", // Rewrite the path.\n        },\n      }),\n    ],\n    proxy: "http://localhost:3000", // Proxy the BrowserSync server.\n    // serveStatic: ["src/app"], // Serve static files from this directory.\n    files: "src/**/*.*",\n    notify: false,\n    open: false,\n    ghostMode: false,\n  };`,p=path.join(e,"settings","bs-config.cjs");return fs.writeFileSync(p,a,"utf8"),"browser-sync start --config settings/bs-config.cjs"}async function updatePackageJson(e,s,t){const n=path.join(e,"package.json"),i=JSON.parse(fs.readFileSync(n,"utf8")),c=configureBrowserSyncCommand(e,s);i.scripts=Object.assign(Object.assign({},i.scripts),{postinstall:"prisma generate"});let r=[];t.tailwindcss&&(i.scripts=Object.assign(Object.assign({},i.scripts),{tailwind:"tailwindcss -i ./src/app/css/tailwind.css -o ./src/app/css/styles.css --minify --watch"}),r.push("tailwind")),t.websocket&&(i.scripts=Object.assign(Object.assign({},i.scripts),{websocket:"node ./settings/restartWebsocket.cjs"}),r.push("websocket"));const o=Object.assign({},i.scripts);r.length>0&&(o["browser-sync"]=c),o.dev=r.length>0?`npm-run-all --parallel browser-sync ${r.join(" ")}`:c,i.scripts=o,i.type="module",i.prisma={seed:"node prisma/seed.js"},fs.writeFileSync(n,JSON.stringify(i,null,2))}async function updateComposerJsonForWebSocket(e,s){if(!s.websocket)return;const t=path.join(e,"composer.json");let n;if(fs.existsSync(t)){{const e=fs.readFileSync(t,"utf8");n=JSON.parse(e)}n.require=Object.assign(Object.assign({},n.require),{"cboden/ratchet":"^0.4.4"}),fs.writeFileSync(t,JSON.stringify(n,null,2))}}async function updateIndexJsForWebSocket(e,s){if(!s.websocket)return;const t=path.join(e,"src","app","js","index.js");let n=fs.readFileSync(t,"utf8");n+='\n// WebSocket initialization\nconst ws = new WebSocket("ws://localhost:8080");\n',fs.writeFileSync(t,n,"utf8")}async function createUpdateGitignoreFile(e,s){const t=path.join(e,".gitignore");let n="";fs.existsSync(t)&&(n=fs.readFileSync(t,"utf8")),s.forEach((e=>{n.includes(e)||(n+=`\n${e}`)})),n=n.trimStart(),fs.writeFileSync(t,n)}function copyRecursiveSync(e,s){const t=fs.existsSync(e),n=t&&fs.statSync(e);t&&n&&n.isDirectory()?(fs.mkdirSync(s,{recursive:!0}),fs.readdirSync(e).forEach((t=>copyRecursiveSync(path.join(e,t),path.join(s,t))))):fs.copyFileSync(e,s)}async function executeCopy(e,s){s.forEach((({srcDir:s,destDir:t})=>{copyRecursiveSync(path.join(__dirname,s),path.join(e,t))}))}function modifyTailwindConfig(e){const s=path.join(e,"tailwind.config.js");let t=fs.readFileSync(s,"utf8");const n=["./src/app/**/*.{php,html,js,css}"].map((e=>`    "${e}"`)).join(",\n");t=t.replace(/content: \[\],/g,`content: [\n${n}\n],`),fs.writeFileSync(s,t,"utf8")}function modifyIndexPHP(e,s){const t=path.join(e,"src","app","layout.php");try{let e=fs.readFileSync(t,"utf8");const n='\n    <link href="<?php echo $baseUrl; ?>css/index.css" rel="stylesheet">\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">\n    <script src="<?php echo $baseUrl; ?>js/index.js"><\/script>',i=s?`    <link href="<?php echo $baseUrl; ?>css/styles.css" rel="stylesheet"> ${n}`:`    <script src="https://cdn.tailwindcss.com"><\/script> ${n}`;e=e.replace("</head>",`${i}\n</head>`),fs.writeFileSync(t,e,"utf8")}catch(e){}}async function createDirectoryStructure(e,s,t){const n=[{src:"/bootstrap.php",dest:"/bootstrap.php"},{src:"/.htaccess",dest:"/.htaccess"},{src:"/../composer.json",dest:"/composer.json"}];s.websocket?n.push({src:"/../composer-websocket.lock",dest:"/composer.lock"}):n.push({src:"/../composer.lock",dest:"/composer.lock"});n.forEach((({src:s,dest:t})=>{const n=path.join(__dirname,s),i=path.join(e,t),c=fs.readFileSync(n,"utf8");fs.writeFileSync(i,c)})),await executeCopy(e,[{srcDir:"/settings",destDir:"/settings"},{srcDir:"/prisma",destDir:"/prisma"},{srcDir:"/src",destDir:"/src"},{srcDir:"/../vendor",destDir:"/vendor"}]),await updatePackageJson(e,t,s),await updateComposerJsonForWebSocket(e,s),await updateIndexJsForWebSocket(e,s),s.tailwindcss?(modifyTailwindConfig(e),modifyIndexPHP(e,!0)):modifyIndexPHP(e,!1)}async function getAnswer(){const e=[{type:"text",name:"projectName",message:"What is your project named?",initial:"my-app"},{type:"toggle",name:"tailwindcss",message:`Would you like to use ${chalk.blue("Tailwind CSS")}?`,initial:!0,active:"Yes",inactive:"No"},{type:"toggle",name:"websocket",message:`Would you like to use ${chalk.blue("Websocket")}?`,initial:!0,active:"Yes",inactive:"No"}],s=()=>!1;try{const t=await prompts(e,{onCancel:s});return 0===Object.keys(t).length?null:{projectName:String(t.projectName).trim().replace(/ /g,"-"),tailwindcss:t.tailwindcss,websocket:t.websocket}}catch(e){return null}}async function installDependencies(e,s,t=!1){execSync("npm init -y",{stdio:"inherit",cwd:e}),s.forEach((e=>{}));const n=`npm install ${t?"--save-dev":""} ${s.join(" ")}`;execSync(n,{stdio:"inherit",cwd:e})}async function main(){try{const e=await getAnswer();if(null===e)return;execSync("npm install -g create-prisma-php-app",{stdio:"inherit"}),execSync("npm install -g browser-sync",{stdio:"inherit"}),fs.mkdirSync(e.projectName);const s=path.join(process.cwd(),e.projectName);process.chdir(e.projectName);const t=["prisma","@prisma/client","typescript","@types/node","ts-node","http-proxy-middleware"];e.tailwindcss&&t.push("tailwindcss","autoprefixer","postcss"),e.websocket&&t.push("chokidar-cli"),(e.tailwindcss||e.websocket)&&t.push("npm-run-all"),await installDependencies(s,t,!0),execSync("npx prisma init",{stdio:"inherit"}),execSync("npx tsc --init",{stdio:"inherit"}),e.tailwindcss&&execSync("npx tailwindcss init -p",{stdio:"inherit"});const n={PROJECT_NAME:e.projectName,PROJECT_ROOT_PATH:s.replace(/\\/g,"\\\\"),PHP_ROOT_PATH_EXE:"D:\\\\xampp\\\\php\\\\php.exe",PHP_GENERATE_CLASS_PATH:"src/lib/prisma/classes"};await createDirectoryStructure(s,e,n),e.tailwindcss&&execSync("npx tailwindcss -i ./src/app/css/tailwind.css -o ./src/app/css/styles.css --minify",{stdio:"inherit"});const i=path.join(s,"settings","project-settings.js"),c=`export const projectSettings = {\n      PROJECT_NAME: "${e.projectName}",\n      PROJECT_ROOT_PATH: "${s.replace(/\\/g,"\\\\")}",\n      PHP_ROOT_PATH_EXE: "D:\\\\xampp\\\\php\\\\php.exe",\n      PHP_GENERATE_CLASS_PATH: "src/lib/prisma/classes",\n    };`;if(fs.writeFileSync(i,c),fs.mkdirSync(path.join(s,"public")),!e.tailwindcss){const e=path.join(s,"src","app","css");["tailwind.css","styles.css"].forEach((s=>{const t=path.join(e,s);fs.existsSync(t)&&fs.unlinkSync(t)}))}if(!e.websocket){const e=path.join(s,"src","lib","websocket");fs.existsSync(e)&&fs.rmSync(e,{recursive:!0,force:!0});const t=path.join(s,"settings");["restartWebsocket.cjs","restart_websocket.bat"].forEach((e=>{const s=path.join(t,e);fs.existsSync(s)&&fs.unlinkSync(s)}))}}catch(e){process.exit(1)}}main();