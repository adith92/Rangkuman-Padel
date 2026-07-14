const BLOCKED_HANDLES=new Set(['instagram','explore','accounts','p','reel','reels','stories']);
function decode(value=''){
 return String(value)
  .replace(/\\x3d/gi,'=').replace(/\\x26/gi,'&').replace(/\\x2f/gi,'/')
  .replace(/\\u003d/gi,'=').replace(/\\u0026/gi,'&').replace(/\\u002f/gi,'/')
  .replace(/\\\//g,'/').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
}
function strip(value=''){return decode(String(value).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim()}
function hostOf(url=''){try{return new URL(url).hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}}
function cleanUrl(raw=''){
 let url=decode(raw).replace(/[\\\],);]+$/,'');
 try{
  const u=new URL(url);
  if((u.hostname==='www.google.com'||u.hostname==='google.com')&&u.pathname==='/url'&&u.searchParams.get('q'))url=u.searchParams.get('q');
 }catch{}
 return url;
}
function normPhone(v=''){
 const d=String(v).replace(/\D/g,'');const n=d.startsWith('62')?d:d.startsWith('0')?`62${d.slice(1)}`:'';
 return /^628[1-9]\d{7,10}$/.test(n)?n:'';
}
async function fetchText(url){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36','accept-language':'id-ID,id;q=0.9,en;q=0.8','cookie':'CONSENT=YES+cb.20220419-08-p0.en+FX+111'}});return {status:r.status,text:decode(await r.text())}}
 catch(error){return {status:0,text:'',error:String(error.message||error)}}finally{clearTimeout(timer)}
}
function extract(html=''){
 const urls=[];
 for(const m of html.matchAll(/https?:\/\/[^\s"'<>\\]+/ig)){
  const url=cleanUrl(m[0]);const host=hostOf(url);
  if(!host||/(google|gstatic|googleusercontent|googleapis|ggpht|youtube)\./i.test(host))continue;
  const start=Math.max(0,m.index-250),end=Math.min(html.length,m.index+m[0].length+350);
  urls.push({url,host,context:strip(html.slice(start,end))});
 }
 const unique=[...new Map(urls.map(x=>[x.url,x])).values()];
 const instagram=[];
 for(const row of unique.filter(x=>x.host==='instagram.com')){
  try{const handle=new URL(row.url).pathname.split('/').filter(Boolean)[0];if(handle&&!BLOCKED_HANDLES.has(handle.toLowerCase()))instagram.push({...row,handle})}catch{}
 }
 const social=unique.filter(x=>['facebook.com','tiktok.com','linktr.ee','beacons.ai','heylink.me','wa.me','api.whatsapp.com'].includes(x.host));
 const websites=unique.filter(x=>!['instagram.com','facebook.com','tiktok.com','linktr.ee','beacons.ai','heylink.me','wa.me','api.whatsapp.com','ayo.co.id','link.ayo.co.id'].includes(x.host)).slice(0,12);
 const text=strip(html);const phones=[...new Set([...text.matchAll(/(?<!\d)(\+?62[\d\s().-]{8,20}|08[1-9][\d\s().-]{6,15})(?!\d)/g)].map(m=>normPhone(m[1])).filter(Boolean))];
 return {instagram:[...new Map(instagram.map(x=>[x.handle.toLowerCase(),x])).values()].slice(0,10),social:social.slice(0,10),websites,phones:phones.slice(0,10)};
}
module.exports=async(req,res)=>{
 const name=String(req.query?.name||'').trim().slice(0,150);const city=String(req.query?.city||'').trim().slice(0,80);
 if(!name){res.status(400).json({error:'name required'});return}
 const queries=[`"${name}" ${city} Instagram`, `"${name}" ${city} WhatsApp contact`, `${name} ${city} padel`];
 const rows=[];
 for(const q of queries){const r=await fetchText(`https://www.google.com/search?hl=id&gl=id&num=10&q=${encodeURIComponent(q)}`);rows.push({query:q,status:r.status,error:r.error||'',...extract(r.text)})}
 res.setHeader('Cache-Control','no-store');res.status(200).json({name,city,rows});
};