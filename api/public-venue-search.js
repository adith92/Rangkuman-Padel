const SOCIAL_HOSTS=['instagram.com','facebook.com','tiktok.com','linktr.ee','beacons.ai','wa.me','api.whatsapp.com','maps.google.com','google.com','courtside.id','ayo.co.id','sporta.id'];

function decode(value=''){
 return String(value)
  .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function strip(value=''){
 return decode(String(value).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim();
}
function safeUrl(raw=''){
 try{
  const u=new URL(decode(raw));
  if(u.hostname.includes('duckduckgo.com')&&u.searchParams.get('uddg'))return decodeURIComponent(u.searchParams.get('uddg'));
  return u.href;
 }catch{return ''}
}
function normalizePhone(value=''){
 const digits=String(value).replace(/\D/g,'');
 if(digits.startsWith('62'))return digits;
 if(digits.startsWith('0'))return `62${digits.slice(1)}`;
 return '';
}
function extractContacts(html=''){
 const text=strip(html);
 const phones=[];
 for(const match of text.matchAll(/(?<!\d)(\+?62[\d\s().-]{8,20}|08[1-9][\d\s().-]{6,15})(?!\d)/g)){
  const phone=normalizePhone(match[1]);
  if(phone.length>=10&&phone.length<=15&&!phones.includes(phone))phones.push(phone);
 }
 const emails=[...new Set([...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)].map(m=>m[0].toLowerCase()))];
 const urls=[...html.matchAll(/https?:\\?\/\\?\/[^\s"'<>]+/ig)].map(m=>m[0].replace(/\\\//g,'/'));
 const instagram=[]; const whatsapp=[]; const facebook=[]; const tiktok=[];
 for(const raw of urls){
  const url=safeUrl(raw); if(!url)continue;
  try{
   const u=new URL(url); const h=u.hostname.replace(/^www\./,'').toLowerCase();
   if(h==='instagram.com'){const x=u.pathname.split('/').filter(Boolean)[0];if(x&&!['p','reel','reels','stories','explore','accounts'].includes(x)&&!instagram.includes(x))instagram.push(x)}
   if(h==='wa.me'||h==='api.whatsapp.com'||h==='web.whatsapp.com')whatsapp.push(url);
   if(h==='facebook.com'||h.endsWith('.facebook.com'))facebook.push(url);
   if(h==='tiktok.com'||h.endsWith('.tiktok.com'))tiktok.push(url);
  }catch{}
 }
 return {phones:phones.slice(0,8),emails:emails.slice(0,5),instagram:[...new Set(instagram)].slice(0,8),whatsapp:[...new Set(whatsapp)].slice(0,8),facebook:[...new Set(facebook)].slice(0,5),tiktok:[...new Set(tiktok)].slice(0,5)};
}
function parseDuck(html=''){
 const rows=[];
 const resultRegex=/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
 let m;
 while((m=resultRegex.exec(html))){
  const url=safeUrl(m[1]); if(!url)continue;
  const tail=html.slice(resultRegex.lastIndex,resultRegex.lastIndex+1200);
  const snippetMatch=tail.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\//i);
  rows.push({title:strip(m[2]),url,snippet:strip(snippetMatch?.[1]||'')});
 }
 return rows;
}
function parseBing(html=''){
 const rows=[];
 const re=/<li class=["']b_algo["'][\s\S]*?<h2><a href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a><\/h2>([\s\S]*?)<\/li>/gi;
 let m;
 while((m=re.exec(html))){
  const url=safeUrl(m[1]); if(!url)continue;
  const sn=m[3].match(/<p>([\s\S]*?)<\/p>/i);
  rows.push({title:strip(m[2]),url,snippet:strip(sn?.[1]||'')});
 }
 return rows;
}
async function fetchText(url,opts={}){
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),9000);
 try{
  const r=await fetch(url,{...opts,redirect:'follow',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (compatible; PadelSportIndonesia/1.0)','accept-language':'id-ID,id;q=0.9,en;q=0.7',...(opts.headers||{})}});
  if(!r.ok)return '';
  return await r.text();
 }catch{return ''}finally{clearTimeout(timer)}
}
async function search(query){
 const ddg=await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
 let rows=parseDuck(ddg);
 if(rows.length<3){const bing=await fetchText(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=id-ID`);rows=[...rows,...parseBing(bing)]}
 const seen=new Set();
 return rows.filter(r=>{const k=r.url.replace(/\/$/,'');if(seen.has(k))return false;seen.add(k);return true}).slice(0,12);
}
function relevance(row,name,city){
 const text=`${row.title} ${row.snippet} ${row.url}`.toLowerCase();
 const words=String(name).toLowerCase().split(/\s+/).filter(x=>x.length>2);
 let s=words.reduce((n,w)=>n+(text.includes(w)?2:0),0);
 if(city&&text.includes(String(city).toLowerCase()))s+=3;
 try{const h=new URL(row.url).hostname.replace(/^www\./,'');if(SOCIAL_HOSTS.some(x=>h===x||h.endsWith(`.${x}`)))s+=3}catch{}
 return s;
}
module.exports=async(req,res)=>{
 const name=String(req.query?.name||'').trim().slice(0,150);
 const city=String(req.query?.city||'').trim().slice(0,80);
 if(!name){res.status(400).json({error:'name required'});return}
 const queries=[`"${name}" ${city} Instagram WhatsApp`, `"${name}" ${city} contact booking padel`];
 const batches=await Promise.all(queries.map(search));
 const merged=[...batches.flat()].sort((a,b)=>relevance(b,name,city)-relevance(a,name,city));
 const seen=new Set(); const results=merged.filter(r=>{const k=r.url.replace(/\/$/,'');if(seen.has(k))return false;seen.add(k);return true}).slice(0,10);
 const pages=[];
 for(const row of results.slice(0,5)){
  let host='';try{host=new URL(row.url).hostname.replace(/^www\./,'')}catch{}
  if(['instagram.com','facebook.com','tiktok.com'].some(x=>host===x||host.endsWith(`.${x}`))){pages.push({...row,host,contacts:extractContacts(`${row.url} ${row.snippet}`)});continue}
  const html=await fetchText(row.url);
  pages.push({...row,host,contacts:extractContacts(`${html} ${row.url} ${row.snippet}`)});
 }
 res.setHeader('Cache-Control','no-store');
 res.status(200).json({name,city,queries,results,pages});
};