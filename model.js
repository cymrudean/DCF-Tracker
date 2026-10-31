export const stages = ['Explored together', 'Practising with support', 'Applied in context'];
export function progress(skills, records) {
 const counts = stages.map((_,i)=>skills.filter(s=>records[s.id]?.checks?.[i]).length);
 return {counts, percentages:counts.map(n=>skills.length ? Math.round(n/skills.length*100):0), total:skills.length};
}
export function evidenceUrl(raw) {
 try {const u=new URL(raw); const h=u.hostname.toLowerCase();
 if(u.protocol!=='https:' || u.username || u.password) return null;
 if(['drive.google.com','docs.google.com','onedrive.live.com','1drv.ms'].includes(h) || h.endsWith('.sharepoint.com')) return u.href;
 } catch {} return null;
}
export function validBackup(x, ids) {
 return x?.version===1 && Array.isArray(x.pupils) && x.pupils.length>0 && x.pupils.length<=500 && x.pupils.every(p=>typeof p.id==='string' && typeof p.name==='string' && p.name.length<=60 && p.records && typeof p.records==='object' && Object.entries(p.records).every(([id,r])=>ids.includes(id) && r && Array.isArray(r.checks) && r.checks.length===3 && r.checks.every(c=>typeof c==='boolean') && Array.isArray(r.observations) && r.observations.every(o=>typeof o.note==='string' && typeof o.date==='string' && Number.isInteger(o.stage) && o.stage>=0 && o.stage<3 && typeof o.url==='string' && (!o.url || evidenceUrl(o.url)))) ) && new Set(x.pupils.map(p=>p.id)).size===x.pupils.length;
}
