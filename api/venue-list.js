const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

function loadHtml(){
 const encoded=[0,1,2,3]
  .map(index=>fs.readFileSync(path.join(process.cwd(),'bundle',`padelsport.gz.b64.${String(index).padStart(2,'0')}`),'utf8').trim())
  .join('');
 return zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
}

function snippet(html,needle){
 const index=html.indexOf(needle);
 return {needle,index,text:index>=0?html.slice(Math.max(0,index-350),index+900):''};
}

module.exports=(req,res)=>{
 try{
  const html=loadHtml();
  const probes=[
   snippet(html,'Green Garden Padel'),
   snippet(html,'Younkis House & Court'),
   snippet(html,'NATIONAL_POINTS'),
   snippet(html,'category:"padel"'),
   snippet(html,"category:'padel'"),
   snippet(html,'"category":"padel"')
  ];
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({length:html.length,probes});
 }catch(error){
  console.error('Venue list audit failed',error);
  res.status(500).json({error:'Daftar venue belum dapat dibaca.',detail:error.message});
 }
};