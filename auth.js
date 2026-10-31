// Public Supabase configuration only. Never use a service-role/secret key here.
export function validateConfig(c) {
 if (!c || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.supabaseUrl) || typeof c.publishableKey !== 'string') return false;
 if(c.publishableKey.startsWith('sb_publishable_')) return c.publishableKey.length>20;
 try {return JSON.parse(atob(c.publishableKey.split('.')[1])).role==='anon';} catch {return false;}
}
const SESSION='nant-celyn-session', VERIFIER='nant-celyn-pkce';
const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export async function authenticate() {
 const response=await fetch('./auth-config.json',{cache:'no-store'});
 const config=await response.json();
 if(!validateConfig(config)) throw new Error('School sign-in has not been configured. Ask your administrator to complete AUTH_SETUP.md.');
 let session;
 try {session=JSON.parse(sessionStorage.getItem(SESSION));}catch{}
 const redirect=new URL('./',location.href).href;
 async function token(body,grant){
  const r=await fetch(config.supabaseUrl+'/auth/v1/token?grant_type='+grant,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw new Error('Sign-in could not be completed. Please try again.');
  const t=await r.json();session={access_token:t.access_token,refresh_token:t.refresh_token,expires_at:Date.now()+t.expires_in*1000};sessionStorage.setItem(SESSION,JSON.stringify(session));
 }
 const params=new URLSearchParams(location.search);
 if(params.has('error')||params.has('error_description')){history.replaceState({},'',redirect);sessionStorage.removeItem(VERIFIER);throw new Error('Google sign-in was cancelled or denied. Please try again.');}
 if(params.has('code')){
  const verifier=sessionStorage.getItem(VERIFIER);sessionStorage.removeItem(VERIFIER);history.replaceState({},'',redirect);
  if(!verifier)throw new Error('Your sign-in request expired. Please try again in this browser tab.');
  await token({auth_code:params.get('code'),code_verifier:verifier},'pkce');
 }
 let refreshing;
 async function accessToken(){
  if(!session)throw new Error('Please sign in again.');
  if(session.expires_at<Date.now()+60000){
   refreshing??=token({refresh_token:session.refresh_token},'refresh_token').finally(()=>{refreshing=undefined});await refreshing;
  }
  return session.access_token;
 }
 async function api(path,options={}){
  const bearer=await accessToken();
  const r=await fetch(config.supabaseUrl+path,{...options,headers:{apikey:config.publishableKey,Authorization:'Bearer '+bearer,'Content-Type':'application/json',...options.headers}});
  if(!r.ok) {if(r.status===401){sessionStorage.removeItem(SESSION);throw Error('Your session expired. Sign out and sign in again.');}throw Error('The school service could not complete this request. Check your connection or contact your administrator.');}
  return r.status===204?null:r.json();
 }
 async function signIn(){
  const bytes=crypto.getRandomValues(new Uint8Array(48)),verifier=base64url(bytes);
  sessionStorage.setItem(VERIFIER,verifier);
  const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const url=new URL(config.supabaseUrl+'/auth/v1/authorize');
  url.search=new URLSearchParams({provider:'google',redirect_to:redirect,code_challenge:challenge,code_challenge_method:'s256',scopes:'email profile'}).toString();
  location.assign(url.href);
 }
 async function signOut(){try{if(session)await api('/auth/v1/logout',{method:'POST'});}finally{session=null;sessionStorage.removeItem(SESSION);sessionStorage.removeItem(VERIFIER);location.replace(redirect);}}
 if(!session)return {signIn,signOut};
 const user=await api('/auth/v1/user');
 const accounts=await api('/rest/v1/allowed_accounts?select=email,role');
 if(accounts.length!==1 || !['staff','pupil'].includes(accounts[0].role))return {signIn,signOut,denied:true};
 return {user,role:accounts[0].role,api,signIn,signOut};
}
