const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

function loadHtml(){
  const dir=path.join(process.cwd(),'bundle');
  const encoded=[0,1,2,3].map(n=>fs.readFileSync(path.join(dir,`padelsport.gz.b64.${String(n).padStart(2,'0')}`),'utf8').trim()).join('');
  return zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
}
function decode(s=''){
  return String(s)
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>');
}
function cleanText(html=''){
  return decode(html)
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<\/(p|h1|h2|h3|h4|li|tr|div|section|article)>/gi,'\n')
    .replace(/<li[^>]*>/gi,'- ')
    .replace(/<[^>]+>/g,' ')
    .replace(/[ \t]+/g,' ')
    .replace(/\n\s*\n+/g,'\n')
    .trim();
}
function sections(html){
  const starts=[];
  const re=/<(?:div|section)[^>]*class=["'][^"']*\bsection\b[^"']*["'][^>]*id=["']([^"']+)["'][^>]*>/gi;
  let m;
  while((m=re.exec(html)))starts.push({id:m[1],index:m.index,start:re.lastIndex});
  return starts.map((item,i)=>{
    const end=i+1<starts.length?starts[i+1].index:html.indexOf('<div class="footer"',item.start)>0?html.indexOf('<div class="footer"',item.start):html.length;
    return {id:item.id,text:cleanText(html.slice(item.start,end)).slice(0,60000)};
  });
}
function extractPoints(html){
  const marker='const NATIONAL_POINTS = ';
  const start=html.indexOf(marker);
  if(start<0)return [];
  const from=start+marker.length;
  const close=html.indexOf('];',from);
  if(close<0)return [];
  const raw=html.slice(from,close+1).trim().replace(/\\"/g,'"').replace(/\\\\/g,'\\');
  try{return JSON.parse(raw)}catch{return []}
}
module.exports=(req,res)=>{
  try{
    const html=loadHtml();
    const points=extractPoints(html);
    const pointSummary=points.reduce((acc,p)=>{const key=p.category||'other';acc[key]=(acc[key]||0)+1;return acc;},{});
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({generatedAt:new Date().toISOString(),title:(html.match(/<title>([^<]+)<\/title>/i)||[])[1]||'',sections:sections(html),pointSummary,points});
  }catch(error){
    console.error(error);
    res.status(500).json({error:String(error.stack||error)});
  }
};
