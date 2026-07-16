/* ================================================================
   SHOP.JS — Cart · Checkout · Auth · Modals · Subscription
   Waterboy Delivery  (v2 — all buttons fixed)
   ================================================================ */

/* ── Water Type Pricing — Single Source of Truth ───────────────── */
const WATERBOY_PRICING = {
  bundles: {
    'Solo':       { bottles:2,  ro:24.99,  alkaline:27.99,  hydrogen:0 },
    'Family':     { bottles:4,  ro:45.99,  alkaline:54.99,  hydrogen:0 },
    'Household':  { bottles:6,  ro:69.99,  alkaline:74.99,  hydrogen:0 },
    'Office':     { bottles:8,  ro:94.99,  alkaline:99.99,  hydrogen:0 },
    'Max Bundle': { bottles:12, ro:140.99, alkaline:149.99, hydrogen:0 },
  },
  perBottle: { ro:11.99, alkaline:13.99, hydrogen:10.99 },
};

/* ── Global Water State ────────────────────────────────────────── */
window.WaterboyState = (function(){
  const stored = localStorage.getItem('waterboy_water_type');
  let _type = (stored === 'alkaline' || stored === 'hydrogen') ? stored : 'ro';
  return {
    get waterType(){ return _type; },
    setType(t){
      _type = t;
      localStorage.setItem('waterboy_water_type', t);
      renderPriceTags();
      syncWaterPillsUI();
      window.dispatchEvent(new CustomEvent('watertype:changed', { detail: { type: t } }));
    },
    getPlanPrice(planId){
      const p = WATERBOY_PRICING.bundles[planId];
      return p ? p[_type] : 0;
    },
  };
})();

function renderPriceTags(){
  const type = window.WaterboyState.waterType;
  document.querySelectorAll('.price-tag').forEach(el => {
    const id   = el.dataset.productId;
    const kind = el.dataset.productType;
    if(kind === 'bundle' && WATERBOY_PRICING.bundles[id]){
      el.textContent = '$' + WATERBOY_PRICING.bundles[id][type];
    } else if(kind === 'per-bottle'){
      el.textContent = '$' + WATERBOY_PRICING.perBottle[type].toFixed(2);
    }
  });
  // Update delivery modal plan cards if open
  document.querySelectorAll('.dv-plan-price-live').forEach(el => {
    const id = el.dataset.plan;
    if(id && WATERBOY_PRICING.bundles[id]){
      el.textContent = '$' + WATERBOY_PRICING.bundles[id][type] + '/mo';
    }
  });
}

function syncWaterPillsUI(){
  const type = window.WaterboyState.waterType;
  document.querySelectorAll('.wt-pill[data-type]').forEach(p => {
    p.classList.toggle('active', p.dataset.type === type);
  });
  document.querySelectorAll('.wt-card[data-type]').forEach(c => {
    c.classList.toggle('selected', c.dataset.type === type);
    c.setAttribute('aria-pressed', String(c.dataset.type === type));
  });
}

/* ── Constants & Plans ─────────────────────────────────────────── */
const PLANS = {
  'Solo':               { bottles:2,  price:24.99,  alkaline:false },
  'Family':             { bottles:4,  price:45.99,  alkaline:false },
  'Household':          { bottles:6,  price:69.99,  alkaline:false },
  'Office':             { bottles:8,  price:94.99,  alkaline:false },
  'Max Bundle':         { bottles:12, price:140.99, alkaline:false },
  'Alkaline Solo':      { bottles:2,  price:27.99,  alkaline:true  },
  'Alkaline Family':    { bottles:4,  price:54.99,  alkaline:true  },
  'Alkaline Household': { bottles:6,  price:74.99,  alkaline:true  },
  'Alkaline Office':    { bottles:8,  price:99.99,  alkaline:true  },
  'Alkaline Max':       { bottles:12, price:149.99, alkaline:true  },
};

/* Checkout add-on data */
const CHECKOUT_ADDONS = [
  { id:'ice-bags',       name:'Ice Bags',          price:4.99,  desc:'10lb bag. Parties and coolers.', img:'' },
  { id:'lmnt-cans',      name:'LMNT Sparkling Cans', price:4.99,  desc:'16oz electrolyte drink. 1000mg sodium. Zero sugar.', img:'' },
  { id:'hydrogen-sticks',name:'Hydrogen Sticks',    price:29.99, desc:'Month of H2-infused water on the go.', img:'' },
  { id:'h2-tabs',        name:'H2 Tabs',            price:1.00,  desc:'Fast-dissolving hydrogen tablets.', img:'' },
];

/* ── Zone Calculation ───────────────────────────────────────────── */
const STORE_LAT=38.4088, STORE_LNG=-121.3716;
const ZIP_COORDS={
  '95758':{lat:38.4088,lng:-121.3716},
  '95757':{lat:38.3930,lng:-121.4490},
  '95624':{lat:38.4380,lng:-121.3850},
  '95759':{lat:38.3780,lng:-121.4300},
  '95830':{lat:38.4750,lng:-121.4350},
  '95829':{lat:38.4700,lng:-121.3900},
  '95828':{lat:38.4900,lng:-121.4100},
  '95823':{lat:38.5100,lng:-121.4500},
  '95822':{lat:38.5200,lng:-121.4900},
  '95832':{lat:38.4600,lng:-121.4800},
  '95630':{lat:38.5800,lng:-121.2700},
  '95670':{lat:38.5900,lng:-121.2800},
  '95826':{lat:38.5400,lng:-121.3800},
  '95831':{lat:38.4900,lng:-121.5200},
  '95655':{lat:38.3500,lng:-121.5000},
  '95693':{lat:38.3200,lng:-121.3500},
  '95242':{lat:38.2000,lng:-121.2700},
  '95820':{lat:38.5300,lng:-121.4600},
  '95825':{lat:38.5700,lng:-121.4000},
};

let currentZone={zone:0,fee:0,outside:false,unknown:true};

function haversine(lat1,lng1,lat2,lng2){
  const R=3959,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function getZoneForZip(zip){
  const c=ZIP_COORDS[zip];
  if(!c) return {zone:0,fee:0,outside:false,unknown:true};
  const d=haversine(STORE_LAT,STORE_LNG,c.lat,c.lng);
  if(d<=1)  return {zone:1,fee:2.99, dist:d,outside:false,unknown:false};
  if(d<=2)  return {zone:1,fee:3.99, dist:d,outside:false,unknown:false};
  if(d<=3)  return {zone:2,fee:5.99, dist:d,outside:false,unknown:false};
  if(d<=4)  return {zone:3,fee:6.99, dist:d,outside:false,unknown:false};
  if(d<=5)  return {zone:3,fee:7.99, dist:d,outside:false,unknown:false};
  if(d<=6)  return {zone:3,fee:8.99, dist:d,outside:false,unknown:false};
  if(d<=7)  return {zone:3,fee:9.99, dist:d,outside:false,unknown:false};
  if(d<=8)  return {zone:3,fee:10.99,dist:d,outside:false,unknown:false};
  if(d<=9)  return {zone:3,fee:11.99,dist:d,outside:false,unknown:false};
  return {zone:4,fee:0,dist:d,outside:true,unknown:false};
}

function zoneFeeDisplay(zr){
  if(zr.unknown) return {text:'TBD',color:'#8BB8D4',tag:'',fee:0};
  if(zr.outside) return {text:'Contact us',color:'#ff6b6b',tag:'',fee:0};
  if(zr.zone===1) return {text:'$'+zr.fee.toFixed(2),color:'#C5DFF0',tag:'Zone 1',fee:zr.fee};
  if(zr.zone===2) return {text:'$'+zr.fee.toFixed(2),color:'#C5DFF0',tag:'Zone 2',fee:zr.fee};
  if(zr.zone===3) return {text:'$'+zr.fee.toFixed(2),color:'#FFD700',tag:'Zone 3',fee:zr.fee};
  return {text:'TBD',color:'#8BB8D4',tag:'',fee:0};
}

function renderZoneResult(zr,resEl,nextBtn){
  if(!resEl) return;
  currentZone=zr;
  if(zr.unknown){
    resEl.innerHTML='<div class="zone-inline zone-unk">Delivery fee will be confirmed after order is placed</div>';
    if(nextBtn) nextBtn.disabled=false;
  } else if(zr.outside){
    resEl.innerHTML='<div class="zone-inline zone-out">Beyond 9 miles - Custom Quote. We may still be able to help. Call <a href="tel:+19167533866">(916) 753-3866</a></div>';
    if(nextBtn) nextBtn.disabled=true;
  } else {
    const msgs={
      1:'<div class="zone-inline zone-z1">Zone 1 - $2.99 delivery fee (core area)</div>',
      2:'<div class="zone-inline zone-z2">Zone 2 - $5.99 delivery fee (Laguna, Rancho area)</div>',
      3:'<div class="zone-inline zone-z3">Zone 3 - $8.99 delivery fee (extended area)</div>',
    };
    resEl.innerHTML=msgs[zr.zone]||'';
    if(nextBtn) nextBtn.disabled=false;
  }
}

function wireZipField(inputId,resultId,nextBtnId){
  const inp=document.getElementById(inputId);
  if(!inp) return;
  let resEl=document.getElementById(resultId);
  if(!resEl){
    resEl=document.createElement('div'); resEl.id=resultId;
    const f=inp.closest('.wb-field'); if(f) f.after(resEl); else inp.after(resEl);
  }
  const run=()=>{
    const zip=(inp.value||'').replace(/\D/g,'').slice(0,5);
    const nextBtn=nextBtnId?document.getElementById(nextBtnId):null;
    if(zip.length<5){ resEl.innerHTML=''; return; }
    renderZoneResult(getZoneForZip(zip),resEl,nextBtn);
  };
  inp.addEventListener('blur',run);
  inp.addEventListener('input',()=>{ if((inp.value||'').replace(/\D/g,'').length>=5) run(); });
}

const PHONE      = '(916) 753-3866';
const PHONE_HREF = 'tel:+19167533866';
const DEMO_EMAIL = 'demo@waterboy.com';
const DEMO_PASS  = 'water2026';

/* ── State ─────────────────────────────────────────────────────── */
function loadCart(){ try{ return JSON.parse(localStorage.getItem('wb_cart_v1'))||[]; }catch(e){ return []; } }
function saveCart(c){ localStorage.setItem('wb_cart_v1', JSON.stringify(c)); }
function loadUser(){ try{ return JSON.parse(localStorage.getItem('wb_user_v1'))||null; }catch(e){ return null; } }
function saveUser(u){ if(u) localStorage.setItem('wb_user_v1', JSON.stringify(u)); else localStorage.removeItem('wb_user_v1'); }

let cart = loadCart();
let user = loadUser();

/* ── Utility ───────────────────────────────────────────────────── */
function $(sel, ctx){ return (ctx||document).querySelector(sel); }
function $$(sel, ctx){ return [...(ctx||document).querySelectorAll(sel)]; }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function genId(){ return 'WB-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase(); }

/* ── Toast ─────────────────────────────────────────────────────── */
function toast(title, msg, icon){
  const t = document.getElementById('wb-toast');
  if(!t) return;
  t.querySelector('.wb-toast-icon').textContent = icon||'✓';
  t.querySelector('.wb-toast-title').textContent = title;
  t.querySelector('.wb-toast-msg').textContent = msg||'';
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(()=>t.classList.remove('show'), 3400);
}

/* ── Overlay helpers ───────────────────────────────────────────── */
function openOverlay(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.style.display = 'flex';   // clear inline display:none so CSS .open rule can show it
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeOverlay(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('open');
  el.style.display = 'none';   // re-apply inline hide so element is gone without CSS
  // only restore scroll if no other overlays are open
  if(!document.querySelector('.wb-overlay.open')) document.body.style.overflow = '';
}
function closeAll(){
  $$('.wb-overlay').forEach(o => { o.classList.remove('open'); o.style.display = 'none'; });
  document.body.style.overflow = '';
}

/* ── Step panels ───────────────────────────────────────────────── */
function gotoStep(overlayId, step){
  const ov = document.getElementById(overlayId);
  if(!ov) return;
  $$('.step-dot', ov).forEach((d,i)=>{
    d.classList.toggle('active', i===step);
    d.classList.toggle('done', i<step);
  });
  $$('.step-line', ov).forEach((l,i)=>l.classList.toggle('done', i<step));
  $$('.step-panel', ov).forEach((p,i)=>p.classList.toggle('active', i===step));
}

/* ── Calendar ──────────────────────────────────────────────────── */
function buildCalendar(wrapId, minDaysAhead, onSelect){
  const wrap = document.getElementById(wrapId);
  if(!wrap) return;
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  let now = new Date();
  let vYear = now.getFullYear(), vMonth = now.getMonth();
  let selected = null;

  function render(){
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + (minDaysAhead||0));
    minDate.setHours(0,0,0,0);
    const firstDay = new Date(vYear, vMonth, 1).getDay();
    const daysInMonth = new Date(vYear, vMonth+1, 0).getDate();

    let html = `<div class="cal-head">
      <button class="cal-nav-btn" id="${wrapId}-prev">&#8249;</button>
      <span class="cal-title">${MONTHS[vMonth]} ${vYear}</span>
      <button class="cal-nav-btn" id="${wrapId}-next">&#8250;</button>
    </div><div class="cal-grid">
    ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<div class="cal-lbl">${d}</div>`).join('')}`;
    for(let i=0;i<firstDay;i++) html+=`<div class="cal-empty"></div>`;
    for(let d=1;d<=daysInMonth;d++){
      const date=new Date(vYear,vMonth,d); date.setHours(0,0,0,0);
      const isSun=date.getDay()===0, isPast=date<minDate;
      const isSel=selected&&date.toDateString()===selected.toDateString();
      let cls='cal-day';
      if(isSun||isPast) cls+=' cal-off';
      if(isSel) cls+=' cal-sel';
      html+=`<div class="${cls}" data-date="${date.toISOString()}">${d}</div>`;
    }
    html+='</div>';
    wrap.innerHTML=html;
    document.getElementById(`${wrapId}-prev`).addEventListener('click',()=>{vMonth--;if(vMonth<0){vMonth=11;vYear--;}render();});
    document.getElementById(`${wrapId}-next`).addEventListener('click',()=>{vMonth++;if(vMonth>11){vMonth=0;vYear++;}render();});
    $$('.cal-day:not(.cal-off)',wrap).forEach(el=>{
      el.addEventListener('click',()=>{ selected=new Date(el.dataset.date); render(); if(onSelect) onSelect(selected); });
    });
  }
  render();
}

function buildTimeWindows(containerId, onSelect){
  const c = document.getElementById(containerId);
  if(!c) return;
  const wins = ['8 AM – 10 AM','10 AM – 12 PM','12 PM – 2 PM','2 PM – 4 PM','4 PM – 6 PM'];
  c.innerHTML = wins.map(w=>`<button class="tw-btn" data-tw="${w}">${w}</button>`).join('');
  $$('.tw-btn',c).forEach(b=>b.addEventListener('click',()=>{
    $$('.tw-btn',c).forEach(x=>x.classList.remove('sel'));
    b.classList.add('sel');
    if(onSelect) onSelect(b.dataset.tw);
  }));
}


/* ── Customers Also Bought ───────────────────────────────────────── */
const ALSO_BOUGHT=[
  {name:'LMNT Electrolyte Cans',price:4.99,display:'$4.99 / can',img:'Images%20for%20Menu/Images%20for%20Menu/Cans.jpg'},
  {name:'LMNT Electrolyte Packets',price:2.99,display:'$2.99 / pkt',img:'Images%20for%20Menu/Images%20for%20Menu/Pack1.PNG'},
  {name:'Zipfizz Energy Drink Mix',price:39.99,display:'$39.99 / 30-pack',img:'Images%20for%20Menu/Images%20for%20Menu/Box.PNG'},
  {name:'Echo Hydrogen Prebiotic Drink Mix',price:4.99,display:'$4.99 / pkt',img:'Images%20for%20Menu/Images%20for%20Menu/Hyd.PNG'},
];

function renderAlsoBought(){
  const wrap=document.getElementById('cd-also-items');
  if(!wrap) return;
  const inCart=cart.map(i=>(i.name||i.id||'').toLowerCase());
  const toShow=ALSO_BOUGHT.filter(p=>!inCart.some(n=>n.includes(p.name.slice(0,6).toLowerCase())));
  const parent=wrap.closest('.cd-also-bought');
  if(!toShow.length){if(parent)parent.style.display='none';return;}
  if(parent)parent.style.display='';
  wrap.innerHTML=toShow.slice(0,3).map(p=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px;background:rgba(0,212,255,0.04);border:1px solid rgba(0,212,255,0.1);border-radius:8px;">
      <img src="${p.img}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;" alt="${p.name}" loading="lazy"/>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Inter',sans-serif;font-size:12px;font-weight:600;color:#F0F7FF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
        <div style="font-family:'Inter',sans-serif;font-size:12px;color:#00D4FF;font-weight:700;">${p.display}</div>
      </div>
      <button onclick="addToCartRaw(this.dataset.n,parseFloat(this.dataset.p),this.dataset.i,1);renderCartDrawer();if(typeof updateBadge==='function')updateBadge();" data-n="${p.name.replace(/"/g,'&quot;')}" data-p="${p.price}" data-i="${p.img}" style="background:#00D4FF;border:none;color:#0B1B2B;font-family:'Outfit',sans-serif;font-size:11px;font-weight:800;padding:6px 10px;border-radius:6px;cursor:pointer;flex-shrink:0;transition:background 0.15s;">+ Add</button>
    </div>`).join('');
}

/* ── Cart Logic ────────────────────────────────────────────────── */
function cartTotal(){ return cart.reduce((s,i)=>s+i.price*i.qty,0); }
function cartCount(){ return cart.reduce((s,i)=>s+i.qty,0); }

function addToCartRaw(name, price, img, qty){
  qty = qty||1;
  const id = 'raw_' + name.replace(/[^a-zA-Z0-9]/g,'').slice(0,12).toLowerCase();
  const existing = cart.find(i=>i.id===id);
  if(existing){ existing.qty+=qty; }
  else{ cart.push({ id, name, price:price||0, img:img||'', qty }); }
  saveCart(cart); updateBadge();
}

function cartRemove(id){
  cart = cart.filter(i=>i.id!==id);
  saveCart(cart); updateBadge(); renderCartDrawer();
}

function cartSetQty(id, qty){
  const item = cart.find(i=>i.id===id);
  if(!item) return;
  if(qty<1){ cartRemove(id); return; }
  item.qty=qty; saveCart(cart); updateBadge(); renderCartDrawer();
}

function updateBadge(){
  const count = cartCount();
  $$('.cart-badge, .wb-cart-badge').forEach(b=>{ b.textContent=count; b.style.display=count?'flex':'none'; });
  const nbBadge=document.getElementById('cart-count'); if(nbBadge){nbBadge.textContent=count; nbBadge.style.display=count?'flex':'none';}
  const cdCount = document.getElementById('cd-count');
  if(cdCount) cdCount.textContent = count;
}

/* ── Cart Drawer ───────────────────────────────────────────────── */
function renderCartDrawer(){
  const body = document.getElementById('cd-body');
  if(!body) return;
  renderAlsoBought();
  if(!cart.length){
    body.innerHTML='<p style="color:#8BB8D4;text-align:center;padding:40px 0;">Your cart is empty.</p>';
  } else {
    body.innerHTML=cart.map(item=>`
      <div class="cart-item" data-id="${esc(item.id)}">
        <div class="ci-img"><img src="${esc(item.img)}" alt="" onerror="this.style.display='none'"></div>
        <div class="ci-info">
          <p class="ci-name">${esc(item.name)}</p>
          <p class="ci-price">$${item.price.toFixed(2)} ea</p>
        </div>
        <div class="ci-ctrl">
          <button class="qty-btn ci-minus">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn ci-plus">+</button>
        </div>
        <button class="ci-del">✕</button>
      </div>`).join('');
    $$('.ci-minus',body).forEach(b=>b.addEventListener('click',()=>{
      const id=b.closest('.cart-item').dataset.id, it=cart.find(i=>i.id===id);
      if(it) cartSetQty(id,it.qty-1);
    }));
    $$('.ci-plus',body).forEach(b=>b.addEventListener('click',()=>{
      const id=b.closest('.cart-item').dataset.id, it=cart.find(i=>i.id===id);
      if(it) cartSetQty(id,it.qty+1);
    }));
    $$('.ci-del',body).forEach(b=>b.addEventListener('click',()=>{
      cartRemove(b.closest('.cart-item').dataset.id);
    }));
  }
  const sub=cartTotal();
  const subtotalEl=document.getElementById('cd-subtotal'), grandEl=document.getElementById('cd-grand');
  if(subtotalEl) subtotalEl.textContent='$'+sub.toFixed(2);
  if(grandEl) grandEl.textContent='$'+sub.toFixed(2);
}

function openCartDrawer(){
  renderCartDrawer();
  updateBadge();
  const overlay=document.getElementById('cart-drawer-overlay'), drawer=document.getElementById('cart-drawer');
  if(overlay){ overlay.style.display='block'; overlay.classList.add('open'); }
  if(drawer){ drawer.style.transform=''; setTimeout(()=>drawer.classList.add('open'),10); }
  document.body.style.overflow='hidden';
}
function closeCartDrawer(){
  const overlay=document.getElementById('cart-drawer-overlay'), drawer=document.getElementById('cart-drawer');
  if(drawer) drawer.classList.remove('open');
  setTimeout(()=>{
    if(overlay){ overlay.classList.remove('open'); overlay.style.display='none'; }
    if(drawer) drawer.style.transform='translateX(100%)';
    document.body.style.overflow='';
  },300);
}

/* ── Qty Modal ─────────────────────────────────────────────────── */
let _qmCallback=null;

function openInlineQtyModal(name, price, img, callback){
  _qmCallback=callback;
  const modal=document.getElementById('qty-overlay');
  if(!modal){ if(callback) callback(1); return; }
  const imgEl=modal.querySelector('.qm-img');
  const nameEl=modal.querySelector('.qm-name');
  const priceEl=modal.querySelector('.qm-price');
  const dispEl=modal.querySelector('.qty-disp');
  const card=modal.querySelector('.wb-modal');
  if(imgEl) imgEl.src=img||'';
  if(nameEl) nameEl.textContent=name;
  if(priceEl) priceEl.textContent=price?'$'+price.toFixed(2)+' each':'Contact for pricing';
  if(dispEl) dispEl.textContent='1';
  if(card) card._qty=1;
  openOverlay('qty-overlay');
}

/* ── Product Detail from Card ──────────────────────────────────── */
function openProductDetailFromCard(card){
  const name  = card.dataset.wbName  || '';
  const price = card.dataset.wbPrice ? parseFloat(card.dataset.wbPrice) : null;
  const img   = card.dataset.wbImg   || '';
  const priceText = card.querySelector('.catalog-price')?.textContent.trim() || (price ? '$'+price.toFixed(2) : 'Contact for pricing');

  const modal = document.getElementById('pd-modal');
  if(!modal) return;
  const imgEl   = modal.querySelector('.pd-img');
  const nameEl  = modal.querySelector('.pd-name');
  const priceEl = modal.querySelector('.pd-price');
  const descEl  = modal.querySelector('.pd-desc');
  const specsEl = modal.querySelector('.pd-specs');
  const atcBtn  = modal.querySelector('.pd-atc');
  const dispEl  = modal.querySelector('.pd-qty-disp');

  if(imgEl)   { imgEl.src=img; imgEl.alt=name; }
  if(nameEl)  nameEl.textContent=name;
  if(priceEl) priceEl.textContent=priceText;
  if(descEl)  descEl.textContent=getProductDesc(name);
  if(specsEl) specsEl.innerHTML=getProductSpecs(name);
  if(dispEl)  dispEl.textContent='1';
  modal._qty=1; modal._name=name; modal._price=price; modal._img=img;

  if(atcBtn){
    if(price){
      atcBtn.style.display='flex';
      atcBtn.onclick=()=>{ addToCartRaw(name,price,img,modal._qty); closeOverlay('pd-overlay'); toast(name,'Added '+modal._qty+' to cart',''); };
    } else {
      atcBtn.style.display='none';
    }
  }
  const buyNowBtn=modal.querySelector('.pd-buy-now');
  if(buyNowBtn){
    if(price){
      buyNowBtn.style.display='flex';
      buyNowBtn.onclick=()=>{ addToCartRaw(name,price,img,modal._qty); closeOverlay('pd-overlay'); gotoStep('checkout-overlay',0); openOverlay('checkout-overlay'); };
    } else {
      buyNowBtn.style.display='none';
    }
  }
  openOverlay('pd-overlay');
}

function getProductDesc(name){
  const n=name.toLowerCase();
  if(n.includes('5-gallon')||n.includes('5 gallon')) return '5-gallon BPA-free water bottle compatible with all standard top-load and bottom-load dispensers. Purified or alkaline available on every delivery.';
  if(n.includes('3-gallon')||n.includes('3 gallon')) return '3-Gallon bottle, ideal for smaller households or countertop dispensers. Lightweight and easy to handle.';
  if(n.includes('half-gallon')||n.includes('half gallon')) return 'Sleek 64oz glass bottle for daily hydration. Pure taste with zero plastic leach. Dishwasher safe, airtight lid. Great for home or office.';
  if(n.includes('32oz glass')) return 'Compact 32oz glass water bottle — perfect for on-the-go. Crystal clear, BPA-free, easy to clean, fits standard cup holders.';
  if(n.includes('3-gallon glass')||n.includes('3 gallon glass')) return 'Premium 3-gallon borosilicate glass bottle. Pure taste with zero plastic contact — ideal for countertop dispensers. Reusable and eco-friendly.';
  if(n.includes('glass bottle')||n.includes('glass bottle')) return 'Premium glass bottle — pure taste with zero plastic contact. Reusable and eco-friendly.';
  if(n.includes('36oz aluminum')) return 'Wide-mouth 36oz aluminum bottle for active use. Double-wall insulated keeps water cold for hours. Leak-proof, lightweight, built to last.';
  if(n.includes('12oz')||n.includes('skinny')) return 'Slim 12oz aluminum bottle — perfect for the gym, commute, or kids. Leak-proof lid, lightweight design, fits any bag.';
  if(n.includes('coffee mug')) return 'Double-wall 30oz aluminum mug — keeps drinks cold or hot for hours. Fits standard cup holders, spill-resistant sliding lid.';
  if(n.includes('aluminum')) return 'Lightweight aluminum bottle — durable, eco-friendly, perfect for on-the-go hydration.';
  if(n.includes('dispenser')) return 'Premium water dispenser compatible with our 3 and 5-Gallon bottles. Hot and cold taps. Contact us for current pricing and availability.';
  if(n.includes('crock')) return 'Classic ceramic water crock for elegant home water serving. Gravity-fed, holds a standard 5-Gallon bottle, no electricity required. Timeless design for any kitchen.';
  if(n.includes('prebiotic')||n.includes('hydrogen')) return 'Molecular hydrogen + prebiotic fiber. Crisp Apple. Supports gut health, energy & mental clarity. Sugar-free. Mix with 12–16 oz water.';
  if(n.includes('stick')||n.includes('electrolyte')) return 'Single-serve electrolyte stick. Drop into your water for natural hydration support with essential minerals and electrolytes.';
  if(n.includes('zipfizz')) return 'Zero sugar. 100mg natural caffeine. B12, electrolytes & vitamins in every tube. Grape, Fruit Punch & Peach Mango.';
  if(n.includes('can')||n.includes('cherry')||n.includes('grapefruit')||n.includes('watermelon salt')) return 'Ready-to-drink electrolyte beverage in a convenient can. Crisp taste, hydrating minerals, no artificial colors.';
  return 'Premium hydration product from Waterboy Delivery. Contact us for details.';
}

function getProductSpecs(name){
  const n=name.toLowerCase();
  if(n.includes('5 gallon glass')||n.includes('5-gallon glass')) return '<div class="pd-spec"><span>Size</span><span>5 Gallons</span></div><div class="pd-spec"><span>Material</span><span>Borosilicate Glass</span></div>';
  if(n.includes('5-gallon')||n.includes('5 gallon')) return '<div class="pd-spec"><span>Size</span><span>5 Gallons</span></div><div class="pd-spec"><span>Material</span><span>BPA-Free Polycarbonate</span></div><div class="pd-spec"><span>Compatible</span><span>Standard dispensers</span></div>';
  if(n.includes('3 gallon glass')||n.includes('3-gallon glass')) return '<div class="pd-spec"><span>Size</span><span>3 Gallons</span></div><div class="pd-spec"><span>Material</span><span>Borosilicate Glass</span></div>';
  if(n.includes('3-gallon')||n.includes('3 gallon')) return '<div class="pd-spec"><span>Size</span><span>3 Gallons</span></div><div class="pd-spec"><span>Material</span><span>BPA-Free Polycarbonate</span></div>';
  if(n.includes('half-gallon')||n.includes('half gallon')) return '<div class="pd-spec"><span>Size</span><span>½ Gallon</span></div><div class="pd-spec"><span>Material</span><span>Borosilicate Glass</span></div>';
  if(n.includes('32oz glass')) return '<div class="pd-spec"><span>Size</span><span>32 oz</span></div><div class="pd-spec"><span>Material</span><span>Borosilicate Glass</span></div>';
  if(n.includes('aluminum')||n.includes('coffee mug')) return '<div class="pd-spec"><span>Material</span><span>Aluminum</span></div><div class="pd-spec"><span>Finish</span><span>Matte</span></div>';
  if(n.includes('dispenser')) return '<div class="pd-spec"><span>Voltage</span><span>110V</span></div><div class="pd-spec"><span>Taps</span><span>Hot &amp; Cold</span></div>';
  if(n.includes('stick')||n.includes('electrolyte')) return '<div class="pd-spec"><span>Serve Size</span><span>Single Serve</span></div><div class="pd-spec"><span>Type</span><span>Electrolyte</span></div>';
  return '';
}

/* ── Auth ──────────────────────────────────────────────────────── */
function updateNavUser(){
  $$('.nav-user-name').forEach(el=>{
    el.textContent = user ? user.name.split(' ')[0] : 'Sign In';
  });
  $$('.nav-user-drop').forEach(drop=>{
    drop.innerHTML = user
      ? `<button class="nud-item" id="nud-account">My Account</button><button class="nud-item" id="nud-orders">My Orders</button><button class="nud-item nud-out" id="nud-signout">Sign Out</button>`
      : `<button class="nud-item" id="nud-signin">Sign In</button><button class="nud-item" id="nud-signup">Create Account</button>`;
    drop.querySelector('#nud-signout')?.addEventListener('click',()=>{ user=null; saveUser(null); updateNavUser(); toast('Signed out','See you next time!',''); });
    drop.querySelector('#nud-signin')?.addEventListener('click',()=>openAuthModal('signin'));
    drop.querySelector('#nud-signup')?.addEventListener('click',()=>openAuthModal('signup'));
  });
}

function openAuthModal(tab){
  $$('.auth-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  $$('.auth-panel').forEach(p=>p.classList.toggle('active', p.id==='auth-panel-'+tab));
  $$('.auth-error').forEach(e=>{ e.textContent=''; e.style.display='none'; });
  openOverlay('auth-overlay');
}

/* ── Checkout & Subscription State ────────────────────────────── */
let coState  = { date:null, time:null, orderType:'one-time', freq:'bi-weekly' };
let subState = { plan:'Family', waterType:'purified', date:null, time:null };
let dvState  = { plan:null, date:null, time:null, freq:'bi-weekly', day:'Monday', window:'Morning' };

function buildOrderSummary(containerId){
  const c=document.getElementById(containerId); if(!c) return;
  const sub=cartTotal();
  const zd=zoneFeeDisplay(currentZone);
  const total=sub+zd.fee;
  const zoneTag=zd.tag?` <span style="font-size:10px;color:#8BB8D4">(${zd.tag})</span>`:'';
  c.innerHTML=cart.map(i=>`<div class="ob-row"><span>${esc(i.name)} ×${i.qty}</span><span>$${(i.price*i.qty).toFixed(2)}</span></div>`).join('')
    +`<div class="ob-row"><span>Delivery${zoneTag}</span><span style="color:${zd.color}">${zd.text}</span></div>`
    +`<div class="ob-row grand"><span>Total</span><span>$${total.toFixed(2)}</span></div>`;
}

/* ── Pay Simulation ────────────────────────────────────────────── */
function showPaySim(type, onSuccess){
  const sim=document.getElementById('pay-sim'); if(!sim){ onSuccess&&onSuccess(); return; }
  const sheet=sim.querySelector('.pay-sheet');
  const logoEl=sim.querySelector('.pay-sheet-logo'), amtEl=sim.querySelector('.pay-sheet-amt'), faceEl=sim.querySelector('.face-id');
  if(logoEl) logoEl.textContent=type==='apple'?'🍎 Pay':'G Pay';
  if(amtEl)  amtEl.textContent='$'+cartTotal().toFixed(2);
  if(faceEl) faceEl.className='face-id';
  sim.style.display='flex';
  requestAnimationFrame(()=>{ sim.classList.add('open'); if(sheet) sheet.classList.add('open'); });
  setTimeout(()=>{ if(faceEl) faceEl.classList.add('auth'); },600);
  setTimeout(()=>{ sim.classList.remove('open'); if(sheet) sheet.classList.remove('open'); setTimeout(()=>{ sim.style.display='none'; onSuccess&&onSuccess(); },350); },2800);
}

/* ── HTML Injection ────────────────────────────────────────────── */
function inject(){
  const div=document.createElement('div'); div.id='wb-modals';
  div.innerHTML=`
<!-- Toast -->
<div id="wb-toast"><span class="wb-toast-icon">✓</span><div><div class="wb-toast-title"></div><div class="wb-toast-msg"></div></div></div>

<!-- Contact Overlay -->
<div class="wb-overlay" id="contact-overlay" style="display:none">
 <div class="wb-modal">
  <div class="wb-mhead"><h2>Get in Touch</h2><button class="wb-mclose">✕</button></div>
  <div class="wb-mbody">
   <div id="modal-contact-success" class="wb-success" style="display:none">
    <div class="wb-check-circle">✓</div>
    <h3 style="color:#fff;margin:12px 0 6px">Message Sent!</h3>
    <p style="color:#8BB8D4;font-size:14px">We'll get back to you within 24 hours.</p>
   </div>
   <form id="modal-contact-form" data-netlify="true" name="quick-contact" netlify-honeypot="bot-field">
    <input type="hidden" name="form-name" value="quick-contact">
    <input name="bot-field" style="display:none">
    <div class="wb-field"><label>Your Name</label><input name="name" placeholder="Jane Smith" required></div>
    <div class="wb-row">
     <div class="wb-field"><label>Phone</label><input name="phone" type="tel" placeholder="(916) 555-0000"></div>
     <div class="wb-field"><label>Email</label><input name="email" type="email" placeholder="you@email.com" required></div>
    </div>
    <div class="wb-field"><label>Message</label><textarea name="message" placeholder="How can we help?"></textarea></div>
    <button type="submit" class="wb-btn">Send Message</button>
   </form>
   <div class="wb-callbar">
    <p>Prefer to call? Mon–Sat, 8 AM – 6 PM</p>
    <a href="${PHONE_HREF}" class="wb-callbtn">📞 ${PHONE}</a>
   </div>
  </div>
 </div>
</div>

<!-- Auth Overlay -->
<div class="wb-overlay" id="auth-overlay" style="display:none">
 <div class="wb-modal">
  <div class="wb-mhead"><h2>My Account</h2><button class="wb-mclose">✕</button></div>
  <div class="wb-mbody">
   <div class="auth-tabs">
    <button class="auth-tab active" data-tab="signin">Sign In</button>
    <button class="auth-tab" data-tab="signup">Create Account</button>
   </div>
   <div class="auth-panel active" id="auth-panel-signin">
    <div class="demo-hint">Demo: ${DEMO_EMAIL} / ${DEMO_PASS}</div>
    <div class="wb-field"><label>Email</label><input id="si-email" type="email" placeholder="you@email.com"></div>
    <div class="wb-field"><label>Password</label><div class="pw-wrap"><input id="si-pass" type="password" placeholder="Password"><button type="button" class="pw-eye">👁</button></div></div>
    <div class="auth-error" id="si-error" style="display:none;color:#ff6b6b;font-size:13px;margin-bottom:10px"></div>
    <button class="wb-btn" id="si-submit">Sign In</button>
    <p style="text-align:center;margin-top:14px;font-size:13px;color:#8BB8D4">No account? <button class="wb-link" id="si-to-signup">Create one free</button></p>
    <p style="text-align:center;margin-top:8px;font-size:13px;color:#8BB8D4"><button class="wb-link" id="si-guest" style="color:#00D4FF">Continue as Guest →</button></p>
   </div>
   <div class="auth-panel" id="auth-panel-signup">
    <div class="wb-row">
     <div class="wb-field"><label>First Name</label><input id="su-fname" placeholder="Jane"></div>
     <div class="wb-field"><label>Last Name</label><input id="su-lname" placeholder="Smith"></div>
    </div>
    <div class="wb-field"><label>Email</label><input id="su-email" type="email" placeholder="you@email.com"></div>
    <div class="wb-field"><label>Phone</label><input id="su-phone" type="tel" placeholder="(916) 555-0000"></div>
    <div class="wb-field"><label>Street Address</label><input id="su-addr" placeholder="123 Main St"></div>
    <div class="wb-row">
     <div class="wb-field"><label>City</label><input id="su-city" placeholder="Sacramento"></div>
     <div class="wb-field"><label>ZIP</label><input id="su-zip" placeholder="95814"></div>
    </div>
    <div class="wb-field"><label>Password</label><div class="pw-wrap"><input id="su-pass" type="password" placeholder="Min 8 characters"><button type="button" class="pw-eye">👁</button></div></div>
    <div class="auth-error" id="su-error" style="display:none;color:#ff6b6b;font-size:13px;margin-bottom:10px"></div>
    <button class="wb-btn" id="su-submit">Create Account</button>
    <p style="text-align:center;margin-top:14px;font-size:13px;color:#8BB8D4">Already have an account? <button class="wb-link" id="su-to-signin">Sign In</button></p>
   </div>
  </div>
 </div>
</div>

<!-- Cart Drawer -->
<div id="cart-drawer-overlay" style="display:none">
 <div id="cart-drawer" style="transform:translateX(100%)">
  <div class="cd-head"><span>My Cart (<span id="cd-count">0</span>)</span><button class="wb-mclose" id="cd-close">✕</button></div>
  <div class="cd-body" id="cd-body"></div>
  <div class="cd-foot">
   <div class="promo-row"><input id="promo-input" placeholder="Promo code"><button class="promo-apply" id="promo-apply">Apply</button></div>
   <div class="totals-row"><span>Subtotal</span><span id="cd-subtotal">$0.00</span></div>
   <div class="totals-row"><span>Delivery</span><span>Calculated at checkout</span></div>
   <div class="totals-row grand"><span>Total</span><span id="cd-grand">$0.00</span></div>
   <button class="wb-btn" id="cd-checkout-btn" style="margin-top:14px">Proceed to Checkout</button>
   <button class="wb-btn-ghost" id="cd-continue-btn">Continue Shopping</button>
   <div class="cd-also-bought" style="margin-top:16px;border-top:1px solid rgba(0,212,255,0.12);padding-top:14px;">
    <div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:700;color:rgba(184,230,255,0.55);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Customers Also Bought</div>
    <div id="cd-also-items" style="display:flex;flex-direction:column;gap:8px;"></div>
   </div>
  </div>
 </div>
</div>

<!-- Qty Modal -->
<div class="wb-overlay" id="qty-overlay" style="display:none">
 <div class="wb-modal">
  <div class="wb-mhead"><h2>How Many?</h2><button class="wb-mclose">✕</button></div>
  <div class="wb-mbody">
   <div class="qm-product"><img class="qm-img" src="" alt=""><div><p class="qm-name"></p><p class="qm-price"></p></div></div>
   <div class="qty-sel">
    <button class="qty-btn qty-lg" id="qm-minus">−</button>
    <span class="qty-disp">1</span>
    <button class="qty-btn qty-lg" id="qm-plus">+</button>
   </div>
   <button class="wb-btn" id="qm-confirm">Add to Cart</button>
  </div>
 </div>
</div>

<!-- Product Detail Overlay -->
<div class="wb-overlay" id="pd-overlay" style="display:none">
 <div class="wb-modal wide" id="pd-modal">
  <div class="wb-mhead"><h2>Product Details</h2><button class="wb-mclose">✕</button></div>
  <div class="wb-mbody">
   <div class="pd-wrap">
    <img class="pd-img" src="" alt="">
    <div class="pd-info">
     <p class="pd-name"></p>
     <p class="pd-price"></p>
     <p class="pd-desc"></p>
     <div class="pd-specs"></div>
     <div class="pd-qty">
      <button class="qty-btn" id="pd-minus">−</button>
      <span class="pd-qty-disp qty-disp">1</span>
      <button class="qty-btn" id="pd-plus">+</button>
     </div>
     <button class="wb-btn pd-atc" style="margin-top:14px">Add to Cart</button>
     <button class="wb-btn pd-buy-now" style="margin-top:8px;background:transparent;border:1.5px solid #00D4FF;color:#00D4FF;">Buy Now — Checkout Instantly</button>
    </div>
   </div>
  </div>
 </div>
</div>

<!-- Checkout Overlay (5 steps) -->
<div class="wb-overlay" id="checkout-overlay" style="display:none">
 <div class="wb-modal wide" id="checkout-modal">
  <div class="wb-mhead"><h2>Checkout</h2><button class="wb-mclose">✕</button></div>
  <div class="wb-mbody">
   <div class="step-bar">
    <div class="step-dot active"></div><div class="step-line"></div>
    <div class="step-dot"></div><div class="step-line"></div>
    <div class="step-dot"></div><div class="step-line"></div>
    <div class="step-dot"></div><div class="step-line"></div>
    <div class="step-dot"></div>
   </div>
   <!-- Step 0: Info -->
   <div class="step-panel active" id="co-step-0">
    <p class="step-title">Delivery Information</p>
    <div class="wb-row"><div class="wb-field"><label>First Name</label><input id="co-fname" placeholder="Jane"></div><div class="wb-field"><label>Last Name</label><input id="co-lname" placeholder="Smith"></div></div>
    <div class="wb-field"><label>Phone</label><input id="co-phone" type="tel" placeholder="(916) 555-0000"></div>
    <div class="wb-field"><label>Email</label><input id="co-email" type="email" placeholder="you@email.com"></div>
    <div class="wb-field"><label>Street Address</label><input id="co-addr" placeholder="123 Main St, Sacramento CA"></div>
    <div class="wb-row"><div class="wb-field"><label>City</label><input id="co-city" placeholder="Sacramento" value="Sacramento"></div><div class="wb-field"><label>ZIP</label><input id="co-zip" placeholder="95814"></div></div>
    <div class="wb-field"><label>Notes (optional)</label><textarea id="co-notes" style="min-height:56px" placeholder="Gate code, drop-off location…"></textarea></div>
    <div class="step-nav"><button class="wb-btn" id="co-next-0">Next: Schedule →</button></div>
   </div>
   <!-- Step 1: Schedule -->
   <div class="step-panel" id="co-step-1">
    <p class="step-title">Choose Delivery Date &amp; Time</p>
    <div class="order-type-wrap">
     <button class="ot-btn sel" data-ot="one-time">One-Time</button>
     <button class="ot-btn" data-ot="recurring">Recurring</button>
    </div>
    <!-- Bottle return for one-time orders -->
    <div id="co-bottle-return-section" class="bottle-return-step" style="display:none">
     <p class="step-title" style="font-size:13px;margin-bottom:8px">How will you return empty bottles?</p>
     <div class="br-radio-group">
      <label class="br-radio"><input type="radio" name="br-return" value="dropoff"><div><div class="br-radio-label">Drop off at facility (Free)</div><div class="br-radio-sub">7119 Elk Grove Blvd during business hours</div></div></label>
      <label class="br-radio"><input type="radio" name="br-return" value="pickup"><div><div class="br-radio-label">Schedule pickup (+$4.99)</div><div class="br-radio-sub">We come to you — Mon–Sat</div></div></label>
      <label class="br-radio"><input type="radio" name="br-return" value="keep"><div><div class="br-radio-label">I'll keep the bottles and accept the $8/bottle fee if not returned in 30 days</div></div></label>
     </div>
    </div>
    <!-- Recurring reminder -->
    <div id="co-recurring-note" class="br-recurring-note" style="display:none">
     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
     <p>Empty bottles swapped on every delivery — nothing for you to do.</p>
    </div>
    <div id="co-freq-wrap" style="display:none;margin-bottom:14px">
     <label style="font-size:11px;color:#8BB8D4;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;display:block">Frequency</label>
     <div class="freq-btns">
      <button class="freq-btn sel" data-f="bi-weekly">Bi-Weekly</button>
      <button class="freq-btn" data-f="weekly">Weekly</button>
      <button class="freq-btn" data-f="monthly">Monthly</button>
     </div>
    </div>
    <div id="co-calendar"></div>
    <p style="font-size:12px;color:#8BB8D4;margin:10px 0 6px">Select a time window:</p>
    <div class="time-wins" id="co-time-wins"></div>
    <div class="step-nav"><button class="wb-btn-ghost step-back" id="co-back-1">← Back</button><button class="wb-btn" id="co-next-1">Next: Payment →</button></div>
   </div>
   <!-- Step 1b: Add-Ons -->
   <div class="step-panel" id="co-step-addons">
    <p class="step-title">Add to Your Order</p>
    <div class="co-addons-section">
     <div class="co-addons-scroll" id="co-addon-row">
      ${CHECKOUT_ADDONS.map(a=>`
      <div class="co-addon-card" data-addon-id="${a.id}">
       <div class="co-addon-img"></div>
       <div class="co-addon-name">${esc(a.name)}</div>
       <div class="co-addon-desc">${esc(a.desc)}</div>
       <div class="co-addon-price">$${a.price.toFixed(2)}</div>
       <div class="co-addon-ctrl"><button class="co-addon-add" data-addon="${a.id}">Add</button></div>
      </div>`).join('')}
     </div>
    </div>
    <div class="step-nav"><button class="wb-btn-ghost step-back" id="co-back-addons">← Back</button><button class="wb-btn" id="co-next-addons">Next: Payment →</button></div>
   </div>

   <!-- Step 2: Payment -->
   <div class="step-panel" id="co-step-2">
    <p class="step-title">Payment</p>
    <div class="pay-opts">
     <button class="pay-apple" id="co-apple-pay">🍎 Apple Pay</button>
     <button class="pay-google" id="co-google-pay"><span style="font-weight:700;color:#4285F4">G</span><span style="font-weight:700;color:#EA4335">o</span><span style="font-weight:700;color:#FBBC05">o</span><span style="font-weight:700;color:#34A853">g</span><span style="font-weight:700;color:#4285F4">l</span><span style="font-weight:700;color:#EA4335">e</span> Pay</button>
    </div>
    <div class="pay-or"><span>or pay with card</span></div>
    <div class="wb-field"><label>Card Number</label><input id="co-card" placeholder="4242 4242 4242 4242" maxlength="19"></div>
    <div class="wb-row"><div class="wb-field"><label>Expiry</label><input id="co-exp" placeholder="MM/YY" maxlength="5"></div><div class="wb-field"><label>CVV</label><input id="co-cvv" placeholder="123" maxlength="4"></div></div>
    <div class="wb-field"><label>Name on Card</label><input id="co-cname" placeholder="Jane Smith"></div>
    <div id="co-order-summary" style="margin:14px 0"></div>
    <div class="terms-row">By placing your order you agree to our <a href="#" style="color:#00D4FF">Terms of Service</a>.</div>
    <div class="stripe-badge">🔒 Secured by Stripe</div>
    <div class="step-nav"><button class="wb-btn-ghost step-back" id="co-back-2">← Back</button><button class="wb-btn" id="co-place-order">Place Order →</button></div>
   </div>
   <!-- Step 3 (payment) steps renumbered, Step 4: Confirm -->
   <div class="step-panel" id="co-step-4">
    <div class="confirm-wrap">
     <div class="confirm-check">✓</div>
     <h3 style="color:#fff;margin:16px 0 8px">Order Confirmed!</h3>
     <p style="color:#8BB8D4;font-size:14px;margin-bottom:4px">Order number:</p>
     <div class="confirm-num" id="co-order-num">WB-XXXXXX</div>
     <p style="color:#8BB8D4;font-size:13px;margin-top:16px">Check your email for confirmation.<br>Your driver will contact you 30 min before arrival.</p>
     <button class="wb-btn" id="co-done-btn" style="margin-top:24px">Done</button>
    </div>
   </div>
  </div>
 </div>
</div>

<!-- Subscription Overlay (5 steps) -->
<div class="wb-overlay" id="sub-overlay" style="display:none">
 <div class="wb-modal wide" id="sub-modal">
  <div class="wb-mhead"><h2>Start Your Plan</h2><button class="wb-mclose">✕</button></div>
  <div class="wb-mbody">
   <div class="step-bar">
    <div class="step-dot active"></div><div class="step-line"></div>
    <div class="step-dot"></div><div class="step-line"></div>
    <div class="step-dot"></div><div class="step-line"></div>
    <div class="step-dot"></div><div class="step-line"></div>
    <div class="step-dot"></div>
   </div>
   <!-- Step 0: Plan -->
   <div class="step-panel active" id="sub-step-0">
    <p class="step-title">Your Plan</p>
    <div class="sub-plan-card" id="sub-plan-display"></div>
    <p style="margin:14px 0 8px;font-size:12px;font-weight:600;color:#8BB8D4;text-transform:uppercase;letter-spacing:.5px">Water Type</p>
    <div class="wtype-sel">
     <button class="wtype-btn sel" data-wt="purified">Purified</button>
     <button class="wtype-btn" data-wt="alkaline">Alkaline (+$4/bottle)</button>
     <button class="wtype-btn" data-wt="distilled">Distilled</button>
    </div>
    <p class="wtype-ph" style="font-family:'Space Grotesk',sans-serif;font-size:11px;color:#8BB8D4;margin-top:4px"></p>
    <div class="step-nav"><button class="wb-btn" id="sub-next-0">Next: Your Info →</button></div>
   </div>
   <!-- Step 1: Info -->
   <div class="step-panel" id="sub-step-1">
    <p class="step-title">Contact &amp; Delivery Info</p>
    <div class="wb-row"><div class="wb-field"><label>First Name</label><input id="sub-fname" placeholder="Jane"></div><div class="wb-field"><label>Last Name</label><input id="sub-lname" placeholder="Smith"></div></div>
    <div class="wb-field"><label>Phone</label><input id="sub-phone" type="tel" placeholder="(916) 555-0000"></div>
    <div class="wb-field"><label>Email</label><input id="sub-email" type="email" placeholder="you@email.com"></div>
    <div class="wb-field"><label>Street Address</label><input id="sub-addr" placeholder="123 Main St"></div>
    <div class="wb-row"><div class="wb-field"><label>City</label><input id="sub-city" placeholder="Sacramento" value="Sacramento"></div><div class="wb-field"><label>ZIP</label><input id="sub-zip" placeholder="95814"></div></div>
    <div class="step-nav"><button class="wb-btn-ghost step-back" id="sub-back-1">← Back</button><button class="wb-btn" id="sub-next-1">Next: Schedule →</button></div>
   </div>
   <!-- Step 2: Schedule -->
   <div class="step-panel" id="sub-step-2">
    <p class="step-title">First Delivery Date</p>
    <div id="sub-calendar"></div>
    <p style="font-size:12px;color:#8BB8D4;margin:10px 0 6px">Select a time window:</p>
    <div class="time-wins" id="sub-time-wins"></div>
    <div class="step-nav"><button class="wb-btn-ghost step-back" id="sub-back-2">← Back</button><button class="wb-btn" id="sub-next-2">Next: Payment →</button></div>
   </div>
   <!-- Step 3: Payment -->
   <div class="step-panel" id="sub-step-3">
    <p class="step-title">Payment</p>
    <div class="pay-opts">
     <button class="pay-apple" id="sub-apple-pay">🍎 Apple Pay</button>
     <button class="pay-google" id="sub-google-pay"><span style="font-weight:700;color:#4285F4">G</span><span style="font-weight:700;color:#EA4335">o</span><span style="font-weight:700;color:#FBBC05">o</span><span style="font-weight:700;color:#34A853">g</span><span style="font-weight:700;color:#4285F4">l</span><span style="font-weight:700;color:#EA4335">e</span> Pay</button>
    </div>
    <div class="pay-or"><span>or pay with card</span></div>
    <div class="wb-field"><label>Card Number</label><input id="sub-card" placeholder="4242 4242 4242 4242" maxlength="19"></div>
    <div class="wb-row"><div class="wb-field"><label>Expiry</label><input id="sub-exp" placeholder="MM/YY" maxlength="5"></div><div class="wb-field"><label>CVV</label><input id="sub-cvv" placeholder="123" maxlength="4"></div></div>
    <div class="wb-field"><label>Name on Card</label><input id="sub-cname" placeholder="Jane Smith"></div>
    <div id="sub-order-summary" style="margin:14px 0"></div>
    <div class="terms-row">By subscribing you agree to our <a href="#" style="color:#00D4FF">Terms of Service</a>. Cancel anytime.</div>
    <div class="stripe-badge">🔒 Secured by Stripe</div>
    <div class="step-nav"><button class="wb-btn-ghost step-back" id="sub-back-3">← Back</button><button class="wb-btn" id="sub-subscribe-btn">Subscribe →</button></div>
   </div>
   <!-- Step 4: Confirm -->
   <div class="step-panel" id="sub-step-4">
    <div class="confirm-wrap">
     <div class="confirm-check">✓</div>
     <h3 style="color:#fff;margin:16px 0 8px">You're Subscribed!</h3>
     <p style="color:#8BB8D4;font-size:14px;margin-bottom:4px">Subscription number:</p>
     <div class="confirm-num" id="sub-order-num">WB-XXXXXX</div>
     <p style="color:#8BB8D4;font-size:13px;margin-top:16px">Your first delivery is scheduled.<br>We'll send a reminder 24 hrs before each delivery.</p>
     <button class="wb-btn" id="sub-done-btn" style="margin-top:24px">Done</button>
    </div>
   </div>
  </div>
 </div>
</div>

<!-- Delivery Setup Overlay (5 steps) -->
<div class="wb-overlay" id="delivery-overlay" style="display:none">
 <div class="wb-modal wide" id="delivery-modal">
  <div class="wb-mhead"><h2>Set Up Delivery</h2><button class="wb-mclose">✕</button></div>
  <div class="wb-mbody">
   <div class="step-bar">
    <div class="step-dot active"></div><div class="step-line"></div>
    <div class="step-dot"></div><div class="step-line"></div>
    <div class="step-dot"></div><div class="step-line"></div>
    <div class="step-dot"></div><div class="step-line"></div>
    <div class="step-dot"></div>
   </div>
   <!-- Step 0: Info -->
   <div class="step-panel active" id="dv-step-0">
    <p class="step-title">Your Information</p>
    <div class="wb-row"><div class="wb-field"><label>First Name</label><input id="dv-fname" placeholder="Jane"></div><div class="wb-field"><label>Last Name</label><input id="dv-lname" placeholder="Smith"></div></div>
    <div class="wb-field"><label>Email</label><input id="dv-email" type="email" placeholder="you@email.com"></div>
    <div class="wb-field"><label>Phone</label><input id="dv-phone" type="tel" placeholder="(916) 555-0000"></div>
    <div class="wb-field"><label>Street Address</label><input id="dv-addr" placeholder="123 Main St"></div>
    <div class="wb-row"><div class="wb-field"><label>City</label><input id="dv-city" placeholder="Sacramento" value="Sacramento"></div><div class="wb-field"><label>State / ZIP</label><input id="dv-zip" placeholder="CA 95814"></div></div>
    <div class="wb-row"><div class="wb-field"><label>Gate Code (optional)</label><input id="dv-gate" placeholder="#1234"></div><div class="wb-field"><label>Drop-off Preference</label><select id="dv-location"><option>Front Door</option><option>Side Gate</option><option>Garage</option><option>Back Door</option><option>Other</option></select></div></div>
    <div class="wb-field"><label>Delivery Notes (optional)</label><textarea id="dv-notes" style="min-height:56px" placeholder="Any instructions for your driver…"></textarea></div>
    <div class="step-nav"><button class="wb-btn" id="dv-next-0">Next: Choose Plan →</button></div>
   </div>
   <!-- Step 1: Choose Plan -->
   <div class="step-panel" id="dv-step-1">
    <p class="step-title">Choose Your Plan</p>
    <div id="dv-plan-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
     ${Object.entries(PLANS).filter(([k])=>!k.startsWith('Alkaline')).map(([name,p])=>`
      <div class="dv-plan-card" data-plan="${name}" style="border:1px solid rgba(0,212,255,.15);border-radius:12px;padding:14px;cursor:pointer;transition:all .2s;background:rgba(0,212,255,.04)">
       <div style="font-weight:800;font-size:15px;color:#fff;font-family:'Outfit',sans-serif">${name}</div>
       <div style="font-family:'Space Grotesk',sans-serif;color:#00D4FF;font-size:18px;margin:4px 0">$${p.price}<span style="font-size:11px;color:#8BB8D4">/mo</span></div>
       <div style="font-size:12px;color:#8BB8D4">${p.Bottles} bottles/delivery</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:#8BB8D4;margin-bottom:8px;font-weight:600">Alkaline Upgrades (pH 8.5+)</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px">
     ${Object.entries(PLANS).filter(([k])=>k.startsWith('Alkaline')).map(([name,p])=>`
      <div class="dv-plan-card" data-plan="${name}" style="border:1px solid rgba(0,212,255,.1);border-radius:10px;padding:12px;cursor:pointer;transition:all .2s;background:rgba(0,212,255,.02);text-align:center">
       <div style="font-size:12px;font-weight:700;color:#8BB8D4">${name}</div>
       <div style="font-family:'Space Grotesk',sans-serif;color:#00D4FF;font-size:16px">$${p.price}/mo</div>
      </div>`).join('')}
    </div>
    <div class="step-nav"><button class="wb-btn-ghost step-back" id="dv-back-1">← Back</button><button class="wb-btn" id="dv-next-1">Next: Schedule →</button></div>
   </div>
   <!-- Step 2: Schedule -->
   <div class="step-panel" id="dv-step-2">
    <p class="step-title">Delivery Schedule</p>
    <p style="font-size:12px;color:#8BB8D4;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Frequency</p>
    <div class="freq-btns" style="margin-bottom:18px">
     <button class="freq-btn sel" data-f="bi-weekly">Bi-Weekly</button>
     <button class="freq-btn" data-f="weekly">Weekly</button>
     <button class="freq-btn" data-f="monthly">Monthly</button>
    </div>
    <p style="font-size:12px;color:#8BB8D4;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Preferred Day</p>
    <div class="freq-btns" style="margin-bottom:18px">
     ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>`<button class="freq-btn${d==='Monday'?' sel':''}" data-day="${d}">${d.slice(0,3)}</button>`).join('')}
    </div>
    <p style="font-size:12px;color:#8BB8D4;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Time Window</p>
    <div class="freq-btns" style="margin-bottom:18px">
     <button class="freq-btn sel" data-win="Morning">Morning (8–12)</button>
     <button class="freq-btn" data-win="Afternoon">Afternoon (12–4)</button>
     <button class="freq-btn" data-win="Evening">Evening (4–6)</button>
    </div>
    <p style="font-size:12px;color:#8BB8D4;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">First Delivery Date</p>
    <div id="dv-calendar"></div>
    <div class="step-nav"><button class="wb-btn-ghost step-back" id="dv-back-2">← Back</button><button class="wb-btn" id="dv-next-2">Next: Payment →</button></div>
   </div>
   <!-- Step 3: Payment -->
   <div class="step-panel" id="dv-step-3">
    <p class="step-title">Payment</p>
    <div id="dv-plan-summary" style="background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.18);border-radius:12px;padding:14px;margin-bottom:18px"></div>
    <div class="pay-opts">
     <button class="pay-apple" id="dv-apple-pay">🍎 Apple Pay</button>
     <button class="pay-google" id="dv-google-pay"><span style="font-weight:700;color:#4285F4">G</span><span style="font-weight:700;color:#EA4335">o</span><span style="font-weight:700;color:#FBBC05">o</span><span style="font-weight:700;color:#34A853">g</span><span style="font-weight:700;color:#4285F4">l</span><span style="font-weight:700;color:#EA4335">e</span> Pay</button>
    </div>
    <div class="pay-or"><span>or pay with card</span></div>
    <div class="wb-field"><label>Card Number</label><input id="dv-card" placeholder="4242 4242 4242 4242" maxlength="19"></div>
    <div class="wb-row"><div class="wb-field"><label>Expiry</label><input id="dv-exp" placeholder="MM/YY" maxlength="5"></div><div class="wb-field"><label>CVV</label><input id="dv-cvv" placeholder="123" maxlength="4"></div></div>
    <div class="wb-field"><label>Name on Card</label><input id="dv-cname" placeholder="Jane Smith"></div>
    <div class="wb-field"><label>Promo Code (optional)</label><input id="dv-promo" placeholder="WATERBOY10"></div>
    <div class="terms-row"><input type="checkbox" id="dv-terms"><label for="dv-terms">I agree to the <a href="#" style="color:#00D4FF">Terms of Service</a>. Cancel anytime.</label></div>
    <div class="stripe-badge">🔒 Secured by Stripe</div>
    <div class="step-nav"><button class="wb-btn-ghost step-back" id="dv-back-3">← Back</button><button class="wb-btn" id="dv-subscribe-btn">Subscribe — $<span id="dv-price-btn">--</span>/month</button></div>
   </div>
   <!-- Step 4: Confirmation -->
   <div class="step-panel" id="dv-step-4">
    <div class="confirm-wrap">
     <div class="confirm-check">✓</div>
     <h3 style="color:#fff;margin:16px 0 8px">You're All Set!</h3>
     <div id="dv-confirm-summary" style="background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.15);border-radius:12px;padding:16px;margin:16px 0;text-align:left;font-size:13px;color:#C8E8F8;line-height:1.9"></div>
     <p style="color:#8BB8D4;font-size:13px">Your driver will confirm your schedule via text message.</p>
     <button class="wb-btn" id="dv-done-btn" style="margin-top:24px">Back to Website</button>
    </div>
   </div>
  </div>
 </div>
</div>

<!-- Pay Sim Sheet -->
<div id="pay-sim" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;align-items:flex-end;justify-content:center">
 <div class="pay-sheet">
  <div class="pay-sheet-logo"></div>
  <p style="color:#8BB8D4;font-size:13px;margin:4px 0 2px">Waterboy Delivery</p>
  <div class="pay-sheet-amt"></div>
  <div class="face-id"></div>
  <p style="color:#8BB8D4;font-size:12px;margin-top:6px">Authenticating…</p>
 </div>
</div>`;
  document.body.appendChild(div);
}

/* ── Wire Overlay Close ─────────────────────────────────────────── */
function wireCloseButtons(){
  document.addEventListener('click', e=>{
    if(e.target.classList.contains('wb-mclose')){
      const ov=e.target.closest('.wb-overlay'); if(ov) closeOverlay(ov.id);
    }
    if(e.target.classList.contains('wb-overlay')) closeOverlay(e.target.id);
  });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeAll(); });
}

/* ── Wire Contact Form ──────────────────────────────────────────── */
function wireContactForm(){
  const form=document.getElementById('modal-contact-form');
  if(!form) return;
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const btn=form.querySelector('button[type=submit]');
    btn.textContent='Sending…'; btn.disabled=true;
    try{ await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(new FormData(form))}); }catch(_){}
    form.style.display='none';
    document.getElementById('modal-contact-success').style.display='block';
    setTimeout(()=>closeOverlay('contact-overlay'),2800);
    setTimeout(()=>{ form.style.display='block'; form.reset(); document.getElementById('modal-contact-success').style.display='none'; btn.textContent='Send Message'; btn.disabled=false; },3400);
  });
}

/* ── Wire Auth ──────────────────────────────────────────────────── */
function wireAuth(){
  document.addEventListener('click', e=>{
    const tab=e.target.closest('.auth-tab');
    if(tab && tab.closest('#auth-overlay')){
      $$('.auth-tab').forEach(t=>t.classList.toggle('active',t===tab));
      $$('.auth-panel').forEach(p=>p.classList.toggle('active',p.id==='auth-panel-'+tab.dataset.tab));
    }
  });
  document.getElementById('si-to-signup')?.addEventListener('click',()=>openAuthModal('signup'));
  document.getElementById('su-to-signin')?.addEventListener('click',()=>openAuthModal('signin'));
  document.getElementById('si-guest')?.addEventListener('click',()=>closeOverlay('auth-overlay'));
  $$('.pw-eye').forEach(btn=>btn.addEventListener('click',()=>{
    const inp=btn.previousElementSibling; inp.type=inp.type==='password'?'text':'password';
  }));
  document.getElementById('si-submit')?.addEventListener('click',()=>{
    const email=(document.getElementById('si-email').value||'').trim();
    const pass=document.getElementById('si-pass').value||'';
    const errEl=document.getElementById('si-error');
    if(!email||!pass){ errEl.textContent='Please fill in all fields.'; errEl.style.display='block'; return; }
    if((email===DEMO_EMAIL&&pass===DEMO_PASS)||pass.length>=6){
      user={name:email===DEMO_EMAIL?'Demo User':email.split('@')[0], email, phone:'', addr:'', city:'Sacramento', zip:''};
      saveUser(user); updateNavUser(); closeOverlay('auth-overlay');
      const firstName=user.name.split(' ')[0];
      toast('Welcome back, '+firstName+'!','You are now signed in','');
    } else { errEl.textContent='Invalid email or password.'; errEl.style.display='block'; }
  });
  document.getElementById('su-submit')?.addEventListener('click',()=>{
    const fname=(document.getElementById('su-fname').value||'').trim();
    const lname=(document.getElementById('su-lname').value||'').trim();
    const email=(document.getElementById('su-email').value||'').trim();
    const pass=document.getElementById('su-pass').value||'';
    const errEl=document.getElementById('su-error');
    if(!fname||!email||pass.length<8){ errEl.textContent='Name, email and 8-char password required.'; errEl.style.display='block'; return; }
    user={name:`${fname} ${lname}`.trim(), email, phone:(document.getElementById('su-phone').value||''), addr:(document.getElementById('su-addr').value||''), city:(document.getElementById('su-city').value||''), zip:(document.getElementById('su-zip').value||'')};
    saveUser(user); updateNavUser(); closeOverlay('auth-overlay');
    toast('Welcome to Waterboy, '+fname+'!','Your account is ready','');
  });
}

/* ── Wire Qty Modal ─────────────────────────────────────────────── */
function wireQtyModal(){
  const card=document.querySelector('#qty-overlay .wb-modal'); if(!card) return;
  const dispEl=card.querySelector('.qty-disp');
  document.getElementById('qm-minus')?.addEventListener('click',()=>{ card._qty=Math.max(1,(card._qty||1)-1); if(dispEl) dispEl.textContent=card._qty; });
  document.getElementById('qm-plus')?.addEventListener('click', ()=>{ card._qty=Math.min(99,(card._qty||1)+1); if(dispEl) dispEl.textContent=card._qty; });
  document.getElementById('qm-confirm')?.addEventListener('click',()=>{
    if(_qmCallback) _qmCallback(card._qty||1);
    closeOverlay('qty-overlay'); _qmCallback=null;
  });
}

/* ── Wire PD Modal ──────────────────────────────────────────────── */
function wirePdModal(){
  const modal=document.getElementById('pd-modal'); if(!modal) return;
  modal._qty=1;
  const disp=modal.querySelector('.pd-qty-disp');
  document.getElementById('pd-minus')?.addEventListener('click',()=>{ modal._qty=Math.max(1,modal._qty-1); if(disp) disp.textContent=modal._qty; });
  document.getElementById('pd-plus')?.addEventListener('click', ()=>{ modal._qty=Math.min(99,modal._qty+1); if(disp) disp.textContent=modal._qty; });
}

/* ── Wire Cart Drawer ───────────────────────────────────────────── */
function wireCartDrawer(){
  document.getElementById('cd-close')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cart-drawer-overlay')?.addEventListener('click', e=>{ if(e.target.id==='cart-drawer-overlay') closeCartDrawer(); });
  document.getElementById('cd-continue-btn')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cd-checkout-btn')?.addEventListener('click',()=>{
    closeCartDrawer();
    if(!cart.length){ toast('Cart empty','Add some products first',''); return; }
    gotoStep('checkout-overlay',0);
    if(user){
      const f=(id,v)=>{ const el=document.getElementById(id); if(el&&v) el.value=v; };
      const parts=(user.name||'').split(' ');
      f('co-fname',parts[0]); f('co-lname',parts.slice(1).join(' ')); f('co-email',user.email); f('co-phone',user.phone); f('co-addr',user.addr); f('co-city',user.city||'Sacramento'); f('co-zip',user.zip);
    }
    openOverlay('checkout-overlay');
  });
  document.getElementById('promo-apply')?.addEventListener('click',()=>{
    const code=(document.getElementById('promo-input')?.value||'').trim().toUpperCase();
    if(code==='WATERBOY10') toast('Promo applied!','10% off your order','');
    else toast('Invalid code','Promo code not found','');
  });
}

/* ── Wire Checkout ──────────────────────────────────────────────── */
let coAddonQtys = {}; // addon id → qty

function wireCheckout(){
  document.getElementById('co-next-0')?.addEventListener('click',()=>{
    if(!(document.getElementById('co-fname')?.value)||!(document.getElementById('co-email')?.value)){ toast('Missing info','Please fill in name and email',''); return; }
    gotoStep('checkout-overlay',1);
    buildCalendar('co-calendar',3,d=>{ coState.date=d; });
    buildTimeWindows('co-time-wins',t=>{ coState.time=t; });
  });

  // Show/hide bottle return section based on order type
  document.addEventListener('click',e=>{
    const ot=e.target.closest('.ot-btn');
    if(ot&&ot.closest('#checkout-overlay')){
      $$('.ot-btn',document.getElementById('checkout-overlay')).forEach(b=>b.classList.toggle('sel',b===ot));
      coState.orderType=ot.dataset.ot;
      const fw=document.getElementById('co-freq-wrap');
      const brSection=document.getElementById('co-bottle-return-section');
      const brNote=document.getElementById('co-recurring-note');
      if(fw) fw.style.display=coState.orderType==='recurring'?'block':'none';
      if(brSection) brSection.style.display=coState.orderType==='one-time'?'block':'none';
      if(brNote) brNote.style.display=coState.orderType==='recurring'?'flex':'none';
    }
    const fb=e.target.closest('.freq-btn');
    if(fb&&fb.closest('#checkout-overlay')&&fb.dataset.f){
      $$('.freq-btn',document.getElementById('checkout-overlay')).forEach(b=>{ if(b.dataset.f) b.classList.toggle('sel',b===fb); });
      coState.freq=fb.dataset.f;
    }
    // Bottle return radio highlight
    const br=e.target.closest('.br-radio');
    if(br&&br.closest('#checkout-overlay')){
      $$('.br-radio',br.closest('#checkout-overlay')).forEach(r=>r.classList.remove('checked'));
      br.classList.add('checked');
      const inp=br.querySelector('input[type=radio]');
      if(inp) inp.checked=true;
      coState.bottleReturn=inp?inp.value:null;
      if(inp?.value==='pickup'){
        const note=br.closest('#co-bottle-return-section')?.querySelector('.br-pickup-note');
        if(note) note.style.display='block';
      }
    }
    // Add-on add buttons
    const addonBtn=e.target.closest('.co-addon-add');
    if(addonBtn&&addonBtn.closest('#co-addon-row')){
      const id=addonBtn.dataset.addon;
      const addon=CHECKOUT_ADDONS.find(a=>a.id===id);
      if(addon){
        coAddonQtys[id]=(coAddonQtys[id]||0)+1;
        addonBtn.classList.add('in-cart');
        addonBtn.textContent='Added ('+coAddonQtys[id]+')';
        addToCartRaw(addon.name, addon.price, '', coAddonQtys[id]>1?1:1);
        if(coAddonQtys[id]===1) toast(addon.name,'Added to your order','✓');
      }
    }
  });

  document.getElementById('co-next-1')?.addEventListener('click',()=>{
    if(!coState.date){ toast('Pick a date','Select a delivery date',''); return; }
    if(!coState.time){ toast('Pick a time','Select a time window',''); return; }
    if(coState.orderType==='one-time'&&!coState.bottleReturn){
      toast('Bottle return','Please select how you\'ll return empty bottles',''); return;
    }
    // Step 1 → add-ons step → payment
    gotoStep('checkout-overlay',2);
  });
  document.getElementById('co-back-addons')?.addEventListener('click',()=>gotoStep('checkout-overlay',1));
  document.getElementById('co-next-addons')?.addEventListener('click',()=>{ gotoStep('checkout-overlay',3); buildOrderSummary('co-order-summary'); });
  document.getElementById('co-back-1')?.addEventListener('click',()=>gotoStep('checkout-overlay',0));
  document.getElementById('co-back-2')?.addEventListener('click',()=>gotoStep('checkout-overlay',2));
  document.getElementById('co-place-order')?.addEventListener('click',()=>{
    if(!(document.getElementById('co-card')?.value)||!(document.getElementById('co-cname')?.value)){ toast('Payment info','Enter card details',''); return; }
    gotoStep('checkout-overlay',4);
    const numEl=document.getElementById('co-order-num'); if(numEl) numEl.textContent=genId();
    cart=[]; coAddonQtys={}; saveCart(cart); updateBadge();
    toast('Order placed!','Check your email for confirmation','');
  });
  document.getElementById('co-apple-pay')?.addEventListener('click',()=>showPaySim('apple',()=>{ gotoStep('checkout-overlay',4); const n=document.getElementById('co-order-num'); if(n) n.textContent=genId(); cart=[]; coAddonQtys={}; saveCart(cart); updateBadge(); toast('Order placed!','Apple Pay successful',''); }));
  document.getElementById('co-google-pay')?.addEventListener('click',()=>showPaySim('google',()=>{ gotoStep('checkout-overlay',4); const n=document.getElementById('co-order-num'); if(n) n.textContent=genId(); cart=[]; coAddonQtys={}; saveCart(cart); updateBadge(); toast('Order placed!','Google Pay successful',''); }));
  document.getElementById('co-done-btn')?.addEventListener('click',()=>closeOverlay('checkout-overlay'));
  const coCard=document.getElementById('co-card'); coCard?.addEventListener('input',()=>{ let v=coCard.value.replace(/\D/g,'').slice(0,16); coCard.value=v.replace(/(.{4})/g,'$1 ').trim(); });
  const coExp=document.getElementById('co-exp'); coExp?.addEventListener('input',()=>{ let v=coExp.value.replace(/\D/g,'').slice(0,4); if(v.length>2) v=v.slice(0,2)+'/'+v.slice(2); coExp.value=v; });
  wireZipField('co-zip','co-zone-result','co-next-0');
}

/* ── Wire Subscription ──────────────────────────────────────────── */
function wireSubscription(){
  document.addEventListener('click',e=>{
    const wb=e.target.closest('.wtype-btn');
    if(wb&&wb.closest('#sub-overlay')){
      $$('.wtype-btn',document.getElementById('sub-overlay')).forEach(b=>b.classList.toggle('sel',b===wb));
      subState.waterType=wb.dataset.wt;
      const ph=document.querySelector('#sub-overlay .wtype-ph');
      if(ph){ const msgs={purified:'Standard purified water — clean, crisp taste.',alkaline:'Alkaline (pH 8.5+) — add $4/bottle to base price.',distilled:'Ultra-pure distilled water — great for appliances.'}; ph.textContent=msgs[subState.waterType]||''; }
    }
  });
  document.getElementById('sub-next-0')?.addEventListener('click',()=>gotoStep('sub-overlay',1));
  document.getElementById('sub-next-1')?.addEventListener('click',()=>{
    if(!(document.getElementById('sub-fname')?.value)||!(document.getElementById('sub-email')?.value)){ toast('Missing info','Name and email required',''); return; }
    gotoStep('sub-overlay',2); buildCalendar('sub-calendar',3,d=>{ subState.date=d; }); buildTimeWindows('sub-time-wins',t=>{ subState.time=t; });
  });
  document.getElementById('sub-back-1')?.addEventListener('click',()=>gotoStep('sub-overlay',0));
  document.getElementById('sub-next-2')?.addEventListener('click',()=>{
    if(!subState.date){ toast('Pick a date','Select your first delivery date',''); return; }
    if(!subState.time){ toast('Pick a time','Select a time window',''); return; }
    gotoStep('sub-overlay',3);
    const plan=PLANS[subState.plan]||{}; const bottles=plan.Bottles||0; const extra=subState.waterType==='alkaline'?Bottles*4:0;
    const zd=zoneFeeDisplay(currentZone); const total=(plan.price||0)+extra+zd.fee;
    const zoneTag=zd.tag?` <span style="font-size:10px;color:#8BB8D4">(${zd.tag})</span>`:'';
    const c=document.getElementById('sub-order-summary'); if(c) c.innerHTML=`<div class="ob-row"><span>${esc(subState.plan)} Plan (${Bottles} bottles)</span><span>$${(plan.price||0).toFixed(2)}/mo</span></div>${extra?`<div class="ob-row"><span>Alkaline upgrade</span><span>+$${extra.toFixed(2)}</span></div>`:''}<div class="ob-row"><span>Delivery${zoneTag}</span><span style="color:${zd.color}">${zd.text}</span></div><div class="ob-row grand"><span>Monthly Total</span><span>$${total.toFixed(2)}/mo</span></div>`;
  });
  document.getElementById('sub-back-2')?.addEventListener('click',()=>gotoStep('sub-overlay',1));
  document.getElementById('sub-back-3')?.addEventListener('click',()=>gotoStep('sub-overlay',2));
  const doSubConfirm=()=>{ gotoStep('sub-overlay',4); const n=document.getElementById('sub-order-num'); if(n) n.textContent=genId(); toast('Subscribed!','Welcome to Waterboy Delivery!',''); };
  document.getElementById('sub-subscribe-btn')?.addEventListener('click',()=>{
    if(!(document.getElementById('sub-card')?.value)||!(document.getElementById('sub-cname')?.value)){ toast('Payment info','Enter card details',''); return; }
    doSubConfirm();
  });
  document.getElementById('sub-apple-pay')?.addEventListener('click',()=>showPaySim('apple',doSubConfirm));
  document.getElementById('sub-google-pay')?.addEventListener('click',()=>showPaySim('google',doSubConfirm));
  document.getElementById('sub-done-btn')?.addEventListener('click',()=>closeOverlay('sub-overlay'));
  const subCard=document.getElementById('sub-card'); subCard?.addEventListener('input',()=>{ let v=subCard.value.replace(/\D/g,'').slice(0,16); subCard.value=v.replace(/(.{4})/g,'$1 ').trim(); });
  const subExp=document.getElementById('sub-exp'); subExp?.addEventListener('input',()=>{ let v=subExp.value.replace(/\D/g,'').slice(0,4); if(v.length>2) v=v.slice(0,2)+'/'+v.slice(2); subExp.value=v; });
  wireZipField('sub-zip','sub-zone-result','sub-next-1');
}

/* ── Wire Delivery Modal ────────────────────────────────────────── */
function wireDeliveryModal(){
  // Plan selection
  document.addEventListener('click',e=>{
    const pc=e.target.closest('.dv-plan-card');
    if(pc&&pc.closest('#delivery-overlay')){
      $$('.dv-plan-card',document.getElementById('delivery-overlay')).forEach(c=>{ c.style.borderColor='rgba(0,212,255,.15)'; c.style.background='rgba(0,212,255,.04)'; });
      pc.style.borderColor='#00D4FF'; pc.style.background='rgba(0,212,255,.12)';
      dvState.plan=pc.dataset.plan;
    }
    // Freq buttons in delivery
    const fb=e.target.closest('.freq-btn');
    if(fb&&fb.closest('#delivery-overlay')){
      if(fb.dataset.f){
        fb.closest('.freq-btns').querySelectorAll('.freq-btn[data-f]').forEach(b=>b.classList.toggle('sel',b===fb));
        dvState.freq=fb.dataset.f;
      }
      if(fb.dataset.day){
        fb.closest('.freq-btns').querySelectorAll('.freq-btn[data-day]').forEach(b=>b.classList.toggle('sel',b===fb));
        dvState.day=fb.dataset.day;
      }
      if(fb.dataset.win){
        fb.closest('.freq-btns').querySelectorAll('.freq-btn[data-win]').forEach(b=>b.classList.toggle('sel',b===fb));
        dvState.window=fb.dataset.win;
      }
    }
  });
  document.getElementById('dv-next-0')?.addEventListener('click',()=>{
    if(!(document.getElementById('dv-fname')?.value)||!(document.getElementById('dv-email')?.value)){ toast('Missing info','Name and email required',''); return; }
    gotoStep('delivery-overlay',1);
  });
  document.getElementById('dv-back-1')?.addEventListener('click',()=>gotoStep('delivery-overlay',0));
  document.getElementById('dv-next-1')?.addEventListener('click',()=>{
    if(!dvState.plan){ toast('Choose a plan','Please select a delivery plan',''); return; }
    gotoStep('delivery-overlay',2);
    buildCalendar('dv-calendar',3,d=>{ dvState.date=d; });
  });
  document.getElementById('dv-back-2')?.addEventListener('click',()=>gotoStep('delivery-overlay',1));
  document.getElementById('dv-next-2')?.addEventListener('click',()=>{
    if(!dvState.date){ toast('Pick a date','Select your first delivery date',''); return; }
    gotoStep('delivery-overlay',3);
    const plan=PLANS[dvState.plan]||{}; const price=plan.price||0;
    const zd=zoneFeeDisplay(currentZone); const total=price+zd.fee;
    const zoneTag=zd.tag?` <span style="font-size:10px">(${zd.tag})</span>`:'';
    const sumEl=document.getElementById('dv-plan-summary');
    if(sumEl) sumEl.innerHTML=`<div style="font-weight:800;font-size:17px;color:#fff;font-family:'Outfit',sans-serif;margin-bottom:6px">${esc(dvState.plan)}</div><div style="color:#8BB8D4;font-size:13px;line-height:1.9">${(plan.Bottles||0)} bottles/delivery &nbsp;·&nbsp; ${esc(dvState.freq)} &nbsp;·&nbsp; ${esc(dvState.day)} ${esc(dvState.window)}<br>First delivery: ${dvState.date?dvState.date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'TBD'}</div><div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center"><span style="color:#8BB8D4;font-size:13px">Plan price</span><span style="color:#00D4FF;font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700">$${price}/mo</span></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px"><span style="color:#8BB8D4;font-size:13px">Delivery${zoneTag}</span><span style="color:${zd.color};font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700">${zd.text}</span></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;border-top:1px solid rgba(0,212,255,.15);padding-top:8px"><span style="color:#fff;font-size:14px;font-weight:700">Total</span><span style="color:#fff;font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:800">$${total.toFixed(2)}/mo</span></div>`;
    const priceBtn=document.getElementById('dv-price-btn'); if(priceBtn) priceBtn.textContent=total.toFixed(2);
  });
  document.getElementById('dv-back-3')?.addEventListener('click',()=>gotoStep('delivery-overlay',2));
  const doDvConfirm=()=>{
    gotoStep('delivery-overlay',4);
    const plan=PLANS[dvState.plan]||{}; const price=plan.price||0;
    const cs=document.getElementById('dv-confirm-summary');
    if(cs) cs.innerHTML=`<strong style="color:#fff;font-size:15px">${esc(dvState.plan||'')} Plan</strong><br>`
      +`${(plan.Bottles||0)} bottles &nbsp;·&nbsp; ${esc(dvState.freq)}<br>`
      +`${esc(dvState.day)} ${esc(dvState.window)}<br>`
      +`First delivery: ${dvState.date?dvState.date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'TBD'}<br>`
      +`<span style="color:#00D4FF;font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700">$${price}/month</span>`;
    toast('Delivery scheduled!','Welcome to Waterboy Delivery!','');
  };
  document.getElementById('dv-subscribe-btn')?.addEventListener('click',()=>{
    if(!document.getElementById('dv-terms')?.checked){ toast('Terms','Please accept the terms of service',''); return; }
    if(!(document.getElementById('dv-card')?.value)||!(document.getElementById('dv-cname')?.value)){ toast('Payment info','Enter card details',''); return; }
    doDvConfirm();
  });
  document.getElementById('dv-apple-pay')?.addEventListener('click',()=>showPaySim('apple',doDvConfirm));
  document.getElementById('dv-google-pay')?.addEventListener('click',()=>showPaySim('google',doDvConfirm));
  document.getElementById('dv-done-btn')?.addEventListener('click',()=>closeOverlay('delivery-overlay'));
  const dvCard=document.getElementById('dv-card'); dvCard?.addEventListener('input',()=>{ let v=dvCard.value.replace(/\D/g,'').slice(0,16); dvCard.value=v.replace(/(.{4})/g,'$1 ').trim(); });
  const dvExp=document.getElementById('dv-exp'); dvExp?.addEventListener('input',()=>{ let v=dvExp.value.replace(/\D/g,'').slice(0,4); if(v.length>2) v=v.slice(0,2)+'/'+v.slice(2); dvExp.value=v; });
  wireZipField('dv-zip','dv-zone-result','dv-next-0');
}

/* ── Wire Pricing & Subscription Buttons ───────────────────────── */
function wirePricingButtons(){
  // Wire ALL pricing-btn anchors and alkaline card buttons
  $$('.pricing-card, .alkaline-card').forEach(card=>{
    const h3=card.querySelector('h3,h4'); if(!h3) return;
    const planName=h3.textContent.trim();
    $$('a[href="#contact"], a.pricing-btn, a[href*="contact"]', card).forEach(btn=>{
      btn.removeAttribute('href');
      btn.setAttribute('href','javascript:void(0)');
      btn.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); openSubWithPlan(planName); });
    });
  });
}

function openSubWithPlan(planName){
  const plan = PLANS[planName] || Object.values(PLANS)[0];
  const isAlkaline = PLANS[planName]?.alkaline || false;
  subState.plan = planName;
  subState.waterType = isAlkaline ? 'alkaline' : window.WaterboyState.waterType;

  // Use water type pricing from WaterboyState
  const bundleData = WATERBOY_PRICING.bundles[planName];
  const displayPrice = bundleData ? bundleData[window.WaterboyState.waterType] : (plan.price||0);
  const bottles = bundleData ? bundleData.Bottles : (plan.Bottles||0);
  const waterLabel = { ro:'RO', alkaline:'Alkaline', hydrogen:'Hydrogen' }[window.WaterboyState.waterType] || 'RO';

  const display = document.getElementById('sub-plan-display');
  if(display){
    const perks = [`${Bottles} × 5-gal ${waterLabel} bottles`, 'Flexible schedule', 'Delivery from $2.99'];
    display.innerHTML=`<div class="sub-plan-name">${esc(planName)}</div><div class="sub-plan-price">$${displayPrice}<span>/mo</span></div><div class="sub-plan-tags">${perks.map(p=>`<span class="sub-tag">${esc(p)}</span>`).join('')}</div>`;
  }
  // Sync water type buttons
  $$('#sub-overlay .wtype-btn').forEach(b=>b.classList.toggle('sel',b.dataset.wt===subState.waterType));
  gotoStep('sub-overlay',0);
  openOverlay('sub-overlay');
}

/* ── Wire "Set Up Delivery" button ─────────────────────────────── */
function wireDeliveryButton(){
  // Match the exact button text
  $$('a, button').forEach(el=>{
    const txt=(el.textContent||'').trim();
    if(txt.startsWith('Set Up Delivery') || txt.includes('Set Up Delivery')){
      el.removeAttribute('href');
      el.setAttribute('href','javascript:void(0)');
      el.addEventListener('click',e=>{
        e.preventDefault(); e.stopPropagation();
        dvState = { plan:null, date:null, time:null, freq:'bi-weekly', day:'Monday', window:'Morning' };
        gotoStep('delivery-overlay',0);
        if(user){
          const f=(id,v)=>{ const el=document.getElementById(id); if(el&&v) el.value=v; };
          const parts=(user.name||'').split(' ');
          f('dv-fname',parts[0]); f('dv-lname',parts.slice(1).join(' ')); f('dv-email',user.email||''); f('dv-phone',user.phone||''); f('dv-addr',user.addr||''); f('dv-city',user.city||''); f('dv-zip',user.zip||'');
        }
        openOverlay('delivery-overlay');
      });
    }
  });
}

/* ── Wire remaining #contact links to Contact Modal ────────────── */
function wireRemainingContactLinks(){
  // After pricing & delivery are wired, change all remaining #contact anchors
  $$('a[href="#contact"], a[href="index.html#contact"]').forEach(link=>{
    // Skip if already handled (has data-wired attribute)
    if(link.dataset.wired) return;
    link.dataset.wired='1';
    const origHref=link.getAttribute('href');
    link.setAttribute('href','javascript:void(0)');
    link.addEventListener('click',e=>{
      e.preventDefault(); e.stopPropagation();
      openOverlay('contact-overlay');
    });
  });
}

/* ── Wire Catalog Cards ─────────────────────────────────────────── */
function wireCatalogCards(){
  let count=0;
  $$('.catalog-card').forEach(card=>{
    const nameEl=card.querySelector('.catalog-name');
    const priceEl=card.querySelector('.catalog-price');
    const imgEl=card.querySelector('img');
    const body=card.querySelector('.catalog-card-body');
    if(!body||!nameEl) return;

    const name=nameEl.textContent.trim();
    const priceText=priceEl?priceEl.textContent.trim():'';
    const isPriced=priceEl&&!priceEl.classList.contains('tbd')&&priceText.includes('$');
    const priceMatch=priceText.match(/\$(\d+\.?\d*)/);
    const priceNum=priceMatch?parseFloat(priceMatch[1]):null;
    const imgSrc=imgEl?imgEl.getAttribute('src'):'';

    card.dataset.wbName=name;
    card.dataset.wbPrice=priceNum!=null?priceNum:'';
    card.dataset.wbImg=imgSrc;

    // Replace .catalog-view link with a proper button
    const existingView=body.querySelector('.catalog-view');
    if(existingView){
      const viewBtn=document.createElement('button');
      viewBtn.className='catalog-view';
      viewBtn.textContent='View Details';
      viewBtn.style.cssText='display:block;width:100%;margin-top:8px;padding:8px;background:transparent;border:1px solid rgba(0,212,255,.2);border-radius:8px;color:#00D4FF;font-family:"Outfit",sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s;text-align:center';
      viewBtn.addEventListener('mouseenter',()=>{ viewBtn.style.background='rgba(0,212,255,.08)'; });
      viewBtn.addEventListener('mouseleave',()=>{ viewBtn.style.background='transparent'; });
      viewBtn.addEventListener('click',e=>{ e.preventDefault(); openProductDetailFromCard(card); });
      existingView.replaceWith(viewBtn);
    }

    // Add "Add to Cart" / "Inquire" button if not already there
    if(!body.querySelector('.catalog-atc')){
      const atcBtn=document.createElement('button');
      atcBtn.className='catalog-atc';
      if(isPriced&&priceNum){
        atcBtn.textContent='Add to Cart';
        atcBtn.addEventListener('click',()=>{
          openInlineQtyModal(name,priceNum,imgSrc,qty=>{
            addToCartRaw(name,priceNum,imgSrc,qty);
            toast(name,'Added '+qty+' to cart','');
          });
        });
      } else {
        atcBtn.textContent='Inquire';
        atcBtn.style.cssText='background:rgba(139,184,212,.08);border-color:rgba(139,184,212,.2);color:#8BB8D4';
        atcBtn.addEventListener('click',()=>{
          const msgEl=document.querySelector('#modal-contact-form textarea[name="message"]');
          if(msgEl) msgEl.value="I'd like pricing information for "+name+".";
          openOverlay('contact-overlay');
        });
      }
      const viewBtn=body.querySelector('.catalog-view');
      if(viewBtn) body.insertBefore(atcBtn,viewBtn);
      else body.appendChild(atcBtn);
    }
    count++;
  });
  console.log('[Waterboy] Wired',count,'catalog cards');
}

/* ── Wire Water Type Modal ──────────────────────────────────────── */
function wireWaterTypeModal(){
  const overlay=document.getElementById('water-type-overlay');
  if(!overlay) return;

  // Show modal on first visit (no localStorage key set)
  const saved=localStorage.getItem('waterboy_water_type');
  if(!saved){
    setTimeout(()=>{ overlay.classList.add('open'); document.body.style.overflow='hidden'; }, 900);
  }

  // Sync initial pill state
  syncWaterPillsUI();

  // Card selection
  overlay.querySelectorAll('.wt-card').forEach(card=>{
    const activate=()=>{
      overlay.querySelectorAll('.wt-card').forEach(c=>{ c.classList.remove('selected'); c.setAttribute('aria-pressed','false'); });
      card.classList.add('selected');
      card.setAttribute('aria-pressed','true');
      overlay._pendingType=card.dataset.type;
      const btn=document.getElementById('wt-confirm');
      if(btn){ btn.disabled=false; btn.setAttribute('aria-disabled','false'); btn.classList.add('ready'); }
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); activate(); } });
  });

  // Confirm button
  document.getElementById('wt-confirm')?.addEventListener('click',()=>{
    const t=overlay._pendingType;
    if(!t) return;
    window.WaterboyState.setType(t);
    overlay.classList.remove('open');
    document.body.style.overflow='';
  });

  // Browse link — close without saving
  document.getElementById('wt-browse')?.addEventListener('click',()=>{
    overlay.classList.remove('open');
    document.body.style.overflow='';
    // Default to RO rendering without saving to localStorage
    renderPriceTags();
    syncWaterPillsUI();
  });

  // ESC closes
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'&&overlay.classList.contains('open')){
      overlay.classList.remove('open');
      document.body.style.overflow='';
    }
  });
}

/* ── Wire Left Menu ─────────────────────────────────────────────── */
function wireLeftMenu(){
  const menu=document.getElementById('left-menu');
  const panel=document.getElementById('left-menu-panel');
  const backdrop=document.getElementById('left-menu-backdrop');
  const closeBtn=document.getElementById('left-menu-close');
  const hamburger=document.getElementById('nav-hamburger');
  if(!menu) return;

  function openMenu(){
    menu.classList.add('open');
    hamburger?.setAttribute('aria-expanded','true');
    document.body.style.overflow='hidden';
    // Focus first focusable element in panel
    setTimeout(()=>{ closeBtn?.focus(); }, 350);
  }
  function closeMenu(){
    menu.classList.remove('open');
    hamburger?.setAttribute('aria-expanded','false');
    document.body.style.overflow='';
    hamburger?.focus();
  }

  hamburger?.addEventListener('click', openMenu);
  closeBtn?.addEventListener('click', closeMenu);
  backdrop?.addEventListener('click', closeMenu);

  // ESC closes
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'&&menu.classList.contains('open')) closeMenu();
  });

  // Close on nav link click
  menu.querySelectorAll('.lm-nav a').forEach(link=>{
    link.addEventListener('click', closeMenu);
  });

  // Water type pills in menu
  document.querySelectorAll('#lm-water-pills .wt-pill').forEach(pill=>{
    pill.addEventListener('click',()=>{
      window.WaterboyState.setType(pill.dataset.type);
    });
  });

  // Sync pills on water type change
  window.addEventListener('watertype:changed', ()=>syncWaterPillsUI());

  // Initial sync
  syncWaterPillsUI();
}

/* ── Wire Dispenser Rental CTAs ─────────────────────────────────── */
function wireDispenserRental(){
  document.querySelectorAll('.dr-cta[data-rental]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const type=btn.dataset.rental==='top-load'?'Top-Load Dispenser Rental':'Bottom-Load Dispenser Rental';
      const price=btn.dataset.rental==='top-load'?10:25;
      addToCartRaw(type, price, '', 1);
      btn.textContent='Added to Order ✓';
      btn.style.background='rgba(109,207,112,.14)';
      btn.style.borderColor='rgba(109,207,112,.35)';
      btn.style.color='#6DCF70';
      toast(type,'Added to your order','✓');
    });
  });
}

/* ── Inject Nav Buttons ─────────────────────────────────────────── */
function injectNavButtons(){
  const navLinks=document.querySelector('.nav-links, nav ul');
  if(!navLinks) return;

  // Cart icon
  if(!document.querySelector('.nav-cart-btn')){
    const li=document.createElement('li');
    li.style.cssText='list-style:none;display:flex;align-items:center';
    const btn=document.createElement('button');
    btn.className='nav-cart-btn';
    btn.setAttribute('aria-label','Shopping cart');
    btn.style.cssText='background:none;border:none;cursor:pointer;position:relative;font-size:18px;padding:6px 8px;color:#8BB8D4;transition:color .2s;line-height:1';
    btn.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/><circle cx="10" cy="20" r="1"/><circle cx="20" cy="20" r="1"/></svg><span class="cart-badge" style="display:none;position:absolute;top:-4px;right:-4px;background:#00D4FF;color:#070F18;font-size:10px;font-weight:800;min-width:17px;height:17px;border-radius:50%;display:none;align-items:center;justify-content:center;font-family:\'Space Mono\',monospace;padding:0 3px">0</span>';
    btn.addEventListener('click',openCartDrawer);
    li.appendChild(btn); navLinks.appendChild(li);
  }

  // Sign In / User
  if(!document.querySelector('.nav-user-btn')){
    const li=document.createElement('li');
    li.style.cssText='list-style:none;position:relative';
    li.innerHTML=`<div class="nav-user-wrap" style="position:relative;display:inline-block">
      <button class="nav-user-btn" style="cursor:pointer;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.25);border-radius:8px;padding:7px 14px;color:#00D4FF;font-family:'Outfit',sans-serif;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:5px;transition:all .2s;white-space:nowrap">
        <span class="nav-user-name">Sign In</span>
      </button>
      <div class="nav-user-drop" style="display:none;position:absolute;top:calc(100% + 8px);right:0;background:#0D2137;border:1px solid rgba(0,212,255,.2);border-radius:12px;padding:7px;min-width:176px;z-index:9999;box-shadow:0 12px 40px rgba(0,0,0,.55)"></div>
    </div>`;
    navLinks.appendChild(li);
    // Attach listener DIRECTLY on the button
    const btn=li.querySelector('.nav-user-btn');
    const drop=li.querySelector('.nav-user-drop');
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      if(!user){ openAuthModal('signin'); return; }
      drop.style.display = drop.style.display==='none'?'block':'none';
    });
    document.addEventListener('click',e=>{
      if(!li.contains(e.target)) drop.style.display='none';
    });
  }
  updateNavUser();
  updateBadge();
}

/* ── updateNavUser (override) ───────────────────────────────────── */
function updateNavUser(){
  $$('.nav-user-name').forEach(el=>{
    el.textContent = user ? user.name.split(' ')[0] : 'Sign In';
  });
  $$('.nav-user-drop').forEach(drop=>{
    if(user){
      drop.innerHTML=`<button class="nud-item" style="display:block;width:100%;text-align:left;padding:8px 13px;color:#C8E8F8;font-size:13px;border:none;background:none;cursor:pointer;border-radius:7px;font-family:'Inter',sans-serif;transition:background .15s;box-sizing:border-box" id="nud-orders">My Orders</button><button class="nud-item nud-out" style="display:block;width:100%;text-align:left;padding:8px 13px;color:rgba(255,100,100,.8);font-size:13px;border:none;background:none;cursor:pointer;border-radius:7px;font-family:'Inter',sans-serif;transition:background .15s;box-sizing:border-box" id="nud-signout">Sign Out</button>`;
      drop.querySelector('#nud-signout')?.addEventListener('click',()=>{
        user=null; saveUser(null); updateNavUser();
        drop.style.display='none';
        toast('Signed out','See you next time!','');
      });
    } else {
      drop.innerHTML='';
    }
  });
  // Update static sign-in buttons (.nav-btn-outline on interior pages, .hn-sign-in on homepage)
  $$('.nav-btn-outline, .hn-sign-in').forEach(el=>{
    if(user){
      const firstName=user.name.split(' ')[0];
      el.textContent=firstName;
      el.removeAttribute('onclick');
      if(!el._wbDrop){
        const wrap=el.parentElement; wrap.style.position='relative';
        const drop=document.createElement('div');
        drop.style.cssText='display:none;position:absolute;top:calc(100% + 8px);right:0;background:#0D2137;border:1px solid rgba(0,212,255,.2);border-radius:12px;padding:7px;min-width:150px;z-index:9999;box-shadow:0 12px 40px rgba(0,0,0,.55)';
        drop.innerHTML='<button style="display:block;width:100%;text-align:left;padding:8px 13px;color:rgba(255,100,100,.8);font-size:13px;border:none;background:none;cursor:pointer;border-radius:7px;font-family:\'Inter\',sans-serif;">Sign Out</button>';
        drop.querySelector('button').addEventListener('click',()=>{ user=null; saveUser(null); drop.style.display='none'; updateNavUser(); toast('Signed out','See you next time!',''); });
        wrap.appendChild(drop);
        el._wbDrop=drop;
        el.addEventListener('click',e=>{ e.stopPropagation(); drop.style.display=drop.style.display==='none'?'block':'none'; });
        document.addEventListener('click',()=>{ drop.style.display='none'; });
      }
      if(el._wbDrop) el._wbDrop.style.display='none';
    } else {
      el.textContent='Sign In';
      el.setAttribute('onclick',"typeof openAuthModal==='function'&&openAuthModal('signin')");
      if(el._wbDrop){ el._wbDrop.remove(); el._wbDrop=null; }
    }
  });
}

/* ── Frequency Tabs ─────────────────────────────────────────────── */
function wireFreqTabs(){
  $$('.freq-tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      $$('.freq-tab-btn').forEach(b=>b.classList.remove('active'));
      $$('.freq-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      const panel=document.getElementById(btn.dataset.panel);
      if(panel) panel.classList.add('active');
    });
  });
}

/* ── Init ───────────────────────────────────────────────────────── */
function init(){
  inject();
  wireCloseButtons();
  wireContactForm();
  wireAuth();
  wireQtyModal();
  wirePdModal();
  wireCartDrawer();
  wireCheckout();
  wireSubscription();
  wireDeliveryModal();
  // Order matters: price/delivery buttons first, then catch remaining #contact
  wirePricingButtons();
  wireDeliveryButton();
  wireRemainingContactLinks();
  wireCatalogCards();
  // injectNavButtons() — disabled: navbar has static cart + sign-in buttons in HTML
  wireFreqTabs();
  // New for v3
  wireWaterTypeModal();
  wireLeftMenu();
  wireDispenserRental();
  // Render prices for saved water type on page load
  renderPriceTags();
  syncWaterPillsUI();
}

document.addEventListener('DOMContentLoaded', init);
