#!/usr/bin/env node
import*as fs from"fs";import{exec}from"child_process";import path from"path";import{fileURLToPath,pathToFileURL}from"url";import CryptoJS from"crypto-js";const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename),args=process.argv.slice(2),getSecretKey=()=>{const r=fs.readFileSync(`${__dirname}/key.enc`,"utf8");if(r.length<400)throw new Error("File content is less than 400 characters.");return r.substring(247,289)},decryptData=(r,t)=>CryptoJS.AES.decrypt(r,t).toString(CryptoJS.enc.Utf8);
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
    console.log(`Standard output...\n${stdout}`);
  });
};
const main=async()=>{if("generate"===args[0]&&"class"===args[1])try{const e=process.cwd(),t=pathToFileURL(path.join(e,"settings","project-settings.js")),n=(await import(t.href)).projectSettings,c=n.PHP_GENERATE_CLASS_PATH,i=`${__dirname}/index.php`,a=`${__dirname}/index.enc`,s=getSecretKey(),r=fs.readFileSync(a,{encoding:"utf8"}),_=decryptData(r,s);fs.writeFileSync(`${__dirname}/index.php`,_);const p=`${n.PHP_ROOT_PATH_EXE} ${i} ${c}`;executePHP(p)}catch(e){}};main().catch((e=>{}));