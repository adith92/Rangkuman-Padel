(()=>{
'use strict';

const escText=value=>String(value||'').trim();
const cleanNumber=value=>String(value||'').replace(/\D/g,'');

function formalMessage(name,type='venue'){
 const target=type==='organization' ? `Tim ${name}` : `Bapak/Ibu Pengelola ${name}`;
 return `Yth. ${target},\n\nPerkenalkan, kami dari tim Turnamen Padel Nasional dalam rangka HUT TNI ke-81. Kami bermaksud memperoleh informasi PIC yang menangani kerja sama ${type==='organization'?'kelembagaan dan dukungan penyelenggaraan event':'venue dan penyelenggaraan event'}.\n\nMohon kesediaannya untuk mengarahkan kami kepada pihak terkait. Terima kasih.`;
}

function formalEmailBody(name,type='venue'){
 return `${formalMessage(name,type)}\n\nHormat kami,\nTim Turnamen Padel Nasional`;
}

function whatsappNumber(link){
 try{
  const url=new URL(link.href);
  return cleanNumber(url.pathname.split('/').filter(Boolean).pop());
 }catch(error){
  return cleanNumber(link.getAttribute('href'));
 }
}

function emailAddress(link){
 return decodeURIComponent((link.getAttribute('href')||'').replace(/^mailto:/i,'').split('?')[0]);
}

function cleanVenueCard(card){
 const name=escText(card.querySelector('h3')?.textContent)||'Venue Padel';
 card.querySelectorAll('.venue-action.copy,[data-copy-message]').forEach(item=>item.remove());
 const wa=card.querySelector('a.venue-action.wa');
 if(wa){
  const number=whatsappNumber(wa);
  if(number)wa.href=`https://wa.me/${number}?text=${encodeURIComponent(formalMessage(name,'venue'))}`;
 }
 const email=card.querySelector('a.venue-action.email');
 if(email){
  const address=emailAddress(email);
  email.href=`mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent('Koordinasi Kerja Sama Turnamen Padel Nasional')}&body=${encodeURIComponent(formalEmailBody(name,'venue'))}`;
 }
}

function cleanContactCard(card){
 const name=escText(card.querySelector('h3')?.textContent)||'Organisasi Terkait';
 card.querySelectorAll('.contact-copy-v5,[data-copy-message]').forEach(item=>item.remove());
 const wa=card.querySelector('a.contact-action.wa');
 if(wa){
  const number=whatsappNumber(wa);
  if(number)wa.href=`https://wa.me/${number}?text=${encodeURIComponent(formalMessage(name,'organization'))}`;
 }
 const email=card.querySelector('a.contact-action.email');
 if(email){
  const address=emailAddress(email);
  email.href=`mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent('Permohonan Koordinasi Turnamen Padel Nasional')}&body=${encodeURIComponent(formalEmailBody(name,'organization'))}`;
 }
}

function cleanIntro(){
 document.querySelectorAll('#copyFirstMessage,.venue-first-rule,#copySalam,.outreach-rule').forEach(item=>item.remove());
 const venueKicker=document.querySelector('#lapangan .report-kicker');
 if(venueKicker)venueKicker.textContent='DIREKTORI VENUE PADEL NASIONAL';
 const contactKicker=document.querySelector('#kontak .report-kicker');
 if(contactKicker)contactKicker.textContent='DIREKTORI KONTAK • DATA PUBLIK RESMI';
 const contactTitle=document.querySelector('#kontak .contact-hero h2');
 if(contactTitle)contactTitle.textContent='Contact Person & Jalur Koordinasi';
}

let scheduled=false;
function cleanAll(){
 scheduled=false;
 cleanIntro();
 document.querySelectorAll('.venue-card').forEach(cleanVenueCard);
 document.querySelectorAll('.contact-card').forEach(cleanContactCard);
}

function scheduleClean(){
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(cleanAll);
}

cleanAll();
new MutationObserver(scheduleClean).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',event=>{if(event.target.closest('[data-tab]'))setTimeout(scheduleClean,30)});
})();