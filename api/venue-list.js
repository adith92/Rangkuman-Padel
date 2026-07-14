const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

function loadHtml(){
 const encoded=[0,1,2,3]
  .map(index=>fs.readFileSync(path.join(process.cwd(),'bundle',`padelsport.gz.b64.${String(index).padStart(2,'0')}`),'utf8').trim())
  .join('');
 return zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
}

function clean(value=''){
 return String(value).replace(/\\(['"\\])/g,'$1').trim();
}

function extractVenues(html=''){
 const rows=[];
 const patterns=[
  /\{[^{}]{0,1200}?name\s*:\s*(['"])(.*?)\1[^{}]{0,1200}?category\s*:\s*(['"])padel\3[^{}]*?\}/gis,
  /\{[^{}]{0,1200}?category\s*:\s*(['"])padel\1[^{}]{0,1200}?name\s*:\s*(['"])(.*?)\2[^{}]*?\}/gis
 ];
 for(const pattern of patterns){
  let match;
  while((match=pattern.exec(html))){
   const block=match[0];
   const nameMatch=block.match(/name\s*:\s*(['"])(.*?)\1/is);
   if(!nameMatch)continue;
   const cityMatch=block.match(/city\s*:\s*(['"])(.*?)\1/is);
   const provinceMatch=block.match(/province\s*:\s*(['"])(.*?)\1/is);
   const addressMatch=block.match(/address\s*:\s*(['"])(.*?)\1/is);
   rows.push({
    name:clean(nameMatch[2]),
    city:clean(cityMatch?.[2]||''),
    province:clean(provinceMatch?.[2]||''),
    address:clean(addressMatch?.[2]||'')
   });
  }
 }
 const unique=new Map();
 rows.forEach(row=>{if(row.name&&!unique.has(row.name))unique.set(row.name,row)});
 return [...unique.values()];
}

module.exports=(req,res)=>{
 try{
  const venues=extractVenues(loadHtml());
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json({count:venues.length,venues});
 }catch(error){
  console.error('Venue list audit failed',error);
  res.status(500).json({error:'Daftar venue belum dapat dibaca.'});
 }
};