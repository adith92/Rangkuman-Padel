(()=>{
'use strict';
const DATA=window.VERIFIED_VENUE_COURTS||{};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(padel|club|court|arena|sports?|sport centre|sport center)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
const statusLabel=data=>data?.status==='verified'?'TERVERIFIKASI':data?.status==='reviewed_conflict'?'PERLU REVIEW':data?.status==='partially_verified'?'VERIFIKASI SEBAGIAN':'KONFIRMASI LANGSUNG';
const statusClass=data=>data?.status==='verified'?'verified':data?.status==='reviewed_conflict'?'review':data?.status==='partially_verified'?'partial':'pending';
const courtLabel=data=>Number.isFinite(data?.total)?`${data.total} COURT`:'COURT ?';

function ensureFilter(){
 const toolbar=document.querySelector('.venue-toolbar-v5');
 if(!toolbar||document.getElementById('venueCourtFilter'))return;
 const label=document.createElement('label');
 label.className='venue-court-filter-v10';
 label.innerHTML='<span>Jumlah court</span><select id="venueCourtFilter"><option value="">Semua court</option><option value="1-2">1–2 court</option><option value="3-4">3–4 court</option><option value="5+">5+ court</option><option value="verified">Court terverifikasi</option><option value="pending">Perlu konfirmasi</option></select>';
 toolbar.appendChild(label);
 label.querySelector('select').addEventListener('change',applyCourtFilter);
}

function ensureSummary(){
 const summary=document.querySelector('.venue-summary');
 if(!summary)return;
 if(!document.getElementById('venueCourtTotal')){
  summary.insertAdjacentHTML('beforeend','<div class="venue-court-summary-v10"><b id="venueCourtTotal">0</b><span>Total court terdata</span></div><div class="venue-court-summary-v10"><b id="venueCourtCoverage">0%</b><span>Cakupan data court</span></div>');
 }
 const values=Object.values(DATA);
 const known=values.filter(item=>Number.isFinite(item.total));
 const total=known.reduce((sum,item)=>sum+item.total,0);
 document.getElementById('venueCourtTotal').textContent=String(total);
 document.getElementById('venueCourtCoverage').textContent=`${Math.round((known.length/Math.max(values.length,1))*100)}%`;
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

function courtFacts(data){
 const source=data?.sourceUrl?`<a href="${esc(data.sourceUrl)}" target="_blank" rel="noopener">Buka bukti ↗</a>`:'';
 const total=Number.isFinite(data?.total)?`<strong>${data.total}</strong><span>court padel aktif/terdaftar</span>`:'<strong>?</strong><span>menunggu konfirmasi pengelola</span>';
 return `<div class="venue-court-facts-v10 ${statusClass(data)}"><div class="venue-court-number-v10">${total}</div><div class="venue-court-proof-v10"><b>${esc(statusLabel(data))}</b><span>${esc(data?.source||'Sumber publik belum cukup')}</span>${source}</div></div>`;
}

function patchCard(card){
 const name=card.querySelector('.venue-title-row h3')?.textContent?.trim();
 if(!name)return;
 const data=DATA[name]||null;
 card.dataset.venueName=name;
 card.dataset.venueKey=normalize(name);
 card.dataset.courtTotal=Number.isFinite(data?.total)?String(data.total):'';
 card.dataset.courtStatus=data?.status||'needs_direct_confirmation';
 card.querySelector('.venue-court-badge-v10')?.remove();
 const thumb=card.querySelector('.venue-thumb-v5');
 if(thumb){
  const badge=document.createElement('span');
  badge.className=`venue-court-badge-v10 ${statusClass(data)}`;
  badge.textContent=courtLabel(data);
  thumb.appendChild(badge);
 }
 card.querySelector('.venue-court-facts-v10')?.remove();
 const address=card.querySelector('.venue-address');
 if(address)address.insertAdjacentHTML('afterend',courtFacts(data));
 wrapDetails(card);
}

function markDuplicates(){
 const cards=[...document.querySelectorAll('.venue-card-v5')];
 const groups={};
 cards.forEach(card=>{const key=card.dataset.venueKey;if(key)(groups[key]||(groups[key]=[])).push(card)});
 Object.values(groups).forEach(group=>group.forEach(card=>card.classList.toggle('venue-duplicate-v10',group.length>1)));
}

function matchesCourt(card,filter){
 const total=Number(card.dataset.courtTotal||0);
 const known=Boolean(card.dataset.courtTotal);
 if(!filter)return true;
 if(filter==='1-2')return known&&total<=2;
 if(filter==='3-4')return known&&total>=3&&total<=4;
 if(filter==='5+')return known&&total>=5;
 if(filter==='verified')return known&&card.dataset.courtStatus==='verified';
 if(filter==='pending')return !known||['needs_direct_confirmation','reviewed_conflict','partially_verified'].includes(card.dataset.courtStatus);
 return true;
}

function applyCourtFilter(){
 const filter=document.getElementById('venueCourtFilter')?.value||'';
 const cards=[...document.querySelectorAll('.venue-card-v5')];
 cards.forEach(card=>{card.hidden=!matchesCourt(card,filter)});
 const visible=cards.filter(card=>!card.hidden).length;
 const shown=document.getElementById('venueShown');if(shown)shown.textContent=String(visible);
 const line=document.querySelector('.venue-result-line');
 if(line){let audit=line.querySelector('.venue-court-audit-v10');if(!audit){audit=document.createElement('span');audit.className='venue-court-audit-v10';line.appendChild(audit)}const known=cards.filter(card=>card.dataset.courtTotal).length;audit.textContent=` • ${known}/${cards.length} venue punya angka court`}
}

function patchCopy(){
 const intro=document.querySelector('.venue-mobile-head p');
 if(intro)intro.textContent='Direktori mobile-first dengan kontak resmi, jumlah court, sumber bukti, filter cepat, dan status verifikasi per venue.';
 const note=document.querySelector('.venue-source-note');
 if(note)note.innerHTML='<strong>Standar data court:</strong> angka berasal dari produk lapangan di booking resmi, deskripsi venue, atau website resmi. Lapangan tenis, pickleball, badminton, dan fasilitas non-padel tidak dihitung. Data konflik diberi label review.';
}

function validate(){
 const cardNames=[...document.querySelectorAll('.venue-card-v5')].map(card=>card.dataset.venueName).filter(Boolean);
 const missing=cardNames.filter(name=>!Object.prototype.hasOwnProperty.call(DATA,name));
 const orphan=Object.keys(DATA).filter(name=>!cardNames.includes(name));
 window.VENUE_COURT_DATA_HEALTH={cards:cardNames.length,records:Object.keys(DATA).length,missing,orphan,known:Object.values(DATA).filter(x=>Number.isFinite(x.total)).length,totalCourts:Object.values(DATA).reduce((sum,x)=>sum+(Number.isFinite(x.total)?x.total:0),0)};
 document.documentElement.dataset.courtDataHealth=missing.length||orphan.length?'review':'ok';
}

function patchAll(){
 ensureFilter();ensureSummary();patchCopy();
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
 document.addEventListener('click',event=>{if(event.target.closest('[data-tab="lapangan"]'))setTimeout(patchAll,80)});
 window.addEventListener('resize',()=>{document.querySelectorAll('.venue-more-v10').forEach(details=>{if(window.innerWidth>760)details.open=true})},{passive:true});
}
try{install()}catch(error){console.error('Venue court v10 failed:',error)}
})();
