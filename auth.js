// Public Supabase configuration only. Never use a service-role/secret key here.
export function validateConfig(c) {
 if (!c || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.supabaseUrl) || typeof c.publishableKey !== 'string') return false;
 if(c.publishableKey.startsWith('sb_publishable_')) return c.publishableKey.length>20;
 try {return JSON.parse(atob(c.publishableKey.split('.')[1])).role==='anon';} catch {return false;}
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
  if(!r.ok)throw Error('The request could not be completed. Check your details and confirmation email, then try again. If it continues, contact your administrator.');
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
  if(!r.ok) {if(r.status===401){sessionStorage.removeItem(SESSION);throw Error('Your session expired. Sign out and sign in again.');}throw Error('The school service could not complete this request. Check your connection or contact your administrator.');}
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
 if(accounts.length!==1 || !['staff','pupil','owner'].includes(accounts[0].role))return {...actions,denied:true};
 return {...actions,user,role:accounts[0].role,api};
}
