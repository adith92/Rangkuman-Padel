function decode(v=''){return String(v).replace(/\\u003d/gi,'=').replace(/\\u0026/gi,'&').replace(/\\u002f/gi,'/').replace(/\\u0022/gi,'"').replace(/\\u0027/gi,"'").replace(/\\x22/gi,'"').replace(/\\x27/gi,"'").replace(/\\\//g,'/').replace(/&amp;/g,'&')}
function normPhone(v=''){const d=String(v).replace(/\D/g,'');if(d.startsWith('62'))return d;if(d.startsWith('0'))return `62${d.slice(1)}`;return ''}
function uniq(a){return [...new Set(a.filter(Boolean))]}
async function fetchText(url){
 const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36','accept':'text/html,application/xhtml+xml,*/*','accept-language':'id-ID,id;q=0.9,en;q=0.8','cookie':'NID=; CONSENT=YES+cb.20220419-08-p0.en+FX+111'}});
 return {status:r.status,url:r.url,text:decode(await r.text())};
}
module.exports=async(req,res)=>{
 const name=String(req.query?.name||'').trim().slice(0,150);const city=String(req.query?.city||'').trim().slice(0,80);
 if(!name){res.status(400).json({error:'name required'});return}
 const q=`${name}, ${city}, Indonesia`;
 try{
  const direct=`https://www.google.com/search?tbm=map&authuser=0&hl=id&gl=id&q=${encodeURIComponent(q)}`;
  const result=await fetchText(direct);const html=result.text;
  const phones=uniq([...html.matchAll(/(?<!\d)(\+?62[\d\s().-]{8,20}|08[1-9][\d\s().-]{6,15})(?!\d)/g)].map(m=>normPhone(m[1])).filter(x=>x.length>=10&&x.length<=15));
  const websites=uniq([...html.matchAll(/https?:\/\/[^\s"'<>\\]+/ig)].map(m=>m[0]).filter(u=>!/(google|gstatic|googleusercontent|ggpht|youtube)\./i.test(u))).slice(0,30);
  const lower=html.toLowerCase();const nameIndex=lower.indexOf(name.toLowerCase());
  const nameSnippet=nameIndex>=0?html.slice(Math.max(0,nameIndex-2500),nameIndex+10000):html.slice(0,3000);
  const snippets=[];for(const p of phones.slice(0,8)){for(const needle of [p,`0${p.slice(2)}`]){const i=html.indexOf(needle);if(i>=0){snippets.push(html.slice(Math.max(0,i-500),i+800));break}}}
  res.setHeader('Cache-Control','no-store');res.status(200).json({name,city,q,status:result.status,finalUrl:result.url,length:html.length,phones,websites,nameIndex,nameSnippet,snippets});
 }catch(error){res.status(200).json({name,city,error:String(error.message||error)})}
};