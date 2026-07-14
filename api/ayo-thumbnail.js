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
  .replace(/&nbsp;/gi,' ')
  .replace(/&#x2F;/gi,'/')
  .replace(/&#47;/g,'/')
  .replace(/&#58;/g,':');
}

function plainText(html=''){
 return decodeHtml(html)
  .replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<style[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/\s+/g,' ')
  .trim();
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

function normalizePhone(value=''){
 const digits=String(value).replace(/\D/g,'');
 if(!digits)return '';
 if(digits.startsWith('62'))return digits;
 if(digits.startsWith('0'))return `62${digits.slice(1)}`;
 if(digits.startsWith('8'))return `62${digits}`;
 return digits;
}

function phoneLabel(value=''){
 return String(value).replace(/\s+/g,' ').trim().replace(/[.,;]+$/,'');
}

function findVenuePhone(html=''){
 const text=plainText(html);
 const contextual=/(?:admin|whats\s*app|wa|kontak|hubungi|telepon|telp|phone|manajemen|management)[^0-9+]{0,80}(\+?62[\d\s().-]{7,20}|0[\d\s().-]{8,18})/ig;
 let match;
 while((match=contextual.exec(text))){
  const normalized=normalizePhone(match[1]);
  if(normalized.length>=10&&normalized.length<=15){
   return {phone:normalized,phoneLabel:phoneLabel(match[1]),contactContext:match[0].trim().slice(0,180)};
  }
 }
 return {phone:'',phoneLabel:'',contactContext:''};
}

function findAddress(html=''){
 const text=plainText(html);
 const match=text.match(/Lokasi Venue\s+(.{15,240}?)(?:Fasilitas|Mulai dari|Buka Peta)/i);
 return match?match[1].trim():'';
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
 if(image){
  const parsed=new URL(image);
  if(parsed.hostname!==ASSET_HOST)return null;
 }
 const contact=findVenuePhone(html);
 return {venueUrl,image,address:findAddress(html),...contact};
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
   res.status(404).json({error:'Venue tidak ditemukan di AYO.'});
   return;
  }
  if(String(req.query?.meta||'')==='1'){
   res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
   res.status(200).json({
    source:'AYO Indonesia',
    venueUrl:result.venueUrl,
    imageUrl:result.image,
    phone:result.phone,
    phoneLabel:result.phoneLabel,
    contactContext:result.contactContext,
    address:result.address
   });
   return;
  }
  if(!result.image){
   res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
   res.status(404).json({error:'Foto venue tidak ditemukan di AYO.'});
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
  console.error('AYO venue metadata error',error);
  res.setHeader('Cache-Control','no-store');
  res.status(500).json({error:'Data venue belum dapat dimuat.'});
 }
};