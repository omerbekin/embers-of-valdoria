import { it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as save from '../../src/campaign/save';
import * as sync from '../../src/cloud/sync-core';
it('probe', () => {
  const blob = JSON.parse(readFileSync('C:/Users/Omer/AppData/Local/Temp/claude/C--Users-Omer-Projects-embers-of-valdoria/45992186-e545-4025-84b4-617ee8ed5a87/scratchpad/cloud-blob.json','utf8').replace(/^\uFEFF/,''));
  const m = new Map<string,string>();
  const kv:any = { getItem:(k:string)=>m.get(k)??null, setItem:(k:string,v:string)=>{m.set(k,v)}, removeItem:(k:string)=>{m.delete(k)} };
  const bundle = sync.bundleFromData({ 'eov.campaign.v1': blob['eov.campaign.v1'], 'eov.endless.v1': null, 'eov.endless.scores.v1': null, 'eov.tutorial.v1': blob['eov.tutorial.v1'] ?? null } as any, 'x', new Date().toISOString(), []);
  console.log('apply', JSON.stringify(sync.applyBundle(kv, bundle, 'x')));
  console.log('keys', [...m.keys()]);
  const r = save.readSaves(kv); console.log('read', r.corrupt, r.migrated, r.file.slots.map((s:any)=>s&&s.saves.length));
  console.log('migrate', save.migrateSaves(kv));
  console.log('summ', JSON.stringify(save.slotSummaries(kv).map((s:any)=>s&&s.saveCount)));
  console.log('latest', save.latestSave(kv)?.id);
  console.log('after keys', [...m.keys()], m.get('eov.campaign.v1')?.length);
});
