const fs=require('fs');const path=require('path');
module.exports=(req,res)=>{
 const files=['venue-contacts-verified.js','venue-contact-v8.js'];const rows=[];
 for(const file of files){
  try{const code=fs.readFileSync(path.join(process.cwd(),file),'utf8');new Function(code);rows.push({file,ok:true,bytes:Buffer.byteLength(code)})}
  catch(error){rows.push({file,ok:false,error:String(error.message||error)})}
 }
 res.setHeader('Cache-Control','no-store');res.status(rows.every(x=>x.ok)?200:500).json({rows});
};