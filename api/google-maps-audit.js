const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

function loadVenues(){
 const encoded=[0,1,2,3].map(i=>fs.readFileSync(path.join(process.cwd(),'bundle',`padelsport.gz.b64.${String(i).padStart(2,'0')}`),'utf8').trim()).join('');
 const html=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
 const marker='const NATIONAL_POINTS = ';
 const start=html.indexOf(marker);if(start<0)return [];
 const from=start+marker.length;
 const close=html.indexOf('];',from);if(close<0)return [];
 let raw=html.slice(from,close+1).trim();
 raw=raw.replace(/\\"/g,'"').replace(/\\\\/g,'\\');
 const rows=JSON.parse(raw);
 return rows.filter(x=>x.category==='padel');
}
function decode(v=''){return String(v).replace(/\\u003d/gi,'=').replace(/\\u0026/gi,'&').replace(/\\u002f/gi,'/').replace(/\\u0022/gi,'"').replace(/\\u0027/gi,"'").replace(/\\x22/gi,'"').replace(/\\x27/gi,"'").replace(/\\\//g,'/').replace(/&amp;/g,'&')}
function normPhone(v=''){const d=String(v).replace(/\D/g,'');if(d.startsWith('62'))return d;if(d.startsWith('0'))return `62${d.slice(1)}`;return ''}
function phoneLabel(v=''){const d=normPhone(v);if(!d)return '';const x=`0${d.slice(2)}`;return x.replace(/(\d{4})(\d{4})(\d+)/,'$1 $2 $3')}
async function fetchText(url){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36','accept':'text/html,application/xhtml+xml,*/*','accept-language':'id-ID,id;q=0.9,en;q=0.8','cookie':'CONSENT=YES+cb.20220419-08-p0.en+FX+111'}});return {status:r.status,url:r.url,text:decode(await r.text())}}
 catch(error){return {status:0,url,error:String(error.message||error),text:''}}finally{clearTimeout(timer)}
}
function positions(text,needle){const rows=[];let i=0;const t=text.toLowerCase(),n=needle.toLowerCase();while((i=t.indexOf(n,i))>=0){rows.push(i);i+=Math.max(1,n.length)}return rows}
function nearest(pos,anchors){if(!anchors.length)return Infinity;return Math.min(...anchors.map(a=>Math.abs(pos-a)))}
function hostOf(url=''){try{return new URL(url).hostname.replace(/^www\./,'').toLowerCase()}catch{return ''}}
function cleanUrl(raw=''){return decode(raw).replace(/[\\\],]+$/,'')}
function parseResult(html,name){
 const anchors=positions(html,name);
 const phoneRows=[];
 for(const m of html.matchAll(/(?<!\d)(\+?62[\d\s().-]{8,20}|08[1-9][\d\s().-]{6,15})(?!\d)/g)){
  const phone=normPhone(m[1]);if(phone.length<10||phone.length>15)continue;
  phoneRows.push({phone,label:String(m[1]).trim(),pos:m.index,distance:nearest(m.index,anchors)});
 }
 const urlRows=[];
 for(const m of html.matchAll(/https?:\/\/[^\s"'<>\\]+/ig)){
  const url=cleanUrl(m[0]);const host=hostOf(url);if(!host||/(google|gstatic|googleusercontent|ggpht|youtube)\./i.test(host))continue;
  urlRows.push({url,host,pos:m.index,distance:nearest(m.index,anchors)});
 }
 const phones=[...new Map(phoneRows.sort((a,b)=>a.distance-b.distance).map(x=>[x.phone,x])).values()];
 const urls=[...new Map(urlRows.sort((a,b)=>a.distance-b.distance).map(x=>[x.url,x])).values()];
 const phone=phones.find(x=>x.distance<=10500)||null;
 const instagram=urls.find(x=>x.host==='instagram.com'&&x.distance<=9500)||null;
 const whatsapp=urls.find(x=>(x.host==='wa.me'||x.host==='api.whatsapp.com')&&x.distance<=9500)||null;
 const website=urls.find(x=>!['instagram.com','wa.me','api.whatsapp.com','ayo.co.id','link.ayo.co.id'].includes(x.host)&&x.distance<=8500)||null;
 const booking=urls.find(x=>(x.host==='ayo.co.id'||x.host==='link.ayo.co.id'||/playtomic|courtside|reclub|sporta/.test(x.host))&&x.distance<=9500)||null;
 return {exactMatch:anchors.length>0,phone:phone?.phone||'',phoneLabel:phone?phoneLabel(phone.phone):'',instagram:instagram?.url||'',whatsapp:whatsapp?.url||'',website:website?.url||'',booking:booking?.url||'',debug:{anchors:anchors.slice(0,8),phones:phones.slice(0,5),urls:urls.slice(0,8)}};
}
async function auditVenue(v){
 const query=[v.name,v.address,v.city,'Indonesia'].filter(Boolean).join(', ');
 const mapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
 const landing=await fetchText(`${mapsUrl}&hl=id&gl=id`);
 const href=landing.text.match(/<link[^>]+href=["']([^"']*tbm=map[^"']+)["']/i)?.[1]||'';
 let dataUrl=decode(href).replace(/gl=us/,'gl=id');if(dataUrl.startsWith('/'))dataUrl=`https://www.google.com${dataUrl}`;
 const data=dataUrl?await fetchText(dataUrl):{status:0,text:'',error:'No embedded data URL'};
 const parsed=parseResult(data.text,v.name);
 return {name:v.name,city:v.city,province:v.province,address:v.address,mapsUrl,dataStatus:data.status,dataError:data.error||'',...parsed};
}
module.exports=async(req,res)=>{
 try{
  const all=loadVenues();const offset=Math.max(0,Number(req.query?.offset)||0);const limit=Math.min(5,Math.max(1,Number(req.query?.limit)||5));
  const batch=all.slice(offset,offset+limit);const rows=[];
  for(const venue of batch)rows.push(await auditVenue(venue));
  res.setHeader('Cache-Control','no-store');res.status(200).json({total:all.length,offset,limit,count:rows.length,next:offset+rows.length<all.length?offset+rows.length:null,rows});
 }catch(error){console.error('Google Maps audit failed',error);res.status(500).json({error:String(error.message||error)})}
};