// Old names are used only to migrate preferences saved by earlier releases.
const legacyKeys={
 'model-gender':'fitai-model-gender',
 'speech-language':'fitai-speech-language',
};

export function readSetting(name,storage){
 let value=null;
 try{
  storage??=globalThis.localStorage;
  const key=`sportx-${name}`,legacyKey=legacyKeys[name];
  value=storage.getItem(key);
  if(!legacyKey)return value;
  const legacy=storage.getItem(legacyKey);
  if(value===null&&legacy!==null){
   value=legacy;
   storage.setItem(key,value);
  }
  // Never discard the old value unless the new value was persisted.
  if(legacy!==null&&value!==null&&storage.getItem(key)===value)storage.removeItem(legacyKey);
 }catch{}
 return value;
}
