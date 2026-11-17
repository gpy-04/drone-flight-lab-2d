import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
fs.mkdirSync('output',{recursive:true});
const sandbox={window:{},Image:class{set src(v){}},console};sandbox.window=sandbox;vm.createContext(sandbox);for(const f of ['photo-assets.js','reboot-content.js','physics2d.js','reboot-art.js','reboot-games.js'])vm.runInContext(fs.readFileSync(f,'utf8'),sandbox,{filename:f});
const app=fs.readFileSync('reboot-app.js','utf8');vm.runInContext(app.slice(0,app.indexOf('\n(()=>{\nconst $')),sandbox);
const {FlightGames:G,FlightPilot:P,FlightPhysics:F}=sandbox,results=[];
for(let l=0;l<3;l++)for(const [id,Class]of Object.entries(G.classes)){
 const g=new Class(l,{});g.start();let last=-10;for(let i=0;i<36000&&g.status==='running';i++){if(id==='valley'||g.elapsed-last>.9){P.act(g);last=g.elapsed;}g.tick(1/120);}
 results.push({id,level:l+1,status:g.status,time:g.elapsed,score:g.finalScore,message:g.message,model:g.status==='done'?undefined:g.model});
 console.log(id,l+1,g.status,g.elapsed.toFixed(1),g.message);
}
fs.writeFileSync('output/v3-model-results.json',JSON.stringify(results,null,2));
const p={x:0,y:100,vx:16,vy:0,pitch:F.trim().pitch},still=F.forces({x:0,y:100,vx:0,vy:0,pitch:0},{x:0,y:0},0);
assert.equal(still.lift,0);assert.equal(still.y,-F.spec.mass*F.spec.g);
assert(Math.abs(F.forces(p,{x:0,y:0},F.trim().throttle).y)<.1);
assert(F.forces(p,{x:4,y:0},.5).airspeed<F.forces(p,{x:0,y:0},.5).airspeed);
assert(F.coefficients(F.rad(20)).stalled);assert(F.coefficients(F.rad(25)).cl<F.coefficients(F.rad(15)).cl);
for(const id of Object.keys(G.classes)){const g=new G.classes[id](0,{});g.start();for(let i=0;i<36001&&g.status==='running';i++)g.tick(1/120);assert.notEqual(g.status,'done','idle completed '+id);}
assert.equal(results.filter(r=>r.status!=='done').length,0,'Some modeled routes failed; inspect results');
console.log('MODEL PASS: 24 routes and aerodynamic invariants');