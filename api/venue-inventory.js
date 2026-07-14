const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

function loadVenues(){
  const bundleDir=path.join(process.cwd(),'bundle');
  const encoded=[0,1,2,3].map(n=>fs.readFileSync(path.join(bundleDir,`padelsport.gz.b64.${String(n).padStart(2,'0')}`),'utf8').trim()).join('');
  const html=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
  const marker='const NATIONAL_POINTS = ';
  const start=html.indexOf(marker);
  if(start<0)throw new Error('NATIONAL_POINTS marker not found');
  const from=start+marker.length;
  const close=html.indexOf('];',from);
  if(close<0)throw new Error('NATIONAL_POINTS closing marker not found');
  const raw=html.slice(from,close+1).trim().replace(/\\"/g,'"').replace(/\\\\/g,'\\');
  return JSON.parse(raw).filter(row=>row.category==='padel');
}

function normalize(value){
  return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(padel|club|court|arena|sports?|sport centre|sport center)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
}

module.exports=(req,res)=>{
  try{
    const venues=loadVenues();
    const groups={};
    venues.forEach((venue,index)=>{
      const key=normalize(venue.name);
      (groups[key]||(groups[key]=[])).push(index);
    });
    const rows=venues.map((venue,index)=>({
      id:`VEN-${String(index+1).padStart(3,'0')}`,
      name:venue.name,
      city:venue.city||'',
      province:venue.province||'',
      address:venue.address||'',
      precision:venue.precision||'',
      position:venue.position||venue.coords||null,
      duplicateKey:normalize(venue.name),
      duplicateCandidates:(groups[normalize(venue.name)]||[]).filter(i=>i!==index).map(i=>venues[i].name)
    }));
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({total:rows.length,generatedAt:new Date().toISOString(),rows});
  }catch(error){
    console.error('Venue inventory failed',error);
    res.status(500).json({error:String(error.message||error)});
  }
};
