const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

function loadVenues(){
  const bundleDir=path.join(process.cwd(),'bundle');
  const encoded=[0,1,2,3].map(n=>fs.readFileSync(path.join(bundleDir,`padelsport.gz.b64.${String(n).padStart(2,'0')}`),'utf8').trim()).join('');
  const html=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
  const marker='const NATIONAL_POINTS = ';
  const start=html.indexOf(marker);if(start<0)return [];
  const from=start+marker.length;const close=html.indexOf('];',from);if(close<0)return [];
  const raw=html.slice(from,close+1).trim().replace(/\\"/g,'"').replace(/\\\\/g,'\\');
  return JSON.parse(raw).filter(row=>row.category==='padel');
}

const decode=value=>String(value||'').replace(/\\x3d/gi,'=').replace(/\\x26/gi,'&').replace(/\\x2f/gi,'/').replace(/\\u003d/gi,'=').replace(/\\u0026/gi,'&').replace(/\\u002f/gi,'/').replace(/\\\//g,'/').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
const strip=value=>decode(String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim();
const hostOf=url=>{try{return new URL(url).hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}};
const safeUrl=raw=>{try{const u=new URL(decode(raw));if(u.hostname.includes('duckduckgo.com')&&u.searchParams.get('uddg'))return decodeURIComponent(u.searchParams.get('uddg'));return u.href}catch{return ''}};

async function fetchText(url,timeout=10000){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36','accept-language':'id-ID,id;q=0.9,en;q=0.8'}});
    return {status:response.status,url:response.url,text:await response.text()};
  }catch(error){return {status:0,url,error:String(error.message||error),text:''}}finally{clearTimeout(timer)}
}

function parseDuck(html=''){
  const rows=[];const re=/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let match;
  while((match=re.exec(html))){
    const url=safeUrl(match[1]);if(!url)continue;
    const tail=html.slice(re.lastIndex,re.lastIndex+1800);
    const snippet=tail.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\//i);
    rows.push({title:strip(match[2]),url,snippet:strip(snippet?.[1]||''),engine:'duckduckgo'});
  }
  return rows;
}

function parseBing(html=''){
  const rows=[];const re=/<li class=["']b_algo["'][\s\S]*?<h2><a href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a><\/h2>([\s\S]*?)<\/li>/gi;let match;
  while((match=re.exec(html))){
    const url=safeUrl(match[1]);if(!url)continue;
    const snippet=match[3].match(/<p>([\s\S]*?)<\/p>/i);
    rows.push({title:strip(match[2]),url,snippet:strip(snippet?.[1]||''),engine:'bing'});
  }
  return rows;
}

async function searchWeb(query){
  const duck=await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
  let rows=parseDuck(duck.text);
  if(rows.length<4){const bing=await fetchText(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=id-ID`);rows=[...rows,...parseBing(bing.text)]}
  const seen=new Set();return rows.filter(row=>{const key=row.url.replace(/\/$/,'');if(seen.has(key))return false;seen.add(key);return true}).slice(0,10);
}

function extractCandidates(text=''){
  const clean=strip(text).toLowerCase();const candidates=[];
  const patterns=[
    /(?:memiliki|mempunyai|tersedia|dengan|terdapat|menawarkan|punya|terdiri dari)\s*(\d{1,2})\s*(?:buah|unit)?\s*(?:lapangan|court)s?\s*(?:padel)?/gi,
    /(\d{1,2})\s*(?:buah|unit)?\s*(?:lapangan|court)s?\s*(?:padel)/gi,
    /(\d{1,2})\s*(?:indoor|outdoor|semi[- ]?indoor)?\s*padel\s*courts?/gi,
    /(?:lapangan|court)s?\s*(?:padel)?\s*(?:sebanyak|total|ada|:|-)?\s*(\d{1,2})/gi
  ];
  for(const pattern of patterns){for(const match of clean.matchAll(pattern)){const value=Number(match[1]);if(value>=1&&value<=20)candidates.push({value,evidence:clean.slice(Math.max(0,match.index-120),Math.min(clean.length,match.index+match[0].length+160))})}}
  const numbered=[...clean.matchAll(/\bcourt\s*(\d{1,2})\b/gi)].map(m=>Number(m[1])).filter(n=>n>=1&&n<=20);
  if(numbered.length>=2){const uniq=[...new Set(numbered)].sort((a,b)=>a-b);const max=Math.max(...uniq);if(uniq[0]===1&&uniq.length===max)candidates.push({value:max,evidence:`Daftar booking menampilkan Court 1 sampai Court ${max}`})}
  return candidates;
}

function rankSource(url=''){
  const host=hostOf(url);
  if(/ayo\.co\.id$|courtside\.id$|sporta\.id$|bookandgo\.app$/.test(host))return 6;
  if(/instagram\.com$/.test(host))return 5;
  if(/kompas|detik|tempo|kumparan|antaranews|tribunnews|jawapos/.test(host))return 4;
  return 2;
}

function relevance(row,venue){
  const text=`${row.title} ${row.snippet} ${row.url}`.toLowerCase();
  const words=String(venue.name).toLowerCase().split(/\s+/).filter(word=>word.length>2);
  let score=words.reduce((total,word)=>total+(text.includes(word)?2:0),0);
  if(venue.city&&text.includes(String(venue.city).toLowerCase()))score+=2;
  if(/padel|court|lapangan/.test(text))score+=2;
  return score;
}

async function auditVenue(venue){
  const queries=[`"${venue.name}" ${venue.city||''} jumlah court padel`,`"${venue.name}" ${venue.city||''} lapangan padel`,`"${venue.name}" padel courts`];
  const resultMap=new Map();
  for(const query of queries){for(const row of await searchWeb(query)){const key=row.url.replace(/\/$/,'');const current=resultMap.get(key);if(!current||relevance(row,venue)>relevance(current,venue))resultMap.set(key,{...row,query})}}
  const results=[...resultMap.values()].sort((a,b)=>relevance(b,venue)-relevance(a,venue)).slice(0,8);
  const evidence=[];
  for(const row of results){
    for(const item of extractCandidates(`${row.title} ${row.snippet}`))evidence.push({...item,sourceType:'search_snippet',sourceUrl:row.url,sourceTitle:row.title,query:row.query,sourceRank:rankSource(row.url)});
  }
  for(const row of results.filter(row=>!/(instagram|facebook|tiktok)\.com/.test(hostOf(row.url))).slice(0,4)){
    const page=await fetchText(row.url,9000);if(page.status<200||page.status>=400)continue;
    for(const item of extractCandidates(page.text))evidence.push({...item,sourceType:'page_content',sourceUrl:row.url,sourceTitle:row.title,query:row.query,sourceRank:rankSource(row.url)+2});
  }
  const grouped={};for(const item of evidence){const key=String(item.value);(grouped[key]||(grouped[key]=[])).push(item)}
  const ranked=Object.entries(grouped).map(([value,items])=>({value:Number(value),score:items.reduce((sum,item)=>sum+item.sourceRank,0),sourceCount:new Set(items.map(item=>item.sourceUrl)).size,pageEvidence:items.some(item=>item.sourceType==='page_content'),items})).sort((a,b)=>b.score-a.score||b.sourceCount-a.sourceCount);
  const best=ranked[0]||null;
  const confidence=!best?'none':best.pageEvidence&&best.sourceCount>=2&&best.score>=12?'high':best.score>=6?'medium':'low';
  return {name:venue.name,city:venue.city||'',province:venue.province||'',courtTotal:best?.value??null,confidence,verificationStatus:confidence==='high'?'verified':confidence==='medium'?'partially_verified':'needs_direct_confirmation',searchResults:results.slice(0,6),candidates:ranked.slice(0,5).map(row=>({value:row.value,score:row.score,sourceCount:row.sourceCount,pageEvidence:row.pageEvidence,evidence:row.items.slice(0,6)}))};
}

module.exports=async(req,res)=>{
  try{
    const all=loadVenues();const name=String(req.query?.name||'').trim();const offset=Math.max(0,Number(req.query?.offset)||0);const limit=Math.min(2,Math.max(1,Number(req.query?.limit)||1));
    const selected=name?all.filter(v=>v.name.toLowerCase()===name.toLowerCase()).slice(0,1):all.slice(offset,offset+limit);
    const rows=[];for(const venue of selected)rows.push(await auditVenue(venue));
    res.setHeader('Cache-Control','no-store');res.status(200).json({total:all.length,offset,limit,count:rows.length,next:!name&&offset+rows.length<all.length?offset+rows.length:null,rows});
  }catch(error){console.error('Court audit failed',error);res.status(500).json({error:String(error.message||error)})}
};
