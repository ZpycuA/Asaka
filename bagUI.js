/* ============================================================
   LaiAsaka Engine · Bag UI (Grid & Loot Edition)
   v2.3.0 · © 2026 ZpycuA · CC BY-NC 4.0
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
.bagui-right{flex:1.2;background:rgba(10,18,28,.5);border-radius:8px;position:relative}
.bagui-sec{margin-bottom:10px;background:rgba(20,32,46,.6);border-radius:6px;padding:8px;display:flex;flex-direction:column;align-items:center}
.bagui-sec h3{font-size:11px;letter-spacing:2px;color:#8fb0c8;margin:0 0 6px 0;display:flex;justify-content:space-between;width:100%;font-weight:600}
.bagui-cap{font-size:9px;color:#5c82a8}

.bagui-grid-wrap{position:relative;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;margin:0 auto}
.bagui-cell{position:absolute;border:1px solid rgba(255,255,255,.03);box-sizing:border-box;pointer-events:none}

.bagui-item{position:absolute;background:rgba(60,100,150,.4);border:1px solid rgba(110,180,255,.5);border-radius:4px;box-sizing:border-box;cursor:pointer;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
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

.bagui-item.ghost{position:fixed;z-index:9999;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.6);opacity:0.85}
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

.bagui-attach-title,.bagui-effects-title{font-size:10px;color:#8fb0c8;margin-top:8px;margin-bottom:4px;letter-spacing:2px}
.bagui-attach-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:4px}
.bagui-attach-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;background:rgba(10,18,28,.8);border:1px dashed rgba(80,125,175,.4);border-radius:6px;font-size:11px;transition:all 0.2s;cursor:pointer}
.bagui-attach-slot:hover{background:rgba(60,100,150,.4);border-color:rgba(120,190,255,.8)}
.bagui-attach-label{color:#5c82a8;font-size:9px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.bagui-attach-val{color:#a8d8ff;font-weight:700}
.bagui-attach-empty{color:#3a546d;font-style:italic}

.bagui-ammo-chain{display:flex;flex-direction:column;gap:3px;width:100%;margin:3px 0}
.bagui-ammo-chain-row{display:flex;justify-content:space-between;align-items:center;gap:4px;background:rgba(10,18,28,.72);border:1px solid rgba(80,125,175,.25);border-radius:4px;padding:2px 5px;min-height:22px}
.bagui-ammo-chain-name{font-size:10px;color:#cfe4f8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bagui-mini{width:auto;margin:0;padding:1px 6px;font-size:9px;line-height:1.5}
.bagui-btn{padding:4px 10px;font-size:11px;border-radius:4px;cursor:pointer;font-family:inherit;border:1px solid rgba(110,180,255,.4);background:rgba(60,100,150,.5);color:#cfe8ff;margin-top:8px;width:100%}
.bagui-btn:hover{background:rgba(80,150,220,.7)}
.bagui-btn.bagui-mini{width:auto;margin:0;padding:1px 6px;font-size:9px;line-height:1.5}
.bagui-empty{color:#5c82a8;text-align:center;padding:20px}
.bagui-toolbar{display:flex;gap:6px;margin-top:8px;padding:6px;background:rgba(10,18,28,.5);border-radius:6px;align-items:center;justify-content:space-between;flex-shrink:0}
.bagui-toolbar button{padding:5px 12px;font-size:11px;cursor:pointer;background:rgba(40,80,130,.7);border:1px solid rgba(110,180,255,.5);color:#cfe8ff;border-radius:5px;font-family:inherit}
.bagui-total{font-size:10px;color:#ffd93d;letter-spacing:1px;font-weight:700}
.bagui-preview{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,rgba(40,60,90,.6),rgba(10,18,28,.9));border-radius:8px;overflow:hidden}
.bagui-preview canvas{max-width:100%;max-height:100%;display:block}
.bagui-status{margin-top:8px;padding:8px;background:rgba(10,18,28,.5);border-radius:6px;font-size:10px;color:#5c82a8;text-align:center;letter-spacing:1px}

@media(max-width:768px){.bagui-main{flex-direction:column}.bagui-right{flex:0 0 280px;min-height:280px}}
`;

export class BagUI {
  constructor(engine, inventory) {
    this.engine = engine;
    this.inv = inventory;
    this.viewInv = inventory; 
    this.open = false;
    this.selectedUid = null;
    this.openedBagUid = null;
    this._drag = null;
    this._lootTarget = null;
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
    this.viewInv = this.inv;
    this._lootTarget = null;
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
    this._lootTarget = null;
    if (this.engine.app && this.engine.app.world && this.engine.app.world.running) {
  this.engine.app.world._syncWeaponsFromInventory();
    }
    if (this._charPreviewRenderer) {
      this._charPreviewRenderer.dispose();
      this._charPreviewRenderer = null;
    }
    if (this.engine.app && this.engine.app.world) {
      this.engine.app.world._closeSearch();
    }
  }

  openLoot(target) {
    if (document.pointerLockElement) document.exitPointerLock();
    this._lootTarget = target;
    this.viewInv = target.isCorpse ? target.lootInv : this.inv; // 普通容器时，viewInv 指向玩家，loot 数据在 inv.containers.loot
    this.open = true;
    this._clearGhosts();
    document.getElementById('bagui-overlay').classList.add('on');
    this.refresh();
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
    
    let label = '';
    if (this._lootTarget) {
      label = `正在搜刮：${this._lootTarget.label}`;
    } else {
      const p = this.engine.app && this.engine.app.world && this.engine.app.world.player;
      const w = this.inv.getCarryWeight();
      const lim = p ? (p.carryLimit || 24) : 24;
      const state = w > lim ? '超重' : (w > lim * 0.75 ? '负重' : '正常');
      const weightText = isInMatch ? ` · 负重 ${w.toFixed(1)}/${lim.toFixed(0)}kg（${state}）` : '';
      label = isInMatch ? `携带 ${carryVal} cp${weightText}` : `仓库 ${this.inv.getContainerValue('stash')} cp · 总值 ${totalVal} cp`;
    }
    
    let html = `<span class="bagui-total">${label}</span>`;
    if (!isInMatch && !this._lootTarget) {
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
    let html = '';
    
    const inv = this.inv; 
    const world = this.engine.app && this.engine.app.world;
    const mimicLock = !!(world && world.player && world.player._mimicLock);
    const mimicSlots = ['helmetShell', 'helmetVisor', 'vestFiber', 'vestPlate'];

    html += '<div class="bagui-sec"><h3>我的装备</h3><div class="bagui-grid-wrap" style="width:100%;height:auto;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;background:transparent;border:none">';
    const equipList = [
  ['main', '武器一'], ['side', '武器二'], ['melee', '近战'],
  ['helmetShell', '头盔'], ['helmetVisor', '面罩'], ['helmetEar', '耳机'],
  ['vestFiber', '护甲'], ['vestPlate', '插板'],
  ['backpack', '背包'], ['chestRig', '胸挂'],
];
    for (const [slot, label] of equipList) {
      // ★ 叶·拟载：护具槽显示当前生效的 BYinC 拟载装备（新数值）并锁定
      if (mimicLock && mimicSlots.includes(slot)) {
        const armorKey = { helmetShell: 'shell', helmetVisor: 'visor', vestFiber: 'fiber', vestPlate: 'plate' }[slot];
        const a = (world.player.armor && world.player.armor[armorKey]) || { lv: 7, dur: 520, max: 520 };
        const pct = Math.max(0, Math.min(100, (a.dur / (a.max || 520)) * 100));
        html += `<div class="bagui-slot has-item" data-mimic-slot="${slot}" style="width:60px;height:60px;background:linear-gradient(180deg,rgba(255,215,0,.22),rgba(60,45,10,.9));border:1px solid rgba(255,215,0,.85);border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;box-shadow:0 0 10px rgba(255,215,0,.35);cursor:not-allowed" title="BYinC 拟载护具 Lv${a.lv} · 原装备已锁定，${Math.round(pct)}% 耐久">
          <div style="font-size:14px;line-height:1">💎</div>
          <div style="font-size:8px;color:#ffe066;font-weight:700;white-space:nowrap">Lv${a.lv} BYinC</div>
          <div style="width:44px;height:3px;background:rgba(0,0,0,.65);border-radius:2px;overflow:hidden;margin-top:2px"><i style="display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#ffd700,#fff2a0)"></i></div>
          <div style="font-size:8px;color:#ffb0b0;margin-top:1px">🔒 ${Math.round(a.dur)}/${a.max || 520}</div>
        </div>`;
        continue;
      }
      html += this._equipSlotHtml(inv.equipped[slot], slot, label, inv);
    }
    html += '</div></div>';

    for (const name of ['chest', 'pocket', 'bag', 'safe']) {
      const c = inv.containers[name];
      if (!c || !c.isActive) continue;
      html += this._gridContainerHtml(name, this._cname(name), inv);
    }
    
    el.innerHTML = html;
    this._bindItemEvents(el);
  }

  _renderRight() {
    const el = document.getElementById('bagui-right');
    if (!el) return;
    
    if (this._lootTarget) {
      if (this._lootTarget.isCorpse) {
        const inv = this.viewInv;
        let html = '<div class="bagui-sec"><h3>敌人装备</h3><div class="bagui-grid-wrap" style="width:100%;height:auto;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;background:transparent;border:none">';
        const equipList = [
  ['main', '武器一'], ['side', '武器二'], ['melee', '近战'],
  ['helmetShell', '头盔'], ['helmetVisor', '面罩'], ['helmetEar', '耳机'],
  ['vestFiber', '护甲'], ['vestPlate', '插板'],
  ['backpack', '背包'], ['chestRig', '胸挂'],
];
        for (const [slot, label] of equipList) {
          html += this._equipSlotHtml(inv.equipped[slot], slot, label, inv);
        }
        html += '</div></div>';
        
        for (const name of ['chest', 'bag']) {
          const c = inv.containers[name];
          if (!c || !c.isActive) continue;
          html += this._gridContainerHtml(name, '敌人' + this._cname(name), inv);
        }
        el.innerHTML = html || '<div class="bagui-empty">无携带物品</div>';
        this._bindItemEvents(el);
        return;
      } else {
        const grid = this.inv.containers.loot;
        if (!grid) {
          el.innerHTML = '<div class="bagui-empty">空容器</div>';
          return;
        }
        let html = `<div class="bagui-sec"><h3>${this._lootTarget.label || '容器'}<span class="bagui-cap">${grid.w}x${grid.h}</span></h3>`;
        html += `<div class="bagui-grid-wrap" style="width:${grid.w * CELL}px;height:${grid.h * CELL}px;position:relative;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;margin:0 auto" data-container="loot">`;
        for (let y = 0; y < grid.h; y++) {
          for (let x = 0; x < grid.w; x++) {
            html += `<div class="bagui-cell" style="left:${x*CELL}px;top:${y*CELL}px;width:${CELL}px;height:${CELL}px"></div>`;
          }
        }
        for (const [uid, pos] of grid.items) {
          html += this._itemHtml(uid, pos, 'loot', this.inv);
        }
        html += `</div></div>`;
        el.innerHTML = html;
        this._bindItemEvents(el);
        return;
      }
    }

    if (this.openedBagUid) {
      const bag = this.viewInv.items.get(this.openedBagUid);
      if (bag && bag.innerGrid) {
        el.style.display = '';
        let html = `<div class="bagui-sec"><h3 style="cursor:pointer;color:var(--accent)" id="bagui-back-inner">← 返回</h3>`;
        html += `<h3>${this._esc(this.engine.i18n.t(this.viewInv.getDef(bag).name || bag.defId))} 的内部</h3>`;
        html += `<div class="bagui-grid-wrap" style="width:${bag.innerGrid.w * CELL}px;height:${bag.innerGrid.h * CELL}px;position:relative;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;margin:0 auto" data-container="inner:${bag.uid}">`;
        for (let y = 0; y < bag.innerGrid.h; y++) {
          for (let x = 0; x < bag.innerGrid.w; x++) {
            html += `<div class="bagui-cell" style="left:${x*CELL}px;top:${y*CELL}px;width:${CELL}px;height:${CELL}px"></div>`;
          }
        }
        for (const [uid, pos] of bag.innerGrid.items) {
          html += this._itemHtml(uid, pos, `inner:${bag.uid}`, this.viewInv);
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

    const isInMatch = this.engine.app && this.engine.app.world && this.engine.app.world.running;
    if (isInMatch) {
      el.style.display = '';
      el.innerHTML =
        '<div class="bagui-preview" id="bagui-preview" style="width:100%;height:100%;position:absolute;inset:0;background:transparent;"><div style="color:#5c82a8;font-size:11px;letter-spacing:2px;position:absolute;top:8px;left:8px;z-index:10">角色状态</div></div>' +
        '<div id="bagui-status-float" style="position:absolute;inset:0;pointer-events:none;z-index:5;"></div>';
      this._renderCharPreview();
      this._renderBagStatus();
      return;
    }

    el.style.display = '';
    let html = this._gridContainerHtml('stash', '仓库', this.viewInv);
    el.innerHTML = html;
    this._bindItemEvents(el);
  }

  _gridContainerHtml(name, label, inv = this.inv) {
    const c = inv.containers[name];
    if (!c || !c.isActive) return '';
    let html = `<div class="bagui-sec"><h3>${label}<span class="bagui-cap">${c.w}x${c.h}</span></h3>`;
    html += `<div class="bagui-grid-wrap" style="width:${c.w * CELL}px;height:${c.h * CELL}px;position:relative;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;margin:0 auto" data-container="${name}">`;
    for (let y = 0; y < c.h; y++) {
      for (let x = 0; x < c.w; x++) {
        html += `<div class="bagui-cell" style="left:${x*CELL}px;top:${y*CELL}px;width:${CELL}px;height:${CELL}px"></div>`;
      }
    }
    for (const [uid, pos] of c.items) {
      html += this._itemHtml(uid, pos, name, inv);
    }
    html += `</div></div>`;
    return html;
  }

  _equipSlotHtml(uid, slot, hint, inv = this.inv) {
    if (!uid) return `<div class="bagui-slot empty" data-src-type="equip" data-src-slot="${slot}" style="width:60px;height:60px;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;display:flex;align-items:center;justify-content:center;position:relative"><div class="bagui-name" style="color:#5c82a8;font-size:10px">${hint}</div></div>`;
    const item = inv.items.get(uid);
    if (!item) return `<div class="bagui-slot empty" data-src-type="equip" data-src-slot="${slot}"></div>`;
    const def = inv.getDef(item);
    const name = (item.damaged ? '[损坏] ' : '') + this.engine.i18n.t(def ? (def.name || def.n || '?') : '?');
    const rarity = item.rarity || 'L0';
    return `<div class="bagui-item has-item" data-uid="${uid}" data-rarity="${rarity}" data-src-type="equip" data-src-slot="${slot}" style="width:60px;height:60px;position:relative">
      <div class="bagui-item-icon">${this._icon(item, inv)}</div>
      <div class="bagui-item-name">${this._esc(name)}</div>
    </div>`;
  }

  _itemHtml(uid, pos, containerName, inv = this.inv) {
    const item = inv.items.get(uid);
    if (!item) return '';
    
    if (item.searched === false) {
      return `<div class="bagui-item has-item unsearched" data-uid="${uid}" data-container="${containerName}"
        style="left:${pos.x * CELL}px;top:${pos.y * CELL}px;width:${pos.w * CELL}px;height:${pos.h * CELL}px">
        <div class="bagui-item-icon" style="color:#5c82a8">?</div>
      </div>`;
    }

    const def = inv.getDef(item);
    const baseName = this.engine.i18n.t(def ? (def.name || def.n || '?') : '?');
    const name = item.damaged ? ('[损坏] ' + baseName) : baseName;
    const rarity = item.rarity || 'L0';
    const qty = item.qty > 1 ? `<span class="bagui-item-qty">×${item.qty}</span>` : '';
    const dur = item.durMax > 0 ? Math.round(item.dur / item.durMax * 100) : -1;
    const durBar = dur >= 0 ? `<div class="bagui-item-dur"><i style="width:${dur}%;background:${dur > 60 ? '#6fe07a' : dur > 30 ? '#ffd93d' : '#ff5a5a'}"></i></div>` : '';
    
    return `<div class="bagui-item has-item" data-uid="${uid}" data-rarity="${rarity}" data-container="${containerName}"
      style="left:${pos.x * CELL}px;top:${pos.y * CELL}px;width:${pos.w * CELL}px;height:${pos.h * CELL}px${item.damaged ? ';border-color:rgba(255,90,90,.65)' : ''}">
      <div class="bagui-item-icon">${this._icon(item, inv)}</div>
      <div class="bagui-item-name">${this._esc(name)}</div>
      ${qty}${durBar}
    </div>`;
  }

  _icon(item, inv = this.inv) {
    if (!item) return '?';
    const def = inv.getDef(item);
    if (def && def.icon) {
      const icon = String(def.icon);
      if (icon.startsWith('/') || icon.startsWith('http') || icon.startsWith('data:')) {
        return `<img src="${this._esc(icon)}" alt="" style="width:100%;height:100%;object-fit:contain">`;
      }
      return icon;
    }
    return {
      weapons: '🔫', ammo: '🔸', cons: '💊', nade: '💣', attach: '⚙', valuable: '💎', valuables: '💎', medical: '🩹',
      helmetShell: '⛑', helmetVisor: '🕶', helmetEar: '🎧',
      vestFiber: '🦺', vestPlate: '🛡', backpack: '🎒', chestRig: '🧥'
    }[item.table] || '?';
  }

  _cname(n) { return { chest: '胸挂', pocket: '口袋', bag: '背包', safe: '安全箱', stash: '仓库' }[n] || n; }
  _esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

  _bindItemEvents(root) {
    root.querySelectorAll('.bagui-item.has-item').forEach(el => {
      const uid = el.dataset.uid;
      
      el.addEventListener('dragstart', e => e.preventDefault());

      el.addEventListener('pointerdown', (e) => {
        const item = this.viewInv.items.get(uid) || this.inv.items.get(uid);
        if (item && item.searched === false) return;
        this._onDown(e, uid, el);
      });

      el.addEventListener('click', (e) => {
        const item = this.viewInv.items.get(uid) || this.inv.items.get(uid);
        if (item && item.searched === false) {
          e.stopPropagation();
          this._startSearchLoot(uid);
          return;
        }
        
        if (this._didDrag) {
          this._didDrag = false;
          return;
        }
        this.selectedUid = uid;
        const mx = e.clientX !== undefined ? e.clientX : 100;
        const my = e.clientY !== undefined ? e.clientY : 100;
        this._renderDetail(mx, my);
      });

      el.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const item = this.viewInv.items.get(uid) || this.inv.items.get(uid);
        if (item && item.searched === false) {
          this._startSearchLoot(uid);
          return;
        }
        this._quickEquip(uid);
      });
    });
  }

  _startSearchLoot(uid) {
    if (this._searchingItems && this._searchingItems[uid]) return;
    if (!this._searchingItems) this._searchingItems = {};
    this._searchingItems[uid] = true;
    
    const el = document.querySelector(`.bagui-item[data-uid="${uid}"]`);
    if (el) el.style.opacity = '0.6';
    
    setTimeout(() => {
      const item = this.viewInv.items.get(uid) || this.inv.items.get(uid);
      if (item) item.searched = true;
      this._searchingItems[uid] = false;
      this.refresh();
    }, 800);
  }

  _quickEquip(uid) {
  if (this._lootTarget) {
    if (this._lootTarget.isCorpse) {
      if (this.viewInv.items.has(uid)) {
        const item = this.viewInv.items.get(uid);
        // ★ 先尝试空装备槽，再胸挂、背包、口袋、安全箱
        if (item) {
          const equipSlot = this._findEmptyEquipSlot(item.table);
          if (equipSlot && this._equipAcrossInventories(this.viewInv, uid, equipSlot, this.inv)) return;
        }
        let moved = false;
        for (const t of ['chest', 'bag', 'pocket', 'safe']) {
          if (this.viewInv.transferItem(this.inv, uid, t).ok) { moved = true; break; }
        }
        if (moved) this.refresh();
        else alert('背包已满，无法拿取');
      }
      return;
    }

    const parent = this.inv.parentOf.get(uid);
    if (parent === 'c:loot') {
      let moved = false;
      for (const t of ['chest', 'bag', 'pocket', 'safe']) {
        if (this.inv.addToContainer(t, uid).ok) { moved = true; break; }
      }
      if (moved) this.refresh();
      else alert('背包已满，无法拿取');
    } else if (parent && parent.startsWith('c:')) {
      if (this.inv.addToContainer('loot', uid).ok) this.refresh();
    }
    return;
  }

  const item = this.inv.items.get(uid);
  if (!item) return;

  if (item.innerGrid) {
    this.openedBagUid = uid;
    this.refresh();
    return;
  }

  let targetSlot = null;
if (item.table === 'weapons') targetSlot = 'main';
else if (item.table === 'melee') targetSlot = 'melee';
else if (item.table === 'helmetShell') targetSlot = 'helmetShell';
  else if (item.table === 'helmetVisor') targetSlot = 'helmetVisor';
  else if (item.table === 'helmetEar') targetSlot = 'helmetEar';
  else if (item.table === 'vestFiber') targetSlot = 'vestFiber';
  else if (item.table === 'vestPlate') targetSlot = 'vestPlate';
  else if (item.table === 'backpack') targetSlot = 'backpack';
  else if (item.table === 'chestRig') targetSlot = 'chestRig';

  if (targetSlot) {
    // ★ 统一走装备逻辑，槽位已有装备时正确互换，而不是把旧装备变成脱挂幽灵
    if (this._handleEquipDrop(uid, targetSlot)) this.selectedUid = uid;
    else console.warn('[BagUI] 快速装备失败', uid, targetSlot);
    this.refresh();
    return;
  }

  const parent = this.inv.parentOf.get(uid);
  const targetC = (parent === 'c:stash') ? 'bag' : 'stash';
  const res = this.inv.addToContainer(targetC, uid);
  if (res.ok) this.refresh();
}

  _renderDetail(mx, my) {
    const el = document.getElementById('bagui-detail');
    if (!el) return;
    const uid = this.selectedUid;
    const inv = this.viewInv.items.has(uid) ? this.viewInv : this.inv;
    if (!uid || !inv.items.has(uid)) {
      el.classList.remove('on');
      el.innerHTML = '';
      return;
    }
    const item = inv.items.get(uid);
    const def = inv.getDef(item);
    if (!def) {
      el.classList.remove('on');
      return;
    }
    const world = this.engine.app ? this.engine.app.world : null;
    const inMatchNow = !!(world && world.running);
    const rawName = def.name || def.n || '?';
    const displayName = (item.damaged ? '[损坏] ' : '') + this.engine.i18n.t(rawName);
    const rarity = item.rarity || 'L0';
    let html = `<div class="bagui-detail-title"><span>${this._esc(displayName)}</span><span class="bagui-rarity-tag r-${rarity}">${rarity}</span></div>`;

    if (def.desc) {
      html += `<div class="bagui-desc">${this._esc(this.engine.i18n.t(def.desc))}</div>`;
    }
    if (item.category) {
      html += `<div style="color:#8fb0c8">分类：${this._esc(item.category)}</div>`;
    }
    if (item.damaged) {
      html += `<div style="color:#ff6a6a;font-weight:700">状态：电磁损坏（电子组件已失效，价值大幅降低）</div>`;
    } else if (item.electronics) {
      html += `<div style="color:#8fb0c8">电子属性：${item.empShielded ? '抗磁屏蔽' : '非抗磁（EMP 可损坏）'}</div>`;
    }

    const unitVal = inv.getItemValue(uid);
    if (item.qty > 1) {
      const unit = Math.round(unitVal / item.qty);
      html += `<div>数量：${item.qty} / ${item.stackLimit}（单价 ${unit} cp · 总价 ${unitVal} cp）</div>`;
    } else if (unitVal > 0) {
      html += `<div>价值：${unitVal} cp</div>`;
    }
    
    if (item.durMax > 0) {
      html += `<div>耐久：${Math.round(item.dur)}/${item.durMax}（${Math.round(item.dur / item.durMax * 100)}%）</div>`;
    }
    // ★ 重量：无论物品类型都显示，避免“详细属性里没有重量”
    const unitW = item.weight !== undefined ? item.weight : (def.weight || 0);
    const totalW = unitW * (item.qty || 1);
    html += `<div>重量：${unitW.toFixed(2)} kg${item.qty > 1 ? `（合计 ${totalW.toFixed(2)} kg）` : ''}</div>`;
    // ★ 弹药数值
    if (item.table === 'ammo') {
      const parts = [];
      if (def.caliber) parts.push('口径 ' + def.caliber);
      if (def.massG !== undefined) parts.push('弹头 ' + def.massG + 'g');
      if (def.v0 !== undefined) parts.push('初速 ' + def.v0 + 'm/s');
      if (def.pen !== undefined) parts.push('穿透 ' + def.pen);
      if (parts.length) html += `<div>${this._esc(parts.join(' · '))}</div>`;
    }
    if (item.table === 'nade') {
      const trig = def.trigger === 'impact' ? '压感式（撞击即爆）' : '保险式（拔销后倒计时）';
      const parts = [trig];
      if (def.fuse) parts.push('引信 ' + def.fuse + 's');
      if (def.radius) parts.push('半径 ' + def.radius + 'm');
      if (def.fragmentCount) parts.push('模拟破片 ' + def.fragmentCount + ' 枚');
      if (def.flashDuration) parts.push('失明基准 ' + def.flashDuration + 's');
      html += `<div>${this._esc(parts.join(' · '))}</div>`;
    }
    if (def.rpm) {
      html += `<div>射速 ${def.rpm} RPM · 弹匣 ${def.mag || '—'} · 换弹 ${def.reload || '—'}s</div>`;
    }
    if (item.table === 'weapons' || item.table === 'melee') {
      const stats = [];
      if (def.range) stats.push('有效射程 ' + def.range + 'm');
      if (def.handling !== undefined) stats.push('操控 ' + def.handling);
      if (def.stability !== undefined) stats.push('稳定 ' + def.stability);
      if (def.recoil !== undefined) stats.push('后坐 ' + def.recoil);
      if (def.adsSpread !== undefined) stats.push('开镜散布 ' + def.adsSpread);
      if (def.damage) stats.push('伤害 ' + def.damage + 'J');
      if (stats.length) html += `<div>${this._esc(stats.join(' · '))}</div>`;
    }
    // ★ 开火模式预览
    if (def.fireModes && def.fireModes.length) {
      const labels = { single: '单发', semi: '半自动', auto: '全自动', pump: '泵动' };
      const modeText = def.fireModes.map(m => labels[m] || m).join(' / ');
      html += `<div>开火模式：${this._esc(modeText)}</div>`;
    }
    // ★ 冲压（弹药额外穿透加成）与脚本层效果预览
    if (typeof def.impulse === 'number' && def.impulse > 0) {
      html += `<div>冲压：+${def.impulse} 穿透</div>`;
    }
    if (def.effects && def.effects.length) {
      const effNames = { incendiary: '燃烧', glassfiber: '玻纤滞留' };
      const effText = def.effects.map(e => (e && e.name ? e.name : (effNames[e] || e))).join(' · ');
      html += `<div>效果：${this._esc(effText)}</div>`;
    }

    if (item.table === 'weapons') {
      // 以弹链 queue 为唯一真相源；qty 只做缓存，不再用单发 ammoType 冒充全部子弹
      const norm = inv.normalizeLoaded(item);
      const magCap = norm ? norm.cap : (def.mag || 0);
      const queue = norm ? norm.loaded.queue : [];
      const groups = inv.getLoadedGroups(item);
      const total = queue.length;
      const nextAmmo = queue.length ? inv.content.get('ammo', queue[0]) : null;
      const nextName = nextAmmo ? this.engine.i18n.t(nextAmmo.name) : '空';
      const world = this.engine.app ? this.engine.app.world : null;
      const inMatchNow2 = !!(world && world.running);
      const canDirect = !inMatchNow2 || (world && world.training) || inv !== this.inv;
      const isReloading = world && world.actionProcess ? world.actionProcess.isRunning('reload') : false;
      const prefDef = item.loadedPreference ? inv.content.get('ammo', item.loadedPreference) : null;

      html += `<div class="bagui-ammo-row" style="align-items:flex-start;flex-direction:column;gap:3px">` +
        `<div style="display:flex;justify-content:space-between;width:100%"><span>弹链：<b>${total}</b> / ${magCap}</span><span style="color:#8fb0c8">下一发：${this._esc(nextName)}</span></div>` +
        (prefDef ? `<div style="font-size:9px;color:#ffd93d">首选弹药：${this._esc(this.engine.i18n.t(prefDef.name))}</div>` : '');

      if (groups.length === 0) {
        html += `<div style="color:#6f8fae;font-size:10px">弹匣为空</div>`;
      } else {
        html += `<div class="bagui-ammo-chain">`;
        for (const g of groups) {
          const ad = inv.content.get('ammo', g.ammoId);
          const an = ad ? this.engine.i18n.t(ad.name) : g.ammoId;
          html += `<div class="bagui-ammo-chain-row">
            <span class="bagui-ammo-chain-name">▮ ${this._esc(an)} <b>×${g.count}</b></span>
            <span style="display:flex;gap:3px">
              <button class="bagui-btn bagui-mini" data-action="unload-one" data-uid="${uid}" data-ammo="${this._esc(g.ammoId)}">取 1</button>
              <button class="bagui-btn bagui-mini" data-action="unload-type" data-uid="${uid}" data-ammo="${this._esc(g.ammoId)}">全取</button>
            </span>
          </div>`;
        }
        html += `</div>`;
        html += `<div style="display:flex;gap:4px;flex-wrap:wrap"><button class="bagui-btn bagui-mini" data-action="unload-all" data-uid="${uid}">全部扣下</button>`;
        if (isReloading && inv === this.inv) html += `<span style="color:#ffd93d;font-size:10px;align-self:center">换弹中…</span>`;
        html += `</div>`;
      }
      html += `</div>`;

      // 兼容口径的弹药列表：可以精确选择“装哪一种”，而不是按容器顺序瞎抓
      if (inv === this.inv || !inMatchNow2) {
        const avail = inv.listCompatibleAmmo(item);
        html += `<div class="bagui-attach-title">可用弹药 · 口径 ${this._esc(def.ammoType || '—')}</div>`;
        if (!avail.length) {
          html += `<div style="color:#6f8fae;font-size:10px">没有兼容弹药</div>`;
        } else {
          for (const a of avail) {
            const ad = inv.content.get('ammo', a.defId);
            const an = ad ? this.engine.i18n.t(ad.name) : a.defId;
            const srcUid = a.uids[0];
            html += `<div class="bagui-ammo-chain-row">
              <span class="bagui-ammo-chain-name">${this._esc(an)} <b>×${a.qty}</b></span>
              <span style="display:flex;gap:3px">`;
            if (canDirect) {
              html += `<button class="bagui-btn bagui-mini" data-action="load-one" data-uid="${uid}" data-ammo-uid="${srcUid}">装 1</button>
                <button class="bagui-btn bagui-mini" data-action="load-all" data-uid="${uid}" data-ammo-uid="${srcUid}">装满</button>`;
            } else {
              html += `<button class="bagui-btn bagui-mini" data-action="prefer" data-uid="${uid}" data-ammo="${this._esc(a.defId)}">设为首选</button>`;
            }
            html += `</span></div>`;
          }
          if (!canDirect) html += `<div style="color:#8fb0c8;font-size:9px">战局内不能直接改弹链；设为首选后按 R 换弹会优先装填该弹种。</div>`;
        }
      }
    }

    if (item.attachments) {
      html += '<div class="bagui-attach-title">配件槽（拖配件到此）</div><div class="bagui-attach-grid">';
      for (const slot of ['muzzle', 'sight', 'mag', 'grip']) {
        const aUid = item.attachments[slot];
        html += `<div class="bagui-attach-slot" data-weapon-uid="${uid}" data-attach-slot="${slot}">`;
        html += `<span class="bagui-attach-label">${slot}</span>`;
        if (aUid) {
          const aDef = inv.getDef(inv.items.get(aUid));
          const aRaw = aDef ? (aDef.name || aDef.n || '?') : '?';
          html += `<span class="bagui-attach-val">${this._esc(this.engine.i18n.t(aRaw))}</span>`;
        } else {
          html += '<span class="bagui-attach-empty">空</span>';
        }
        html += `</div>`;
      }
      html += '</div>';
    }

    if (item.effects && item.effects.length > 0) {
      html += '<div class="bagui-effects-title">效果</div><div class="bagui-effects">';
      for (const e of item.effects) {
        const name = typeof e === 'string' ? e : (e.name || e.id || '?');
        html += `<div class="bagui-effect-item">${this._esc(name)}</div>`;
      }
      html += '</div>';
    }

    if (item.innerGrid && inv === this.inv) {
      html += `<button class="bagui-btn" id="bagui-open-inner" data-uid="${uid}">打开内部网格 (${item.innerGrid.w}x${item.innerGrid.h})</button>`;
    }

    if (item.stackLimit > 1 && item.qty > 1 && inv === this.inv) {
      const halfQty = Math.max(1, Math.floor(item.qty / 2));
      html += `<div style="display:flex;gap:4px;align-items:center;margin-top:8px;font-size:11px">
        <span>拆分</span>
        <input type="number" class="bagui-btn" style="width:60px;margin:0;text-align:center" min="1" max="${item.qty - 1}" value="${halfQty}" data-uid="${uid}">
        <button class="bagui-btn" style="margin:0;width:auto" data-split-btn="${uid}">拆分</button>
      </div>`;
    }

    // ★ 投掷物：详情里给出明确的「手持 / 投掷」，不再出现含义不明的按钮
    if (item.table === 'nade' && inv === this.inv) {
      if (inMatchNow) {
        html += `<div style="display:flex;gap:6px;margin-top:8px">
          <button class="bagui-btn" data-nade-hold="${item.defId}" style="margin:0;flex:1;background:rgba(120,90,40,.75);border-color:rgba(255,200,90,.8);color:#ffe8b0">手持</button>
          <button class="bagui-btn" data-nade-throw="${item.defId}" style="margin:0;flex:1;background:rgba(170,60,30,.75);border-color:rgba(255,140,90,.8);color:#ffd8c0">立即投掷</button>
        </div>
        <div style="font-size:10px;color:#8fb0cc;margin-top:4px">手持后攻击键变为投掷：长按显示抛物线，松手掷出。</div>`;
      } else {
        html += `<div style="font-size:10px;color:#6f8fae;margin-top:8px">进入战局后可在详情中手持或投掷。</div>`;
      }
    }

    const isInStash = inv.parentOf.get(uid) === 'c:stash';
    const isInMatch = this.engine.app && this.engine.app.world && this.engine.app.world.running;
    if (isInStash && !isInMatch && inv === this.inv) {
      const sellValue = Math.floor(unitVal * 0.8);
      html += `<button class="bagui-btn" id="bagui-sell-btn" style="background:rgba(200,80,80,.6);border-color:rgba(255,100,100,.8);margin-top:8px">卖出 (${sellValue} cp)</button>`;
    }

    if (!isInMatch && inv === this.inv) {
      html += `<button class="bagui-btn" id="bagui-discard-btn" style="background:rgba(100,100,100,.5);border-color:rgba(200,200,200,.5)">丢弃物品</button>`;
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

    el.querySelectorAll('[data-action="load-one"]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this._loadAmmoFrom(btn.dataset.uid, btn.dataset.ammoUid, 1); };
    });
    el.querySelectorAll('[data-action="load-all"]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this._loadAmmoFrom(btn.dataset.uid, btn.dataset.ammoUid, Infinity); };
    });
    el.querySelectorAll('[data-action="unload-one"]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this._unloadAmmoFrom(btn.dataset.uid, btn.dataset.ammo, 1); };
    });
    el.querySelectorAll('[data-action="unload-type"]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this._unloadAmmoFrom(btn.dataset.uid, btn.dataset.ammo, Infinity); };
    });
    el.querySelectorAll('[data-action="unload-all"]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this._unloadAmmoFrom(btn.dataset.uid, null, Infinity); };
    });
    el.querySelectorAll('[data-action="prefer"]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this._preferAmmo(btn.dataset.uid, btn.dataset.ammo); };
    });
    // 兼容旧按钮
    el.querySelectorAll('[data-action="load"]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this._loadAmmo(btn.dataset.uid); };
    });
    el.querySelectorAll('[data-action="unload"]').forEach(btn => {
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
    el.querySelectorAll('.bagui-btn[data-nade-hold]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (!world || !world._selectThrowable) return;
        world._selectThrowable(btn.dataset.nadeHold);
        this.close();
      };
    });
    el.querySelectorAll('.bagui-btn[data-nade-throw]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (!world || !world._selectThrowable) return;
        world._selectThrowable(btn.dataset.nadeThrow);
        world._doThrowNow(world.player);
        this.close();
      };
    });

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

    const sellBtn = document.getElementById('bagui-sell-btn');
    if (sellBtn) {
      sellBtn.onclick = (e) => {
        e.stopPropagation();
        const currentVal = this.inv.getItemValue(uid);
        const sellVal = Math.floor(currentVal * 0.8);
        if (confirm(`确认卖出 ${displayName} 获得 ${sellVal} cp 吗？`)) {
          this.inv.destroyItem(uid);
          this.engine.save.data.credits = (this.engine.save.data.credits || 0) + sellVal;
          this.engine.save.save();
          this._deselectDetail();
          this.refresh();
        }
      };
    }

    const discardBtn = document.getElementById('bagui-discard-btn');
    if (discardBtn) {
      discardBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`确认丢弃 ${displayName}？`)) {
          this.inv.destroyItem(uid);
          this._deselectDetail();
          this.refresh();
        }
      };
    }
  }

 _loadAmmoFrom(weaponUid, ammoUid, count) {
  const inv = this.viewInv.items.has(weaponUid) ? this.viewInv : this.inv;
  const item = inv.items.get(weaponUid);
  const ammo = inv.items.get(ammoUid);
  if (!item || item.table !== 'weapons' || !ammo || ammo.table !== 'ammo') return;
  const norm = inv.normalizeLoaded(item);
  if (!norm) return;
  const world = this.engine.app ? this.engine.app.world : null;
  const inMatch = world && world.running;
  // 正常战局内不允许跳过换弹动作直接改弹链；靶场/仓库允许整理
  if (inMatch && !world.training && inv === this.inv) {
    const active = world.player && world.player.activeWeapon;
    if (!active || active.item !== item) {
      alert('战局内只能整理手持武器的弹链。');
      return;
    }
    const ad = inv.getDef(ammo);
    item.loadedPreference = ad ? ad.id : ammo.defId;
    world._startReload();
    this.refresh();
    return;
  }
  const targetDefId = ammo.defId;
  let srcUid = ammoUid;
  let remaining = count === Infinity ? Infinity : Math.max(1, count || 1);
  let moved = 0;
  while (remaining > 0) {
    const res = inv.loadAmmoFromItem(weaponUid, srcUid, remaining);
    if (!res.ok) {
      if (!moved) {
        const msg = { full: '弹匣已满', caliber: '口径不匹配', empty: '没有子弹' }[res.reason] || '装填失败';
        alert(msg);
        return;
      }
      break;
    }
    moved += res.taken;
    remaining -= res.taken;
    if (remaining <= 0) break;
    const next = inv.listCompatibleAmmo(item).find(g => g.defId === targetDefId);
    if (!next || !next.uids.length) break;
    srcUid = next.uids[0];
  }
  this.selectedUid = weaponUid;
  this.refresh();
}

 _unloadAmmoFrom(weaponUid, ammoId, count) {
  const inv = this.viewInv.items.has(weaponUid) ? this.viewInv : this.inv;
  const item = inv.items.get(weaponUid);
  if (!item || item.table !== 'weapons') return;
  const res = inv.unloadAmmo(weaponUid, ammoId || null, count === Infinity ? Infinity : Math.max(1, count || 1));
  if (!res.ok) {
    const msg = { empty: '弹匣已空', no_space: '背包/胸挂/口袋都放不下' }[res.reason] || '扣弹失败';
    alert(msg);
    return;
  }
  this.selectedUid = weaponUid;
  this.refresh();
}

 _preferAmmo(weaponUid, ammoDefId) {
  const inv = this.viewInv.items.has(weaponUid) ? this.viewInv : this.inv;
  const item = inv.items.get(weaponUid);
  if (!item || item.table !== 'weapons') return;
  item.loadedPreference = ammoDefId || null;
  const world = this.engine.app ? this.engine.app.world : null;
  const ad = ammoDefId ? inv.content.get('ammo', ammoDefId) : null;
  if (world) world._log('首选弹药：' + (ad ? this.engine.i18n.t(ad.name) : '自动'), 'y');
  this.refresh();
}

 _loadAmmo(weaponUid) {
  const inv = this.viewInv.items.has(weaponUid) ? this.viewInv : this.inv;
  const item = inv.items.get(weaponUid);
  if (!item || item.table !== 'weapons') return;
  const ammo = inv.listCompatibleAmmo(item)[0];
  if (!ammo || !ammo.uids.length) { alert('没有兼容弹药'); return; }
  this._loadAmmoFrom(weaponUid, ammo.uids[0], Infinity);
}

  _unloadAmmo(weaponUid) {
    this._unloadAmmoFrom(weaponUid, null, Infinity);
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
    const rect = el.getBoundingClientRect();
    this._drag = { 
      uid, 
      startX: e.clientX, 
      startY: e.clientY, 
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false, 
      ghost: null, 
      srcEl: el,
      pointerId: e.pointerId
    };
    if (el.setPointerCapture && e.pointerId !== undefined) {
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    }
  }

  _onMove(e) {
    if (!this._drag) return;
    if (this._drag.pointerId !== undefined && e.pointerId !== this._drag.pointerId) return;

    if (!this._drag.moved) {
      const dx = e.clientX - this._drag.startX, dy = e.clientY - this._drag.startY;
      if (dx * dx + dy * dy < 25) return;
      this._drag.moved = true;
      
      const ghost = this._drag.srcEl.cloneNode(true);
      ghost.classList.add('ghost');
      ghost.classList.remove('has-item');
      ghost.style.width = this._drag.srcEl.offsetWidth + 'px';
      ghost.style.height = this._drag.srcEl.offsetHeight + 'px';
      ghost.style.left = (e.clientX - this._drag.offsetX) + 'px';
      ghost.style.top = (e.clientY - this._drag.offsetY) + 'px';
      document.body.appendChild(ghost);
      
      this._drag.ghost = ghost;
      if (this._drag.srcEl) this._drag.srcEl.style.opacity = 0.3;
    }
    
    if (this._drag.ghost) {
      this._drag.ghost.style.left = (e.clientX - this._drag.offsetX) + 'px';
      this._drag.ghost.style.top = (e.clientY - this._drag.offsetY) + 'px';
    }

    document.querySelectorAll('.bagui-grid-wrap').forEach(x => x.style.boxShadow = 'none');
    const tgt = document.elementFromPoint(e.clientX, e.clientY);
    if (tgt) {
      const wrap = tgt.closest('.bagui-grid-wrap');
      if (wrap) wrap.style.boxShadow = '0 0 10px #7bf5a8 inset';
    }
  }

  _onUp(e) {
    if (!this._drag) return;
    if (this._drag.pointerId !== undefined && e.pointerId !== this._drag.pointerId) return;

    const moved = this._drag.moved;
    const uid = this._drag.uid;
    const srcEl = this._drag.srcEl;
    const offsetX = this._drag.offsetX;
    const offsetY = this._drag.offsetY;
    
    document.querySelectorAll('.bagui-grid-wrap').forEach(x => x.style.boxShadow = 'none');
    
    if (!moved) { 
      this._cancelDrag(); 
      return; 
    }

    this._didDrag = true;
    
    const px = e.clientX;
    const py = e.clientY;
    this._cancelDrag();
    
    if (px === undefined || py === undefined) {
      if (srcEl) srcEl.style.opacity = 1;
      return;
    }
    
    const tgt = document.elementFromPoint(px, py);
    if (!tgt) { 
      if (srcEl) srcEl.style.opacity = 1; 
      if (this.engine.app && this.engine.app.world && this.engine.app.world.running) {
        if (this.engine.app.world._dropItemToGround(uid)) {
          this.refresh();
          return;
        }
      }
      return; 
    }
    
    const wrap = tgt.closest('.bagui-grid-wrap');

    // 装备槽判定：左右两侧的装备槽分属不同 Inventory（左玩家 / 右尸体）
    const equipSlotEl = tgt.closest('.bagui-slot[data-src-type="equip"]') || tgt.closest('.bagui-item[data-src-type="equip"]');
    const equipSlot = equipSlotEl ? equipSlotEl.dataset.srcSlot : null;
    const targetItemEl = tgt.closest('.bagui-item');
    const targetUid = targetItemEl ? targetItemEl.dataset.uid : null;

    const srcInv = this.inv.items.has(uid)
      ? this.inv
      : (this.viewInv && this.viewInv.items.has(uid) ? this.viewInv : null);
    const srcItem = srcInv ? srcInv.items.get(uid) : null;

    // ★ 兼容装备槽：优先走装备逻辑（含玩家↔尸体双向交换），
    //   但不拦截"弹药拖到已装备武器上"这种快速装填。
    if (equipSlot && srcItem && this._checkSlotType(equipSlot, srcItem.table)) {
      const isRightSide = !!(this._lootTarget && this._lootTarget.isCorpse && tgt.closest('#bagui-right'));
      const equipTargetInv = isRightSide ? this.viewInv : this.inv;
      this._handleEquipDrop(uid, equipSlot, equipTargetInv);
      return;
    }

    // 快速交互（拖到武器或装备上的其他物品）
    if (targetUid && targetUid !== uid) {
      this._handleQuickInteract(uid, targetUid);
      return;
    }

    // 拖到不匹配的装备槽：直接拒绝，避免被误塞进别的容器
    if (equipSlot) {
      if (srcEl) srcEl.style.opacity = 1;
      return;
    }

    if (this._lootTarget) {
  const isOverRight = tgt.closest('#bagui-right');
  const isOverLeft = tgt.closest('#bagui-left');

  if (!this._lootTarget.isCorpse) {
    const parent = this.inv.parentOf.get(uid);
    const inLoot = parent === 'c:loot';
    const inPlayer = parent && (
      parent === 'c:bag' || parent === 'c:chest' || parent === 'c:pocket' ||
      parent === 'c:safe' || parent === 'c:stash' || parent.startsWith('eq:')
    );

    if (inPlayer && isOverRight) {
      if (wrap && wrap.dataset.container === 'loot') {
        const rect = wrap.getBoundingClientRect();
        let gx = Math.round((px - offsetX - rect.left) / CELL);
        let gy = Math.round((py - offsetY - rect.top) / CELL);
        const item = this.inv.items.get(uid);
        if (item) {
          let ok = this._placeAt('loot', this.inv.containers.loot, uid, gx, gy, item.rotated, this.inv).ok;
          if (!ok) ok = this._placeAt('loot', this.inv.containers.loot, uid, gx, gy, !item.rotated, this.inv).ok;
          if (!ok) ok = this.inv.addToContainer('loot', uid).ok;
          if (ok) { this.refresh(); return; }
        }
      }
      if (srcEl) srcEl.style.opacity = 1;
      return;
    }

    if (inLoot && isOverLeft) {
      if (wrap) {
        const containerName = wrap.dataset.container;
        const grid = this.inv.containers[containerName];
        if (grid) {
          const rect = wrap.getBoundingClientRect();
          let gx = Math.round((px - offsetX - rect.left) / CELL);
          let gy = Math.round((py - offsetY - rect.top) / CELL);
          const item = this.inv.items.get(uid);
          if (item) {
            let ok = this._placeAt(containerName, grid, uid, gx, gy, item.rotated, this.inv).ok;
            if (!ok) ok = this._placeAt(containerName, grid, uid, gx, gy, !item.rotated, this.inv).ok;
            if (!ok) ok = this.inv.addToContainer(containerName, uid).ok;
            if (ok) { this.refresh(); return; }
          }
        }
      }
      if (srcEl) srcEl.style.opacity = 1;
      return;
    }

    if (srcEl) srcEl.style.opacity = 1;
    return;
  }

  const isFromPlayerHere = this.inv.items.has(uid);
  if (isFromPlayerHere && isOverRight) {
    let moved = false;
    // ★ 胸挂优先、背包次之，最后口袋/安全箱，不再默认塞背包
    for (const t of ['chest', 'bag', 'pocket', 'safe']) {
      if (this.inv.transferItem(this.viewInv, uid, t).ok) { moved = true; break; }
    }
    if (moved) this.refresh();
    else if (srcEl) srcEl.style.opacity = 1;
  } else if (!isFromPlayerHere && isOverLeft) {
    let moved = false;
    for (const t of ['chest', 'bag', 'pocket', 'safe']) {
      if (this.viewInv.transferItem(this.inv, uid, t).ok) { moved = true; break; }
    }
    if (moved) this.refresh();
    else if (srcEl) srcEl.style.opacity = 1;
  } else {
    if (srcEl) srcEl.style.opacity = 1;
  }
  return;
}

    const inv = this.inv;
    if (wrap) {
      const containerName = wrap.dataset.container;
      const rect = wrap.getBoundingClientRect();
      
      const ghostLeft = px - offsetX;
      const ghostTop = py - offsetY;
      
      let gx = Math.round((ghostLeft - rect.left) / CELL);
      let gy = Math.round((ghostTop - rect.top) / CELL);

      const item = inv.items.get(uid);
      let targetGrid = null;
      if (containerName.startsWith('inner:')) {
        const host = inv.items.get(containerName.slice(6));
        if (host) targetGrid = host.innerGrid;
      } else {
        targetGrid = inv.containers[containerName];
      }
      
      if (targetGrid) {
        const currentParent = inv.parentOf.get(uid);
        const isSameContainer = (currentParent === containerName || (currentParent === 'c:' + containerName));
        const oldPos = targetGrid.items.get(uid);
        
        if (isSameContainer && oldPos && oldPos.x === gx && oldPos.y === gy) {
          return;
        }

        let ok = this._placeAt(containerName, targetGrid, uid, gx, gy, item.rotated, inv).ok;
        if (!ok) {
          ok = this._placeAt(containerName, targetGrid, uid, gx, gy, !item.rotated, inv).ok;
        }
        if (!ok) {
          ok = inv.addToContainer(containerName, uid).ok;
        }
        
        if (ok) {
          this.refresh();
        } else {
          if (srcEl) srcEl.style.opacity = 1;
        }
      } else {
        if (srcEl) srcEl.style.opacity = 1;
      }
    } else {
      if (srcEl) srcEl.style.opacity = 1;
    }
  }

_checkSlotType(slot, table) {
  const SLOT_TABLE = {
    main: 'weapons', side: 'weapons', melee: 'melee',
    helmetShell: 'helmetShell', helmetVisor: 'helmetVisor', helmetEar: 'helmetEar',
    vestFiber: 'vestFiber', vestPlate: 'vestPlate',
    backpack: 'backpack', chestRig: 'chestRig',
  };
  // ★ 与 Inventory.EQUIP_TABLE 保持一致：melee 槽允许刀或手枪
  if (slot === 'melee') return table === 'melee' || table === 'weapons';
  return SLOT_TABLE[slot] === table;
}

  // 找出玩家身上当前为空的、可容纳该物品的装备槽
  _findEmptyEquipSlot(table) {
    const candidates =
      table === 'weapons' ? ['main', 'side'] :
      table === 'melee' ? ['melee'] :
      (table === 'helmetShell' || table === 'helmetVisor' || table === 'helmetEar' ||
       table === 'vestFiber' || table === 'vestPlate' || table === 'backpack' || table === 'chestRig')
        ? [table] : [];
    for (const slot of candidates) {
      if (!this.inv.equipped[slot] && this._checkSlotType(slot, table)) return slot;
    }
    return null;
  }

_swapEquipmentSlots(inv, srcSlot, dstSlot) {
  const srcUid = inv.equipped[srcSlot];
  const dstUid = inv.equipped[dstSlot];

  if (srcUid) {
    const srcItem = inv.items.get(srcUid);
    if (srcItem && !this._checkSlotType(dstSlot, srcItem.table)) return false;
  }
  if (dstUid) {
    const dstItem = inv.items.get(dstUid);
    if (dstItem && !this._checkSlotType(srcSlot, dstItem.table)) return false;
  }

  inv.unequip(srcSlot);
  if (dstUid) inv.unequip(dstSlot);

  if (srcUid) inv.equip(dstSlot, srcUid);
  if (dstUid) inv.equip(srcSlot, dstUid);

  return true;
}


  _handleEquipDrop(uid, slot, targetInv) {
    targetInv = targetInv || this.inv;
    // ★ 叶·拟载：被拟载覆盖的护具槽位锁定（只能查看，不能替换）
    const world = this.engine.app && this.engine.app.world;
    const pl = world && world.player;
    if (pl && pl._mimicLock && ['helmetShell', 'helmetVisor', 'vestFiber', 'vestPlate'].includes(slot)) {
      if (world._log) world._log('拟载护具锁定，无法替换', 'y');
      return false;
    }
    const srcInv = this.inv.items.has(uid)
      ? this.inv
      : (this.viewInv && this.viewInv.items.has(uid) ? this.viewInv : null);
    if (!srcInv) return false;

    const item = srcInv.items.get(uid);
    if (!item) return false;
    if (!this._checkSlotType(slot, item.table)) return false;

    if (srcInv === targetInv) {
      if (srcInv.parentOf.get(uid) === 'eq:' + slot) return false;
      return this._equipWithinInventory(srcInv, uid, slot);
    }

    return this._equipAcrossInventories(srcInv, uid, slot, targetInv);
  }

  // 同一个 Inventory 内的装备/换槽
  _equipWithinInventory(inv, uid, slot) {
    const currentParent = inv.parentOf.get(uid);
    if (currentParent === 'eq:' + slot) return false;

    if (currentParent && currentParent.startsWith('eq:')) {
      const srcSlot = currentParent.slice(3);
      // 槽位互换：类型不匹配时 _swapEquipmentSlots 不会改动任何数据
      if (!this._swapEquipmentSlots(inv, srcSlot, slot)) return false;
      this.refresh();
      return true;
    }

    const originalParent = currentParent;
    const origPos = originalParent && originalParent.startsWith('c:')
      ? inv.containers[originalParent.slice(2)].items.get(uid)
      : null;
    const prevUid = inv.equipped[slot] || null;

    // ★ 先把待装备物品从原容器摘下，再卸旧装备：
    //   背包/胸挂作为装备槽时，卸下会替换 containers.bag/chest 的引用，
    //   顺序反了会让 _detach 在新容器里找不到物品，留下幽灵占格。
    inv._detach(uid);
    if (prevUid) inv.unequip(slot);

    const r = inv.equip(slot, uid);

    if (!r.ok) {
      // ★ 装备失败必须回滚，否则物品会脱挂消失
      if (prevUid && inv.items.get(prevUid)) inv.equip(slot, prevUid);
      if (originalParent) this._restoreTo(uid, originalParent);
      else inv.addToContainer('stash', uid);
      this.refresh();
      return false;
    }

    const swappedUid = r.swapped || prevUid;
    if (swappedUid && inv.items.get(swappedUid)) {
      let placed = false;
      let cName = null;
      let grid = null;
      const slotContainer = slot === 'backpack' ? 'bag' : (slot === 'chestRig' ? 'chest' : null);

      if (slotContainer && prevUid && originalParent === 'c:' + slotContainer) {
        // 把换下来的旧背包/胸挂放进刚装备上的新容器里
        cName = slotContainer;
        grid = inv.containers[slotContainer];
      } else if (originalParent && originalParent.startsWith('c:')) {
        cName = originalParent.slice(2);
        grid = inv.containers[cName];
      }

      if (cName && grid) {
        if (origPos) {
          if (this._placeAt(cName, grid, swappedUid, origPos.x, origPos.y, origPos.rotated, inv).ok) placed = true;
        }
        if (!placed && inv.addToContainer(cName, swappedUid).ok) placed = true;
      }
      if (!placed) {
        // 胸挂优先、背包次之，最后仓库
        for (const t of ['chest', 'bag', 'stash']) {
          if (inv.addToContainer(t, swappedUid).ok) { placed = true; break; }
        }
      }
      if (!placed) {
        inv.unequip(slot);
        if (prevUid && inv.items.get(prevUid)) inv.equip(slot, prevUid);
        if (originalParent) this._restoreTo(uid, originalParent);
        else inv.addToContainer('stash', uid);
        this.refresh();
        return false;
      }
    }

    this.refresh();
    return true;
  }

  // ★ 跨 Inventory 装备（玩家 ↔ 尸体）：双向交换，失败时尽量回滚
  _equipAcrossInventories(srcInv, uid, slot, dstInv) {
    if (!srcInv || !dstInv || srcInv === dstInv) return false;
    const item = srcInv.items.get(uid);
    if (!item || !this._checkSlotType(slot, item.table)) return false;

    const srcParent = srcInv.parentOf.get(uid);
    const srcSlot = srcParent && srcParent.startsWith('eq:') ? srcParent.slice(3) : null;
    const dstUid = dstInv.equipped[slot] || null;
    const dstItem = dstUid ? dstInv.items.get(dstUid) : null;

    // 目标槽位旧物品的去处：优先源槽位（真正的交换），否则胸挂/背包/口袋/安全箱
    let backSlot = null;
    let backContainer = null;
    if (dstItem) {
      if (srcSlot && this._checkSlotType(srcSlot, dstItem.table)) {
        backSlot = srcSlot;
      } else {
        for (const cName of ['chest', 'bag', 'pocket', 'safe']) {
          const c = srcInv.containers[cName];
          if (!c || !c.isActive) continue;
          if (srcInv._findSlot(c, dstItem.w, dstItem.h, false)) { backContainer = cName; break; }
        }
        // 双向都放不下：整体取消，不能先拆再丢
        if (!backContainer) return false;
      }
    }

    const originalParent = srcParent;
    const originalContainer = srcParent && srcParent.startsWith('c:')
      ? srcParent.slice(2)
      : (srcParent && srcParent.startsWith('inner:') ? srcParent : null);

    // 同一个槽位互换：先把源槽腾空（背包/胸挂的内部物品会正确回挂）
    if (dstItem && backSlot) srcInv.unequip(backSlot);

    const r = srcInv.transferItem(dstInv, uid, 'eq:' + slot);
    if (!r.ok) {
      if (dstItem && backSlot && srcInv.items.get(uid)) srcInv.equip(backSlot, uid);
      this.refresh();
      return false;
    }

    if (dstItem && r.swapped) {
      let back = { ok: false };
      if (backSlot) {
        back = dstInv.transferItem(srcInv, r.swapped, 'eq:' + backSlot);
      } else {
        back = dstInv.transferItem(srcInv, r.swapped, backContainer);
        if (!back.ok) {
          for (const cName of ['chest', 'bag', 'pocket', 'safe']) {
            if (backContainer && cName === backContainer) continue;
            back = dstInv.transferItem(srcInv, r.swapped, cName);
            if (back.ok) break;
          }
        }
      }

      if (!back.ok) {
        // 回滚：把刚搬过去的新物品搬回来，再把目标槽位旧物品装回去
        let rb = { ok: false };
        if (backSlot) rb = dstInv.transferItem(srcInv, r.newUid, 'eq:' + backSlot);
        if (!rb.ok) {
          const order = originalContainer
            ? [originalContainer, 'chest', 'bag', 'pocket', 'safe']
            : ['chest', 'bag', 'pocket', 'safe'];
          for (const t of order) {
            rb = dstInv.transferItem(srcInv, r.newUid, t);
            if (rb.ok) break;
          }
        }
        if (rb.ok && dstInv.items.get(r.swapped)) {
          dstInv.equip(slot, r.swapped);
        }
        this.refresh();
        return false;
      }
    }

    this.refresh();
    return true;
  }

  _handleQuickInteract(uid, targetUid) {
  const inv = this.inv;
  const item = inv.items.get(uid);
  const target = inv.items.get(targetUid);
  if (!item || !target) return;

  if (item.table === 'ammo' && target.table === 'weapons') {
    const def = inv.getDef(target);
    const ammoDef = inv.getDef(item);
    if (def && ammoDef && def.ammoType === ammoDef.caliber) {
      // ★ 战局内把子弹拖进手持武器 → 走换弹动作（吃换弹时间惩罚），
      //   避免绕过 realisticReload / 换弹打断等机制。
      const world = this.engine.app && this.engine.app.world;
      if (world && world.running && inv === this.inv) {
        const cw = world.currentWeapon;
        if (cw && !cw.isFist && !(cw.def && cw.def.melee) && cw.item === target) {
          world._startReload();
          return;
        }
      }
      // 仓库 / 非手持武器：直接压弹
      const space = (def.mag || 0) - target.loaded.qty;
      if (space > 0) {
        const take = Math.min(item.qty, space);
        for (let i = 0; i < take; i++) target.loaded.queue.push(item.defId);
        target.loaded.qty += take;
        item.qty -= take;
        if (item.qty <= 0) inv.destroyItem(uid);
        this.refresh();
        return;
      }
    }
  }

  const targetParent = inv.parentOf.get(targetUid);
  const srcParent = inv.parentOf.get(uid);

  // ★ 同种可堆叠物（弹药等）拖到同种堆上：直接合并数量，不交换位置
  if (item.table === target.table && item.defId === target.defId && (target.stackLimit || 1) > 1) {
    const limit = target.stackLimit || 1;
    const space = limit - target.qty;
    if (space > 0) {
      const take = Math.min(item.qty, space);
      target.qty += take;
      item.qty -= take;
      if (item.qty <= 0) inv.destroyItem(uid);
      this.refresh();
      return;
    }
  }

  if (item.table === target.table) {
    if (targetParent && targetParent.startsWith('eq:')) {
      const targetSlot = targetParent.slice(3);
      if (this._checkSlotType(targetSlot, item.table)) {
        this._handleEquipDrop(uid, targetSlot);
        return;
      }
    }

    if (targetParent && targetParent.startsWith('c:')) {
      const cName = targetParent.slice(2);
      const grid = inv.containers[cName];
      if (!grid) return;
      const targetPos = grid.items.get(targetUid);
      if (!targetPos) return;

      if (srcParent && srcParent.startsWith('eq:')) {
        const srcSlot = srcParent.slice(3);
        if (this._checkSlotType(srcSlot, target.table)) {
          inv.unequip(srcSlot);
          inv._detach(targetUid);
          inv.equip(srcSlot, targetUid);
          this._placeAt(cName, grid, uid, targetPos.x, targetPos.y, targetPos.rotated, inv);
          this.refresh();
          return;
        }
      }

      if (srcParent && srcParent.startsWith('c:')) {
        const srcCName = srcParent.slice(2);
        const srcGrid = inv.containers[srcCName];
        if (!srcGrid) return;
        const srcPos = srcGrid.items.get(uid);
        if (!srcPos) return;

        if (this._swapGridItems(inv, uid, srcCName, srcPos, targetUid, cName, targetPos)) {
          this.refresh();
          return;
        }
      }
    }
  }

  if (target.innerGrid) {
    const r = inv.addToContainer(`inner:${targetUid}`, uid);
    if (r.ok) this.refresh();
  }
}

_swapGridItems(inv, uidA, cNameA, posA, uidB, cNameB, posB) {
  const itemA = inv.items.get(uidA);
  const itemB = inv.items.get(uidB);
  const gridA = inv.containers[cNameA];
  const gridB = inv.containers[cNameB];
  if (!itemA || !itemB || !gridA || !gridB) return false;

  const aFitsInPosA = (itemB.w <= posA.w && itemB.h <= posA.h) ||
                      (itemB.w <= posA.h && itemB.h <= posA.w);
  const bFitsInPosB = (itemA.w <= posB.w && itemA.h <= posB.h) ||
                      (itemA.w <= posB.h && itemA.h <= posB.w);

  if (!aFitsInPosA || !bFitsInPosB) return false;

  inv._vacate(gridA, uidA);
  inv._vacate(gridB, uidB);

  const bRotated = (itemB.w > posA.w || itemB.h > posA.h);
  const bw = bRotated ? itemB.h : itemB.w;
  const bh = bRotated ? itemB.w : itemB.h;
  inv._occupy(gridA, uidB, posA.x, posA.y, bw, bh, bRotated);
  itemB.rotated = bRotated;
  inv.parentOf.set(uidB, 'c:' + cNameA);

  const aRotated = (itemA.w > posB.w || itemA.h > posB.h);
  const aw = aRotated ? itemA.h : itemA.w;
  const ah = aRotated ? itemA.w : itemA.h;
  inv._occupy(gridB, uidA, posB.x, posB.y, aw, ah, aRotated);
  itemA.rotated = aRotated;
  inv.parentOf.set(uidA, 'c:' + cNameB);

  return true;
}

  _placeAt(containerName, grid, uid, gx, gy, rotated, inv) {
    inv = inv || (grid === this.inv.containers.loot ? this.inv : this.viewInv);
    const item = inv.items.get(uid);
    if (!item) return { ok: false };
    
    const parentPath = containerName.startsWith('inner:') ? containerName : 'c:' + containerName;
    
    if (containerName === 'inner:' + uid || inv.wouldCreateCycle(uid, parentPath)) {
      return { ok: false };
    }

    const w = rotated ? item.h : item.w;
    const h = rotated ? item.w : item.h;
    
    if (gx < 0) gx = 0;
    if (gy < 0) gy = 0;
    if (gx + w > grid.w) gx = grid.w - w;
    if (gy + h > grid.h) gy = grid.h - h;
    if (gx < 0 || gy < 0) return { ok: false };
    
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const occ = grid.slots.get((gx + dx) + ',' + (gy + dy));
        if (occ && occ !== uid) return { ok: false };
      }
    }

    inv._detach(uid);
    inv._occupy(grid, uid, gx, gy, w, h, rotated);
    item.rotated = rotated;
    inv.parentOf.set(uid, containerName.startsWith('inner:') ? containerName : 'c:' + containerName);
    return { ok: true };
  }

  _restoreTo(uid, parent) {
    if (!parent) { this.inv.addToContainer('stash', uid); return; }
    if (parent.startsWith('eq:')) { this.inv.equip(parent.slice(3), uid); return; }
    if (parent.startsWith('c:')) {
      if (this.inv.addToContainer(parent.slice(2), uid).ok) return;
    }
    if (parent.startsWith('inner:')) {
      if (this.inv.addToContainer(parent, uid).ok) return;
    }
    const p = this.inv.items.get(parent);
    if (p && p.attachments) {
      for (const k in p.attachments) if (!p.attachments[k]) if (this.inv.attachTo(parent, k, uid).ok) return;
    }
    if (p && p.subSlots) {
      for (const k in p.subSlots) if (!p.subSlots[k]) if (this.inv.attachToSubSlot(parent, k, uid).ok) return;
    }
    this.inv.addToContainer('stash', uid);
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
    this._charPreviewCamera = null;
    this._charPreviewW = w;
    this._charPreviewH = h;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 1.2, 6.5);
    camera.lookAt(0, 1.0, 0);
    this._charPreviewCamera = camera;

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

  _renderBagStatus() {
    const el = document.getElementById('bagui-status-float');
    if (!el) return;
    const p = this.engine.app.world.player;
    if (!p || !p.status) return;

    const partCoords3D = {
      head: 2.1,
      thorax: 1.6,
      abdomen: 1.15,
      larm: 1.55,
      legs: 0.5
    };
    
    if (!this._charPreviewCamera || !this._charPreviewW) {
       el.innerHTML = '';
       return;
    }

    const partNames = { head: '头', thorax: '胸', abdomen: '腹', larm: '臂', legs: '腿' };
    // 每个部位的标签偏移：避免胸/臂投影几乎同高时粘在一起
    const offsets = { head: [12, -4], thorax: [12, 0], abdomen: [12, 8], larm: [44, -20], legs: [12, 12] };
    let html = '';

    for (const pt in partCoords3D) {
      const d = p.status.parts[pt];
      if (!d) continue;

      const y3D = partCoords3D[pt];
      const v = new THREE.Vector3(0, y3D, 0);
      v.project(this._charPreviewCamera);
      
      const x = (v.x * 0.5 + 0.5) * this._charPreviewW;
      const y = (-v.y * 0.5 + 0.5) * this._charPreviewH;

      // 受伤程度只看部位剩余耐久，不再把骨折混进程度文字
      const ratio = Math.max(0, d.hp) / d.maxHp;
      let degree = '完好';
      if (d.hp <= 0) degree = '致命';
      else if (ratio < 0.2) degree = '重伤';
      else if (ratio < 0.5) degree = '中伤';
      else if (ratio < 0.8) degree = '轻伤';

      // 附加状态用图标表示（骨折是状态，不是程度）
      const chips = [];
      if (d.fracture > 0) chips.push('🦴');
      const wc = (d.wounds && d.wounds.length) || 0;
      if (wc > 0) chips.push('🩸' + wc);

      let pColor = '#5fd47a';
      if (d.hp <= 0) pColor = '#ff3030';
      else if (d.hp < d.maxHp * 0.5) pColor = '#ff8b7b';
      else if (d.hp < d.maxHp * 0.8) pColor = '#ffd93d';

      const [ox, oy] = offsets[pt] || [12, 0];
      html += `<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(${ox}px, calc(-50% + ${oy}px));background:rgba(10,18,30,0.88);padding:2px 8px;border-radius:4px;border-left:3px solid ${pColor};color:${pColor};font-size:11px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);">
        ${partNames[pt]} ${degree}${chips.length ? ' ' + chips.join(' ') : ''}
      </div>`;
    }
    el.innerHTML = html;
  }
}
