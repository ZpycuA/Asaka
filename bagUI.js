/* ============================================================
   LaiAsaka Engine · Bag UI (Grid Edition)
   v2.0.0 · © 2026 ZpycuA · CC BY-NC 4.0
   ============================================================ */

import * as THREE from 'three'

const CELL = 48;

const CSS = `
#bagui-overlay{position:fixed;inset:0;z-index:500;background:rgba(4,8,14,.94);display:none;flex-direction:column;font-family:-apple-system,"PingFang SC",sans-serif;color:#d8e2ee;padding:12px;box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#bagui-overlay.on{display:flex}
.bagui-wrap{display:flex;flex-direction:column;height:100%;width:100%;max-width:1200px;margin:0 auto;min-height:0}
.bagui-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:1px solid rgba(105,170,235,.3);flex-shrink:0}
.bagui-header h2{font-size:16px;letter-spacing:4px;color:#a8d8ff;margin:0}
#bagui-close{width:32px;height:32px;border-radius:6px;background:rgba(60,100,150,.5);border:1px solid rgba(110,180,255,.4);color:#cfe8ff;font-size:16px;cursor:pointer;flex-shrink:0}
.bagui-main{flex:1;display:flex;gap:12px;margin-top:10px;min-height:0;overflow:hidden}
.bagui-left,.bagui-right{flex:1;overflow-y:auto;padding:4px;min-width:0;box-sizing:border-box}
.bagui-right{flex:1.2;background:rgba(10,18,28,.5);border-radius:8px}
.bagui-sec{margin-bottom:10px;background:rgba(20,32,46,.6);border-radius:6px;padding:8px;display:flex;flex-direction:column;align-items:center}
.bagui-sec h3{font-size:11px;letter-spacing:2px;color:#8fb0c8;margin:0 0 6px 0;display:flex;justify-content:space-between;width:100%;font-weight:600}
.bagui-cap{font-size:9px;color:#5c82a8}

.bagui-grid{position:relative;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;margin:0 auto}
.bagui-cell{position:absolute;border:1px solid rgba(255,255,255,.03);box-sizing:border-box;pointer-events:none}

.bagui-item{position:absolute;background:rgba(60,100,150,.4);border:1px solid rgba(110,180,255,.5);border-radius:4px;box-sizing:border-box;cursor:pointer;overflow:hidden;transition:transform 0.1s}
.bagui-item[data-rarity="L0"]{border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.08)}
.bagui-item[data-rarity="L1"]{border-color:#5fd47a;background:linear-gradient(180deg,rgba(95,212,122,.22),rgba(30,60,45,.85))}
.bagui-item[data-rarity="L2"]{border-color:#4a9eff;background:linear-gradient(180deg,rgba(74,158,255,.22),rgba(25,50,80,.85))}
.bagui-item[data-rarity="L3"]{border-color:#ffd93d;background:linear-gradient(180deg,rgba(255,217,61,.2),rgba(70,60,25,.85))}
.bagui-item[data-rarity="L4"]{border-color:#ff9a3c;background:linear-gradient(180deg,rgba(255,154,60,.24),rgba(80,50,20,.85))}
.bagui-item[data-rarity="L5"]{border-color:#ff5b5b;background:linear-gradient(180deg,rgba(255,91,91,.26),rgba(85,30,30,.85))}
.bagui-item[data-rarity="FAN"]{border-color:#d4a373;background:linear-gradient(135deg,rgba(200,130,70,.5) 0%,rgba(140,85,40,.4) 35%,rgba(255,180,110,.55) 50%,rgba(140,85,40,.4) 65%,rgba(200,130,70,.5) 100%)}
.bagui-item[data-rarity="EXT"]{border-color:#d0d0d0;background:linear-gradient(135deg,rgba(200,200,200,.5) 0%,rgba(120,120,120,.4) 35%,rgba(240,240,240,.55) 50%,rgba(120,120,120,.4) 65%,rgba(200,200,200,.5) 100%)}
.bagui-item[data-rarity="PHE"]{border-color:#ffd700;background:linear-gradient(135deg,rgba(255,215,0,.55) 0%,rgba(180,140,0,.42) 35%,rgba(255,240,100,.6) 50%,rgba(180,140,0,.42) 65%,rgba(255,215,0,.55) 100%)}
.bagui-item[data-rarity="INC"]{border-color:#c8c8e0;background:linear-gradient(135deg,#0a0a14 0%,#2a1a3a 25%,#1a2a3a 50%,#3a1a2a 75%,#0a0a14 100%);background-size:200% 200%;animation:bagIncShift 3s linear infinite,bagIncPulse 1.5s ease-in-out infinite alternate}
@keyframes bagIncShift{0%{background-position:0% 0%}100%{background-position:200% 200%}}
@keyframes bagIncPulse{0%{box-shadow:0 0 6px rgba(200,200,230,.5) inset,0 0 4px rgba(180,180,220,.6)}100%{box-shadow:0 0 14px rgba(255,255,255,.9) inset,0 0 10px rgba(220,220,255,.85)}}

.bagui-item.dragging{opacity:0.4}
.bagui-item.ghost{position:fixed;z-index:9999;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 4px 12px rgba(0,0,0,.6);opacity:0.85}
.bagui-item-icon{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;pointer-events:none}
.bagui-item-name{position:absolute;bottom:2px;left:2px;right:2px;font-size:10px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#cfe4f8;pointer-events:none;text-shadow:0 1px 2px #000}
.bagui-item-qty{position:absolute;top:2px;right:4px;font-size:11px;color:#ffd93d;font-weight:700;pointer-events:none;text-shadow:0 1px 2px #000}
.bagui-item-dur{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(0,0,0,.6);pointer-events:none}
.bagui-item-dur i{display:block;height:100%}

.bagui-detail{position:fixed;z-index:600;display:none;width:280px;max-height:70vh;overflow-y:auto;padding:10px;background:rgba(14,22,34,.97);border:1px solid rgba(105,170,235,.45);border-radius:8px;font-size:11px;line-height:1.7;box-shadow:0 6px 24px rgba(0,0,0,.7);box-sizing:border-box}
.bagui-detail.on{display:block}
.bagui-detail-title{font-size:13px;color:#a8d8ff;margin-bottom:6px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:6px}
.bagui-desc{font-size:10.5px;color:#9ab8d0;line-height:1.7;margin-bottom:6px;padding:4px 0 6px;border-bottom:1px dashed rgba(80,125,175,.25)}
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
.bagui-btn{padding:4px 10px;font-size:11px;border-radius:4px;cursor:pointer;font-family:inherit;border:1px solid rgba(110,180,255,.4);background:rgba(60,100,150,.5);color:#cfe8ff;margin-top:8px;width:100%}
.bagui-btn:hover{background:rgba(80,150,220,.7)}
.bagui-empty{color:#5c82a8;text-align:center;padding:20px}
.bagui-toolbar{display:flex;gap:6px;margin-top:8px;padding:6px;background:rgba(10,18,28,.5);border-radius:6px;align-items:center;justify-content:space-between;flex-shrink:0}
.bagui-toolbar button{padding:5px 12px;font-size:11px;cursor:pointer;background:rgba(40,80,130,.7);border:1px solid rgba(110,180,255,.5);color:#cfe8ff;border-radius:5px;font-family:inherit}
.bagui-total{font-size:10px;color:#ffd93d;letter-spacing:1px;font-weight:700}
.bagui-preview{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,rgba(40,60,90,.6),rgba(10,18,28,.9));border-radius:8px;overflow:hidden}
.bagui-preview canvas{max-width:100%;max-height:100%;display:block}
.bagui-status{margin-top:8px;padding:8px;background:rgba(10,18,28,.5);border-radius:6px;font-size:10px;color:#5c82a8;text-align:center;letter-spacing:1px}

@media(max-width:768px){.bagui-main{flex-direction:column}.bagui-right{flex:0 0 220px;min-height:220px}}
`;

export class BagUI {
  constructor(engine, inventory) {
    this.engine = engine;
    this.inv = inventory;
    this.open = false;
    this.selectedUid = null;
    this.openedBagUid = null; // 当前打开的嵌套背包
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
    window.addEventListener('pointercancel', (e) => this._onUp(e));
    document.addEventListener('contextmenu', (e) => {
      if (this.open && e.target && e.target.closest && e.target.closest('#bagui-overlay')) {
        e.preventDefault();
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (!this.open) return;
      const detail = document.getElementById('bagui-detail');
      if (!detail || !detail.classList.contains('on')) return;
      const tgt = e.target;
      if (!tgt || !tgt.closest) return;
      if (tgt.closest('#bagui-detail')) return;
      if (tgt.closest('.bagui-item')) return;
      this._deselectDetail();
    });
  }

  toggle() { this.open ? this.close() : this.show(); }
  
  show() {
    if (document.pointerLockElement) document.exitPointerLock();
    this.open = true;
    this._clearGhosts();
    document.getElementById('bagui-overlay').classList.add('on');
    this.openedBagUid = null;
    this.refresh();
  }
  
  close() {
    this.open = false;
    document.getElementById('bagui-overlay').classList.remove('on');
    this._cancelDrag();
    this._clearGhosts();
    this._deselectDetail();
  }

  _deselectDetail() {
    this.selectedUid = null;
    const el = document.getElementById('bagui-detail');
    if (el) {
      el.classList.remove('on');
      el.innerHTML = '';
    }
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
    const carryVal = this.inv.getContainerValue('chest') + this.inv.getContainerValue('pocket') + this.inv.getContainerValue('bag') + this.inv.getContainerValue('safe');
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
    let moved = 0, failed = 0;
    for (const cName of ['chest', 'pocket', 'bag']) {
      const c = this.inv.containers[cName];
      if (!c) continue;
      const uids = Array.from(c.items.keys());
      for (const uid of uids) {
        const r = this.inv.addToContainer('stash', uid);
        if (r.ok) moved++;
        else failed++;
      }
    }
    const equipSlots = ['main', 'side', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig'];
    for (const slot of equipSlots) {
      const uid = this.inv.equipped[slot];
      if (!uid) continue;
      this.inv.unequip(slot);
      const r = this.inv.addToContainer('stash', uid);
      if (r.ok) moved++;
      else { failed++; this.inv.equip(slot, uid); }
    }
    console.log('[BagUI] 整理完成：入仓', moved, '失败', failed);
    this.refresh();
  }

  _renderLeft() {
    const el = document.getElementById('bagui-left');
    const inv = this.inv;
    let html = '';
    
    // 装备
    html += '<div class="bagui-sec"><h3>装备</h3><div class="bagui-grid" style="width:100%;display:flex;flex-wrap:wrap;gap:4px;justify-content:center">';
    const equipList = [
      ['main', '主武器'], ['side', '副武器'],
      ['helmetShell', '头盔'], ['helmetVisor', '面罩'], ['helmetEar', '耳机'],
      ['vestFiber', '护甲'], ['vestPlate', '插板'],
      ['backpack', '背包'], ['chestRig', '胸挂'],
    ];
    for (const [slot, label] of equipList) {
      html += this._equipSlotHtml(inv.equipped[slot], slot, label);
    }
    html += '</div></div>';

    // 容器
    for (const name of ['chest', 'pocket', 'bag', 'safe']) {
      const c = inv.containers[name];
      if (!c || !c.isActive) continue;
      html += this._gridContainerHtml(name, this._cname(name));
    }
    el.innerHTML = html;
    this._bindItemEvents(el);
  }

  _renderRight() {
    const el = document.getElementById('bagui-right');
    if (!el) return;
    const isInMatch = this.engine.app && this.engine.app.world && this.engine.app.world.running;

    // 如果打开了嵌套背包，优先显示该背包的内部
    if (this.openedBagUid) {
      const bag = this.inv.items.get(this.openedBagUid);
      if (bag && bag.innerGrid) {
        el.style.display = '';
        let html = `<div class="bagui-sec"><h3 style="cursor:pointer;color:var(--accent)" id="bagui-back-inner">← 返回</h3>`;
        html += `<h3>${this._esc(this.engine.i18n.t(this.inv.getDef(bag).name || bag.defId))} 的内部</h3>`;
        html += `<div class="bagui-grid-wrap" style="width:${bag.innerGrid.w * CELL}px;height:${bag.innerGrid.h * CELL}px;position:relative;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;margin:0 auto" data-container="inner:${bag.uid}">`;
        for (let y = 0; y < bag.innerGrid.h; y++) {
          for (let x = 0; x < bag.innerGrid.w; x++) {
            html += `<div class="bagui-cell" style="left:${x*CELL}px;top:${y*CELL}px;width:${CELL}px;height:${CELL}px"></div>`;
          }
        }
        for (const [uid, pos] of bag.innerGrid.items) {
          html += this._itemHtml(uid, pos, `inner:${bag.uid}`);
        }
        html += `</div></div>`;
        el.innerHTML = html;
        
        const backBtn = document.getElementById('bagui-back-inner');
        if (backBtn) backBtn.onclick = () => { this.openedBagUid = null; this.refresh(); };
        
        this._bindItemEvents(el);
        return;
      }
      this.openedBagUid = null;
    }

    if (isInMatch) {
      el.style.display = '';
      el.innerHTML =
        '<div class="bagui-preview" id="bagui-preview"><div style="color:#5c82a8;font-size:11px;letter-spacing:2px">角色状态</div></div>' +
        '<div class="bagui-status" id="bagui-status">状态栏（预留）</div>';
      this._renderCharPreview();
      return;
    }

    el.style.display = '';
    let html = this._gridContainerHtml('stash', '仓库');
    el.innerHTML = html;
    this._bindItemEvents(el);
  }

  _gridContainerHtml(name, label) {
    const c = this.inv.containers[name];
    if (!c || !c.isActive) return '';
    let html = `<div class="bagui-sec"><h3>${label}<span class="bagui-cap">${c.w}x${c.h}</span></h3>`;
    html += `<div class="bagui-grid-wrap" style="width:${c.w * CELL}px;height:${c.h * CELL}px;position:relative;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;margin:0 auto" data-container="${name}">`;
    for (let y = 0; y < c.h; y++) {
      for (let x = 0; x < c.w; x++) {
        html += `<div class="bagui-cell" style="left:${x*CELL}px;top:${y*CELL}px;width:${CELL}px;height:${CELL}px"></div>`;
      }
    }
    for (const [uid, pos] of c.items) {
      html += this._itemHtml(uid, pos, name);
    }
    html += `</div></div>`;
    return html;
  }

  _equipSlotHtml(uid, slot, hint) {
    if (!uid) return `<div class="bagui-slot empty" data-src-type="equip" data-src-slot="${slot}" style="width:60px;height:60px;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;display:flex;align-items:center;justify-content:center;position:relative"><div class="bagui-name" style="color:#5c82a8">${hint}</div></div>`;
    const item = this.inv.items.get(uid);
    const def = this.inv.getDef(item);
    const name = this.engine.i18n.t(def ? (def.name || def.n || '?') : '?');
    const rarity = item.rarity || 'L0';
    return `<div class="bagui-item has-item" data-uid="${uid}" data-rarity="${rarity}" data-src-type="equip" data-src-slot="${slot}" style="width:60px;height:60px;position:relative">
      <div class="bagui-item-icon">${this._icon(item)}</div>
      <div class="bagui-item-name">${this._esc(name)}</div>
    </div>`;
  }

  _itemHtml(uid, pos, containerName) {
    const item = this.inv.items.get(uid);
    if (!item) return '';
    const def = this.inv.getDef(item);
    const name = this.engine.i18n.t(def ? (def.name || def.n || '?') : '?');
    const rarity = item.rarity || 'L0';
    const qty = item.qty > 1 ? `<span class="bagui-item-qty">×${item.qty}</span>` : '';
    const dur = item.durMax > 0 ? Math.round(item.dur / item.durMax * 100) : -1;
    const durBar = dur >= 0 ? `<div class="bagui-item-dur"><i style="width:${dur}%;background:${dur > 60 ? '#6fe07a' : dur > 30 ? '#ffd93d' : '#ff5a5a'}"></i></div>` : '';
    
    return `<div class="bagui-item has-item" data-uid="${uid}" data-rarity="${rarity}" data-container="${containerName}"
      style="left:${pos.x * CELL}px;top:${pos.y * CELL}px;width:${pos.w * CELL}px;height:${pos.h * CELL}px">
      <div class="bagui-item-icon">${this._icon(item)}</div>
      <div class="bagui-item-name">${this._esc(name)}</div>
      ${qty}${durBar}
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

  _bindItemEvents(root) {
    root.querySelectorAll('.bagui-item.has-item').forEach(el => {
      const uid = el.dataset.uid;
      el.addEventListener('pointerdown', (e) => this._onDown(e, uid, el));
      el.addEventListener('click', (e) => {
        if (!this._drag) {
          this.selectedUid = uid;
          const mx = e.clientX !== undefined ? e.clientX : 100;
          const my = e.clientY !== undefined ? e.clientY : 100;
          this._renderDetail(mx, my);
        }
      });
      el.addEventListener('dblclick', (e) => { e.preventDefault(); this._quickEquip(uid); });
    });
  }

  _quickEquip(uid) {
    const item = this.inv.items.get(uid);
    if (!item) return;

    // 如果是容器，双击打开
    if (item.innerGrid) {
      this.openedBagUid = uid;
      this.refresh();
      return;
    }

    let targetSlot = null;
    if (item.table === 'weapons') targetSlot = 'main';
    else if (item.table === 'helmetShell') targetSlot = 'helmetShell';
    else if (item.table === 'helmetVisor') targetSlot = 'helmetVisor';
    else if (item.table === 'helmetEar') targetSlot = 'helmetEar';
    else if (item.table === 'vestFiber') targetSlot = 'vestFiber';
    else if (item.table === 'vestPlate') targetSlot = 'vestPlate';
    else if (item.table === 'backpack') targetSlot = 'backpack';
    else if (item.table === 'chestRig') targetSlot = 'chestRig';
    
    if (targetSlot) {
      const r = this.inv.equip(targetSlot, uid);
      if (!r.ok) console.warn('[BagUI] 快速装备失败', uid, targetSlot, r.reason);
      else this.selectedUid = uid;
      this.refresh();
      return;
    }

    // 不穿的话，智能移动到包/胸挂
    const parent = this.inv.parentOf.get(uid);
    const targetC = (parent === 'c:stash') ? 'bag' : 'stash';
    const res = this.inv.addToContainer(targetC, uid);
    if (res.ok) {
      this.refresh();
    }
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

    if (def.desc) {
      html += `<div class="bagui-desc">${this._esc(this.engine.i18n.t(def.desc))}</div>`;
    }

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

    if (item.table === 'weapons') {
      if (!item.loaded) {
        const ammoType = def.ammoType || '9mm';
        item.loaded = { ammoType, qty: 0 };
      }
      const ammoDef = this.inv.content.get('ammo', item.loaded.ammoType);
      const ammoName = ammoDef ? this.engine.i18n.t(ammoDef.name) : item.loaded.ammoType;
      const magCap = def.mag || 0;
      const isFull = item.loaded.qty >= magCap;
      html += `<div class="bagui-ammo-row"><span>内置：${this._esc(ammoName)} × ${item.loaded.qty}/${magCap}</span><span style="display:flex;gap:4px">`;
      if (!isFull) html += `<button class="bagui-btn" data-action="load" data-uid="${uid}" style="margin:0;width:auto">装填</button>`;
      if (item.loaded.qty > 0) html += `<button class="bagui-btn" data-action="unload" data-uid="${uid}" style="margin:0;width:auto">扣下</button>`;
      html += `</span></div>`;
    }

    // 内部网格打开按钮
    if (item.innerGrid) {
      html += `<button class="bagui-btn" id="bagui-open-inner" data-uid="${uid}">打开内部网格 (${item.innerGrid.w}x${item.innerGrid.h})</button>`;
    }

    if (item.stackLimit > 1 && item.qty > 1) {
      const halfQty = Math.max(1, Math.floor(item.qty / 2));
      html += `<div style="display:flex;gap:4px;align-items:center;margin-top:8px;font-size:11px">
        <span>拆分</span>
        <input type="number" class="bagui-btn" style="width:60px;margin:0;text-align:center" min="1" max="${item.qty - 1}" value="${halfQty}" data-uid="${uid}">
        <button class="bagui-btn" style="margin:0;width:auto" data-split-btn="${uid}">执行</button>
      </div>`;
    }

    el.innerHTML = html;
    el.classList.add('on');

    if (mx !== undefined && my !== undefined) {
      el.style.left = Math.min(window.innerWidth - 300, mx + 18) + 'px';
      el.style.top = Math.min(window.innerHeight - 100, my + 18) + 'px';
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth - 8) el.style.left = Math.max(8, mx - rect.width - 18) + 'px';
        if (rect.bottom > window.innerHeight - 8) el.style.top = Math.max(8, my - rect.height - 18) + 'px';
      });
    }

    el.querySelectorAll('.bagui-btn[data-action="load"]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this._loadAmmo(btn.dataset.uid); };
    });
    el.querySelectorAll('.bagui-btn[data-action="unload"]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this._unloadAmmo(btn.dataset.uid); };
    });
    const openInner = document.getElementById('bagui-open-inner');
    if (openInner) {
      openInner.onclick = (e) => {
        e.stopPropagation();
        this.openedBagUid = openInner.dataset.uid;
        this.refresh();
      };
    }
    el.querySelectorAll('.bagui-btn[data-split-btn]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const splitUid = btn.dataset.splitBtn;
        const input = el.querySelector(`input[data-uid="${splitUid}"]`);
        if (!input) return;
        const count = parseInt(input.value, 10);
        if (isFinite(count) && count > 0) this._splitStack(splitUid, count);
      };
    });
  }

  _loadAmmo(weaponUid) {
    const item = this.inv.items.get(weaponUid);
    if (!item || item.table !== 'weapons' || !item.loaded) return;
    const def = this.inv.getDef(item);
    if (!def) return;
    const space = (def.mag || 0) - item.loaded.qty;
    if (space <= 0) return;
    const take = this._consumeAmmoFromAll(def.ammoType, space);
    if (take > 0) {
      item.loaded.qty += take;
      this.refresh();
    }
  }

  _consumeAmmoFromAll(ammoType, count) {
    const searchOrder = ['chest', 'pocket', 'bag', 'safe'];
    let remaining = count;
    for (const cName of searchOrder) {
      if (remaining <= 0) break;
      const c = this.inv.containers[cName];
      if (!c) continue;
      for (const uid of Array.from(c.items.keys())) {
        if (remaining <= 0) break;
        const it = this.inv.items.get(uid);
        if (!it || it.table !== 'ammo' || it.defId !== ammoType) continue;
        const take = Math.min(it.qty, remaining);
        it.qty -= take;
        remaining -= take;
        if (it.qty <= 0) this.inv.destroyItem(uid);
      }
    }
    return count - remaining;
  }

  _unloadAmmo(weaponUid) {
    const item = this.inv.items.get(weaponUid);
    if (!item || item.table !== 'weapons' || !item.loaded || item.loaded.qty <= 0) return;
    const ammoType = item.loaded.ammoType;
    const qty = item.loaded.qty;
    // ★ 修复价值漂移：继承武器的 valueMul
    const uid = this.inv.createItem('ammo', ammoType, { qty, lockValue: true, valueMul: item.valueMul });
    if (!uid) return;
    const targets = ['bag', 'chest', 'pocket', 'safe', 'stash'];
    let placed = false;
    for (const t of targets) {
      if (this.inv.addToContainer(t, uid).ok) { placed = true; break; }
    }
    if (!placed) {
      this.inv.destroyItem(uid);
      return;
    }
    item.loaded.qty = 0;
    this.refresh();
  }

  _splitStack(uid, count) {
    const origParent = this.inv.parentOf.get(uid);
    let preferred = null;
    if (origParent && origParent.startsWith('c:')) preferred = origParent.slice(2);
    const res = this.inv.splitStack(uid, count, preferred);
    if (!res.ok) {
      console.warn('[BagUI] 拆分失败', uid, count, res.reason);
      return;
    }
    this.selectedUid = uid;
    this.refresh();
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
      
      const ghost = this._drag.srcEl.cloneNode(true);
      ghost.classList.add('ghost');
      ghost.classList.remove('has-item');
      ghost.style.width = this._drag.srcEl.offsetWidth + 'px';
      ghost.style.height = this._drag.srcEl.offsetHeight + 'px';
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
      document.body.appendChild(ghost);
      
      this._drag.ghost = ghost;
      if (this._drag.srcEl) this._drag.srcEl.style.opacity = 0.3;
    }
    
    if (this._drag.ghost) {
      this._drag.ghost.style.left = e.clientX + 'px';
      this._drag.ghost.style.top = e.clientY + 'px';
    }

    // 高亮目标网格
    document.querySelectorAll('.bagui-grid-wrap').forEach(x => x.style.boxShadow = 'none');
    const tgt = document.elementFromPoint(e.clientX, e.clientY);
    if (tgt) {
      const wrap = tgt.closest('.bagui-grid-wrap');
      if (wrap) wrap.style.boxShadow = '0 0 10px #7bf5a8 inset';
    }
  }

  _onUp(e) {
    if (!this._drag) return;
    const moved = this._drag.moved;
    const uid = this._drag.uid;
    const srcEl = this._drag.srcEl;
    
    document.querySelectorAll('.bagui-grid-wrap').forEach(x => x.style.boxShadow = 'none');
    
    if (!moved) { this._cancelDrag(); return; }
    
    const px = (e.clientX !== undefined && e.clientX !== 0) ? e.clientX : this._drag.startX;
    const py = (e.clientY !== undefined && e.clientY !== 0) ? e.clientY : this._drag.startY;
    const tgt = document.elementFromPoint(px, py);
    this._cancelDrag();
    
    if (!tgt) { if (srcEl) srcEl.style.opacity = 1; return; }
    
    const wrap = tgt.closest('.bagui-grid-wrap');
    if (wrap) {
      const containerName = wrap.dataset.container;
      const rect = wrap.getBoundingClientRect();
      const clickX = px - rect.left;
      const clickY = py - rect.top;
      
      const item = this.inv.items.get(uid);
      let w = item.w, h = item.h;
      if (item.rotated) { const tmp = w; w = h; h = tmp; }
      
      // 计算目标格（鼠标对齐中心）
      let gx = Math.round((clickX - (w * CELL) / 2) / CELL);
      let gy = Math.round((clickY - (h * CELL) / 2) / CELL);

      let targetGrid = null;
      if (containerName.startsWith('inner:')) {
        const host = this.inv.items.get(containerName.slice(6));
        if (host) targetGrid = host.innerGrid;
      } else {
        targetGrid = this.inv.containers[containerName];
      }
      
      if (targetGrid) {
        // 尝试放到点击位置（保持旋转状态）
        const moveRes = this._placeAt(containerName, targetGrid, uid, gx, gy, item.rotated);
        if (!moveRes.ok) {
          // 如果不行，尝试反转
          const rw = item.rotated ? item.w : item.h;
          const rh = item.rotated ? item.h : item.w;
          let rgx = Math.round((clickX - (rw * CELL) / 2) / CELL);
          let rgy = Math.round((clickY - (rh * CELL) / 2) / CELL);
          const moveRes2 = this._placeAt(containerName, targetGrid, uid, rgx, rgy, !item.rotated);
          if (!moveRes2.ok) {
            // 再不行，就自动找位置
            this.inv.addToContainer(containerName, uid);
          }
        }
      }
    } else {
      // 丢在外面或者装备槽
      const equip = tgt.closest('.bagui-slot[data-src-type="equip"]');
      if (equip) {
        const slot = equip.dataset.srcSlot;
        this.inv._detach(uid);
        const r = this.inv.equip(slot, uid);
        if (!r.ok) console.warn('[BagUI] 装备失败', r.reason);
      }
    }
    
    this.refresh();
  }

  _placeAt(containerName, grid, uid, gx, gy, rotated) {
    const item = this.inv.items.get(uid);
    if (!item) return { ok: false };
    const w = rotated ? item.h : item.w;
    const h = rotated ? item.w : item.h;
    
    if (gx < 0 || gy < 0 || gx + w > grid.w || gy + h > grid.h) return { ok: false };
    
    // 检查区域是否为空（忽略自己）
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const occ = grid.slots.get((gx + dx) + ',' + (gy + dy));
        if (occ && occ !== uid) return { ok: false };
      }
    }

    // 先移除
    this.inv._detach(uid);
    // 占用
    this.inv._occupy(grid, uid, gx, gy, w, h, rotated);
    item.rotated = rotated;
    this.inv.parentOf.set(uid, containerName.startsWith('inner:') ? containerName : 'c:' + containerName);
    return { ok: true };
  }

  _cancelDrag() {
    if (this._drag && this._drag.ghost) this._drag.ghost.remove();
    if (this._drag && this._drag.srcEl) this._drag.srcEl.style.opacity = 1;
    document.querySelectorAll('.bagui-grid-wrap').forEach(x => x.style.boxShadow = 'none');
    this._drag = null;
  }

  _clearGhosts() {
    document.querySelectorAll('.bagui-ghost').forEach(g => { try { g.remove(); } catch (_) {} });
  }

  _renderCharPreview() {
    const host = document.getElementById('bagui-preview');
    if (!host) return;
    const charId = this.engine.app && this.engine.app.menuState ? this.engine.app.menuState.char : 'captain';
    const spec = this.engine.content.get('characters', charId);
    if (!spec) return;

    if (this._charPreviewRenderer) {
      try { this._charPreviewRenderer.dispose(); } catch (_) {}
      this._charPreviewRenderer = null;
    }

    const w = host.clientWidth || 200;
    const h = host.clientHeight || 240;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    this._charPreviewRenderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 1.6, 4.2);
    camera.lookAt(0, 1.15, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const key = new THREE.DirectionalLight(0xfff4e0, 1.4); key.position.set(3, 6, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.8); rim.position.set(-4, 3, -3); scene.add(rim);

    try {
      const mesh = this.engine.meshes.build('player', {
        color: spec.color !== undefined ? spec.color : 0x5a6b7c,
        radius: spec.radius || 1.2,
        prazer: spec.prazer || false,
        forceGlow: true,
      });
      scene.add(mesh);
    } catch (e) {}

    renderer.render(scene, camera);
    host.innerHTML = '';
    host.appendChild(renderer.domElement);
    renderer.domElement.style.maxWidth = '100%';
    renderer.domElement.style.maxHeight = '100%';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'position:absolute;bottom:8px;left:8px;right:8px;text-align:center;font-size:11px;color:#a8d8ff;letter-spacing:2px;text-shadow:0 1px 3px #000';
    nameEl.textContent = this.engine.i18n.t(spec.name);
    host.appendChild(nameEl);
  }
}
