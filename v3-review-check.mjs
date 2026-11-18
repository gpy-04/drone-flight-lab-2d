import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium,browserOptions} from './test-browser.mjs';

const browser=await chromium.launch(browserOptions);
const context=await browser.newContext({viewport:{width:1440,height:1050},offline:true,acceptDownloads:true});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('crash',()=>errors.push('browser crash'));
const state=()=>page.evaluate(()=>aero.snapshot());
const step=t=>page.evaluate(t=>aero.step(t),t);
async function start(id,level=0){
 if(await page.evaluate(h=>location.hash===h,'#'+id+'/'+level))await page.locator('#restart').click();
 else await page.evaluate(h=>location.hash=h,'#'+id+'/'+level);
 await page.waitForSelector('#start');await page.evaluate(()=>aero.freeze());await page.locator('#start').click();
}
async function action(name,arg){await page.locator('[data-action="'+name+'"]'+(arg===undefined?'':'[data-arg="'+arg+'"]')).click();}
async function point(x,y){
 const el=page.locator('#canvas');await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();
 await page.mouse.click(b.x+x/960*b.width,b.y+y/600*b.height);
}
async function sources({mistake=false}={}){
 await start('sources');
 const records=(await state()).game.model.records;
 const targets=records.filter(r=>r.source).map(r=>r.parcel);
 if(mistake)targets.unshift(records.find(r=>!r.source).parcel);
 for(const id of targets){await point(57+id%4*214+90,100+Math.floor(id/4)*141+55);await action('scan');await step(1.2);await action('verify');}
 assert.equal((await state()).game.status,'done');
}
async function scrollCheck(label){
 const scroll=page.locator('.result-scroll'),actions=page.locator('.result-actions'),heading=page.locator('.result-heading');
 await scroll.scrollIntoViewIfNeeded();
 await page.locator('.result-scroll .review-log summary').click();
 await scroll.evaluate(el=>el.scrollTop=0);
 const before=await actions.boundingBox(),title=await heading.boundingBox();
 const geometry=await scroll.evaluate(el=>({client:el.clientHeight,total:el.scrollHeight,overflow:getComputedStyle(el).overflowY}));
 assert(geometry.total>geometry.client,label+' has long scrollable content');assert.equal(geometry.overflow,'scroll');
 const box=await scroll.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,700);
 await page.waitForTimeout(250);assert(await scroll.evaluate(el=>el.scrollTop>0),label+' wheel scroll');
 await scroll.focus();await page.keyboard.press('End');await page.waitForTimeout(200);
 assert(await scroll.evaluate(el=>el.scrollTop+el.clientHeight>=el.scrollHeight-2),label+' keyboard scroll');
 const after=await actions.boundingBox(),titleAfter=await heading.boundingBox();
 assert(Math.abs(before.y-after.y)<1,label+' footer stays visible');assert(Math.abs(title.y-titleAfter.y)<1,label+' heading stays visible');
 const bounds=await page.locator('.result-card').evaluate(el=>{const b=el.getBoundingClientRect(),s=el.closest('.stage-overlay').getBoundingClientRect();return {top:b.top,bottom:b.bottom,parentTop:s.top,parentBottom:s.bottom};});
 assert(bounds.top>=bounds.parentTop&&bounds.bottom<=bounds.parentBottom+1,label+' card stays inside stage overlay');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' horizontal overflow');
 checks.push(label+' wheel, keyboard, fixed heading/footer and bounds');
}
try{
 await page.goto(pathToFileURL(path.resolve('dist/index.html')).href);
 await page.waitForFunction(()=>aero.ready);
 await sources();
 const clean=(await state()).progress.sources.levels[0];
 assert.equal(clean.score,100);assert(clean.review.insight.includes('五个'));assert(clean.review.headline.includes('没有记录到扣分误判'));
 assert.equal(await page.locator('.flight-review h3').textContent(),'AI 飞行总结');
 assert((await page.locator('.review-heading').innerText()).includes('离线规则生成'));
 await scrollCheck('desktop');
 await page.locator('.result-scroll').evaluate(el=>el.scrollTop=0);
 await page.screenshot({path:'output/review-desktop.png',fullPage:true});
 await page.locator('.result-actions a').click();await page.waitForSelector('#start');assert.equal((await state()).level,1);
 checks.push('real sources completion and next mission');
 await sources({mistake:true});
 assert.equal((await state()).game.score,88);
 assert((await page.locator('.review-headline').innerText()).includes('1 次扣分误判'));
 assert.equal((await state()).progress.sources.levels[0].score,100,'best score storage is preserved');
 assert((await page.locator('.result-heading').innerText()).includes('88 分'),'popup analyzes the current attempt');
 checks.push('summary reacts to actual mistakes and keeps best-score rule');
 await page.setViewportSize({width:390,height:900});await scrollCheck('mobile');
 await page.locator('.result-scroll').evaluate(el=>el.scrollTop=0);
 await page.screenshot({path:'output/review-mobile.png',fullPage:true});
 await page.locator('#retry').click();await page.waitForSelector('#start');assert.equal((await state()).game.status,'ready');
 checks.push('mobile retry control');
 await page.setViewportSize({width:1440,height:1050});
 await start('assembly');await action('part','distance');await action('part','camera');await action('plan');
 await point(385,240); // The real obstacle warning does not increment the deduction counter.
 for(const [x,y]of [[270,435],[535,450],[770,400]])await point(x,y);
 await action('fly');await step(35);assert.equal((await state()).game.status,'done');
 assert((await page.locator('.review-headline').innerText()).includes('没有扣分误判'));
 assert((await page.locator('.review-headline').innerText()).includes('1 条操作提醒'));
 checks.push('non-deducting reminder differs from a deduction');
 await start('coding');const before=JSON.stringify((await state()).progress);await page.locator('#demo').click();await step(200);
 assert.equal((await state()).game.status,'done');assert((await page.locator('.review-mode').innerText()).includes('不计入你的成绩'));
 assert.equal(JSON.stringify((await state()).progress),before);
 await page.locator('#back-demo').click();assert.equal((await state()).game.status,'running');
 checks.push('demo review, isolated scores and return');
 await page.evaluate(()=>location.hash='report');await page.waitForSelector('#download');
 await page.locator('.report-review').first().locator(':scope > summary').click();assert(await page.locator('.report-review .flight-review').first().isVisible());
 const pending=page.waitForEvent('download');await page.locator('#download').click();const download=await pending;
 await download.saveAs('output/review-export.html');const exported=fs.readFileSync('output/review-export.html','utf8');
 assert(exported.includes('AI 飞行总结'));assert(exported.includes('离线规则生成'));assert(!exported.includes('undefined'));assert(exported.includes('background:#080c17'));
 await page.reload();await page.waitForSelector('#download');assert((await state()).progress.sources.levels[0].review);
 checks.push('saved review, reload and offline archive export');
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('aero-flight-v3'));for(const p of Object.values(s.progress))for(const r of p.levels)if(r)delete r.review;localStorage.setItem('aero-flight-v3',JSON.stringify(s));});
 await page.reload();await page.waitForSelector('#download');assert.equal(await page.locator('.report-review').count(),0);assert.equal((await state()).progress.sources.levels[0].score,100);
 checks.push('legacy score records load without a review');
 const escaped=await page.evaluate(()=>FlightReview.render({mode:'<script>',headline:'<img src=x onerror=alert(1)>',stats:[['<b>','<x>']],insight:'<svg>',tip:'<iframe>',next:'<a>',reminders:['<script>'],facts:['<img>'],events:[{t:1,message:'<script>'}]}));
 assert(!escaped.includes('<script>'));assert(!escaped.includes('<img '));assert(escaped.includes('&lt;script&gt;'));
 checks.push('stored text is escaped');
}catch(e){errors.push(e.stack);}
await browser.close();
fs.writeFileSync('output/v3-review-check.json',JSON.stringify({checks,errors},null,2));
if(errors.length){console.error(errors);process.exit(1);}console.log('REVIEW PASS',checks.length,'checks');
