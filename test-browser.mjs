import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let playwright;
try{playwright=require('playwright');}catch(error){
  if(!process.env.PLAYWRIGHT_MODULE_PATH)throw new Error('Install test dependencies with npm install, or set PLAYWRIGHT_MODULE_PATH to a Playwright package directory.',{cause:error});
  playwright=createRequire(path.join(path.resolve(process.env.PLAYWRIGHT_MODULE_PATH),'package.json'))('playwright');
}
export const {chromium}=playwright;
export const browserOptions={headless:true,...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{channel:process.env.BROWSER_CHANNEL||'chrome'})};
fs.mkdirSync('output',{recursive:true});
