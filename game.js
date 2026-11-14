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
  RANGE_DECAY: 0.25,
  RANGE_DECAY_REALISTIC: 0.50,
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
   [0.4] 空手拳击定义
   ------------------------------------------------------------
   玩家没有装备任何武器时的兜底"武器"。不占背包槽位，
   由 player.fist 常驻持有。
   ============================================================ */
const FIST_DEF = Object.freeze({
  name: 'content.melee.fist.name',
  desc: 'content.melee.fist.desc',
  damage: 80,
  range: 1.5,
  cooldown: 0.5,
  melee: true,
  isFist: true,
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
    label: ''攻击,
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
    switchWeapon: {
  keys: ['f'],
  label: '切枪',
  mobile: { right: '160px', bottom: '180px', size: 55, color: 'rgba(160,120,255,.35)', border: 'rgba(180,140,255,.7)', mode: 'click' },
},
  bag: {
    keys: ['b'],
    label: '背包',
    mobile: { right: '90px', bottom: '280px', size: 55, color: 'rgba(80,140,255,.35)', border: 'rgba(120,180,255,.7)', mode: 'click' },
  },
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
      crouch: {
  keys: ['c'],
  label: '蹲',
  mobile: { right: '120px', bottom: '120px', size: 55, color: 'rgba(150,150,150,.3)', border: 'rgba(255,255,255,.5)', mode: 'hold', rotate: true },
},
ads: {
  mouse: 'right',
  label: '开镜',
  mobile: { right: '20px', bottom: '280px', size: 55, color: 'rgba(50,150,255,.3)', border: 'rgba(100,180,255,.6)', mode: 'hold', rotate: true },
},
lean_left: {
  keys: ['z'],
  label: '左倾',
  mobile: { left: '30px', bottom: '230px', size: 45, color: 'rgba(100,100,100,.3)', border: 'rgba(200,200,200,.5)', mode: 'hold', rotate: true },
},
lean_right: {
  keys: ['x'],
  label: '右倾',
  mobile: { left: '85px', bottom: '230px', size: 45, color: 'rgba(100,100,100,.3)', border: 'rgba(200,200,200,.5)', mode: 'hold', rotate: true },
},
skill1: {
  keys: ['q'],
  label: '技能1',
  mobile: { left: '30px', bottom: '300px', size: 45, color: 'rgba(160,120,255,.3)', border: 'rgba(180,140,255,.6)', mode: 'click' },
},
skill2: {
  keys: ['e'],
  label: '技能2',
  mobile: { left: '85px', bottom: '300px', size: 45, color: 'rgba(160,120,255,.3)', border: 'rgba(180,140,255,.6)', mode: 'click' },
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
  const t = Math.min(traveled / range, 5.0);
  return baseEnergy * Math.exp(-k * t);
},

  applyArmor(armorItem, energy, pen, applyBruise){
  if (!armorItem || armorItem.dur <= 0 || !armorItem.lv) {
    return { absorbed: 0, remaining: energy, wear: 0, pierced: pen >= 3 };
  }

  const baseSpec = { 1: 0.10, 2: 0.25, 3: 0.50, 4: 0.70, 5: 0.85, 6: 0.95, 7: 0.99 };
  const lv = armorItem.lv;
  const baseRed = baseSpec[lv] || 0.99;

  const diff = pen - lv;
  let redMul = 1.0;
  if (diff >= 4) redMul = 0.05;
  else if (diff === 3) redMul = 0.2;
  else if (diff === 2) redMul = 0.4;
  else if (diff === 1) redMul = 0.7;
  else if (diff === 0) redMul = 1.0;
  else if (diff === -1) redMul = 1.15;
  else if (diff <= -2) redMul = 1.3;

  const durRatio = Math.max(0, Math.min(1, armorItem.dur / armorItem.max));
  const wearPenalty = 0.2 + 0.8 * durRatio;

  let effRed = Math.min(0.99, baseRed * redMul * wearPenalty);
  const pierced = diff >= 1;

  const absorbed = energy * effRed;
  const afterArmor = energy - absorbed;

  let finalDamage;
  if (applyBruise === false) {
    finalDamage = afterArmor;
  } else {
    finalDamage = pierced ? afterArmor : afterArmor * 0.25;
  }

  const wear = Math.min(armorItem.dur, absorbed / 25);
  armorItem.dur = Math.max(0, armorItem.dur - wear);

  return { absorbed, remaining: finalDamage, wear, pierced };
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
   [1.5] 实体健康与状态系统 (EntityStatus) - 仿真核心
   ============================================================ */
// 部位承受极限（单位：焦耳 J）。代表该部位肌肉骨骼被彻底摧毁的阈值。
const PART_MAX_HP = {
  head: 60,     // 头部极脆：9mm(500J)擦边即死，5.56(1700J)直接爆头
  thorax: 800,  // 胸部核心：5.56(1700J)一枪打穿，9mm(500J)两枪死
  abdomen: 600, // 腹部：内脏较多
  larm: 400,    // 手臂：骨骼+肌肉
  legs: 500     // 腿部：更粗壮
};

// 单次动能对应的伤口等级
const WOUND_ENERGY_THRESHOLD = [0, 100, 350, 700, 1200];

class EntityStatus {
  constructor(entity, isPrazer) {
    this.entity = entity;
    this.isPrazer = isPrazer;
    this.maxBlood = isPrazer ? 6000 : 5000; // 血量单位：毫升(ml)
    this.blood = this.maxBlood;
    
    this.parts = {};
    for (const p in PART_MAX_HP) {
      this.parts[p] = { hp: PART_MAX_HP[p], maxHp: PART_MAX_HP[p], wound: 0, fracture: 0 };
    }
    
    this.effects = new Map();
    this.healthQuality = 100;
  }

  addEffect(id, duration, strength, awareness = 0) {
    const existing = this.effects.get(id);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      existing.strength = Math.max(existing.strength, strength);
    } else {
      this.effects.set(id, { id, duration, strength, awareness });
    }
  }

  removeEffect(id) { this.effects.delete(id); }
  hasEffect(id) { return this.effects.has(id); }

  takeDamage(part, energy, pen) {
    if (!this.parts[part]) part = 'thorax';
    if (part === 'rarm') part = 'larm'; 
    if (part === 'lleg' || part === 'rleg') part = 'legs';

    const p = this.parts[part];
    if (!p) return;

    // ★ 核心仿真：直接用动能扣除部位血量
    p.hp = Math.max(-p.maxHp * 2, p.hp - energy);
    
    // 瞬时空腔效应造成的失血：每受 100 焦耳伤害，瞬间失血 40ml
    const instantBleed = energy * 0.4;
    this.blood = Math.max(0, this.blood - instantBleed);

    // 伤口等级判定
    let newWound = 0;
    for (let i = 1; i < WOUND_ENERGY_THRESHOLD.length; i++) {
      if (energy >= WOUND_ENERGY_THRESHOLD[i]) newWound = i;
    }
    p.wound = Math.max(p.wound, newWound);
    
    if (p.wound > 0) {
      // 持续流血：每秒流 5ml * 伤口等级（致命伤流得极快）
      this.addEffect('bleeding', 30, Math.max(p.wound, this.effects.get('bleeding')?.strength || 0));
      this.addEffect('pain', 10, 1);
    }
    
    // 骨折判定
    if (p.hp <= 0 && p.fracture === 0) {
      p.fracture = 1; // 骨折
      this.addEffect('fracture', 999, 1);
    } else if (p.hp <= -p.maxHp && p.fracture === 1) {
      p.fracture = 2; // 粉碎性骨折
      this.addEffect('fracture', 999, 2);
    }

    this.updateOverallHealth();
    return { hp: p.hp, wound: p.wound, fracture: p.fracture };
  }

  tick(dt) {
    let bleedRate = 0;
    for (const [id, eff] of this.effects) {
      if (id === 'bleeding') bleedRate += eff.strength * 5; // 每秒流 5ml 血
      eff.duration -= dt;
      if (eff.duration <= 0) this.effects.delete(id);
    }
    
    this.blood = Math.max(0, this.blood - bleedRate * dt);
    
    if (this.blood < this.maxBlood * 0.5) {
      this.addEffect('hypovolemia', 999, 1); // 失血过半触发效果
    } else {
      this.removeEffect('hypovolemia');
    }

    this.updateOverallHealth();
  }

  updateOverallHealth() {
    // 只计算决定性部位：头40%、胸40%、腹20%
    const headRatio = Math.max(0, this.parts.head.hp) / this.parts.head.maxHp;
    const thoraxRatio = Math.max(0, this.parts.thorax.hp) / this.parts.thorax.maxHp;
    const abdomenRatio = Math.max(0, this.parts.abdomen.hp) / this.parts.abdomen.maxHp;
    this.healthQuality = Math.max(0, (headRatio * 0.4 + thoraxRatio * 0.4 + abdomenRatio * 0.2) * 100);
  }

  getHealthText() {
    if (this.isDead()) return '死亡';
    if (this.isDowned()) return '濒死击倒';
    if (this.healthQuality > 85) return '健康';
    if (this.healthQuality > 60) return '轻伤';
    if (this.healthQuality > 35) return '重伤';
    if (this.healthQuality > 15) return '濒死';
    return '危殆';
  }

  getMoveSpeedMul() {
    let mul = 1;
    if (this.effects.has('hypovolemia')) mul *= 0.75;
    if (this.parts.legs.fracture > 0) mul *= 0.5;
    if (this.effects.has('pain')) mul *= 0.9;
    if (this.effects.has('moving_speed_up')) mul *= 1.2;
    return mul;
  }

  getHandlingMul() {
    let mul = 1;
    if (this.effects.has('hypovolemia')) mul *= 0.8;
    if (this.effects.has('pain')) mul *= 0.8;
    return mul;
  }

  isDead() {
    if (this.blood <= 0) return true;
    if (this.parts.head.hp <= 0) return true; // 头部承伤 60J 即死
    return false;
  }

  isDowned() {
    if (this.isDead()) return false;
    // 胸部被打穿，或失血极低，进入倒地等死状态
    return this.parts.thorax.hp <= 0 || this.blood < this.maxBlood * 0.2;
  }
}


/* ============================================================
   [2] AI 系统 (多阵营战术版)
   ============================================================ */
const AISystem = {
  update(world, enemy, dt){
    if (!enemy.alive || enemy.trainingDummy) return;

    if (enemy.status && enemy.status.isDowned()) {
      enemy.body.velocity.x *= 0.9;
      enemy.body.velocity.z *= 0.9;
      return; 
    }

    const ai = enemy.spec.ai || { aggression: 0.5, composure: 0.5, perception: 0.5, opportunism: 0.5 };
    
    // 寻找目标（包含玩家和其他敌人）
    const target = this._findTarget(world, enemy, ai);
    const canSee = !!target;
    const dist = target ? Math.hypot(target.body.position.x - enemy.body.position.x, target.body.position.z - enemy.body.position.z) : Infinity;
    
    if (target) {
      enemy.targetEntity = target;
    }

    // --- 感知逻辑 ---
    if (canSee) {
      const rate = (1.0 + ai.perception * 2) / (dist * 0.1 + 1);
      enemy.awareness = Math.min(1.2, enemy.awareness + dt * rate);
    } else {
      enemy.awareness = Math.max(0, enemy.awareness - dt * 0.15);
    }

    // --- 状态机切换 ---
    if (enemy.awareness >= 1.0 && enemy.state !== 'combat' && enemy.state !== 'flee') {
      enemy.state = 'combat';
      const baseReact = 1.5 - ai.composure * 1.2;
      enemy.reactionTimer = baseReact + Math.random() * 0.3; 
      enemy.stateT = 0;
    } else if (enemy.awareness < 0.7 && enemy.state === 'combat') {
      enemy.state = 'investigate';
      enemy.stateT = 0;
      if (enemy.targetEntity) {
        enemy.targetPos = { x: enemy.targetEntity.body.position.x, z: enemy.targetEntity.body.position.z };
      }
    }

    const healthPct = enemy.status.healthQuality;
    if (healthPct < 30 && ai.aggression < 0.7 && enemy.state !== 'flee') {
      enemy.state = 'flee';
      enemy.stateT = 0;
      enemy.targetPos = (ai.opportunism > 0.4) ? this._findCover(world, enemy, world.player) : null;
    }

    switch (enemy.state) {
      case 'patrol': this._patrol(world, enemy, dt); break;
      case 'investigate': this._investigate(world, enemy, dt); break;
      case 'combat': this._combat(world, enemy, dt, dist, canSee, ai); break;
      case 'flee': this._flee(world, enemy, dt, enemy.targetEntity || world.player, ai); break;
    }

    const half = world.mapSpec.size / 2 - 2;
    enemy.body.position.x = Math.max(-half, Math.min(half, enemy.body.position.x));
    enemy.body.position.z = Math.max(-half, Math.min(half, enemy.body.position.z));

    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
  },

  _findTarget(world, enemy, ai) {
    let bestTarget = null;
    let bestDist = Infinity;
    const eFaction = enemy.spec.faction;

    const candidates = [world.player, ...world.enemies];

    for (const c of candidates) {
      if (c === enemy || !c.alive) continue;
      if (c.body && c.body.userData.type === 'enemy' && c.body.userData.ref === enemy) continue;

      const cFaction = c.faction || (c.spec ? c.spec.faction : 'player');
      if (!world.isHostile(eFaction, cFaction)) continue; 

      const dx = c.body.position.x - enemy.body.position.x;
      const dz = c.body.position.z - enemy.body.position.z;
      const dist = Math.hypot(dx, dz);

      const maxDist = 30 + ai.perception * 50;
      if (dist > maxDist) continue;

      const angleToTarget = Math.atan2(dz, dx);
      let angleDiff = Math.abs(angleToTarget - enemy.angle);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      const fov = (Math.PI / 2) + (ai.perception * (Math.PI / 3));
      if (angleDiff > fov / 2) continue;

      if (!this._checkLOS(world, enemy, c)) continue;

      if (dist < bestDist) {
        bestDist = dist;
        bestTarget = c;
      }
    }
    return bestTarget;
  },

  _findCover(world, enemy, player) {
    let bestCover = null;
    let bestDist = Infinity;
    const px = player.body.position.x;
    const pz = player.body.position.z;

    for (const obs of world.obstacles) {
      const ox = obs.body.position.x;
      const oz = obs.body.position.z;
      const odx = ox - enemy.body.position.x;
      const odz = oz - enemy.body.position.z;
      const d = Math.hypot(odx, odz);
      if (d > 20 || d < 5) continue;

      const pdx = ox - px;
      const pdz = oz - pz;
      const pDist = Math.hypot(pdx, pdz);
      if (pDist < 10) continue; 

      if (d < bestDist) {
        bestDist = d;
        const angleFromPlayer = Math.atan2(oz - pz, ox - px);
        bestCover = {
          x: ox + Math.cos(angleFromPlayer) * 2.0,
          z: oz + Math.sin(angleFromPlayer) * 2.0
        };
      }
    }
    return bestCover;
  },

  _patrol(world, enemy, dt){
    enemy.isCrouching = false; enemy.body.height = 2.4; enemy.body.halfH = 1.2;
    enemy.wanderT -= dt;
    if (enemy.wanderT <= 0) {
      enemy.wanderT = 1.5 + Math.random() * 1.5;
      enemy.wanderDir = Math.random() * Math.PI * 2;
    }
    enemy.angle = enemy.wanderDir;
    enemy.body.velocity.x = Math.cos(enemy.wanderDir) * enemy.spec.speed * 0.4;
    enemy.body.velocity.z = Math.sin(enemy.wanderDir) * enemy.spec.speed * 0.4;
  },

  _investigate(world, enemy, dt){
    enemy.isCrouching = false; enemy.body.height = 2.4; enemy.body.halfH = 1.2;
    enemy.stateT += dt;
    if (enemy.targetPos) {
      const dx = enemy.targetPos.x - enemy.body.position.x;
      const dz = enemy.targetPos.z - enemy.body.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 2) {
        const ang = Math.atan2(dz, dx);
        enemy.angle = ang;
        enemy.body.velocity.x = Math.cos(ang) * enemy.spec.speed * 0.8;
        enemy.body.velocity.z = Math.sin(ang) * enemy.spec.speed * 0.8;
      } else {
        enemy.body.velocity.x = 0;
        enemy.body.velocity.z = 0;
      }
    }
    if (enemy.stateT > 8) {
      enemy.state = 'patrol';
      enemy.awareness = 0;
    }
  },

  _combat(world, enemy, dt, dist, canSee, ai){
    const target = enemy.targetEntity;
    if (!target || !target.alive) {
      enemy.state = 'investigate';
      return;
    }
    
    if (!canSee) {
      enemy.state = 'investigate';
      enemy.targetPos = { x: target.body.position.x, z: target.body.position.z };
      return;
    }

    const dx = target.body.position.x - enemy.body.position.x;
    const dz = target.body.position.z - enemy.body.position.z;
    enemy.angle = Math.atan2(dz, dx);

    const isOpportunist = ai.opportunism > 0.6;
    if (isOpportunist && dist < 30 && dist > 10) {
      enemy.isCrouching = true;
      enemy.body.height = 1.6; enemy.body.halfH = 0.8;
      enemy.body.velocity.x = Math.cos(enemy.angle + Math.PI/2) * enemy.spec.speed * 0.4;
      enemy.body.velocity.z = Math.sin(enemy.angle + Math.PI/2) * enemy.spec.speed * 0.4;
    } else if (ai.aggression > 0.7 && dist > 10) {
      enemy.isCrouching = false;
      enemy.body.height = 2.4; enemy.body.halfH = 1.2;
      enemy.body.velocity.x = Math.cos(enemy.angle) * enemy.spec.speed;
      enemy.body.velocity.z = Math.sin(enemy.angle) * enemy.spec.speed;
    } else {
      enemy.body.velocity.x = 0;
      enemy.body.velocity.z = 0;
    }

    if (enemy.reactionTimer > 0) {
      enemy.reactionTimer -= dt;
      return;
    }

    if (enemy.fireCd > 0) enemy.fireCd -= dt;
    if (enemy.burstCount === undefined) enemy.burstCount = 0;
    if (enemy.burstCooldown === undefined) enemy.burstCooldown = 0;

    if (enemy.burstCooldown > 0) {
      enemy.burstCooldown -= dt;
    } else if (enemy.fireCd <= 0 && enemy.weapon && enemy.weapon.loaded.qty > 0) {
      world.enemyFire(enemy, target);
      enemy.burstCount++;
      
      const maxBurst = 2 + Math.floor(ai.aggression * 4);
      if (enemy.burstCount >= maxBurst) {
        enemy.burstCount = 0;
        enemy.burstCooldown = 0.5 + Math.random() * 0.8; 
      }
    }

    const w = enemy.weapon;
    if (w && w.loaded.qty <= 0 && w.reserve > 0) {
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
  },

  _flee(world, enemy, dt, target, ai){
    enemy.stateT += dt;
    enemy.isCrouching = false; enemy.body.height = 2.4; enemy.body.halfH = 1.2;

    let moveX = 0, moveZ = 0;
    if (enemy.targetPos) {
      const dx = enemy.targetPos.x - enemy.body.position.x;
      const dz = enemy.targetPos.z - enemy.body.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.5) {
        enemy.angle = Math.atan2(dz, dx);
        moveX = Math.cos(enemy.angle) * enemy.spec.speed;
        moveZ = Math.sin(enemy.angle) * enemy.spec.speed;
      } else {
        enemy.isCrouching = true;
        enemy.body.height = 1.6; enemy.body.halfH = 0.8;
      }
    } else {
      const dx = target.body.position.x - enemy.body.position.x;
      const dz = target.body.position.z - enemy.body.position.z;
      enemy.angle = Math.atan2(dz, dx) + Math.PI; 
      moveX = Math.cos(enemy.angle) * enemy.spec.speed;
      moveZ = Math.sin(enemy.angle) * enemy.spec.speed;
    }

    if (ai.opportunism > 0.5 || ai.aggression > 0.6) {
      const distToTarget = Math.hypot(target.body.position.x - enemy.body.position.x, target.body.position.z - enemy.body.position.z);
      if (distToTarget < 20 && enemy.weapon && enemy.weapon.loaded.qty > 0) {
        if (enemy.fireCd > 0) enemy.fireCd -= dt;
        if (enemy.fireCd <= 0) {
          const origAngle = enemy.angle;
          enemy.angle = Math.atan2(target.body.position.z - enemy.body.position.z, target.body.position.x - enemy.body.position.x);
          enemy._blindFire = true; 
          world.enemyFire(enemy, target);
          enemy._blindFire = false;
          enemy.angle = origAngle;
          enemy.fireCd = 0.3 + Math.random() * 0.4;
        }
      }
    }

    enemy.body.velocity.x = moveX;
    enemy.body.velocity.z = moveZ;
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

  onHit(world, enemy, hitPart, srcX, srcZ) {
    if (!enemy.alive) return;
    const ai = enemy.spec.ai || { aggression: 0.5, composure: 0.5, opportunism: 0.5 };
    
    enemy.awareness = 1.0; 
    const dx = srcX - enemy.body.position.x;
    const dz = srcZ - enemy.body.position.z;
    const attackAngle = Math.atan2(dz, dx);
    
    if (ai.composure > 0.6) {
      enemy.angle = attackAngle;
      if (enemy.state !== 'combat') {
        enemy.state = 'combat';
        enemy.reactionTimer = 0.15;
      }
    } else {
      enemy.angle = attackAngle + (Math.random() - 0.5) * Math.PI;
      enemy.state = 'flee';
      enemy.targetPos = AISystem._findCover(world, enemy, world.player);
      enemy.reactionTimer = 1.2;
    }

    const isLegBroken = enemy.status.parts.legs.fracture > 0;
    const isHeavyHurt = enemy.status.healthQuality < 30;

    if (isLegBroken && ai.opportunism > 0.4) {
      enemy.state = 'combat';
      enemy.isCrouching = true;
      enemy.body.height = 1.6; enemy.body.halfH = 0.8;
      enemy.targetPos = null;
    } else if (isHeavyHurt && ai.aggression < 0.7) {
      if (enemy.state !== 'flee') {
        enemy.state = 'flee';
        enemy.targetPos = AISystem._findCover(world, enemy, world.player);
      }
    } else if (ai.aggression > 0.8) {
      enemy.state = 'combat';
      enemy.body.velocity.x = Math.cos(attackAngle) * enemy.spec.speed;
      enemy.body.velocity.z = Math.sin(attackAngle) * enemy.spec.speed;
    }
  }
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
  this._renderSoundRadar();
    
  // 数值更新
  this._setText('player-name', p.charSpec ? this.engine.i18n.t(p.charSpec.name) : '—');
  this._setText('player-tag', p.charSpec ? this.engine.i18n.t(p.charSpec.tag) : '—');

  // 更新定性状态与颜色
const hq = p.status ? p.status.healthQuality : 100;
const hText = p.status ? p.status.getHealthText() : '健康';
this._setStyle('hp-bar', 'width', Math.max(0, hq) + '%');

let hColor = '#5fd47a'; // 绿
if (hq <= 15) hColor = '#ff3030';
else if (hq <= 35) hColor = '#ff8b7b';
else if (hq <= 60) hColor = '#ffd93d';
else if (hq <= 85) hColor = '#a8e05a';

this._setStyle('hp-bar', 'background', hColor);
this._setText('hp-text', hText);

// 渲染效果图标
this._renderEffects(p);
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
const cw = this.world.currentWeapon;
if (cw) {
  this._setText('weapon-name', this.engine.i18n.t(cw.def.name));
  if (cw.isFist || (cw.def && cw.def.melee)) {
    this._setText('ammo-mag', '—');
    this._setText('ammo-reserve', '—');
  } else {
    this._setText('ammo-mag', String(cw.mag));
    this._setText('ammo-reserve', String(cw.reserve));
  }
}

if (p.carriedValue !== undefined) {
  this._setText('carry-value', String(Math.round(p.carriedValue)));
}

  // ★ 核心：受伤视觉状态机
  this._updateHurtFX(hq);
  
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

  // ★ 失血过多：强制视野收缩、边缘发黑、轻微颤抖
  if (p && p.status && p.status.hasEffect('hypovolemia')) {
    vignetteOpacity = 0.8;
    filterOpacity = 0.35;
    centerDark = 0.3;
    shakeAmp = 0.008;
  }

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

_renderSoundRadar() {
  let canvas = document.getElementById('sound-radar-canvas');
  if (!canvas) return;
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const p = this.world.player;
  if (!p || !p.alive) return;

  // 检查耳机装备
  const inv = this.engine.app.inventory;
  const hasHeadset = !!(inv && inv.equipped && inv.equipped.helmetEar);
  
  // 有耳机听 60 米，没耳机听 25 米
  const maxHearRange = hasHeadset ? 60 : 25;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const cam = this.engine.renderer.camera;
  const now = performance.now() / 1000;

  for (const s of this.world.soundEvents) {
    if (s.source === 'player') continue;

    const dx = s.x - p.body.position.x;
    const dz = s.z - p.body.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > maxHearRange || dist > s.maxRange) continue;

    let alpha = s.intensity * (1 - dist / s.maxRange);
    if (!hasHeadset) alpha *= 0.3; // 无耳机极弱
    if (alpha < 0.05) continue;

    const isMalignant = s.type === 'malignant';
    const color = isMalignant ? '255, 50, 50' : '200, 230, 255';

    // ★ 计算声源的 3D 投影位置
    const vec = new THREE.Vector3(s.x, 1.0, s.z); // 假设声音在 1 米高
    vec.project(cam);
    const sx = (vec.x * 0.5 + 0.5) * w;
    const sy = (-vec.y * 0.5 + 0.5) * h;

    // 是否在视野内
    const inView = vec.z < 1 && sx > 0 && sx < w && sy > 0 && sy < h;

    if (hasHeadset) {
      // ★ 戴耳机：波浪/声呐动图
      const wave = (now % 1); // 0 -> 1 循环
      const waveRadius = wave * 40 + 10;
      const waveAlpha = alpha * (1 - wave);
      
      if (inView) {
        // 在视野内：直接画同心圆声呐
        ctx.beginPath();
        ctx.arc(sx, sy, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color}, ${waveAlpha})`;
        ctx.lineWidth = isMalignant ? 3 : 1.5;
        ctx.stroke();

        // 核心点
        ctx.beginPath();
        ctx.arc(sx, sy, isMalignant ? 4 : 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.fill();
      } else {
        // 在视野外：计算屏幕边缘交点
        const worldAng = Math.atan2(dz, dx);
        let relAng = worldAng - this.engine.cameraCtl.yaw;
        while (relAng > Math.PI) relAng -= Math.PI * 2;
        while (relAng < -Math.PI) relAng += Math.PI * 2;
        
        const dirX = Math.sin(relAng);
        const dirY = -Math.cos(relAng);
        
        const rectW = w - 40; // 留点边距
        const rectH = h - 40;
        const scaleX = Math.abs(dirX) > 0.001 ? (rectW / 2) / Math.abs(dirX) : Infinity;
        const scaleY = Math.abs(dirY) > 0.001 ? (rectH / 2) / Math.abs(dirY) : Infinity;
        const scale = Math.min(scaleX, scaleY);
        
        const edgeX = cx + dirX * scale;
        const edgeY = cy + dirY * scale;

        // 画向内扩散的半圆波
        const angleToCenter = Math.atan2(cy - edgeY, cx - edgeX);
        ctx.beginPath();
        ctx.arc(edgeX, edgeY, waveRadius, angleToCenter - Math.PI / 2, angleToCenter + Math.PI / 2);
        ctx.strokeStyle = `rgba(${color}, ${waveAlpha})`;
        ctx.lineWidth = isMalignant ? 4 : 2;
        ctx.stroke();
      }
    } else {
      // ★ 无耳机：四角/边缘的微弱阴影（不带波纹）
      if (inView) {
        // 在视野内：只显示一个微弱的红/白点
        ctx.beginPath();
        ctx.arc(sx, sy, isMalignant ? 3 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.fill();
      } else {
        // 在视野外：计算边缘交点，画光晕
        const worldAng = Math.atan2(dz, dx);
        let relAng = worldAng - this.engine.cameraCtl.yaw;
        while (relAng > Math.PI) relAng -= Math.PI * 2;
        while (relAng < -Math.PI) relAng += Math.PI * 2;
        
        const dirX = Math.sin(relAng);
        const dirY = -Math.cos(relAng);
        
        const scaleX = Math.abs(dirX) > 0.001 ? (w / 2) / Math.abs(dirX) : Infinity;
        const scaleY = Math.abs(dirY) > 0.001 ? (h / 2) / Math.abs(dirY) : Infinity;
        const scale = Math.min(scaleX, scaleY);
        
        const edgeX = cx + dirX * scale;
        const edgeY = cy + dirY * scale;

        // 径向渐变阴影
        const grad = ctx.createRadialGradient(edgeX, edgeY, 0, edgeX, edgeY, 100);
        grad.addColorStop(0, `rgba(${color}, ${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(${color}, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(edgeX, edgeY, 100, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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
   
  _renderEffects(p) {
  const el = document.getElementById('effect-bar');
  if (!el) return;
  if (!p.status) { el.innerHTML = ''; return; }
  
  // 如果效果没有变化，跳过重绘
  const sig = Array.from(p.status.effects.keys()).join(',');
  if (this._lastEffectSig === sig) return;
  this._lastEffectSig = sig;
  
  let html = '';
  for (const [id, eff] of p.status.effects) {
    const def = this.engine.content.get('effects', id);
    if (def) {
      html += `<div title="${def.name} 强度:${eff.strength}" style="padding:2px 6px;background:rgba(200,50,50,.4);border:1px solid rgba(255,100,100,.5);border-radius:4px;font-size:12px;">${def.icon} ${def.name}</div>`;
    }
  }
  el.innerHTML = html;
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
  this.soundEvents = []; 
}

  start(){
    this._setupScene();
    this._spawnPlayer();
    this._spawnEnemies();
    this._spawnExtracts();
    this._spawnContainers();
    this._registerInputActions();
    this.tasks.initFromRegistry();
    this._lastEffectsSet = new Set();

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
  const invPrimary = this._buildWeaponFromInventory(inv, 'main');
  const invSecondary = this._buildWeaponFromInventory(inv, 'side');
  const invMelee = this._buildMeleeFromInventory(inv, 'melee');
  const invArmor = this._buildArmorFromInventory(inv);

  const fist = { def: FIST_DEF, fireCd: 0, isFist: true };

  let activeSlot = 'fist';
  if (invPrimary) activeSlot = 'primary';
  else if (invSecondary) activeSlot = 'secondary';
  else if (invMelee) activeSlot = 'melee';

  this.player = {
  mesh, body,
  weaponGroup,
  charSpec: spec,
  charId: spec.id,
  faction: 'player',
  hp: spec.hp,
  maxHp: spec.hp,
  coupling: spec.prazer ? 100 : 0,
  maxCoupling: spec.prazer ? 100 : 0,
  protection: null,
  protectionHold: false,
  angle: 0,

  weapons: {
    primary: invPrimary,
    secondary: invSecondary,
    melee: invMelee,
  },
  fist,
  activeSlot,
  get activeWeapon() {
    if (this.activeSlot === 'fist') return this.fist;
    return this.weapons[this.activeSlot] || this.fist;
  },
  get weapon() { return this.activeWeapon; },
  get sidearm() {
    if (this.activeSlot === 'primary') return this.weapons.secondary || null;
    if (this.activeSlot === 'secondary') return this.weapons.primary || null;
    return this.weapons.primary || this.weapons.secondary || null;
  },
  get usingSidearm() { return this.activeSlot === 'secondary'; },

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
  status: new EntityStatus(spec, spec.prazer),
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
  loaded: { ammoType: def.ammoType, qty: magCap, queue: new Array(magCap).fill(def.ammoType) },
  magCap,
  reserve: magCap * 3,
  fireCd: 0,
  reloading: 0,
  get mag() { return this.loaded.qty; },
  set mag(v) { this.loaded.qty = Math.max(0, Math.min(this.magCap, v)); },
};}

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
if (!item.loaded) item.loaded = { ammoType: def.ammoType, qty: 0, queue: [] };

return {
  item,
  def,
  ammoDef,
  magCap: def.mag,
  fireCd: 0,
  reloading: 0,
  // ★ 修复：正确指向 item.loaded.qty
  get mag() { return this.item.loaded.qty; },
  set mag(v) { this.item.loaded.qty = Math.max(0, Math.min(this.magCap, v)); },
  get reserve() { return self._countAmmoInInventory(inv, def.ammoType); },
  consumeReserve(count) { self._consumeAmmoInInventory(inv, def.ammoType, count); },
};
  }


_buildMeleeFromInventory(inv, equipSlot) {
  if (!inv) return null;
  const uid = inv.equipped[equipSlot];
  if (!uid) return null;
  const item = inv.items.get(uid);
  if (!item || item.table !== 'melee') return null;
  const def = this.engine.content.get('melee', item.defId);
  if (!def) return null;
  return { item, def, fireCd: 0 };
}

_computeCarriedValue(){
  const inv = this.engine.app ? this.engine.app.inventory : null;
  if (!inv) return 0;
  let total = 0;
  for (const slot of ['main', 'side', 'melee', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig']) {
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
  armor,
  coupling: maxCoup,
  maxCoupling: maxCoup,
  protection: null,
  protectionHold: false,
  limbDamage: 0,
  speedMul: 1,
  charSpec: { prazer: isPrazer, A: spec.A || 0, hp: spec.hp },
  status: new EntityStatus(spec, isPrazer),
  lootInv: new Inventory(this.engine.content) // ★ 新增：敌人自带的库存
};
  body.userData.ref = enemy;

  // ★ 初始化敌人自带的库存（穿枪、穿甲、穿胸挂背包）
  const lootInv = enemy.lootInv;
  const wUid = lootInv.createItem('weapons', spec.weapon, { loadedQty: enemy.weapon.magCap, loadedQueue: [...enemy.weapon.loaded.queue] });
  if (wUid) lootInv.equip('main', wUid);
  
  if (spec.gear && spec.gear.armor) {
    const map = { shell: 'helmetShell', visor: 'helmetVisor', fiber: 'vestFiber', plate: 'vestPlate' };
    for (const s in map) {
      const g = spec.gear.armor[s];
      if (g && g.lv > 0) {
        const aUid = lootInv.createItem(map[s], g.defId);
        if (aUid) lootInv.equip(map[s], aUid);
      }
    }
  }
  
  const chestUid = lootInv.createItem('chestRig', 'large');
  if (chestUid) lootInv.equip('chestRig', chestUid);
  const bagUid = lootInv.createItem('backpack', 'medium');
  if (bagUid) lootInv.equip('backpack', bagUid);
  
  // 往他包里塞点备弹
  if (spec.weapon) {
    const wDef = this.engine.content.get('weapons', spec.weapon);
    if (wDef) {
      const ammoUid = lootInv.createItem('ammo', wDef.ammoType, { qty: 60 });
      if (ammoUid) lootInv.addToContainer('chest', ammoUid);
    }
  }

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

  // ★ 1. 状态机更新（受伤、流血、状态倒计时）
  if (this.player && this.player.status) this.player.status.tick(dt);
  for (const e of this.enemies) { if (e.alive && e.status) e.status.tick(dt); }

  // ★ 2. 玩家更新（只跑一次）
  this._updatePlayer(dt);

  // ★ 3. 状态弹窗检测
  this._checkPlayerEffects(dt);

  // ★ 4. 其他逻辑更新
  this.actionProcess.update(dt);
  this._updateEnemies(dt);
  this._updateSoundSystem(dt);
  this._updateExtracts(dt);
  this._updateContainers(dt);
  this._updateTracers(dt);
  this._updateMobileButtons();

  // ★ 5. 物理同步与渲染
  this.physics.step(dt);
  this._syncMeshes(dt);
  this._updateGlowState(this.player, dt);

  // ★ 6. 相机跟随（活/死互斥）
 if (this.player && this.player.alive) {
  const p = this.player;
  const footY = p.body.position.y - p.body.halfH;
  // 侧身偏移计算
  const leanOff = p.leanOffset || 0;
  const rightX = Math.cos(this.engine.cameraCtl.yaw);
  const rightZ = Math.sin(this.engine.cameraCtl.yaw);
  const camX = p.body.position.x + rightX * leanOff;
  const camZ = p.body.position.z + rightZ * leanOff;

  this.engine.cameraCtl.follow(camX, footY + (p.camHeight || 1.55), camZ);
} else {
  this._updateDeathCamera(dt);
}
  this.hud.update();

  // ★ 7. 时间限制
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
    const dx = g.gamma - this._gyroBase.gamma;
    const dy = g.beta - this._gyroBase.beta;

    if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
      const sens = 3.0 * e.input.gyroSensitivity;
      e.cameraCtl.rotate(dx * sens, dy * sens);
    }
    // ★ 无论是否触发，都更新基准（修死区累积）
    this._gyroBase.gamma = g.gamma;
    this._gyroBase.beta = g.beta;
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

// ★ 状态惩罚：骨折、失血过多、疼痛等
const statusSpeedMul = p.status ? p.status.getMoveSpeedMul() : 1;

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

// ★ 击倒爬行极慢
let downedSpeedMul = 1;
if (p.status && p.status.isDowned()) downedSpeedMul = 0.15;

const finalSpeed = speed * exhaustionMul * statusSpeedMul * downedSpeedMul;
p.body.velocity.x = moveX * finalSpeed;
p.body.velocity.z = moveZ * finalSpeed;
if (isMoving && !this._searching) p.body.wake();

 // ★ 4. 跳跃检测（grounded 标志）
const jumpPressed = e.input.keys.has(' ') || e.input.isActive('jump');
if (jumpPressed && p.body.grounded && p.body.velocity.y <= 0.1) {
  p.body.velocity.y = 9.5;
  p.body.wake();
}

// ★ 战术动作：蹲下
const crouchPressed = e.input.isActive('crouch') || e.input.keys.has('c');
if (crouchPressed && !p.isCrouching && p.body.grounded) {
  p.isCrouching = true;
  p.body.height = 1.6;
  p.body.halfH = 0.8;
} else if (!crouchPressed && p.isCrouching) {
  p.isCrouching = false;
  p.body.height = 2.4;
  p.body.halfH = 1.2;
}

// ★ 战术动作：侧身
let leanTarget = 0;
if (e.input.isActive('lean_left')) leanTarget = -1;
else if (e.input.isActive('lean_right')) leanTarget = 1;
p.leanAmount = (p.leanAmount || 0) + (leanTarget - (p.leanAmount || 0)) * Math.min(1, dt * 10);
p.leanOffset = p.leanAmount * 0.5;

p.ads = e.input.isActive('ads');

// 记录相机基础高度（供 update 主循环读取）
p.camHeight = p.isCrouching ? 1.05 : 1.55;

// ★ 5. 角色朝向始终跟随相机前方
   
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

// ★ 6. 换弹与开火逻辑（击倒状态全面禁用）
const isDowned = p.status && p.status.isDowned();
const reloading = this.actionProcess.isRunning('reload');
if (!this._searching && !isDowned) {
  if (p.fireCd > 0) p.fireCd -= dt;
  const cw = this.currentWeapon;
  if (!reloading && e.input.isActive('fire') && p.fireCd <= 0 && cw) {
  if (cw.isFist || (cw.def && cw.def.melee)) {
    this._meleeAttack(p, cw);
  } else if (cw.mag <= 0) {
    this._startReload();
  } else {
    this._fireWeapon(p, cw, true);
  }
}
}

// ★ 7. 其他输入动作检测（edge-trigger，搜索时禁用）
if (!this._searching && !isDowned) {
  if (this._edge.reload) this._startReload();
  if (this._edge.switchWeapon) this._switchWeapon();
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

  // ★ 击倒状态视觉（半侧倒地视角）
if (isDowned && !p._wasDowned) {
  p._wasDowned = true;
  this._log('严重受损，已丧失行动能力', 'r');
  this.engine.cameraCtl.setDeathPose(Math.PI / 2 * 0.7, 0.6, 0); // 半倾斜
} else if (!isDowned && p._wasDowned) {
  p._wasDowned = false;
  this.engine.cameraCtl.resetDeathPose();
}
// ★ 发出良性声纹（脚步）
const speedSq = p.body.velocity.x * p.body.velocity.x + p.body.velocity.z * p.body.velocity.z;
if (speedSq > 1.0 && p.body.grounded) {
  if (!p._stepTimer) p._stepTimer = 0;
  p._stepTimer -= dt;
  
  if (p._stepTimer <= 0) {
    const isSprinting = speedSq > 25;
    const isWalking = speedSq < 9;
    p._stepTimer = isSprinting ? 0.3 : (isWalking ? 0.6 : 0.45);
    
    let stepIntensity = isSprinting ? 0.8 : 0.4;
    let stepRange = isSprinting ? 20 : 8;
    
    if (p.isCrouching) {
      stepIntensity = 0.05;
      stepRange = 2;
    }
    
    this.emitSound('benign', stepIntensity, stepRange, p.body.position.x, p.body.position.z, 'player', 'player');
  }
}
}

_updateSpeedFeedback(dt, isMoving) {
  const p = this.player;
  const camCtl = this.engine.cameraCtl;
  const cam = this.engine.renderer.camera;
  const sp = this._sprintProgress || 0;

  if (!this._bob) this._bob = { phase: 0 };
  const bobAmp = 0.02 + sp * 0.03;
  const bobFreq = 8 + sp * 4;
  if (isMoving) this._bob.phase += dt * bobFreq;

  const bobY = Math.sin(this._bob.phase * 2) * bobAmp;
  const bobX = Math.cos(this._bob.phase) * bobAmp * 0.3;

  if (camCtl && typeof camCtl.setBob === 'function') {
    camCtl.setBob(bobY, bobX * 0.15);
  }

  if (p.weaponGroup) {
    const swayAmp = 0.005 + sp * 0.015;
    const swayX = Math.cos(this._bob.phase) * swayAmp;
    const swayY = Math.sin(this._bob.phase * 2) * swayAmp * 0.6;
    const baseX = 0.25, baseY = -0.2, baseZ = -0.4;
    p.weaponGroup.position.x += (baseX + swayX - p.weaponGroup.position.x) * 0.2;
    p.weaponGroup.position.y += (baseY + swayY - p.weaponGroup.position.y) * 0.2;
    p.weaponGroup.position.z += (baseZ - p.weaponGroup.position.z) * 0.2;
  }

  // ★ FOV 统一在这里管理：开镜 > 蹲下 > 冲刺
  let targetFov;
  if (p.ads)            targetFov = 45;
  else if (p.isCrouching) targetFov = 55;
  else                  targetFov = 60 + sp * 8;
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

  this._syncWeaponsFromInventory();

  const slots = ['primary', 'secondary', 'melee'];
  const available = slots.filter(s => p.weapons[s] !== null);

  if (available.length === 0) {
    if (p.activeSlot !== 'fist') {
      if (this.actionProcess.isRunning()) {
        if (!this.actionProcess.cancel('切换武器')) return;
      }
      p.activeSlot = 'fist';
      p.fireCd = Math.max(p.fireCd, 0.3);
      this._log('切换至 空手', 'p');
      this._playSFX('switch');
    }
    return;
  }

  if (available.length === 1) {
    if (p.activeSlot === available[0]) return;
    if (this.actionProcess.isRunning()) {
      if (!this.actionProcess.cancel('切换武器')) return;
    }
    p.activeSlot = available[0];
    p.fireCd = Math.max(p.fireCd, 0.3);
    this._playSFX('switch');
    return;
  }

  if (this.actionProcess.isRunning()) {
    if (!this.actionProcess.cancel('切换武器')) return;
  }

  let currentIdx = available.indexOf(p.activeSlot);
  if (currentIdx === -1) currentIdx = -1;
  const nextIdx = (currentIdx + 1) % available.length;
  const nextSlot = available[nextIdx];

  if (p.activeSlot === nextSlot) return;

  p.activeSlot = nextSlot;
  p.fireCd = Math.max(p.fireCd, 0.3);

  const cw = p.activeWeapon;
  if (cw && cw.def) {
    this._log('切换至 ' + this.engine.i18n.t(cw.def.name), 'p');
  }
  this._playSFX('switch');
}

  get currentWeapon(){
  const p = this.player;
  if (!p) return null;
  return p.activeWeapon;
}

  _startReload(){
const p = this.player;
const w = this.currentWeapon;
if (!w || !p.alive) return;
if (w.isFist || (w.def && w.def.melee)) {
  this._log('当前武器无法换弹', 'y');
  return;
}
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
  if (need <= 0) return;

  const inv = this.engine.app.inventory;
  const targets = ['chest', 'pocket', 'bag', 'safe'];
  let loadedCount = 0;

  // ★ 彩虹子弹压入逻辑
  for (const t of targets) {
    if (loadedCount >= need) break;
    const c = inv.containers[t];
    if (!c) continue;
    
    for (const uid of Array.from(c.items.keys())) {
      if (loadedCount >= need) break;
      const it = inv.items.get(uid);
      if (!it || it.table !== 'ammo') continue;
      
      const def = inv.getDef(it);
      if (!def || def.caliber !== w.def.ammoType) continue;
      
      const take = Math.min(it.qty, need - loadedCount);
      
      for(let i=0; i<take; i++) w.item.loaded.queue.push(it.defId);
      w.item.loaded.qty += take;
      loadedCount += take;
      
      it.qty -= take;
      if (it.qty <= 0) inv.destroyItem(uid);
    }
  }
}

_meleeAttack(owner, weapon) {
  if (!weapon || !weapon.def) return;
  const def = weapon.def;
  const range = def.range || 1.5;
  const cooldown = def.cooldown || 0.5;

  owner.fireCd = cooldown;

  const px = owner.body.position.x;
  const pz = owner.body.position.z;
  const yaw = this.engine.cameraCtl.yaw;
  const dirX = Math.sin(yaw);
  const dirZ = -Math.cos(yaw);
  const eyeY = owner.body.position.y + 0.2;

  const hit = this.physics.raycast(
    px, eyeY, pz, dirX, 0, dirZ, range,
    body => body !== owner.body && (body.userData && (body.userData.type === 'enemy' || body.userData.type === 'player'))
  );

  const energy = def.damage || 80;
  const pen = 6;
  const ownerFaction = owner.faction || 'player';

  if (hit) {
    const targetBody = hit.body;
    const hitY = hit.point.y;
    const relY = hitY - targetBody.position.y;
    const hh = targetBody.halfH || 1.2;
    const r = relY / hh;
    let part;
    if (r > 0.5625) part = 'head';
    else if (r > 0.0833) part = 'thorax';
    else if (r > -0.1667) part = 'abdomen';
    else part = 'legs';

    if (targetBody.userData && targetBody.userData.type === 'enemy') {
      const targetEnemy = targetBody.userData.ref;
      if (targetEnemy && this.isHostile(ownerFaction, targetEnemy.spec.faction)) {
        this._damageEnemy(targetEnemy, energy, pen, part, owner === this.player, 'melee');
      }
    } else if (targetBody.userData && targetBody.userData.type === 'player') {
      const targetPlayer = targetBody.userData.ref;
      if (targetPlayer && this.isHostile(ownerFaction, targetPlayer.faction)) {
        this._damagePlayer(targetPlayer, energy, pen, part,
          owner.body.position.x, owner.body.position.z, owner, 'melee');
      }
    }

    this._spawnSpark(hit.point.x, hit.point.y, hit.point.z);
    this._playSFX('hit', { volume: 0.5 });
  }

  if (owner.weaponGroup) {
    const baseZ = -0.4;
    owner.weaponGroup.position.z = baseZ + 0.2;
    setTimeout(() => {
      if (owner.weaponGroup) owner.weaponGroup.position.z = baseZ;
    }, 120);
  }
}


 _fireWeapon(owner, weapon, isPlayer, target){
  if (!weapon || !weapon.def) return;
const def = weapon.def;

// ★ 彩虹子弹：从队列中取出当前一发
let currentAmmoId = def.ammoType;
if (weapon.loaded && weapon.loaded.queue && weapon.loaded.queue.length > 0) {
  currentAmmoId = weapon.loaded.queue.shift();
}
const ammo = this.engine.content.get('ammo', currentAmmoId);
if (!ammo) return;

  if (isPlayer) owner.fireCd = 60 / def.rpm;
else owner.fireCd = 60 / def.rpm * (0.9 + Math.random() * 0.4);
if (weapon.loaded) {
  weapon.loaded.qty = Math.max(0, weapon.loaded.qty - 1);
} else if (typeof weapon.mag === 'number') {
  weapon.mag--;
}
if (isPlayer) this.stats.shots++;

// ★ 1. 动态散布计算（基于开镜、蹲下、状态）
let baseSpread = def.spread || 0.02;
let spread = baseSpread;
if (isPlayer) {
  if (owner.ads) spread *= 0.2; 
  if (owner.isCrouching) spread *= 0.6; 
  if (owner.status && owner.status.hasEffect('pain')) spread *= 1.2;
} else {
  // ★ AI 散布
  const ai = owner.spec && owner.spec.ai ? owner.spec.ai : { composure: 0.5 };
  const composureMul = 1.5 - (ai.composure || 0.5); 
  spread = baseSpread * composureMul;
  
  if (owner.isCrouching) spread *= 0.6;
  if (owner._blindFire) spread *= 3.0;
  if (owner.hitFlash > 0 && (ai.composure || 0.5) < 0.6) spread *= 1.5;
}
    
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
  // ★ 2. 后坐力视觉表现：枪模后缩
  if (owner.weaponGroup) {
    const baseZ = owner.ads ? -0.2 : -0.4;
    owner.weaponGroup.position.z = baseZ + 0.1; // 向后缩
    setTimeout(() => {
      if (owner.weaponGroup) owner.weaponGroup.position.z = baseZ; // 恢复
    }, 50);
  }

  // ★ 3. 视角上抬（后坐力）
  if (this.engine.cameraCtl) {
    const stability = def.stability || 50;
    const recoilAmt = (def.recoil || 20) * 0.00015 * (100 / stability); 
    this.engine.cameraCtl.pitch += recoilAmt;
  }

  const cam = this.engine.renderer.camera;
  const camPos = new THREE.Vector3();
  cam.getWorldPosition(camPos);
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  
  // 计算枪口的绝对世界坐标
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
    const hh = tgtBody ? (tgtBody.halfH || 0.9) : 0.9;

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
  // 发射子弹的动画和声音
this._playSFX('shot_' + def.cls, { volume: 0.6 });

// ★ 增加恶性声纹（枪声）
const soundSource = isPlayer ? 'player' : 'enemy';
const soundFaction = isPlayer ? 'player' : (owner.spec ? owner.spec.faction : 'nipsel');
this.emitSound('malignant', 1.0, def.range ? def.range * 1.5 : 150, owner.body.position.x, owner.body.position.z, soundSource, soundFaction);
}

_raycastBullet(owner, ox, oy, oz, dirX, dirY, dirZ, baseEnergy, range, weaponDef, ammoDef, isPlayer){
  // ★ 只要不是自己，物理上都可以挡住子弹
  const hitFilter = (body) => body !== owner.body && (body.userData?.type === 'enemy' || body.userData?.type === 'player' || body.userData?.type === 'obstacle');

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

// ★ 有效射程（def.range）作为衰减基准，与物理射程上限（range = def.range * 10）解耦
const effectiveRange = weaponDef.range || 100;

// 1. 动能衰减：真实弹道近似为 exp(-k * traveled / effectiveRange)
const energy = CombatSystem.energyAtRange(baseEnergy, actualDist, effectiveRange, decayK);

// 2. 穿透力衰减：超出有效射程 80% 后，每超出一个有效射程降 1 点
const basePen = (ammoDef && typeof ammoDef.pen === 'number') ? ammoDef.pen : 0;
let currentPen = basePen;
if (basePen > 0) {
  const decayStart = effectiveRange * 0.8;
  if (actualDist > decayStart) {
    const over = actualDist - decayStart;
    const decayPen = Math.floor(over / effectiveRange);
    currentPen = Math.max(0, basePen - decayPen);
  }
}
const pen = currentPen;

  if (hit && hit.body.userData.type !== 'obstacle') {
    const targetBody = hit.body;
    const hitY = hit.point.y;
    const relY = hitY - targetBody.position.y;
    const hh = targetBody.halfH || 1.2;

    const r = relY / hh;
    let part;
    if (r > 0.5625) part = 'head';
    else if (r > 0.0833) part = 'thorax';
    else if (r > -0.1667) part = 'abdomen';
    else part = 'legs';

    // ★ 伤害归属判定
    if (hit.body.userData.type === 'enemy') {
      const targetEnemy = hit.body.userData.ref;
      const ownerFaction = owner.faction || (isPlayer ? 'player' : owner.spec.faction);
      const targetFaction = targetEnemy.spec.faction;
      
      // 只有敌对才扣血，否则子弹穿过（直接 return 会导致后面的火花不触发，所以正常结算）
      if (this.isHostile(ownerFaction, targetFaction)) {
        this._damageEnemy(targetEnemy, energy, pen, part, isPlayer);
      }
    } else if (hit.body.userData.type === 'player') {
      // 玩家被击中（目前只有 AI 会走这条线）
      if (!isPlayer) {
        this._damagePlayer(hit.body.userData.ref, energy, pen, part, ox, oz, owner);
      }
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

  let anyArmorActive = false;
  let allPierced = true;
  let mainAbsorbed = 0;

  const applyOne = (piece, layerName) => {
    if (!piece || piece.lv <= 0 || piece.dur <= 0) return null;
    anyArmorActive = true;
    const before = piece.dur;
    const res = CombatSystem.applyArmor(piece, remaining, pen, false);
    remaining = res.remaining;
    if (!res.pierced) allPierced = false;
    if (res.absorbed > 0) {
      const snap = {
        layer: layerName,
        lv: piece.lv,
        absorbed: res.absorbed,
        wear: before - piece.dur,
        broke: piece.dur <= 0,
        pierced: res.pierced,
      };
      if (res.absorbed > mainAbsorbed) {
        mainAbsorbed = res.absorbed;
        snapshot = snap;
      }
      return snap;
    }
    return null;
  };

  if (hitPart === 'head') {
    applyOne(entity.armor.shell, '头盔壳');
    applyOne(entity.armor.visor, '面罩');
  } else if (hitPart === 'thorax' || hitPart === 'abdomen') {
    applyOne(entity.armor.plate, '插板');
    applyOne(entity.armor.fiber, '纤维');
  } else {
    applyOne(entity.armor.fiber, '纤维');
  }

  if (anyArmorActive && !allPierced) {
    remaining *= 0.25;
  }

  return { remaining, snapshot };
}
   
_damageEnemy(enemy, energy, pen, hitPart = 'thorax', byPlayer = true, damageType = 'ballistic'){
  if (!enemy.alive) return;
  if (hitPart === true) hitPart = 'head';
  else if (hitPart === false || hitPart === undefined) hitPart = 'thorax';

  const profile = this.engine.profile;
  const hpBefore = enemy.status.healthQuality;

  let remaining = energy;
  let couplingSnapshot = null;
  let armorSnapshot = null;

  if (enemy.spec && enemy.spec.prazer && enemy.protectionHold && enemy.coupling > 0) {
  const coup = CombatSystem.applyCoupling(enemy, remaining, damageType);
    if (coup.cost > 0) enemy.coupling = Math.max(0, enemy.coupling - coup.cost);
    if (coup.absorbed > 0) couplingSnapshot = { level: enemy.protection || '?', absorbed: coup.absorbed, cost: coup.cost };
    remaining = coup.remaining;
  }

  const armorRes = this._applyArmorLayers(enemy, remaining, pen, hitPart);
  remaining = armorRes.remaining;
  armorSnapshot = armorRes.snapshot;

  const res = enemy.status.takeDamage(hitPart, remaining, pen);
  enemy.hitFlash = 0.15;
  
  // ★ 只有玩家造成的伤害才算入战绩和日志
  if (byPlayer) {
    this.player.dealt += remaining;
    this.stats.hits++;
    this._hitMarker(hitPart === 'head');

    const targetEffs = Array.from(enemy.status.effects.keys()).map(k => {
      const d = this.engine.content.get('effects', k);
      return d ? d.name : k;
    });

    this.combatLog.push({
      type: 'damage_dealt',
      t: this.time,
      target: { name: this.engine.i18n.t(enemy.spec.name), isBoss: false, isElite: false, effects: targetEffs },
      amount: Math.round(remaining),
      part: hitPart,
      weapon: this.currentWeapon ? { name: this.engine.i18n.t(this.currentWeapon.def.name) } : null,
      headshot: hitPart === 'head',
      pierced: pen >= 3,
      armor: armorSnapshot,
      coupling: couplingSnapshot,
      targetHpBefore: hpBefore,
      targetHpAfter: Math.round(enemy.status.healthQuality),
      targetMaxHp: 100,
    });
  }

  if (enemy.status.isDead() && enemy.alive) {
  const dist = Math.round(Math.hypot(this.player.body.position.x - enemy.body.position.x, this.player.body.position.z - enemy.body.position.z));
  this._killEnemy(enemy, remaining, dist);
} else if (enemy.status.isDowned() && enemy.alive && !enemy.isDownedState) {
  enemy.isDownedState = true;
  enemy.mesh.rotation.z = Math.PI / 2;
  enemy.body.height = 0.5;
  enemy.body.halfH = 0.25;
  enemy.body.position.y = 0.25;
  enemy.body.radius = Math.max(enemy.body.radius, 1.8);
  enemy.wasCrouching = enemy.isCrouching;
  enemy.isCrouching = false;
} else if (enemy.alive) {
    // 任何来源的伤害都会触发敌人的受击反击，但来源坐标需要判断是谁打的
    let srcX = this.player.body.position.x;
    let srcZ = this.player.body.position.z;
    AISystem.onHit(this, enemy, hitPart, srcX, srcZ);
  }
}
   
_damagePlayer(player, energy, pen, part = 'thorax', srcX, srcZ, sourceEnt = null, damageType = 'ballistic'){
  if (!player.alive) return;

  if (part === true) part = 'head';
  else if (part === false || part === undefined) part = 'thorax';

  if (!player.status) player.status = new EntityStatus(player.charSpec, player.charSpec ? player.charSpec.prazer : false);

  const profile = this.engine.profile;
  const hpBefore = player.status.healthQuality;

  const coup = CombatSystem.applyCoupling(player, energy, damageType);
  if (coup.cost > 0) player.coupling = Math.max(0, player.coupling - coup.cost);
  const couplingSnapshot = (coup.absorbed > 0) ? { level: player.protection || '?', absorbed: coup.absorbed, cost: coup.cost } : null;
  let remaining = coup.remaining;

  if (srcX !== undefined && srcZ !== undefined) {
    const ang = Math.atan2(srcZ - player.body.position.z, srcX - player.body.position.x);
    this.lastHitDir = ang - this.engine.cameraCtl.yaw;
    this.lastHitTime = this.time;
  }

  const armorRes = this._applyArmorLayers(player, remaining, pen, part);
  remaining = armorRes.remaining;
  const armorSnapshot = armorRes.snapshot;

  player.status.takeDamage(part, remaining, pen);
  player.taken += remaining;

  const sourceWeapon = sourceEnt && sourceEnt.weapon && sourceEnt.weapon.def ? { name: this.engine.i18n.t(sourceEnt.weapon.def.name) } : null;
  const selfEffs = Array.from(player.status.effects.keys()).map(k => {
    const d = this.engine.content.get('effects', k);
    return d ? d.name : k;
  });

  this.combatLog.push({
    type: 'damage_taken',
    t: this.time,
    source: sourceEnt ? { name: this.engine.i18n.t(sourceEnt.spec ? sourceEnt.spec.name : '敌人'), weapon: sourceWeapon, effects: [] } : { name: '未知', effects: [] },
    amount: Math.round(remaining),
    part: part,
    pierced: pen >= 3,
    armor: armorSnapshot,
    coupling: couplingSnapshot,
    hpBefore: hpBefore,
    hpAfter: Math.round(player.status.healthQuality),
    maxHp: 100,
    bleeding: player.status.hasEffect('bleeding'),
    effects: selfEffs,
  });

  this._spawnDamageNumber(player.body.position.x, player.body.position.z, Math.round(remaining), 'player');
  this._hurtFX();
  this.engine.cameraCtl.shake(0.4, 0.15);
  this._playSFX('hurt', { volume: 0.5 });

  if (this._searching) { this._closeSearch(); this._log('搜索被打断', 'r'); }
  if (this.actionProcess.isRunning()) this.actionProcess.cancel('受伤');

  if (player.status.isDead() && player.alive) {
    this._playerDown();
  } else if (player.status.isDowned() && player.alive && !player.isDownedState) {
    player.isDownedState = true;
    this._log('严重受损，进入击倒状态', 'r');
    this.engine.cameraCtl.setDeathPose(Math.PI / 2 * 0.8, 0.8, 0);
  }
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

     // ★ 尸体生成：同步当前装备状态，并生成实体模型
  if (enemy.lootInv) {
    const wUid = enemy.lootInv.equipped.main;
    if (wUid && enemy.weapon.loaded) {
      const wItem = enemy.lootInv.items.get(wUid);
      if (wItem) {
        wItem.loaded.qty = enemy.weapon.loaded.qty;
        wItem.loaded.queue = [...enemy.weapon.loaded.queue];
      }
    }
    
    const armorMap = { shell: 'helmetShell', visor: 'helmetVisor', fiber: 'vestFiber', plate: 'vestPlate' };
    for (const slot in armorMap) {
      const uid = enemy.lootInv.equipped[armorMap[slot]];
      if (uid && enemy.armor[slot]) {
        const aItem = enemy.lootInv.items.get(uid);
        if (aItem) aItem.dur = enemy.armor[slot].dur;
      }
    }

// ★ 尸体生成：同步当前装备状态，并生成实体模型
if (!enemy.lootInv) {
  enemy.lootInv = new Inventory(this.engine.content);
}

if (enemy.lootInv) {
  const wUid = enemy.lootInv.equipped.main;
  if (wUid && enemy.weapon.loaded) {
    const wItem = enemy.lootInv.items.get(wUid);
    if (wItem) {
      wItem.loaded.qty = enemy.weapon.loaded.qty;
      wItem.loaded.queue = [...enemy.weapon.loaded.queue];
    }
  }
  
  const armorMap = { shell: 'helmetShell', visor: 'helmetVisor', fiber: 'vestFiber', plate: 'vestPlate' };
  for (const slot in armorMap) {
    const uid = enemy.lootInv.equipped[armorMap[slot]];
    if (uid && enemy.armor[slot]) {
      const aItem = enemy.lootInv.items.get(uid);
      if (aItem) aItem.dur = enemy.armor[slot].dur;
    }
  }

  const lx = enemy.body.position.x;
  const lz = enemy.body.position.z;
  const lootMesh = this.engine.meshes.build('container', { color: 0xaa4444 }); 
  lootMesh.position.set(lx, 0, lz);
  this.engine.renderer.scene.add(lootMesh);

  const corpseObj = {
    x: lx,
    z: lz,
    mesh: lootMesh,
    label: this.engine.i18n.t(enemy.spec.name) + ' 的尸体',
    isCorpse: true,
    lootInv: enemy.lootInv,
    grid: null,
    searched: true
  };
  this.groundLoots.push(corpseObj);
  this.pois.push({ x: lx, z: lz, type: 'container', color: '#ff5555' });
}
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
    // ★ 新增：退出战局时关闭 bagUI
if (this.engine.app && this.engine.app.bagUI && this.engine.app.bagUI.open) {
  this.engine.app.bagUI.close();
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
      // ★ 只要在距离内，随时可以打开（哪怕是空的，或者是尸体）
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
  if (p) {
    const slotCount = ['primary', 'secondary', 'melee'].filter(s => p.weapons[s] !== null).length;
    switchBtn.style.opacity = slotCount > 1 ? '1' : '0.4';
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
  const gridEmpty = !c.grid || c.grid.items.size === 0;
  if (c.searched && c.revealed && c.revealed.length === 0 && (!c.loot || c.loot.length === 0) && gridEmpty) {
    this._log('容器已空', 'y');
    return;
  }

  if (c.isCorpse) {
    if (!c.lootInv) {
      c.lootInv = new Inventory(this.engine.content);
    }
    this.engine.app.bagUI.openLoot(c);
    return;
  }

  const inv = this.engine.app.inventory;

  if (!c.grid) {
    c.grid = new GridContainer(8, 6);
    inv.containers.loot = c.grid;

    let items = [];
    if (c.loot && c.loot.length > 0) items = c.loot;
    else if (c.revealed && c.revealed.length > 0) items = c.revealed;
    else if (!c.searched) items = this._generateLootSpecs();

    for (const spec of items) {
      const extras = { searched: false, qty: spec.qty || 1 };
      if (spec.extras) Object.assign(extras, spec.extras);
      if (spec.dur !== undefined) extras.dur = spec.dur;
      if (spec.loaded && spec.loaded.qty !== undefined) extras.loadedQty = spec.loaded.qty;
      if (spec.loadedQueue) extras.loadedQueue = spec.loadedQueue;
      if (spec.attachments) extras.attachments = spec.attachments;

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

   _checkPlayerEffects(dt) {
  const p = this.player;
  if (!p || !p.status) return;

  if (!this._lastEffectsSet) this._lastEffectsSet = new Set();

  const curSet = new Set();
  for (const [id, eff] of p.status.effects) {
    curSet.add(id);
    // 如果是新出现的状态
    if (!this._lastEffectsSet.has(id)) {
      const def = this.engine.content.get('effects', id);
      if (def) {
        const isPositive = (id === 'moving_speed_up' || id === 'aim_buff');
        this._showEffectPopup(def.name, def.icon, isPositive);
      }
    }
  }
  this._lastEffectsSet = curSet;
}

  _showEffectPopup(name, icon, isPositive) {
  let container = document.getElementById('effect-popups');
  if (!container) {
    container = document.createElement('div');
    container.id = 'effect-popups';
    container.style.cssText = 'position:absolute; left:50%; bottom:220px; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:6px; pointer-events:none; z-index:60;';
    const hud = document.getElementById('hud');
    if (hud) { hud.appendChild(container); } else { document.body.appendChild(container); }
  }
  
  const el = document.createElement('div');
  const bg = isPositive ? 'rgba(80,200,120,.9)' : 'rgba(200,50,50,.9)';
  const border = isPositive ? 'rgba(120,255,160,.8)' : 'rgba(255,100,100,.8)';
  el.style.cssText = 'padding:6px 16px; background:' + bg + '; border:1px solid ' + border + '; border-radius:6px; color:#fff; font-size:13px; font-weight:700; letter-spacing:1px; box-shadow:0 4px 12px rgba(0,0,0,.5); opacity:0; transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform:translateY(20px) scale(0.9); display:flex; align-items:center; gap:6px;';
  el.innerHTML = `<span>${icon}</span><span>${name}</span>`;
  container.appendChild(el);
  
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0) scale(1)';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-20px) scale(0.9)';
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }, 2500);
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
  const consuming = cur < last - 0.0001;
  entity._lastCoupling = cur;

  if (consuming) {
    entity._glowTimer = 0.2; // 粘滞 0.2s
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

// ★ 阵营判定
isHostile(factionA, factionB) {
  if (!factionA || !factionB) return true;
  if (factionA === factionB) return false;
  return true; // 非同阵营即敌对
}

// ★ 发出声纹
emitSound(type, intensity, maxRange, x, z, source = 'enemy', faction = 'nipsel') {
  this.soundEvents.push({
    type, intensity, maxRange,
    x, z, source, faction, // ★ 带上阵营
    life: 0.5,
    maxLife: 0.5
  });
}

// ★ 更新声纹系统
_updateSoundSystem(dt) {
  for (let i = this.soundEvents.length - 1; i >= 0; i--) {
    this.soundEvents[i].life -= dt;
    if (this.soundEvents[i].life <= 0) {
      this.soundEvents.splice(i, 1);
    }
  }

  for (const e of this.enemies) {
    if (!e.alive) continue;
    const ai = e.spec.ai || { perception: 0.5 };
    const eFaction = e.spec.faction;
    const earRange = 20 + ai.perception * 40; 

    for (const s of this.soundEvents) {
      // 不听自己发出的声音
      if (s.source === 'enemy' && Math.hypot(s.x - e.body.position.x, s.z - e.body.position.z) < 1.0) continue;
      if (e.state === 'combat' || e.state === 'flee') continue;

      const dist = Math.hypot(e.body.position.x - s.x, e.body.position.z - s.z);
      if (dist > earRange || dist > s.maxRange) continue;

      const isEnemySound = this.isHostile(eFaction, s.faction);
      const heardIntensity = s.intensity * (1 - dist / s.maxRange);
      
      if (heardIntensity > 0.15) {
        if (isEnemySound) {
          // 敌对声音，大幅提升警觉，并可能去调查
          e.awareness = Math.min(1.0, e.awareness + heardIntensity * (s.type === 'malignant' ? 0.8 : 0.4));
          if (e.awareness > 0.3 && e.state === 'patrol') {
            e.state = 'investigate';
            e.targetPos = { x: s.x, z: s.z };
          }
        } else {
          // 同阵营声音，小幅提升警觉，但不调查
          e.awareness = Math.min(1.0, e.awareness + heardIntensity * 0.2);
        }
      }
    }
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
      if (e.deathTimer !== undefined && e.deathTimer > 0) {
        e.deathTimer -= dt;
        const total = e.deathTotal || 0.6;
        const t = Math.min(1, 1 - Math.max(0, e.deathTimer) / total);
        const et = 1 - Math.pow(1 - t, 3);
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

    if (e.isDownedState) {
      e.mesh.position.set(e.body.position.x, 0.18, e.body.position.z);
      e.mesh.rotation.z = Math.PI / 2;
      e.mesh.rotation.y = Math.PI / 2 - e.angle;
    } else {
      e.mesh.position.set(e.body.position.x, e.body.footY, e.body.position.z);
      e.mesh.rotation.y = Math.PI / 2 - e.angle;
      e.mesh.rotation.z = 0;
    }

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
   // ★ 新增：死亡时关闭 bagUI
if (this.engine.app && this.engine.app.bagUI && this.engine.app.bagUI.open) {
  this.engine.app.bagUI.close();
}
  const _sp = document.getElementById('search-panel');
  if (_sp) _sp.classList.remove('on');
  
  // ★ 核心修复：强制停止换弹动作并清除 UI
  if (this.actionProcess) {
    this.actionProcess.cancel('退出战局', true);
  }
  const _ap = document.getElementById('action-progress');
  if (_ap) _ap.classList.remove('on');
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
      credits: 5000, // 默认给点钱方便测试市场
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
  
  // ★ 初始化市场
  import('./market.js').then(({ MarketSystem }) => {
    this.market = new MarketSystem(this.engine);
  });
}

        _setupMenu(){
  const e = this.engine;
  const i18n = e.i18n;

  // Tab 切换
  document.querySelectorAll('.menu-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('on'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('on'));
      tab.classList.add('on');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('on');
    };
  });

  this._renderOptions('map-options', e.content.all('maps'), (i) => i.id === this.menuState.map, (i) => ({ title: i18n.t(i.name), sub: `${i.size}m²`, value: i.id }), (i) => { this.menuState.map = i.id; });
  this._renderOptions('char-options', e.content.all('characters'), (i) => i.id === this.menuState.char, (i) => ({ title: i18n.t(i.name), sub: i18n.t(i.tag), value: i.id }), (i) => { this.menuState.char = i.id; });
  this._renderOptions('profile-options', e.profile.list(), (i) => i.id === this.menuState.profile, (i) => ({ title: i18n.t(i.name), sub: i18n.t(i.desc || ''), value: i.id }), (i) => { this.menuState.profile = i.id; e.profile.setProfile(i.id); this._updateDifficultyDisplay();this._syncCustomSettingsUI(); });

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
  e.profile.setProfile(this.menuState.profile);
// ★ 恢复持久化的灵敏度
const savedSens = e.profile.get('input.sensitivity', 1.0);
if (e.cameraCtl) e.cameraCtl.sensitivity = savedSens;
  this._updateDifficultyDisplay();
  e.profile.onChange(() => { this._updateDifficultyDisplay(); this._syncCustomSettingsUI(); });
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
      (data.sub ? `<div class="opt-sub">${data.sub}</div>` : '');
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

  // 模态框关闭
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.onclick = () => document.getElementById(btn.dataset.close).classList.remove('on');
  });

  // 打开设置
  document.getElementById('btn-settings').onclick = () => document.getElementById('settings-modal').classList.add('on');

  // 打开市场
  document.getElementById('btn-market').onclick = () => {
    this._renderMarketList();
    document.getElementById('market-modal').classList.add('on');
  };

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
      if (!inBoot) { ev.preventDefault(); this.bagUI.toggle(); }
    }
  });

  e.i18n.onLanguageChange(() => {
    if (this._menuReady) {
      this._setupMenu();
      if (this.world) this.world.hud.update();
    }
  });
  
  // 语言切换按钮
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      this.setLanguage(btn.dataset.lang);
    };
  });
  
  // 陀螺仪设置事件绑定
  const gyroBtn = document.getElementById('btn-gyro-toggle');
  const gyroStatus = document.getElementById('gyro-status');
  const gyroSens = document.getElementById('gyro-sensitivity');
  const gyroSensVal = document.getElementById('gyro-sens-val');

  if (gyroBtn) {
    gyroBtn.addEventListener('click', async () => {
      if (e.input.gyroEnabled) {
        e.input.gyroEnabled = false;
        gyroStatus.textContent = '未开启';
      } else {
        try {
          if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            const state = await DeviceOrientationEvent.requestPermission();
            if (state === 'granted') {
              e.input.enableGyro();
              gyroStatus.textContent = '已启用';
            } else {
              gyroStatus.textContent = '拒绝';
            }
          } else {
            e.input.enableGyro();
            gyroStatus.textContent = '已启用';
          }
        } catch (err) { gyroStatus.textContent = '不支持'; }
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

   _renderMarketList() {
   const el = document.getElementById('market-list');
  if (!el) return;
  if (!this.market) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:#5c82a8">市场加载中…</div>';
    setTimeout(() => this._renderMarketList(), 200);
    return;
  }
  
  const content = this.engine.content;
  const tables = ['weapons', 'ammo', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig'];
  let html = '';
  
  for (const t of tables) {
    for (const item of content.all(t)) {
      if (!item.value) continue;
      const price = this.market.getPrice(t, item.id);
      const name = this.engine.i18n.t(item.name);
      
      html += `<div class="market-item">
        <div class="market-info">
          <span class="market-name">${name}</span>
          <span class="market-price">${price} cp</span>
        </div>
        <button class="market-buy" data-table="${t}" data-id="${item.id}" data-price="${price}">购买</button>
      </div>`;
    }
  }
  el.innerHTML = html;
  
  el.querySelectorAll('.market-buy').forEach(btn => {
    btn.onclick = () => {
      const r = this.market.buy(btn.dataset.table, btn.dataset.id);
      if (r.ok) alert('购买成功，已存入仓库。');
      else alert('购买失败：' + r.reason);
    };
  });
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
    if (data.flags.initialInventoryGiven === true) return;
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

  const fixLoaded = (slotName) => {
    const uid = inv.equipped[slotName];
    if (!uid) return;
    const item = inv.items.get(uid);
    if (!item || item.table !== 'weapons') return;
    if (!item.loaded) {
      const wDef = this.engine.content.get('weapons', item.defId);
      if (wDef) item.loaded = { ammoType: wDef.ammoType, qty: 0, queue: [] };
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
  for (const slot of ['main', 'side', 'melee', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig']) {
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
      for (const slot of ['main', 'side', 'melee', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig']) {
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
} else if (name === 'skill1') {
  if (this.world) this.world._useSkill(0);
} else if (name === 'skill2') {
  if (this.world) this.world._useSkill(1);
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
// ★ 移除 pointerleave 的强制释放，防止按住战术按钮时手指滑出导致动作断断续续
// 如果手指按住后滑出，直到抬起（pointerup）才会取消动作
    }

    this._mobileButtons[name] = el;
    container.appendChild(el);
  }
}
 
}
