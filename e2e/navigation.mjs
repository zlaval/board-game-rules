import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1366,height:900},locale:'hu-HU'});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('request',req=>assert.ok(!/\/process(?:\?|$)|\/transcriptions|\/answers|\/publish(?:\?|$)|\/auth\//.test(req.url()),'Unexpected processing/auth request'));
const base=process.env.BASE_URL;
async function shot(name){await page.screenshot({path:`/results/navigation-${name}.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' overflow');}
try {
 await page.goto(base+'/admin');
 await page.getByRole('heading',{name:'Game collection',exact:true}).waitFor();
 await page.getByText('Loading collection…',{exact:true}).waitFor({state:'hidden'});
 assert.equal(await page.getByLabel('Password',{exact:true}).count(),0);
 assert.equal((await context.request.get(base+'/api/games')).status(),200);
 assert.equal((await context.cookies()).some(c=>c.name==='rules_session'),false);
 let nav=page.getByRole('navigation',{name:'Main navigation'});
 assert.equal(await nav.getByRole('link').count(),2);
 assert.equal(await nav.getByRole('link',{name:'Process rulebooks',exact:true}).getAttribute('aria-current'),'page');
 await shot('admin-desktop');
 await nav.getByRole('link',{name:'Rule search',exact:true}).click();
 await page.getByRole('region',{name:'Rule questions',exact:true}).waitFor();
 assert.equal(await page.getByRole('navigation').getByRole('link',{name:'Rule search',exact:true}).getAttribute('aria-current'),'page');
 await page.getByRole('button',{name:'Magyar',exact:true}).click();
 await page.getByRole('navigation').getByRole('link',{name:'Szabálykönyv feldolgozása',exact:true}).click();
 await page.getByRole('heading',{name:'Játékgyűjtemény',exact:true}).waitFor();
 assert.equal(await page.locator('html').getAttribute('lang'),'hu');
 for(const width of [768,390,320]) {
  await page.setViewportSize({width,height:844});
  await shot('admin-'+width);
 }
 await page.getByRole('button',{name:'Új játék',exact:true}).first().click();
 await page.getByRole('dialog').getByLabel(/A játék neve/).waitFor();
 await shot('dialog-mobile');
 await page.getByRole('dialog').getByRole('button',{name:'Bezárás',exact:true}).click();
 await page.getByRole('navigation').getByRole('link',{name:'Szabály keresése',exact:true}).click();
 await page.getByRole('region',{name:'Szabálykérdések',exact:true}).waitFor();
 await shot('player-mobile');
 assert.deepEqual(errors,[]);
 console.log('PASS: admin without login/cookies, two-item shared navigation, active page, English/Hungarian persistence, desktop/tablet/mobile and dialog. No document processing or AI requests.');
} finally {await browser.close();}
