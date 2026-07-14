(()=>{
'use strict';
const DATA=window.VERIFIED_VENUE_COURTS||{};
const RESEARCH=Array.isArray(window.PBPI_COURT_RESEARCH)?window.PBPI_COURT_RESEARCH:[];
const RESEARCH_SUMMARY=window.PBPI_COURT_RESEARCH_SUMMARY||{};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(padel|club|court|arena|sports?|sport centre|sport center)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
const statusLabel=data=>data?.status==='verified'?'TERVERIFIKASI':data?.status==='reviewed_conflict'?'PERLU REVIEW':data?.status==='partially_verified'?'VERIFIKASI SEBAGIAN':'KONFIRMASI LANGSUNG';
const statusClass=data=>data?.status==='verified'?'verified':data?.status==='reviewed_conflict'?'review':data?.status==='partially_verified'?'partial':'pending';
const courtLabel=data=>Number.isFinite(data?.total)?`${data.total} COURT`:'COURT ?';
const courtTypeLabel=value=>value==='indoor'?'Indoor':value==='outdoor'?'Outdoor':value==='mixed'?'Mixed indoor/outdoor':value||'Belum dirinci';
const confidenceLabel=value=>value==='high'?'HIGH':value==='medium'?'MEDIUM':value==='low'?'LOW':'BELUM DINILAI';

function ensureFilter(){
 const toolbar=document.querySelector('.venue-toolbar-v5');
 if(!toolbar||document.getElementById('venueCourtFilter'))return;
 const label=document.createElement('label');
 label.className='venue-court-filter-v10';
 label.innerHTML='<span>Jumlah & audit court</span><select id="venueCourtFilter"><option value="">Semua court</option><option value="1-2">1–2 court</option><option value="3-4">3–4 court</option><option value="5+">5+ court</option><option value="verified">Court terverifikasi</option><option value="pending">Perlu konfirmasi</option><option value="research">Riset Jabodetabek</option><option value="outreach">Outreach queue</option><option value="conflict">Konflik / duplikat</option></select>';
 toolbar.appendChild(label);
 label.querySelector('select').addEventListener('change',applyCourtFilter);
}

function ensureSummary(){
 const summary=document.querySelector('.venue-summary');
 if(!summary)return;
 if(!document.getElementById('venueCourtTotal')){
  summary.insertAdjacentHTML('beforeend','<div class="venue-court-summary-v10"><b id="venueCourtTotal">0</b><span>Total court terdata</span></div><div class="venue-court-summary-v10"><b id="venueCourtCoverage">0%</b><span>Cakupan angka court</span></div>');
 }
 const values=Object.values(DATA);
 const known=values.filter(item=>Number.isFinite(item.total));
 const total=known.reduce((sum,item)=>sum+item.total,0);
 document.getElementById('venueCourtTotal').textContent=String(total);
 document.getElementById('venueCourtCoverage').textContent=`${Math.round((known.length/Math.max(values.length,1))*100)}%`;
}

function ensureResearchSummary(){
 const toolbar=document.querySelector('.venue-toolbar-v5');
 if(!toolbar||document.getElementById('venueResearchSummaryV11'))return;
 const box=document.createElement('div');
 box.id='venueResearchSummaryV11';
 box.className='venue-research-summary-v11';
 box.innerHTML=`<div><span>Dataset Jabodetabek</span><b>${esc(RESEARCH_SUMMARY.researchVenues||RESEARCH.length)} venue</b></div><div><span>Total court JSON</span><b>${esc(RESEARCH_SUMMARY.researchCourts||0)}</b></div><div><span>Verified / partial</span><b>${esc(RESEARCH_SUMMARY.verified||0)} / ${esc(RESEARCH_SUMMARY.partiallyVerified||0)}</b></div><div><span>Outreach queue</span><b>${esc(RESEARCH_SUMMARY.outreachQueue||0)}</b></div><p><strong>Sumber hitung utama:</strong> venue_court_research.json dan CSV. Ringkasan Markdown memiliki angka yang tidak konsisten, sehingga tidak dipakai sebagai total final.</p>`;
 toolbar.parentNode.insertBefore(box,toolbar);
}

function wrapDetails(card){
 if(card.querySelector('.venue-more-v10'))return;
 const nodes=[card.querySelector('.venue-contact-grid'),card.querySelector('.venue-no-contact'),card.querySelector('.venue-preview'),card.querySelector('.venue-preview-links'),card.querySelector('.venue-source-row')].filter(Boolean);
 if(!nodes.length)return;
 const details=document.createElement('details');
 details.className='venue-more-v10';
 details.open=window.matchMedia('(min-width:761px)').matches;
 const summary=document.createElement('summary');
 summary.innerHTML='<span>Detail kontak & sumber</span><b>⌄</b>';
 details.appendChild(summary);
 const host=document.createElement('div');
 host.className='venue-more-body-v10';
 nodes[0].parentNode.insertBefore(details,nodes[0]);
 details.appendChild(host);
 nodes.forEach(node=>host.appendChild(node));
}

function composition(data){
 const parts=[];
 if(Number.isFinite(data?.doubleCount))parts.push(`${data.doubleCount} double`);
 if(Number.isFinite(data?.singleCount)&&data.singleCount>0)parts.push(`${data.singleCount} single`);
 if(data?.courtType)parts.push(courtTypeLabel(data.courtType));
 return parts.join(' • ');
}
function courtFacts(data){
 const source=data?.sourceUrl?`<a href="${esc(data.sourceUrl)}" target="_blank" rel="noopener">Buka bukti utama ↗</a>`:'';
 const total=Number.isFinite(data?.total)?`<strong>${data.total}</strong><span>court padel aktif/terdata</span>`:'<strong>?</strong><span>menunggu konfirmasi pengelola</span>';
 const comp=composition(data);
 return `<div class="venue-court-facts-v10 ${statusClass(data)}"><div class="venue-court-number-v10">${total}</div><div class="venue-court-proof-v10"><b>${esc(statusLabel(data))}</b><span>${esc(comp||data?.source||'Sumber publik belum cukup')}</span>${comp&&data?.source?`<span>${esc(data.source)}</span>`:''}${source}</div></div>`;
}

function sourceList(data){
 const rows=Array.isArray(data?.sourceLinks)?data.sourceLinks.filter(x=>x?.name||x?.url||x?.text):[];
 if(!rows.length)return '';
 return `<div class="venue-research-sources-v11"><b>Bukti riset</b>${rows.slice(0,4).map(item=>`<div>${item.url?`<a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.name||'Buka sumber')} ↗</a>`:`<span>${esc(item.name||'Sumber')}</span>`}${item.text?`<small>${esc(item.text)}</small>`:''}</div>`).join('')}</div>`;
}
function conflictList(data){
 const rows=Array.isArray(data?.conflicts)?data.conflicts:[];
 const duplicate=data?.duplicateStatus==='possible_duplicate';
 if(!rows.length&&!duplicate)return '';
 return `<div class="venue-research-warning-v11"><b>⚠️ Konflik data</b>${duplicate?`<p>Kemungkinan cabang/duplikat dari ${esc(data.duplicateOf||'venue lain')}. Perlu konfirmasi langsung.</p>`:''}${rows.map(item=>`<p><strong>${esc(item.field||'Data')}:</strong> rekomendasi ${esc(item.recommended_value??'perlu konfirmasi')}. ${esc(item.reason||'')}</p>`).join('')}</div>`;
}
function outreachBlock(data){
 if(!data?.outreachQueue)return '';
 return `<div class="venue-research-outreach-v11"><b>📨 Masuk Outreach Queue</b><p>${esc(data.outreachQuestion||'Perlu konfirmasi langsung ke pengelola.')}</p>${data.outreachReason?`<small>${esc(data.outreachReason)}</small>`:''}</div>`;
}
function researchPanel(data){
 if(!data?.venueId)return '';
 const names=Array.isArray(data.courtNames)&&data.courtNames.length?data.courtNames.join(', '):'Nama court belum dirinci';
 return `<details class="venue-research-v11"><summary><span>${esc(data.venueId)} • Confidence ${esc(confidenceLabel(data.researchConfidence||data.confidence))}</span><b>⌄</b></summary><div class="venue-research-body-v11"><div class="venue-research-grid-v11"><div><span>Wilayah</span><strong>${esc(data.researchRegion||data.researchCity||'')}</strong></div><div><span>Tipe</span><strong>${esc(courtTypeLabel(data.courtType))}</strong></div><div><span>Komposisi</span><strong>${esc(composition(data)||'Belum dirinci')}</strong></div><div><span>Status venue</span><strong>${esc(data.venueStatus||'active')}</strong></div></div><p><strong>Nama court:</strong> ${esc(names)}</p>${data.notes?`<p><strong>Catatan:</strong> ${esc(data.notes)}</p>`:''}${conflictList(data)}${outreachBlock(data)}${sourceList(data)}</div></details>`;
}

function patchCard(card){
 const name=card.querySelector('.venue-title-row h3')?.textContent?.trim();
 if(!name)return;
 const data=DATA[name]||null;
 card.dataset.venueName=name;
 card.dataset.venueKey=normalize(name);
 card.dataset.courtTotal=Number.isFinite(data?.total)?String(data.total):'';
 card.dataset.courtStatus=data?.status||'needs_direct_confirmation';
 card.dataset.courtResearch=data?.venueId?'1':'0';
 card.dataset.courtOutreach=data?.outreachQueue?'1':'0';
 card.dataset.courtConflict=(data?.duplicateStatus==='possible_duplicate'||(Array.isArray(data?.conflicts)&&data.conflicts.length))?'1':'0';
 card.querySelector('.venue-court-badge-v10')?.remove();
 const thumb=card.querySelector('.venue-thumb-v5');
 if(thumb){
  const badge=document.createElement('span');
  badge.className=`venue-court-badge-v10 ${statusClass(data)}`;
  badge.textContent=courtLabel(data);
  thumb.appendChild(badge);
 }
 card.querySelector('.venue-court-facts-v10')?.remove();
 card.querySelector('.venue-research-v11')?.remove();
 const address=card.querySelector('.venue-address');
 if(address){
  address.insertAdjacentHTML('afterend',courtFacts(data));
  const facts=card.querySelector('.venue-court-facts-v10');
  if(data?.venueId)facts?.insertAdjacentHTML('afterend',researchPanel(data));
 }
 wrapDetails(card);
}

function markDuplicates(){
 const cards=[...document.querySelectorAll('.venue-card-v5')];
 const groups={};
 cards.forEach(card=>{const key=card.dataset.venueKey;if(key)(groups[key]||(groups[key]=[])).push(card)});
 Object.values(groups).forEach(group=>group.forEach(card=>card.classList.toggle('venue-duplicate-v10',group.length>1)));
}

function matchesCourt(card,filter){
 const total=Number(card.dataset.courtTotal||0),known=Boolean(card.dataset.courtTotal);
 if(!filter)return true;
 if(filter==='1-2')return known&&total<=2;
 if(filter==='3-4')return known&&total>=3&&total<=4;
 if(filter==='5+')return known&&total>=5;
 if(filter==='verified')return known&&card.dataset.courtStatus==='verified';
 if(filter==='pending')return !known||['needs_direct_confirmation','reviewed_conflict','partially_verified'].includes(card.dataset.courtStatus);
 if(filter==='research')return card.dataset.courtResearch==='1';
 if(filter==='outreach')return card.dataset.courtOutreach==='1';
 if(filter==='conflict')return card.dataset.courtConflict==='1';
 return true;
}

function applyCourtFilter(){
 const filter=document.getElementById('venueCourtFilter')?.value||'';
 const cards=[...document.querySelectorAll('.venue-card-v5')];
 cards.forEach(card=>{card.hidden=!matchesCourt(card,filter)});
 const visible=cards.filter(card=>!card.hidden).length;
 const shown=document.getElementById('venueShown');if(shown)shown.textContent=String(visible);
 const line=document.querySelector('.venue-result-line');
 if(line){
  let audit=line.querySelector('.venue-court-audit-v10');
  if(!audit){audit=document.createElement('span');audit.className='venue-court-audit-v10';line.appendChild(audit)}
  const known=cards.filter(card=>card.dataset.courtTotal).length;
  audit.textContent=` • ${known}/${cards.length} venue tampil punya angka court`;
 }
}

function patchCopy(){
 const intro=document.querySelector('.venue-mobile-head p');
 if(intro)intro.textContent='Direktori nasional plus riset court Jabodetabek: jumlah court, komposisi double/single, confidence, konflik, outreach, kontak resmi, dan sumber bukti.';
 const note=document.querySelector('.venue-source-note');
 if(note)note.innerHTML='<strong>Standar data:</strong> JSON dan CSV riset menjadi sumber angka utama untuk 34 venue Jabodetabek. Sumber resmi lama yang lebih kuat tetap dipertahankan. AYO generik tidak dianggap sebagai kontak langsung.';
}

function validate(){
 const rendered=[...document.querySelectorAll('.venue-card-v5')].map(card=>card.dataset.venueName).filter(Boolean);
 const allNames=Array.isArray(window.VENUE_DIRECTORY_ALL_NAMES)?window.VENUE_DIRECTORY_ALL_NAMES:rendered;
 const missing=allNames.filter(name=>!Object.prototype.hasOwnProperty.call(DATA,name));
 const orphan=Object.keys(DATA).filter(name=>!allNames.includes(name));
 window.VENUE_COURT_DATA_HEALTH={
  cards:allNames.length,
  rendered:rendered.length,
  records:Object.keys(DATA).length,
  missing,orphan,
  known:Object.values(DATA).filter(x=>Number.isFinite(x.total)).length,
  totalCourts:Object.values(DATA).reduce((sum,x)=>sum+(Number.isFinite(x.total)?x.total:0),0),
  researchVenues:RESEARCH.length,
  researchCourts:RESEARCH.reduce((sum,x)=>sum+(Number(x.court_total)||0),0)
 };
 document.documentElement.dataset.courtDataHealth=missing.length||orphan.length?'review':'ok';
}

function patchAll(){
 ensureFilter();ensureSummary();ensureResearchSummary();patchCopy();
 document.querySelectorAll('.venue-card-v5').forEach(patchCard);
 markDuplicates();applyCourtFilter();validate();
}
function install(){
 patchAll();
 const grid=document.getElementById('venueGrid');
 if(grid&&!grid.dataset.courtObserverV10){
  grid.dataset.courtObserverV10='1';
  new MutationObserver(()=>queueMicrotask(patchAll)).observe(grid,{childList:true,subtree:false});
 }
 document.addEventListener('venue-directory-rendered',()=>queueMicrotask(patchAll));
 document.addEventListener('click',event=>{if(event.target.closest('[data-tab="lapangan"]'))setTimeout(patchAll,80)});
 window.addEventListener('resize',()=>{document.querySelectorAll('.venue-more-v10').forEach(details=>{if(window.innerWidth>760)details.open=true})},{passive:true});
}
try{install()}catch(error){console.error('Venue court v10 failed:',error)}
})();