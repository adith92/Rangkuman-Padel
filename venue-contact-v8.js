(()=>{
'use strict';

const VERIFIED_CONTACTS={...(window.VERIFIED_VENUE_CONTACTS||{})};
const contactedNames=new Set();
const cleanNumber=value=>String(value||'').replace(/\D/g,'');
const cleanInstagram=value=>String(value||'').replace(/^https?:\/\/(?:www\.)?instagram\.com\//i,'').replace(/^@/,'').split(/[/?#]/)[0];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const displayHost=value=>{try{return new URL(value).hostname.replace(/^www\./,'')}catch{return String(value||'')}};

function formalMessage(name){
 return `Yth. Bapak/Ibu Pengelola ${name},\n\nPerkenalkan, kami dari tim Turnamen Padel Nasional dalam rangka HUT TNI ke-81. Kami bermaksud berkoordinasi mengenai kemungkinan kerja sama venue dan penyelenggaraan event.\n\nMohon informasi PIC yang dapat kami hubungi untuk pembahasan lebih lanjut. Terima kasih.`;
}

function hasContact(data){
 return Boolean(cleanNumber(data?.phone)||cleanNumber(data?.secondaryPhone)||String(data?.email||'').trim()||cleanInstagram(data?.instagram)||data?.whatsapp||data?.website||data?.booking);
}

function hasDirectContact(data){
 return Boolean(cleanNumber(data?.phone)||cleanNumber(data?.secondaryPhone)||String(data?.email||'').trim()||cleanInstagram(data?.instagram)||data?.whatsapp);
}

function removeGenericActions(card){
 card.querySelectorAll('.venue-action.search-contact,.venue-action.copy,.venue-action.ayo,[data-copy-message]').forEach(item=>item.remove());
}

function resetSeededCard(card){
 card.querySelector('.venue-contact-grid')?.remove();
 card.querySelector('.venue-no-contact')?.remove();
 card.querySelectorAll('.venue-action.wa,.venue-action.phone,.venue-action.email,.venue-action.dm,.venue-action.ig,.venue-action.website,.venue-action.booking,.venue-action.alt-phone').forEach(item=>item.remove());
 card.querySelectorAll('.venue-source-row a').forEach(item=>item.remove());
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
 appendContactRow(grid,'secondary','Kontak alternatif',data.secondaryPhoneLabel||data.secondaryPhone);
 appendContactRow(grid,'instagram','Instagram',cleanInstagram(data.instagram)?`@${cleanInstagram(data.instagram)}`:'');
 appendContactRow(grid,'email','Email',String(data.email||'').trim());
 appendContactRow(grid,'website','Website resmi',data.website?displayHost(data.website):'');
 appendContactRow(grid,'booking','Booking resmi',data.booking?displayHost(data.booking):'');
 appendContactRow(grid,'note','Catatan kontak',data.contactNote||'');
}

function whatsappHref(value,number,name){
 const message=encodeURIComponent(formalMessage(name));
 if(value){
  const raw=String(value).trim();
  if(/^https?:\/\//i.test(raw))return `${raw}${raw.includes('?')?'&':'?'}text=${message}`;
  const explicit=cleanNumber(raw);if(explicit)return `https://wa.me/${explicit}?text=${message}`;
 }
 return number?`https://wa.me/${number}?text=${message}`:'';
}

function addLink(actions,className,href,icon,label,{prepend=false}={}){
 if(!href||actions.querySelector(`.venue-action.${className}`))return;
 const link=document.createElement('a');
 link.className=`venue-action ${className}`;
 link.href=href;link.target='_blank';link.rel='noopener';
 link.innerHTML=`<span>${icon}</span><b>${esc(label)}</b>`;
 if(prepend)actions.prepend(link);else actions.appendChild(link);
}

function addActions(card,name,data){
 const actions=card.querySelector('.venue-actions-v5');
 if(!actions)return;
 removeGenericActions(card);
 const number=cleanNumber(data.phone);
 const secondary=cleanNumber(data.secondaryPhone);
 const email=String(data.email||'').trim();
 const username=cleanInstagram(data.instagram);
 const wa=whatsappHref(data.whatsapp,number,name);
 addLink(actions,'primary wa',wa,'💬','WhatsApp',{prepend:true});
 if(number)addLink(actions,'phone',`tel:+${number}`,'📞','Telepon');
 if(secondary){
  addLink(actions,'alt-phone',`https://wa.me/${secondary}?text=${encodeURIComponent(formalMessage(name))}`,'💬','WA Alternatif');
 }
 if(email)addLink(actions,'email',`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Koordinasi Turnamen Padel Nasional')}&body=${encodeURIComponent(formalMessage(name))}`,'📧','Email',{prepend:true});
 if(username){
  addLink(actions,'primary dm',`https://ig.me/m/${encodeURIComponent(username)}`,'✉️','Kirim DM',{prepend:true});
  addLink(actions,'ig',`https://instagram.com/${encodeURIComponent(username)}`,'📸','Instagram');
 }
 if(data.website)addLink(actions,'website',data.website,'🌐','Website');
 if(data.booking)addLink(actions,'booking',data.booking,'🎟️','Booking Resmi');
}

function updateAddress(card,data){
 if(!data.address)return;
 const address=card.querySelector('.venue-address>span:last-child');
 if(address)address.innerHTML=`${esc(data.address)}<small>Presisi: Alamat venue dari sumber publik</small>`;
}

function updateSource(card,data){
 const source=card.querySelector('.venue-source-row');
 if(!source)return;
 const label=source.querySelector('span');
 if(label)label.textContent=`🛡️ ${data.source||'Kanal publik venue terverifikasi'}`;
 source.querySelectorAll('a').forEach(item=>item.remove());
 const href=data.sourceUrl||data.venueUrl;
 if(href){
  const link=document.createElement('a');
  link.dataset.contactSource='1';link.target='_blank';link.rel='noopener';
  link.textContent='Buka sumber verifikasi';link.href=href;source.appendChild(link);
 }
}

function updateVerifiedStatus(card,data){
 card.classList.remove('pending');card.classList.add('verified');card.dataset.contactV9='verified';
 const direct=hasDirectContact(data);
 const badge=card.querySelector('.venue-data-badge');
 if(badge){badge.classList.remove('pending');badge.classList.add('verified');badge.textContent=direct?'KONTAK TERVERIFIKASI':'KANAL RESMI ADA'}
 const mini=card.querySelector('.venue-source-mini');
 if(mini)mini.textContent=data.verifiedAt||'Kontak terverifikasi';
 updateSource(card,data);
}

function markPending(card){
 removeGenericActions(card);
 if(card.dataset.contactV9==='verified')return;
 card.dataset.contactV9='pending';
 let noContact=card.querySelector('.venue-no-contact');
 if(!noContact){
  card.querySelector('.venue-contact-grid')?.remove();
  noContact=document.createElement('div');noContact.className='venue-no-contact';
  card.querySelector('.venue-address')?.insertAdjacentElement('afterend',noContact);
 }
 noContact.innerHTML='<strong>Kontak publik belum ditemukan.</strong><span>Tim sudah mengecek AYO, Google Maps, situs, Instagram, dan kanal booking. Data tidak diisi dengan tebakan.</span>';
 const badge=card.querySelector('.venue-data-badge');
 if(badge){badge.classList.remove('verified');badge.classList.add('pending');badge.textContent='BELUM ADA KONTAK PUBLIK'}
 const mini=card.querySelector('.venue-source-mini');
 if(mini)mini.textContent='Sudah diaudit';
 const source=card.querySelector('.venue-source-row span');
 if(source)source.textContent='🛡️ Belum ada kontak publik yang cukup kuat untuk ditampilkan';
}

function applyContact(card,name,data){
 if(!hasContact(data))return false;
 addContactRows(card,data);addActions(card,name,data);updateAddress(card,data);updateVerifiedStatus(card,data);
 contactedNames.add(name);updateSummary();return true;
}

function hasExistingDirect(card){
 return Boolean(card.querySelector('.venue-action.wa,.venue-action.phone,.venue-action.email,.venue-action.dm,.venue-action.ig,.venue-action.website,.venue-action.booking'));
}

function updateSummary(){
 const counter=document.getElementById('venueContact');if(!counter)return;
 const cards=[...document.querySelectorAll('.venue-card-v5')];
 const current=cards.filter(card=>card.dataset.contactV9==='verified'||hasExistingDirect(card)).length;
 counter.textContent=String(Math.max(current,contactedNames.size));
}

function patchCards(){
 const cards=[...document.querySelectorAll('.venue-card-v5')];
 cards.forEach(card=>{
  removeGenericActions(card);
  const name=card.querySelector('.venue-title-row h3')?.textContent?.trim();if(!name)return;
  const seeded=VERIFIED_CONTACTS[name];
  if(seeded){
   if(card.dataset.contactSeed!==name){resetSeededCard(card);card.dataset.contactSeed=name;applyContact(card,name,seeded)}
   return;
  }
  markPending(card);
 });
 updateSummary();
}

function patchPageCopy(){
 const intro=document.querySelector('.venue-mobile-head p');
 if(intro)intro.textContent='Kontak venue telah diaudit ulang dari Google Maps, situs resmi, Instagram, kanal booking, dan AYO yang masih aktif.';
 const note=document.querySelector('.venue-source-note');
 if(note)note.innerHTML='<strong>Standar verifikasi:</strong> tautan AYO generik yang berpotensi 404 telah dihapus. AYO hanya ditampilkan saat ditemukan sebagai kanal booking aktif; sumber utama kontak adalah listing bisnis dan kanal resmi pengelola.';
}

function install(){
 patchPageCopy();patchCards();
 const grid=document.getElementById('venueGrid');
 if(grid&&!grid.dataset.contactObserverV9){
  grid.dataset.contactObserverV9='1';
  new MutationObserver(()=>{patchPageCopy();patchCards()}).observe(grid,{childList:true,subtree:true});
 }
 document.addEventListener('click',event=>{if(event.target.closest('[data-tab="lapangan"]'))setTimeout(()=>{patchPageCopy();patchCards()},80)});
}

try{install()}catch(error){console.error('Venue contact verification failed:',error)}
})();