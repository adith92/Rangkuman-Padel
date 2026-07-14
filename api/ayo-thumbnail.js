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

function candidateSlugs(name=''){
 const values=[
  name,
  name.replace(/&/g,' '),
  name.replace(/\band\b/ig,' '),
  name.replace(/\bpadel\b/ig,' ').trim(),
  name.replace(/[!]/g,' ')
 ];
 return [...new Set(values.map(slugify).filter(Boolean))];
}

function decodeHtml(value=''){
 return String(value)
  .replace(/\\\//g,'/')
  .replace(/\\u0026/g,'&')
  .replace(/\\u003a/gi,':')
  .replace(/\\u0040/gi,'@')
  .replace(/&amp;/g,'&')
  .replace(/&nbsp;/gi,' ')
  .replace(/&#x2F;/gi,'/')
  .replace(/&#47;/g,'/')
  .replace(/&#58;/g,':')
  .replace(/&quot;/gi,'"')
  .replace(/&#39;/g,"'");
}

function plainText(html=''){
 return decodeHtml(html)
  .replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<style[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/\s+/g,' ')
  .trim();
}

function searchableText(html=''){
 return decodeHtml(html)
  .replace(/<[^>]+>/g,' ')
  .replace(/[\\"']/g,' ')
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
 return '';
}

function phoneLabel(value=''){
 return String(value).replace(/\s+/g,' ').trim().replace(/[.,;]+$/,'');
}

function phoneScore(context=''){
 const text=context.toLowerCase();
 let score=0;
 if(/admin|pic|manajemen|management/.test(text))score+=8;
 if(/whats\s*app|wa\b/.test(text))score+=7;
 if(/hubungi|kontak|telepon|telp|phone/.test(text))score+=5;
 if(/event|komersial|pertandingan|promosi|reservasi|booking/.test(text))score+=4;
 return score;
}

function findVenuePhone(html=''){
 const text=searchableText(html);
 const regex=/(?<!\d)(\+?62[\d\s().-]{8,20}|08[1-9][\d\s().-]{6,15})(?!\d)/g;
 const candidates=[];
 let match;
 while((match=regex.exec(text))){
  const normalized=normalizePhone(match[1]);
  if(normalized.length<10||normalized.length>15||!/^628/.test(normalized))continue;
  const start=Math.max(0,match.index-130);
  const end=Math.min(text.length,regex.lastIndex+130);
  const context=text.slice(start,end).trim();
  const score=phoneScore(context);
  if(score<4)continue;
  candidates.push({
   phone:normalized,
   phoneLabel:phoneLabel(match[1]),
   contactContext:context.slice(0,240),
   score
  });
 }
 const unique=[...new Map(candidates.map(item=>[item.phone,item])).values()];
 unique.sort((a,b)=>b.score-a.score);
 const best=unique[0];
 return best?{phone:best.phone,phoneLabel:best.phoneLabel,contactContext:best.contactContext}:{phone:'',phoneLabel:'',contactContext:''};
}

function findEmail(html=''){
 const text=searchableText(html);
 const matches=[...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)].map(match=>match[0].toLowerCase());
 return matches.find(email=>!/@ayo\.co\.id$/i.test(email))||'';
}

function findInstagram(html=''){
 const normalized=decodeHtml(html);
 const blocked=new Set(['ayo.indonesia','instagram','explore','accounts','p','reel','reels','stories']);
 const matches=[...normalized.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)/ig)];
 for(const match of matches){
  const username=String(match[1]||'').toLowerCase();
  if(username&&!blocked.has(username))return username;
 }
 return '';
}

function findAddress(html=''){
 const text=plainText(html);
 const match=text.match(/Lokasi Venue\s+(.{2,200}?)(?:\s+Buka Peta|\s+Fasilitas|\s+Mulai dari)/i);
 if(!match)return '';
 return match[1].replace(/\s+Ada diskon.*$/i,'').trim();
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
 return {
  venueUrl,
  image,
  address:findAddress(html),
  email:findEmail(html),
  instagram:findInstagram(html),
  ...findVenuePhone(html)
 };
}

module.exports=async function handler(req,res){
 try{
  const name=String(req.query?.name||'').trim().slice(0,160);
  if(!name){res.status(400).json({error:'Nama venue wajib diisi.'});return}
  let result=null;
  for(const slug of candidateSlugs(name)){
   result=await fetchVenuePage(slug);
   if(result)break;
  }
  if(!result){
   res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
   res.status(404).json({error:'Venue tidak ditemukan di AYO.'});
   return;
  }
  if(String(req.query?.meta||'')==='1'){
   res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
   res.status(200).json({
    source:'AYO Indonesia',
    venueUrl:result.venueUrl,
    imageUrl:result.image,
    phone:result.phone,
    phoneLabel:result.phoneLabel,
    contactContext:result.contactContext,
    email:result.email,
    instagram:result.instagram,
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