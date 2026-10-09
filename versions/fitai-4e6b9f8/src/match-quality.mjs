export function matchQuality(metrics){
 if(!metrics.length||metrics.some(m=>!Number.isFinite(m.delta)))return null;
 const mean=metrics.reduce((sum,m)=>sum+m.delta,0)/metrics.length;
 const worst=Math.max(...metrics.map(m=>m.delta));
 const error=mean*.6+worst*.4;
 const close=metrics.every(m=>m.close);
 return {band:close?'green':error<40?'orange':'red',label:close?'Close to reference':error<40?'Some adjustments':'Different from reference',error};
}
