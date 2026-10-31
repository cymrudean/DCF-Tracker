import {test} from 'node:test';
import assert from 'node:assert/strict';
import {progress,evidenceUrl,validBackup} from '../model.js';
import {readFileSync} from 'node:fs';
const skills=JSON.parse(readFileSync(new URL('../data/skills.json',import.meta.url)));
test('all workbook skills and four strands retained',()=>{assert.equal(skills.length,18);assert.equal(new Set(skills.map(s=>s.id)).size,18);assert.equal(new Set(skills.map(s=>s.strand)).size,4)});
test('independent assessment stages use correct element denominator',()=>{const p=progress(skills.slice(0,2),{'CIT-01':{checks:[true,false,true]}});assert.deepEqual(p.percentages,[50,0,50]);assert.deepEqual(progress([],{}).percentages,[0,0,0])});
test('evidence accepts supported providers and rejects unsafe or lookalike links',()=>{for(const u of ['https://drive.google.com/file/d/123','https://school.sharepoint.com/path','https://1drv.ms/abc'])assert.ok(evidenceUrl(u));for(const u of ['javascript:alert(1)','https://drive.google.com.evil.test/a','http://docs.google.com/a','https://user:pass@drive.google.com/a','https://evil.test'])assert.equal(evidenceUrl(u),null)});
test('backup validation rejects malformed checks and unsafe links',()=>{const x={version:1,pupils:[{id:'1',name:'Test',records:{'CIT-01':{checks:[true,false,false],observations:[]}}}]};assert.ok(validBackup(x,skills.map(s=>s.id)));x.pupils[0].records['CIT-01'].observations=[{date:'2026-10-31',stage:0,note:'test',url:'javascript:alert(1)'}];assert.equal(validBackup(x,skills.map(s=>s.id)),false)});
