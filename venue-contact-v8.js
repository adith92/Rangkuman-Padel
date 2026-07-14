(()=>{
'use strict';

const VERIFIED_CONTACTS={
 'Dreamcourt Grafika Sport Arena Padel':{
  phone:'628888540609',
  phoneLabel:'0888 8540 609',
  source:'AYO Indonesia, deskripsi resmi venue',
  sourceUrl:'https://ayo.co.id/v/dreamcourt-grafika-sport-arena-padel',
  address:'Jl. Grafika No.58, Lebak Bulus, Kecamatan Cilandak, Kota Jakarta Selatan, DKI Jakarta 12440'
 }
};

const contactedNames=new Set();
const cleanNumber=value=>String(value||'').replace(/\D/g,'');
const cleanInstagram=value=>String(value||'').replace(/^https?:\/\/(?:www\.)?instagram\.com\//i,'').replace(/^@/,'').split(/[/?#]/)[0];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

function formalMessage(name){
 return `Yth. Bapak/Ibu Pengelola ${name},\n\nPerkenalkan, kami dari tim Turnamen Padel Nasional dalam rangka HUT TNI ke-81. Kami bermaksud berkoordinasi mengenai kemungkinan kerja sama venue dan penyelenggaraan event.\n\nMohon informasi PIC yang dapat kami hubungi untuk pembahasan lebih lanjut. Terima kasih.`;
}

function hasContact(data){
 return Boolean(cleanNumber(data?.phone)||String(data?.email||'').trim()||cleanInstagram(data?.instagram));
}

function removeUserSearch(card){
 card.querySelectorAll('.venue-action.search-contact,.venue-action.copy,[data-copy-message]').forEach(item=>item.remove());
}

function ensureContactGrid(card){
 let grid=card.querySelector('.venue-contact-grid');
 const noContact=card.querySelector('.venue-no-contact');
 if(!grid){
  grid=document.createElement('div');
  grid.className='venue-contact-grid';
  if(noContact)noContact.replaceWith(grid);
  else card.querySelector('.venue-address')?.insertAdjacentElement('afterend',grid);
 }
 return grid;
}

function appendContactRow(grid,key,label,value){
 if(!value||grid.querySelector(`[data-contact-${key}]`))return;
 const row=document.createElement('div');
 row.dataset[`contact${key[0].toUpperCase()}${key.slice(1)}`]='1';
 row.innerHTML=`<span>${esc(label)}</span><strong>${esc(value)}</strong>`;
 grid.appendChild(row);
}

function addContactRows(card,data){
 const grid=ensureContactGrid(card);
 appendContactRow(grid,'phone','Admin / Telepon',data.phoneLabel||data.phone);
 appendContactRow(grid,'instagram','Instagram',cleanInstagram(data.instagram)?`@${cleanInstagram(data.instagram)}`:'');
 appendContactRow(grid,'email','Email',String(data.email||'').trim());
}

function addActions(card,name,data){
 const actions=card.querySelector('.venue-actions-v5');
 if(!actions)return;
 removeUserSearch(card);
 const number=cleanNumber(data.phone);
 const email=String(data.email||'').trim();
 const username=cleanInstagram(data.instagram);
 if(number&&/^628/.test(number)&&!actions.querySelector('.venue-action.wa')){
  const wa=document.createElement('a');
  wa.className='venue-action primary wa';
  wa.href=`https://wa.me/${number}?text=${encodeURIComponent(formalMessage(name))}`;
  wa.target='_blank';
  wa.rel='noopener';
  wa.innerHTML='<span>💬</span><b>WhatsApp</b>';
  actions.prepend(wa);
 }
 if(number&&!actions.querySelector('.venue-action.phone')){
  const phone=document.createElement('a');
  phone.className='venue-action phone';
  phone.href=`tel:+${number}`;
  phone.innerHTML='<span>📞</span><b>Telepon</b>';
  const maps=actions.querySelector('.venue-action.maps');
  if(maps)maps.before(phone);else actions.appendChild(phone);
 }
 if(email&&!actions.querySelector('.venue-action.email')){
  const mail=document.createElement('a');
  mail.className='venue-action email';
  mail.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Koordinasi Turnamen Padel Nasional')}&body=${encodeURIComponent(formalMessage(name))}`;
  mail.innerHTML='<span>📧</span><b>Email</b>';
  actions.prepend(mail);
 }
 if(username&&!actions.querySelector('.venue-action.dm')){
  const dm=document.createElement('a');
  dm.className='venue-action primary dm';
  dm.href=`https://ig.me/m/${encodeURIComponent(username)}`;
  dm.target='_blank';
  dm.rel='noopener';
  dm.innerHTML='<span>✉️</span><b>Kirim DM</b>';
  actions.prepend(dm);
 }
 if(username&&!actions.querySelector('.venue-action.ig')){
  const ig=document.createElement('a');
  ig.className='venue-action ig';
  ig.href=`https://instagram.com/${encodeURIComponent(username)}`;
  ig.target='_blank';
  ig.rel='noopener';
  ig.innerHTML='<span>📸</span><b>Instagram</b>';
  actions.appendChild(ig);
 }
}

function updateAddress(card,data){
 if(!data.address)return;
 const address=card.querySelector('.venue-address>span:last-child');
 if(!address)return;
 address.innerHTML=`${esc(data.address)}<small>Presisi: Alamat venue dari sumber publik</small>`;
}

function updateSource(card,data){
 const source=card.querySelector('.venue-source-row');
 if(!source)return;
 const label=source.querySelector('span');
 if(label)label.textContent=`🛡️ ${data.source||'Kontak publik venue'}`;
 if(data.sourceUrl||data.venueUrl){
  let link=source.querySelector('a[data-contact-source]');
  if(!link){
   link=document.createElement('a');
   link.dataset.contactSource='1';
   link.target='_blank';
   link.rel='noopener';
   link.textContent='Buka sumber kontak';
   source.appendChild(link);
  }
  link.href=data.sourceUrl||data.venueUrl;
 }
}

function updateVerifiedStatus(card,data){
 card.classList.remove('pending');
 card.classList.add('verified');
 card.dataset.contactV9='verified';
 const badge=card.querySelector('.venue-data-badge');
 if(badge){badge.classList.remove('pending');badge.classList.add('verified');badge.textContent='DATA KONTAK ADA'}
 const mini=card.querySelector('.venue-source-mini');
 if(mini)mini.textContent='Kontak terverifikasi';
 updateSource(card,data);
}

function markPending(card){
 removeUserSearch(card);
 if(card.dataset.contactV9==='verified')return;
 card.dataset.contactV9='pending';
 const noContact=card.querySelector('.venue-no-contact');
 if(noContact){
  noContact.innerHTML='<strong>Kontak sedang diverifikasi oleh tim.</strong><span>Nomor, WhatsApp, email, atau Instagram akan ditampilkan setelah cocok dengan sumber publik resmi.</span>';
 }
 const badge=card.querySelector('.venue-data-badge');
 if(badge){badge.classList.remove('verified');badge.classList.add('pending');badge.textContent='VERIFIKASI KONTAK'}
 const mini=card.querySelector('.venue-source-mini');
 if(mini&&/belum/i.test(mini.textContent||''))mini.textContent='Sedang diverifikasi';
}

function applyContact(card,name,data){
 if(!hasContact(data))return false;
 addContactRows(card,data);
 addActions(card,name,data);
 updateAddress(card,data);
 updateVerifiedStatus(card,data);
 contactedNames.add(name);
 updateSummary();
 return true;
}

function hasExistingDirect(card){
 return Boolean(card.querySelector('.venue-action.wa,.venue-action.phone,.venue-action.email,.venue-action.dm,.venue-action.ig'));
}

async function fetchAyoContact(card,name){
 if(card.dataset.contactV9==='loading'||card.dataset.contactV9==='verified')return;
 card.dataset.contactV9='loading';
 try{
  const response=await fetch(`/api/ayo-thumbnail?name=${encodeURIComponent(name)}&meta=1`,{headers:{accept:'application/json'}});
  if(!response.ok)throw new Error(`AYO ${response.status}`);
  const data=await response.json();
  const source=data.phone||data.email||data.instagram?'AYO Indonesia dan kanal publik venue':'AYO Indonesia';
  if(!applyContact(card,name,{...data,source,sourceUrl:data.venueUrl}))markPending(card);
 }catch(error){
  markPending(card);
 }
}

function updateSummary(){
 const counter=document.getElementById('venueContact');
 if(!counter)return;
 const cards=[...document.querySelectorAll('.venue-card-v5')];
 const current=cards.filter(card=>card.dataset.contactV9==='verified'||hasExistingDirect(card)).length;
 counter.textContent=String(Math.max(current,contactedNames.size));
}

function patchCards(){
 const cards=[...document.querySelectorAll('.venue-card-v5')];
 cards.forEach((card,index)=>{
  removeUserSearch(card);
  const name=card.querySelector('.venue-title-row h3')?.textContent?.trim();
  if(!name)return;
  if(hasExistingDirect(card)){
   card.dataset.contactV9='verified';
   return;
  }
  if(['verified','loading','pending','queued'].includes(card.dataset.contactV9))return;
  const seeded=VERIFIED_CONTACTS[name];
  if(seeded){applyContact(card,name,seeded);return}
  markPending(card);
  card.dataset.contactV9='queued';
  setTimeout(()=>fetchAyoContact(card,name),index*120);
 });
 updateSummary();
}

function patchPageCopy(){
 const intro=document.querySelector('.venue-mobile-head p');
 if(intro)intro.textContent='Kontak venue dikumpulkan dan diverifikasi oleh tim dari AYO, situs resmi, Instagram resmi, Google Maps, dan kanal publik pengelola.';
 const note=document.querySelector('.venue-source-note');
 if(note)note.innerHTML='<strong>Standar kontak:</strong> pengguna tidak diminta mencari sendiri. Tombol WhatsApp, telepon, email, atau DM hanya muncul setelah kontak cocok dengan sumber publik venue.';
}

function install(){
 patchPageCopy();
 patchCards();
 const grid=document.getElementById('venueGrid');
 if(grid&&!grid.dataset.contactObserverV9){
  grid.dataset.contactObserverV9='1';
  new MutationObserver(()=>{patchPageCopy();patchCards()}).observe(grid,{childList:true,subtree:true});
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-tab="lapangan"]'))setTimeout(()=>{patchPageCopy();patchCards()},80);
 });
}

try{install()}catch(error){console.error('Venue contact verification failed:',error)}
})();