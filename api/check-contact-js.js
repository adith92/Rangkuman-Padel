module.exports=async(req,res)=>{
 const base='https://padelsport.vercel.app/';
 const files=['venue-contacts-verified.js?v=20260714a','venue-contact-v8.js?v=20260714j'];const rows=[];let data={};
 for(const file of files){
  try{
   const r=await fetch(`${base}${file}`,{headers:{'user-agent':'PadelSportSyntaxCheck/1.0'}});const code=await r.text();new Function(code);
   if(file.startsWith('venue-contacts')){const window={};new Function('window',code)(window);data=window.VERIFIED_VENUE_CONTACTS||{}}
   rows.push({file,status:r.status,ok:r.ok,bytes:Buffer.byteLength(code)});
  }catch(error){rows.push({file,ok:false,error:String(error.message||error)})}
 }
 const indexResponse=await fetch(base,{headers:{'user-agent':'PadelSportSyntaxCheck/1.0'}});const index=await indexResponse.text();
 const dataPos=index.indexOf('venue-contacts-verified.js'),contactPos=index.indexOf('venue-contact-v8.js');
 const contacts=Object.values(data);const direct=contacts.filter(x=>x.phone||x.secondaryPhone||x.instagram||x.email||x.whatsapp).length;
 const channels=contacts.filter(x=>x.website||x.booking).length;
 const result={rows,verifiedVenues:Object.keys(data).length,directContactVenues:direct,officialChannelVenues:channels,scriptOrderOk:dataPos>=0&&contactPos>dataPos,indexStatus:indexResponse.status};
 const ok=rows.every(x=>x.ok)&&result.verifiedVenues>0&&result.scriptOrderOk;
 res.setHeader('Cache-Control','no-store');res.status(ok?200:500).json(result);
};