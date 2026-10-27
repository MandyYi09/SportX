export function createFocusView(stage,onDismiss){
 const home=document.createElement('div');home.className='stage-home';stage.before(home);home.append(stage);
 let expanded=false,animation=null,generation=0,previousFocus=null;
 const background=[...document.querySelectorAll('header,.intro,.library,.details,footer,.studio > *')].filter(el=>el!==home&&el.tagName!=='DIALOG');
 const savedInert=new Map();
 const exit=document.getElementById('exit-focus');
 function setExpanded(next){
  if(next===expanded)return;expanded=next;const token=++generation;
  const from=stage.getBoundingClientRect();animation?.cancel();
  if(next){home.style.height=from.height+'px';if(!savedInert.size)previousFocus=document.activeElement;for(const el of background){if(!savedInert.has(el))savedInert.set(el,el.inert);el.inert=true;}document.body.classList.add('pose-focus');stage.classList.add('focus-active');exit.hidden=false;exit.focus({preventScroll:true});}
  const target=next?{left:0,top:0,width:window.innerWidth,height:window.innerHeight}:home.getBoundingClientRect();
  Object.assign(stage.style,{position:'fixed',left:target.left+'px',top:target.top+'px',width:target.width+'px',height:target.height+'px',zIndex:'100',borderRadius:next?'0px':'18px'});
  animation=stage.animate([{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px',borderRadius:next?'18px':'0px'},{left:target.left+'px',top:target.top+'px',width:target.width+'px',height:target.height+'px',borderRadius:next?'0px':'18px'}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:650,easing:'cubic-bezier(.22,1,.36,1)'});
  animation.finished.then(()=>{if(token!==generation)return;animation=null;if(!expanded){stage.removeAttribute('style');home.style.height='';stage.classList.remove('focus-active');document.body.classList.remove('pose-focus');exit.hidden=true;for(const [el,value]of savedInert)el.inert=value;savedInert.clear();previousFocus?.focus?.({preventScroll:true});}}).catch(()=>{});
 }
 exit.onclick=onDismiss;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded&&!document.querySelector('dialog[open]')){e.preventDefault();onDismiss();}});
 window.addEventListener('resize',()=>{if(expanded){animation?.cancel();animation=null;Object.assign(stage.style,{left:'0px',top:'0px',width:window.innerWidth+'px',height:window.innerHeight+'px'});}});
 return {setExpanded};
}
