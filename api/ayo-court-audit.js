const AYO_HOST='https://ayo.co.id';

function slugify(value=''){
 return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function candidateSlugs(name=''){
 const values=[name,name.replace(/&/g,' '),name.replace(/\band\b/ig,' '),name.replace(/\bpadel\b/ig,' ').trim(),name.replace(/[!]/g,' ')];
 return [...new Set(values.map(slugify).filter(Boolean))];
}
function decode(value=''){
 return String(value).replace(/\\\//g,'/').replace(/\\u0026/gi,'&').replace(/\\u003a/gi,':').replace(/\\u0022/gi,'"').replace(/\\x22/gi,'"').replace(/&amp;/g,'&').replace(/&nbsp;/gi,' ').replace(/&quot;/gi,'"').replace(/&#39;/g,"'");
}
function plain(value=''){
 return decode(value).replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function courtInfo(html=''){
 const normalized=decode(html);const text=plain(html);const evidence=[];const numbers=[];
 const labels=[...normalized.matchAll(/(?:court|lapangan|field)[\s_:#-]*(\d{1,2})/gi)];
 for(const match of labels){const n=Number(match[1]);if(n>=1&&n<=30){numbers.push(n);evidence.push(normalized.slice(Math.max(0,match.index-100),Math.min(normalized.length,match.index+match[0].length+130)).replace(/\s+/g,' '))}}
 const nameFields=[...normalized.matchAll(/["'](?:court_?name|field_?name|venue_?court_?name)["']\s*:\s*["']([^"']+)["']/gi)];
 for(const match of nameFields){const m=match[1].match(/(\d{1,2})/);if(m){const n=Number(m[1]);if(n>=1&&n<=30)numbers.push(n)}evidence.push(match[0])}
 const countPatterns=[
  /(?:memiliki|tersedia|terdapat|dengan|total)\s*(\d{1,2})\s*(?:buah|unit)?\s*(?:lapangan|court)s?\s*(?:padel)?/gi,
  /(\d{1,2})\s*(?:buah|unit)?\s*(?:lapangan|court)s?\s*(?:padel)/gi,
  /(\d{1,2})\s*(?:indoor|outdoor|semi[- ]?indoor)?\s*padel\s*courts?/gi
 ];
 const explicit=[];
 for(const pattern of countPatterns){for(const match of text.matchAll(pattern)){const n=Number(match[1]);if(n>=1&&n<=30){explicit.push(n);evidence.push(text.slice(Math.max(0,match.index-100),Math.min(text.length,match.index+match[0].length+130)))}}}
 const unique=[...new Set(numbers)].sort((a,b)=>a-b);let numberedCount=null;
 if(unique.length&&unique[0]===1&&unique.every((n,i)=>n===i+1))numberedCount=unique.length;
 const explicitCounts=[...new Set(explicit)];
 const courtTotal=explicitCounts.length===1?explicitCounts[0]:numberedCount;
 return {courtTotal,numberedCount,explicitCounts,courtNumbers:unique,evidence:[...new Set(evidence)].slice(0,12)};
}
async function fetchVenue(slug){
 const venueUrl=`${AYO_HOST}/v/${encodeURIComponent(slug)}`;
 const response=await fetch(venueUrl,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (compatible; PadelSportIndonesia/1.0; +https://padelsport.vercel.app)','accept':'text/html,application/xhtml+xml'}});
 if(!response.ok)return null;
 const html=await response.text();
 const title=plain((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
 const info=courtInfo(html);
 const hasVenueAsset=/asset\.ayo\.co\.id\/image\/venue\//i.test(html);
 if(!hasVenueAsset&&!/venue|padel|court/i.test(title))return null;
 return {venueUrl,title,...info};
}
module.exports=async(req,res)=>{
 try{
  const name=String(req.query?.name||'').trim().slice(0,160);if(!name){res.status(400).json({error:'name required'});return}
  const attempts=[];let result=null;
  for(const slug of candidateSlugs(name)){
   const data=await fetchVenue(slug);attempts.push({slug,found:Boolean(data)});if(data){result=data;break}
  }
  res.setHeader('Cache-Control','no-store');
  if(!result){res.status(404).json({name,error:'Venue tidak ditemukan di AYO',attempts});return}
  const confidence=result.courtTotal&&result.explicitCounts.length===1&&result.numberedCount===result.courtTotal?'high':result.courtTotal?'medium':'none';
  res.status(200).json({name,source:'AYO Indonesia',confidence,verificationStatus:confidence==='high'?'verified':confidence==='medium'?'partially_verified':'needs_direct_confirmation',...result,attempts});
 }catch(error){console.error('AYO court audit failed',error);res.status(500).json({error:String(error.message||error)})}
};
