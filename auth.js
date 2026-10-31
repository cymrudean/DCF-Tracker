// Public Supabase configuration only. Never use a service-role/secret key here.
export function validateConfig(c) {
 if (!c || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.supabaseUrl) || typeof c.publishableKey !== 'string') return false;
 if(c.publishableKey.startsWith('sb_publishable_')) return c.publishableKey.length>20;
 try {return JSON.parse(atob(c.publishableKey.split('.')[1])).role==='anon';} catch {return false;}
}
export function serviceError(status,code){
 const reference=' (HTTP '+status+(code?'; '+code:'')+')';
 if(code==='PGRST205'||code==='42P01')return 'The database tables are missing or unavailable. In Supabase SQL Editor, run the latest supabase/schema.sql from GitHub, then reload.'+reference;
 if(code==='42501')return 'Database permission denied. In Supabase SQL Editor, run the latest supabase/schema.sql to apply the required access rules, then sign in again.'+reference;
 if(code==='42P17')return 'A database access rule has a recursion error. Apply the latest supabase/schema.sql in Supabase SQL Editor.'+reference;
 if(code==='42703'||code==='PGRST204'||code==='PGRST202')return 'The database setup is out of date. Run the latest supabase/schema.sql in Supabase SQL Editor, then reload.'+reference;
 if(status===401)return 'Your session or project key was not accepted. Sign out and sign in again; if it continues, check that auth-config.json uses the public key for the correct project.'+reference;
 return 'The school service could not complete this request. Share this error reference with your administrator.'+reference;
}
export function registrationError(status,code){
 const messages={
 email_address_not_authorized:'Supabase cannot send email to this address with its default email service. Your administrator must configure custom SMTP in Supabase Authentication email settings.',
 over_email_send_rate_limit:'Supabase’s email sending limit has been reached. Wait before requesting another email; your administrator should check email limits and configure production SMTP.',
 over_request_rate_limit:'Too many authentication requests. Wait before trying again.',
 signup_disabled:'New account registration is disabled. Your administrator must enable new user signups in Supabase Authentication settings.',
 email_provider_disabled:'Email/password sign-in is disabled. Enable the Email provider in Supabase Authentication settings.',
 weak_password:'Choose a stronger password of at least 12 characters that meets the school password settings.',
 email_not_confirmed:'Confirm your email address before signing in. Use the newest confirmation email.',
 invalid_credentials:'The email or password was not accepted. Check your details or use Forgot password.',
 unexpected_failure:'Supabase could not finish the request. Your administrator should check Authentication logs for email delivery errors or a failing database registration trigger.',
 email_address_invalid:'Enter a valid email address.',
 user_already_exists:'This email may already have an account. Try signing in or use Forgot password.',
 validation_failed:'The supplied details were not accepted. Check your email and password requirements.',
 captcha_failed:'The verification check failed. If CAPTCHA is enabled in Supabase, the app needs a matching CAPTCHA integration.'
 };
 return (messages[code]||'Account request failed. Your administrator should check Supabase Authentication logs for the matching request.')+' (HTTP '+status+(code?'; '+code:'')+')';
}
const SESSION='nant-celyn-session';
export async function authenticate() {
 const response=await fetch('./auth-config.json',{cache:'no-store'});
 const config=await response.json();
 if(!validateConfig(config)) throw new Error('Staff sign-in has not been configured. Ask your administrator to complete AUTH_SETUP.md.');
 let session;
 try {session=JSON.parse(sessionStorage.getItem(SESSION));}catch{}
 const redirect=new URL('./',location.href).href;
 function store(t){
  session={access_token:t.access_token,refresh_token:t.refresh_token,expires_at:Date.now()+t.expires_in*1000};
  sessionStorage.setItem(SESSION,JSON.stringify(session));
 }
 async function publicRequest(path,body){
  const r=await fetch(config.supabaseUrl+'/auth/v1/'+path,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){
   let code='';try{const failure=await r.json();if(typeof failure.code==='string'&&/^[a-z0-9_]{1,80}$/.test(failure.code))code=failure.code;}catch{}
   throw Error(registrationError(r.status,code));
  }
  return r.json();
 }
 const hash=new URLSearchParams(location.hash.slice(1));
 const params=new URLSearchParams(location.search);
 let recovery=false;
 if(hash.has('error')||params.has('error')){
  history.replaceState({},'',redirect);throw Error('The email link expired or was not accepted. Request a new link.');
 }
 if(hash.has('access_token')){
  recovery=hash.get('type')==='recovery';
  store({access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),expires_in:Number(hash.get('expires_in'))||3600});
  history.replaceState({},'',redirect);
  if(recovery)sessionStorage.setItem('nant-celyn-recovery','true');
 }
 let refreshing;
 async function accessToken(){
  if(!session)throw new Error('Please sign in again.');
  if(session.expires_at<Date.now()+60000){
   refreshing??=publicRequest('token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(store).finally(()=>{refreshing=undefined});await refreshing;
  }
  return session.access_token;
 }
 async function api(path,options={}){
  const bearer=await accessToken();
  const r=await fetch(config.supabaseUrl+path,{...options,headers:{apikey:config.publishableKey,Authorization:'Bearer '+bearer,'Content-Type':'application/json',...options.headers}});
  if(!r.ok) {
   let code='';try{const failure=await r.json();if(typeof failure.code==='string'&&/^[A-Z0-9_]{1,20}$/.test(failure.code))code=failure.code;}catch{}
   if(r.status===401)sessionStorage.removeItem(SESSION);
   throw Error(serviceError(r.status,code));
  }
  return r.status===204?null:r.json();
 }
 async function signIn(email,password){store(await publicRequest('token?grant_type=password',{email,password}));location.replace(redirect);}
 async function signUp(email,password,name){
  await publicRequest('signup?redirect_to='+encodeURIComponent(redirect),{email,password,data:{full_name:name}});
 }
 async function resetPassword(email){await publicRequest('recover?redirect_to='+encodeURIComponent(redirect),{email});}
 async function updatePassword(password){await api('/auth/v1/user',{method:'PUT',body:JSON.stringify({password})});sessionStorage.removeItem('nant-celyn-recovery');location.replace(redirect);}
 async function signOut(){try{if(session)await api('/auth/v1/logout',{method:'POST'});}finally{session=null;sessionStorage.removeItem(SESSION);sessionStorage.removeItem('nant-celyn-recovery');location.replace(redirect);}}
 const actions={signIn,signUp,resetPassword,updatePassword,signOut};
 if(!session)return actions;
 const user=await api('/auth/v1/user');
 if(sessionStorage.getItem('nant-celyn-recovery')==='true')return {...actions,recovery:true};
 const accounts=await api('/rest/v1/allowed_accounts?select=email,role&email=eq.'+encodeURIComponent(user.email.toLowerCase()));
 if(accounts.length!==1 || !['staff','pupil','owner','admin'].includes(accounts[0].role))return {...actions,denied:true};
 return {...actions,user,role:accounts[0].role,api};
}
