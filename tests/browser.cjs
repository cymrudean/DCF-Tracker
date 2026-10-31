const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000');await page.waitForFunction(()=>document.querySelector('#auth-message').textContent.includes('not been configured'));
 assert.equal(await page.locator('#tracker-app').isVisible(),false);assert.equal(await page.locator('#google-signin').isDisabled(),true);
 await context.route('**/auth-config.json',r=>r.fulfill({json:{supabaseUrl:'https://test.supabase.co',publishableKey:'sb_publishable_browser_test'}}));
 let row,approved=true,role='staff';
 await context.route('https://test.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url());let json;
  if(url.pathname==='/auth/v1/user')json={id:'11111111-1111-4111-8111-111111111111',email:'staff@example.test'};
  else if(url.pathname==='/rest/v1/allowed_accounts')json=approved?[{email:'staff@example.test',role}]:[];
  else if(url.pathname==='/rest/v1/tracker_records'){
   if(request.method()==='POST'){row=request.postDataJSON();json=null;}
   else if(request.method()==='PATCH'){const data=request.postDataJSON();if(url.searchParams.get('revision')==='eq.'+row.revision){row={...row,...data};json=[row]}else json=[];}
   else json=row?[row]:[];
  }else if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204});
  else throw Error('Unexpected API request '+url.pathname);
  await route.fulfill({json});
 });
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#google-signin').disabled);assert.equal(await page.locator('#tracker-app').isVisible(),false);
 await page.evaluate(()=>sessionStorage.setItem('nant-celyn-session',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:Date.now()+3600000})));
 approved=false;await page.reload();await page.waitForFunction(()=>document.querySelector('#auth-message').textContent.includes('not approved'));assert.equal(await page.locator('#tracker-app').isVisible(),false);
 approved=true;await page.reload();await page.waitForSelector('.skill-card');assert.equal(await page.locator('.skill-card').count(),18);
 await page.locator('.skill-card').first().getByRole('checkbox',{name:'Applied in context'}).check();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Changes saved to your school account.');
 await page.reload();await page.waitForSelector('.skill-card');assert.equal(await page.locator('.skill-card').first().getByRole('checkbox',{name:'Applied in context'}).isChecked(),true);
 await page.locator('.skill-card').first().locator('summary').click();await page.getByRole('textbox',{name:'Observation and next step'}).first().fill('Recognised familiar people during role play.');await page.getByRole('textbox',{name:'Evidence file link'}).first().fill('https://drive.google.com/file/d/example/view');await page.getByRole('button',{name:'+ Save observation'}).first().click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Changes saved to your school account.');
 await page.getByRole('button',{name:'Progress overview'}).click();assert.match(await page.locator('#overview-view').innerText(),/20% \(1\/5\)/);
 await page.getByRole('button',{name:'Add learner',exact:false}).click();await page.locator('#pupil-name').fill('Learner Two');await page.locator('#pupil-form').getByRole('button',{name:'Add learner',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Changes saved to your school account.');await page.getByRole('button',{name:'Skills tracker'}).click();assert.equal(await page.locator('input[type=checkbox]:checked').count(),0);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 role='pupil';await page.reload();await page.waitForSelector('.skill-card');assert.equal(await page.locator('#add-pupil').isVisible(),false);assert.equal(await page.locator('#import-button').isVisible(),false);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForSelector('#auth-screen',{state:'visible'});assert.equal(await page.evaluate(()=>sessionStorage.getItem('nant-celyn-session')),null);assert.equal(await page.locator('#tracker-app').isVisible(),false);
 assert.deepEqual(errors,[]);await browser.close();console.log('Browser checks passed: locked setup, logged-out/denied accounts, approved login, API persistence, observations, chart values, learner isolation, pupil controls, mobile layout and logout. API mocked; live OAuth/database policies untested.');
})().catch(e=>{console.error(e);process.exit(1)});
