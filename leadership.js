import {progress,validBackup} from './model.js';
export async function showLeadership(auth,recordOwner){
 const root=document.querySelector('#leadership');root.hidden=false;root.replaceChildren();
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 root.append(el('h2','Senior-leader overview'),el('p','Review staff registrations and saved learner records. Staff cannot see each other’s records.'));
 const [registrations,approvals,records,skills]=await Promise.all([
  auth.api('/rest/v1/staff_registrations?select=id,email,full_name,created_at&order=created_at.desc'),
  auth.api('/rest/v1/allowed_accounts?select=email,role'),
  auth.api('/rest/v1/tracker_records?select=owner_id,data'),
  fetch('./data/skills.json').then(r=>r.json())
 ]);
 const roles=new Map(approvals.map(a=>[a.email,a.role]));
 const label=el('label','View tracker records');const select=el('select');select.id='staff-record-select';select.setAttribute('aria-label','View staff tracker records');
 const own=el('option','My tracker');own.value=auth.user.id;select.append(own);
 for(const r of registrations.filter(r=>r.id!==auth.user.id)){
  const option=el('option',r.full_name+' · '+r.email);option.value=r.id;select.append(option);
 }
 select.value=recordOwner;
 select.onchange=()=>{const url=new URL(location.href);url.search='';if(select.value!==auth.user.id)url.searchParams.set('staff',select.value);location.assign(url.href);};
 label.append(select);root.append(label);
 const status=el('p','','leadership-status');status.setAttribute('role','status');root.append(status);
 const list=el('div',undefined,'staff-list');root.append(list);
 if(!registrations.length)list.append(el('p','No staff registrations yet.'));
 for(const r of registrations){
  const role=roles.get(r.email),card=el('article',undefined,'staff-entry');
  card.append(el('h3',r.full_name),el('p',r.email),el('p',['owner','admin'].includes(role)?'Administrator':role?'Approved · '+role:'Awaiting approval / access revoked'));
  const data=records.find(row=>row.owner_id===r.id)?.data;
  if(data&&validBackup(data,skills.map(s=>s.id))){
   const pupils=data.pupils;const applied=pupils.reduce((n,p)=>n+progress(skills,p.records).counts[2],0);
   card.append(el('p',`${pupils.length} learner record(s) · ${applied} applied-in-context checks`));
  }else card.append(el('p','No saved tracker records'));
  if(!['owner','admin'].includes(role)){
   const button=el('button',role?'Revoke access':'Approve staff account','secondary');
   button.onclick=async()=>{
    if(role&&!confirm('Revoke '+r.email+'’s tracker access? Existing records will be retained for senior-leader review.'))return;
    button.disabled=true;status.textContent='Updating account…';
    try{await auth.api('/rest/v1/rpc/review_staff_account',{method:'POST',body:JSON.stringify({account_id:r.id,approve:!role})});await showLeadership(auth,recordOwner);}
    catch{status.textContent='Could not update access. Check that the email is confirmed and your owner role is still active, then try again.';button.disabled=false;}
   };card.append(button);
  }
  list.append(card);
 }
}
