import {authenticate} from './auth.js';
// An exact school logo can be supplied without substituting an invented crest.
for (const img of document.querySelectorAll('.school-logo')) {
 img.onload=()=>{img.hidden=false;};
 if(img.complete && img.naturalWidth)img.hidden=false;
}
const message=document.querySelector('#auth-message'),button=document.querySelector('#google-signin');
try {
 const auth=await authenticate();
 button.onclick=()=>auth.signIn().catch(()=>{message.textContent='Could not start Google sign-in. Please try again.';});
 if(!auth.user){
  button.disabled=false;
  message.textContent=auth.denied?'This Google account is not approved. Contact your school administrator.':'';
  if(auth.denied){const out=document.querySelector('#auth-signout');out.hidden=false;out.onclick=auth.signOut;}
 }else{
  document.querySelector('#signout').onclick=auth.signOut;
  document.querySelector('#account-label').textContent=auth.user.email+' · '+auth.role;
  const {startTracker}=await import('./app.js');
  await startTracker(auth);
  document.querySelector('#auth-screen').hidden=true;
  document.querySelector('#tracker-app').hidden=false;
 }
}catch(error){message.textContent=error.message;const out=document.querySelector('#auth-signout');out.hidden=false;out.onclick=()=>{sessionStorage.removeItem('nant-celyn-session');sessionStorage.removeItem('nant-celyn-pkce');location.replace(new URL('./',location.href));};}
