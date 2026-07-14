module.exports=async(req,res)=>{
 const files=['venue-contacts-verified.js?v=20260714a','venue-contact-v8.js?v=20260714j'];const rows=[];
 for(const file of files){
  try{const r=await fetch(`https://padelsport.vercel.app/${file}`,{headers:{'user-agent':'PadelSportSyntaxCheck/1.0'}});const code=await r.text();new Function(code);rows.push({file,status:r.status,ok:r.ok,bytes:Buffer.byteLength(code)})}
  catch(error){rows.push({file,ok:false,error:String(error.message||error)})}
 }
 res.setHeader('Cache-Control','no-store');res.status(rows.every(x=>x.ok)?200:500).json({rows});
};