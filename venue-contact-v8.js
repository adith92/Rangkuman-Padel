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
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

function formalMessage(name){
 return `Yth. Bapak/Ibu Pengelola ${name},\n\nPerkenalkan, kami dari tim Turnamen Padel Nasional dalam rangka HUT TNI ke-81. Kami bermaksud berkoordinasi mengenai kemungkinan kerja sama venue dan penyelenggaraan event.\n\nMohon informasi PIC yang dapat kami hubungi untuk pembahasan lebih lanjut. Terima kasih.`;
}

function addContactRows(card,data){
 let grid=card.querySelector('.venue-contact-grid');
 const noContact=card.querySelector('.venue-no-contact');
 if(!grid){
  grid=document.createElement('div');
  grid.className='venue-contact-grid';
  if(noContact)noContact.replaceWith(grid);
  else card.querySelector('.venue-address')?.insertAdjacentElement('afterend',grid);
 }
 if(!grid.querySelector('[data-contact-phone]')){
  const row=document.createElement('div');
  row.dataset.contactPhone='1';
  row.innerHTML=`<span>Admin / Telepon</span><strong>${esc(data.phoneLabel||data.phone)}</strong>`;
  grid.prepend(row);
 }
}

function addActions(card,name,data){
 const actions=card.querySelector('.venue-actions-v5');
 if(!actions)return;
 actions.querySelectorAll('.venue-action.search-contact').forEach(item=>item.remove());
 const number=cleanNumber(data.phone);
 if(!number)return;
 if(!actions.querySelector('.venue-action.wa')){
  const wa=document.createElement('a');
  wa.className='venue-action primary wa';
  wa.href=`https://wa.me/${number}?text=${encodeURIComponent(formalMessage(name))}`;
  wa.target='_blank';
  wa.rel='noopener';
  wa.innerHTML='<span>💬</span><b>WhatsApp</b>';
  actions.prepend(wa);
 }
 if(!actions.querySelector('.venue-action.phone')){
  const phone=document.createElement('a');
  phone.className='venue-action phone';
  phone.href=`tel:+${number}`;
  phone.innerHTML='<span>📞</span><b>Telepon</b>';
  const maps=actions.querySelector('.venue-action.maps');
  if(maps)maps.before(phone); else actions.appendChild(phone);
 }
}

function updateAddress(card,data){
 if(!data.address)return;
 const address=card.querySelector('.venue-address>span:last-child');
 if(!address)return;
 address.innerHTML=`${esc(data.address)}<small>Presisi: Alamat venue dari AYO</small>`;
}

function updateStatus(card,data){
 card.classList.remove('pending');
 card.classList.add('verified');
 card.dataset.contactV8='verified';
 const badge=card.querySelector('.venue-data-badge');
 if(badge){badge.classList.remove('pending');badge.classList.add('verified');badge.textContent='DATA KONTAK ADA'}
 const mini=card.querySelector('.venue-source-mini');
 if(mini)mini.textContent='Diverifikasi 14 Juli 2026';
 const source=card.querySelector('.venue-source-row');
 if(source){
  const label=source.querySelector('span');
  if(label)label.textContent=`🛡️ ${data.source||'Kontak publik AYO Indonesia'}`;
  let link=source.querySelector('a[data-contact-source]');
  if(!link){
   link=document.createElement('a');
   link.dataset.contactSource='1';
   link.target='_blank';
   link.rel='noopener';
   link.textContent='Buka sumber kontak';
   source.appendChild(link);
  }
  link.href=data.sourceUrl||data.venueUrl||'#';
 }
}

function applyContact(card,name,data){
 if(!data?.phone)return false;
 addContactRows(card,data);
 addActions(card,name,data);
 updateAddress(card,data);
 updateStatus(card,data);
 contactedNames.add(name);
 updateSummary();
 return true;
}

async function fetchAyoContact(card,name){
 if(card.dataset.contactV8==='loading'||card.dataset.contactV8==='verified')return;
 card.dataset.contactV8='loading';
 try{
  const response=await fetch(`/api/ayo-thumbnail?name=${encodeURIComponent(name)}&meta=1`,{headers:{accept:'application/json'}});
  if(!response.ok)throw new Error(`AYO ${response.status}`);
  const data=await response.json();
  if(!applyContact(card,name,{...data,source:data.phone?'AYO Indonesia, deskripsi venue':'AYO Indonesia',sourceUrl:data.venueUrl}))card.dataset.contactV8='none';
 }catch(error){
  card.dataset.contactV8='none';
 }
}

function updateSummary(){
 const counter=document.getElementById('venueContact');
 if(!counter)return;
 const cards=[...document.querySelectorAll('.venue-card-v5')];
 const current=cards.filter(card=>card.dataset.contactV8==='verified'||card.classList.contains('verified')).length;
 counter.textContent=String(Math.max(current,contactedNames.size));
}

function patchCards(){
 const cards=[...document.querySelectorAll('.venue-card-v5')];
 cards.forEach((card,index)=>{
  const name=card.querySelector('.venue-title-row h3')?.textContent?.trim();
  if(!name)return;
  const seeded=VERIFIED_CONTACTS[name];
  if(seeded){applyContact(card,name,seeded);return}
  if(card.querySelector('.venue-no-contact')||card.querySelector('.venue-action.search-contact')){
   setTimeout(()=>fetchAyoContact(card,name),index*100);
  }
 });
 updateSummary();
}

function install(){
 patchCards();
 const grid=document.getElementById('venueGrid');
 if(grid&&!grid.dataset.contactObserverV8){
  grid.dataset.contactObserverV8='1';
  new MutationObserver(patchCards).observe(grid,{childList:true,subtree:true});
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-tab="lapangan"]'))setTimeout(patchCards,80);
 });
}

try{install()}catch(error){console.error('Venue contact v8 failed:',error)}
})();