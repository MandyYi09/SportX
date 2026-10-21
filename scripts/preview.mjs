import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const args=process.argv.slice(2),get=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const secure=args.includes('--https');
const root=path.resolve(get('--directory','src')),port=Number(get('--port',secure?'5188':'5187'));
const host=get('--host','0.0.0.0');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.bin':'application/octet-stream','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'};
const handler=async(req,res)=>{try{
 if(req.url==='/fitai-dev-ca.cer'){const certificate=await fs.readFile('.local/https/fitai-dev-ca.cer');res.writeHead(200,{'Content-Type':'application/x-x509-ca-cert'});res.end(certificate);return;}
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+pathname);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 let info=await fs.stat(file);if(info.isDirectory()){file=path.join(file,'index.html');info=await fs.stat(file);}
 const data=await fs.readFile(file);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('Accept-Ranges','bytes');
 const match=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
 if(match){const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),data.length-1):data.length-1;if(start>end||start>=data.length){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});res.end();return;}res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));}
 else{res.writeHead(200,{'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);}
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end('File unavailable');}};
const server=secure?https.createServer({key:await fs.readFile('.local/https/server.key'),cert:await fs.readFile('.local/https/server.crt')},handler):http.createServer(handler);
server.on('error',error=>{console.error(`Preview failed: ${error.message}`);process.exitCode=1;});
server.listen(port,host,()=>{
 const protocol=secure?'https':'http';
 console.log(`Local preview: ${protocol}://127.0.0.1:${port} (${root})`);
 if(host==='0.0.0.0'){for(const addresses of Object.values(os.networkInterfaces()))for(const address of addresses||[])if(address.family==='IPv4'&&!address.internal)console.log(`LAN preview: ${protocol}://${address.address}:${port}`);}
 else console.log(`Listening on ${host}:${port}`);
});
