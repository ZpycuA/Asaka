/* ============================================================
   LaiAsaka Engine · Bag UI (Grid & Loot Edition)
   v2.3.0 · © 2026 ZpycuA · 游戏代码 Apache-2.0 · 游戏资产 CC BY-NC 4.0
   ============================================================ */

import * as THREE from 'three'
import { WEAPON_ATTACH_SLOTS } from './inventory.js'

const CELL = 48;

const CSS = `
#bagui-overlay{position:fixed;inset:0;z-index:500;background:rgba(4,8,14,.94);display:none;flex-direction:column;font-family:-apple-system,"PingFang SC",sans-serif;color:#d8e2ee;padding:12px;box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#bagui-overlay.on{display:flex}
#bagui-toast{position:fixed;left:50%;top:14%;transform:translate(-50%,-8px);z-index:1200;max-width:min(86vw,520px);padding:9px 16px;border-radius:8px;background:rgba(18,28,40,.96);border:1px solid rgba(255,210,90,.75);color:#ffe8b0;font-size:12px;line-height:1.6;text-align:center;box-shadow:0 8px 28px rgba(0,0,0,.6);opacity:0;transition:opacity .18s,transform .18s;pointer-events:none;white-space:normal}
#bagui-toast.on{opacity:1;transform:translate(-50%,0)}
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
.bagui-item-durpct{position:absolute;bottom:4px;left:4px;font-size:9px;font-weight:800;letter-spacing:.3px;pointer-events:none;text-shadow:0 1px 2px #000;background:rgba(0,0,0,.62);padding:0 3px;border-radius:2px}
.bagui-item-durpct.upper{bottom:16px;color:#9fd8ff}
.bagui-item.has-dur .bagui-item-name{left:36px;right:2px;text-align:right}
.bagui-item-sublv{position:absolute;top:2px;left:3px;font-size:9px;pointer-events:none;filter:drop-shadow(0 1px 2px #000)}

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
.bagui-attach-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
.bagui-attach-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 2px;min-width:0;background:rgba(10,18,28,.8);border:1px dashed rgba(80,125,175,.4);border-radius:6px;font-size:11px;transition:all 0.2s;cursor:pointer}
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
.bagui-toolbar button.bagui-sell{background:rgba(120,70,30,.75);border-color:rgba(255,190,100,.7);color:#ffe8c8}
.bagui-item.sell-select{cursor:crosshair;box-shadow:0 0 0 1px rgba(255,217,61,.18) inset}
.bagui-item.sell-selected{outline:2px solid #ffd93d;outline-offset:-2px;box-shadow:0 0 12px rgba(255,217,61,.35) inset}
.bagui-sell-check{position:absolute;right:2px;bottom:2px;width:14px;height:14px;border-radius:3px;background:rgba(0,0,0,.72);border:1px solid rgba(255,217,61,.6);color:#ffd93d;font-size:10px;line-height:13px;text-align:center;pointer-events:none}
.bagui-total{font-size:10px;color:#ffd93d;letter-spacing:1px;font-weight:700}
.bagui-preview{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,rgba(40,60,90,.6),rgba(10,18,28,.9));border-radius:8px;overflow:hidden}
.bagui-preview canvas{max-width:100%;max-height:100%;display:block}
.bagui-status{margin-top:8px;padding:8px;background:rgba(10,18,28,.5);border-radius:6px;font-size:10px;color:#5c82a8;text-align:center;letter-spacing:1px}

/* ★ 尸体 Praze 栏：3D 破碎 Assee 核心预览 + 等级/条件/吸收按钮 */
.bagui-praze{background:radial-gradient(circle at 50% 35%,rgba(80,20,110,.65),rgba(16,10,26,.95));border:1px solid rgba(190,100,255,.55);box-shadow:0 0 18px rgba(150,50,255,.22) inset;align-items:stretch}
.bagui-praze h3{color:#dcb8ff;letter-spacing:2px}
.bagui-praze-row{display:flex;flex-direction:column;gap:8px;align-items:center;width:100%}
.bagui-praze-canvas-wrap{position:relative;flex:0 0 176px;width:176px;height:176px;border-radius:8px;background:radial-gradient(circle at 50% 55%,rgba(120,40,160,.35),rgba(2,4,10,.9));border:1px solid rgba(160,90,230,.35);overflow:hidden}
.bagui-praze-canvas-wrap canvas{width:100%;height:100%;display:block}
.bagui-praze-info{flex:1;min-width:0;width:100%;font-size:11px;line-height:1.65;color:#cfc2e8;text-align:center}
.bagui-praze-info b{color:#f0deff}
.bagui-praze-band{display:inline-block;padding:0 6px;margin-left:4px;border-radius:3px;font-size:9px;font-weight:800;letter-spacing:1px;border:1px solid rgba(255,220,120,.7);color:#ffe08a;background:rgba(90,60,10,.4)}
.bagui-praze-band.over{border-color:#ff5b5b;color:#ff8b8b;background:rgba(90,20,20,.5)}
.bagui-praze-warn{color:#ff9a9a;font-size:10px;margin-top:2px}
.bagui-praze-ok{color:#8fe8b0;font-size:10px;margin-top:2px}
#bagui-praze-btn{width:100%;margin-top:7px;padding:6px 10px;border-radius:5px;border:1px solid rgba(210,120,255,.7);background:linear-gradient(180deg,rgba(90,30,130,.9),rgba(40,12,60,.95));color:#f2dcff;font-family:inherit;font-size:11px;letter-spacing:1px;cursor:pointer;transition:background .15s}
#bagui-praze-btn:hover{background:linear-gradient(180deg,rgba(130,45,185,.95),rgba(55,18,80,.98))}
#bagui-praze-btn.pending{border-color:rgba(120,220,255,.8);color:#c8f0ff;cursor:progress}

/* ★ 人类触碰 Assee 的拒绝：Kaprz,haispelo 混沌红字 */
#kaprz-reject{position:fixed;inset:0;z-index:1400;display:none;align-items:center;justify-content:center;flex-direction:column;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(90,0,0,.22),rgba(0,0,0,0) 62%)}
#kaprz-reject.on{display:flex}
.kaprz-word{font-family:ui-monospace,"Courier New",monospace;font-weight:900;font-size:clamp(34px,8vw,92px);letter-spacing:.06em;color:#ff2020;text-shadow:0 0 8px #ff0000,0 0 28px rgba(255,0,0,.8),3px 0 0 rgba(0,255,255,.35),-3px 0 0 rgba(255,0,255,.35);animation:kaprzShake .16s infinite,kaprzFlicker .9s infinite;transform:skewX(-6deg)}
.kaprz-sub{margin-top:12px;font-size:13px;letter-spacing:6px;color:rgba(255,120,120,.9);text-shadow:0 0 10px #a00000;animation:kaprzFlicker 1.3s infinite}
@keyframes kaprzShake{0%{transform:translate(0,0) skewX(-6deg)}25%{transform:translate(2px,-2px) skewX(-8deg)}50%{transform:translate(-3px,1px) skewX(-4deg)}75%{transform:translate(1px,2px) skewX(-7deg)}100%{transform:translate(0,0) skewX(-6deg)}}
@keyframes kaprzFlicker{0%,100%{opacity:1}42%{opacity:.55}45%{opacity:1}78%{opacity:.3}80%{opacity:1}}

@media(max-width:768px){.bagui-main{flex-direction:column}.bagui-right{flex:0 0 280px;min-height:280px}.bagui-praze-canvas-wrap{flex-basis:112px;width:112px;height:132px}}
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
    this._expandedEffect = null;
    // mode: 'straight' | 'asaka'；主模式不显示仓库卖出/丢弃等 Straight 仓储操作。
    this.mode = 'straight';
    this._sellMode = false;
    this._sellSel = new Set();
    this._injectCSS();
    this._buildDOM();
    // 背包打开期间让纯文字信息持续刷新（负重/状态/耐久/详情），不再必须关掉重开
    this._liveTimer = setInterval(() => {
      if (!this.open) return;
      if (this._drag) return;
      try {
        this._renderToolbar();
        this._renderBagEffectPanel();
        this._renderBagStatus();
        if (this.selectedUid) this._renderDetail();
        this._tickPrazeButton();
      } catch (_) { /* 刷新失败不影响操作 */ }
    }, 500);
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
    // ★ 主模式仓库必须在游戏内（据点/容器）管理，不在大厅提供 Straight 式仓库。
    const worldNow = this.engine.app && this.engine.app.world;
    if (this.mode === 'asaka' && !(worldNow && worldNow.running)) {
      this._toast('主模式仓库需在据点或战局内管理');
      return;
    }
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
    this._sellMode = false;
    this._sellSel.clear();
    document.getElementById('bagui-overlay').classList.remove('on');
    this._cancelDrag();
    this._clearGhosts();
    this._disposePrazePreview();
    this._prazePageOpen = false;
    this._deselectDetail();
    this._lootTarget = null;
    if (this.engine.app && this.engine.app.world && this.engine.app.world.running) {
  this.engine.app.world._syncWeaponsFromInventory();
  if (this.engine.app.world._syncArmorFromInventory) this.engine.app.world._syncArmorFromInventory();
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
    this._prazePageOpen = false;
    this.viewInv = target.isCorpse ? target.lootInv : this.inv; // 普通容器时，viewInv 指向玩家，loot 数据在 inv.containers.loot
    this.open = true;
    this._clearGhosts();
    document.getElementById('bagui-overlay').classList.add('on');
    const world = this.engine.app && this.engine.app.world;
    if (world && world._playSFX) world._playSFX('loot', { volume: 0.45 });
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
    // ★ 装备槽是战斗护甲/武器的唯一真相源：任何背包操作后都同步一次运行时，
    //   避免“换了不同等级纤维/插板，人物护甲还是旧等级”的 UI/结算不同步。
    const world = this.engine.app && this.engine.app.world;
    if (world && world.running) {
      if (world._syncWeaponsFromInventory) world._syncWeaponsFromInventory();
      if (world._syncArmorFromInventory) world._syncArmorFromInventory();
    }
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
      const hard = p && p.carryHardLimit ? p.carryHardLimit : lim * 1.35;
      const state = w > lim ? '超重' : (w > lim * 0.75 ? '负重' : '正常');
      // 超过软上限后同时显示硬上限，让玩家知道“最多还能超到多少”
      const limText = w > lim ? `${lim.toFixed(0)}/硬 ${hard.toFixed(0)}` : lim.toFixed(0);
      const weightText = isInMatch ? ` · 负重 ${w.toFixed(1)}/${limText}kg（${state}）` : '';
      label = isInMatch ? `携带 ${carryVal} cp${weightText}` : `仓库 ${this.inv.getContainerValue('stash')} cp · 总值 ${totalVal} cp`;
    }
    
    let html = `<span class="bagui-total">${label}</span>`;
    if (this._lootTarget && this._lootTarget.isCorpse) {
      const unsearched = Array.from(this.viewInv.items.values()).filter(it => it && it.searched === false).length;
      if (unsearched > 0) html += `<button id="bagui-search-corpse">搜索尸体（${unsearched} 件）</button>`;
    }
    if (this._lootTarget && this._lootTarget.isGround) {
      html += '<button id="bagui-take-ground">拾取全部</button>';
    }
    if (!isInMatch && !this._lootTarget) {
      if (this.mode !== 'asaka' && this._sellMode) {
        const picked = this._selectedSellUids();
        const total = this._sellTotal(picked);
        html += `<button class="bagui-sell" id="bagui-sell-apply" ${picked.length ? '' : 'disabled'}>卖出选中 ${picked.length} 件 · ${total} cp</button>`;
        html += '<button id="bagui-sell-cancel">取消多选</button>';
      } else {
        html += '<button id="bagui-prep-mags">整备弹匣（从散弹压满）</button>';
        html += '<button id="bagui-stash-all">整理 · 全部入仓</button>';
        if (this.mode !== 'asaka') html += '<button class="bagui-sell" id="bagui-sellmode">多选卖出</button>';
      }
    }
    bar.innerHTML = html;
    const btn = document.getElementById('bagui-stash-all');
    if (btn) btn.onclick = () => this._stashAll();
    const prepBtn = document.getElementById('bagui-prep-mags');
    if (prepBtn) prepBtn.onclick = () => this._prepAllMags();
    const sellModeBtn = document.getElementById('bagui-sellmode');
    if (sellModeBtn) sellModeBtn.onclick = () => { this._sellMode = true; this._sellSel.clear(); this.refresh(); };
    const sellCancelBtn = document.getElementById('bagui-sell-cancel');
    if (sellCancelBtn) sellCancelBtn.onclick = () => { this._sellMode = false; this._sellSel.clear(); this.refresh(); };
    const sellApplyBtn = document.getElementById('bagui-sell-apply');
    if (sellApplyBtn) sellApplyBtn.onclick = () => this._applySellSelected();
    const takeBtn = document.getElementById('bagui-take-ground');
    if (takeBtn) takeBtn.onclick = () => this._takeAllGroundLoot();
    const searchCorpseBtn = document.getElementById('bagui-search-corpse');
    if (searchCorpseBtn) searchCorpseBtn.onclick = () => this._searchCorpseAll();
  }

  // 当前选中且仍在仓库里的物品（刷新后自动剔除已移走的）
  _selectedSellUids() {
    const out = [];
    for (const uid of this._sellSel) {
      const item = this.inv.items.get(uid);
      if (item && this.inv.parentOf.get(uid) === 'c:stash') out.push(uid);
    }
    return out;
  }

  _sellValueOf(uid) {
    const item = this.inv.items.get(uid);
    if (!item) return 0;
    let total = this.inv.getItemValue(uid);
    // getItemValue 不递归武器配件；卖整枪时把配件价值一起算进去。
    if (item.attachments) {
      for (const k in item.attachments) {
        const a = item.attachments[k];
        if (a) total += this.inv.getItemValue(a);
      }
    }
    return total;
  }

  _sellTotal(uids) {
    let total = 0;
    for (const uid of uids) total += Math.floor(this._sellValueOf(uid) * 0.8);
    return total;
  }

  _applySellSelected() {
    if (this.mode === 'asaka') return;
    const uids = this._selectedSellUids();
    if (!uids.length) { this._toast('先点选仓库里的物品'); return; }
    const total = this._sellTotal(uids);
    if (!confirm(`卖出选中的 ${uids.length} 件物品，获得 ${total} cp？`)) return;
    let sold = 0, gained = 0;
    for (const uid of uids) {
      const item = this.inv.items.get(uid);
      if (!item) continue;
      const val = Math.floor(this._sellValueOf(uid) * 0.8);
      this.inv.destroyItem(uid);
      gained += val;
      sold++;
    }
    this.engine.save.data.credits = (this.engine.save.data.credits || 0) + gained;
    this.engine.save.save();
    if (this.engine.app && this.engine.app._syncActiveInventoryToSave) this.engine.app._syncActiveInventoryToSave();
    if (this.engine.app && this.engine.app._updateCredits) this.engine.app._updateCredits();
    this._sellMode = false;
    this._sellSel.clear();
    this._deselectDetail();
    this._toast(`已卖出 ${sold} 件，获得 ${gained} cp`);
    this.refresh();
  }

  // ★ 战局外一键整备：把所有弹匣从散装弹药压满。战局内不提供，避免绕过动作时间。
  _prepAllMags() {
    const inv = this.inv;
    let filled = 0, mags = 0, noAmmo = false;
    for (const item of Array.from(inv.items.values())) {
      if (!item || item.table !== 'attach') continue;
      const def = inv.getDef(item);
      if (!def || def.slot !== 'mag') continue;
      const nm = inv.normalizeMagazine(item);
      if (!nm) continue;
      mags++;
      let guard = 0;
      while (nm.loaded.queue.length < nm.cap && guard++ < nm.cap + 2) {
        const groups = inv.listAmmoByCaliber(def.caliber, ['chest', 'bag', 'pocket', 'safe', 'stash']);
        const g = groups.find(x => x.uids && x.uids.some(u => inv.items.get(u)));
        const srcUid = g && g.uids.find(u => inv.items.get(u));
        if (!srcUid) { noAmmo = true; break; }
        const r = inv.loadOneRoundIntoMagazine(item.uid, srcUid);
        if (!r.ok) break;
        filled++;
      }
    }
    this._toast(`弹匣整备完成：${mags} 个弹匣，压入 ${filled} 发${noAmmo ? '（散弹已用尽）' : ''}`);
    this.refresh();
  }

  // ★ 地面丢弃物“拾取全部”：直接逐个放回随身容器，避免搜索延迟/网格误触导致捡不起来。
  _takeAllGroundLoot() {
    const target = this._lootTarget;
    if (!target || !target.isGround) return;
    const grid = this.inv.containers.loot;
    if (!grid) return;
    let moved = 0, failed = 0;
    for (const uid of Array.from(grid.items.keys())) {
      if (!this.inv.items.get(uid)) continue;
      let ok = false;
      for (const t of ['chest', 'bag', 'pocket', 'safe']) {
        if (this.inv.addToContainer(t, uid).ok) { ok = true; break; }
      }
      if (ok) moved++;
      else failed++;
    }
    if (grid.items.size === 0) {
      const world = this.engine.app && this.engine.app.world;
      if (world) {
        if (target.mesh) {
          world.engine.renderer.scene.remove(target.mesh);
          target.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        }
        world.groundLoots = (world.groundLoots || []).filter(g => g !== target);
        world.pois = (world.pois || []).filter(p => !(Math.abs(p.x - target.x) < 0.01 && Math.abs(p.z - target.z) < 0.01 && p.type === 'container'));
      }
      this._lootTarget = null;
      this.viewInv = this.inv;
    }
    if (failed) this._toast(failed + ' 件物品因负重/空间不足未拾取');
    else if (moved) this._toast('已拾取 ' + moved + ' 件');
    this.refresh();
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
  ['vestFiber', '护甲'], // 插板不再单独占装备槽，而是拖进护甲内
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
          <div style="font-size:8px;color:#ffb0b0;margin-top:1px">🔒 ${Math.round(pct)}%</div>
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
    this._disposePrazePreview();

    if (this._lootTarget) {
      if (this._lootTarget.isCorpse) {
        const inv = this.viewInv;
        const core = this._lootTarget.prazeCore;
        const hasCore = !!(core && !core.absorbed);
        // ★ Praze / Assee 单独一小页：不再压在尸体战利品面板最上方。
        if (hasCore && this._prazePageOpen) {
          let html = `<div class="bagui-sec" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px">
            <span style="color:#dcb8ff;letter-spacing:2px">Praze · Assee 核心</span>
            <button id="bagui-praze-back" class="bagui-btn bagui-mini" style="padding:3px 10px">返回战利品</button>
          </div>`;
          html += this._prazeSectionHtml(this._lootTarget, core);
          el.innerHTML = html;
          this._bindItemEvents(el);
          this._startPrazePreview(this._lootTarget);
          const back = document.getElementById('bagui-praze-back');
          if (back) back.onclick = (ev) => {
            ev.stopPropagation();
            this._prazePageOpen = false;
            this._disposePrazePreview();
            this.refresh();
          };
          return;
        }
        let html = '';
        if (hasCore) {
          html += `<div class="bagui-sec" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px">
            <span style="color:#dcb8ff;letter-spacing:1px">Praze · Assee 核心<span class="bagui-praze-band${core.band === 'INC' ? ' over' : ''}">${core.band}</span></span>
            <button id="bagui-praze-open" class="bagui-btn bagui-mini" style="padding:3px 10px">单独查看</button>
          </div>`;
        }
        html += '<div class="bagui-sec"><h3>敌人装备</h3><div class="bagui-grid-wrap" style="width:100%;height:auto;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;background:transparent;border:none">';
        const equipList = [
  ['main', '武器一'], ['side', '武器二'], ['melee', '近战'],
  ['helmetShell', '头盔'], ['helmetVisor', '面罩'], ['helmetEar', '耳机'],
  ['vestFiber', '护甲'], // 插板不再单独占装备槽，而是拖进护甲内
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
        if (hasCore) {
          const openBtn = document.getElementById('bagui-praze-open');
          if (openBtn) openBtn.onclick = (ev) => {
            ev.stopPropagation();
            this._prazePageOpen = true;
            this.refresh();
          };
        }
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
        '<div id="bagui-status-float" style="position:absolute;inset:0;pointer-events:none;z-index:5;"></div>' +
        '<div id="bagui-effect-panel" style="position:absolute;left:10px;bottom:10px;width:min(300px,42%);max-height:62%;overflow-y:auto;z-index:12;background:rgba(8,14,22,.92);border:1px solid rgba(105,170,235,.4);border-radius:8px;padding:8px;color:#cfe4f8;font-size:11px"></div>';
      this._renderCharPreview();
      this._renderBagStatus();
      this._renderBagEffectPanel();
      return;
    }

    el.style.display = '';
    let html = this._gridContainerHtml('stash', '仓库', this.viewInv);
    el.innerHTML = html;
    this._bindItemEvents(el);
  }

  // ===================== 尸体 Praze 栏 =====================
  _prazeSectionHtml(target, core) {
    const world = this.engine.app && this.engine.app.world;
    const p = world && world.player;
    const myA = p ? Number(p.aseLevel || (p.charSpec && p.charSpec.A) || 0) : 0;
    const isPrazer = !!(p && p.charSpec && p.charSpec.prazer);
    const canTake = isPrazer && myA > core.A;
    const fmt = (a) => {
      const n = Number(a) || 0;
      if (n >= 1e6) return n.toExponential(2).replace('e+', '×10^');
      if (n >= 1000) return String(Math.round(n));
      return n.toFixed(2);
    };
    let condition, cls;
    if (!isPrazer) {
      condition = '人类无法建立 Assee 耦合。触碰只会被拒绝。';
      cls = 'bagui-praze-warn';
    } else if (!canTake) {
      condition = '你的 Aselevel 不高于核心，无法把核心封装成物品。';
      cls = 'bagui-praze-warn';
    } else {
      condition = `条件满足：可封装为物品（${core.band} 级 Praze 核心），之后可在背包里选择吸收。`;
      cls = 'bagui-praze-ok';
    }
    const bandCls = core.band === 'INC' ? ' over' : '';
    const btnText = !isPrazer ? '人类无法提取 · 触碰将被拒绝'
      : (!canTake ? '等级不足 · 尝试提取'
        : `提取为物品 · ${core.band} 级 Praze 核心`);
    return `<div class="bagui-sec bagui-praze">
      <h3>Praze · Assee 核心<span class="bagui-praze-band${bandCls}">${core.band}</span></h3>
      <div class="bagui-praze-row">
        <div class="bagui-praze-canvas-wrap"><canvas id="bagui-praze-canvas"></canvas></div>
        <div class="bagui-praze-info">
          <div>原主：<b>${this._esc(core.owner || '未知 Prazer')}</b></div>
          <div>核心等级：<b>A=${fmt(core.A)}</b> · 评级 <b>${core.band}</b></div>
          <div>状态：<b style="color:#ff9ab0">濒临碎裂</b> · 仍在向外辐射耦合能</div>
          <div>你的等级：<b>A=${fmt(myA)}</b>${isPrazer ? '' : ' <span style="color:#ff9a9a">（人类）</span>'}</div>
          <div class="${cls}">${condition}</div>
        </div>
      </div>
      <button id="bagui-praze-btn">${btnText}</button>
    </div>`;
  }

  _startPrazePreview(target) {
    this._disposePrazePreview();
    const canvas = document.getElementById('bagui-praze-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(96, Math.round(rect.width || 148));
    const h = Math.max(96, Math.round(rect.height || 148));
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 50);
    camera.position.set(0, 0.55, 4.2);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0x8a5ab0, 1.2));
    const key = new THREE.DirectionalLight(0xf0d0ff, 1.6); key.position.set(3, 4, 4); scene.add(key);
    const rim = new THREE.PointLight(0x60e0ff, 2.2, 12); rim.position.set(-3, 1, -3); scene.add(rim);

    const group = new THREE.Group();
    // 破碎多面体：顶点随机扰动 + 缺失一角，看起来“几乎快碎了”
    const geo = new THREE.IcosahedronGeometry(1.05, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = 0.82 + Math.random() * 0.24;
      // 顶部一块刻意压塌，模拟碎裂缺口
      const bite = (y > 0.5 && x > 0.1) ? 0.72 : 1;
      pos.setXYZ(i, x * n * bite, y * n * bite, z * n * bite);
    }
    geo.computeVertexNormals();
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x6a2a8a, emissive: 0x7a20b0, emissiveIntensity: 1.4,
      metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.72,
      transmission: 0.35, thickness: 0.8, flatShading: true, side: THREE.DoubleSide,
    });
    const shell = new THREE.Mesh(geo, shellMat);
    group.add(shell);
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xffb0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
    );
    group.add(wire);
    const inner = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshBasicMaterial({ color: 0xffc8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(inner);
    // 裂纹：从表面随机点连出的折线
    const crackPts = [];
    for (let i = 0; i < 22; i++) {
      const a0 = Math.random() * Math.PI * 2, b0 = Math.acos(Math.random() * 2 - 1);
      let x = Math.sin(b0) * Math.cos(a0) * 1.02;
      let y = Math.cos(b0) * 1.02;
      let z = Math.sin(b0) * Math.sin(a0) * 1.02;
      crackPts.push(new THREE.Vector3(x, y, z));
      for (let k = 0; k < 3; k++) {
        x += (Math.random() - 0.5) * 0.34; y += (Math.random() - 0.5) * 0.34; z += (Math.random() - 0.5) * 0.34;
        crackPts.push(new THREE.Vector3(x, y, z));
      }
    }
    const crackGeo = new THREE.BufferGeometry().setFromPoints(crackPts);
    const cracks = new THREE.LineSegments(crackGeo, new THREE.LineBasicMaterial({ color: 0xff5a7a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
    group.add(cracks);
    // 剥落的碎片：一部分已经飘离本体
    const shards = [];
    const shardGeo = new THREE.TetrahedronGeometry(0.1, 0);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.MeshBasicMaterial({
        color: i % 3 ? 0xd88aff : 0x70e0ff, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const s = new THREE.Mesh(shardGeo, m);
      const a = Math.random() * Math.PI * 2;
      const r = 1.15 + Math.random() * 0.9;
      s.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 1.8, Math.sin(a) * r);
      s.userData = { a, r, y: s.position.y, sp: 0.3 + Math.random() * 0.7 };
      shards.push(s);
      group.add(s);
    }
    scene.add(group);

    const state = { renderer, scene, camera, group, shell, wire, inner, cracks, shards, raf: 0, t0: performance.now() };
    this._prazePreview = state;
    const tick = () => {
      if (!this._prazePreview || this._prazePreview !== state) return;
      const t = (performance.now() - state.t0) * 0.001;
      state.group.rotation.y = t * 0.42;
      state.group.rotation.x = Math.sin(t * 0.6) * 0.16;
      state.wire.rotation.copy(state.shell.rotation);
      state.inner.rotation.y = -t * 2.2;
      state.inner.rotation.z = t * 1.1;
      state.cracks.material.opacity = 0.35 + Math.abs(Math.sin(t * 2.3)) * 0.45;
      for (const s of state.shards) {
        const d = s.userData;
        d.a += 0.006 * (d.sp + 0.4);
        s.position.set(Math.cos(d.a) * d.r, d.y + Math.sin(t * 1.4 + d.a) * 0.12, Math.sin(d.a) * d.r);
        s.rotation.x += 0.02;
        s.rotation.y += 0.013;
      }
      renderer.render(scene, camera);
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);

    const btn = document.getElementById('bagui-praze-btn');
    if (btn) {
      btn.onclick = (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const world = this.engine.app && this.engine.app.world;
        if (!world || !world._extractCorpseAssee) return;
        const res = world._extractCorpseAssee(target);
        if (res && res.ok) {
          this._toast('已提取 ' + res.band + ' 级 Praze 核心，放入背包。打开它可吸收。');
          this.refresh();
        } else if (res && res.text && res.reason !== 'human' && res.reason !== 'level') {
          this._toast(res.text);
        }
      };
    }
  }

  _disposePrazePreview() {
    const s = this._prazePreview;
    if (!s) return;
    this._prazePreview = null;
    if (s.raf) cancelAnimationFrame(s.raf);
    try {
      s.scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m && m.dispose && m.dispose());
          else if (o.material.dispose) o.material.dispose();
        }
      });
      s.renderer.dispose();
    } catch (_) {}
  }

  // 吸收动作进行中，按钮文字跟着 ActionProcess 实时走；
  // 否则背包界面会一直停在“吸收中 0%”。
  _tickPrazeButton() {
    const target = this._lootTarget;
    if (!target || !target.prazeCore || target.prazeCore.absorbed) return;
    const world = this.engine.app && this.engine.app.world;
    if (!world || !world.actionProcess) return;
    const btn = document.getElementById('bagui-praze-btn');
    if (!btn) return;
    const proc = world.actionProcess.getProgress();
    if (proc && proc.id === 'asce_absorb') {
      btn.classList.add('pending');
      btn.disabled = true;
      btn.textContent = `吸收中 ${(proc.pct * 100).toFixed(0)}% · 保持站位`;
    }
  }

  _showKaprz() {
    let el = document.getElementById('kaprz-reject');
    if (!el) {
      el = document.createElement('div');
      el.id = 'kaprz-reject';
      el.innerHTML = '<div class="kaprz-word">Kaprz,haispelo</div><div class="kaprz-sub">非 PRAZER 者 · 不可触碰 ASSEE</div>';
      document.body.appendChild(el);
    }
    el.classList.add('on');
    clearTimeout(this._kaprzTimer);
    this._kaprzTimer = setTimeout(() => el.classList.remove('on'), 2400);
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
    // ★ 尸体装备也要搜索：未搜索时只显示“?”，点击开始 0.8s 搜索。
    if (item.searched === false && inv !== this.inv) {
      return `<div class="bagui-slot empty" data-corpse-search-uid="${uid}" data-src-type="equip" data-src-slot="${slot}" style="width:60px;height:60px;background:rgba(10,18,30,.8);border:1px dashed rgba(120,170,220,.4);border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#8fb0c8;font-size:13px;font-weight:700">?</div>`;
    }
    const def = inv.getDef(item);
    const name = (item.damaged ? '[损坏] ' : '') + this.engine.i18n.t(def ? (def.name || def.n || '?') : '?');
    const rarity = item.rarity || 'L0';
    const durPct = item.durMax > 0 ? Math.max(0, Math.min(100, Math.round(item.dur / item.durMax * 100))) : -1;
    const durBar = durPct >= 0 ? `<div class="bagui-item-dur"><i style="width:${durPct}%;background:${durPct > 60 ? '#6fe07a' : durPct > 30 ? '#ffd93d' : '#ff5a5a'}"></i></div>` : '';
    const durTxt = durPct >= 0 ? `<span class="bagui-item-durpct" style="color:${durPct > 60 ? '#9fe8b0' : durPct > 30 ? '#ffe066' : '#ff8b7b'}">${durPct}%</span>` : '';
    let platePct = -1;
    if (item.table === 'vestFiber' && item.subSlots && item.subSlots.plate) {
      const pItem = inv.items.get(item.subSlots.plate);
      if (pItem && pItem.durMax > 0) platePct = Math.max(0, Math.min(100, Math.round(pItem.dur / pItem.durMax * 100)));
    }
    const plateTxt = platePct >= 0 ? `<span class="bagui-item-durpct upper" style="color:${platePct > 60 ? '#9fd8ff' : platePct > 30 ? '#ffe066' : '#ff8b7b'}">🛡${platePct}%</span>` : '';
    const plateUid = (item.subSlots && item.subSlots.plate) || null;
    const plateTag = plateUid ? '<span class="bagui-item-sublv" title="已装插板">🛡</span>' : '';
    return `<div class="bagui-item has-item${durPct >= 0 ? ' has-dur' : ''}" data-uid="${uid}" data-rarity="${rarity}" data-src-type="equip" data-src-slot="${slot}" style="width:60px;height:60px;position:relative">
      <div class="bagui-item-icon">${this._icon(item, inv)}</div>
      <div class="bagui-item-name">${this._esc(name)}</div>
      ${plateTxt}${durTxt}${plateTag}${durBar}
    </div>`;
  }

  _itemHtml(uid, pos, containerName, inv = this.inv, cell = CELL) {
    const item = inv.items.get(uid);
    if (!item) return '';
    
    if (item.searched === false) {
      return `<div class="bagui-item has-item unsearched" data-uid="${uid}" data-container="${containerName}"
        style="left:${pos.x * cell}px;top:${pos.y * cell}px;width:${pos.w * cell}px;height:${pos.h * cell}px">
        <div class="bagui-item-icon" style="color:#5c82a8">?</div>
      </div>`;
    }

    const def = inv.getDef(item);
    let baseName = this.engine.i18n.t(def ? (def.name || def.n || '?') : '?');
    if (item.defId === 'asce_core') baseName += item.anchored ? '·已锚定' : '·未锚定';
    if (item.defId === 'praze_core') baseName = (item.rarity || 'L1') + ' 级 Praze 核心';
    const name = item.damaged ? ('[损坏] ' + baseName) : baseName;
    const rarity = item.rarity || 'L0';
    const qty = item.qty > 1 ? `<span class="bagui-item-qty">×${item.qty}</span>` : '';
    // ★ 弹匣在背包里直接显示已装填数，否则玩家看不出哪个匣是满的。
    const isMagItem = item.table === 'attach' && def && def.slot === 'mag';
    const magText = isMagItem
      ? `<span class="bagui-item-qty" style="color:#9fe0b0">${(item.loaded && item.loaded.qty) || 0}/${def.capacity || 0}</span>`
      : '';
    const worldNow = this.engine.app && this.engine.app.world;
    const lockText = (worldNow && worldNow.isItemLocked && worldNow.isItemLocked(uid))
      ? '<span class="bagui-item-sublv" style="left:auto;right:3px;top:18px;color:#ffd93d">🔒</span>' : '';
    const dur = item.durMax > 0 ? Math.round(item.dur / item.durMax * 100) : -1;
    const durBar = dur >= 0 ? `<div class="bagui-item-dur"><i style="width:${dur}%;background:${dur > 60 ? '#6fe07a' : dur > 30 ? '#ffd93d' : '#ff5a5a'}"></i></div>` : '';
    // 左下角耐久百分比：背包里不点详情也能一眼看到剩余耐久
    const durTxt = dur >= 0 ? `<span class="bagui-item-durpct" style="color:${dur > 60 ? '#9fe8b0' : dur > 30 ? '#ffe066' : '#ff8b7b'}">${dur}%</span>` : '';
    // 纤维护甲：下面一行纤维，上面一行内嵌插板
    let platePct = -1;
    if (item.table === 'vestFiber' && item.subSlots && item.subSlots.plate) {
      const pItem = inv.items.get(item.subSlots.plate);
      if (pItem && pItem.durMax > 0) platePct = Math.max(0, Math.min(100, Math.round(pItem.dur / pItem.durMax * 100)));
    }
    const plateTxt = platePct >= 0 ? `<span class="bagui-item-durpct upper" style="color:${platePct > 60 ? '#9fd8ff' : platePct > 30 ? '#ffe066' : '#ff8b7b'}">🛡${platePct}%</span>` : '';
    // 仓库多选卖出：只在 Straight 大厅的仓库格上显示勾选层。
    const sellable = this._sellMode && this.mode !== 'asaka' && inv === this.inv
      && this.inv.parentOf.get(uid) === 'c:stash';
    const picked = sellable && this._sellSel.has(uid);
    return `<div class="bagui-item has-item${dur >= 0 ? ' has-dur' : ''}${sellable ? ' sell-select' : ''}${picked ? ' sell-selected' : ''}" data-uid="${uid}" data-rarity="${rarity}" data-container="${containerName}"
      style="left:${pos.x * cell}px;top:${pos.y * cell}px;width:${pos.w * cell}px;height:${pos.h * cell}px${item.damaged ? ';border-color:rgba(255,90,90,.65)' : ''}">
      <div class="bagui-item-icon">${this._icon(item, inv)}</div>
      <div class="bagui-item-name">${this._esc(name)}</div>
      ${qty}${magText}${lockText}${plateTxt}${durTxt}${durBar}
      ${sellable ? `<span class="bagui-sell-check">${picked ? '✓' : ''}</span>` : ''}
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
      battery: '🔋', helmetShell: '⛑', helmetVisor: '🕶', helmetEar: '🎧',
      vestFiber: '🦺', vestPlate: '🛡', backpack: '🎒', chestRig: '🧥'
    }[item.table] || '?';
  }

  _cname(n) { return { chest: '胸挂', pocket: '口袋', bag: '背包', safe: '安全箱', stash: '仓库' }[n] || n; }
  _esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

  _bindItemEvents(root) {
    root.querySelectorAll('[data-corpse-search-uid]').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        this._startSearchLoot(el.dataset.corpseSearchUid);
      };
    });
    root.querySelectorAll('.bagui-item.has-item').forEach(el => {
      const uid = el.dataset.uid;
      
      el.addEventListener('dragstart', e => e.preventDefault());

      el.addEventListener('pointerdown', (e) => {
        const item = this.viewInv.items.get(uid) || this.inv.items.get(uid);
        if (item && item.searched === false) return;
        if (this._sellMode && this.mode !== 'asaka'
            && this.inv.parentOf.get(uid) === 'c:stash') {
          e.preventDefault();
          e.stopPropagation();
          this._toggleSellUid(uid);
          return;
        }
        this._onDown(e, uid, el);
      });

      el.addEventListener('click', (e) => {
        if (this._sellMode && this.mode !== 'asaka'
            && this.inv.parentOf.get(uid) === 'c:stash') {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
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
        // ★ 双击/双触统一在这里判定：单击延迟 200ms 打开详情，双击直接快速拿取。
        //   旧版单击立即开详情、双击又触发一次拿取，面板会闪一下且显示已移走的物品。
        const now = performance.now();
        if (this._lastTapUid === uid && (now - (this._lastTapAt || 0)) < 320) {
          clearTimeout(this._clickTimer);
          this._lastTapUid = null;
          this._lastTapAt = 0;
          this._quickEquip(uid);
          this._deselectDetail();
          return;
        }
        this._lastTapUid = uid;
        this._lastTapAt = now;
        clearTimeout(this._clickTimer);
        const mx = e.clientX !== undefined ? e.clientX : 100;
        const my = e.clientY !== undefined ? e.clientY : 100;
        this._clickTimer = setTimeout(() => {
          if (!this._didDrag) {
            this.selectedUid = uid;
            this._renderDetail(mx, my);
          }
        }, 200);
      });

      // 双击已由上面的 click 双击判定接管；不再单独监听 dblclick，
      // 否则桌面端会“双击 = 拿取两次”或与延迟打开详情互相打架。
    });
  }

  _toggleSellUid(uid) {
    const item = this.inv.items.get(uid);
    if (!item) return;
    if (this._sellSel.has(uid)) {
      this._sellSel.delete(uid);
    } else {
      // 容器里还有东西时不允许直接卖，避免把内部物品一起销毁。
      if (item.innerGrid && item.innerGrid.items && item.innerGrid.items.size > 0) {
        this._toast('容器里还有物品，先取出来再卖');
        return;
      }
      this._sellSel.add(uid);
    }
    this.refresh();
  }

  // ★ 尸体整体搜索：一次读条把所有未搜索遗物翻开；被击中会打断（ActionProcess）。
  _searchCorpseAll() {
    const target = this._lootTarget;
    if (!target || !target.isCorpse) return;
    const world = this.engine.app && this.engine.app.world;
    const list = Array.from(this.viewInv.items.values()).filter(it => it && it.searched === false);
    if (!list.length) { this._toast('尸体已经搜索过了'); return; }
    const finish = () => {
      for (const it of list) it.searched = true;
      this._toast('尸体搜索完成：' + list.length + ' 件');
      this.refresh();
    };
    if (!world || !world.actionProcess) { finish(); return; }
    if (world.actionProcess.isRunning()) { this._toast('当前动作尚未完成'); return; }
    const duration = Math.min(6.5, 1.2 + list.length * 0.12);
    let revealed = 0;
    world.actionProcess.start({
      id: 'search_corpse',
      label: '搜索尸体',
      duration,
      cancelable: true,
      onTick: (pct) => {
        const want = Math.min(list.length, Math.floor(pct * list.length + 1e-6));
        while (revealed < want) {
          if (list[revealed]) list[revealed].searched = true;
          revealed++;
        }
      },
      onComplete: finish,
      onCancel: () => {
        // 中断时已经翻开的遗物保留，符合“搜索一半被打断”的仿真。
        this._toast('尸体搜索被打断：已搜到 ' + revealed + '/' + list.length + ' 件');
        this.refresh();
      },
    });
    this._toast('开始搜索尸体：' + list.length + ' 件（被打断会保留已搜到的部分）');
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
  // 插板双击 = 直接装进当前护甲（没有护甲则提示）
  {
    const anyInv = (this.viewInv && this.viewInv.items.has(uid)) ? this.viewInv : this.inv;
    const anyItem = anyInv.items.get(uid);
    if (anyItem && anyItem.table === 'vestPlate') {
      const fiberUid = this.inv.equipped.vestFiber;
      if (fiberUid) { this._installPlateDrop(uid, fiberUid, anyInv); return; }
      this._toast('先穿上一件护甲纤维，再把插板装进去');
      return;
    }
  }
  if (this._lootTarget) {
    const world0 = this.engine.app && this.engine.app.world;
    if (world0 && world0._playSFX) world0._playSFX('loot', { volume: 0.3 });
    if (this._lootTarget.isCorpse) {
      if (this.viewInv.items.has(uid)) {
        const item = this.viewInv.items.get(uid);
        // ★ 先尝试空装备槽，再胸挂、背包、口袋、安全箱
        if (item) {
          const equipSlot = this._findEmptyEquipSlot(item.table);
          if (equipSlot && this._equipAcrossInventories(this.viewInv, uid, equipSlot, this.inv)) return;
        }
        let moved = false;
        let lastReason = null;
        for (const t of ['chest', 'bag', 'pocket', 'safe']) {
          const r = this.viewInv.transferItem(this.inv, uid, t);
          if (r.ok) { moved = true; break; }
          lastReason = r.reason;
        }
        if (moved) this.refresh();
        else alert(lastReason === 'overweight' ? '负重已达硬上限，无法再携带更多物品' : '背包已满，无法拿取');
      }
      return;
    }

    const parent = this.inv.parentOf.get(uid);
    if (parent === 'c:loot') {
      let moved = false;
      let lastReason = null;
      for (const t of ['chest', 'bag', 'pocket', 'safe']) {
        const r = this.inv.addToContainer(t, uid);
        if (r.ok) { moved = true; break; }
        lastReason = r.reason;
      }
      if (moved) this.refresh();
      else alert(lastReason === 'overweight' ? '负重已达硬上限，无法再携带更多物品' : '背包已满，无法拿取');
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
    let displayName = (item.damaged ? '[损坏] ' : '') + this.engine.i18n.t(rawName);
    if (item.defId === 'asce_core') displayName += item.anchored ? '（已锚定）' : '（未锚定）';
    if (item.defId === 'praze_core') displayName = (item.rarity || 'L1') + ' 级 Praze 核心';
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
    }
    // ★ Praze 核心物品：显示资产等级/L 与原主，并允许在战局内吸收
    if (item.prazeCore) {
      const p = world && world.player;
      const myA = p ? Number(p.aseLevel || (p.charSpec && p.charSpec.A) || 0) : 0;
      const isPrazer = !!(p && p.charSpec && p.charSpec.prazer);
      const coreA = Number(item.aseA) || 0;
      const band = item.aseBand || item.rarity || 'L1';
      const canAbsorb = isPrazer && myA > coreA;
      const fmt = (a) => {
        const n = Number(a) || 0;
        if (n >= 1e6) return n.toExponential(2).replace('e+', '×10^');
        if (n >= 1000) return String(Math.round(n));
        return n.toFixed(2);
      };
      html += `<div style="margin-top:6px;padding:5px 6px;background:rgba(50,20,70,.7);border-left:3px solid #c060ff;border-radius:4px">
        <div>物品等级：<b style="color:#ffe08a">${band}</b> · 原主 A=<b>${fmt(coreA)}</b></div>
        <div>资产编号：<b>${this._esc(item.serial || '—')}</b></div>
        <div>原主：${this._esc(item.owner || '未知 Prazer')}</div>
        <div>状态：${item.anchored ? '<b style="color:#8fe8b0">已锚定</b>' : '<b style="color:#ffd36a">未锚定</b>'} · 电子资产</div>
        <div style="font-size:10px;color:${canAbsorb ? '#8fe8b0' : '#ff9a9a'}">${!isPrazer ? '人类无法吸收 Assee 核心。' : (canAbsorb ? '你的等级高于核心，可以吸收并提升耦合。' : '你的等级不高于核心，无法吸收。')}</div>
      </div>`;
      if (inMatchNow && inv === this.inv) {
        html += `<button class="bagui-btn" id="bagui-praze-absorb-item" style="background:rgba(100,40,150,.75);border-color:rgba(210,120,255,.8);color:#f2dcff">吸收核心（消耗物品）</button>`;
      }
    }
    // ★ 护甲等级直接从当前物品 def 读取，避免“换了不同等级纤维/插板后详情仍是旧等级”的观感
    if (def.armorLv) {
      html += `<div>护甲等级：<b style="color:#9fd8ff">Lv${def.armorLv}</b></div>`;
    }
    if (item.electronics) {
      html += `<div style="color:#8fb0c8">电子属性：${item.empShielded ? '电磁加固（降低 EMP 损坏概率，并非免疫）' : '无电磁加固（EMP 可直接损坏）'}</div>`;
      if (item.empShielded && item.empShieldMax > 0) {
        const sp = Math.max(0, Math.min(100, Math.round((item.empShield || 0) / item.empShieldMax * 100)));
        html += `<div>抗磁层：<b style="color:${sp > 60 ? '#9fe8b0' : sp > 25 ? '#ffe066' : '#ff8b7b'}">${sp}%</b> <span style="color:#6f8fae">（抗磁层耗尽后，电子设备才会开始损坏）</span></div>`;
      }
      if (item.empSurge) html += `<div style="color:#ffd93d">经历过强电磁冲刷（线路老化）</div>`;
    }

    const unitVal = inv.getItemValue(uid);
    if (item.qty > 1) {
      const unit = Math.round(unitVal / item.qty);
      html += `<div>数量：${item.qty} / ${item.stackLimit}（单价 ${unit} cp · 总价 ${unitVal} cp）</div>`;
    } else if (unitVal > 0) {
      html += `<div>价值：${unitVal} cp</div>`;
    }
    
    if (item.durMax > 0) {
      // ★ 详情里只给百分比：具体耐久数值属于“拆开才知道”的仿真信息，
      //   背包格左下角同样只显示百分比。
      const pct = Math.max(0, Math.min(100, Math.round(item.dur / item.durMax * 100)));
      html += `<div>耐久：<b style="color:${pct > 60 ? '#9fe8b0' : pct > 30 ? '#ffe066' : '#ff8b7b'}">${pct}%</b></div>`;
    }

    // ★ 护甲纤维：无论在战局内还是仓库/配装页，详情都必须显示内嵌插板并允许取出。
    //   旧版只在 inMatchNow 时渲染，导致大厅里插板“看不见也拿不出来”，等于永远困在护甲里。
    if (item.table === 'vestFiber' && !(def && def.exoskeleton)) {
      const pUid = item.subSlots && item.subSlots.plate;
      if (pUid) {
        const pItem = inv.items.get(pUid);
        const pDef = pItem ? inv.getDef(pItem) : null;
        const pPct = pItem && pItem.durMax > 0 ? Math.round(pItem.dur / pItem.durMax * 100) : 0;
        if (pItem && inv === this.inv && !this._lootTarget) {
          // 把插板渲染成和背包相同的 1×1 网格格，直接拖出即可取出
          const pw = pItem.w || 1, ph = pItem.h || 1;
          html += `<div class="bagui-attach-title">内嵌插板 · ${this._esc(this.engine.i18n.t(pDef ? pDef.name : '?'))} · ${pPct}%</div>`;
          html += `<div class="bagui-grid-wrap" data-container="sub:${uid}:plate" style="width:${pw * CELL}px;height:${ph * CELL}px;position:relative;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px">`;
          html += this._itemHtml(pUid, { x: 0, y: 0, w: pw, h: ph, rotated: false }, `sub:${uid}:plate`, inv);
          html += `</div><div style="font-size:9px;color:#6f8fae;margin-top:2px">把插板拖到背包/胸挂即可取出</div>`;
        } else {
          html += `<div style="margin-top:6px;padding:5px 6px;background:rgba(20,32,46,.7);border-left:3px solid #7fd0ff;border-radius:4px">
            <div style="color:#9fd8ff">内嵌插板：${pItem ? this._esc(this.engine.i18n.t(pDef ? pDef.name : '?')) : '—'} · ${pPct}%</div>
            ${inv === this.inv
              ? `<button class="bagui-btn bagui-mini" data-remove-plate="${uid}" style="margin-top:4px">取出插板</button>`
              : `<button class="bagui-btn bagui-mini" data-take-plate="${uid}" style="margin-top:4px">取下插板带走</button>`}
          </div>`;
        }
      } else if (inv === this.inv) {
        html += `<div style="font-size:10px;color:#6f8fae;margin-top:6px">未装插板（把插板拖到这件护甲上即可装入）</div>`;
      }
    }
    // ★ 外骨骼电池子槽 + 6 个挂载硬点 + 头显/自动火力开关
    if (def && def.exoskeleton) {
      const bUid = item.subSlots && item.subSlots.battery;
      const bItem = bUid ? inv.items.get(bUid) : null;
      const pct = bItem ? Math.round((bItem.dur || 0) / Math.max(1, bItem.durMax || 100) * 100) : 0;
      html += `<div style="margin-top:6px;padding:5px 6px;background:rgba(20,40,55,.7);border-left:3px solid #66e8ff;border-radius:4px">
        <div style="color:#9fe8ff">科技电池：${bItem ? this._esc(this.engine.i18n.t((inv.getDef(bItem) || {}).name || '电池')) + ' · ' + pct + '%' : '未安装（把电池拖到外骨骼上）'} </div>`;
      if (bItem && inv === this.inv) html += `<button class="bagui-btn bagui-mini" data-remove-battery="${uid}" style="margin-top:4px">取下电池</button>`;
      html += `</div>`;
      const world = this.engine.app && this.engine.app.world;
      const inMatch = !!(world && world.running);
      if (inv === this.inv && this.inv.equipped.vestFiber === uid) {
        html += `<div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap">
          <button class="bagui-btn bagui-mini" data-exo-visor="${uid}">${inMatch && world.player && world.player.exoVisor ? '取下头显（L）' : '戴上头显（L）'}</button>
          <button class="bagui-btn bagui-mini" data-exo-auto="${uid}">${inMatch && world.player && world.player.exoAutoFire ? '关闭自动火力（I）' : '开启自动火力（I）'}</button>
        </div>`;
      }
      html += '<div class="bagui-attach-title">挂载硬点 6 · 5×3 格，枪械按实际尺寸占格（拖枪到此）</div><div class="bagui-attach-grid">';
      const mounts = Array.isArray(item.mounts) ? item.mounts : [];
      const MCELL = 20;
      for (let i = 0; i < 6; i++) {
        const wUid = mounts[i];
        const wItem = wUid ? inv.items.get(wUid) : null;
        html += `<div class="bagui-attach-slot" data-exo-mount-slot="${uid}" data-exo-mount-idx="${i}">`;
        html += `<span class="bagui-attach-label">硬点 ${i + 1} · 键 ${i + 4}</span>`;
        html += `<div class="bagui-grid-wrap" data-container="exo-mount:${uid}:${i}" style="width:${5 * MCELL}px;height:${3 * MCELL}px;position:relative;background:rgba(10,18,30,.8);border:1px solid rgba(80,160,210,.35);border-radius:4px">`;
        for (let gy = 0; gy < 3; gy++) {
          for (let gx = 0; gx < 5; gx++) {
            html += `<div class="bagui-cell" style="left:${gx * MCELL}px;top:${gy * MCELL}px;width:${MCELL}px;height:${MCELL}px"></div>`;
          }
        }
        if (wItem) {
          html += this._itemHtml(wUid, { x: 0, y: 0, w: wItem.w || 1, h: wItem.h || 1 }, `exo-mount:${uid}:${i}`, inv, MCELL);
        }
        html += `</div>`;
        if (wItem) {
          if (inv === this.inv && inv.equipped.vestFiber === uid) html += `<div style="display:flex;gap:3px;margin-top:2px">
            <button class="bagui-btn bagui-mini" data-exo-take="${uid}" data-exo-idx="${i}" style="font-size:8px;padding:1px 5px">接管</button>
            <button class="bagui-btn bagui-mini" data-exo-detach="${uid}" data-exo-idx="${i}" style="font-size:8px;padding:1px 5px">拆下</button></div>`;
        } else {
          html += '<span class="bagui-attach-empty" style="font-size:9px">空</span>';
        }
        html += `</div>`;
      }
      html += '</div>';
      html += `<div style="font-size:9px;color:#6f8fae;margin-top:2px">头显在线时按 4~9 直接接管对应硬点；自动火力只操纵硬点上的枪。外骨骼没有插板槽。</div>`;
    }

    // ★ 重量：无论物品类型都显示，避免“详细属性里没有重量”
    const unitW = item.weight !== undefined ? item.weight : (def.weight || 0);
    const totalW = unitW * (item.qty || 1);
    html += `<div>重量：${unitW.toFixed(2)} kg${item.qty > 1 ? `（合计 ${totalW.toFixed(2)} kg）` : ''}</div>`;
    if (item.serial) html += `<div style="color:#d0a0ff">编号：${this._esc(String(item.serial))}</div>`;
    // ★ 弹药数值
    if (item.table === 'ammo') {
      const parts = [];
      if (def.caliber) parts.push('口径 ' + def.caliber);
      if (def.massG !== undefined) parts.push('弹头 ' + def.massG + 'g');
      if (def.v0 !== undefined) parts.push('初速 ' + def.v0 + 'm/s');
      // ★ 冲压是唯一位面：content 内部仍分 pen/impulse 两项，但 UI 只显示合计数
      const impact = (def.pen || 0) + (def.impulse || 0);
      if (impact > 0) parts.push('冲压 ' + impact);
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
      if (def.range) stats.push((item.table === 'melee' ? '攻击距离 ' : '有效射程 ') + def.range + 'm');
      if (def.handling !== undefined) stats.push('操控 ' + def.handling);
      if (def.stability !== undefined) stats.push('稳定 ' + def.stability);
      if (def.recoil !== undefined) stats.push('后坐 ' + def.recoil);
      if (def.adsSpread !== undefined) stats.push('开镜散布 ' + def.adsSpread);
      if (def.damage) stats.push('基础伤害 ' + def.damage + 'J');
      if (def.cooldown) stats.push('出刀间隔 ' + def.cooldown + 's');
      if (stats.length) html += `<div>${this._esc(stats.join(' · '))}</div>`;
    }
    // ★ 近战刀术：不同刀不只是数值不同，连段顺序与攻击距离也必须在详情里可见。
    if (item.table === 'melee' && Array.isArray(def.moveset) && def.moveset.length) {
      html += '<div class="bagui-attach-title">刀术循环（连续出刀按顺序）</div>';
      def.moveset.forEach((mv, i) => {
        const nm = mv.label ? this.engine.i18n.t(mv.label) : ('第 ' + (i + 1) + ' 刀');
        const parts = [];
        if (mv.mul) parts.push('×' + mv.mul.toFixed(2));
        if (mv.range) parts.push(mv.range + 'm');
        if (mv.cd) parts.push(mv.cd + 's');
        if (mv.hits) parts.push(mv.hits + ' 次伤口/' + (mv.window || 0.1) + 's');
        if (mv.bleed) parts.push('出血 ×' + mv.bleed.toFixed(1));
        html += `<div style="display:flex;justify-content:space-between;gap:6px;font-size:10px;padding:1px 0;border-bottom:1px solid rgba(80,125,175,.12)"><span style="color:#a8d8ff">${i + 1}. ${this._esc(nm)}</span><span style="color:#8fb0c8">${this._esc(parts.join(' · '))}</span></div>`;
      });
      if (def.bleedMul) html += `<div style="font-size:9px;color:#ff9a9a;margin-top:3px">伤口撕裂倍率 ×${def.bleedMul.toFixed(1)}：命中会额外撕开伤口，出血效率远高于普通刀</div>`;
    }
    // ★ 开火模式预览
    if (def.fireModes && def.fireModes.length) {
      const labels = { single: '单发', semi: '半自动', auto: '全自动', pump: '泵动' };
      const modeText = def.fireModes.map(m => labels[m] || m).join(' / ');
      html += `<div>开火模式：${this._esc(modeText)}</div>`;
    }
    // ★ 冲压只在弹药数值行显示合计值，不再单独列出“穿透/冲压额外”两项
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
      const nextAmmo = queue.length ? (inv.resolveLoadedDef ? inv.resolveLoadedDef(queue[0]) : inv.content.get('ammo', queue[0])) : null;
      const nextName = nextAmmo ? this.engine.i18n.t(nextAmmo.name) : '空';
      const world = this.engine.app ? this.engine.app.world : null;
      const inMatchNow2 = !!(world && world.running);
      // 战局内（含靶场）普通枪不允许在详情里瞬间改弹链；榴弹炮例外：
      // 它是逐发压入弹膛的物理动作，允许在详情里按“装 1”逐发装填。
      // ★ 战局内也允许逐发压弹：走 ActionProcess，可中断、部分保留；
      //   旧版把按钮隐藏成“设为首选”，玩家只能按 R 瞬间装满，弹匣系统看起来是假的。
      const canDirect = !inMatchNow2 || inv === this.inv;
      const canLoadDirect = inv === this.inv;
      const isReloading = world && world.actionProcess
        ? (world.actionProcess.isRunning() || world.actionProcess.isRunning('loadmag'))
        : false;
      const loadedMagUid2 = item.attachments && item.attachments.mag;
      const needsMag = inv.usesDetachableMagazine(def) && !loadedMagUid2;
      const loadLocked = !!(world && world.isItemLocked && (world.isItemLocked(uid) || (loadedMagUid2 && world.isItemLocked(loadedMagUid2))));
      const prefDef = item.loadedPreference
        ? (inv.resolveLoadedDef ? inv.resolveLoadedDef(item.loadedPreference) : inv.content.get('ammo', item.loadedPreference))
        : null;

      html += `<div class="bagui-ammo-row" style="align-items:flex-start;flex-direction:column;gap:3px">` +
        `<div style="display:flex;justify-content:space-between;width:100%"><span>弹链：<b>${total}</b> / ${magCap}</span><span style="color:#8fb0c8">下一发：${this._esc(nextName)}</span></div>` +
        (prefDef ? `<div style="font-size:9px;color:#ffd93d">首选弹药：${this._esc(this.engine.i18n.t(prefDef.name))}</div>` : '');

      if (groups.length === 0) {
        html += `<div style="color:#6f8fae;font-size:10px">弹匣为空</div>`;
      } else {
        html += `<div class="bagui-ammo-chain">`;
        for (const g of groups) {
          const ad = inv.resolveLoadedDef ? inv.resolveLoadedDef(g.ammoId) : inv.content.get('ammo', g.ammoId);
          const an = ad ? this.engine.i18n.t(ad.name) : g.ammoId;
          html += `<div class="bagui-ammo-chain-row">
            <span class="bagui-ammo-chain-name">▮ ${this._esc(an)} <b>×${g.count}</b></span>
            <span style="display:flex;gap:3px">`;
          if (canDirect) {
            html += `<button class="bagui-btn bagui-mini" data-action="unload-one" data-uid="${uid}" data-ammo="${this._esc(g.ammoId)}">取 1</button>
              <button class="bagui-btn bagui-mini" data-action="unload-type" data-uid="${uid}" data-ammo="${this._esc(g.ammoId)}">全取</button>`;
          }
          html += `</span></div>`;
        }
        html += `</div>`;
        html += `<div style="display:flex;gap:4px;flex-wrap:wrap">`;
        if (canDirect) html += `<button class="bagui-btn bagui-mini" data-action="unload-all" data-uid="${uid}">全部扣下</button>`;
        if (isReloading && inv === this.inv) html += `<span style="color:#ffd93d;font-size:10px;align-self:center">换弹中…</span>`;
        html += `</div>`;
        if (!canDirect && inv === this.inv && total > 0 && Object.values(inv.equipped || {}).includes(uid)) {
          html += `<button class="bagui-btn bagui-mini" data-action="unload-action" data-uid="${uid}" style="margin-top:4px">卸下弹链（0.75s）</button>`;
        }
      }
      html += `</div>`;

      // 榴弹炮：4 个弹膛格，按发射顺序显示当前装填物；配合下方“装 1”逐发压入。
      if (def.launcher) {
        html += `<div class="bagui-attach-title">40mm 弹膛 · 逐发（左→右 = 发射顺序）</div>
          <div style="display:flex;gap:4px;margin:3px 0 4px">`;
        for (let ci = 0; ci < magCap; ci++) {
          const cid = queue[ci] || null;
          const cad = cid ? (inv.resolveLoadedDef ? inv.resolveLoadedDef(cid) : inv.content.get('nade', cid)) : null;
          html += `<div style="flex:1;min-width:0;height:44px;border:1px solid ${cid ? 'rgba(255,200,90,.55)' : 'rgba(120,150,180,.3)'};border-radius:4px;background:${cid ? 'rgba(70,52,20,.75)' : 'rgba(12,20,30,.6)'};display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;color:${cid ? '#ffe0a0' : '#6f8fae'};padding:2px;overflow:hidden">${cad ? this._esc(this.engine.i18n.t(cad.name)) : '空'}</div>`;
        }
        html += `</div>`;
        if (!canDirect) html += `<div style="color:#8fb0c8;font-size:9px">战局内可逐发压入；点击下方“装 1”会装到弹膛末尾。</div>`;
      }

      // 兼容口径的弹药列表：榴弹炮列出背包里的投掷物实物，普通枪列出兼容弹药。
      if (inv === this.inv || !inMatchNow2) {
        const avail = inv.listCompatibleAmmo(item);
        html += `<div class="bagui-attach-title">${def.launcher ? '可装填投掷物' : '可用弹药'} · ${def.launcher ? '40mm 弹膛' : ('口径 ' + this._esc(def.ammoType || '—'))}</div>`;
        if (!avail.length) {
          html += `<div style="color:#6f8fae;font-size:10px">${def.launcher ? '没有可装填的投掷物' : '没有兼容弹药'}</div>`;
        } else {
          for (const a of avail) {
            const ad = a.def || (inv.resolveLoadedDef ? inv.resolveLoadedDef(a.defId) : inv.content.get('ammo', a.defId));
            const an = ad ? this.engine.i18n.t(ad.name) : a.defId;
            const srcUid = a.uids[0];
            html += `<div class="bagui-ammo-chain-row">
              <span class="bagui-ammo-chain-name">${this._esc(an)} <b>×${a.qty}</b></span>
              <span style="display:flex;gap:3px">`;
            if (needsMag) {
              html += `<span style="color:#ff9a7a;font-size:9px;align-self:center">未安装弹匣</span>`;
            } else if (canLoadDirect && !loadLocked) {
              html += `<button class="bagui-btn bagui-mini" data-action="load-one" data-uid="${uid}" data-ammo-uid="${srcUid}">${inMatchNow2 ? '压 1' : '装 1'}</button>
                <button class="bagui-btn bagui-mini" data-action="load-all" data-uid="${uid}" data-ammo-uid="${srcUid}">${inMatchNow2 ? '装满' : '装满'}</button>`;
            } else if (loadLocked) {
              html += `<span style="color:#ffd93d;font-size:9px;align-self:center">🔒 压弹中</span>`;
            } else {
              html += `<button class="bagui-btn bagui-mini" data-action="prefer" data-uid="${uid}" data-ammo="${this._esc(a.defId)}">设为首选</button>`;
            }
            // 榴弹炮无论能否直接装填，都保留“设为首选”，让 R 键优先装这个弹种
            if (def.launcher && canLoadDirect) {
              html += `<button class="bagui-btn bagui-mini" data-action="prefer" data-uid="${uid}" data-ammo="${this._esc(a.defId)}">设为首选</button>`;
            }
            html += `</span></div>`;
          }
          if (!canDirect) html += `<div style="color:#8fb0c8;font-size:9px">${def.launcher ? '战局内按 R 逐发装填；装填顺序就是发射顺序。' : '战局内不能直接改弹链；设为首选后按 R 换弹会优先装填该弹种。'}</div>`;
        }
      }
    }

    if (item.attachments) {
      // ★ 配件槽与背包同构：每个槽是一个 2×2 网格，已装配件直接作为可拖拽物品渲染。
      //   拖出到背包 = 拆下，拖入 = 安装；点击物品看详情，不再“点一下就拆”。
      html += '<div class="bagui-attach-title">配件槽 · 与背包同构（拖出即拆下）</div><div class="bagui-attach-grid">';
      const SLOT_LABEL = {
        muzzle: '枪口', muzzlePatch: '枪口贴片', sight: '主瞄具', sideSight: '侧瞄',
        grip: '握把', stock: '枪托', mag: '弹匣', sideTactical: '侧战术',
      };
      // ★ 硬点列表从 Inventory.WEAPON_ATTACH_SLOTS 单一真相源派生：
      //   旧版这里写死 4 个槽，导致枪托/侧瞄/侧面战术具在详情里根本看不到。
      for (const slot of WEAPON_ATTACH_SLOTS) {
        const aUid = item.attachments[slot];
        const aItem = aUid ? inv.items.get(aUid) : null;
        const aDef = aItem ? inv.getDef(aItem) : null;
        // ★ 硬点固定为单格：配件在背包里可以占 2×2，但装进枪只显示一个格子，
        //   8 个部位也不用把详情页撑成一张大网格。
        html += `<div class="bagui-attach-slot" data-weapon-uid="${uid}" data-attach-slot="${slot}">`;
        html += `<span class="bagui-attach-label">${SLOT_LABEL[slot] || slot}</span>`;
        html += `<div class="bagui-grid-wrap" data-container="attach:${uid}:${slot}" style="width:${CELL}px;height:${CELL}px;position:relative;background:rgba(10,18,30,.8);border:1px solid ${aUid ? 'rgba(110,190,255,.4)' : 'rgba(80,125,175,.2)'};border-radius:4px">`;
        html += `<div class="bagui-cell" style="left:0;top:0;width:${CELL}px;height:${CELL}px"></div>`;
        if (aItem) {
          html += this._itemHtml(aUid, { x: 0, y: 0, w: 1, h: 1, rotated: false }, `attach:${uid}:${slot}`, inv);
        }
        html += `</div>`;
        if (aItem) {
          const aRaw = aDef ? (aDef.name || aDef.n || '?') : '?';
          html += `<span class="bagui-attach-val" style="font-size:9px;line-height:1.2">${this._esc(this.engine.i18n.t(aRaw))}</span>`;
          // ★ 激光/战术灯按“每个配件”独立开关，不再共用 p.laserOn：
          //   握把激光 + 侧轨激光、握把灯 + 侧轨灯可以各自启停。
          const isDev = !!(aDef && aDef.stats && (aDef.stats.laser || aDef.stats.light));
          if (isDev) {
            const devOn = !!aItem.deviceOn;
            const devKind = aDef.stats.laser ? 'laser' : 'light';
            html += `<button class="bagui-btn bagui-mini" data-toggle-device="${devKind}" data-device-slot="${slot}" data-device-uid="${aUid}" style="margin-top:2px;font-size:8px;padding:1px 5px;border-color:${devOn ? 'rgba(120,255,180,.7)' : 'rgba(120,180,220,.5)'}">${devOn ? '关闭' : '开启'}</button>`;
          }
          if (inv === this.inv) html += `<button class="bagui-btn bagui-mini" data-detach-attach="${uid}" data-detach-slot="${slot}" style="margin-top:2px;font-size:8px;padding:1px 5px">拆下</button>`;
        } else {
          html += '<span class="bagui-attach-empty" style="font-size:9px">空</span>';
        }
        html += `</div>`;
      }
      html += '</div>';
      // 汇总修正：让玩家一眼看到配件到底改了什么，而不是只有名字
      const mods = inv.getAttachmentStats ? inv.getAttachmentStats(item) : null;
      if (mods && mods.count > 0) {
        const pct = (v) => Math.round((v - 1) * 100);
        const lines = [];
        if (mods.spreadMul !== 1) lines.push('散布 ' + (pct(mods.spreadMul) > 0 ? '+' : '') + pct(mods.spreadMul) + '%');
        if (mods.recoilMul !== 1) lines.push('后坐 ' + (pct(mods.recoilMul) > 0 ? '+' : '') + pct(mods.recoilMul) + '%');
        if (mods.magMul !== 1) lines.push('弹匣 +' + Math.round((mods.magMul - 1) * 100) + '%');
        if (mods.reloadMul !== 1) lines.push('换弹 ' + (pct(mods.reloadMul) > 0 ? '+' : '') + pct(mods.reloadMul) + '%');
        if (mods.zoom > 1) lines.push('开镜 ' + mods.zoom.toFixed(1) + 'x');
        if (mods.laser) lines.push('激光指示');
        html += `<div style="font-size:10px;color:#9fe0b0;margin-top:4px">配件汇总：${this._esc(lines.join(' · ') || '无')}</div>`;
      }
      html += `<div style="font-size:9px;color:#6f8fae;margin-top:2px">拖动配件到枪上/槽位快速安装或替换；拖出槽位即拆下，点击可看配件详情。</div>`;
    }

    // ★ 弹匣物品详情：弹匣自己存弹，必须能看容量、逐发压入/退出，
    //   不能只把弹匣当成一个“配件图标”。战局内压弹会进入可中断进程。
    if (item.table === 'attach' && def.slot === 'mag') {
      const nm = inv.normalizeMagazine(item);
      const cap = nm ? nm.cap : (def.capacity || 0);
      const queue = nm ? nm.loaded.queue : [];
      const world = this.engine.app ? this.engine.app.world : null;
      const locked = !!(world && world.isItemLocked && world.isItemLocked(uid));
      const ownerUid = inv.parentOf ? inv.parentOf.get(uid) : null;
      const owner = ownerUid ? inv.items.get(ownerUid) : null;
      const ownerDef = owner ? inv.getDef(owner) : null;
      const groups = [];
      for (const id of queue) {
        const last = groups[groups.length - 1];
        if (last && last.id === id) last.count++;
        else groups.push({ id, count: 1 });
      }
      html += `<div class="bagui-attach-title">弹匣 · ${this._esc(def.caliber || '—')} · 容量 ${cap}</div>`;
      html += `<div style="display:flex;justify-content:space-between;width:100%"><span>已装：<b>${queue.length}</b> / ${cap}</span>${ownerDef ? `<span style="color:#8fb0c8">装在 ${this._esc(this.engine.i18n.t(ownerDef.name))}</span>` : '<span style="color:#6f8fae">未安装</span>'}</div>`;
      if (locked) html += `<div style="color:#ffd93d;font-size:9px">🔒 正在压弹：弹匣与弹药已锁定，完成或中断后才能移动</div>`;
      if (!groups.length) {
        html += `<div style="color:#6f8fae;font-size:10px">空弹匣</div>`;
      } else {
        html += `<div class="bagui-ammo-chain">`;
        for (const g of groups) {
          const ad = inv.resolveLoadedDef ? inv.resolveLoadedDef(g.id) : inv.content.get('ammo', g.id);
          const an = ad ? this.engine.i18n.t(ad.name) : g.id;
          html += `<div class="bagui-ammo-chain-row"><span class="bagui-ammo-chain-name">▮ ${this._esc(an)} <b>×${g.count}</b></span>`;
          if (inv === this.inv && !locked) {
            html += `<span style="display:flex;gap:3px"><button class="bagui-btn bagui-mini" data-action="unload-one" data-uid="${uid}" data-ammo="${this._esc(g.id)}">退 1</button><button class="bagui-btn bagui-mini" data-action="unload-type" data-uid="${uid}" data-ammo="${this._esc(g.id)}">全退</button></span>`;
          }
          html += `</div>`;
        }
        html += `</div>`;
      }
      if (inv === this.inv && !locked) {
        const avail = inv.listAmmoByCaliber(def.caliber);
        html += `<div class="bagui-attach-title">压入散装子弹 · ${this._esc(def.caliber || '—')}</div>`;
        if (!avail.length) {
          html += `<div style="color:#6f8fae;font-size:10px">随身没有这个口径的散装弹药</div>`;
        } else {
          for (const a of avail) {
            const ad = a.def;
            const an = ad ? this.engine.i18n.t(ad.name) : a.defId;
            const srcUid = a.uids[0];
            html += `<div class="bagui-ammo-chain-row"><span class="bagui-ammo-chain-name">${this._esc(an)} <b>×${a.qty}</b></span><span style="display:flex;gap:3px">
              <button class="bagui-btn bagui-mini" data-action="load-one" data-uid="${uid}" data-ammo-uid="${srcUid}">压 1</button>
              <button class="bagui-btn bagui-mini" data-action="load-all" data-uid="${uid}" data-ammo-uid="${srcUid}">装满</button>
            </span></div>`;
          }
        }
        html += `<div style="font-size:9px;color:#6f8fae;margin-top:2px">战局内逐发压入，移动/开火或被击中会中断；已压入的子弹保留。</div>`;
      }
    }

    if (item.effects && item.effects.length > 0) {
      html += '<div class="bagui-effects-title">效果</div><div class="bagui-effects">';
      for (const e of item.effects) {
        const name = typeof e === 'string' ? e : (e.name || e.id || '?');
        html += `<div class="bagui-effect-item">${this._esc(name)}</div>`;
      }
      html += '</div>';
    }

    if (item.innerGrid && inv === this.inv && !this._lootTarget && item.innerGrid.w > 0 && item.innerGrid.h > 0) {
      // ★ 不再弹一个“打开内部网格”按钮：直接把内部网格嵌在详情里，
      //   与背包主网格同构，物品可拖进拖出。
      html += `<div class="bagui-attach-title">内部网格 ${item.innerGrid.w}×${item.innerGrid.h}</div>`;
      html += `<div class="bagui-grid-wrap" data-container="inner:${uid}" style="width:${item.innerGrid.w * CELL}px;height:${item.innerGrid.h * CELL}px;position:relative;background:rgba(10,18,30,.8);border:1px solid rgba(80,125,175,.2);border-radius:4px;max-width:100%;overflow:auto">`;
      for (let y = 0; y < item.innerGrid.h; y++) {
        for (let x = 0; x < item.innerGrid.w; x++) {
          html += `<div class="bagui-cell" style="left:${x * CELL}px;top:${y * CELL}px;width:${CELL}px;height:${CELL}px"></div>`;
        }
      }
      for (const [childUid, pos] of item.innerGrid.items) {
        html += this._itemHtml(childUid, pos, `inner:${uid}`, inv);
      }
      html += `</div><div style="font-size:9px;color:#6f8fae;margin-top:2px">物品可直接拖进/拖出这个内部网格</div>`;
    } else if (item.innerGrid && inv === this.inv) {
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

    // ★ 医疗物品：真正可使用（止血 / 止痛 / 夹板 / 输血 / 手术 / 兴奋剂）
    if (item.table === 'medical' && def.use && inv === this.inv) {
      const u = def.use;
      const label = {
        bandage: '包扎止血', painkiller: '服用止痛药', splint: '上夹板固定',
        blood: '静脉输注血浆', surgery: '进行野外手术', stim: '注射兴奋剂',
      }[u.kind] || '使用';
      if (inMatchNow) {
        const running = world.actionProcess && world.actionProcess.isRunning();
        html += `<button class="bagui-btn" data-use-medical="${uid}" ${running ? 'disabled style="opacity:.45;margin-top:8px"' : 'style="margin-top:8px;background:rgba(40,130,90,.7);border-color:rgba(120,240,170,.8);color:#d8ffe8"'}>${label} · ${(u.time || 1).toFixed(1)}s</button>`;
        if (running) html += `<div style="font-size:10px;color:#ffd93d;margin-top:3px">当前有动作正在进行</div>`;
      } else {
        html += `<div style="font-size:10px;color:#6f8fae;margin-top:8px">进入战局后才能使用。</div>`;
      }
    }

    // ★ 搜刮界面：详情里给一个单点「拿取」，触屏用户不必依赖双击
    if (inv !== this.inv && this._lootTarget && inMatchNow) {
      html += `<button class="bagui-btn" data-quick-take="${uid}" style="margin-top:8px;background:rgba(50,130,90,.7);border-color:rgba(120,240,170,.8);color:#d8ffe8">拿取</button>`;
    }

    const isInStash = inv.parentOf.get(uid) === 'c:stash';
    const isInMatch = this.engine.app && this.engine.app.world && this.engine.app.world.running;
    if (isInStash && !isInMatch && inv === this.inv && this.mode !== 'asaka') {
      const sellValue = Math.floor(unitVal * 0.8);
      html += `<button class="bagui-btn" id="bagui-sell-btn" style="background:rgba(200,80,80,.6);border-color:rgba(255,100,100,.8);margin-top:8px">卖出 (${sellValue} cp)</button>`;
    }

    if (isInMatch && inv === this.inv && !isInStash && this.mode !== 'asaka') {
      html += `<button class="bagui-btn" id="bagui-discard-btn" style="background:rgba(100,100,100,.5);border-color:rgba(200,200,200,.5)">丢弃到地面</button>`;
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
    el.querySelectorAll('[data-action="unload-action"]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const world = this.engine.app && this.engine.app.world;
        if (world && world._startUnload) world._startUnload(btn.dataset.uid);
      };
    });
    el.querySelectorAll('[data-action="prefer"]').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); this._preferAmmo(btn.dataset.uid, btn.dataset.ammo); };
    });
    const prazeAbsorbBtn = document.getElementById('bagui-praze-absorb-item');
    if (prazeAbsorbBtn) {
      prazeAbsorbBtn.onclick = (e) => {
        e.stopPropagation();
        const w = this.engine.app && this.engine.app.world;
        if (!w || !w._absorbPrazeCoreItem) return;
        const res = w._absorbPrazeCoreItem(uid);
        if (res && res.ok) {
          this._toast('已吸收 ' + (res.band || '') + ' 级 Praze 核心，耦合上限提升。');
          this.selectedUid = null;
          this._deselectDetail();
          this.refresh();
        } else if (res && res.text) {
          this._toast(res.text);
        }
      };
    }
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

    el.querySelectorAll('.bagui-btn[data-use-medical]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const medUid = btn.dataset.useMedical;
        if (!world || !world._useMedical) return;
        if (world._useMedical(medUid)) this.refresh();
      };
    });

    el.querySelectorAll('[data-quick-take]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this._quickEquip(btn.dataset.quickTake);
        this._deselectDetail();
      };
    });

    el.querySelectorAll('[data-remove-plate]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (inv !== this.inv) return;
        const hostUid = btn.dataset.removePlate;
        const pUid = inv.detachSubSlot(hostUid, 'plate');
        if (!pUid) return;
        // 优先回安装前腾出的原格；插板本来就在身上，回格子时不再重复计重。
        let placed = this._restoreStoredPos(inv, pUid);
        if (!placed) {
          placed = inv.addToContainer('bag', pUid, { ignoreWeight: true }).ok
            || inv.addToContainer('chest', pUid, { ignoreWeight: true }).ok
            || inv.addToContainer('pocket', pUid, { ignoreWeight: true }).ok
            || inv.addToContainer('safe', pUid, { ignoreWeight: true }).ok
            || inv.addToContainer('stash', pUid, { ignoreWeight: true }).ok;
        }
        if (!placed) {
          inv.attachToSubSlot(hostUid, 'plate', pUid);
          this._toast('背包、胸挂、口袋与仓库都没有空间，无法取出插板');
        } else {
          const worldNow = this.engine.app && this.engine.app.world;
          if (worldNow && worldNow._syncArmorFromInventory) worldNow._syncArmorFromInventory();
        }
        this.refresh();
      };
    });

    // ★ 外骨骼头显 / 自动火力 / 硬点接管与拆下
    el.querySelectorAll('[data-exo-visor]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const world = this.engine.app && this.engine.app.world;
        if (!world || !world.running || !world._toggleExoVisor) { this._toast('只在战局内可操作头显'); return; }
        world._toggleExoVisor();
        this.refresh();
      };
    });
    el.querySelectorAll('[data-exo-auto]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const world = this.engine.app && this.engine.app.world;
        if (!world || !world.running || !world._toggleExoAutoFire) { this._toast('只在战局内可操作自动火力'); return; }
        world._toggleExoAutoFire();
        this.refresh();
      };
    });
    el.querySelectorAll('[data-exo-take]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const world = this.engine.app && this.engine.app.world;
        if (!world || !world.running || !world._selectExoMount) { this._toast('只在战局内可接管挂载武器'); return; }
        world._selectExoMount(parseInt(btn.dataset.exoIdx, 10) || 0);
        if (this.close) this.close();
        else this.toggle();
      };
    });
    el.querySelectorAll('[data-exo-detach]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (inv !== this.inv) return;
        const idx = parseInt(btn.dataset.exoIdx, 10) || 0;
        const wUid = inv.dismountExo(btn.dataset.exoDetach, idx);
        if (!wUid) return;
        let placed = false;
        for (const t of ['bag', 'chest', 'pocket', 'safe']) {
          if (inv.addToContainer(t, wUid).ok) { placed = true; break; }
        }
        if (!placed) {
          // 放不下就装回去
          inv.mountToExo(btn.dataset.exoDetach, idx, wUid);
          this._toast('背包/胸挂/口袋都没有空间，无法拆下挂载武器');
        } else {
          const world = this.engine.app && this.engine.app.world;
          if (world && world._syncExoMounts) world._syncExoMounts();
        }
        this.refresh();
      };
    });

    el.querySelectorAll('[data-remove-battery]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (inv !== this.inv) return;
        const hostUid = btn.dataset.removeBattery;
        const bUid = inv.detachSubSlot(hostUid, 'battery');
        if (!bUid) return;
        let placed = this._restoreStoredPos(inv, bUid);
        if (!placed) {
          placed = inv.addToContainer('bag', bUid, { ignoreWeight: true }).ok
            || inv.addToContainer('chest', bUid, { ignoreWeight: true }).ok
            || inv.addToContainer('pocket', bUid, { ignoreWeight: true }).ok
            || inv.addToContainer('safe', bUid, { ignoreWeight: true }).ok
            || inv.addToContainer('stash', bUid, { ignoreWeight: true }).ok;
        }
        if (!placed) {
          inv.attachToSubSlot(hostUid, 'battery', bUid);
          this._toast('没有空间取出电池');
        }
        const world = this.engine.app && this.engine.app.world;
        if (world && world._syncArmorFromInventory) world._syncArmorFromInventory();
        this.refresh();
      };
    });

    el.querySelectorAll('[data-take-plate]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (!this.viewInv) return;
        const hostUid = btn.dataset.takePlate;
        const pUid = this.viewInv.detachSubSlot(hostUid, 'plate');
        if (!pUid) return;
        let moved = false;
        let lastReason = null;
        for (const t of ['bag', 'chest', 'pocket', 'safe']) {
          const r = this.viewInv.transferItem(this.inv, pUid, t);
          if (r.ok) { moved = true; break; }
          lastReason = r.reason;
        }
        if (!moved) {
          this.viewInv.attachToSubSlot(hostUid, 'plate', pUid);
          this._toast(lastReason === 'overweight' ? '负重已达硬上限，无法拿走插板' : '背包没有空间拿走插板');
        }
        this.refresh();
      };
    });

    // 点击「拆下」按钮才拆配件；点击配件本体只是查看详情，避免误拆
    el.querySelectorAll('[data-detach-attach]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (inv !== this.inv) return;
        const wUid = btn.dataset.detachAttach;
        const slotName = btn.dataset.detachSlot;
        const wItem = inv.items.get(wUid);
        if (!wItem || !wItem.attachments || !wItem.attachments[slotName]) return;
        const aUid = inv.detachFrom(wUid, slotName);
        if (!aUid) return;
        // 优先回到安装前腾出的原格；其次背包/胸挂/口袋/安全箱；最后仓库兜底。
        // 配件本来就在身上，重新放回格子不应再被“负重硬上限”拦一次。
        let placed = this._restoreStoredPos(inv, aUid);
        if (!placed) {
          placed = inv.addToContainer('bag', aUid, { ignoreWeight: true }).ok
            || inv.addToContainer('chest', aUid, { ignoreWeight: true }).ok
            || inv.addToContainer('pocket', aUid, { ignoreWeight: true }).ok
            || inv.addToContainer('safe', aUid, { ignoreWeight: true }).ok
            || inv.addToContainer('stash', aUid, { ignoreWeight: true }).ok;
        }
        if (!placed) {
          // 放不下就装回去，绝不把配件丢到虚空
          inv.attachTo(wUid, slotName, aUid);
          this._toast('背包、胸挂、口袋与仓库都没有空间，无法拆下配件');
        } else {
          const worldNow = this.engine.app && this.engine.app.world;
          if (worldNow && worldNow._syncWeaponsFromInventory) worldNow._syncWeaponsFromInventory();
        }
        this.refresh();
      };
    });

    // ★ 激光/战术灯独立开关：每个配件有自己的 deviceOn，不再共用 p.laserOn。
    el.querySelectorAll('[data-toggle-device]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const aUid = btn.dataset.deviceUid;
        const aItem = inv.items.get(aUid);
        if (!aItem) return;
        const aDef = inv.getDef(aItem);
        if (!aDef || !aDef.stats || aItem.damaged) return;
        aItem.deviceOn = !aItem.deviceOn;
        const worldNow = this.engine.app && this.engine.app.world;
        if (worldNow && worldNow._syncWeaponDeviceAggregate) worldNow._syncWeaponDeviceAggregate();
        this.refresh();
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
          if (this.engine.app && this.engine.app._updateCredits) this.engine.app._updateCredits();
          this._deselectDetail();
          this.refresh();
        }
      };
    }

    const discardBtn = document.getElementById('bagui-discard-btn');
    if (discardBtn) {
      discardBtn.onclick = (e) => {
        e.stopPropagation();
        if (!confirm(`确认丢弃 ${displayName} 到地面？`)) return;
        const world = this.engine.app && this.engine.app.world;
        if (world && world.running && world._dropItemToGround) {
          if (world._dropItemToGround(uid)) {
            this._deselectDetail();
            this.refresh();
          }
        }
      };
    }
    // 详情里的内嵌网格物品也必须能拖拽；否则“同构格子”只是贴图
    if (el.querySelector('.bagui-item.has-item')) this._bindItemEvents(el);
  }

 _loadAmmoFrom(targetUid, ammoUid, count) {
  const inv = this.viewInv.items.has(targetUid) ? this.viewInv : this.inv;
  const item = inv.items.get(targetUid);
  const ammo = inv.items.get(ammoUid);
  if (!item || !ammo) return;
  const world = this.engine.app ? this.engine.app.world : null;
  const isMag = item.table === 'attach' && inv.getDef(item) && inv.getDef(item).slot === 'mag';
  if (item.table !== 'weapons' && !isMag) return;
  const isLauncher = item.table === 'weapons' && !!(inv.getDef(item) && inv.getDef(item).launcher);
  if (ammo.table !== (isLauncher ? 'nade' : 'ammo')) return;
  // 动作进行中不能再叠加一次装填，避免一个动作完成两项变化
  if (world && world.actionProcess && (world.actionProcess.isRunning('reload') || world.actionProcess.isRunning('loadmag'))) {
    this._toast('当前已有装填/压弹动作在进行');
    return;
  }
  const inMatch = world && world.running;
  // 榴弹炮：允许在详情里逐发压入弹膛（物理上就是打开弹膛塞一发）
  if (inMatch && !world.training && inv === this.inv && isLauncher) {
    const res = inv.loadAmmoFromItem(targetUid, ammoUid, count);
    if (!res.ok) {
      const msg = { full: '弹膛已满', empty: '没有可装填的投掷物', caliber: '口径不匹配' }[res.reason] || '装填失败';
      this._toast(msg);
      return;
    }
    if (world._log) world._log('40mm 弹膛 +' + res.taken, 'p');
    this.refresh();
    return;
  }
  // ★ 战局内：散装子弹逐发压入，ActionProcess 可中断、部分保留。
  if (inMatch && inv === this.inv) {
    if (item.table === 'weapons') {
      const ad = inv.getDef(ammo);
      item.loadedPreference = ad ? ad.id : ammo.defId;
    }
    const r = world.startLoadRounds(targetUid, ammoUid, count);
    if (r.ok) {
      this._toast('开始压弹：目标 ' + (r.want || 0) + ' 发；移动/开火/受伤会中断，已压入的子弹保留');
    } else {
      const msg = {
        full: isMag ? '弹匣已满' : '弹仓已满', busy: '当前动作尚未完成',
        no_ammo: '没有兼容的散装弹药', no_space: '背包放不下退出的子弹',
        no_mag: '这把枪需要先安装弹匣，不能直接把子弹塞进枪里',
        has_mag: '这把枪的子弹要压进弹匣，不能直接塞进枪里',
      }[r.reason] || '装填失败';
      this._toast(msg);
    }
    this.refresh();
    return;
  }
  // ★ 菜单/仓库：同样逐发调用底层 API，但不需要等待动作时间。
  //   可拆弹匣枪在菜单里也要压进它的弹匣，不能把子弹直接塞进枪 item。
  let loadTargetUid = targetUid;
  let loadIsMag = isMag;
  if (item.table === 'weapons') {
    const magItem = inv.getMagazineOfWeapon(item);
    if (magItem && inv.usesDetachableMagazine(inv.getDef(item))) {
      loadTargetUid = magItem.uid;
      loadIsMag = true;
    }
  }
  const want = count === Infinity ? 9999 : Math.max(1, count || 1);
  let moved = 0;
  for (let i = 0; i < want; i++) {
    let srcUid = ammoUid;
    if (!inv.items.get(srcUid)) {
      const next = loadIsMag
        ? inv.listAmmoByCaliber(inv.getDef(inv.items.get(loadTargetUid)).caliber)
        : inv.listCompatibleAmmo(item);
      const g = next && next[0];
      srcUid = g && g.uids && g.uids[0];
    }
    if (!srcUid) break;
    const res = loadIsMag
      ? inv.loadOneRoundIntoMagazine(loadTargetUid, srcUid)
      : inv.loadOneRoundIntoWeapon(loadTargetUid, srcUid);
    if (!res.ok) {
      if (!moved) {
        const msg = { full: '弹匣已满', caliber: '口径不匹配', empty: '没有子弹', has_mag: '这把枪要压弹匣，不能直接塞进枪里', no_mag: '这把枪需要先安装弹匣' }[res.reason] || '装填失败';
        this._toast(msg);
      }
      break;
    }
    moved++;
    if (count !== Infinity && moved >= want) break;
  }
  this.selectedUid = targetUid;
  this.refresh();
}

 _unloadAmmoFrom(targetUid, ammoId, count) {
  const inv = this.viewInv.items.has(targetUid) ? this.viewInv : this.inv;
  const item = inv.items.get(targetUid);
  if (!item) return;
  const world = this.engine.app ? this.engine.app.world : null;
  if (world && world.actionProcess && (world.actionProcess.isRunning('reload') || world.actionProcess.isRunning('loadmag'))) {
    this._toast('当前装填/压弹动作尚未完成');
    return;
  }
  const isMag = item.table === 'attach' && inv.getDef(item) && inv.getDef(item).slot === 'mag';
  if (!isMag && item.table !== 'weapons') return;
  const want = count === Infinity ? 9999 : Math.max(1, count || 1);
  let removed = 0;
  for (let i = 0; i < want; i++) {
    const res = isMag
      ? inv.unloadOneRoundFromMagazine(targetUid, ammoId || null)
      : inv.unloadOneRoundFromWeapon(targetUid, ammoId || null);
    if (!res.ok) {
      if (!removed) {
        const msg = { empty: '弹匣已空', no_space: '背包/胸挂/口袋都放不下' }[res.reason] || '扣弹失败';
        this._toast(msg);
      }
      break;
    }
    removed++;
    if (count !== Infinity && removed >= want) break;
  }
  if (removed && world && world._syncWeaponsFromInventory) world._syncWeaponsFromInventory();
  this.selectedUid = targetUid;
  this.refresh();
}

 _preferAmmo(weaponUid, ammoDefId) {
  const inv = this.viewInv.items.has(weaponUid) ? this.viewInv : this.inv;
  const item = inv.items.get(weaponUid);
  if (!item || item.table !== 'weapons') return;
  const def = inv.getDef(item);
  // 榴弹炮的弹种在 nade 表里，统一存成 nade:frag，换弹时才能正确优先装填
  const pref = (def && def.launcher) ? ('nade:' + String(ammoDefId || '').replace(/^nade:/, '')) : ammoDefId;
  item.loadedPreference = pref || null;
  const world = this.engine.app ? this.engine.app.world : null;
  const ad = pref ? (inv.resolveLoadedDef ? inv.resolveLoadedDef(pref) : inv.content.get('ammo', pref)) : null;
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
    // ★ 物品可能在玩家背包，也可能在正在搜刮的尸体/容器里；必须按 uid 找到真正的 Inventory，
    //   否则会“在玩家背包里找不到 → 只报错不生效”，或者更糟：改错了数量。
    const inv = this.inv.items.has(uid) ? this.inv : (this.viewInv && this.viewInv.items.has(uid) ? this.viewInv : null);
    if (!inv) { this._toast('拆分失败：找不到物品'); return; }
    const origParent = inv.parentOf.get(uid);
    let preferred = null;
    if (origParent && origParent.startsWith('c:')) preferred = origParent.slice(2);
    const res = inv.splitStack(uid, count, preferred);
    if (!res.ok) {
      const why = {
        no_item: '物品不存在', qty_too_small: '数量不足', bad_count: '拆分数量不合法',
        no_space: '容器放不下拆出的物品', cycle: '不能放进自身',
      }[res.reason] || res.reason;
      this._toast('拆分失败：' + why);
      return;
    }
    this.selectedUid = res.newUid || uid;
    this.refresh();
  }

  // ★ 背包遮罩的 z-index 高于 HUD，只写 world._log 玩家根本看不到。
  //   所有重要提示（负重、失败原因、医疗预检）都要在遮罩内再弹一条 toast。
  showToast(msg) {
    let el = document.getElementById('bagui-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bagui-toast';
      const host = document.getElementById('bagui-overlay') || document.body;
      host.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('on');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('on'), 2800);
  }

  _toast(msg) {
    this.showToast(msg);
    const world = this.engine.app && this.engine.app.world;
    if (world && world._log) world._log(msg, 'y');
    else console.warn('[BagUI]', msg);
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

    // ★ 逐发压弹进程期间锁定弹匣/武器与弹药堆：不能拖走、不能拆、不能丢地上。
    const worldLock = this.engine.app && this.engine.app.world;
    if (worldLock && worldLock.isItemLocked
        && (worldLock.isItemLocked(uid) || (targetUid && worldLock.isItemLocked(targetUid)))) {
      this._toast('正在逐发压弹：完成或中断后才能移动被锁定的弹匣/弹药');
      if (srcEl) srcEl.style.opacity = 1;
      return;
    }

    // 详情里的内嵌插板格：把插板拖到这格 = 装入护甲（必须在 srcInv/srcItem 之后，避免 TDZ）
    const subSlotWrap = tgt.closest('.bagui-grid-wrap[data-container^="sub:"]');
    if (subSlotWrap && srcItem && srcItem.table === 'vestPlate') {
      const parts = String(subSlotWrap.dataset.container || '').split(':');
      if (parts[1]) { this._installPlateDrop(uid, parts[1], srcInv); return; }
    }

    // ★ 拖动枪到外骨骼挂载硬点 = 装上外骨骼；硬点只接受枪械
    const mountEl = tgt.closest('[data-exo-mount-slot]');
    if (mountEl && srcItem) {
      if (srcItem.table !== 'weapons') { this._toast('外骨骼硬点只接受枪械'); return; }
      if (srcInv !== this.inv) { this._toast('先把枪拿到自己身上，再装到外骨骼硬点'); return; }
      const exoUid = mountEl.dataset.exoMountSlot;
      const idx = parseInt(mountEl.dataset.exoMountIdx, 10) || 0;
      const exoItem = this.inv.items.get(exoUid);
      const oldUid = exoItem && Array.isArray(exoItem.mounts) ? exoItem.mounts[idx] : null;
      // 先把旧挂载枪挪回随身容器，确认有空间后再装新枪，避免替换失败留幽灵
      if (oldUid && oldUid !== uid) {
        this.inv.dismountExo(exoUid, idx);
        let placed = false;
        for (const t of ['bag', 'chest', 'pocket', 'safe']) {
          if (this.inv.addToContainer(t, oldUid).ok) { placed = true; break; }
        }
        if (!placed) {
          this.inv.mountToExo(exoUid, idx, oldUid);
          this._toast('没有空间安放被替换的挂载枪');
          return;
        }
      }
      const r = this.inv.mountToExo(exoUid, idx, uid);
      if (!r.ok) {
        this._toast(r.reason === 'cycle' ? '不能把外骨骼装进它自己的挂点' : '无法装到该硬点');
      } else {
        const world = this.engine.app && this.engine.app.world;
        if (world) {
          if (world._syncWeaponsFromInventory) world._syncWeaponsFromInventory();
          if (world._syncExoMounts) world._syncExoMounts();
        }
        this.refresh();
      }
      return;
    }

    // ★ 拖动配件到武器配件槽（必须在 srcInv/srcItem 之后，避免 TDZ）
    const attachSlotEl = tgt.closest('.bagui-attach-slot');
    if (attachSlotEl && srcItem) {
      this._handleAttachDrop(uid, attachSlotEl.dataset.weaponUid, attachSlotEl.dataset.attachSlot, srcInv);
      return;
    }

    // ★ 配件拖到枪上 = 快速安装/替换；拖到普通格子则按普通挪位处理，不再强行拦截。
    //   旧版只要拖的是配件就提示“必须拖到枪里”，导致背包内无法整理配件。
    if (srcItem && srcItem.table === 'attach') {
      const aDef = srcInv.getDef(srcItem);
      if (aDef && aDef.slot) {
        let weaponUid = null;
        if (targetUid) {
          const tw = this.inv.items.get(targetUid) || (this.viewInv && this.viewInv.items.get(targetUid));
          if (tw && tw.table === 'weapons') weaponUid = targetUid;
        }
        if (!weaponUid && (equipSlot === 'main' || equipSlot === 'side')) {
          const isRightSide = !!(this._lootTarget && this._lootTarget.isCorpse && tgt.closest('#bagui-right'));
          const eqInv = isRightSide ? this.viewInv : this.inv;
          weaponUid = eqInv.equipped[equipSlot] || null;
        }
        if (weaponUid) {
          this._handleAttachDrop(uid, weaponUid, aDef.slot, srcInv);
          return;
        }
      }
    }

    // ★ 外骨骼科技电池：拖到外骨骼上装入 battery 子槽
    if (srcItem && srcItem.table === 'battery') {
      let fiberUid = null;
      if (equipSlot === 'vestFiber') fiberUid = this.inv.equipped.vestFiber;
      if (targetUid) {
        const t = this.inv.items.get(targetUid) || (this.viewInv && this.viewInv.items.get(targetUid));
        const td = t && this.inv.getDef(t);
        if (t && td && td.exoskeleton) fiberUid = t.uid;
      }
      if (fiberUid) {
        let bid = uid;
        if (srcInv && srcInv !== this.inv) {
          let moved = null;
          for (const t of ['bag', 'chest', 'pocket', 'safe']) {
            const r = srcInv.transferItem(this.inv, uid, t);
            if (r.ok) { moved = r.newUid; break; }
          }
          if (!moved) { this._toast('背包没有空间放入电池'); return; }
          bid = moved;
        }
        const r = this.inv.attachToSubSlot(fiberUid, 'battery', bid);
        if (!r.ok) this._toast('电池安装失败');
        if (r.ok && r.swapped && r.swapped !== bid) {
          let placed = false;
          for (const t of ['bag', 'chest', 'pocket', 'safe']) {
            if (this.inv.addToContainer(t, r.swapped, { ignoreWeight: true }).ok) { placed = true; break; }
          }
          if (!placed) {
            this.inv.attachToSubSlot(fiberUid, 'battery', r.swapped);
            this._toast('没有空间安放被替换的旧电池，已撤销');
          }
        }
        const world = this.engine.app && this.engine.app.world;
        if (world && world._syncArmorFromInventory) world._syncArmorFromInventory();
        this.refresh();
        return;
      }
    }

    // ★ 插板：只能装进护甲纤维。拖到护甲槽 / 背包里的护甲上都算“快速装入”
    if (srcItem && srcItem.table === 'vestPlate') {
      let fiberUid = null;
      if (equipSlot === 'vestFiber') {
        const isRightSide = !!(this._lootTarget && this._lootTarget.isCorpse && tgt.closest('#bagui-right'));
        if (!isRightSide) fiberUid = this.inv.equipped.vestFiber;
      }
      if (targetUid) {
        const t = this.inv.items.get(targetUid) || (this.viewInv && this.viewInv.items.get(targetUid));
        const td = t && this.inv.getDef(t);
        if (t && t.table === 'vestFiber' && !(td && td.exoskeleton)) fiberUid = targetUid;
      }
      if (fiberUid) { this._installPlateDrop(uid, fiberUid, srcInv); return; }
      // 不是拖到护甲上：如果落点是普通网格，就按普通挪位处理（从内嵌格拖出到背包）
      if (!wrap) {
        this._toast('插板只能装进护甲纤维：把插板拖到「护甲」上');
        return;
      }
    }

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

    // 玩家容器 → 右侧搜刮网格（普通容器与玩家共用同一个 Inventory）
    if (!inLoot && isOverRight) {
      if (wrap && wrap.dataset.container === 'loot') {
        const rect = wrap.getBoundingClientRect();
        let gx = Math.round((px - offsetX - rect.left) / CELL);
        let gy = Math.round((py - offsetY - rect.top) / CELL);
        const item = this.inv.items.get(uid);
        if (item) {
          let ok = this._placeAt('loot', this.inv.containers.loot, uid, gx, gy, item.rotated, this.inv).ok;
          if (!ok) ok = this._placeAt('loot', this.inv.containers.loot, uid, gx, gy, !item.rotated, this.inv).ok;
          if (ok) { this.refresh(); return; }
        }
      }
      if (srcEl) srcEl.style.opacity = 1;
      return;
    }

    // 右侧搜刮网格 → 左侧任意玩家容器
    if (inLoot && isOverLeft && wrap) {
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
          if (ok) { this.refresh(); return; }
        }
      }
      if (srcEl) srcEl.style.opacity = 1;
      return;
    }
    // 同侧（左边各容器之间 / 右边 loot 网格内部）继续走通用网格放置
  } else {
    const isFromPlayerHere = this.inv.items.has(uid);
    const item = this.inv.items.get(uid) || (this.viewInv && this.viewInv.items.get(uid));
    // ★ 跨尸体/玩家拖拽也必须落到鼠标所在格子，不能 transferItem 默认补左上角。
    const containerName = wrap && wrap.dataset.container ? wrap.dataset.container : null;
    let dropPos = null;
    if (wrap && item) {
      const rect = wrap.getBoundingClientRect();
      dropPos = {
        x: Math.round((px - offsetX - rect.left) / CELL),
        y: Math.round((py - offsetY - rect.top) / CELL),
        rotated: !!item.rotated,
      };
    }
    if (isFromPlayerHere && isOverRight) {
      let moved = false;
      if (containerName && dropPos) {
        moved = this.inv.transferItem(this.viewInv, uid, containerName, dropPos).ok;
      } else {
        for (const t of ['chest', 'bag', 'pocket', 'safe']) {
          if (this.inv.transferItem(this.viewInv, uid, t).ok) { moved = true; break; }
        }
      }
      if (moved) this.refresh();
      else if (srcEl) srcEl.style.opacity = 1;
      return;
    }
    if (!isFromPlayerHere && isOverLeft) {
      let moved = false;
      if (containerName && dropPos) {
        moved = this.viewInv.transferItem(this.inv, uid, containerName, dropPos).ok;
      } else {
        for (const t of ['chest', 'bag', 'pocket', 'safe']) {
          if (this.viewInv.transferItem(this.inv, uid, t).ok) { moved = true; break; }
        }
      }
      if (moved) this.refresh();
      else if (srcEl) srcEl.style.opacity = 1;
      return;
    }
    // 同侧：玩家内部挪位 / 尸体内部挪位，继续走通用网格放置
  }
}

    // ★ 通用网格放置：按 uid 判断属于哪个 Inventory。
    //   旧版固定用 this.inv，拖尸体内部物品时会取不到 item，直接抛错/丢物品。
    const inv = (this.viewInv && this.viewInv.items.has(uid)) ? this.viewInv : this.inv;
    if (wrap) {
      const containerName = wrap.dataset.container;
      const rect = wrap.getBoundingClientRect();
      
      const ghostLeft = px - offsetX;
      const ghostTop = py - offsetY;
      
      let gx = Math.round((ghostLeft - rect.left) / CELL);
      let gy = Math.round((ghostTop - rect.top) / CELL);

      const item = inv.items.get(uid);
      if (!item) {
        if (srcEl) srcEl.style.opacity = 1;
        return;
      }
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
      if (r.reason === 'overweight') this._toast('负重已达硬上限，无法装备该物品');
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
      if (r.reason === 'overweight') this._toast('负重已达硬上限，无法装备该物品');
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
      // ★ 统一走 _loadAmmoFrom：可拆弹匣枪压进弹匣、非弹匣枪压进弹仓；
      //   战局内自动变成可中断的逐发进程，不再瞬间改弹链。
      this._loadAmmoFrom(targetUid, uid, Infinity);
      return;
    }
  }
  // ★ 散装子弹拖到弹匣上 = 逐发压入；战局内会开启锁定进程。
  if (item.table === 'ammo' && target.table === 'attach') {
    const tDef = inv.getDef(target);
    const aDef = inv.getDef(item);
    if (tDef && tDef.slot === 'mag' && aDef && tDef.caliber === aDef.caliber) {
      this._loadAmmoFrom(targetUid, uid, Infinity);
      return;
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

  // 配件拖拽：只允许“玩家自己的配件 → 玩家自己的武器”。
  // 跨 Inventory（尸体上的配件）必须先转移再安装，避免 UID 悬空。
  _handleAttachDrop(attachUid, weaponUid, slot, srcInv) {
    if (!attachUid || !weaponUid || !slot) return;
    if (!srcInv) { this._toast('找不到配件来源'); return; }
    let aid = attachUid;
    // 尸体/容器里的配件：先转移到玩家背包，再安装；失败则不改动源物品
    if (srcInv !== this.inv) {
      let newUid = null;
      for (const t of ['bag', 'chest', 'pocket', 'safe']) {
        const r = srcInv.transferItem(this.inv, attachUid, t);
        if (r.ok) { newUid = r.newUid; break; }
      }
      if (!newUid) { this._toast('背包没有空间放入配件'); return; }
      aid = newUid;
    }
    const weapon = this.inv.items.get(weaponUid);
    const attach = this.inv.items.get(aid);
    if (!weapon || !attach) return;
    // 从搜刮容器直接装配件也要承重；替换时只算净增重
    if (this.inv.maxCarryWeight > 0 && !this.inv.isCarried(aid)) {
      let extra = this.inv.getItemWeight(attach);
      const oldA = weapon.attachments && weapon.attachments[slot];
      if (oldA && this.inv.isCarried(oldA)) extra -= this.inv.getItemWeight(oldA);
      if (this.inv.getCarryWeight() + Math.max(0, extra) > this.inv.maxCarryWeight + 1e-4) {
        this._toast('负重已达硬上限，无法安装该配件');
        return;
      }
    }
    const compat = this.inv.canAttach(weapon, attach, slot);
    if (!compat.ok) {
      const why = {
        wrong_slot: '槽位不匹配', incompatible_weapon: '该武器无法安装此配件',
        incompatible_caliber: '口径不匹配', not_weapon: '目标不是枪械',
        type_mismatch: '这不是配件',
      }[compat.reason] || '无法安装';
      this._toast(why);
      return;
    }
    // 记录配件安装前所在的格子：拆下时优先回到原格，避免“包里明明很大却说没位置”
    const storedFrom = this._captureStoredPos(this.inv, aid);
    if (storedFrom) attach._storedFrom = storedFrom;
    // 先确认“被换下的旧配件”有地方放，避免装上新配件后旧配件变成无归属幽灵
    const oldAid = weapon.attachments && weapon.attachments[slot];
    const oldItem = oldAid && this.inv.items.get(oldAid);
    if (oldItem) {
      const fits = this._storedPosFree(this.inv, oldItem._storedFrom, oldAid) ||
        ['bag', 'chest', 'pocket', 'safe', 'stash'].some(name => {
          const c = this.inv.containers[name];
          return !!(c && c.isActive && this.inv._findSlot(c, oldItem.w, oldItem.h, false));
        });
      if (!fits) { this._toast('没有空间安放被换下的配件，已取消安装'); return; }
    }
    const res = this.inv.attachTo(weaponUid, slot, aid);
    if (!res.ok) { this._toast('安装失败'); return; }
    // 被替换下来的旧配件回到玩家背包/胸挂，不能凭空消失
    if (res.swapped && this.inv.items.get(res.swapped)) {
      let back = this._restoreStoredPos(this.inv, res.swapped);
      if (!back) {
        back = this.inv.addToContainer('bag', res.swapped, { ignoreWeight: true }).ok
          || this.inv.addToContainer('chest', res.swapped, { ignoreWeight: true }).ok
          || this.inv.addToContainer('pocket', res.swapped, { ignoreWeight: true }).ok
          || this.inv.addToContainer('safe', res.swapped, { ignoreWeight: true }).ok
          || this.inv.addToContainer('stash', res.swapped, { ignoreWeight: true }).ok;
      }
      if (!back) {
        const world = this.engine.app && this.engine.app.world;
        if (world && world._dropItemToGround) back = world._dropItemToGround(res.swapped);
        if (!back) {
          // 最后一层兜底：撤销新配件，装回旧配件，绝不留幽灵槽位。
          // ★ 撤销前必须把“新配件”放回它原来的格子，否则它的 parentOf 会被清空，
          //   变成一个不在任何容器里的幽灵 UID。
          this.inv.detachFrom(weaponUid, slot);
          if (!this._restoreStoredPos(this.inv, aid)) {
            this.inv.addToContainer('bag', aid, { ignoreWeight: true }).ok
              || this.inv.addToContainer('chest', aid, { ignoreWeight: true }).ok
              || this.inv.addToContainer('pocket', aid, { ignoreWeight: true }).ok
              || this.inv.addToContainer('safe', aid, { ignoreWeight: true }).ok
              || this.inv.addToContainer('stash', aid, { ignoreWeight: true }).ok;
          }
          this.inv.attachTo(weaponUid, slot, res.swapped);
          this._toast('没有空间安放被替换的配件，已撤销替换');
          this.refresh();
          return;
        }
      }
      // 旧配件的新落点就是下次拆下时的首选回格，避免连续换装后总是兜底
      const newPos = this._captureStoredPos(this.inv, res.swapped);
      const newItem = this.inv.items.get(res.swapped);
      if (newPos && newItem) newItem._storedFrom = newPos;
    }
    const world = this.engine.app && this.engine.app.world;
    if (world && world._syncWeaponsFromInventory) world._syncWeaponsFromInventory();
    this.refresh();
  }

  // 插板快速装入：拖到护甲上就装进 subSlots.plate；被换下的旧插板优先放回拖动源的格子，
  // 这样“卸下再换新的”不会因为容器没空位而失败。
  _installPlateDrop(plateUid, fiberUid, srcInv) {
    if (!this.inv.items.has(fiberUid)) { this._toast('只能安装到自己携带的护甲上'); return; }
    let pid = plateUid;
    if (srcInv && srcInv !== this.inv) {
      let newUid = null;
      for (const t of ['bag', 'chest', 'pocket', 'safe']) {
        const r = srcInv.transferItem(this.inv, plateUid, t);
        if (r.ok) { newUid = r.newUid; break; }
      }
      if (!newUid) { this._toast('背包没有空间放入插板'); return; }
      pid = newUid;
    }
    const plate = this.inv.items.get(pid);
    if (!plate || plate.table !== 'vestPlate') return;
    const hostItem = this.inv.items.get(fiberUid);
    const hostDef = hostItem ? this.inv.getDef(hostItem) : null;
    if (hostDef && hostDef.exoskeleton) {
      this._toast('外骨骼没有插板槽：它的防护来自能量抵消层');
      return;
    }
    // 记录新插板安装前的位置：以后取下时优先回原格
    const plateFrom = this._captureStoredPos(this.inv, pid);
    if (plateFrom) plate._storedFrom = plateFrom;

    // 记录插板移动前的容器坐标，用于安放被替换下来的旧插板
    const parent = this.inv.parentOf.get(pid);
    let oldContainer = null, oldPos = null;
    if (parent && parent.startsWith('c:')) {
      oldContainer = parent.slice(2);
      const c = this.inv.containers[oldContainer];
      const pos = c && c.items.get(pid);
      if (pos) oldPos = { x: pos.x, y: pos.y, rotated: pos.rotated };
    }

    const r = this.inv.installPlate(fiberUid, pid);
    if (!r.ok) {
      const why = { need_fiber: '目标不是护甲', not_plate: '这不是插板', bad_slot: '护甲没有插板槽', no_plate_slot: '外骨骼没有插板槽，防护来自能量抵消层', overweight: '负重已达硬上限，无法装入这块插板' }[r.reason] || '安装失败';
      this._toast(why);
      return;
    }
    if (r.swapped) {
      let placed = false;
      // 1) 放回新插板刚才腾出的格子（体积相同，必然放得下）
      if (oldContainer && oldPos) {
        const c = this.inv.containers[oldContainer];
        if (c) placed = this._placeAt(oldContainer, c, r.swapped, oldPos.x, oldPos.y, oldPos.rotated, this.inv).ok;
      }
      // 2) 回旧插板原来的格子，再退到随身容器；旧插板本来就在身上，不重复计重
      if (!placed) placed = this._restoreStoredPos(this.inv, r.swapped);
      if (!placed) {
        for (const t of ['bag', 'chest', 'pocket', 'safe']) {
          if (this.inv.addToContainer(t, r.swapped, { ignoreWeight: true }).ok) { placed = true; break; }
        }
      }
      // 3) 仍然放不下：撤销本次替换，保持原状
      if (!placed) {
        const newPlate = this.inv.detachSubSlot(fiberUid, 'plate');
        this.inv.installPlate(fiberUid, r.swapped);
        let newPlaced = false;
        if (newPlate) newPlaced = this._restoreStoredPos(this.inv, newPlate);
        if (newPlate && !newPlaced && oldContainer && oldPos) {
          const c = this.inv.containers[oldContainer];
          if (c) newPlaced = this._placeAt(oldContainer, c, newPlate, oldPos.x, oldPos.y, oldPos.rotated, this.inv).ok;
        }
        if (newPlate && !newPlaced) {
          for (const t of ['bag', 'chest', 'pocket', 'safe', 'stash']) {
            if (this.inv.addToContainer(t, newPlate, { ignoreWeight: true }).ok) { newPlaced = true; break; }
          }
        }
        this._toast('没有空间安放被换下的插板，已撤销替换');
        this.refresh();
        return;
      }
    }
    const world = this.engine.app && this.engine.app.world;
    if (world && world._syncArmorFromInventory) world._syncArmorFromInventory();
    this.refresh();
  }

  _placeAt(containerName, grid, uid, gx, gy, rotated, inv) {
    inv = inv || (grid === this.inv.containers.loot ? this.inv : this.viewInv);
    const item = inv.items.get(uid);
    if (!item) return { ok: false };
    // ★ 防御旧存档/异常物品缺尺寸：否则旋转到 1×2 格时占格计算为 NaN，物品会“卡没”。
    if (!item.w || item.w < 1) item.w = 1;
    if (!item.h || item.h < 1) item.h = 1;
    
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

  // 记录/恢复物品原来的网格位置（配件、插板拆下时优先回原格）
  _captureStoredPos(inv, uid) {
    if (!inv || !uid) return null;
    const parent = inv.parentOf.get(uid);
    if (!parent) return null;
    if (parent.startsWith('c:')) {
      const name = parent.slice(2);
      // 搜刮临时容器会随界面关闭失效，不把“回原格”记录到 loot
      if (name === 'loot') return null;
      const c = inv.containers[name];
      const pos = c && c.items.get(uid);
      return pos ? { kind: 'c', name, x: pos.x, y: pos.y, rotated: !!pos.rotated } : null;
    }
    if (parent.startsWith('inner:')) {
      const hostUid = parent.slice(6);
      const host = inv.items.get(hostUid);
      const pos = host && host.innerGrid && host.innerGrid.items.get(uid);
      return pos ? { kind: 'inner', hostUid, x: pos.x, y: pos.y, rotated: !!pos.rotated } : null;
    }
    return null;
  }

  _storedPosFree(inv, from, uid) {
    if (!inv || !from || !uid) return false;
    const item = inv.items.get(uid);
    if (!item) return false;
    let grid = null;
    if (from.kind === 'c') {
      const c = inv.containers[from.name];
      if (c && c.isActive) grid = c;
    } else if (from.kind === 'inner') {
      const host = inv.items.get(from.hostUid);
      if (host && host.innerGrid) grid = host.innerGrid;
    }
    if (!grid) return false;
    const w = from.rotated ? item.h : item.w;
    const h = from.rotated ? item.w : item.h;
    return inv._regionFree(grid, from.x, from.y, w, h);
  }

  _restoreStoredPos(inv, uid) {
    const item = inv && inv.items.get(uid);
    if (!item || !item._storedFrom) return false;
    const from = item._storedFrom;
    if (from.kind === 'c') {
      const c = inv.containers[from.name];
      if (!c || !c.isActive) return false;
      return this._placeAt(from.name, c, uid, from.x, from.y, from.rotated, inv).ok;
    }
    if (from.kind === 'inner') {
      const host = inv.items.get(from.hostUid);
      if (!host || !host.innerGrid) return false;
      return this._placeAt('inner:' + from.hostUid, host.innerGrid, uid, from.x, from.y, from.rotated, inv).ok;
    }
    return false;
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

  _renderBagEffectPanel() {
    const host = document.getElementById('bagui-effect-panel');
    if (!host) return;
    const p = this.engine.app.world && this.engine.app.world.player;
    if (!p || !p.status) { host.innerHTML = ''; return; }
    const st = p.status;
    const effectDesc = {
      bleeding: '未处理的伤口还在流血；伤口越多、越重，失血越快。',
      fracture: '骨骼/结构损伤，影响移速与操控；手术或夹板可复位。',
      hypovolemia: '失血超过阈值，视野收缩、移速与操控下降。',
      pain: '疼痛干扰据枪与移动。',
      burning: '局部持续灼烧；会向相邻部位缓慢扩散，需灭火。',
      burnShock: '大面积烧伤后的休克：持续失血、循环崩溃，不灭火会在数十秒内死亡。',
      fiber_acute: '急性玻纤滞留：剧痛、大量失血，可拔除。',
      fiber_chronic: '慢性玻纤残留：永久轻度疼痛与失血。',
      blind: '强光致盲，视野与操控严重受损。',
      dazzle: '强光刺眼，无法开镜，散布与移速下降。',
      stun: '震撼：方向感与据枪稳定性下降。',
      srdispte: '凯特机动状态：移速/操控/开镜散布增益。',
      hate: '玲娜爆发状态：移速/射速/换弹增益，免疫负面。',
      inspire: '队长指挥增益（仅队友）。',
      stress: '凯特应激：短时操控/移速/散布增益。',
      flashback: '闪回：失血加快、视野惩罚、移速与据枪下降。',
      mimic: 'BYinC 拟载护甲生效。',
      covey: '覆柔：短时减负抗性/移速/压制。',
      moving_speed_up: '移动速度提升。',
      aim_buff: '射击精度提升。',
      drone: '无人机链路在线。',
      catleap: '猫跃状态。',
      suppress: '压制：射击直接消耗备弹。',
      backflash: '背闪后的短时增益。',
      intuition: '直觉与回忆：标记攻击者周围目标。',
      adapt: '适应：负重上限提升。',
      suppressed: '被压制：移速与射击稳定性下降。',
      weakness: '精力虚弱：开镜/散布/视野惩罚，移速/操控下降。',
      hate_backlash: '血液反噬：移速/据枪/换弹下降。',
      emp_disrupted: '电磁干扰：电子设备失效，操控/移速下降。',
      emp_silence: '强电磁干扰：电磁加固设备被电磁场冲刷，暂未损坏但线路老化。',
      painkiller: '止痛生效：疼痛带来的视野、据枪与移速惩罚暂时不生效。',
      stimulant: '兴奋剂：短时移速提升，疲劳被强行压下；药效过后会反弹。',
      bandaged: '已包扎：活动性出血已处理，留下组织损伤与疼痛。',
      tinnitus: '耳鸣：爆炸/震撼后的听力损伤，外界声音明显变小，持续数秒。',
      deafened: '听力受损：暂时几乎听不到远处声音。',
    };
    const partNames = { head: '头', thorax: '胸', abdomen: '腹', larm: '臂', legs: '腿', ear: '覆耳羽', tail: '尾' };
    const effChips = [];
    for (const [id, eff] of st.effects) {
      const def = this.engine.content.get('effects', id);
      if (!def) continue;
      const lv = Math.max(1, Math.round(eff.strength || 1));
      const remaining = (eff.persistent || eff.duration > 900) ? '持续' : Math.max(0, eff.duration).toFixed(1) + 's';
      effChips.push({
        id, name: this.engine.i18n.t(def.name), icon: def.icon || '•', level: lv,
        remaining, positive: !!def.positive,
        parts: id === 'burning' ? Object.entries(st.burningParts || {}).map(([pt, lv2]) => partNames[pt] + ' Lv' + lv2) : [],
      });
    }
    if (this._expandedEffect && !effChips.some(c => c.id === this._expandedEffect)) this._expandedEffect = null;
    let html = `<div style="font-size:10px;color:#7fd0ff;letter-spacing:2px;margin-bottom:6px">全身状态</div>`;
    if (!effChips.length) {
      html += '<div style="color:#6f8fae;font-size:10px">当前无异常状态</div>';
    } else {
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
      for (const c of effChips) {
        const active = this._expandedEffect === c.id;
        html += `<button data-bag-effect="${this._esc(c.id)}" style="pointer-events:auto;cursor:pointer;padding:3px 7px;border-radius:5px;font-size:10px;font-family:inherit;background:${c.positive ? 'rgba(40,140,90,.55)' : 'rgba(150,45,45,.6)'};border:1px solid ${active ? 'rgba(255,225,150,.95)' : 'rgba(255,255,255,.18)'};color:#fff">${c.icon} ${this._esc(c.name)} Lv${c.level}</button>`;
      }
      html += '</div>';
    }
    if (this._expandedEffect) {
      const c = effChips.find(x => x.id === this._expandedEffect);
      if (c) {
        html += `<div style="margin-top:7px;padding:6px;background:rgba(20,32,46,.75);border-left:3px solid ${c.positive ? '#6fe07a' : '#ff6a6a'};border-radius:4px;line-height:1.55">
          <div style="color:#ffe8b0;font-weight:700">${c.icon} ${this._esc(c.name)} · Lv${c.level}</div>
          <div style="color:#9fc4e8">剩余：${c.remaining}${c.parts.length ? ' · 部位：' + this._esc(c.parts.join('、')) : ''}</div>
          <div style="color:#b8cfe4">${this._esc(effectDesc[c.id] || '持续状态效果。')}</div>
        </div>`;
      }
    }
    // 部位状态：生命、骨折等级、伤口等级、着火等级
    html += `<div style="font-size:10px;color:#7fd0ff;letter-spacing:2px;margin:9px 0 5px">部位</div>`;
    for (const pt of ['head', 'thorax', 'abdomen', 'larm', 'legs', 'ear', 'tail']) {
      const d = st.parts[pt];
      if (!d) continue;
      const ratio = Math.max(0, d.hp) / d.maxHp;
      const pct = Math.round(ratio * 100);
      const wounds = (d.wounds || []).filter(w => w.treated !== true).map(w => 'Lv' + w.level).join('/') || '—';
      const burnLv = st.burningParts && st.burningParts[pt] ? ' Lv' + st.burningParts[pt] : '';
      html += `<div style="display:flex;justify-content:space-between;gap:6px;padding:2px 0;border-bottom:1px solid rgba(105,170,235,.12)">
        <span>${partNames[pt]}</span>
        <span style="color:${ratio <= 0.2 ? '#ff6a6a' : ratio < 0.6 ? '#ffd93d' : '#8fe8a0'}">${pct}%</span>
        <span style="color:#8fb0c8">骨折${d.fracture ? 'Lv' + d.fracture : '—'} · 伤口${wounds}${burnLv ? ' · 燃烧' + burnLv : ''}</span>
      </div>`;
    }
    host.innerHTML = html;
    host.querySelectorAll('[data-bag-effect]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.bagEffect;
        this._expandedEffect = this._expandedEffect === id ? null : id;
        this._renderBagEffectPanel();
      };
    });
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
      legs: 0.5,
      // Prazer 特征部位：没有这两个部位的模型/人形会自然跳过
      ear: 2.38,
      tail: 0.92
    };
    
    if (!this._charPreviewCamera || !this._charPreviewW) {
       el.innerHTML = '';
       return;
    }

    const partNames = { head: '头', thorax: '胸', abdomen: '腹', larm: '臂', legs: '腿', ear: '覆耳羽', tail: '尾' };
    // 每个部位的标签偏移：避免胸/臂投影几乎同高时粘在一起
    const offsets = { head: [12, -4], thorax: [12, 0], abdomen: [12, 8], larm: [44, -20], legs: [12, 12], ear: [-24, -16], tail: [-34, 12] };
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
      const wc = (d.wounds || []).filter(w => w.treated !== true).length;
      if (wc > 0) chips.push('🩸' + wc);
      const burnLv = p.status.burningParts && p.status.burningParts[pt];
      if (burnLv) chips.push('🔥Lv' + burnLv);

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
