/* Deterministic offline analysis of a completed teaching simulation. No AI service or network request. */
window.FlightReview=(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fixed=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
function create(g,course,{demo=false}={}){
 const m=g.model,events=g.events.slice(),reminders=events.filter(e=>e.type==='wrong');
 const stats=[['任务用时',fixed(g.elapsed)+' s'],['扣分误判',g.mistakes+' 次']];
 let insight='',tip='';
 switch(g.id){
  case 'assembly':{
   const names={distance:'测距扫描仪',camera:'可见光摄像头',lamp:'照明灯'};
   const parts=Object.keys(names).filter(k=>m.parts[k]).map(k=>names[k]);
   stats.push(['目标记录',m.visited.length+' / '+g.targets.length],['剩余电量',fixed(Math.max(0,(m.battery==='large'?48:24)-m.energy),0)+' 格']);
   insight='你使用'+parts.join('、')+'，沿 '+m.points.length+' 个航点完成了试飞。整机质量为 '+fixed(g.mass(),2)+' kg，实际飞行距离为 '+fixed(m.travel,0)+' m。配件完成不同的采集任务，路线和载重共同影响电量。';
   tip=g.level===1?'再次试飞时，保留照明与摄像头，并观察改变航点怎样影响夜间记录和耗电。':'下一次先检查每个目标需要的配件，再比较绕行路线的长度与剩余电量。';
   break;
  }
  case 'valley':
   stats.push(['航路圈',m.gates+' / '+g.gates.length],['失速记录',m.stalls+' 次']);
   insight='你穿过了全部 '+g.gates.length+' 个航路圈，剩余燃料 '+fixed(m.fuel,0)+' 格。'+(m.stalls?'本次记录到 '+m.stalls+' 次失速，提示抬头过多会降低机翼的有效升力。':'本次没有记录到失速，飞机保持了完成航路所需的气流条件。');
   tip='继续观察相对空速和离地高度，接近航路圈时逐步调整机头；持续增加推力会消耗更多燃料。';
   break;
  case 'rescue':
   stats.push(['落地垂直速度',fixed(m.landing?.vertical)+' m/s'],['落地水平速度',fixed(m.landing?.horizontal)+' m/s']);
   insight='你在飞行 '+fixed(m.openedAt?.t)+' 秒时开伞，落点位于安全空地；落地时伞面展开 '+fixed((m.landing?.canopy??0)*100,0)+'%。这次操作为降落伞留出了展开和减速的时间。';
   tip='下一次同时观察高度与安全空地的位置。开伞后仍会前进和漂移，应给伞面展开留出高度。';
   break;
  case 'coding':
   stats.push(['飞行积木',m.blocks.length+' 块'],['实际飞行距离',Math.max(0,m.path.length-1)*10+' m']);
   insight='你用 '+m.blocks.length+' 块积木组成飞行程序，无人机逐步执行指令并绕过建筑，到达测绘终点。每一步都改变地图位置，指令顺序和步数一起决定航线。';
   tip='再次运行前，逐段检查转向位置和步数。比较另一条安全路线，观察距离变化怎样影响得分。';
   break;
  case 'patrol':case 'changes':
   stats.push(['违规处置',m.caught+' / '+g.total],['合法误拦',m.legalMistakes+' 次']);
   insight='你完成了 '+m.caught+' 架违规无人机的核查处置。'+(m.legalMistakes?'其中发生 '+m.legalMistakes+' 次合法误拦，需要在处置前再次核对授权。':'本次没有误拦已获授权的合法无人机。')+(g.id==='changes'?'任务完成时，地图图层'+(g.synced()?'已与生效公告同步。':'仍需与生效公告再次核对。'):'核查依据来自本关划定的虚拟限制区域与许可记录。');
   tip=g.id==='changes'?'先核对公告时间，再同步临时图层，最后核查飞行授权；活动解除后也要更新地图。':'处置前同时核对位置和当前授权，合法测绘与违规飞行需要分别判断。';
   break;
  case 'puzzle':
   stats.push(['补齐地块',m.filled.length+' / '+g.count],['规划预警',g.mistakes+' 次']);
   insight='你补齐了 '+m.filled.length+' 个地块，完整规划网已恢复。'+(g.mistakes?'本次有 '+g.mistakes+' 次边界匹配预警。':'本次没有记录到地块匹配预警。')+'地图补位为执法组提供了完整的排查边界。';
   tip='先比对缺口的边界和地标，再拖动匹配地块；优先处理当前受到提示的缺口。';
   break;
  case 'sources':
   stats.push(['定位源头',m.found.length+' / 5'],['扫描地块',m.scanned.length+' / 12']);
   insight='你扫描了 '+m.scanned.length+' 个地块，定位了全部五个违规源头。用途线索帮助选择排查位置，扫描返回的区域与时段授权才是核验依据。';
   tip='下一次继续按“看用途线索 → 扫描信号 → 核验区域与时段”的顺序判断，避免把地块用途直接当作违规证据。';
   break;
 }
 const note=g.mistakes?'本次有 '+g.mistakes+' 次扣分误判，复盘时可以先查看相关操作记录。':reminders.length?'本次没有扣分误判，记录中仍有 '+reminders.length+' 条操作提醒可供回看。':'本次没有记录到扣分误判。';
 return {version:1,demo,mode:demo?'演示复盘 · 不计入你的成绩':g.support?'练习辅助':'标准挑战',headline:course.levels[g.level]+'已完成。'+note,stats,insight,tip,next:g.level<2?'下一档任务：'+course.levels[g.level+1]:'三档任务已到最后一档，可再次尝试并比较操作结果。',facts:[...new Set([...events.map(e=>e.knowledge),g.knowledge||course.facts[g.level]].filter(Boolean))],events:events.map(e=>({t:e.t,type:e.type,message:e.message})),reminders:reminders.map(e=>e.message)};
}
function render(r,{records=true}={}){
 return `<section class="flight-review" aria-label="AI 飞行总结"><div class="review-heading"><h3>AI 飞行总结</h3><span>离线规则生成 · 本机分析</span></div><p class="review-mode">${esc(r.mode)}</p><p class="review-headline">${esc(r.headline)}</p><dl class="review-stats">${r.stats.map(([name,value])=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><div class="review-section"><h4>本次表现</h4><p>${esc(r.insight)}</p></div><div class="review-section"><h4>再试一次，可以这样做</h4><p>${esc(r.tip)}</p><p class="review-next">${esc(r.next)}</p></div>${r.reminders.length?`<details class="review-details"><summary>回看操作提醒 · ${r.reminders.length} 条</summary><ul>${[...new Set(r.reminders)].map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details>`:''}<details class="review-details"><summary>本次科学发现 · ${r.facts.length} 条</summary><ul>${r.facts.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details>${records?`<details class="review-details review-log"><summary>展开操作记录 · ${r.events.length} 条</summary><p class="review-record-note">按任务时间排列，最多保留最近 60 条操作。</p><ol>${r.events.map(e=>`<li><time>${esc(fixed(e.t))} s</time><span>${esc(e.message)}</span></li>`).join('')}</ol></details>`:''}</section>`;
}
return {create,render};
})();
