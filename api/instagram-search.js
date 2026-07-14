function cleanWords(value=''){
 return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>1&&!['by','the','and','of','di'].includes(w));
}
function score(item,name,city){
 const text=`${item.username||''} ${item.full_name||''} ${item.biography||''}`.toLowerCase();
 let s=0;
 for(const w of cleanWords(name)){if(text.includes(w))s+=w==='padel'?2:4}
 for(const w of cleanWords(city)){if(text.includes(w))s+=3}
 if(/padel|racquet|racket|court|arena|sport/.test(text))s+=2;
 if(item.is_business_account||item.is_professional_account)s+=1;
 return s;
}
async function getJson(url,referer='https://www.instagram.com/'){
 try{
  const r=await fetch(url,{redirect:'follow',headers:{
   'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
   'accept':'*/*','accept-language':'id-ID,id;q=0.9,en;q=0.8','x-ig-app-id':'936619743392459','x-requested-with':'XMLHttpRequest','referer':referer
  }});
  const text=await r.text();let json=null;try{json=JSON.parse(text)}catch{}
  return {status:r.status,json,error:json?null:text.slice(0,200)};
 }catch(error){return {status:0,json:null,error:String(error.message||error)}}
}
module.exports=async(req,res)=>{
 const name=String(req.query?.name||'').trim().slice(0,140);
 const city=String(req.query?.city||'').trim().slice(0,80);
 if(!name){res.status(400).json({error:'name required'});return}
 const queries=[name,`${name} ${city}`,name.replace(/\b(padel|club|court|arena|sport|sports)\b/ig,' ').replace(/\s+/g,' ').trim()].filter(Boolean);
 const users=new Map();const diagnostics=[];
 for(const q of [...new Set(queries)]){
  const result=await getJson(`https://www.instagram.com/web/search/topsearch/?context=blended&query=${encodeURIComponent(q)}&include_reel=true`);
  diagnostics.push({q,status:result.status,error:result.error});
  for(const row of result.json?.users||[]){
   const u=row.user||row; if(!u?.username)continue;
   users.set(u.username,{username:u.username,full_name:u.full_name,is_verified:u.is_verified,profile_pic_url:u.profile_pic_url,search_position:row.position});
  }
 }
 const ranked=[...users.values()].map(u=>({...u,score:score(u,name,city)})).sort((a,b)=>b.score-a.score).slice(0,8);
 const detailed=[];
 for(const u of ranked.slice(0,5)){
  const result=await getJson(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(u.username)}`,`https://www.instagram.com/${u.username}/`);
  const p=result.json?.data?.user;
  const item=p?{username:p.username,full_name:p.full_name,biography:p.biography,external_url:p.external_url,category:p.category_name,business_category:p.business_category_name,is_business_account:p.is_business_account,is_professional_account:p.is_professional_account,is_verified:p.is_verified,followers:p.edge_followed_by?.count,posts:p.edge_owner_to_timeline_media?.count,profile_pic_url:p.profile_pic_url_hd||p.profile_pic_url}:u;
  detailed.push({...item,score:score(item,name,city),profile_status:result.status});
 }
 detailed.sort((a,b)=>b.score-a.score);
 res.setHeader('Cache-Control','no-store');
 res.status(200).json({name,city,queries,diagnostics,candidates:detailed});
};