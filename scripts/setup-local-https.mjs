import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {X509Certificate} from 'node:crypto';

const directory=path.resolve('.local/https');
await fs.mkdir(directory,{recursive:true});
const openssl=process.env.SPORTX_OPENSSL||(process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl');
const run=(...args)=>execFileSync(openssl,args,{cwd:directory,stdio:['ignore','ignore','pipe']});
await fs.writeFile(path.join(directory,'ca.cnf'),'[req]\ndistinguished_name=dn\nx509_extensions=ca\nprompt=no\n[dn]\nCN=SportX Local Development CA\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid:always\n');
let validRoot=false;
try{const certificate=new X509Certificate(await fs.readFile(path.join(directory,'ca.crt')));validRoot=certificate.ca&&certificate.checkIssued(certificate);}catch{}
if(!validRoot){
 try{await fs.access(path.join(directory,'ca.key'));}catch{run('genrsa','-out','ca.key','2048');}
 run('req','-x509','-key','ca.key','-out','ca.crt','-days','365','-config','ca.cnf');
}
const addresses=[...new Set(['127.0.0.1',...Object.values(os.networkInterfaces()).flat().filter(a=>a.family==='IPv4'&&!a.internal).map(a=>a.address)])];
await fs.writeFile(path.join(directory,'server.ext'),`basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\nsubjectAltName=DNS:localhost,${addresses.map(a=>'IP:'+a).join(',')}\n`);
run('req','-new','-newkey','rsa:2048','-nodes','-keyout','server.key','-out','server.csr','-subj','/CN=SportX Local Preview');
run('x509','-req','-in','server.csr','-CA','ca.crt','-CAkey','ca.key','-CAcreateserial','-out','server.crt','-days','90','-sha256','-extfile','server.ext');
run('x509','-in','ca.crt','-outform','DER','-out','sportx-dev-ca.cer');
console.log('Local HTTPS certificates ready. Start: node scripts/preview.mjs --https');
console.log('Install and trust sportx-dev-ca.cer on your phone; private keys stay in ignored .local/https/.');
