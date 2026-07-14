(()=>{
'use strict';

const STORAGE_DRAFT='padel.registration.draft.v9';
const STORAGE_ROWS='padel.registration.rows.v9';
const FORM_ENDPOINT=window.PADEL_REGISTRATION_ENDPOINT||'';
const CATEGORIES={
  tni:{label:'TNI',icon:'🪖',hint:'Mabes TNI, TNI AD, TNI AL, atau TNI AU'},
  polisi:{label:'Polisi',icon:'👮',hint:'Mabes Polri, Polda, Polres, atau satuan kerja'},
  umum:{label:'Umum',icon:'🌏',hint:'Peserta individu dari masyarakat umum'},
  pelajar:{label:'Pelajar',icon:'🎓',hint:'Sekolah, pesantren, akademi, atau perguruan tinggi'},
  atlet:{label:'Atlet',icon:'🏅',hint:'Atlet PBPI, klub, akademi, atau atlet cabang olahraga lain'},
  komunitas:{label:'Komunitas',icon:'🤝',hint:'Komunitas padel, olahraga, profesi, atau daerah'},
  kementerian:{label:'Kementerian',icon:'🏛️',hint:'Kementerian, lembaga, badan, atau instansi pemerintah'}
};

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const normalizePhone=v=>String(v||'').replace(/\D/g,'').replace(/^0/,'62');
const nowIso=()=>new Date().toISOString();

function field(name,label,type='text',opts={}){
 const req=opts.required?' required':'';
 const ph=opts.placeholder?` placeholder="${esc(opts.placeholder)}"`:'';
 const min=opts.min?` min="${esc(opts.min)}"`:'';
 const max=opts.max?` max="${esc(opts.max)}"`:'';
 const input=type==='textarea'
  ?`<textarea id="${name}" name="${name}"${ph}${req} rows="3"></textarea>`
  :`<input id="${name}" name="${name}" type="${type}"${ph}${min}${max}${req}>`;
 return `<label class="reg-field ${opts.wide?'wide':''}"><span>${label}${opts.required?' <b>*</b>':''}</span>${input}${opts.note?`<small>${opts.note}</small>`:''}</label>`;
}
function selectField(name,label,options,opts={}){
 return `<label class="reg-field ${opts.wide?'wide':''}"><span>${label}${opts.required?' <b>*</b>':''}</span><select id="${name}" name="${name}"${opts.required?' required':''}><option value="">Pilih ${label.toLowerCase()}</option>${options.map(o=>`<option value="${esc(o.value??o)}">${esc(o.label??o)}</option>`).join('')}</select>${opts.note?`<small>${opts.note}</small>`:''}</label>`;
}
function categoryCards(){return Object.entries(CATEGORIES).map(([id,c])=>`<button class="reg-category-card" type="button" data-category="${id}" aria-pressed="false"><span>${c.icon}</span><strong>${c.label}</strong><small>${c.hint}</small></button>`).join('')}
function categoryFields(id){
 const commonInstitution= id==='umum' ? '' : field('institution_name',id==='komunitas'?'Nama Komunitas':'Nama Instansi / Organisasi','text',{required:true,placeholder:'Nama resmi instansi atau organisasi',wide:true});
 const map={
  tni: commonInstitution+selectField('tni_branch','Matra / Unsur',['Mabes TNI','TNI AD','TNI AL','TNI AU'],{required:true})+field('tni_unit','Kesatuan / Satuan Kerja','text',{required:true,placeholder:'Contoh: Kodam, Lantamal, Koopsud, Mabes'})+field('official_rank','Pangkat','text',{required:true})+field('official_number','NRP','text',{required:true})+field('assignment_letter','Nomor Surat Tugas / Rekomendasi','text',{placeholder:'Dapat dilengkapi kemudian',wide:true}),
  polisi: commonInstitution+selectField('police_level','Tingkat Kesatuan',['Mabes Polri','Polda','Polres','Polsek','Satuan Kerja Lain'],{required:true})+field('police_unit','Nama Kesatuan / Satuan Kerja','text',{required:true})+field('official_rank','Pangkat','text',{required:true})+field('official_number','NRP','text',{required:true})+field('assignment_letter','Nomor Surat Tugas / Rekomendasi','text',{placeholder:'Dapat dilengkapi kemudian',wide:true}),
  kementerian: commonInstitution+field('institution_unit','Unit Kerja / Direktorat','text',{required:true})+field('official_number','NIP / Nomor Pegawai','text',{required:true})+field('official_position','Jabatan','text',{required:true})+field('assignment_letter','Nomor Surat Tugas / Rekomendasi','text',{placeholder:'Dapat dilengkapi kemudian',wide:true}),
  pelajar: commonInstitution+selectField('education_level','Jenjang',['SMP / Sederajat','SMA / SMK / Sederajat','Diploma','S1','S2 / S3','Akademi / Kedinasan'],{required:true})+field('student_number','NIS / NISN / NIM','text',{required:true})+field('study_program','Kelas / Program Studi','text',{required:true})+field('school_advisor','Nama Guru / Dosen Pendamping','text',{placeholder:'Opsional'})+field('student_letter','Nomor Surat Keterangan Pelajar','text',{placeholder:'Dapat dilengkapi kemudian',wide:true}),
  atlet: commonInstitution+field('athlete_id','Nomor Atlet / Keanggotaan','text',{placeholder:'PBPI, klub, akademi, atau federasi'})+field('athlete_rank','Ranking / Level Resmi','text',{placeholder:'Nasional, provinsi, klub, atau lainnya'})+field('coach_name','Nama Pelatih','text')+field('athlete_achievements','Prestasi Utama','textarea',{placeholder:'Tuliskan prestasi yang relevan',wide:true}),
  komunitas: commonInstitution+field('community_city','Kota / Basis Komunitas','text',{required:true})+field('community_leader','Ketua / PIC Komunitas','text',{required:true})+field('community_members','Jumlah Anggota Aktif','number',{min:'1'})+field('community_social','Instagram / Media Sosial','text',{placeholder:'@namaakun atau URL',wide:true}),
  umum: field('occupation','Pekerjaan / Profesi','text',{required:true})+field('company_name','Perusahaan / Organisasi','text',{placeholder:'Opsional'})+field('domicile','Domisili','text',{required:true,placeholder:'Kota / Kabupaten'})
 };
 return map[id]||'';
}
function playerFields(n){return `<div class="reg-player-card"><div class="reg-player-title"><span>${n}</span><div><strong>Pemain ${n}</strong><small>${n===1?'Kapten / pemain utama':'Pasangan bermain'}</small></div></div><div class="reg-grid">${field(`p${n}_name`,'Nama Lengkap','text',{required:true})}${field(`p${n}_nickname`,'Nama Panggilan','text',{required:true})}${field(`p${n}_birth`,'Tanggal Lahir','date',{required:true})}${selectField(`p${n}_gender`,'Jenis Kelamin',['Laki-laki','Perempuan'],{required:true})}${field(`p${n}_phone`,'WhatsApp','tel',{required:true,placeholder:'08xxxxxxxxxx'})}${selectField(`p${n}_shirt`,'Ukuran Jersey',['XS','S','M','L','XL','XXL','XXXL'],{required:true})}${field(`p${n}_identity`,'No. Identitas / Kartu Anggota','text',{placeholder:'Untuk verifikasi administrasi',wide:true})}</div></div>`}
function shell(){return `<section class="section" id="pendaftaran">
 <div class="registration-shell">
  <div class="reg-hero"><div><span class="report-kicker">PENDAFTARAN TURNAMEN • HUT TNI KE-81</span><h2>Formulir Pendaftaran Peserta</h2><p>Satu pintu pendaftaran untuk TNI, Polisi, Umum, Pelajar, Atlet, Komunitas, dan Kementerian.</p></div><div class="reg-live-badge"><span>●</span> Form aktif</div></div>
  <div class="reg-overview"><div><b>7</b><span>Kategori Peserta</span></div><div><b>6</b><span>Level Pertandingan</span></div><div><b>2</b><span>Pemain per Tim</span></div><div><b>2026</b><span>HUT TNI ke-81</span></div></div>
  <div class="reg-status-note"><span>🛡️</span><div><strong>Privasi & penyimpanan</strong><p>Draft dan bukti pendaftaran tersimpan di perangkat ini. Pengiriman ke database pusat otomatis aktif saat endpoint panitia dihubungkan.</p></div></div>
  <div class="reg-layout">
   <aside class="reg-side"><h3>Alur Pendaftaran</h3><button type="button" class="reg-step-link active" data-step-link="1"><span>1</span><div><b>Kategori & Divisi</b><small>Pilih jalur peserta</small></div></button><button type="button" class="reg-step-link" data-step-link="2"><span>2</span><div><b>Instansi & PIC</b><small>Data perwakilan</small></div></button><button type="button" class="reg-step-link" data-step-link="3"><span>3</span><div><b>Data Pemain</b><small>Pasangan / tim</small></div></button><button type="button" class="reg-step-link" data-step-link="4"><span>4</span><div><b>Administrasi</b><small>Konfirmasi akhir</small></div></button><div class="reg-local-admin"><small>Pendaftaran tersimpan di perangkat</small><strong id="regLocalCount">0 tim</strong><button type="button" id="regExportCsv">Export CSV</button></div></aside>
   <div class="reg-main">
    <div class="reg-progress"><div id="regProgressBar"></div></div>
    <form id="registrationForm" novalidate>
     <input type="hidden" name="participant_category" id="participant_category">
     <div class="reg-step active" data-step="1"><div class="reg-step-head"><span>Langkah 1 dari 4</span><h3>Pilih Kategori Peserta</h3><p>Form lanjutan akan menyesuaikan identitas instansi atau organisasi.</p></div><div class="reg-category-grid">${categoryCards()}</div><div class="reg-grid reg-block">${field('team_name','Nama Tim / Pasangan','text',{required:true,placeholder:'Contoh: Garuda Padel 01'})}${field('origin_city','Kota / Kabupaten Asal','text',{required:true})}${selectField('match_division','Divisi Pertandingan',['Ganda Putra','Ganda Putri','Ganda Campuran'],{required:true})}${selectField('skill_level','Level Pertandingan',['Open Tournament','Silver','Lower Silver','Bronze','Lower Bronze','Beginner'],{required:true})}</div></div>
     <div class="reg-step" data-step="2"><div class="reg-step-head"><span>Langkah 2 dari 4</span><h3>Data Instansi & Penanggung Jawab</h3><p>Kolom identitas disesuaikan dengan kategori yang dipilih.</p></div><div class="reg-grid reg-dynamic-fields" id="categoryFields"></div><div class="reg-divider"><span>Kontak Penanggung Jawab</span></div><div class="reg-grid">${field('manager_name','Nama PIC / Manajer Tim','text',{required:true})}${field('manager_position','Jabatan / Peran','text',{required:true})}${field('manager_phone','WhatsApp PIC','tel',{required:true,placeholder:'08xxxxxxxxxx'})}${field('manager_email','Email PIC','email',{required:true,placeholder:'nama@email.com'})}</div></div>
     <div class="reg-step" data-step="3"><div class="reg-step-head"><span>Langkah 3 dari 4</span><h3>Data Pasangan Pemain</h3><p>Setiap tim berisi dua pemain. Data digunakan untuk bagan pertandingan, jersey, dan verifikasi.</p></div>${playerFields(1)}${playerFields(2)}</div>
     <div class="reg-step" data-step="4"><div class="reg-step-head"><span>Langkah 4 dari 4</span><h3>Administrasi & Pernyataan</h3><p>Pastikan nomor kontak aktif dan seluruh informasi sudah benar.</p></div><div class="reg-grid">${selectField('payment_status','Status Pembayaran',['Belum Dibayar','Menunggu Verifikasi','Sudah Dibayar'],{required:true})}${field('payment_reference','Referensi / Nama Pengirim','text',{placeholder:'Nomor transaksi atau nama rekening'})}${field('emergency_name','Kontak Darurat','text',{required:true})}${field('emergency_phone','WhatsApp Kontak Darurat','tel',{required:true})}${field('medical_notes','Catatan Kesehatan / Cedera','textarea',{placeholder:'Isi “Tidak ada” bila tidak ada catatan',wide:true,required:true})}${field('special_notes','Catatan Tambahan untuk Panitia','textarea',{placeholder:'Kebutuhan khusus, jadwal, atau keterangan administrasi',wide:true})}</div><div class="reg-checks"><label><input type="checkbox" name="data_truth" required><span>Saya menyatakan seluruh data yang diisi benar dan dapat diverifikasi oleh panitia.</span></label><label><input type="checkbox" name="rules_agreement" required><span>Saya menyetujui regulasi pertandingan PBPI, ketentuan panitia, dan keputusan wasit.</span></label><label><input type="checkbox" name="media_consent" required><span>Saya menyetujui dokumentasi foto/video untuk publikasi resmi kegiatan.</span></label></div></div>
     <div class="reg-actions"><button type="button" class="reg-btn secondary" id="regPrev">← Kembali</button><button type="button" class="reg-btn ghost" id="regSave">💾 Simpan Draft</button><button type="button" class="reg-btn primary" id="regNext">Lanjut →</button><button type="submit" class="reg-btn submit" id="regSubmit">✅ Daftarkan Tim</button></div>
    </form>
    <div class="reg-result" id="regResult" hidden></div>
   </div>
  </div>
 </div>
 </section>`}

function installSection(){
 if(qs('#pendaftaran'))return;
 const footer=qs('.footer');
 if(footer)footer.insertAdjacentHTML('beforebegin',shell());
 else document.body.insertAdjacentHTML('beforeend',shell());
}
function installNav(){
 const top=qs('#navTabs');
 const bottom=qs('.bottom-nav');
 if(top&&!qs('[data-tab="pendaftaran"]',top)){
  const b=document.createElement('button');b.type='button';b.className='nav-tab reg-nav-tab';b.dataset.tab='pendaftaran';b.innerHTML='<span class="nav-ico">📝</span><span class="nav-label">Daftar</span>';top.appendChild(b);
 }
 if(bottom&&!qs('[data-tab="pendaftaran"]',bottom)){
  const b=document.createElement('button');b.type='button';b.className='reg-nav-bottom';b.dataset.tab='pendaftaran';b.innerHTML='<span class="nav-ico">📝</span><span class="nav-label">Daftar</span>';bottom.appendChild(b);
 }
 qsa('[data-tab="pendaftaran"]').forEach(b=>b.addEventListener('click',()=>openRegistration()));
}
function openRegistration(){
 qsa('.nav-tab,.bottom-nav button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='pendaftaran'));
 qsa('.section').forEach(x=>x.classList.toggle('active',x.id==='pendaftaran'));
 window.scrollTo({top:0,behavior:'smooth'});
 setTimeout(()=>qs('#team_name')?.focus({preventScroll:true}),120);
}

let step=1;
function showStep(n){
 step=Math.min(4,Math.max(1,n));
 qsa('.reg-step').forEach(el=>el.classList.toggle('active',Number(el.dataset.step)===step));
 qsa('.reg-step-link').forEach(el=>el.classList.toggle('active',Number(el.dataset.stepLink)===step));
 qs('#regProgressBar').style.width=`${step*25}%`;
 qs('#regPrev').style.visibility=step===1?'hidden':'visible';
 qs('#regNext').hidden=step===4;
 qs('#regSubmit').hidden=step!==4;
 qs('.reg-main')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function chooseCategory(id){
 if(!CATEGORIES[id])return;
 qs('#participant_category').value=id;
 qsa('.reg-category-card').forEach(b=>{const on=b.dataset.category===id;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
 qs('#categoryFields').innerHTML=categoryFields(id);
}
function validateStep(n){
 const area=qs(`.reg-step[data-step="${n}"]`);if(!area)return true;
 const category=qs('#participant_category');
 if(n===1&&!category.value){qsa('.reg-category-card').forEach(b=>b.classList.add('shake'));setTimeout(()=>qsa('.reg-category-card').forEach(b=>b.classList.remove('shake')),500);return false}
 const fields=qsa('input,select,textarea',area).filter(x=>x.required&&!x.disabled);
 for(const f of fields){if(!f.checkValidity()){f.reportValidity();f.focus();return false}}
 return true;
}
function formDataObject(){
 const form=qs('#registrationForm'),fd=new FormData(form),data={};
 fd.forEach((v,k)=>{if(v instanceof File){if(v.name)data[k]=v.name}else data[k]=v});
 data.participant_category_label=CATEGORIES[data.participant_category]?.label||data.participant_category;
 data.manager_phone_normalized=normalizePhone(data.manager_phone);
 data.p1_phone_normalized=normalizePhone(data.p1_phone);
 data.p2_phone_normalized=normalizePhone(data.p2_phone);
 return data;
}
function saveDraft(silent=false){
 const data=formDataObject();localStorage.setItem(STORAGE_DRAFT,JSON.stringify({saved_at:nowIso(),data}));
 if(!silent){const b=qs('#regSave');const old=b.innerHTML;b.innerHTML='✅ Draft tersimpan';setTimeout(()=>b.innerHTML=old,1500)}
}
function restoreDraft(){
 try{const raw=localStorage.getItem(STORAGE_DRAFT);if(!raw)return;const payload=JSON.parse(raw),d=payload.data||{};if(d.participant_category)chooseCategory(d.participant_category);Object.entries(d).forEach(([k,v])=>{const el=qs(`[name="${CSS.escape(k)}"]`);if(!el)return;if(el.type==='checkbox')el.checked=v==='on'||v===true;else el.value=v});}catch(e){console.warn('Draft restore failed',e)}
}
function getRows(){try{return JSON.parse(localStorage.getItem(STORAGE_ROWS)||'[]')}catch{return []}}
function setRows(rows){localStorage.setItem(STORAGE_ROWS,JSON.stringify(rows.slice(-250)));updateCount()}
function updateCount(){const rows=getRows();const el=qs('#regLocalCount');if(el)el.textContent=`${rows.length} tim`}
function registrationId(category){const code={tni:'TNI',polisi:'POL',umum:'UMM',pelajar:'PLJ',atlet:'ATL',komunitas:'KOM',kementerian:'KEM'}[category]||'REG';const d=new Date();return `PSI81-${code}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getTime()).slice(-6)}`}
function summaryText(row){const d=row.data;return [`PENDAFTARAN TURNAMEN PADEL HUT TNI KE-81`,`ID: ${row.registration_id}`,`Kategori: ${d.participant_category_label}`,`Tim: ${d.team_name}`,`Divisi: ${d.match_division}`,`Level: ${d.skill_level}`,`Asal: ${d.origin_city}`,`PIC: ${d.manager_name} (${d.manager_phone})`,`Pemain 1: ${d.p1_name}`,`Pemain 2: ${d.p2_name}`,`Status pembayaran: ${d.payment_status}`,`Waktu: ${new Date(row.submitted_at).toLocaleString('id-ID')}`].join('\n')}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csvValue(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function exportCsv(){
 const rows=getRows();if(!rows.length){alert('Belum ada pendaftaran tersimpan di perangkat ini.');return}
 const keys=[...new Set(rows.flatMap(r=>Object.keys(r.data)))];
 const head=['registration_id','submitted_at',...keys];
 const csv=[head.join(','),...rows.map(r=>head.map(k=>csvValue(k==='registration_id'?r.registration_id:k==='submitted_at'?r.submitted_at:r.data[k])).join(','))].join('\n');
 download(`pendaftaran-padel-${new Date().toISOString().slice(0,10)}.csv`,csv,'text/csv;charset=utf-8');
}
async function submitRegistration(e){
 e.preventDefault();if(!validateStep(4))return;
 const data=formDataObject(),row={registration_id:registrationId(data.participant_category),submitted_at:nowIso(),event:'Turnamen Padel Nasional HUT TNI ke-81',data};
 const btn=qs('#regSubmit');btn.disabled=true;btn.textContent='Memproses…';
 let delivery='local';
 try{
  if(FORM_ENDPOINT){const res=await fetch(FORM_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(row)});if(!res.ok)throw new Error(`HTTP ${res.status}`);delivery='server'}
  const rows=getRows();rows.push(row);setRows(rows);localStorage.removeItem(STORAGE_DRAFT);
  const result=qs('#regResult');result.hidden=false;result.innerHTML=`<div class="reg-success-icon">✓</div><span class="report-kicker">PENDAFTARAN BERHASIL DIBUAT</span><h3>${esc(row.registration_id)}</h3><p>Tim <strong>${esc(data.team_name)}</strong> tercatat untuk kategori <strong>${esc(data.participant_category_label)}</strong>, divisi ${esc(data.match_division)}, level ${esc(data.skill_level)}.</p><div class="reg-summary-grid"><div><span>Pemain</span><b>${esc(data.p1_name)} & ${esc(data.p2_name)}</b></div><div><span>PIC</span><b>${esc(data.manager_name)}</b></div><div><span>Penyimpanan</span><b>${delivery==='server'?'Database panitia':'Perangkat ini'}</b></div><div><span>Pembayaran</span><b>${esc(data.payment_status)}</b></div></div><div class="reg-result-actions"><button type="button" data-reg-action="copy">📋 Salin Ringkasan</button><button type="button" data-reg-action="json">⬇️ Unduh JSON</button><button type="button" data-reg-action="print">🖨️ Cetak</button><button type="button" data-reg-action="new">＋ Pendaftaran Baru</button></div>`;
  qs('#registrationForm').hidden=true;result.scrollIntoView({behavior:'smooth',block:'start'});
  qs('[data-reg-action="copy"]',result).onclick=async()=>{const text=summaryText(row);try{await navigator.clipboard.writeText(text);alert('Ringkasan pendaftaran sudah disalin.')}catch{prompt('Salin ringkasan berikut:',text)}};
  qs('[data-reg-action="json"]',result).onclick=()=>download(`${row.registration_id}.json`,JSON.stringify(row,null,2),'application/json');
  qs('[data-reg-action="print"]',result).onclick=()=>window.print();
  qs('[data-reg-action="new"]',result).onclick=()=>{qs('#registrationForm').reset();qs('#participant_category').value='';qs('#categoryFields').innerHTML='';qsa('.reg-category-card').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});qs('#registrationForm').hidden=false;result.hidden=true;showStep(1)};
 }catch(err){alert(`Pendaftaran belum terkirim ke server. Data tetap disimpan sebagai draft.\n${err.message||err}`);saveDraft(true)}finally{btn.disabled=false;btn.textContent='✅ Daftarkan Tim'}
}
function bind(){
 qsa('.reg-category-card').forEach(b=>b.addEventListener('click',()=>chooseCategory(b.dataset.category)));
 qs('#regNext').addEventListener('click',()=>{if(validateStep(step))showStep(step+1)});
 qs('#regPrev').addEventListener('click',()=>showStep(step-1));
 qs('#regSave').addEventListener('click',()=>saveDraft(false));
 qs('#regExportCsv').addEventListener('click',exportCsv);
 qs('#registrationForm').addEventListener('submit',submitRegistration);
 qs('#registrationForm').addEventListener('input',()=>saveDraft(true));
 qsa('.reg-step-link').forEach(b=>b.addEventListener('click',()=>{const target=Number(b.dataset.stepLink);if(target<=step)showStep(target);else if(target===step+1&&validateStep(step))showStep(target)}));
 restoreDraft();updateCount();showStep(1);
}
function install(){installSection();installNav();bind();window.openPadelRegistration=openRegistration}
try{install()}catch(err){console.error('Registration v9 failed:',err)}
})();
