function decode(v=''){return String(v).replace(/\\u003d/gi,'=').replace(/\\u0026/gi,'&').replace(/\\u002f/gi,'/').replace(/\\\//g,'/').replace(/&amp;/g,'&')}
function normPhone(v=''){const d=String(v).replace(/\D/g,'');if(d.startsWith('62'))return d;if(d.startsWith('0'))return `62${d.slice(1)}`;return ''}
function uniq(a){return [...new Set(a.filter(Boolean))]}
module.exports=async(req,res)=>{
 const name=String(req.query?.name||'').trim().slice(0,150);const city=String(req.query?.city||'').trim().slice(0,80);
 if(!name){res.status(400).json({error:'name required'});return}
 const q=`${name}, ${city}, Indonesia`;
 try{
  const url=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36','accept':'text/html,application/xhtml+xml','accept-language':'id-ID,id;q=0.9,en;q=0.8'}});
  const html=decode(await r.text());
  const phones=uniq([...html.matchAll(/(?<!\d)(\+?62[\d\s().-]{8,20}|08[1-9][\d\s().-]{6,15})(?!\d)/g)].map(m=>normPhone(m[1])).filter(x=>x.length>=10&&x.length<=15));
  const websites=uniq([...html.matchAll(/https?:\/\/[^\s"'<>\\]+/ig)].map(m=>m[0]).filter(u=>!/(google|gstatic|googleusercontent|ggpht|youtube)\./i.test(u))).slice(0,20);
  const title=(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/<[^>]+>/g,' ').trim();
  const snippets=[];for(const p of phones.slice(0,5)){const local=p.startsWith('62')?`0${p.slice(2)}`:p;const i=html.indexOf(local);if(i>=0)snippets.push(html.slice(Math.max(0,i-180),i+220))}
  res.setHeader('Cache-Control','no-store');res.status(200).json({name,city,q,status:r.status,finalUrl:r.url,length:html.length,title,phones,websites,snippets});
 }catch(error){res.status(200).json({name,city,error:String(error.message||error)})}
};