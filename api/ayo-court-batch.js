const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const AYO_HOST='https://ayo.co.id';

function loadVenues(){
 const bundleDir=path.join(process.cwd(),'bundle');
 const encoded=[0,1,2,3].map(n=>fs.readFileSync(path.join(bundleDir,`padelsport.gz.b64.${String(n).padStart(2,'0')}`),'utf8').trim()).join('');
 const html=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
 const marker='const NATIONAL_POINTS = ';const start=html.indexOf(marker);if(start<0)return [];
 const from=start+marker.length;const close=html.indexOf('];',from);if(close<0)return [];
 return JSON.parse(html.slice(from,close+1).trim().replace(/\\"/g,'"').replace(/\\\\/g,'\\')).filter(row=>row.category==='padel');
}
function slugify(value=''){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function candidateSlugs(name=''){return [...new Set([name,name.replace(/&/g,' '),name.replace(/\band\b/ig,' '),name.replace(/\bpadel\b/ig,' ').trim(),name.replace(/[!]/g,' ')].map(slugify).filter(Boolean))]}
function decode(value=''){return String(value).replace(/\\\//g,'/').replace(/\\u0026/gi,'&').replace(/\\u003a/gi,':').replace(/\\u0022/gi,'"').replace(/\\x22/gi,'"').replace(/&amp;/g,'&').replace(/&nbsp;/gi,' ').replace(/&quot;/gi,'"').replace(/&#39;/g,"'")}
function plain(value=''){return decode(value).replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function courtInfo(html=''){
 const normalized=decode(html),text=plain(html),numbers=[],explicit=[],evidence=[];
 for(const match of normalized.matchAll(/(?:court|lapangan|field)[\s_:#-]*(\d{1,2})/gi)){const n=Number(match[1]);if(n>=1&&n<=30){numbers.push(n);evidence.push(normalized.slice(Math.max(0,match.index-80),Math.min(normalized.length,match.index+match[0].length+100)).replace(/\s+/g,' '))}}
 const patterns=[/(?:memiliki|tersedia|terdapat|dengan|total)\s*(\d{1,2})\s*(?:buah|unit)?\s*(?:lapangan|court)s?\s*(?:padel)?/gi,/(\d{1,2})\s*(?:buah|unit)?\s*(?:lapangan|court)s?\s*(?:padel)/gi,/(\d{1,2})\s*(?:indoor|outdoor|semi[- ]?indoor)?\s*padel\s*courts?/gi];
 for(const pattern of patterns){for(const match of text.matchAll(pattern)){const n=Number(match[1]);if(n>=1&&n<=30){explicit.push(n);evidence.push(text.slice(Math.max(0,match.index-90),Math.min(text.length,match.index+match[0].length+120)))}}}
 const unique=[...new Set(numbers)].sort((a,b)=>a-b),explicitCounts=[...new Set(explicit)];let numberedCount=null;
 if(unique.length&&unique[0]===1&&unique.every((n,i)=>n===i+1))numberedCount=unique.length;
 const courtTotal=explicitCounts.length===1?explicitCounts[0]:numberedCount;
 return {courtTotal,numberedCount,explicitCounts,courtNumbers:unique,evidence:[...new Set(evidence)].slice(0,5)};
}
async function fetchVenue(name){
 const attempts=[];
 for(const slug of candidateSlugs(name)){
  const venueUrl=`${AYO_HOST}/v/${encodeURIComponent(slug)}`;
  try{
   const response=await fetch(venueUrl,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (compatible; PadelSportIndonesia/1.0; +https://padelsport.vercel.app)','accept':'text/html,application/xhtml+xml'}});
   if(!response.ok){attempts.push({slug,status:response.status});continue}
   const html=await response.text();const title=plain((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
   if(!/asset\.ayo\.co\.id\/image\/venue\//i.test(html)&&!/venue|padel|court/i.test(title)){attempts.push({slug,status:response.status,invalid:true});continue}
   const info=courtInfo(html);const confidence=info.courtTotal&&info.explicitCounts.length===1&&info.numberedCount===info.courtTotal?'high':info.courtTotal?'medium':'none';
   return {name,found:true,venueUrl,title,confidence,verificationStatus:confidence==='high'?'verified':confidence==='medium'?'partially_verified':'needs_direct_confirmation',...info,attempts:[...attempts,{slug,status:response.status}]};
  }catch(error){attempts.push({slug,error:String(error.message||error)})}
 }
 return {name,found:false,courtTotal:null,confidence:'none',verificationStatus:'needs_direct_confirmation',attempts};
}
module.exports=async(req,res)=>{
 try{
  const all=loadVenues();const offset=Math.max(0,Number(req.query?.offset)||0);const limit=Math.min(5,Math.max(1,Number(req.query?.limit)||5));const batch=all.slice(offset,offset+limit);const rows=[];
  for(const venue of batch)rows.push({...await fetchVenue(venue.name),city:venue.city||'',province:venue.province||''});
  res.setHeader('Cache-Control','no-store');res.status(200).json({total:all.length,offset,limit,count:rows.length,next:offset+rows.length<all.length?offset+rows.length:null,rows});
 }catch(error){console.error('AYO court batch failed',error);res.status(500).json({error:String(error.message||error)})}
};
