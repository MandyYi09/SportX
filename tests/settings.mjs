import assert from 'node:assert/strict';
import {readSetting} from '../src/settings.mjs';
function storage(entries={},failWrite=false){
 const data=new Map(Object.entries(entries));
 return {getItem:key=>data.get(key)??null,setItem(key,value){if(failWrite)throw Error('Quota exceeded');data.set(key,value);},removeItem:key=>data.delete(key)};
}
for(const [name,value] of [['model-gender','female'],['speech-language','zh']]){
 const old=`fitai-${name}`,key=`sportx-${name}`;
 const migrated=storage({[old]:value});
 assert.equal(readSetting(name,migrated),value);
 assert.equal(migrated.getItem(key),value);
 assert.equal(migrated.getItem(old),null);
 assert.equal(readSetting(name,migrated),value);
 const existing=storage({[old]:value,[key]:'newer'});
 assert.equal(readSetting(name,existing),'newer');
 assert.equal(existing.getItem(old),null);
 const blocked=storage({[old]:value},true);
 assert.equal(readSetting(name,blocked),value);
 assert.equal(blocked.getItem(old),value);
 assert.equal(blocked.getItem(key),null);
}
assert.equal(readSetting('model-gender',storage()),null);
assert.equal(readSetting('model-gender',{getItem(){throw Error('Access denied');}}),null);
console.log('Settings migration checks passed.');
