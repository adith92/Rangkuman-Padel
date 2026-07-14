const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const vm=require('vm');
function loadVenues(){
 const dir=path.join(process.cwd(),'bundle');
 const encoded=[0,1,2,3].map(n=>fs.readFileSync(path.join(dir,`padelsport.gz.b64.${String(n).padStart(2,'0')}`),'utf8').trim()).join('');
 const html=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString('utf8');
 const marker='const NATIONAL_POINTS = ',start=html.indexOf(marker),from=start+marker.length,close=html.indexOf('];',from);
 return JSON.parse(html.slice(from,close+1).trim().replace(/\\"/g,'"').replace(/\\\\/g,'\\')).filter(row=>row.category==='padel');
}
function normalize(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(padel|club|court|arena|sports?|sport centre|sport center)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim()}
function run(root,sandbox,file){const code=fs.readFileSync(path.join(root,file),'utf8');new vm.Script(code,{filename:file}).runInContext(sandbox);return code}
module.exports=(req,res)=>{
 try{
  const root=process.cwd(),sandbox={window:{},encodeURIComponent,URL};vm.createContext(sandbox);
  run(root,sandbox,'venue-court-research-data.js');
  run(root,sandbox,'venue-courts-verified.js');
  run(root,sandbox,'venue-courts-research-merge.js');
  const uiCode=fs.readFileSync(path.join(root,'venue-court-v10.js'),'utf8');
  const qualityCode=fs.readFileSync(path.join(root,'venue-court-quality-v12.js'),'utf8');
  new vm.Script(uiCode,{filename:'venue-court-v10.js'});new vm.Script(qualityCode,{filename:'venue-court-quality-v12.js'});
  const css=fs.readFileSync(path.join(root,'mobile-redesign-v10.css'),'utf8');
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const base=loadVenues(),research=Array.isArray(sandbox.window.PBPI_COURT_RESEARCH)?sandbox.window.PBPI_COURT_RESEARCH:[],data=sandbox.window.VERIFIED_VENUE_COURTS||{};
  const baseNames=base.map(v=>v.name),extraNames=research.filter(row=>!row.is_existing_venue&&row.duplicate_status!=='confirmed_duplicate').map(row=>row.display_name||row.canonical_name).filter(Boolean),names=[...new Set([...baseNames,...extraNames])],keys=Object.keys(data);
  const missing=names.filter(name=>!Object.prototype.hasOwnProperty.call(data,name)),orphan=keys.filter(name=>!names.includes(name));
  const accepted=keys.filter(name=>Number.isInteger(data[name].total)&&data[name].total>0&&data[name].total<=30);
  const reported=keys.filter(name=>data[name].total===null&&Number.isInteger(data[name].reportedTotal)&&data[name].reportedTotal>0&&data[name].reportedTotal<=30);
  const pending=keys.filter(name=>data[name].total===null&&!Number.isInteger(data[name].reportedTotal));
  const invalid=keys.filter(name=>{
   const item=data[name];
   const totalBad=item.total!==null&&item.total!==undefined&&(!Number.isInteger(item.total)||item.total<1||item.total>30);
   const reportedBad=item.reportedTotal!==null&&item.reportedTotal!==undefined&&(!Number.isInteger(item.reportedTotal)||item.reportedTotal<1||item.reportedTotal>30);
   return totalBad||reportedBad;
  });
  const zeroTotals=keys.filter(name=>data[name].total===0||data[name].reportedTotal===0);
  const verifiedWithoutSource=keys.filter(name=>data[name].status==='verified'&&(!data[name].sourceUrl||!/https?:\/\//i.test(data[name].sourceUrl)));
  const acceptedWithoutSource=accepted.filter(name=>!data[name].sourceUrl);
  const groups={};names.forEach(name=>{const key=normalize(name);if(key)(groups[key]||(groups[key]=[])).push(name)});
  const normalizedDuplicates=Object.values(groups).filter(group=>group.length>1);
  const possibleDuplicates=research.filter(row=>row.duplicate_status==='possible_duplicate').map(row=>({venueId:row.venue_id,name:row.display_name||row.canonical_name,duplicateOf:row.duplicate_of}));
  const totalCourts=accepted.reduce((sum,name)=>sum+data[name].total,0),reportedCourts=reported.reduce((sum,name)=>sum+data[name].reportedTotal,0),errors=[];
  if(missing.length)errors.push('missing court records');
  if(orphan.length)errors.push('orphan court records');
  if(invalid.length||zeroTotals.length)errors.push('invalid or zero court totals');
  if(verifiedWithoutSource.length||acceptedWithoutSource.length)errors.push('accepted records without source URL');
  if(!css.includes('@media(max-width:760px)'))errors.push('mobile breakpoint missing');
  for(const asset of ['venue-quality-v12.css','venue-court-quality-v12.js','venue-courts-research-merge.js'])if(!index.includes(asset))errors.push(`asset not loaded: ${asset}`);
  res.setHeader('Cache-Control','no-store');
  res.status(errors.length?422:200).json({
   ok:errors.length===0,errors,
   baseVenueCount:baseNames.length,researchVenueCount:research.length,combinedVenueCount:names.length,recordCount:keys.length,
   acceptedCount:accepted.length,reportedCount:reported.length,pendingCount:pending.length,
   acceptedCoveragePercent:Math.round(accepted.length/Math.max(keys.length,1)*100),courtTotalAccepted:totalCourts,courtTotalReported:reportedCourts,
   missing,orphan,invalid,zeroTotals,verifiedWithoutSource,acceptedWithoutSource,normalizedDuplicates,possibleDuplicates,
   scriptSyntax:'ok',mobileCssBytes:Buffer.byteLength(css)
  });
 }catch(error){console.error(error);res.status(500).json({ok:false,error:String(error.stack||error)})}
};
