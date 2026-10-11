import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'src');
const output=path.join(root,'build');
// Only this generated output directory is replaced; the source is untouched.
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const entry of await readdir(source,{withFileTypes:true})) {
 if(entry.name.startsWith('.'))continue;
 await cp(path.join(source,entry.name),path.join(output,entry.name),{recursive:true,filter:p=>!path.basename(p).startsWith('.')});
}
console.log('Prepared hosting files in build/ from src/.');
