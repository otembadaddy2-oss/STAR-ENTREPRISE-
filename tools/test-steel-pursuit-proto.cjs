const { chromium } = require("playwright");
(async()=>{
 const nav=await chromium.launch(); const ctx=await nav.newContext({viewport:{width:900,height:420}}); const page=await ctx.newPage(); const err=[];
 page.on("pageerror",e=>err.push(e.message)); page.on("console",m=>{if(m.type()==="error")err.push(m.text())});
 await page.goto("file://"+process.cwd()+"/steel-pursuit-proto/steel-pursuit-stage1.html"); await page.waitForTimeout(400);
 const res=[];
 for(let h=0;h<4;h++){
  await page.evaluate(i=>{document.querySelectorAll('.carte')[i].click();document.getElementById('go').click();},h);
  // robot de test : saute/glisse/tire selon ce qui arrive
  await page.evaluate(()=>{window.__bot=setInterval(()=>{const s=__sp.S;if(!s||s.etat!=='jeu')return;const px=s.px();
    for(const o of s.obst){const d=o.x-px;if(d>20&&d<(o.t==='caisse'?150:170)){__sp.press(o.t==='caisse'?'a':'b');break}}
    for(const b of s.ennemiB){const d=px-b.x;if(d<0&&d>-230){const hy=b.y;__sp.press(hy>430-45?'a':'b')}}
    __sp.press('c'); if(s.cd1<=0)__sp.press('r1'); if(s.jauge>=100)__sp.press('r2');},90)});
  if(h===0){await page.waitForTimeout(6000);await page.screenshot({path:'/tmp/sp-jeu.png'});}
  await page.waitForFunction(()=>__sp.S&&(__sp.S.etat!=='jeu'),null,{timeout:150000}).catch(()=>{});
  const r=await page.evaluate(()=>{clearInterval(__bot);const s=__sp.S;return{h:s.h.id,etat:s.etat,pv:s.pv,pieces:s.pieces,t:+s.t.toFixed(1),boss:!!s.boss,bossHp:s.boss?s.boss.t.map(x=>x.hp):null}});
  res.push(r); console.log(JSON.stringify(r));
  await page.waitForTimeout(1800);
 }
 console.log('erreurs:',err.length?err.slice(0,3):'aucune'); await nav.close();
})();
