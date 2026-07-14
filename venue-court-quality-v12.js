(()=>{
'use strict';
const data=window.VERIFIED_VENUE_COURTS||{};
const valid=value=>Number.isFinite(value)&&value>0;
function patchSummary(){
 const summary=document.querySelector('.venue-summary');if(!summary)return;
 let reported=document.getElementById('venueCourtReported');
 if(!reported){
  const card=document.createElement('div');card.className='venue-court-summary-v10 venue-reported-summary-v12';
  card.innerHTML='<b id="venueCourtReported">0</b><span>Angka terlapor, belum final</span>';
  summary.appendChild(card);reported=card.querySelector('b');
 }
 const values=Object.values(data),accepted=values.filter(item=>valid(item.total)),unconfirmed=values.filter(item=>!valid(item.total)&&valid(item.reportedTotal));
 reported.textContent=String(unconfirmed.reduce((sum,item)=>sum+item.reportedTotal,0));
 const total=document.getElementById('venueCourtTotal');if(total)total.textContent=String(accepted.reduce((sum,item)=>sum+item.total,0));
 const coverage=document.getElementById('venueCourtCoverage');if(coverage)coverage.textContent=`${Math.round(accepted.length/Math.max(values.length,1)*100)}%`;
}
function patchCard(card){
 const name=card.querySelector('.venue-title-row h3')?.textContent?.trim(),item=data[name];
 if(!name||!item)return;
 const reported=!valid(item.total)&&valid(item.reportedTotal);
 card.dataset.courtReported=reported?'1':'0';
 if(!reported)return;
 card.dataset.courtTotal=String(item.reportedTotal);
 card.dataset.courtStatus='needs_direct_confirmation';
 const badge=card.querySelector('.venue-court-badge-v10');
 if(badge){badge.textContent=`${item.reportedTotal} TERLAPOR`;badge.classList.remove('verified','partial');badge.classList.add('reported')}
 const facts=card.querySelector('.venue-court-facts-v10');
 if(facts){
  facts.classList.remove('verified','partial');facts.classList.add('reported');
  const number=facts.querySelector('.venue-court-number-v10');if(number)number.innerHTML=`<strong>${item.reportedTotal}</strong><span>court terlapor, belum dikonfirmasi</span>`;
  const proof=facts.querySelector('.venue-court-proof-v10');if(proof){
   const heading=proof.querySelector('b');if(heading)heading.textContent='ANGKA TERLAPOR • KONFIRMASI WAJIB';
   const firstSpan=proof.querySelector('span');if(firstSpan)firstSpan.textContent='Belum memiliki bukti primer yang cukup untuk status terverifikasi.';
  }
 }
 const panel=card.querySelector('.venue-research-v11 .venue-research-body-v11');
 if(panel&&!panel.querySelector('.venue-reported-warning-v12'))panel.insertAdjacentHTML('afterbegin','<div class="venue-reported-warning-v12"><b>⚠️ Angka belum final</b><p>Jumlah court ini berasal dari hasil agregat atau sumber sekunder. Gunakan untuk riset awal, bukan surat resmi atau keputusan operasional.</p></div>');
}
function patchHealth(){
 const values=Object.values(data),accepted=values.filter(item=>valid(item.total)),reported=values.filter(item=>!valid(item.total)&&valid(item.reportedTotal));
 window.VENUE_COURT_QUALITY_V12={records:values.length,accepted:accepted.length,reported:reported.length,pending:values.length-accepted.length-reported.length,acceptedCourts:accepted.reduce((sum,item)=>sum+item.total,0),reportedCourts:reported.reduce((sum,item)=>sum+item.reportedTotal,0),zeroTotals:values.filter(item=>item.total===0||item.reportedTotal===0).length};
}
function patch(){patchSummary();document.querySelectorAll('.venue-card-v5').forEach(patchCard);patchHealth()}
function install(){patch();document.addEventListener('venue-directory-rendered',()=>queueMicrotask(patch));const grid=document.getElementById('venueGrid');if(grid&&!grid.dataset.qualityObserverV12){grid.dataset.qualityObserverV12='1';new MutationObserver(()=>queueMicrotask(patch)).observe(grid,{childList:true,subtree:false})}}
try{install()}catch(error){console.error('Venue court quality v12 failed:',error)}
})();
