import { cp, mkdir, readdir, rm, readFile, writeFile } from 'node:fs/promises';
import {createHash} from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'src');
const output=path.join(root,'build');
// One deterministic version for the complete module graph avoids mixing cached
// code from different releases. Shared modules keep exactly the same URL.
const code=[];
async function collect(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  if(entry.name.startsWith('.'))continue;
  const file=path.join(directory,entry.name);
  if(entry.isDirectory())await collect(file);
  else if(/\.(?:m?js|css|html)$/.test(entry.name))code.push({file,relative:path.relative(source,file),text:await readFile(file,'utf8')});
 }
}
await collect(source);code.sort((a,b)=>a.relative.localeCompare(b.relative));
const digest=createHash('sha256');for(const item of code)digest.update(item.relative.replaceAll('\\','/')).update('\0').update(item.text).update('\0');
const version=digest.digest('hex').slice(0,12);
// Only this generated output directory is replaced; the source is untouched.
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const entry of await readdir(source,{withFileTypes:true})) {
 if(entry.name.startsWith('.'))continue;
 await cp(path.join(source,entry.name),path.join(output,entry.name),{recursive:true,filter:p=>!path.basename(p).startsWith('.')});
}
for(const item of code){
 let text=item.text;
 if(/\.m?js$/.test(item.relative))text=text.replace(/(['"])(\.{1,2}\/[^'"\s]+?\.m?js)(?:\?[^'"]*)?\1/g,(_,quote,file)=>`${quote}${file}?v=${version}${quote}`);
 if(item.relative.endsWith('.html'))text=text.replace(/((?:src|href)=["'])([^"'\s?#]+\.(?:m?js|css))(?:\?[^"']*)?(["'])/g,(match,before,file,after)=>/^(?:[a-z]+:|\/\/)/i.test(file)?match:`${before}${file}?v=${version}${after}`);
 await writeFile(path.join(output,item.relative),text);
}
console.log(`Prepared hosting files in build/ from src/ (release ${version}).`);
