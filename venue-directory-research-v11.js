(()=>{
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const cleanNumber=value=>String(value||'').replace(/\D/g,'');
const instagramUsername=value=>String(value||'').replace(/^https?:\/\/(www\.)?instagram\.com\//i,'').replace(/^@/,'').split(/[/?#]/)[0];
const initials=name=>String(name||'Venue').replace(/[^A-Za-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).slice(0,3).map(word=>word[0]).join('').toUpperCase();
const precision=value=>value==='verified_address'?'Alamat jelas':value==='online_geocoded'?'Pin tersimpan':value==='name_search'?'Pencarian nama':'Titik kota';
const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(padel|club|court|arena|sports?|sport centre|sport center|social|reserve)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const identityKey=venue=>`${normalize(venue.name)}|${normalize(venue.city||venue.address||'')}`;
const mapsUrl=venue=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.searchQuery||`${venue.name}, ${venue.address||venue.city}, Indonesia`)}`;
const EMAIL_SUBJECT='Koordinasi Turnamen Padel Nasional';
const formalMessage=name=>`Yth. Bapak/Ibu Pengelola ${name},\n\nPerkenalkan, kami dari tim Turnamen Padel Nasional dalam rangka HUT TNI ke-81. Kami bermaksud berkoordinasi mengenai kemungkinan kerja sama venue dan penyelenggaraan event.\n\nMohon informasi PIC yang dapat kami hubungi untuk pembahasan lebih lanjut. Terima kasih.`;
const mobile=()=>window.matchMedia('(max-width:760px)').matches;
const pageSize=()=>mobile()?16:48;
let cachedVenues=null,visibleLimit=pageSize(),rendered=false,lastSignature='',renderFrame=0,searchTimer=0;
function researchRows(){return Array.isArray(window.PBPI_COURT_RESEARCH)?window.PBPI_COURT_RESEARCH:[]}
function researchFor(venue){
 const key=normalize(venue.name),city=normalize(venue.city);
 return researchRows().find(row=>{
  const names=[row.display_name,row.canonical_name,...(Array.isArray(row.aliases)?row.aliases:[])].filter(Boolean).map(normalize);
  return names.includes(key)&&(!city||!row.city||normalize(row.city)===city||normalize(row.region)===city);
 })||null;
}
function buildVenues(){
 const base=(typeof NATIONAL_POINTS!=='undefined'&&Array.isArray(NATIONAL_POINTS)?NATIONAL_POINTS:[]).filter(point=>point.category==='padel').map(point=>({...point,directoryOrigin:'master'}));
 const extra=researchRows().filter(row=>!row.is_existing_venue&&row.duplicate_status!=='confirmed_duplicate').map(row=>({name:row.display_name||row.canonical_name,category:'padel',city:row.city,province:row.province,address:row.address,precision:'name_search',searchQuery:`${row.canonical_name}, ${row.address}, Indonesia`,researchVenueId:row.venue_id,aliases:Array.isArray(row.aliases)?row.aliases:[],duplicateStatus:row.duplicate_status,duplicateOf:row.duplicate_of,directoryOrigin:'research'}));
 const out=[],seenExact=new Set(),seenIdentity=new Map();
 for(const venue of [...base,...extra]){
  const exact=String(venue.name||'').trim().toLowerCase(),identity=identityKey(venue);
  if(!exact||seenExact.has(exact))continue;
  const existing=seenIdentity.get(identity);
  if(existing&&venue.duplicateStatus!=='possible_duplicate')continue;
  seenExact.add(exact);if(!existing)seenIdentity.set(identity,venue);out.push(venue);
 }
 window.VENUE_DIRECTORY_DEDUP_AUDIT={input:base.length+extra.length,output:out.length,removed:base.length+extra.length-out.length,possibleDuplicates:extra.filter(v=>v.duplicateStatus==='possible_duplicate').map(v=>({name:v.name,duplicateOf:v.duplicateOf}))};
 return out;
}
function getVenues(){return cachedVenues||(cachedVenues=buildVenues())}
function metaFor(venue){
 const contacts=window.VERIFIED_VENUE_CONTACTS||{};
 if(contacts[venue.name])return contacts[venue.name];
 const key=normalize(venue.name),matched=Object.keys(contacts).find(name=>normalize(name)===key);
 return matched?contacts[matched]:{};
}
function courtFor(venue){
 const data=window.VERIFIED_VENUE_COURTS||{};
 if(data[venue.name])return data[venue.name];
 const key=normalize(venue.name),matched=Object.keys(data).find(name=>normalize(name)===key);
 return matched?data[matched]:null;
}
function hasDirect(meta){return Boolean(cleanNumber(meta.phone)||cleanNumber(meta.secondaryPhone)||meta.whatsapp||meta.email||instagramUsername(meta.instagram))}
function hasOfficial(meta){return hasDirect(meta)||Boolean(meta.website||meta.booking)}
function shell(){return `<div class="venue-mobile-head"><div><span class="report-kicker">DIREKTORI VENUE & RISET COURT</span><h2>Venue Padel, Jumlah Court & Kontak</h2><p>Direktori nasional digabung dengan riset Jabodetabek terbaru. Kontak, jumlah court, konflik, dan status verifikasi dipisahkan agar tidak ada angka yang menyamar sebagai kepastian.</p></div></div><div class="venue-summary"><div><b id="venueTotal">0</b><span>Total venue</span></div><div><b id="venueAddress">0</b><span>Alamat / pencarian</span></div><div><b id="venueContact">0</b><span>Kontak langsung</span></div><div><b id="venueSocial">0</b><span>Instagram</span></div></div><div class="venue-toolbar venue-toolbar-v5"><label><span>Cari venue</span><input id="venueSearch" type="search" inputmode="search" placeholder="Nama venue, kota, ID PBPI..."></label><label><span>Provinsi</span><select id="venueProvince"><option value="">Semua provinsi</option></select></label><label><span>Jalur kontak</span><select id="venueDataStatus"><option value="">Semua data</option><option value="direct">Ada kontak langsung</option><option value="whatsapp">Ada WhatsApp</option><option value="instagram">Ada Instagram / DM</option><option value="official">Ada kanal resmi</option><option value="needs-verification">Belum ada kontak langsung</option></select></label></div><div class="venue-result-line"><strong id="venueShown">0</strong> venue tampil <span>•</span> Angka terverifikasi dan angka terlapor dibedakan secara visual.</div><div class="venue-grid venue-grid-v5" id="venueGrid"></div><div class="venue-load-more-v13" id="venueLoadMoreWrap" hidden><button type="button" id="venueLoadMore">Muat venue berikutnya</button></div><div class="venue-source-note"><strong>Standar verifikasi:</strong> tautan booking generik tidak dianggap kontak. Google Maps digunakan sebagai jalur lokasi, sedangkan angka court mengikuti sumber dan confidence masing-masing venue.</div>`}
function actions(venue,meta){
 const number=cleanNumber(meta.phone),secondary=cleanNumber(meta.secondaryPhone),username=instagramUsername(meta.instagram),email=String(meta.email||'').trim(),wa=meta.whatsapp?(String(meta.whatsapp).startsWith('http')?meta.whatsapp:`https://wa.me/${cleanNumber(meta.whatsapp)}`):(number?`https://wa.me/${number}`:''),message=encodeURIComponent(formalMessage(venue.name)),rows=[];
 if(wa)rows.push(`<a class="venue-action primary wa" href="${esc(wa)}${wa.includes('?')?'&':'?'}text=${message}" target="_blank" rel="noopener"><span>💬</span><b>WhatsApp</b></a>`);
 if(username)rows.push(`<a class="venue-action primary dm" href="https://ig.me/m/${encodeURIComponent(username)}" target="_blank" rel="noopener"><span>✉️</span><b>Kirim DM</b></a>`);
 if(email)rows.push(`<a class="venue-action email" href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${message}"><span>📧</span><b>Email</b></a>`);
 if(number)rows.push(`<a class="venue-action phone" href="tel:+${number}"><span>📞</span><b>Telepon</b></a>`);
 if(secondary)rows.push(`<a class="venue-action alt-phone" href="https://wa.me/${secondary}?text=${message}" target="_blank" rel="noopener"><span>💬</span><b>WA Alternatif</b></a>`);
 rows.push(`<a class="venue-action maps" href="${esc(mapsUrl(venue))}" target="_blank" rel="noopener"><span>📍</span><b>Maps</b></a>`);
 if(username)rows.push(`<a class="venue-action ig" href="https://instagram.com/${encodeURIComponent(username)}" target="_blank" rel="noopener"><span>📸</span><b>Instagram</b></a>`);
 if(meta.website)rows.push(`<a class="venue-action website" href="${esc(meta.website)}" target="_blank" rel="noopener"><span>🌐</span><b>Website</b></a>`);
 if(meta.booking)rows.push(`<a class="venue-action booking" href="${esc(meta.booking)}" target="_blank" rel="noopener"><span>🎟️</span><b>Booking</b></a>`);
 return rows.join('');
}
function contactRows(meta){const username=instagramUsername(meta.instagram);return[meta.phone&&`<div><span>Admin / Telepon</span><strong>${esc(meta.phoneLabel||meta.phone)}</strong></div>`,meta.secondaryPhone&&`<div><span>Kontak alternatif</span><strong>${esc(meta.secondaryPhoneLabel||meta.secondaryPhone)}</strong></div>`,username&&`<div><span>Instagram</span><strong>@${esc(username)}</strong></div>`,meta.email&&`<div><span>Email</span><strong>${esc(meta.email)}</strong></div>`,meta.website&&`<div><span>Website</span><strong>${esc(new URL(meta.website,location.href).hostname.replace(/^www\./,''))}</strong></div>`].filter(Boolean).join('')}
function renderCard(venue){
 const meta=metaFor(venue),direct=hasDirect(meta),official=hasOfficial(meta),contacts=contactRows(meta),research=researchFor(venue);
 return `<article class="venue-card venue-card-v5 ${official?'verified':'pending'}" data-research-id="${esc(research?.venue_id||venue.researchVenueId||'')}"><div class="venue-thumb venue-thumb-v5"><div class="venue-court-art" aria-label="Venue ${esc(venue.name)}"><i></i><span>${esc(initials(venue.name))}</span></div><span class="venue-city">${esc(venue.city)} • ${esc(venue.province)}</span><span class="venue-data-badge ${official?'verified':'pending'}">${direct?'KONTAK ADA':official?'KANAL RESMI':'BELUM ADA KONTAK'}</span></div><div class="venue-body venue-body-v5"><div class="venue-title-row"><div><h3>${esc(venue.name)}</h3><p class="venue-location">${esc(venue.city)}, ${esc(venue.province)}</p></div><span class="venue-source-mini">${esc(meta.verifiedAt||'Riset 14 Juli 2026')}</span></div><p class="venue-address"><span>📍</span><span>${esc(venue.address||`${venue.city}, ${venue.province}`)}<small>Presisi: ${precision(venue.precision)}</small></span></p>${contacts?`<div class="venue-contact-grid">${contacts}</div>`:`<div class="venue-no-contact"><strong>Kontak publik belum ditemukan.</strong><span>Venue tetap ditampilkan karena data jumlah court atau keberadaannya telah masuk riset.</span></div>`}<div class="venue-actions venue-actions-v5">${actions(venue,meta)}</div><div class="venue-source-row"><span>🛡️ ${esc(meta.source||'Riset venue dan Google Maps')}</span>${meta.sourceUrl?`<a href="${esc(meta.sourceUrl)}" target="_blank" rel="noopener">Buka sumber</a>`:''}</div></div></article>`;
}
function courtMatches(venue,filter){
 if(!filter)return true;
 const item=courtFor(venue),accepted=Number.isFinite(item?.total)&&item.total>0,reported=!accepted&&Number.isFinite(item?.reportedTotal)&&item.reportedTotal>0,total=accepted?item.total:(reported?item.reportedTotal:null);
 if(filter==='1-2')return total!==null&&total<=2;
 if(filter==='3-4')return total!==null&&total>=3&&total<=4;
 if(filter==='5+')return total!==null&&total>=5;
 if(filter==='verified')return accepted&&item.status==='verified';
 if(filter==='pending')return !accepted||['needs_direct_confirmation','reviewed_conflict','partially_verified'].includes(item?.status);
 if(filter==='research')return Boolean(item?.venueId);
 if(filter==='outreach')return Boolean(item?.outreachQueue);
 if(filter==='conflict')return item?.duplicateStatus==='possible_duplicate'||Boolean(item?.conflicts?.length);
 return true;
}
function matches(venue,query,province,status,courtFilter){
 const meta=metaFor(venue),research=researchFor(venue),hay=[venue.name,venue.city,venue.province,venue.address,research?.venue_id,research?.district,meta.phone,meta.instagram,meta.source].join(' ').toLowerCase(),direct=hasDirect(meta),username=instagramUsername(meta.instagram),statusOk=!status||(status==='direct'&&direct)||(status==='whatsapp'&&Boolean(meta.whatsapp||meta.phone))||(status==='instagram'&&Boolean(username))||(status==='official'&&hasOfficial(meta))||(status==='needs-verification'&&!direct);
 return(!query||hay.includes(query))&&(!province||venue.province===province)&&statusOk&&courtMatches(venue,courtFilter);
}
function render(options={}){
 const grid=document.getElementById('venueGrid');if(!grid)return;
 if(options.reset)visibleLimit=pageSize();
 const query=(document.getElementById('venueSearch')?.value||'').toLowerCase().trim(),province=document.getElementById('venueProvince')?.value||'',status=document.getElementById('venueDataStatus')?.value||'',courtFilter=document.getElementById('venueCourtFilter')?.value||'',signature=[query,province,status,courtFilter,visibleLimit].join('|');
 if(rendered&&!options.force&&signature===lastSignature)return;
 lastSignature=signature;
 const all=getVenues(),filtered=all.filter(v=>matches(v,query,province,status,courtFilter)),shown=filtered.slice(0,visibleLimit);
 window.VENUE_DIRECTORY_ALL_NAMES=all.map(v=>v.name);
 grid.innerHTML=shown.map(renderCard).join('')||'<div class="venue-empty"><span>🔎</span><strong>Venue tidak ditemukan</strong><p>Coba ubah filter atau kata pencarian.</p></div>';
 const metas=all.map(metaFor);document.getElementById('venueTotal').textContent=String(all.length);document.getElementById('venueAddress').textContent=String(all.filter(v=>v.address||v.searchQuery).length);document.getElementById('venueContact').textContent=String(metas.filter(hasDirect).length);document.getElementById('venueSocial').textContent=String(metas.filter(m=>instagramUsername(m.instagram)).length);document.getElementById('venueShown').textContent=`${shown.length}/${filtered.length}`;
 const wrap=document.getElementById('venueLoadMoreWrap');if(wrap)wrap.hidden=shown.length>=filtered.length;
 rendered=true;document.dispatchEvent(new CustomEvent('venue-directory-rendered',{detail:{total:all.length,filtered:filtered.length,shown:shown.length}}));
}
function scheduleRender(options={}){cancelAnimationFrame(renderFrame);renderFrame=requestAnimationFrame(()=>render(options))}
function install(){
 const section=document.getElementById('lapangan');if(!section)return;section.dataset.directoryResearchV11='1';section.innerHTML=shell();
 const provinces=[...new Set(getVenues().map(v=>v.province).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id')),select=document.getElementById('venueProvince');select.innerHTML='<option value="">Semua provinsi</option>'+provinces.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
 document.getElementById('venueSearch')?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>scheduleRender({reset:true,force:true}),120)});
 select?.addEventListener('change',()=>scheduleRender({reset:true,force:true}));document.getElementById('venueDataStatus')?.addEventListener('change',()=>scheduleRender({reset:true,force:true}));
 document.getElementById('venueLoadMore')?.addEventListener('click',()=>{visibleLimit+=pageSize();scheduleRender({force:true})});
 window.addEventListener('app-tab-change',event=>{if(event.detail?.id==='lapangan')scheduleRender({force:!rendered})});
 window.scheduleVenueDirectoryRenderV11=options=>scheduleRender(options||{});window.renderVenueDirectoryV11=options=>render(options||{});
 if(section.classList.contains('active'))scheduleRender({force:true});
}
try{install()}catch(error){console.error('Venue directory research v11 failed:',error)}
})();
