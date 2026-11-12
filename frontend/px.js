const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});
await ctx.addInitScript(()=>localStorage.setItem('valentia-consentimiento',JSON.stringify({state:{decidido:true,version:99,videos:false},version:0})));
const p=await ctx.newPage();await p.goto('http://localhost:3000/');await p.waitForTimeout(1500);
const png=await p.screenshot({clip:{x:700,y:700,width:1,height:200}});
require('fs').writeFileSync('/tmp/strip.png',png);await b.close()})();
