const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

function loadVenues(){
 const encoded=[0,1,2,3]
  .map(index=>fs.readFileSync(path.join(process.cwd(),'bundle',`padelsport.gz.b64.${String(index).padStart(2,'0')}`),'utf8').trim())
  .join('');
 const html=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
 const marker='const NATIONAL_POINTS = ';
 const start=html.indexOf(marker);
 const end=html.indexOf('];',start+marker.length);
 if(start<0||end<0)throw new Error('Data venue tidak ditemukan.');
 const raw=html.slice(start+marker.length,end+1).trim().replace(/\\"/g,'"').replace(/\\\\/g,'\\');
 return JSON.parse(raw).filter(point=>point?.category==='padel');
}

module.exports=async function handler(req,res){
 try{
  const all=loadVenues();
  const offset=Math.max(0,Number.parseInt(req.query?.offset||'0',10)||0);
  const limit=Math.min(12,Math.max(1,Number.parseInt(req.query?.limit||'10',10)||10));
  const origin=`https://${req.headers.host}`;
  const batch=all.slice(offset,offset+limit);
  const rows=await Promise.all(batch.map(async venue=>{
   try{
    const url=`${origin}/api/ayo-thumbnail?name=${encodeURIComponent(venue.name)}&meta=1`;
    const response=await fetch(url,{headers:{accept:'application/json'}});
    if(!response.ok)return {name:venue.name,city:venue.city,status:'not_found'};
    const data=await response.json();
    const hasContact=Boolean(data.phone||data.email||data.instagram);
    return {
     name:venue.name,city:venue.city,province:venue.province,
     status:hasContact?'contact_found':'venue_found_no_contact',
     phone:data.phone||'',phoneLabel:data.phoneLabel||'',email:data.email||'',instagram:data.instagram||'',
     address:data.address||venue.address||'',sourceUrl:data.venueUrl||'',contactContext:data.contactContext||''
    };
   }catch(error){
    return {name:venue.name,city:venue.city,status:'error',error:error.message};
   }
  }));
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({total:all.length,offset,limit,count:rows.length,next:offset+rows.length<all.length?offset+rows.length:null,rows});
 }catch(error){
  console.error('Contact audit failed',error);
  res.status(500).json({error:'Audit kontak gagal dijalankan.',detail:error.message});
 }
};