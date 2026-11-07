/* ============================================================
   LaiAsaka Engine · Game Layer
   v3.1.0 · © 2026 ZpycuA · CC BY-NC 4.0
   ------------------------------------------------------------
   更新日志：暂无
   ============================================================ */

import * as THREE from 'three';
import { Body } from './engine.js';
import { CombatLog, showCombatReport, hideCombatReport } from './combatlog.js';
import { Inventory, GridContainer } from './inventory.js';
import { BagUI } from './bagUI.js';

/* ============================================================
   [0] 战斗公式常数
   ============================================================ */
const COMBAT = Object.freeze({
  PSI: 0.00335791,
  T_EFF: 0.5,
  BODY_COEFF_HUMAN: 34,
  BODY_COEFF_PRAZER: 48,
  HEAD_MULT: 2.0,
  RANGE_DECAY: 1.15,
  RANGE_DECAY_REALISTIC: 2.5,
  MELEE_RANGE: 3,
  MELEE_DAMAGE: 60,
  COUPLING_REGEN_IDLE: 3.0,
  COUPLING_REGEN_LONG: 1.5,
  COUPLING_REGEN_DELAY: 1.0,
  COUPLING_LONG_THRESHOLD: 10.0,
  PROTECT_DRAIN: { L1: 0.8, L2: 2.5, L3: 5.0 },
  PROTECT_ABSORB: { L1_MELEE: 1.0, L2_BALLISTIC: 0.7, L3_BALLISTIC: 0.5 },
  EXTRACT_TIME: 8,
  SEARCH_TIME: 2.5,
  SEARCH_RADIUS: 3.5,
  EXTRACT_RADIUS: 4.5,
});

/* ============================================================
   [0.5] 动作映射表 · 单一真相源
   ------------------------------------------------------------
   · keys   → PC 键位注册（engine.input.registerAction）
   · mouse  → 鼠标键位注册
   · mobile → 移动端按钮配置（null 表示无移动按钮）
   · actionId → 按钮实际触发的 action（默认等于自身 key，用于 fire_left 复用 fire）
   ============================================================ */
const ACTION_MAP = {
  fire: {
    keys: [],
    mouse: 'left',
    label: '开火',
    mobile: { right: '20px', bottom: '80px', size: 80, color: 'rgba(255,80,80,.4)', border: 'rgba(255,100,100,.8)', mode: 'hold', rotate: true },
  },
  reload: {
    keys: ['r'],
    label: '换弹',
    mobile: { right: '20px', bottom: '180px', size: 60, color: 'rgba(200,200,200,.3)', border: 'rgba(255,255,255,.6)', mode: 'hold' },
  },
  jump: {
    keys: [' '],
    label: '跳跃',
    mobile: { right: '120px', bottom: '40px', size: 60, color: 'rgba(80,255,150,.4)', border: 'rgba(100,255,150,.8)', mode: 'hold' },
  },
  search: {
    keys: ['g'],
    label: '搜索',
    mobile: { right: '90px', bottom: '180px', size: 55, color: 'rgba(255,210,80,.35)', border: 'rgba(255,210,80,.7)', mode: 'click' },
  },
  bag: {
    keys: ['b'],
    label: '背包',
    mobile: { right: '20px', bottom: '260px', size: 55, color: 'rgba(80,140,255,.35)', border: 'rgba(120,180,255,.7)', mode: 'click' },
  },
  switchWeapon: {
  keys: ['f'],
  label: '切枪',
  mobile: { right: '90px', bottom: '260px', size: 55, color: 'rgba(160,120,255,.35)', border: 'rgba(180,140,255,.7)', mode: 'click' },
},
  skill1:       { keys: ['q'], label: '技能1' },
  skill2:       { keys: ['e'], label: '技能2' },
  protectL1:    { keys: ['1'], label: '防护 L1' },
  protectL2:    { keys: ['2'], label: '防护 L2' },
  protectL3:    { keys: ['3'], label: '防护 L3' },
  sprint:       { keys: ['shift'], label: '疾跑' },
  fire_left: {
    keys: [],
    label: '开火',
    actionId: 'fire',
    mobile: { left: '30px', bottom: '150px', size: 70, color: 'rgba(255,80,80,.3)', border: 'rgba(255,100,100,.6)', mode: 'hold', rotate: true },
  },
};

/* ============================================================
   [0.6] ActionProcess · 通用动作进程
   ------------------------------------------------------------
   任何"需要时间 + 可打断 + 有完成/取消回调"的动作都走这里。
   同一时间只允许一个进程（手就一双）。
   ============================================================ */
class ActionProcess {
  constructor(world) {
    this.world = world;
    this.current = null;
  }

  isRunning(id) {
    if (!this.current) return false;
    if (id && this.current.id !== id) return false;
    return true;
  }

  start(opts) {
    if (this.current) return false;
    if (!opts || !opts.id) return false;
    this.current = {
      id: opts.id,
      label: opts.label || opts.id,
      duration: opts.duration || 1,
      elapsed: 0,
      cancelable: opts.cancelable !== false,
      onComplete: opts.onComplete || null,
      onCancel: opts.onCancel || null,
    };
    this.world._updateProgressUI();
    return true;
  }

  cancel(reason, force) {
    if (!this.current) return false;
    if (!this.current.cancelable && !force) return false;
    const proc = this.current;
    const progress = proc.duration > 0 ? Math.min(1, proc.elapsed / proc.duration) : 0;
    this.current = null;
    if (proc.onCancel) {
      try { proc.onCancel(reason, progress); }
      catch (e) { console.warn('[Process] onCancel err', e); }
    }
    this.world._updateProgressUI();
    return true;
  }

  update(dt) {
    if (!this.current) return;
    const p = this.current;
    p.elapsed += dt;
    if (p.elapsed >= p.duration) {
      this.current = null;
      this.world._updateProgressUI();
      if (p.onComplete) {
        try { p.onComplete(); }
        catch (e) { console.warn('[Process] onComplete err', e); }
      }
      return;
    }
    this.world._updateProgressUI();
  }

  getProgress() {
    if (!this.current) return null;
    const p = this.current;
    return {
      id: p.id,
      label: p.label,
      elapsed: p.elapsed,
      duration: p.duration,
      pct: Math.min(1, p.elapsed / p.duration),
      remain: Math.max(0, p.duration - p.elapsed),
    };
  }
}

/* ============================================================
   [1] 战斗系统 · 纯函数
   ============================================================ */
const CombatSystem = {
  kinetic(massG, v0){
    const m = massG / 1000;
    return 0.5 * m * v0 * v0;
  },

  energyAtRange(baseEnergy, traveled, range, decayK){
    if (!range || range <= 0) return baseEnergy;
    const k = decayK !== undefined ? decayK : COMBAT.RANGE_DECAY;
    const t = Math.min(traveled / range, 1.5);
    return baseEnergy * Math.exp(-k * t * t);
  },

  applyArmor(armorItem, energy, pen){
    if (!armorItem || armorItem.dur <= 0 || !armorItem.lv) {
      return { absorbed: 0, remaining: energy, wear: 0, pierced: pen >= 3 };
    }
    const spec = { 1: 0.22, 2: 0.38, 3: 0.52, 4: 0.64, 5: 0.74 };
    const lv = armorItem.lv;
    const penDiff = pen - lv;

    let effRed = spec[lv] || 0;
    if (penDiff >= 3) effRed *= 0.22;
    else if (penDiff >= 1) effRed *= (1 - penDiff * 0.2);
    else if (penDiff <= -2) effRed = Math.min(0.95, effRed * 1.35);

    const durRatio = Math.max(0, Math.min(1, armorItem.dur / armorItem.max));
    effRed *= (0.35 + 0.65 * durRatio);

    const absorbed = energy * effRed;
    const remaining = energy - absorbed;
    const wear = Math.min(armorItem.dur, absorbed / 20);
    armorItem.dur = Math.max(0, armorItem.dur - wear);

    return { absorbed, remaining, wear, pierced: penDiff >= 3 };
  },

  applyCoupling(player, energy, type){
    if (!player.charSpec.prazer) return { absorbed: 0, remaining: energy, cost: 0 };
    if (!player.protectionHold || !player.protection || player.coupling <= 0) {
      return { absorbed: 0, remaining: energy, cost: 0 };
    }
    let mult = 0;
    if (type === 'melee') mult = COMBAT.PROTECT_ABSORB.L1_MELEE;
    else if (type === 'ballistic') {
      if (player.protection === 'L2') mult = COMBAT.PROTECT_ABSORB.L2_BALLISTIC;
      else if (player.protection === 'L3') mult = COMBAT.PROTECT_ABSORB.L3_BALLISTIC;
    }
    if (mult <= 0) return { absorbed: 0, remaining: energy, cost: 0 };
    const absorbed = energy * mult;
    const remaining = energy - absorbed;
    const cost = COMBAT.PSI * absorbed * COMBAT.T_EFF;
    return { absorbed, remaining, cost };
  },

  energyToHP(energy, isPrazer){
    const coeff = isPrazer ? COMBAT.BODY_COEFF_PRAZER : COMBAT.BODY_COEFF_HUMAN;
    return energy / coeff;
  },
};

/* ============================================================
   [2] AI 系统
   ============================================================ */
const AISystem = {
  update(world, enemy, dt){
    if (!enemy.alive || enemy.trainingDummy) return;

    const p = world.player;
    const dx = p.body.position.x - enemy.body.position.x;
    const dz = p.body.position.z - enemy.body.position.z;
    const distToPlayer = Math.hypot(dx, dz);
    const hasLOS = distToPlayer < 40 && this._checkLOS(world, enemy, p);

    if (hasLOS) enemy.awareness = Math.min(1, enemy.awareness + dt * 2.5);
    else enemy.awareness = Math.max(0, enemy.awareness - dt * 0.5);

    if (enemy.awareness > 0.7 && enemy.state !== 'combat') {
      enemy.state = 'combat';
    } else if (enemy.awareness < 0.2 && enemy.state === 'combat') {
      enemy.state = 'search';
      enemy.stateT = 0;
    }

    switch (enemy.state) {
      case 'patrol': this._patrol(world, enemy, dt); break;
      case 'combat': this._combat(world, enemy, dt, distToPlayer); break;
      case 'search': this._search(world, enemy, dt); break;
    }

    const half = world.mapSpec.size / 2 - 2;
    enemy.body.position.x = Math.max(-half, Math.min(half, enemy.body.position.x));
    enemy.body.position.z = Math.max(-half, Math.min(half, enemy.body.position.z));

    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
  },

  _patrol(world, enemy, dt){
    enemy.wanderT -= dt;
    if (enemy.wanderT <= 0) {
      enemy.wanderT = 1.5 + Math.random() * 1.5;
      enemy.wanderDir = Math.random() * Math.PI * 2;
    }
    enemy.angle = enemy.wanderDir;
    enemy.body.velocity.x = Math.cos(enemy.wanderDir) * enemy.spec.speed * 0.4;
    enemy.body.velocity.z = Math.sin(enemy.wanderDir) * enemy.spec.speed * 0.4;
  },

  _combat(world, enemy, dt, dist){
  const p = world.player;
  const dx = p.body.position.x - enemy.body.position.x;
  const dz = p.body.position.z - enemy.body.position.z;
  const ang = Math.atan2(dz, dx);
  enemy.angle = ang;

  let moveAng;
  if (dist > 15) moveAng = ang;
  else if (dist < 8) moveAng = ang + Math.PI;
  else moveAng = ang + Math.PI / 2 * enemy.strafeDir;

  enemy.body.velocity.x = Math.cos(moveAng) * enemy.spec.speed;
  enemy.body.velocity.z = Math.sin(moveAng) * enemy.spec.speed;

  if (enemy.fireCd > 0) enemy.fireCd -= dt;

  // ★ 弹药检查 + 自动换弹（打空后原地换弹 2.5s）
  const w = enemy.weapon;
  const hasAmmo = !!(w && w.loaded && w.loaded.qty > 0);
  if (w && !hasAmmo && w.reserve > 0) {
    if (enemy._reloadTimer === undefined) enemy._reloadTimer = 2.5;
    enemy._reloadTimer -= dt;
    if (enemy._reloadTimer <= 0) {
      const need = w.magCap - w.loaded.qty;
      const take = Math.min(need, w.reserve);
      w.loaded.qty += take;
      w.reserve -= take;
      enemy._reloadTimer = 2.5;
    }
  } else if (w) {
    enemy._reloadTimer = 2.5;
  }

  if (enemy.fireCd <= 0 && hasAmmo && this._checkLOS(world, enemy, p)) {
    world.enemyFire(enemy, p);
  }

  enemy.strafeT -= dt;
  if (enemy.strafeT <= 0) {
    enemy.strafeDir *= -1;
    enemy.strafeT = 0.7 + Math.random() * 1.2;
  }
},

  _search(world, enemy, dt){
    enemy.stateT += dt;
    if (enemy.stateT > 4) {
      enemy.state = 'patrol';
      enemy.awareness = 0;
    }
    enemy.angle += dt * 1.5;
    enemy.body.velocity.x *= 0.9;
    enemy.body.velocity.z *= 0.9;
  },

  _checkLOS(world, a, b){
  const ax = a.body.position.x, ay = a.body.position.y, az = a.body.position.z;
  const bx = b.body.position.x, by = b.body.position.y, bz = b.body.position.z;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  if (len < 0.1) return true;
  const hit = world.physics.raycast(
    ax, ay, az,
    dx, dy, dz,
    len,
    body => body.userData && body.userData.type === 'obstacle'
  );
  return !hit;
},
};

/* ============================================================
   [3] 任务系统
   ============================================================ */
class TaskSystem {
  constructor(world){
    this.world = world;
    this.engine = world.engine;
    this.active = new Map();
  }

  initFromRegistry(){
    const tasks = this.engine.content.all('tasks');
    const modeId = this.world.modeId;
    for (const t of tasks) {
      if (t.mode && t.mode !== modeId) continue;
      if (t.source && !['default', 'daily', 'challenge'].includes(t.source)) continue;
      this.active.set(t.id, { def: t, progress: 0, done: false });
    }
    this.render();
  }

  progress(kind, amount = 1, payload = null){
    let changed = false;
    for (const inst of this.active.values()) {
      if (inst.done) continue;
      if (inst.def.trigger.kind !== kind) continue;
      if (inst.def.trigger.filter && payload) {
        let skip = false;
        for (const k in inst.def.trigger.filter) {
          if (payload[k] !== inst.def.trigger.filter[k]) { skip = true; break; }
        }
        if (skip) continue;
      }
      inst.progress = Math.min(inst.def.goal, inst.progress + amount);
      if (inst.progress >= inst.def.goal) {
        inst.done = true;
        this._runEffects(inst.def.onComplete || []);
        this._log('✓ ' + this.engine.i18n.t(inst.def.name) + ' 已完成', 'g');
      }
      changed = true;
    }
    if (changed) this.render();
  }

  tickSurvive(dt){
    let changed = false;
    for (const inst of this.active.values()) {
      if (inst.done || inst.def.trigger.kind !== 'survive') continue;
      inst.progress = Math.min(inst.def.goal, inst.progress + dt);
      if (inst.progress >= inst.def.goal) {
        inst.done = true;
        this._runEffects(inst.def.onComplete || []);
        this._log('✓ ' + this.engine.i18n.t(inst.def.name) + ' 已完成', 'g');
      }
      changed = true;
    }
    if (changed) this.render();
  }

  _runEffects(effects){
    for (const e of effects) {
      switch (e.kind) {
        case 'credits':
          this.engine.save.data.credits = (this.engine.save.data.credits || 0) + e.amount;
          this._log('+' + e.amount + ' cp', 'g');
          break;
        case 'flag':
          this.engine.save.data.flags = this.engine.save.data.flags || {};
          this.engine.save.data.flags[e.key] = e.value;
          break;
        case 'unlock':
          this._log('解锁 ' + e.id, 'p');
          break;
      }
    }
  }

  _log(text, cls){
    if (this.world && this.world._log) this.world._log(text, cls);
  }

  render(){
    const el = document.getElementById('task-list');
    if (!el) return;
    let html = '';
    for (const inst of this.active.values()) {
      const prog = Math.floor(inst.progress);
      const cls = 'task-item' + (inst.done ? ' done' : '');
      const srcTag = inst.def.source && inst.def.source !== 'default'
        ? `<span class="source-tag">[${inst.def.source}]</span>`
        : '';
      const name = this.engine.i18n.t(inst.def.name);
      html += `<div class="${cls}">${inst.done ? '✓' : '○'} ${name}${srcTag} <span class="prog">${prog}/${inst.def.goal}</span></div>`;
    }
    el.innerHTML = html;
  }
}

/* ============================================================
   [4] HUD 系统 · 随 profile 变化
   ============================================================ */
class HUDSystem {
  constructor(world){
    this.world = world;
    this.engine = world.engine;
    this._cache = {};
    this._els = null;
    this._protectBtns = null;
  }

  _initEls(){
  if (this._els) return;
  this._els = {
    hpRow: document.querySelector('#hp-bar')?.closest('.stat-row'),
    cpRow: document.getElementById('cp-row'),
    ammoEl: document.getElementById('bottom-right'),
    // ★ 修复：之前找的是 id="task-panel"，但 HTML 里是 class="task-panel"
    taskPanel: document.querySelector('.task-panel'), 
    crosshair: document.getElementById('crosshair'),
  };
}

  _bindProtectionButtons(){
    if (this._protectBtns) return;
    this._protectBtns = Array.from(document.querySelectorAll('.protect-btn'));
    for (const btn of this._protectBtns) {
      const level = btn.dataset.level;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.world._toggleProtection(level);
        btn.classList.add('active');
      });
      const release = () => {
        this.world._releaseProtection();
        btn.classList.remove('active');
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    }
  }

 update(){
  const p = this.world.player;
  if (!p) return;

  this._initEls();
  this._bindProtectionButtons();
  this._applyVisibility();
  this._renderMinimap();
  this._renderDamageIndicator();

  // 数值更新
  this._setText('player-name', p.charSpec ? this.engine.i18n.t(p.charSpec.name) : '—');
  this._setText('player-tag', p.charSpec ? this.engine.i18n.t(p.charSpec.tag) : '—');

  // 更新血量与体力
  const hpPct = Math.max(0, Math.min(100, p.hp / p.maxHp * 100));
  this._setStyle('hp-bar', 'width', hpPct + '%');
  this._setText('hp-text', Math.round(hpPct) + '%');

 if (p.stamina !== undefined) {
  const stPct = Math.max(0, Math.min(100, p.stamina / p.maxStamina * 100));
  this._setStyle('stamina-bar', 'width', stPct + '%');
  let stBg;
  if (stPct < 20)      stBg = 'linear-gradient(90deg,#d94040,#ff6a4a)';
  else if (stPct < 40) stBg = 'linear-gradient(90deg,#e09a30,#ffc850)';
  else                 stBg = 'linear-gradient(90deg,#ffd93d,#fff08a)';
  this._setStyle('stamina-bar', 'background', stBg);
}

  if (p.charSpec && p.charSpec.prazer) {
    const cpPct = Math.max(0, Math.min(100, p.coupling / p.maxCoupling * 100));
    this._setStyle('cp-bar', 'width', cpPct + '%');
    this._setText('cp-text', Math.round(cpPct) + '%');
  }

 // 武器与弹药
const cw = this.world.currentWeapon || p.weapon;
if (cw) {
  this._setText('weapon-name', this.engine.i18n.t(cw.def.name));
  this._setText('ammo-mag', String(cw.mag));
  this._setText('ammo-reserve', String(cw.reserve));
}

if (p.carriedValue !== undefined) {
  this._setText('carry-value', String(Math.round(p.carriedValue)));
}

  // ★ 核心：受伤视觉状态机
  this._updateHurtFX(hpPct);
  
  // ★ 核心：耦合视觉特效
  this._updateCouplingFX(p);
  
  // ★ 防护按钮可用性与显隐
const protectGroup = document.getElementById('protect-group');
if (protectGroup) {
  if (p.charSpec && p.charSpec.prazer) {
    protectGroup.style.display = 'flex'; // Prazer 显示
  } else {
    protectGroup.style.display = 'none'; // 人类彻底隐藏
  }
}

if (this._protectBtns) {
  const canProtect = p.charSpec && p.charSpec.prazer && p.coupling > 0;
  for (const btn of this._protectBtns) {
    if (canProtect) btn.classList.remove('dead');
    else btn.classList.add('dead');
  }
}
  this._renderArmor();
    // 撤离进度
  this._renderExtractProgress();
}

// 受伤视觉引擎 · 中央视野保持清晰，只处理边缘 + 轻微相机抖动
_updateHurtFX(hpPct) {
  const p = this.world.player;
  if (p && !p.alive) return; // 死亡后视觉由 _updateDeathCamera 接管，避免覆盖

  const filterEl = document.getElementById('fx-filter');
  const vignetteEl = document.getElementById('fx-vignette');

  let vignetteOpacity = 0;
  let filterOpacity = 0;
  let centerDark = 0;
  let shakeAmp = 0;

  if (hpPct > 70) {
    vignetteOpacity = 0;
    filterOpacity = 0;
    centerDark = 0;
    shakeAmp = 0;
  } else if (hpPct > 40) {
    vignetteOpacity = 0.20;
    filterOpacity = 0.08;
    centerDark = 0;
    shakeAmp = 0;
  } else if (hpPct > 20) {
    vignetteOpacity = 0.52;
    filterOpacity = 0.18;
    centerDark = 0.02;
    shakeAmp = 0.006;
  } else if (hpPct > 10) {
    // 濒死：重度边缘黑红 + 强脉冲
    const pulse = Math.sin(this.world.time * 5.5) * 0.20;
    vignetteOpacity = 0.72 + pulse;
    filterOpacity = 0.28;
    centerDark = 0.10;
    shakeAmp = 0.011;
  } else {
    // 危殆：几乎全屏暗红压暗 + 剧烈脉冲
    const pulse = Math.sin(this.world.time * 6.5) * 0.22;
    vignetteOpacity = 0.88 + pulse;
    filterOpacity = 0.38;
    centerDark = 0.22;
    shakeAmp = 0.016;
  }

  if (vignetteEl) {
    const v = Math.max(0, Math.min(1, vignetteOpacity));
    vignetteEl.style.opacity = String(v);
  }
  if (filterEl) {
    // 中心逐渐压暗模拟视野收缩/失血性黑视
    filterEl.style.background = `radial-gradient(ellipse at center, rgba(0,0,0,${centerDark}) 10%, rgba(140,20,20,${filterOpacity}) 100%)`;
    filterEl.style.backdropFilter = 'none';
  }

  const camCtl = this.engine.cameraCtl;
  if (shakeAmp > 0 && camCtl && typeof camCtl.setHurtOffset === 'function') {
    this._vitalShakePhase = (this._vitalShakePhase || 0) + 0.016;
    const sx = Math.sin(this._vitalShakePhase * 11) * shakeAmp;
    const sy = Math.cos(this._vitalShakePhase * 13) * shakeAmp;
    camCtl.setHurtOffset(sx, sy);
  } else if (camCtl && typeof camCtl.setHurtOffset === 'function') {
    camCtl.setHurtOffset(0, 0);
  }
}

_renderMinimap(){
  const canvas = document.getElementById('minimap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
ctx.fillStyle = 'rgba(220,228,238,0.95)';
ctx.fillRect(0, 0, w, h);

  const p = this.world.player;
  if (!p) return;

  const mapSize = this.world.mapSpec.size;
  const scale = w / mapSize;
  const cx = w/2, cy = h/2;
  const px = p.body.position.x, pz = p.body.position.z;

  // ★ 渲染所有兴趣点 (POI)
  for (const poi of this.world.pois) {
    const sx = cx + (poi.x - px) * scale;
    const sy = cy + (poi.z - pz) * scale;
    
    // 屏幕外剔除
    if (sx < -10 || sx > w+10 || sy < -10 || sy > h+10) continue;

    if (poi.type === 'obstacle') {
      ctx.fillStyle = poi.color;
      ctx.fillRect(sx - (poi.w * scale)/2, sy - (poi.h * scale)/2, poi.w * scale, poi.h * scale);
    } else if (poi.type === 'extract') {
      ctx.fillStyle = poi.color;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (poi.type === 'container') {
      // 画个小方块代表容器
      ctx.fillStyle = poi.color;
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
    }
  }

  // 绘制玩家（始终在中心）
ctx.fillStyle = '#1a6ab8';
ctx.beginPath();
ctx.arc(cx, cy, 5, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 1.5;
ctx.stroke();

// 玩家朝向线
ctx.strokeStyle = 'rgba(26,106,184,0.9)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(cx, cy);
ctx.lineTo(cx + Math.sin(this.engine.cameraCtl.yaw) * 14, cy - Math.cos(this.engine.cameraCtl.yaw) * 14);
ctx.stroke();
}

_renderDamageIndicator(){
  const canvas = document.getElementById('dmg-indicator');
  if (!canvas) return;
  if (canvas.width !== window.innerWidth) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = this.world;
  if (!w || !w.lastHitDir || w.time - (w.lastHitTime || 0) > 1.5) return;

  // 绘制受击弧线（相对于玩家当前的 yaw）
  const relAngle = w.lastHitDir; 
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 120;
  const alpha = Math.max(0, 1 - (w.time - w.lastHitTime) / 1.5);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(relAngle);
  
  // 画一道红色弧线
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI/2 - 0.4, -Math.PI/2 + 0.4);
  ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
  ctx.lineWidth = 8;
  ctx.stroke();
  
  ctx.restore();
}
// 耦合屏幕边缘光效
_updateCouplingFX(p) {
  const el = document.getElementById('fx-coupling');
  if (!el) return;
  
  if (p.protectionHold && p.coupling > 0) {
    let color = 'rgba(255,255,255,0.4)';
    let innerColor = 'rgba(255,255,255,0.1)';
    if (p.protection === 'L1') { color = 'rgba(80,255,150,0.6)'; innerColor = 'rgba(80,255,150,0.1)'; }
    if (p.protection === 'L2') { color = 'rgba(80,170,255,0.6)'; innerColor = 'rgba(80,170,255,0.1)'; }
    if (p.protection === 'L3') { color = 'rgba(200,120,255,0.6)'; innerColor = 'rgba(200,120,255,0.1)'; }
    
    el.style.boxShadow = `inset 0 0 80px 20px ${color}`;
    el.style.background = `radial-gradient(circle, transparent 60%, ${innerColor} 100%)`;
  } else {
    el.style.boxShadow = 'none';
    el.style.background = 'none';
  }
}

 _applyVisibility(){
  const profile = this.engine.profile;
  const els = this._els;
  const p = this.world.player;

  // 血条、弹药、任务列表
  if (els.hpRow) this._setDisplay('hpRow', profile.get('hud.hpBar', true));
  if (els.ammoEl) this._setDisplay('ammoEl', profile.get('hud.ammoCounter', true));
  if (els.taskPanel) this._setDisplay('taskPanel', profile.get('hud.taskList', true));

  // 小地图
  const mapEl = document.getElementById('minimap-container');
  if (mapEl) mapEl.style.display = profile.get('visual.minimap', true) ? 'block' : 'none';

  // 命中标记
  const hitMarkerEl = document.getElementById('hit-marker');
  if (hitMarkerEl && !profile.get('visual.hitMarkers', true)) {
    hitMarkerEl.style.opacity = '0';
  }

  // 耦合条
  if (els.cpRow) {
    const show = (p && p.charSpec && p.charSpec.prazer) && profile.get('hud.cpBar', true);
    this._setDisplay('cpRow', show);
  }
}

  _setDisplay(key, show){
    const cacheKey = 'display:' + key;
    if (this._cache[cacheKey] === show) return;
    this._cache[cacheKey] = show;
    const el = this._els[key];
    if (el) el.style.display = show ? '' : 'none';
  }

   _renderArmor() {
  const p = this.world.player;
  if (!p || !p.armor) return;
  const slots = ['shell', 'visor', 'fiber', 'plate'];
  const cells = document.querySelectorAll('#armor-row .armor-cell');
  for (let i = 0; i < cells.length && i < slots.length; i++) {
    const cell = cells[i];
    const a = p.armor[slots[i]];
    const bar = cell.querySelector('.armor-bar > i');
    const lv  = cell.querySelector('.armor-lv');

    if (!a || !a.lv) {
      cell.classList.add('empty');
      cell.classList.remove('broken');
      if (bar) bar.style.width = '0%';
      if (lv) lv.textContent = '—';
      continue;
    }

    cell.classList.remove('empty');
    const max = a.max || 100;
    const pct = Math.max(0, Math.min(100, (a.dur / max) * 100));
    const broken = pct <= 0;
    cell.classList.toggle('broken', broken);

    if (bar) {
      bar.style.width = pct + '%';
      let color;
      if (broken)            color = 'linear-gradient(90deg,#8a2020,#c04040)';
      else if (pct > 60)     color = 'linear-gradient(90deg,#6fe07a,#a8e05a)';
      else if (pct > 30)     color = 'linear-gradient(90deg,#ffd93d,#ffe880)';
      else                   color = 'linear-gradient(90deg,#ff6b4a,#ff9a6a)';
      bar.style.background = color;
    }
    if (lv) lv.textContent = broken ? '断' : ('Lv' + a.lv);
  }
}

  _renderExtractProgress(){
    const el = document.getElementById('extract-progress');
    const fill = document.getElementById('extract-fill');
    if (!el || !fill) return;
    let maxT = 0;
    for (const ex of this.world.extracts) {
      if (ex.timer > maxT) maxT = ex.timer;
    }
    if (maxT > 0) {
      el.classList.add('on');
      fill.style.width = (maxT / COMBAT.EXTRACT_TIME * 100) + '%';
    } else {
      el.classList.remove('on');
      fill.style.width = '0%';
    }
  }

  _setText(id, text){
    if (this._cache[id] === text) return;
    const el = document.getElementById(id);
    if (el) el.textContent = text;
    this._cache[id] = text;
  }

  _setStyle(id, prop, value){
    const key = id + ':' + prop;
    if (this._cache[key] === value) return;
    const el = document.getElementById(id);
    if (el) el.style[prop] = value;
    this._cache[key] = value;
  }
}

/* ============================================================
   [5] GameWorld
   ============================================================ */
class GameWorld {
  constructor(engine, config){
this.engine = engine;
this.config = config;

this.mapId   = config.mapId;
this.charId  = config.charId;
this.diffId  = config.diffId;
this.modeId  = config.modeId;
this.kind    = config.kind;
this.layout  = config.layout || null;

this.mapSpec  = engine.content.get('maps', this.mapId);
this.charSpec = engine.content.get('characters', this.charId);
this.modeConfig = engine.modeRegistry.get(this.modeId);

this._playerSpawnPos = null;
this._enemySpawnPositions = null;

  if (!this.mapSpec)   throw new Error('[World] 地图不存在: ' + this.mapId);
  if (!this.charSpec)  throw new Error('[World] 角色不存在: ' + this.charId);
  if (!this.modeConfig) throw new Error('[World] 模式不存在: ' + this.modeId);

  this.physics    = engine.physicsFactory();
  this.player     = null;
  this.enemies    = [];
  this.extracts   = [];
  this.containers = [];
  this.groundLoots = [];
  this.obstacles  = [];
  this.tracers    = [];
  this.pois       = [];

  this.time       = 0;
  this.running    = false;
  this.paused     = false;
  this.extractTimer = 0;
  this.activeExtract = null;
  this.timeLimit  = config.timeLimit || 0;

  this.stats = { shots: 0, hits: 0, headshots: 0, kills: 0 };

  this.onEnd = null;
  this._searchTarget = null;
  this._searchTimer = 0;
  this._searching = false;
  this._lastProtectionUse = 0;
  this._protectionStartTime = 0;

    this.tasks = new TaskSystem(this);
  this.hud = new HUDSystem(this);
  this.combatLog = new CombatLog();
  this.actionProcess = new ActionProcess(this);
  this._actionPrev = {};
  this._edge = {};
  this.lastHitDir = 0;
  this.lastHitTime = -10;
}

  start(){
    this._setupScene();
    this._spawnPlayer();
    this._spawnEnemies();
    this._spawnExtracts();
    this._spawnContainers();
    this._registerInputActions();
    this.tasks.initFromRegistry();

    if (this.modeConfig.setup) {
      try { this.modeConfig.setup(this); }
      catch (e) { console.error('[Mode] setup err:', e); }
    }

    const footY = this.player.body.position.y - this.player.body.halfH;
this.engine.cameraCtl.follow(
  this.player.body.position.x,
  footY + 1.55,
  this.player.body.position.z
);
this.engine.cameraCtl.camera.position.x = this.player.body.position.x;
this.engine.cameraCtl.camera.position.z = this.player.body.position.z;

    this.hud.update();
    this.running = true;
    this._processModeHook('onMatchStart');
    this._processModeHook('onPlayerSpawn', this.player);

    this._log(
      this.engine.i18n.t('log.match_start', {
        map: this.engine.i18n.t(this.mapSpec.name),
        char: this.engine.i18n.t(this.charSpec.name),
      }), 'p'
    );
    this._log(
      this.engine.i18n.t('log.match_difficulty', {
        diff: this.diffId,
        mode: this.modeId,
      }), 'y'
    );
    if (this.kind === 'training') {
      this._log(this.engine.i18n.t('log.training_mode'), 'y');
    }
  }

  _setupScene(){
  const r = this.engine.renderer;
  r.clearScene();

  const mapSize = this.mapSpec.size;
  const half = mapSize / 2;

  const groundGeo = new THREE.PlaneGeometry(mapSize, mapSize);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xa8b4c0, roughness: 0.85, metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  r.scene.add(ground);

  const grid = new THREE.GridHelper(mapSize, Math.floor(mapSize / 3), 0x6a8aa8, 0x4a6a88);
  grid.material.opacity = 0.55;
  grid.material.transparent = true;
  grid.position.y = 0.02;
  r.scene.add(grid);

  if (this.layout && Array.isArray(this.layout.obstacles)) {
    this._buildFromLayout(this.layout);
  } else {
    this._buildRandomObstacles(half);
  }
}

_buildFromLayout(layout){
  const r = this.engine.renderer;
  for (const o of layout.obstacles) {
    const yMin = o.yMin !== undefined ? o.yMin : 0;
    const yMax = o.yMax !== undefined ? o.yMax : (o.h || 3);
    const h = Math.max(0.2, yMax - yMin);
    const w = o.w || 3;
    const d = o.d || 3;

    let color = 0xb4bcc8;
    if (o.type === 'crate')       color = 0xd4b878;
    else if (o.type === 'step')   color = 0x9aa8b8;
    else if (o.type === 'platform') color = 0x8aa2ba;
    else if (o.type === 'pillar') color = 0x7a8696;
    else if (o.type === 'lowWall') color = 0xaab4c4;
    else if (o.type === 'building' || o.type === 'roof') color = 0x8a96a8;

    const mesh = this.engine.meshes.build('obstacle', { w, h, d, color });
    mesh.position.x = o.x;
    mesh.position.y = yMin + h / 2;
    mesh.position.z = o.z;
    r.scene.add(mesh);

    const body = this.physics.add(new Body({
      x: o.x, z: o.z,
      isStatic: true,
      shape: 'aabb',
      halfW: w / 2,
      halfD: d / 2,
      yMin, yMax,
      height: h,
      radius: 0,
      userData: { type: 'obstacle' },
    }));
    this.obstacles.push({ mesh, body });
    this.pois.push({ x: o.x, z: o.z, type: 'obstacle', w, h: d, color: 'rgba(120,140,160,0.65)' });
  }

  if (Array.isArray(layout.containers)) {
    for (const c of layout.containers) this._spawnContainerAt(c.x, c.z);
  }
  if (Array.isArray(layout.extracts)) {
    for (const e of layout.extracts) this._spawnExtractAt(e.x, e.z);
  }
  if (layout.playerSpawn) this._playerSpawnPos = layout.playerSpawn;
  if (Array.isArray(layout.enemySpawns)) this._enemySpawnPositions = layout.enemySpawns;
}

_buildRandomObstacles(half){
  const r = this.engine.renderer;
  const obstacleCount = this.mapSpec.obstacleCount || 30;
  for (let i = 0; i < obstacleCount; i++) {
    const w = 3 + Math.random() * 6;
    const d = 3 + Math.random() * 6;
    const h = 2 + Math.random() * 2.5;
    const x = (Math.random() * 2 - 1) * (half - 6);
    const z = (Math.random() * 2 - 1) * (half - 6);
    if (Math.hypot(x, z) < 6) continue;

    const mesh = this.engine.meshes.build('obstacle', {
      w, h, d,
      color: Math.random() < 0.5 ? 0xc8d0d8 : 0xb4bcc8,
    });
    mesh.position.x = x;
    mesh.position.y = h / 2;
    mesh.position.z = z;
    r.scene.add(mesh);

    const body = this.physics.add(new Body({
      x, z,
      isStatic: true,
      shape: 'aabb',
      halfW: w / 2,
      halfD: d / 2,
      yMin: 0,
      yMax: h,
      height: h,
      radius: 0,
      userData: { type: 'obstacle' },
    }));
    this.obstacles.push({ mesh, body });
    this.pois.push({ x, z, type: 'obstacle', w, h: d, color: 'rgba(120,140,160,0.65)' });
  }
}

_spawnContainerAt(cx, cz){
  const mesh = this.engine.meshes.build('container', {});
  mesh.position.x = cx;
  mesh.position.z = cz;
  this.engine.renderer.scene.add(mesh);

  const cBody = this.physics.add(new Body({
    x: cx, z: cz,
    y: 0.65,
    height: 1.3,
    isStatic: true,
    shape: 'circle',
    radius: 0.9,
    userData: { type: 'container' },
  }));

  this.containers.push({
    x: cx, z: cz, mesh, body: cBody,
    opened: false, loot: null, revealed: [], searched: false,
  });
    this.pois.push({ x: cx, z: cz, type: 'container', color: '#ffcc33' });
}

_spawnGroundLoot(x, z, lootArray, label) {
  const mesh = new THREE.Group();
  const boxMat = new THREE.MeshStandardMaterial({ color: 0xaa7744, roughness: 0.7, metalness: 0.2 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.0), boxMat);
  box.position.y = 0.25;
  mesh.add(box);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 24), markerMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  mesh.add(ring);
  mesh.position.x = x;
  mesh.position.z = z;
  this.engine.renderer.scene.add(mesh);

  const loot = {
  x, z, mesh,
  opened: false,
  loot: lootArray || [],
  revealed: [],
  searched: false,
  isGround: true,
  label: label || '地面物品',
  grid: null // 预留
};
  this.groundLoots.push(loot);
  this.pois.push({ x, z, type: 'container', color: '#ffcc33' });
  return loot;
}

_dropItemToGround(uid) {
  const inv = this.engine.app ? this.engine.app.inventory : null;
  if (!inv) return false;
  const item = inv.items.get(uid);
  if (!item) return false;
  const parent = inv.parentOf.get(uid);
  if (!parent || !parent.startsWith('c:')) return false;
  const cName = parent.slice(2);
  if (cName === 'stash' || cName === 'safe') {
    this._log('仓库/安全箱物品无法直接丢弃', 'y');
    return false;
  }

  const p = this.player;
  if (!p) return false;
  const dropDist = 1.8;
  const angle = p.angle || 0;
  const dropX = p.body.position.x + Math.cos(angle) * dropDist;
  const dropZ = p.body.position.z + Math.sin(angle) * dropDist;

  const spec = {
    table: item.table,
    defId: item.defId,
    qty: item.qty,
    dur: item.dur,
    loaded: item.loaded ? { ammoType: item.loaded.ammoType, qty: item.loaded.qty } : null,
  };

  inv.removeFromContainer(cName, uid);
  inv.destroyItem(uid);

  this._spawnGroundLoot(dropX, dropZ, [spec], '丢弃物');
  this._log('已丢弃 ' + this.engine.i18n.t((inv.content.get(item.table, item.defId) || {}).name || item.defId), 'y');
  return true;
}

_spawnExtractAt(ex, ez){
  const mesh = this.engine.meshes.build('extract', { radius: 3.5 });
  mesh.position.x = ex;
  mesh.position.z = ez;
  this.engine.renderer.scene.add(mesh);
  this.extracts.push({ x: ex, z: ez, mesh, timer: 0, active: false });
  this.pois.push({ x: ex, z: ez, type: 'extract', color: '#5fd4ff' });
}

  _spawnPlayer(){
  const spec = this.charSpec;
  const mesh = this.engine.meshes.build('player', spec);
  this.engine.renderer.scene.add(mesh);
  
  // FPS模式隐藏玩家身体
  mesh.visible = false;

  const spawnX = this._playerSpawnPos ? this._playerSpawnPos.x : 0;
const spawnZ = this._playerSpawnPos ? this._playerSpawnPos.z : 0;
const body = this.physics.add(new Body({
  x: spawnX, z: spawnZ,
  y: 0.9,
  height: 1.8,
  radius: spec.radius || 1.2,
  mass: 70,
  restitution: 0.1,
  friction: 6,
  userData: { type: 'player' },
}));

  // ★ 生成 FPS 视图武器（挂载在相机上）
  const weaponGroup = new THREE.Group();
  
  // 枪身
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x2b3542, metalness: 0.6, roughness: 0.4 });
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.6), gunMat);
  gunBody.position.set(0, 0, -0.3);
  
  // 枪管
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), gunMat);
  barrel.position.set(0, 0.05, -0.7);
  
  // 握把
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  grip.position.set(0, -0.15, 0.1);
  
  // 瞄准镜
  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  scope.position.set(0, 0.12, -0.3);

  weaponGroup.add(gunBody, barrel, grip, scope);
  
  // 把武器挂载到相机的子节点（位置放在右下角）
  weaponGroup.position.set(0.25, -0.2, -0.4);
  this.engine.renderer.camera.add(weaponGroup);

  const inv = this.engine.app ? this.engine.app.inventory : null;
  const invMain = this._buildWeaponFromInventory(inv, 'main');
  const invSide = this._buildWeaponFromInventory(inv, 'side');
  const invArmor = this._buildArmorFromInventory(inv);
  
  this.player = {
    mesh, body,
    weaponGroup, // ★ 存入玩家对象
    charSpec: spec,
    charId: spec.id,
    hp: spec.hp,
    maxHp: spec.hp,
    coupling: spec.prazer ? 100 : 0,
    maxCoupling: spec.prazer ? 100 : 0,
    protection: null,
    protectionHold: false,
    angle: 0,
    weapon: invMain || this._buildWeapon(spec.weapon),
    sidearm: invSide || (spec.sidearm ? this._buildWeapon(spec.sidearm) : null),
    usingSidearm: false,
    fireCd: 0,
    alive: true,
    kills: 0,
    dealt: 0,
    taken: 0,
    carriedValue: 0,
    limbDamage: 0,
    speedMul: 1,
    stamina: 100,
    maxStamina: 100,
    armor: invArmor || {
       shell: { lv: 3, dur: 100, max: 100 },
       visor: { lv: 3, dur: 100, max: 100 },
       fiber: { lv: 4, dur: 100, max: 100 },
       plate: { lv: 4, dur: 100, max: 100 },
},
    skills: this._buildSkills(spec.skills || []),
  };
  this.player.body.userData.ref = this.player;

// ★ 收集轮廓流光 mesh，并初始化消耗检测状态
this.player.glowMeshes = [];
this.player.mesh.traverse(obj => {
  if (obj.isMesh && obj.name === '__prazer_glow__') this.player.glowMeshes.push(obj);
});
this.player._lastCoupling = this.player.coupling;
this.player._glowTimer = 0;

 // 将整个相机加入场景（否则相机子节点无法显示）
if (!this.engine.renderer.scene.children.includes(this.engine.renderer.camera)) {
  this.engine.renderer.scene.add(this.engine.renderer.camera);
}

    this._carriedValueBaseline = this._computeCarriedValue();
  this._carriedValueTimer = 0;
  this._bob = { phase: 0 };
  this._sprintProgress = 0;
}

 _buildWeapon(id){
  const def = this.engine.content.get('weapons', id);
  if (!def) return null;
  const ammoDef = this.engine.content.get('ammo', def.ammoType);
  const magCap = def.mag || 0;
  return {
    def, ammoDef,
    loaded: { ammoType: def.ammoType, qty: magCap },
    magCap,
    reserve: magCap * 3,
    fireCd: 0,
    reloading: 0,
    get mag() { return this.loaded.qty; },
    set mag(v) { this.loaded.qty = Math.max(0, Math.min(this.magCap, v)); },
  };
}

  /* ===== Inventory 对接 ===== */
  _buildWeaponFromInventory(inv, equipSlot) {
  if (!inv) return null;
  const uid = inv.equipped[equipSlot];
  if (!uid) return null;
  const item = inv.items.get(uid);
  if (!item || item.table !== 'weapons') return null;
  const def = this.engine.content.get('weapons', item.defId);
  if (!def) return null;
  const ammoDef = this.engine.content.get('ammo', def.ammoType);
  if (item.mag === undefined) item.mag = def.mag;

  const self = this;
  return {
    item,
    def,
    ammoDef,
    magCap: def.mag,
    fireCd: 0,
    reloading: 0,
    get mag() { return this.item.mag; },
    set mag(v) { this.item.mag = Math.max(0, Math.min(this.magCap, v)); },
    get reserve() { return self._countAmmoInInventory(inv, def.ammoType); },
    consumeReserve(count) { self._consumeAmmoInInventory(inv, def.ammoType, count); },
  };
}


_computeCarriedValue(){
  const inv = this.engine.app ? this.engine.app.inventory : null;
  if (!inv) return 0;
  let total = 0;
  for (const slot of ['main', 'side', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig']) {
    const uid = inv.equipped[slot];
    if (uid) total += inv.getItemValue(uid);
  }
  // ★ 包含 safe 安全箱，因为安全箱也是带在身上的
  for (const cName of ['chest', 'pocket', 'bag', 'safe']) {
    const c = inv.containers[cName];
    if (!c) continue;
    for (const uid of c.uids) total += inv.getItemValue(uid);
  }
  return total;
}
   
_computeLootValue(){
  const current = this._computeCarriedValue();
  const base = this._carriedValueBaseline || 0;
  return Math.max(0, current - base);
}

_countAmmoInInventory(inv, ammoType) {
  if (!inv) return 0;
  let total = 0;
  for (const cName of ['chest', 'pocket', 'bag', 'safe']) {
    const c = inv.containers[cName];
    if (!c) continue;
    for (const uid of c.uids) {
      const item = inv.items.get(uid);
      if (item && item.table === 'ammo' && item.defId === ammoType) {
        total += item.qty;
      }
    }
  }
  return total;
}

_consumeAmmoInInventory(inv, ammoType, count) {
  if (!inv || count <= 0) return 0;
  let remaining = count;
  for (const cName of ['chest', 'pocket', 'bag', 'safe']) {
    const c = inv.containers[cName];
    if (!c) continue;
    for (let i = c.uids.length - 1; i >= 0 && remaining > 0; i--) {
      const uid = c.uids[i];
      const item = inv.items.get(uid);
      if (!item || item.table !== 'ammo' || item.defId !== ammoType) continue;
      const take = Math.min(item.qty, remaining);
      item.qty -= take;
      remaining -= take;
      if (item.qty <= 0) inv.destroyItem(uid);
    }
  }
  return count - remaining;
}

  _buildArmorFromInventory(inv) {
  if (!inv) return null;
  const result = {};
  const mapping = [
    ['helmetShell', 'shell'],
    ['helmetVisor', 'visor'],
    ['vestFiber', 'fiber'],
    ['vestPlate', 'plate'],
  ];
  for (const [equipSlot, armorSlot] of mapping) {
    const uid = inv.equipped[equipSlot];
    if (!uid) { result[armorSlot] = { lv: 0, dur: 0, max: 0 }; continue; }
    const item = inv.items.get(uid);
    if (!item) { result[armorSlot] = { lv: 0, dur: 0, max: 0 }; continue; }
    const def = this.engine.content.get(item.table, item.defId);
    if (!def || !def.armorLv) { result[armorSlot] = { lv: 0, dur: 0, max: 0 }; continue; }
    result[armorSlot] = {
      item,
      lv: def.armorLv,
      max: item.durMax,
      get dur() { return this.item.dur; },
      set dur(v) { this.item.dur = v; },
    };
  }
  return result;
}

  _buildSkills(skillIds){
    const result = [];
    for (let i = 0; i < skillIds.length; i++) {
      const def = this.engine.content.get('skills', skillIds[i]);
      if (!def) continue;
      result.push({ id: skillIds[i], def, ready: true, cd: 0, slot: i });
    }
    return result;
  }

  _spawnEnemies(){
  const specs = this.engine.content.all('enemies');
  if (!specs.length) return;
  const count = this.mapSpec.enemyCount || 6;
  const half = this.mapSpec.size / 2 - 6;
  const diffMul = { easy: 0.75, normal: 1, hard: 1.25, nightmare: 1.5 }[this.diffId] || 1;

  if (this._enemySpawnPositions && this._enemySpawnPositions.length) {
    const spawnList = this._enemySpawnPositions;
    for (let i = 0; i < count; i++) {
      const spec = specs[i % specs.length];
      const pos = spawnList[i % spawnList.length];
      this._spawnEnemy(spec, pos.x, pos.z, diffMul);
    }
    return;
  }

  for (let i = 0; i < count; i++) {
    const spec = specs[i % specs.length];
    let ex, ez, tries = 0;
    do {
      ex = (Math.random() * 2 - 1) * half;
      ez = (Math.random() * 2 - 1) * half;
      tries++;
    } while (Math.hypot(ex, ez) < 25 && tries < 60);
    this._spawnEnemy(spec, ex, ez, diffMul);
  }
}

  _spawnEnemy(spec, x, z, diffMul){
  const assessment = this.engine.profile.assess();
  const profileMul = 0.5 + assessment.score;

  const mesh = this.engine.meshes.build('enemy', spec);
  
  mesh.traverse(obj => {
    if (obj.isMesh) {
      obj.material = obj.material.clone();
    }
  });
  
  this.engine.renderer.scene.add(mesh);

  // ★ 碰撞高度与视觉模型对齐（视觉 2.325，碰撞 2.4）
  const body = this.physics.add(new Body({
    x, z,
    y: 1.2,
    height: 2.4,
    radius: spec.radius || 1.2,
    mass: 60,
    restitution: 0.1,
    friction: 5,
    userData: { type: 'enemy' },
  }));

  // ★ 根据 gear.armor 构造敌人护甲（和玩家同结构）
  const armor = {
    shell: { lv: 0, dur: 0, max: 0 },
    visor: { lv: 0, dur: 0, max: 0 },
    fiber: { lv: 0, dur: 0, max: 0 },
    plate: { lv: 0, dur: 0, max: 0 },
  };
  if (spec.gear && spec.gear.armor) {
    for (const slot in armor) {
      const g = spec.gear.armor[slot];
      if (g && g.lv > 0) {
        armor[slot] = { lv: g.lv, dur: 100, max: 100, defId: g.defId };
      }
    }
  }

  // ★ Prazer 敌人有耦合系统（暂时默认关闭防护，被击中后可开）
  const isPrazer = !!spec.prazer;
  const maxCoup = isPrazer ? 100 : 0;

  const enemy = {
    mesh, body, spec,
    hp: spec.hp * diffMul * profileMul,
    maxHp: spec.hp * diffMul * profileMul,
    angle: Math.random() * Math.PI * 2,
    weapon: this._buildWeapon(spec.weapon),
    fireCd: 0.5 + Math.random() * 1.0,
    alive: true,
    awareness: 0,
    state: 'patrol',
    stateT: 0,
    wanderT: 1 + Math.random() * 2,
    wanderDir: Math.random() * Math.PI * 2,
    strafeDir: Math.random() < 0.5 ? 1 : -1,
    strafeT: 0.7 + Math.random() * 1.2,
    hitFlash: 0,
    trainingDummy: this.kind === 'training',
    // ★ 新增：护甲 + 耦合 + charSpec（与玩家一致）
    armor,
    coupling: maxCoup,
    maxCoupling: maxCoup,
    protection: null,
    protectionHold: false,
    limbDamage: 0,
    speedMul: 1,
    charSpec: { prazer: isPrazer, A: spec.A || 0, hp: spec.hp },
  };
    body.userData.ref = enemy;

  // ★ 收集轮廓流光（非 Prazer 时为空数组）
  enemy.glowMeshes = [];
  enemy.mesh.traverse(obj => {
    if (obj.isMesh && obj.name === '__prazer_glow__') enemy.glowMeshes.push(obj);
  });
  enemy._lastCoupling = enemy.coupling;
  enemy._glowTimer = 0;

  this.enemies.push(enemy);
}
  _spawnExtracts(){
  if (this.extracts.length > 0) return;
  const half = this.mapSpec.size / 2 - 4;
  const positions = [
    { x: -half, z: -half }, { x: half, z: -half },
    { x: -half, z: half },  { x: half, z: half },
  ];
  for (const pos of positions) this._spawnExtractAt(pos.x, pos.z);
}

  _spawnContainers(){
  if (this.containers.length > 0) return;
  const half = this.mapSpec.size / 2 - 6;
  const count = 8;
  for (let i = 0; i < count; i++) {
    let cx, cz, tries = 0;
    do {
      cx = (Math.random() * 2 - 1) * half;
      cz = (Math.random() * 2 - 1) * half;
      tries++;
    } while (Math.hypot(cx, cz) < 8 && tries < 40);
    this._spawnContainerAt(cx, cz);
  }
}

  _registerInputActions(){
  const input = this.engine.input;
  for (const [name, cfg] of Object.entries(ACTION_MAP)) {
    if (!cfg.keys && !cfg.mouse) continue;
    const reg = {};
    if (cfg.keys) reg.keys = cfg.keys.slice();
    if (cfg.mouse) reg.mouse = cfg.mouse;
    input.registerAction(name, reg);
  }
  }

 update(dt){
  if (!this.running || this.paused) return;
  this.time += dt;

  this.tasks.tickSurvive(dt);
  this._updatePlayer(dt);
  this.actionProcess.update(dt);
  this._updateEnemies(dt);
  this._updateExtracts(dt);
  this._updateContainers(dt);
  this._updateTracers(dt);
  this._updateMobileButtons();
  this._updateSearchHint();

  this.physics.step(dt);
this._syncMeshes(dt);
this._updateGlowState(this.player, dt);

    // ★ 玩家存活 → 常规跟随；玩家死亡 → 死亡相机接管
  if (this.player && this.player.alive) {
    const footY = this.player.body.position.y - this.player.body.halfH;
    this.engine.cameraCtl.follow(
      this.player.body.position.x,
      footY + 1.55,
      this.player.body.position.z
    );
  } else {
    this._updateDeathCamera(dt);
  }
this.hud.update();

  if (this.timeLimit > 0 && this.time >= this.timeLimit) {
    this._log('时间耗尽', 'r');
    this._end(false);
  }
}

_updatePlayer(dt){
  const p = this.player;
  if (!p || !p.alive) return;

  const e = this.engine;
  this._refreshEdges();

  // ★ 1. 陀螺仪视角控制（增量计算，防飘防抖）
  if (e.input.gyroEnabled) {
    const g = e.input.currentGyro;
    if (!this._gyroBase) {
      this._gyroBase = { beta: g.beta, gamma: g.gamma };
    } else {
      // 获取相对上次的增量
      const dx = g.gamma - this._gyroBase.gamma;
      const dy = g.beta - this._gyroBase.beta;
      
      // 死区过滤，防止静止时画面自己抖
      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
        const sens = 3.0 * e.input.gyroSensitivity;
        e.cameraCtl.rotate(dx * sens, dy * sens);
        
        // 立即更新基准点，防止累积过度导致瞬间翻转
        this._gyroBase.gamma = g.gamma;
        this._gyroBase.beta = g.beta;
      }
    }
  }

 // ★ 2. 硬核体力值系统（非线性）
const mv = e.input.getMoveVector();
const isMoving = (mv.x !== 0 || mv.z !== 0);

// 移动打断搜索
if (this._searching && (Math.abs(mv.x) > 0.15 || Math.abs(mv.z) > 0.15)) {
  this._closeSearch();
  this._log('搜索已取消', 'y');
}

const wantsToSprint = e.input.keys.has('shift') ||
                      e.input.isActive('sprint') ||
                      (e.input.joystickLeft && e.input.joystickLeft.vector.magnitude > 0.9);

const spec = p.charSpec || {};
const baseCost        = spec.sprintCost !== undefined ? spec.sprintCost : 2.5;
const baseIdleRegen   = spec.staminaRegen && spec.staminaRegen.idle !== undefined ? spec.staminaRegen.idle : 6;
const baseMoveRegen   = spec.staminaRegen && spec.staminaRegen.move !== undefined ? spec.staminaRegen.move : 1.5;

const staminaRatio = p.stamina / p.maxStamina;
const fatigueMul   = 1 + (1 - staminaRatio) * 1.5;   // 越累消耗越快：1~2.5
const recoveryMul  = 1 + (1 - staminaRatio) * 2.0;   // 越累恢复越快：1~3

const canSprint = isMoving && wantsToSprint && p.stamina > 2 && staminaRatio > 0.15;

let isSprinting = false;
if (canSprint) {
  isSprinting = true;
  p.stamina = Math.max(0, p.stamina - dt * baseCost * fatigueMul);
} else {
  const regen = isMoving ? baseMoveRegen : baseIdleRegen;
  p.stamina = Math.min(p.maxStamina, p.stamina + dt * regen * recoveryMul);
}

// 平滑冲刺进度：让 speed/FOV 连续变化，避免布尔跳变导致抽动
if (this._sprintProgress === undefined) this._sprintProgress = 0;
const targetProgress = isSprinting ? 1 : 0;
this._sprintProgress += (targetProgress - this._sprintProgress) * Math.min(1, dt * 6);
const sp = this._sprintProgress;

const baseSpeed = p.charSpec.speed * (p.speedMul !== undefined ? p.speedMul : 1);
const sprintMul = spec.prazer ? 1.6 : 1.55;
const speedMul = 1 + sp * (sprintMul - 1);
const speed = baseSpeed * speedMul;

// 力竭惩罚：< 20% 体力时移动减速
const exhaustionMul = staminaRatio < 0.2 ? 0.75 : 1;

  // ★ 3. 移动计算（搜索时锁定移动）
let moveX = 0, moveZ = 0;
if (!this._searching) {
  const forwardX = Math.sin(e.cameraCtl.yaw);
  const forwardZ = -Math.cos(e.cameraCtl.yaw);
  const rightX = Math.cos(e.cameraCtl.yaw);
  const rightZ = Math.sin(e.cameraCtl.yaw);
  moveX = rightX * mv.x + forwardX * -mv.z;
  moveZ = rightZ * mv.x + forwardZ * -mv.z;
}

const finalSpeed = speed * exhaustionMul;
p.body.velocity.x = moveX * finalSpeed;
p.body.velocity.z = moveZ * finalSpeed;
if (isMoving && !this._searching) p.body.wake();

 // ★ 4. 跳跃检测（grounded 标志）
const jumpPressed = e.input.keys.has(' ') || e.input.isActive('jump');
if (jumpPressed && p.body.grounded && p.body.velocity.y <= 0.1) {
  p.body.velocity.y = 9.5;
  p.body.wake();
}

  // ★ 5. 角色朝向始终跟随相机前方
  p.angle = e.cameraCtl.yaw;

  // 更新耦合防护状态（耗能/恢复）
this._updateProtection(dt);

// ★ 防护数字键（1/2/3）· edge trigger
if (p.charSpec && p.charSpec.prazer) {
  if (this._edge.protectL1) this._toggleProtection('L1');
  if (this._edge.protectL2) this._toggleProtection('L2');
  if (this._edge.protectL3) this._toggleProtection('L3');
}

// 技能冷却
for (const sk of p.skills) {
    if (!sk.ready) {
      sk.cd -= dt;
      if (sk.cd <= 0) { sk.ready = true; sk.cd = 0; }
    }
  }

   // ★ 6. 换弹与开火逻辑
const reloading = this.actionProcess.isRunning('reload');
if (!this._searching) {
  if (p.fireCd > 0) p.fireCd -= dt;
  const cw = this.currentWeapon;
  if (!reloading && e.input.isActive('fire') && p.fireCd <= 0 && cw) {
    if (cw.mag <= 0) this._startReload();
    else this._fireWeapon(p, cw, true);
  }
}

// ★ 7. 其他输入动作检测（edge-trigger，搜索时禁用）
if (!this._searching) {
  if (this._edge.reload) this._startReload();
  if (this._edge.switchWeapon && p.sidearm) this._switchWeapon();
  if (this._edge.skill1) this._useSkill(0);
  if (this._edge.skill2) this._useSkill(1);
  if (this._edge.search) this._trySearchContainer();
}

  // ★ 8. Headbob + 武器摆动 + 冲刺 FOV
this._updateSpeedFeedback(dt, isMoving);

  // 边界限制，防止跑出地图
  const half = this.mapSpec.size / 2 - 1;
  p.body.position.x = Math.max(-half, Math.min(half, p.body.position.x));
  p.body.position.z = Math.max(-half, Math.min(half, p.body.position.z));
}

_updateSpeedFeedback(dt, isMoving) {
  const p = this.player;
  const camCtl = this.engine.cameraCtl;
  const cam = this.engine.renderer.camera;
  const sp = this._sprintProgress || 0;

  // --- headbob（连续，基于冲刺进度） ---
  if (!this._bob) this._bob = { phase: 0 };
  const bobAmp = 0.02 + sp * 0.03;
  const bobFreq = 8 + sp * 4;
  if (isMoving) this._bob.phase += dt * bobFreq;

  const bobY = Math.sin(this._bob.phase * 2) * bobAmp;
  const bobX = Math.cos(this._bob.phase) * bobAmp * 0.3;

  // 通过 cameraCtl 统一应用（避免被 cameraCtl.update 覆盖）
  if (camCtl && typeof camCtl.setBob === 'function') {
    camCtl.setBob(bobY, bobX * 0.15);
  }

  // --- 武器摆动 ---
  if (p.weaponGroup) {
    const swayAmp = 0.005 + sp * 0.015;
    const swayX = Math.cos(this._bob.phase) * swayAmp;
    const swayY = Math.sin(this._bob.phase * 2) * swayAmp * 0.6;
    const baseX = 0.25, baseY = -0.2, baseZ = -0.4;
    p.weaponGroup.position.x += (baseX + swayX - p.weaponGroup.position.x) * 0.2;
    p.weaponGroup.position.y += (baseY + swayY - p.weaponGroup.position.y) * 0.2;
    p.weaponGroup.position.z += (baseZ - p.weaponGroup.position.z) * 0.2;
  }

  // --- FOV（基于平滑冲刺进度，连续变化） ---
  const baseFov = 60;
  const sprintFov = 68;
  const targetFov = baseFov + sp * (sprintFov - baseFov);
  const fovDiff = targetFov - cam.fov;
  if (Math.abs(fovDiff) > 0.05) {
    cam.fov += fovDiff * Math.min(1, dt * 10);
    cam.updateProjectionMatrix();
  }
}

  

  _wasPressed(action) {
  if (!this._actionPrev) this._actionPrev = {};
  const current = !!this.engine.input.isActive(action);
  const prev = this._actionPrev[action] || false;
  this._actionPrev[action] = current;
  return current && !prev;
}

_refreshEdges() {
  if (!this._actionPrev) this._actionPrev = {};
  if (!this._edge) this._edge = {};
  const names = ['reload', 'switchWeapon', 'skill1', 'skill2', 'protectL1', 'protectL2', 'protectL3', 'search'];
  for (let i = 0; i < names.length; i++) {
    const a = names[i];
    const cur = !!this.engine.input.isActive(a);
    const prev = !!this._actionPrev[a];
    this._edge[a] = cur && !prev;
    this._actionPrev[a] = cur;
  }
}

_updateProgressUI() {
  const el = document.getElementById('action-progress');
  if (!el) return;
  const prog = this.actionProcess.getProgress();
  if (!prog) {
    el.classList.remove('on');
    return;
  }
  el.classList.add('on');
  const labelEl = document.getElementById('action-progress-label');
  const fillEl = document.getElementById('action-progress-fill');
  const timeEl = document.getElementById('action-progress-time');
  if (labelEl) labelEl.textContent = prog.label;
  if (fillEl) fillEl.style.width = (prog.pct * 100).toFixed(1) + '%';
  if (timeEl) timeEl.textContent = prog.remain.toFixed(1) + 's';

  const cancelBtn = document.getElementById('action-progress-cancel');
  if (cancelBtn && !cancelBtn._bound) {
    cancelBtn._bound = true;
    cancelBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.actionProcess.cancel('手动取消');
    });
  }
}

_updateProtection(dt){
  const p = this.player;
  if (!p.charSpec.prazer) return;

    if (p.protectionHold && p.protection && p.coupling > 0) {
      const drain = COMBAT.PROTECT_DRAIN[p.protection] || 0;
      p.coupling = Math.max(0, p.coupling - drain * dt);
      this._protectionStartTime += dt;
      if (p.coupling <= 0) {
        p.protectionHold = false;
        this._log('耦合能耗尽', 'r');
      }
    } else {
      if (this._protectionStartTime > 0) {
        this._lastProtectionUse = this.time;
        this._protectionStartTime = 0;
      }
      const sinceLastUse = this.time - this._lastProtectionUse;
      if (sinceLastUse > COMBAT.COUPLING_REGEN_DELAY) {
        const rate = (this.time - this._lastProtectionUse > COMBAT.COUPLING_LONG_THRESHOLD)
          ? COMBAT.COUPLING_REGEN_LONG : COMBAT.COUPLING_REGEN_IDLE;
        p.coupling = Math.min(p.maxCoupling, p.coupling + rate * dt);
      }
    }
  }

  _toggleProtection(level){
    const p = this.player;
    if (!p || !p.charSpec.prazer || p.coupling <= 0) return;
    if (p.protectionHold && p.protection === level) {
      p.protectionHold = false;
      return;
    }
    p.protection = level;
    p.protectionHold = true;
  }

  _releaseProtection(){
    if (this.player) this.player.protectionHold = false;
  }

    _switchWeapon(){
  const p = this.player;
  if (!p) return;
  if (!p.sidearm) {
    this._log('无副武器', 'y');
    return;
  }
  if (this.actionProcess.isRunning()) {
    if (!this.actionProcess.cancel('切换武器')) return;
  }
  p.usingSidearm = !p.usingSidearm;
  p.fireCd = Math.max(p.fireCd, 0.3);
  const cw = p.usingSidearm ? p.sidearm : p.weapon;
  if (cw && cw.def) {
    this._log('切换至 ' + this.engine.i18n.t(cw.def.name), 'p');
  }
  this._playSFX('switch');
}

  get currentWeapon(){
    const p = this.player;
    if (!p) return null;
    return p.usingSidearm ? p.sidearm : p.weapon;
  }

  _startReload(){
  const p = this.player;
  const w = this.currentWeapon;
  if (!w || !p.alive) return;
  if (this.actionProcess.isRunning()) return;
  if (w.mag >= w.magCap) {
    this._log('弹匣已满', 'y');
    return;
  }
  if (w.reserve <= 0) {
    this._log('无备用弹药', 'y');
    return;
  }

  const realistic = this.engine.profile.get('combat.realisticReload', false);
  const reloadMul = realistic ? 1.5 : 0.8;
  const duration = w.def.reload * reloadMul;

  this.actionProcess.start({
    id: 'reload',
    label: '换弹',
    duration,
    cancelable: true,
    onComplete: () => this._finishReload(),
    onCancel: () => {
      this._log('换弹被中断', 'y');
    },
  });
  this._playSFX('reload');
}

  _finishReload(){
  const p = this.player;
  const w = this.currentWeapon;
  if (!w) return;
  const need = w.magCap - w.mag;
  const take = Math.min(need, w.reserve);
  if (take > 0) {
    w.mag += take;
    if (typeof w.consumeReserve === 'function') {
      w.consumeReserve(take);
    } else {
      w.reserve -= take;
    }
  }
}

 _fireWeapon(owner, weapon, isPlayer, target){
  if (!weapon || !weapon.def) return;
  const def = weapon.def;
  const ammo = weapon.ammoDef;
  if (!ammo) return;

  if (isPlayer) owner.fireCd = 60 / def.rpm;
  else owner.fireCd = 60 / def.rpm * (0.9 + Math.random() * 0.4);
  
  if (weapon.loaded) {
    weapon.loaded.qty = Math.max(0, weapon.loaded.qty - 1);
  } else if (typeof weapon.mag === 'number') {
    weapon.mag--;
  }
  if (isPlayer) this.stats.shots++;
  const baseSpread = def.spread || 0.02;
  const acc = isPlayer ? 1.0 : (owner.spec ? owner.spec.acc : 0.5);
  const spread = baseSpread * (isPlayer ? 1 : (1.5 - acc));
  const baseEnergy = CombatSystem.kinetic(ammo.massG, ammo.v0);
  const range = (def.range || 50) * 10;
  const pellets = def.pellets || 1;
  if (isPlayer) {
    this.combatLog.push({
      type: 'shot_fired', t: this.time,
      weapon: this.engine.i18n.t(def.name),
      pellets: pellets,
      energy: baseEnergy,
    });
  }
  
  if (isPlayer) {
    // ★ 后坐力视觉表现：枪模后缩
    if (owner.weaponGroup) {
      owner.weaponGroup.position.z = -0.3; // 向后缩
      setTimeout(() => {
        if (owner.weaponGroup) owner.weaponGroup.position.z = -0.4; // 恢复
      }, 50);
    }

    const cam = this.engine.renderer.camera;
    const camPos = new THREE.Vector3();
    cam.getWorldPosition(camPos);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    
    // 计算枪口的绝对世界坐标（基于相机偏移）
    const muzzleOffset = new THREE.Vector3(0.25, -0.15, -0.8); // 相对相机的偏移
    muzzleOffset.applyQuaternion(cam.quaternion);
    const muzzlePos = camPos.clone().add(muzzleOffset);

    // 构建相机方向的正交基（right / up），用于圆形散布采样
    const dLen = Math.hypot(dir.x, dir.y, dir.z) || 1;
    const nX = dir.x / dLen, nY = dir.y / dLen, nZ = dir.z / dLen;
    const xzLen = Math.hypot(nX, nZ) || 1e-6;
    const rightX = -nZ / xzLen, rightZ = nX / xzLen;
    const upX = -nX * nY / xzLen;
    const upY = xzLen;
    const upZ = -nZ * nY / xzLen;

    for (let i = 0; i < pellets; i++) {
      // 圆盘均匀采样：角度均匀，半径按 sqrt 分布
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.sqrt(Math.random()) * spread;
      const sx = Math.cos(ang) * rad;
      const sy = Math.sin(ang) * rad;

      const dX = nX + rightX * sx + upX * sy;
      const dY = nY + upY * sy;
      const dZ = nZ + rightZ * sx + upZ * sy;
      const len = Math.hypot(dX, dY, dZ) || 1;

      this._raycastBullet(owner, muzzlePos.x, muzzlePos.y, muzzlePos.z, dX / len, dY / len, dZ / len, baseEnergy, range, def, ammo, true);
    }
  } else {
    // ★ 敌人射击：瞄准随机部位（头 10% / 胸 45% / 腹 20% / 腿 25%）
    const eyeY = owner.body.position.y + (owner.body.halfH || 0.9) * 0.75;
    const tgtBody = target && target.body ? target.body : null;
    const hh = tgtBody ? (tgtBody.halfH || 1.2) : 1.2;

    // 随机部位瞄准点
    const roll = Math.random();
    let aimYOffset = 0;
    if (roll < 0.10) aimYOffset = hh * 0.75;
    else if (roll < 0.55) aimYOffset = hh * 0.25;
    else if (roll < 0.75) aimYOffset = -hh * 0.05;
    else aimYOffset = -hh * 0.70;

    const aimX = tgtBody ? tgtBody.position.x : owner.body.position.x;
    const aimY = tgtBody ? (tgtBody.position.y + aimYOffset) : eyeY;
    const aimZ = tgtBody ? tgtBody.position.z : owner.body.position.z;

    const dx = aimX - owner.body.position.x;
    const dz = aimZ - owner.body.position.z;
    const dy = aimY - eyeY;
    const horizLen = Math.hypot(dx, dz) || 1;
    const baseYaw = Math.atan2(dz, dx);
    const basePitchTan = dy / horizLen;

    for (let i = 0; i < pellets; i++) {
      const yawErr = (Math.random() * 2 - 1) * spread;
      const pitchErr = (Math.random() * 2 - 1) * spread * 0.5;
      const yaw = baseYaw + yawErr;
      const pitchTan = basePitchTan + pitchErr;
      const dirX = Math.cos(yaw);
      const dirY = pitchTan;
      const dirZ = Math.sin(yaw);
      this._raycastBullet(owner, owner.body.position.x, eyeY, owner.body.position.z, dirX, dirY, dirZ, baseEnergy, range, def, ammo, false);
    }
  }
  this._playSFX('shot_' + def.cls, { volume: 0.6 });
}

_raycastBullet(owner, ox, oy, oz, dirX, dirY, dirZ, baseEnergy, range, weaponDef, ammoDef, isPlayer){
  const hitFilter = isPlayer
    ? (body) => body !== owner.body && (body.userData?.type === 'enemy' || body.userData?.type === 'obstacle')
    : (body) => body !== owner.body && (body.userData?.type === 'player' || body.userData?.type === 'obstacle');

  const hit = this.physics.raycast(ox, oy, oz, dirX, dirY, dirZ, range, hitFilter);

  const dirLen = Math.hypot(dirX, dirY, dirZ) || 1;
  const nx = dirX / dirLen, ny = dirY / dirLen, nz = dirZ / dirLen;

  const actualDist = hit ? hit.t : range;
  const endX = hit ? hit.point.x : (ox + nx * actualDist);
  const endY = hit ? hit.point.y : (oy + ny * actualDist);
  const endZ = hit ? hit.point.z : (oz + nz * actualDist);

  this._spawnTracer(ox, oy, oz, endX, endY, endZ, isPlayer ? 0xffe08a : 0xff8b7b);

  const realisticDrop = this.engine.profile.get('combat.bulletDrop', false);
  const decayK = realisticDrop ? COMBAT.RANGE_DECAY_REALISTIC : COMBAT.RANGE_DECAY;
  const energy = CombatSystem.energyAtRange(baseEnergy, actualDist, range, decayK);

  const pen = (ammoDef && typeof ammoDef.pen === 'number') ? ammoDef.pen : 0;

  if (hit && hit.body.userData.type !== 'obstacle') {
  const targetBody = hit.body;
  const hitY = hit.point.y;
  const relY = hitY - targetBody.position.y;
  const hh = targetBody.halfH || 1.2;

  // ★ 部位判定：与视觉模型比例严格对齐
  // 视觉模型（body 中心 1.2，半高 1.2）：
  //   头 1.875~2.325 / 胸 1.30~1.875 / 腹 1.00~1.30 / 腿 0~1.00
  // 相对 body 中心并除以 hh 后的阈值：
  //   head > 0.5625 / thorax > 0.0833 / abdomen > -0.1667 / else legs
  const r = relY / hh;
  let part;
  if (r > 0.5625) part = 'head';
  else if (r > 0.0833) part = 'thorax';
  else if (r > -0.1667) part = 'abdomen';
  else part = 'legs';

  if (isPlayer && hit.body.userData.type === 'enemy') {
    this._damageEnemy(hit.body.userData.ref, energy, pen, part);
  } else if (!isPlayer && hit.body.userData.type === 'player') {
    this._damagePlayer(hit.body.userData.ref, energy, pen, part, ox, oz, owner);
  }
  return;
}
  if (endY <= 0.01) {
    this._spawnSpark(endX, 0.1, endZ);
  } else if (hit && hit.body.userData.type === 'obstacle') {
    this._spawnSpark(endX, endY, endZ);
  }
}

  enemyFire(enemy, target){
  if (!enemy.alive || !enemy.weapon) return;
  if (enemy.trainingDummy) return;
  this._fireWeapon(enemy, enemy.weapon, false, target);
}

_applyArmorLayers(entity, energy, pen, hitPart) {
  let remaining = energy;
  let snapshot = null;

  if (!entity.armor) return { remaining, snapshot };

  const applyOne = (piece, layerName) => {
    if (!piece || piece.lv <= 0 || piece.dur <= 0) return null;
    const before = piece.dur;
    const res = CombatSystem.applyArmor(piece, remaining, pen);
    remaining = res.remaining;
    if (res.absorbed > 0) {
      return {
        layer: layerName,
        lv: piece.lv,
        absorbed: res.absorbed,
        wear: before - piece.dur,
        broke: piece.dur <= 0,
      };
    }
    return null;
  };

  if (hitPart === 'head') {
    const s1 = applyOne(entity.armor.shell, '头盔壳');
    const s2 = applyOne(entity.armor.visor, '面罩');
    if (s1) snapshot = s1;
    else if (s2) snapshot = s2;
  } else if (hitPart === 'thorax' || hitPart === 'abdomen') {
    const s1 = applyOne(entity.armor.plate, '插板');
    const s2 = applyOne(entity.armor.fiber, '纤维');
    if (s1) snapshot = s1;
    else if (s2) snapshot = s2;
  } else {
    // 四肢：仅 fiber 覆盖
    const s1 = applyOne(entity.armor.fiber, '纤维');
    if (s1) snapshot = s1;
  }

  return { remaining, snapshot };
}
   
_damageEnemy(enemy, energy, pen, hitPart = 'thorax'){
  if (!enemy.alive) return;
  // ★ 兼容旧代码：如果传入布尔值，自动转换
  if (hitPart === true) hitPart = 'head';
  else if (hitPart === false || hitPart === undefined) hitPart = 'thorax';

  const profile = this.engine.profile;
  const isHead = hitPart === 'head';
  const hpBefore = enemy.hp;

  let remaining = energy;
  let couplingSnapshot = null;
  let armorSnapshot = null;

  // 1. 耦合防护（Prazer 敌人）
  if (enemy.spec && enemy.spec.prazer && enemy.protectionHold && enemy.coupling > 0) {
    const coup = CombatSystem.applyCoupling(enemy, remaining, 'ballistic');
    if (coup.cost > 0) enemy.coupling = Math.max(0, enemy.coupling - coup.cost);
    if (coup.absorbed > 0) {
      couplingSnapshot = { level: enemy.protection || '?', absorbed: coup.absorbed, cost: coup.cost };
    }
    remaining = coup.remaining;
  }

  // 2. 护甲吸收
  const armorRes = this._applyArmorLayers(enemy, remaining, pen, hitPart);
  remaining = armorRes.remaining;
  armorSnapshot = armorRes.snapshot;

  // 3. 爆头倍率
  if (isHead) {
    remaining *= COMBAT.HEAD_MULT;
    if (profile.get('combat.headshotInstantKill', false)) {
      const lethalEnergy = enemy.hp * COMBAT.BODY_COEFF_HUMAN;
      if (remaining >= lethalEnergy) remaining = lethalEnergy;
    }
  }

  // 4. 折算 HP
  const isPrazer = !!(enemy.spec && enemy.spec.prazer);
  const dmg = CombatSystem.energyToHP(remaining, isPrazer);
  enemy.hp -= dmg;
  enemy.hitFlash = 0.15;
  this.player.dealt += dmg;
  this.stats.hits++;

  this._hitMarker(isHead);

  // 5. 战斗日志（含护甲快照 + 耦合快照）
  this.combatLog.push({
    type: 'damage_dealt',
    t: this.time,
    target: {
      name: this.engine.i18n.t(enemy.spec.name),
      isBoss: false,
      isElite: false,
    },
    amount: dmg,
    part: hitPart,
    weapon: this.currentWeapon ? { name: this.engine.i18n.t(this.currentWeapon.def.name) } : null,
    headshot: isHead,
    pierced: pen >= 3,
    armor: armorSnapshot,
    coupling: couplingSnapshot,
    targetHpBefore: hpBefore,
    targetHpAfter: Math.max(0, enemy.hp),
    targetMaxHp: enemy.maxHp,
  });

  if (enemy.hp <= 0 && enemy.alive) {
    const dist = Math.round(Math.hypot(
      this.player.body.position.x - enemy.body.position.x,
      this.player.body.position.z - enemy.body.position.z
    ));
    this._killEnemy(enemy, dmg, dist);
  }
}

_damagePlayer(player, energy, pen, part = 'thorax', srcX, srcZ, sourceEnt = null){
  if (!player.alive) return;

  // ★ 兼容旧代码：如果传入布尔值，自动转换
  if (part === true) part = 'head';
  else if (part === false || part === undefined) part = 'thorax';

  const profile = this.engine.profile;
  const hpBefore = player.hp;
  const isHead = part === 'head';
  const isTorso = part === 'thorax' || part === 'abdomen';

  /* ===== 1. 耦合防护（Prazer 专属） ===== */
  const coup = CombatSystem.applyCoupling(player, energy, 'ballistic');
  if (coup.cost > 0) player.coupling = Math.max(0, player.coupling - coup.cost);
  const couplingSnapshot = (coup.absorbed > 0) ? {
    level: player.protection || '?',
    absorbed: coup.absorbed,
    cost: coup.cost,
  } : null;
  let remaining = coup.remaining;

  /* ===== 2. 记录受击方向 ===== */
  if (srcX !== undefined && srcZ !== undefined) {
    const ang = Math.atan2(srcZ - player.body.position.z, srcX - player.body.position.x);
    this.lastHitDir = ang - this.engine.cameraCtl.yaw;
    this.lastHitTime = this.time;
  }

  /* ===== 3. 护甲层吸收（按命中部位分层） ===== */
  let armorSnapshot = null;

  const applyOne = (piece, layerName) => {
    if (!piece || piece.lv <= 0 || piece.dur <= 0) return null;
    const beforeDur = piece.dur;
    const res = CombatSystem.applyArmor(piece, remaining, pen);
    remaining = res.remaining;
    if (res.absorbed > 0) {
      return {
        layer: layerName,
        lv: piece.lv,
        absorbed: res.absorbed,
        wear: beforeDur - piece.dur,
        broke: piece.dur <= 0,
      };
    }
    return null;
  };

  if (isHead) {
    /* ---- 头部：shell（头盔壳）→ visor（面罩） ---- */
    const s1 = applyOne(player.armor.shell, '头盔壳');
    const s2 = applyOne(player.armor.visor, '面罩');
    if (s1) armorSnapshot = s1;
    else if (s2) armorSnapshot = s2;
  } else if (isTorso) {
    /* ---- 躯干：plate（插板）→ fiber（纤维） ---- */
    const s1 = applyOne(player.armor.plate, '插板');
    const s2 = applyOne(player.armor.fiber, '纤维');
    if (s1) armorSnapshot = s1;
    else if (s2) armorSnapshot = s2;
  } else {
    /* ---- 四肢：仅 fiber 覆盖 ---- */
    const s1 = applyOne(player.armor.fiber, '纤维');
    if (s1) armorSnapshot = s1;
  }

  /* ===== 4. 爆头处理（HEAD_MULT + 即死/半死判定） ===== */
  if (isHead) {
    remaining *= COMBAT.HEAD_MULT;

    const bodyCoeff = player.charSpec.prazer ? COMBAT.BODY_COEFF_PRAZER : COMBAT.BODY_COEFF_HUMAN;
    const lethalEnergy = player.hp * bodyCoeff;

    if (profile.get('combat.headshotInstantKill', false)) {
      if (remaining >= lethalEnergy) {
        remaining = lethalEnergy;
      }
    } else {
      if (remaining >= lethalEnergy) {
        remaining = lethalEnergy * 0.99;
      }
    }
  }

  /* ===== 5. 折算 HP 伤害 ===== */
  const dmg = CombatSystem.energyToHP(remaining, player.charSpec.prazer);
  player.hp -= dmg;
  player.taken += dmg;

  /* ===== 6. 四肢伤害（profile 开关） ===== */
  if (profile.get('combat.limbDamage', false)) {
    player.limbDamage = (player.limbDamage || 0) + 1;
    if (player.limbDamage >= 4) {
      player.speedMul = Math.max(0.4, 1 - (player.limbDamage - 3) * 0.15);
    }
  }

  /* ===== 7. 战斗日志 ===== */
  const sourceWeapon = sourceEnt && sourceEnt.weapon && sourceEnt.weapon.def
  ? { name: this.engine.i18n.t(sourceEnt.weapon.def.name) }
  : null;
this.combatLog.push({
  type: 'damage_taken',
  t: this.time,
  source: sourceEnt
    ? { name: this.engine.i18n.t(sourceEnt.spec ? sourceEnt.spec.name : '敌人'), weapon: sourceWeapon }
    : { name: '未知' },
  amount: dmg,
  part: part,
  pierced: pen >= 3,
  armor: armorSnapshot,
  coupling: couplingSnapshot,
  hpBefore: hpBefore,
  hpAfter: Math.max(0, player.hp),
  maxHp: player.maxHp,
  bleeding: false,
});

  this._spawnDamageNumber(player.body.position.x, player.body.position.z, Math.round(dmg), 'player');
  this._hurtFX();
  this.engine.cameraCtl.shake(0.4, 0.15);
  this._playSFX('hurt', { volume: 0.5 });

  if (this._searching) {
  this._closeSearch();
  this._log('搜索被打断', 'r');
}

if (this.actionProcess.isRunning()) {
  this.actionProcess.cancel('受伤');
}

if (player.hp <= 0 && player.alive) this._playerDown();
}

  _killEnemy(enemy, dmg, dist){
  enemy.alive = false;
  enemy.body.alive = false;
  this.physics.remove(enemy.body);
  // ★ 倒地动画交给 _syncMeshes 每帧驱动，避免 setTimeout 与帧循环冲突
  enemy.deathTimer = 0.6;
  enemy.deathTotal = 0.6;
  enemy.deathStartY = enemy.mesh ? enemy.mesh.position.y : 0;
  this.player.kills++;
  this.stats.kills++;
  this.combatLog.push({
  type: 'kill',
  t: this.time,
  target: {
    name: this.engine.i18n.t(enemy.spec.name),
    isBoss: false,
    isElite: false,
  },
  distance: dist,
  damageContributed: dmg,
});
    this._spawnSpark(enemy.body.position.x, enemy.body.position.z);
  this.tasks.progress('kill', 1, { faction: enemy.spec.faction });
  this._processModeHook('onEnemyKilled', enemy);

    this._addKillFeed(enemy.spec.name, Math.round(dmg), dist);

  // ★ 尸体 loot：武器 + 弹药 + 护甲
const corpseLoot = [];
if (enemy.weapon && enemy.weapon.def) {
  const wDef = enemy.weapon.def;
  const loadedQty = enemy.weapon.loaded ? enemy.weapon.loaded.qty : 0;
  const reserve = enemy.weapon.reserve || 0;
  corpseLoot.push({
    table: 'weapons',
    defId: wDef.id,
    loadedQty,
  });
  if (reserve > 0) {
    corpseLoot.push({
      table: 'ammo',
      defId: wDef.ammoType,
      qty: reserve,
    });
  }
}
// ★ 护甲掉落（有 dur 才掉）
if (enemy.armor) {
  const armorTableMap = {
    shell: 'helmetShell',
    visor: 'helmetVisor',
    fiber: 'vestFiber',
    plate: 'vestPlate',
  };
  for (const slot in armorTableMap) {
    const a = enemy.armor[slot];
    if (a && a.lv > 0 && a.defId && a.dur > 0) {
      corpseLoot.push({
        table: armorTableMap[slot],
        defId: a.defId,
        dur: Math.round(a.dur),
      });
    }
  }
}
  if (corpseLoot.length > 0) {
    const lx = enemy.body.position.x + (Math.random() * 1.2 - 0.6);
    const lz = enemy.body.position.z + (Math.random() * 1.2 - 0.6);
    this._spawnGroundLoot(lx, lz, corpseLoot, this.engine.i18n.t(enemy.spec.name) + ' 的尸体');
  }
}

_addKillFeed(name, dmg, dist) {
  const feed = document.getElementById('kill-feed');
  if (!feed) return;
  const el = document.createElement('div');
  el.style.cssText = 'background:rgba(0,0,0,0.6); padding:4px 10px; border-left:3px solid #ff5a5a; border-radius:4px; animation: slideIn 0.2s ease-out;';
  el.innerHTML = `击败 <b style="color:#ff8b7b">${this.engine.i18n.t(name)}</b> <span style="color:#aaa;font-size:11px;">(${dist}m · ${dmg}伤害)</span>`;
  feed.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s';
    setTimeout(() => el.remove(), 500);
  }, 3000);
  while (feed.children.length > 5) feed.removeChild(feed.firstChild);
}

 _playerDown(){
const p = this.player;
if (this.actionProcess.isRunning()) {
  this.actionProcess.cancel('死亡', true);
}
if (this._searching) {
  this._closeSearch();
}
this.combatLog.push({
  type: 'downed',
  t: this.time,
  hp: p.hp,
  maxHp: p.maxHp,
});
p.alive = false;
p.deadAt = this.time;
p.deathStartedAt = this.time;
p._deathShaken = false;
p.deathRollOffset = (Math.random() * 2 - 1) * 0.10; // 极轻随机侧偏，主姿态是后仰
this._processModeHook('onPlayerDowned');

// ★ 死亡视觉：pitch 归零，从水平开始后仰
const ctl = this.engine.cameraCtl;
ctl.pitch = 0;
ctl.shake(0.9, 0.18);
ctl.setHurtOffset(0, 0);
ctl.setBob(0, 0);

// ★ 确保眼皮图层存在
this._ensureEyelids();

setTimeout(() => {
  this._end(false);
}, 2000);
}

// ★ 眼皮图层：上下两片黑色幕布，自注入 DOM
_ensureEyelids() {
  if (document.getElementById('eyelid-top')) return;

  if (!document.getElementById('eyelid-css')) {
  const css = document.createElement('style');
  css.id = 'eyelid-css';
  css.textContent = `
    #eyelid-top, #eyelid-bottom {
      position: fixed; left: 0; right: 0;
      background: #000;
      pointer-events: none;
      z-index: 350;
      will-change: transform;
    }
    #eyelid-top {
      top: 0;
      height: 60%;
      border-radius: 0 0 20% 20% / 0 0 10% 10%;
      transform: translateY(-100%);
    }
    #eyelid-bottom {
      bottom: 0;
      height: 60%;
      border-radius: 20% 20% 0 0 / 10% 10% 0 0;
      transform: translateY(100%);
    }
  `;
  document.head.appendChild(css);
}

  const top = document.createElement('div');
  top.id = 'eyelid-top';
  document.body.appendChild(top);
  const bottom = document.createElement('div');
  bottom.id = 'eyelid-bottom';
  document.body.appendChild(bottom);
}

// t = 0 完全睁开，t = 1 完全闭合
// smoothstep 曲线 + 弧形眼皮，视觉更柔和
_updateEyelids(t) {
  const top = document.getElementById('eyelid-top');
  const bottom = document.getElementById('eyelid-bottom');
  if (!top || !bottom) return;
  const p = Math.max(0, Math.min(1, t));
  const ease = p * p * (3 - 2 * p); // smoothstep：首尾柔和，中段加速
  top.style.transform = `translateY(${-100 + 100 * ease}%)`;
  bottom.style.transform = `translateY(${100 - 100 * ease}%)`;
}

// 结算前收起眼皮（带 0.15 秒淡出）
_clearEyelids() {
  const top = document.getElementById('eyelid-top');
  const bottom = document.getElementById('eyelid-bottom');
  if (!top || !bottom) return;
  top.style.transition = 'transform 0.15s ease-out';
  bottom.style.transition = 'transform 0.15s ease-out';
  top.style.transform = 'translateY(-100%)';
  bottom.style.transform = 'translateY(100%)';
  setTimeout(() => {
    if (top) top.style.transition = 'none';
    if (bottom) bottom.style.transition = 'none';
  }, 200);
}

// ★ 死亡相机每帧驱动：快速后仰倒地 + 撞击震屏 + 闭眼
_updateDeathCamera(dt) {
  const p = this.player;
  if (!p || p.alive) return;
  if (p.deathStartedAt === undefined) return;

  const elapsed = this.time - p.deathStartedAt;
  // 倒地阶段 0.45 秒完成（快，不做华尔兹）
  const t = Math.min(1, elapsed / 0.45);
  const et = 1 - Math.pow(1 - t, 2); // ease-out 二次：起步快、收尾稳

  const ctl = this.engine.cameraCtl;
  const footY = p.body.position.y - p.body.halfH;

  // 相机高度：站立 1.55 → 躺地 0.22
  const camY = footY + 1.55 * (1 - et) + 0.22 * et;
  ctl.follow(p.body.position.x, Math.max(footY + 0.22, camY), p.body.position.z);

  // 后仰姿态：pitch 0 → +1.25 rad（约 72°，仰面朝天）
  // 极轻侧偏保留人体不完美的观感
  const roll = (p.deathRollOffset || 0) * et;
  ctl.setDeathPose(roll, 0, 1.25 * et);

  // 死亡期间禁用 bob/hurt 累积
  ctl.setBob(0, 0);
  ctl.setHurtOffset(0, 0);

  // 撞击地面瞬间（倒地进度 30%~50% 区间）震屏一次
  if (t > 0.30 && !p._deathShaken) {
    p._deathShaken = true;
    ctl.shake(0.9, 0.18);
  }

  // FOV 收窄（晕眩、失血）
  const cam = this.engine.renderer.camera;
  const targetFov = 60 - et * 8;
  const fovDiff = targetFov - cam.fov;
  if (Math.abs(fovDiff) > 0.05) {
    cam.fov += fovDiff * Math.min(1, dt * 14);
    cam.updateProjectionMatrix();
  }

  // 边缘红雾加深
  const vignEl = document.getElementById('fx-vignette');
  if (vignEl) vignEl.style.opacity = String(Math.min(1, 0.30 + et * 0.65));
  const filterEl = document.getElementById('fx-filter');
  if (filterEl) {
    filterEl.style.background = `radial-gradient(ellipse at center, rgba(0,0,0,${et * 0.55}) 25%, rgba(60,0,0,${et * 0.85}) 100%)`;
  }

  // 闭眼：倒地后 0.40s 开始，再 0.50s 完全合上（合计约 0.9s 全黑）
  const eyeT = Math.max(0, Math.min(1, (elapsed - 0.40) / 0.50));
  this._updateEyelids(eyeT);
}

  _updateEnemies(dt){
    for (const e of this.enemies) {
      if (!e.alive) continue;
      AISystem.update(this, e, dt);
    }
  }

  _updateExtracts(dt){
    const p = this.player;
    if (!p || !p.alive) return;
    for (const ex of this.extracts) {
      const d = Math.hypot(p.body.position.x - ex.x, p.body.position.z - ex.z);
      if (d < COMBAT.EXTRACT_RADIUS) {
        ex.timer += dt;
        if (!ex.active) {
          ex.active = true;
          this._processModeHook('onExtractStart', ex);
          this._log(this.engine.i18n.t('log.extract_started'), 'p');
           this.combatLog.push({
  type: 'extract', t: this.time,
  pointName: (ex.x.toFixed(0) + ',' + ex.z.toFixed(0)),
});
        }
        if (ex.timer >= COMBAT.EXTRACT_TIME) {
          this._log(this.engine.i18n.t('log.extract_complete'), 'g');
          this.tasks.progress('extract', 1);
          this._end(true);
          return;
        }
      } else {
        ex.timer = 0;
        ex.active = false;
      }
    }
  }

  _updateContainers(dt){
  if (!this._searching) {
    const p = this.player;
    if (!p || !p.alive) { this._searchTarget = null; return; }
    let best = null, bestDist = COMBAT.SEARCH_RADIUS;
    const consider = (c) => {
      if (c.searched && c.revealed && c.revealed.length === 0 && (!c.loot || c.loot.length === 0)) return;
      const d = Math.hypot(p.body.position.x - c.x, p.body.position.z - c.z);
      if (d < bestDist) { best = c; bestDist = d; }
    };
    for (const c of this.containers) consider(c);
    for (const c of this.groundLoots) consider(c);
    this._searchTarget = best;
  } else {
    const c = this._searchTarget;
    if (!c) { this._closeSearch(); return; }
    this._searchTimer += dt;
    if (this._searchTimer >= this._revealInterval && c.loot && c.loot.length > 0) {
      this._searchTimer = 0;
      this._revealOne();
    }
  }
}
  _esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

_generateLootSpecs(){
  const specs = [];
  if (Math.random() < 0.55) {
    const types = ['9mm', '5.56', '7.62', '.45acp', '12ga'];
    const at = types[Math.floor(Math.random() * types.length)];
    specs.push({ table: 'ammo', defId: at, qty: 15 + Math.floor(Math.random() * 45) });
  }
  const r = Math.random();
  if (r < 0.28) {
    const armorTable = ['helmetShell', 'helmetVisor', 'vestFiber', 'vestPlate'][Math.floor(Math.random() * 4)];
    const defIds = {
      helmetShell: ['lv3', 'lv4'],
      helmetVisor: ['lv3', 'lv4'],
      vestFiber:   ['lv3', 'lv4'],
      vestPlate:   ['lv4', 'lv5'],
    }[armorTable];
    specs.push({ table: armorTable, defId: defIds[Math.floor(Math.random() * defIds.length)] });
  } else if (r < 0.42) {
  const weapons = ['p9', 'smg45', 'ak762'];
  const wId = weapons[Math.floor(Math.random() * weapons.length)];
  const wDef = this.engine.content.get('weapons', wId);
  const magCap = (wDef && wDef.mag) || 0;
  specs.push({ table: 'weapons', defId: wId, extras: { loadedQty: magCap } });
}
  return specs;
}

_startSearch(c){
  if (!c) return;
  this._searching = true;
  this._searchTimer = 0;
  this._searchTarget = c;
  this._revealInterval = 0.5;

  if (!c.loot) {
    c.loot = this._generateLootSpecs();
    c.revealed = [];
    c.searched = false;
  }
  if (!c.revealed) c.revealed = [];

  this._ensureSearchPanel();

  const panel = document.getElementById('search-panel');
  if (panel) {
    panel.classList.add('on');
  } else {
    console.error('[Search] panel 创建失败');
    this._searching = false;
    return;
  }
  this._renderSearchPanel();
  this._log('开始搜索…', 'p');
  this._playSFX('reload');
}

_ensureSearchPanel(){
  if (document.getElementById('search-panel')) return;
  if (!document.getElementById('search-panel-css')) {
    const style = document.createElement('style');
    style.id = 'search-panel-css';
    style.textContent = `
      #search-panel{position:absolute;inset:0;z-index:45;display:none;align-items:center;justify-content:center;background:rgba(4,8,14,.5);pointer-events:auto}
      #search-panel.on{display:flex}
      #search-panel .search-box{width:90%;max-width:380px;max-height:72vh;background:rgba(14,22,34,.97);border:1px solid rgba(105,170,235,.45);border-radius:10px;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.7)}
      #search-panel .search-header{padding:10px 14px;border-bottom:1px solid rgba(105,170,235,.25);display:flex;justify-content:space-between;align-items:center;color:#a8d8ff;font-size:13px;letter-spacing:2px;font-weight:700}
      #search-panel .search-header button{width:26px;height:26px;border-radius:5px;background:rgba(60,100,150,.5);border:1px solid rgba(110,180,255,.4);color:#cfe8ff;cursor:pointer;font-size:13px;font-family:inherit}
      #search-panel .search-body{flex:1;overflow-y:auto;padding:8px;min-height:100px;max-height:48vh}
      #search-panel .search-empty{text-align:center;color:#5c82a8;padding:20px;font-size:12px}
      #search-panel .search-item{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;margin-bottom:4px;background:rgba(20,32,46,.7);border-radius:5px;font-size:12px;color:#cfe4f8}
      #search-panel .search-item-take{padding:4px 12px;border-radius:4px;background:rgba(60,120,185,.5);border:1px solid rgba(120,190,255,.5);color:#e0f0ff;font-size:11px;cursor:pointer;font-family:inherit}
      #search-panel .search-footer{padding:8px 14px;border-top:1px solid rgba(105,170,235,.25);display:flex;justify-content:flex-end}
      #search-panel .search-footer button{padding:6px 18px;border-radius:5px;background:rgba(40,80,130,.7);border:1px solid rgba(110,180,255,.5);color:#cfe8ff;font-size:12px;cursor:pointer;font-family:inherit}
      #search-panel .search-footer button:disabled{opacity:.4;cursor:default}
    `;
    document.head.appendChild(style);
  }
  const panel = document.createElement('div');
  panel.id = 'search-panel';
  panel.innerHTML =
    '<div class="search-box">' +
      '<div class="search-header"><span>物资容器</span><button id="search-close">✕</button></div>' +
      '<div class="search-body" id="search-body"><div class="search-empty">搜索中…</div></div>' +
      '<div class="search-footer"><button id="search-take-all" disabled>全部拾取</button></div>' +
    '</div>';
  const gameScreen = document.getElementById('game-screen');
  if (gameScreen) gameScreen.appendChild(panel);
  else document.body.appendChild(panel);
}

_revealOne(){
  const c = this._searchTarget;
  if (!c || !c.loot || c.loot.length === 0) return;
  const spec = c.loot.shift();
  c.revealed.push(spec);
  if (c.loot.length === 0) c.searched = true;
  this._renderSearchPanel();
  this._playSFX('hit', { volume: 0.25 });
}

_renderSearchPanel(){
  const c = this._searchTarget;
  const body = document.getElementById('search-body');
  const takeAllBtn = document.getElementById('search-take-all');
  if (!body || !c) return;
  const i18n = this.engine.i18n;

  const headerEl = document.querySelector('#search-panel .search-header span');
  if (headerEl) {
    headerEl.textContent = c.isGround ? (c.label || '地面物品') : '物资容器';
  }

  let html = '';
  if (c.revealed.length === 0 && c.loot && c.loot.length > 0) {
    html = '<div class="search-empty">搜索中…</div>';
  } else if (c.revealed.length === 0) {
    html = '<div class="search-empty">容器已空</div>';
  } else {
    for (let i = 0; i < c.revealed.length; i++) {
      const spec = c.revealed[i];
      const def = this.engine.content.get(spec.table, spec.defId);
      const name = def ? i18n.t(def.name || def.n || spec.defId) : spec.defId;
      const qty = spec.qty > 1 ? ' ×' + spec.qty : '';
      html += `<div class="search-item">
        <span class="search-item-name">${this._esc(name)}${qty}</span>
        <button class="search-item-take" data-index="${i}">拾取</button>
      </div>`;
    }
  }
  body.innerHTML = html;

  body.querySelectorAll('.search-item-take').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._takeLoot(parseInt(btn.dataset.index, 10));
    });
  });

  if (takeAllBtn) {
    takeAllBtn.disabled = c.revealed.length === 0;
    takeAllBtn.onclick = () => this._takeAllLoot();
  }
  const closeBtn = document.getElementById('search-close');
  if (closeBtn) closeBtn.onclick = () => this._closeSearch();
}

_takeLoot(index){
  const c = this._searchTarget;
  if (!c || !c.revealed[index]) return;
  const inv = this.engine.app ? this.engine.app.inventory : null;
  if (!inv) return;
  const spec = c.revealed[index];
const extras = { qty: spec.qty || 1 };
if (spec.extras) Object.assign(extras, spec.extras);
if (spec.dur !== undefined) extras.dur = spec.dur;
if (spec.loaded && spec.loaded.qty !== undefined) extras.loadedQty = spec.loaded.qty;
const uid = inv.createItem(spec.table, spec.defId, extras);
  if (!uid) return;
  const r = inv.addToContainer('bag', uid);
  if (!r.ok) {
    inv.destroyItem(uid);
    this._log('背包已满', 'y');
    return;
  }
  c.revealed.splice(index, 1);
  this._renderSearchPanel();
}

_takeAllLoot(){
  const c = this._searchTarget;
  if (!c) return;
  const inv = this.engine.app ? this.engine.app.inventory : null;
  if (!inv) return;
  for (let i = c.revealed.length - 1; i >= 0; i--) {
  const spec = c.revealed[i];
const extras = { qty: spec.qty || 1 };
if (spec.extras) Object.assign(extras, spec.extras);
if (spec.dur !== undefined) extras.dur = spec.dur;
if (spec.loaded && spec.loaded.qty !== undefined) extras.loadedQty = spec.loaded.qty;
const uid = inv.createItem(spec.table, spec.defId, extras);
     if (!uid) continue;
    const r = inv.addToContainer('bag', uid);
    if (!r.ok) { inv.destroyItem(uid); this._log('背包已满', 'y'); break; }
    c.revealed.splice(i, 1);
  }
  this._renderSearchPanel();
}

_closeSearch(){
  this._searching = false;
  this._searchTimer = 0;
  const panel = document.getElementById('search-panel');
  if (panel) panel.classList.remove('on');
  this._searchTarget = null;
}

_updateSearchHint(){
  const el = document.getElementById('search-hint');
  if (!el) {
    if (!this._hintWarnTime || this.time - this._hintWarnTime > 5) {
      this._hintWarnTime = this.time;
      console.warn('[Search] #search-hint 元素不存在，请检查 index.html');
    }
    return;
  }
  if (this._searching) { el.classList.remove('on'); return; }
  const c = this._searchTarget;
  if (c && !(c.searched && c.revealed && c.revealed.length === 0)) {
    el.classList.add('on');
  } else {
    el.classList.remove('on');
  }
}

_updateMobileButtons(){
  const app = this.engine.app;
  if (!app || !app._mobileButtons) return;
  const buttons = app._mobileButtons;

  const searchBtn = buttons.search;
  if (searchBtn) {
    if (this._searching) {
      searchBtn.style.display = 'none';
    } else {
      searchBtn.style.display = 'flex';
      const c = this._searchTarget;
      const hasTarget = c && !(c.searched && c.revealed && c.revealed.length === 0);
      searchBtn.style.opacity = hasTarget ? '1' : '0.75';
    }
  }

  const reloadBtn = buttons.reload;
  if (reloadBtn) {
    const reloading = this.actionProcess.isRunning('reload');
    if (reloading) {
      reloadBtn.style.background = 'rgba(255,210,80,.65)';
      reloadBtn.style.borderColor = 'rgba(255,220,100,.95)';
    } else {
      reloadBtn.style.background = 'rgba(200,200,200,.3)';
      reloadBtn.style.borderColor = 'rgba(255,255,255,.6)';
    }
  }

  const switchBtn = buttons.switchWeapon;
  if (switchBtn) {
    const p = this.player;
    if (p && !p.sidearm) {
      switchBtn.style.opacity = '0.4';
    } else {
      switchBtn.style.opacity = '1';
    }
  }
}
   
    _trySearchContainer(){
  if (this._searching) return;
  if (this.actionProcess.isRunning()) {
    this._log('动作进行中，无法搜索', 'y');
    return;
  }
  const c = this._searchTarget;
  if (!c) {
    this._log('附近没有可搜索的容器', 'y');
    return;
  }
  if (c.searched && c.revealed && c.revealed.length === 0 && (!c.loot || c.loot.length === 0)) {
    this._log('容器已空', 'y');
    return;
  }

  const inv = this.engine.app.inventory;
  if (!c.grid) {
    c.grid = new GridContainer(8, 6);
    inv.containers.loot = c.grid;
    const items = c.revealed || c.loot || [];
    for (const spec of items) {
      const extras = { searched: false, qty: spec.qty || 1 };
      if (spec.extras) Object.assign(extras, spec.extras);
      if (spec.dur !== undefined) extras.dur = spec.dur;
      if (spec.loaded && spec.loaded.qty !== undefined) extras.loadedQty = spec.loaded.qty;
      const uid = inv.createItem(spec.table, spec.defId, extras);
      if (uid) inv.addToContainer('loot', uid);
    }
    c.loot = [];
    c.revealed = [];
    c.searched = true;
  }

  inv.containers.loot = c.grid;
  for (const uid of c.grid.items.keys()) {
    inv.parentOf.set(uid, 'c:loot');
  }

  this.engine.app.bagUI.openLoot(c);
}

  _generateLoot(){
  const inv = this.engine.app ? this.engine.app.inventory : null;
  if (!inv) return [];
  const results = [];

  // 1. 弹药（55%）
  if (Math.random() < 0.55) {
    const types = ['9mm', '5.56', '7.62', '.45acp', '12ga'];
    const at = types[Math.floor(Math.random() * types.length)];
    const qty = 15 + Math.floor(Math.random() * 45);
    const uid = inv.createItem('ammo', at, { qty });
    if (uid) {
      if (inv.addToContainer('bag', uid).ok) results.push({ uid, name: at, qty });
      else inv.destroyItem(uid);
    }
  }

  // 2. 护甲 / 武器（一次判定，二选一）
  const second = Math.random();
  if (second < 0.28) {
    const armorTable = ['helmetShell', 'helmetVisor', 'vestFiber', 'vestPlate'][Math.floor(Math.random() * 4)];
    const defIds = {
      helmetShell: ['lv3', 'lv4'],
      helmetVisor: ['lv3', 'lv4'],
      vestFiber:   ['lv3', 'lv4'],
      vestPlate:   ['lv4', 'lv5'],
    }[armorTable];
    const defId = defIds[Math.floor(Math.random() * defIds.length)];
    const uid = inv.createItem(armorTable, defId);
    if (uid) {
      if (inv.addToContainer('bag', uid).ok) results.push({ uid, name: defId });
      else inv.destroyItem(uid);
    }
  } else if (second < 0.42) {
    const weapons = ['p9', 'smg45', 'ak762'];
    const wid = weapons[Math.floor(Math.random() * weapons.length)];
    const uid = inv.createItem('weapons', wid);
    if (uid) {
      if (inv.addToContainer('bag', uid).ok) results.push({ uid, name: wid });
      else inv.destroyItem(uid);
    }
  }

  return results;
  }

  _useSkill(slot){
    const p = this.player;
    if (!p || !p.alive) return;

    // ★ [Profile] 技能启用开关
    if (!this.engine.profile.get('skills.enabled', true)) {
      this._log('当前玩法禁用技能', 'y');
      return;
    }

    const sk = p.skills[slot];
    if (!sk || !sk.ready) return;
    if (sk.def.cost > 0 && p.coupling < sk.def.cost) {
      this._log('耦合能不足', 'y');
      return;
    }
    if (sk.def.cost > 0) p.coupling -= sk.def.cost;

    // ★ [Profile] CD 缩减
    const cdMul = this.engine.profile.get('skills.cooldownReduction', 1.0);
    sk.cd = sk.def.cd * cdMul;
    sk.ready = false;

      this._applySkillEffect(p, sk.def);
  this._log('【' + this.engine.i18n.t(sk.def.name) + '】已触发', 'p');
  this.combatLog.push({
    type: 'skill_use', t: this.time,
    name: this.engine.i18n.t(sk.def.name),
    detail: '',
  });
  this._playSFX('skill');
}

_applySkillEffect(p, def){
    switch (def.kind) {
      case 'dash': {
        const angle = p.angle;
        const dist = def.distance || 5;
        p.body.position.x += Math.cos(angle) * dist;
        p.body.position.z += Math.sin(angle) * dist;
        break;
      }
      case 'timedBuff': {
        p.buffs = p.buffs || {};
        p.buffs[def.effect] = this.time + def.duration;
        break;
      }
      case 'healPercent': {
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * def.percent);
        break;
      }
      case 'drone': {
        this._log('无人机已部署（占位）', 'y');
        break;
      }
      case 'taunt': {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const d = Math.hypot(p.body.position.x - e.body.position.x, p.body.position.z - e.body.position.z);
          if (d < 15) e.state = 'combat';
        }
        break;
      }
    }
  }

  _spawnTracer(x1, y1, z1, x2, y2, z2, color){
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([x1, y1, z1, x2, y2, z2]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const line = new THREE.Line(geo, mat);
    this.engine.renderer.scene.add(line);
    this.tracers.push({ line, ttl: 0.08 });
  }

  _updateTracers(dt){
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.ttl -= dt;
      if (t.ttl <= 0) {
        this.engine.renderer.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

 _spawnSpark(x, y, z){
    const mesh = this.engine.meshes.build('spark', { color: 0xffaa44 });
    mesh.position.set(x, y, z);
    this.engine.renderer.scene.add(mesh);
    setTimeout(() => {
      this.engine.renderer.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }, 120);
  }

  _spawnDamageNumber(x, z, val, kind){
    // ★ [Profile] 伤害数字显隐
    if (!this.engine.profile.get('visual.damageNumbers', true)) return;

    const cam = this.engine.renderer.camera;
    const v = new THREE.Vector3(x, 2.5, z).project(cam);
    const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
    const el = document.createElement('div');
    el.textContent = String(val);
    const color = kind === 'player' ? '#ff6a6a' : '#ffe08a';
    el.style.cssText = `
      position:fixed;left:${sx}px;top:${sy}px;
      color:${color};font-weight:800;font-size:14px;
      text-shadow:0 2px 4px #000;pointer-events:none;z-index:40;
      transform:translate(-50%,-50%);
      transition:all .7s ease-out;opacity:1;
      font-family:ui-monospace,Menlo,Consolas,monospace;
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = 'translate(-50%,-80px)';
      el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 750);
  }

  _hitMarker(isHead = false){
  const el = document.getElementById('hit-marker');
  if (!el) return;
  el.style.opacity = '1';
  // 如果爆头，稍微放大并变色
  el.style.transform = isHead ? 'scale(1.3)' : 'scale(1)';
  if (isHead) el.querySelectorAll('line').forEach(l => l.setAttribute('stroke', '#ff3030'));
  else el.querySelectorAll('line').forEach(l => l.setAttribute('stroke', '#ffdd44'));

  clearTimeout(this._hitTimer);
  this._hitTimer = setTimeout(() => {
    el.style.opacity = '0';
  }, 150);
}

  _hurtFX(){
  const el = document.getElementById('fx-hit-flash');
  if (!el) return;
  el.style.opacity = '0.2';
  setTimeout(() => {
    el.style.opacity = '0';
  }, 80);
}

  _playSFX(name, opts){
    const audio = this.engine.audio;
    if (!audio || !audio.enabled || !audio.ctx) return;
    if (audio._clips.has(name)) {
      audio.play(name, opts);
    } else {
      this._synthSFX(name, opts);
    }
  }

  _synthSFX(name, opts){
    const ac = this.engine.audio.ctx;
    if (!ac) return;
    const now = ac.currentTime;
    const optsSafe = opts || {};
    try {
      if (name.startsWith('shot_')) {
        const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.08), ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 5);
        const src = ac.createBufferSource();
        src.buffer = buffer;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(optsSafe.volume || 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        src.connect(filter).connect(gain).connect(ac.destination);
        src.start(now); src.stop(now + 0.08);
      } else if (name === 'hit') {
        const osc = ac.createOscillator();
        osc.type = 'square'; osc.frequency.value = 800;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(optsSafe.volume || 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain).connect(ac.destination);
        osc.start(now); osc.stop(now + 0.05);
      } else if (name === 'reload') {
        for (let i = 0; i < 2; i++) {
          const osc = ac.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = i === 0 ? 300 : 500;
          const gain = ac.createGain();
          gain.gain.setValueAtTime(0.15, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.06);
          osc.connect(gain).connect(ac.destination);
          osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.07);
        }
      } else if (name === 'switch') {
        const osc = ac.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain).connect(ac.destination);
        osc.start(now); osc.stop(now + 0.1);
      } else if (name === 'hurt') {
        const osc = ac.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain).connect(ac.destination);
        osc.start(now); osc.stop(now + 0.2);
      } else if (name === 'skill') {
        [400, 600, 900].forEach((f, i) => {
          const osc = ac.createOscillator();
          osc.type = 'sine'; osc.frequency.value = f;
          const gain = ac.createGain();
          gain.gain.setValueAtTime(0.15, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
          osc.connect(gain).connect(ac.destination);
          osc.start(now + i * 0.05); osc.stop(now + i * 0.05 + 0.15);
        });
      }
    } catch (e) { /* 忽略音效错误 */ }
  }

  _log(text, cls){
    const el = document.getElementById('event-banner');
    if (!el) return;
    el.textContent = text;
    el.style.background = cls === 'p'
      ? 'linear-gradient(90deg,rgba(120,60,200,.9),rgba(60,90,200,.9))'
      : cls === 'y'
        ? 'linear-gradient(90deg,rgba(140,110,40,.9),rgba(80,60,20,.9))'
        : cls === 'r'
          ? 'linear-gradient(90deg,rgba(180,40,40,.9),rgba(120,20,20,.9))'
          : 'linear-gradient(90deg,rgba(60,120,80,.9),rgba(30,70,50,.9))';
    el.classList.add('on');
    if (this._logTimer) clearTimeout(this._logTimer);
    this._logTimer = setTimeout(() => el.classList.remove('on'), 1800);
  }

  _processModeHook(hookName, ...args){
    const hooks = this.modeConfig && this.modeConfig.hooks;
    if (!hooks) return;
    const fn = hooks[hookName];
    if (typeof fn !== 'function') return;
    try { fn(this, ...args); }
    catch (e) { console.error(`[Mode] ${hookName}:`, e); }
  }

// ★ 流光状态更新：耦合能随时间减少时点亮，粘滞 0.2 秒防单帧闪烁
_updateGlowState(entity, dt) {
  if (!entity || !entity.glowMeshes || entity.glowMeshes.length === 0) return;
  const cur = entity.coupling || 0;
  const last = entity._lastCoupling;
  if (last === undefined) {
    entity._lastCoupling = cur;
    entity._glowTimer = 0;
    return;
  }
  // 判据：本帧耦合能比上一帧低 → 正在消耗
  const consuming = cur < last - 0.0001;
  entity._lastCoupling = cur;

  if (consuming) {
    entity._glowTimer = 0.2;
  } else if (entity._glowTimer > 0) {
    entity._glowTimer -= dt;
    if (entity._glowTimer < 0) entity._glowTimer = 0;
  }

  const targetOpacity = entity._glowTimer > 0 ? 0.55 : 0;
  const lerpSpeed = Math.min(1, dt * 8);
  for (const g of entity.glowMeshes) {
    const mat = g.material;
    mat.opacity += (targetOpacity - mat.opacity) * lerpSpeed;
    g.visible = mat.opacity > 0.01;
  }
}


_syncMeshes(dt){
  const p = this.player;
if (p && p.mesh) {
  p.mesh.position.set(p.body.position.x, p.body.footY, p.body.position.z);
  p.mesh.rotation.y = Math.PI - p.angle;
}
  for (const e of this.enemies) {
    if (!e.mesh) continue;

    if (!e.alive) {
      // ★ 倒地动画：0.6 秒内平滑侧躺 + 下沉，结束后隐藏
      if (e.deathTimer !== undefined && e.deathTimer > 0) {
        e.deathTimer -= dt;
        const total = e.deathTotal || 0.6;
        const t = Math.min(1, 1 - Math.max(0, e.deathTimer) / total);
        const et = 1 - Math.pow(1 - t, 3); // ease-out cubic
        e.mesh.rotation.z = (Math.PI / 2) * et;
        if (e.deathStartY !== undefined) {
          e.mesh.position.y = e.deathStartY - et * 0.2;
        }
        e.mesh.traverse(obj => {
          if (obj.isMesh && obj.material && obj.material.emissive) {
            obj.material.emissive.setHex(0x000000);
            obj.material.emissiveIntensity = 0;
          }
        });
        if (e.deathTimer <= 0) e.mesh.visible = false;
      } else {
        e.mesh.visible = false;
      }
      continue;
    }

   e.mesh.position.set(e.body.position.x, e.body.footY, e.body.position.z);
// e.angle 是 atan2(dz, dx)，加 90 度让模型正面(+z)朝向玩家
e.mesh.rotation.y = Math.PI / 2 - e.angle;

// ★ 敌人流光状态
this._updateGlowState(e, dt);

if (e.hitFlash > 0) {
      e.hitFlash -= dt;
      e.mesh.traverse(obj => {
        if (obj.isMesh && obj.material && obj.material.emissive) {
          obj.material.emissive.setHex(0xffffff);
          obj.material.emissiveIntensity = 0.8;
        }
      });
    } else {
      e.mesh.traverse(obj => {
        if (obj.isMesh && obj.material && obj.material.emissive) {
          obj.material.emissive.setHex(0x000000); 
          obj.material.emissiveIntensity = 0;
        }
      });
    }
  }
}

  pause(){ this.paused = true; }
  resume(){ this.paused = false; }

_end(success){
if (!this.running) return;
this.running = false;
// ★ 清理死亡姿态，避免污染下一局
if (this.engine.cameraCtl && this.engine.cameraCtl.resetDeathPose) {
  this.engine.cameraCtl.resetDeathPose();
}
// ★ 收起眼皮
this._clearEyelids();
try { this._processModeHook('onMatchEnd', success); }
  catch (e) { console.error('[Mode] onMatchEnd:', e); }
  if (this.modeConfig && this.modeConfig.teardown) {
    try { this.modeConfig.teardown(this); }
    catch (e) { console.error('[Mode] teardown:', e); }
  }
  if (this.onEnd) {
  try {
    const lootValue = this._computeLootValue();
    this.player.carriedValue = lootValue;
    this.onEnd(success, {
      kills: this.player.kills,
      accuracy: this.stats.shots > 0 ? Math.round(this.stats.hits / this.stats.shots * 100) : 0,
      dealt: Math.round(this.player.dealt),
      taken: Math.round(this.player.taken),
      time: Math.round(this.time),
      carriedValue: lootValue,
    });
  } catch (e) {
    console.error('[World._end] onEnd 回调异常：', e);
  }
}
}

destroy(){
this.running = false;
// ★ 清理死亡姿态
if (this.engine.cameraCtl && this.engine.cameraCtl.resetDeathPose) {
  this.engine.cameraCtl.resetDeathPose();
}
// ★ 收起眼皮
this._clearEyelids();
if (this._searching) this._closeSearch();
  const _sp = document.getElementById('search-panel');
  if (_sp) _sp.classList.remove('on');
  if (this.player && this.player.weaponGroup) {
      this.engine.renderer.camera.remove(this.player.weaponGroup);
    }
    for (const t of this.tracers) {
      this.engine.renderer.scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
    }
    this.tracers = [];
    this.physics.clear();
    this.enemies = [];
    this.obstacles = [];
    this.containers = [];
    this.extracts = [];
    this.engine.renderer.clearScene();
  }
}

/* ============================================================
   [6] GameApp
   ============================================================ */
export class GameApp {
  constructor(engine){
    this.engine = engine;
    this.world = null;
    this.menuState = {
      mode: 'straight',
      map: 'factory',
      diff: 'normal',
      char: 'captain',
      profile: 'tactical',
    };
    this._lastMatchKind = 'normal';
    this._menuReady = false;
    this.platform = 'auto'; 
    this.inventory = null;
    this.bagUI = null;
  }

  boot(){
  // 初始化存档
  if (!this.engine.save.data) {
    this.engine.save.load({
      version: 1,
      credits: 0,
      stats: { runs: 0, extracts: 0, deaths: 0, kills: 0 },
      flags: {},
    });
  }
  this._setupMenu();
  this._bindGlobalHandlers();
  this._registerDevCommands();

  this.inventory = new Inventory(this.engine.content);
  if (this.engine.save.data && this.engine.save.data.inventory) {
  try { this.inventory.deserialize(this.engine.save.data.inventory); }
  catch (e) { console.warn('[Bag] 库存反序列化失败，重置', e); }
  }
  this.bagUI = new BagUI(this.engine, this.inventory);
}

      _setupMenu(){
    const e = this.engine;
    const i18n = e.i18n;

    this._renderOptions('mode-options', e.modeRegistry.all(), (i) => i.id === this.menuState.mode, (i) => ({ title: i18n.t(i.name), sub: i18n.t(i.desc || ''), tag: '', value: i.id }), (i) => { this.menuState.mode = i.id; this._updateModeHint(); });
    this._renderOptions('map-options', e.content.all('maps'), (i) => i.id === this.menuState.map, (i) => ({ title: i18n.t(i.name), sub: `${i.size}m² · ${i.enemyCount} 敌人`, tag: '', value: i.id }), (i) => { this.menuState.map = i.id; });
    
    const diffs = [ { id: 'easy', name: 'difficulty.easy.name', desc: '敌人弱 · 数量少' }, { id: 'normal', name: 'difficulty.normal.name', desc: '标准' }, { id: 'hard', name: 'difficulty.hard.name', desc: '敌人强 · 数量多' }, { id: 'nightmare', name: 'difficulty.nightmare.name', desc: '极端难度' }];
    this._renderOptions('diff-options', diffs, (i) => i.id === this.menuState.diff, (i) => ({ title: i18n.t(i.name), sub: i.desc, tag: '', value: i.id }), (i) => { this.menuState.diff = i.id; });
    
    this._renderOptions('char-options', e.content.all('characters'), (i) => i.id === this.menuState.char, (i) => ({ title: i18n.t(i.name), sub: i18n.t(i.tag), tag: i.weapon, value: i.id }), (i) => { this.menuState.char = i.id; });
    this._renderOptions('profile-options', e.profile.list(), (i) => i.id === this.menuState.profile, (i) => ({ title: i18n.t(i.name), sub: i18n.t(i.desc || ''), tag: '', value: i.id }), (i) => { this.menuState.profile = i.id; e.profile.setProfile(i.id); this._updateDifficultyDisplay();this._syncCustomSettingsUI(); });

    // 平台选择绑定
    const platEl = document.getElementById('platform-options');
    if (platEl) {
      platEl.querySelectorAll('.option').forEach(el => {
        el.onclick = () => {
          platEl.querySelectorAll('.option').forEach(x => x.classList.remove('on'));
          el.classList.add('on');
          this.platform = el.dataset.value;
        };
      });
    }

    this._renderCustomSettings();
    e.profile.setProfile(this.menuState.profile);
    this._updateDifficultyDisplay();
    e.profile.onChange(() => { this._updateDifficultyDisplay(); this._syncCustomSettingsUI(); });
    this._updateModeHint();
    this._menuReady = true;
  }

    _updateDifficultyDisplay(){
    const el = document.getElementById('difficulty-display');
    if (!el) return;
    const a = this.engine.profile.assess();
    const i18n = this.engine.i18n;
    const color = a.score >= 0.7 ? 'var(--danger)' : a.score >= 0.4 ? 'var(--gold)' : 'var(--green)';
    
    const diffLabel = i18n.t('ui.menu.difficulty_label');
    const finalLabel = diffLabel === 'ui.menu.difficulty_label' ? '实时难度' : diffLabel;

    el.innerHTML = `
      <div>
        <span style="color:var(--dim)">${finalLabel}</span>
        <span style="color:${color};font-weight:800;font-size:20px;margin-left:8px">${Math.round(a.score * 100)}</span>
        <span style="color:var(--dim2);font-size:10px"> / 100</span>
      </div>
      <div style="text-align:right">
        <div style="color:var(--accent);font-weight:600">${i18n.t(a.label)}</div>
        <div style="color:var(--dim2);font-size:10px">奖励 ×${a.rewardMul}</div>
      </div>`;
  }

  _renderOptions(containerId, items, isSelected, buildItem, onSelect){
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    for (const item of items) {
      const data = buildItem(item);
      const div = document.createElement('div');
      div.className = 'option' + (isSelected(item) ? ' on' : '');
      div.dataset.value = data.value;
      div.innerHTML =
        `<div class="opt-title">${data.title}</div>` +
        (data.sub ? `<div class="opt-sub">${data.sub}</div>` : '') +
        (data.tag ? `<div class="opt-tag">${data.tag}</div>` : '');
      div.addEventListener('click', () => {
        el.querySelectorAll('.option').forEach(x => x.classList.remove('on'));
        div.classList.add('on');
        onSelect(item);
      });
      el.appendChild(div);
    }
  }

  _updateModeHint(){
    const el = document.getElementById('mode-hint');
    if (!el) return;
    const mode = this.engine.modeRegistry.get(this.menuState.mode);
    if (mode) el.textContent = this.engine.i18n.t(mode.name);
  }

  _bindGlobalHandlers(){
  const e = this.engine;

  // 这里不再绑定开始/训练按钮，因为 index.html 已经绑定了。
  // 只绑定剩下的。
  document.getElementById('pause-btn')?.addEventListener('click', () => this._togglePause());
  document.getElementById('btn-resume')?.addEventListener('click', () => this._togglePause(false));
  document.getElementById('btn-quit')?.addEventListener('click', () => this._quitToMenu());

  document.getElementById('btn-again')?.addEventListener('click', () => {
    document.getElementById('result-screen')?.classList.remove('on');
    this.startMatch(this._lastMatchKind);
  });
  document.getElementById('btn-menu')?.addEventListener('click', () => {
  document.getElementById('result-screen')?.classList.remove('on');
  this._quitToMenu();
});

document.getElementById('btn-loadout-ticket')?.addEventListener('click', () => {
  if (!this.inventory) return;
  this._ensureInitialInventory(true);
  if (this.bagUI) this.bagUI.refresh();
  const charSpec = this.engine.content.get('characters', this.menuState.char);
  const charName = charSpec ? this.engine.i18n.t(charSpec.name) : '当前角色';
  alert('制式券已发放：' + charName + ' 标准配装。按 B 打开背包查看。');
});

document.getElementById('btn-stash')?.addEventListener('click', () => {
  if (this.bagUI) this.bagUI.toggle();
});

    window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && this.world && this.world.running) {
    ev.preventDefault();
    this._togglePause();
  }
  if (ev.key.toLowerCase() === 'b' && this.bagUI && this.engine.save.data) {
    const bootEl = document.getElementById('boot-screen');
    const inBoot = bootEl && bootEl.classList.contains('on');
    if (!inBoot) {
      ev.preventDefault();
      this.bagUI.toggle();
    }
  }
});

e.i18n.onLanguageChange(() => {
    if (this._menuReady) {
      this._setupMenu();
      if (this.world) this.world.hud.update();
    }
  });
  // ★ 陀螺仪设置事件绑定
const gyroBtn = document.getElementById('btn-gyro-toggle');
const gyroStatus = document.getElementById('gyro-status');
const gyroSens = document.getElementById('gyro-sensitivity');
const gyroSensVal = document.getElementById('gyro-sens-val');

if (gyroBtn) {
  gyroBtn.addEventListener('click', async () => {
    if (e.input.gyroEnabled) {
      // 关闭陀螺仪
      e.input.gyroEnabled = false;
      gyroStatus.textContent = '未开启';
      gyroStatus.style.color = 'var(--dim2)';
    } else {
      // 尝试开启陀螺仪
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          const state = await DeviceOrientationEvent.requestPermission();
          if (state === 'granted') {
            e.input.enableGyro();
            gyroStatus.textContent = '已启用';
            gyroStatus.style.color = 'var(--green)';
          } else {
            gyroStatus.textContent = '权限被拒绝';
            gyroStatus.style.color = 'var(--danger)';
          }
        } else {
          // 安卓通常直接开
          e.input.enableGyro();
          gyroStatus.textContent = '已启用';
          gyroStatus.style.color = 'var(--green)';
        }
      } catch (err) {
        console.error('陀螺仪启动失败', err);
        gyroStatus.textContent = '不支持';
      }
    }
  });
}

if (gyroSens) {
  gyroSens.addEventListener('input', (ev) => {
    const val = parseFloat(ev.target.value);
    e.input.gyroSensitivity = val;
    if (gyroSensVal) gyroSensVal.textContent = val.toFixed(1);
  });
}
}

  _registerDevCommands(){
    const dc = this.engine.devConsole;

    dc.register('kick', {
      desc: '踢掉所有敌人',
      fn: () => {
        if (!this.world) return '当前无对局';
        let count = 0;
        for (const e of this.world.enemies) {
          if (e.alive) {
            e.hp = 0;
            this.world._killEnemy(e);
            count++;
          }
        }
        return `已击杀 ${count} 个敌人`;
      }
    });

    dc.register('heal', {
      desc: '回满 HP',
      fn: () => {
        if (!this.world || !this.world.player) return '当前无对局';
        const p = this.world.player;
        p.hp = p.maxHp;
        p.coupling = p.maxCoupling;
        p.limbDamage = 0;
        p.speedMul = 1;
        return 'HP 与耦合能已回满';
      }
    });

    dc.register('extract', {
      desc: '强制撤离',
      fn: () => {
        if (!this.world) return '当前无对局';
        this.world._end(true);
        return '已强制撤离';
      }
    });

    dc.register('give', {
      desc: '给予物资价值，用法：give <数值>',
      usage: 'give <number>',
      fn: (args) => {
        if (!this.world || !this.world.player) return '当前无对局';
        const amount = parseInt(args[0], 10);
        if (!isFinite(amount)) return '用法：give <数值>';
        this.world.player.carriedValue += amount;
        return `+${amount} cp（当前携带 ${this.world.player.carriedValue} cp）`;
      }
    });

    dc.register('spawn', {
      desc: '在玩家附近生成敌人，用法：spawn <敌人id> [数量]',
      usage: 'spawn <enemyId> [count]',
      fn: (args) => {
        if (!this.world || !this.world.player) return '当前无对局';
        const spec = this.engine.content.get('enemies', args[0]);
        if (!spec) return '未找到敌人：' + args[0];
        const count = Math.min(parseInt(args[1], 10) || 1, 20);
        const p = this.world.player;
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 5 + Math.random() * 5;
          this.world._spawnEnemy(spec,
            p.body.position.x + Math.cos(a) * r,
            p.body.position.z + Math.sin(a) * r, 1);
        }
        return `已在玩家附近生成 ${count} 个 ${args[0]}`;
      }
    });

    // ★ [Profile] 运行时切换预设
    dc.register('profile', {
      desc: '切换玩法预设或显示当前难度，用法：profile <id> | profile list | profile',
      usage: 'profile <id|list>',
      fn: (args) => {
        const prof = this.engine.profile;
        const cmd = args[0];
        if (!cmd) {
          const a = prof.assess();
          return `当前难度 ${(a.score * 100).toFixed(0)}/100 · ${this.engine.i18n.t(a.label)} · 奖励 ×${a.rewardMul}`;
        }
        if (cmd === 'list') {
          return '预设：' + prof.list().map(p => p.id).join(', ');
        }
        const ok = prof.setProfile(cmd);
        if (!ok) return '未找到预设：' + cmd;
        this._updateDifficultyDisplay();
        const a = prof.assess();
        return `已切换到 ${cmd} · 难度 ${(a.score * 100).toFixed(0)}/100 · 奖励 ×${a.rewardMul}`;
      }
    });
  }
       // 初始化库存

   _ensureInitialInventory(forceReset){
  const inv = this.inventory;
  if (!inv) return;
  const data = this.engine.save.data;
  if (!data) return;
  if (!data.flags) data.flags = {};

  if (forceReset) {
    this._stripInventoryForLoadout();
  } else {
    // 已有主武器 → 视为已配装，继承，不覆盖
    if (inv.equipped.main) return;
  }

  const charSpec = this.engine.content.get('characters', this.menuState.char);
  if (!charSpec) return;

  if (!inv.equipped.main && charSpec.weapon) {
  const wDef = this.engine.content.get('weapons', charSpec.weapon);
  const uid = inv.createItem('weapons', charSpec.weapon, {
    loadedQty: wDef ? (wDef.mag || 0) : 0,
  });
  if (uid) inv.equip('main', uid);
}
if (!inv.equipped.side && charSpec.sidearm) {
  const sDef = this.engine.content.get('weapons', charSpec.sidearm);
  const uid = inv.createItem('weapons', charSpec.sidearm, {
    loadedQty: sDef ? (sDef.mag || 0) : 0,
  });
  if (uid) inv.equip('side', uid);
}

  const armorSlots = [
    ['helmetShell', 'helmetShell', 'lv3'],
    ['helmetVisor', 'helmetVisor', 'lv3'],
    ['vestFiber', 'vestFiber', 'lv4'],
    ['vestPlate', 'vestPlate', 'lv4'],
  ];
  for (const [slot, table, defId] of armorSlots) {
    if (!inv.equipped[slot]) {
      const uid = inv.createItem(table, defId);
      if (uid) inv.equip(slot, uid);
    }
  }

  if (!inv.equipped.backpack) {
    const uid = inv.createItem('backpack', 'medium');
    if (uid) inv.equip('backpack', uid);
  }
  if (!inv.equipped.chestRig) {
    const uid = inv.createItem('chestRig', 'large');
    if (uid) inv.equip('chestRig', uid);
  }

  // 弹药放进 bag/chest（战斗中可从身上拿），不放 stash
  const giveAmmo = (ammoType, qty) => {
    const uid = inv.createItem('ammo', ammoType, { qty });
    if (!uid) return;
    if (inv.addToContainer('bag', uid).ok) return;
    if (inv.addToContainer('chest', uid).ok) return;
    inv.addToContainer('stash', uid);
  };

  if (charSpec.weapon) {
    const wDef = this.engine.content.get('weapons', charSpec.weapon);
    if (wDef) giveAmmo(wDef.ammoType, 120);
  }
  if (charSpec.sidearm) {
    const sDef = this.engine.content.get('weapons', charSpec.sidearm);
    if (sDef) giveAmmo(sDef.ammoType, 60);
  }

    // ★ 修复老存档：如果主/副武器 loaded.qty 为 0（旧逻辑未填满），补满
  const fixLoaded = (slotName) => {
    const uid = inv.equipped[slotName];
    if (!uid) return;
    const item = inv.items.get(uid);
    if (!item || item.table !== 'weapons') return;
    if (!item.loaded) {
      const wDef = this.engine.content.get('weapons', item.defId);
      if (wDef) item.loaded = { ammoType: wDef.ammoType, qty: 0 };
    }
    if (item.loaded && item.loaded.qty === 0) {
      const wDef = this.engine.content.get('weapons', item.defId);
      if (wDef) item.loaded.qty = wDef.mag || 0;
    }
  };
  fixLoaded('main');
  fixLoaded('side');

  data.flags.initialInventoryGiven = true;
  this.engine.save.save();
}

_stripInventoryForLoadout(){
  const inv = this.inventory;
  if (!inv) return;
  for (const slot of ['main', 'side', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig']) {
    const uid = inv.equipped[slot];
    if (uid) {
      inv.unequip(slot);
      inv.destroyItem(uid);
    }
  }
  // 清空身上容器（safe 也清，因为制式券是重新配装）；stash 保留
  for (const cName of ['chest', 'pocket', 'bag', 'safe']) {
    const c = inv.containers[cName];
    if (!c) continue;
    const uids = c.uids.slice();
    for (const uid of uids) {
      inv.removeFromContainer(cName, uid);
      inv.destroyItem(uid);
    }
  }
}
   

async startMatch(kind){
  const e = this.engine;
  this._lastMatchKind = kind;

  this._showScreen('game');

  // ★ 加一个加载遮罩，避免看到虚空/上一场残留
  let loadingEl = document.getElementById('match-loading');
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.id = 'match-loading';
    loadingEl.style.cssText = 'position:absolute;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;background:rgba(4,8,14,.96);color:#a8d8ff;font-family:-apple-system,"PingFang SC",sans-serif;letter-spacing:4px;gap:14px';
    loadingEl.innerHTML = '<div style="font-size:15px">进入战区…</div><div style="width:200px;height:3px;background:rgba(80,140,200,.15);border-radius:2px;overflow:hidden"><div id="match-loading-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#3fa8ff,#8ee7ff);transition:width .2s"></div></div>';
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) gameScreen.appendChild(loadingEl);
    else document.body.appendChild(loadingEl);
  }
  loadingEl.style.display = 'flex';
  const loadingBar = document.getElementById('match-loading-bar');
  if (loadingBar) loadingBar.style.width = '20%';

  document.getElementById('result-screen')?.classList.remove('on');
  document.getElementById('pause-screen')?.classList.remove('on');
  const _again = document.getElementById('btn-again');
  if (_again) _again.style.display = '';
  const _reportBtn = document.getElementById('btn-view-report');
  if (_reportBtn) _reportBtn.remove();
  hideCombatReport();
  
  const crosshair = document.getElementById('crosshair');
  if (crosshair) crosshair.style.display = 'block';

  let isMobile = this.platform === 'mobile';
  if (this.platform === 'auto') isMobile = 'ontouchstart' in window;
  
  e.input.enableVirtualJoysticks = isMobile;
  this._setupMobileControls(isMobile);
  this._bindCameraControls();

  if (this.world) {
    try { this.world.destroy(); } catch (err) { console.warn(err); }
    this.world = null;
  }

  this._ensureInitialInventory();

  // 尝试加载外置地图
  let layout = null;
  const mapSpec = e.content.get('maps', this.menuState.map);
  if (mapSpec && mapSpec.layoutUrl) {
    try {
      const res = await fetch(mapSpec.layoutUrl, { cache: 'no-cache' });
      if (res.ok) {
        layout = await res.json();
      } else {
        console.warn('[Map] layoutUrl 加载失败，回退随机生成：', mapSpec.layoutUrl, res.status);
      }
    } catch (err) {
      console.warn('[Map] layoutUrl fetch 异常，回退随机生成：', err);
    }
  }

  try {
    this.world = new GameWorld(e, {
      mapId: this.menuState.map,
      charId: this.menuState.char,
      diffId: this.menuState.diff,
      modeId: this.menuState.mode,
      kind,
      layout,
    });

    this.world.onEnd = (success, stats) => this._onMatchEnd(success, stats);
if (loadingBar) loadingBar.style.width = '70%';
this.world.start();
e.bus.emit('matchStarted', { kind });
if (loadingBar) loadingBar.style.width = '100%';
setTimeout(() => {
  if (loadingEl) loadingEl.style.display = 'none';
}, 250);

    if (!isMobile) {
      const canvas = e.renderer.canvas;
      if (typeof canvas.requestPointerLock === 'function') {
        try {
          const p = canvas.requestPointerLock();
          if (p && typeof p.catch === 'function') {
            p.catch((err) => { console.warn('[PointerLock] 首次请求失败，需用户点击', err); });
          }
        } catch (_) {}
      }
    }
    } catch (err) {
    console.error('[GameApp] startMatch failed:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    alert('启动失败，请查看控制台：' + (err && err.message ? err.message : String(err)));
    this._showScreen('menu');
  }
}

_onMatchEnd(success, stats){
try {
  if (document.pointerLockElement) document.exitPointerLock();
  const e = this.engine;
  const save = e.save;
  const assessment = e.profile.assess();

  /* ---- 存档兜底 ---- */
  if (!save.data) save.data = {};
  if (!save.data.stats) save.data.stats = { runs: 0, extracts: 0, deaths: 0, kills: 0 };
    save.data.stats.runs++;
    if (success) save.data.stats.extracts++;
    else save.data.stats.deaths++;
    save.data.stats.kills = (save.data.stats.kills || 0) + (stats.kills || 0);

    let baseReward = 0;
if (success) baseReward += 500;
baseReward += (stats.kills || 0) * 30;
baseReward += (stats.carriedValue || 0);
const finalReward = Math.round(baseReward * assessment.rewardMul);
save.data.credits = (save.data.credits || 0) + finalReward;

// ★ Inventory 结算：失败掉落装备与身上容器，安全箱保留；成功全部保留
try {
  const inv = this.inventory;
  if (inv) {
    if (!success) {
      for (const slot of ['main', 'side', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig']) {
        const uid = inv.equipped[slot];
        if (uid) { inv.unequip(slot); inv.destroyItem(uid); }
      }
      for (const cName of ['chest', 'pocket', 'bag']) {
        const c = inv.containers[cName];
        if (!c) continue;
        const uids = c.uids.slice();
        for (const uid of uids) {
          inv.removeFromContainer(cName, uid);
          inv.destroyItem(uid);
        }
      }
    }
    save.data.inventory = inv.serialize();
  }
} catch (e) {
  console.warn('[GameApp] Inventory 结算失败', e);
}

save.save();

    /* ---- 结束日志 ---- */
    const world = this.world;
    if (world && world.combatLog) world.combatLog.end(world.time);
    const summary = world && world.combatLog ? world.combatLog.summary() : null;
    const isStraight = world && world.modeId === 'straight';
    const isTraining = world && world.kind === 'training';

    /* ---- 清理旧界面 ---- */
    document.getElementById('result-screen')?.classList.remove('on');
    document.getElementById('pause-screen')?.classList.remove('on');
    const mob = document.getElementById('mobile-controls');
    if (mob) mob.style.display = 'none';

    /* ---- 分支：straight 死亡 / 失败 → 战斗记录（无再来一次） ---- */
    if (isStraight && !success && !isTraining) {
      const distanceSub = `存活 ${Math.round(stats.time || 0)}s · 击杀 ${stats.kills || 0} · 造成 ${Math.round(stats.dealt || 0)} 伤害`;
      showCombatReport({
        title: '作 战 记 录',
        titleClass: 'fail',
        sub: distanceSub,
        summary,
        log: world.combatLog,
        buttons: [
          {
            label: '查看仓库 / 配装',
            primary: true,
            onClick: () => {
              hideCombatReport();
              this._quitToMenu();
              /* TODO: 仓库系统完成后，改成 engine.app.openStash() */
            },
          },
          {
            label: '返回菜单',
            onClick: () => {
              hideCombatReport();
              this._quitToMenu();
            },
          },
        ],
      });
      e.bus.emit('matchEnded', { success, stats, reward: finalReward, assessment });
      return;
    }

    /* ---- 分支：straight 成功 → 战利品总结（无再来一次） ---- */
    if (isStraight && success && !isTraining) {
      const title = document.getElementById('result-title');
      const statsEl = document.getElementById('result-stats');
      if (title) {
        title.textContent = '撤 离 成 功';
        title.className = 'success';
      }
      if (statsEl) {
        statsEl.innerHTML = [
          `击杀：<b>${stats.kills || 0}</b>　命中率：<b>${stats.accuracy || 0}%</b>`,
          `造成伤害：<b>${Math.round(stats.dealt || 0)}</b>　承受伤害：<b>${Math.round(stats.taken || 0)}</b>`,
          `存活：<b>${stats.time || 0}s</b>　携带物资：<b>${stats.carriedValue || 0} cp</b>`,
          `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(120,180,240,.2);color:var(--dim)">
            难度：<b>${e.i18n.t(assessment.label)}</b> (${Math.round(assessment.score * 100)}/100)　奖励倍率：<b>×${assessment.rewardMul}</b>
          </div>`,
          `<div style="padding-top:8px;border-top:1px solid rgba(120,180,240,.2)">
            本局奖励：<b style="color:var(--gold)">+${finalReward} cp</b>
          </div>`,
        ].join('<br>');
      }
      /* 隐藏"再来一次"，改成"查看战斗记录 + 返回菜单" */
      const againBtn = document.getElementById('btn-again');
      if (againBtn) againBtn.style.display = 'none';
      const menuBtn = document.getElementById('btn-menu');
      if (menuBtn) {
        menuBtn.textContent = '返回菜单';
        menuBtn.onclick = () => {
          document.getElementById('result-screen')?.classList.remove('on');
          this._quitToMenu();
        };
      }
      /* 加一个"查看战斗记录"按钮（一次性） */
      let reportBtn = document.getElementById('btn-view-report');
      if (!reportBtn && statsEl && statsEl.parentNode) {
        reportBtn = document.createElement('button');
        reportBtn.id = 'btn-view-report';
        reportBtn.textContent = '查看战斗记录';
        reportBtn.style.cssText = 'margin-top:10px;padding:10px 22px;border-radius:8px;background:rgba(40,80,130,.7);border:1px solid rgba(110,180,255,.5);color:#cfe8ff;font-size:13px;cursor:pointer;';
        statsEl.parentNode.appendChild(reportBtn);
      }
      if (reportBtn) {
        reportBtn.onclick = () => {
          showCombatReport({
            title: '战 斗 记 录',
            titleClass: 'success',
            sub: `存活 ${Math.round(stats.time || 0)}s · 击杀 ${stats.kills || 0}`,
            summary,
            log: world.combatLog,
            buttons: [
              { label: '关闭', onClick: () => hideCombatReport() },
            ],
          });
        };
      }
      document.getElementById('result-screen')?.classList.add('on');
      e.bus.emit('matchEnded', { success, stats, reward: finalReward, assessment });
      return;
    }

    /* ---- 其他分支（训练场 / 未来 asaka）→ 保持原样 ---- */
    const title = document.getElementById('result-title');
    const statsEl = document.getElementById('result-stats');
    if (title) {
      title.textContent = e.i18n.t(success ? 'ui.result.extract_success' : 'ui.result.operation_failed');
      title.className = success ? 'success' : 'fail';
    }
    const againBtn = document.getElementById('btn-again');
    if (againBtn) againBtn.style.display = '';
    const menuBtn = document.getElementById('btn-menu');
    if (menuBtn) {
      menuBtn.textContent = '返回菜单';
      menuBtn.onclick = () => {
        document.getElementById('result-screen')?.classList.remove('on');
        this._quitToMenu();
      };
    }
    const reportBtn2 = document.getElementById('btn-view-report');
    if (reportBtn2) reportBtn2.remove();

    if (statsEl) {
      statsEl.innerHTML = [
        `击杀：<b>${stats.kills || 0}</b>　命中率：<b>${stats.accuracy || 0}%</b>`,
        `造成伤害：<b>${Math.round(stats.dealt || 0)}</b>　承受伤害：<b>${Math.round(stats.taken || 0)}</b>`,
        `存活：<b>${stats.time || 0}s</b>　携带物资：<b>${stats.carriedValue || 0} cp</b>`,
        `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(120,180,240,.2);color:var(--dim)">
          难度：<b>${e.i18n.t(assessment.label)}</b> (${Math.round(assessment.score * 100)}/100)　奖励倍率：<b>×${assessment.rewardMul}</b>
        </div>`,
        `<div style="padding-top:8px;border-top:1px solid rgba(120,180,240,.2)">
          本局奖励：<b style="color:var(--gold)">+${finalReward} cp</b>
        </div>`,
      ].join('<br>');
    }
    document.getElementById('result-screen')?.classList.add('on');
    e.bus.emit('matchEnded', { success, stats, reward: finalReward, assessment });
  } catch (err) {
    console.error('[GameApp] 结算出错:', err);
  }
}

  _togglePause(force){
  if (!this.world || !this.world.running) return;
  const pauseScreen = document.getElementById('pause-screen');
  const isPaused = this.world.paused;
  const target = force !== undefined ? force : !isPaused;

  if (target) {
    this.world.pause();
    pauseScreen.classList.add('on');
    if (document.pointerLockElement) document.exitPointerLock();
    const statsEl = document.getElementById('pause-stats');
    if (statsEl) {
      const p = this.world.player;
      statsEl.innerHTML =
        `击杀：<b>${p.kills}</b>　存活：<b>${Math.round(this.world.time)}s</b><br>` +
        `携带物资：<b>${p.carriedValue} cp</b>`;
    }
  } else {
    this.world.resume();
    pauseScreen.classList.remove('on');
    /* 从暂停恢复：用户点"继续"是手势事件，直接重新锁鼠标 */
    const canvas = this.engine.renderer.canvas;
    if (typeof canvas.requestPointerLock === 'function') {
      try { canvas.requestPointerLock(); } catch (_) {}
    }
  }
}

    _quitToMenu(){
  if (document.pointerLockElement) document.exitPointerLock();
  if (this.world) {
    try { this.world.destroy(); } catch (e) { console.warn(e); }
    this.world = null;
    if (this.inventory) {
      this.engine.save.data.inventory = this.inventory.serialize();
      this.engine.save.save();
    }
  }
  const mob = document.getElementById('mobile-controls');
if (mob) {
  mob.style.display = 'none';
  mob.innerHTML = '';
}
this._mobileButtons = null;

this._showScreen('menu');
  if (this.engine.save.refreshMenu) this.engine.save.refreshMenu();
}

  _showScreen(name){
    const map = { boot: 'boot-screen', menu: 'menu-screen', game: 'game-screen' };
    for (const key in map) {
      const el = document.getElementById(map[key]);
      if (!el) continue;
      el.classList.toggle('on', key === name);
    }
  }

  setLanguage(code){
    const ok = this.engine.setLanguage(code);
    if (ok) {
      if (this._menuReady) this._setupMenu();
      if (this.world) {
        this.world.hud.update();
        this.world.tasks.render();
      }
    }
    return ok;
  }
_bindCameraControls() {
  const canvas = this.engine.renderer.canvas;
  const e = this.engine;

  /* ==================================================
     每次重新绑定前，先 abort 上一轮所有监听器。
     取代 _camBound 一次性锁定 → 支持 PC↔移动端切换。
     ================================================== */
  if (this._camAbort) {
    try { this._camAbort.abort(); } catch (_) {}
  }
  this._camAbort = new AbortController();
  const sig = { signal: this._camAbort.signal };

  let isMobile = this.platform === 'mobile';
  if (this.platform === 'auto') isMobile = 'ontouchstart' in window;

  /* ============== PC 端 · Pointer Lock（仅非移动端注册） ============== */
  if (!isMobile) {
    let lockSupported = typeof canvas.requestPointerLock === 'function';
    let fallbackDrag = false;

    const tryLock = () => {
      if (!this.world || !this.world.running || this.world.paused) return;
      if (this.bagUI && this.bagUI.open) return;
      if (document.pointerLockElement === canvas) return;
      if (!lockSupported) return;
      try {
        const p = canvas.requestPointerLock();
        if (p && typeof p.catch === 'function') p.catch(() => { lockSupported = false; });
      } catch (_) { lockSupported = false; }
    };

    canvas.addEventListener('click', tryLock, sig);

    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      document.body.style.cursor = locked ? 'none' : '';
      if (!locked) fallbackDrag = false;
    }, sig);

    document.addEventListener('pointerlockerror', () => {
      console.warn('[Camera] Pointer Lock 不可用，降级为拖拽');
      lockSupported = false;
    }, sig);

    document.addEventListener('mousemove', (ev) => {
      if (document.pointerLockElement === canvas) {
        e.cameraCtl.rotate(ev.movementX || 0, ev.movementY || 0);
        return;
      }
      if (fallbackDrag && (ev.buttons & 1)) {
        e.cameraCtl.rotate(ev.movementX || 0, ev.movementY || 0);
      }
    }, sig);

    canvas.addEventListener('mousedown', (ev) => {
      if (ev.button === 0 && lockSupported === false) fallbackDrag = true;
    }, sig);
    canvas.addEventListener('mouseup', () => { fallbackDrag = false; }, sig);
    canvas.addEventListener('contextmenu', (ev) => ev.preventDefault(), sig);
    canvas.addEventListener('blur', () => { fallbackDrag = false; }, sig);
  }

  /* ============== 移动端 · 触摸（无条件注册，与平台判定无关） ==============
     放在 if 外，确保 PC↔移动切换、auto 判定失败等场景下触摸逻辑永远在。
     在 PC 上触摸事件不触发（鼠标不产生 touch），互不干扰。
     ==================================================================== */
  canvas.addEventListener('touchstart', (ev) => {
    ev.preventDefault();
    for (let i = 0; i < ev.changedTouches.length; i++) {
      const t = ev.changedTouches[i];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      if (el && (el.closest('.mobile-btn') || el.closest('button'))) continue;
      if (t.clientX < window.innerWidth * 0.45) {
        e.input.startLeftStick(t.clientX, t.clientY, t.identifier);
      } else {
        e.input.startRightDrag(t.clientX, t.clientY, t.identifier);
      }
    }
  }, Object.assign({ passive: false }, sig));

  canvas.addEventListener('touchmove', (ev) => {
    ev.preventDefault();
    for (let i = 0; i < ev.changedTouches.length; i++) {
      const t = ev.changedTouches[i];
      if (e.input.touch.left && e.input.touch.left.id === t.identifier) {
        e.input.moveLeftStick(t.clientX, t.clientY);
      } else if (e.input.touch.right && e.input.touch.right.id === t.identifier) {
        const delta = e.input.moveRightDrag(t.clientX, t.clientY);
        if (delta) e.cameraCtl.rotate(delta.dx * 1.5, delta.dy * 1.5);
      }
    }
  }, Object.assign({ passive: false }, sig));

  const endTouch = (ev) => {
    ev.preventDefault();
    for (let i = 0; i < ev.changedTouches.length; i++) {
      const t = ev.changedTouches[i];
      if (e.input.touch.left && e.input.touch.left.id === t.identifier) {
        e.input.endLeftStick();
      } else if (e.input.touch.right && e.input.touch.right.id === t.identifier) {
        e.input.endRightDrag();
      }
    }
  };
  canvas.addEventListener('touchend', endTouch, Object.assign({ passive: false }, sig));
  canvas.addEventListener('touchcancel', endTouch, Object.assign({ passive: false }, sig));
}
  



 _renderCustomSettings(){
  const el = document.getElementById('custom-settings');
  if (!el) return;
  
  const options = [
    { key: 'hud.hpBar', name: '显示血条', type: 'checkbox' },
    { key: 'hud.ammoCounter', name: '显示弹药', type: 'checkbox' },
    { key: 'visual.damageNumbers', name: '伤害数字', type: 'checkbox' },
    { key: 'visual.hitMarkers', name: '命中标记', type: 'checkbox' },
    { key: 'visual.minimap', name: '小地图', type: 'checkbox' },
    { key: 'skills.enabled', name: '开启技能', type: 'checkbox' },
    { key: 'combat.bulletDrop', name: '子弹下坠', type: 'checkbox' },
    { key: 'combat.headshotInstantKill', name: '爆头即死', type: 'checkbox' },
    { key: 'combat.realisticReload', name: '真实换弹', type: 'checkbox' },
    { key: 'combat.limbDamage', name: '四肢伤害', type: 'checkbox' },
    // ★ 新增灵敏度滑块
    { key: 'input.sensitivity', name: '视角灵敏度', type: 'range', min: 0.5, max: 3.0, step: 0.1 }
  ];

  el.innerHTML = '';
  for (const opt of options) {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;color:#cfe4f8;font-size:12px;padding:6px;background:rgba(20,32,46,.5);border-radius:6px;';
    
    if (opt.type === 'checkbox') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.key = opt.key;
      checkbox.style.cssText = 'width:16px;height:16px;cursor:pointer;';
      checkbox.addEventListener('change', (e) => {
        this.engine.profile.set(opt.key, e.target.checked);
        if (opt.key === 'input.sensitivity') {
          this.engine.cameraCtl.sensitivity = e.target.value;
        }
      });
      label.appendChild(checkbox);
    } else if (opt.type === 'range') {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = opt.min;
      slider.max = opt.max;
      slider.step = opt.step;
      slider.dataset.key = opt.key;
      slider.style.cssText = 'flex:1;cursor:pointer;';
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.engine.profile.set(opt.key, val);
        if (opt.key === 'input.sensitivity') {
          this.engine.cameraCtl.sensitivity = val;
        }
      });
      label.appendChild(slider);
    }
    
    label.appendChild(document.createTextNode(opt.name));
    el.appendChild(label);
  }
  this._syncCustomSettingsUI();
}

  _syncCustomSettingsUI(){
  const el = document.getElementById('custom-settings');
  if (!el) return;
  
  el.querySelectorAll('input').forEach(input => {
    const key = input.dataset.key;
    const val = this.engine.profile.get(key, false);
    if (input.type === 'checkbox') {
      input.checked = val === true;
    } else if (input.type === 'range') {
      input.value = val !== false ? val : 1.0;
      if (key === 'input.sensitivity') {
        this.engine.cameraCtl.sensitivity = parseFloat(input.value);
      }
    }
  });
}

  _setupMobileControls(isMobile) {
  let container = document.getElementById('mobile-controls');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mobile-controls';
    container.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:35;display:none';
    document.getElementById('game-screen').appendChild(container);
  }

  if (!isMobile) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  container.innerHTML = '';
  this._mobileButtons = {};

  for (const [name, cfg] of Object.entries(ACTION_MAP)) {
    if (!cfg.mobile) continue;
    const m = cfg.mobile;
    const el = document.createElement('div');
    el.className = 'mobile-btn';
    el.dataset.actionId = name;

    let posCss = '';
    if (m.left) posCss += `left:${m.left};`;
    if (m.right) posCss += `right:${m.right};`;
    posCss += `bottom:${m.bottom};`;

    el.style.cssText = `
      position:absolute;${posCss}
      width:${m.size}px;height:${m.size}px;border-radius:50%;
      background:${m.color};border:2px solid ${m.border};
      color:#fff;display:flex;align-items:center;justify-content:center;
      pointer-events:auto;font-weight:800;font-size:${Math.max(11, m.size * 0.18)}px;
      user-select:none;-webkit-user-select:none;touch-action:none;
      box-shadow:0 4px 12px rgba(0,0,0,.4);z-index:36;
      transition:opacity .2s, transform .1s;
    `;
    el.textContent = cfg.label;
     
    const actionKey = cfg.actionId || name;

    if (m.mode === 'click') {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    el.style.transform = 'scale(0.9)';
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 100);
    if (name === 'bag') {
      if (this.bagUI) this.bagUI.toggle();
    } else if (name === 'search') {
      if (this.world) this.world._trySearchContainer();
    } else if (name === 'switchWeapon') {
      if (this.world) this.world._switchWeapon();
    }
  });
} else {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        this.engine.input.setActionState(actionKey, true);
        el.style.transform = 'scale(0.9)';
        if (m.rotate) {
          el._dragPointerId = e.pointerId;
          el._lastX = e.clientX;
          el._lastY = e.clientY;
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
        }
      });
      if (m.rotate) {
        el.addEventListener('pointermove', (e) => {
          if (el._dragPointerId !== e.pointerId) return;
          const dx = e.clientX - el._lastX;
          const dy = e.clientY - el._lastY;
          el._lastX = e.clientX;
          el._lastY = e.clientY;
          if (Math.abs(dx) + Math.abs(dy) > 0.5) {
            this.engine.cameraCtl.rotate(dx * 1.5, dy * 1.5);
          }
        });
      }
      const release = (e) => {
        e.preventDefault(); e.stopPropagation();
        this.engine.input.setActionState(actionKey, false);
        el.style.transform = 'scale(1)';
        if (m.rotate) el._dragPointerId = null;
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('pointerleave', (e) => {
        if (m.rotate && el._dragPointerId === e.pointerId) return;
        release(e);
      });
    }

    this._mobileButtons[name] = el;
    container.appendChild(el);
  }
}
 
}
