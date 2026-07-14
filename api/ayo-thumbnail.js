const AYO_HOST='https://ayo.co.id';
const ASSET_HOST='asset.ayo.co.id';

function slugify(value=''){
 return String(value)
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase()
  .replace(/&/g,' and ')
  .replace(/[^a-z0-9]+/g,'-')
  .replace(/^-+|-+$/g,'');
}

function decodeHtml(value=''){
 return String(value)
  .replace(/\\\//g,'/')
  .replace(/\\u0026/g,'&')
  .replace(/&amp;/g,'&')
  .replace(/&#x2F;/gi,'/')
  .replace(/&#47;/g,'/');
}

function findVenueImage(html=''){
 const normalized=decodeHtml(html);
 const venueAsset=normalized.match(/https:\/\/asset\.ayo\.co\.id\/image\/venue\/[^"'\\s<>]+/i);
 if(venueAsset)return venueAsset[0];
 const ogA=normalized.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
 if(ogA)return decodeHtml(ogA[1]);
 const ogB=normalized.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
 if(ogB)return decodeHtml(ogB[1]);
 return '';
}

async function fetchVenuePage(slug){
 const venueUrl=`${AYO_HOST}/v/${encodeURIComponent(slug)}`;
 const response=await fetch(venueUrl,{
  redirect:'follow',
  headers:{
   'user-agent':'Mozilla/5.0 (compatible; PadelSportIndonesia/1.0; +https://padelsport.vercel.app)',
   'accept':'text/html,application/xhtml+xml'
  }
 });
 if(!response.ok)return null;
 const html=await response.text();
 const image=findVenueImage(html);
 if(!image)return null;
 const parsed=new URL(image);
 if(parsed.hostname!==ASSET_HOST)return null;
 return {venueUrl,image};
}

module.exports=async function handler(req,res){
 try{
  const name=String(req.query?.name||'').trim().slice(0,160);
  if(!name){res.status(400).json({error:'Nama venue wajib diisi.'});return}
  const candidates=[slugify(name)];
  if(/\bpadel\b/i.test(name))candidates.push(slugify(name.replace(/\bpadel\b/ig,'').trim()));
  let result=null;
  for(const slug of [...new Set(candidates)].filter(Boolean)){
   result=await fetchVenuePage(slug);
   if(result)break;
  }
  if(!result){
   res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
   res.status(404).json({error:'Foto venue tidak ditemukan di AYO.'});
   return;
  }
  if(String(req.query?.meta||'')==='1'){
   res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
   res.status(200).json({source:'AYO Indonesia',venueUrl:result.venueUrl,imageUrl:result.image});
   return;
  }
  const imageResponse=await fetch(result.image,{
   redirect:'follow',
   headers:{
    'user-agent':'Mozilla/5.0 (compatible; PadelSportIndonesia/1.0; +https://padelsport.vercel.app)',
    'referer':result.venueUrl,
    'accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
   }
  });
  if(!imageResponse.ok){res.status(502).json({error:'Foto AYO gagal dimuat.'});return}
  const contentType=imageResponse.headers.get('content-type')||'image/jpeg';
  const buffer=Buffer.from(await imageResponse.arrayBuffer());
  res.setHeader('Content-Type',contentType);
  res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('Content-Disposition','inline');
  res.setHeader('X-Image-Source','AYO Indonesia');
  res.status(200).send(buffer);
 }catch(error){
  console.error('AYO thumbnail error',error);
  res.setHeader('Cache-Control','no-store');
  res.status(500).json({error:'Thumbnail belum dapat dimuat.'});
 }
};
