import*as fs from"fs";import{exec}from"child_process";import path from"path";import{fileURLToPath}from"url";import CryptoJS from"crypto-js";import chalk from"chalk";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename),getSecretKey=()=>{const r=fs.readFileSync(`${__dirname}/key.enc`,"utf8");if(r.length<400)throw new Error("File content is less than 400 characters.");return r.substring(247,289)},decryptData=(r,t)=>CryptoJS.AES.decrypt(r,t).toString(CryptoJS.enc.Utf8);
const executePHP = (command) => {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`Standard error: ${stderr}`);
      return;
    }
    if (stdout.includes("Result: Prisma schema is valid.")) {
      console.error(chalk.blue(stdout));
    } else {
      console.log(`Standard output...\n${stdout}`);
    }
  });
};
const main=async()=>{try{const e=process.cwd(),n=path.join(e,"prisma-php.json"),a=fs.readFileSync(n,{encoding:"utf8"}),c=JSON.parse(a),t=c.phpGenerateClassPath,i=`${__dirname}/index.php`,p=`${__dirname}/index.enc`,s=getSecretKey(),r=fs.readFileSync(p,{encoding:"utf8"}),d=decryptData(r,s);fs.writeFileSync(`${__dirname}/index.php`,d);const h=`${c.phpRootPathExe} ${i} ${t}`;executePHP(h)}catch(e){}};main().catch((e=>{}));