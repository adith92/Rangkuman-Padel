module.exports=async(req,res)=>{
 const handle=String(req.query?.handle||'').replace(/^@/,'').replace(/[^A-Za-z0-9._]/g,'').slice(0,60);
 if(!handle){res.status(400).json({error:'handle required'});return}
 try{
  const api=await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,{
   redirect:'follow',
   headers:{
    'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
    'accept':'*/*','accept-language':'id-ID,id;q=0.9,en;q=0.8',
    'x-ig-app-id':'936619743392459','x-requested-with':'XMLHttpRequest',
    'referer':`https://www.instagram.com/${handle}/`
   }
  });
  const text=await api.text();
  let json=null;try{json=JSON.parse(text)}catch{}
  const user=json?.data?.user||null;
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
   handle,status:api.status,exists:Boolean(user),
   profile:user?{
    username:user.username,fullName:user.full_name,biography:user.biography,
    externalUrl:user.external_url,category:user.category_name,
    businessCategory:user.business_category_name,isBusiness:user.is_business_account,
    isProfessional:user.is_professional_account,isVerified:user.is_verified,
    followers:user.edge_followed_by?.count,posts:user.edge_owner_to_timeline_media?.count,
    profilePic:user.profile_pic_url_hd||user.profile_pic_url
   }:null,
   error:json?.message||(!json?text.slice(0,300):null)
  });
 }catch(error){res.status(200).json({handle,error:String(error.message||error)})}
};