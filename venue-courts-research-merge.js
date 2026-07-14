(()=>{
'use strict';
const research=Array.isArray(window.PBPI_COURT_RESEARCH)?window.PBPI_COURT_RESEARCH:[];
const outreachRows=Array.isArray(window.PBPI_COURT_OUTREACH)?window.PBPI_COURT_OUTREACH:[];
const outreach=new Map(outreachRows.map(row=>[row.venue_id,row]));
const statusRank={needs_direct_confirmation:0,partially_verified:1,reviewed_conflict:1,verified:2};
const confidenceRank={none:0,low:1,medium:2,high:3};
const existing=window.VERIFIED_VENUE_COURTS||{};
const finitePositive=value=>{
 if(value===null||value===undefined||value==='')return null;
 const number=Number(value);
 return Number.isFinite(number)&&number>0?number:null;
};
const finiteNonNegative=value=>{
 if(value===null||value===undefined||value==='')return null;
 const number=Number(value);
 return Number.isFinite(number)&&number>=0?number:null;
};
const sourceRows=row=>(row.evidence||[]).map(item=>({
 type:item.source_type||'',
 name:item.source_name||'Sumber publik',
 url:item.url||'',
 checkedAt:item.checked_at||'',
 text:item.evidence_text||''
}));
const isGenericSource=source=>/search aggregated|hasil pencarian|agregat/i.test(`${source?.name||''} ${source?.type||''}`);
const isAcceptedResearch=(row,sources)=>{
 const status=row.verification_status||'needs_direct_confirmation';
 const confidence=row.confidence||'none';
 const hasSpecificUrl=sources.some(source=>Boolean(source.url)&&!isGenericSource(source));
 if(status==='verified'&&confidence==='high'&&hasSpecificUrl)return true;
 return status==='partially_verified'&&['medium','high'].includes(confidence)&&hasSpecificUrl;
};
for(const row of research){
 const target=row.display_name||row.canonical_name;
 if(!target)continue;
 const previous=existing[target]||{};
 const sources=sourceRows(row);
 const primary=sources.find(item=>item.url&&!isGenericSource(item))||sources.find(item=>item.url)||sources[0]||{};
 const proposedStatus=row.verification_status||'needs_direct_confirmation';
 const proposedConfidence=row.confidence||'none';
 const accepted=isAcceptedResearch(row,sources);
 const proposedTotal=finitePositive(row.court_total);
 const proposedDouble=finiteNonNegative(row.double_court_count);
 const proposedSingle=finiteNonNegative(row.single_court_count);
 const previousTotal=finitePositive(previous.total);
 const previousStrong=previousTotal!==null&&['verified','partially_verified','reviewed_conflict'].includes(previous.status);
 const usePrevious=previousStrong&&((statusRank[previous.status]??0)>(statusRank[proposedStatus]??0)||!accepted);
 const acceptedTotal=usePrevious?previousTotal:(accepted?proposedTotal:null);
 const acceptedDouble=usePrevious?finiteNonNegative(previous.doubleCount):(accepted?proposedDouble:null);
 const acceptedSingle=usePrevious?finiteNonNegative(previous.singleCount):(accepted?proposedSingle:null);
 let status=usePrevious?(previous.status||'partially_verified'):(accepted?proposedStatus:'needs_direct_confirmation');
 let confidence=usePrevious?(previous.confidence||'medium'):(accepted?proposedConfidence:'low');
 if(previous.status==='reviewed_conflict'&&previousTotal!==null){status='reviewed_conflict';confidence=previous.confidence||'medium'}
 const queue=outreach.get(row.venue_id)||null;
 const weakReportedTotal=!accepted&&!usePrevious?proposedTotal:null;
 existing[target]={
  ...previous,
  total:acceptedTotal,
  reportedTotal:weakReportedTotal??previous.reportedTotal??null,
  doubleCount:acceptedDouble,
  singleCount:acceptedSingle,
  reportedDoubleCount:!accepted&&!usePrevious?proposedDouble:(previous.reportedDoubleCount??null),
  reportedSingleCount:!accepted&&!usePrevious?proposedSingle:(previous.reportedSingleCount??null),
  courtNames:Array.isArray(row.court_names)&&row.court_names.length?row.court_names:(previous.courtNames||[]),
  courtType:row.court_type||previous.courtType||'',
  status,
  confidence,
  dataQuality:accepted||usePrevious?'accepted':'reported_unconfirmed',
  source:usePrevious&&previous.source?previous.source:(sources.map(x=>x.name).filter(Boolean).join(' + ')||previous.source||'Riset venue'),
  sourceUrl:usePrevious&&previous.sourceUrl?previous.sourceUrl:(primary.url||previous.sourceUrl||''),
  evidence:usePrevious&&previous.evidence?previous.evidence:(sources.map(x=>x.text).filter(Boolean).join(' ')||previous.evidence||''),
  checkedAt:'14 Juli 2026',
  venueId:row.venue_id,
  canonicalName:row.canonical_name,
  aliases:row.aliases||[],
  researchRegion:row.region,
  researchCity:row.city,
  district:row.district,
  address:row.address,
  venueStatus:row.venue_status,
  researchStatus:row.verification_status,
  researchConfidence:row.confidence,
  duplicateStatus:row.duplicate_status,
  duplicateOf:row.duplicate_of,
  notes:row.notes||'',
  sourceLinks:sources,
  conflicts:row.conflicts||[],
  outreachQueue:Boolean(queue)||Boolean(weakReportedTotal),
  outreachQuestion:queue?.question||'Mohon konfirmasi jumlah court padel aktif dan komposisi double/single court.',
  outreachReason:queue?.reason||(weakReportedTotal?'Angka ditemukan dari sumber agregat atau sumber tanpa URL primer sehingga belum boleh dianggap terverifikasi.':''),
  lastSourceChecked:queue?.last_source_checked||''
 };
}
window.VERIFIED_VENUE_COURTS=existing;
})();
