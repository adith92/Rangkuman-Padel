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

const decode=value=>String(value||'').replace(/\\x3d/gi,'=').replace(/\\x26/gi,'&').replace(/\\x2f/gi,'/').replace(/\\u003d/gi,'=').replace(/\\u0026/gi,'&').replace(/\\u002f/gi,'/').replace(/\\\//g,'/').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const strip=value=>decode(String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim();
const cleanUrl=raw=>{let url=decode(raw).replace(/[\\\],);]+$/,'');try{const u=new URL(url);if((u.hostname==='www.google.com'||u.hostname==='google.com')&&u.pathname==='/url'&&u.searchParams.get('q'))url=u.searchParams.get('q')}catch{}return url};
const hostOf=url=>{try{return new URL(url).hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}};

async function fetchText(url){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36','accept-language':'id-ID,id;q=0.9,en;q=0.8','cookie':'CONSENT=YES+cb.20220419-08-p0.en+FX+111'}});
    return {status:response.status,url:response.url,text:decode(await response.text())};
  }catch(error){return {status:0,url,error:String(error.message||error),text:''}}finally{clearTimeout(timer)}
}

function resultUrls(html=''){
  const rows=[];
  for(const match of html.matchAll(/https?:\/\/[^\s"'<>\\]+/ig)){
    const url=cleanUrl(match[0]);const host=hostOf(url);
    if(!host||/(google|gstatic|googleusercontent|googleapis|ggpht)\./i.test(host))continue;
    const context=strip(html.slice(Math.max(0,match.index-300),Math.min(html.length,match.index+match[0].length+500)));
    rows.push({url,host,context});
  }
  return [...new Map(rows.map(row=>[row.url,row])).values()].slice(0,20);
}

function extractCandidates(text=''){
  const clean=strip(text).toLowerCase();
  const candidates=[];
  const patterns=[
    /(?:memiliki|mempunyai|tersedia|dengan|terdapat|menawarkan|punya)?\s*(\d{1,2})\s*(?:buah|unit)?\s*(?:lapangan|court)s?\s*(?:padel)?/gi,
    /(?:lapangan|court)s?\s*(?:padel)?\s*(?:sebanyak|total|ada|:|-)?\s*(\d{1,2})/gi,
    /(\d{1,2})\s*(?:indoor|outdoor|semi[- ]?indoor)?\s*padel\s*courts?/gi
  ];
  for(const pattern of patterns){
    for(const match of clean.matchAll(pattern)){
      const value=Number(match[1]);
      if(value>=1&&value<=30)candidates.push({value,evidence:clean.slice(Math.max(0,match.index-100),Math.min(clean.length,match.index+match[0].length+120))});
    }
  }
  const numbered=[...clean.matchAll(/\bcourt\s*(\d{1,2})\b/gi)].map(m=>Number(m[1])).filter(n=>n>=1&&n<=30);
  if(numbered.length){const max=Math.max(...numbered);if(max<=30)candidates.push({value:max,evidence:`Daftar booking menampilkan Court 1 sampai Court ${max}`})}
  return candidates;
}

function rankSource(host=''){
  if(/ayo\.co\.id$|courtside\.id$|sporta\.id$/.test(host))return 5;
  if(/instagram\.com$/.test(host))return 4;
  if(/kompas|detik|tempo|kumparan|antaranews|tribunnews/.test(host))return 3;
  return 2;
}

async function auditVenue(venue){
  const queries=[
    `"${venue.name}" "court"`,
    `"${venue.name}" "lapangan" padel`,
    `"${venue.name}" ${venue.city||''} jumlah court`,
    `site:instagram.com "${venue.name}" court`
  ];
  const evidence=[];
  for(const query of queries){
    const search=await fetchText(`https://www.google.com/search?hl=id&gl=id&num=10&q=${encodeURIComponent(query)}`);
    const searchCandidates=extractCandidates(search.text);
    for(const item of searchCandidates)evidence.push({...item,sourceType:'search_snippet',sourceUrl:search.url,query,sourceRank:1});
    const urls=resultUrls(search.text).filter(row=>/ayo\.co\.id$|instagram\.com$|courtside\.id$|sporta\.id$|\.com$|\.id$/.test(row.host)).slice(0,4);
    for(const row of urls){
      for(const item of extractCandidates(row.context))evidence.push({...item,sourceType:'search_result_context',sourceUrl:row.url,query,sourceRank:rankSource(row.host)});
    }
  }
  const grouped={};
  for(const item of evidence){const key=String(item.value);(grouped[key]||(grouped[key]=[])).push(item)}
  const ranked=Object.entries(grouped).map(([value,items])=>({value:Number(value),score:items.reduce((sum,item)=>sum+item.sourceRank,0),sourceCount:new Set(items.map(item=>item.sourceUrl)).size,items})).sort((a,b)=>b.score-a.score||b.sourceCount-a.sourceCount);
  const best=ranked[0]||null;
  const confidence=!best?'none':best.score>=8&&best.sourceCount>=2?'high':best.score>=4?'medium':'low';
  return {
    name:venue.name,city:venue.city||'',province:venue.province||'',
    courtTotal:best?.value??null,confidence,
    verificationStatus:confidence==='high'?'verified':confidence==='medium'?'partially_verified':'needs_direct_confirmation',
    candidates:ranked.slice(0,5).map(row=>({value:row.value,score:row.score,sourceCount:row.sourceCount,evidence:row.items.slice(0,5)}))
  };
}

module.exports=async(req,res)=>{
  try{
    const all=loadVenues();
    const name=String(req.query?.name||'').trim();
    const offset=Math.max(0,Number(req.query?.offset)||0);
    const limit=Math.min(3,Math.max(1,Number(req.query?.limit)||1));
    const selected=name?all.filter(v=>v.name.toLowerCase()===name.toLowerCase()).slice(0,1):all.slice(offset,offset+limit);
    const rows=[];for(const venue of selected)rows.push(await auditVenue(venue));
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({total:all.length,offset,limit,count:rows.length,next:!name&&offset+rows.length<all.length?offset+rows.length:null,rows});
  }catch(error){console.error('Court audit failed',error);res.status(500).json({error:String(error.message||error)})}
};
