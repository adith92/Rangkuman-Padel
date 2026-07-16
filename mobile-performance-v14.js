(()=>{
'use strict';

const MOBILE=window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
const state={
  mapActivated:!MOBILE,
  mapBooting:false,
  mapBooted:false,
  refreshTimer:0,
  navLocked:false,
  originalBoot:null,
  originalRefresh:null,
  observer:null
};

const idle=(fn,timeout=500)=>{
  if('requestIdleCallback' in window) return requestIdleCallback(fn,{timeout});
  return setTimeout(fn,48);
};
const nextPaint=fn=>requestAnimationFrame(()=>requestAnimationFrame(fn));

function sectionActive(id){
  const section=document.getElementById(id);
  return !!section?.classList.contains('active');
}

function patchLeaflet(){
  if(!MOBILE||!window.L)return;
  const L=window.L;
  if(typeof L.map==='function'&&!L.map.__mobileV14){
    const original=L.map;
    const patched=function(id,options){
      const mobileOptions={
        preferCanvas:true,
        zoomAnimation:false,
        fadeAnimation:false,
        markerZoomAnimation:false,
        inertia:false,
        wheelDebounceTime:80,
        wheelPxPerZoomLevel:90
      };
      return original.call(this,id,Object.assign(mobileOptions,options||{}));
    };
    Object.assign(patched,original);
    patched.__mobileV14=true;
    L.map=patched;
  }
  const proto=L.Map?.prototype;
  if(proto&&!proto.__mobileV14){
    proto.__mobileV14=true;
    if(typeof proto.flyTo==='function'){
      proto.__flyToV14=proto.flyTo;
      proto.flyTo=function(center,zoom){return this.setView(center,zoom,{animate:false});};
    }
    if(typeof proto.flyToBounds==='function'){
      proto.__flyToBoundsV14=proto.flyToBounds;
      proto.flyToBounds=function(bounds,options){return this.fitBounds(bounds,Object.assign({},options,{animate:false}));};
    }
  }
}

function stopMapMotion(){
  try{
    if(window.nationalMap){
      window.nationalMap.stop?.();
      window.nationalMap.closePopup?.();
    }
  }catch(err){console.debug('Map pause skipped',err)}
}

function mapGate(){
  const section=document.getElementById('peta');
  if(!MOBILE||!section)return;
  section.classList.add('map-suspended-v14');
  if(section.querySelector('.map-gate-v14'))return;
  const gate=document.createElement('div');
  gate.className='map-gate-v14';
  gate.innerHTML=`
    <div class="map-gate-icon-v14" aria-hidden="true">🗺️</div>
    <div class="map-gate-copy-v14">
      <span class="map-gate-kicker-v14">MODE RINGAN UNTUK HANDPHONE</span>
      <h2>Peta nasional siap dibuka</h2>
      <p>Marker dan data lokasi baru diproses setelah tombol ditekan, supaya perpindahan tab tetap lancar dan layar tidak freeze.</p>
    </div>
    <button type="button" class="map-activate-v14" id="activateMapV14">
      <span>📍</span><b>Buka Peta Interaktif</b>
    </button>`;
  section.prepend(gate);
  gate.querySelector('#activateMapV14')?.addEventListener('click',activateMap,{once:true});
}

function hideOfflineMap(){
  const section=document.getElementById('peta');
  if(!section||!section.querySelector('.leaflet-container'))return;
  const selectors=['.offline-map','.map-offline','.national-map-offline','#offlineMap','#mapOffline','.offline-svg-map'];
  selectors.forEach(selector=>section.querySelectorAll(selector).forEach(node=>node.classList.add('map-offline-hidden-v14')));
  section.querySelectorAll('svg').forEach(svg=>{
    if(svg.closest('.leaflet-container,.map-legend,.legend'))return;
    const host=svg.closest('.map-shell,.map-canvas,.offline-map,.map-offline')||svg;
    if(!host.querySelector?.('.leaflet-container'))host.classList.add('map-offline-hidden-v14');
  });
}

function paginateRows(container,rows,limit=40,label='data'){
  if(!MOBILE||!container||rows.length<=limit||container.dataset.v14Paged==='1')return;
  container.dataset.v14Paged='1';
  let shown=limit;
  rows.slice(limit).forEach(row=>row.classList.add('deferred-v14'));
  const control=document.createElement('div');
  control.className='load-more-v14';
  const button=document.createElement('button');
  button.type='button';
  const update=()=>{
    const remaining=rows.length-shown;
    button.innerHTML=remaining>0?`<span>＋</span><b>Tampilkan ${Math.min(40,remaining)} ${label} lagi</b>`:'<b>Semua data sudah tampil</b>';
    button.disabled=remaining<=0;
    control.hidden=remaining<=0;
  };
  button.addEventListener('click',()=>{
    const next=Math.min(shown+40,rows.length);
    rows.slice(shown,next).forEach(row=>row.classList.remove('deferred-v14'));
    shown=next;
    update();
  });
  control.append(button);
  const parent=container.tagName==='TBODY'?container.closest('table')||container:container;
  parent.insertAdjacentElement('afterend',control);
  update();
}

function virtualizeSection(id){
  if(!MOBILE)return;
  const section=document.getElementById(id);
  if(!section)return;
  section.querySelectorAll('tbody').forEach(body=>paginateRows(body,Array.from(body.children).filter(x=>x.tagName==='TR'),40,'baris'));

  const selectors=id==='peta'
    ?['.map-location-list','.location-list','.map-list','#mapLocationList','#nationalMapList','[data-map-list]']
    :['.province-grid','.pengprov-grid','.directory-grid','.cards-grid','.card-grid','.list-grid'];
  selectors.forEach(selector=>section.querySelectorAll(selector).forEach(container=>{
    const rows=Array.from(container.children).filter(node=>node.nodeType===1);
    paginateRows(container,rows,40,id==='peta'?'lokasi':'wilayah');
  }));

  if(id==='pengprov'){
    const cards=Array.from(section.querySelectorAll('.province-card,.pengprov-card,.directory-card'));
    if(cards.length>60){
      const parent=cards[0]?.parentElement;
      if(parent&&cards.every(card=>card.parentElement===parent))paginateRows(parent,cards,40,'wilayah');
    }
  }
}

function afterMapRender(){
  hideOfflineMap();
  virtualizeSection('peta');
  try{window.nationalMap?.invalidateSize?.({pan:false,animate:false})}catch(err){console.debug('Map resize skipped',err)}
}

function runOriginalBoot(){
  if(state.mapBooted||state.mapBooting||typeof state.originalBoot!=='function')return;
  state.mapBooting=true;
  patchLeaflet();
  try{
    state.originalBoot();
    state.mapBooted=true;
  }catch(err){
    console.error('Peta gagal dimuat:',err);
    const gate=document.querySelector('.map-gate-v14');
    gate?.classList.add('map-gate-error-v14');
    const button=gate?.querySelector('.map-activate-v14');
    if(button){button.disabled=false;button.innerHTML='<span>↻</span><b>Coba Muat Ulang</b>';button.addEventListener('click',activateMap,{once:true});}
  }finally{
    state.mapBooting=false;
    idle(afterMapRender,900);
  }
}

function activateMap(){
  const section=document.getElementById('peta');
  const gate=section?.querySelector('.map-gate-v14');
  const button=gate?.querySelector('.map-activate-v14');
  if(button){button.disabled=true;button.innerHTML='<span class="spinner-v14">◌</span><b>Menyiapkan peta…</b>';}
  state.mapActivated=true;
  gate?.classList.add('loading-v14');
  nextPaint(()=>{
    section?.classList.remove('map-suspended-v14');
    idle(()=>{
      runOriginalBoot();
      setTimeout(()=>{
        afterMapRender();
        gate?.remove();
      },700);
    },350);
  });
}

function wrapMapFunctions(){
  const boot=window.bootNationalMap;
  if(typeof boot==='function'&&!boot.__mobileV14){
    state.originalBoot=boot;
    const wrapped=function(...args){
      if(!MOBILE||state.mapActivated){
        if(!state.mapBooted&&!state.mapBooting){
          state.mapBooting=true;
          patchLeaflet();
          try{const result=state.originalBoot.apply(this,args);state.mapBooted=true;return result}
          finally{state.mapBooting=false;idle(afterMapRender,900)}
        }
        return;
      }
      mapGate();
    };
    wrapped.__mobileV14=true;
    window.bootNationalMap=wrapped;
  }

  const refresh=window.refreshNationalMap;
  if(typeof refresh==='function'&&!refresh.__mobileV14){
    state.originalRefresh=refresh;
    const wrappedRefresh=function(...args){
      if(MOBILE&&(!state.mapActivated||!sectionActive('peta')))return;
      const context=this;
      clearTimeout(state.refreshTimer);
      state.refreshTimer=setTimeout(()=>idle(()=>{
        try{state.originalRefresh.apply(context,args)}
        finally{idle(afterMapRender,700)}
      },420),MOBILE?280:40);
    };
    wrappedRefresh.__mobileV14=true;
    window.refreshNationalMap=wrappedRefresh;
  }
}

function lockRapidNavigation(){
  document.addEventListener('click',event=>{
    const button=event.target.closest('.nav-tab,.bottom-nav button');
    if(!button)return;
    if(state.navLocked){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    state.navLocked=true;
    document.documentElement.classList.add('tab-switching-v14');
    const active=document.activeElement;
    if(active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))active.blur();
    setTimeout(()=>{
      state.navLocked=false;
      document.documentElement.classList.remove('tab-switching-v14');
    },MOBILE?320:180);
  },true);
}

function observeHeavySections(){
  if(!MOBILE||state.observer)return;
  const targets=['peta','pengprov'].map(id=>document.getElementById(id)).filter(Boolean);
  if(!targets.length)return;
  let timer=0;
  state.observer=new MutationObserver(()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>{
      if(sectionActive('peta'))virtualizeSection('peta');
      if(sectionActive('pengprov'))virtualizeSection('pengprov');
    },350);
  });
  targets.forEach(target=>state.observer.observe(target,{childList:true,subtree:true}));
}

function onTabChange(event){
  const id=event.detail?.id;
  clearTimeout(state.refreshTimer);
  if(id==='peta'){
    if(MOBILE&&!state.mapActivated)mapGate();
    else idle(afterMapRender,500);
  }else{
    stopMapMotion();
  }
  if(id==='pengprov')idle(()=>virtualizeSection('pengprov'),350);
}

function install(){
  if(document.documentElement.dataset.mobilePerformanceV14==='1')return;
  document.documentElement.dataset.mobilePerformanceV14='1';
  if(MOBILE)document.documentElement.classList.add('mobile-performance-v14');
  mapGate();
  wrapMapFunctions();
  lockRapidNavigation();
  observeHeavySections();
  document.addEventListener('app-tab-change',onTabChange);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMapMotion()});
  window.addEventListener('pagehide',stopMapMotion,{passive:true});
  window.addEventListener('resize',()=>{
    clearTimeout(state.resizeTimer);
    state.resizeTimer=setTimeout(()=>{if(sectionActive('peta')&&state.mapActivated)afterMapRender()},180);
  },{passive:true});
  setTimeout(wrapMapFunctions,600);
  setTimeout(wrapMapFunctions,1800);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
