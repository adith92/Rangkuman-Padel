const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

function loadHtml(){
 const encoded=[0,1,2,3]
  .map(index=>fs.readFileSync(path.join(process.cwd(),'bundle',`padelsport.gz.b64.${String(index).padStart(2,'0')}`),'utf8').trim())
  .join('');
 return zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
}

function decodePoints(html=''){
 const marker='const NATIONAL_POINTS = ';
 const start=html.indexOf(marker);
 if(start<0)throw new Error('NATIONAL_POINTS tidak ditemukan.');
 const arrayStart=start+marker.length;
 const end=html.indexOf('];',arrayStart);
 if(end<0)throw new Error('Akhir NATIONAL_POINTS tidak ditemukan.');
 let raw=html.slice(arrayStart,end+1).trim();
 raw=raw.replace(/\\"/g,'"').replace(/\\\\/g,'\\');
 return JSON.parse(raw);
}

module.exports=(req,res)=>{
 try{
  const points=decodePoints(loadHtml());
  const venues=points
   .filter(point=>point&&point.category==='padel')
   .map(point=>({
    id:point.id||'',name:point.name||'',city:point.city||'',province:point.province||'',
    address:point.address||'',precision:point.precision||'',searchQuery:point.searchQuery||''
   }));
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json({count:venues.length,venues});
 }catch(error){
  console.error('Venue list audit failed',error);
  res.setHeader('Cache-Control','no-store');
  res.status(500).json({error:'Daftar venue belum dapat dibaca.',detail:error.message});
 }
};