const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  for (const mobile of [true,false]) {
   const context=await browser.newContext(mobile
     ? {viewport:{width:390,height:844},isMobile:true,hasTouch:true}
     : {viewport:{width:1280,height:800}});
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/merchandise.html',{waitUntil:'domcontentloaded'});
   await page.locator('body[data-merchandise-catalog-status="matched"]').waitFor({timeout:30000});
   const opener=page.locator('.echoes-tee-open').first();
   await opener.click();
   const detail=page.locator('#echoes-tee-detail');
   assert.equal(await detail.evaluate(d=>d.open),true,'detail dialog should open');
   const update=detail.locator('[data-echoes-merch-button]');
   await update.click();
   const go=detail.locator('[data-echoes-merch-go-order]');
   await go.click();
   const cart=page.locator('#echoes-synthetic-checkout');
   assert.equal(await cart.evaluate(d=>d.open),true,'synthetic cart should open');
   assert.equal(await detail.evaluate(d=>d.open),false,'detail should close');
   await cart.locator('[data-order-action="calculate"]').click();
   const state=await cart.locator('[role="status"]').innerText();
   assert.match(state,/1[,.]990|1990/,'cart calculation must show 1990 EC');
   assert.equal(errors.length,0,'page errors: '+errors.join('; '));
   console.log('PASS:',mobile?'mobile':'desktop','detail → existing cart → calculate 1990 EC');
   await context.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
