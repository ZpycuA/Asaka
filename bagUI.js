/* ============================================================
   LaiAsaka Engine · Bag UI
   v1.0.0 · © 2026 ZpycuA · CC BY-NC 4.0
   ------------------------------------------------------------
   自注入 CSS + DOM，不依赖 index.html 任何既有元素。
   纯数据操作走 Inventory 接口，UI 只负责渲染 + 拖拽。
   ============================================================ */

const CSS = `
#bagui-overlay{position:fixed;inset:0;z-index:500;background:rgba(4,8,14,.94);display:none;flex-direction:column;font-family:-apple-system,"PingFang SC",sans-serif;color:#d8e2ee;padding:12px;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#bagui-overlay.on{display:flex}
.bagui-wrap{display:flex;flex-direction:column;height:100%;max-width:1200px;margin:0 auto;width:100%}
.bagui-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:1px solid rgba(105,170,235,.3)}
.bagui-header h2{font-size:16px;letter-spacing:4px;color:#a8d8ff}
#bagui-close{width:32px;height:32px;border-radius:6px;background:rgba(60,100,150,.5);border:1px solid rgba(110,180,255,.4);color:#cfe8ff;font-size:16px;cursor:pointer}
.bagui-main{flex:1;display:flex;gap:12px;margin-top:10px;min-height:0}
.bagui-left,.bagui-right{flex:1;overflow-y:auto;padding:4px;min-width:0}
.bagui-right{flex:1.5;background:rgba(10,18,28,.5);border-radius:8px}
.bagui-sec{margin-bottom:10px;background:rgba(20,32,46,.6);border-radius:6px;padding:8px}
.bagui-sec h3{font-size:11px;letter-spacing:2px;color:#8fb0c8;margin-bottom:6px;display:flex;justify-content:space-between;font-weight:600}
.bagui-cap{font-size:9px;color:#5c82a8}
.bagui-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:4px}
.bagui-slot{aspect-ratio:1;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;position:relative;overflow:hidden;cursor:pointer;user-select:none;touch-action:none}
.bagui-slot.has-item{background:rgba(30,50,75,.8)}
.bagui-slot.has-item[data-rarity="L0"]{border-color:rgba(255,255,255,.3)}
.bagui-slot.has-item[data-rarity="L1"]{border-color:#5fd47a;box-shadow:0 0 4px rgba(95,212,122,.35) inset}
.bagui-slot.has-item[data-rarity="L2"]{border-color:#4a9eff;box-shadow:0 0 4px rgba(74,158,255,.35) inset}
.bagui-slot.has-item[data-rarity="L3"]{border-color:#ffd93d;box-shadow:0 0 4px rgba(255,217,61,.4) inset}
.bagui-slot.has-item[data-rarity="L4"]{border-color:#ff9a3c;box-shadow:0 0 5px rgba(255,154,60,.45) inset}
.bagui-slot.has-item[data-rarity="L5"]{border-color:#ff5b5b;box-shadow:0 0 6px rgba(255,91,91,.5) inset}
.bagui-slot.has-item[data-rarity="FAN"]{border-color:#b87333;background:linear-gradient(135deg,rgba(184,115,51,.18),rgba(30,50,75,.8))}
.bagui-slot.has-item[data-rarity="EXT"]{border-color:#c0c0c0;background:linear-gradient(135deg,rgba(192,192,192,.18),rgba(30,50,75,.8))}
.bagui-slot.has-item[data-rarity="PHE"]{border-color:#ffd700;background:linear-gradient(135deg,rgba(255,215,0,.2),rgba(30,50,75,.8))}
.bagui-slot.has-item[data-rarity="INC"]{border-color:#a0a0c0;background:linear-gradient(135deg,#000 0%,#1a1a24 50%,#000 100%);animation:bagIncGlow 2s ease-in-out infinite}
@keyframes bagIncGlow{0%,100%{box-shadow:0 0 6px rgba(192,192,192,.5) inset}50%{box-shadow:0 0 14px rgba(255,255,255,.9) inset}}
.bagui-slot.drop-hint{box-shadow:0 0 0 2px #7bf5a8 inset}
.bagui-slot.empty{opacity:.4;cursor:default}
.bagui-icon{position:absolute;top:3px;left:50%;transform:translateX(-50%);font-size:18px;line-height:1}
.bagui-name{position:absolute;bottom:2px;left:2px;right:2px;font-size:8px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#cfe4f8}
.bagui-qty{position:absolute;top:1px;right:3px;font-size:9px;color:#ffd93d;font-weight:700}
.bagui-val{position:absolute;top:1px;left:3px;font-size:8px;color:#a8d8ff;font-weight:600;text-shadow:0 1px 2px #000}
.bagui-dur{position:absolute;bottom:0;left:0;right:0;height:2px;background:rgba(0,0,0,.6)}
.bagui-dur i{display:block;height:100%}
.bagui-ghost{position:fixed;z-index:9999;padding:4px 10px;background:rgba(60,120,190,.9);border:1px solid #7fd0ff;border-radius:4px;font-size:11px;transform:translate(-50%,-50%);pointer-events:none;white-space:nowrap;color:#fff;font-weight:600}
.bagui-detail{position:fixed;z-index:600;display:none;width:280px;max-height:70vh;overflow-y:auto;padding:10px;background:rgba(14,22,34,.97);border:1px solid rgba(105,170,235,.45);border-radius:8px;font-size:11px;line-height:1.7;box-shadow:0 6px 24px rgba(0,0,0,.7)}
.bagui-detail.on{display:block}
.bagui-detail-title{font-size:13px;color:#a8d8ff;margin-bottom:6px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:6px}
.bagui-rarity-tag{font-size:9px;padding:1px 6px;border-radius:3px;font-weight:800;letter-spacing:1px}
.bagui-rarity-tag.r-L0{background:rgba(255,255,255,.15);color:#ddd}
.bagui-rarity-tag.r-L1{background:rgba(95,212,122,.2);color:#7fe89a}
.bagui-rarity-tag.r-L2{background:rgba(74,158,255,.2);color:#7fc4ff}
.bagui-rarity-tag.r-L3{background:rgba(255,217,61,.2);color:#ffe880}
.bagui-rarity-tag.r-L4{background:rgba(255,154,60,.2);color:#ffbb6a}
.bagui-rarity-tag.r-L5{background:rgba(255,91,91,.2);color:#ff8b8b}
.bagui-rarity-tag.r-FAN{background:rgba(184,115,51,.25);color:#d4a373}
.bagui-rarity-tag.r-EXT{background:rgba(192,192,192,.25);color:#e0e0e0}
.bagui-rarity-tag.r-PHE{background:rgba(255,215,0,.25);color:#ffd700}
.bagui-rarity-tag.r-INC{background:rgba(0,0,0,.6);color:#e0e0ff;border:1px solid rgba(255,255,255,.4)}
.bagui-flavor{font-size:10px;color:#6a8ca8;font-style:italic;margin-top:6px;padding-top:6px;border-top:1px dashed rgba(80,125,175,.3)}
.bagui-attach-title,.bagui-effects-title{font-size:10px;color:#8fb0c8;margin-top:8px;margin-bottom:4px;letter-spacing:2px}
.bagui-attach-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:4px}
.bagui-attach-slot{padding:5px 8px;background:rgba(10,18,28,.6);border:1px solid rgba(80,125,175,.2);border-radius:4px;display:flex;justify-content:space-between;font-size:10px}
.bagui-attach-label{color:#6a8ca8}
.bagui-attach-val{color:#cfe8ff}
.bagui-attach-empty{color:#4a6d8e}
.bagui-attach-slot.drop-hint{box-shadow:0 0 0 2px #7bf5a8 inset}
.bagui-effects{display:flex;flex-direction:column;gap:2px}
.bagui-effect-item{font-size:10px;color:#a8d8ff;padding:2px 6px;background:rgba(60,120,185,.2);border-radius:3px}
.bagui-effects-empty{font-size:10px;color:#4a6d8e;font-style:italic}
.bagui-ammo-row{display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-size:11px}
.bagui-ammo-btn,.bagui-split-btn{padding:2px 8px;font-size:10px;border-radius:4px;cursor:pointer;font-family:inherit;border:1px solid rgba(110,180,255,.4);background:rgba(60,100,150,.5);color:#cfe8ff}
.bagui-split-row{display:flex;gap:4px;align-items:center;margin-top:6px;font-size:11px}
.bagui-split-input{width:56px;padding:2px 4px;background:rgba(10,18,28,.8);border:1px solid rgba(80,125,175,.35);border-radius:3px;color:#cfe8ff;font-family:inherit;font-size:11px}
.bagui-empty{color:#5c82a8;text-align:center;padding:20px}
.bagui-toolbar{display:flex;gap:6px;margin-top:8px;padding:6px;background:rgba(10,18,28,.5);border-radius:6px;align-items:center;justify-content:space-between}
.bagui-toolbar button{padding:5px 12px;font-size:11px;cursor:pointer;background:rgba(40,80,130,.7);border:1px solid rgba(110,180,255,.5);color:#cfe8ff;border-radius:5px;font-family:inherit}
.bagui-total{font-size:10px;color:#ffd93d;letter-spacing:1px;font-weight:700}
@media(max-width:768px){.bagui-main{flex-direction:column}.bagui-right{flex:1}}
`;

export class BagUI {
  constructor(engine, inventory) {
    this.engine = engine;
    this.inv = inventory;
    this.open = false;
    this.selectedUid = null;
    this._drag = null;
    this._injectCSS();
    this._buildDOM();
  }

  _injectCSS() {
    if (document.getElementById('bagui-style')) return;
    const s = document.createElement('style');
    s.id = 'bagui-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  _buildDOM() {
    if (document.getElementById('bagui-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'bagui-overlay';
    overlay.innerHTML = `
      <div class="bagui-wrap">
        <div class="bagui-header">
          <h2>背包 · 仓库</h2>
          <button id="bagui-close">✕</button>
        </div>
        <div class="bagui-main">
          <div class="bagui-left" id="bagui-left"></div>
          <div class="bagui-right" id="bagui-right"></div>
        </div>
        <div class="bagui-detail" id="bagui-detail">选择物品查看详情</div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('bagui-close').addEventListener('click', () => this.close());
window.addEventListener('pointermove', (e) => this._onMove(e));
window.addEventListener('pointerup', (e) => this._onUp(e));
window.addEventListener('pointercancel', () => { this._cancelDrag(); this._clearGhosts(); });
document.addEventListener('contextmenu', (e) => {
  if (this.open && e.target && e.target.closest && e.target.closest('#bagui-overlay')) {
    e.preventDefault();
  }
});
  }

toggle() { this.open ? this.close() : this.show(); }
show() {
  if (document.pointerLockElement) document.exitPointerLock();
  this.open = true;
  this._clearGhosts();
  document.getElementById('bagui-overlay').classList.add('on');
  this.refresh();
}
close() {
  this.open = false;
  document.getElementById('bagui-overlay').classList.remove('on');
  this._cancelDrag();
  this._clearGhosts();
}

  refresh() {
  if (!this.open) return;
  this._renderLeft();
  this._renderRight();
  this._renderToolbar();
  this._renderDetail();
}

_renderToolbar() {
  let bar = document.getElementById('bagui-toolbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'bagui-toolbar';
    bar.className = 'bagui-toolbar';
    const wrap = document.querySelector('.bagui-wrap');
    if (!wrap) return;
    const main = document.getElementById('bagui-left')?.parentNode;
    if (main && main.parentNode === wrap) {
      wrap.insertBefore(bar, main.nextSibling);
    } else {
      wrap.appendChild(bar);
    }
  }
  const isInMatch = this.engine.app && this.engine.app.world && this.engine.app.world.running;
  const totalVal = this.inv.getTotalValue();
  const carryVal = this.inv.getContainerValue('chest') + this.inv.getContainerValue('pocket') + this.inv.getContainerValue('bag');
  const label = isInMatch
    ? `携带 ${carryVal} cp`
    : `仓库 ${this.inv.getContainerValue('stash')} cp · 总值 ${totalVal} cp`;
  let html = `<span class="bagui-total">${label}</span>`;
  if (!isInMatch) {
    html += '<button id="bagui-stash-all">整理 · 全部入仓</button>';
  }
  bar.innerHTML = html;
  const btn = document.getElementById('bagui-stash-all');
  if (btn) btn.onclick = () => this._stashAll();
}

_stashAll() {
  const containers = ['chest', 'pocket', 'bag'];
  let moved = 0, failed = 0;
  for (const cName of containers) {
    const c = this.inv.containers[cName];
    if (!c) continue;
    const uids = c.uids.slice();
    for (const uid of uids) {
      const r = this.inv.addToContainer('stash', uid);
      if (r.ok) moved++;
      else failed++;
    }
  }
  console.log('[BagUI] 整理完成：入仓', moved, '失败', failed);
  this.refresh();
}

  _renderLeft() {
    const el = document.getElementById('bagui-left');
    const inv = this.inv;
    let html = '';
    html += '<div class="bagui-sec"><h3>装备</h3><div class="bagui-grid">';
    const equipList = [
      ['main', '主武器'], ['side', '副武器'],
      ['helmetShell', '头盔'], ['helmetVisor', '面罩'], ['helmetEar', '耳机'],
      ['vestFiber', '护甲'], ['vestPlate', '插板'],
      ['backpack', '背包'], ['chestRig', '胸挂'],
    ];
    for (const [slot, label] of equipList) html += this._slotHtml(inv.equipped[slot], { type: 'equip', slot }, label);
    html += '</div></div>';

    for (const name of ['chest', 'pocket', 'bag', 'safe']) {
      const c = inv.containers[name];
      if (!c || !c.cap) continue;
      html += `<div class="bagui-sec"><h3>${this._cname(name)}<span class="bagui-cap">${c.uids.length}/${c.cap}</span></h3><div class="bagui-grid">`;
      for (const uid of c.uids) html += this._slotHtml(uid, { type: 'container', name });
      for (let i = c.uids.length; i < c.cap; i++) html += `<div class="bagui-slot empty" data-src-type="container" data-src-name="${name}"></div>`;
      html += '</div></div>';
    }
    el.innerHTML = html;
    this._bindSlotEvents(el);
  }

  _renderRight() {
  const el = document.getElementById('bagui-right');
  if (!el) return;
  const isInMatch = this.engine.app && this.engine.app.world && this.engine.app.world.running;
  if (isInMatch) {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  const c = this.inv.containers.stash;
  let html = `<div class="bagui-sec"><h3>仓库<span class="bagui-cap">${c.uids.length}/${c.cap}</span></h3><div class="bagui-grid">`;
  for (const uid of c.uids) html += this._slotHtml(uid, { type: 'container', name: 'stash' });
  for (let i = c.uids.length; i < Math.min(c.cap, c.uids.length + 20); i++) html += `<div class="bagui-slot empty" data-src-type="container" data-src-name="stash"></div>`;
  html += '</div></div>';
  el.innerHTML = html;
  this._bindSlotEvents(el);
}

  _slotHtml(uid, src, hint) {
    const inv = this.inv;
    const srcAttrs = src.type === 'equip'
      ? `data-src-type="equip" data-src-slot="${src.slot}"`
      : `data-src-type="container" data-src-name="${src.name}"`;
    if (!uid) return `<div class="bagui-slot empty" ${srcAttrs}>${hint ? `<div class="bagui-name" style="bottom:50%;transform:translateY(50%);color:#5c82a8">${hint}</div>` : ''}</div>`;
    const item = inv.items.get(uid);
    if (!item) return `<div class="bagui-slot empty" ${srcAttrs}></div>`;
    const def = inv.getDef(item);
const rawName = def ? (def.name || def.n || def.id || '?') : '?';
const name = this.engine.i18n.t(rawName);
    const qty = item.qty > 1 ? `<span class="bagui-qty">×${item.qty}</span>` : '';
    const dur = item.durMax > 0 ? Math.round(item.dur / item.durMax * 100) : -1;
    const durBar = dur >= 0 ? `<div class="bagui-dur"><i style="width:${dur}%;background:${dur > 60 ? '#6fe07a' : dur > 30 ? '#ffd93d' : '#ff5a5a'}"></i></div>` : '';
    const val = inv.getItemValue(uid);
const valBadge = val > 0 ? `<div class="bagui-val">${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}</div>` : '';
const rarity = item.rarity || 'L0';
return `<div class="bagui-slot has-item" data-uid="${uid}" data-rarity="${rarity}" ${srcAttrs}>
  <div class="bagui-icon">${this._icon(item)}</div>
  <div class="bagui-name">${this._esc(name)}</div>
  ${qty}${durBar}${valBadge}
</div>`;
  }

_icon(item) {
  if (!item) return '?';
  const def = this.inv.getDef(item);
  if (def && def.icon) {
    const icon = String(def.icon);
    if (icon.startsWith('/') || icon.startsWith('http') || icon.startsWith('data:')) {
      return `<img src="${this._esc(icon)}" alt="" style="width:100%;height:100%;object-fit:contain">`;
    }
    return icon;
  }
  return {
    weapons: '🔫', ammo: '🔸', cons: '💊', nade: '💣', attach: '⚙', valuable: '💎',
    helmetShell: '⛑', helmetVisor: '🕶', helmetEar: '🎧',
    vestFiber: '🦺', vestPlate: '🛡', backpack: '🎒', chestRig: '🧥'
  }[item.table] || '?';
}

  _cname(n) { return { chest: '胸挂', pocket: '口袋', bag: '背包', safe: '安全箱', stash: '仓库' }[n] || n; }
  _esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

  _bindSlotEvents(root) {
  root.querySelectorAll('.bagui-slot.has-item').forEach(el => {
    const uid = el.dataset.uid;
    el.addEventListener('pointerdown', (e) => this._onDown(e, uid, el));
    el.addEventListener('click', () => { if (!this._drag) { this.selectedUid = uid; this._renderDetail(); } });
    el.addEventListener('dblclick', (e) => { e.preventDefault(); this._quickEquip(uid); });
  });
}

_quickEquip(uid) {
  const item = this.inv.items.get(uid);
  if (!item) return;
  let targetSlot = null;
  if (item.table === 'weapons') targetSlot = 'main';
  else if (item.table === 'helmetShell') targetSlot = 'helmetShell';
  else if (item.table === 'helmetVisor') targetSlot = 'helmetVisor';
  else if (item.table === 'helmetEar') targetSlot = 'helmetEar';
  else if (item.table === 'vestFiber') targetSlot = 'vestFiber';
  else if (item.table === 'vestPlate') targetSlot = 'vestPlate';
  else if (item.table === 'backpack') targetSlot = 'backpack';
  else if (item.table === 'chestRig') targetSlot = 'chestRig';
  if (!targetSlot) return;
  const r = this.inv.equip(targetSlot, uid);
  if (!r.ok) {
    console.warn('[BagUI] 快速装备失败', uid, targetSlot, r.reason);
    return;
  }
  this.selectedUid = uid;
  this.refresh();
}

  _unloadAmmo(weaponUid) {
  const item = this.inv.items.get(weaponUid);
  if (!item || item.table !== 'weapons' || !item.loaded || item.loaded.qty <= 0) return;
  const ammoType = item.loaded.ammoType;
  const qty = item.loaded.qty;
  const uid = this.inv.createItem('ammo', ammoType, { qty });
  if (!uid) return;
  const r = this.inv.addToContainer('bag', uid);
  if (!r.ok) { this.inv.destroyItem(uid); return; }
  item.loaded.qty = 0;
  this.refresh();
}

_loadAmmo(weaponUid) {
  const item = this.inv.items.get(weaponUid);
  if (!item || item.table !== 'weapons' || !item.loaded) return;
  const def = this.inv.getDef(item);
  if (!def) return;
  const space = (def.mag || 0) - item.loaded.qty;
  if (space <= 0) return;
  const take = this._consumeAmmoFromBag(def.ammoType, space);
  if (take > 0) {
    item.loaded.qty += take;
    this.refresh();
  }
}

_consumeAmmoFromBag(ammoType, count) {
  const c = this.inv.containers.bag;
  if (!c) return 0;
  let remaining = count;
  for (let i = c.uids.length - 1; i >= 0 && remaining > 0; i--) {
    const uid = c.uids[i];
    const it = this.inv.items.get(uid);
    if (!it || it.table !== 'ammo' || it.defId !== ammoType) continue;
    const take = Math.min(it.qty, remaining);
    it.qty -= take;
    remaining -= take;
    if (it.qty <= 0) this.inv.destroyItem(uid);
  }
  return count - remaining;
}

_splitStack(uid, count) {
  const newUid = this.inv.splitStack(uid, count);
  if (!newUid) {
    console.warn('[BagUI] 拆分失败', uid, count);
    return;
  }
  const r = this.inv.addToContainer('stash', newUid);
  if (!r.ok) {
    this.inv.destroyItem(newUid);
    return;
  }
  this.selectedUid = uid;
  this.refresh();
}

  _renderDetail(mx, my) {
  const el = document.getElementById('bagui-detail');
  if (!el) return;
  const uid = this.selectedUid;
  if (!uid || !this.inv.items.has(uid)) {
    el.classList.remove('on');
    el.innerHTML = '';
    return;
  }
  const item = this.inv.items.get(uid);
  const def = this.inv.getDef(item);
  if (!def) {
    el.classList.remove('on');
    return;
  }
  const rawName = def.name || def.n || '?';
  const displayName = this.engine.i18n.t(rawName);
  const rarity = item.rarity || 'L0';
  let html = `<div class="bagui-detail-title"><span>${this._esc(displayName)}</span><span class="bagui-rarity-tag r-${rarity}">${rarity}</span></div>`;

  const unitVal = this.inv.getItemValue(uid);
  if (item.qty > 1) {
    const unit = Math.round(unitVal / item.qty);
    html += `<div>数量：${item.qty} / ${item.stackLimit}（单价 ${unit} cp · 总价 ${unitVal} cp）</div>`;
  } else if (unitVal > 0) {
    html += `<div>价值：${unitVal} cp</div>`;
  }
  if (item.durMax > 0) {
    html += `<div>耐久：${Math.round(item.dur)}/${item.durMax}（${Math.round(item.dur / item.durMax * 100)}%）</div>`;
  }
  if (def.rpm) {
    html += `<div>射速 ${def.rpm} RPM · 弹匣 ${def.mag || '—'}</div>`;
  }

  if (item.table === 'weapons' && item.loaded) {
    const ammoDef = this.inv.content.get('ammo', item.loaded.ammoType);
    const ammoName = ammoDef ? this.engine.i18n.t(ammoDef.name) : item.loaded.ammoType;
    const isFull = item.loaded.qty >= (def.mag || 0);
    html += `<div class="bagui-ammo-row"><span>内置：${this._esc(ammoName)} × ${item.loaded.qty}/${def.mag || 0}</span><span style="display:flex;gap:4px">`;
    if (!isFull) html += `<button class="bagui-ammo-btn" data-action="load" data-uid="${uid}">装填</button>`;
    if (item.loaded.qty > 0) html += `<button class="bagui-ammo-btn" data-action="unload" data-uid="${uid}">扣下</button>`;
    html += `</span></div>`;
  }

  if (def.flavor) html += `<div class="bagui-flavor">「${this._esc(def.flavor)}」</div>`;

  if (item.attachments) {
    html += '<div class="bagui-attach-title">配件槽（拖配件到此）</div><div class="bagui-attach-grid">';
    for (const slot of ['muzzle', 'sight', 'mag', 'grip']) {
      const aUid = item.attachments[slot];
      html += `<div class="bagui-attach-slot" data-weapon-uid="${uid}" data-attach-slot="${slot}">`;
      html += `<span class="bagui-attach-label">${slot}</span>`;
      if (aUid) {
        const aDef = this.inv.getDef(this.inv.items.get(aUid));
        const aRaw = aDef ? (aDef.name || aDef.n || '?') : '?';
        html += `<span class="bagui-attach-val">${this._esc(this.engine.i18n.t(aRaw))}</span>`;
      } else {
        html += '<span class="bagui-attach-empty">空</span>';
      }
      html += `</div>`;
    }
    html += '</div>';
  }

  html += '<div class="bagui-effects-title">效果</div><div class="bagui-effects">';
  if (item.effects && item.effects.length > 0) {
    for (const e of item.effects) {
      const name = typeof e === 'string' ? e : (e.name || e.id || '?');
      html += `<div class="bagui-effect-item">${this._esc(name)}</div>`;
    }
  } else {
    html += '<div class="bagui-effects-empty">（无）</div>';
  }
  html += '</div>';

  if (item.stackLimit > 1 && item.qty > 1) {
    const halfQty = Math.max(1, Math.floor(item.qty / 2));
    html += `<div class="bagui-split-row">
      <span>拆分</span>
      <input type="number" class="bagui-split-input" min="1" max="${item.qty - 1}" value="${halfQty}" data-uid="${uid}">
      <button class="bagui-split-btn" data-uid="${uid}">执行</button>
    </div>`;
  }

  el.innerHTML = html;
  el.classList.add('on');

  if (mx !== undefined && my !== undefined) {
    el.style.left = Math.min(window.innerWidth - 300, mx + 18) + 'px';
    el.style.top = Math.min(window.innerHeight - 100, my + 18) + 'px';
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        el.style.left = Math.max(8, mx - rect.width - 18) + 'px';
      }
      if (rect.bottom > window.innerHeight - 8) {
        el.style.top = Math.max(8, my - rect.height - 18) + 'px';
      }
    });
  }

  el.querySelectorAll('.bagui-ammo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wUid = btn.dataset.uid;
      const action = btn.dataset.action;
      if (action === 'unload') this._unloadAmmo(wUid);
      else if (action === 'load') this._loadAmmo(wUid);
    });
  });

  el.querySelectorAll('.bagui-split-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const splitUid = btn.dataset.uid;
      const input = el.querySelector(`.bagui-split-input[data-uid="${splitUid}"]`);
      if (!input) return;
      const count = parseInt(input.value, 10);
      if (isFinite(count) && count > 0) this._splitStack(splitUid, count);
    });
  });

  el.querySelectorAll('.bagui-attach-slot').forEach(s => {
    s.addEventListener('pointerup', (e) => {
      if (!this._drag || !this._drag.moved) return;
      const srcUid = this._drag.uid;
      this._cancelDrag();
      this._handleDrop(srcUid, s);
    });
  });
}
  /* ===== 拖拽 ===== */
  _onDown(e, uid, el) {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    this._drag = { uid, startX: e.clientX, startY: e.clientY, moved: false, ghost: null, srcEl: el };
  }

  _onMove(e) {
    if (!this._drag) return;
    if (!this._drag.moved) {
      const dx = e.clientX - this._drag.startX, dy = e.clientY - this._drag.startY;
      if (dx * dx + dy * dy < 100) return;
      this._drag.moved = true;
      const item = this.inv.items.get(this._drag.uid);
const def = item ? this.inv.getDef(item) : null;
const rawName = def ? (def.name || def.n || '?') : '?';
const ghost = document.createElement('div');
ghost.className = 'bagui-ghost';
ghost.textContent = this.engine.i18n.t(rawName);
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
      document.body.appendChild(ghost);
      this._drag.ghost = ghost;
      if (this._drag.srcEl) this._drag.srcEl.style.opacity = 0.4;
    }
    if (this._drag.ghost) { this._drag.ghost.style.left = e.clientX + 'px'; this._drag.ghost.style.top = e.clientY + 'px'; }
    document.querySelectorAll('.bagui-slot.drop-hint,.bagui-attach-slot.drop-hint').forEach(x => x.classList.remove('drop-hint'));
    const tgt = document.elementFromPoint(e.clientX, e.clientY);
    if (tgt) {
      const s = tgt.closest('.bagui-slot,.bagui-attach-slot');
      if (s && s !== this._drag.srcEl) s.classList.add('drop-hint');
    }
  }

  _onUp(e) {
    if (!this._drag) return;
    const moved = this._drag.moved;
    const uid = this._drag.uid;
    const srcEl = this._drag.srcEl;
    if (!moved) { this._cancelDrag(); return; }
    const tgt = document.elementFromPoint(e.clientX, e.clientY);
    this._cancelDrag();
    if (!tgt) { if (srcEl) srcEl.style.opacity = 1; return; }
    const slotEl = tgt.closest('.bagui-slot,.bagui-attach-slot');
    if (!slotEl) { if (srcEl) srcEl.style.opacity = 1; return; }
    this._handleDrop(uid, slotEl);
  }

   _clearGhosts() {
  document.querySelectorAll('.bagui-ghost').forEach(g => { try { g.remove(); } catch (_) {} });
   }

  _cancelDrag() {
    if (this._drag && this._drag.ghost) this._drag.ghost.remove();
    if (this._drag && this._drag.srcEl) this._drag.srcEl.style.opacity = 1;
    document.querySelectorAll('.bagui-slot.drop-hint,.bagui-attach-slot.drop-hint').forEach(x => x.classList.remove('drop-hint'));
    this._drag = null;
  }

  _handleDrop(uid, slotEl) {
    const inv = this.inv;
    let target;
    if (slotEl.classList.contains('bagui-attach-slot')) {
      target = { type: 'attach', weaponUid: slotEl.dataset.weaponUid, slot: slotEl.dataset.attachSlot };
    } else {
      const st = slotEl.dataset.srcType;
      if (st === 'equip') target = { type: 'equip', slot: slotEl.dataset.srcSlot };
      else if (st === 'container') target = { type: 'container', name: slotEl.dataset.srcName };
      else return;
    }

    const srcParent = inv.parentOf.get(uid);
    inv._detach(uid);

    let result;
    if (target.type === 'equip') result = inv.equip(target.slot, uid);
    else if (target.type === 'container') result = inv.addToContainer(target.name, uid);
    else if (target.type === 'attach') result = inv.attachTo(target.weaponUid, target.slot, uid);
    else result = { ok: false, reason: 'bad_target' };

    if (!result.ok) {
      this._restoreTo(uid, srcParent);
    } else if (result.swapped) {
      this._restoreTo(result.swapped, srcParent);
    }
    this.refresh();
  }

  _restoreTo(uid, parent) {
    if (!parent) { this.inv.addToContainer('stash', uid); return; }
    if (parent.startsWith('eq:')) { this.inv.equip(parent.slice(3), uid); return; }
    if (parent.startsWith('c:')) { this.inv.addToContainer(parent.slice(2), uid); return; }
    const p = this.inv.items.get(parent);
    if (p && p.attachments) {
      for (const k in p.attachments) if (!p.attachments[k]) if (this.inv.attachTo(parent, k, uid).ok) return;
    }
    if (p && p.subSlots) {
      for (const k in p.subSlots) if (!p.subSlots[k]) if (this.inv.attachToSubSlot(parent, k, uid).ok) return;
    }
    this.inv.addToContainer('stash', uid);
  }
}
