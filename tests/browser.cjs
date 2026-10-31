const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000');await page.waitForFunction(()=>document.querySelector('#auth-message').textContent.includes('not been configured'));
 assert.equal(await page.locator('#tracker-app').isVisible(),false);assert.equal(await page.locator('#account-submit').isDisabled(),true);
 await context.route('**/auth-config.json',r=>r.fulfill({json:{supabaseUrl:'https://test.supabase.co',publishableKey:'sb_publishable_browser_test'}}));
 let row,approved=true,role='staff',signupBody,resetRequested=false;
 const staffId='11111111-1111-4111-8111-111111111111',ownerId='22222222-2222-4222-8222-222222222222';
 await context.route('https://test.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url());let json;
  if(url.pathname==='/auth/v1/signup'){signupBody=request.postDataJSON();json={user:{id:staffId},session:null};}
  else if(url.pathname==='/auth/v1/recover'){resetRequested=true;json={};}
  else if(url.pathname==='/auth/v1/token')json={access_token:'test-token',refresh_token:'test-refresh',expires_in:3600};
  else if(url.pathname==='/auth/v1/user')json={id:role==='owner'?ownerId:staffId,email:role==='owner'?'owner@example.test':'staff@example.test'};
  else if(url.pathname==='/rest/v1/allowed_accounts')json=approved?(role==='owner'&&!url.searchParams.has('email')?[{email:'staff@example.test',role:'staff'},{email:'owner@example.test',role:'owner'}]:[{email:role==='owner'?'owner@example.test':'staff@example.test',role}]):[];
  else if(url.pathname==='/rest/v1/staff_registrations')json=[{id:staffId,email:'staff@example.test',full_name:'Test Staff',created_at:new Date().toISOString()}];
  else if(url.pathname==='/rest/v1/rpc/review_staff_account')json=null;
  else if(url.pathname==='/rest/v1/tracker_records'){
   if(request.method()==='POST'){row=request.postDataJSON();json=null;}
   else if(request.method()==='PATCH'){const data=request.postDataJSON();if(url.searchParams.get('revision')==='eq.'+row.revision){row={...row,...data};json=[row]}else json=[];}
   else json=row&&(!url.searchParams.has('owner_id')||url.searchParams.get('owner_id')==='eq.'+row.owner_id)?[row]:[];
  }else if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204});
  else throw Error('Unexpected API request '+url.pathname);
  await route.fulfill({json});
 });
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#account-submit').disabled);assert.equal(await page.locator('#tracker-app').isVisible(),false);
 await page.getByRole('button',{name:'Create a staff account'}).click();await page.locator('#staff-name').fill('Test Staff');await page.locator('#email').fill('staff@example.test');await page.locator('#password').fill('example-passphrase-123');await page.locator('#account-submit').click();await page.waitForFunction(()=>document.querySelector('#auth-message').textContent.includes('confirmation email'));assert.equal(signupBody.data.full_name,'Test Staff');assert.equal(signupBody.data.role,undefined);
 await page.getByRole('button',{name:'Back to sign in'}).click();await page.getByRole('button',{name:'Forgot password?'}).click();await page.locator('#email').fill('staff@example.test');await page.locator('#account-submit').click();await page.waitForFunction(()=>document.querySelector('#auth-message').textContent.includes('If an account exists'));assert.equal(resetRequested,true);
 await page.getByRole('button',{name:'Back to sign in'}).click();approved=false;await page.locator('#email').fill('staff@example.test');await page.locator('#password').fill('example-passphrase-123');await page.locator('#account-submit').click();await page.waitForFunction(()=>document.querySelector('#auth-message').textContent.includes('awaiting school approval'));assert.equal(await page.locator('#tracker-app').isVisible(),false);
 approved=true;await page.reload();await page.waitForSelector('.skill-card');assert.equal(await page.locator('.skill-card').count(),18);
 await page.locator('.skill-card').first().getByRole('checkbox',{name:'Applied in context'}).check();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Changes saved to your school account.');
 await page.reload();await page.waitForSelector('.skill-card');assert.equal(await page.locator('.skill-card').first().getByRole('checkbox',{name:'Applied in context'}).isChecked(),true);
 await page.locator('.skill-card').first().locator('summary').click();await page.getByRole('textbox',{name:'Observation and next step'}).first().fill('Recognised familiar people during role play.');await page.getByRole('textbox',{name:'Evidence file link'}).first().fill('https://drive.google.com/file/d/example/view');await page.getByRole('button',{name:'+ Save observation'}).first().click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Changes saved to your school account.');
 await page.getByRole('button',{name:'Progress overview'}).click();assert.match(await page.locator('#overview-view').innerText(),/20% \(1\/5\)/);
 await page.getByRole('button',{name:'Add learner',exact:false}).click();await page.locator('#pupil-name').fill('Learner Two');await page.locator('#pupil-form').getByRole('button',{name:'Add learner',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Changes saved to your school account.');await page.getByRole('button',{name:'Skills tracker'}).click();assert.equal(await page.locator('input[type=checkbox]:checked').count(),0);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 role='owner';await page.goto('http://localhost:3000/?staff='+staffId);await page.waitForSelector('#leadership',{state:'visible'});assert.match(await page.locator('#leadership').innerText(),/Test Staff/);assert.equal(await page.locator('#add-pupil').isVisible(),false);assert.equal(await page.locator('.skill-card').first().getByRole('checkbox',{name:'Applied in context'}).isDisabled(),true);assert.match(await page.locator('#notice').innerText(),/read-only/);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForSelector('#auth-screen',{state:'visible'});assert.equal(await page.evaluate(()=>sessionStorage.getItem('nant-celyn-session')),null);assert.equal(await page.locator('#tracker-app').isVisible(),false);
 await page.goto('http://localhost:3000/#access_token=test-token&refresh_token=test-refresh&expires_in=3600&type=recovery');await page.waitForFunction(()=>document.querySelector('#account-submit').textContent==='Save new password');assert.equal(await page.locator('#tracker-app').isVisible(),false);await page.locator('#password').fill('new-passphrase-456789');await page.locator('#account-submit').click();await page.waitForSelector('#tracker-app',{state:'visible'});assert.equal(await page.evaluate(()=>sessionStorage.getItem('nant-celyn-recovery')),null);
 assert.deepEqual(errors,[]);await browser.close();console.log('Browser checks passed: locked setup, self-registration, password reset/recovery completion, pending approval denial, email/password login, API persistence, charts, learner isolation, mobile layout, owner read-only staff view and logout. Auth API mocked; production email delivery untested.');
})().catch(e=>{console.error(e);process.exit(1)});
