import {stages,progress,evidenceUrl,validBackup} from './model.js';
export async function startTracker(auth) {
const skills=await fetch('./data/skills.json').then(r=>{if(!r.ok)throw Error('Skills unavailable');return r.json()});
const $=s=>document.querySelector(s);
let state={version:1,pupils:[{id:crypto.randomUUID(),name:'Learner 1',records:{}}]};
let revision=0;
const requestedOwner=new URLSearchParams(location.search).get('staff');
const recordOwner=auth.role==='owner' && requestedOwner ? requestedOwner : auth.user.id;
const readOnly=recordOwner!==auth.user.id;
const rows=await auth.api('/rest/v1/tracker_records?select=data,revision&owner_id=eq.'+encodeURIComponent(recordOwner));
if(rows.length){
 if(!validBackup(rows[0].data,skills.map(s=>s.id)))throw Error('Stored records could not be read. Contact your administrator; no records have been replaced.');
 state=rows[0].data;revision=rows[0].revision;
}else if(!readOnly){
 await auth.api('/rest/v1/tracker_records',{method:'POST',body:JSON.stringify({owner_id:auth.user.id,data:state,revision:0})});
}else{
 state.pupils[0].name='No saved learner records';
}
if(auth.role==='pupil'||readOnly){
 $('#add-pupil').hidden=true;$('#import-button').hidden=true;
}
if(auth.role==='owner'){
 const {showLeadership}=await import('./leadership.js');
 await showLeadership(auth,recordOwner);
}
let saveQueue=Promise.resolve(),saveFailed=false;
window.addEventListener('beforeunload',e=>{if(pendingSaves){e.preventDefault();e.returnValue='';}});
let pendingSaves=0;
let selected=state.pupils[0].id, strand='All strands',tab='skills';
const strands=[...new Set(skills.map(s=>s.strand))];
const icons=['✧','⌘','◎','✎'];
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function notify(t){$('#notice').textContent=t;}
function pupil(){return state.pupils.find(p=>p.id===selected)}
function save(){
 if(saveFailed||readOnly)return;
 const data=JSON.parse(JSON.stringify(state));pendingSaves++;
 notify('Saving to your school account…');
 saveQueue=saveQueue.then(async()=>{
  if(saveFailed)return;
  const result=await auth.api('/rest/v1/tracker_records?owner_id=eq.'+encodeURIComponent(auth.user.id)+'&revision=eq.'+revision,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({data,revision:revision+1})});
  if(result.length!==1)throw Error('Records changed in another window. Export your changes, then reload before editing again.');
  revision=result[0].revision;
 }).catch(error=>{
  saveFailed=true;
  document.querySelectorAll('#tracker-app input, #tracker-app textarea, #tracker-app select, #tracker-app button:not(#export):not(#signout)').forEach(e=>e.disabled=true);
  notify('Changes have NOT been saved. '+error.message+' Export a backup now.');
 }).finally(()=>{pendingSaves--;if(!pendingSaves&&!saveFailed)notify('Changes saved to your school account.');});
}
function render(){
 $('#pupil').replaceChildren(...state.pupils.map(p=>{const o=el('option','',p.name);o.value=p.id;return o}));$('#pupil').value=selected;
 const p=progress(skills,pupil().records),started=skills.filter(s=>pupil().records[s.id]?.checks.some(Boolean)).length;
 $('#summary').replaceChildren(...[['Skills explored',`${started} / 18`,'Every discovery counts','✧'],['Applied in context',`${p.counts[2]} / 18`,'Learning brought to life','✓'],['DCF strands','4','Connected digital learning','▦']].map(([label,value,sub,icon])=>{const c=el('article','stat');c.append(el('span','stat-icon',icon),el('p','',label),el('strong','',value),el('small','',sub));return c}));
 $('#strand-tabs').replaceChildren(...['All strands',...strands].map((s,i)=>{const b=el('button',strand===s?'selected':'',(i?icons[i-1]+'  ':'')+s);b.onclick=()=>{strand=s;render()};return b}));
 const filtered=skills.filter(s=>(strand==='All strands'||s.strand===strand)&&[s.skill,s.element,s.activity,s.id].join(' ').toLowerCase().includes($('#search').value.toLowerCase())&&($('#status-filter').value==='all'||($('#status-filter').value==='applied'?pupil().records[s.id]?.checks[2]:!pupil().records[s.id]?.checks.some(Boolean))));
 $('#skills').replaceChildren(...filtered.map(card));if(!filtered.length)$('#skills').append(el('p','empty','No skills match these filters. Try another search.'));
 $('#skills-view').hidden=tab!=='skills';$('#overview-view').hidden=tab!=='overview';
 $('#view-title').textContent=tab==='skills'?'A little progress, every day':'See the bigger picture';
 $('#view-description').textContent=tab==='skills'?'Choose a strand to explore skills and capture learning.':'Each bar shows the percentage of skills evidenced at that stage. Stages are recorded independently.';
 renderOverview();
 if(readOnly){
  document.querySelectorAll('.checks input,.evidence-form input,.evidence-form select,.evidence-form textarea,.evidence-form button').forEach(e=>e.disabled=true);
  notify('Senior-leader view: these staff records are read-only.');
 }
}
function record(id){return pupil().records[id]??={checks:[false,false,false],observations:[]}}
function card(s){
 const c=el('article','skill-card');const top=el('div','skill-top');const text=el('div');text.append(el('span','skill-id',s.id+' · '+s.strand),el('h3','',s.skill),el('p','element',s.element));top.append(text);c.append(top);
 const checks=el('div','checks');stages.forEach((label,i)=>{const l=el('label','check stage'+i);const input=el('input');input.type='checkbox';input.checked=!!pupil().records[s.id]?.checks[i];input.onchange=()=>{record(s.id).checks[i]=input.checked;save();render()};l.append(input,el('span','',label));checks.append(l)});c.append(checks);
 const a=el('div','activity');a.append(el('span','','↗ Digital Den activity'),el('p','',s.activity));c.append(a);
 const details=el('details');details.append(el('summary','','Skill details & evidence ('+(pupil().records[s.id]?.observations.length||0)+')'));
 details.append(el('p','statement','DCF statement: '+s.statement),el('p','', 'Suggested AoLE: '+s.aole),el('p','', 'Try beyond Digital Den: '+s.example));
 const list=el('div','observations');(pupil().records[s.id]?.observations||[]).forEach(o=>{const item=el('div','observation');item.append(el('b','',o.date+' · '+stages[o.stage]),el('p','',o.note));if(o.url){const link=el('a','','Open linked work ↗');link.href=evidenceUrl(o.url);link.target='_blank';link.rel='noopener noreferrer';item.append(link)}list.append(item)});details.append(list);
 const form=el('form','evidence-form');const date=el('input');date.type='date';date.required=true;date.value=new Date().toLocaleDateString('en-CA');date.setAttribute('aria-label','Observation date');const stage=el('select');stage.setAttribute('aria-label','Observation stage');stages.forEach((v,i)=>{const o=el('option','',v);o.value=i;stage.append(o)});
 const note=el('textarea');note.placeholder='What did the learner do? Add the context and next step…';note.required=true;note.maxLength=3000;note.setAttribute('aria-label','Observation and next step');const url=el('input');url.type='url';url.placeholder='Google Drive or OneDrive / SharePoint file link (optional)';url.setAttribute('aria-label','Evidence file link');const submit=el('button','primary','+ Save observation');submit.type='submit';form.append(date,stage,note,url,el('small','','Link the specific piece of work. File sharing permissions remain controlled by your school.'),submit);
 form.onsubmit=e=>{e.preventDefault();if(url.value&&!evidenceUrl(url.value)){url.setCustomValidity('Use an HTTPS Google Drive, Google Docs, OneDrive or SharePoint link.');url.reportValidity();return}record(s.id).observations.push({date:date.value,stage:Number(stage.value),note:note.value.trim(),url:url.value?evidenceUrl(url.value):''});save();render()};url.oninput=()=>url.setCustomValidity('');details.append(form);c.append(details);return c;
}
function renderOverview(){const root=$('#overview-view');root.replaceChildren();for(const s of strands.filter(s=>strand==='All strands'||strand===s)){const group=skills.filter(x=>x.strand===s),box=el('article','chart');box.append(el('h3','',s));for(const name of ['All skills',...new Set(group.map(x=>x.element))]){const subset=name==='All skills'?group:group.filter(x=>x.element===name);const data=progress(subset,pupil().records);box.append(el('h4','',name+' · '+subset.length+' skills'));stages.forEach((label,i)=>{const row=el('div','bar-row'),track=el('div','track'),fill=el('div','fill s'+i);fill.style.width=data.percentages[i]+'%';track.append(fill);row.append(el('span','',label),track,el('b','',`${data.percentages[i]}% (${data.counts[i]}/${data.total})`));box.append(row)})}root.append(box)}}
$('#pupil').onchange=e=>{selected=e.target.value;render()};$('#search').oninput=render;$('#status-filter').onchange=render;
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));render()});
$('#add-pupil').onclick=()=>{if(!readOnly&&['staff','owner'].includes(auth.role))$('#pupil-dialog').showModal()};$('#cancel-pupil').onclick=()=>$('#pupil-dialog').close();$('#pupil-form').onsubmit=e=>{e.preventDefault();if(readOnly||!['staff','owner'].includes(auth.role))return;const name=$('#pupil-name').value.trim();if(!name)return;const p={id:crypto.randomUUID(),name,records:{}};state.pupils.push(p);selected=p.id;save();render();$('#pupil-dialog').close();$('#pupil-form').reset()};
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=el('a');a.href=u;a.download='nant-celyn-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
$('#import-button').onclick=()=>{if(!readOnly&&['staff','owner'].includes(auth.role))$('#import').click()};$('#import').onchange=async e=>{if(readOnly||!['staff','owner'].includes(auth.role))return;try{const file=e.target.files[0];if(!file)return;if(file.size>5000000)throw Error();const incoming=JSON.parse(await file.text());if(!validBackup(incoming,skills.map(s=>s.id)))throw Error();if(!confirm('Replace the records on this device with this backup? Export your current records first if needed.'))return;state=incoming;selected=state.pupils[0].id;save();render();notify('Backup loaded; saving to your school account…')}catch{notify('Could not restore this file. Choose a valid Digital Den JSON backup.')}finally{e.target.value=''}};
render();

}
