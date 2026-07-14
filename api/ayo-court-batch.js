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
function plain(value=''){return decode(value).replace(/<script(?![^>]*application\/ld\+json)[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function productNames(normalized=''){
 const names=[];
 const patterns=[
  /["']@type["']\s*:\s*["']Product["'][\s\S]{0,700}?["']name["']\s*:\s*["']([^"']+)["']/gi,
  /["']name["']\s*:\s*["']([^"']+)["'][\s\S]{0,700}?["']@type["']\s*:\s*["']Product["']/gi
 ];
 for(const pattern of patterns){for(const match of normalized.matchAll(pattern)){const name=plain(match[1]);if(name&&name.length<120)names.push(name)}}
 return [...new Set(names.map(name=>name.replace(/\s+/g,' ').trim()))];
}
function classifyProducts(names=[]){
 const excludedPattern=/\b(tennis|badminton|pickleball|mini\s*soccer|minisoccer|futsal|basket|basketball|squash|golf)\b/i;
 const padel=[];const excluded=[];const ambiguous=[];
 for(const name of names){
  if(excludedPattern.test(name)){excluded.push(name);continue}
  if(/\bpadel\b|\bcourt\b|\blapangan\b|\bfield\b|\bvip\b|\bregular\b|\breguler\b|\bblue\b|\bgreen\b|\bpink\b|\bpurple\b|\bterracotta\b/i.test(name))padel.push(name);
  else ambiguous.push(name);
 }
 return {padelProducts:[...new Set(padel)],excludedProducts:[...new Set(excluded)],ambiguousProducts:[...new Set(ambiguous)]};
}
function courtInfo(html=''){
 const normalized=decode(html),text=plain(html),evidence=[];
 const products=productNames(normalized);const classified=classifyProducts(products);
 const productCount=classified.padelProducts.length||null;
 for(const name of classified.padelProducts)evidence.push(`AYO Product: ${name}`);
 const explicit=[];
 const patterns=[
  /(?:memiliki|tersedia|terdapat|dengan|total)\s*(\d{1,2})\s*(?:buah|unit)?\s*(?:lapangan|court)s?\s*(?:padel)?/gi,
  /(\d{1,2})\s*(?:buah|unit)?\s*(?:lapangan|court)s?\s*(?:padel)/gi,
  /(\d{1,2})\s+(?:[a-z-]+\s+){0,3}padel\s*courts?/gi
 ];
 for(const pattern of patterns){for(const match of text.matchAll(pattern)){const n=Number(match[1]);if(n>=1&&n<=30){explicit.push(n);evidence.push(text.slice(Math.max(0,match.index-100),Math.min(text.length,match.index+match[0].length+140)))}}}
 const explicitCounts=[...new Set(explicit)];
 const numbered=[];
 for(const name of classified.padelProducts){const match=name.match(/(?:court|lapangan|field)\s*#?\s*(\d{1,2})/i);if(match)numbered.push(Number(match[1]))}
 const courtNumbers=[...new Set(numbered)].filter(n=>n>=1&&n<=30).sort((a,b)=>a-b);
 let numberedCount=null;if(courtNumbers.length&&courtNumbers[0]===1&&courtNumbers.every((n,i)=>n===i+1))numberedCount=courtNumbers.length;
 let courtTotal=productCount||null;let method=productCount?'ayo_product_count':'none';
 if(!courtTotal&&explicitCounts.length===1){courtTotal=explicitCounts[0];method='explicit_description'}
 if(!courtTotal&&numberedCount){courtTotal=numberedCount;method='numbered_products'}
 const conflicts=[];
 if(productCount&&explicitCounts.length===1&&productCount!==explicitCounts[0])conflicts.push(`Product count ${productCount} vs description ${explicitCounts[0]}`);
 return {courtTotal,method,productCount,numberedCount,explicitCounts,courtNumbers,...classified,evidence:[...new Set(evidence)].slice(0,10),conflicts};
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
   const info=courtInfo(html);
   const confidence=info.courtTotal&&info.conflicts.length===0&&info.method==='ayo_product_count'?'high':info.courtTotal?'medium':'none';
   return {name,found:true,venueUrl,title,confidence,verificationStatus:confidence==='high'?'verified':confidence==='medium'?'partially_verified':'needs_direct_confirmation',...info,attempts:[...attempts,{slug,status:response.status}]};
  }catch(error){attempts.push({slug,error:String(error.message||error)})}
 }
 return {name,found:false,courtTotal:null,confidence:'none',verificationStatus:'needs_direct_confirmation',attempts};
}
module.exports=async(req,res)=>{
 try{
  const all=loadVenues();const offset=Math.max(0,Number(req.query?.offset)||0);const limit=Math.min(3,Math.max(1,Number(req.query?.limit)||2));const batch=all.slice(offset,offset+limit);const rows=[];
  for(const venue of batch)rows.push({...await fetchVenue(venue.name),city:venue.city||'',province:venue.province||''});
  res.setHeader('Cache-Control','no-store');res.status(200).json({total:all.length,offset,limit,count:rows.length,next:offset+rows.length<all.length?offset+rows.length:null,rows});
 }catch(error){console.error('AYO court batch failed',error);res.status(500).json({error:String(error.message||error)})}
};
