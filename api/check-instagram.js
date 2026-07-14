function decode(v=''){return String(v).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x2F;/gi,'/').replace(/\\u0026/g,'&')}
function meta(html,key){
 const a=html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,'i'));
 const b=html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,'i'));
 return decode(a?.[1]||b?.[1]||'');
}
module.exports=async(req,res)=>{
 const handle=String(req.query?.handle||'').replace(/^@/,'').replace(/[^A-Za-z0-9._]/g,'').slice(0,60);
 if(!handle){res.status(400).json({error:'handle required'});return}
 try{
  const r=await fetch(`https://www.instagram.com/${handle}/`,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36','accept':'text/html,application/xhtml+xml','accept-language':'id-ID,id;q=0.9,en;q=0.8'}});
  const html=await r.text();
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({handle,status:r.status,finalUrl:r.url,length:html.length,title:meta(html,'og:title'),description:meta(html,'og:description'),canonical:meta(html,'og:url'),notFound:/page isn't available|sorry, this page|halaman tidak tersedia/i.test(html),sample:html.slice(0,180)});
 }catch(error){res.status(200).json({handle,error:String(error.message||error)})}
};