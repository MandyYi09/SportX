import {analyzeDynamic} from './rowing-dynamic.mjs';
self.onmessage=event=>{
 try{const {id,frames,options}=event.data;self.postMessage({result:analyzeDynamic(id,frames,options)});}
 catch(error){self.postMessage({error:error.message});}
};
