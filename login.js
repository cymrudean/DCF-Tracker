import {authenticate} from './auth.js';
// Also handle an email link opened into a tab already showing this app.
window.addEventListener('hashchange',()=>{if(new URLSearchParams(location.hash.slice(1)).has('access_token'))location.reload();});
for(const img of document.querySelectorAll('.school-logo')){
 img.onload=()=>{img.hidden=false;};if(img.complete&&img.naturalWidth)img.hidden=false;
}
const $=s=>document.querySelector(s),message=$('#auth-message'),form=$('#account-form');
let mode='login';
function setMode(next){
 mode=next;form.reset();
 $('#name-field').hidden=mode!=='register';$('#staff-name').required=mode==='register';
 $('#email').parentElement.hidden=mode==='recovery';$('#email').required=mode!=='recovery';
 $('#password-field').hidden=mode==='reset';$('#password').required=mode!=='reset';
 $('#password').minLength=mode==='login'?1:12;
 $('#password').autocomplete=mode==='login'?'current-password':'new-password';
 $('#account-submit').textContent={login:'Sign in',register:'Create account',reset:'Send password reset email',recovery:'Save new password'}[mode];
 $('#register-mode').hidden=mode!=='login';$('#reset-mode').hidden=mode!=='login';$('#login-mode').hidden=mode==='login'||mode==='recovery';
 message.textContent='';
}
try{
 const auth=await authenticate();
 $('#auth-signout').onclick=auth.signOut;
 if(!auth.user){
  for(const s of ['#account-submit','#register-mode','#reset-mode'])$(s).disabled=false;
  setMode(auth.recovery?'recovery':'login');
  $('#register-mode').onclick=()=>setMode('register');$('#reset-mode').onclick=()=>setMode('reset');$('#login-mode').onclick=()=>setMode('login');
  if(auth.denied){form.hidden=true;$('.auth-actions').hidden=true;$('#auth-signout').hidden=false;message.textContent='Your account is awaiting school approval, or access has been removed. Contact your senior leader.';}
  if(auth.recovery)$('#auth-signout').hidden=false;
  form.onsubmit=async e=>{
   e.preventDefault();$('#account-submit').disabled=true;message.textContent='Please wait…';
   const email=$('#email').value.trim(),password=$('#password').value;
   try{
    if(mode==='register'){
     const name=$('#staff-name').value.trim();if(!name)throw Error('Please enter your name.');
     await auth.signUp(email,password,name);form.reset();message.textContent='If registration can proceed, you will receive a confirmation email. Confirm your address, then wait for school approval before signing in.';
    }else if(mode==='reset'){
     await auth.resetPassword(email);form.reset();message.textContent='If an account exists for that address, a password reset email will arrive shortly.';
    }else if(mode==='recovery')await auth.updatePassword(password);
    else await auth.signIn(email,password);
   }catch(error){message.textContent=error.message;}finally{$('#password').value='';$('#account-submit').disabled=false;}
  };
 }else{
  $('#signout').onclick=auth.signOut;
  $('#account-label').textContent=auth.user.email+' · '+(['owner','admin'].includes(auth.role)?'Administrator':auth.role);
  const {startTracker}=await import('./app.js');await startTracker(auth);
  $('#auth-screen').hidden=true;$('#tracker-app').hidden=false;
 }
}catch(error){message.textContent=error.message;$('#auth-signout').hidden=false;$('#auth-signout').onclick=()=>{sessionStorage.removeItem('nant-celyn-session');sessionStorage.removeItem('nant-celyn-recovery');location.replace(new URL('./',location.href));};}
