(()=>{
'use strict';

const EXACT_AYO={
 'Padel Venue':'https://ayo.co.id/v/padel-venue',
 'Dreamcourt Grafika Sport Arena Padel':'https://ayo.co.id/v/dreamcourt-grafika-sport-arena-padel',
 'Orion Padel Court':'https://ayo.co.id/v/orion-padel-court'
};

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const slugify=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const ayoVenueUrl=name=>EXACT_AYO[name]||`https://ayo.co.id/v/${slugify(name)}`;

function pointFor(name){
 if(typeof NATIONAL_POINTS==='undefined'||!Array.isArray(NATIONAL_POINTS))return null;
 return NATIONAL_POINTS.find(point=>String(point.name||'').trim()===name)||null;
}

function numberFrom(value){
 const number=Number(value);
 return Number.isFinite(number)?number:null;
}

function coordinates(point){
 if(!point)return null;
 const position=Array.isArray(point.position)?point.position:Array.isArray(point.coords)?point.coords:null;
 const lat=numberFrom(point.lat??point.latitude??point.y??position?.[0]);
 const lng=numberFrom(point.lng??point.lon??point.longitude??point.x??position?.[1]);
 if(lat===null||lng===null||Math.abs(lat)>90||Math.abs(lng)>180)return null;
 return {lat,lng};
}

function hasPrecisePoint(point){
 return ['verified_address','online_geocoded'].includes(String(point?.precision||''));
}

function satelliteUrl(point){
 const coord=coordinates(point);
 if(!coord||!hasPrecisePoint(point))return '';
 const latSpan=.00155;
 const lngSpan=.00235;
 const bbox=[coord.lng-lngSpan,coord.lat-latSpan,coord.lng+lngSpan,coord.lat+latSpan].map(v=>v.toFixed(6)).join(',');
 return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${encodeURIComponent(bbox)}&bboxSR=4326&imageSR=4326&size=960,540&format=jpg&f=image`;
}

function clearVisual(thumb){
 [...thumb.children].forEach(child=>{
  if(!child.classList.contains('venue-city')&&!child.classList.contains('venue-data-badge'))child.remove();
 });
}

function addKindBadge(thumb,text,type){
 thumb.querySelector('.venue-photo-kind')?.remove();
 const badge=document.createElement('span');
 badge.className=`venue-photo-kind ${type}`;
 badge.textContent=text;
 thumb.appendChild(badge);
}

function showMissing(thumb){
 clearVisual(thumb);
 const missing=document.createElement('div');
 missing.className='venue-photo-missing';
 missing.innerHTML='<span>📷</span><strong>Foto venue belum tersedia</strong><small>Belum ditemukan pada sumber publik.</small>';
 thumb.prepend(missing);
 addKindBadge(thumb,'BELUM ADA FOTO','missing');
}

function showSatellite(thumb,point){
 const url=satelliteUrl(point);
 if(!url){showMissing(thumb);return}
 clearVisual(thumb);
 const frame=document.createElement('div');
 frame.className='venue-photo-frame satellite';
 const image=document.createElement('img');
 image.alt='Citra lokasi venue dari satelit';
 image.loading='lazy';
 image.decoding='async';
 image.referrerPolicy='no-referrer';
 image.src=url;
 image.addEventListener('error',()=>showMissing(thumb),{once:true});
 frame.appendChild(image);
 thumb.prepend(frame);
 addKindBadge(thumb,'CITRA LOKASI','satellite');
}

function showAyoPhoto(card,thumb,name,point){
 clearVisual(thumb);
 const frame=document.createElement('div');
 frame.className='venue-photo-frame ayo';
 const image=document.createElement('img');
 image.alt=`Foto lapangan ${name} dari AYO Indonesia`;
 image.loading='lazy';
 image.decoding='async';
 image.referrerPolicy='no-referrer';
 image.src=`/api/ayo-thumbnail?name=${encodeURIComponent(name)}`;
 image.addEventListener('load',()=>{
  addKindBadge(thumb,'FOTO AYO','ayo');
  const source=card.querySelector('.venue-source-row');
  if(source&&!source.querySelector('.venue-photo-credit')){
   const link=document.createElement('a');
   link.className='venue-photo-credit';
   link.href=ayoVenueUrl(name);
   link.target='_blank';
   link.rel='noopener';
   link.textContent='Foto: AYO Indonesia';
   source.appendChild(link);
  }
 },{once:true});
 image.addEventListener('error',()=>showSatellite(thumb,point),{once:true});
 frame.appendChild(image);
 thumb.prepend(frame);
 addKindBadge(thumb,'MEMUAT FOTO','loading');
}

function patchAyoButton(card,name){
 const button=card.querySelector('.venue-action.ayo');
 if(!button)return;
 button.href=ayoVenueUrl(name);
 button.querySelector('b')&&(button.querySelector('b').textContent='Buka AYO');
}

function patchCard(card){
 if(card.dataset.visualV6==='1')return;
 const name=card.querySelector('.venue-title-row h3')?.textContent?.trim();
 const thumb=card.querySelector('.venue-thumb-v5');
 if(!name||!thumb)return;
 card.dataset.visualV6='1';
 const point=pointFor(name);
 patchAyoButton(card,name);
 showAyoPhoto(card,thumb,name,point);
}

function patchCopy(){
 const intro=document.querySelector('.venue-mobile-head p');
 if(intro)intro.textContent='Thumbnail memakai foto asli venue dari AYO bila tersedia. Jika belum ada, sistem menampilkan citra lokasi yang presisi atau status foto belum tersedia.';
 const note=document.querySelector('.venue-source-note');
 if(note)note.innerHTML='<strong>Standar visual:</strong> foto asli ditarik dari halaman venue AYO dan selalu diberi atribusi. Citra lokasi hanya dipakai sebagai cadangan untuk titik yang presisi. Tidak ada lagi ilustrasi lapangan yang disamarkan sebagai thumbnail venue.';
}

function patchAll(){
 patchCopy();
 document.querySelectorAll('.venue-card-v5').forEach(patchCard);
}

function install(){
 patchAll();
 const grid=document.getElementById('venueGrid');
 if(grid&&!grid.dataset.visualObserver){
  grid.dataset.visualObserver='1';
  new MutationObserver(patchAll).observe(grid,{childList:true,subtree:true});
 }
 document.addEventListener('click',event=>{
  const tab=event.target.closest('[data-tab]');
  if(tab?.dataset.tab==='lapangan')setTimeout(patchAll,40);
 });
}

try{install()}catch(error){console.error('Venue visual v6 failed:',error)}
})();
