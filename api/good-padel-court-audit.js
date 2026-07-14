const URL='https://www.thegoodpadelclub.com/';
const BRANCH_CITY={'alam sutera':'Tangerang','ciumbuleuit':'Bandung','cilandak':'South Jakarta','sawangan':'Depok','cimahi':'Bandung','manyar':'Surabaya','manado':'Sulawesi'};
function decode(value=''){return String(value).replace(/\\u([0-9a-f]{4})/gi,(_,x)=>String.fromCharCode(parseInt(x,16))).replace(/\\x([0-9a-f]{2})/gi,(_,x)=>String.fromCharCode(parseInt(x,16))).replace(/\\\//g,'/').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")}
function plain(value=''){return decode(value).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function escapeRegExp(value=''){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function matchesFor(html,branch){
 const lower=html.toLowerCase(),needle=branch.toLowerCase(),city=BRANCH_CITY[needle]||'',rows=[];let from=0;
 while(true){
  const index=lower.indexOf(needle,from);if(index<0)break;
  const rawBefore=html.slice(Math.max(0,index-160),index),afterRaw=html.slice(index,Math.min(html.length,index+9000)),after=plain(afterRaw);
  const courtMatch=after.match(/(?:Club Facilities|Fasilitas Klub)[\s\S]{0,500}?•?\s*(\d{1,2})\s+(Covered|Indoor|Canopy|Outdoor|Semi[- ]?indoor)?\s*(?:Doubles?|Ganda)?\s*(?:Courts?|Lapangan)/i);
  if(courtMatch){
   const value=Number(courtMatch[1]),type=[courtMatch[2],/Ganda/i.test(courtMatch[0])?'Doubles':''].filter(Boolean).join(' ').trim(),distance=after.indexOf(courtMatch[0]),segment=after.slice(0,distance),academyPos=segment.search(/Amare Academy/i),exactHeading=city?new RegExp(`${escapeRegExp(city)}\\s+${escapeRegExp(branch)}[\\s\\S]{0,180}Amare Academy`,'i').test(segment):new RegExp(`${escapeRegExp(branch)}[\\s\\S]{0,180}Amare Academy`,'i').test(segment),branchAcademy=new RegExp(`${escapeRegExp(branch)}[\\s\\S]{0,220}Amare Academy`,'i').test(segment),urlLike=/instagram\.com\/[^\s"']*$/i.test(rawBefore)||/[a-z0-9._-]$/i.test(rawBefore)&&/^[a-z0-9._-]/i.test(branch),score=(exactHeading?20:0)+(branchAcademy?10:0)+(academyPos>=0&&academyPos<distance?5:0)+(distance<600?5:distance<1800?3:0)-(urlLike?12:0);
   rows.push({value,type,score,index,distance,exactHeading,branchAcademy,evidence:after.slice(0,Math.min(after.length,distance+courtMatch[0].length+250))});
  }
  from=index+needle.length;
 }
 return rows.sort((a,b)=>b.score-a.score||a.distance-b.distance);
}
module.exports=async(req,res)=>{try{const branch=String(req.query?.branch||'').trim();if(!branch){res.status(400).json({error:'branch required, e.g. Alam Sutera or Ciumbuleuit'});return}const response=await fetch(URL,{headers:{'user-agent':'PadelSportIndonesia/1.0','accept':'text/html'}}),html=decode(await response.text()),matches=matchesFor(html,branch),best=matches[0]||null;res.setHeader('Cache-Control','no-store');res.status(200).json({branch,source:'Official The Good Padel Club website',sourceUrl:URL,status:response.status,courtTotal:best?.value??null,courtType:best?.type||'',confidence:best&&best.exactHeading?'high':best&&best.branchAcademy?'medium':'none',bestMatch:best,allMatches:matches.slice(0,10)})}catch(error){console.error(error);res.status(500).json({error:String(error.stack||error)})}};
