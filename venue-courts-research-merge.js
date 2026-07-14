(()=>{
'use strict';
const research=Array.isArray(window.PBPI_COURT_RESEARCH)?window.PBPI_COURT_RESEARCH:[];
const outreachRows=Array.isArray(window.PBPI_COURT_OUTREACH)?window.PBPI_COURT_OUTREACH:[];
const outreach=new Map(outreachRows.map(row=>[row.venue_id,row]));
const statusRank={needs_direct_confirmation:0,partially_verified:1,reviewed_conflict:1,verified:2};
const confidenceRank={none:0,low:1,medium:2,high:3};
const existing=window.VERIFIED_VENUE_COURTS||{};
const sourceRows=row=>(row.evidence||[]).map(item=>({
 type:item.source_type||'',
 name:item.source_name||'Sumber publik',
 url:item.url||'',
 checkedAt:item.checked_at||'',
 text:item.evidence_text||''
}));
for(const row of research){
 const target=row.display_name||row.canonical_name;
 const previous=existing[target]||{};
 const sources=sourceRows(row);
 const primary=sources.find(item=>item.url)||sources[0]||{};
 const proposedStatus=row.verification_status||'needs_direct_confirmation';
 const previousStatus=previous.status||'needs_direct_confirmation';
 const status=(statusRank[previousStatus]??0)>(statusRank[proposedStatus]??0)?previousStatus:proposedStatus;
 const proposedConfidence=row.confidence||'none';
 const previousConfidence=previous.confidence||'none';
 const confidence=(confidenceRank[previousConfidence]??0)>(confidenceRank[proposedConfidence]??0)?previousConfidence:proposedConfidence;
 const preferPrevious=(statusRank[previousStatus]??0)>(statusRank[proposedStatus]??0);
 const queue=outreach.get(row.venue_id)||null;
 existing[target]={
  ...previous,
  total:Number(row.court_total),
  doubleCount:Number(row.double_court_count),
  singleCount:Number(row.single_court_count),
  courtNames:Array.isArray(row.court_names)?row.court_names:[],
  courtType:row.court_type||'',
  status,
  confidence,
  source:preferPrevious&&previous.source?previous.source:(sources.map(x=>x.name).filter(Boolean).join(' + ')||previous.source||'Riset venue'),
  sourceUrl:preferPrevious&&previous.sourceUrl?previous.sourceUrl:(primary.url||previous.sourceUrl||''),
  evidence:preferPrevious&&previous.evidence?previous.evidence:(sources.map(x=>x.text).filter(Boolean).join(' ')||previous.evidence||''),
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
  outreachQueue:Boolean(queue),
  outreachQuestion:queue?.question||'',
  outreachReason:queue?.reason||'',
  lastSourceChecked:queue?.last_source_checked||''
 };
}
window.VERIFIED_VENUE_COURTS=existing;
})();