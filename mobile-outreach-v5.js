(()=>{
'use strict';

const FIRST_MESSAGE='Assalamualaikum';
const EMAIL_SUBJECT='Penjajakan Kerja Sama Turnamen Padel Nasional';
const EMAIL_BODY=name=>`Assalamualaikum,\n\nPerkenalkan, kami sedang mempersiapkan Turnamen Padel Nasional dalam rangka HUT TNI ke-81. Kami ingin terhubung dengan pengelola ${name} untuk membahas kemungkinan kerja sama venue dan penyelenggaraan event.\n\nMohon informasi PIC yang dapat kami hubungi.\n\nTerima kasih.`;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const cleanNumber=value=>String(value||'').replace(/\D/g,'');
const instagramUsername=value=>String(value||'').replace(/^https?:\/\/(www\.)?instagram\.com\//i,'').replace(/^@/,'').split(/[/?#]/)[0];
const initials=name=>String(name||'Venue').replace(/[^A-Za-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).slice(0,3).map(word=>word[0]).join('').toUpperCase();
const precision=value=>value==='verified_address'?'Alamat jelas':value==='online_geocoded'?'Pin tersimpan':value==='name_search'?'Pencarian nama':'Titik kota';
const googleSearch=query=>`https://www.google.com/search?q=${encodeURIComponent(query)}`;
const mapsUrl=venue=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.searchQuery||`${venue.name}, ${venue.city}, Indonesia`)}`;
const ayoUrl=venue=>googleSearch(`site:ayo.co.id ${venue.name} ${venue.city} padel`);

const VENUE_META={
 'Padel Playy Brawijaya':{
  phone:'+62 823-4282-0090',
  whatsapp:'6282342820090',
  instagram:'padelplayy',
  status:'verified',
  source:'Direktori awal website',
  sourceUrl:'https://instagram.com/padelplayy',
  updated:'14 Juli 2026'
 }
};

function metaFor(venue){
 const existing=(typeof window.courtContacts==='object'&&window.courtContacts?.[venue.name])||{};
 return {...existing,...(VENUE_META[venue.name]||{})};
}

function isVerified(meta){
 return meta.status==='verified'||Boolean(meta.whatsapp||meta.phone||meta.email||meta.instagram||meta.website);
}

function venueShell(){return `
 <div class="venue-mobile-head">
  <div><span class="report-kicker">MOBILE OUTREACH DIRECTORY</span><h2>Venue Padel & Kontak Langsung</h2><p>Lihat bentuk venue, cek sumber, lalu hubungi pengelola lewat WhatsApp, DM Instagram, email, telepon, atau Maps langsung dari HP.</p></div>
  <button type="button" class="venue-copy-master" id="copyFirstMessage"><span>📋</span><b>Salin “Assalamualaikum”</b></button>
 </div>
 <div class="venue-first-rule"><span>1</span><div><strong>Kontak pertama cukup “Assalamualaikum”.</strong><p>Setelah dibalas, minta nama, jabatan, dan PIC event. Tombol WhatsApp sudah otomatis mengisi pesan pembuka ini.</p></div></div>
 <div class="venue-summary">
  <div><b id="venueTotal">0</b><span>Total venue</span></div>
  <div><b id="venueAddress">0</b><span>Alamat jelas</span></div>
  <div><b id="venueContact">0</b><span>Punya kontak langsung</span></div>
  <div><b id="venueSocial">0</b><span>Punya Instagram</span></div>
 </div>
 <div class="venue-toolbar venue-toolbar-v5">
  <label><span>Cari venue</span><input id="venueSearch" type="search" inputmode="search" placeholder="Nama venue, kota, provinsi..."></label>
  <label><span>Provinsi</span><select id="venueProvince"><option value="">Semua provinsi</option></select></label>
  <label><span>Jalur kontak</span><select id="venueDataStatus"><option value="">Semua data</option><option value="direct">Ada kontak langsung</option><option value="whatsapp">Ada WhatsApp</option><option value="instagram">Ada Instagram / DM</option><option value="email">Ada email</option><option value="needs-verification">Perlu verifikasi</option></select></label>
 </div>
 <div class="venue-result-line"><strong id="venueShown">0</strong> venue tampil <span>•</span> Klik kartu untuk buka informasi lengkap.</div>
 <div class="venue-grid venue-grid-v5" id="venueGrid"></div>
 <div class="venue-source-note"><strong>Referensi data:</strong> direktori internal, Google Maps, akun resmi venue, serta pencarian venue-spesifik di AYO.co.id. Tombol AYO membuka hasil pencarian referensi dan bukan tanda bahwa listing telah diverifikasi.</div>`}

function visualHtml(venue,meta){
 if(meta.image){
  return `<img src="${esc(meta.image)}" alt="Lapangan ${esc(venue.name)}" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="venue-court-art" hidden><span>${esc(initials(venue.name))}</span></div>`;
 }
 return `<div class="venue-court-art" aria-label="Thumbnail ilustrasi ${esc(venue.name)}"><i></i><span>${esc(initials(venue.name))}</span></div>`;
}

function directActions(venue,meta){
 const whatsapp=cleanNumber(meta.whatsapp||meta.phone);
 const username=instagramUsername(meta.instagram);
 const email=String(meta.email||'').trim();
 const phone=cleanNumber(meta.phone);
 const actions=[];
 if(whatsapp)actions.push(`<a class="venue-action primary wa" href="https://wa.me/${whatsapp}?text=${encodeURIComponent(FIRST_MESSAGE)}" target="_blank" rel="noopener"><span>💬</span><b>WhatsApp</b></a>`);
 if(username)actions.push(`<a class="venue-action primary dm" href="https://ig.me/m/${encodeURIComponent(username)}" target="_blank" rel="noopener"><span>✉️</span><b>Kirim DM</b></a>`);
 if(email)actions.push(`<a class="venue-action email" href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY(venue.name))}"><span>📧</span><b>Email</b></a>`);
 if(phone)actions.push(`<a class="venue-action phone" href="tel:+${phone}"><span>📞</span><b>Telepon</b></a>`);
 actions.push(`<a class="venue-action maps" href="${mapsUrl(venue)}" target="_blank" rel="noopener"><span>📍</span><b>Maps</b></a>`);
 if(username)actions.push(`<a class="venue-action ig" href="https://instagram.com/${encodeURIComponent(username)}" target="_blank" rel="noopener"><span>📸</span><b>Profil IG</b></a>`);
 actions.push(`<a class="venue-action ayo" href="${ayoUrl(venue)}" target="_blank" rel="noopener"><span>🎾</span><b>Cek AYO</b></a>`);
 actions.push(`<button type="button" class="venue-action copy" data-copy-message="${esc(FIRST_MESSAGE)}"><span>📋</span><b>Salin Pesan</b></button>`);
 return actions.join('');
}

function fallbackActions(venue){
 return `<a class="venue-action search-contact" href="${googleSearch(`${venue.name} ${venue.city} nomor WhatsApp Instagram resmi`)}" target="_blank" rel="noopener"><span>🔎</span><b>Cari Kontak</b></a>`;
}

function contactRows(meta){
 const username=instagramUsername(meta.instagram);
 return [
  meta.whatsapp&&`<div><span>WhatsApp</span><strong>${esc(meta.whatsappLabel||meta.whatsapp||meta.phone)}</strong></div>`,
  meta.phone&&`<div><span>Telepon</span><strong>${esc(meta.phone)}</strong></div>`,
  username&&`<div><span>Instagram</span><strong>@${esc(username)}</strong></div>`,
  meta.email&&`<div><span>Email</span><strong>${esc(meta.email)}</strong></div>`
 ].filter(Boolean).join('');
}

function previewHtml(venue,meta){
 const username=instagramUsername(meta.instagram);
 if(meta.instagramPost){
  const url=String(meta.instagramPost).replace(/\/$/,'');
  return `<details class="venue-preview"><summary>📱 Buka embed Instagram</summary><iframe title="Instagram ${esc(venue.name)}" loading="lazy" src="${esc(url)}/embed" allowtransparency="true"></iframe></details>`;
 }
 if(meta.image||username){
  return `<div class="venue-preview-links">${meta.image?`<a href="${esc(meta.image)}" target="_blank" rel="noopener">🖼️ Buka foto</a>`:''}${username?`<a href="https://instagram.com/${encodeURIComponent(username)}" target="_blank" rel="noopener">📸 Lihat foto di Instagram</a>`:''}</div>`;
 }
 return '';
}

function renderVenueCard(venue){
 const meta=metaFor(venue);
 const verified=isVerified(meta);
 const hasDirect=Boolean(meta.whatsapp||meta.phone||meta.email||meta.instagram);
 const contactInfo=contactRows(meta);
 return `<article class="venue-card venue-card-v5 ${verified?'verified':'pending'}">
  <div class="venue-thumb venue-thumb-v5">${visualHtml(venue,meta)}<span class="venue-city">${esc(venue.city)} • ${esc(venue.province)}</span><span class="venue-data-badge ${verified?'verified':'pending'}">${verified?'DATA KONTAK ADA':'PERLU VERIFIKASI'}</span></div>
  <div class="venue-body venue-body-v5">
   <div class="venue-title-row"><div><h3>${esc(venue.name)}</h3><p class="venue-location">${esc(venue.city)}, ${esc(venue.province)}</p></div><span class="venue-source-mini">${esc(meta.updated||'Belum dicek')}</span></div>
   <p class="venue-address"><span>📍</span><span>${esc(venue.address||`${venue.city}, ${venue.province}`)}<small>Presisi: ${precision(venue.precision)}</small></span></p>
   ${contactInfo?`<div class="venue-contact-grid">${contactInfo}</div>`:`<div class="venue-no-contact"><strong>Kontak belum tersedia.</strong><span>Gunakan pencarian resmi, AYO, Instagram, atau Maps untuk verifikasi PIC.</span></div>`}
   ${previewHtml(venue,meta)}
   <div class="venue-actions venue-actions-v5">${directActions(venue,meta)}${hasDirect?'':fallbackActions(venue)}</div>
   <div class="venue-source-row"><span>🛡️ ${esc(meta.source||'Belum ada sumber kontak terverifikasi')}</span>${meta.sourceUrl?`<a href="${esc(meta.sourceUrl)}" target="_blank" rel="noopener">Buka sumber</a>`:''}</div>
  </div>
 </article>`;
}

function venueMatches(venue,query,province,status){
 const meta=metaFor(venue);
 const haystack=[venue.name,venue.city,venue.province,venue.address,meta.phone,meta.email,meta.instagram,meta.source].join(' ').toLowerCase();
 const direct=Boolean(meta.whatsapp||meta.phone||meta.email||meta.instagram);
 const statusMatch=!status||
  (status==='direct'&&direct)||
  (status==='whatsapp'&&Boolean(meta.whatsapp||meta.phone))||
  (status==='instagram'&&Boolean(meta.instagram))||
  (status==='email'&&Boolean(meta.email))||
  (status==='needs-verification'&&!isVerified(meta));
 return (!query||haystack.includes(query))&&(!province||venue.province===province)&&statusMatch;
}

function getVenues(){
 if(typeof NATIONAL_POINTS==='undefined'||!Array.isArray(NATIONAL_POINTS))return [];
 return NATIONAL_POINTS.filter(point=>point.category==='padel');
}

function renderVenuesV5(){
 const grid=document.getElementById('venueGrid');
 if(!grid)return;
 const query=(document.getElementById('venueSearch')?.value||'').toLowerCase().trim();
 const province=document.getElementById('venueProvince')?.value||'';
 const status=document.getElementById('venueDataStatus')?.value||'';
 const all=getVenues();
 const shown=all.filter(venue=>venueMatches(venue,query,province,status));
 grid.innerHTML=shown.map(renderVenueCard).join('')||'<div class="venue-empty"><span>🔎</span><strong>Venue tidak ditemukan</strong><p>Coba ubah kata pencarian atau filter provinsi.</p></div>';
 const withMeta=all.map(venue=>({venue,meta:metaFor(venue)}));
 document.getElementById('venueTotal').textContent=all.length;
 document.getElementById('venueAddress').textContent=all.filter(venue=>['verified_address','online_geocoded'].includes(venue.precision)).length;
 document.getElementById('venueContact').textContent=withMeta.filter(item=>item.meta.whatsapp||item.meta.phone||item.meta.email||item.meta.instagram).length;
 document.getElementById('venueSocial').textContent=withMeta.filter(item=>item.meta.instagram).length;
 document.getElementById('venueShown').textContent=shown.length;
}

function copyText(text,button){
 const success=()=>{if(!button)return;const old=button.innerHTML;button.innerHTML='<span>✅</span><b>Sudah disalin</b>';button.classList.add('copied');setTimeout(()=>{button.innerHTML=old;button.classList.remove('copied')},1600)};
 if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(success).catch(()=>{prompt('Salin pesan ini:',text)})}
 else{prompt('Salin pesan ini:',text)}
}

function bootVenueV5(){
 const section=document.getElementById('lapangan');
 if(!section||section.dataset.mobileOutreach==='1')return;
 section.dataset.mobileOutreach='1';
 section.innerHTML=venueShell();
 const provinceSelect=document.getElementById('venueProvince');
 const provinces=[...new Set(getVenues().map(item=>item.province).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
 provinceSelect.innerHTML='<option value="">Semua provinsi</option>'+provinces.map(province=>`<option value="${esc(province)}">${esc(province)}</option>`).join('');
 document.getElementById('venueSearch')?.addEventListener('input',renderVenuesV5);
 provinceSelect?.addEventListener('change',renderVenuesV5);
 document.getElementById('venueDataStatus')?.addEventListener('change',renderVenuesV5);
 document.getElementById('copyFirstMessage')?.addEventListener('click',event=>copyText(FIRST_MESSAGE,event.currentTarget));
 section.addEventListener('click',event=>{const button=event.target.closest('[data-copy-message]');if(button)copyText(button.dataset.copyMessage||FIRST_MESSAGE,button)});
 renderVenuesV5();
}

function enhanceContactCard(card){
 if(card.dataset.outreachV5==='1')return;
 card.dataset.outreachV5='1';
 const name=card.querySelector('h3')?.textContent?.trim()||'organisasi terkait';
 const wa=card.querySelector('a.contact-action.wa');
 if(wa){const number=cleanNumber(wa.href);wa.href=`https://wa.me/${number}?text=${encodeURIComponent(FIRST_MESSAGE)}`;wa.querySelector('b').textContent='WhatsApp'}
 const ig=card.querySelector('a.contact-action.ig');
 if(ig){const username=instagramUsername(ig.getAttribute('href'));if(username){ig.href=`https://ig.me/m/${encodeURIComponent(username)}`;ig.querySelector('b').textContent='Kirim DM'}}
 const email=card.querySelector('a.contact-action.email');
 if(email){const address=email.getAttribute('href').replace(/^mailto:/i,'').split('?')[0];email.href=`mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY(name))}`}
 const actions=card.querySelector('.contact-actions');
 if(actions&&!actions.querySelector('.contact-copy-v5')){
  const button=document.createElement('button');button.type='button';button.className='contact-action contact-copy-v5';button.innerHTML='<span>📋</span><b>Salin Pesan</b>';button.addEventListener('click',()=>copyText(FIRST_MESSAGE,button));actions.appendChild(button);
 }
}

function enhanceContactHub(){
 document.querySelectorAll('.contact-card').forEach(enhanceContactCard);
 const grid=document.getElementById('contactGrid');
 if(grid&&!grid.dataset.outreachObserver){
  grid.dataset.outreachObserver='1';
  new MutationObserver(()=>document.querySelectorAll('.contact-card').forEach(enhanceContactCard)).observe(grid,{childList:true,subtree:true});
 }
}

function install(){
 bootVenueV5();
 enhanceContactHub();
 document.addEventListener('click',event=>{
  const tab=event.target.closest('[data-tab]');
  if(!tab)return;
  if(tab.dataset.tab==='lapangan')setTimeout(bootVenueV5,20);
  if(tab.dataset.tab==='kontak')setTimeout(enhanceContactHub,30);
 });
}

try{install()}catch(error){console.error('Mobile outreach v5 failed:',error)}
})();
