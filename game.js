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
  // 1 点护具耐久对应的“被护具吸收的能量”。40J/点 → 100 耐久约吸收 4kJ，
  // 约相当于 Level IV 插板承受 2~3 发 5.56 的吸能量级。
  ARMOR_J_PER_DUR: 40,
  RANGE_DECAY: 0.25,
  RANGE_DECAY_REALISTIC: 0.50,
  MELEE_RANGE: 3,
  MELEE_DAMAGE: 60,
  COUPLING_REGEN_IDLE: 4.0,
  COUPLING_REGEN_LONG: 2.0,
  COUPLING_REGEN_DELAY: 1.0,
  COUPLING_LONG_THRESHOLD: 10.0,
  PROTECT_DRAIN: { L1: 0.6, L2: 1.5, L3: 2.5 },
  PROTECT_ABSORB: { L1_MELEE: 1.0, L2_BALLISTIC: 0.86, L3_BALLISTIC: 0.8 },
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
    label: '攻击',
    mobile: { right: '20px', bottom: '100px', size: 76, color: 'rgba(255,80,80,.4)', border: 'rgba(255,100,100,.8)', mode: 'hold', rotate: true },
  },
  reload: {
    keys: ['r'],
    label: '换弹',
    mobile: { right: '102px', bottom: '112px', size: 58, color: 'rgba(200,200,200,.3)', border: 'rgba(255,255,255,.6)', mode: 'hold' },
  },
  fireMode: {
    keys: ['v'],
    label: '开火模式',
  },
  holdBreath: {
    keys: ['h'],
    label: '屏息',
    mobile: { left: '128px', bottom: '246px', size: 45, color: 'rgba(120,200,255,.3)', border: 'rgba(150,220,255,.6)', mode: 'hold' },
  },
  throw: {
    keys: ['g'],
    label: '投掷',
    // ★ 不再常驻独立投掷键：先选投掷物（轮盘/背包），攻击键自动变为投掷
  },
  armThrow: {
    keys: ['j'],
    label: '解除保险',
  },
  throwWheel: {
    keys: ['t'],
    label: '投掷轮盘',
    mobile: { left: '20px', bottom: '246px', size: 45, color: 'rgba(255,170,60,.3)', border: 'rgba(255,200,90,.65)', mode: 'click' },
  },
  medWheel: {
    keys: ['n'],
    label: '医疗轮盘',
    mobile: { left: '72px', bottom: '246px', size: 45, color: 'rgba(90,220,160,.3)', border: 'rgba(120,255,190,.65)', mode: 'click' },
  },
  squadAdvance: { keys: ['p'], label: '建议前进' },
  squadRetreat: { keys: ['o'], label: '建议撤退' },
  allyCare: { keys: ['u'], label: '救治队友' },
  droneControl: {
    keys: ['y'],
    label: '无人机操控',
    mobile: { left: '124px', bottom: '348px', size: 48, color: 'rgba(80,200,255,.3)', border: 'rgba(120,220,255,.7)', mode: 'click' },
  },
  jump: {
    keys: [' '],
    label: '跳跃',
    mobile: { right: '196px', bottom: '38px', size: 60, color: 'rgba(80,255,150,.4)', border: 'rgba(100,255,150,.8)', mode: 'hold' },
  },
    switchWeapon: {
  keys: ['f'],
  label: '切枪',
  mobile: { right: '20px', bottom: '268px', size: 55, color: 'rgba(160,120,255,.35)', border: 'rgba(180,140,255,.7)', mode: 'click' },
},
  bag: {
    keys: ['b'],
    label: '背包',
    mobile: { right: '82px', bottom: '268px', size: 55, color: 'rgba(80,140,255,.35)', border: 'rgba(120,180,255,.7)', mode: 'click' },
  },
  protectL1:    { keys: ['['], label: '防护 L1' },
protectL2:    { keys: [']'], label: '防护 L2' },
protectL3:    { keys: ['\\'], label: '防护 L3' },
hazardAction:{ keys: ['k'], label: '拔除/灭火' },
  tailStrike: {
    keys: ['m'],
    label: '尾击',
    mobile: { right: '196px', bottom: '100px', size: 54, color: 'rgba(255,190,80,.32)', border: 'rgba(255,210,120,.75)', mode: 'click' },
  },
   weaponSlot1: { keys: ['1'], label: '武器一' },
weaponSlot2: { keys: ['2'], label: '武器二' },
weaponSlot3: { keys: ['3'], label: '副武器' },
weaponSlot0: { keys: ['0'], label: '空手' },
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
  mobile: { right: '112px', bottom: '38px', size: 55, color: 'rgba(150,150,150,.3)', border: 'rgba(255,255,255,.5)', mode: 'hold', rotate: true },
},
ads: {
  mouse: 'right',
  label: '开镜',
  mobile: { right: '20px', bottom: '188px', size: 55, color: 'rgba(50,150,255,.3)', border: 'rgba(100,180,255,.6)', mode: 'hold', rotate: true },
},
lean_left: {
  keys: ['z'],
  label: '左倾',
  mobile: { left: '20px', bottom: '192px', size: 45, color: 'rgba(100,100,100,.3)', border: 'rgba(200,200,200,.5)', mode: 'hold', rotate: true },
},
lean_right: {
  keys: ['x'],
  label: '右倾',
  mobile: { left: '72px', bottom: '192px', size: 45, color: 'rgba(100,100,100,.3)', border: 'rgba(200,200,200,.5)', mode: 'hold', rotate: true },
},
skill1: {
  keys: ['q'],
  label: '',
  mobile: { right: '16px', bottom: '340px', size: 45, color: 'rgba(160,120,255,.3)', border: 'rgba(180,140,255,.6)', mode: 'click' },
},
skill2: {
  keys: ['e'],
  label: '',
  mobile: { right: '72px', bottom: '340px', size: 45, color: 'rgba(160,120,255,.3)', border: 'rgba(180,140,255,.6)', mode: 'click' },
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

  // 防护系数以 content.js 的 armor 表为单一真相源；没有 red 时才回退旧等级表。
  // 旧表与 content 不一致（例如 lv2 0.25 vs 0.38），会凭空改变真实防护。
  const baseSpec = { 1: 0.22, 2: 0.38, 3: 0.52, 4: 0.64, 5: 0.74, 6: 0.95, 7: 0.99 };
  const lv = armorItem.lv;
  const baseRed = (typeof armorItem.red === 'number') ? armorItem.red : (baseSpec[lv] || 0.99);

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

  // 钝击传导由 _applyArmorLayers 按层处理；这里只返回穿透护具后的能量，
  // 避免再出现一个隐藏的 ×0.25 双重语义。
  const finalDamage = afterArmor;

  const wear = Math.min(armorItem.dur, absorbed / COMBAT.ARMOR_J_PER_DUR);
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
    } else if (type === 'explosion') {
      // 破片同样属于可被耦合场偏转的动能；L2/L3 提供较低比例的防护
      if (player.protection === 'L2') mult = 0.42;
      else if (player.protection === 'L3') mult = 0.58;
    } else if (type === 'blast') {
      // 超压不能被完全挡下，但耦合场可以削掉一部分峰值
      if (player.protection === 'L2') mult = 0.22;
      else if (player.protection === 'L3') mult = 0.32;
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
// 每部位最多伤口数 / 伤口等级上限 / 燃烧档位上限
const MAX_WOUNDS_PER_PART = 3;
const MAX_WOUND_LEVEL = 4;
const MAX_BURN_LEVEL = 3;

class EntityStatus {
  constructor(entity, isPrazer) {
    this.entity = entity;
    this.isPrazer = isPrazer;
    this.maxBlood = isPrazer ? 6000 : 5000; // 血量单位：毫升(ml)
    this.blood = this.maxBlood;
    
    this.parts = {};
    for (const p in PART_MAX_HP) {
      this.parts[p] = { hp: PART_MAX_HP[p], maxHp: PART_MAX_HP[p], wounds: [], fracture: 0 };
    }
    
    this.effects = new Map();
    // ★ 燃烧按部位记录：只有接触火/被点燃的部位先着火，之后才可能扩散
    this.burningParts = {};
    this._burnSpreadT = 0;
    // ★ 包扎/手术封堵的流血等级：伤口本身不会消失，但外部出血被压住。
    //   新伤口会让总等级上升，封堵量不变，于是又会重新流血。
    this.bleedSeal = 0;
    // ★ 近期止痛药服用时间戳：用于判断重复用药/过量（只在运行时存在）
    this.painkillerDoses = [];
    this.healthQuality = 100;
  }

  addEffect(id, duration, strength, awareness = 0) {
    const existing = this.effects.get(id);
    if (existing) {
      // 刷新型效果（技能每帧续 0.25s）保留最初的总时长，用于 UI 透明度；
      // 持续效果标记 persistent，避免被误判为“快结束”。
      if (duration > existing.duration) existing.duration = duration;
      existing.strength = Math.max(existing.strength, strength);
      if (duration <= 0.6 && existing.maxDuration >= 2) existing.persistent = true;
      existing.maxDuration = Math.max(existing.maxDuration || duration, duration);
    } else {
      this.effects.set(id, {
        id, duration, strength, awareness,
        maxDuration: Math.max(duration, 0.01),
        persistent: false,
        bornAt: this._now || 0,
      });
    }
  }

  removeEffect(id) {
    if (id === 'burning') this.burningParts = {};
    this.effects.delete(id);
  }
  hasEffect(id) { return this.effects.has(id); }

  // ★ 部位伤口对象：数量有限制、等级有限制
  addWound(part, level) {
    const p = this.parts[part];
    if (!p) return;
    level = Math.max(1, Math.min(MAX_WOUND_LEVEL, level | 0));
    if (!p.wounds) p.wounds = [];
    if (p.wounds.length < MAX_WOUNDS_PER_PART) {
      p.wounds.push({ level });
    } else {
      // 已达上限：只提升最低等级伤口，避免"一个手几十个伤口"
      let minIdx = 0;
      for (let i = 1; i < p.wounds.length; i++) {
        if (p.wounds[i].level < p.wounds[minIdx].level) minIdx = i;
      }
      if (p.wounds[minIdx].level < level) p.wounds[minIdx].level = level;
    }
    p.wound = Math.max(p.wound || 0, level); // 兼容旧字段：最大伤口等级
  }

  // 全身伤口总等级（用于流血）：同一部位多个伤口也要累加，
  // 否则打出一个 4 级伤口后，后续伤口不会让出血更快。
  totalWoundLevel() {
    let s = 0;
    for (const k in this.parts) {
      const p = this.parts[k];
      if (p.wounds && p.wounds.length) {
        for (const w of p.wounds) s += w.level;
      } else {
        s += (p.wound || 0);
      }
    }
    return s;
  }

  // 真正参与出血计算的等级 = 伤口总等级 - 已包扎封堵量
  effectiveBleedLevel() {
    return Math.max(0, this.totalWoundLevel() - (this.bleedSeal || 0));
  }

  // 包扎/手术：封堵指定等级的出血，不超过当前总伤口等级
  sealBleeding(levels) {
    const total = this.totalWoundLevel();
    this.bleedSeal = Math.min(total, (this.bleedSeal || 0) + Math.max(0, levels || 0));
    return this.bleedSeal;
  }

  // 止痛：疼痛相关惩罚是否被压制
  painSuppressed() {
    return this.effects.has('painkiller');
  }

  // ★ 点燃：只有接触火焰的部位先着火；等级越高，后续扩散越快
  ignite(part, strength) {
    if (!this.parts[part]) part = 'legs';
    const lv = Math.max(1, Math.min(MAX_BURN_LEVEL, strength | 0));
    this.burningParts[part] = Math.max(this.burningParts[part] || 0, lv);
    this.addEffect('burning', 12, lv);
    const total = Object.values(this.burningParts).reduce((a, b) => a + b, 0);
    const eff = this.effects.get('burning');
    if (eff) eff.strength = Math.max(1, total);
  }

  takeDamage(part, energy, pen) {
    if (!this.parts[part]) part = 'thorax';
    if (part === 'rarm') part = 'larm'; 
    if (part === 'lleg' || part === 'rleg') part = 'legs';

    const p = this.parts[part];
    if (!p) return;

    // ★ 核心仿真：直接用动能扣除部位血量
    p.hp = Math.max(-p.maxHp * 2, p.hp - energy);

    // 伤口等级判定 → 作为部位伤口对象附加
    let newWound = 0;
    for (let i = 1; i < WOUND_ENERGY_THRESHOLD.length; i++) {
      if (energy >= WOUND_ENERGY_THRESHOLD[i]) newWound = i;
    }

    // 瞬时空腔/血管破裂造成的即时失血：
    // 与动能、伤口等级、部位血管密度相关。旧版 0.08 系数下，5.56 胸部只掉约 4% 血，
    // 玩家几乎看不到“中枪瞬间大量失血”，这里提高即时失血并保留部位差异。
    const vascularity = { head: 1.4, thorax: 1.2, abdomen: 1.15, larm: 0.55, legs: 0.6 }[part] || 0.7;
    const instantBleed = energy * 0.18 * vascularity + newWound * 35;
    this.blood = Math.max(0, this.blood - instantBleed);

    if (newWound > 0) {
      this.addWound(part, newWound);
      // 持续流血：按全身伤口总等级，更致命
      this.addEffect('bleeding', 999, this.totalWoundLevel());
      // 疼痛由 tick 按“伤口是否还在”持续刷新；这里先给一个短时触发，让受击瞬间立刻生效
      this.addEffect('pain', 20, 1);
    }
    
    // 骨折判定（部位被彻底摧毁）
    if (p.hp <= 0 && p.fracture === 0) {
      p.fracture = 1; // 骨折
      this.addEffect('fracture', 999999, 1);
    } else if (p.hp <= -p.maxHp && p.fracture === 1) {
      p.fracture = 2; // 粉碎性骨折
      this.addEffect('fracture', 999999, 2);
    }

    this.updateOverallHealth();
    return { hp: p.hp, wound: p.wound, fracture: p.fracture };
  }

  tick(dt) {
    if (this.isDead()) { this.blood = 0; this.updateOverallHealth(); return; }
    // 1. 伤口持续流血（按“未封堵”的伤口总等级驱动；包扎只能压住，不能凭空愈合）
    const totalWound = this.totalWoundLevel();
    const bleedLevel = this.effectiveBleedLevel();
    if (bleedLevel > 0) this.addEffect('bleeding', 999, bleedLevel);
    else this.removeEffect('bleeding');
    let bleedRate = bleedLevel * 40; // 每秒每级伤口流 40ml；高等级伤口会明显快速失血

    // 玻纤滞留：急性（剧痛+大出血）/ 慢性（永久轻度）
    // ★ 玻纤的出血应明显快于旧版 26ml/s，但低于大块肌肉创伤的 160ml/s；
    //   5.56 GF 为急性 2 级、手枪 GF 为 1 级，所以按强度拉开差距。
    if (this.hasEffect('fiber_acute')) {
      const fa = this.effects.get('fiber_acute');
      const sev = Math.max(1, Math.min(3, (fa && fa.strength) || 1));
      bleedRate += 50 + (sev - 1) * 14; // 50 / 64 / 78 ml/s
    } else if (this.hasEffect('fiber_chronic')) {
      bleedRate += 10;
    }
    // 队长被动「直觉与回忆」的闪回：失血速度小幅增加
    if (this.hasEffect('flashback')) bleedRate *= 1.18;
    // 「Hate」反噬：不直接改 bleed，而是让伤口更痛、更难止血（这里表现为出血增加）
    if (this.hasEffect('hate_backlash')) bleedRate *= 1.12;

    // 2. 燃烧：只烧“真正着火的部位”，等级越高的部位越疼；4 秒后才向相邻部位扩散。
    //    旧版每帧随机挑一个部位，可能两秒内连续烧到头，造成不合理的瞬间骨折/死亡。
    const burn = this.effects.get('burning');
    if (burn) {
      let totalLv = 0;
      for (const [pt, lv] of Object.entries(this.burningParts)) {
        const pp = this.parts[pt];
        if (!pp) continue;
        totalLv += lv;
        // 局部灼烧：约 22J/s/级。2 级火在 10 秒左右就能烧穿肌肉/皮肤，
        // 持续灼烧会继续破坏到骨骼，但不再像旧版几秒内直接烧死。
        const dmg = lv * 22 * dt;
        pp.hp = Math.max(-pp.maxHp * 2, pp.hp - dmg);
        this.blood = Math.max(0, this.blood - lv * 4 * dt);
        this.addEffect('pain', 4, Math.min(3, lv));
        if (pp.hp <= 0 && pp.fracture === 0) {
          pp.fracture = 1;
          this.addEffect('fracture', 999999, 1);
        }
        // 持续灼烧到组织完全炭化：从闭合性骨折升级为粉碎性/骨结构破坏
        if (pp.hp <= -pp.maxHp && pp.fracture < 2) {
          pp.fracture = 2;
          this.addEffect('fracture', 999999, 2);
        }
      }
      if (totalLv <= 0) {
        this.burningParts = {};
        this.effects.delete('burning');
        this.removeEffect('burnShock');
      } else {
        burn.strength = Math.max(1, totalLv);
        // 火势随燃烧时间升级：衣物/脂肪开始持续燃烧，约每 4 秒升一级（上限 3）
        this._burnRampT = (this._burnRampT || 0) + dt;
        if (this._burnRampT >= 4 && totalLv < 6) {
          this._burnRampT = 0;
          let maxPt = null, maxLv = 0;
          for (const [pt, lv] of Object.entries(this.burningParts)) {
            if (lv > maxLv) { maxLv = lv; maxPt = pt; }
          }
          if (maxPt && maxLv < 3) this.burningParts[maxPt] = maxLv + 1;
        }
        this._burnSpreadT = (this._burnSpreadT || 0) + dt;
        if (this._burnSpreadT >= 4.5) {
          this._burnSpreadT = 0;
          // 火势从高等级部位向相邻部位缓慢扩散，每次只降一级
          const adjacent = {
            legs: ['abdomen'], abdomen: ['thorax', 'legs'],
            thorax: ['abdomen', 'head'], head: [], larm: ['thorax'],
          };
          for (const [pt, lv] of Object.entries(this.burningParts)) {
            if (lv < 2) continue;
            for (const to of (adjacent[pt] || [])) {
              if (this.burningParts[to]) continue;
              this.burningParts[to] = Math.max(1, lv - 1);
              burn.strength = Object.values(this.burningParts).reduce((a, b) => a + b, 0);
              break;
            }
          }
        }
        // 大面积烧伤 → 烧伤休克：持续失血/循环崩溃，约 30~60 秒可致死
        if (totalLv >= 3) {
          this.addEffect('burnShock', 60, Math.min(5, totalLv));
        }
      }
      const shock = this.effects.get('burnShock');
      if (shock) {
        const sev = Math.max(1, Math.min(5, shock.strength || 1));
        this.blood = Math.max(0, this.blood - this.maxBlood * 0.008 * sev * dt);
        this.addEffect('pain', 6, 2);
      }
    } else if (Object.keys(this.burningParts).length) {
      // ★ 火灭了不代表休克立刻结束：burnShock 保留到自己的计时结束
      this.burningParts = {};
    }

    // ★ 疼痛持续化：伤口还在、玻纤还在、火还在烧，就一直疼。
    //   旧版每次受击只给 10 秒，时间一到再重的伤也“无痛”；这里改为每帧按伤势刷新。
    //   止痛药只压制疼痛惩罚（painSuppressed），不会删除疼痛本身。
    // 疼痛分级：1 轻 / 2 中 / 3 重 / 4 剧痛（玻纤急性、重度烧伤）
    let painLv = 0;
    if (totalWound > 0) painLv = Math.min(4, 1 + Math.floor(totalWound / 3));
    if (this.hasEffect('fiber_acute')) painLv = Math.max(painLv, 4);
    else if (this.hasEffect('fiber_chronic')) painLv = Math.max(painLv, 1);
    const burningLv = Object.values(this.burningParts).reduce((a, b) => a + b, 0);
    if (burningLv > 0) painLv = Math.max(painLv, Math.min(4, 1 + Math.floor(burningLv / 2)));
    if (painLv > 0) this.addEffect('pain', 20, painLv);

    // 3. 其余效果倒计时（bleeding 由伤口驱动，不在这里扣减）
    const expiredStim = [];
    for (const [id, eff] of this.effects) {
      if (id === 'bleeding') continue;
      eff.duration -= dt;
      if (eff.duration <= 0) {
        if (id === 'burning') this.burningParts = {};
        if (id === 'stimulant') expiredStim.push(eff);
        this.effects.delete(id);
      }
    }
    // ★ 兴奋剂药效结束后的反噬：desc 里写了“药效过后会明显疲惫”，这里真正落地。
    //   不在循环内 add，避免新效果被同一轮 for...of 再扣一次时间。
    for (const eff of expiredStim) {
      // 用独立 id：weakness 由技能系统按 _weaknessUntil 每帧 clear，不能共用。
      this.addEffect('stim_crash', 18 + 4 * Math.max(1, Math.min(3, eff.strength || 1)), 1);
    }

    this.blood = Math.max(0, this.blood - bleedRate * dt);
    
    // 失血量超过约 35%（约 1750ml）进入有临床意义的低血容量状态；
    // 旧版用 50%，已经接近失血性休克晚期，触发太晚。
    if (this.blood < this.maxBlood * 0.35 && this.blood > 0) {
      this.addEffect('hypovolemia', 999, 1);
    } else {
      this.removeEffect('hypovolemia');
    }

    this.updateOverallHealth();
  }

  updateOverallHealth() {
    // 所有与生命直接相关的部位都计入：头、胸、腹、双臂、双腿。
    // 四肢权重较低，但不再是“断了也不影响状态条”；死亡时强制归零。
    const partWeights = { head: 0.28, thorax: 0.3, abdomen: 0.16, larm: 0.06, legs: 0.2 };
    let tissueQuality = 0;
    for (const k in partWeights) {
      const p = this.parts[k];
      if (!p) continue;
      const ratio = Math.max(0, Math.min(1, p.hp / p.maxHp));
      tissueQuality += ratio * partWeights[k];
    }
    const bloodRatio = this.maxBlood > 0 ? Math.max(0, Math.min(1, this.blood / this.maxBlood)) : 0;
    // 失血本身也会降低“健康度”：不能出现组织完好但已经失血 40% 还显示健康。
    // 取“组织/血容量”的较小值，保证任何一项见底都会让状态条同步见底。
    let q = Math.min(1, tissueQuality, bloodRatio) * 100;
    if (this.blood <= 0 || this.parts.head.hp <= 0) q = 0;
    this.healthQuality = Math.max(0, Math.min(100, q));
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
    if (this.effects.has('pain') && !this.painSuppressed()) {
      const lv = Math.max(1, Math.min(4, (this.effects.get('pain') || {}).strength || 1));
      mul *= 0.95 - 0.04 * (lv - 1);
    }
    if (this.effects.has('burnShock')) mul *= 0.6;
    if (this.effects.has('stimulant')) mul *= 1.12;
    if (this.effects.has('moving_speed_up')) mul *= 1.2;
    if (this.effects.has('fiber_acute')) mul *= 0.85;
    else if (this.effects.has('fiber_chronic')) mul *= 0.95;
    if (this.effects.has('blind')) mul *= 0.9;
    if (this.effects.has('dazzle')) mul *= 0.94;
    if (this.effects.has('stun')) mul *= 0.65;
    if (this.effects.has('emp_disrupted')) mul *= 0.92;
    // ★ 药物副作用：恶心/镇静/过量/药效后疲惫
    if (this.effects.has('nausea')) mul *= 0.95;
    if (this.effects.has('sedation')) mul *= 0.76;
    if (this.effects.has('overdose')) mul *= 0.55;
    if (this.effects.has('weakness')) mul *= 0.9;
    if (this.effects.has('stim_crash')) mul *= 0.88;
    return mul;
  }

  getHandlingMul() {
    let mul = 1;
    if (this.effects.has('hypovolemia')) mul *= 0.8;
    if (this.effects.has('pain') && !this.painSuppressed()) {
      const lv = Math.max(1, Math.min(4, (this.effects.get('pain') || {}).strength || 1));
      mul *= 0.9 - 0.04 * (lv - 1);
    }
    if (this.effects.has('fiber_acute')) mul *= 0.85;
    if (this.effects.has('blind')) mul *= 0.8;
    if (this.effects.has('dazzle')) mul *= 0.86;
    if (this.effects.has('stun')) mul *= 0.6;
    if (this.effects.has('emp_disrupted')) mul *= 0.82;
    if (this.effects.has('nausea')) mul *= 0.9;
    if (this.effects.has('sedation')) mul *= 0.74;
    if (this.effects.has('overdose')) mul *= 0.6;
    if (this.effects.has('stim_crash')) mul *= 0.93;
    return mul;
  }

  // 听力：耳鸣/震撼期间外界声音被明显削弱
  getHearingMul() {
    let mul = 1;
    if (this.effects.has('tinnitus')) mul *= 0.42;
    if (this.effects.has('deafened')) mul *= 0.2;
    if (this.effects.has('stun')) mul *= 0.7;
    return Math.max(0.1, mul);
  }

  // 视野惩罚：失明/强光/失血/闪回会收窄或压暗画面
  getVisionPenalty() {
    let p = 0;
    if (this.effects.has('blind')) p = Math.max(p, 0.95);
    if (this.effects.has('dazzle')) p = Math.max(p, 0.6);
    if (this.effects.has('hypovolemia')) p = Math.max(p, 0.35);
    if (this.effects.has('flashback')) p = Math.max(p, 0.3);
    if (this.effects.has('weakness')) p = Math.max(p, 0.32);
    if (this.effects.has('hate_backlash')) p = Math.max(p, 0.3);
    if (this.effects.has('pain') && !this.painSuppressed()) {
      const lv = Math.max(1, Math.min(4, (this.effects.get('pain') || {}).strength || 1));
      // 1 轻 / 2 中 / 3 重 / 4 剧痛（玻纤急性）：剧痛视野惩罚明显更重
      p = Math.max(p, 0.10 + 0.09 * lv);
    }
    if (this.effects.has('nausea')) p = Math.max(p, 0.18);
    if (this.effects.has('sedation')) p = Math.max(p, 0.35);
    if (this.effects.has('overdose')) p = Math.max(p, 0.55);
    if (this.effects.has('stim_crash')) p = Math.max(p, 0.2);
    return Math.min(1, p);
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
    if (!enemy.alive) return;
    // ★ 友方 AI 走同一套感知/战斗数据，但跟随与支援逻辑单独处理
    if (enemy.isAlly) { this._updateAlly(world, enemy, dt); return; }
    if (enemy.trainingDummy) {
      if (enemy.isDownedState || (enemy.status && enemy.status.isDowned())) return;
      const moveMode = world.training && (world.training.dummyMoveMode || (world.training.dummyMove ? 'patrol' : 'still'));
      if (moveMode && moveMode !== 'still') this._trainingDummyMove(world, enemy, dt);
      return;
    }

    if (enemy.status && enemy.status.isDowned()) {
      enemy.body.velocity.x *= 0.9;
      enemy.body.velocity.z *= 0.9;
      return; 
    }

    const ai = enemy.spec.ai || { aggression: 0.5, composure: 0.5, perception: 0.5, opportunism: 0.5 };

    // 无人机也是可被 AI 考虑的目标
    this._considerDrone(world, enemy, ai, dt);

    // 寻找目标（包含玩家和其他敌人）
    const target = this._findTarget(world, enemy, ai);
    const canSee = !!target;
    const dist = target ? Math.hypot(target.body.position.x - enemy.body.position.x, target.body.position.z - enemy.body.position.z) : Infinity;
    
    if (target) {
      enemy.targetEntity = target;
      this._alertSquad(world, enemy, target, dist);
      this._switchEnemyWeapon(world, enemy, dist, true);
    } else {
      enemy.targetEntity = null;
      // 没有视线但本阵营有人标记过：去最后已知位置查看，而不是完全失忆
      const marked = this._findMarkedTarget(world, enemy, 65);
      if (marked) {
        enemy.targetPos = { x: marked.body.position.x, z: marked.body.position.z };
        enemy.awareness = Math.max(enemy.awareness, 0.7);
        if (enemy.state === 'patrol') { enemy.state = 'investigate'; enemy.stateT = 0; }
      }
    }

    // ★ 同阵营互救：没有可见目标时优先去救倒下的队友（敌我通用）
    if (!canSee && enemy.state !== 'flee' && enemy.state !== 'remove' && enemy.state !== 'nade') {
      const mate = this._findDownedMate(world, enemy, 16);
      if (mate && this._aiHasAid(enemy)) {
        enemy.state = 'aid';
        enemy.aidTarget = mate;
        enemy._aidT = 0;
      }
    }

    // --- 感知逻辑 ---
    if (canSee) {
      const rate = (1.0 + ai.perception * 2) / (dist * 0.1 + 1);
      enemy.awareness = Math.min(1.2, enemy.awareness + dt * rate);
    } else {
      enemy.awareness = Math.max(0, enemy.awareness - dt * 0.15);
    }

    // --- 状态机切换 ---
    const meleeRange = 2.8;
    const keep = ai.keepDistance || 0;
    const stunned = enemy.stunnedUntil && world.time < enemy.stunnedUntil;
    const blinded = enemy.blindedUntil && world.time < enemy.blindedUntil;

    // ★ 脚边有爆炸投掷物：优先逃开（除非已经在逃/撤离）
    if (!stunned && enemy.state !== 'flee' && enemy.state !== 'remove') {
      const threat = this._grenadeThreat(world, enemy);
      if (threat) {
        enemy.state = 'flee';
        enemy.stateT = 0;
        const dx = enemy.body.position.x - threat.x;
        const dz = enemy.body.position.z - threat.z;
        const len = Math.hypot(dx, dz) || 1;
        enemy.targetPos = {
          x: enemy.body.position.x + dx / len * 13,
          z: enemy.body.position.z + dz / len * 13,
        };
        enemy._grenadeFleeUntil = world.time + 1.8;
        enemy.awareness = Math.max(enemy.awareness || 0, 0.8);
        if (world.player && world.player.alive) enemy.targetEntity = world.player;
      }
    }

    if (canSee && !stunned && !blinded) {
      // 贴脸：有近战武器就拔刀/枪托，否则后撤拉开距离
      if (dist <= meleeRange && enemy.weapons && enemy.weapons.melee && enemy.state !== 'nade' &&
          ((ai.meleeBias || 0) > 0.12 || dist <= 1.8)) {
        if (enemy.state !== 'melee') { enemy.state = 'melee'; enemy.stateT = 0; enemy.fireCd = Math.min(enemy.fireCd || 0, 0.15); }
      } else if (keep > 8 && dist < keep * 0.42 && enemy.state !== 'retreat' && enemy.state !== 'flee' && enemy.state !== 'loot' && enemy.state !== 'remove' && enemy.state !== 'nade') {
        enemy.state = 'retreat';
        enemy.stateT = 0;
      } else if (enemy.state === 'melee' && dist > meleeRange + 0.8) {
        enemy.state = 'combat';
        enemy.stateT = 0;
      } else if (enemy.state === 'retreat' && dist > keep * 0.8) {
        enemy.state = 'combat';
        enemy.stateT = 0;
      }
    }

    if (enemy.awareness >= 1.0 && enemy.state !== 'combat' && enemy.state !== 'flee' && enemy.state !== 'melee' && enemy.state !== 'retreat' && enemy.state !== 'drone' && enemy.state !== 'nade' && enemy.state !== 'aid') {
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

    // ★ 投掷物：强 AI 在交战距离内、库存有雷、队友不在爆区时进入投掷状态。
    //   先进入 0.7~1.2s 的投掷前摇，给玩家听到拉环/看到动作后撤的机会。
    if (canSee && !stunned && !blinded && enemy.state === 'combat') {
      this._considerGrenade(world, enemy, target, dist, ai);
    }

    // --- 拾荒/换装：状态不佳或弹尽、且暂时安全时，去搜附近尸体/容器 ---
    if (enemy.state === 'patrol' && enemy.awareness < 0.5) {
      const ammoOut = enemy.weapon && enemy.weapon.loaded && enemy.weapon.loaded.qty <= 0 && enemy.weapon.reserve <= 0;
      if (healthPct < 70 || ammoOut) {
        const src = this._findLootSource(world, enemy);
        if (src) {
          enemy.state = 'loot';
          enemy.lootTarget = src;
          enemy.stateT = 0;
        }
      }
    }

    // --- 危险状态：急性玻纤/燃烧，暂时安全或火势未失控时停下处理 ---
    const acuteFiber = enemy.status && enemy.status.hasEffect('fiber_acute');
    const onFire = enemy.status && enemy.status.hasEffect('burning');
    if (enemy.state !== 'remove' && enemy.state !== 'flee' && (acuteFiber || onFire) && (!canSee || onFire)) {
      enemy.state = 'remove';
      enemy.stateT = 0;
      enemy._hazardType = onFire ? 'fire' : 'fiber';
    }

    // ★ 自我急救：没有视线（或已退到安全距离）时，受伤 AI 会停下给自己包扎。
    //   旧版只有玩家医疗兵 `_allySupport` 会自愈，普通敌人和医疗兵自己都不会用药。
    const canSelfAid = !canSee || (enemy.state === 'retreat' && dist > 18);
    if (canSelfAid && enemy.state !== 'selfaid' && enemy.state !== 'nade'
        && enemy.state !== 'aid' && enemy.state !== 'remove' && enemy.state !== 'flee') {
      this._considerSelfAid(world, enemy);
    }

    switch (enemy.state) {
      case 'patrol': this._patrol(world, enemy, dt); break;
      case 'investigate': this._investigate(world, enemy, dt); break;
      case 'combat': this._combat(world, enemy, dt, dist, canSee, ai); break;
      case 'melee': this._meleeCombat(world, enemy, dt, dist, ai); break;
      case 'retreat': this._retreat(world, enemy, dt, dist, ai); break;
      case 'drone': this._attackDrone(world, enemy, dt, ai); break;
      case 'flee': this._flee(world, enemy, dt, enemy.targetEntity || world.player, ai); break;
      case 'loot': this._loot(world, enemy, dt); break;
      case 'remove': this._removeFiber(world, enemy, dt); break;
      case 'nade': this._throwEnemyGrenade(world, enemy, dt); break;
      case 'aid': this._aidDowned(world, enemy, dt); break;
      case 'selfaid': this._aidSelf(world, enemy, dt, canSee, dist); break;
    }

    // 被压制：移动速度明显下降，配合射击散布惩罚形成“抬不起头”的效果
    if (enemy.suppressedUntil && world.time < enemy.suppressedUntil) {
      enemy.body.velocity.x *= 0.55;
      enemy.body.velocity.z *= 0.55;
    }

    // 敌方脚步：既进入声纹系统（AI 互相听），也按距离给玩家可听音效
    {
      const sp2 = enemy.body.velocity.x * enemy.body.velocity.x + enemy.body.velocity.z * enemy.body.velocity.z;
      if (sp2 > 1.2 && enemy.body.grounded) {
        enemy._stepTimer = (enemy._stepTimer || 0) - dt;
        if (enemy._stepTimer <= 0) {
          const sprinting = sp2 > 22;
          const crouched = !!enemy.isCrouching;
          enemy._stepTimer = crouched ? 0.9 : (sprinting ? 0.32 : 0.58);
          const intensity = crouched ? 0.05 : (sprinting ? 0.75 : 0.38);
          const range = crouched ? 3 : (sprinting ? 20 : 9);
          world.emitSound('benign', intensity, range, enemy.body.position.x, enemy.body.position.z,
            'enemy', enemy.spec ? enemy.spec.faction : 'nipsel');
          const pd = world.player ? Math.hypot(world.player.body.position.x - enemy.body.position.x,
            world.player.body.position.z - enemy.body.position.z) : 999;
          if (pd < 42) {
            world._playSFXAt('step_' + (crouched ? 'crouch' : (sprinting ? 'run' : 'walk')),
              enemy.body.position.x, enemy.body.position.z,
              { volume: crouched ? 0.15 : (sprinting ? 0.5 : 0.3), maxDist: 42 });
          }
        }
      }
    }

    // 所有移动状态最后统一做障碍规避，避免卡在墙角/门框
    this._avoidObstacles(world, enemy, dt);

    const half = world.mapSpec.size / 2 - 2;
    enemy.body.position.x = Math.max(-half, Math.min(half, enemy.body.position.x));
    enemy.body.position.z = Math.max(-half, Math.min(half, enemy.body.position.z));

    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
  },

  _trainingDummyMove(world, enemy, dt) {
    const mode = (world.training && world.training.dummyMoveMode) || 'still';
    if (!enemy._dummyHome) {
      const h = enemy.home || { x: enemy.body.position.x, z: enemy.body.position.z };
      enemy._dummyHome = { x: h.x, z: h.z };
    }
    const home = enemy._dummyHome;
    const p = enemy.body.position;

    if (mode === 'still') {
      p.x += (home.x - p.x) * Math.min(1, dt * 4);
      p.z += (home.z - p.z) * Math.min(1, dt * 4);
    } else if (mode === 'random') {
      if (!enemy._dummyTarget || world.time > (enemy._dummyRetarget || 0)) {
        enemy._dummyTarget = {
          x: home.x + (Math.random() * 12 - 6),
          // z 只做小幅随机，避免训练场三道矮墙穿模
          z: home.z + (Math.random() * 3 - 1.5),
        };
        enemy._dummyRetarget = world.time + 2.0 + Math.random() * 2.5;
      }
      const dx = enemy._dummyTarget.x - p.x;
      const dz = enemy._dummyTarget.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.15) {
        const step = Math.min(dist, 1.8 * dt);
        p.x += dx / dist * step;
        p.z += dz / dist * step;
      } else {
        enemy._dummyRetarget = 0;
      }
    } else {
      // patrol：以出生点为中心的左右巡逻
      if (enemy._dummyPhase === undefined) enemy._dummyPhase = Math.random() * Math.PI * 2;
      const tx = home.x + Math.sin(world.time * 0.9 + enemy._dummyPhase) * 4;
      const dx = tx - p.x;
      const step = Math.max(-2.2 * dt, Math.min(2.2 * dt, dx));
      p.x += step;
      p.z += (home.z - p.z) * Math.min(1, dt * 2);
    }

    // 不穿越地图边界（训练场外墙另有碰撞，这里只做兜底）
    const half = (world.mapSpec ? world.mapSpec.size : 120) / 2 - 3;
    p.x = Math.max(-half, Math.min(half, p.x));
    p.z = Math.max(-half, Math.min(half, p.z));
    // 始终面向玩家，方便近身查看详情/测试护具
    if (world.player && world.player.body) {
      enemy.angle = Math.atan2(
        world.player.body.position.z - p.z,
        world.player.body.position.x - p.x
      );
    }
    enemy.body.velocity.x = 0;
    enemy.body.velocity.z = 0;
  },

  // 同组同阵营的 AI 共享目标：一个看见玩家，附近队友会进入警戒/交战
  _alertSquad(world, enemy, target, dist) {
    if (!enemy.spec || !enemy.spec.faction) return;
    if (enemy._squadAlertAt && world.time - enemy._squadAlertAt < 2.5) return;
    enemy._squadAlertAt = world.time;
    for (const mate of world.enemies) {
      if (mate === enemy || !mate.alive) continue;
      if (mate.spec.faction !== enemy.spec.faction) continue;
      const d = Math.hypot(mate.body.position.x - enemy.body.position.x, mate.body.position.z - enemy.body.position.z);
      if (d > 20) continue;
      // 只让同一小队互相响应，避免整张图的同阵营一起扑向玩家
      if (enemy.squad && mate.squad !== enemy.squad) continue;
      if (mate.awareness < 0.75) mate.awareness = 0.75;
      if (!mate.targetEntity || !mate.targetEntity.alive) mate.targetEntity = target;
      if (mate.state === 'patrol' || mate.state === 'investigate') {
        mate.state = 'combat';
        mate.stateT = 0;
        mate.reactionTimer = Math.max(mate.reactionTimer || 0, 0.2);
      }
      mate.targetPos = { x: target.body.position.x, z: target.body.position.z };
    }
  },

  // 看见无人机：按性格/感知决定是否值得抬头打它
  _considerDrone(world, enemy, ai, dt) {
    const d = world.drones && world.drones[0];
    if (!d || !d.alive) {
      enemy.droneTarget = null;
      if (enemy.state === 'drone') { enemy.state = 'patrol'; enemy.stateT = 0; }
      return;
    }
    // 友方 AI 不会把自家无人机当目标（以后敌方无人机只要换 owner/faction 就会被当作目标）
    if (enemy.isAlly && d.owner && (d.owner === world.player || d.owner.faction === 'player')) return;
    const dx = d.mesh.position.x - enemy.body.position.x;
    const dy = d.mesh.position.y - (enemy.body.position.y + (enemy.body.halfH || 1.2) * 0.75);
    const dz = d.mesh.position.z - enemy.body.position.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > 24 + (ai.perception || 0.5) * 22) {
      if (enemy.state === 'drone') { enemy.state = 'patrol'; enemy.stateT = 0; }
      return;
    }
    // 视线被墙体挡住时不会隔墙锁无人机
    if (world.physics.raycast(
      enemy.body.position.x, enemy.body.position.y + (enemy.body.halfH || 1.2) * 0.75, enemy.body.position.z,
      dx, dy, dz, dist,
      body => body.userData && body.userData.type === 'obstacle'
    )) return;

    if (!enemy._droneThink || world.time > enemy._droneThink) {
      enemy._droneThink = world.time + 3.0;
      // 感知高、侵略性低的单位更愿意先处理空中目标
      const interest = 0.28 + (ai.perception || 0.5) * 0.45 + (ai.composure || 0.5) * 0.2 - (ai.aggression || 0.5) * 0.18;
      enemy._wantsDrone = Math.random() < interest;
    }
    if (enemy._wantsDrone && enemy.state !== 'flee' && (enemy.state !== 'combat' || dist < 16)) {
      enemy.droneTarget = d;
      enemy.state = 'drone';
      enemy.stateT = 0;
    }
  },

  _attackDrone(world, enemy, dt, ai) {
    const d = enemy.droneTarget;
    if (!d || !d.alive) { enemy.state = 'patrol'; enemy.droneTarget = null; return; }
    const dx = d.mesh.position.x - enemy.body.position.x;
    const dz = d.mesh.position.z - enemy.body.position.z;
    const dy = d.mesh.position.y - (enemy.body.position.y + 1.2);
    enemy.angle = Math.atan2(dz, dx);
    enemy.body.velocity.x = 0;
    enemy.body.velocity.z = 0;
    enemy.stateT += dt;
    if (enemy.fireCd > 0) enemy.fireCd -= dt;
    if (enemy.fireCd > 0) return;
    // 命中率：感知/镇定决定上限，但距离、无人机高度和横向速度都会显著降低命中。
    // 旧版 75% 命中 + 每 1 秒一枪，70 耐久无人机几秒就被打爆，体感像自动瞄准。
    const dist3d = Math.hypot(dx, dy, dz);
    const rangeFactor = Math.max(0.12, 1 - dist3d / 42);
    const baseChance = 0.05 + (ai.perception || 0.5) * 0.14 + (ai.composure || 0.5) * 0.08;
    const hitChance = Math.max(0.02, Math.min(0.3, baseChance * rangeFactor));
    const ox = enemy.body.position.x;
    const oy = enemy.body.position.y + (enemy.body.halfH || 1.2) * 0.75;
    const oz = enemy.body.position.z;
    // 打偏的曳光弹也要看起来像在“打飞机”，偏移随距离放大
    const missSpread = 0.5 + dist3d * 0.05;
    const tx = d.mesh.position.x + (Math.random() - 0.5) * missSpread * 2;
    const ty = d.mesh.position.y + (Math.random() - 0.5) * missSpread;
    const tz = d.mesh.position.z + (Math.random() - 0.5) * missSpread * 2;
    world._spawnTracer(ox, oy, oz, tx, ty, tz, 0xffb070);
    if (Math.random() < hitChance) {
      d.durability = Math.max(0, d.durability - (4 + Math.random() * 5));
      world._spawnSpark(tx, ty, tz);
      world._droneInterference(0.4 + Math.random() * 0.3);
      if (d.durability <= 0) {
        world._log('侦察无人机被击落', 'r');
        world._destroyDrone(d);
        enemy.state = 'patrol';
        enemy.droneTarget = null;
        return;
      }
    }
    enemy.fireCd = 0.95 + Math.random() * 1.1;
    // 打一会儿无人机后重新评估，避免所有 AI 一直抬头
    if (enemy.stateT > 4.5) { enemy.state = 'patrol'; enemy.droneTarget = null; enemy.stateT = 0; }
  },

  // AI 武器切换：按距离选择最合适的枪，弹尽时换备用武器，贴脸时拔近战
  _switchEnemyWeapon(world, enemy, dist, canSee) {
    const slots = enemy.weapons;
    if (!slots) return;
    if (enemy._weaponLock && world.time < enemy._weaponLock) return;
    const ai = enemy.spec.ai || {};
    const canUse = (w) => !!(w && w.def && !w.def.melee && !w.disabled && !(w.item && w.item.damaged) && (w.mag === undefined || w.mag > 0 || (w.reserve || 0) > 0));
    const idealRange = (w) => {
      if (!w || !w.def) return 0;
      const d = w.def;
      if (d.pellets > 1) return 6;
      if ((d.range || 0) >= 250) return 42;
      if ((d.range || 0) >= 100) return 24;
      if ((d.rpm || 0) >= 700) return 10;
      return 14;
    };
    const current = enemy.currentSlot || 'primary';
    let want = current;

    // 当前武器没有弹药/被 EMP 损坏 → 优先换有弹的枪，再考虑近战
    const cur = slots[current];
    const curBroken = !!(cur && (cur.disabled || (cur.item && cur.item.damaged)));
    const curEmpty = !!(cur && cur.def && !cur.def.melee && (cur.mag <= 0 && (cur.reserve || 0) <= 0));
    if (curBroken || curEmpty) {
      if (canUse(slots.secondary)) want = 'secondary';
      else if (canUse(slots.primary)) want = 'primary';
      else if (slots.melee) want = 'melee';
    } else if (canSee) {
      // 贴脸拔近战；否则按理想距离选主/副武器
      if (dist <= 2.8 && slots.melee && ((ai.meleeBias || 0) > 0.12 || dist <= 1.8)) {
        want = 'melee';
      } else if ((ai.switchBias || 0) >= 0.45) {
        let best = current;
        let bestScore = -Infinity;
        for (const key of ['primary', 'secondary']) {
          const w = slots[key];
          if (!canUse(w)) continue;
          const ideal = idealRange(w);
          // 距离越接近理想射程分数越高；弹匣打空扣分
          let score = -Math.abs(dist - ideal);
          if (w.mag <= 0 && (w.reserve || 0) > 0) score -= 8;
          if (key === current) score += 3.5; // 不轻易来回切
          if (score > bestScore) { bestScore = score; best = key; }
        }
        want = best;
      }
    }

    if (want !== current && slots[want]) {
      enemy.currentSlot = want;
      enemy.weapon = slots[want];
      enemy._weaponLock = world.time + 1.1 + Math.random() * 0.5;
      enemy.fireCd = Math.max(enemy.fireCd || 0, 0.45);
    }
  },

  // 附近是否有落地/飞行中的爆炸投掷物：AI 应该躲开，而不是站在原地等炸
  _grenadeThreat(world, enemy) {
    const list = world.projectiles || [];
    let best = null, bestD = 9.5;
    for (const pr of list) {
      if (!pr) continue;
      const d = Math.hypot(pr.pos.x - enemy.body.position.x, pr.pos.z - enemy.body.position.z);
      if (d < bestD) { bestD = d; best = pr; }
    }
    return best ? { pr: best, dist: bestD, x: best.pos.x, z: best.pos.z } : null;
  },

  _findTarget(world, enemy, ai) {
    // ★ 被闪光/震撼致盲期间视野失效（沉默光锥）
    if (enemy.blindedUntil && world.time < enemy.blindedUntil) return null;
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

      // 视野距离：基础感知 + 武器有效射程。狙击手不会明明拿着 350m 枪却只看到 40m。
      const weaponRange = (enemy.weapon && enemy.weapon.def && enemy.weapon.def.range) || 0;
      const maxDist = Math.min(140, Math.max(18 + ai.perception * 28, weaponRange * 0.8));
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

  // ★ 同阵营共享标记：本阵营有人标记过的目标，即使当前没有视线，也知道最后位置。
  //   预留：敌方无人机/侦察技能只要用 world._markEntity(..., 'nipsel') 标记，敌方 AI 自动使用。
  _findMarkedTarget(world, enemy, maxDist = 70) {
    const now = world.time;
    const faction = enemy.spec && enemy.spec.faction;
    if (!faction) return null;
    let best = null, bestD = maxDist;
    const candidates = [world.player, ...world.enemies];
    for (const c of candidates) {
      if (!c || c === enemy || !c.alive || !c.body) continue;
      if (!(c.markedUntil > now)) continue;
      if ((c.markedFaction || 'player') !== faction) continue;
      const cf = c === world.player ? 'player' : (c.faction || (c.spec && c.spec.faction));
      if (!world.isHostile(faction, cf)) continue;
      const d = Math.hypot(c.body.position.x - enemy.body.position.x, c.body.position.z - enemy.body.position.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  },

  // 障碍规避：所有状态在写入速度后统一过一遍，防止 AI 顶着墙角“原地巡逻”
  _avoidObstacles(world, enemy, dt) {
    const vx = enemy.body.velocity.x;
    const vz = enemy.body.velocity.z;
    const sp = Math.hypot(vx, vz);
    if (sp < 0.05) { enemy._stuckT = 0; return; }
    const ux = vx / sp, uz = vz / sp;
    const px = enemy.body.position.x;
    const py = enemy.body.position.y;
    const pz = enemy.body.position.z;
    const radius = Math.max(0.55, enemy.body.radius || 1);
    const lowY = py - (enemy.body.halfH || 1.2) + 0.45;
    const probe = (ax, az, len, yy) => {
      const hit = world.physics.raycast(px, yy !== undefined ? yy : py, pz, ax, 0, az, len,
        body => body.userData && body.userData.type === 'obstacle');
      return hit ? hit.t : Infinity;
    };
    const probeBoth = (ax, az, len) => Math.min(probe(ax, az, len, py), probe(ax, az, len, lowY));
    const forward = probeBoth(ux, uz, 1.6 + radius);
    if (forward >= 1.6 + radius) {
      // 正常移动；用位移检测兜底“贴着墙滑动但完全不动”
      if (!enemy._avoidLast) enemy._avoidLast = { x: px, z: pz, t: 0 };
      enemy._avoidLast.t += dt;
      if (enemy._avoidLast.t > 0.45) {
        const moved = Math.hypot(px - enemy._avoidLast.x, pz - enemy._avoidLast.z);
        if (moved < 0.06) enemy._stuckT = (enemy._stuckT || 0) + 0.45;
        else enemy._stuckT = 0;
        enemy._avoidLast = { x: px, z: pz, t: 0 };
      }
      if ((enemy._stuckT || 0) > 0.9) {
        // 卡住太久：强制侧移/后退，避免永久顶墙
        const side = Math.random() < 0.5 ? 1 : -1;
        enemy.body.velocity.x = -uz * sp * side;
        enemy.body.velocity.z = ux * sp * side;
        enemy._stuckT = 0;
      }
      return;
    }
    // 前方被挡：在 ±45°/±90°/±135° 中找最开阔的方向
    let best = null;
    for (const deg of [45, -45, 90, -90, 135, -135, 180]) {
      const a = Math.atan2(uz, ux) + deg * Math.PI / 180;
      const ax = Math.cos(a), az = Math.sin(a);
      const d = probeBoth(ax, az, 1.3 + radius);
      if (d > (best ? best.d : 0)) best = { x: ax, z: az, d };
      if (d > 2.2) break;
    }
    if (best) {
      enemy.body.velocity.x = best.x * sp;
      enemy.body.velocity.z = best.z * sp;
      enemy.angle = Math.atan2(best.z, best.x);
    } else {
      enemy.body.velocity.x = 0;
      enemy.body.velocity.z = 0;
    }
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
    const home = enemy.home || enemy.body.position;
    const dx = enemy.body.position.x - home.x;
    const dz = enemy.body.position.z - home.z;
    const away = Math.hypot(dx, dz);
    const radius = enemy.patrolRadius || 15;
    let target = enemy._patrolTarget;
    const targetLeft = target && Math.hypot(target.x - enemy.body.position.x, target.z - enemy.body.position.z) > 1.2;
    if (!target || enemy.wanderT <= 0 || !targetLeft) {
      if (away > radius) {
        target = { x: home.x, z: home.z };
      } else {
        // 在防区内找一个“看得见”的点，再交给 _aiMoveTo 绕墙
        let picked = null;
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = 4 + Math.random() * Math.min(10, radius);
          const tx = home.x + Math.cos(a) * d;
          const tz = home.z + Math.sin(a) * d;
          if (world._navLineClear(enemy.body.position.x, enemy.body.position.z, tx, tz)) {
            picked = { x: tx, z: tz };
            break;
          }
        }
        target = picked || { x: home.x, z: home.z };
      }
      enemy._patrolTarget = target;
      enemy.wanderT = 2.2 + Math.random() * 2.4;
    }
    if (target) {
      const sp = enemy.spec.speed * (away > radius ? 0.7 : 0.38);
      world._aiMoveTo(enemy, target.x, target.z, sp, dt);
    }
  },

  // ★ 找附近可搜刮目标（优先未搜过的尸体/已开的容器）
  _findLootSource(world, enemy) {
    let best = null, bestD = Infinity;
    const now = world.time;
    const consider = (tg, x, z, kind) => {
      if (!tg) return;
      if (tg._aiLootT && now - tg._aiLootT < 45) return;
      const d = Math.hypot(x - enemy.body.position.x, z - enemy.body.position.z);
      if (d < 1.5 || d > 30) return;
      if (kind === 'corpse') {
        if (!tg.lootInv || tg.lootInv.items.size === 0) return;
      } else if (kind === 'container') {
        if (!tg.grid || tg.grid.items.size === 0) return;
      }
      if (d < bestD) { bestD = d; best = { target: tg, kind }; }
    };
    for (const c of world.groundLoots) {
      if (c.isCorpse) consider(c, c.x, c.z, 'corpse');
    }
    for (const c of world.containers) consider(c, c.x, c.z, 'container');
    return best;
  },

  _loot(world, enemy, dt) {
    enemy.isCrouching = false;
    enemy.body.height = 2.4; enemy.body.halfH = 1.2;
    enemy.stateT += dt;
    const t = enemy.lootTarget;
    if (!t || !t.target || enemy.stateT > 18) {
      enemy.state = 'patrol';
      enemy.lootTarget = null;
      return;
    }
    const tg = t.target;
    const dx = tg.x - enemy.body.position.x;
    const dz = tg.z - enemy.body.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 1.8) {
      world._aiMoveTo(enemy, tg.x, tg.z, enemy.spec.speed * 0.8, dt);
    } else {
      enemy.body.velocity.x = 0;
      enemy.body.velocity.z = 0;
      world._aiLoot(enemy, tg, t.kind);
      tg._aiLootT = world.time;
      enemy.state = 'patrol';
      enemy.stateT = 0;
      enemy.lootTarget = null;
    }
  },

  _investigate(world, enemy, dt){
    enemy.isCrouching = false; enemy.body.height = 2.4; enemy.body.halfH = 1.2;
    enemy.stateT += dt;
    if (enemy.targetPos) {
      const dx = enemy.targetPos.x - enemy.body.position.x;
      const dz = enemy.targetPos.z - enemy.body.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 2) {
        // 不再直线撞墙：视线被挡时走 A* 路点
        world._aiMoveTo(enemy, enemy.targetPos.x, enemy.targetPos.z, enemy.spec.speed * 0.8, dt);
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

  // ★ 中急性玻纤/着火：停下处理（拔除/灭火），完成后保留慢性或疼痛
  _removeFiber(world, enemy, dt) {
    enemy.isCrouching = false;
    enemy.body.height = 2.4; enemy.body.halfH = 1.2;
    enemy.body.velocity.x = 0;
    enemy.body.velocity.z = 0;
    enemy.stateT += dt;
    const type = enemy._hazardType || 'fiber';
    const need = type === 'fire' ? 3.2 : 4;
    if (enemy.stateT >= need) {
      if (enemy.status) {
        if (type === 'fire') {
          const lv = Object.values(enemy.status.burningParts || {}).reduce((a, b) => a + b, 0);
          enemy.status.removeEffect('burning');
          // AI 灭火后同样保留烧伤休克
          if (lv >= 2) enemy.status.addEffect('burnShock', Math.max(40, lv * 14), Math.min(5, lv));
          enemy.status.addEffect('pain', 20, Math.min(4, Math.max(2, lv + 1)));
        } else {
          enemy.status.removeEffect('fiber_acute');
          enemy.status.addEffect('fiber_chronic', 9999, 1);
        }
      }
      enemy._hazardType = null;
      enemy.state = 'patrol';
      enemy.stateT = 0;
    }
  },

  _combat(world, enemy, dt, dist, canSee, ai){
    enemy._burstSpread = Math.max(1, (enemy._burstSpread || 1) - dt * 0.9);
    const target = enemy.targetEntity;
    if (!target || !target.alive) {
      enemy.state = 'investigate';
      return;
    }
    // 不追出自家防区太远：避免一个阵营被玩家拖着横穿整张地图
    if (enemy.home) {
      const homeDist = Math.hypot(enemy.body.position.x - enemy.home.x, enemy.body.position.z - enemy.home.z);
      if (homeDist > (enemy.patrolRadius || 14) * 2.6 + 10) {
        enemy.state = 'patrol';
        enemy.targetEntity = null;
        enemy.awareness = Math.min(enemy.awareness, 0.4);
        return;
      }
    }
    
    if (!canSee) {
      enemy.state = 'investigate';
      enemy.targetPos = { x: target.body.position.x, z: target.body.position.z };
      return;
    }

    // 手里是刀/枪托时走近战分支
    if (enemy.weapon && enemy.weapon.def && enemy.weapon.def.melee) {
      this._meleeCombat(world, enemy, dt, dist, ai);
      return;
    }

    const dx = target.body.position.x - enemy.body.position.x;
    const dz = target.body.position.z - enemy.body.position.z;
    enemy.angle = Math.atan2(dz, dx);

    const isOpportunist = ai.opportunism > 0.6;
    // ★ 交火距离：不再“无脑贴脸”。按武器有效射程停在下枪距离，
    //   太远才推进、太近才后撤；进入射程后站定/侧移射击，而不是一路走到枪口下。
    const wDef = (enemy.weapon && enemy.weapon.def) || {};
    const wRange = wDef.range || 45;
    const preferred = Math.max(6, Math.min(60, ai.keepDistance || wRange * 0.7));
    const tooFar = dist > preferred * 1.12;
    const tooClose = dist < preferred * 0.5;
    const sprint = enemy.spec.speed || 4;
    if (tooFar) {
      const adv = sprint * (0.55 + (ai.aggression || 0.5) * 0.45);
      enemy.isCrouching = false;
      enemy.body.height = 2.4; enemy.body.halfH = 1.2;
      world._aiMoveTo(enemy, target.body.position.x, target.body.position.z, adv, dt);
      // 绕路时朝向可能被路径点改写；开火仍要面向目标
      enemy.angle = Math.atan2(dz, dx);
    } else if (tooClose && dist > 3.2) {
      enemy.isCrouching = false;
      enemy.body.height = 2.4; enemy.body.halfH = 1.2;
      world._aiMoveTo(enemy,
        enemy.body.position.x - dx / (dist || 1) * 5,
        enemy.body.position.z - dz / (dist || 1) * 5,
        sprint * 0.55, dt);
      enemy.angle = Math.atan2(dz, dx);
    } else if (isOpportunist && dist > 8) {
      // 机会主义者：在射程边界蹲下侧移，降低被命中率
      enemy.isCrouching = true;
      enemy.body.height = 1.6; enemy.body.halfH = 0.8;
      enemy.body.velocity.x = Math.cos(enemy.angle + Math.PI / 2) * sprint * 0.32;
      enemy.body.velocity.z = Math.sin(enemy.angle + Math.PI / 2) * sprint * 0.32;
    } else {
      // 已经在舒服的射击距离：站住开火，最多小幅横移
      enemy.isCrouching = false;
      enemy.body.height = 2.4; enemy.body.halfH = 1.2;
      if ((ai.aggression || 0.5) > 0.65) {
        const side = Math.sin(world.time * 1.3 + (enemy.spawnT || 0)) * sprint * 0.22;
        enemy.body.velocity.x = Math.cos(enemy.angle + Math.PI / 2) * side;
        enemy.body.velocity.z = Math.sin(enemy.angle + Math.PI / 2) * side;
      } else {
        enemy.body.velocity.x = 0;
        enemy.body.velocity.z = 0;
      }
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
    } else if (enemy.fireCd <= 0 && enemy.weapon && !enemy.weapon.disabled && enemy.weapon.loaded.qty > 0 && !(enemy.stunnedUntil && world.time < enemy.stunnedUntil)) {
      world.enemyFire(enemy, target);
      enemy._burstSpread = Math.min(2.2, (enemy._burstSpread || 1) + 0.22);
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
        const cur = w.loaded.queue ? w.loaded.queue.length : w.loaded.qty;
        const need = w.magCap - cur;
        const take = Math.min(need, w.reserve);
        if (typeof w.consumeReserve === 'function') w.consumeReserve(take);
        else w.reserve -= take;
        if (w.loaded.queue) {
          // 特种兵换弹后继续装填自己的特殊弹种，不会“换一次弹就退回普通弹”
          const fillId = w.specialAmmoId || w.def.ammoType;
          for (let i = 0; i < take; i++) w.loaded.queue.push(fillId);
          w.loaded.qty = w.loaded.queue.length;
        } else {
          w.loaded.qty += take;
        }
        enemy._reloadTimer = 2.5;
      }
    } else if (w) {
      enemy._reloadTimer = 2.5;
    }
  },

  // 近战状态：贴脸挥刀；打完一刀按性格决定继续追还是拉开
  _meleeCombat(world, enemy, dt, dist, ai) {
    enemy.stateT += dt;
    enemy.isCrouching = false; enemy.body.height = 2.4; enemy.body.halfH = 1.2;
    const target = enemy.targetEntity;
    if (!target || !target.alive) { enemy.state = 'patrol'; return; }
    const dx = target.body.position.x - enemy.body.position.x;
    const dz = target.body.position.z - enemy.body.position.z;
    const d = Math.hypot(dx, dz) || 1;
    enemy.angle = Math.atan2(dz, dx);
    if (enemy.fireCd > 0) enemy.fireCd -= dt;
    if (d > 2.2) {
      enemy.body.velocity.x = dx / d * enemy.spec.speed * 1.08;
      enemy.body.velocity.z = dz / d * enemy.spec.speed * 1.08;
    } else {
      enemy.body.velocity.x = 0;
      enemy.body.velocity.z = 0;
      if (enemy.fireCd <= 0) {
        // Prazer 近战会随机改用尾击：伤害更高、前摇更长
        if (enemy.spec && enemy.spec.prazer && Math.random() < 0.35 && world._tailStrike(enemy)) {
          enemy.fireCd = 1.15;
        } else {
          world._meleeAttack(enemy, enemy.weapon);
          enemy.fireCd = (enemy.weapon.def.cooldown || 0.65) + 0.15;
        }
      }
    }
    // 近战一轮后：低侵略/高机会主义性格会退开重新拿枪
    if (enemy.stateT > 2.2 + (1 - (ai.aggression || 0.5)) * 1.5) {
      if ((ai.meleeBias || 0.3) < 0.65) {
        enemy.state = 'retreat';
        enemy.stateT = 0;
        if (enemy.weapons && enemy.weapons.primary) {
          enemy.currentSlot = 'primary';
          enemy.weapon = enemy.weapons.primary;
          enemy._weaponLock = world.time + 0.9;
        }
      } else {
        enemy.stateT = 0;
      }
    }
  },

  // 后撤状态：保持面向目标，倒着退；狙击手/机枪手被贴脸时使用
  _retreat(world, enemy, dt, dist, ai) {
    enemy.stateT += dt;
    enemy.isCrouching = false; enemy.body.height = 2.4; enemy.body.halfH = 1.2;
    const target = enemy.targetEntity;
    if (!target || !target.alive) { enemy.state = 'patrol'; return; }
    const dx = target.body.position.x - enemy.body.position.x;
    const dz = target.body.position.z - enemy.body.position.z;
    const d = Math.hypot(dx, dz) || 1;
    enemy.angle = Math.atan2(dz, dx);
    const keep = (ai.keepDistance || 20) * 0.75;
    if (d >= keep || enemy.stateT > 4.5) {
      enemy.state = 'combat';
      enemy.stateT = 0;
      return;
    }
    // 后撤方向 + 少量侧移，避免直线倒退被预瞄
    const side = (enemy.stateT % 2 < 1) ? 1 : -1;
    const mx = -dx / d + (-dz / d) * side * 0.35;
    const mz = -dz / d + (dx / d) * side * 0.35;
    const ml = Math.hypot(mx, mz) || 1;
    world._aiMoveTo(enemy,
      enemy.body.position.x + mx / ml * 6,
      enemy.body.position.z + mz / ml * 6,
      enemy.spec.speed * 0.95, dt);
    // 后撤时仍会边退边打（精度由 _blindFire/散布惩罚体现）
    if (enemy.fireCd > 0) enemy.fireCd -= dt;
    if (enemy.fireCd <= 0 && enemy.weapon && !enemy.weapon.def.melee && enemy.weapon.mag > 0) {
      // 寻路会把朝向改成“后撤方向”，开枪前临时转回目标方向
      const moveAngle = enemy.angle;
      enemy.angle = Math.atan2(dz, dx);
      enemy._blindFire = true;
      world.enemyFire(enemy, target);
      enemy._blindFire = false;
      enemy.angle = moveAngle;
      enemy.fireCd = Math.max(enemy.fireCd, 0.35);
    }
  },

  /* ===================== 同阵营互救 ===================== */
  _findDownedMate(world, enemy, maxDist = 16) {
    const faction = enemy.spec && enemy.spec.faction;
    if (!faction) return null;
    let best = null, bestD = maxDist;
    const list = [];
    if (faction === 'player' && world.player) list.push(world.player);
    for (const e of world.enemies) {
      if (e === enemy || !e.alive || !e.status) continue;
      if ((e.spec && e.spec.faction) !== faction) continue;
      list.push(e);
    }
    for (const mate of list) {
      if (!mate.alive || !mate.body || !mate.status || !mate.status.isDowned() || mate.status.isDead()) continue;
      const d = Math.hypot(mate.body.position.x - enemy.body.position.x,
        mate.body.position.z - enemy.body.position.z);
      if (d < bestD) { bestD = d; best = mate; }
    }
    return best;
  },

  _aiHasAid(enemy) {
    const inv = enemy && enemy.lootInv;
    if (!inv) return false;
    for (const it of inv.items.values()) {
      if (!it || it.table !== 'medical') continue;
      const def = inv.getDef(it);
      const kind = def && def.use && def.use.kind;
      if (kind === 'surgery' || kind === 'blood' || kind === 'bandage') return true;
    }
    return false;
  },

  _aidDowned(world, enemy, dt) {
    enemy.stateT += dt;
    enemy.isCrouching = false;
    enemy.body.height = 2.4; enemy.body.halfH = 1.2;
    const mate = enemy.aidTarget;
    if (!mate || !mate.alive || !mate.status || !mate.status.isDowned()) {
      enemy.state = 'patrol'; enemy.aidTarget = null; enemy._aidT = 0; return;
    }
    const dx = mate.body.position.x - enemy.body.position.x;
    const dz = mate.body.position.z - enemy.body.position.z;
    const d = Math.hypot(dx, dz);
    enemy.angle = Math.atan2(dz, dx);
    if (d > 2.3) {
      world._aiMoveTo(enemy, mate.body.position.x, mate.body.position.z, (enemy.spec.speed || 4.6) * 0.9, dt);
      enemy._aidT = 0;
      return;
    }
    enemy.body.velocity.x = 0;
    enemy.body.velocity.z = 0;
    enemy._aidT = (enemy._aidT || 0) + dt;
    if (enemy._aidT >= 3.2) {
      const ok = world._reviveByAI(mate, enemy);
      if (!ok) {
        // 没有对症药品：放弃救援，回战斗/巡逻
        enemy.state = 'patrol';
        enemy.aidTarget = null;
        enemy._aidT = 0;
        return;
      }
      enemy.state = 'combat';
      enemy.aidTarget = null;
      enemy._aidT = 0;
    }
  },

  // ★ AI 投掷物决策：满足距离/库存/冷却/队友安全后，进入 nade 状态。
  //   这不是“每帧随机扔雷”：先过一次思考间隔与概率，再走 0.7~1.2 秒前摇。
  _considerGrenade(world, enemy, target, dist, ai) {
    const skill = ai.grenade || 0;
    if (skill <= 0 || !target || !target.alive || !target.body) return false;
    if (enemy.state !== 'combat') return false;
    const list = world._aiGrenadeList ? world._aiGrenadeList(enemy) : [];
    if (!list.length) return false;
    if (dist < 7 || dist > 34) return false;
    if (enemy._nadeCd && world.time < enemy._nadeCd) return false;
    if (enemy._nadeThink && world.time < enemy._nadeThink) return false;
    enemy._nadeThink = world.time + 1.0 + Math.random() * 0.8;
    if (Math.random() > 0.28 + skill * 0.5) return false;

    // 优先破片；没有破片才用库存里的第一种（震撼/闪光/燃烧）
    const defId = list.find(id => {
      const d = world.engine.content.get('nade', id);
      return d && d.effect === 'frag';
    }) || list[0];
    const def = world.engine.content.get('nade', defId);
    if (!def) return false;

    // 队友安全：目标落点爆区内不能有友军/非敌对单位，避免 AI 一颗雷清空自己小队
    const clearR = Math.max(
      def.effect === 'frag' ? 10 : 6,
      (def.effect === 'flash' || def.effect === 'stun') ? (def.radius || 12) : 0
    );
    for (const mate of world.enemies) {
      if (mate === enemy || !mate.alive) continue;
      if (world.isHostile(mate.spec.faction, enemy.spec.faction)) continue;
      const dm = Math.hypot(mate.body.position.x - target.body.position.x,
        mate.body.position.z - target.body.position.z);
      if (dm < clearR) return false;
    }
    // 友方投掷还要避开玩家：玩家不在 world.enemies 里，旧版会朝玩家脚边的敌人扔雷
    if (enemy.isAlly && world.player && world.player.alive) {
      const dp = Math.hypot(world.player.body.position.x - target.body.position.x,
        world.player.body.position.z - target.body.position.z);
      if (dp < clearR + 2) return false;
    }
    // 目标贴得太近，自己也在爆区里：不扔。破片/燃烧按真实半径 + 落点散布留安全余量；
    // 闪光/震撼对投掷者本人豁免（AI 会闭眼/背身），但仍要求基本距离。
    const minSelf = def.effect === 'frag' ? (def.radius || 6) + 3 : 9;
    if (dist < Math.max(clearR * 0.85, minSelf)) return false;

    enemy._nadeDefId = defId;
    enemy._nadeWindup = 0.7 + Math.random() * 0.5;
    enemy._nadeWarned = false;
    enemy.state = 'nade';
    enemy.stateT = 0;
    enemy.body.velocity.x = 0;
    enemy.body.velocity.z = 0;
    return true;
  },

  /* ===================== 友方 AI（匹配队友） ===================== */
  // 友方复用同一套感知/射击/换弹/投掷数据，差别只在：跟随玩家、支援、对话。
  _updateAlly(world, enemy, dt) {
    const p = world.player;
    const ai = enemy.spec.ai || {};
    if (!p || !p.alive) return;
    const st = enemy.status;
    if (st && st.isDowned()) {
      enemy.body.velocity.x *= 0.9;
      enemy.body.velocity.z *= 0.9;
      if (!enemy._allyDownSaid) {
        enemy._allyDownSaid = true;
        world._squadSay(enemy.allyName, '我被打倒了，别管我……');
      }
      return;
    }

    // ★ 玩家被判定为叛徒：队友立刻脱离队伍逻辑，把玩家当敌人并拉开枪线
    if (world._betrayedByPlayer) {
      this._updateBetrayedAlly(world, enemy, dt);
      return;
    }

    // 防区跟随玩家：不改这个，_combat 会把队友当成“追出防区”拉回出生点
    enemy.home = { x: p.body.position.x, z: p.body.position.z };
    enemy.patrolRadius = 800;

    let target = this._findTarget(world, enemy, ai);
    let canSee = !!target;
    let dist = target ? Math.hypot(target.body.position.x - enemy.body.position.x,
      target.body.position.z - enemy.body.position.z) : Infinity;
    if (target) {
      enemy.targetEntity = target;
      this._switchEnemyWeapon(world, enemy, dist, true);
    } else {
      enemy.targetEntity = null;
      // ★ 共享标记（无人机自动标记 / 队友标记）：即使目标在 70m 外也要记住最后位置，
      //   追击 18s 直到看到本人或标记过期。旧版只在 70m 内找标记，无人机在高空
      //   标到的远处敌人队友根本不会去。
      const marked = this._findMarkedTarget(world, enemy, 120);
      if (marked) {
        enemy._allyMarkedTarget = marked;
        enemy._allyMarkedUntil = world.time + 18;
        enemy.targetPos = { x: marked.body.position.x, z: marked.body.position.z };
        enemy.awareness = Math.max(enemy.awareness, 0.7);
        if (enemy.state === 'patrol' || enemy.state === 'follow' || enemy.state === 'explore') {
          enemy.state = 'investigate';
          enemy.stateT = 0;
        }
        if (enemy._allyMarkSaidFor !== marked) {
          enemy._allyMarkSaidFor = marked;
          world._squadSay(enemy.allyName, '共享标记有目标，我过去确认。');
        }
      } else if (enemy._allyMarkedTarget && enemy._allyMarkedTarget.alive
          && world.time < (enemy._allyMarkedUntil || 0)) {
        enemy.targetPos = {
          x: enemy._allyMarkedTarget.body.position.x,
          z: enemy._allyMarkedTarget.body.position.z,
        };
        enemy.awareness = Math.max(enemy.awareness, 0.6);
      } else {
        enemy._allyMarkedTarget = null;
        enemy._allyMarkSaidFor = null;
        if (enemy.state !== 'combat' && enemy.state !== 'retreat' && enemy.state !== 'aid') {
          enemy.targetPos = null;
        }
      }
    }

    // ★ 队友也会灭火/拔玻纤：与敌方 `remove` 状态同一套处理
    const acuteFiber = st && st.hasEffect('fiber_acute');
    const onFire = st && st.hasEffect('burning');
    if (enemy.state !== 'remove' && (acuteFiber || onFire) && (!canSee || onFire)) {
      enemy.state = 'remove';
      enemy.stateT = 0;
      enemy._hazardType = onFire ? 'fire' : 'fiber';
      if (onFire && !enemy._allyFireSaid) {
        enemy._allyFireSaid = true;
        world._squadSay(enemy.allyName, '我着火了，先灭火！');
      }
      this._removeFiber(world, enemy, dt);
      this._avoidObstacles(world, enemy, dt);
      return;
    }

    // ★ 队友优先互救：玩家或队友倒下时，先救人再打
    const downedMate = this._findDownedMate(world, enemy, 24);
    if (downedMate && this._aiHasAid(enemy)) {
      if (enemy._allyAidFor !== downedMate) {
        enemy._allyAidFor = downedMate;
        world._squadSay(enemy.allyName,
          (downedMate === p ? '队长倒下了，我去拉人！' : '有人倒了，我去救！'));
      }
      enemy.state = 'aid';
      enemy.aidTarget = downedMate;
      this._aidDowned(world, enemy, dt);
      this._avoidObstacles(world, enemy, dt);
      return;
    }
    if (enemy._allyAidFor) enemy._allyAidFor = null;

    // ★ 正在自我包扎：停步蹲下，完成后再回到战斗/跟随
    if (enemy.state === 'selfaid') {
      this._aidSelf(world, enemy, dt, canSee, dist);
      this._avoidObstacles(world, enemy, dt);
      return;
    }

    // ★ 玩家建议：只是建议，队友会按自己的伤势判断是否执行
    const order = (world._squadOrder && world.time < world._squadOrder.t) ? world._squadOrder : null;
    if (order && enemy._lastOrderId !== order.id) {
      enemy._lastOrderId = order.id;
      world._squadSay(enemy.allyName, order.type === 'advance' ? '收到，向标记点推进。' : '明白，我往标记点撤。');
    }
    const hpQ = st ? st.healthQuality : 100;
    if (order && ((order.type === 'retreat' && (hpQ < 80 || !canSee))
        || (order.type === 'advance' && !canSee && hpQ > 55))) {
      const dxo = order.x - enemy.body.position.x;
      const dzo = order.z - enemy.body.position.z;
      const dOrd = Math.hypot(dxo, dzo);
      enemy.state = order.type === 'retreat' ? 'retreat' : 'advance';
      if (dOrd > 2.2) {
        const sp = (enemy.spec.speed || 4.8) * (order.type === 'retreat' ? 1.05 : 0.9);
        world._aiMoveTo(enemy, order.x, order.z, sp, dt);
      } else {
        enemy.body.velocity.x = 0;
        enemy.body.velocity.z = 0;
      }
      // 执行建议途中如果伤势过重且没看到敌人，先停下自救
      if (!target && this._considerSelfAid(world, enemy)) {
        this._aidSelf(world, enemy, dt, canSee, dist);
        this._avoidObstacles(world, enemy, dt);
        return;
      }
      this._allySupport(world, enemy, dt, target);
      this._avoidObstacles(world, enemy, dt);
      return;
    }

    // ★ 队友受伤后要真的后撤：血量低于 55% 进入撤退，回升到 68% 以上才回到进攻
    if (enemy._allyRetreating && enemy._allyRetreatUntil && world.time > enemy._allyRetreatUntil) {
      enemy._allyRetreating = false;
      enemy._allyRetreatSaid = false;
      enemy._allyRetreatUntil = 0;
    }
    const allyBleed = st && st.effectiveBleedLevel ? st.effectiveBleedLevel() : 0;
    if (hpQ < 55 || allyBleed >= 2) {
      if (!enemy._allyRetreating) enemy._allyRetreatUntil = world.time + 12;
      enemy._allyRetreating = true;
    } else if (hpQ > 68 && allyBleed <= 0) {
      enemy._allyRetreating = false;
      enemy._allyRetreatUntil = 0;
    }
    if (enemy._allyRetreating && target) {
      enemy.state = 'retreat';
      // 自定义后撤距离：拉到 18m 外，而不是 _retreat 的 keep*0.75（约 10m）就停下
      const ax = enemy.body.position.x - target.body.position.x;
      const az = enemy.body.position.z - target.body.position.z;
      const ad = Math.hypot(ax, az) || 1;
      if (ad < 18) {
        const sp = (enemy.spec.speed || 4.8) * 1.05;
        world._aiMoveTo(enemy,
          enemy.body.position.x + ax / ad * 6,
          enemy.body.position.z + az / ad * 6, sp, dt);
      } else {
        enemy.body.velocity.x *= 0.8;
        enemy.body.velocity.z *= 0.8;
        enemy.isCrouching = true;
        enemy.body.height = 1.6; enemy.body.halfH = 0.8;
      }
      if (!enemy._allyRetreatSaid) {
        enemy._allyRetreatSaid = true;
        world._squadSay(enemy.allyName, '我伤得太重，先撤到掩体后！');
      }
      // 退到 16m 外、暂时没被贴脸时，停下用自带药品给自己包扎
      if (ad > 16 && this._considerSelfAid(world, enemy)) {
        this._aidSelf(world, enemy, dt, canSee, dist);
        this._avoidObstacles(world, enemy, dt);
        return;
      }
      this._allySupport(world, enemy, dt, target);
      this._avoidObstacles(world, enemy, dt);
      return;
    }
    enemy._allyRetreatSaid = false;

    // 没有可见敌人但伤势明显：先自救，不带着半血去探索/接战
    if (!target && this._considerSelfAid(world, enemy)) {
      this._aidSelf(world, enemy, dt, canSee, dist);
      this._avoidObstacles(world, enemy, dt);
      return;
    }

    // ★ 队伍撤离计划优先于搜索/交战：队长进撤离区、时间不足时会主动靠拢
    if (world._squadPlan === 'extract' && world._squadExtract) {
      const ex = world._squadExtract;
      const ed = Math.hypot(ex.x - enemy.body.position.x, ex.z - enemy.body.position.z);
      enemy.state = 'extract';
      if (ed > 4) {
        world._aiMoveTo(enemy, ex.x, ex.z, (enemy.spec.speed || 4.8) * 1.02, dt);
      } else if (target && canSee) {
        // 已经在撤离区：就地防守，而不是站着挨打
        enemy.isCrouching = false;
        enemy.body.height = 2.4; enemy.body.halfH = 1.2;
        if (enemy.weapon && enemy.weapon.def && enemy.weapon.def.melee) {
          this._meleeCombat(world, enemy, dt, dist, ai);
        } else {
          this._combat(world, enemy, dt, dist, true, ai);
        }
      } else {
        enemy.body.velocity.x = 0;
        enemy.body.velocity.z = 0;
        enemy.isCrouching = true;
        enemy.body.height = 1.6; enemy.body.halfH = 0.8;
      }
      this._allySupport(world, enemy, dt, target);
      this._avoidObstacles(world, enemy, dt);
      return;
    }

    // 投掷前摇期间不再执行其它动作
    if (enemy.state === 'nade') {
      this._throwEnemyGrenade(world, enemy, dt);
      this._avoidObstacles(world, enemy, dt);
      return;
    }

    if (target && canSee) {
      enemy.state = 'combat';
      if (enemy.weapon && enemy.weapon.def && enemy.weapon.def.melee) {
        this._meleeCombat(world, enemy, dt, dist, ai);
      } else {
        this._combat(world, enemy, dt, dist, true, ai);
      }
      if (enemy.state === 'combat') this._considerGrenade(world, enemy, target, dist, ai);
      // 友方投掷：真正出手时用一句短报点告诉玩家，而不是悄悄扔雷
      if (enemy.state === 'nade' && !enemy._allyNadeSaid) {
        enemy._allyNadeSaid = true;
        world._squadSay(enemy.allyName, '吃颗手雷，注意爆区！');
      }
      this._allyCombatTalk(world, enemy, target, dist);
    } else if (enemy.targetPos) {
      enemy.state = 'investigate';
      this._investigate(world, enemy, dt);
      // 调查结束（8s）后清掉旧点，否则队友会永远朝同一个空位置来回走
      if (enemy.state === 'patrol') enemy.targetPos = null;
    } else {
      this._allyIdleChat(world, enemy);
      const dPlayer = Math.hypot(p.body.position.x - enemy.body.position.x,
        p.body.position.z - enemy.body.position.z);
      // 队长走远了先归队；否则主动去地图上没探索过的区域
      if (dPlayer > 50) {
        this._allyFollowPlayer(world, enemy, dt);
      } else if (!this._allyExplore(world, enemy, dt)) {
        this._allyFollowPlayer(world, enemy, dt);
      }
    }

    this._allySupport(world, enemy, dt, target);
    this._avoidObstacles(world, enemy, dt);
    const half = world.mapSpec.size / 2 - 2;
    enemy.body.position.x = Math.max(-half, Math.min(half, enemy.body.position.x));
    enemy.body.position.z = Math.max(-half, Math.min(half, enemy.body.position.z));
    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
  },

  // 背叛状态：不再跟随/治疗/接受命令；低距离优先脱离，远距离把玩家当目标射击
  _updateBetrayedAlly(world, enemy, dt) {
    const p = world.player;
    if (!p || !p.body || !p.alive) return;
    enemy.isBetrayed = true;
    enemy.targetEntity = p;
    const dx = p.body.position.x - enemy.body.position.x;
    const dz = p.body.position.z - enemy.body.position.z;
    const d = Math.hypot(dx, dz) || 1;
    if (d < 26) {
      enemy.state = 'flee';
      world._aiMoveTo(enemy,
        enemy.body.position.x - dx / d * 20,
        enemy.body.position.z - dz / d * 20,
        (enemy.spec.speed || 4.8) * 1.35, dt);
    } else {
      enemy.state = 'combat';
      enemy.body.velocity.x = 0;
      enemy.body.velocity.z = 0;
      enemy.angle = Math.atan2(dz, dx);
    }
    // 拉开到 8m 外后仍会还击；近身时优先逃，不站着对枪
    if (d > 8 && d < 46 && enemy.weapon && enemy.weapon.loaded && enemy.weapon.loaded.qty > 0) {
      if (enemy.fireCd > 0) enemy.fireCd -= dt;
      if (enemy.fireCd <= 0) {
        world.enemyFire(enemy, p);
        enemy.fireCd = 0.4 + Math.random() * 0.5;
      }
    }
    this._avoidObstacles(world, enemy, dt);
  },

  _allyCombatTalk(world, enemy, target, dist) {
    if (world.time < (enemy._allySpotCd || 0)) return;
    enemy._allySpotCd = world.time + 9 + Math.random() * 5;
    // 有时选择无线电静默：不是每次发现都播报，保留“说不说”的随机性
    if (Math.random() < 0.22) return;
    const eName = target && target.spec ? world.engine.i18n.t(target.spec.name) : '敌人';
    const lines = [
      '发现' + eName + '，距离 ' + Math.round(dist) + ' 米，准备接战。',
      eName + '在' + Math.round(dist) + '米，我先架住。',
      '有动静，' + eName + '，别急着冲。',
      '看到' + eName + '了，掩护我换位。',
    ];
    world._squadSay(enemy.allyName, lines[Math.floor(Math.random() * lines.length)]);
  },

  _allyIdleChat(world, enemy) {
    if (world.time < (enemy._allyIdleCd || 0)) return;
    enemy._allyIdleCd = world.time + 18 + Math.random() * 16;
    const lines = [
      '弹药还够，继续搜。',
      '这一片没人，我去前面看看。',
      '注意高点，别被人架枪。',
      '有药就留着，别急着用。',
      '队长，撤离点在哪边？',
      '我尾巴有点痒……不，没事。',
      '箱子都翻过了，没值钱货。',
      '脚步轻点，这附近可能有埋伏。',
    ];
    world._squadSay(enemy.allyName, lines[Math.floor(Math.random() * lines.length)]);
  },

  _allySupport(world, enemy, dt, target) {
    const p = world.player;
    const now = world.time;
    const st = enemy.status;
    if (!p || !st) return;

    // 自我急救已改成可见的 `selfaid` 状态（见 _considerSelfAid / _aidSelf）：
    // 队友会先停步、蹲下包扎，再回到战斗，不再在奔跑中瞬间回血。

    // 侦察/标记：队内第一名负责共享标记，其他人直接受益
    if (enemy.allyIndex === 0 && target && now > (enemy._allyMarkCd || 0)) {
      enemy._allyMarkCd = now + 12;
      world._markEntity(target, 10, 'ally_mark', 'player');
      world._squadSay(enemy.allyName, '已标记目标，位置共享。');
    }

    // 医疗兵：在 10m 内给最重的队友/玩家包扎（会补血、封堵 2 级出血、修复最伤部位）
    if (enemy.allyRole === 'medic' && now > (enemy._allyAidCd || 0)) {
      const patients = [p, ...world.allies].filter(a =>
        a && a.alive && a !== enemy && a.status && !a.status.isDowned() && a.status.healthQuality < 62);
      patients.sort((a, b) => a.status.healthQuality - b.status.healthQuality);
      const patient = patients.find(a =>
        Math.hypot(a.body.position.x - enemy.body.position.x, a.body.position.z - enemy.body.position.z) < 10);
      if (patient) {
        enemy._allyAidCd = now + 16;
        const s = patient.status;
        s.blood = Math.min(s.maxBlood, s.blood + s.maxBlood * 0.12);
        s.sealBleeding(2);
        s.addEffect('bandaged', 12, 1);
        let worst = null, ratio = 1;
        for (const k in s.parts) {
          const r = s.parts[k].hp / s.parts[k].maxHp;
          if (r < ratio) { ratio = r; worst = k; }
        }
        if (worst) s.parts[worst].hp = Math.min(s.parts[worst].maxHp,
          s.parts[worst].hp + s.parts[worst].maxHp * 0.12);
        s.updateOverallHealth();
        world._squadSay(enemy.allyName,
          '正在给' + (patient === p ? '队长' : (patient.allyName || '队友')) + '处理伤口。');
      }
    }

    // 低血量 / 玩家重伤 / 计划汇报
    if (st.healthQuality < 35 && !enemy._allyLowSaid) {
      enemy._allyLowSaid = true;
      world._squadSay(enemy.allyName, '我伤得很重，需要掩护！');
    } else if (st.healthQuality > 60) {
      enemy._allyLowSaid = false;
    }
    if (p.status && p.status.healthQuality < 40 && now > (world._allyPlayerLowCd || 0)) {
      world._allyPlayerLowCd = now + 18;
      world._squadSay(enemy.allyName, '队长，你伤得很重！先找掩体。');
    }
    if (p.status && p.status.isDowned() && !world._allyPlayerDownSaid) {
      world._allyPlayerDownSaid = true;
      world._squadSay(enemy.allyName, '队长倒下了！');
    }
    // 低弹量报点：让队友的弹药状态也成为可听信息
    const w = enemy.weapon;
    if (w && w.loaded && w.magCap && w.loaded.qty <= Math.max(2, Math.floor(w.magCap * 0.2))
        && now > (enemy._allyAmmoCd || 0)) {
      enemy._allyAmmoCd = now + 14;
      world._squadSay(enemy.allyName, w.reserve > 0 ? '弹匣快空了，我换弹。' : '我没子弹了，谁有多的弹匣？');
    }
    if (enemy.allyIndex === 0 && now > (enemy._allyPlanCd || 0)) {
      enemy._allyPlanCd = now + 32 + Math.random() * 16;
      const lines = target
        ? ['我从左侧包抄，你压住正面。', '目标被压制，准备推进。', '我换弹，帮我掩护两秒。',
           '别追太深，先确认侧翼。', '他躲在掩体后，我扔雷逼一下。']
        : ['我在你右后方，继续搜索。', '这一片暂时安全。', '有情况就喊我，我会共享标记。',
           '我去前面那栋楼看看。', '箱子翻完了，往下一个点走。', '队长，注意时间。'];
      world._squadSay(enemy.allyName, lines[Math.floor(Math.random() * lines.length)]);
    }
  },

  /* ===================== 友方 AI 探索 / 跟随 ===================== */
  _allyFollowPlayer(world, enemy, dt) {
    const p = world.player;
    if (!p || !p.body) return;
    enemy.state = 'follow';
    const dx = p.body.position.x - enemy.body.position.x;
    const dz = p.body.position.z - enemy.body.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 8) {
      const sp = (d > 18 ? 1.0 : 0.72) * (enemy.spec.speed || 4.8);
      world._aiMoveTo(enemy, p.body.position.x, p.body.position.z, sp, dt);
    } else {
      enemy.body.velocity.x *= 0.82;
      enemy.body.velocity.z *= 0.82;
      if (d > 0.1) enemy.angle = Math.atan2(dz, dx);
    }
  },

  // 主动探索：没有敌人、没有共享标记时，队友不再原地转圈，
  // 而是去地图上尚未探索、且当前看得见的区域；到达后标记该格并换下一个点。
  _allyExplore(world, enemy, dt) {
    const p = world.player;
    if (!p || !p.body) return false;
    let ep = enemy._explorePoint;
    let needNew = !ep;
    if (ep) {
      const pd = Math.hypot(ep.x - p.body.position.x, ep.z - p.body.position.z);
      if (pd > 48 || world.time > (enemy._exploreUntil || 0) || (enemy._stuckT || 0) > 1.2) needNew = true;
    }
    if (needNew && ep) {
      world._markExplored(ep.x, ep.z, 1);
      ep = null;
      enemy._explorePoint = null;
      enemy._explorePauseUntil = world.time + 0.8;
    }
    if (!ep) {
      if (world.time < (enemy._explorePauseUntil || 0)) {
        // 到达一个探索点后原地观察/等待，不要立刻往玩家方向折返
        enemy.state = 'explore';
        enemy.body.velocity.x = 0;
        enemy.body.velocity.z = 0;
        return true;
      }
      ep = world._pickAllyExplorePoint(enemy);
      if (!ep) {
        // 附近没有可去的未探索点时别每帧重算 32 条射线
        enemy._explorePauseUntil = world.time + 2 + Math.random() * 2;
        return false;
      }
      enemy._explorePoint = ep;
      enemy._exploreUntil = world.time + 16;
      enemy.state = 'explore';
    }
    const dx = ep.x - enemy.body.position.x;
    const dz = ep.z - enemy.body.position.z;
    const d = Math.hypot(dx, dz);
    enemy.state = 'explore';
    if (d > 2.4) {
      const sp = (enemy.spec.speed || 4.8) * (d > 12 ? 0.8 : 0.55);
      world._aiMoveTo(enemy, ep.x, ep.z, sp, dt);
    } else {
      enemy.body.velocity.x = 0;
      enemy.body.velocity.z = 0;
      world._markExplored(ep.x, ep.z, 1);
      enemy._explorePoint = null;
      enemy._explorePauseUntil = world.time + 1.2 + Math.random() * 1.4;
    }
    return true;
  },

  /* ===================== AI 自我急救 ===================== */
  // 进入 selfaid：先判定有没有对症药品，再决定是否值得停步。
  // 敌我通用；是否安全由调用处（!canSee / 撤退距离）决定。
  _considerSelfAid(world, enemy) {
    if (!world || !enemy || !enemy.alive || !enemy.status) return false;
    if (enemy.state === 'selfaid') return true;
    if (!this._aiHasAid(enemy)) return false;
    if (enemy._selfAidCd && world.time < enemy._selfAidCd) return false;
    const st = enemy.status;
    if (st.isDowned() || st.isDead()) return false;
    const bleed = st.effectiveBleedLevel ? st.effectiveBleedLevel() : 0;
    // 轻伤不浪费药品；出血或健康度明显下降才停下来处理
    if (st.healthQuality >= 68 && bleed <= 0) return false;
    enemy.state = 'selfaid';
    enemy.stateT = 0;
    enemy._selfAidNeed = bleed > 0 ? 2.6 : (st.healthQuality < 45 ? 3.6 : 2.8);
    enemy._selfAidCd = world.time + 26;
    enemy.body.velocity.x = 0;
    enemy.body.velocity.z = 0;
    if (enemy.isAlly) world._squadSay(enemy.allyName, '我处理一下伤口，掩护我。');
    return true;
  },

  _aidSelf(world, enemy, dt, canSee, dist) {
    enemy.stateT += dt;
    enemy.isCrouching = true;
    enemy.body.height = 1.6;
    enemy.body.halfH = 0.8;
    enemy.body.velocity.x = 0;
    enemy.body.velocity.z = 0;
    // 包扎到一半被贴脸：立刻放弃自救回到战斗，避免站着挨打
    if (canSee && dist < 15 && enemy.status.healthQuality > 35) {
      enemy.state = 'combat';
      enemy.stateT = 0;
      enemy.isCrouching = false;
      enemy.body.height = 2.4;
      enemy.body.halfH = 1.2;
      enemy._selfAidCd = world.time + 8;
      return;
    }
    if (enemy.stateT < (enemy._selfAidNeed || 2.8)) return;
    const ok = world._aiHealByAI(enemy, enemy);
    if (!ok) enemy._selfAidCd = world.time + 10;
    enemy.state = 'patrol';
    enemy.stateT = 0;
    enemy.isCrouching = false;
    enemy.body.height = 2.4;
    enemy.body.halfH = 1.2;
  },

  _throwEnemyGrenade(world, enemy, dt) {
    enemy.stateT += dt;
    enemy.isCrouching = false;
    enemy.body.height = 2.4; enemy.body.halfH = 1.2;
    enemy.body.velocity.x = 0;
    enemy.body.velocity.z = 0;
    const target = enemy.targetEntity;
    if (!target || !target.alive || !enemy._nadeDefId) {
      enemy.state = 'combat';
      enemy.stateT = 0;
      enemy._nadeDefId = null;
      enemy._nadeWarned = false;
      return;
    }
    enemy.angle = Math.atan2(target.body.position.z - enemy.body.position.z,
      target.body.position.x - enemy.body.position.x);
    // 前摇中期拉环声：给玩家“听到—后撤”的窗口，而不是无声空袭
    if (!enemy._nadeWarned && enemy.stateT >= (enemy._nadeWindup || 0.9) * 0.45) {
      enemy._nadeWarned = true;
      world._playSFXAt('switch', enemy.body.position.x, enemy.body.position.z, { volume: 0.55, maxDist: 34 });
    }
    if (enemy.stateT >= (enemy._nadeWindup || 0.9)) {
      const ok = world._aiThrowGrenade(enemy, enemy._nadeDefId, target);
      if (ok) {
        enemy._nadeCd = world.time + 12 + Math.random() * 10;
        enemy.fireCd = Math.max(enemy.fireCd || 0, 0.55);
        enemy.awareness = Math.max(enemy.awareness || 0, 0.8);
        enemy._allyNadeSaid = false;
      }
      enemy.state = 'combat';
      enemy.stateT = 0;
      enemy._nadeDefId = null;
      enemy._nadeWarned = false;
    }
  },

  _flee(world, enemy, dt, target, ai){
    enemy.stateT += dt;
    enemy.isCrouching = false; enemy.body.height = 2.4; enemy.body.halfH = 1.2;
    // 因手雷逃跑：威胁消失后立即回到战斗，不必傻跑满 7 秒
    if (enemy._grenadeFleeUntil && world.time > enemy._grenadeFleeUntil) {
      const still = AISystem._grenadeThreat(world, enemy);
      if (!still) {
        enemy._grenadeFleeUntil = 0;
        enemy.state = 'combat';
        enemy.stateT = 0;
        if (!enemy.targetEntity && world.player && world.player.alive) enemy.targetEntity = world.player;
        return;
      }
      enemy._grenadeFleeUntil = world.time + 1.2;
      const dx = enemy.body.position.x - still.x;
      const dz = enemy.body.position.z - still.z;
      const len = Math.hypot(dx, dz) || 1;
      enemy.targetPos = { x: enemy.body.position.x + dx / len * 13, z: enemy.body.position.z + dz / len * 13 };
    }
    // 逃太久或伤势稳定后回到巡逻，避免被闪一次就永远逃跑
    if (enemy.stateT > 7 && (!target || !target.alive || enemy.status.healthQuality > 35)) {
      enemy.state = 'patrol';
      enemy.stateT = 0;
      enemy.awareness = 0;
      enemy.targetEntity = null;
      return;
    }

    let moveX = 0, moveZ = 0;
    if (enemy.targetPos) {
      const dx = enemy.targetPos.x - enemy.body.position.x;
      const dz = enemy.targetPos.z - enemy.body.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.5) {
        world._aiMoveTo(enemy, enemy.targetPos.x, enemy.targetPos.z, enemy.spec.speed, dt);
        moveX = enemy.body.velocity.x;
        moveZ = enemy.body.velocity.z;
      } else {
        enemy.isCrouching = true;
        enemy.body.height = 1.6; enemy.body.halfH = 0.8;
      }
    } else {
      if (!target || !target.body) {
        enemy.state = 'patrol';
        enemy.stateT = 0;
        enemy.targetEntity = null;
        return;
      }
      const dx = target.body.position.x - enemy.body.position.x;
      const dz = target.body.position.z - enemy.body.position.z;
      enemy.angle = Math.atan2(dz, dx) + Math.PI; 
      moveX = Math.cos(enemy.angle) * enemy.spec.speed;
      moveZ = Math.sin(enemy.angle) * enemy.spec.speed;
    }

    if (target && target.body && (ai.opportunism > 0.5 || ai.aggression > 0.6)) {
      const distToTarget = Math.hypot(target.body.position.x - enemy.body.position.x, target.body.position.z - enemy.body.position.z);
      if (distToTarget < 20 && enemy.weapon && enemy.weapon.def && !enemy.weapon.def.melee && enemy.weapon.loaded.qty > 0) {
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
    // 受击方向必须可靠：先面向攻击来源，再按镇定程度给很小的角度误差。
    // 旧版低镇定单位会随机转半圈，看起来像“左右迷茫”。
    const err = (1 - (ai.composure || 0.5)) * 0.35;
    enemy.angle = attackAngle + (Math.random() - 0.5) * err;
    enemy._lastKnownTarget = { x: srcX, z: srcZ, t: world.time };
    if (world.player && world.player.alive) {
      enemy.targetEntity = world.player;
      enemy.targetPos = { x: srcX, z: srcZ };
      AISystem._alertSquad(world, enemy, world.player, Math.hypot(dx, dz));
    }

    const isLegBroken = enemy.status.parts.legs.fracture > 0;
    const isHeavyHurt = enemy.status.healthQuality < 30;

    if (isLegBroken && ai.opportunism > 0.4) {
      enemy.state = 'combat';
      enemy.isCrouching = true;
      enemy.body.height = 1.6; enemy.body.halfH = 0.8;
      enemy.targetPos = null;
      enemy.reactionTimer = 0.25;
    } else if (isHeavyHurt && ai.aggression < 0.7) {
      enemy.state = 'flee';
      enemy.targetPos = AISystem._findCover(world, enemy, world.player);
      enemy.reactionTimer = 0.35;
    } else {
      enemy.state = 'combat';
      enemy.stateT = 0;
      enemy.reactionTimer = Math.min(enemy.reactionTimer || 0.2, 0.25);
      if (ai.aggression > 0.8) {
        enemy.body.velocity.x = Math.cos(attackAngle) * enemy.spec.speed * 0.45;
        enemy.body.velocity.z = Math.sin(attackAngle) * enemy.spec.speed * 0.45;
      }
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
     weaponBar: document.getElementById('weapon-bar'),
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
        e.stopPropagation();
        // ★ 点按切换（不再需要按住），避免开火/瞄准时按不到防护
        this.world._toggleProtection(level);
        this._syncProtectButtons();
      });
    }
    this._syncProtectButtons();
  }

  _syncProtectButtons(){
    if (!this._protectBtns) return;
    const p = this.world.player;
    for (const btn of this._protectBtns) {
      const level = btn.dataset.level;
      const active = !!(p && p.protectionHold && p.protection === level);
      btn.classList.toggle('active', active);
    }
  }

 update(){
  const p = this.world.player;
  if (!p) return;

  this._initEls();
  this._bindProtectionButtons();
  this._syncProtectButtons();

  // ★ 动态准星散布（供 _renderDamageIndicator 绘制）
  const cwNow = this.world.currentWeapon;
  let chSpread = 0;
  if (cwNow && !cwNow.isFist && !(cwNow.def && cwNow.def.melee)) {
    chSpread = cwNow.def.spread || 0.02;
    if (p.ads) chSpread *= 0.2;
    if (p.isCrouching) chSpread *= 0.6;
    if (p.holdingBreath) chSpread *= 0.5;
    if (p.status && p.status.hasEffect('pain')) chSpread *= 1.2;
  }
  this._crosshairSpread = chSpread;

  this._applyVisibility();
  this._renderMinimap();
  this._renderWeaponBar();
  this._renderSkillBar(p);
  this._renderFiberBtn(p);
  this._renderExtinguishBtn(p);
  this._renderThrowArmBtn(p);
  this._renderHazardOverlay(p);
  this._renderTacticalState(p);
  this._renderDamageIndicator();
  this._renderSoundRadar();
    
  // 数值更新
  this._setText('player-name', p.charSpec ? this.engine.i18n.t(p.charSpec.name) : '—');
  this._setText('player-tag', p.charSpec ? this.engine.i18n.t(p.charSpec.tag) : '—');

  // 更新定性状态与颜色
const hq = p.status ? p.status.healthQuality : 100;
const hText = p.status ? p.status.getHealthText() : '健康';
this._setStyle('hp-bar', 'width', Math.max(0, Math.round(hq)) + '%');

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

// ★ 负重显示
if (p.carryWeight !== undefined) {
  const lim = p.carryLimit || 34;
  const hard = p.carryHardLimit || Math.round(lim * 1.35 * 10) / 10;
  // 超过软上限后把“硬上限”一起显示：玩家需要知道最多还能超到多少，而不是以为没有上限
  const hardTxt = p.carryWeight > lim ? '（硬上限 ' + hard.toFixed(1) + '）' : '';
  this._setText('carry-weight', p.carryWeight.toFixed(1) + ' / ' + Math.round(lim) + ' kg' + hardTxt);
  const st = p.loadState || 'normal';
  const label = st === 'overweight' ? '超重' : (st === 'loaded' ? '负重' : '正常');
  const col = st === 'overweight' ? '#ff6a6a' : (st === 'loaded' ? '#ffd93d' : '#6fe07a');
  this._setText('load-state', label);
  this._setStyle('load-state', 'color', col);
}

  if (p.charSpec && p.charSpec.prazer) {
    const cpPct = Math.max(0, Math.min(100, p.coupling / p.maxCoupling * 100));
    this._setStyle('cp-bar', 'width', cpPct + '%');
    this._setText('cp-text', Math.round(cpPct) + '%');
  }

 // 武器与弹药
const cw = this.world.currentWeapon;
if (cw) {
  this._setText('weapon-name', (cw.item && cw.item.damaged ? '[损坏] ' : '') + this.engine.i18n.t(cw.def.name));
  const isMeleeLike = cw.isFist || (cw.def && cw.def.melee);
  if (isMeleeLike) {
    this._setText('ammo-mag', '—');
    this._setText('ammo-reserve', '—');
    this._setText('next-ammo', '');
    this._setFireModeBtn(null);
  } else {
    this._setText('ammo-mag', String(cw.mag));
    this._setText('ammo-reserve', String(cw.reserve));
    // 下一发子弹名称（彩虹子弹队列的第一发）
    let nextId = cw.def.ammoType;
    if (cw.loaded && cw.loaded.queue && cw.loaded.queue.length > 0) nextId = cw.loaded.queue[0];
    const nextDef = this.engine.content.get('ammo', nextId);
    this._setText('next-ammo', nextDef ? ('下一发 · ' + this.engine.i18n.t(nextDef.name)) : '');
    this._setFireModeBtn(cw);
  }
}

// ★ 投掷模式提示
const thHint = document.getElementById('throwable-hint');
if (thHint) {
  if (p.activeThrowable) {
    const nd = this.engine.content.get('nade', p.activeThrowable);
    const name = nd ? this.engine.i18n.t(nd.name) : p.activeThrowable;
    const charge = Math.round((p._throwCharge || 0) * 100);
    const fuse = p._throwPinPulled ? ` · 引信 ${(p._throwFuse || 0).toFixed(1)}s` : '';
    const trigger = nd && nd.trigger === 'impact' ? '压感·撞击即爆' : '保险·先解除保险(J)';
    thHint.textContent = `投掷 · ${name}（${trigger}${fuse} · 蓄力 ${charge}% · 松开攻击键投出）`;
    thHint.style.display = 'block';
  } else {
    thHint.style.display = 'none';
  }
}
// ★ 投掷物轮盘入口按钮
const nwb = document.getElementById('nade-wheel-btn');
if (nwb) {
  if (!this._nadeBtnBound) {
    this._nadeBtnBound = true;
    nwb.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.world && this.world._toggleNadeWheel) this.world._toggleNadeWheel();
    });
  }
  const hasNades = !!(this.world && this.world._getThrowableList && this.world._getThrowableList().length > 0);
  nwb.style.display = hasNades ? 'block' : 'none';
}
// ★ 医疗轮盘入口按钮
const mwb = document.getElementById('med-wheel-btn');
if (mwb) {
  if (!this._medBtnBound) {
    this._medBtnBound = true;
    mwb.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.world && this.world._toggleMedWheel) this.world._toggleMedWheel();
    });
  }
  const hasMeds = !!(this.world && this.world._getMedicalWheelList && this.world._getMedicalWheelList().length > 0);
  mwb.style.display = hasMeds ? 'block' : 'none';
}

// ★ 无人机面板
const dp = document.getElementById('drone-panel');
if (dp) {
  const wld = this.world;
  if (wld.drones && wld.drones[0]) {
    const d = wld.drones[0];
    const isTouch = (this.world.engine.app && this.world.engine.app.platform === 'mobile') ||
      (this.world.engine.app && this.world.engine.app.platform === 'auto' && 'ontouchstart' in window);
    dp.style.display = 'block';
    dp.innerHTML = '🛸 侦察无人机<br>电量 ' + Math.max(0, Math.round(d.battery)) + '% · 耐久 ' + Math.round(d.durability) + '/' + d.maxDurability +
      (wld.player && wld.player._controllingDrone
        ? '<br><span style="color:#7bf5a8">操控中 · ' + (isTouch ? '点「升 / 降 / 退出」' : '空格升 / C 降 / Y 退出') + '</span>'
        : '<br><span style="color:#8fb0c8">' + (isTouch ? '点小地图或「无人机」接管' : 'Y / 再按技能进入操控') + '</span>');
    const dh = document.getElementById('drone-hud');
    if (dh) {
      const on = !!(wld.player && wld.player._controllingDrone);
      dh.classList.toggle('on', on);
      const hudEl = document.getElementById('hud');
      if (hudEl) hudEl.classList.toggle('drone-mode', on);
      const stats = document.getElementById('drone-hud-stats');
      if (stats) {
        const pl = d.payload || { frag: 0, emp: 0 };
        stats.innerHTML = '电量 <b>' + Math.max(0, Math.round(d.battery)) + '%</b> · 耐久 <b>' +
          Math.round(d.durability) + '/' + d.maxDurability + '</b> · 手雷 <b>' + pl.frag + '</b> · EMP <b>' + pl.emp + '</b>';
      }
      const fb = document.getElementById('drone-frag-btn');
      const eb = document.getElementById('drone-emp-btn');
      if (fb) fb.textContent = '手雷 ×' + ((d.payload && d.payload.frag) || 0);
      if (eb) eb.textContent = 'EMP ×' + ((d.payload && d.payload.emp) || 0);
    }
  } else {
    const dh2 = document.getElementById('drone-hud');
    if (dh2) dh2.classList.remove('on');
    dp.style.display = 'none';
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
  this._updateTrainingHUD();
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

  // ★ 闪光/强光/闪回/失血的视野惩罚，统一折进边缘暗化
  const visionPenalty = (p && !p._immuneNeg && p.status && p.status.getVisionPenalty) ? p.status.getVisionPenalty() : 0;
  if (visionPenalty > 0) {
    vignetteOpacity = Math.max(vignetteOpacity, 0.25 + visionPenalty * 0.65);
    centerDark = Math.max(centerDark, visionPenalty * 0.16);
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

  // 检查耳机装备；EMP 损坏的耳机不再提供增强听觉
  const inv = this.engine.app.inventory;
  const earUid = inv && inv.equipped ? inv.equipped.helmetEar : null;
  const earItem = earUid && inv.items ? inv.items.get(earUid) : null;
  const hasHeadset = !!(earUid && earItem && !earItem.damaged);
  
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
  const drone = this.world.drones && this.world.drones[0];
  const controlling = !!(p._controllingDrone && drone);
  const center = controlling ? drone.mesh.position : p.body.position;
  const px = center.x, pz = center.z;

  // 小地图点击：有无人机时接管/退出操控
  if (!canvas._droneBound) {
    canvas._droneBound = true;
    canvas.style.pointerEvents = 'auto';
    canvas.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      const w2 = this.world;
      if (w2 && w2._toggleDroneControl) w2._toggleDroneControl();
    });
  }

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

  // ★ 被标记的敌人（无人机/技能标记）：按阵营着色，带脉冲环
  const blink = 0.55 + 0.45 * Math.sin(this.world.time * 6);
  for (const e of this.world.enemies) {
    if (!e.alive) continue;
    if (!(e.markedUntil && this.world.time < e.markedUntil)) continue;
    const sx = cx + (e.body.position.x - px) * scale;
    const sy = cy + (e.body.position.z - pz) * scale;
    if (sx < -8 || sx > w + 8 || sy < -8 || sy > h + 8) continue;
    const fdef = this.engine.content.get('factions', e.spec.faction);
    const color = (fdef && fdef.css) || '#ff3b3b';
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.globalAlpha = blink;
    ctx.beginPath(); ctx.arc(sx, sy, 6.5 + blink * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ★ 无人机位置 / 操控中位于中心
  if (drone) {
    const dm = drone.mesh.position;
    const sx = controlling ? cx : cx + (dm.x - px) * scale;
    const sy = controlling ? cy : cy + (dm.z - pz) * scale;
    if (sx > -8 && sx < w + 8 && sy > -8 && sy < h + 8) {
      ctx.fillStyle = '#3fd0ff';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 5, sy + 4); ctx.lineTo(sx - 5, sy + 4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // 不再绘制大范围侦测圈：它会盖住半张小地图，只保留无人机图标与敌人标记
    }
  }

  // ★ 共享队友位置：友方 AI 的位置/倒地状态画在小地图上
  if (this.world.allies) {
    for (const a of this.world.allies) {
      if (!a || !a.alive || !a.body) continue;
      const sx = cx + (a.body.position.x - px) * scale;
      const sy = cy + (a.body.position.z - pz) * scale;
      if (sx < -8 || sx > w + 8 || sy < -8 || sy > h + 8) continue;
      const downed = a.status && a.status.isDowned();
      ctx.fillStyle = (downed || a.isBetrayed) ? '#ff6b6b' : '#51e08a';
      ctx.beginPath();
      ctx.arc(sx, sy, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (downed) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy - 3); ctx.lineTo(sx + 3, sy + 3);
        ctx.moveTo(sx + 3, sy - 3); ctx.lineTo(sx - 3, sy + 3);
        ctx.stroke();
      }
    }
  }

  // 绘制玩家（非操控时位于中心；操控时显示玩家真实位置）
  const playerSx = controlling ? cx + (p.body.position.x - px) * scale : cx;
  const playerSy = controlling ? cy + (p.body.position.z - pz) * scale : cy;
ctx.fillStyle = '#1a6ab8';
ctx.beginPath();
ctx.arc(playerSx, playerSy, 5, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 1.5;
ctx.stroke();

// 玩家朝向线
ctx.strokeStyle = 'rgba(26,106,184,0.9)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(playerSx, playerSy);
ctx.lineTo(playerSx + Math.sin(this.engine.cameraCtl.yaw) * 14, playerSy - Math.cos(this.engine.cameraCtl.yaw) * 14);
ctx.stroke();

  if (controlling) {
    ctx.fillStyle = 'rgba(10,30,50,.75)';
    ctx.fillRect(4, 4, 74, 15);
    ctx.fillStyle = '#7be8ff';
    ctx.font = '10px monospace';
    ctx.fillText('无人机视角', 8, 15);
  }
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

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // ★ 动态准星：随当前武器/开镜/蹲下/屏息/疼痛变化散布
  const spread = this._crosshairSpread || 0;
  const gap = 7 + Math.min(70, spread * 800);
  const len = 6;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 2;
  ctx.beginPath();
  ctx.moveTo(cx - gap - len, cy); ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + len, cy);
  ctx.moveTo(cx, cy - gap - len); ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + len);
  ctx.stroke();
  // 中心点
  ctx.beginPath();
  ctx.arc(cx, cy, 1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  ctx.restore();

  // ★ 被无人机/技能标记的敌人：在视野里画四角括号 + 距离，而不是整块方框糊脸
  const w0 = this.world;
  if (w0 && w0.player && w0.time !== undefined) {
    const cam = this.engine.renderer.camera;
    const v = new THREE.Vector3();
    for (const e of w0.enemies) {
      if (!e.alive || !(e.markedUntil && w0.time < e.markedUntil)) continue;
      v.set(e.body.position.x, e.body.position.y + 1.4, e.body.position.z).project(cam);
      if (v.z > 1 || v.z < -1) continue;
      const sx = (v.x * 0.5 + 0.5) * canvas.width;
      const sy = (-v.y * 0.5 + 0.5) * canvas.height;
      if (sx < -40 || sx > canvas.width + 40 || sy < -40 || sy > canvas.height + 40) continue;
      const fdef = this.engine.content.get('factions', e.spec.faction);
      const color = (fdef && fdef.css) || '#ff6a6a';
      const half = 15, arm = 6;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      // 左上
      ctx.moveTo(sx - half, sy - half + arm); ctx.lineTo(sx - half, sy - half); ctx.lineTo(sx - half + arm, sy - half);
      // 右上
      ctx.moveTo(sx + half - arm, sy - half); ctx.lineTo(sx + half, sy - half); ctx.lineTo(sx + half, sy - half + arm);
      // 左下
      ctx.moveTo(sx - half, sy + half - arm); ctx.lineTo(sx - half, sy + half); ctx.lineTo(sx - half + arm, sy + half);
      // 右下
      ctx.moveTo(sx + half - arm, sy + half); ctx.lineTo(sx + half, sy + half); ctx.lineTo(sx + half, sy + half - arm);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = color;
      ctx.font = '9px ui-monospace, monospace';
      const distTxt = Math.round(Math.hypot(e.body.position.x - w0.player.body.position.x, e.body.position.z - w0.player.body.position.z)) + 'm';
      ctx.fillText(distTxt, sx - 10, sy + half + 11);
      ctx.restore();
    }
  }

  const w = this.world;
  if (!w || !w.lastHitDir || w.time - (w.lastHitTime || 0) > 1.5) return;

  // 受击弧线（相对于玩家当前的 yaw）
  const relAngle = w.lastHitDir; 
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
  const el = document.getElementById('status-bar');
  if (!el) return;
  if (!p.status) { el.innerHTML = ''; this._lastEffectSig = ''; return; }
  
  // 效果列表/强度变化才重建 DOM；剩余时间每帧只更新透明度，避免闪烁
  const sig = Array.from(p.status.effects.entries()).map(([id, eff]) => id + ':' + eff.strength).join(',');
  if (this._lastEffectSig !== sig) {
    this._lastEffectSig = sig;
    let html = '';
    for (const [id, eff] of p.status.effects) {
      const def = this.engine.content.get('effects', id);
      if (!def) continue;
      const cls = def.positive ? 'pos' : 'neg';
      const lvTag = eff.strength > 1 ? `<span style="font-size:10px;font-weight:700">Lv${Math.round(eff.strength)}</span>` : '';
      const partTag = id === 'burning' && p.status.burningParts
        ? ' · ' + Object.entries(p.status.burningParts).map(([pt, lv]) => ({ head: '头', thorax: '胸', abdomen: '腹', larm: '臂', legs: '腿' }[pt] || pt) + 'Lv' + lv).join('/')
        : '';
      html += `<div class="status-chip ${cls}" data-eid="${this._esc(id)}" title="${this._esc(def.name + (eff.strength > 1 ? ' Lv' + Math.round(eff.strength) : '') + partTag)}">${def.icon}${lvTag}</div>`;
    }
    el.innerHTML = html;
  }
  // ★ 屏幕最下方效果图标透明度随剩余时间占比衰减
  for (const chip of el.children) {
    const id = chip.dataset.eid;
    const eff = p.status.effects.get(id);
    if (!eff) { chip.style.opacity = '0'; continue; }
    const maxD = Math.max(0.01, eff.maxDuration || eff.duration || 1);
    const ratio = eff.persistent || maxD > 900 ? 1 : Math.max(0.12, Math.min(1, eff.duration / maxD));
    chip.style.opacity = String(0.28 + 0.72 * ratio);
    chip.style.filter = ratio < 0.25 ? 'grayscale(.35)' : '';
  }
  }

  _renderExtinguishBtn(p) {
    const btn = document.getElementById('extinguish-btn');
    if (!btn) return;
    if (!this._extinguishBound) {
      this._extinguishBound = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.world) this.world._startExtinguish();
      });
    }
    const has = !!(p && p.status && p.status.hasEffect('burning') && !p.status.isDowned());
    const busy = !!(this.world.actionProcess && (this.world.actionProcess.isRunning('extinguish') || this.world.actionProcess.isRunning('fiber')));
    btn.style.display = (has && !busy) ? 'block' : 'none';
  }

  _renderThrowArmBtn(p) {
    const btn = document.getElementById('throwable-arm-btn');
    if (!btn) return;
    if (!this._armBtnBound) {
      this._armBtnBound = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.world) this.world._armThrowable(this.world.player);
      });
    }
    const def = p && p.activeThrowable ? this.engine.content.get('nade', p.activeThrowable) : null;
    const isTimed = !!(def && def.trigger === 'timed');
    const show = !!(p && p.alive && isTimed && !(p.status && p.status.isDowned()));
    btn.style.display = show ? 'block' : 'none';
    if (!show) return;
    if (p._throwPinPulled) {
      btn.textContent = `保险已解除 · ${Math.max(0, p._throwFuse || 0).toFixed(1)}s`;
      btn.disabled = true;
      btn.style.background = 'rgba(90,40,40,.75)';
      btn.style.borderColor = 'rgba(255,120,120,.45)';
      btn.style.color = '#ffb0a0';
    } else {
      btn.textContent = '解除保险';
      btn.disabled = false;
      btn.style.background = 'rgba(150,40,40,.82)';
      btn.style.borderColor = 'rgba(255,120,120,.8)';
      btn.style.color = '#ffe0e0';
    }
  }

  _renderHazardOverlay(p) {
    let el = document.getElementById('hazard-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hazard-overlay';
      document.body.appendChild(el);
    }
    const burning = !!(p && p.status && p.status.hasEffect('burning'));
    const fiber = !!(p && p.status && p.status.hasEffect('fiber_acute'));
    el.classList.toggle('burning', burning);
    el.classList.toggle('fiber', !burning && fiber);
    el.style.opacity = burning ? '0.82' : (fiber ? '0.55' : '0');
  }

  _renderTacticalState(p) {
    const el = document.getElementById('tactical-state');
    if (!el || !p) return;
    const lean = p.leanAmount || 0;
    const chips = [];
    if (p.isCrouching) chips.push(['蹲伏', true, '']);
    if ((this.world._sprintProgress || 0) > 0.45) chips.push(['疾跑', true, '']);
    if (p.ads) chips.push(['开镜', true, '']);
    if (p.holdingBreath) chips.push(['屏息', true, '']);
    if (lean < -0.12) chips.push(['左倾', true, '']);
    else if (lean > 0.12) chips.push(['右倾', true, '']);
    if (p._throwAiming) {
      const fuse = p._throwPinPulled ? ` · ${(p._throwFuse || 0).toFixed(1)}s` : '';
      chips.push([`投掷蓄力 ${Math.round((p._throwCharge || 0) * 100)}%${fuse}`, true, 'warn']);
    }
    if (p._controllingDrone) chips.push(['无人机操控', true, '']);
    // 只有内容变化才重建
    const sig = chips.map(c => c[0]).join('|');
    if (this._tacSig !== sig) {
      this._tacSig = sig;
      el.innerHTML = chips.map(([name, on, cls]) => `<div class="tac-chip ${on ? 'on' : ''} ${cls}">${name}</div>`).join('');
    }
  }
   
   _updateTrainingHUD(){
    const w = this.world;
    const panel = document.getElementById('training-attack-panel');
    const btn = document.getElementById('training-settings-btn');
    const isTraining = !!(w && w.training);
    const hudRoot = document.getElementById('hud');
    if (hudRoot) hudRoot.classList.toggle('training-mode', isTraining);
    if (btn) btn.style.display = isTraining ? 'block' : 'none';
    // 人偶详情与攻击面板独立：即使关闭攻击数据面板，靠近人偶仍要看详情
    this._updateDummyInfoPanel(w);
    if (!panel) return;
    if (!isTraining) { panel.style.display = 'none'; return; }
    panel.style.display = w.training.showAttackPanel ? 'block' : 'none';
    if (!w.training.showAttackPanel) return;
    const st = w.trainingStats || { hits: 0, damage: 0, lastDamage: 0, lastTtk: null, fightStart: 0 };
    const shots = w.stats.shots || 0;
    const hitRate = shots > 0 ? Math.min(100, Math.round(st.hits / shots * 100)) : 0;
    const fightTime = st.fightStart > 0 ? Math.max(0.01, w.time - st.fightStart) : 0;
    const dps = fightTime > 0 ? Math.round(st.damage / fightTime) : 0;
    const body = document.getElementById('training-attack-body');
    if (body) {
      body.innerHTML =
        '射击 <b>' + shots + '</b> · 命中 <b>' + st.hits + '</b> · 命中率 <b>' + hitRate + '%</b><br>' +
        '累计伤害 <b>' + Math.round(st.damage) + '</b> J · DPS <b>' + dps + '</b><br>' +
        '上次伤害 <b>' + Math.round(st.lastDamage) + '</b> J · 击杀 <b>' + (st.kills || 0) + '</b><br>' +
        '上次 TTK <b>' + (st.lastTtk != null ? st.lastTtk.toFixed(2) + 's' : '—') + '</b>';
    }
  }

  _esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  _updateDummyInfoPanel(w){
    const panel = document.getElementById('dummy-info-panel');
    if (!panel) return;
    if (!w || !w.training || !w.player || !w.player.body) {
      panel.style.display = 'none';
      this._dummyInfoSig = '';
      return;
    }
    let best = null;
    let bestDist = 6.5;
    for (const e of w.enemies) {
      if (!e.alive || !e.trainingDummy || !e.body) continue;
      const d = Math.hypot(
        w.player.body.position.x - e.body.position.x,
        w.player.body.position.z - e.body.position.z
      );
      if (d < bestDist) { best = e; bestDist = d; }
    }
    if (!best || !best.status) {
      panel.style.display = 'none';
      this._dummyInfoSig = '';
      return;
    }
    const st = best.status;
    const slotNames = { shell: '头盔壳', visor: '面罩', fiber: '纤维', plate: '插板' };
    const tableMap = { shell: 'helmetShell', visor: 'helmetVisor', fiber: 'vestFiber', plate: 'vestPlate' };
    const gearLines = [];
    for (const slot of ['shell', 'visor', 'fiber', 'plate']) {
      const piece = best.armor && best.armor[slot];
      if (!piece || piece.lv <= 0) {
        gearLines.push(slotNames[slot] + '：—');
        continue;
      }
      const def = piece.defId ? this.engine.content.get(tableMap[slot], piece.defId) : null;
      const name = def ? this.engine.i18n.t(def.name) : ('Lv' + piece.lv);
      const pct = piece.max > 0 ? Math.round(piece.dur / piece.max * 100) : 0;
      gearLines.push(slotNames[slot] + '：' + this._esc(name) + ' <b>' + pct + '%</b>');
    }
    const effList = [];
    for (const [id, eff] of st.effects) {
      const def = this.engine.content.get('effects', id);
      if (!def) continue;
      effList.push((def.icon || '•') + this.engine.i18n.t(def.name) + (eff.strength > 1 ? '×' + Math.round(eff.strength) : ''));
    }
    const effText = effList.length ? effList.join(' · ') : '无';
    const hp = Math.round(st.healthQuality);
    const blood = Math.round(st.blood);
    const name = this.engine.i18n.t(best.spec.name);
    const dist = Math.round(bestDist * 10) / 10;
    const sig = [name, hp, blood, effText, gearLines.join('|'), dist.toFixed(1), best.isDownedState ? 1 : 0].join('~');
    if (sig === this._dummyInfoSig) { panel.style.display = 'block'; return; }
    this._dummyInfoSig = sig;
    const body = document.getElementById('dummy-info-body');
    if (body) {
      body.innerHTML =
        '<div style="color:#ffe8b0;font-weight:800">' + this._esc(name) + ' · ' + dist.toFixed(1) + 'm</div>' +
        '<div>状态：<b>' + this._esc(st.getHealthText()) + '</b>　健康度 <b>' + hp + '%</b></div>' +
        '<div>血液：<b>' + blood + ' / ' + st.maxBlood + ' ml</b></div>' +
        '<div style="margin-top:3px;color:#8fb0d8">护具</div>' +
        '<div>' + gearLines.join('<br>') + '</div>' +
        '<div style="margin-top:3px;color:#8fb0d8">异常状态</div>' +
        '<div style="color:#ffb0a0">' + this._esc(effText) + '</div>';
    }
    panel.style.display = 'block';
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

  _renderSkillBar(p){
    const el = document.getElementById('skill-bar');
    if (!el || !p || !p.skills) return;
    const ICONS = { drone: '🛸', inspire: '🎖', srdispte: '🌪', catleap: '🐾', hate: '🔥', suppress: '🎯', radiantReturn: '💎', backflash: '✨', jump: '↗', aimbuff: '🎯', dash: '💨', rally: '🎖', shield: '🛡', taunt: '📢' };
    if (!this._skillBarBuilt || el.children.length !== p.skills.length) {
      el.innerHTML = p.skills.map((sk) =>
        `<div class="skill-slot"><span class="sk-icon"></span><span class="sk-name"></span><span class="sk-cd"></span></div>`
      ).join('');
      this._skillBarBuilt = true;
    }
    p.skills.forEach((sk, i) => {
      const slotEl = el.children[i];
      if (!slotEl) return;
      const iconEl = slotEl.querySelector('.sk-icon');
      const nameEl = slotEl.querySelector('.sk-name');
      const cdEl = slotEl.querySelector('.sk-cd');
      const icon = ICONS[sk.id] || '✦';
      if (iconEl && iconEl.textContent !== icon) iconEl.textContent = icon;
      const name = this.engine.i18n.t(sk.def.name);
      if (nameEl && nameEl.textContent !== name) nameEl.textContent = name;
      const desc = sk.def.desc ? this.engine.i18n.t(sk.def.desc) : '';
      const tip = name + (desc ? '\n' + desc : '') +
        (sk.def.cost ? '\n耦合消耗：' + sk.def.cost + (sk.def.drain ? ' + ' + sk.def.drain + '/s' : '') : '');
      slotEl.title = tip;
      let cdTxt = '';
      if (sk.def.maxCharges) {
        cdTxt = (sk.charges || 0) + '/' + sk.def.maxCharges + (sk.ready ? '' : ' · ' + Math.ceil(sk.cd) + 's');
      } else if (!sk.ready) {
        cdTxt = Math.ceil(sk.cd) + 's';
      }
      if (cdEl && cdEl.textContent !== cdTxt) cdEl.textContent = cdTxt;
      slotEl.classList.toggle('ready', !!sk.ready);
    });
  }

  _renderFiberBtn(p){
    const btn = document.getElementById('fiber-pull-btn');
    if (!btn) return;
    if (!this._fiberBound) {
      this._fiberBound = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.world) this.world._startFiberPull();
      });
    }
    const has = !!(p && p.status && p.status.hasEffect('fiber_acute') && !p.status.isDowned());
    const pulling = !!(this.world.actionProcess && (this.world.actionProcess.isRunning('fiber') || this.world.actionProcess.isRunning('extinguish')));
    btn.style.display = (has && !pulling) ? 'block' : 'none';
    if (has && !pulling && btn.textContent !== '拔除玻纤') btn.textContent = '拔除玻纤';
  }

  _renderWeaponBar() {
  const el = document.getElementById('weapon-bar');
  if (!el) return;
  const p = this.world.player;
  if (!p || !p.weapons) { el.innerHTML = ''; return; }

  const i18n = this.engine.i18n;
  const slots = [
    { id: 'primary',   label: i18n.t('ui.weaponbar.primary'),   key: '1' },
    { id: 'secondary', label: i18n.t('ui.weaponbar.secondary'), key: '2' },
    { id: 'melee',     label: i18n.t('ui.weaponbar.melee'),     key: '3' },
    { id: 'fist',      label: i18n.t('ui.weaponbar.fist'),      key: '0' },
  ];

  let html = '';
  for (const s of slots) {
    const weapon = s.id === 'fist' ? p.fist : p.weapons[s.id];
    const active = p.activeSlot === s.id;
    const empty = s.id !== 'fist' && !weapon;
    const name = weapon && weapon.def ? i18n.t(weapon.def.name) : s.label;
    html += `<div class="wb-slot${active ? ' active' : ''}${empty ? ' empty' : ''}" data-slot="${s.id}">` +
            `<span class="wb-num">${s.key}</span>` +
            `<span class="wb-name">${empty ? '—' : name}</span>` +
            `</div>`;
  }
  // ★ 选中投掷物时，武器栏额外显示投掷物槽
  if (p.activeThrowable) {
    const nd = this.engine.content.get('nade', p.activeThrowable);
    const ndName = nd ? i18n.t(nd.name) : p.activeThrowable;
    html += `<div class="wb-slot active" data-slot="throw">` +
            `<span class="wb-num">💣</span>` +
            `<span class="wb-name">${ndName}</span>` +
            `</div>`;
  }
  el.innerHTML = html;

  el.querySelectorAll('.wb-slot').forEach(slotEl => {
    slotEl.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const slotId = slotEl.dataset.slot;
      if (slotId === 'throw') {
        p.activeThrowable = null;
        p._throwAiming = false;
        if (this.world._clearThrowPreview) this.world._clearThrowPreview();
        if (this.world._removeHeldThrowable) this.world._removeHeldThrowable();
        if (this.world._log) this.world._log('退出投掷模式', 'y');
        return;
      }
      if (slotId === 'fist' || p.weapons[slotId]) {
        this.world._switchToSlot(slotId);
      }
    });
  });
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

  // ★ 开火模式按钮：只显示在有多种模式的枪械上，点一下轮换
  _setFireModeBtn(cw){
    const btn = document.getElementById('fire-mode-btn');
    if (!btn) return;
    if (!this._fireModeBound) {
      this._fireModeBound = true;
      btn.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (this.world) this.world._cycleFireMode();
      });
    }
    const modes = cw ? (cw.fireModes || []) : [];
    // 所有枪械都显示开火模式，即使只有一种模式，也让玩家知道当前默认是什么
    const show = !!(cw && !cw.isFist && !(cw.def && cw.def.melee));
    btn.style.display = show ? '' : 'none';
    if (show) {
      const mode = cw.fireMode || (modes[0] || (cw.def && cw.def.auto ? 'auto' : 'semi'));
      const label = this.world._fireModeLabel(mode);
      if (btn.textContent !== label) btn.textContent = label;
      btn.title = modes.length > 1 ? '点击切换开火模式' : '当前开火模式（不可切换）';
      btn.style.cursor = modes.length > 1 ? 'pointer' : 'default';
      btn.style.opacity = modes.length > 1 ? '1' : '.78';
      btn.style.pointerEvents = modes.length > 1 ? 'auto' : 'none';
    }
  }
}

/* ============================================================
   [5] GameWorld
   ============================================================ */
// 旧存档迁移：插板原本占独立 vestPlate 槽，现在必须并进护甲纤维的子槽。
// 放在模块级，让大厅（尚未创建 GameWorld）也能在加载存档后立刻迁移，
// 否则玩家在配装页会看到一件“详情里没有插板、也拿不出来”的护甲。
function migratePlateToFiber(inv) {
  if (!inv) return;
  const legacyUid = inv.equipped.vestPlate;
  const fiberUid = inv.equipped.vestFiber;
  if (!legacyUid) return;
  const plate = inv.items.get(legacyUid);
  if (!plate) { inv.equipped.vestPlate = null; return; }
  // 旧存档里可能只有 vestPlate 槽、没有穿纤维：插板不能单独穿戴，退回背包/仓库
  if (!fiberUid) {
    inv.equipped.vestPlate = null;
    if (!inv.addToContainer('bag', legacyUid).ok
        && !inv.addToContainer('chest', legacyUid).ok
        && !inv.addToContainer('safe', legacyUid).ok) {
      inv.addToContainer('stash', legacyUid);
    }
    return;
  }
  const fiber = inv.items.get(fiberUid);
  if (!fiber) { inv.equipped.vestPlate = null; return; }
  if (!fiber.subSlots) fiber.subSlots = { plate: null };
  if (!fiber.subSlots.plate) {
    fiber.subSlots.plate = legacyUid;
    inv.parentOf.set(legacyUid, fiberUid);
    inv.equipped.vestPlate = null;
  } else {
    // 纤维里已经有插板：旧槽里的插板不能继续挂在隐藏槽位上，退回背包
    inv.equipped.vestPlate = null;
    if (!inv.addToContainer('bag', legacyUid).ok
        && !inv.addToContainer('chest', legacyUid).ok
        && !inv.addToContainer('safe', legacyUid).ok) {
      inv.addToContainer('stash', legacyUid);
    }
  }
}

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
// ★ 训练场独立配置：不依赖地图选择，也不写入正式玩法
this.training = config.kind === 'training' ? {
  showDamage: true,
  showAttackPanel: true,
  infiniteAmmo: true,
  infiniteNades: true,
  skills: true,
  noCd: true,
  // 人偶移动：still 静止 / patrol 左右巡逻 / random 随机游走
  dummyMoveMode: 'patrol',
  dummyMove: true,
  dummyHp: 100,
  // 四个护具槽分别引用 content 表里的任意一件防具；null = 空槽
  dummyGear: { shell: null, visor: null, fiber: null, plate: null },
  creative: true,
} : null;
this.trainingStats = config.kind === 'training' ? {
  shots: 0, hits: 0, damage: 0, lastDamage: 0,
  fightStart: 0, lastTtk: null, kills: 0,
} : null;

this.mapSpec  = config.mapSpec || engine.content.get('maps', this.mapId);
this.charSpec = engine.content.get('characters', this.charId);
this.modeConfig = engine.modeRegistry.get(this.modeId);

this._playerSpawnPos = null;
this._enemySpawnPositions = null;
// ★ 匹配友方 AI 小队：训练场不刷，避免把人偶逻辑和队友混在一起
this.matchAllies = !!config.matchAllies && config.kind !== 'training';
this.allies = [];
this._squadChat = [];
this._squadOrder = null;
// ★ 队友自己的战术计划：search / fight / extract；与玩家 P/O 建议分开
this._squadPlan = null;
this._squadPlanT = 0;
this._squadExtract = null;
// ★ 背叛判定：玩家连续/重度误伤队友后，友方 AI 会立刻敌对并脱离枪线
this._betrayedByPlayer = false;
this._betrayalAt = 0;
this._ffLog = [];
// ★ 友方 AI 探索记忆：所有队友与玩家走过的格子记为“已探索”，
//   队友空闲时会优先去地图上还没去过的区域，而不是原地打转。
this._exploredCells = new Set();
this._exploreTick = 0;
// ★ AI 导航网格：2m 一格，首次需要寻路时构建；只服务 CPU AI，不参与渲染/存档
this._navGrid = null;

  if (!this.mapSpec)   throw new Error('[World] 地图不存在: ' + this.mapId);
  if (!this.charSpec)  throw new Error('[World] 角色不存在: ' + this.charId);
  if (!this.modeConfig) throw new Error('[World] 模式不存在: ' + this.modeId);

  this.physics    = engine.physicsFactory();
  this.player     = null;
  this.allies     = [];
  this.enemies    = [];
  this.extracts   = [];
  this.containers = [];
  this.groundLoots = [];
  this.obstacles  = [];
  this.tracers    = [];
  this.projectiles = [];
  this.fireFields = [];
  this.pois       = [];
  this._hazardVfx = new Map();

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
  this._alerts = []; // 屏幕中上警觉提示（位置暴露等）
  // ★ 死亡回放：整场最近约 14 秒的实体快照（10Hz）
  this._replayBuf = [];
  this._replayShots = [];
  this._replayFps = 10;
  // ★ 死亡回放：与快照同时间轴的表现事件（爆炸/闪光/屏幕闪白等）。
  //   状态类效果（致盲/震撼/燃烧…）直接读实体快照里的 effects，
  //   以后新增持续效果只要写入 status.effects 就会自动出现在回放里。
  this._replayFx = [];
  this._replayFxMuted = false;
  this._replayBadges = new Map();
  this._replayBadgeTextures = new Map();
  this._nadeWheelOpen = false;
}

  start(){
    this._setupScene();
    this._spawnPlayer();
    this._spawnEnemies();
    if (this.matchAllies) {
      try { this._spawnAllies(); }
      catch (e) { console.warn('[World] 友方 AI 生成失败（不影响本局）:', e); }
    }
    this._spawnExtracts();
    this._spawnContainers();
    if (this.training) this._spawnTrainingRack();
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
if (this._playerSpawnPos && typeof this._playerSpawnPos.angle === 'number') {
  this.engine.cameraCtl.yaw = this._playerSpawnPos.angle;
  this.player.angle = this._playerSpawnPos.angle;
}

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
    // 地图 JSON 加载失败时也不要出生在地图正中心：退到西南角
    this._playerSpawnPos = { x: -(half - 12), z: half - 12, angle: 0.4 };
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
    // ★ 只有矮墙/箱子/台阶/平台能翻越；建筑、屋顶、高墙不可攀爬
    body.climbable = !!(o.climbable || ['lowWall', 'crate', 'step', 'platform'].includes(o.type));
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
    const ps = this._playerSpawnPos;
    if (ps && Math.hypot(x - ps.x, z - ps.z) < 10) continue;

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
    body.climbable = h <= 2.2;
    this.obstacles.push({ mesh, body });
    this.pois.push({ x, z, type: 'obstacle', w, h: d, color: 'rgba(120,140,160,0.65)' });
  }
}

  // 靶场武器架：靠近后交互可直接替换主/副武器，不依赖创造模式物品库
  _spawnTrainingRack(){
    const spawn = this._playerSpawnPos || { x: -60, z: 60 };
    const x = spawn.x + 2.6;
    const z = spawn.z + 2.2;
    const group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.5, metalness: 0.5 });
    for (const ox of [-1.0, 1.0]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), wood);
      post.position.set(ox, 1.1, 0);
      group.add(post);
    }
    for (const y of [0.8, 1.25, 1.7]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.12), metal);
      bar.position.set(0, y, 0);
      group.add(bar);
    }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xffcc66 }));
    sign.position.set(0, 2.05, 0);
    group.add(sign);
    group.position.set(x, 0, z);
    this.engine.renderer.scene.add(group);
    const body = this.physics.add(new Body({
      x, z, y: 1.1, height: 2.2, isStatic: true, shape: 'circle', radius: 1.2,
      userData: { type: 'obstacle' },
    }));
    this.containers.push({
      x, z, mesh: group, body,
      opened: false, loot: [], revealed: [], searched: true,
      isWeaponRack: true, label: '靶场武器架',
    });
    this.pois.push({ x, z, type: 'container', color: '#ffcc66' });
  }

_spawnContainerAt(cx, cz, typeId){
  const types = this.engine.content.all('containers') || [];
  const type = this.engine.content.get('containers', typeId)
    || types[Math.floor(Math.random() * types.length)]
    || { id: 'crate', name: '物资容器', color: 0xffcc33, size: [1.6, 1.3, 1.6], count: [1, 2], weights: { ammo: 40, weapons: 10, armor: 10, valuables: 15, medical: 15, attach: 5, nade: 10 } };
  const [w, h, d] = type.size || [1.6, 1.3, 1.6];
  const mesh = this.engine.meshes.build('container', {
    color: type.color, w, h, d, marker: type.marker || type.color,
  });
  mesh.position.x = cx;
  mesh.position.z = cz;
  this.engine.renderer.scene.add(mesh);

  const cBody = this.physics.add(new Body({
    x: cx, z: cz,
    y: h / 2,
    height: h,
    isStatic: true,
    shape: 'circle',
    radius: Math.max(w, d) * 0.5,
    userData: { type: 'container' },
  }));

  this.containers.push({
    x: cx, z: cz, mesh, body: cBody,
    opened: false, loot: null, revealed: [], searched: false,
    type: type.id,
    label: this.engine.i18n.t(type.name),
  });
  this.pois.push({ x: cx, z: cz, type: 'container', color: '#' + (type.color || 0xffcc33).toString(16).padStart(6, '0') });
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
  let cName = null;
  let eqSlot = null;
  if (parent && parent.startsWith('c:')) cName = parent.slice(2);
  else if (parent && parent.startsWith('eq:')) eqSlot = parent.slice(3);
  else return false;
  if (cName === 'stash' || cName === 'safe') {
    this._log('仓库/安全箱物品无法直接丢弃', 'y');
    return false;
  }

  const p = this.player;
  if (!p) return false;
  const dropDist = 1.8;
  const angle = p.angle || 0;
  // 相机 yaw 的 forward = (sin, -cos)，丢弃物应落在面前而不是侧面
  const dropX = p.body.position.x + Math.sin(angle) * dropDist;
  const dropZ = p.body.position.z - Math.cos(angle) * dropDist;

  const makeSpec = (it) => ({
    table: it.table,
    defId: it.defId,
    qty: it.qty,
    dur: it.dur,
    loaded: it.loaded ? { ammoType: it.loaded.ammoType, qty: it.loaded.qty } : null,
    loadedQueue: it.loaded && it.loaded.queue ? [...it.loaded.queue] : undefined,
    attachments: it.attachments || undefined,
    extras: {
      lockValue: true,
      valueMul: it.valueMul,
      damaged: !!it.damaged,
      empSurge: it.empSurge || 0,
      empHardenedHit: it.empHardenedHit === true,
    },
  });
  const spec = makeSpec(item);
  // ★ 枪械配件：地面掉落物不能复制 UID（源物品会随武器一起销毁），
  //   改为把每个配件作为独立物品一起掉在地上，玩家可重新安装。
  const attachSpecs = [];
  if (item.table === 'weapons' && item.attachments) {
    for (const slot in item.attachments) {
      const aUid = item.attachments[slot];
      if (!aUid) continue;
      const aItem = inv.items.get(aUid);
      if (aItem) attachSpecs.push({ table: 'attach', defId: aItem.defId, qty: 1 });
    }
    spec.attachments = undefined;
  }
  // ★ 护甲内嵌插板同理：作为独立物品掉落，避免随宿主一起被 destroyItem 吞掉
  if (item.subSlots) {
    for (const subSlot in item.subSlots) {
      const sUid = item.subSlots[subSlot];
      if (!sUid) continue;
      const sItem = inv.items.get(sUid);
      if (sItem) attachSpecs.push({ table: sItem.table, defId: sItem.defId, qty: 1 });
    }
    spec.subSlots = undefined;
  }
  // 背包/胸挂里的东西一起掉出来，不能让 destroyItem 把它们吞掉
  const childSpecs = [];
  if (item.innerGrid) {
    for (const childUid of Array.from(item.innerGrid.items.keys())) {
      const child = inv.items.get(childUid);
      if (child) childSpecs.push(makeSpec(child));
    }
  }

  if (eqSlot) inv.unequip(eqSlot);
  else inv.removeFromContainer(cName, uid);
  inv.destroyItem(uid);

  this._spawnGroundLoot(dropX, dropZ, [spec, ...childSpecs, ...attachSpecs], '丢弃物');
  this._syncWeaponsFromInventory();
  this._syncArmorFromInventory();
  // 背包/胸挂被丢下后，容器引用回到空网格
  if (eqSlot === 'backpack') inv.containers.bag = new GridContainer(0, 0);
  if (eqSlot === 'chestRig') inv.containers.chest = new GridContainer(0, 0);
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

  /* ===================== 力量 / 负重 / 攀爬 ===================== */
  // 设定：Aselevel 为 A 的 Prazer 徒手硬拉力约 140·ln(A) kg。
  // 人类按受过训练的军人约 80kg 硬拉；负重不线性放大，用 0.6 次方折算。
  _strengthPullKg(spec) {
    if (!spec || !spec.prazer) return 80;
    const A = Math.max(1, spec.A || 1);
    return 140 * Math.log(A);
  }

  _carryLimitFor(spec) {
    const bonus = 1 + (spec && spec.carryBonus ? spec.carryBonus : 0);
    const base = 34; // 人类士兵战斗负重基准
    if (!spec || !spec.prazer) return Math.round(base * bonus * 10) / 10;
    const pull = this._strengthPullKg(spec);
    return Math.round(base * Math.pow(Math.max(0.5, pull / 80), 0.6) * bonus * 10) / 10;
  }

  _meleeStrengthMul(owner) {
    const spec = (owner && owner.charSpec) || (owner && owner.spec) || {};
    if (!spec.prazer) return 1;
    // 拳击/近战能量与力量同阶增长；上限防止高 A 一拳秒杀全场
    return Math.max(1, Math.min(4.5, this._strengthPullKg(spec) / 80));
  }

  _climbHeight(owner) {
    const spec = (owner && owner.charSpec) || (owner && owner.spec) || {};
    if (!spec.prazer) return 1.05;
    const pull = this._strengthPullKg(spec);
    return Math.max(1.15, Math.min(2.3, 0.9 + pull / 120));
  }

  _pointBlocked(x, y, z, r = 0) {
    const bodies = [];
    for (const o of (this.obstacles || [])) if (o.body) bodies.push(o.body);
    for (const c of (this.containers || [])) if (c.body) bodies.push(c.body);
    for (const b of bodies) {
      const hh = b.halfH || (b.height || 2.4) / 2;
      const y0 = b.yMin !== null && b.yMin !== undefined ? b.yMin : (b.position.y - hh);
      const y1 = b.yMax !== null && b.yMax !== undefined ? b.yMax : (b.position.y + hh);
      if (y < y0 - 0.02 || y > y1 + 0.02) continue;
      if (b.shape === 'aabb') {
        if (Math.abs(x - b.position.x) < (b.halfW || 0) + r &&
            Math.abs(z - b.position.z) < (b.halfD || 0) + r) return true;
      } else if (Math.hypot(x - b.position.x, z - b.position.z) < (b.radius || 1) + r) {
        return true;
      }
    }
    return false;
  }

  _ceilingClearanceAt(x, y, z, max = 3) {
    const hit = this.physics.raycast(x, y, z, 0, 1, 0, max,
      body => body.userData && body.userData.type === 'obstacle');
    return hit ? Math.max(0, hit.t) : max;
  }

  _ceilingClearance(ent) {
    if (!ent || !ent.body) return 3;
    const b = ent.body;
    return this._ceilingClearanceAt(b.position.x, b.position.y + b.halfH - 0.05, b.position.z, 3);
  }

  // 自动跨越/攀爬：只对 climbable（矮墙/箱子/台阶/平台）生效。
  // 低矮障碍移动时自动越过；较高的需要按跳跃，且不超过 Prazer 力量对应高度。
  _tryMantle(p, moving, jumpPressed, engine) {
    if (!p || !p.body || !engine) return false;
    if (p._mantleCd && this.time < p._mantleCd) return false;
    if (!p.body.grounded) return false;
    if (!moving && !jumpPressed) return false;
    const yaw = engine.cameraCtl.yaw;
    const fx = Math.sin(yaw), fz = -Math.cos(yaw);
    const foot = p.body.position.y - p.body.halfH;
    const originY = foot + Math.min(0.55, p.body.height * 0.28);
    const hit = this.physics.raycast(
      p.body.position.x, originY, p.body.position.z, fx, 0, fz, 2.0,
      body => body.userData && body.userData.type === 'obstacle' && body.climbable
    );
    if (!hit || hit.t < 0.2 || hit.t > 1.95) return false;
    const b = hit.body;
    const hh = b.halfH || (b.height || 2.4) / 2;
    const top = b.yMax !== null && b.yMax !== undefined ? b.yMax : (b.position.y + hh);
    const rise = top - foot;
    if (rise < 0.2 || rise > this._climbHeight(p)) return false;
    // 低矮障碍自动跨越；超过 1m 必须有跳跃动作
    if (!jumpPressed && rise > 1.0) return false;
    // 越过障碍厚度 + 身体半径，落点不能还在墙体内
    const thickness = b.shape === 'aabb'
      ? Math.abs(fx) * (b.halfW || 0) * 2 + Math.abs(fz) * (b.halfD || 0) * 2
      : (b.radius || 0) * 2;
    const clear = Math.max(0.35, (p.body.radius || 1.2)) + 0.25;
    // 低矮障碍“跨过去”，较高障碍“爬上去站到顶面”
    const highClimb = rise > 1.0;
    const forwardDist = highClimb
      ? hit.t + Math.min(0.9, thickness * 0.5 + 0.25)
      : hit.t + thickness + clear;
    const landX = p.body.position.x + fx * forwardDist;
    const landZ = p.body.position.z + fz * forwardDist;
    const landY = top + p.body.halfH + 0.04;
    const half = ((this.mapSpec && this.mapSpec.size) || 200) / 2 - 2;
    if (landX < -half || landX > half || landZ < -half || landZ > half) return false;
    if (this._pointBlocked(landX, landY, landZ, 0.28)) return false;
    if (this._ceilingClearanceAt(landX, landY + p.body.halfH - 0.05, landZ, 2.4) < 0.22) return false;
    const cost = 7 + rise * 4;
    if (p.stamina < cost) {
      if (!p._mantleHintAt || this.time - p._mantleHintAt > 2) {
        p._mantleHintAt = this.time;
        this._hint('体力不足，无法翻越', 'y');
      }
      return false;
    }
    p.stamina -= cost;
    p.body.position.x = landX;
    p.body.position.z = landZ;
    p.body.position.y = landY;
    p.body.velocity.x = 0;
    p.body.velocity.y = 0;
    p.body.velocity.z = 0;
    p.body.wake();
    p._mantleCd = this.time + 0.55;
    if (engine.cameraCtl.shake) engine.cameraCtl.shake(0.2, 0.12);
    return true;
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
  const carryLimit = this._carryLimitFor(spec);
  const maxStamina = spec.prazer
    ? 110 + Math.round(2 * Math.max(1, spec.A || 1))
    : 100;

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
  carryLimit,
  carryWeight: 0,
  loadState: 'normal',
  _adaptBonus: spec.carryBonus || 0,
  coupling: spec.prazer ? 100 : 0,
  maxCoupling: spec.prazer ? 100 : 0,
  grenades: 2,
  activeThrowable: null,
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
  _downedLogged: false,
  _downedAt: 0,
  kills: 0,
  dealt: 0,
  taken: 0,
  carriedValue: 0,
  limbDamage: 0,
  speedMul: 1,
  stamina: maxStamina,
  maxStamina,
  armor: invArmor || {
     shell: { lv: 3, dur: 100, max: 100, red: 0.52 },
     visor: { lv: 3, dur: 100, max: 100, red: 0.52 },
     fiber: { lv: 4, dur: 100, max: 100, red: 0.64 },
     plate: { lv: 4, dur: 100, max: 100, red: 0.64 },
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
  def, defId: id, ammoDef,
  loaded: { ammoType: def.ammoType, qty: magCap, queue: new Array(magCap).fill(def.ammoType) },
  magCap,
  reserve: magCap * 3,
  fireCd: 0,
  reloading: 0,
  fireModes: def.fireModes || (def.auto ? ['auto'] : ['semi']),
  fireMode: (def.fireModes && def.fireModes[0]) || (def.auto ? 'auto' : 'semi'),
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
  // 不再写 item.mag 平行字段；弹匣只由 loaded.queue/qty 表示。
if (!item.loaded) item.loaded = { ammoType: def.ammoType, qty: 0, queue: [] };
  inv.normalizeLoaded(item);

  // ★ 配件修正：运行时只读汇总，不回写 def。扩容弹匣会改变 magCap。
  const mods = inv.getAttachmentStats ? inv.getAttachmentStats(item) : { magMul: 1, reloadMul: 1, spreadMul: 1, recoilMul: 1, adsSpreadMul: 1, rangeMul: 1, soundMul: 1, count: 0 };
  const magCap = Math.max(1, Math.round((def.mag || 0) * (mods.magMul || 1)));

return {
  item,
  def,
  ammoDef,
  mods,
  magCap,
  fireCd: 0,
  reloading: 0,
  fireModes: def.fireModes || (def.auto ? ['auto'] : ['semi']),
  fireMode: (def.fireModes && def.fireModes[0]) || (def.auto ? 'auto' : 'semi'),
  // ★ 修复：正确指向 item.loaded.qty，并暴露 loaded 供开火取队列子弹
  get loaded() { return this.item.loaded; },
  get mag() { return this.item.loaded.qty; },
  set mag(v) { this.item.loaded.qty = Math.max(0, Math.min(this.magCap, v)); },
  // 备用弹药按“兼容口径”统计，5.56 武器也能看到玻纤弹等特殊弹种；
  // 只统计随身容器，仓库/stash 不参与战局换弹。
  get reserve() { return inv.countCompatibleAmmo(def, ['chest', 'pocket', 'bag', 'safe']); },
  consumeReserve(count) { inv.consumeCompatibleAmmo(def, count, ['chest', 'pocket', 'bag', 'safe']); },
};
  }


_buildMeleeFromInventory(inv, equipSlot) {
  if (!inv) return null;
  const uid = inv.equipped[equipSlot];
  if (!uid) return null;
  const item = inv.items.get(uid);
  if (!item) return null;
  if (item.table === 'melee') {
    const def = this.engine.content.get('melee', item.defId);
    if (!def) return null;
    return { item, def, fireCd: 0 };
  }
  if (item.table === 'weapons') {
    return this._buildWeaponFromInventory(inv, equipSlot);
  }
  return null;
}
   
_syncWeaponsFromInventory(){
  const p = this.player;
  const inv = this.engine.app ? this.engine.app.inventory : null;
  if (!p || !inv) return;

  const slots = [
    ['primary', 'main'],
    ['secondary', 'side'],
    ['melee', 'melee'],
  ];

  for (const [pSlot, iSlot] of slots) {
    const uid = inv.equipped[iSlot];
    const current = p.weapons[pSlot];
    const currentUid = current && current.item ? current.item.uid : null;

    if (!uid) {
      p.weapons[pSlot] = null;
      continue;
    }

    const item = inv.items.get(uid);
    if (!item) { p.weapons[pSlot] = null; continue; }

    // ★ 同一把枪也可能因为“装/拆配件”而需要重建运行时（弹匣容量、散布、后坐都变了）。
    //   旧版只比较 uid，导致配件装上后数值不生效，直到重新装备这把枪。
    const modSig = item.attachments
      ? Object.keys(item.attachments).sort().map(k => item.attachments[k] || '').join('|')
      : '';
    if (currentUid === uid && current && current._modSig === modSig) continue;

    // ★ 拆掉扩容弹匣时弹匣容量变小：先留档旧弹链，重建后把溢出的子弹退回背包，
    //   不能像旧版一样被 normalizeLoaded 静默截断销毁。
    const oldQueue = item.loaded && Array.isArray(item.loaded.queue) ? [...item.loaded.queue] : null;
    let built;
    if (item.table === 'melee') {
      built = this._buildMeleeFromInventory(inv, iSlot);
    } else {
      built = this._buildWeaponFromInventory(inv, iSlot);
    }
    if (built) {
      built._modSig = modSig;
      if (oldQueue && built.magCap && oldQueue.length > built.magCap) {
        this._preserveOverflowRounds(inv, oldQueue.slice(built.magCap));
      }
    }
    p.weapons[pSlot] = built;
  }

  if (p.activeSlot !== 'fist' && p.weapons[p.activeSlot] === null) {
    const nextAvail = ['primary', 'secondary', 'melee'].find(s => p.weapons[s] !== null);
    p.activeSlot = nextAvail || 'fist';
  }

  if (p.activeSlot === 'fist') {
    p.fist.fireCd = 0;
  }
}

// 把因弹匣容量变小而多出来的子弹按弹种合并成堆，优先放回随身容器，最后进仓库。
// 这些子弹本来就在枪里，不重新计算负重硬上限，避免“拆弹匣反而卡住”。
_preserveOverflowRounds(inv, ammoIds) {
  if (!inv || !ammoIds || !ammoIds.length) return;
  const groups = new Map();
  for (const id of ammoIds) groups.set(id, (groups.get(id) || 0) + 1);
  for (const [ammoId, qty] of groups) {
    const def = this.engine.content.get('ammo', ammoId);
    if (!def) continue;
    const uid = inv.createItem('ammo', ammoId, { qty, lockValue: true });
    if (!uid) continue;
    let placed = false;
    for (const t of ['bag', 'chest', 'pocket', 'safe']) {
      if (inv.addToContainer(t, uid, { ignoreWeight: true }).ok) { placed = true; break; }
    }
    if (!placed) inv.addToContainer('stash', uid, { ignoreWeight: true });
  }
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
  const make = (uid) => {
    if (!uid) return { lv: 0, dur: 0, max: 0 };
    const item = inv.items.get(uid);
    if (!item) return { lv: 0, dur: 0, max: 0 };
    const def = this.engine.content.get(item.table, item.defId);
    if (!def || !def.armorLv) return { lv: 0, dur: 0, max: 0 };
    const armorDef = this.engine.content.get('armor', 'lv' + def.armorLv);
    return {
      item,
      lv: def.armorLv,
      red: armorDef && typeof armorDef.red === 'number' ? armorDef.red : undefined,
      max: item.durMax,
      get dur() { return this.item.dur; },
      set dur(v) { this.item.dur = v; },
    };
  };
  result.shell = make(inv.equipped.helmetShell);
  result.visor = make(inv.equipped.helmetVisor);
  result.fiber = make(inv.equipped.vestFiber);
  // ★ 插板唯一真相源：优先护甲纤维的 plate 子槽；旧存档的 vestPlate 槽仅作兼容回退。
  const fiberUid = inv.equipped.vestFiber;
  const fiberItem = fiberUid ? inv.items.get(fiberUid) : null;
  const nestedPlate = fiberItem && fiberItem.subSlots ? fiberItem.subSlots.plate : null;
  result.plate = make(nestedPlate || inv.equipped.vestPlate);
  return result;
}

  // 旧存档迁移：插板原本占独立 vestPlate 槽，现在必须并进护甲纤维。
  // 实际逻辑在模块级 migratePlateToFiber()，大厅与战局共用同一套迁移。
  _migratePlateToFiber(inv) {
    migratePlateToFiber(inv);
  }

  // ★ 装备槽是护甲唯一真相源：换甲/脱甲后必须重建 player.armor。
  //   旧版只在出生时构建一次，导致“脱掉的甲仍在承伤、背包里的甲掉耐久”。
  _syncArmorFromInventory() {
    const p = this.player;
    if (!p) return;
    if (p._mimicUntil && this.time < p._mimicUntil) return; // 拟载期间保持 BYinC
    const inv = this.engine.app ? this.engine.app.inventory : null;
    if (!inv) return;
    this._migratePlateToFiber(inv);
    const armor = this._buildArmorFromInventory(inv);
    if (armor) p.armor = armor;
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
  const count = this.mapSpec.enemyCount || 12;
  const half = this.mapSpec.size / 2 - 6;
  const diffMul = { easy: 0.75, normal: 1, hard: 1.25, nightmare: 1.5 }[this.diffId] || 1;
  const playerSpawn = this._playerSpawnPos || { x: 0, z: 0 };
  const minPlayerDist = 42;

  // ★ 地图 JSON 提供了具体兵种/小队/防区时，按布置生成
  if (this._enemySpawnPositions && this._enemySpawnPositions.length) {
    const spawnList = this._enemySpawnPositions;
    for (const pos of spawnList) {
      let spec = pos.spec ? this.engine.content.get('enemies', pos.spec) : null;
      if (!spec && pos.faction) {
        const pool = specs.filter(s => s.faction === pos.faction);
        if (pool.length) spec = pool[Math.floor(Math.random() * pool.length)];
      }
      if (!spec) spec = specs[Math.floor(Math.random() * specs.length)];
      this._spawnEnemy(spec, pos.x, pos.z, diffMul, pos);
    }
    // ★ 地图布置点不够时，在原有防区附近补巡逻单位；
    //   只做小幅偏移，保持“各阵营守自己区域”的分布，不再整图乱刷。
    const need = Math.max(0, count - spawnList.length);
    for (let i = 0; i < need; i++) {
      const pos = spawnList[i % spawnList.length];
      const ang = Math.random() * Math.PI * 2;
      const rad = 5 + Math.random() * 9;
      const ex = pos.x + Math.cos(ang) * rad;
      const ez = pos.z + Math.sin(ang) * rad;
      if (Math.hypot(ex - playerSpawn.x, ez - playerSpawn.z) < 38) continue;
      let spec = pos.spec ? this.engine.content.get('enemies', pos.spec) : null;
      if (!spec) spec = specs[Math.floor(Math.random() * specs.length)];
      this._spawnEnemy(spec, ex, ez, diffMul, {
        ...pos,
        x: ex, z: ez,
        squad: pos.squad ? pos.squad + '-r' : null,
      });
    }
    return;
  }

  // 无布局时的兜底：尽量远离出生点，并按阵营轮换
  const factions = ['nipsel', 'bank', 'unknown'];
  for (let i = 0; i < count; i++) {
    const faction = factions[i % factions.length];
    const pool = specs.filter(s => s.faction === faction);
    const spec = pool.length ? pool[Math.floor(Math.random() * pool.length)] : specs[i % specs.length];
    let ex, ez, tries = 0;
    do {
      ex = (Math.random() * 2 - 1) * half;
      ez = (Math.random() * 2 - 1) * half;
      tries++;
    } while ((Math.hypot(ex - playerSpawn.x, ez - playerSpawn.z) < minPlayerDist) && tries < 80);
    this._spawnEnemy(spec, ex, ez, diffMul, { faction });
  }
}

  _spawnEnemy(spec, x, z, diffMul, spawnInfo = {}){
  const assessment = this.engine.profile.assess();
  const profileMul = 0.5 + assessment.score;

  const mesh = this.engine.meshes.build('enemy', spec);
  mesh.traverse(obj => {
    if (obj.isMesh) obj.material = obj.material.clone();
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

  // ★ 特殊兵种抽取：spec.special 是一层“额外配装档”，未抽中时完全回退到基础 gear。
  //   战术机动人员靠它获得双持特种武器 + 龙息/玻纤弹 + 更高护甲的装备组合。
  const special = (spec.special && Math.random() < (spec.special.chance !== undefined ? spec.special.chance : 0.5))
    ? spec.special : null;
  const gearArmor = (special && special.armor) || (spec.gear && spec.gear.armor);

  // ★ 根据 gear.armor 构造敌人护甲（和玩家同结构）
  const armor = {
    shell: { lv: 0, dur: 0, max: 0 },
    visor: { lv: 0, dur: 0, max: 0 },
    fiber: { lv: 0, dur: 0, max: 0 },
    plate: { lv: 0, dur: 0, max: 0 },
  };
  if (gearArmor) {
    for (const slot in armor) {
      const g = gearArmor[slot];
      if (g && g.lv > 0) {
        const armorDef = this.engine.content.get('armor', 'lv' + g.lv);
        armor[slot] = {
          lv: g.lv, dur: 100, max: 100, defId: g.defId,
          red: armorDef && typeof armorDef.red === 'number' ? armorDef.red : undefined,
        };
      }
    }
  }

  const isPrazer = !!spec.prazer;
  const maxCoup = isPrazer ? 100 : 0;

  // ★ 武器组：主武器 + 备用武器 + 近战。AI 会按距离/弹量自动切换
  const weaponIds = [];
  if (special && Array.isArray(special.weaponSets) && special.weaponSets.length) {
    const set = special.weaponSets[Math.floor(Math.random() * special.weaponSets.length)];
    weaponIds.push(...set);
  } else if (Array.isArray(spec.weaponSets) && spec.weaponSets.length) {
    const set = spec.weaponSets[Math.floor(Math.random() * spec.weaponSets.length)];
    weaponIds.push(...set);
  } else if (Array.isArray(spec.weapons) && spec.weapons.length) {
    weaponIds.push(...spec.weapons);
  } else if (Array.isArray(spec.weaponOptions) && spec.weaponOptions.length) {
    weaponIds.push(spec.weaponOptions[Math.floor(Math.random() * spec.weaponOptions.length)]);
  } else if (spec.weapon) {
    weaponIds.push(spec.weapon);
  }
  // AI 只实际使用主/副两把枪；多出来的配置不入库，避免背包放不下的幽灵物品
  if (weaponIds.length > 2) weaponIds.length = 2;
  // 先配对 id 与运行时，避免某个武器定义缺失时 built 下标错位、把 A 枪的弹链装到 B 枪上
  const builtPairs = weaponIds.map(id => ({ id, w: this._buildWeapon(id) })).filter(p => p.w);
  const built = builtPairs.map(p => p.w);
  const builtIds = builtPairs.map(p => p.id);
  // ★ 特种弹药：抽中 special 时把弹链整体换成对应口径的特殊弹（龙息/玻纤等），
  //   这样 AI 从第一发开始就真的在使用特殊弹药，而不是只在尸体上塞一盒。
  if (special && special.ammo) {
    for (const w of built) {
      if (!w || !w.def) continue;
      const ammoId = special.ammo[w.def.ammoType];
      const ad = ammoId ? this.engine.content.get('ammo', ammoId) : null;
      if (!ad || ad.caliber !== w.def.ammoType) continue;
      w.loaded.queue = new Array(w.magCap).fill(ammoId);
      w.loaded.qty = w.magCap;
      w.loaded.ammoType = ammoId;
      w.specialAmmoId = ammoId;
    }
  }
  const primary = built[0] || null;
  const secondary = built[1] || null;
  const meleeDef = this.engine.content.get('melee', 'knife');
  const melee = meleeDef ? { def: meleeDef, fireCd: 0, isMelee: true, mag: Infinity, reserve: 0 } : null;
  const weapons = { primary, secondary, melee };
  const startWeapon = primary || secondary || melee;

  const enemy = {
    mesh, body, spec,
    faction: spec.faction || 'nipsel',
    squad: spawnInfo.squad || spec.squad || null,
    home: { x: spawnInfo.homeX !== undefined ? spawnInfo.homeX : x, z: spawnInfo.homeZ !== undefined ? spawnInfo.homeZ : z },
    patrolRadius: spawnInfo.patrolRadius || spec.patrolRadius || 14,
    hp: spec.hp * diffMul * profileMul,
    maxHp: spec.hp * diffMul * profileMul,
    angle: spawnInfo.angle !== undefined ? spawnInfo.angle : Math.random() * Math.PI * 2,
    weapons,
    weapon: startWeapon,
    currentSlot: primary ? 'primary' : (secondary ? 'secondary' : 'melee'),
    _weaponLock: 0,
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
    _damageFromPlayer: 0,
    _lastDamageDealt: 0,
    _lastDamageByPlayer: false,
    armor,
    coupling: maxCoup,
    maxCoupling: maxCoup,
    protection: null,
    protectionHold: false,
    limbDamage: 0,
    speedMul: 1,
    charSpec: { prazer: isPrazer, A: spec.A || 0, hp: spec.hp },
    status: new EntityStatus(spec, isPrazer),
    lootInv: new Inventory(this.engine.content)
  };
  body.userData.ref = enemy;

  // ★ 初始化敌人库存：主武器、备用武器、护甲、胸挂背包、备弹
  const lootInv = enemy.lootInv;
  enemy._wUids = { extra: [] };
  builtIds.forEach((id, idx) => {
    const w = built[idx];
    if (!w) return;
    const uid = lootInv.createItem('weapons', id, {
      loadedQty: w.magCap || 0,
      loadedQueue: w.loaded && w.loaded.queue ? [...w.loaded.queue] : undefined,
    });
    if (!uid) return;
    if (idx === 0) {
      lootInv.equip('main', uid);
      enemy._wUids.primary = uid;
    } else {
      if (idx === 1) enemy._wUids.secondary = uid;
      enemy._wUids.extra.push(uid);
    }
  });

  if (gearArmor) {
    const map = { shell: 'helmetShell', visor: 'helmetVisor', fiber: 'vestFiber', plate: 'vestPlate' };
    for (const s in map) {
      const g = gearArmor[s];
      if (g && g.lv > 0) {
        const aUid = lootInv.createItem(map[s], g.defId);
        if (aUid) {
          const r = lootInv.equip(map[s], aUid);
          // 插板没有护甲纤维可装时，放进背包；背包也满则销毁，避免幽灵物品
          if (!r.ok && !lootInv.addToContainer('bag', aUid).ok) lootInv.destroyItem(aUid);
        }
      }
    }
  }

  const chestUid = lootInv.createItem('chestRig', 'large');
  if (chestUid) lootInv.equip('chestRig', chestUid);
  const bagUid = lootInv.createItem('backpack', 'medium');
  if (bagUid) lootInv.equip('backpack', bagUid);

  // 备用/额外武器塞进背包，尸体上能搜到
  for (const extraUid of enemy._wUids.extra) {
    if (!lootInv.addToContainer('bag', extraUid).ok
        && !lootInv.addToContainer('chest', extraUid).ok) {
      lootInv.destroyItem(extraUid);
    }
  }

  // 往他包里塞点备弹：普通兵 90 发；特种兵塞 60 发对应特殊弹，玩家可以缴获
  for (const w of [primary, secondary]) {
    if (!w || !w.def) continue;
    const ammoId = w.specialAmmoId || w.def.ammoType;
    const ammoUid = lootInv.createItem('ammo', ammoId, { qty: w.specialAmmoId ? 60 : 90 });
    if (ammoUid && !lootInv.addToContainer('chest', ammoUid).ok
        && !lootInv.addToContainer('bag', ammoUid).ok) lootInv.destroyItem(ammoUid);
  }

  // ★ 投掷物：按 spec.gear.nades / special.nades 生成真实物品。
  //   AI 从 lootInv 里取用，扔出去消耗实物；玩家击杀后能搜到剩下的。
  const nadeIds = (special && special.nades) || (spec.gear && spec.gear.nades) || [];
  for (const nadeId of nadeIds) {
    const nadeUid = lootInv.createItem('nade', nadeId);
    if (!nadeUid) continue;
    if (!lootInv.addToContainer('chest', nadeUid).ok
        && !lootInv.addToContainer('bag', nadeUid).ok) lootInv.destroyItem(nadeUid);
  }
  if (nadeIds.length) {
    // 开局至少给 5 秒思考时间，不会一见面就扔雷
    enemy._nadeCd = 5 + Math.random() * 6;
  }

  // ★ 基础药品：敌我都带一点，用于互相救治/自愈
  //   普通兵至少 1 条绷带；精锐/队长/机动/警卫多一个手术包；友方 AI 多一个血浆袋。
  if (!this.training) {
    const strongMed = ['elite', 'leader', 'mobile', 'guard'].includes(spec.rank);
    const medIds = spec.rank === 'ally'
      ? ['bandage', 'bandage', 'blood_pack', 'surgical_kit']
      : (strongMed ? ['bandage', 'surgical_kit'] : ['bandage']);
    for (const medId of medIds) {
      const mUid = lootInv.createItem('medical', medId);
      if (!mUid) continue;
      if (!lootInv.addToContainer('chest', mUid).ok
          && !lootInv.addToContainer('bag', mUid).ok) lootInv.destroyItem(mUid);
    }
  }

  // ★ 收集轮廓流光（非 Prazer 时为空数组）
  enemy.glowMeshes = [];
  enemy.mesh.traverse(obj => {
    if (obj.isMesh && obj.name === '__prazer_glow__') enemy.glowMeshes.push(obj);
  });
  enemy._lastCoupling = enemy.coupling;
  enemy._glowTimer = 0;
  if (this.training) this._configureTrainingDummy(enemy);

  this.enemies.push(enemy);
}

  // ★ 匹配友方 AI：用玩家的装备等级/武器价值作为参照，避免“队友一身顶级、玩家一身破烂”
  _allyArmorFromPlayer(inv) {
    const fromUid = (uid, fallbackId) => {
      const item = uid && inv && inv.items.get(uid);
      const def = item && inv.getDef(item);
      return {
        defId: def ? item.defId : fallbackId,
        // 玩家没穿这件护甲时，队友也不凭空多一件；装备价值尽量贴近我方
        lv: def && def.armorLv ? def.armorLv : 0,
      };
    };
    // 插板在 4.x 之后位于 fiber.subSlots.plate，不再占独立 vestPlate 槽
    const fiberUid = inv && inv.equipped.vestFiber;
    const fiberItem = fiberUid && inv.items.get(fiberUid);
    const plateUid = (fiberItem && fiberItem.subSlots && fiberItem.subSlots.plate)
      || (inv && inv.equipped.vestPlate);
    return {
      shell: fromUid(inv && inv.equipped.helmetShell, 'lv3'),
      visor: fromUid(inv && inv.equipped.helmetVisor, 'lv3'),
      fiber: fromUid(inv && inv.equipped.vestFiber, 'lv3'),
      plate: fromUid(plateUid, 'lv3'),
    };
  }

  _spawnAllies() {
    const p = this.player;
    if (!p || !p.body) return;
    const inv = this.engine.app && this.engine.app.inventory;
    const content = this.engine.content;
    // 玩家当前的主/副武器与护甲等级就是“我方装备价值”的参照
    const mainUid = inv && inv.equipped.main;
    const sideUid = inv && inv.equipped.side;
    const mainItem = mainUid && inv.items.get(mainUid);
    const sideItem = sideUid && inv.items.get(sideUid);
    const mainId = mainItem && mainItem.table === 'weapons' ? mainItem.defId : null;
    const sideId = sideItem && sideItem.table === 'weapons' ? sideItem.defId : null;
    const armor = this._allyArmorFromPlayer(inv);
    // ★ 队友随机：凯特/玲娜/布雯，且尽量不与玩家本人重复；每次开局重新洗牌
    const allyPool = ['kate', 'lingna', 'buwen'].filter(id => id !== this.charId);
    for (let i = allyPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = allyPool[i]; allyPool[i] = allyPool[j]; allyPool[j] = t;
    }
    const charIds = allyPool.slice(0, Math.min(2, allyPool.length));
    const names = [];
    for (let i = 0; i < charIds.length; i++) {
      const char = content.get('characters', charIds[i]);
      if (!char) continue;
      const weaponId = mainId || char.weapon;
      const sidearmId = sideId || char.sidearm;
      const spec = {
        name: char.name, tag: char.tag,
        faction: 'player', group: 'player', rank: 'ally',
        hp: char.hp || 115, speed: char.speed || 4.8, radius: char.radius || 1.15,
        color: char.color || 0x66ccff,
        weapons: [weaponId, sidearmId].filter((v, idx, arr) => v && arr.indexOf(v) === idx),
        ai: {
          aggression: 0.68, composure: 0.78, perception: 0.72,
          opportunism: 0.6, keepDistance: 14, meleeBias: 0.3,
          switchBias: 0.65, grenade: 0.68,
        },
        // 队友带两枚破片：AI 有实物库存才会进入 nade 状态，扔一枚少一枚
        gear: { armor, nades: ['frag', 'frag'] },
        alertness: char.alertness || 2,
        prazer: false, A: 0,
      };
      const ang = (p.angle || 0) + (i === 0 ? 2.35 : -2.35);
      const px = p.body.position.x + Math.cos(ang) * 3.4;
      const pz = p.body.position.z + Math.sin(ang) * 3.4;
      this._spawnEnemy(spec, px, pz, 1, {
        faction: 'player', squad: 'ally', angle: p.angle || 0, patrolRadius: 800,
      });
      const ally = this.enemies[this.enemies.length - 1];
      if (!ally) continue;
      ally.isAlly = true;
      ally.allyRole = i === 0 ? 'assault' : 'medic';
      ally.allyIndex = i;
      ally.allyName = this.engine.i18n.t(char.name);
      ally.patrolRadius = 800;
      ally.home = { x: p.body.position.x, z: p.body.position.z };
      ally._allyMarkCd = 0;
      ally._allyAidCd = 0;
      ally._allyPlanCd = 0;
      ally._allySpotCd = 0;
      ally._allyLowSaid = false;
      this.allies.push(ally);
      names.push(ally.allyName);
    }
    if (names.length) {
      this._squadSay('队伍', '友方小队已接入：' + names.join('、') + '。他们会共享标记、汇报敌情并主动支援。');
    }
  }

_configureTrainingDummy(enemy) {
  if (!this.training || !enemy || !enemy.status) return;
  enemy.trainingDummy = true;
  // ★ 人偶复位必须是“完整复位”：位置/姿态/AI状态/武器槽/命中反馈都要清，
  //   否则复活后仍带着上一轮的倒地姿势、战斗状态或空武器槽。
  enemy.isDownedState = false;
  enemy._wasDowned = false;
  enemy._downedAt = 0;
  enemy.deathTimer = undefined;
  enemy.deathTotal = 0;
  enemy.state = 'patrol';
  enemy.stateT = 0;
  enemy.isCrouching = false;
  enemy.hitFlash = 0;
  enemy.fireCd = 0;
  enemy.burstCount = 0;
  enemy.burstCooldown = 0;
  enemy._nadeCd = 0;
  enemy._nadeDefId = null;
  enemy._nadeWarned = false;
  enemy._nadeThink = 0;
  enemy.hp = enemy.maxHp;
  if (enemy.weapons) {
    enemy.currentSlot = enemy.weapons.primary ? 'primary' : (enemy.weapons.secondary ? 'secondary' : 'melee');
    enemy.weapon = enemy.weapons.primary || enemy.weapons.secondary || enemy.weapons.melee || enemy.weapon;
  }
  if (enemy.body) {
    enemy.body.height = 2.4;
    enemy.body.halfH = 1.2;
    enemy.body.radius = enemy.spec.radius || 1.0;
    enemy.body.position.y = 1.2;
    enemy.body.velocity.x = 0;
    enemy.body.velocity.y = 0;
    enemy.body.velocity.z = 0;
  }
  if (enemy.mesh) {
    enemy.mesh.visible = true;
    enemy.mesh.rotation.x = 0;
    enemy.mesh.rotation.z = 0;
    enemy.mesh.scale.set(1, 1, 1);
    enemy.mesh.traverse(obj => {
      if (obj.isMesh && obj.material && obj.material.emissive) {
        obj.material.emissive.setHex(0x000000);
        obj.material.emissiveIntensity = 0;
      }
    });
  }
  enemy._dummyTarget = null;
  enemy._dummyRetarget = 0;
  enemy._dummyPhase = undefined;
  enemy.status.painkillerDoses = [];
  const hp = Math.max(10, this.training.dummyHp || 100);
  const ratio = hp / 100;
  const st = enemy.status;
  // ★ 基准值必须来自固定的部位上限，而不是“当前 status”。
  //   旧版只在第一次配置时缓存；若中途被 EMP/爆炸改过 maxHp 或进入过异常状态，
  //   后续“应用设置”会以受伤后的数值为基准，人偶看起来永远带伤。
  enemy._dummyBase = {
    maxBlood: st.isPrazer ? 6000 : 5000,
    parts: Object.assign({}, PART_MAX_HP),
  };
  st.maxBlood = Math.round(enemy._dummyBase.maxBlood * ratio);
  st.blood = st.maxBlood;
  for (const k in st.parts) {
    const part = st.parts[k];
    part.maxHp = Math.max(10, (enemy._dummyBase.parts[k] || part.maxHp) * ratio);
    part.hp = part.maxHp;
    part.wounds = [];
    part.wound = 0;
    part.fracture = 0;
  }
  st.effects.clear();
  st.burningParts = {};
  st._burnSpreadT = 0;
  st._burnRampT = 0;
  st.bleedSeal = 0;
  st.healthQuality = 100;
  st.updateOverallHealth();
  // 彻底清掉上次战斗残留的负面来源：否则复活后仍会继续流血/着火/玻纤/眩晕
  enemy._hazardType = null;
  enemy.blindedUntil = 0;
  enemy.stunnedUntil = 0;
  enemy.suppressedUntil = 0;
  enemy._dazzledUntil = 0;
  enemy.awareness = 0;
  enemy.targetEntity = null;
  enemy.fireCd = 0;
  enemy._lastHitSrcX = undefined;
  enemy._lastHitSrcZ = undefined;
  const oldHazard = this._hazardVfx && this._hazardVfx.get(enemy);
  if (oldHazard) {
    if (oldHazard.group && oldHazard.group.parent) oldHazard.group.parent.remove(oldHazard.group);
    this._hazardVfx.delete(enemy);
  }
  enemy._damageFromPlayer = 0;
  enemy._lastDamageDealt = 0;
  enemy._lastDamageByPlayer = false;
  // 重新应用设置时把被打倒/打歪的人偶扶正，避免血量恢复了却还趴着
  if (enemy.isDownedState) {
    enemy.isDownedState = false;
    if (enemy.body) {
      enemy.body.height = 2.4;
      enemy.body.halfH = 1.2;
      enemy.body.radius = enemy.spec.radius || 1.0;
      enemy.body.position.y = 1.2;
    }
    if (enemy.mesh) enemy.mesh.rotation.z = 0;
  }
  // 每个槽位独立选择 content 表里的任意一件防具，不再用“统一几级”
  const gear = this.training.dummyGear || {};
  const tableMap = {
    shell: 'helmetShell',
    visor: 'helmetVisor',
    fiber: 'vestFiber',
    plate: 'vestPlate',
  };
  for (const slot of ['shell', 'visor', 'fiber', 'plate']) {
    const defId = gear[slot];
    const def = defId ? this.engine.content.get(tableMap[slot], defId) : null;
    if (def && def.armorLv > 0) {
      const armorDef = this.engine.content.get('armor', 'lv' + def.armorLv);
      const maxDur = def.maxDur || 100;
      enemy.armor[slot] = {
        lv: def.armorLv,
        dur: maxDur,
        max: maxDur,
        defId,
        red: armorDef && typeof armorDef.red === 'number' ? armorDef.red : undefined,
      };
    } else {
      enemy.armor[slot] = { lv: 0, dur: 0, max: 0 };
    }
  }
}

_reviveTrainingDummy(enemy) {
  if (!this.training || !enemy || !enemy.body) return;
  if (!enemy.alive) {
    enemy.alive = true;
    enemy.body.alive = true;
    try { this.physics.add(enemy.body); } catch (_) {}
  }
  enemy.isDownedState = false;
  enemy._wasDowned = false;
  enemy._downedAt = 0;
  enemy.deathTimer = undefined;
  enemy.deathTotal = 0;
  enemy.state = 'patrol';
  enemy.stateT = 0;
  enemy.isCrouching = false;
  enemy.hitFlash = 0;
  enemy.fireCd = 0;
  enemy.burstCount = 0;
  enemy.burstCooldown = 0;
  enemy._nadeCd = 0;
  enemy._nadeDefId = null;
  enemy._nadeWarned = false;
  enemy._nadeThink = 0;
  enemy.hp = enemy.maxHp;
  if (enemy.weapons) {
    enemy.currentSlot = enemy.weapons.primary ? 'primary' : (enemy.weapons.secondary ? 'secondary' : 'melee');
    enemy.weapon = enemy.weapons.primary || enemy.weapons.secondary || enemy.weapons.melee || enemy.weapon;
  }
  if (enemy.status) {
    const st = enemy.status;
    st.effects.clear();
    st.burningParts = {};
    st._burnSpreadT = 0;
    st._burnRampT = 0;
    st.bleedSeal = 0;
    st.painkillerDoses = [];
    st.blood = st.maxBlood;
    for (const k in st.parts) {
      const part = st.parts[k];
      part.hp = part.maxHp;
      part.wounds = [];
      part.wound = 0;
      part.fracture = 0;
    }
    st.healthQuality = 100;
    st.updateOverallHealth();
  }
  enemy._hazardType = null;
  enemy.blindedUntil = 0;
  enemy.stunnedUntil = 0;
  enemy.suppressedUntil = 0;
  enemy.targetEntity = null;
  enemy.awareness = 0;
  enemy.body.height = 2.4;
  enemy.body.halfH = 1.2;
  enemy.body.radius = enemy.spec.radius || 1;
  const home = enemy._dummyHome || enemy.home || { x: enemy.body.position.x, z: enemy.body.position.z };
  enemy.body.position.x = home.x;
  enemy.body.position.z = home.z;
  enemy.body.position.y = 1.2;
  enemy.body.velocity.x = 0;
  enemy.body.velocity.y = 0;
  enemy.body.velocity.z = 0;
  if (enemy.mesh) {
    enemy.mesh.visible = true;
    enemy.mesh.rotation.x = 0;
    enemy.mesh.rotation.z = 0;
    enemy.mesh.scale.set(1, 1, 1);
    enemy.mesh.traverse(obj => {
      if (obj.isMesh && obj.material && obj.material.emissive) {
        obj.material.emissive.setHex(0x000000);
        obj.material.emissiveIntensity = 0;
      }
    });
  }
  enemy._dummyTarget = null;
  enemy._dummyRetarget = 0;
  enemy._dummyPhase = undefined;
  const oldVfx = this._hazardVfx.get(enemy);
  if (oldVfx) {
    if (oldVfx.group.parent) oldVfx.group.parent.remove(oldVfx.group);
    this._hazardVfx.delete(enemy);
  }
}

_applyTrainingSettings() {
  if (!this.training) return;
  for (const e of this.enemies) {
    if (!e.trainingDummy) continue;
    // 只有玩家主动“应用设置/重开靶场”才复位死亡人偶；不会自动复活
    if (!e.alive) this._reviveTrainingDummy(e);
    if (e.alive) this._configureTrainingDummy(e);
  }
  // 详情面板有签名缓存；复位后必须强制重绘，否则仍显示上一轮的伤口/状态
  if (this.hud) this.hud._dummyInfoSig = '';
  this._refillTrainingLoadout();
  if (this.training.noCd && this.player && this.player.skills) {
    for (const sk of this.player.skills) {
      sk.ready = true;
      sk.cd = 0;
      if (sk.def.maxCharges) sk.charges = sk.def.maxCharges;
    }
  }
  const panel = document.getElementById('training-attack-panel');
  if (panel) panel.style.display = this.training.showAttackPanel ? 'block' : 'none';
}

_refillTrainingLoadout() {
  const p = this.player;
  if (!p) return;
  for (const slot of ['primary', 'secondary', 'melee']) {
    const w = p.weapons[slot];
    if (w && w.item && w.item.loaded) {
      // 补满配装不能覆盖玩家在靶场排好的弹链顺序；只补到满弹匣
      const inv = this.engine.app && this.engine.app.inventory;
      if (inv) inv.normalizeLoaded(w.item);
      const L = w.item.loaded;
      const pref = w.item.loadedPreference;
      const prefDef = pref ? this.engine.content.get('ammo', pref) : null;
      const fillId = (prefDef && this.engine.app.inventory &&
        this.engine.app.inventory.isAmmoCompatible(w.def, prefDef)) ? pref : w.def.ammoType;
      while (L.queue.length < w.magCap) L.queue.push(fillId);
      if (L.queue.length > w.magCap) L.queue.length = w.magCap;
      L.qty = L.queue.length;
      L.ammoType = L.queue[0] || fillId;
    }
  }
  if (p.armor) {
    for (const k of ['shell', 'visor', 'fiber', 'plate']) {
      if (p.armor[k] && p.armor[k].max) p.armor[k].dur = p.armor[k].max;
    }
  }
  p.coupling = p.maxCoupling;
  p.stamina = p.maxStamina;
  if (this.engine.app && this.engine.app._ensureStarterThrowables) {
    this.engine.app._ensureStarterThrowables();
  }
  this._log('靶场配装已补满', 'p');
}
  _spawnExtracts(){
  if (this.training) return; // 靶场没有撤离点
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
  const count = this.mapSpec.containerCount || 10;
  // 容器类型权重：物资箱最多，保险柜/冷藏柜稀有（数据来自 content.containers）
  const typeWeights = { crate: 5, ammobox: 3, medbox: 2, toolbox: 2, safe: 1, fridge: 1 };
  const pool = [];
  for (const t of (this.engine.content.all('containers') || [])) {
    const w = typeWeights[t.id] || 1;
    for (let i = 0; i < w; i++) pool.push(t.id);
  }
  for (let i = 0; i < count; i++) {
    let cx, cz, tries = 0;
    do {
      cx = (Math.random() * 2 - 1) * half;
      cz = (Math.random() * 2 - 1) * half;
      tries++;
    } while (Math.hypot(cx, cz) < 8 && tries < 40);
    const typeId = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'crate';
    this._spawnContainerAt(cx, cz, typeId);
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
  if (this.replayMode) { this._updateReplay(dt); return; }
  if (!this.running || this.paused) return;
  this.time += dt;

  this.tasks.tickSurvive(dt);

  // ★ 1. 状态机更新（受伤、流血、状态倒计时）
  if (this.player && this.player.status) this.player.status.tick(dt);
  for (const e of this.enemies) { if (e.alive && e.status) e.status.tick(dt); }

  // ★ 1.5 生死/击倒同步：出血、燃烧、玻纤等持续伤害也能在这一帧结算
  if (this.player && this.player.alive) this._syncEntityLifecycle(this.player, true);
  for (const e of this.enemies) {
    if (e.alive) this._syncEntityLifecycle(e, false);
  }

  // ★ 击倒后失血：给 30 秒救援窗口，超时转入真正的死亡并写入死亡记录
  if (this.player && this.player.alive && this.player.status && this.player.status.isDowned()) {
    if (!this.player._downedAt) this.player._downedAt = this.time;
    if (this.time - this.player._downedAt > 30) {
      this.player.status.blood = 0;
      this.player.status.updateOverallHealth();
      this._log('失血过多，伤势恶化', 'r');
      this._playerDown(this.player._lastDamageSource || null);
    }
  }

  // ★ 2. 玩家更新（只跑一次）
  this._updateThrowFuse(dt);
  this._updatePlayer(dt);

  // ★ 3. 状态弹窗检测 + 受伤/疼痛/着火的叫唤
  this._checkPlayerEffects(dt);
  this._updateEntityVoice(dt);

  // ★ 4. 其他逻辑更新
  this.actionProcess.update(dt);
  this._updateEnemies(dt);
  this._updateExplorationMemory(dt);
  this._updateSquadPlan(dt);
  this._updateSoundSystem(dt);
  this._updateExtracts(dt);
  this._updateContainers(dt);
this._updateNearbyList();
  this._updateAllyCarePanel();
  this._updateSquadOrderUI();
  this._updateTracers(dt);
  this._updateProjectiles(dt);
  this._updateFireFields(dt);
  this._updateThrowPreview();
  this._updateDrones(dt);
  this._updateDroneFeed(dt);
  this._updateMobileButtons();
  this._tickAlerts(dt);

  // ★ 5. 物理同步与渲染
  this.physics.step(dt);
  this._syncMeshes(dt);
  this._updateAimFovAndLaser(dt);
  this._recordReplayFrame(dt);
  this._updateGlowState(this.player, dt);

  // ★ 6. 相机跟随（活/死/无人机互斥）
 if (this.player && this.player.alive) {
  const p = this.player;
  if (p._controllingDrone && this.drones && this.drones[0]) {
    const dm = this.drones[0].mesh.position;
    this.engine.cameraCtl.follow(dm.x, dm.y, dm.z);
  } else {
    const footY = p.body.position.y - p.body.halfH;
    // 侧身偏移计算
    const leanOff = p.leanOffset || 0;
    const rightX = Math.cos(this.engine.cameraCtl.yaw);
    const rightZ = Math.sin(this.engine.cameraCtl.yaw);
    const camX = p.body.position.x + rightX * leanOff;
    const camZ = p.body.position.z + rightZ * leanOff;

    this.engine.cameraCtl.follow(camX, footY + (p.camHeight || 1.55), camZ);
  }
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

_updateThrowFuse(dt){
  const p = this.player;
  if (!p || !p.alive || !p.activeThrowable || !p._throwPinPulled) return;
  if (p._throwFuse === undefined) return;
  p._throwFuse = Math.max(0, p._throwFuse - dt);
  if (p._throwFuse <= 0) this._detonateHeldThrowable(p);
}

_updatePlayer(dt){
  const p = this.player;
  if (!p || !p.alive) return;

  const e = this.engine;
  this._refreshEdges();
  this._updateSkillStates(dt);
  // ★ 投掷轮盘打开时冻结玩家输入：避免点击轮盘触发开火/切枪，
  //   同时用 _refreshEdges 吃掉这一帧的边沿，关闭后不会补放技能。
  if (this._nadeWheelOpen) return;  if (this.training) {
    // 靶场默认保持满耦合/满体力，便于反复测试技能与移动
    p.coupling = p.maxCoupling;
    p.stamina = p.maxStamina;
  }

  // 倒地后立即断开无人机操控，不能靠无人机继续行动/攻击
  if (p._controllingDrone && p.status && p.status.isDowned()) {
    this._exitDroneControl('倒地，无人机链路断开');
  }

  // ★ 负重：0.25s 刷新一次，决定普通/负重/超重
  if (!this._weightT || this.time - this._weightT > 0.25) {
    this._weightT = this.time;
    const inv = this.engine.app && this.engine.app.inventory;
    p.carryWeight = inv ? inv.getCarryWeight() : 0;
    // 装备槽变化（脱甲/换甲/背包内挪甲）同步到承伤模型
    this._syncArmorFromInventory();
    const lim = p.carryLimit || 34;
    p.loadState = p.carryWeight > lim ? 'overweight' : (p.carryWeight > lim * 0.75 ? 'loaded' : 'normal');
    // ★ 负重硬上限：允许短时超载到 1.35 倍，但不能无限背。
    //   超过后 Inventory.addToContainer 会拒绝新物品进入随身容器（转移/拾取会提示“超重”）。
    //   这样既有“超重还能挪两步”的真实感，又不会出现背着一吨物资跑图。
    p.carryHardLimit = Math.round(lim * 1.35 * 10) / 10;
    if (inv) inv.maxCarryWeight = p.carryHardLimit;
    if (p.carryWeight > p.carryHardLimit && !p._overCapLogged) {
      p._overCapLogged = true;
      this._log('负重超过硬上限（' + p.carryWeight.toFixed(1) + '/' + p.carryHardLimit.toFixed(1) + 'kg），无法再拾取物品', 'r');
    } else if (p.carryWeight <= lim) {
      p._overCapLogged = false;
    }
    let loadMul = 1;
    if (p.loadState === 'loaded') loadMul = Math.min(1, 0.9 + (p._adaptBonus || 0) * 0.2);
    else if (p.loadState === 'overweight') loadMul = 0.72 + (p._adaptBonus || 0) * 0.3;
    p._loadMul = loadMul;
  }

  // ★ 投掷物手持表现
  if (p.activeThrowable) this._updateHeldThrowable(p);
  else this._removeHeldThrowable();

  // ★ 无人机操控：Y 切换进入/退出，进入后改用无人机视角与移动
  if (this._edge.droneControl) this._toggleDroneControl();
  if (p._controllingDrone && this.drones && this.drones[0]) {
    this._updateDroneControl(dt, e, p);
    if (e.input.isActive('fire')) this._droneScanAttack(p);
    if (this._edge.weaponSlot1) this._droneThrowPayload(p, 'frag');
    if (this._edge.weaponSlot2) this._droneThrowPayload(p, 'emp');
    // ★ 无人机视角下也能下战术建议：P/O 用当前（无人机）准星落点生成标记，
    //   否则一进无人机就被前面的 return 吃掉按键，队友完全不听指挥。
    if (this._edge.squadAdvance) this._issueSquadOrder('advance');
    if (this._edge.squadRetreat) this._issueSquadOrder('retreat');
    return;
  }

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
const baseCost        = spec.sprintCost !== undefined ? spec.sprintCost : 3.0;
const baseIdleRegen   = spec.staminaRegen && spec.staminaRegen.idle !== undefined ? spec.staminaRegen.idle : 6;
const baseMoveRegen   = spec.staminaRegen && spec.staminaRegen.move !== undefined ? spec.staminaRegen.move : 1.5;

const staminaRatio = p.stamina / p.maxStamina;
const downedNow = !!(p.status && p.status.isDowned());
// 越累消耗越快；恢复反而变慢（旧版写成“越累恢复越快”，等于跑不死）
const fatigueMul   = 1 + (1 - staminaRatio) * 1.2;   // 1~2.2
const recoveryMul  = 0.55 + staminaRatio * 0.9;      // 0.55~1.45
const loadFactor   = 1 + Math.min(0.8, (p.carryWeight || 0) / Math.max(1, p.carryLimit || 34)) * 0.55;

// 蹲着不能疾跑：想跑就站起来。旧版允许蹲姿冲刺，视觉和体力都不合理。
const canSprint = !downedNow && isMoving && wantsToSprint && !p.isCrouching && p.stamina > 2 && staminaRatio > 0.08;

let isSprinting = false;
if (canSprint) {
  isSprinting = true;
  p.stamina = Math.max(0, p.stamina - dt * baseCost * fatigueMul * loadFactor);
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
let statusSpeedMul = p.status ? p.status.getMoveSpeedMul() : 1;
if (p._immuneNeg) statusSpeedMul = 1;
else {
  const nr = Math.max(0, Math.min(0.9, p.skillNegResist || 0));
  statusSpeedMul = 1 - (1 - statusSpeedMul) * (1 - nr);
}

// ★ 3. 位移冲刺（猫跃 / Srdispte 侧闪）：用插值滑过去，而不是瞬移
const dashing = this._updateDash(p, dt);

  // ★ 3. 移动计算（搜索时锁定移动）
let moveX = 0, moveZ = 0;
if (!this._searching && !dashing) {
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

const finalSpeed = speed * exhaustionMul * statusSpeedMul * downedSpeedMul * (p.skillSpeedMul || 1) * (p._loadMul || 1);
p.body.velocity.x = moveX * finalSpeed;
p.body.velocity.z = moveZ * finalSpeed;
if (isMoving && !this._searching) p.body.wake();

 // ★ 4. 自动跨越/攀爬 + 跳跃检测（grounded 标志）
const jumpPressed = !downedNow && (e.input.keys.has(' ') || e.input.isActive('jump'));
const mantled = this._tryMantle(p, isMoving, jumpPressed, e);
if (!mantled && jumpPressed && p.body.grounded && p.body.velocity.y <= 0.1) {
  // 低矮屋内跳跃：按头顶净空限制初速，避免头穿过屋顶后被物理挤飞
  const headClear = this._ceilingClearance(p);
  const maxRise = Math.max(0, headClear - 0.12);
  if (maxRise > 0.08) {
    p.body.velocity.y = Math.min(9.5, Math.sqrt(2 * 20 * maxRise));
    p.body.wake();
  } else if (!p._ceilHintAt || this.time - p._ceilHintAt > 2) {
    p._ceilHintAt = this.time;
    this._hint('头顶空间不足，无法起跳', 'y');
  }
}

// ★ 战术动作：蹲下（点按切换，不再需要一直按住）
if (!downedNow && this._edge.crouch && p.body.grounded) {
  p.isCrouching = !p.isCrouching;
}
const wantCrouchH = downedNow ? 0.9 : (p.isCrouching ? 1.6 : 2.4);
if (p.body.height !== wantCrouchH) {
  p.body.height = wantCrouchH;
  p.body.halfH = wantCrouchH / 2;
  if (downedNow) p.body.position.y = wantCrouchH / 2;
}

// ★ 战术动作：侧身（点按切换，再按一次取消）
if (this._edge.lean_left) p._leanDir = (p._leanDir === -1) ? 0 : -1;
if (this._edge.lean_right) p._leanDir = (p._leanDir === 1) ? 0 : 1;
const leanTarget = p._leanDir || 0;
p.leanAmount = (p.leanAmount || 0) + (leanTarget - (p.leanAmount || 0)) * Math.min(1, dt * 10);
p.leanOffset = p.leanAmount * 0.5;

// ★ 瞄准：设置里可选「按住瞄准」或「点按瞄准」
const adsToggle = this.engine.profile.get('input.adsToggle', false);
const lightDisabled = !!(p.status && (p.status.hasEffect('blind') || p.status.hasEffect('dazzle')));
if (lightDisabled) {
  p.ads = false;
  p._adsToggled = false;
  p._forceAds = false;
} else if (p._forceAds) {
  // 凯特应激位移后的强制开镜：即使当前是“按住瞄准”，也会保持开镜，
  // 直到玩家再次点按瞄准键才退出。
  p.ads = true;
  p._adsToggled = true;
  if (this._edge.ads) {
    p._forceAds = false;
    p._adsToggled = false;
    p.ads = adsToggle ? false : e.input.isActive('ads');
  }
} else if (adsToggle) {
  if (this._edge.ads) p._adsToggled = !p._adsToggled;
  p.ads = !!p._adsToggled;
} else {
  p.ads = e.input.isActive('ads');
  p._adsToggled = p.ads;
}

// ★ 屏息：开镜时按住屏息，压制晃动/散布，但持续消耗体力
const breathEnabled = this.engine.profile.get('input.breathHold', true);
p.holdingBreath = !!(p.ads && breathEnabled && e.input.isActive('holdBreath') && p.stamina > 0);
if (p.holdingBreath) p.stamina = Math.max(0, p.stamina - dt * 9);

// 记录相机基础高度（供 update 主循环读取）
// 倒地后不要贴地到 0.3m：近裁剪面会切进地板。0.7m 接近“侧躺抬头”的真实视高。
p.camHeight = downedNow ? 0.7 : (p.isCrouching ? 1.05 : 1.55);

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

// 技能冷却 / 充能
for (const sk of p.skills) {
  if (sk.def.maxCharges) {
    if (sk.charges === undefined) sk.charges = sk.def.maxCharges;
    if (sk.charges < sk.def.maxCharges) {
      sk.cd -= dt;
      if (sk.cd <= 0) {
        sk.charges = Math.min(sk.def.maxCharges, sk.charges + 1);
        sk.cd = sk.charges < sk.def.maxCharges ? (sk.def.chargeRecover || sk.def.cd) : 0;
      }
    }
    sk.ready = sk.charges > 0;
  } else if (!sk.ready) {
    sk.cd -= dt;
    if (sk.cd <= 0) { sk.ready = true; sk.cd = 0; }
  }
}

// ★ 6. 换弹与开火逻辑（击倒状态全面禁用）
const isDowned = p.status && p.status.isDowned();
const isStunned = p._stunnedUntil && this.time < p._stunnedUntil;
const reloading = this.actionProcess.isRunning('reload');
if (!this._searching && !isDowned && !isStunned) {
  if (p.fireCd > 0) p.fireCd -= dt;
  const cw = this.currentWeapon;
  if (p.activeThrowable) {
    // ★ 已选中投掷物：攻击键按住 = 拔保险/瞄准/蓄力，松手投出。
    //   保险式在按住瞬间拔销并开始倒计时；压感式没有引信，撞到即爆。
    const def = this.engine.content.get('nade', p.activeThrowable);
    const firing = e.input.isActive('fire');
    if (firing && !p._throwAiming) {
      p._throwAiming = true;
      p._throwCharge = Math.max(0.35, p._throwCharge || 0.35);
      // 保险不再由长按自动解除：必须先点“解除保险”按钮/按 J
    } else if (!firing && p._throwAiming) {
      p._throwAiming = false;
      this._doThrowNow(p);
    }
    if (p._throwAiming) {
      p._throwCharge = Math.min(1, (p._throwCharge || 0.35) + dt / 1.35);
    }
  } else if (!reloading && p.fireCd <= 0 && cw) {
  if (cw.isFist || (cw.def && cw.def.melee)) {
    if (e.input.isActive('fire')) this._meleeAttack(p, cw);
  } else if (cw.mag <= 0) {
    // ★ 压制状态：无需换弹，直接从备弹压入
    if (p.skillStates && p.skillStates.suppress) this._finishReload();
    else this._startReload();
  } else {
    // ★ 开火模式：全自动按住连发，单发/半自动/泵动按一下打一发
    const mode = cw.fireMode || (cw.def && cw.def.auto ? 'auto' : 'semi');
    const wantFire = mode === 'auto' ? e.input.isActive('fire') : this._edge.fire;
    if (wantFire) this._fireWeapon(p, cw, true);
  }
}
}

// ★ 7. 其他输入动作检测（edge-trigger，搜索时禁用）
if (!this._searching && !isDowned) {
  if (this._edge.reload) this._startReload();
  if (this._edge.switchWeapon) this._switchWeapon();
  if (this._edge.fireMode) this._cycleFireMode();
  if (this._edge.throw) this._quickThrow(p);
  if (this._edge.armThrow) this._armThrowable(p);
  if (this._edge.throwWheel) this._toggleNadeWheel();
  if (this._edge.medWheel) this._toggleMedWheel();
  if (this._edge.squadAdvance) this._issueSquadOrder('advance');
  if (this._edge.squadRetreat) this._issueSquadOrder('retreat');
  if (this._edge.allyCare) this._toggleAllyCare();
  if (this._edge.tailStrike) this._tailStrike(p);
  if (this._edge.bag && this.engine.app && this.engine.app.bagUI) this.engine.app.bagUI.toggle();
  if (this._edge.skill1) this._useSkill(0);
  if (this._edge.skill2) this._useSkill(1);
  if (this._edge.hazardAction) {
    if (p.status && p.status.hasEffect('burning')) this._startExtinguish();
    else if (p.status && p.status.hasEffect('fiber_acute')) this._startFiberPull();
  }
  if (this._edge.weaponSlot1) this._switchToSlot('primary');
if (this._edge.weaponSlot2) this._switchToSlot('secondary');
if (this._edge.weaponSlot3) this._switchToSlot('melee');
if (this._edge.weaponSlot0) this._switchToSlot('fist');
}

  // ★ 8. Headbob + 武器摆动 + 冲刺 FOV
this._updateSpeedFeedback(dt, isMoving);

  // 边界限制，防止跑出地图
  const half = this.mapSpec.size / 2 - 1;
  p.body.position.x = Math.max(-half, Math.min(half, p.body.position.x));
  p.body.position.z = Math.max(-half, Math.min(half, p.body.position.z));

  // ★ 击倒状态视觉由 _syncEntityLifecycle 统一处理，这里不再重复设置相机
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
    // 玩家自己的脚步：蹲伏几乎无声、走路轻、疾跑重
    const stepName = p.isCrouching ? 'crouch' : (isSprinting ? 'run' : 'walk');
    this._playSFXAt('step_' + stepName, p.body.position.x, p.body.position.z, {
      volume: p.isCrouching ? 0.16 : (isSprinting ? 0.55 : 0.32),
      maxDist: 40,
    });
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
    // 侧身时给相机一个明确的 roll，配合底部战术状态条形成可见反馈
    const leanRoll = (p.leanAmount || 0) * 0.18;
    camCtl.setBob(bobY, bobX * 0.15 + leanRoll);
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
  const names = ['reload', 'switchWeapon', 'skill1', 'skill2', 'protectL1', 'protectL2', 'protectL3', 'search', 'weaponSlot1', 'weaponSlot2', 'weaponSlot3', 'weaponSlot0', 'fire', 'fireMode', 'crouch', 'ads', 'throw', 'armThrow', 'hazardAction', 'tailStrike', 'bag', 'throwWheel', 'medWheel', 'droneControl', 'squadAdvance', 'squadRetreat', 'allyCare', 'lean_left', 'lean_right'];
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

  // ★ 大招持续消耗期间不回耦合，避免"回能抵消耗能"导致技能永动
  const skillDraining = !!(p.skillStates && (p.skillStates.srdispte || p.skillStates.hate));

    if (p.protectionHold && p.protection && p.coupling > 0) {
      const drain = COMBAT.PROTECT_DRAIN[p.protection] || 0;
      p.coupling = Math.max(0, p.coupling - drain * dt);
      this._protectionStartTime += dt;
      if (p.coupling <= 0) {
        p.protectionHold = false;
        this._log('耦合能耗尽', 'r');
      }
    } else if (!skillDraining) {
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

_switchToSlot(slot) {
  const p = this.player;
  if (!p) return;

  // ★ 切枪即退出投掷物选择
  p.activeThrowable = null;
  p._throwAiming = false;
  if (this._clearThrowPreview) this._clearThrowPreview();
  if (this._removeHeldThrowable) this._removeHeldThrowable();

  this._syncWeaponsFromInventory();

  if (slot === 'fist') {
    if (p.activeSlot === 'fist') return;
    if (this.actionProcess.isRunning()) {
      if (!this.actionProcess.cancel('切换武器')) return;
    }
    p.activeSlot = 'fist';
    p.fireCd = Math.max(p.fireCd, 0.3);
    this._playSFX('switch');
    return;
  }

  if (!p.weapons[slot]) return;
  if (p.activeSlot === slot) return;

  if (this.actionProcess.isRunning()) {
    if (!this.actionProcess.cancel('切换武器')) return;
  }

  p.activeSlot = slot;
  p.fireCd = Math.max(p.fireCd, 0.3);
  this._playSFX('switch');
}


_switchWeapon(){
  const p = this.player;
  if (!p) return;

  // ★ 切枪即退出投掷物选择
  p.activeThrowable = null;
  p._throwAiming = false;
  if (this._clearThrowPreview) this._clearThrowPreview();
  if (this._removeHeldThrowable) this._removeHeldThrowable();

  this._syncWeaponsFromInventory();

  const cycle = ['primary', 'secondary', 'melee', 'fist'];
  const available = cycle.filter(s => s === 'fist' || p.weapons[s] !== null);

  if (available.length <= 1) return;

  if (this.actionProcess.isRunning()) {
    if (!this.actionProcess.cancel('切换武器')) return;
  }

  let currentIdx = available.indexOf(p.activeSlot);
  if (currentIdx === -1) currentIdx = 0;
  const nextIdx = (currentIdx + 1) % available.length;
  const nextSlot = available[nextIdx];

  if (p.activeSlot === nextSlot) return;

  p.activeSlot = nextSlot;
  p.fireCd = Math.max(p.fireCd, 0.3);
  this._playSFX('switch');
}

  get currentWeapon(){
  const p = this.player;
  if (!p) return null;
  return p.activeWeapon;
}

  _fireModeLabel(mode) {
    return { single: '单发', semi: '半自动', auto: '全自动', pump: '泵动' }[mode] || mode || '—';
  }

  _cycleFireMode(){
    const w = this.currentWeapon;
    if (!w || w.isFist || (w.def && w.def.melee)) return;
    const modes = w.fireModes || [];
    if (modes.length <= 1) return;
    const idx = modes.indexOf(w.fireMode);
    w.fireMode = modes[(idx + 1) % modes.length];
    this._log('开火模式：' + this._fireModeLabel(w.fireMode), 'p');
  }

  _startUnload(weaponUid){
    const p = this.player;
    if (!p || !p.alive) return;
    let w = this.currentWeapon;
    if (weaponUid) {
      w = Object.values(p.weapons || {}).find(x => x && x.item && x.item.uid === weaponUid) || null;
    }
    if (!w) return;
    if (w.isFist || (w.def && w.def.melee)) return;
    if (w.mag <= 0) return;
    if (this.actionProcess.isRunning()) { this._log('当前动作尚未完成', 'y'); return; }
    // 卸弹链比完整换弹快：0.75s 基准，作为独立动作进程，期间不能装填
    this.actionProcess.start({
      id: 'unload',
      label: '卸下弹链',
      duration: 0.55,
      cancelable: true,
      onComplete: () => {
        const inv = this.engine.app && this.engine.app.inventory;
        if (!inv) return;
        const res = inv.unloadAmmo(w.item.uid, null, Infinity);
        if (!res.ok) {
          this._log(res.reason === 'no_space' ? '背包/胸挂/口袋放不下卸下的子弹' : '卸下弹链失败', 'y');
          return;
        }
        this._log('已卸下弹链（' + res.removed + ' 发）', 'p');
      },
      onCancel: () => this._log('卸下弹链被中断', 'y'),
    });
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
  const duration = w.def.reload * reloadMul * (p.skillReloadMul || 1) * (w.mods ? (w.mods.reloadMul || 1) : 1);

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
  this.emitSound('benign', 0.3, 9, p.body.position.x, p.body.position.z, 'player', 'player');
}

      _finishReload(){
  const p = this.player;
  const w = this.currentWeapon;
  if (!w) return;
  let need = w.magCap - w.mag;
  if (need <= 0) return;
  const inv = this.engine.app.inventory;
  inv.normalizeLoaded(w.item);
  const loaded = w.item.loaded;
  const queue = loaded.queue;
  need = Math.max(0, w.magCap - queue.length);
  if (need <= 0) return;

  // ★ 靶场无限弹药：保留玩家自己排好的弹链顺序，只补足到满弹匣，
  //   不再用默认弹种覆盖整条弹链（旧版会把特殊弹全部冲掉）。
  if (this.training && this.training.infiniteAmmo) {
    const preferred = w.item.loadedPreference;
    const prefDef = preferred ? inv.content.get('ammo', preferred) : null;
    const fillId = (prefDef && inv.isAmmoCompatible(w.def, prefDef)) ? preferred : w.def.ammoType;
    while (queue.length < w.magCap) queue.push(fillId);
    if (queue.length > w.magCap) queue.length = w.magCap;
    loaded.qty = queue.length;
    loaded.ammoType = queue[0] || fillId;
    return;
  }

  const targets = ['chest', 'pocket', 'bag', 'safe'];
  let loadedCount = 0;
  const needMore = () => loadedCount < need;

  // ★ 首选弹种优先；找不到时再按容器顺序装兼容弹种
  const fillFrom = (forceDefId) => {
    for (const t of targets) {
      if (!needMore()) return;
      const c = inv.containers[t];
      if (!c) continue;
      for (const uid of Array.from(c.items.keys())) {
        if (!needMore()) return;
        const it = inv.items.get(uid);
        if (!it || it.table !== 'ammo') continue;
        const ad = inv.getDef(it);
        if (!ad || !inv.isAmmoCompatible(w.def, ad)) continue;
        if (forceDefId && it.defId !== forceDefId) continue;

        const take = Math.min(it.qty, need - loadedCount);
        for (let i = 0; i < take; i++) queue.push(it.defId);
        loadedCount += take;
        it.qty -= take;
        if (it.qty <= 0) inv.destroyItem(uid);
      }
    }
  };
  fillFrom(w.item.loadedPreference);
  fillFrom(null);
  loaded.qty = queue.length;
  loaded.ammoType = queue[0] || w.def.ammoType;
}

_meleeAttack(owner, weapon) {
  if (!weapon || !weapon.def) return;
  const def = weapon.def;
  const range = def.range || 1.5;
  const cooldown = def.cooldown || 0.5;

  owner.fireCd = cooldown;

  // ★ 玩家近战用相机真实朝向（可抬头劈头/低头砍腿），AI 仍用水平朝向
  const cam = this.engine.renderer.camera;
  let ox, oy, oz, dirX, dirY, dirZ;
  if (owner === this.player) {
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    ox = origin.x; oy = origin.y; oz = origin.z;
    dirX = dir.x; dirY = dir.y; dirZ = dir.z;
  } else {
    // ★ 旧实现错误使用了玩家相机 yaw，导致 AI 近战永远朝玩家面朝的方向挥
    const yaw = owner.angle || 0;
    ox = owner.body.position.x;
    oy = owner.body.position.y;
    oz = owner.body.position.z;
    dirX = Math.cos(yaw); dirY = 0; dirZ = Math.sin(yaw);
  }

  const hit = this.physics.raycast(
    ox, oy, oz, dirX, dirY, dirZ, range,
    body => body !== owner.body && (body.userData && (body.userData.type === 'enemy' || body.userData.type === 'player'))
  );

  // ★ Prazer 的拳/近战伤害按 Aselevel 力量放大；人类保持基准
  const energy = (def.damage || 80) * this._meleeStrengthMul(owner);
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
      // ★ 近战同样允许同阵营友伤
      this._damageEnemy(targetEnemy, energy, pen, part, owner === this.player, 'melee');
    } else if (targetBody.userData && targetBody.userData.type === 'player') {
      const targetPlayer = targetBody.userData.ref;
      this._damagePlayer(targetPlayer, energy, pen, part,
        owner.body.position.x, owner.body.position.z, owner, 'melee');
    }

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

  /* ===================== 尾击（Prazer 专属） ===================== */
  // 尾部最大绕力约 730·ln(A) kg，是徒手硬拉力的 5 倍以上；
  // 游戏内取 2.2 倍拳击能量，代价是 24 点体力和 1.1s 冷却。
  _tailStrike(owner) {
    if (!owner || !owner.body) return false;
    const spec = owner.charSpec || owner.spec || {};
    if (!spec.prazer) {
      if (owner === this.player) this._hint('人类没有可用的尾巴', 'y');
      return false;
    }
    if (owner === this.player) {
      if (owner._controllingDrone) return false;
      if (owner.status && owner.status.isDowned()) return false;
      if (owner._tailCd && this.time < owner._tailCd) return false;
      const cost = 24;
      if (owner.stamina < cost) {
        this._hint('体力不足，无法尾击', 'y');
        return false;
      }
      owner.stamina -= cost;
      owner._tailCd = this.time + 1.1;
      owner.fireCd = Math.max(owner.fireCd || 0, 0.55);
    } else {
      if (owner._tailCd && this.time < owner._tailCd) return false;
      owner._tailCd = this.time + 1.6;
    }

    const range = 2.8;
    const cam = this.engine.renderer.camera;
    let ox, oy, oz, dx, dy, dz;
    if (owner === this.player) {
      const origin = new THREE.Vector3();
      cam.getWorldPosition(origin);
      const dir = new THREE.Vector3();
      cam.getWorldDirection(dir);
      ox = origin.x; oy = origin.y; oz = origin.z;
      dx = dir.x; dy = dir.y; dz = dir.z;
    } else {
      const yaw = owner.angle || 0;
      ox = owner.body.position.x;
      oy = owner.body.position.y;
      oz = owner.body.position.z;
      dx = Math.cos(yaw); dy = 0; dz = Math.sin(yaw);
    }
    const hit = this.physics.raycast(ox, oy, oz, dx, dy, dz, range,
      body => body !== owner.body && (body.userData && (body.userData.type === 'enemy' || body.userData.type === 'player')));
    const energy = (FIST_DEF.damage || 80) * this._meleeStrengthMul(owner) * 2.2;
    const end = hit && hit.point ? hit.point : new THREE.Vector3(ox + dx * range, oy + dy * range, oz + dz * range);
    this._spawnTracer(ox, oy - 0.2, oz, end.x, end.y, end.z, 0xffcc66);
    if (owner === this.player && this.engine.cameraCtl) {
      this.engine.cameraCtl.shake(0.35, 0.18);
    }
    if (hit) {
      const targetBody = hit.body;
      const relY = hit.point.y - targetBody.position.y;
      const hh = targetBody.halfH || 1.2;
      const r = relY / hh;
      let part = 'thorax';
      if (r > 0.5625) part = 'head';
      else if (r > 0.0833) part = 'thorax';
      else if (r > -0.1667) part = 'abdomen';
      else part = 'legs';
      if (targetBody.userData.type === 'enemy') {
        const targetEnemy = targetBody.userData.ref;
        this._damageEnemy(targetEnemy, energy, 7, part, owner === this.player, 'melee');
      } else if (targetBody.userData.type === 'player') {
        const targetPlayer = targetBody.userData.ref;
        this._damagePlayer(targetPlayer, energy, 7, part,
          owner.body.position.x, owner.body.position.z, owner, 'melee');
      }
      this._playSFX('hit', { volume: 0.65 });
    } else {
      this._playSFX('switch', { volume: 0.35 });
    }
    // 尾部横扫的视觉：角色轻微侧转
    if (owner.mesh && owner !== this.player) {
      const orig = owner.mesh.rotation.y;
      owner.mesh.rotation.y = orig + (Math.random() < 0.5 ? -0.5 : 0.5);
      setTimeout(() => { if (owner.mesh) owner.mesh.rotation.y = orig; }, 140);
    }
    return true;
  }

  /* ===================== 投掷物（有 owner） ===================== */
  _throwGrenade(owner) {
    if (!owner || !owner.body) return;
    if (owner === this.player && (owner.grenades || 0) <= 0) {
      this._log('没有可投掷物', 'y');
      return;
    }
    if (owner === this.player) owner.grenades--;

    const def = this.engine.content.get('nade', 'frag');
    if (!def) return;

    const cam = this.engine.renderer.camera;
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const start = origin.clone().add(dir.clone().multiplyScalar(0.5));

    const geo = new THREE.SphereGeometry(0.12, 8, 6);
    const mat = new THREE.MeshStandardMaterial({ color: def.color || 0x3a3a3a, roughness: 0.6, metalness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(start);
    this.engine.renderer.scene.add(mesh);

    const speed = 20;
    this.projectiles.push({
      owner, mesh,
      pos: start.clone(),
      vel: new THREE.Vector3(dir.x * speed, dir.y * speed + 2.5, dir.z * speed),
      fuse: def.fuse || 3,
      damage: def.damage || 1500,
      radius: def.radius || 6,
      name: this.engine.i18n.t(def.name),
    });

    this.combatLog.push({ type: 'nade_throw', t: this.time, name: this.engine.i18n.t(def.name), distance: 0 });
    this._playSFX('switch', { volume: 0.4 });
    owner.fireCd = Math.max(owner.fireCd || 0, 0.4);
  }

  _updateProjectiles(dt) {
    if (!this.projectiles || this.projectiles.length === 0) return;
    const G = 14.0;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      if (!pr || !pr.mesh || !pr.pos) { this.projectiles.splice(i, 1); continue; }
      const ox = pr.pos.x, oy = pr.pos.y, oz = pr.pos.z;
      pr.vel.y -= G * dt;
      pr.pos.x += pr.vel.x * dt;
      pr.pos.y += pr.vel.y * dt;
      pr.pos.z += pr.vel.z * dt;

      // ★ 压感式：撞到墙/地面/人立即生效，但必须有“解除保险后的最小飞行距离”。
      //   现实中的压感引信也不是离手 5cm 就炸；旧版把出手点前 0.5m 当作可碰撞点，
      //   贴墙/低头/身体边缘都会让它刚脱手就在脚边炸开。
      if (pr.trigger === 'impact') {
        if (pr.pos.y < 0.04) pr.pos.y = 0.04;
        const sx = pr.startPos ? pr.startPos.x : ox, sy = pr.startPos ? pr.startPos.y : oy, sz = pr.startPos ? pr.startPos.z : oz;
        const travelled = Math.hypot(pr.pos.x - sx, pr.pos.y - sy, pr.pos.z - sz);
        if (!pr.armed) {
          const age = this.time - (pr.bornAt || 0);
          // 0.9m 或 0.35s 任一满足即视为解除保险，避免贴地投掷卡在未引爆状态
          if (age >= 0.07 && (travelled >= 0.9 || age >= 0.35)) pr.armed = true;
        }
        const dx = pr.pos.x - ox, dy = pr.pos.y - oy, dz = pr.pos.z - oz;
        const len = Math.hypot(dx, dy, dz);
        let exploded = false;
        if (pr.armed) {
          if (pyGround(pr.pos)) {
            pr.pos.y = 0.12;
            exploded = true;
          } else if (len > 0.001) {
            const hit = this.physics.raycast(ox, oy, oz, dx / len, dy / len, dz / len, len,
              body => body !== (pr.owner && pr.owner.body) &&
                body.userData && (body.userData.type === 'obstacle' || body.userData.type === 'container' || body.userData.type === 'enemy' || body.userData.type === 'player'));
            // 忽略“出发瞬间就在体内/贴脸”的 0 距离命中
            if (hit && hit.t > 0.12) {
              pr.pos.x = hit.point.x; pr.pos.y = hit.point.y; pr.pos.z = hit.point.z;
              exploded = true;
            }
          }
        }
        if (exploded) {
          this._explodeProjectile(pr);
          this.engine.renderer.scene.remove(pr.mesh);
          if (pr.mesh.geometry) pr.mesh.geometry.dispose();
          if (pr.mesh.material) pr.mesh.material.dispose();
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // ★ 定时引信也要和墙体碰撞：旧版只判断地面，手雷会直接穿过墙/箱子。
        //   用本帧位移做线段检测，薄墙也不会被“穿透”。
        const dx = pr.pos.x - ox, dy = pr.pos.y - oy, dz = pr.pos.z - oz;
        const len = Math.hypot(dx, dy, dz);
        let bounced = false;
        if (len > 0.001) {
          const hit = this.physics.raycast(ox, oy, oz, dx / len, dy / len, dz / len, len,
            body => body.userData && (body.userData.type === 'obstacle' || body.userData.type === 'container'));
          if (hit && hit.t > 0.02) {
            const b = hit.body;
            let nx = 0, ny = 0, nz = 0;
            if (b.shape === 'aabb') {
              const relX = hit.point.x - b.position.x;
              const relZ = hit.point.z - b.position.z;
              const gapX = Math.abs(b.halfW || 1) - Math.abs(relX);
              const gapZ = Math.abs(b.halfD || 1) - Math.abs(relZ);
              const yTop = b.yMax !== null && b.yMax !== undefined ? b.yMax : (b.position.y + (b.height || 0) / 2);
              if (Math.abs(hit.point.y - yTop) < 0.08 && pr.vel.y < 0) { ny = 1; }
              else if (gapX < gapZ) nx = relX >= 0 ? 1 : -1;
              else nz = relZ >= 0 ? 1 : -1;
            } else {
              const hd = Math.hypot(dx, dz) || 1;
              nx = -dx / hd; nz = -dz / hd;
            }
            pr.pos.x = hit.point.x + nx * 0.07;
            pr.pos.z = hit.point.z + nz * 0.07;
            pr.pos.y = Math.max(0.13, hit.point.y + ny * 0.07);
            this._reflectProjectile(pr, nx, ny, nz);
            bounced = true;
          }
        }
        if (!bounced && pyGround(pr.pos)) {
          const impactV = Math.abs(pr.vel.y);
          pr.pos.y = 0.14;
          pr.vel.y = Math.abs(pr.vel.y) * 0.28;
          pr.vel.x *= 0.62;
          pr.vel.z *= 0.62;
          if (impactV > 1.0) bounced = true;
        }
        if (bounced) this._projectileBounceFeedback(pr);
      }

      pr.mesh.position.copy(pr.pos);
      pr.mesh.rotation.x += dt * 8;
      pr.mesh.rotation.y += dt * 6;
      // ★ 压感引信没有时间引信；旧版仍走 fuse 倒计时，导致出手 0.02s 就自爆
      if (pr.trigger !== 'impact') pr.fuse -= dt;
      if (pr.trigger === 'impact') {
        pr.life = (pr.life || 8) - dt;
        if (pr.life <= 0) pr.fuse = 0;
      }
      if (pr.fuse <= 0) {
        this._explodeProjectile(pr);
        this.engine.renderer.scene.remove(pr.mesh);
        if (pr.mesh.geometry) pr.mesh.geometry.dispose();
        if (pr.mesh.material) pr.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
    function pyGround(pos) { return pos.y < 0.12; }
  }

  _reflectProjectile(pr, nx, ny, nz){
    // v' = v - 2(v·n)n，再按弹性系数衰减；没有法线时直接反向
    const nlen = Math.hypot(nx, ny, nz);
    if (nlen < 1e-4) { pr.vel.x *= -0.45; pr.vel.z *= -0.45; return; }
    nx /= nlen; ny /= nlen; nz /= nlen;
    const vn = pr.vel.x * nx + pr.vel.y * ny + pr.vel.z * nz;
    const e = 0.45;
    pr.vel.x = (pr.vel.x - 2 * vn * nx) * e;
    pr.vel.y = (pr.vel.y - 2 * vn * ny) * e;
    pr.vel.z = (pr.vel.z - 2 * vn * nz) * e;
    if (pr.vel.y < 0) pr.vel.y = Math.abs(pr.vel.y) * 0.5 + 0.4;
  }

  _projectileBounceFeedback(pr){
    // 弹体碰撞声 + 声纹：AI 应该能听见“脚边落了一颗雷”
    const now = this.time;
    if (pr._lastBounceSfx && now - pr._lastBounceSfx < 0.09) return;
    pr._lastBounceSfx = now;
    const x = pr.pos.x, z = pr.pos.z;
    this._playSFXAt('nade_bounce', x, z, { volume: 0.55, maxDist: 40 });
    this.emitSound('malignant', 0.45, 18, x, z,
      pr.owner === this.player ? 'player' : 'enemy',
      pr.owner && pr.owner.spec ? pr.owner.spec.faction : 'player');
  }

  _explodeProjectile(pr) {
    const x = pr.pos.x, y = Math.max(0.2, pr.pos.y), z = pr.pos.z;
    this._spawnExplosionFX(x, y, z);
    this._playSFXAt('explosion', x, z, { volume: 1.0, maxDist: 220 });
    this.emitSound('malignant', 1.0, 80, x, z, pr.owner === this.player ? 'player' : 'enemy',
      pr.owner && pr.owner.spec ? pr.owner.spec.faction : 'player');

    const def = pr.def || this.engine.content.get('nade', 'frag');
    const effect = (def && def.effect) || pr.effect || 'frag';

    // ===== 闪光弹 =====
    if (effect === 'flash') {
      const dur = (def && def.flashDuration) || 2.6;
      const peak = (def && def.flashPeak) || 1.0;
      // AI 投掷闪光时会背身/闭眼：只豁免投掷者本人，其他 AI 仍会被闪到
      const flashExclude = (pr.owner && pr.owner !== this.player) ? pr.owner : null;
      const res = this._applyFlash(x, z, pr.radius, dur, peak, flashExclude, y + 0.4);
      this._spawnLightField(x, y + 0.4, z, pr.radius, peak, 0xffffff);
      const p = this.player;
      if (p && p.alive && p.status && (p.status.hasEffect('blind') || p.status.hasEffect('dazzle'))) {
        // 只有 _applyFlash 判定为真实受影响（含墙体遮挡）时才补一层屏幕白光，
        // 否则隔墙爆炸也会闪白屏幕，与“闪光被墙挡住”的逻辑矛盾。
        const d = Math.hypot(p.body.position.x - x, p.body.position.z - z);
        if (d < pr.radius) {
          const f = Math.max(0, 1 - d / pr.radius);
          this._flashScreen(Math.min(0.9, 0.18 + f * f * 0.85));
        }
      }
      this._log('闪光弹引爆：失明 ' + res.blind + ' 人，强光刺眼 ' + res.dazzle + ' 人', 'y');
      return;
    }

    // ===== 震撼弹 =====
    if (effect === 'stun') {
      const dur = (def && def.stunDuration) || 3;
      const stunExclude = (pr.owner && pr.owner !== this.player) ? pr.owner : null;
      this._applyStun(x, y, z, pr.radius, dur, stunExclude);
      this._spawnLightField(x, y + 0.3, z, pr.radius * 0.8, 0.45, 0xaab0ff);
      const p = this.player;
      if (p && p.alive) {
        const eyeY = p.body.position.y + (p.body.halfH || 1.2) * 0.85;
        const d = Math.hypot(p.body.position.x - x, eyeY - y, p.body.position.z - z);
        if (d < pr.radius) {
          // 墙体/掩体削弱震撼：先做遮挡判定
          const len = Math.max(0.1, d);
          const blocked = this.physics.raycast(x, y, z,
            (p.body.position.x - x) / len, (eyeY - y) / len, (p.body.position.z - z) / len, len,
            body => body.userData && body.userData.type === 'obstacle');
          const f = Math.max(0, 1 - d / pr.radius) * (blocked ? 0.4 : 1);
          if (f > 0.02) {
            p._stunnedUntil = Math.max(p._stunnedUntil || 0, this.time + dur * f);
            p.status.addEffect('stun', dur * f, Math.max(1, f));
            this._applyTinnitus(Math.max(2.5, dur * f), Math.max(0.4, f));
            this.engine.cameraCtl.shake(0.7, 0.3);
          }
        }
      }
      this._flashScreen(0.3);
      return;
    }

    // ===== EMP：电磁场随距离衰减；加固设备降低损坏概率但仍会掉耐久 =====
    if (effect === 'emp') {
      const res = this._applyEmpField(x, y, z, pr.radius || 14, (def && def.empPeak) || 1.0, pr.owner);
      this._flashScreen(0.18);
      this._log('EMP 爆发：' + res.damaged + ' 件电子物品损坏，' + res.disrupted + ' 个目标被电磁干扰', 'y');
      return;
    }

    // ===== 燃烧瓶：压感式，落地形成火焰区域 =====
    if (effect === 'fire') {
      this._spawnFireField(x, z, pr.radius || 5.2, (def && def.fireDuration) || 11, (def && def.fireDps) || 55);
      this._spawnLightField(x, y + 0.4, z, pr.radius || 5.2, 0.7, 0xff7a2a);
      this._flashScreen(0.22);
      this._log('燃烧瓶破裂：地面形成 ' + ((pr.radius || 5.2).toFixed(1)) + ' 米火焰区域', 'y');
      return;
    }

    // ===== 破片手雷：中心冲压 + 四面破片 =====
    const byPlayer = pr.owner === this.player;
    const victims = [];
    if (this.player && this.player.alive) victims.push(this.player);
    for (const e of this.enemies) if (e.alive) victims.push(e);
    const parts = ['head', 'thorax', 'abdomen', 'larm', 'legs'];

    for (const v of victims) {
      if (!v.body) continue;
      // ★ 爆炸判定必须是三维距离：旧版只看水平距离，手雷扔到 30m 高空仍能炸到
      //   正下方的人。这里取“爆心到身体胶囊最近点”的距离，贴脚爆炸仍是 0m，
      //   头顶/高空爆炸则按真实高度差迅速衰减。
      const vHalfH = v.body.halfH || 1.2;
      const vFoot = v.body.position.y - vHalfH;
      const vHead = v.body.position.y + vHalfH;
      const nearestY = Math.max(vFoot, Math.min(vHead, y));
      const d = Math.hypot(v.body.position.x - x, nearestY - y, v.body.position.z - z);
      if (d > pr.radius) continue;
      const falloff = Math.max(0, 1 - d / pr.radius);
      const energy = pr.damage * falloff * falloff;
      this._pendingHitSrcX = x;
      this._pendingHitSrcZ = z;
      if (energy >= 40) {
        const part = parts[Math.floor(Math.random() * parts.length)];
        if (v === this.player) {
          this._damagePlayer(v, energy, 0, part, x, z, { spec: { name: '破片手雷' } }, 'blast');
        } else {
          this._damageEnemy(v, energy, 0, part, byPlayer, 'blast');
        }
      }
      // ★ 真实手雷有上百枚预制破片；逐枚结算不现实，这里按弹体数据抽样 8~12 枚，
      //   每一枚都是独立伤害、独立失血与独立日志，不再固定“三颗”。
      const fragCount = Math.max(3, Math.min(16, pr.fragments || (pr.def && pr.def.fragmentCount) || 8));
      for (let k = 0; k < fragCount; k++) {
        const fragE = (28 + Math.random() * 70) * (0.55 + 0.45 * falloff);
        const fragPart = parts[Math.floor(Math.random() * parts.length)];
        if (v === this.player) {
          this._damagePlayer(v, fragE, 1, fragPart, x, z, { spec: { name: '破片' } }, 'explosion');
        } else {
          this._damageEnemy(v, fragE, 1, fragPart, byPlayer, 'explosion');
        }
        if (!v.alive) break;
      }
      this._pendingHitSrcX = undefined;
      this._pendingHitSrcZ = undefined;
    }

    // ★ 侦察无人机也吃爆炸：冲击波/破片按三维距离衰减掉耐久。
    //   旧版只遍历 player/enemies，无人机悬停在手雷上方也毫发无伤。
    if (this.drones) {
      for (const d of this.drones) {
        if (!d.alive) continue;
        const ddx = d.mesh.position.x - x;
        const ddy = (d.mesh.position.y - y) * 0.7;
        const ddz = d.mesh.position.z - z;
        const dd = Math.hypot(ddx, ddy, ddz);
        if (dd > pr.radius * 1.1) continue;
        const f = Math.max(0, 1 - dd / (pr.radius * 1.1));
        const loss = (26 + Math.random() * 34) * f * f * (d.empHardened ? 0.85 : 1);
        d.durability = Math.max(0, d.durability - loss);
        this._spawnSpark(d.mesh.position.x, d.mesh.position.y, d.mesh.position.z);
        if (d.owner === this.player) this._droneInterference(0.35 + f * 0.4);
        if (d.durability <= 0) this._destroyDrone(d);
      }
    }

    // 四面八方破片视觉
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = pr.radius * (0.4 + Math.random() * 0.6);
      this._spawnTracer(x, y, z, x + Math.cos(a) * r, y + Math.random() * 1.5, z + Math.sin(a) * r, 0xffcc66);
    }
  }

  _spawnExplosionFX(x, y, z, silent) {
    if (!silent && !this._replayFxMuted) this._recordReplayFx('explosion', { x, y, z });
    const geo = new THREE.SphereGeometry(0.5, 12, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.engine.renderer.scene.add(mesh);
    const start = performance.now();
    const step = () => {
      const t = (performance.now() - start) / 420;
      if (t >= 1) {
        this.engine.renderer.scene.remove(mesh);
        geo.dispose();
        mat.dispose();
        return;
      }
      mesh.scale.setScalar(1 + t * 8);
      mat.opacity = 0.8 * (1 - t);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // 震撼：AI 全体眩晕/抖动；玩家由调用处单独处理
  _applyStun(x, y, z, radius, duration, exclude) {
    for (const e of this.enemies) {
      if (!e.alive || e === exclude) continue;
      const ey = e.body.position.y + (e.body.halfH || 1.2) * 0.85;
      const d = Math.hypot(e.body.position.x - x, ey - y, e.body.position.z - z);
      if (d > radius) continue;
      const len = Math.max(0.1, d);
      const blocked = this.physics.raycast(x, y, z,
        (e.body.position.x - x) / len, (ey - y) / len, (e.body.position.z - z) / len, len,
        body => body.userData && body.userData.type === 'obstacle');
      const f = Math.max(0, 1 - d / radius) * (blocked ? 0.4 : 1);
      if (f <= 0.02) continue;
      e.stunnedUntil = Math.max(e.stunnedUntil || 0, this.time + duration * (0.5 + 0.5 * f));
      e.blindedUntil = Math.max(e.blindedUntil || 0, this.time + duration * 0.6 * f);
      if (e.status) e.status.addEffect('stun', duration * (0.5 + 0.5 * f), 1);
      e.awareness = 0;
    }
  }

  _applyTinnitus(duration, intensity = 1) {
    const p = this.player;
    if (!p || !p.alive || !p.status) return;
    p.status.addEffect('tinnitus', Math.max(1.5, duration || 3), Math.max(1, Math.round(intensity * 2)));
    // 耳鸣声不要每次破片都叠一遍，1.2 秒内只播一次
    if (!this._lastTinnitusAt || this.time - this._lastTinnitusAt > 1.2) {
      this._lastTinnitusAt = this.time;
      this._playSFX('tinnitus', { volume: Math.min(0.6, 0.25 + intensity * 0.35) });
    }
  }

  _ensureBlindOverlay() {
    let el = document.getElementById('blind-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'blind-overlay';
      el.style.cssText = 'position:fixed;inset:0;z-index:410;pointer-events:none;opacity:0;transition:opacity .12s;background:radial-gradient(circle at 50% 50%, rgba(255,255,255,.95) 0%, rgba(255,255,255,.85) 18%, rgba(0,0,0,.98) 55%, #000 100%)';
      document.body.appendChild(el);
    }
    return el;
  }

  _blindOverlay(duration, intensity) {
    const el = this._ensureBlindOverlay();
    // 真实闪光弹不是“闪一下 0.12s 就恢复”：先接近全白，保持一小段，再随失明时间恢复。
    const peak = Math.min(0.985, 0.55 + (intensity || 1) * 0.45);
    el.style.transition = 'opacity .09s';
    el.style.opacity = String(peak);
    clearTimeout(this._blindTimer);
    const holdMs = Math.min(700, Math.max(260, (duration || 2) * 180));
    this._blindTimer = setTimeout(() => {
      el.style.transition = 'opacity ' + Math.max(0.9, (duration || 2) * 0.85) + 's';
      el.style.opacity = '0';
    }, holdMs);
  }

  /* ===================== 随身物品递归收集 ===================== */
  // 胸挂/背包/口袋/安全箱 → 背包 innerGrid → 嵌套背包 innerGrid。
  // 轮盘、快捷投掷、医疗都必须走这里，否则“药放在背包内部网格里”会被判定为没药。
  _collectCarriedItems(filter) {
    const inv = this.engine.app && this.engine.app.inventory;
    if (!inv) return [];
    const out = [];
    const seen = new Set();
    const walk = (grid) => {
      if (!grid || seen.has(grid)) return;
      seen.add(grid);
      for (const uid of grid.items.keys()) {
        const it = inv.items.get(uid);
        if (!it) continue;
        const def = inv.getDef(it);
        if (!def) continue;
        if (!filter || filter(it, def)) out.push({ uid, it, def });
        if (it.innerGrid) walk(it.innerGrid);
      }
    };
    for (const cName of ['chest', 'pocket', 'bag', 'safe']) walk(inv.containers[cName]);
    return out;
  }

  /* ===================== 投掷物选择 / 投掷 ===================== */
  _getThrowableList() {
    const map = new Map();
    for (const { it, def } of this._collectCarriedItems(it => it.table === 'nade')) {
      const cur = map.get(it.defId) || { defId: it.defId, def, qty: 0 };
      cur.qty += it.qty || 1;
      map.set(it.defId, cur);
    }
    // 靶场无限投掷物：即使背包里没有，也把全部投掷物列出来供测试
    if (this.training && this.training.infiniteNades) {
      for (const def of this.engine.content.all('nade')) {
        if (!map.has(def.id)) map.set(def.id, { defId: def.id, def, qty: 99 });
      }
    }
    return Array.from(map.values());
  }

  _hasThrowable(defId) {
    return this._getThrowableList().some(t => t.defId === defId);
  }

  _takeThrowableItem(defId) {
    // 靶场无限投掷物：不消耗库存
    if (this.training && this.training.infiniteNades) return true;
    const inv = this.engine.app && this.engine.app.inventory;
    if (!inv) return false;
    for (const { uid, it } of this._collectCarriedItems(it => it.table === 'nade' && it.defId === defId)) {
      it.qty -= 1;
      if (it.qty <= 0) inv.destroyItem(uid);
      return true;
    }
    return false;
  }

  /* ===================== AI 投掷物 ===================== */
  // AI 的投掷物库存就是它的 lootInv 实物：扔一枚销毁一枚，剩下的尸体上可搜。
  _aiGrenadeList(enemy) {
    const inv = enemy && enemy.lootInv;
    if (!inv) return [];
    const out = [];
    for (const it of inv.items.values()) {
      if (!it || it.table !== 'nade') continue;
      if (!out.includes(it.defId)) out.push(it.defId);
    }
    return out;
  }

  _takeEnemyThrowable(enemy, defId) {
    const inv = enemy && enemy.lootInv;
    if (!inv) return false;
    for (const [uid, it] of inv.items) {
      if (!it || it.table !== 'nade' || it.defId !== defId) continue;
      if ((it.qty || 1) > 1) it.qty -= 1;
      else inv.destroyItem(uid);
      return true;
    }
    return false;
  }

  // AI 专用抛物线投掷：与玩家共用 projectiles 物理/爆炸入口，只是出手点与初速由 AI 计算。
  _aiThrowGrenade(enemy, defId, target) {
    if (!enemy || !enemy.alive || !target || !target.body) return false;
    const def = this.engine.content.get('nade', defId);
    if (!def) return false;
    if (!this._takeEnemyThrowable(enemy, defId)) return false;

    const eyeY = enemy.body.position.y + (enemy.body.halfH || 1.2) * 0.9;
    const start = new THREE.Vector3(
      enemy.body.position.x + Math.cos(enemy.angle) * 0.45,
      eyeY,
      enemy.body.position.z + Math.sin(enemy.angle) * 0.45
    );
    // 目标点：玩家当前位置 + 少量速度预判 + 落点散布（AI 不是制导武器）
    const lead = def.trigger === 'timed' ? 0.35 : 0.15;
    const tx = target.body.position.x + (target.body.velocity ? target.body.velocity.x * lead : 0)
      + (Math.random() - 0.5) * 2.4;
    const tz = target.body.position.z + (target.body.velocity ? target.body.velocity.z * lead : 0)
      + (Math.random() - 0.5) * 2.4;
    const G = 14.0;
    const d = Math.hypot(tx - start.x, tz - start.z);
    const flight = Math.max(0.55, Math.min(1.7, d / 22));
    const vy = (0.15 - start.y + 0.5 * G * flight * flight) / flight;

    const geo = new THREE.SphereGeometry(0.12, 8, 6);
    const mat = new THREE.MeshStandardMaterial({ color: def.color || 0x3a3a3a, roughness: 0.6, metalness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(start);
    this.engine.renderer.scene.add(mesh);
    this.projectiles.push({
      owner: enemy, mesh,
      pos: start.clone(),
      vel: new THREE.Vector3((tx - start.x) / flight, vy, (tz - start.z) / flight),
      fuse: def.trigger === 'timed' ? (def.fuse || 3) : (def.fuse || 0.02),
      damage: def.damage || 0,
      radius: def.radius || 6,
      def, effect: def.effect || 'frag',
      trigger: def.trigger || 'timed',
      fragments: def.fragmentCount || 6,
      life: 8,
      name: this.engine.i18n.t(def.name),
      prev: start.clone(),
      startPos: start.clone(),
      bornAt: this.time,
      armed: (def.trigger || 'timed') !== 'impact',
    });
    this._playSFXAt('switch', enemy.body.position.x, enemy.body.position.z, { volume: 0.45, maxDist: 30 });
    return true;
  }

  /* ===================== 投掷物轮盘（径向） =====================
     设计目标：
       1. 中心圆 + 上/右/下/左（多物品时自动扩展为 8 向）大扇区，
          不再是一列小按钮，避免“点不到/点空”。
       2. PC 端保持 Pointer Lock，用鼠标位移推动虚拟摇杆，松手/点击确认；
          不再反复 exitPointerLock/requestPointerLock，杜绝闪屏。
       3. 触屏端直接在任意位置按下、拖向扇区、松手确认；中间圆取消。
     ============================================================ */
  _buildNadeWheel() {
    let st = document.getElementById('nade-wheel-css');
    if (!st) {
      st = document.createElement('style');
      st.id = 'nade-wheel-css';
      document.head.appendChild(st);
    }
    // 每次都覆盖旧样式，避免历史版本缓存导致新轮盘仍走旧布局
    st.textContent = `
      #nade-wheel{position:fixed;inset:0;z-index:9999;display:none;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;background:radial-gradient(circle at 50% 50%,rgba(4,8,14,.24) 0%,rgba(4,8,14,.68) 72%)}
      #nade-wheel.on{display:block}
      #nade-wheel .nw-hint{position:absolute;left:50%;top:calc(50% - 214px);transform:translateX(-50%);color:#ffd98a;font-size:11px;letter-spacing:2px;font-weight:700;white-space:nowrap;text-shadow:0 1px 4px #000;pointer-events:none;opacity:.9}
      #nade-wheel .nw-center{position:absolute;left:50%;top:50%;width:108px;height:108px;transform:translate(-50%,-50%);border-radius:50%;background:rgba(10,18,30,.97);border:2px solid rgba(255,200,90,.55);box-shadow:0 0 0 6px rgba(255,200,90,.06),0 10px 34px rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;pointer-events:none;z-index:3}
      #nade-wheel .nw-center-title{color:#ffe8b0;font-size:12px;font-weight:800;letter-spacing:1px;max-width:92px;text-align:center;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #nade-wheel .nw-center-sub{color:#8fa6bd;font-size:9px;letter-spacing:1px;max-width:92px;text-align:center;line-height:1.2}
      #nade-wheel .nw-slots{position:absolute;inset:0;pointer-events:none;z-index:2}
      #nade-wheel .nw-slot{position:absolute;left:50%;top:50%;width:clamp(96px,19vw,132px);min-height:64px;transform:translate(-50%,-50%) translate(var(--x),var(--y));display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;background:rgba(14,24,38,.96);border:1px solid rgba(255,200,90,.4);color:#ffe8b0;box-shadow:0 6px 20px rgba(0,0,0,.55);transition:transform .12s,background .12s,border-color .12s,box-shadow .12s;pointer-events:auto;cursor:pointer}
      #nade-wheel .nw-slot.active{background:rgba(86,63,18,.98);border-color:rgba(255,226,120,1);box-shadow:0 0 0 2px rgba(255,210,90,.4),0 0 26px rgba(255,180,60,.5);transform:translate(-50%,-50%) translate(var(--x),var(--y)) scale(1.08)}
      #nade-wheel .nw-icon{font-size:22px;line-height:1;flex:0 0 auto}
      #nade-wheel .nw-text{display:flex;flex-direction:column;min-width:0;text-align:left}
      #nade-wheel .nw-name{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:88px}
      #nade-wheel .nw-qty{font-size:10px;color:#c8a860;line-height:1.4}
      #nade-wheel .nw-aim{position:absolute;left:50%;top:50%;height:2px;width:0;transform:translateY(-50%) rotate(0rad);transform-origin:0 50%;background:linear-gradient(90deg,rgba(255,220,120,.08),rgba(255,220,120,.85));border-radius:2px;opacity:.22;pointer-events:none;z-index:1}
    `;

    let el = document.getElementById('nade-wheel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'nade-wheel';
      document.body.appendChild(el);
    }
    // 兼容旧版本残留的 list 轮盘 DOM
    if (!el.querySelector('.nw-slots')) {
      el.innerHTML =
        '<div class="nw-hint">移动鼠标 / 手指选择 · 松开或点击确认</div>' +
        '<div class="nw-aim"></div>' +
        '<div class="nw-slots"></div>' +
        '<div class="nw-center"><div class="nw-center-title">投掷物</div><div class="nw-center-sub">取消</div></div>';
    }

    if (!this._wheelBound) {
      this._wheelBound = true;
      const canvas = () => this.engine.renderer.canvas;
      this._onWheelPointerMove = (ev) => {
        if (!this._nadeWheelOpen) return;
        if (document.pointerLockElement === canvas()) {
          this._updateWheelAim(ev.movementX || 0, ev.movementY || 0, false);
        } else {
          this._updateWheelAim(ev.clientX, ev.clientY, true);
        }
      };
      this._onWheelPointerDown = (ev) => {
        if (!this._nadeWheelOpen) return;
        ev.preventDefault();
        ev.stopPropagation();
        this._wheelPressing = true;
        // 直接点卡片也能选中：很多玩家不会拖拽，旧版“点上去没反应”
        const slot = ev.target && ev.target.closest ? ev.target.closest('.nw-slot') : null;
        if (slot && slot.dataset && slot.dataset.index !== undefined) {
          const idx = parseInt(slot.dataset.index, 10);
          this._wheelActive = idx;
          this._wheelSlotPressed = idx;
        } else {
          this._wheelSlotPressed = -1;
          if (document.pointerLockElement !== canvas()) {
            this._updateWheelAim(ev.clientX, ev.clientY, true);
          }
        }
      };
      this._onWheelPointerUp = (ev) => {
        if (!this._nadeWheelOpen) return;
        ev.preventDefault();
        ev.stopPropagation();
        const slot = ev.target && ev.target.closest ? ev.target.closest('.nw-slot') : null;
        if (slot && slot.dataset && slot.dataset.index !== undefined) {
          this._wheelActive = parseInt(slot.dataset.index, 10);
        } else if (this._wheelSlotPressed !== undefined && this._wheelSlotPressed >= 0) {
          // pointerdown 在卡片上、pointerup 时手指滑出卡片：仍然按按下的那张卡片结算
          this._wheelActive = this._wheelSlotPressed;
        } else if (document.pointerLockElement !== canvas()) {
          this._updateWheelAim(ev.clientX, ev.clientY, true);
        }
        this._wheelSlotPressed = -1;
        this._wheelPressing = false;
        this._wheelPick();
      };
      this._onWheelKey = (ev) => {
        if (!this._nadeWheelOpen) return;
        const k = ev.key;
        if (k === 'Escape' || k.toLowerCase() === 't' || k.toLowerCase() === 'n') {
          ev.preventDefault();
          ev.stopPropagation();
          this._closeNadeWheel();
          return;
        }
        const dirs = { ArrowUp: -Math.PI / 2, ArrowRight: 0, ArrowDown: Math.PI / 2, ArrowLeft: Math.PI };
        if (dirs[k] !== undefined) {
          ev.preventDefault();
          ev.stopPropagation();
          if (this._wheelItems && this._wheelItems.length) {
            const r = this._wheelRadius || 140;
            this._wheelAim = { x: Math.cos(dirs[k]) * r * 0.9, y: Math.sin(dirs[k]) * r * 0.9 };
            this._updateWheelAim(0, 0, false);
          }
          return;
        }
        if (k === 'Enter' || k === ' ') {
          ev.preventDefault();
          ev.stopPropagation();
          this._wheelPick();
          return;
        }
        if (/^[1-9]$/.test(k)) {
          const idx = parseInt(k, 10) - 1;
          if (this._wheelItems && this._wheelItems[idx]) {
            ev.preventDefault();
            ev.stopPropagation();
            // 数字键在医疗轮盘里必须使用医疗物品，不能误走到投掷物选择
            this._wheelActive = idx;
            this._wheelPick();
          }
        }
      };
      this._onWheelPointerCancel = () => {
        if (this._nadeWheelOpen) this._closeNadeWheel();
      };
      // Pointer Lock 下个别浏览器只派发 mouse 事件，补一层 mouse 兜底；
      // 重复触发时第二次会因为 _nadeWheelOpen 已 false 而直接返回。
      this._onWheelMouseDown = (ev) => {
        if (!this._nadeWheelOpen) return;
        this._wheelPressing = true;
        const slot = ev.target && ev.target.closest ? ev.target.closest('.nw-slot') : null;
        if (slot && slot.dataset && slot.dataset.index !== undefined) {
          this._wheelActive = parseInt(slot.dataset.index, 10);
          this._wheelSlotPressed = this._wheelActive;
        } else if (document.pointerLockElement !== canvas()) {
          this._updateWheelAim(ev.clientX, ev.clientY, true);
        }
      };
      this._onWheelMouseUp = (ev) => {
        if (!this._nadeWheelOpen) return;
        const slot = ev.target && ev.target.closest ? ev.target.closest('.nw-slot') : null;
        if (slot && slot.dataset && slot.dataset.index !== undefined) {
          this._wheelActive = parseInt(slot.dataset.index, 10);
        } else if (this._wheelSlotPressed !== undefined && this._wheelSlotPressed >= 0) {
          this._wheelActive = this._wheelSlotPressed;
        } else if (document.pointerLockElement !== canvas()) {
          this._updateWheelAim(ev.clientX, ev.clientY, true);
        }
        this._wheelSlotPressed = -1;
        this._wheelPressing = false;
        this._wheelPick();
      };
      document.addEventListener('pointermove', this._onWheelPointerMove, true);
      document.addEventListener('pointerdown', this._onWheelPointerDown, true);
      document.addEventListener('pointerup', this._onWheelPointerUp, true);
      document.addEventListener('pointercancel', this._onWheelPointerCancel, true);
      document.addEventListener('mousedown', this._onWheelMouseDown, true);
      document.addEventListener('mouseup', this._onWheelMouseUp, true);
      window.addEventListener('keydown', this._onWheelKey, true);
    }
  }

  _toggleNadeWheel() {
    if (this.replayMode) return;
    const p = this.player;
    if (!p || !p.alive) return;
    this._buildNadeWheel();
    // 已经开着医疗轮盘时，按投掷键应切换到投掷轮盘，而不是只关掉
    if (this._nadeWheelOpen) {
      if (this._wheelMode === 'nade') { this._closeNadeWheel(); return; }
      this._wheelMode = 'nade';
      this._renderNadeWheel();
      this._updateWheelAim(0, 0, false);
      return;
    }
    this._wheelMode = 'nade';
    this._openNadeWheel();
  }

  // 医疗便携轮盘：和投掷轮盘共用同一套径向 UI，只是数据源与确认动作不同
  _toggleMedWheel() {
    if (this.replayMode) return;
    const p = this.player;
    if (!p || !p.alive) return;
    this._buildNadeWheel();
    if (this._nadeWheelOpen) {
      if (this._wheelMode === 'med') { this._closeNadeWheel(); return; }
      this._wheelMode = 'med';
      this._renderNadeWheel();
      this._updateWheelAim(0, 0, false);
      return;
    }
    this._wheelMode = 'med';
    this._openNadeWheel();
  }

  _getMedicalWheelList() {
    const out = [];
    for (const { uid, it, def } of this._collectCarriedItems(it => it.table === 'medical')) {
      if (!def || !def.use) continue;
      out.push({ uid, def, qty: it.qty || 1 });
    }
    return out;
  }

  _openNadeWheel() {
    const el = document.getElementById('nade-wheel');
    if (!el) return;
    this._nadeWheelOpen = true;
    this._wheelPressing = false;
    this._wheelActive = -1;
    this._wheelSlotPressed = -1;
    this._wheelAim = { x: 0, y: 0 };
    // 打开轮盘时取消正在按住的投掷瞄准，避免关闭后立刻把手雷扔出去
    if (this.player) this.player._throwAiming = false;
    this._clearThrowPreview();
    this._wheelHadLock = document.pointerLockElement === this.engine.renderer.canvas;
    // ★ 医疗轮盘与投掷轮盘完全同构：保持 Pointer Lock，用鼠标位移/拖拽选择，
    //   松手或点击确认。旧版医疗轮盘会退出鼠标锁定，导致“按了 N 鼠标飞出/点不到”。
    this._renderNadeWheel();
    el.classList.add('on');
    this._updateWheelAim(0, 0, false);
  }

  _renderNadeWheel() {
    const el = document.getElementById('nade-wheel');
    if (!el) return;
    const wrap = el.querySelector('.nw-slots');
    if (wrap) wrap.innerHTML = '';
    const isMed = this._wheelMode === 'med';
    const list = isMed ? this._getMedicalWheelList() : this._getThrowableList();
    this._wheelItems = list;
    this._wheelCenterX = window.innerWidth / 2;
    this._wheelCenterY = window.innerHeight / 2;
    this._wheelRadius = Math.max(122, Math.min(178, Math.min(window.innerWidth, window.innerHeight) * 0.27));
    const n = list.length;
    // 上/右/下/左为默认四向；3 个时自动均分，5~8 个时扩展为环形
    this._wheelAngles = n > 0
      ? Array.from({ length: n }, (_, i) => -Math.PI / 2 + i * (Math.PI * 2 / n))
      : [];
    const centerTitle = el.querySelector('.nw-center-title');
    const centerSub = el.querySelector('.nw-center-sub');
    if (n === 0) {
      if (centerTitle) centerTitle.textContent = isMed ? '没有医疗用品' : '没有投掷物';
      if (centerSub) centerSub.textContent = '点击任意处关闭';
      this._wheelActive = -1;
      return;
    }
    if (centerTitle) centerTitle.textContent = isMed ? '医疗用品' : '投掷物';
    if (centerSub) centerSub.textContent = '中间取消';
    for (let i = 0; i < n; i++) {
      const it = list[i];
      const ang = this._wheelAngles[i];
      const x = Math.cos(ang) * this._wheelRadius;
      const y = Math.sin(ang) * this._wheelRadius;
      const icon = isMed
        ? (it.def.icon || (it.def.use && it.def.use.kind === 'blood' ? '🩸' : '🩹'))
        : (it.def.effect === 'flash' ? '⚡'
        : (it.def.effect === 'stun' ? '💫'
        : (it.def.effect === 'emp' ? '📡'
        : (it.def.effect === 'fire' ? '🔥' : '💣'))));
      const slot = document.createElement('div');
      slot.className = 'nw-slot';
      slot.dataset.index = String(i);
      slot.style.setProperty('--x', x.toFixed(1) + 'px');
      slot.style.setProperty('--y', y.toFixed(1) + 'px');
      slot.innerHTML =
        '<div class="nw-icon">' + icon + '</div>' +
        '<div class="nw-text"><div class="nw-name">' + this._esc(String(this.engine.i18n.t(it.def.name))) + '</div>' +
        '<div class="nw-qty">×' + (it.qty || 1) + (isMed ? ' · 点击使用' : '') + '</div></div>';
      // ★ 卡片自己的兜底：document 捕获层没接住指针事件时，click 仍能选中
      slot.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation();
        this._wheelActive = i;
        this._wheelSlotPressed = i;
      });
      slot.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!this._nadeWheelOpen) return;
        this._wheelActive = i;
        this._wheelPick();
      });
      if (wrap) wrap.appendChild(slot);
    }
  }

  _updateWheelAim(dx, dy, absolute) {
    if (!this._nadeWheelOpen) return;
    const el = document.getElementById('nade-wheel');
    if (!el) return;
    const centerX = this._wheelCenterX || window.innerWidth / 2;
    const centerY = this._wheelCenterY || window.innerHeight / 2;
    if (absolute) {
      this._wheelAim = { x: dx - centerX, y: dy - centerY };
    } else {
      // 轮盘灵敏度：默认 2.4 倍，解决“鼠标拖满也转不动”的问题
      const sens = Math.max(0.5, Number(this.engine.profile.get('input.wheelSensitivity', 2.4)) || 2.4);
      this._wheelAim.x += dx * sens;
      this._wheelAim.y += dy * sens;
    }
    const maxR = Math.max(50, (this._wheelRadius || 140) * 1.05);
    let ax = this._wheelAim.x;
    let ay = this._wheelAim.y;
    const rawLen = Math.hypot(ax, ay);
    if (rawLen > maxR) {
      ax = ax / rawLen * maxR;
      ay = ay / rawLen * maxR;
    }
    this._wheelAim = { x: ax, y: ay };
    const dist = Math.hypot(ax, ay);
    let active = -1;
    if (dist > 34 && this._wheelItems && this._wheelItems.length) {
      const ang = Math.atan2(ay, ax);
      let best = Infinity;
      for (let i = 0; i < this._wheelAngles.length; i++) {
        let d = Math.abs(ang - this._wheelAngles[i]);
        while (d > Math.PI) d = Math.abs(d - Math.PI * 2);
        if (d < best) { best = d; active = i; }
      }
    }
    this._wheelActive = active;
    const slots = el.querySelectorAll('.nw-slot');
    for (let i = 0; i < slots.length; i++) slots[i].classList.toggle('active', i === active);
    const aim = el.querySelector('.nw-aim');
    if (aim) {
      aim.style.width = dist.toFixed(1) + 'px';
      aim.style.transform = 'translateY(-50%) rotate(' + Math.atan2(ay, ax).toFixed(3) + 'rad)';
      aim.style.opacity = active >= 0 ? '1' : '0.22';
    }
    const centerTitle = el.querySelector('.nw-center-title');
    const centerSub = el.querySelector('.nw-center-sub');
    if (active >= 0 && this._wheelItems && this._wheelItems[active]) {
      if (centerTitle) centerTitle.textContent = this.engine.i18n.t(this._wheelItems[active].def.name);
      if (centerSub) centerSub.textContent = this._wheelMode === 'med' ? '松开 / 点击使用' : '松开 / 点击确认';
    } else {
      const isMed = this._wheelMode === 'med';
      if (centerTitle) centerTitle.textContent = (this._wheelItems && this._wheelItems.length) ? (isMed ? '医疗用品' : '投掷物') : (isMed ? '没有医疗用品' : '没有投掷物');
      if (centerSub) centerSub.textContent = (this._wheelItems && this._wheelItems.length) ? '移到扇区选择' : '点击任意处关闭';
    }
  }

  _wheelPick() {
    if (!this._nadeWheelOpen) return;
    if (this._wheelActive >= 0 && this._wheelItems && this._wheelItems[this._wheelActive]) {
      const picked = this._wheelItems[this._wheelActive];
      if (this._wheelMode === 'med') {
        this._closeNadeWheel();
        this._useMedical(picked.uid);
        return;
      }
      this._selectThrowable(picked.defId);
    } else {
      this._closeNadeWheel();
    }
  }

  _closeNadeWheel(restoreLock = true) {
    const wasOpen = this._nadeWheelOpen;
    this._nadeWheelOpen = false;
    this._wheelPressing = false;
    this._wheelActive = -1;
    this._wheelSlotPressed = -1;
    this._wheelItems = [];
    const el = document.getElementById('nade-wheel');
    if (el) el.classList.remove('on');
    if (wasOpen && restoreLock && this._wheelHadLock) {
      const canvas = this.engine.renderer.canvas;
      if (canvas && !document.pointerLockElement && typeof canvas.requestPointerLock === 'function') {
        try {
          const p = canvas.requestPointerLock();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (_) {}
      }
    }
    this._wheelHadLock = false;
  }

  _selectThrowable(defId) {
    const p = this.player;
    const def = this.engine.content.get('nade', defId);
    if (!p || !def) { this._closeNadeWheel(); return; }
    p.activeThrowable = defId;
    p._throwAiming = false;
    p._throwPinPulled = false;
    p._throwFuse = def.fuse || 3;
    p._throwCharge = 0.45;
    this._closeNadeWheel();
    const kind = def.trigger === 'impact' ? '压感式·撞击即爆' : '保险式·拔销后倒计时';
    this._log('已选择：' + this.engine.i18n.t(def.name) + '（' + kind + '；长按攻击键蓄力，松手投出）', 'p');
  }

  _pullThrowablePin(p) {
    if (!p || !p.activeThrowable || p._throwPinPulled) return;
    const def = this.engine.content.get('nade', p.activeThrowable);
    if (!def || def.trigger !== 'timed') return;
    p._throwPinPulled = true;
    p._throwFuse = def.fuse || 3;
    this._playSFX('switch', { volume: 0.55 });
    this._log('保险已解除：' + (def.fuse || 3).toFixed(1) + ' 秒引信开始倒计时', 'r');
  }

  // 独立“解除保险”按钮/按键：玩家可以先瞄准调整角度，再主动开始引信
  _armThrowable(p) {
    if (!p || !p.alive || !p.activeThrowable) return;
    if (p.status && p.status.isDowned()) return;
    this._pullThrowablePin(p);
  }

  _throwSpeed(p) {
    const charge = Math.max(0, Math.min(1, p && p._throwCharge !== undefined ? p._throwCharge : 0.5));
    const power = Number(this.engine.profile.get('input.throwPower', 1.0)) || 1.0;
    return { speed: (24 + charge * 14) * power, lift: 3.0 + charge * 1.8 };
  }

  _detonateHeldThrowable(p) {
    if (!p || !p.activeThrowable) return;
    const defId = p.activeThrowable;
    const def = this.engine.content.get('nade', defId);
    const cam = this.engine.renderer.camera;
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const origin = new THREE.Vector3(p.body.position.x, p.body.position.y + 1.0, p.body.position.z)
      .add(dir.clone().multiplyScalar(0.35));
    this._takeThrowableItem(defId);
    const geo = new THREE.SphereGeometry(0.12, 8, 6);
    const mat = new THREE.MeshStandardMaterial({ color: def ? (def.color || 0x3a3a3a) : 0x3a3a3a });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    this.engine.renderer.scene.add(mesh);
    const pr = {
      owner: p, mesh, pos: origin.clone(), vel: new THREE.Vector3(0, 0, 0),
      fuse: 0.01, damage: def ? (def.damage || 0) : 0, radius: def ? (def.radius || 1.2) : 1.2,
      def, effect: def ? def.effect : 'frag',
      name: def ? this.engine.i18n.t(def.name) : '投掷物', trigger: 'timed',
      fragments: def ? (def.fragmentCount || 6) : 6,
    };
    this._explodeProjectile(pr);
    this.engine.renderer.scene.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
    p.activeThrowable = null;
    p._throwAiming = false;
    p._throwPinPulled = false;
    p._throwFuse = 0;
    p._throwCharge = 0;
    this._clearThrowPreview();
    this._removeHeldThrowable();
    this._log('引信在手中耗尽！', 'r');
    this._playSFX('explosion', { volume: 0.9 });
  }

  _quickThrow(p) {
    if (!p) return;
    if (!p.activeThrowable) {
      const list = this._getThrowableList();
      if (list.length === 0) { this._log('没有可投掷物', 'y'); return; }
      this._selectThrowable(list[0].defId);
    }
    const def = this.engine.content.get('nade', p.activeThrowable);
    if (def && def.trigger === 'timed' && !p._throwPinPulled) {
      this._log('保险尚未解除：先点「解除保险」按钮或按 J', 'y');
      return;
    }
    p._throwCharge = Math.max(0.6, p._throwCharge || 0.6);
    this._doThrowNow(p);
  }

  // 长按瞄准后松手 / 快捷投掷：消耗并立即出手
  _doThrowNow(p) {
    if (!p || !p.activeThrowable) return;
    const defId = p.activeThrowable;
    const def = this.engine.content.get('nade', defId);
    if (def && def.trigger === 'timed' && !p._throwPinPulled) {
      this._log('保险尚未解除：先点「解除保险」按钮或按 J', 'y');
      return;
    }
    if (p._throwPinPulled && p._throwFuse <= 0) {
      this._detonateHeldThrowable(p);
      return;
    }
    if (!this._takeThrowableItem(defId)) {
      this._log('投掷物已用尽', 'y');
      p.activeThrowable = null;
      p._throwAiming = false;
      p._throwPinPulled = false;
      p._throwFuse = 0;
      p._throwCharge = 0;
      this._clearThrowPreview();
      this._removeHeldThrowable();
      return;
    }
    this._spawnThrowable(p, defId);
    p._throwAiming = false;
    p._throwPinPulled = false;
    p._throwFuse = 0;
    p._throwCharge = 0;
    this._clearThrowPreview();
    if (!this._hasThrowable(defId)) {
      p.activeThrowable = null;
      this._removeHeldThrowable();
    }
  }

  _startThrow(p) { this._doThrowNow(p); }

  // 手持投掷物（隐藏枪模，右手显示投掷物）
  _updateHeldThrowable(p) {
    const def = p.activeThrowable ? this.engine.content.get('nade', p.activeThrowable) : null;
    if (!def) { this._removeHeldThrowable(); return; }
    if (!this._heldThrowable || this._heldThrowable.userData.defId !== p.activeThrowable) {
      this._removeHeldThrowable();
      const geo = new THREE.IcosahedronGeometry(0.13, 0);
      const mat = new THREE.MeshStandardMaterial({ color: def.color || 0x3a3a3a, metalness: 0.4, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0.32, -0.26, -0.72);
      mesh.userData.defId = p.activeThrowable;
      // 引信/拉环的一点高光，方便确认手里拿的是哪种投掷物
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6),
        new THREE.MeshBasicMaterial({ color: def.effect === 'flash' ? 0xffffff : (def.effect === 'stun' ? 0x9fa8ff : 0xff9a3c) })
      );
      cap.position.y = 0.15;
      mesh.add(cap);
      this.engine.renderer.camera.add(mesh);
      this._heldThrowable = mesh;
    }
    this._heldThrowable.visible = true;
    // 长按瞄准时稍微抬高，表示“准备掷出”
    this._heldThrowable.position.y += ((p._throwAiming ? -0.20 : -0.26) - this._heldThrowable.position.y) * 0.25;
    if (p.weaponGroup) p.weaponGroup.visible = false;
  }

  _removeHeldThrowable() {
    if (this._heldThrowable) {
      this.engine.renderer.camera.remove(this._heldThrowable);
      if (this._heldThrowable.geometry) this._heldThrowable.geometry.dispose();
      if (this._heldThrowable.material) this._heldThrowable.material.dispose();
      this._heldThrowable = null;
    }
    if (this.player && this.player.weaponGroup) this.player.weaponGroup.visible = true;
  }

  _spawnThrowable(p, defId) {
    const def = this.engine.content.get('nade', defId);
    if (!def) return;
    const cam = this.engine.renderer.camera;
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    // 贴墙投掷时不要把弹体生成在墙体内部：从眼睛向前探 0.5m，被挡住就缩短出手点。
    const blockHit = this.physics.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, 0.55,
      body => body.userData && body.userData.type === 'obstacle');
    const spawnDist = blockHit ? Math.max(0.06, blockHit.t - 0.08) : 0.5;
    const start = origin.clone().add(dir.clone().multiplyScalar(spawnDist));

    const geo = new THREE.SphereGeometry(0.12, 8, 6);
    const mat = new THREE.MeshStandardMaterial({ color: def.color || 0x3a3a3a, roughness: 0.6, metalness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(start);
    this.engine.renderer.scene.add(mesh);

    const { speed, lift } = this._throwSpeed(p);
    this.projectiles.push({
      owner: p, mesh,
      pos: start.clone(),
      vel: new THREE.Vector3(dir.x * speed, dir.y * speed + lift, dir.z * speed),
      fuse: (def.trigger === 'timed' && p._throwFuse > 0) ? p._throwFuse : (def.fuse || 3),
      damage: def.damage || 0,
      radius: def.radius || 6,
      def, effect: def.effect || 'frag',
      trigger: def.trigger || 'timed',
      fragments: def.fragmentCount || 6,
      life: 8,
      name: this.engine.i18n.t(def.name),
      prev: start.clone(),
      // 压感引信的最小解除保险距离/时间（防止刚脱手就炸）
      startPos: start.clone(),
      bornAt: this.time,
      armed: (def.trigger || 'timed') !== 'impact',
    });

    this.combatLog.push({ type: 'nade_throw', t: this.time, name: this.engine.i18n.t(def.name), distance: 0 });
    this._playSFX('switch', { volume: 0.4 });
    p.fireCd = Math.max(p.fireCd || 0, 0.5);
  }

  _updateThrowPreview() {
    const p = this.player;
    if (!p || !p.activeThrowable || !p._throwAiming) {
      this._clearThrowPreview();
      return;
    }
    const cam = this.engine.renderer.camera;
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const start = origin.clone().add(dir.clone().multiplyScalar(0.5));
    const { speed, lift } = this._throwSpeed(p);
    let px = start.x, py = start.y, pz = start.z;
    let vx = dir.x * speed, vy = dir.y * speed + lift, vz = dir.z * speed;
    const stepT = 0.04;
    const pts = [];
    const g = 14.0;
    let land = null;
    for (let i = 0; i < 90; i++) {
      vy -= g * stepT;
      px += vx * stepT; py += vy * stepT; pz += vz * stepT;
      if (py < 0.12) {
        py = 0.12;
        pts.push(new THREE.Vector3(px, py, pz));
        land = { x: px, z: pz };
        break;
      }
      pts.push(new THREE.Vector3(px, py, pz));
    }
    if (pts.length < 2) { this._clearThrowPreview(); return; }

    // 1. 点状弹道：比 1px 线更容易看清落点和弧度
    let group = this._nadePreview;
    if (!group) {
      group = new THREE.Group();
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.PointsMaterial({ color: 0xffcc66, size: 0.14, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false });
      const dots = new THREE.Points(geo, mat);
      group.add(dots);
      const landMat = new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 28), landMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      ring.visible = false;
      group.add(ring);
      group.userData = { dots, ring };
      this._nadePreview = group;
      this.engine.renderer.scene.add(group);
    }
    const dots = group.userData.dots;
    const ring = group.userData.ring;
    dots.geometry.dispose();
    dots.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    if (land) {
      ring.visible = true;
      ring.position.x = land.x;
      ring.position.z = land.z;
      const s = 1 + 0.12 * Math.sin(performance.now() / 120);
      ring.scale.setScalar(s);
    } else {
      ring.visible = false;
    }
  }

  _clearThrowPreview() {
    if (!this._nadePreview) return;
    this.engine.renderer.scene.remove(this._nadePreview);
    this._nadePreview.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this._nadePreview = null;
  }


 _fireWeapon(owner, weapon, isPlayer, target){
  if (!weapon || !weapon.def) return;
  // ★ EMP 损坏的电子枪械：弹链还在，但击发/供弹组件失效
  if (weapon.disabled || (weapon.item && weapon.item.damaged) || (weapon.loaded && weapon.loaded.disabled)) {
    if (isPlayer) {
      if (!this._empLogAt || this.time - this._empLogAt > 1.2) {
        this._empLogAt = this.time;
        this._log('武器电子组件已损坏，无法开火', 'y');
      }
    } else if (owner && owner.weapons && owner.weapons.melee) {
      owner.currentSlot = 'melee';
      owner.weapon = owner.weapons.melee;
    }
    return;
  }
const def = weapon.def;

// ★ AI 不穿过队友/玩家开火：枪线里有同阵营单位时先停火，避免“队友互射”
if (!isPlayer && target && this._hasFriendlyInLine(owner, target)) {
  owner.fireCd = 0.45 + Math.random() * 0.25;
  return;
}

// ★ 彩虹子弹：从队列中取出当前一发
let currentAmmoId = def.ammoType;
if (weapon.loaded && weapon.loaded.queue && weapon.loaded.queue.length > 0) {
  currentAmmoId = weapon.loaded.queue.shift();
}
const ammo = this.engine.content.get('ammo', currentAmmoId);
if (!ammo) return;

  if (isPlayer) owner.fireCd = (60 / def.rpm) / (owner.skillFireRateMul || 1);
else owner.fireCd = 60 / def.rpm * (0.9 + Math.random() * 0.4);
if (weapon.loaded) {
  weapon.loaded.qty = Math.max(0, weapon.loaded.qty - 1);
  if (isPlayer && this.training && this.training.infiniteAmmo) {
    // 靶场无限子弹：只补到满弹匣，保留已排好的弹链顺序
    if (weapon.loaded.queue) {
      const pref = weapon.item && weapon.item.loadedPreference;
      const prefDef = pref ? this.engine.content.get('ammo', pref) : null;
      const fillId = (prefDef && prefDef.caliber === def.ammoType) ? pref : def.ammoType;
      while (weapon.loaded.queue.length < weapon.magCap) weapon.loaded.queue.push(fillId);
      if (weapon.loaded.queue.length > weapon.magCap) weapon.loaded.queue.length = weapon.magCap;
      weapon.loaded.qty = weapon.loaded.queue.length;
      weapon.loaded.ammoType = weapon.loaded.queue[0] || fillId;
    } else {
      weapon.loaded.qty = weapon.magCap;
    }
  }
} else if (typeof weapon.mag === 'number') {
  weapon.mag--;
}
if (isPlayer) this.stats.shots++;

// ★ 1. 动态散布计算（基于开镜、蹲下、状态）
//    配件修正只在这里乘一次，武器 def 永远是原始数据。
const wmods = weapon.mods || null;
let baseSpread = (def.spread || 0.02) * (wmods ? (wmods.spreadMul || 1) : 1);
let spread = baseSpread;
if (isPlayer) {
  if (owner.ads) spread *= 0.4 * (owner.skillAdsSpreadMul || 1) * (wmods ? (wmods.adsSpreadMul || 1) : 1);
  if (owner.isCrouching) spread *= 0.6; 
  // 操控加成：直接收束散布，让「激励 / 压制 / 应激」有实际手感
  if (owner.skillHandlingMul && owner.skillHandlingMul > 1) spread /= owner.skillHandlingMul;

  if (owner.holdingBreath) spread *= 0.5; // 屏息压制晃动
  if (!owner._immuneNeg) {
    if (owner.status && owner.status.hasEffect('pain') && !(owner.status.painSuppressed && owner.status.painSuppressed())) {
      const painLv = Math.max(1, Math.min(4, (owner.status.effects.get('pain') || {}).strength || 1));
      spread *= 1.04 + 0.06 * painLv; // 1.10 / 1.16 / 1.22 / 1.28
    }
    if (owner.status && owner.status.hasEffect('blind')) spread *= 1.4;
    if (owner.status && owner.status.hasEffect('dazzle')) spread *= 1.22;
    if (owner.status && owner.status.hasEffect('stun')) spread *= 1.5;
  }
  } else {
  // ★ AI 散布
  const ai = owner.spec && owner.spec.ai ? owner.spec.ai : { composure: 0.5 };
  const composureMul = 1.5 - (ai.composure || 0.5); 
  spread = baseSpread * composureMul;
  
  if (owner.isCrouching) spread *= 0.6;
  if (owner._blindFire) spread *= 3.0;
  if (owner.hitFlash > 0 && (ai.composure || 0.5) < 0.6) spread *= 1.5;
  // ★ 闪光/震撼：视野与稳定性严重受影响
  if (owner.blindedUntil && this.time < owner.blindedUntil) spread *= 3.0;
  if (owner._dazzledUntil && this.time < owner._dazzledUntil) spread *= 1.8;
  if (owner.stunnedUntil && this.time < owner.stunnedUntil) spread *= 2.0;
  if (owner.suppressedUntil && this.time < owner.suppressedUntil) spread *= 2.4;

  // ★ 仿真命中率：距离越远越不准；目标高速移动更难命中；连发后坐扩散
  let tdist = 25;
  if (target && target.body) {
    tdist = Math.hypot(target.body.position.x - owner.body.position.x, target.body.position.z - owner.body.position.z);
    const tv = Math.abs(target.body.velocity.x) + Math.abs(target.body.velocity.z);
    if (tv > 2) spread *= 1.25;
    if (tv > 5) spread *= 1.2;
  }
  spread *= 1 + Math.min(1.6, tdist / 45);
  spread *= (owner._burstSpread || 1);
  // 移动中射击更不准：避免 AI 一边全速冲刺一边像架枪一样点射
  const aiSpeed = Math.hypot(owner.body.velocity.x, owner.body.velocity.z);
  if (aiSpeed > 2) spread *= Math.min(1.8, 1.15 + aiSpeed * 0.07);
  // 感知/镇定越低越抖
  spread *= (1.15 - (ai.composure || 0.5) * 0.25);
}
    
const baseEnergy = CombatSystem.kinetic(ammo.massG, ammo.v0);
const range = (def.range || 50) * 10 * (wmods ? (wmods.rangeMul || 1) : 1);
// ★ 弹丸数优先读弹药：独头弹 pellets=1，不能被霰弹枪的 9 颗覆盖
const pellets = Math.max(1, ammo.pellets || def.pellets || 1);

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
    const recoilAmt = (def.recoil || 20) * (wmods ? (wmods.recoilMul || 1) : 1) * 0.00015 * (100 / stability); 
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
    if (roll < 0.05) aimYOffset = hh * 0.75;
    else if (roll < 0.45) aimYOffset = hh * 0.25;
    else if (roll < 0.65) aimYOffset = -hh * 0.05;
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
  // 发射子弹的动画和声音：按武器类别合成不同枪声，并按距离衰减/声像
  const shotCls = def.pellets > 1 ? 'shotgun'
    : ((def.range || 0) >= 200 ? 'sniper'
      : (['9mm', '.45acp'].includes(def.ammoType) ? 'pistol' : 'rifle'));
  const srcX = owner.body ? owner.body.position.x : 0;
  const srcZ = owner.body ? owner.body.position.z : 0;
  this._playSFXAt('shot_' + shotCls, srcX, srcZ, {
    volume: isPlayer ? 0.85 : 0.8,
    maxDist: shotCls === 'sniper' ? 260 : (shotCls === 'pistol' ? 120 : 180),
  });

// ★ 增加恶性声纹（枪声）
const soundSource = isPlayer ? 'player' : 'enemy';
const soundFaction = isPlayer ? 'player' : (owner.spec ? owner.spec.faction : 'nipsel');
this.emitSound('malignant', 1.0, def.range ? def.range * 1.5 : 150, srcX, srcZ, soundSource, soundFaction);
}

_raycastBullet(owner, ox, oy, oz, dirX, dirY, dirZ, baseEnergy, range, weaponDef, ammoDef, isPlayer){
  // ★ 只要不是自己，物理上都可以挡住子弹
  const hitFilter = (body) => body !== owner.body && (body.userData?.type === 'enemy' || body.userData?.type === 'player' || body.userData?.type === 'obstacle' || body.userData?.type === 'container');

  const hit = this.physics.raycast(ox, oy, oz, dirX, dirY, dirZ, range, hitFilter);

  const dirLen = Math.hypot(dirX, dirY, dirZ) || 1;
  const nx = dirX / dirLen, ny = dirY / dirLen, nz = dirZ / dirLen;

  const actualDist = hit ? hit.t : range;
  const endX = hit ? hit.point.x : (ox + nx * actualDist);
  const endY = hit ? hit.point.y : (oy + ny * actualDist);
  const endZ = hit ? hit.point.z : (oz + nz * actualDist);

  this._spawnTracer(ox, oy, oz, endX, endY, endZ, isPlayer ? 0xffe08a : 0xff8b7b);
  if (!isPlayer) {
    const hitPlayer = !!(hit && hit.body && hit.body.userData && hit.body.userData.type === 'player');
    this._recordReplayShot(owner, endX, endY, endZ, hitPlayer);
  }

  const realisticDrop = this.engine.profile.get('combat.bulletDrop', false);
const decayK = realisticDrop ? COMBAT.RANGE_DECAY_REALISTIC : COMBAT.RANGE_DECAY;

// ★ 有效射程（def.range）作为衰减基准，与物理射程上限（range = def.range * 10）解耦
const effectiveRange = weaponDef.range || 100;

// 1. 动能衰减：真实弹道近似为 exp(-k * traveled / effectiveRange)
const energy = CombatSystem.energyAtRange(baseEnergy, actualDist, effectiveRange, decayK);

// 2. 穿透力衰减：超出有效射程 80% 后，每超出一个有效射程降 1 点
// ★ 冲压（impulse）是额外穿透加成，与初速动能解耦（如未来的穿甲弹）
const basePen = ((ammoDef && typeof ammoDef.pen === 'number') ? ammoDef.pen : 0)
              + ((ammoDef && typeof ammoDef.impulse === 'number') ? ammoDef.impulse : 0);
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

    // ★ 伤害归属判定：同阵营也吃友伤（子弹/投掷物一视同仁）
    if (hit.body.userData.type === 'enemy') {
      const targetEnemy = hit.body.userData.ref;
      this._pendingHitSrcX = ox;
      this._pendingHitSrcZ = oz;
      this._damageEnemy(targetEnemy, energy, pen, part, isPlayer);
      this._pendingHitSrcX = undefined;
      this._pendingHitSrcZ = undefined;
      this._applyAmmoEffects(targetEnemy.status, part, ammoDef);
      // ★ 玻纤弹对纤维护具破坏极大
      if (ammoDef && ammoDef.glassfiber && targetEnemy.armor && targetEnemy.armor.fiber) {
        targetEnemy.armor.fiber.dur = Math.max(0, targetEnemy.armor.fiber.dur - (ammoDef.fiberArmorDamage || 18));
      }
      if (ammoDef && ammoDef.burn) this._spawnSpark(hit.point.x, hit.point.y, hit.point.z);
    } else if (hit.body.userData.type === 'player') {
      // 玩家被击中（目前只有 AI 会走这条线）
      if (!isPlayer) {
        this._damagePlayer(hit.body.userData.ref, energy, pen, part, ox, oz, owner);
        this._applyAmmoEffects(hit.body.userData.ref.status, part, ammoDef);
        if (ammoDef && ammoDef.glassfiber && hit.body.userData.ref.armor && hit.body.userData.ref.armor.fiber) {
          hit.body.userData.ref.armor.fiber.dur = Math.max(0, hit.body.userData.ref.armor.fiber.dur - (ammoDef.fiberArmorDamage || 18));
        }
        if (ammoDef && ammoDef.burn) this._spawnSpark(hit.point.x, hit.point.y, hit.point.z);
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

  // 同阵营单位是否挡在 AI 的枪线上。玩家/队友/同派系敌人都会让 AI 停火，
  // 只有已经判定玩家为叛徒的队友才会越过这条检查。
  _hasFriendlyInLine(owner, target) {
    if (!owner || !target || !target.body || !owner.body) return false;
    if (owner.isBetrayed) return false;
    const ox = owner.body.position.x, oz = owner.body.position.z;
    const tx = target.body.position.x, tz = target.body.position.z;
    const dx = tx - ox, dz = tz - oz;
    const dist = Math.hypot(dx, dz) || 1;
    const ux = dx / dist, uz = dz / dist;
    const ownerFaction = owner.faction || (owner.spec && owner.spec.faction) || 'enemy';
    const candidates = [this.player, ...(this.enemies || [])];
    for (const other of candidates) {
      if (!other || other === owner || other === target || !other.alive || !other.body) continue;
      const of = other === this.player ? 'player' : (other.faction || (other.spec && other.spec.faction));
      const friendly = owner.isAlly ? (of === 'player') : (of === ownerFaction);
      if (!friendly) continue;
      const rx = other.body.position.x - ox;
      const rz = other.body.position.z - oz;
      const along = rx * ux + rz * uz;
      if (along < 0.5 || along > dist + 1.0) continue;
      const lateral = Math.abs(rx * uz - rz * ux);
      const radius = other.body.radius || 1;
      if (lateral < radius * 0.9 + 0.35) return true;
    }
    return false;
  }

_applyArmorLayers(entity, energy, pen, hitPart, damageType) {
  let remaining = energy;
  let snapshot = null;

  // 爆炸冲击波（超压/内脏伤）不是子弹，硬质插板不能像挡弹一样把它吃掉
  if (damageType === 'blast') return { remaining: energy, snapshot: null };
  if (!entity.armor) return { remaining, snapshot };

  const isMelee = damageType === 'melee';
  let mainAbsorbed = 0;

  // bluntFactor：弹体被护具挡住后，真正以钝击形式传入人体的能量比例。
  // 硬质插板/头盔壳靠背面变形吸能，比例低；软质纤维靠拉伸吸能，比例高。
  // 这是“防弹衣不等于无敌”的物理来源，而不是旧版统一 remaining *= 0.25。
  const applyOne = (piece, layerName, bluntFactor) => {
    if (!piece || piece.lv <= 0 || piece.dur <= 0) return null;
    const before = piece.dur;

    let res;
    if (isMelee) {
      const absorbRatio = Math.min(0.5, piece.lv * 0.05);
      const absorbed = remaining * absorbRatio;
      const wear = Math.min(piece.dur, absorbed / COMBAT.ARMOR_J_PER_DUR);
      piece.dur = Math.max(0, piece.dur - wear);
      res = { absorbed, remaining: remaining - absorbed, wear, pierced: false };
    } else {
      res = CombatSystem.applyArmor(piece, remaining, pen, false);
    }

    remaining = res.remaining;
    // 未被击穿：只有钝击部分进入人体
    if (!isMelee && !res.pierced && res.absorbed > 0) {
      remaining *= bluntFactor;
    }

    if (res.absorbed > 0) {
      const snap = {
        layer: layerName,
        lv: piece.lv,
        absorbed: res.absorbed,
        wear: before - piece.dur,
        broke: piece.dur <= 0,
        pierced: res.pierced,
        blunt: res.pierced ? 0 : bluntFactor,
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
    // 头盔壳覆盖头顶/后脑，面罩覆盖面部；一次命中只走一层，
    // 避免旧版“壳+面罩”叠加成双层无敌脸。
    if (entity.armor.shell && entity.armor.shell.lv > 0 && entity.armor.shell.dur > 0) {
      applyOne(entity.armor.shell, '头盔壳', 0.10);
    } else {
      applyOne(entity.armor.visor, '面罩', 0.12);
    }
  } else if (hitPart === 'thorax') {
    // 插板在纤维外层：先插板，余能再交给纤维；两层都按各自钝击系数折减
    applyOne(entity.armor.plate, '插板', 0.08);
    applyOne(entity.armor.fiber, '纤维', 0.28);
  } else if (hitPart === 'abdomen') {
    // 腹部通常没有硬插板，只有软质纤维
    applyOne(entity.armor.fiber, '纤维', 0.28);
  } else {
    applyOne(entity.armor.fiber, '纤维', 0.28);
  }

  return { remaining, snapshot };
}
   
  // ★ 特殊弹药效果（燃烧/玻纤滞留等）
  _applyAmmoEffects(status, part, ammoDef){
    if (!status || !ammoDef) return;
    if (ammoDef.burn) {
      status.ignite(part, ammoDef.burnLevel || 1);
    }
    if (ammoDef.glassfiber) {
      status.addEffect('fiber_acute', 999, ammoDef.fiberAcute || 2);
      status.addEffect('fiber_chronic', 9999, ammoDef.fiberChronic || 1);
      status.addEffect('pain', 8, 1);
    }
  }

  // 友伤判定：第一次非致命命中只警告；6 秒内第二次，或单次打掉 >45% 健康/
  // 直接击倒，才认定为“故意背刺”，避免流弹误伤立即翻脸。
  _noteFriendlyFire(enemy, energy, remaining, hpBefore) {
    if (!enemy || !enemy.isAlly || this.training) return;
    if (this._betrayedByPlayer) return;
    const now = this.time;
    this._ffLog = (this._ffLog || []).filter(e => now - e.t < 6);
    const drop = Math.max(0, (hpBefore || 0) - (enemy.status ? enemy.status.healthQuality : 0));
    const last = this._ffLog[this._ffLog.length - 1];
    if (last && last.t === now) {
      // 同一帧的多枚霰弹/破片算一次射击，避免一次误伤就判定背叛
      last.drop = Math.max(last.drop, drop);
      last.energy = Math.max(last.energy, Math.max(0, remaining || 0));
    } else {
      this._ffLog.push({ t: now, drop, energy: Math.max(0, remaining || 0) });
    }
    const downed = enemy.status && enemy.status.isDowned();
    const lethal = !enemy.alive || downed || drop > 60;
    if (lethal || this._ffLog.length >= 2) {
      this._triggerBetrayal(enemy);
    } else {
      this._hint('停火！你打到了队友', 'r');
      this._squadSay(enemy.allyName || '队友', '喂！你打到我身上了！');
    }
  }

  _triggerBetrayal(source) {
    if (this._betrayedByPlayer) return;
    this._betrayedByPlayer = true;
    this._betrayalAt = this.time;
    this._squadPlan = 'fight';
    this._squadOrder = null;
    for (const a of (this.allies || [])) {
      if (!a || !a.alive) continue;
      a.isBetrayed = true;
      a._allyAidFor = null;
      a._allyMarkedTarget = null;
      a._allyMarkSaidFor = null;
      a.state = 'flee';
      a._betrayalFleeUntil = this.time + 30;
    }
    this._log('队友已判定你为叛徒：他们不再接受指令，并会远离你的枪线。', 'r');
    this._hint('你被队伍判定为叛徒！', 'r');
    const leader = (this.allies || []).find(a => a.alive) || source;
    if (leader) this._squadSay(leader.allyName || '队友', '你疯了吗？我们不是你的敌人！所有人散开！');
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

  const armorRes = this._applyArmorLayers(enemy, remaining, pen, hitPart, damageType);
  remaining = armorRes.remaining;
  armorSnapshot = armorRes.snapshot;

  const res = enemy.status.takeDamage(hitPart, remaining, pen);
  // 近距离爆炸超压直接致命：否则手雷只会把人打成“濒死站立”
  if (damageType === 'blast' && remaining >= 900) enemy.status.blood = 0;
  enemy.hitFlash = 0.15;
  this._entityVoice(enemy, 'hurt', 0.4);
  enemy._lastDamageDealt = remaining;
  if (byPlayer) {
    enemy._damageFromPlayer = (enemy._damageFromPlayer || 0) + Math.max(0, remaining);
    enemy._lastDamageByPlayer = true;
    // 只有枪械/近战逐次命中才冒浮字；爆炸/破片用击杀/击倒提示的累计伤害
    if (damageType !== 'explosion' && damageType !== 'blast') {
      this._spawnDamageNumber(enemy.body.position.x, enemy.body.position.z, Math.round(remaining), 'enemy');
    }
  } else {
    enemy._lastDamageByPlayer = false;
  }
  enemy._lastHitSrcX = this._pendingHitSrcX;
  enemy._lastHitSrcZ = this._pendingHitSrcZ;
  if (enemy._lastHitSrcX === undefined) delete enemy._lastHitSrcX;
  if (enemy._lastHitSrcZ === undefined) delete enemy._lastHitSrcZ;
  
  // ★ 只有玩家造成的伤害才算入战绩和日志
  if (byPlayer) {
    this.player.dealt += remaining;
    this.stats.hits++;
    if (this.training && this.trainingStats) {
      if (!this.trainingStats.fightStart || this.trainingStats.fightStart <= 0) this.trainingStats.fightStart = this.time;
      this.trainingStats.hits++;
      this.trainingStats.damage += remaining;
      this.trainingStats.lastDamage = remaining;
    }
    this._hitMarker(hitPart === 'head', { armor: armorSnapshot, coupling: couplingSnapshot });

    const targetEffs = Array.from(enemy.status.effects.keys()).map(k => {
      const d = this.engine.content.get('effects', k);
      return d ? d.name : k;
    });

    this.combatLog.push({
      type: 'damage_dealt',
      t: this.time,
      target: { name: this.engine.i18n.t(enemy.spec.name), faction: enemy.spec.faction, isBoss: false, isElite: false, effects: targetEffs },
      amount: Math.round(remaining),
      part: hitPart,
      // ★ 只有枪械/近战伤害才显示武器；爆炸/破片/燃烧不能冒充当前手里的 5.56
      weapon: (damageType === 'ballistic' || damageType === 'melee') && this.currentWeapon
        ? { name: this.engine.i18n.t(this.currentWeapon.def.name) } : null,
      source: (damageType === 'ballistic' || damageType === 'melee') ? null
        : { name: damageType === 'explosion' ? '破片' : (damageType === 'blast' ? '爆炸冲击波' : (damageType === 'fire' ? '燃烧' : '环境伤害')) },
      headshot: hitPart === 'head',
      pierced: pen >= 3,
      armor: armorSnapshot,
      coupling: couplingSnapshot,
      targetHpBefore: hpBefore,
      targetHpAfter: Math.round(enemy.status.healthQuality),
      targetMaxHp: 100,
    });
  }

  // ★ 统一生死同步：持续伤害也能立即触发倒地/死亡
  const ended = this._syncEntityLifecycle(enemy, false);
  // ★ 玩家对队友的枪/近战伤害才纳入背叛判定；爆炸/燃烧不当作“故意瞄准”
  if (byPlayer && enemy.isAlly && (damageType === 'ballistic' || damageType === 'melee')) {
    this._noteFriendlyFire(enemy, energy, remaining, hpBefore);
  }
  if (!ended && enemy.alive) {
    // 任何来源的伤害都会触发敌人的受击反击；来源坐标用真实弹道起点，而不是玩家位置
    const srcX = enemy._lastHitSrcX !== undefined ? enemy._lastHitSrcX : this.player.body.position.x;
    const srcZ = enemy._lastHitSrcZ !== undefined ? enemy._lastHitSrcZ : this.player.body.position.z;
    AISystem.onHit(this, enemy, hitPart, srcX, srcZ);
  }
}
   
_damagePlayer(player, energy, pen, part = 'thorax', srcX, srcZ, sourceEnt = null, damageType = 'ballistic'){
  if (!player.alive) return;
  if (sourceEnt) {
    this._lastDamageSource = sourceEnt;
    // ★ 死亡结算/回放读取的是 player._lastDamageSource；旧版只写了 world 上的字段，
    //   所以任何死亡都会显示“未知”。这里同时记录到玩家实体上。
    player._lastDamageSource = sourceEnt;
  }

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

  // ★ 爆炸/破片/震撼：巨响与耳鸣，耳鸣期间外界声音明显变小
  if (damageType === 'blast' || damageType === 'explosion') {
    this._applyTinnitus(Math.min(14, 3 + energy / 180), Math.max(0.4, Math.min(1, energy / 600)));
    // 极近距离爆炸：短时听力几乎丧失
    if (energy >= 900) player.status.addEffect('deafened', 5, 1);
  }
  const armorRes = this._applyArmorLayers(player, remaining, pen, part, damageType);  remaining = armorRes.remaining;
  const armorSnapshot = armorRes.snapshot;

  player.status.takeDamage(part, remaining, pen);
  if (damageType === 'blast' && remaining >= 900) player.status.blood = 0;
  player.taken += remaining;
  player._lastHitSrcX = srcX;
  player._lastHitSrcZ = srcZ;
  player._lastHitSrcY = sourceEnt && sourceEnt.body
    ? sourceEnt.body.position.y + (sourceEnt.body.halfH || 1.2) * 0.8
    : (player.body.position.y + 1.2);
  // ★ 本体被攻击立刻退出无人机操控：不能一边本体挨打一边继续远程操控
  if (player._controllingDrone) {
    this._exitDroneControl('本体遭到攻击，无人机链路断开');
  }
  this._triggerOnHitPassives(player, energy);

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

  if (damageType !== 'explosion' && damageType !== 'blast') {
    this._spawnDamageNumber(player.body.position.x, player.body.position.z, Math.round(remaining), 'player');
  }
  this._hurtFX();
  this._entityVoice(player, 'hurt', 0.5);
  this.engine.cameraCtl.shake(0.4, 0.15);
  this._playSFX('hurt', { volume: 0.5 });

  if (this._searching) { this._closeSearch(); this._log('搜索被打断', 'r'); }
  // ★ 换弹不再被受伤打断；搜索/拔纤/灭火等动作仍会中断。
  if (this.actionProcess.isRunning() && !this.actionProcess.isRunning('reload')) {
    this.actionProcess.cancel('受伤');
  }

  const wasDowned = player.status.isDowned();
  const ended = this._syncEntityLifecycle(player, true);
  if (!ended) {
    // 覆柔：在“已进入击倒”的同一瞬间尝试把玩家拉回来；失败才保留倒地
    if (wasDowned && !player.isDownedState) {
      this._coveyOnDowned(player);
    } else if (wasDowned && player.isDownedState) {
      this._coveyOnDowned(player);
    }
    if (!wasDowned && player.skillStates && player.skillStates.srdispte) {
      this._srdispteDodge(player, srcX, srcZ);
    }
  }
}

  /* ============================================================
     [生死同步] 每帧根据 status 的真实血液/部位/伤口状态判定
     死亡与击倒，而不是只在“受击瞬间”检查一次。
     这样持续流血、燃烧、玻纤、EMP 等非子弹伤害也能正确致死。
     ============================================================ */
  _syncEntityLifecycle(ent, isPlayer = false) {
    if (!ent || !ent.status || !ent.alive) return false;
    const st = ent.status;

    if (st.isDead()) {
      if (isPlayer) this._playerDown(ent._lastDamageSource || null);
      else {
        const px = this.player && this.player.body ? this.player.body.position.x : ent.body.position.x;
        const pz = this.player && this.player.body ? this.player.body.position.z : ent.body.position.z;
        const dist = Math.round(Math.hypot(px - ent.body.position.x, pz - ent.body.position.z));
        this._killEnemy(ent, ent._damageFromPlayer || 0, dist, ent._lastDamageByPlayer !== false);
      }
      return true;
    }

    const downed = st.isDowned();
    if (downed && !ent.isDownedState) this._setEntityDowned(ent, true, isPlayer);
    else if (!downed && ent.isDownedState) this._setEntityDowned(ent, false, isPlayer);
    if (downed && isPlayer && !ent._downedAt) ent._downedAt = this.time;
    return false;
  }

  _setEntityDowned(ent, down, isPlayer = false) {
    if (!ent) return;
    ent.isDownedState = !!down;
    if (isPlayer) {
      ent._wasDowned = !!down;
      if (down) {
        this._log('严重受损，已丧失行动能力', 'r');
        // 相机只轻微下沉；旧版 0.8m 下沉 + 0.55m 眼高会把镜头压到地面以下
        this.engine.cameraCtl.setDeathPose(Math.PI / 2 * 0.75, 0.12, 0);
        this._showEffectPopup('击倒·濒死', '💔', false);
      } else {
        ent._downedAt = 0;
        this.engine.cameraCtl.resetDeathPose();
        this._log('恢复行动能力', 'p');
      }
      return;
    }
    if (!ent.body) return;
    if (down) {
      ent.wasCrouching = ent.isCrouching;
      ent.isCrouching = false;
      ent.body.velocity.x = 0;
      ent.body.velocity.z = 0;
      ent.body.height = 0.5;
      ent.body.halfH = 0.25;
      ent.body.position.y = 0.25;
      ent.body.radius = Math.max(ent.body.radius || 1, 1.6);
      if (ent.mesh) ent.mesh.rotation.z = Math.PI / 2;
      const dd = Math.round(Math.hypot(
        (this.player ? this.player.body.position.x : ent.body.position.x) - ent.body.position.x,
        (this.player ? this.player.body.position.z : ent.body.position.z) - ent.body.position.z
      ));
      if (ent._lastDamageByPlayer) {
        this.player.downs = (this.player.downs || 0) + 1;
        this.stats.downs = (this.stats.downs || 0) + 1;
        this._addDownFeed(ent, ent._damageFromPlayer || ent._lastDamageDealt || 0, dd);
      }
      this.combatLog.push({
        type: 'downed', t: this.time,
        target: { name: this.engine.i18n.t(ent.spec.name), faction: ent.spec.faction },
        distance: dd,
        damageContributed: Math.round(ent._damageFromPlayer || 0),
      });
      if (ent.status) ent.status.addEffect('pain', 10, 2);
    } else {
      ent.body.height = 2.4;
      ent.body.halfH = 1.2;
      ent.body.position.y = Math.max(ent.body.position.y, 1.2);
      ent.body.radius = ent.spec.radius || 1;
      if (ent.mesh) ent.mesh.rotation.z = 0;
      ent._downedAt = 0;
    }
  }

  _killEnemy(enemy, dmg, dist, byPlayer = true){
  if (!enemy || !enemy.alive) return;
  dmg = Math.max(0, Number(dmg) || 0);
  dist = Math.max(0, Math.round(Number(dist) || 0));
  enemy.alive = false;
  enemy.isDownedState = false;
  this._entityVoice(enemy, 'death', 0.1);
  if (enemy.isAlly) {
    this._squadSay(enemy.allyName || '队友', '我……先走一步……');
    this._log('队友 ' + (enemy.allyName || '队友') + ' 阵亡', 'r');
  }
  if (enemy.status) {
    enemy.status.blood = 0;
    enemy.status.updateOverallHealth();
  }
  enemy.body.alive = false;
  // ★ 同阵营目睹/听到队友被击杀：立刻进入警戒，而不是继续自顾自巡逻
  //   友方 AI 死亡时不能走这段：否则其他队友会把玩家当成凶手目标
  if (this.enemies && !enemy.isAlly) {
    for (const mate of this.enemies) {
      if (mate === enemy || !mate.alive) continue;
      if (mate.spec.faction !== enemy.spec.faction) continue;
      const d = Math.hypot(mate.body.position.x - enemy.body.position.x, mate.body.position.z - enemy.body.position.z);
      if (d > 28) continue;
      mate.awareness = Math.min(1.2, Math.max(0.8, mate.awareness || 0));
      if (mate.state === 'patrol' || mate.state === 'investigate' || mate.state === 'loot') {
        mate.state = 'combat';
        mate.stateT = 0;
        mate.reactionTimer = Math.min(mate.reactionTimer || 0.5, 0.5);
        mate.targetEntity = this.player;
        mate.targetPos = { x: enemy.body.position.x, z: enemy.body.position.z };
      }
    }
  }
  this.physics.remove(enemy.body);
  // ★ 倒地动画交给 _syncMeshes 每帧驱动，避免 setTimeout 与帧循环冲突
  enemy.deathTimer = 0.6;
  enemy.deathTotal = 0.6;
  enemy.deathStartY = enemy.mesh ? enemy.mesh.position.y : 0;
  // ★ 只有玩家击杀才计入战绩/任务/击杀提示，友军互殴/误杀队友不冒领
  if (byPlayer && !enemy.isAlly) {
    this.player.kills++;
    this.stats.kills++;
    if (this.training && this.trainingStats) {
      this.trainingStats.kills++;
      if (this.trainingStats.fightStart > 0) {
        this.trainingStats.lastTtk = this.time - this.trainingStats.fightStart;
      }
      this.trainingStats.fightStart = 0;
    }
    this.tasks.progress('kill', 1, { faction: enemy.spec.faction });
    this._addKillFeed(enemy, Math.round(dmg), dist);
  }
  this.combatLog.push({
  type: 'kill',
  t: this.time,
  target: {
    name: this.engine.i18n.t(enemy.spec.name),
    faction: enemy.spec.faction,
    isBoss: false,
    isElite: enemy.spec.rank === 'elite' || enemy.spec.rank === 'leader',
  },
  distance: dist,
  damageContributed: dmg,
  byPlayer: !!byPlayer,
});
  this._spawnSpark(enemy.body.position.x, enemy.body.position.z);
  this._processModeHook('onEnemyKilled', enemy);

  // 训练人偶不生成搜刮箱/尸体箱，避免挡住靶场视线；模型本身保留倒地
  if (enemy.trainingDummy) return;

  // ★ 尸体生成：同步所有武器/护甲状态，并生成可搜刮实体
  if (!enemy.lootInv) enemy.lootInv = new Inventory(this.engine.content);
  if (enemy.lootInv) {
    const lootInv = enemy.lootInv;
    // 主/副武器：按 _wUids 精确回写，避免 AI 切枪后尸体上只剩一把枪
    for (const slot of ['primary', 'secondary']) {
      const w = enemy.weapons && enemy.weapons[slot];
      const uid = enemy._wUids && enemy._wUids[slot];
      if (!w || !uid || !w.loaded) continue;
      const wItem = lootInv.items.get(uid);
      if (wItem && wItem.loaded) {
        wItem.loaded.qty = w.loaded.qty;
        wItem.loaded.queue = [...(w.loaded.queue || [])];
      }
    }
    // 当前武器若是从地上捡来的，也补一把进尸体背包，避免“枪消失”
    if (enemy.weapon && enemy.weapon.def && !enemy.weapon.def.melee) {
      const known = Object.values(enemy._wUids || {}).some(uid => {
        const it = lootInv.items.get(uid);
        return it && it.defId === enemy.weapon.defId;
      });
      if (!known && enemy.weapon.defId) {
        const nuid = lootInv.createItem('weapons', enemy.weapon.defId, {
          loadedQty: enemy.weapon.mag || 0,
        });
        if (nuid) lootInv.addToContainer('bag', nuid);
      }
    }

    const armorMap = { shell: 'helmetShell', visor: 'helmetVisor', fiber: 'vestFiber' };
    for (const slot in armorMap) {
      const uid = lootInv.equipped[armorMap[slot]];
      if (uid && enemy.armor[slot]) {
        const aItem = lootInv.items.get(uid);
        if (aItem) aItem.dur = enemy.armor[slot].dur;
      }
    }
    // 插板现在嵌在护甲纤维里；旧数据仍可能在 vestPlate 槽
    if (enemy.armor.plate) {
      const fiberItem = lootInv.equipped.vestFiber ? lootInv.items.get(lootInv.equipped.vestFiber) : null;
      const plateUid = (fiberItem && fiberItem.subSlots && fiberItem.subSlots.plate) || lootInv.equipped.vestPlate;
      if (plateUid) {
        const pItem = lootInv.items.get(plateUid);
        if (pItem) pItem.dur = enemy.armor.plate.dur;
      }
    }

    const lx = enemy.body.position.x;
    const lz = enemy.body.position.z;
    const lootMesh = this.engine.meshes.build('container', { color: 0xaa4444 });
    lootMesh.position.set(lx, 0, lz);
    this.engine.renderer.scene.add(lootMesh);

    const fDef = this.engine.content.get('factions', enemy.spec.faction);
    const corpseObj = {
      x: lx,
      z: lz,
      mesh: lootMesh,
      label: (fDef ? '[' + this.engine.i18n.t(fDef.short) + '] ' : '') + this.engine.i18n.t(enemy.spec.name) + ' 的尸体',
      isCorpse: true,
      lootInv,
      faction: enemy.spec.faction,
      grid: null,
      searched: true
    };
    this.groundLoots.push(corpseObj);
    this.pois.push({ x: lx, z: lz, type: 'container', color: '#ff5555' });
  }
}

  // 阵营方框：击杀/击倒提示里放在兵种名前面
  _factionChip(factionId) {
    const f = this.engine.content.get('factions', factionId);
    if (!f) return '';
    const color = f.css || '#ffffff';
    const label = this.engine.i18n.t(f.short);
    return `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:5px;padding:1px 5px;border:1px solid ${color};border-radius:3px;background:rgba(0,0,0,.35);color:${color};font-size:9px;font-weight:700;letter-spacing:.5px;vertical-align:middle"><span style="display:inline-block;width:7px;height:7px;background:${color};box-shadow:0 0 4px ${color}"></span>${this._esc(label)}</span>`;
  }

_addKillFeed(enemy, dmg, dist) {
  const feed = document.getElementById('kill-feed');
  if (!feed) return;
  const spec = enemy && enemy.spec ? enemy.spec : { name: '', faction: 'unknown' };
  const el = document.createElement('div');
  el.style.cssText = 'background:rgba(0,0,0,0.68); padding:4px 10px; border-left:3px solid #ff5a5a; border-radius:4px; animation: slideIn 0.2s ease-out;';
  el.innerHTML = `击败 ${this._factionChip(spec.faction)}<b style="color:#ff8b7b">${this.engine.i18n.t(spec.name)}</b> <span style="color:#aaa;font-size:11px;">(${dist}m · 累计 ${Math.round(dmg)} 伤害)</span>`;
  feed.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s';
    setTimeout(() => el.remove(), 500);
  }, 3000);
  while (feed.children.length > 5) feed.removeChild(feed.firstChild);
}

  // ★ 击倒提示（与击杀区分颜色），并保证不会撑爆面板
  _addDownFeed(enemy, dmg, dist) {
    const feed = document.getElementById('kill-feed');
    if (!feed) return;
    const spec = enemy && enemy.spec ? enemy.spec : { name: '', faction: 'unknown' };
    const el = document.createElement('div');
    el.style.cssText = 'background:rgba(0,0,0,0.68); padding:4px 10px; border-left:3px solid #ffb74a; border-radius:4px; animation: slideIn 0.2s ease-out;';
    el.innerHTML = `击倒 ${this._factionChip(spec.faction)}<b style="color:#ffd08a">${this.engine.i18n.t(spec.name)}</b> <span style="color:#aaa;font-size:11px;">(${dist}m · 累计 ${Math.round(dmg)} 伤害)</span>`;
    feed.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.5s';
      setTimeout(() => el.remove(), 500);
    }, 3000);
    while (feed.children.length > 6) feed.removeChild(feed.firstChild);
  }

  // ★ AI 搜刮：从尸体/容器里换更好的枪、甲，并补同口径弹药
  _aiLoot(enemy, target, kind) {
    if (!enemy || !target) return;
    const playerInv = this.engine.app ? this.engine.app.inventory : null;
    const srcInv = kind === 'corpse' ? target.lootInv : playerInv;
    if (!srcInv) return;

    const candidates = [];
    if (kind === 'corpse') {
      for (const it of srcInv.items.values()) candidates.push(it);
    } else if (kind === 'container' && target.grid) {
      for (const uid of target.grid.items.keys()) {
        const it = srcInv.items.get(uid);
        if (it) candidates.push(it);
      }
    }
    if (candidates.length === 0) return;
    const getDef = (it) => srcInv.getDef(it);

    const stashOld = (uid) => {
      if (!uid) return;
      if (!enemy.lootInv.addToContainer('chest', uid).ok) {
        enemy.lootInv.addToContainer('bag', uid);
      }
    };

    // 从世界容器取物前，先从它自己的网格摘除，避免 containers.loot 指向别处时留下幽灵占格
    const prep = (uid) => {
      if (kind === 'container' && target.grid) {
        srcInv._vacate(target.grid, uid);
        if (srcInv.parentOf.get(uid) === 'c:loot') srcInv.parentOf.set(uid, null);
      }
    };

    // 1) 换更好的主武器
    const curVal = (enemy.weapon && enemy.weapon.def) ? (enemy.weapon.def.value || 0) : 0;
    let bestW = null, bestWv = curVal;
    for (const it of candidates) {
      if (it.table !== 'weapons') continue;
      if (it.damaged) continue;
      const def = getDef(it);
      if (!def) continue;
      const v = def.value || 0;
      if (v > bestWv * 1.15) { bestWv = v; bestW = it; }
    }
    if (bestW) {
      prep(bestW.uid);
      const r = srcInv.transferItem(enemy.lootInv, bestW.uid, 'eq:main');
      if (r.ok) {
        stashOld(r.swapped);
        const w = this._buildWeaponFromInventory(enemy.lootInv, 'main');
        if (w) {
          enemy.weapon = w;
          if (enemy.weapons) enemy.weapons.primary = w;
          enemy.currentSlot = 'primary';
          if (enemy._wUids) enemy._wUids.primary = enemy.lootInv.equipped.main;
          enemy.fireCd = 0.6;
        }
      }
    }

    // 2) 换更好的护甲
    const armorMap = {
      helmetShell: { eq: 'helmetShell', slot: 'shell' },
      helmetVisor: { eq: 'helmetVisor', slot: 'visor' },
      vestFiber: { eq: 'vestFiber', slot: 'fiber' },
      vestPlate: { eq: 'vestPlate', slot: 'plate' },
    };
    for (const table in armorMap) {
      const { eq, slot } = armorMap[table];
      const curLv = (enemy.armor && enemy.armor[slot]) ? (enemy.armor[slot].lv || 0) : 0;
      let bestA = null, bestLv = curLv;
      for (const it of candidates) {
        if (it.table !== table) continue;
        const def = getDef(it);
        if (!def || !def.armorLv || def.armorLv <= bestLv) continue;
        bestLv = def.armorLv; bestA = it;
      }
      if (bestA) {
        const def = getDef(bestA);
        const dur = bestA.dur !== undefined ? bestA.dur : (def.maxDur || 100);
        const max = def.maxDur || 100;
        prep(bestA.uid);
        const r = srcInv.transferItem(enemy.lootInv, bestA.uid, 'eq:' + eq);
        if (r.ok) {
          if (!enemy.armor) enemy.armor = {};
          enemy.armor[slot] = { lv: def.armorLv, dur, max };
          stashOld(r.swapped);
        }
      }
    }

    // 3) 补同口径弹药（转移到胸挂，重建武器会自动计入）
    if (enemy.weapon && enemy.weapon.def) {
      const cal = enemy.weapon.def.ammoType;
      for (const it of candidates) {
        if (it.table !== 'ammo') continue;
        const def = getDef(it);
        if (!def || def.caliber !== cal) continue;
        const qty = it.qty || 1;
        prep(it.uid);
        const r = srcInv.transferItem(enemy.lootInv, it.uid, 'chest');
        if (r.ok) {
          try {
            if (typeof enemy.weapon.reserve === 'number') enemy.weapon.reserve += qty;
          } catch (_) { /* getter-only reserve：胸挂弹药已自动计入 */ }
          break;
        }
      }
    }

    // 4) 顺手带走医疗物资（AI 目前不会主动使用，但会保留在尸体/背包里）
    for (const it of candidates) {
      if (it.table !== 'medical') continue;
      prep(it.uid);
      const r = srcInv.transferItem(enemy.lootInv, it.uid, 'bag');
      if (r.ok) break;
    }

    // 5) 补充投掷物：会扔雷的 AI 最多捡 2 枚，扔完还能从尸体/箱子里续上
    if (enemy.spec && enemy.spec.ai && (enemy.spec.ai.grenade || 0) > 0) {
      let nadesTaken = 0;
      for (const it of candidates) {
        if (nadesTaken >= 2) break;
        if (it.table !== 'nade') continue;
        if (!srcInv.items.has(it.uid)) continue;
        prep(it.uid);
        const r = srcInv.transferItem(enemy.lootInv, it.uid, 'chest');
        if (r.ok) { nadesTaken++; enemy._nadeCd = 0; enemy._nadeThink = 0; }
      }
    }

    // 如果玩家正开着这个容器的搜刮界面，刷新一下
    const bu = this.engine.app && this.engine.app.bagUI;
    if (bu && bu.open && bu._lootTarget === target) bu.refresh();
  }

 _playerDown(sourceEnt){
const p = this.player;
if (!p || !p.alive) return;
this._entityVoice(p, 'death', 0.1);
if (!sourceEnt) sourceEnt = p._lastDamageSource || this._lastDamageSource || null;
// 死亡时把真实生理状态也推到“死亡”，否则 HUD 仍会显示濒死/危殆，
// 并且状态条不会归零（这是旧版“假死”观感的根因之一）。
if (p.status) {
  p.status.blood = 0;
  p.status.updateOverallHealth();
}
p.isDownedState = true;
p._wasDowned = true;
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
this._removeHeldThrowable();
this._clearThrowPreview();
this._closeNadeWheel(false);
// 死亡瞬间关闭技能屏幕特效，避免闭眼/回放时残留粉色/橙色滤镜
const _fxS = document.getElementById('fx-skill');
if (_fxS) { _fxS.style.opacity = '0'; _fxS.style.boxShadow = ''; }
const _fxL = document.getElementById('fx-skill-lines');
if (_fxL) _fxL.classList.remove('on');
p._controllingDrone = false;
if (p.mesh) p.mesh.visible = false;
const _hud = document.getElementById('hud');
if (_hud) _hud.classList.remove('drone-mode');
const _dh = document.getElementById('drone-hud');
if (_dh) _dh.classList.remove('on');
if (!p._downedLogged) {
  p._downedLogged = true;
  this.combatLog.push({
    type: 'downed',
    t: this.time,
    self: true,
  });
}
p.alive = false;
p.deadAt = this.time;
// ★ 不再自动播放回放：直接进入正常死亡闭眼；录像存入死亡记录，供"查看死亡回放"按钮使用
const kc = (sourceEnt && sourceEnt !== p && sourceEnt.spec) ? sourceEnt : null;
this._deathReplayFrames = null;
this._deathReplayKiller = null;
this._killcamKiller = null;
this._killcamUntil = 0;
const replayFrames = this._replayBuf.slice(-Math.round(12 * this._replayFps));
// 在录像末尾补一个“倒地”帧，让回放能看见自己中弹倒下，而不是最后还站着
if (replayFrames.length) {
  const last = replayFrames[replayFrames.length - 1];
  const fall = {
    t: last.t + 0.28,
    p: {
      x: last.p.x, y: last.p.y, z: last.p.z, angle: last.p.angle,
      alive: false, downed: true,
      hp: last.p.hp, blood: last.p.blood,
      effects: Array.isArray(last.p.effects) ? last.p.effects.slice() : [],
    },
    enemies: last.enemies.map(e => ({ ...e })),
  };
  replayFrames.push(fall);
}
const killerIdx = kc ? this.enemies.indexOf(kc) : -1;
this._deathRecord = {
  killerName: kc && kc.spec ? this.engine.i18n.t(kc.spec.name) : '未知',
  killerIdx,
  frames: replayFrames.length >= 2 ? replayFrames : [],
  shots: this._replayShots.slice(-120),
  fx: this._replayFx.slice(-160),
  time: this.time,
  killerFaction: kc && kc.spec ? kc.spec.faction : '',
};
// ★ 死亡事件（此前只有 downed，没有 death）
this.combatLog.push({
  type: 'death', t: this.time,
  killer: kc && kc.spec ? this.engine.i18n.t(kc.spec.name) : '未知',
  killedBy: kc && kc.spec ? (kc.spec.faction || '') : '',
  killerFaction: kc && kc.spec ? kc.spec.faction : '',
});
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

// ★ 确保眼皮图层存在；直接闭眼
this._ensureEyelids();

setTimeout(() => {
  this._end(false);
}, 2000);
}

  _showKillcamLabel(killer) {
    let el = document.getElementById('killcam-label');
    if (!el) {
      el = document.createElement('div');
      el.id = 'killcam-label';
      el.style.cssText = 'position:absolute;left:50%;top:9%;transform:translateX(-50%);z-index:70;padding:6px 18px;background:rgba(0,0,0,.62);border:1px solid rgba(255,90,90,.6);border-radius:6px;color:#ff9b8b;font-size:13px;letter-spacing:2px;pointer-events:none;font-weight:700';
      const gs = document.getElementById('game-screen');
      if (gs) gs.appendChild(el); else document.body.appendChild(el);
    }
    const name = killer && killer.spec ? this.engine.i18n.t(killer.spec.name) : '敌人';
    el.textContent = '死亡回放 · ' + name + ' 视角';
    el.style.display = 'block';
  }

  _hideKillcamLabel() {
    const el = document.getElementById('killcam-label');
    if (el) el.style.display = 'none';
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

  // ★ 统一清空全屏表现层。
  //   死亡时 _updateDeathCamera 会把 fx-filter 写成暗红蒙版、把眼皮合上；
  //   回放/重开/退出时必须一次性复位，否则回放会带着“自己重伤”的 HUD 蒙版。
  _resetScreenFx() {
    this._clearEyelids();
    const filterEl = document.getElementById('fx-filter');
    if (filterEl) {
      filterEl.style.background = '';
      filterEl.style.opacity = '';
      filterEl.style.backdropFilter = '';
    }
    const vignEl = document.getElementById('fx-vignette');
    if (vignEl) vignEl.style.opacity = '0';
    const couplingEl = document.getElementById('fx-coupling');
    if (couplingEl) {
      couplingEl.style.boxShadow = 'none';
      couplingEl.style.opacity = '';
    }
    const hitEl = document.getElementById('fx-hit-flash');
    if (hitEl) {
      hitEl.style.opacity = '0';
      hitEl.style.background = '';
    }
    const skillEl = document.getElementById('fx-skill');
    if (skillEl) {
      skillEl.style.opacity = '0';
      skillEl.style.boxShadow = '';
      skillEl.style.background = '';
    }
    const linesEl = document.getElementById('fx-skill-lines');
    if (linesEl) linesEl.classList.remove('on', 'fast');
    const blindEl = document.getElementById('blind-overlay');
    if (blindEl) blindEl.style.opacity = '0';
    const dazzleEl = document.getElementById('dazzle-overlay');
    if (dazzleEl) { dazzleEl.classList.remove('hands'); dazzleEl.style.opacity = '0'; }
    const hazardEl = document.getElementById('hazard-overlay');
    if (hazardEl) { hazardEl.className = ''; hazardEl.style.opacity = '0'; }
    const flashEl = document.getElementById('flash-overlay');
    if (flashEl) flashEl.style.opacity = '0';
    const droneEl = document.getElementById('drone-interference');
    if (droneEl) {
      droneEl.classList.remove('on');
      droneEl.style.opacity = '0';
    }
    this._droneFeedGlitch = 0;
    const staticEl = document.getElementById('drone-static');
    if (staticEl) staticEl.style.opacity = '0';
    document.getElementById('action-progress')?.classList.remove('on');
    document.getElementById('extract-progress')?.classList.remove('on');
    const dmgCanvas = document.getElementById('dmg-indicator');
    if (dmgCanvas) {
      const ctx = dmgCanvas.getContext && dmgCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, dmgCanvas.width, dmgCanvas.height);
    }
    const hitMarker = document.getElementById('hit-marker');
    if (hitMarker) hitMarker.style.opacity = '0';
  }

// ★ 死亡相机每帧驱动：快速后仰倒地 + 撞击震屏 + 闭眼
_updateDeathCamera(dt) {
  const p = this.player;
  if (!p || p.alive) return;
  if (p.deathStartedAt === undefined && !this._killcamKiller && !this._deathReplayFrames) return;

  // ★ 录像式死亡回放：按击杀者最近约 3 秒的录像插值播放
  if (this._deathReplayFrames && this.time < this._deathReplayUntil) {
    const frames = this._deathReplayFrames;
    if (frames.length >= 2) {
      const f = Math.max(0, (this.time - this._deathReplayStart) / 0.08);
      const i0 = Math.max(0, Math.min(frames.length - 2, Math.floor(f)));
      const i1 = Math.min(frames.length - 1, i0 + 1);
      const a = Math.max(0, Math.min(1, f - i0));
      const A = frames[i0], B = frames[i1];
      const cam = this.engine.renderer.camera;
      cam.position.set(
        A.x + (B.x - A.x) * a,
        A.y + (B.y - A.y) * a,
        A.z + (B.z - A.z) * a
      );
      cam.lookAt(
        A.ax + (B.ax - A.ax) * a,
        A.ay + (B.ay - A.ay) * a,
        A.az + (B.az - A.az) * a
      );
      this._updateEyelids(0);
      this._showKillcamLabel(this._deathReplayKiller);
      return;
    }
  }
  if (this._deathReplayFrames) {
    this._deathReplayFrames = null;
    this._deathReplayKiller = null;
    this._hideKillcamLabel();
    p.deathStartedAt = this.time;
  }

  // ★ 回退：击杀者实时 POV
  const kc = this._killcamKiller;
  if (kc && this.time < this._killcamUntil) {
    const cam = this.engine.renderer.camera;
    const eyeY = kc.body.position.y + (kc.body.halfH || 1.2) * 0.75;
    cam.position.set(kc.body.position.x, eyeY, kc.body.position.z);
    cam.lookAt(p.body.position.x, p.body.position.y + 0.15, p.body.position.z);
    this._updateEyelids(0);
    this._showKillcamLabel(kc);
    return;
  }
  if (kc) {
    this._killcamKiller = null;
    this._hideKillcamLabel();
    p.deathStartedAt = this.time; // 回放结束，开始正常倒地/闭眼
  }

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

  // 回放里的第一人称枪模（替代敌人身上的黑色枪管方块）
  _buildReplayGun(killer){
    const cam = this.engine.renderer.camera;
    if (this._replayGun) {
      cam.remove(this._replayGun);
      this._replayGun.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      this._replayGun = null;
      this._replayMuzzle = null;
    }
    if (!killer) return;
    const g = new THREE.Group();
    const gunColor = (killer && killer.weapon && killer.weapon.def && killer.weapon.def.color) || 0x2b3542;
    const bodyMat = new THREE.MeshStandardMaterial({ color: gunColor, metalness: 0.55, roughness: 0.45 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.4, roughness: 0.6 });
    const handMat = new THREE.MeshStandardMaterial({ color: 0xd9a77a, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.11, 0.62), bodyMat);
    body.position.z = -0.26;
    g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.68);
    g.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.19, 0.10), darkMat);
    grip.position.set(0, -0.13, 0.03);
    grip.rotation.x = -0.22;
    g.add(grip);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.22), bodyMat);
    stock.position.set(0, -0.01, 0.14);
    g.add(stock);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.14), handMat);
    hand.position.set(0, -0.11, 0.04);
    g.add(hand);
    const muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.95 })
    );
    muzzle.position.set(0, 0.03, -0.9);
    muzzle.visible = false;
    g.add(muzzle);
    g.position.set(0.24, -0.20, -0.38);
    cam.add(g);
    this._replayGun = g;
    this._replayMuzzle = muzzle;
  }

  // ===================== 死亡回放（整场快照重建） =====================
  _startReplay(frames, killerName, shots, killerIdx, fxEvents){
    if (!frames || frames.length < 2) return false;
    if (this._nadeWheelOpen) this._closeNadeWheel(false);
    if (document.pointerLockElement) document.exitPointerLock();
    this._hideKillcamLabel();
    // ★ 关键：死亡时残留的眼皮、暗红蒙版、受击闪光、技能滤镜必须先清掉
    this._resetScreenFx();
    this._replayFrames = frames;
    this._replayName = killerName || '敌人';
    this._replayShots = (shots || []).slice();
    this._replayFxEvents = (fxEvents || []).slice();
    this._replayKillerIdx = (killerIdx !== undefined && killerIdx !== null) ? killerIdx : -1;
    this._replayT = 0;
    this._replayDur = Math.min(12, (frames.length - 1) / (this._replayFps || 10));
    this._replayStartT = frames[0].t;
    this._replayShotCursor = 0;
    this._replayFxCursor = 0;
    this._replayRecoil = 0;
    this._replayLastHp = null;
    this._replayDmgTimer = null;
    this.lastHitTime = -10;
    this._replayKillerFaction = '';
    const killerEnt = this._replayKillerIdx >= 0 ? this.enemies[this._replayKillerIdx] : null;
    if (killerEnt && killerEnt.spec) this._replayKillerFaction = killerEnt.spec.faction || '';
    this.replayMode = true;
    this.running = true;
    this.paused = false;
    // ★ 回放里不能出现战术聊天/队内建议标记：它们属于当前战局 UI，不是死亡记录
    this._squadOrder = null;
    this._clearSquadMarkers();
    const _chatEl = document.getElementById('squad-chat');
    if (_chatEl) _chatEl.style.display = 'none';
    // 回放时把玩家实体显示出来：击杀者视角必须能看见“我”
    if (this.player && this.player.mesh) this.player.mesh.visible = true;
    this._removeHeldThrowable();
    this._closeNadeWheel(false);
    // 第一人称枪模挂在相机上，回放必须隐藏，否则画面里会飘着一把枪
    if (this.player && this.player.weaponGroup) {
      this._replayWeaponVisible = this.player.weaponGroup.visible;
      this.player.weaponGroup.visible = false;
    }
    this._buildReplayGun(killerEnt);
    // 击杀者本体在回放里隐藏，否则第一人称视角会看到自己的头/枪管黑块
    this._replayHiddenKiller = killerEnt || null;
    this._replayKillerWasVisible = killerEnt && killerEnt.mesh ? killerEnt.mesh.visible : true;
    if (killerEnt && killerEnt.mesh) killerEnt.mesh.visible = false;
    const hud = document.getElementById('hud');
    if (hud) {
      hud.style.visibility = '';
      hud.classList.add('replay-hud');
    }
    const mobCtl = document.getElementById('mobile-controls');
    if (mobCtl) mobCtl.style.display = 'none';
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.style.display = 'none';
    const ch = document.getElementById('crosshair');
    if (ch) ch.style.display = '';
    const vig = document.getElementById('fx-vignette');
    if (vig) vig.style.opacity = '0';
    const hf = document.getElementById('fx-hit-flash');
    if (hf) hf.style.opacity = '0';
    const hm = document.getElementById('hit-marker');
    if (hm) hm.style.opacity = '0';
    this._showReplayBar(this._replayName);
    return true;
  }

  _lerp(a, b, t) { return a + (b - a) * t; }

  _applyReplayFrame(A, B, a){
    const p = this.player;
    if (!p) return;
    // 玩家实体
    if (p.mesh) {
      p.mesh.visible = true;
      p.mesh.position.set(
        this._lerp(A.p.x, B.p.x, a),
        this._lerp(A.p.y, B.p.y, a) - (p.body.halfH || 0.9),
        this._lerp(A.p.z, B.p.z, a)
      );
      p.mesh.rotation.y = Math.PI - this._lerp(A.p.angle, B.p.angle, a);
      p.mesh.rotation.z = (A.p.downed || B.p.downed) ? Math.PI / 2 : 0;
    }
    // 所有敌人
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const sa = A.enemies[i];
      const sb = B.enemies[i];
      if (!e.mesh || !sa || !sb) continue;
      e.mesh.visible = !!(sa.alive || sb.alive || sa.downed || sb.downed);
      if (!e.mesh.visible) continue;
      e.mesh.position.set(
        this._lerp(sa.x, sb.x, a),
        this._lerp(sa.y, sb.y, a) - (e.body.halfH || 1.2),
        this._lerp(sa.z, sb.z, a)
      );
      e.mesh.rotation.y = Math.PI / 2 - this._lerp(sa.angle, sb.angle, a);
      e.mesh.rotation.z = (sa.downed || sb.downed) ? Math.PI / 2 : 0;
    }
    // 击杀者本体不显示，画面由第一人称枪模代替
    if (this._replayHiddenKiller && this._replayHiddenKiller.mesh) {
      this._replayHiddenKiller.mesh.visible = false;
    }
    this._applyReplayEffects(A, B, a);
  }

  // 状态 → 角色身上的发光颜色。以后新增持续效果时，在这里补一条即可；
  // 即使不补，也会以默认红色显示，并且头顶状态图标仍然自动出现。
  _replayEffectTint(ids){
    if (!ids || !ids.length) return null;
    const has = (id) => ids.indexOf(id) >= 0;
    if (has('blind')) return { color: 0xffffff, intensity: 0.62 };
    if (has('stun')) return { color: 0x9f8cff, intensity: 0.52 };
    if (has('burning')) return { color: 0xff6a2a, intensity: 0.55 };
    if (has('bleeding') || has('hypovolemia') || has('fracture') || has('pain')) {
      return { color: 0x9a2020, intensity: 0.30 };
    }
    if (has('fiber_acute') || has('fiber_chronic')) return { color: 0x9a6a20, intensity: 0.28 };
    return { color: 0x6a5a8a, intensity: 0.22 };
  }

  _setReplayTint(mesh, ids){
    if (!mesh) return;
    const tint = this._replayEffectTint(ids);
    mesh.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.emissive) return;
      if (tint) {
        o.material.emissive.setHex(tint.color);
        o.material.emissiveIntensity = tint.intensity;
      } else {
        o.material.emissive.setHex(0x000000);
        o.material.emissiveIntensity = 0;
      }
    });
  }

  // 状态图标纹理按 effectId 缓存，避免每次回放重复建 canvas
  _replayBadgeTexture(effectId){
    if (this._replayBadgeTextures.has(effectId)) return this._replayBadgeTextures.get(effectId);
    const def = this.engine.content.get('effects', effectId) || {};
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 64, 64);
      ctx.beginPath();
      ctx.arc(32, 32, 27, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(8,14,22,.82)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = def.positive ? 'rgba(110,224,122,.9)' : 'rgba(255,139,106,.9)';
      ctx.stroke();
      ctx.font = '34px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon || '●', 32, 34);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this._replayBadgeTextures.set(effectId, tex);
    return tex;
  }

  _updateReplayBadges(A, B, a){
    if (!this._replayBadges) this._replayBadges = new Map();
    const entries = [];
    const pSnapA = A && A.p ? A.p : null;
    const pSnapB = B && B.p ? B.p : null;
    if (pSnapA && pSnapB) {
      entries.push({
        key: '__player',
        effects: (pSnapB.effects || pSnapA.effects || []).slice(0, 4),
        x: this._lerp(pSnapA.x, pSnapB.x, a),
        y: this._lerp(pSnapA.y, pSnapB.y, a) + 1.55,
        z: this._lerp(pSnapA.z, pSnapB.z, a),
        visible: !!(pSnapA.alive || pSnapB.alive || pSnapA.downed || pSnapB.downed),
      });
    }
    for (let i = 0; i < this.enemies.length; i++) {
      // 击杀者就是回放摄像机本人，头顶图标会贴在相机上，跳过
      if (i === this._replayKillerIdx) continue;
      const sa = A && A.enemies ? A.enemies[i] : null;
      const sb = B && B.enemies ? B.enemies[i] : null;
      if (!sa || !sb) continue;
      entries.push({
        key: 'e' + i,
        effects: (sb.effects || sa.effects || []).slice(0, 4),
        x: this._lerp(sa.x, sb.x, a),
        y: this._lerp(sa.y, sb.y, a) + 1.35,
        z: this._lerp(sa.z, sb.z, a),
        visible: !!(sa.alive || sb.alive || sa.downed || sb.downed),
      });
    }

    const seen = new Set();
    for (const en of entries) {
      seen.add(en.key);
      let list = this._replayBadges.get(en.key);
      if (!list) { list = []; this._replayBadges.set(en.key, list); }
      for (let j = 0; j < list.length; j++) list[j].visible = false;
      if (!en.visible) continue;
      for (let j = 0; j < en.effects.length; j++) {
        const id = en.effects[j];
        let sprite = list[j];
        if (!sprite) {
          sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            transparent: true, depthTest: false, depthWrite: false,
          }));
          sprite.scale.set(0.58, 0.58, 1);
          sprite.renderOrder = 999;
          this.engine.renderer.scene.add(sprite);
          list[j] = sprite;
        }
        if (sprite.userData.effectId !== id) {
          sprite.userData.effectId = id;
          sprite.material.map = this._replayBadgeTexture(id);
          sprite.material.needsUpdate = true;
        }
        sprite.visible = true;
        const off = (j - (en.effects.length - 1) / 2) * 0.52;
        sprite.position.set(en.x + off, en.y, en.z);
      }
    }
    for (const [key, list] of this._replayBadges) {
      if (seen.has(key)) continue;
      for (const s of list) s.visible = false;
    }
  }

  _applyReplayEffects(A, B, a){
    const pA = A && A.p ? A.p : null;
    const pB = B && B.p ? B.p : null;
    if (pA && pB) this._setReplayTint(this.player && this.player.mesh, pB.effects || pA.effects);
    for (let i = 0; i < this.enemies.length; i++) {
      const sa = A && A.enemies ? A.enemies[i] : null;
      const sb = B && B.enemies ? B.enemies[i] : null;
      if (!sa || !sb) continue;
      this._setReplayTint(this.enemies[i].mesh, sb.effects || sa.effects);
    }
    this._updateReplayBadges(A, B, a);
  }

  _clearReplayBadges(){
    if (!this._replayBadges) return;
    for (const list of this._replayBadges.values()) {
      for (const s of list) {
        this.engine.renderer.scene.remove(s);
        if (s.material) s.material.dispose();
      }
    }
    this._replayBadges.clear();
  }

  _updateReplay(dt){
    this._replayT += dt;
    const frames = this._replayFrames || [];
    if (!frames.length || this._replayT >= this._replayDur) { this._endReplay(); return; }
    const fps = this._replayFps || 10;
    const f = this._replayT * fps;
    const i0 = Math.max(0, Math.min(frames.length - 2, Math.floor(f)));
    const i1 = Math.min(frames.length - 1, i0 + 1);
    const a = Math.max(0, Math.min(1, f - i0));
    const A = frames[i0], B = frames[i1];

    this._applyReplayFrame(A, B, a);

    // 击杀者第一人称视角；没有击杀者（爆炸/坠落）时用玩家侧后方俯视
    const cam = this.engine.renderer.camera;
    const ki = this._replayKillerIdx;
    const kSnapA = ki >= 0 ? A.enemies[ki] : null;
    const kSnapB = ki >= 0 ? B.enemies[ki] : null;
    const pSnap = {
      x: this._lerp(A.p.x, B.p.x, a),
      y: this._lerp(A.p.y, B.p.y, a),
      z: this._lerp(A.p.z, B.p.z, a),
    };
    // 注意：引擎主循环随后会调用 cameraCtl.update()，
    // 所以这里要写 cameraCtl 的 target/yaw/pitch，而不是直接摆相机。
    const ctl = this.engine.cameraCtl;
    let cx, cy, cz, tx, ty, tz;
    if (kSnapA && kSnapB) {
      cx = this._lerp(kSnapA.x, kSnapB.x, a);
      cy = this._lerp(kSnapA.eye, kSnapB.eye, a);
      cz = this._lerp(kSnapA.z, kSnapB.z, a);
      // 用录制时的实际瞄准点，而不是强制 lookAt 玩家，避免“自动锁头”感
      if (kSnapA.aimX !== undefined && kSnapB.aimX !== undefined) {
        tx = this._lerp(kSnapA.aimX, kSnapB.aimX, a);
        ty = this._lerp(kSnapA.aimY, kSnapB.aimY, a);
        tz = this._lerp(kSnapA.aimZ, kSnapB.aimZ, a);
      } else {
        tx = pSnap.x; ty = pSnap.y + 0.55; tz = pSnap.z;
      }
    } else {
      const ang = Math.atan2(pSnap.z - (kSnapA ? kSnapA.z : pSnap.z), pSnap.x - (kSnapA ? kSnapA.x : pSnap.x));
      cx = pSnap.x + Math.cos(ang + Math.PI) * 6;
      cy = pSnap.y + 4.2;
      cz = pSnap.z + Math.sin(ang + Math.PI) * 6;
      tx = pSnap.x; ty = pSnap.y + 0.8; tz = pSnap.z;
    }
    ctl.target.x = cx; ctl.target.y = cy; ctl.target.z = cz;
    const dx = tx - cx, dy = ty - cy, dz = tz - cz;
    const len = Math.hypot(dx, dy, dz) || 1;
    ctl.pitch = Math.asin(Math.max(-1, Math.min(1, dy / len)));
    ctl.yaw = Math.atan2(dx, -dz);
    // 呼吸/瞄准微晃，避免回放像固定机位
    if (kSnapA && kSnapB) {
      ctl.yaw += Math.sin(this._replayT * 1.9) * 0.0022;
      ctl.pitch += Math.cos(this._replayT * 1.35) * 0.0016;
      if (this._replayRecoil > 0.0005) {
        ctl.pitch += this._replayRecoil * 0.7;
        this._replayRecoil *= Math.exp(-dt * 11);
      }
    }
    ctl.deathRoll = 0;
    ctl.deathDrop = 0;
    ctl.deathPitchOffset = 0;
    ctl.setBob(0, 0);
    ctl.setHurtOffset(0, 0);
    cam.fov = 68;
    cam.updateProjectionMatrix();
    this._updateReplayHUD(A, B, a);
    this._applyReplayScreenFx(A, B, a);

    // 回放这段时间内发生的射击：补上曳光弹
    const nowWorldT = this._replayStartT + this._replayT;
    while (this._replayShotCursor < this._replayShots.length &&
           this._replayShots[this._replayShotCursor].t <= nowWorldT) {
      const s = this._replayShots[this._replayShotCursor++];
      const age = nowWorldT - s.t;
      if (age >= 0 && age < 0.25) {
        // 用当前帧的敌人位置重建弹道起点，避免快照/现实坐标错位导致曳光弹偏移
        const eA = A.enemies[s.idx], eB = B.enemies[s.idx];
        let sx = s.x, sy = s.y, sz = s.z;
        if (eA && eB) {
          sx = this._lerp(eA.x, eB.x, a);
          sy = this._lerp(eA.eye, eB.eye, a);
          sz = this._lerp(eA.z, eB.z, a);
        }
        const ex = sx + (s.dx || 0) * (s.dist || 20);
        const ey = sy + (s.dy || 0) * (s.dist || 20);
        const ez = sz + (s.dz || 0) * (s.dist || 20);
        this._spawnTracer(sx, sy, sz, ex, ey, ez, s.idx === ki ? 0xffd08a : 0xff8b7b);
        if (s.idx === ki) {
          this._replayRecoil = Math.min(0.08, this._replayRecoil + 0.035);
          if (this._replayMuzzle) {
            this._replayMuzzle.visible = true;
            setTimeout(() => { if (this._replayMuzzle) this._replayMuzzle.visible = false; }, 55);
          }
          if (s.hitPlayer) this._replayShowHit();
        }
      }
    }

    // 回放这段时间内的瞬时表现：爆炸、闪光球、屏幕闪白
    const fxEvents = this._replayFxEvents || [];
    while (this._replayFxCursor < fxEvents.length &&
           fxEvents[this._replayFxCursor].t <= nowWorldT) {
      this._playReplayFxEvent(fxEvents[this._replayFxCursor++], nowWorldT);
    }

    if (this._replayGun) {
      this._replayGun.position.z = -0.38 + this._replayRecoil * 1.8;
      this._replayGun.rotation.x = this._replayRecoil * 2.2;
    }
    this._updateTracers(dt);

    // 进度条
    const fill = document.getElementById('replay-progress-fill');
    if (fill) fill.style.width = Math.min(100, (this._replayT / this._replayDur) * 100) + '%';
    const timeEl = document.getElementById('replay-time');
    if (timeEl) timeEl.textContent = this._replayT.toFixed(1) + 's / ' + this._replayDur.toFixed(1) + 's';
  }

  _replayShowHit(){
    this._hitMarker(false);
  }

  _updateReplayHUD(A, B, a){
    const ki = this._replayKillerIdx;
    // 没有击杀者（爆炸/坠落/环境死亡）：不要沿用玩家倒地时的濒死 HUD，
    // 清成中性状态，避免回放里还挂着“我”的重伤面板。
    if (ki < 0 || !A.enemies[ki] || !B.enemies[ki]) {
      const nameEl = document.getElementById('player-name');
      if (nameEl) nameEl.textContent = '死亡回放';
      const tagEl = document.getElementById('player-tag');
      if (tagEl) { tagEl.textContent = '无击杀者'; tagEl.style.color = 'var(--dim)'; }
      const hpBar = document.getElementById('hp-bar');
      if (hpBar) { hpBar.style.width = '0%'; hpBar.style.background = '#666'; }
      const hpTxt = document.getElementById('hp-text');
      if (hpTxt) hpTxt.textContent = '—';
      const stam = document.getElementById('stamina-bar');
      if (stam) stam.style.width = '0%';
      const statusBar = document.getElementById('status-bar');
      if (statusBar) statusBar.innerHTML = '';
      const weaponName = document.getElementById('weapon-name');
      if (weaponName) weaponName.textContent = '—';
      const magEl = document.getElementById('ammo-mag');
      if (magEl) magEl.textContent = '0';
      const resEl = document.getElementById('ammo-reserve');
      if (resEl) resEl.textContent = '0';
      const cpRow = document.getElementById('cp-row');
      if (cpRow) cpRow.style.display = 'none';
      const weightRow = document.getElementById('weight-row');
      if (weightRow) weightRow.style.display = 'none';
      const effBar = document.getElementById('effect-bar');
      if (effBar) { effBar.innerHTML = ''; effBar.style.display = 'none'; }
      const cells = document.querySelectorAll('#armor-row .armor-cell');
      for (let i = 0; i < cells.length; i++) {
        const bar = cells[i].querySelector('.armor-bar > i');
        if (bar) bar.style.width = '0%';
        const lv = cells[i].querySelector('.armor-lv');
        if (lv) lv.textContent = '—';
        cells[i].classList.add('empty');
      }
      return;
    }
    const sa = A.enemies[ki], sb = B.enemies[ki];
    const hp = this._lerp(sa.hp || 0, sb.hp || 0, a);
    const blood = this._lerp(sa.blood || 0, sb.blood || 0, a);

    // 直接复用玩家 HUD：左下角色面板 + 右下武器面板 + 状态栏 + 准星
    const nameEl = document.getElementById('player-name');
    if (nameEl) nameEl.textContent = this._replayName || '敌人';
    const tagEl = document.getElementById('player-tag');
    if (tagEl) {
      const f = this.engine.content.get('factions', this._replayKillerFaction);
      tagEl.textContent = f ? this.engine.i18n.t(f.short) : '未知阵营';
      tagEl.style.color = (f && f.css) || 'var(--accent)';
    }
    const hpBar = document.getElementById('hp-bar');
    const hpTxt = document.getElementById('hp-text');
    if (hpBar) {
      hpBar.style.width = Math.max(0, Math.min(100, hp)) + '%';
      hpBar.style.background = hp > 60 ? '#5fd47a' : (hp > 30 ? '#ffd93d' : '#ff6a6a');
    }
    if (hpTxt) hpTxt.textContent = Math.round(hp) + '%';
    const stam = document.getElementById('stamina-bar');
    if (stam) stam.style.width = '100%';
    const cpRow = document.getElementById('cp-row');
    if (cpRow) cpRow.style.display = 'none';
    const weightRow = document.getElementById('weight-row');
    if (weightRow) weightRow.style.display = 'none';
    const effBar = document.getElementById('effect-bar');
    if (effBar) { effBar.innerHTML = ''; effBar.style.display = 'none'; }

    // 与 _renderArmor 同款的四格护甲条
    const slots = ['shell', 'visor', 'fiber', 'plate'];
    const cells = document.querySelectorAll('#armor-row .armor-cell');
    for (let i = 0; i < cells.length && i < slots.length; i++) {
      const cell = cells[i];
      const aArm = (sb.armor && sb.armor[slots[i]]) || { lv: 0, dur: 0 };
      const bar = cell.querySelector('.armor-bar > i');
      const lv = cell.querySelector('.armor-lv');
      const pct = aArm.lv > 0 ? Math.max(0, Math.min(100, aArm.dur)) : 0;
      if (bar) bar.style.width = pct + '%';
      if (lv) lv.textContent = aArm.lv > 0 ? ('Lv' + aArm.lv) : '—';
      cell.classList.toggle('empty', !(aArm.lv > 0));
    }

    const wEl = document.getElementById('weapon-name');
    if (wEl) wEl.textContent = sb.weapon || '—';
    const magEl = document.getElementById('ammo-mag');
    const resEl = document.getElementById('ammo-reserve');
    const nextEl = document.getElementById('next-ammo');
    if (magEl) magEl.textContent = String(sb.mag || 0);
    if (resEl) resEl.textContent = String(sb.reserve || 0);
    if (nextEl) nextEl.textContent = '';
    const carryVal = document.getElementById('carry-value');
    if (carryVal) carryVal.textContent = '—';
    const fm = document.getElementById('fire-mode-btn');
    if (fm) fm.style.display = 'none';

    const st = document.getElementById('status-bar');
    if (st) {
      const ids = (sb.effects || []).slice(0, 10);
      st.innerHTML = ids.map(id => {
        const d = this.engine.content.get('effects', id);
        if (!d) return '';
        const cls = d.positive ? 'pos' : 'neg';
        return `<div class="status-chip ${cls}" title="${this._esc(d.name)}">${d.icon}</div>`;
      }).join('');
    }

    // 与玩家一致的准星/伤害反馈
    this.hud._crosshairSpread = 0.008;
    this.hud._renderDamageIndicator();

    // 击杀者受伤：直接复用玩家的红色边缘/受击闪光
    if (this._replayLastHp !== null && hp < this._replayLastHp - 0.4) {
      const vig = document.getElementById('fx-vignette');
      const hit = document.getElementById('fx-hit-flash');
      if (vig) vig.style.opacity = '0.62';
      if (hit) hit.style.opacity = '0.18';
      clearTimeout(this._replayDmgTimer);
      this._replayDmgTimer = setTimeout(() => {
        this._replayDmgTimer = null;
        if (vig) vig.style.opacity = '0';
        if (hit) hit.style.opacity = '0';
      }, 220);
    }
    this._replayLastHp = hp;
  }

  // 击杀者视角的持续屏幕效果：失明、燃烧、失血。
  // 状态来自快照 effects，因此新增状态只要写入 effects 就会自动生效。
  _applyReplayScreenFx(A, B, a){
    const ki = this._replayKillerIdx;
    if (ki < 0) return;
    const sa = A && A.enemies ? A.enemies[ki] : null;
    const sb = B && B.enemies ? B.enemies[ki] : null;
    if (!sa || !sb) return;
    const ids = sb.effects || sa.effects || [];
    const has = (id) => ids.indexOf(id) >= 0;
    const hp = this._lerp(sa.hp || 0, sb.hp || 0, a);
    const blood = this._lerp(sa.blood || 0, sb.blood || 0, a);

    // 失明：直接复用玩家闪光弹的全屏白/黑蒙版
    const blindEl = has('blind') ? this._ensureBlindOverlay() : document.getElementById('blind-overlay');
    if (blindEl) {
      blindEl.style.transition = 'opacity .12s';
      blindEl.style.opacity = has('blind') ? '0.82' : '0';
    }

    // 失血/低血量：轻度边缘红雾；燃烧时加强
    const vig = document.getElementById('fx-vignette');
    if (vig) {
      let op = 0;
      if (hp > 0 && hp < 70) op = Math.min(0.55, (70 - hp) / 70 * 0.55);
      if (blood > 0 && blood < 45) op = Math.max(op, Math.min(0.62, (45 - blood) / 45 * 0.62));
      if (has('hypovolemia')) op = Math.max(op, 0.55);
      if (has('burning')) op = Math.max(op, 0.42);
      // 受击闪红由 _updateReplayHUD 的 220ms 计时器控制，这里只做持续底噪
      if (!this._replayDmgTimer) vig.style.opacity = String(op);
    }
  }

  _endReplay(){
    if (!this.replayMode) return;
    this.replayMode = false;
    this.running = false;
    this._replayFrames = null;
    this._replayFxEvents = null;
    this._clearReplayBadges();
    this._resetScreenFx();
    this._setReplayTint(this.player && this.player.mesh, null);
    for (const e of this.enemies) this._setReplayTint(e.mesh, null);
    if (this.player && this.player.mesh) this.player.mesh.visible = false;
    if (this.player && this.player.weaponGroup) {
      this.player.weaponGroup.visible = this._replayWeaponVisible !== false;
    }
    if (this._replayGun) {
      this.engine.renderer.camera.remove(this._replayGun);
      this._replayGun.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      this._replayGun = null;
      this._replayMuzzle = null;
    }
    if (this._replayHiddenKiller && this._replayHiddenKiller.mesh) {
      this._replayHiddenKiller.mesh.visible = this._replayKillerWasVisible !== false;
    }
    this._replayHiddenKiller = null;
    clearTimeout(this._replayHitTimer);
    clearTimeout(this._replayDmgTimer);
    this._replayDmgTimer = null;
    this._replayHitTimer = null;
    const hud = document.getElementById('hud');
    if (hud) { hud.style.visibility = ''; hud.classList.remove('replay-hud'); }
    const chatEl = document.getElementById('squad-chat');
    if (chatEl) chatEl.style.display = '';
    this._clearSquadMarkers();
    const vig = document.getElementById('fx-vignette');
    if (vig) vig.style.opacity = '0';
    const hf = document.getElementById('fx-hit-flash');
    if (hf) hf.style.opacity = '0';
    const cpRow = document.getElementById('cp-row');
    if (cpRow) cpRow.style.display = '';
    const weightRow = document.getElementById('weight-row');
    if (weightRow) weightRow.style.display = '';
    const el = document.getElementById('replay-overlay');
    if (el) el.remove();
    if (this.engine.app && this.engine.app._onReplayEnd) this.engine.app._onReplayEnd();
  }

  _showReplayBar(name){
    let el = document.getElementById('replay-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'replay-overlay';
      el.style.cssText = 'position:fixed;inset:0;z-index:430;pointer-events:none';
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<div style="position:absolute;left:50%;top:18px;transform:translateX(-50%);padding:6px 18px;background:rgba(0,0,0,.76);border:1px solid rgba(255,90,90,.55);border-radius:6px;color:#ff9b8b;font-size:13px;letter-spacing:2px;font-weight:700;white-space:nowrap">死亡回放 · ' + this._esc(String(name)) + ' 视角</div>' +
      '<div style="position:absolute;left:50%;bottom:74px;transform:translateX(-50%);width:min(460px,72vw);height:6px;background:rgba(0,0,0,.72);border:1px solid rgba(255,120,120,.45);border-radius:4px;overflow:hidden"><div id="replay-progress-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#ff6a6a,#ffd08a)"></div></div>' +
      '<div id="replay-time" style="position:absolute;left:50%;bottom:52px;transform:translateX(-50%);color:#ffb0a0;font-size:11px;font-family:ui-monospace,monospace">0.0s</div>' +
      '<button id="replay-close" style="position:absolute;left:50%;bottom:18px;transform:translateX(-50%);pointer-events:auto;padding:8px 24px;border-radius:8px;background:rgba(40,80,130,.85);border:1px solid rgba(110,180,255,.6);color:#cfe8ff;font-size:13px;cursor:pointer;font-family:inherit">关闭回放</button>';
    const btn = document.getElementById('replay-close');
    if (btn) btn.onclick = () => this._endReplay();
  }

  _updateEnemies(dt){
    for (const e of this.enemies) {
      if (!e.alive) continue;
      // 单个 AI 状态异常不应让整张地图的 AI 停止更新；只记录一次堆栈。
      try {
        AISystem.update(this, e, dt);
      } catch (err) {
        if (!e._aiErrorLogged) {
          e._aiErrorLogged = true;
          console.warn('[AI] 更新失败，已隔离该单位:', e.spec && e.spec.name, err);
        }
      }
    }
    this._updateStatusVfx(dt);
  }

  // 玻纤/燃烧的实体特效：不是只改数值，身上要能看出来
  _updateStatusVfx(dt){
    for (const e of this.enemies) {
      if (!e.alive || !e.mesh || !e.status) continue;
      const burning = e.status.hasEffect('burning');
      const fiber = e.status.hasEffect('fiber_acute') || e.status.hasEffect('fiber_chronic');
      let v = this._hazardVfx.get(e);
      if (!v && (burning || fiber)) {
        const g = new THREE.Group();
        const flames = [];
        for (let i = 0; i < 5; i++) {
          const m = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffcc55 : 0xff5a1a, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false });
          const mesh = new THREE.Mesh(new THREE.ConeGeometry(.10 + Math.random() * .08, .35 + Math.random() * .35, 6), m);
          mesh.position.set((Math.random() - .5) * .55, .5 + Math.random() * 1.4, (Math.random() - .5) * .55);
          mesh.userData.phase = Math.random() * Math.PI * 2;
          mesh.userData.ox = (Math.random() - .5) * .45;
          mesh.userData.oz = (Math.random() - .5) * .45;
          g.add(mesh); flames.push(mesh);
        }
        const shards = [];
        for (let i = 0; i < 7; i++) {
          const m = new THREE.MeshBasicMaterial({ color: 0xd8b47a, transparent: true, opacity: .9 });
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(.025, .11, .025), m);
          mesh.position.set((Math.random() - .5) * .65, .75 + Math.random() * .95, (Math.random() - .5) * .65);
          mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
          g.add(mesh); shards.push(mesh);
        }
        const light = new THREE.PointLight(0xff6a2a, 0, 4, 2);
        light.position.y = 1.1;
        g.add(light);
        e.mesh.add(g);
        v = { group: g, flames, shards, light };
        this._hazardVfx.set(e, v);
      }
      if (!v) continue;
      const burningParts = burning ? Object.keys(e.status.burningParts || {}) : [];
      const partY = { head: 1.95, thorax: 1.5, abdomen: 1.15, larm: 1.5, legs: .55 };
      v.flames.forEach((f, i) => {
        const pt = burningParts[i];
        f.visible = burning && !!pt;
        if (!pt) return;
        f.userData.baseY = partY[pt] || 1.1;
        f.position.x = f.userData.ox || 0;
        f.position.z = f.userData.oz || 0;
      });
      v.shards.forEach(s => { s.visible = fiber; });
      v.light.visible = burning;
      v.light.intensity = burning ? 2.2 + Math.sin(this.time * 12) * .8 : 0;
      if (burning) {
        for (const f of v.flames) {
          if (!f.visible) continue;
          const ph = this.time * 10 + (f.userData.phase || 0);
          f.scale.y = .8 + Math.sin(ph) * .25;
          f.position.y = (f.userData.baseY || 1.1) + Math.sin(ph * .7) * .10;
          f.material.opacity = .55 + Math.sin(ph * 1.3) * .2;
        }
      }
    }
    // 已死亡/移除的实体清掉挂件
    for (const [e, v] of this._hazardVfx) {
      if (!e.alive) { if (v.group.parent) v.group.parent.remove(v.group); this._hazardVfx.delete(e); }
    }
  }

  // ★ 全场快照：记录玩家与所有敌人的位置/朝向/生死，供死亡回放重建场景
  _recordReplayFrame(dt){
    const p = this.player;
    if (!p || !p.alive) return;
    if (this.time - (this._lastReplaySnapAt || 0) < 1 / this._replayFps) return;
    this._lastReplaySnapAt = this.time;
    const snap = {
      t: this.time,
      p: {
        x: p.body.position.x, y: p.body.position.y, z: p.body.position.z,
        angle: p.angle || 0, alive: p.alive, downed: !!(p.status && p.status.isDowned()),
        hp: p.status ? p.status.healthQuality : 0,
        blood: p.status ? p.status.blood / p.status.maxBlood * 100 : 0,
        effects: p.status ? Array.from(p.status.effects.keys()) : [],
      },
      enemies: this.enemies.map(e => ({
        x: e.body.position.x, y: e.body.position.y, z: e.body.position.z,
        angle: e.angle || 0, alive: !!e.alive,
        downed: !!(e.isDownedState || (e.status && e.status.isDowned())),
        eye: e.body.position.y + (e.body.halfH || 1.2) * 0.75,
        hp: e.status ? e.status.healthQuality : 0,
        blood: e.status ? e.status.blood / e.status.maxBlood * 100 : 0,
        effects: e.status ? Array.from(e.status.effects.keys()) : [],
        weapon: e.weapon && e.weapon.def ? this.engine.i18n.t(e.weapon.def.name) : '—',
        mag: e.weapon && typeof e.weapon.mag === 'number' ? e.weapon.mag : 0,
        reserve: e.weapon && typeof e.weapon.reserve === 'number' ? e.weapon.reserve : 0,
        aimX: (e.targetEntity && e.targetEntity.body && ['combat', 'melee', 'retreat', 'drone'].includes(e.state))
          ? e.targetEntity.body.position.x : (e.body.position.x + Math.cos(e.angle || 0) * 16),
        aimY: (e.targetEntity && e.targetEntity.body && ['combat', 'melee', 'retreat', 'drone'].includes(e.state))
          ? (e.targetEntity.body.position.y + 0.35) : (e.body.position.y + (e.body.halfH || 1.2) * 0.75),
        aimZ: (e.targetEntity && e.targetEntity.body && ['combat', 'melee', 'retreat', 'drone'].includes(e.state))
          ? e.targetEntity.body.position.z : (e.body.position.z + Math.sin(e.angle || 0) * 16),
        armor: {
          shell: { lv: e.armor && e.armor.shell ? e.armor.shell.lv : 0, dur: e.armor && e.armor.shell ? e.armor.shell.dur : 0 },
          visor: { lv: e.armor && e.armor.visor ? e.armor.visor.lv : 0, dur: e.armor && e.armor.visor ? e.armor.visor.dur : 0 },
          fiber: { lv: e.armor && e.armor.fiber ? e.armor.fiber.lv : 0, dur: e.armor && e.armor.fiber ? e.armor.fiber.dur : 0 },
          plate: { lv: e.armor && e.armor.plate ? e.armor.plate.lv : 0, dur: e.armor && e.armor.plate ? e.armor.plate.dur : 0 },
        },
      })),
    };
    this._replayBuf.push(snap);
    // 只保留最近 15 秒
    const cutoff = this.time - 15;
    while (this._replayBuf.length && this._replayBuf[0].t < cutoff) this._replayBuf.shift();
    while (this._replayShots.length && this._replayShots[0].t < cutoff) this._replayShots.shift();
    while (this._replayFx.length && this._replayFx[0].t < cutoff) this._replayFx.shift();
  }

  // 记录一次敌方开火事件，回放时重放曳光弹
  _recordReplayShot(owner, endX, endY, endZ, hitPlayer){
    if (!owner || owner === this.player) return;
    const idx = this.enemies.indexOf(owner);
    if (idx < 0) return;
    const ox = owner.body.position.x;
    const oy = owner.body.position.y + (owner.body.halfH || 1.2) * 0.75;
    const oz = owner.body.position.z;
    const dx = endX - ox, dy = endY - oy, dz = endZ - oz;
    const dist = Math.hypot(dx, dy, dz) || 1;
    this._replayShots.push({
      t: this.time, idx,
      x: ox, y: oy, z: oz,
      dx: dx / dist, dy: dy / dist, dz: dz / dist, dist,
      hitPlayer: !!hitPlayer,
    });
    if (this._replayShots.length > 300) this._replayShots.shift();
  }

  // 记录一次“表现事件”，回放时按时间轴重放。
  // 与快照里的 effects 分工：持续性状态读 effects，瞬时表现走这里。
  _recordReplayFx(type, data){
    if (!this._replayFx) this._replayFx = [];
    this._replayFx.push({ t: this.time, type, data: data || {} });
    if (this._replayFx.length > 240) this._replayFx.shift();
  }

  _playReplayFxEvent(ev, nowWorldT){
    if (!ev || !ev.data) return;
    const d = ev.data;
    const age = nowWorldT - ev.t;
    if (age < 0 || age > 0.9) return;
    // 静默播放：不再次写回录像
    const prevMuted = this._replayFxMuted;
    this._replayFxMuted = true;
    try {
      if (ev.type === 'explosion') {
        this._spawnExplosionFX(d.x, d.y, d.z, true);
      } else if (ev.type === 'flash') {
        this._spawnFlashFX(d.x, d.y, d.z, d.color, true);
      } else if (ev.type === 'screenflash') {
        this._flashScreen(d.intensity);
      } else if (ev.type === 'aura') {
        this._spawnSkillAura({ body: { position: { x: d.x, y: d.y, z: d.z }, halfH: d.halfH || 0.9 } }, d.color, d.duration);
      }
    } finally {
      this._replayFxMuted = prevMuted;
    }
  }

  // ★ 敌人视角录像：约 12.5Hz，保留最近约 3.6 秒，供死亡回放
  _recordEnemyCam(e){
    if (!e || !e.alive || !e.body) return;
    if (this.time - (e._camT || 0) < 0.08) return;
    e._camT = this.time;
    const bx = e.body.position.x, bz = e.body.position.z;
    const eyeY = e.body.position.y + (e.body.halfH || 1.2) * 0.75;
    let ax, ay, az;
    const t = e.targetEntity;
    if (t && t.body && t.alive) {
      ax = t.body.position.x; ay = t.body.position.y; az = t.body.position.z;
    } else {
      ax = bx + Math.cos(e.angle) * 12;
      ay = eyeY;
      az = bz + Math.sin(e.angle) * 12;
    }
    e._camBuf = e._camBuf || [];
    e._camBuf.push({ t: this.time, x: bx, y: eyeY, z: bz, ax, ay, az });
    if (e._camBuf.length > 160) e._camBuf.shift(); // 约 12.8 秒
  }

  _updateExtracts(dt){
    if (this.training) return; // 靶场不触发撤离倒计时
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
  // 容器的自动探测和搜索逻辑迁移到 _updateNearbyList
}

_scanNearby() {
  const p = this.player;
  if (!p || !p.alive) return [];
  const results = [];
  const R = 6.0;

  for (const c of this.containers) {
    const d = Math.hypot(p.body.position.x - c.x, p.body.position.z - c.z);
    if (d < R) results.push({ kind: 'container', ref: c, dist: d, label: c.label || this.engine.i18n.t('ui.nearby.container') });
  }
  for (const c of this.groundLoots) {
    const d = Math.hypot(p.body.position.x - c.x, p.body.position.z - c.z);
    if (d < R) {
      const label = c.isCorpse
        ? this.engine.i18n.t('ui.nearby.corpse')
        : (c.label || this.engine.i18n.t('ui.nearby.ground'));
      results.push({ kind: c.isCorpse ? 'corpse' : 'ground', ref: c, dist: d, label });
    }
  }

  // 尸体/地面物品优先于普通容器，避免周围箱子多时把玩家刚丢的东西挤掉
  results.sort((a, b) => {
    const pa = a.kind === 'container' ? 1 : 0;
    const pb = b.kind === 'container' ? 1 : 0;
    return pa - pb || a.dist - b.dist;
  });
  return results.slice(0, 8);
}

_updateNearbyList() {
  const el = document.getElementById('nearby-list');
  if (!el) return;
  if (!this.player || !this.player.alive) {
    if (this._nearbySig !== '') { this._nearbySig = ''; el.innerHTML = ''; }
    return;
  }

  const list = this._scanNearby();

  // ★ 只有列表内容变化时才重绘，避免每帧重建 DOM 干扰点击
  const sig = list.map(i => i.kind + ':' + Math.round(i.dist) + ':' + (i.ref.label || '')).join('|');
  if (sig === this._nearbySig) return;
  this._nearbySig = sig;

  if (list.length === 0) {
    el.innerHTML = '';
    return;
  }

  const i18n = this.engine.i18n;
  let html = '';
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    let name;
    if (item.kind === 'container') {
      name = item.label;
    } else if (item.kind === 'corpse') {
      name = item.ref.label || item.label;
    } else {
      name = item.ref.label || item.label;
    }
    const icon = item.kind === 'container' ? '📦' : (item.kind === 'corpse' ? '💀' : '🎁');
    html += `<div class="nb-item" data-idx="${i}">` +
            `<span class="nb-icon">${icon}</span>` +
            `<span class="nb-name">${this._esc(name)}</span>` +
            `<span class="nb-dist">${i18n.t('ui.nearby.distance', { d: Math.round(item.dist) })}</span>` +
            `</div>`;
  }
  el.innerHTML = html;

  el.querySelectorAll('.nb-item').forEach(itemEl => {
    itemEl.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const idx = parseInt(itemEl.dataset.idx, 10);
      if (isFinite(idx) && list[idx]) {
        this._openNearbyContainer(list[idx]);
      }
    });
  });
}

_openNearbyContainer(entry) {
  if (!entry) return;
  const target = entry.ref;
  if (target && target.isWeaponRack) {
    const app = this.engine.app;
    if (app && app._openTrainingWeaponRack) app._openTrainingWeaponRack();
    return;
  }

  if (entry.kind === 'corpse') {
    if (!target.lootInv) target.lootInv = new Inventory(this.engine.content);
    this.engine.app.bagUI.openLoot(target);
    return;
  }

  const inv = this.engine.app.inventory;
  const grid = this._ensureLootGrid(target, 8, 6);

  // ★ 切到当前容器网格：旧容器里未取走的物品会先解除 c:loot 归属，
  //   避免"上一个容器物品变成幽灵、这个容器显示不出来"的反复 bug。
  this._bindLootGrid(grid);

  if (grid.items.size === 0 && target.searched) {
    this._log('容器已空', 'y');
    return;
  }

  this.engine.app.bagUI.openLoot(target);
}

  // 生成（或复用）容器/地面物品网格，返回网格
  _ensureLootGrid(target, w, h) {
    if (target.grid) return target.grid;
    const inv = this.engine.app.inventory;
    // ★ 生成新网格前，先解除旧 loot 网格物品的 c:loot 归属（防幽灵物品）
    const old = inv.containers.loot;
    if (old && old !== target.grid) {
      for (const uid of old.items.keys()) {
        if (inv.parentOf.get(uid) === 'c:loot') inv.parentOf.set(uid, null);
      }
    }
    target.grid = new GridContainer(w, h);
    inv.containers.loot = target.grid;

    let items = [];
    if (target.loot && target.loot.length > 0) items = target.loot;
    else if (target.revealed && target.revealed.length > 0) items = target.revealed;
    else if (!target.searched) items = this._generateLootSpecs(target.type);

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
    target.loot = [];
    target.revealed = [];
    target.searched = true;
    target.opened = true;
    return target.grid;
  }

  // 把指定网格绑定为当前 loot 容器，并维护 parentOf 一致性
  _bindLootGrid(grid) {
    const inv = this.engine.app.inventory;
    if (inv.containers.loot !== grid) {
      const old = inv.containers.loot;
      if (old) {
        for (const uid of old.items.keys()) {
          if (inv.parentOf.get(uid) === 'c:loot') inv.parentOf.set(uid, null);
        }
      }
      inv.containers.loot = grid;
    }
    for (const uid of grid.items.keys()) {
      inv.parentOf.set(uid, 'c:loot');
    }
  }

  // ★ 警觉提示系统（屏幕中上）：level 为警觉度门槛，低于角色警觉度才会显示
  addAlert(level, text, duration = 3) {
    // 去重：相同文案刷新持续时间
    const existing = this._alerts.find(a => a.text === text);
    if (existing) { existing.ttl = Math.max(existing.ttl, duration); existing.level = level; return; }
    this._alerts.push({ level, text, ttl: duration });
  }

  _tickAlerts(dt) {
    // ★ 警觉提示只由「技能标记」等显式来源产生（如以后侦查技能调用 addAlert）。
    //   不再因为 AI 发现玩家就自动警告——那不符合仿真，也无信息量。
    for (let i = this._alerts.length - 1; i >= 0; i--) {
      this._alerts[i].ttl -= dt;
      if (this._alerts[i].ttl <= 0) this._alerts.splice(i, 1);
    }
    this._renderAlerts();
  }

  _renderAlerts() {
    const el = document.getElementById('alert-bar');
    if (!el) return;
    const p = this.player;
    const alertness = (p && p.charSpec && p.charSpec.alertness) || 1;
    const visible = this._alerts.filter(a => a.level <= alertness);

    const sig = visible.map(a => a.level + ':' + a.text).join('|');
    if (this._alertSig === sig) return;
    this._alertSig = sig;

    if (visible.length === 0) { el.innerHTML = ''; return; }

    // 横向排列，超过 3 条时右边用三点省略
    const MAX = 3;
    let html = '';
    for (let i = 0; i < Math.min(visible.length, MAX); i++) {
      html += `<div class="alert-chip">⚠ ${this._esc(visible[i].text)}</div>`;
    }
    if (visible.length > MAX) html += `<div class="alert-more">…</div>`;
    el.innerHTML = html;
  }

   _esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

_generateLootSpecs(typeId){
  const specs = [];
  // ★ 容器类型决定概率表：数据全部来自 content.containers，game.js 不再写死“物资容器只有一种”
  const type = typeId ? this.engine.content.get('containers', typeId) : null;
  const weights = (type && type.weights) || { ammo: 30, weapons: 8, armor: 10, valuables: 14, medical: 8, attach: 8, nade: 12 };
  const cr = (type && type.count) || [1, 3];
  const count = cr[0] + Math.floor(Math.random() * Math.max(1, cr[1] - cr[0] + 1));
  const pool = [];
  for (const [cat, w] of Object.entries(weights)) {
    for (let i = 0; i < Math.max(0, w | 0); i++) pool.push(cat);
  }
  const pick = (arr) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  const content = this.engine.content;

  const makeAmmo = () => {
    const r = Math.random();
    const gfTypes = ['9mm_gf', 'glassfiber', '762_gf', '762x54_gf', '45acp_gf', '12ga_gf'];
    const at = r < 0.55 ? pick(['9mm', '5.56', '7.62', '762x54', '.45acp', '12ga', '.357'])
      : (r < 0.78 ? 'ap556' : (r < 0.9 ? '12ga_slug' : (r < 0.97 ? pick(gfTypes) : 'dragon')));
    const qty = gfTypes.includes(at) || at === 'dragon' ? 3 + Math.floor(Math.random() * 5) : 12 + Math.floor(Math.random() * 42);
    specs.push({ table: 'ammo', defId: at, qty });
  };
  const makeWeapon = () => {
    const wId = pick(['p9', 'p45', 'smg45', 'smg9', 'ak762', 'ar556', 'rev357', 'dmr762', 'lmg556']);
    const wDef = content.get('weapons', wId);
    specs.push({ table: 'weapons', defId: wId, extras: { loadedQty: (wDef && wDef.mag) || 0 } });
  };
  const makeArmor = () => {
    const armorTable = pick(['helmetShell', 'helmetVisor', 'vestFiber', 'vestPlate']);
    const defIds = {
      helmetShell: ['lv3', 'lv4', 'lv5'],
      helmetVisor: ['lv3', 'lv4', 'lv5'],
      vestFiber:   ['lv3', 'lv4', 'lv5'],
      vestPlate:   ['lv4', 'lv5'],
    }[armorTable];
    specs.push({ table: armorTable, defId: pick(defIds) });
  };
  const makeValuable = () => { const v = pick(content.all('valuables') || []); if (v) specs.push({ table: 'valuables', defId: v.id }); };
  const makeMedical = () => {
    const m = pick(content.all('medical') || []);
    if (m) specs.push({ table: 'medical', defId: m.id, qty: Math.min(m.stackLimit || 1, 1 + (Math.random() < 0.3 ? 1 : 0)) });
  };
  const makeAttach = () => { const a = pick(content.all('attach') || []); if (a) specs.push({ table: 'attach', defId: a.id }); };
  const makeNade = () => { specs.push({ table: 'nade', defId: pick(['frag', 'flashbang', 'stun', 'emp', 'molotov', 'stun_impact', 'flash_impact']), qty: 1 }); };

  for (let i = 0; i < count; i++) {
    const cat = pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'ammo';
    if (cat === 'ammo') makeAmmo();
    else if (cat === 'weapons') makeWeapon();
    else if (cat === 'armor') makeArmor();
    else if (cat === 'valuables') makeValuable();
    else if (cat === 'medical') makeMedical();
    else if (cat === 'attach') makeAttach();
    else if (cat === 'nade') makeNade();
  }
  return specs;
}

_startSearch(c){
  if (!c) return;
  this._playSFX('loot', { volume: 0.5 });
  this.emitSound('benign', 0.25, 10, c.x, c.z, 'player', 'player');
  this._searching = true;
  this._searchTimer = 0;
  this._searchTarget = c;
  this._revealInterval = 0.5;

  if (!c.loot) {
    c.loot = this._generateLootSpecs(c.type);
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
  const p = this.player;

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
    if (p) {
      const slotCount = ['primary', 'secondary', 'melee'].filter(s => p.weapons[s] !== null).length;
      switchBtn.style.opacity = slotCount > 1 ? '1' : '0.4';
    }
  }

  // ★ 攻击键：无人机操控时是「标记」，手持投掷物时是「投掷」，否则「攻击」
  const droneMode = !!(p && p._controllingDrone);
  for (const fireBtn of [buttons.fire, buttons.fire_left]) {
    if (!fireBtn) continue;
    const label = droneMode ? '标记' : ((p && p.activeThrowable) ? '投掷' : '攻击');
    if (fireBtn.textContent !== label) fireBtn.textContent = label;
    fireBtn.style.background = droneMode
      ? 'rgba(80,200,255,.42)'
      : ((p && p.activeThrowable) ? 'rgba(255,170,60,.42)' : 'rgba(255,80,80,.4)');
    fireBtn.style.borderColor = droneMode
      ? 'rgba(120,225,255,.9)'
      : ((p && p.activeThrowable) ? 'rgba(255,210,100,.85)' : 'rgba(255,100,100,.8)');
  }
  // 无人机操控时收起人类的换弹/切枪/技能/轮盘按钮
  for (const n of ['reload', 'switchWeapon', 'throwWheel', 'skill1', 'skill2', 'ads', 'holdBreath', 'lean_left', 'lean_right']) {
    if (buttons[n]) buttons[n].style.display = droneMode ? 'none' : '';
  }
  // 尾击按钮只对 Prazer 显示，无人机操控时隐藏
  if (buttons.tailStrike) {
    const canTail = !!(p && p.charSpec && p.charSpec.prazer && !droneMode);
    buttons.tailStrike.style.display = canTail ? '' : 'none';
  }

  // ★ 移动端技能按钮显示真实技能名（永远不再显示「技能1/技能2」或键位字母）
  if (p && p.skills) {
    const SHORT = {
      drone: '无人机', inspire: '激励', srdispte: 'Srdispte', catleap: '猫跃',
      hate: 'Hate', suppress: '压制', radiantReturn: '闪耀回归', backflash: '背闪',
      jump: '跃迁', aimbuff: '精准', dash: '疾行', rally: '鼓舞', shield: '护盾', taunt: '嘲讽',
    };
    const ICONS = { drone: '🛸', inspire: '🎖', srdispte: '🌪', catleap: '🐾', hate: '🔥', suppress: '🎯', radiantReturn: '💎', backflash: '✨', jump: '↗', aimbuff: '🎯', dash: '💨', rally: '🎖', shield: '🛡', taunt: '📢' };
    const setSkill = (btn, sk, idx) => {
      if (!btn) return;
      if (!sk || droneMode) { btn.style.display = 'none'; return; }
      btn.style.display = '';
      const label = SHORT[sk.id] || this.engine.i18n.t(sk.def.name);
      if (btn.textContent !== label) btn.textContent = label;
      btn.style.opacity = sk.ready ? '1' : '0.45';
      btn.style.fontSize = '9px';
      btn.style.overflow = 'hidden';
      btn.style.padding = '0 2px';
      btn.style.lineHeight = '1.1';
      btn.title = (ICONS[sk.id] || '✦') + ' ' + this.engine.i18n.t(sk.def.name) +
        (sk.ready ? '' : ' · 冷却 ' + Math.ceil(sk.cd) + 's') +
        (sk.def.minCoupling ? ' · 需耦合 ' + sk.def.minCoupling + '%' : '');
    };
    setSkill(buttons.skill1, p.skills[0], 0);
    setSkill(buttons.skill2, p.skills[1], 1);
  }

  // ★ 无人机操控中：临时把跳跃/蹲伏按钮改成升/降
  const droneBtn = buttons.droneControl;
  const controlling = !!(p && p._controllingDrone);
  if (buttons.jump) buttons.jump.textContent = controlling ? '升' : '跳跃';
  if (buttons.crouch) buttons.crouch.textContent = controlling ? '降' : '蹲';
  if (droneBtn) {
    droneBtn.style.display = (this.drones && this.drones[0]) || controlling ? '' : 'none';
    droneBtn.textContent = controlling ? '退出' : '无人机';
    droneBtn.style.opacity = controlling ? '1' : '0.85';
  }
}
   
_trySearchContainer(){
  // 已废弃：走 _openNearbyContainer
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
    // 倒地/濒死状态不能再用技能（包括无人机接管）
    if (p.status && p.status.isDowned()) {
      this._log('倒地状态无法使用技能', 'y');
      return;
    }

    // ★ [Profile] 技能启用开关；训练场用自己的开关覆盖
    const skillsAllowed = this.training ? !!this.training.skills : this.engine.profile.get('skills.enabled', true);
    if (!skillsAllowed) {
      this._log(this.training ? '靶场设置中未启用技能' : '当前玩法禁用技能', 'y');
      return;
    }

    const sk = p.skills[slot];
    if (!sk) return;
    const def = sk.def;
    const trainingFree = !!this.training;

    // ★ 无人机技能：已有无人机时改为接管/退出操控。
    //   这一步必须在 ready 检查之前，否则技能冷却中就无法再次按 Q 接管。
    if (def.kind === 'drone' && this.drones && this.drones[0]) {
      this._toggleDroneControl();
      return;
    }
    if (!sk.ready) return;

    // ★ 大招耦合门槛
    if (!trainingFree && def.minCoupling && p.coupling < def.minCoupling) {
      this._log('耦合能不足（需 ' + def.minCoupling + '%）', 'y');
      return;
    }
    // ★ 猫跃允许耦合不足时按比例缩短
    let costRatio = 1;
    if (!trainingFree && def.cost > 0) {
      if (p.coupling < def.cost) {
        if (def.kind === 'catleap') costRatio = p.coupling / def.cost;
        else { this._log('耦合能不足', 'y'); return; }
      }
      p.coupling = Math.max(0, p.coupling - def.cost * costRatio);
    }
    p._leapRatio = costRatio;

    // ★ 冷却 / 充能；靶场可开启无 CD
    if (trainingFree && this.training.noCd) {
      if (def.maxCharges) sk.charges = def.maxCharges;
      sk.cd = 0;
      sk.ready = true;
    } else if (def.maxCharges) {
      if (sk.charges === undefined) sk.charges = def.maxCharges;
      if (sk.charges <= 0) return;
      sk.charges--;
      sk.cd = def.chargeRecover || def.cd;
      sk.ready = sk.charges > 0;
    } else {
      const cdMul = this.engine.profile.get('skills.cooldownReduction', 1.0);
      sk.cd = def.cd * cdMul;
      sk.ready = false;
    }

    this._applySkillEffect(p, def);
    this._log('【' + this.engine.i18n.t(def.name) + '】已触发', 'p');
    this.combatLog.push({
      type: 'skill_use', t: this.time,
      name: this.engine.i18n.t(def.name),
      detail: '',
    });
    this._playSFX('skill');
  }

  _applySkillEffect(p, def){
    const now = this.time;
    p.skillStates = p.skillStates || {};
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
        p.buffs[def.effect] = now + def.duration;
        break;
      }
      case 'healPercent': {
        this._healPlayer(p, p.maxHp * def.percent);
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
      // ===== 队长 =====
      case 'drone': this._spawnDrone(p, def); break;
      case 'inspire':
        // ★ 激励是对“队伍/无人机链路”的指挥增益，不再给玩家本人加数值或状态。
        p.skillStates.inspire = { end: now + def.duration, def };
        this._inspirePulse(p, def);
        break;
      // ===== 凯特 =====
      case 'srdispte': {
        p.skillStates.srdispte = { def, startKills: p.kills || 0, startDowns: p.downs || 0 };
        p.status.addEffect('srdispte', 0.5, 1);
        this._spawnSkillAura(p, 0xff6ec7, 1.2);
        break;
      }
      case 'catleap':
        this._catLeap(p, def);
        p._catleapUntil = now + 1.5;
        p.status.addEffect('catleap', 1.5, 1);
        this._spawnSkillAura(p, 0xffb0d8, 0.6);
        break;
      // ===== 玲娜 =====
      case 'hate':
        p.skillStates.hate = { def };
        p.status.addEffect('hate', 0.5, 1);
        this._spawnSkillAura(p, 0xff7a2a, 1.2);
        break;
      case 'suppress':
        p.skillStates.suppress = { end: now + def.duration, def };
        p.status.addEffect('suppress', def.duration, 1);
        this._suppressEnemies(p, def);
        this._spawnSkillAura(p, 0xffd24a, 0.8);
        break;
      // ===== 叶 =====
      case 'mimicArmor':
        this._startMimic(p, def);
        p.status.addEffect('mimic', def.duration, 1);
        break;
      case 'backflash':
        this._backflash(p, def);
        p.status.addEffect('backflash', def.duration, 1);
        break;
    }
  }

  // ============ 技能周期状态 ============
  _updateSkillStates(dt){
    const p = this.player;
    if (!p || !p.alive) return;
    const now = this.time;
    p.skillStates = p.skillStates || {};

    p.skillSpeedMul = 1;
    p.skillReloadMul = 1;
    p.skillFireRateMul = 1;
    p.skillAdsSpreadMul = 1;
    p.skillNegResist = 0;
    p.skillHandlingMul = 1;
    p._immuneNeg = false;

    const refresh = (id) => { if (p.status) p.status.addEffect(id, 0.25, 1); };
    const clear = (id) => { if (p.status) p.status.removeEffect(id); };

    // ===== 队长：无人机链路 / 被动 =====
    if (this.drones && this.drones[0]) refresh('drone'); else clear('drone');
    const passiveId = p.charSpec && p.charSpec.passive;
    if (passiveId === 'intuition') refresh('intuition'); else clear('intuition');
    if (passiveId === 'adapt') refresh('adapt'); else clear('adapt');

    const ins = p.skillStates.inspire;
    if (ins && now >= ins.end) delete p.skillStates.inspire;
    clear('inspire'); // 激励不挂在玩家本人身上，避免误以为自我增益

    const sup = p.skillStates.suppress;
    if (sup && now >= sup.end) {
      delete p.skillStates.suppress;
      clear('suppress');
      this._log('压制结束', 'y');
    } else if (sup) {
      refresh('suppress');
      p.skillFireRateMul *= 1.1;
      p.skillHandlingMul *= 1.1;
    } else clear('suppress');
    if (p._catleapUntil && now < p._catleapUntil) {
      refresh('catleap');
      p.skillSpeedMul *= 1.15;
    } else clear('catleap');
    if (p._backflashUntil && now < p._backflashUntil) refresh('backflash'); else clear('backflash');

    const srd = p.skillStates.srdispte;
    if (srd) {
      refresh('srdispte');
      p.coupling = Math.max(0, p.coupling - (srd.def.drain || 2) * dt);
      p.skillSpeedMul *= (srd.def.speedMul || 1.32);
      p.skillHandlingMul *= (srd.def.handlingMul || 1.25);
      p.skillAdsSpreadMul *= (srd.def.adsSpreadMul || 0.4);
      if (p.coupling <= 0) {
        delete p.skillStates.srdispte;
        clear('srdispte');
        const kills = (p.kills || 0) - (srd.startKills || 0);
        const downs = (p.downs || 0) - (srd.startDowns || 0);
        this._healPlayer(p, Math.min(0.6, 0.08 * (kills + downs)) * p.status.maxBlood);
        p._weaknessUntil = now + 10;
        p.status.addEffect('weakness', 10, 1);
        this._showEffectPopup('精力虚弱', '🥀', false);
        this._log('Srdispte 结束：精力虚弱（开镜/散布/视野惩罚 10 秒）', 'y');
      }
    } else clear('srdispte');

    const hate = p.skillStates.hate;
    if (hate) {
      refresh('hate');
      p.coupling = Math.max(0, p.coupling - (hate.def.drain || 3) * dt);
      p.skillSpeedMul *= (hate.def.speedMul || 1.45);
      p.skillHandlingMul *= (hate.def.handlingMul || 1.2);
      p.skillReloadMul *= (hate.def.reloadMul || 0.3);
      p.skillFireRateMul *= (hate.def.fireRateMul || 1.5);
      p._immuneNeg = true;
      if (p.coupling <= 0) {
        delete p.skillStates.hate;
        clear('hate');
        p.status.blood = Math.max(1, p.status.blood * (1 - (hate.def.bloodCost || 0.12)));
        for (const eff of p.status.effects.values()) eff.duration += (hate.def.extendDebuff || 6);
        p._hateBacklashUntil = now + 10;
        p.status.addEffect('hate_backlash', 10, 1);
        this._showEffectPopup('血液反噬', '🩸', false);
        this._log('Hate 结束：血液反噬（移速/射击/换弹下降 10 秒）', 'r');
      }
    } else clear('hate');

    if (p._weaknessUntil && now < p._weaknessUntil) {
      refresh('weakness');
      p.skillSpeedMul *= 0.8;
      p.skillHandlingMul *= 0.8;
      p.skillAdsSpreadMul *= 1.5;
      p.skillReloadMul *= 1.15;
    } else clear('weakness');
    if (p._hateBacklashUntil && now < p._hateBacklashUntil) {
      refresh('hate_backlash');
      p.skillSpeedMul *= 0.85;
      p.skillAdsSpreadMul *= 1.3;
      p.skillReloadMul *= 1.2;
      p.skillHandlingMul *= 0.8;
    } else clear('hate_backlash');
    if (p._flashbackUntil && now < p._flashbackUntil) {
      refresh('flashback');
      p.skillSpeedMul *= 0.85;
      p.skillAdsSpreadMul *= 1.4;
      p.skillReloadMul *= 1.15;
    } else clear('flashback');
    if (p._stressUntil) {
      if (now >= p._stressUntil) {
        p._stressUntil = 0;
        clear('stress');
        p._weaknessUntil = Math.max(p._weaknessUntil || 0, now + 6);
      } else {
        refresh('stress');
        p.skillSpeedMul *= 1.15;
        p.skillHandlingMul *= 1.2;
        p.skillAdsSpreadMul *= 0.8;
        p.skillNegResist = Math.max(p.skillNegResist, 0.3);
      }
    } else clear('stress');
    if (p._speedBuffUntil && now < p._speedBuffUntil) p.skillSpeedMul *= 1.2;
    if (p._coveyUntil && now < p._coveyUntil) {
      p.skillNegResist = Math.max(p.skillNegResist, 0.35);
      p.skillSpeedMul *= 1.12;
    }

    if (p._mimicUntil && now >= p._mimicUntil) this._endMimic(p);
    if (p._mimicUntil && now < p._mimicUntil) {
      refresh('mimic');
      p.skillSpeedMul *= (p._mimicSpeedMul || 0.72);
    } else clear('mimic');

    if ((p._coveyLayers || 0) > 0 || (p._coveyUntil && now < p._coveyUntil)) refresh('covey'); else clear('covey');

    this._updateSkillFX(p);
  }

  // 技能持续期间的屏幕边缘氛围光 + 流动能量线
  _updateSkillFX(p){
    const fx = document.getElementById('fx-skill');
    const lines = document.getElementById('fx-skill-lines');
    if (!fx) return;

    let color = '';
    let edge = '';
    let lineColor = '';
    let fast = false;
    let aura = null;
    if (p.skillStates && p.skillStates.srdispte) {
      color = 'rgba(255,90,190,.42)'; edge = 'inset 0 0 110px 22px rgba(255,80,180,.42)';
      lineColor = 'rgba(255,120,210,.6)'; fast = true; aura = 0xff6ec7;
    } else if (p.skillStates && p.skillStates.hate) {
      color = 'rgba(255,120,30,.42)'; edge = 'inset 0 0 110px 22px rgba(255,110,20,.42)';
      lineColor = 'rgba(255,150,50,.6)'; fast = true; aura = 0xff7a2a;
    } else if (p._mimicUntil && this.time < p._mimicUntil) {
      color = 'rgba(255,210,80,.36)'; edge = 'inset 0 0 100px 18px rgba(255,210,80,.38)';
      lineColor = 'rgba(255,225,120,.55)'; aura = 0xffd85a;
    } else if (p.skillStates && p.skillStates.inspire) {
      color = 'rgba(90,255,150,.26)'; edge = 'inset 0 0 90px 14px rgba(90,255,150,.3)';
      lineColor = 'rgba(120,255,170,.45)'; aura = 0x66ff99;
    } else if (p._stressUntil) {
      color = 'rgba(90,180,255,.28)'; edge = 'inset 0 0 90px 14px rgba(90,180,255,.3)';
      lineColor = 'rgba(120,200,255,.45)'; aura = 0x66bbff;
    } else if (p._backflashUntil && this.time < p._backflashUntil) {
      color = 'rgba(255,220,120,.3)'; edge = 'inset 0 0 100px 18px rgba(255,230,140,.34)';
      lineColor = 'rgba(255,235,160,.55)'; aura = 0xffe08a;
    } else if (p._hateBacklashUntil && this.time < p._hateBacklashUntil) {
      color = 'rgba(160,20,20,.34)'; edge = 'inset 0 0 110px 22px rgba(170,15,15,.42)';
      lineColor = 'rgba(220,60,50,.5)'; fast = true; aura = 0xa01010;
    } else if (p._weaknessUntil && this.time < p._weaknessUntil) {
      color = 'rgba(80,120,160,.26)'; edge = 'inset 0 0 90px 16px rgba(70,110,150,.34)';
      lineColor = 'rgba(120,170,210,.4)'; aura = 0x4a7aa0;
    } else if (p._controllingDrone || (this.drones && this.drones[0])) {
      color = 'rgba(80,200,255,.22)'; edge = 'inset 0 0 90px 14px rgba(80,200,255,.24)';
      lineColor = 'rgba(120,225,255,.4)'; aura = 0x66ccff;
    } else if (p.skillStates && p.skillStates.suppress) {
      color = 'rgba(255,200,80,.2)'; edge = 'inset 0 0 80px 12px rgba(255,200,80,.22)';
      lineColor = 'rgba(255,220,120,.4)'; aura = 0xffd24a;
    }

    fx.style.boxShadow = edge;
    fx.style.background = color ? `radial-gradient(circle at 50% 50%, transparent 58%, ${color} 100%)` : '';
    fx.style.opacity = edge ? '1' : '0';
    if (lines) {
      if (color) {
        lines.style.setProperty('--sk-color', lineColor);
        lines.classList.add('on');
        lines.classList.toggle('fast', fast);
      } else {
        lines.classList.remove('on');
        lines.classList.remove('fast');
      }
    }
    p._activeAuraColor = aura;
  }

  // 技能/状态激活瞬间：脚下扩散光环 + 竖向能量柱（廉价但有效）
  _spawnSkillAura(p, color, duration = 1.0){
    if (!p || !p.body) return;
    if (!this._replayFxMuted) {
      this._recordReplayFx('aura', {
        x: p.body.position.x,
        y: p.body.position.y,
        z: p.body.position.z,
        halfH: p.body.halfH || 0.9,
        color: color || 0xffffff,
        duration,
      });
    }
    const scene = this.engine.renderer.scene;
    const group = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.0, 36), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);
    const pillarMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.4, 3.2, 20, 1, true), pillarMat);
    pillar.position.y = 1.6;
    group.add(pillar);
    const footY = p.body.position.y - (p.body.halfH || 0.9) + 0.05;
    group.position.set(p.body.position.x, footY, p.body.position.z);
    scene.add(group);
    const start = performance.now();
    const life = Math.max(300, duration * 1000);
    const step = () => {
      const t = (performance.now() - start) / life;
      if (t >= 1) {
        scene.remove(group);
        ring.geometry.dispose(); ringMat.dispose();
        pillar.geometry.dispose(); pillarMat.dispose();
        return;
      }
      ring.scale.setScalar(1 + t * 5);
      ringMat.opacity = 0.85 * (1 - t);
      pillar.scale.set(1 + t * 0.6, 1 + t * 0.2, 1 + t * 0.6);
      pillarMat.opacity = 0.28 * (1 - t);
      group.rotation.y += 0.04;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ===== 队长：激励（仅对队友生效）=====
  _inspirePulse(p, def){
    const radius = def.radius || 36;
    const duration = def.duration || 9;
    let buffed = 0;
    // 当前版本为单人战局，allies 默认为空；保留通用逻辑，后续加入队友/无人机链路时直接生效。
    for (const a of (this.allies || [])) {
      if (!a || !a.alive || !a.status) continue;
      const d = Math.hypot(a.body.position.x - p.body.position.x, a.body.position.z - p.body.position.z);
      if (d > radius) continue;
      a.status.addEffect('inspire', duration, 1);
      a._inspireUntil = this.time + duration;
      a._inspireNegResist = def.negativeResist || 0.35;
      a._inspireHandling = def.handlingBonus || 0.3;
      buffed++;
    }
    // 无人机视为链路单位，激励期间获得更远扫描半径
    if (this.drones && this.drones[0]) this.drones[0].inspireUntil = this.time + duration;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (p && p.body) this._spawnSkillAura(p, 0x66ff99, 0.55);
      }, i * 90);
    }
    this._log(buffed > 0
      ? ('激励脉冲：' + buffed + ' 名队友获得增益，无人机扫描增强')
      : '激励脉冲：附近没有队友，仅维持无人机链路增益', buffed > 0 ? 'p' : 'y');
  }

  // ===== 玲娜：压制 =====
  _suppressEnemies(p, def){
    const radius = def.radius || 22;
    const halfCone = (def.cone || Math.PI) / 2;
    let hit = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.body.position.x - p.body.position.x;
      const dz = e.body.position.z - p.body.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > radius) continue;
      let ang = Math.atan2(dz, dx);
      let diff = Math.abs(ang - p.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff > halfCone) continue;
      e.suppressedUntil = Math.max(e.suppressedUntil || 0, this.time + (def.duration || 7));
      e.suppressedBy = p;
      e._burstSpread = Math.min(3.2, (e._burstSpread || 1) + 0.9);
      if (e.status) e.status.addEffect('suppressed', def.duration || 7, 1);
      this._spawnSkillAura(e, 0xffd24a, 0.5);
      hit++;
    }
    this._log('压制生效：' + hit + ' 名敌人被压制', hit ? 'p' : 'y');
  }

  _healPlayer(p, amount){
    if (!p || !p.status || amount <= 0) return;
    p.status.blood = Math.min(p.status.maxBlood, p.status.blood + amount);
    for (const k in p.status.parts) {
      const part = p.status.parts[k];
      if (part.hp < part.maxHp) part.hp = Math.min(part.maxHp, part.hp + amount * 0.02);
    }
    p.status.updateOverallHealth();
  }

  // ===== 队长：侦察无人机 =====
  _spawnDrone(p, def){
    this.drones = this.drones || [];
    for (const d of this.drones) this._removeDrone(d);
    this.drones = [];
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.55, 0.22, 0.55);
    const mat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x1a3a55, emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.35 });
    const body = new THREE.Mesh(geo, mat);
    group.add(body);
    // 四旋翼
    for (const [sx, sz] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {
      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12),
        new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.7 })
      );
      rotor.position.set(sx, 0.08, sz);
      group.add(rotor);
    }
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.9, 24),
      new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.18;
    group.add(ring);
    let sy = p.body.position.y + (def.deployHeight || 10);
    // 如果玩家在室内，向上找到不被屋顶/夹层挡住的高度再放飞
    while (sy < 55 && this._droneBlocked(p.body.position.x, sy, p.body.position.z)) sy += 2;
    group.position.set(p.body.position.x, sy, p.body.position.z);
    this.engine.renderer.scene.add(group);
    const d = {
      mesh: group, owner: p,
      battery: 100, maxBattery: 100,
      durability: def.maxDurability || 70, maxDurability: def.maxDurability || 70,
      markTimer: 0, def, alive: true, attackCd: 0, spawnT: this.time,
      // 电磁加固（不是免疫）：EMP 只按 empResist 折算耐久损失
      empHardened: def.empHardened !== false,
      empResist: typeof def.empResist === 'number' ? def.empResist : 1,
      payload: { frag: 2, emp: 2 },
    };
    this.drones.push(d);
    this._droneMark(d);
    if (p.status) p.status.addEffect('drone', 1.0, 1);
    this._spawnSkillAura(p, 0x66ccff, 1.2);
    this._log('侦察无人机已升空：小地图将标记附近敌人，按 Y 接管操控', 'p');
  }

  // ★ 标记唯一入口：同阵营 AI 通过 markedFaction 共享“已发现目标”的位置情报。
  //   以后敌方无人机/敌方侦察技能只要用同一个方法标记，敌方 AI 也会自动使用。
  _markEntity(target, duration, by, faction = 'player') {
    if (!target || !target.alive) return;
    target.markedUntil = Math.max(target.markedUntil || 0, this.time + Math.max(0.1, duration || 0));
    target.markedBy = by || 'mark';
    target.markedFaction = faction;
  }

  _droneMark(d, silent = false){
    const R = (d.def.markRadius || 45) + (d.inspireUntil && this.time < d.inspireUntil ? 12 : 0);
    const hold = (d.def.markInterval || 5) + 2.5;
    let found = 0;
    for (const e of this.enemies) {
      if (!e.alive || e.isAlly) continue; // 无人机只标记敌对目标，不把队友框出来
      const ex = e.body.position.x, ey = e.body.position.y + 0.4, ez = e.body.position.z;
      const dx = ex - d.mesh.position.x, dy = ey - d.mesh.position.y, dz = ez - d.mesh.position.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > R) continue;
      // 无人机不能隔墙透视：墙体/屋顶挡住的目标不标记
      const blocked = this.physics.raycast(
        d.mesh.position.x, d.mesh.position.y, d.mesh.position.z,
        dx, dy, dz, dist,
        body => body.userData && body.userData.type === 'obstacle'
      );
      if (blocked) continue;
      found++;
      this._markEntity(e, hold, 'drone', 'player');
      e.warnings = e.warnings || [];
      if (!silent && (!e._lastDroneWarn || this.time - e._lastDroneWarn > 6)) {
        e._lastDroneWarn = this.time;
        e.warnings.push({ title: '位置暴露', context: '被侦察无人机标记', level: d.def.alertLevel || 3, t: this.time });
        if (e.warnings.length > 4) e.warnings.shift();
      }
      const alertness = (e.spec && e.spec.alertness) || 1;
      if (alertness >= (d.def.alertLevel || 3)) {
        e.awareness = Math.min(1.2, e.awareness + (silent ? 0.01 : 0.12));
      }
    }
    if (!silent && (!d._lastMarkLog || this.time - d._lastMarkLog > 15)) {
      d._lastMarkLog = this.time;
      if (found > 0) this._log('无人机标记 ' + found + ' 个目标', 'p');
      else this._log('无人机未发现目标', 'y');
    }
  }

  _updateDrones(dt){
    if (!this.drones) return;
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i];
      const p = d.owner;
      if (!p || !p.alive) { this._removeDrone(d); this.drones.splice(i, 1); continue; }
      // 退出操控后停在原地悬停，不会自动飞回玩家/初始释放点
      if (!p._controllingDrone) {
        d.mesh.position.y += Math.sin(this.time * 1.8 + (d.spawnT || 0)) * 0.06 * dt;
      }
      d.mesh.rotation.y += dt * 1.5;
      if (d.empGlitch) d.empGlitch = Math.max(0, d.empGlitch - dt * 0.35);
      d.battery -= (d.def.batteryDrain || 3.3) * dt;
      d.markTimer -= dt;
      if (d.markTimer <= 0) {
        d.markTimer = d.def.markInterval || 8;
        this._droneMark(d);
      }
      if (d.battery <= 0) {
        this._log('侦察无人机电量耗尽', 'y');
        this._destroyDrone(d);
        continue;
      }
      if (d.durability <= 0) {
        this._destroyDrone(d);
        continue;
      }
    }
  }

  _toggleDroneControl(){
    const p = this.player;
    if (!p || !p.alive) return;
    if (p.status && p.status.isDowned()) {
      this._log('倒地状态无法操控无人机', 'y');
      return;
    }
    if (!this.drones || !this.drones[0]) {
      this._log('当前没有可用无人机，先使用「侦察无人机」技能', 'y');
      return;
    }
    if (p._controllingDrone) {
      this._exitDroneControl('退出无人机操控');
      return;
    }
    p._controllingDrone = true;
    // 接管时继承无人机自身的电磁干扰余波（例如 EMP 时玩家没在操控）
    const d0 = this.drones && this.drones[0];
    if (d0 && d0.empGlitch) this._droneFeedGlitch = Math.max(this._droneFeedGlitch || 0, d0.empGlitch);
    // 无人机视角下恢复玩家模型，让操控者能看到自己的角色站在释放点
    if (p.mesh) p.mesh.visible = true;
    const hud = document.getElementById('hud');
    if (hud) hud.classList.add('drone-mode');
    const dh = document.getElementById('drone-hud');
    if (dh) dh.classList.add('on');
    p.ads = false;
    p._throwAiming = false;
    p.activeThrowable = null;
    this._clearThrowPreview();
    this._removeHeldThrowable();
    const app = this.engine.app;
    const isTouch = app && (app.platform === 'mobile' || (app.platform === 'auto' && 'ontouchstart' in window));
    this._log(isTouch
      ? '进入无人机操控：左侧摇杆平移 / 「升」「降」/ 点「退出」返回'
      : '进入无人机操控：WASD 平移 / 空格上升 / C 下降 / Y 退出', 'p');
    this._spawnSkillAura(p, 0x66ccff, 0.8);
    this._updateMobileButtons();
  }

  // 统一退出无人机操控。本体被攻击、倒地、无人机失联都走这里，
  // 保证 HUD、相机、移动端按钮不会残留“操控中”状态。
  _exitDroneControl(reason){
    const p = this.player;
    if (!p || !p._controllingDrone) return false;
    p._controllingDrone = false;
    this._clearDroneFeed();
    // 回到第一人称：隐藏自己的身体，避免遮挡视线/穿模
    if (p.mesh) p.mesh.visible = false;
    const hud = document.getElementById('hud');
    if (hud) hud.classList.remove('drone-mode');
    const dh = document.getElementById('drone-hud');
    if (dh) dh.classList.remove('on');
    if (this.engine.cameraCtl && this.engine.cameraCtl.resetDeathPose) {
      this.engine.cameraCtl.resetDeathPose();
    }
    if (reason) this._log(reason, 'y');
    this._updateMobileButtons();
    return true;
  }

  // 手动操控：WASD 水平移动，空格升 / C 降，Y 退出；玩家本体原地不动
  _updateDroneControl(dt, e, p){
    const d = this.drones && this.drones[0];
    if (!d) { this._exitDroneControl('无人机失联，操控中断'); return; }
    const mv = e.input.getMoveVector ? e.input.getMoveVector() : { x: 0, z: 0 };
    const yaw = e.cameraCtl.yaw;
    const fx = Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = Math.sin(yaw);
    const speed = 14;
    const cruise = Math.max(0.35, Math.min(1, d.battery / 25));
    const half = (this.mapSpec ? this.mapSpec.size : 200) / 2 - 2;
    const clampX = (v) => Math.max(-half, Math.min(half, v));
    const clampZ = (v) => Math.max(-half, Math.min(half, v));
    const ox = d.mesh.position.x, oy = d.mesh.position.y, oz = d.mesh.position.z;
    const nx = clampX(ox + (rx * mv.x + fx * (-mv.z)) * speed * cruise * dt);
    const nz = clampZ(oz + (rz * mv.x + fz * (-mv.z)) * speed * cruise * dt);
    const up = e.input.isActive('jump') || e.input.keys.has(' ') || e.input.keys.has('Space');
    const down = e.input.isActive('crouch') || e.input.keys.has('c') || e.input.keys.has('C');
    let ny = oy + (up ? 10 * dt : 0) - (down ? 10 * dt : 0);
    ny = Math.max(1.2, Math.min(55, ny));
    // 与建筑/掩体做实体碰撞，不能穿模
    if (!this._droneBlocked(nx, ny, nz)) {
      d.mesh.position.set(nx, ny, nz);
    } else {
      if (!this._droneBlocked(nx, oy, oz)) d.mesh.position.x = nx;
      if (!this._droneBlocked(d.mesh.position.x, oy, nz)) d.mesh.position.z = nz;
      if (!this._droneBlocked(d.mesh.position.x, ny, d.mesh.position.z)) d.mesh.position.y = ny;
    }
    // 机身随移动倾斜，给一点“在飞”的反馈
    d.mesh.rotation.x += ((-mv.z * 0.35) - d.mesh.rotation.x) * Math.min(1, dt * 6);
    d.mesh.rotation.z += ((-mv.x * 0.35) - d.mesh.rotation.z) * Math.min(1, dt * 6);
    p.body.velocity.x = 0;
    p.body.velocity.z = 0;
    // 操控中持续标记，避免无人机飞到敌人头顶却不刷新
    if (this.time - (d._lastMarkAt || 0) > 0.5) {
      d._lastMarkAt = this.time;
      this._droneMark(d, true);
    }
  }

  _droneBlocked(x, y, z) {
    for (const obs of this.obstacles) {
      const b = obs.body;
      if (!b || b.shape !== 'aabb') continue;
      const y0 = b.yMin !== null && b.yMin !== undefined ? b.yMin : 0;
      const y1 = b.yMax !== null && b.yMax !== undefined ? b.yMax : (b.position.y + (b.height || 0) / 2);
      if (y < y0 - 0.25 || y > y1 + 0.35) continue;
      if (Math.abs(x - b.position.x) < (b.halfW || 0) + 0.35 &&
          Math.abs(z - b.position.z) < (b.halfD || 0) + 0.35) return true;
    }
    return false;
  }

  // 无人机攻击键：光学标记/照射，不再沿用人类的枪械开火
  _droneScanAttack(p){
    const d = this.drones && this.drones[0];
    if (!d || !d.alive) return;
    if (d.attackCd && this.time < d.attackCd) return;
    d.attackCd = this.time + 0.75;
    const cam = this.engine.renderer.camera;
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const hit = this.physics.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, 80,
      body => body.userData && (body.userData.type === 'enemy' || body.userData.type === 'obstacle'));
    const end = hit ? hit.point : origin.clone().add(dir.clone().multiplyScalar(80));
    this._spawnTracer(origin.x, origin.y, origin.z, end.x, end.y, end.z, 0x66e8ff);
    if (hit && hit.body.userData.type === 'enemy') {
      const e = hit.body.userData.ref;
      if (e.isAlly) return; // 别用无人机照射自己的队友
      this._markEntity(e, 12, 'drone_scan', 'player');
      if (e.status) e.status.addEffect('suppressed', 3, 1);
      this._spawnFlashFX(end.x, end.y, end.z, 0x66e8ff);
      this._hitMarker(false);
      this._log('无人机光学标记：' + this.engine.i18n.t(e.spec.name) + '（12 秒）', 'p');
    } else if (hit) {
      this._spawnSpark(end.x, end.y, end.z);
    }
  }

  // 无人机自带的投掷物：2 枚手雷 + 2 枚 EMP
  _droneThrowPayload(p, type) {
    const d = this.drones && this.drones[0];
    if (!d || !d.alive || !d.payload) return;
    const left = d.payload[type] || 0;
    if (left <= 0) { this._log('无人机' + (type === 'frag' ? '手雷' : 'EMP') + '已用尽', 'y'); return; }
    d.payload[type] = left - 1;
    const defId = type === 'emp' ? 'emp' : 'frag';
    const def = this.engine.content.get('nade', defId);
    if (!def) return;
    const cam = this.engine.renderer.camera;
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const origin = new THREE.Vector3(d.mesh.position.x, d.mesh.position.y - 0.25, d.mesh.position.z);
    const geo = new THREE.SphereGeometry(0.16, 8, 6);
    const mat = new THREE.MeshStandardMaterial({ color: def.color || 0x3a3a3a, metalness: 0.4, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    this.engine.renderer.scene.add(mesh);
    this.projectiles.push({
      owner: p, mesh,
      pos: origin.clone(),
      vel: new THREE.Vector3(dir.x * 14, dir.y * 14 + 1.0, dir.z * 14),
      fuse: def.fuse || 2,
      damage: def.damage || 0,
      radius: def.radius || 8,
      def, effect: def.effect,
      name: this.engine.i18n.t(def.name),
    });
    this._spawnFlashFX(origin.x, origin.y, origin.z, 0x66e8ff);
    this._log('无人机投下 ' + this.engine.i18n.t(def.name) + '（剩余 ' + d.payload[type] + '）', 'p');
  }


  _destroyDrone(d){
    if (!d || !d.alive) return;
    d.alive = false;
    const p = this.player;
    if (p && p._controllingDrone) {
      p._controllingDrone = false;
      this._clearDroneFeed();
      if (p.mesh) p.mesh.visible = false;
      const hud = document.getElementById('hud');
      if (hud) hud.classList.remove('drone-mode');
      const dh = document.getElementById('drone-hud');
      if (dh) dh.classList.remove('on');
      this._log('无人机失联，返回本体视角', 'r');
    }
    const ox = d.mesh.position.x, oy = d.mesh.position.y, oz = d.mesh.position.z;
    this._spawnFlashFX(ox, oy, oz, 0xff8844);
    // ★ 无人机被击毁：机上剩余实弹从坠毁点被抛出后殉爆，而不是留一个可搜刮盒子。
    //   弹体走真实 projectiles 物理（会下落/碰墙/引爆），EMP 也会真的炸出电磁场。
    const defs = [];
    if (d.payload) {
      for (const type of Object.keys(d.payload)) {
        const n = Math.max(0, d.payload[type] | 0);
        const defId = type === 'emp' ? 'emp' : (type === 'frag' ? 'frag' : type);
        for (let i = 0; i < n; i++) defs.push(defId);
        d.payload[type] = 0;
      }
    }
    for (let i = 0; i < defs.length; i++) {
      const defId = defs[i];
      const def = this.engine.content.get('nade', defId);
      if (!def) continue;
      const ang = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 5;
      const start = new THREE.Vector3(ox + Math.cos(ang) * 0.25, oy, oz + Math.sin(ang) * 0.25);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 6),
        new THREE.MeshStandardMaterial({ color: def.color || 0x3a3a3a, metalness: 0.5, roughness: 0.5 })
      );
      mesh.position.copy(start);
      this.engine.renderer.scene.add(mesh);
      this.projectiles.push({
        owner: d.owner || this.player, mesh,
        pos: start.clone(),
        vel: new THREE.Vector3(Math.cos(ang) * sp, 1.2 + Math.random() * 2.2, Math.sin(ang) * sp),
        fuse: 0.55 + Math.random() * 0.85,
        damage: def.damage || 0,
        radius: def.radius || 6,
        def, effect: def.effect || 'frag',
        trigger: 'timed',
        fragments: def.fragmentCount || 6,
        life: 8,
        name: this.engine.i18n.t(def.name),
        prev: start.clone(),
        startPos: start.clone(),
        bornAt: this.time,
        armed: true,
      });
    }
    this._spawnExplosionFX(ox, oy, oz);
    this._playSFXAt('explosion', ox, oz, { volume: 0.9, maxDist: 140 });
    this._log(defs.length
      ? '无人机被击毁：' + defs.length + ' 枚机载实弹被抛出，随即殉爆'
      : '无人机被击毁：机载弹药已打空，残骸在空中解体', 'r');
    this._removeDrone(d);
    if (this.drones) {
      const i = this.drones.indexOf(d);
      if (i >= 0) this.drones.splice(i, 1);
    }
    this._updateMobileButtons();
  }

  _removeDrone(d){
    this.engine.renderer.scene.remove(d.mesh);
    d.mesh.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }

  // ===== 通用平滑位移 =====
  _startDash(p, dx, dz, dist, duration, lift = 0) {
    const len = Math.hypot(dx, dz) || 1;
    const half = (this.mapSpec ? this.mapSpec.size : 120) / 2 - 2;
    let useDist = dist;
    // 冲刺不能穿墙：用膝盖/腰/胸三条水平射线取最近障碍，再按身体半径内缩。
    // 只测腰高会从矮墙上方“滑过去”，只测脚底又会漏掉窗台。
    const radius = Math.max(0.35, p.body.radius || 0.8);
    let hitT = Infinity;
    for (const yOff of [0.35, 1.0, 1.65]) {
      const hit = this.physics.raycast(
        p.body.position.x, p.body.position.y + yOff - (p.body.halfH || 1.2), p.body.position.z,
        dx / len, 0, dz / len, dist,
        body => body.userData && body.userData.type === 'obstacle'
      );
      if (hit) hitT = Math.min(hitT, hit.t);
    }
    if (hitT < Infinity) useDist = Math.max(0.2, hitT - radius - 0.08);
    useDist = Math.min(dist, useDist);
    const tx = Math.max(-half, Math.min(half, p.body.position.x + dx / len * useDist));
    const tz = Math.max(-half, Math.min(half, p.body.position.z + dz / len * useDist));
    p._dash = {
      sx: p.body.position.x,
      sz: p.body.position.z,
      tx, tz,
      t: 0,
      dur: Math.max(0.08, duration || 0.18),
    };
    p._dashGraceUntil = this.time + 0.35;
    if (lift > 0) {
      p.body.velocity.y = lift;
      p.body.wake();
    }
  }

  _updateDash(p, dt) {
    const d = p._dash;
    if (!d) return false;
    d.t += dt;
    const k = Math.min(1, d.t / d.dur);
    const e = 1 - Math.pow(1 - k, 3); // ease-out：先快后慢，像滑步
    p.body.position.x = d.sx + (d.tx - d.sx) * e;
    p.body.position.z = d.sz + (d.tz - d.sz) * e;
    p.body.velocity.x = 0;
    p.body.velocity.z = 0;
    if (k >= 1) p._dash = null;
    return true;
  }

  // ===== 凯特：猫跃 =====
  _catLeap(p, def){
    let ax = Math.cos(p.angle), az = Math.sin(p.angle);
    const mv = this.engine.input.getMoveVector ? this.engine.input.getMoveVector() : null;
    if (mv && (Math.abs(mv.x) + Math.abs(mv.z) > 0.1)) {
      const yaw = this.engine.cameraCtl.yaw;
      const fx = Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = Math.cos(yaw), rz = Math.sin(yaw);
      ax = rx * mv.x + fx * -mv.z;
      az = rz * mv.x + fz * -mv.z;
    }
    const ratio = p._leapRatio !== undefined ? p._leapRatio : 1;
    const dist = (def.leap || 6) * ratio;
    this._startDash(p, ax, az, dist, 0.20, 2.8);
  }

  // ===== 叶：拟载护甲 =====
  _startMimic(p, def){
    if (!p.armor) p.armor = {};
    // ★ 直接保存原护具对象引用：JSON 深拷贝会丢掉 item 引用和 dur getter，
    //   导致拟载结束后原护甲耐久与背包数据脱钩。
    p._mimicBackup = {
      shell: p.armor.shell || null,
      visor: p.armor.visor || null,
      fiber: p.armor.fiber || null,
      plate: p.armor.plate || null,
    };
    const lv = def.armorLv || 7;
    const dur = def.durability || 520;
    p.armor = {
      shell: { lv, dur, max: dur, mimic: true, red: 0.99 },
      visor: { lv, dur, max: dur, mimic: true, red: 0.99 },
      fiber: { lv, dur, max: dur, mimic: true, red: 0.99 },
      plate: { lv, dur, max: dur, mimic: true, red: 0.99 },
    };
    p._mimicUntil = this.time + (def.duration || 25);
    p._mimicLock = true;
    p._mimicSpeedMul = def.speedMul || 0.72;
    p.status.addEffect('mimic', def.duration || 25, 1);
    // 背包开着时立刻重绘，让四个护具槽马上变成金色锁定拟载
    const bu = this.engine.app && this.engine.app.bagUI;
    if (bu && bu.open) bu.refresh();
    this._spawnSkillAura(p, 0xffd85a, 1.6);
    this._log('闪耀回归：BYinC 拟载展开（Lv7 / ' + dur + ' 耐久）', 'p');
  }

  _endMimic(p){
    p._mimicUntil = 0;
    p._mimicLock = false;
    p._mimicSpeedMul = 1;
    if (p._mimicBackup) {
      p.armor = {
        shell: p._mimicBackup.shell || { lv: 0, dur: 0, max: 0 },
        visor: p._mimicBackup.visor || { lv: 0, dur: 0, max: 0 },
        fiber: p._mimicBackup.fiber || { lv: 0, dur: 0, max: 0 },
        plate: p._mimicBackup.plate || { lv: 0, dur: 0, max: 0 },
      };
      p._mimicBackup = null;
    }
    if (p.status) p.status.removeEffect('mimic');
    const bu = this.engine.app && this.engine.app.bagUI;
    if (bu && bu.open) bu.refresh();
    this._log('闪耀回归结束：原护具已恢复', 'y');
  }

  // ===== 叶：背闪 =====
  _backflash(p, def){
    const radius = def.flashRadius || 12;
    const flashDur = def.flashDuration || 4.2;
    const peak = def.flashPeak || 1.0;
    // 与闪光弹共用同一套距离/视线衰减、光场和强光刺眼逻辑；自身被排除
    const res = this._applyFlash(p.body.position.x, p.body.position.z, radius, flashDur, peak, p, p.body.position.y + 1.4);
    this._spawnLightField(p.body.position.x, p.body.position.y + 1.4, p.body.position.z, radius, peak, 0xfff2b0);
    this._spawnFlashFX(p.body.position.x, p.body.position.y + 1.4, p.body.position.z, 0xffffff);
    // 让玩家清楚看到被闪到的敌人：白色光球 + 状态图标
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.body.position.x - p.body.position.x, e.body.position.z - p.body.position.z);
      if (d > radius) continue;
      this._spawnFlashFX(e.body.position.x, e.body.position.y + (e.body.halfH || 1.2) * 0.8, e.body.position.z, 0xffffcc);
      e.hitFlash = Math.max(e.hitFlash || 0, 0.6);
      if (e.status && e.status.hasEffect('blind')) this._spawnDamageNumber(e.body.position.x, e.body.position.z, '✦', 'stun');
    }
    // 自身也有一点曝光，但不致盲；身后仍有白色余晖
    this._spawnSkillAura(p, 0xfff2b0, 0.9);
    p._speedBuffUntil = this.time + (def.duration || 6);
    p._backflashUntil = this.time + (def.duration || 6);
    this._flashScreen(res.blind > 0 ? 0.38 : 0.22);
    this._log(res.blind > 0 ? ('背闪！' + res.blind + ' 名敌人失明，' + res.dazzle + ' 名被强光压制') : '背闪！附近没有敌人被闪到', res.blind > 0 ? 'p' : 'y');
  }

  _droneInterference(intensity = 1){
    // 图传链路干扰属于“无人机视角”的效果，不能绑在玩家眼球上：
    // 只有正在操控无人机时才显示；退出/坠毁/断电立即清空。
    const p = this.player;
    if (!p || !p._controllingDrone) return;
    this._droneFeedGlitch = Math.max(this._droneFeedGlitch || 0, Math.min(1, intensity));
    const el = document.getElementById('drone-interference');
    if (el) {
      el.classList.add('on');
      el.style.opacity = String(Math.min(0.9, 0.35 + intensity * 0.45));
    }
    this.engine.cameraCtl.shake(0.8 * intensity, 0.18);
  }

  _clearDroneFeed(){
    this._droneFeedGlitch = 0;
    const el = document.getElementById('drone-interference');
    if (el) { el.classList.remove('on'); el.style.opacity = '0'; }
    const cv = document.getElementById('drone-static');
    if (cv) cv.style.opacity = '0';
  }

  // 图传雪花/马赛克：只在无人机视角下绘制，退出后不会残留在眼睛上
  _updateDroneFeed(dt){
    const p = this.player;
    const controlling = !!(p && p._controllingDrone && this.drones && this.drones[0] && this.drones[0].alive);
    const g = this._droneFeedGlitch || 0;
    if (!controlling || g <= 0.01) {
      if (this._droneFeedGlitch) this._droneFeedGlitch = 0;
      const cv = document.getElementById('drone-static');
      if (cv && cv.style.opacity !== '0') cv.style.opacity = '0';
      const el = document.getElementById('drone-interference');
      if (el && el.classList.contains('on')) { el.classList.remove('on'); el.style.opacity = '0'; }
      return;
    }
    this._droneFeedGlitch = Math.max(0, g - dt * 0.55);
    let cv = document.getElementById('drone-static');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'drone-static';
      cv.width = 160; cv.height = 90;
      cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:416;pointer-events:none;opacity:0;image-rendering:pixelated;mix-blend-mode:screen';
      document.body.appendChild(cv);
    }
    this._feedNoiseT = (this._feedNoiseT || 0) - dt;
    if (this._feedNoiseT <= 0) {
      this._feedNoiseT = 0.07;
      const ctx = cv.getContext('2d');
      if (ctx) {
        const img = ctx.createImageData(cv.width, cv.height);
        const data = img.data;
        const heavy = Math.random() < 0.35 + g * 0.4;
        for (let i = 0; i < data.length; i += 4) {
          // 雪花噪点：随着干扰强度提高，亮噪点比例上升
          const v = Math.random() < (0.18 + g * 0.5) ? 200 + Math.random() * 55 : (heavy ? 40 : 0);
          data[i] = data[i + 1] = data[i + 2] = v;
          data[i + 3] = 200 + Math.random() * 55;
        }
        ctx.putImageData(img, 0, 0);
        // 马赛克花屏块
        ctx.fillStyle = 'rgba(120,220,255,0.18)';
        const blocks = Math.floor(g * 8);
        for (let b = 0; b < blocks; b++) {
          const bw = 8 + Math.random() * 34, bh = 4 + Math.random() * 18;
          ctx.fillRect(Math.random() * cv.width, Math.random() * cv.height, bw, bh);
        }
      }
    }
    cv.style.opacity = String(Math.min(0.9, g));
    const el = document.getElementById('drone-interference');
    if (el) {
      el.classList.add('on');
      el.style.opacity = String(Math.min(0.85, 0.3 + g * 0.5));
    }
  }

  _spawnFlashFX(x, y, z, color, silent){
    if (!silent && !this._replayFxMuted) this._recordReplayFx('flash', { x, y, z, color: color || 0xffffff });
    const geo = new THREE.SphereGeometry(0.35, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: color || 0xffffff, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.engine.renderer.scene.add(mesh);
    const start = performance.now();
    const step = () => {
      const t = (performance.now() - start) / 320;
      if (t >= 1) {
        this.engine.renderer.scene.remove(mesh);
        geo.dispose(); mat.dispose();
        return;
      }
      mesh.scale.setScalar(1 + t * 5);
      mat.opacity = 0.95 * (1 - t);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // 闪光/震撼对 AI：短暂致盲（沉默视野）+ 震撼（枪口抖动）+ 状态标记
  // 闪光/震撼对 AI 与玩家：按距离与视线衰减。亮度足够才失明，
  // 亮度不足但刺眼时进入“强光刺眼”（dazzle），强制退出开镜。
  _applyFlash(x, z, radius, duration, strength, exclude, yOverride){
    const y = yOverride !== undefined ? yOverride : 1.2;
    const entities = [];
    if (this.player && this.player.alive && this.player !== exclude) entities.push({ ent: this.player, isPlayer: true });
    for (const e of this.enemies) {
      if (!e.alive || e === exclude) continue;
      entities.push({ ent: e, isPlayer: false });
    }
    let blindCount = 0, dazzleCount = 0;
    for (const item of entities) {
      const e = item.ent;
      const ey = e.body.position.y + (e.body.halfH || 1.2) * 0.85;
      // ★ 用三维距离：扔到百米高空再“瞟一眼”不应该被闪/震到
      const d = Math.hypot(e.body.position.x - x, ey - y, e.body.position.z - z);
      if (d > radius) continue;
      // 墙体/掩体会切断闪光能量：先做一次真实射线遮挡
      const len = Math.hypot(e.body.position.x - x, ey - y, e.body.position.z - z) || 1;
      const blocked = this.physics.raycast(x, y, z,
        (e.body.position.x - x) / len, (ey - y) / len, (e.body.position.z - z) / len, len,
        body => body.userData && body.userData.type === 'obstacle');
      const los = blocked ? 0.18 : 1;
      // 平方反比式衰减 + 半径线性衰减；闪光弹在 5~8m 仍应明显致盲
      const falloff = Math.max(0, 1 - d / radius);
      const intensity = Math.min(1.2, Math.pow(falloff, 1.05) * los * (strength || 1));
      if (intensity < 0.05) continue;
      const isBlind = intensity >= 0.22;
      const blindT = isBlind ? duration * (0.35 + 0.65 * Math.min(1, intensity)) : 0;
      const dazzleT = Math.max(1.2, duration * 0.55 * intensity);
      // 闪光弹同时有震撼效果：近距/高照度会短暂眩晕 + 耳鸣
      const stunRange = radius * 0.55;
      const stunF = Math.max(0, 1 - d / Math.max(1, stunRange));
      const stunT = stunF > 0 && intensity > 0.35 ? (0.8 + duration * 0.22) * (0.5 + stunF * 0.5) : 0;
      if (item.isPlayer) {
        const p = e;
        if (p._immuneNeg) continue; // Hate：无视一切负面状态
        if (isBlind) {
          p.status.addEffect('blind', blindT, Math.min(2, 1 + intensity));
          this._blindOverlay(blindT, intensity);
          blindCount++;
        } else {
          p.status.addEffect('dazzle', dazzleT, 1);
          this._dazzleScreen(intensity, dazzleT);
          dazzleCount++;
        }
        // 强光/失明期间不允许开镜
        p.ads = false;
        p._adsToggled = false;
        if (p._forceAds) p._forceAds = false;
        p._dazzledUntil = this.time + (isBlind ? blindT : dazzleT);
        this.engine.cameraCtl.shake(0.25 * intensity, 0.12);
        if (stunT > 0) {
          p._stunnedUntil = Math.max(p._stunnedUntil || 0, this.time + stunT);
          p.status.addEffect('stun', stunT, 1);
          this.engine.cameraCtl.shake(0.55 * intensity, 0.28);
        }
        if (isBlind || stunT > 0) this._applyTinnitus(Math.max(2.2, blindT * 0.6), intensity);
        // 玩家自己也会被闪到，但这里只做视线内的亮度衰减，不额外扩大范围
      } else {
        if (isBlind) {
          e.blindedUntil = Math.max(e.blindedUntil || 0, this.time + blindT);
          e.stunnedUntil = Math.max(e.stunnedUntil || 0, this.time + duration * 0.35 * intensity);
          e.awareness = Math.min(e.awareness || 0, 0.25);
          e.targetEntity = null;
          if (e.status) e.status.addEffect('blind', blindT, 1);
          if (e.state === 'combat') {
            e.state = 'flee';
            e.targetPos = AISystem._findCover(this, e, e.targetEntity || this.player);
          }
          blindCount++;
        } else {
          e._dazzledUntil = Math.max(e._dazzledUntil || 0, this.time + dazzleT);
          if (e.status) e.status.addEffect('dazzle', dazzleT, 1);
          e.awareness = Math.max(e.awareness || 0, 0.55);
          dazzleCount++;
        }
        e._burstSpread = Math.min(3.2, (e._burstSpread || 1) + (isBlind ? 1.2 : 0.55));
        if (stunT > 0) {
          e.stunnedUntil = Math.max(e.stunnedUntil || 0, this.time + stunT);
          if (e.status) e.status.addEffect('stun', stunT, 1);
        }
      }
    }
    return { blind: blindCount, dazzle: dazzleCount };
  }

  // 真正的“光场”：点光源 + 扩散球，距离越远照度越低。
  // 不是只给范围内的人贴一个状态。
  _spawnLightField(x, y, z, radius, peak, color = 0xffffff){
    const scene = this.engine.renderer.scene;
    const light = new THREE.PointLight(color, 4 * (peak || 1), Math.max(4, radius * 2.2), 2);
    light.position.set(x, y, z);
    scene.add(light);
    const geo = new THREE.SphereGeometry(0.28, 12, 10);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const start = performance.now();
    const step = () => {
      const t = (performance.now() - start) / 420;
      if (t >= 1) {
        scene.remove(light); scene.remove(mesh);
        geo.dispose(); mat.dispose();
        return;
      }
      light.intensity = 4 * (peak || 1) * (1 - t) * (1 - t);
      mesh.scale.setScalar(1 + t * 9);
      mat.opacity = 0.95 * (1 - t);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _applyEmpField(x, y, z, radius, peak, owner){
    let disrupted = 0, damaged = 0;
    let playerDisrupted = false;
    let playerSurge = false;
    const targets = [];
    if (this.player && this.player.alive) targets.push({ ent: this.player, isPlayer: true });
    for (const e of this.enemies) { if (e.alive) targets.push({ ent: e, isPlayer: false }); }
    for (const t of targets) {
      const e = t.ent;
      const d = Math.hypot(e.body.position.x - x, e.body.position.z - z);
      if (d > radius) continue;
      const f = Math.pow(Math.max(0, 1 - d / radius), 1.5) * (peak || 1);
      if (f < 0.08) continue;
      disrupted++;
      if (e.status) e.status.addEffect('emp_disrupted', 4 + 4 * f, 1);
      if (t.isPlayer) {
        playerDisrupted = true;
        const inv = this.engine.app && this.engine.app.inventory;
        if (inv) {
          const r = inv.applyEmpDamage(1);
          damaged += r.damaged.length;
          // 电磁加固装备没坏，但也被强电磁冲刷：显示“强电磁干扰”
          if (r.damaged.length === 0 && r.spared.length > 0) {
            playerSurge = true;
            if (e.status) e.status.addEffect('emp_silence', 5, 1);
          }
        }
        this._droneInterference(0.8);
        this.engine.cameraCtl.shake(0.7, 0.25);
      } else {
        // 敌人：无加固电子物品损坏；加固设备也可能被击穿，电子击发的枪械失效
        if (e.lootInv) {
          const r = e.lootInv.applyEmpDamage(1);
          damaged += r.damaged.length;
        }
        for (const slot of ['primary', 'secondary']) {
          const w = e.weapons && e.weapons[slot];
          if (!w || !w.def) continue;
          if (w.item && w.item.damaged) w.disabled = true;
          else if (w.def.electronics && !w.def.empShielded) w.disabled = true;
        }
        if (e.weapon && e.weapon.def && e.weapon.def.electronics && !e.weapon.def.empShielded) e.weapon.disabled = true;
        e.suppressedUntil = Math.max(e.suppressedUntil || 0, this.time + 5);
        e.awareness = Math.max(0.4, e.awareness || 0);
        if (e.state === 'combat') {
          e.state = 'flee';
          e.targetPos = AISystem._findCover(this, e, this.player);
        }
      }
    }
    // 所有人的电子设备都应受影响，包括正在飞行的无人机。
    // 电磁加固只降低当量，不是免疫：加固机仍然会掉耐久并出现图传干扰。
    if (this.drones) {
      for (const d of this.drones) {
        if (!d.alive) continue;
        const ddx = d.mesh.position.x - x, ddz = d.mesh.position.z - z;
        const ddy = (d.mesh.position.y - y) * 0.6;
        const dd = Math.hypot(ddx, ddz, ddy);
        if (dd > radius) continue;
        const f = Math.pow(Math.max(0, 1 - dd / radius), 1.5) * (peak || 1);
        const resist = d.empHardened ? Math.max(0.15, 1 - (d.empResist || 0.5)) : 1;
        const loss = 35 * f * resist;
        d.durability = Math.max(0, d.durability - loss);
        d.empGlitch = Math.max(d.empGlitch || 0, Math.min(1, 0.5 + f * 0.6));
        if (d.owner === this.player) this._droneInterference(0.5 + f * 0.5);
        if (d.durability <= 0) this._destroyDrone(d);
      }
    }
    // 只有真正生效才发警告：有设备实际损坏 → 损坏警告；
    // 只有加固设备被冲刷但没坏 → 强电磁干扰警告。远处空爆不再全图提示。
    if (damaged > 0) {
      this.addAlert(0, '电磁干扰：' + damaged + ' 件电子物品已损坏', 6);
    } else if (playerSurge) {
      this.addAlert(0, '强电磁干扰：电磁加固设备承受冲刷，未损坏', 5);
    }
    this._spawnEmpRings(x, y, z, radius);
    this._spawnLightField(x, y + 0.3, z, radius, 0.55, 0x66ffcc);
    return { disrupted, damaged };
  }

  _spawnEmpRings(x, y, z, radius){
    const scene = this.engine.renderer.scene;
    const group = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x66ffcc, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 36), mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05 + i * 0.02;
      group.add(ring);
    }
    group.position.set(x, y, z);
    scene.add(group);
    const start = performance.now();
    const step = () => {
      const t = (performance.now() - start) / 700;
      if (t >= 1) {
        scene.remove(group);
        group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        return;
      }
      group.children.forEach((ring, i) => {
        const local = Math.max(0, t - i * 0.16);
        ring.scale.setScalar(1 + local * radius * 1.6);
        ring.material.opacity = 0.5 * (1 - local);
      });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _spawnFireField(x, z, radius, duration, dps){
    const scene = this.engine.renderer.scene;
    const group = new THREE.Group();
    const mats = [];
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffd35a : 0xff6a2a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28 + Math.random() * 0.4, 0.9 + Math.random() * 1.1, 7), mat);
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.85;
      flame.position.set(Math.cos(a) * r, 0.45, Math.sin(a) * r);
      flame.userData.phase = Math.random() * Math.PI * 2;
      flame.userData.baseY = 0.45;
      group.add(flame);
      mats.push(mat);
    }
    const light = new THREE.PointLight(0xff7a2a, 3.2, radius * 2.2, 2);
    light.position.set(0, 1.2, 0);
    group.add(light);
    group.position.set(x, 0, z);
    scene.add(group);
    this.fireFields.push({ x, z, radius, ttl: duration, maxTtl: duration, dps, group, light, tick: 0 });
  }

  _updateFireFields(dt){
    if (!this.fireFields || this.fireFields.length === 0) return;
    for (let i = this.fireFields.length - 1; i >= 0; i--) {
      const f = this.fireFields[i];
      f.ttl -= dt;
      f.tick -= dt;
      const t = Math.max(0, f.ttl / f.maxTtl);
      f.group.children.forEach((c) => {
        if (c.isMesh) {
          const ph = (c.userData.phase || 0) + this.time * 5;
          c.position.y = (c.userData.baseY || 0.45) + Math.sin(ph) * 0.12;
          c.scale.y = 0.85 + Math.sin(ph * 1.7) * 0.22;
          if (c.material) c.material.opacity = 0.55 * t;
        }
      });
      if (f.light) f.light.intensity = 3.2 * t;
      if (f.tick <= 0) {
        f.tick = 0.25;
        const targets = [];
        if (this.player && this.player.alive) targets.push(this.player);
        for (const e of this.enemies) if (e.alive) targets.push(e);
        for (const e of targets) {
          const d = Math.hypot(e.body.position.x - f.x, e.body.position.z - f.z);
          if (d > f.radius) continue;
          // 地面火焰只烧到贴近地面的人；站在高台/掩体后不应隔空着火
          if (e.body.position.y - (e.body.halfH || 1.2) > 2.2) continue;
          if (d > 0.2) {
            const blocked = this.physics.raycast(f.x, 0.9, f.z,
              (e.body.position.x - f.x) / d, 0, (e.body.position.z - f.z) / d, d,
              body => body.userData && body.userData.type === 'obstacle');
            if (blocked) continue;
          }
          if (e.status) e.status.ignite('legs', 2);
        }
      }
      if (f.ttl <= 0) {
        this.engine.renderer.scene.remove(f.group);
        f.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        this.fireFields.splice(i, 1);
      }
    }
  }

  _dazzleScreen(intensity, duration){
    let el = document.getElementById('dazzle-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dazzle-overlay';
      el.style.cssText = 'position:fixed;inset:0;z-index:409;pointer-events:none;opacity:0;transition:opacity .1s;background:radial-gradient(circle at 50% 42%, rgba(255,255,255,.92) 0%, rgba(255,255,255,.55) 26%, rgba(210,220,255,.18) 58%, transparent 78%)';
      el.innerHTML = '<div class="dz-hand dz-left"></div><div class="dz-hand dz-right"></div><div class="dz-tip">强光刺眼 · 无法开镜</div>';
      document.body.appendChild(el);
      if (!document.getElementById('dazzle-css')) {
        const st = document.createElement('style');
        st.id = 'dazzle-css';
        st.textContent = `
          #dazzle-overlay .dz-hand{position:absolute;bottom:-12%;width:44%;height:62%;background:radial-gradient(ellipse at 50% 100%, rgba(35,26,26,.92) 0%, rgba(35,26,26,.75) 42%, transparent 72%);filter:blur(10px);opacity:0;transition:opacity .25s}
          #dazzle-overlay .dz-left{left:-4%;transform:rotate(18deg)}
          #dazzle-overlay .dz-right{right:-4%;transform:rotate(-18deg)}
          #dazzle-overlay .dz-tip{position:absolute;left:50%;bottom:18%;transform:translateX(-50%);color:#fff;font-size:12px;letter-spacing:2px;font-weight:700;text-shadow:0 1px 6px #000;opacity:.85;white-space:nowrap}
          #dazzle-overlay.hands .dz-hand{opacity:1}
        `;
        document.head.appendChild(st);
      }
    }
    el.style.transition = 'opacity .08s';
    el.style.opacity = String(Math.min(0.92, 0.25 + intensity * 0.7));
    el.classList.add('hands');
    clearTimeout(this._dazzleTimer);
    this._dazzleTimer = setTimeout(() => {
      el.style.transition = 'opacity .9s';
      el.style.opacity = '0';
      el.classList.remove('hands');
    }, Math.max(180, duration * 900));
  }

  _flashScreen(intensity){
    let el = document.getElementById('flash-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'flash-overlay';
      el.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:400;pointer-events:none;opacity:0;transition:opacity .12s';
      document.body.appendChild(el);
    }
    el.style.transition = 'opacity .12s';
    el.style.opacity = String(Math.min(0.95, intensity));
    setTimeout(() => {
      el.style.transition = 'opacity 1.2s';
      el.style.opacity = '0';
    }, 120);
  }

  // ===== 医疗物品：真正可用 =====
  // 统一入口：校验 → 判断是否真的有效 → 启动动作进程 → 完成时才扣物品并生效。
  // 取消动作不消耗物品；药品用完才销毁堆叠。
  _useMedical(uid) {
    const p = this.player;
    const inv = this.engine.app && this.engine.app.inventory;
    if (!p || !p.alive || !inv) return false;
    const item = inv.items.get(uid);
    if (!item || item.table !== 'medical') return false;
    const def = inv.getDef(item);
    const use = def && def.use;
    if (!use) { this._hint('该物品无法使用', 'y'); return false; }
    if (p.status.isDowned()) { this._hint('倒地状态无法自行使用医疗物品', 'y'); return false; }
    if (this.actionProcess.isRunning()) { this._hint('当前动作尚未完成', 'y'); return false; }

    // 预检：没有对应伤情时明确告诉玩家为什么不能用（不需要浪费物品）。
    // 注意：止痛药不再被“已有止痛效果”拦截——允许重复服用，但会累积副作用。
    const st = p.status;
    if (use.kind === 'bandage' && st.effectiveBleedLevel() <= 0) {
      this._hint('没有需要包扎的外部出血', 'y'); return false;
    }
    if (use.kind === 'splint' && !st.parts.larm.fracture && !st.parts.legs.fracture) {
      this._hint('没有可以固定的大腿/手臂骨折', 'y'); return false;
    }
    if (use.kind === 'blood' && st.blood >= st.maxBlood * 0.98) {
      this._hint('血容量充足（' + Math.round(st.blood) + '/' + Math.round(st.maxBlood) + ' ml），不需要输血', 'y'); return false;
    }
    if (use.kind === 'surgery' && st.effectiveBleedLevel() <= 0 && st.blood >= st.maxBlood * 0.95
        && !st.parts.larm.fracture && !st.parts.legs.fracture) {
      this._hint('当前没有需要手术处理的伤情', 'y'); return false;
    }

    const label = {
      bandage: '包扎止血', painkiller: '服用止痛药', splint: '上夹板固定',
      blood: '静脉输注血浆', surgery: '进行野外手术', stim: '注射兴奋剂',
    }[use.kind] || '使用医疗物品';

    this.actionProcess.start({
      id: 'medical',
      label,
      duration: Math.max(0.8, use.time || 2),
      cancelable: true,
      onComplete: () => {
        const cur = inv.items.get(uid);
        if (!cur || cur.table !== 'medical') return;
        this._applyMedicalUse(p, use, def);
        cur.qty -= 1;
        if (cur.qty <= 0) inv.destroyItem(uid);
        this.stats.medicalUses = (this.stats.medicalUses || 0) + 1;
        this.combatLog.push({
          type: 'medical_use', t: this.time,
          name: this.engine.i18n.t(def.name || def.id || '医疗物品'),
          detail: label,
        });
        const bu = this.engine.app && this.engine.app.bagUI;
        if (bu && bu.open) bu.refresh();
      },
      onCancel: () => this._log(label + '被打断', 'y'),
    });
    this._playSFX('switch', { volume: 0.4 });
    return true;
  }

  _applyMedicalUse(p, use, def) {
    const st = p.status;
    const kind = use.kind;
    if (kind === 'bandage') {
      st.sealBleeding(use.bleedSeal || 1);
      st.addEffect('pain', use.pain || 2, 1);
      st.addEffect('bandaged', 20, 1);
      this._log('包扎完成：外部出血已封堵 ' + st.effectiveBleedLevel() + ' 级', 'p');
    } else if (kind === 'surgery') {
      st.sealBleeding(use.bleedSeal || 99);
      st.blood = Math.min(st.maxBlood, st.blood + (use.blood || 0));
      for (const pt of ['larm', 'legs']) {
        const part = st.parts[pt];
        if (part && part.fracture && part.fracture <= (use.fracture || 1)) part.fracture = 0;
      }
      if (!st.parts.larm.fracture && !st.parts.legs.fracture) st.removeEffect('fracture');
      st.addEffect('painkiller', use.painkiller || 20, 1);
      st.addEffect('pain', use.pain || 5, 1);
      st.updateOverallHealth();
      this._log('手术完成：出血已控制，骨折已复位固定', 'p');
    } else if (kind === 'splint') {
      let fixed = false;
      for (const pt of ['larm', 'legs']) {
        const part = st.parts[pt];
        if (part && part.fracture && part.fracture <= (use.fracture || 1)) { part.fracture = 0; fixed = true; break; }
      }
      if (!st.parts.larm.fracture && !st.parts.legs.fracture) st.removeEffect('fracture');
      st.addEffect('pain', use.pain || 3, 1);
      this._log(fixed ? '夹板固定完成：肢体骨折已临时固定' : '没有可固定的肢体骨折', fixed ? 'p' : 'y');
    } else if (kind === 'blood') {
      st.blood = Math.min(st.maxBlood, st.blood + (use.blood || 600));
      if (st.blood >= st.maxBlood * 0.35) st.removeEffect('hypovolemia');
      st.updateOverallHealth();
      this._log('输血完成：血容量 ' + Math.round(st.blood) + ' ml', 'p');
    } else if (kind === 'painkiller') {
      // ★ 允许在药效未过时继续服用，但每次都会累积剂量：
      //   2 剂恶心、3 剂镇静、4 剂以上药物过量。止痛本身不会因为多吃而更强，
      //   只是把“能不能用”换成“用了要付什么代价”。
      const now = this.time || 0;
      const windowSec = 150;
      st.painkillerDoses = (st.painkillerDoses || []).filter(t => now - t < windowSec);
      st.painkillerDoses.push(now);
      const doses = st.painkillerDoses.length;
      st.addEffect('painkiller', use.painkiller || 60, 1);
      if (doses >= 2) st.addEffect('nausea', 30, 1);
      if (doses >= 3) st.addEffect('sedation', 45, 1);
      if (doses >= 4) st.addEffect('overdose', 60, 1);
      const warn = doses >= 4 ? '——药物过量：移动、操控与视野严重受损'
        : doses === 3 ? '——镇静过度：动作明显迟缓'
          : doses === 2 ? '——开始恶心：操控与视野下降'
            : '';
      this._hint('止痛药起效（' + doses + ' 剂/150s）：疼痛惩罚被压制' + warn, doses >= 3 ? 'r' : 'p');
    } else if (kind === 'stim') {
      st.addEffect('stimulant', use.duration || 25, 1);
      st.addEffect('painkiller', use.painkiller || use.duration || 25, 1);
      p.stamina = Math.min(p.maxStamina || 100, p.stamina + 40);
      p._speedBuffUntil = this.time + (use.duration || 25);
      this._log('兴奋剂注射完成：短时机能提升', 'p');
    }
    st.updateOverallHealth();
    this._showEffectPopup('已使用医疗物品', '🩹', true);
  }

  /* ===================== 玩家救治队友（靠近查看伤情） ===================== */
  _updateAllyCarePanel() {
    const el = document.getElementById('ally-care');
    if (!el) return;
    const p = this.player;
    if (!this.allies || !this.allies.length || !p || !p.alive) {
      if (el.style.display !== 'none') el.style.display = 'none';
      this._careAlly = null;
      return;
    }
    let best = null, bestD = 4.5;
    for (const a of this.allies) {
      if (!a.alive || !a.body) continue;
      const d = Math.hypot(a.body.position.x - p.body.position.x, a.body.position.z - p.body.position.z);
      if (d < bestD) { bestD = d; best = a; }
    }
    if (!best) {
      if (el.style.display !== 'none') el.style.display = 'none';
      this._careAlly = null;
      this._allyCareOpen = false;
      return;
    }
    this._careAlly = best;
    const st = best.status;
    if (!st) return;
    const meds = this._getMedicalWheelList();
    const effectSig = Array.from(st.effects.keys()).join(',');
    const medSig = meds.map(m => m.uid + ':' + (m.qty || 1)).join(',');
    const sig = best.allyIndex + ':' + Math.round(st.healthQuality) + ':' + Math.round(st.blood) + ':'
      + (st.isDowned() ? 1 : 0) + ':' + effectSig + ':' + medSig + ':' + best.alive
      + ':' + (this._allyCareOpen ? 1 : 0);
    if (sig === this._allyCareSig && el.style.display !== 'none') return;
    this._allyCareSig = sig;

    const hp = Math.max(0, Math.round(st.healthQuality));
    const col = hp > 60 ? '#5fd47a' : (hp > 30 ? '#ffd93d' : '#ff5a5a');
    const partNames = { head: '头', thorax: '胸', abdomen: '腹', larm: '臂', legs: '腿' };
    const parts = ['head', 'thorax', 'abdomen', 'larm', 'legs'].map(k => {
      const part = st.parts[k];
      const pct = Math.max(0, Math.round(part.hp / part.maxHp * 100));
      const w = part.wounds && part.wounds.length ? ' W' + part.wounds.length : '';
      const f = part.fracture ? ' 骨折' : '';
      return '<span style="color:' + (pct > 60 ? '#9fe8b0' : pct > 30 ? '#ffe066' : '#ff8b7b') + '">'
        + partNames[k] + ' ' + pct + '%' + w + f + '</span>';
    }).join(' · ');
    const eff = Array.from(st.effects.entries()).map(([id, e]) => {
      const d = this.engine.content.get('effects', id);
      return (d ? d.icon + d.name : id) + (e.strength > 1 ? ' Lv' + Math.round(e.strength) : '');
    }).join(' / ') || '无异常状态';
    const medLabels = {
      bandage: '包扎', painkiller: '止痛', splint: '夹板', blood: '输血',
      surgery: '手术', stim: '兴奋剂',
    };
    let medHtml = '';
    if (meds.length) {
      medHtml = '<div class="ac-med">' + meds.map(m => {
        const def = m.def;
        const kind = def.use && def.use.kind;
        const usable = !st.isDowned() || kind === 'surgery' || kind === 'blood';
        const label = (medLabels[kind] || '使用') + ' · ' + this.engine.i18n.t(def.name || '?');
        return '<button data-ally-med="' + m.uid + '"' + (usable ? '' : ' disabled title="队友已倒地，需要手术包或血浆"') + '>'
          + this._esc(label) + ' ×' + (m.qty || 1) + '</button>';
      }).join('') + '</div>';
    } else {
      medHtml = '<div style="color:#6f8fae;font-size:9px;margin-top:4px">你没有可用的医疗用品</div>';
    }
    if (!this._allyCareOpen) {
      // 默认只显示一行队友状态，按 U 才展开部位/药品，避免站旁边时糊满屏幕
      el.innerHTML =
        '<div class="ac-title">' + this._esc(best.allyName || '队友') + ' · <span style="color:' + col + '">'
        + (st.isDowned() ? '倒地' : this._esc(st.getHealthText())) + '</span>'
        + ' <span style="color:#8fb0c8;font-weight:400">' + hp + '%</span></div>'
        + '<div style="font-size:9px;color:#8fb0c8">距离 ' + bestD.toFixed(1) + 'm · 按 U 查看伤情/用药</div>';
      el.style.pointerEvents = 'none';
      el.style.display = 'block';
      return;
    }
    el.style.pointerEvents = 'auto';
    el.innerHTML =
      '<div class="ac-title">' + this._esc(best.allyName || '队友') + ' · ' + (st.isDowned() ? '倒地' : this._esc(st.getHealthText())) + '</div>' +
      '<div style="font-size:10px;color:#8fb0c8">距离 ' + bestD.toFixed(1) + 'm · 血量 ' + Math.round(st.blood) + '/' + Math.round(st.maxBlood) + ' ml</div>' +
      '<div class="ac-bar"><i style="width:' + hp + '%;background:' + col + '"></i></div>' +
      '<div style="font-size:9px;color:#8fb0c8">部位：' + parts + '</div>' +
      '<div style="font-size:9px;color:#8fb0c8;margin-top:2px">状态：' + this._esc(eff) + '</div>' +
      medHtml +
      '<div style="font-size:8px;color:#5c82a8;margin-top:4px">靠近 4.5m 内可见 · 按 U 关闭面板</div>';
    el.style.display = 'block';
    if (!this._allyCareHinted) {
      this._allyCareHinted = true;
      this._hint('发现队友伤情：按 U 锁定鼠标后可点击药品，也可直接按 U 关闭', 'y');
    }
    // 用 onclick + world 标记覆盖绑定，避免换局后仍调用上一局的 world
    if (el._allyCareWorld !== this) {
      el._allyCareWorld = this;
      el.onclick = (ev) => {
        const btn = ev.target && ev.target.closest ? ev.target.closest('[data-ally-med]') : null;
        if (btn && !btn.disabled) this._useMedicalOnAlly(btn.dataset.allyMed);
      };
    }
  }

  _toggleAllyCare() {
    if (!this._careAlly) { this._hint('靠近队友才能查看伤情', 'y'); return; }
    const el = document.getElementById('ally-care');
    this._allyCareOpen = !this._allyCareOpen;
    if (!el) return;
    el.classList.toggle('active', this._allyCareOpen);
    if (this._allyCareOpen) {
      this._allyCareHadLock = !!document.pointerLockElement;
      if (document.pointerLockElement) document.exitPointerLock();
      this._hint('队友伤情已展开：点击药品使用，按 U 关闭', 'p');
    } else if (this._allyCareHadLock) {
      const canvas = this.engine.renderer.canvas;
      if (canvas && !document.pointerLockElement && typeof canvas.requestPointerLock === 'function') {
        try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
      }
    }
  }

  _useMedicalOnAlly(uid) {
    const p = this.player;
    const ally = this._careAlly;
    const inv = this.engine.app && this.engine.app.inventory;
    if (!p || !p.alive || !ally || !ally.alive || !inv) return false;
    const d = Math.hypot(ally.body.position.x - p.body.position.x, ally.body.position.z - p.body.position.z);
    if (d > 5.5) { this._hint('离队友太远了', 'y'); return false; }
    const item = inv.items.get(uid);
    if (!item || item.table !== 'medical') return false;
    const def = inv.getDef(item);
    const use = def && def.use;
    if (!use) return false;
    if (this.actionProcess.isRunning()) { this._hint('当前动作尚未完成', 'y'); return false; }
    const st = ally.status;
    if (st.isDowned() && use.kind !== 'surgery' && use.kind !== 'blood') {
      this._hint('队友已倒地，需要手术包或血浆才能救起', 'y'); return false;
    }
    if (use.kind === 'bandage' && st.effectiveBleedLevel() <= 0) {
      this._hint('队友没有需要包扎的外部出血', 'y'); return false;
    }
    if (use.kind === 'splint' && !st.parts.larm.fracture && !st.parts.legs.fracture) {
      this._hint('队友没有可固定的肢体骨折', 'y'); return false;
    }
    if (use.kind === 'blood' && st.blood >= st.maxBlood * 0.98 && !st.isDowned()) {
      this._hint('队友血容量充足，不需要输血', 'y'); return false;
    }
    const label = {
      bandage: '为队友包扎', painkiller: '给队友止痛', splint: '为队友上夹板',
      blood: '给队友输血', surgery: '为队友手术', stim: '给队友注射兴奋剂',
    }[use.kind] || '救治队友';
    this.actionProcess.start({
      id: 'ally_medical',
      label,
      duration: Math.max(0.8, use.time || 2),
      cancelable: true,
      onComplete: () => {
        if (!ally.alive || !ally.status) return;
        const d2 = Math.hypot(ally.body.position.x - p.body.position.x, ally.body.position.z - p.body.position.z);
        if (d2 > 6.5) { this._hint('队友已经离开，救治中断', 'y'); return; }
        const cur = inv.items.get(uid);
        if (!cur || cur.table !== 'medical') return;
        this._applyMedicalToAlly(ally, use, def);
        cur.qty -= 1;
        if (cur.qty <= 0) inv.destroyItem(uid);
        this.stats.medicalUses = (this.stats.medicalUses || 0) + 1;
        this.combatLog.push({
          type: 'medical_use', t: this.time,
          name: this.engine.i18n.t(def.name || '医疗物品'),
          detail: label + '（友军）',
        });
        this._allyCareSig = '';
        this._updateAllyCarePanel();
      },
      onCancel: () => this._hint(label + '被打断', 'y'),
    });
    this._playSFX('switch', { volume: 0.4 });
    return true;
  }

  _applyMedicalToAlly(ally, use, def) {
    const st = ally.status;
    if (!st) return;
    const wasDowned = st.isDowned();
    const kind = use.kind;
    if (kind === 'bandage') {
      st.sealBleeding(use.bleedSeal || 1);
      st.addEffect('pain', use.pain || 2, 1);
      st.addEffect('bandaged', 20, 1);
    } else if (kind === 'surgery') {
      st.sealBleeding(use.bleedSeal || 99);
      st.blood = Math.min(st.maxBlood, st.blood + (use.blood || 0));
      for (const pt of ['larm', 'legs']) {
        const part = st.parts[pt];
        if (part && part.fracture && part.fracture <= (use.fracture || 1)) part.fracture = 0;
      }
      if (!st.parts.larm.fracture && !st.parts.legs.fracture) st.removeEffect('fracture');
      st.addEffect('painkiller', use.painkiller || 20, 1);
      st.addEffect('pain', use.pain || 5, 1);
    } else if (kind === 'splint') {
      for (const pt of ['larm', 'legs']) {
        const part = st.parts[pt];
        if (part && part.fracture && part.fracture <= (use.fracture || 1)) { part.fracture = 0; break; }
      }
      if (!st.parts.larm.fracture && !st.parts.legs.fracture) st.removeEffect('fracture');
      st.addEffect('pain', use.pain || 3, 1);
    } else if (kind === 'blood') {
      st.blood = Math.min(st.maxBlood, st.blood + (use.blood || 600));
    } else if (kind === 'painkiller') {
      st.addEffect('painkiller', use.painkiller || 60, 1);
    } else if (kind === 'stim') {
      st.addEffect('stimulant', use.duration || 25, 1);
      st.addEffect('painkiller', use.painkiller || use.duration || 25, 1);
    }
    if (st.blood >= st.maxBlood * 0.35) st.removeEffect('hypovolemia');
    st.updateOverallHealth();
    // 倒地队友：手术/血浆把血容量与胸腔拉过倒地线后，真正扶起
    if (wasDowned && (kind === 'surgery' || kind === 'blood')) {
      st.blood = Math.max(st.blood, st.maxBlood * 0.3);
      st.parts.thorax.hp = Math.max(st.parts.thorax.hp, st.parts.thorax.maxHp * 0.2);
      st.parts.abdomen.hp = Math.max(st.parts.abdomen.hp, st.parts.abdomen.maxHp * 0.18);
      st.updateOverallHealth();
      if (!st.isDowned()) {
        this._setEntityDowned(ally, false, false);
        ally._downedAt = 0;
        this._hint('已把 ' + (ally.allyName || '队友') + ' 救起', 'p');
        this._squadSay(ally.allyName, '谢谢你，队长。');
      }
    }
    this._hint('已对 ' + (ally.allyName || '队友') + ' 使用 ' + this.engine.i18n.t(def.name || '医疗物品'), 'p');
  }

  /* ===================== AI 互救 / 用药 ===================== */
  _takeMedicalForAI(healer, forRevive = false, prefer = null) {
    const inv = healer && healer.lootInv;
    if (!inv) return null;
    let order = forRevive ? ['surgery', 'blood', 'bandage'] : ['bandage', 'blood', 'surgery'];
    // 对症下药：出血优先绷带，低血容量优先血浆，其余才用手术包。
    // 旧版永远先拿绷带，AI 自己低血量时也会把绷带当万能药。
    if (prefer) order = [prefer, ...order.filter(k => k !== prefer)];
    for (const kind of order) {
      for (const [uid, it] of inv.items) {
        if (!it || it.table !== 'medical') continue;
        const def = inv.getDef(it);
        if (!def || !def.use || def.use.kind !== kind) continue;
        if ((it.qty || 1) > 1) it.qty -= 1;
        else inv.destroyItem(uid);
        return def;
      }
    }
    return null;
  }

  _aiHealByAI(target, healer) {
    if (!target || !target.alive || !target.status) return false;
    const st = target.status;
    // 按当前伤情挑药：出血→绷带，低血容量→血浆，否则→手术包/绷带
    const bleed = st.effectiveBleedLevel ? st.effectiveBleedLevel() : 0;
    const prefer = bleed > 0 ? 'bandage' : (st.blood < st.maxBlood * 0.72 ? 'blood' : 'surgery');
    const def = this._takeMedicalForAI(healer, false, prefer);
    if (!def) return false;
    const use = def.use || {};
    const kind = use.kind;
    if (kind === 'blood') {
      st.blood = Math.min(st.maxBlood, st.blood + (use.blood || 600));
      if (bleed > 0) st.sealBleeding(1);
    } else if (kind === 'surgery') {
      st.sealBleeding(use.bleedSeal || 2);
      st.blood = Math.min(st.maxBlood, st.blood + st.maxBlood * 0.12 + (use.blood || 0));
      let worst = null, ratio = 1;
      for (const k in st.parts) {
        const r = st.parts[k].hp / st.parts[k].maxHp;
        if (r < ratio) { ratio = r; worst = k; }
      }
      if (worst) st.parts[worst].hp = Math.min(st.parts[worst].maxHp,
        st.parts[worst].hp + st.parts[worst].maxHp * 0.15);
    } else {
      st.blood = Math.min(st.maxBlood, st.blood + st.maxBlood * 0.08);
      st.sealBleeding(use.bleedSeal || 1);
      let worst = null, ratio = 1;
      for (const k in st.parts) {
        const r = st.parts[k].hp / st.parts[k].maxHp;
        if (r < ratio) { ratio = r; worst = k; }
      }
      if (worst) st.parts[worst].hp = Math.min(st.parts[worst].maxHp,
        st.parts[worst].hp + st.parts[worst].maxHp * 0.1);
      st.addEffect('bandaged', 15, 1);
    }
    st.updateOverallHealth();
    if (healer && healer.isAlly) {
      const done = kind === 'blood' ? '打了一袋血浆。' : (kind === 'surgery' ? '给自己做了手术。' : '给自己包扎一下。');
      this._squadSay(healer.allyName,
        target === healer ? done : '给' + (target.allyName || '队友') + '处理好了。');
    }
    return true;
  }

  _reviveByAI(target, healer) {
    if (!target || !target.alive || !target.status) return false;
    if (!target.status.isDowned()) return false;
    const def = this._takeMedicalForAI(healer, true);
    if (!def) return false;
    const st = target.status;
    st.blood = Math.max(st.blood, st.maxBlood * 0.3);
    st.parts.thorax.hp = Math.max(st.parts.thorax.hp, st.parts.thorax.maxHp * 0.2);
    st.parts.abdomen.hp = Math.max(st.parts.abdomen.hp, st.parts.abdomen.maxHp * 0.18);
    st.removeEffect('hypovolemia');
    st.sealBleeding(2);
    st.updateOverallHealth();
    if (target === this.player) {
      this._setEntityDowned(target, false, true);
      target.isDownedState = false;
      target._downedAt = 0;
      target._wasDowned = false;
      target._downedLogged = false;
      this._log((healer.allyName || '队友') + ' 把你救了起来', 'p');
      this._showEffectPopup('被队友救起', '🩹', true);
    } else {
      this._setEntityDowned(target, false, false);
      target.isDownedState = false;
      target._downedAt = 0;
      if (healer.isAlly) this._squadSay(healer.allyName,
        '把' + (target.allyName || '队友') + '拉起来了。');
      else this._log(healer.spec ? this.engine.i18n.t(healer.spec.name) + ' 正在救治同伴' : '敌人正在救治同伴', 'y');
    }
    return true;
  }

  // ===== 玻纤拔除（玩家）=====
  _startFiberPull(){
    const p = this.player;
    if (!p || !p.alive || !p.status) return;
    if (p.status.isDowned()) { this._log('倒地状态无法拔除玻纤', 'y'); return; }
    if (!p.status.hasEffect('fiber_acute')) return;
    if (this.actionProcess.isRunning()) { this._log('当前无法拔除', 'y'); return; }
    this.actionProcess.start({
      id: 'fiber',
      label: '拔除玻纤',
      duration: 4,
      cancelable: true,
      onComplete: () => {
        p.status.removeEffect('fiber_acute');
        p.status.addEffect('fiber_chronic', 9999, 1);
        this._log('玻纤已拔除（残留慢性损伤）', 'p');
      },
      onCancel: () => this._log('拔除被打断', 'y'),
    });
    this._log('开始拔除玻纤…', 'y');
  }

  // ===== 灭火（玩家）=====
  _startExtinguish(){
    const p = this.player;
    if (!p || !p.alive || !p.status) return;
    if (p.status.isDowned()) { this._log('倒地状态无法灭火', 'y'); return; }
    if (!p.status.hasEffect('burning')) return;
    if (this.actionProcess.isRunning()) { this._log('当前无法灭火', 'y'); return; }
    this.actionProcess.start({
      id: 'extinguish',
      label: '灭火',
      duration: 3.2,
      cancelable: true,
      onComplete: () => {
        const st = p.status;
        const burnLv = Object.values(st.burningParts || {}).reduce((a, b) => a + b, 0);
        st.removeEffect('burning');
        // ★ 灭火只终止继续灼烧；烧伤休克（循环崩溃/持续失血）必须留下。
        //   旧版火一灭就把 burnShock 一起清掉，等于大面积烧伤瞬间“痊愈”。
        if (burnLv >= 2) {
          st.addEffect('burnShock', Math.max(40, burnLv * 14), Math.min(5, burnLv));
        }
        st.addEffect('pain', 20, Math.min(4, Math.max(2, burnLv + 1)));
        this._log(burnLv >= 2 ? '火焰已扑灭（仍有灼痛与烧伤休克）' : '火焰已扑灭（仍有灼痛）', 'p');
        this._showEffectPopup('已灭火', '🧯', true);
      },
      onCancel: () => this._log('灭火被打断', 'y'),
    });
    this._log('开始扑灭火焰…', 'y');
  }

  // ===== 被动触发 =====
  _triggerOnHitPassives(p, energy){
    const now = this.time;
    const passive = p.charSpec && p.charSpec.passive;
    if (passive === 'intuition' && !(p._intuitionCd && now < p._intuitionCd)) {
      if (energy >= 500 || p.status.healthQuality < 60) {
        p._intuitionCd = now + 45;
        p._flashbackUntil = now + 6;
        p.status.addEffect('flashback', 6, 1);
        const sx = p._lastHitSrcX !== undefined ? p._lastHitSrcX : p.body.position.x;
        const sz = p._lastHitSrcZ !== undefined ? p._lastHitSrcZ : p.body.position.z;
        for (const e of this.enemies) {
          if (!e.alive || e.isAlly) continue;
          const dPlayer = Math.hypot(e.body.position.x - p.body.position.x, e.body.position.z - p.body.position.z);
          const dSrc = Math.hypot(e.body.position.x - sx, e.body.position.z - sz);
          if (dPlayer < 12 || dSrc < 7) this._markEntity(e, 6, 'intuition', 'player');
        }
        this._log('直觉与回忆：攻击者及周围目标已标记，进入闪回', 'p');
        this._showEffectPopup('闪回', '🧠', false);
      }
    }
    if (passive === 'stress' && !(p._stressUntil && now < p._stressUntil) && !(p._stressCd && now < p._stressCd)) {
      p._stressUntil = now + 4;
      p._stressCd = now + 20;
      this._log('应激：机能爆发', 'p');
    }
    if (passive === 'covey' && !(p._coveyLockUntil && now < p._coveyLockUntil)) {
      // 一次覆柔结算后给 4 秒锁：避免霰弹/连发在倒地瞬间连续触发无数次“强行站稳”
      p._coveyLayers = (p._coveyLayers || 0) + 1;
    }
  }

  _coveyOnDowned(p){
    if (!p.charSpec || p.charSpec.passive !== 'covey') return false;
    if (p._coveyLockUntil && this.time < p._coveyLockUntil) return false;
    const n = p._coveyLayers || 0;
    if (n <= 0) return false;
    // 覆柔不是“回一点血”，而是把濒死状态强行拉回来：
    // 必须同时把胸/腹关键部位与血容量抬过倒地阈值，否则下一帧仍会判定倒地。
    const st = p.status;
    this._healPlayer(p, st.maxBlood * 0.08 * n);
    st.blood = Math.max(st.blood, st.maxBlood * (0.30 + 0.03 * Math.min(3, n)));
    st.parts.thorax.hp = Math.max(st.parts.thorax.hp, st.parts.thorax.maxHp * 0.22);
    st.parts.abdomen.hp = Math.max(st.parts.abdomen.hp, st.parts.abdomen.maxHp * 0.18);
    st.removeEffect('hypovolemia');
    st.updateOverallHealth();
    p.isDownedState = false;
    p._downedAt = 0;
    p._wasDowned = false;
    if (p.body) {
      p.body.height = 2.4;
      p.body.halfH = 1.2;
      p.body.position.y = Math.max(p.body.position.y, 1.2);
    }
    p._coveyLayers = 0;
    p._coveyLockUntil = this.time + 4.0;
    p._coveyUntil = this.time + 5.0;
    p._weaknessUntil = 0;
    p.skillStates = p.skillStates || {};
    p.skillStates.suppress = { end: this.time + 5, def: { duration: 5 } };
    this.engine.cameraCtl.resetDeathPose();
    this._spawnSkillAura(p, 0x66ff99, 1.0);
    this._showEffectPopup('覆柔·强行站稳', '🎗', true);
    this._log('覆柔：消耗 ' + n + ' 层，强行从击倒状态站起', 'p');
    return true;
  }

  // 凯特 Srdispte：被击中后的应激位移（消耗耦合，按剩余比例缩短）
  _srdispteDodge(p, srcX, srcZ){
    if (srcX === undefined || srcZ === undefined) return;
    let dx = p.body.position.x - srcX;
    let dz = p.body.position.z - srcZ;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const srd = p.skillStates && p.skillStates.srdispte;
    const cost = (srd && srd.def && srd.def.dodgeCost) || 5;
    let ratio = 1;
    if (p.coupling < cost) ratio = Math.max(0, p.coupling / cost);
    p.coupling = Math.max(0, p.coupling - cost * ratio);
    const dist = ((srd && srd.def && srd.def.dodgeDistance) || 5.5) * ratio;
    // 平滑滑步而不是瞬移；_startDash 内做墙体截断
    this._startDash(p, dx, dz, dist, 0.18, 1.0);
    const d = p._dash;
    const fx = d ? d.tx : p.body.position.x;
    const fz = d ? d.tz : p.body.position.z;
    // ★ 锁定“攻击发生时攻击者所在位置”，而不是玩家当前朝向或随机空气
    const targetY = (p._lastHitSrcY !== undefined)
      ? p._lastHitSrcY
      : (p.body.position.y + 1.1);
    // ★ 相机 yaw 的约定是 forward = (sin(yaw), -cos(yaw))，
    //   所以“看向某点”必须用 atan2(dx, -dz)；旧版写成 atan2(dz, dx) 会整整偏 90°，
    //   表现就是凯特应激后朝空气开镜。这里同时用滑步落点重新求角。
    const yawTo = Math.atan2(srcX - fx, -(srcZ - fz));
    const horiz = Math.max(0.4, Math.hypot(srcX - fx, srcZ - fz));
    const eyeY = p.body.position.y - (p.body.halfH || 1.2) + (p.camHeight || 1.55);
    const pitchTo = Math.atan2(targetY - eyeY, horiz);
    p.angle = yawTo;
    this.engine.cameraCtl.yaw = yawTo;
    this.engine.cameraCtl.pitch = Math.max(-1.35, Math.min(1.35, pitchTo));
    p._srdispteAim = { x: srcX, y: targetY, z: srcZ, until: this.time + 1.4 };
    p.ads = true;
    p._adsToggled = true;
    p._forceAds = true;
    p.fireCd = Math.min(p.fireCd || 0, 0.15);
    this._spawnSkillAura(p, 0xff6ec7, 0.35);
    this._log('Srdispte 应激滑步：已锁定攻击者原位置', 'p');
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
    // ★ 伤害显示统一取整；文字型标记（如“✦”）原样显示
    if (typeof val === 'number' && isFinite(val)) val = String(Math.round(val));
    else val = String(val == null ? 0 : val);
    // ★ 靶场用靶场开关；正式战局才看 Profile
    if (this.training) {
      if (!this.training.showDamage) return;
    } else if (!this.engine.profile.get('visual.damageNumbers', true)) {
      return;
    }

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

  _hitMarker(isHead = false, opts = {}){
  const el = document.getElementById('hit-marker');
  if (!el) return;
  el.style.opacity = '1';
  // 爆头稍微放大；颜色统一白色（黄/红都改白）
  el.style.transform = isHead ? 'scale(1.35)' : 'scale(1)';
  const dashed = !!(opts.coupling && (opts.coupling.absorbed || 0) > 0);
  el.querySelectorAll('line').forEach(l => {
    l.setAttribute('stroke', '#ffffff');
    if (dashed) l.setAttribute('stroke-dasharray', '3 3');
    else l.removeAttribute('stroke-dasharray');
  });

  // ★ 命中护甲/头盔：准星中心显示对应图标 + 圆圈；击碎则虚线圆圈
  this._showArmorHit(opts.armor);

  clearTimeout(this._hitTimer);
  this._hitTimer = setTimeout(() => {
    el.style.opacity = '0';
  }, 150);
}

  _showArmorHit(armor){
    const wrap = document.getElementById('armor-hit-indicator');
    const icon = document.getElementById('armor-hit-icon');
    if (!wrap) return;
    if (!armor || !(armor.absorbed > 0)) {
      wrap.classList.remove('on');
      return;
    }
    const iconMap = { '头盔壳': '⛑', '面罩': '🕶', '插板': '🛡', '纤维': '🦺' };
    if (icon) icon.textContent = iconMap[armor.layer] || '🛡';
    wrap.classList.toggle('broken', !!armor.broke);
    wrap.classList.add('on');
    clearTimeout(this._armorHitTimer);
    this._armorHitTimer = setTimeout(() => {
      wrap.classList.remove('on');
      wrap.classList.remove('broken');
    }, 420);
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
    // 首次交互后 AudioContext 仍可能处于 suspended（移动端尤甚），这里兜底恢复
    if (audio.ctx.state === 'suspended' && audio.resume) audio.resume();
    if (audio._clips.has(name)) {
      audio.play(name, opts);
    } else {
      this._synthSFX(name, opts);
    }
  }

  // 位置音效：按距离衰减 + 左右声道声像。远处的枪声/爆炸更闷、更轻。
  // AI 与玩家“听到”的差异由这里的衰减和 _updateSoundSystem 的声纹分别处理。
  _playSFXAt(name, x, z, opts = {}){
    const p = this.player;
    if (!p || !p.body) { this._playSFX(name, opts); return; }
    const dx = x - p.body.position.x;
    const dz = z - p.body.position.z;
    const dist = Math.hypot(dx, dz);
    const isShot = name.startsWith('shot_');
    const maxDist = opts.maxDist || (isShot ? 180 : (name === 'explosion' ? 220 : 55));
    const att = Math.max(0, 1 - dist / maxDist);
    if (att <= 0.03) return;
    // 相机 yaw 的右向量是 (cos(yaw), sin(yaw))
    const yaw = (this.engine.cameraCtl && this.engine.cameraCtl.yaw) || 0;
    const pan = Math.max(-1, Math.min(1, (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / Math.max(3, dist)));
    let vol = (opts.volume !== undefined ? opts.volume : 1) * Math.pow(att, 1.15);
    // 耳鸣/震撼期间外界声音被削弱（自己的枪声仍由 _playSFX 非定位播放）
    const hearing = (p.status && p.status.getHearingMul) ? p.status.getHearingMul() : 1;
    vol *= hearing;
    if (vol <= 0.01) return;
    this._playSFX(name, { ...opts, volume: vol, pan, distant: dist });
  }

  // ★ 实体叫唤：敌我都会在受伤/疼痛时出声；着火是独立的剧烈惨叫
  _entityVoice(ent, kind = 'hurt', throttle = 0.45) {
    if (!ent || !ent.body) return;
    const now = this.time;
    if (ent._voiceCd && now < ent._voiceCd) return;
    ent._voiceCd = now + throttle;
    const isPlayer = ent === this.player;
    const ally = isPlayer || ent.isAlly;
    const name = kind === 'scream' ? 'voice_scream'
      : (kind === 'death' ? 'voice_death'
        : (kind === 'breath' ? 'voice_breath'
          : (kind === 'pain' ? 'voice_pain'
            : (ally ? 'voice_hurt_ally' : 'voice_hurt'))));
    if (isPlayer) {
      this._playSFX(name, {
        volume: kind === 'scream' ? 0.95 : (kind === 'breath' ? 0.3 : 0.55),
      });
    } else {
      this._playSFXAt(name, ent.body.position.x, ent.body.position.z, {
        volume: kind === 'scream' ? 1.0 : (kind === 'breath' ? 0.32 : 0.65),
        maxDist: kind === 'scream' ? 55 : 38,
      });
    }
  }

  _updateEntityVoice(dt) {
    this._voiceTick = (this._voiceTick || 0) + dt;
    if (this._voiceTick < 0.35) return;
    this._voiceTick = 0;
    const now = this.time;
    const targets = [];
    if (this.player && this.player.alive && this.player.status) targets.push(this.player);
    for (const e of this.enemies) if (e.alive && e.status) targets.push(e);
    for (const ent of targets) {
      const st = ent.status;
      const burning = st.hasEffect('burning');
      const painEffect = st.effects.get('pain');
      const pain = !!painEffect && !(st.painSuppressed && st.painSuppressed());
      if (!burning && !pain) continue;
      if (!ent._voiceNext) ent._voiceNext = now + Math.random() * (burning ? 1.2 : 2.5);
      if (now < ent._voiceNext) continue;
      const painLv = pain ? Math.max(1, Math.min(4, painEffect.strength || 1)) : 0;
      let kind = 'breath';
      if (burning) {
        kind = 'scream';
        ent._voiceNext = now + 1.1 + Math.random() * 0.7;
      } else if (painLv >= 3) {
        // 剧痛：持续粗重喘气，偶尔压不住惨叫
        const roll = Math.random();
        kind = roll < 0.12 ? 'scream' : (roll < 0.55 ? 'pain' : 'breath');
        ent._voiceNext = now + 1.7 + Math.random() * 1.0;
      } else {
        const roll = Math.random();
        kind = roll < 0.18 ? 'pain' : 'breath';
        ent._voiceNext = now + 2.6 + Math.random() * 1.6;
      }
      this._entityVoice(ent, kind, 0.05);
    }
  }

  _synthSFX(name, opts){
    const audio = this.engine.audio;
    const ac = audio && audio.ctx;
    if (!ac) return;
    // 简易发声预算：大规模交火时避免一帧创建上百个音频节点导致卡顿
    const nowMs = performance.now();
    if (nowMs - (this._sfxWindowT || 0) > 100) { this._sfxWindowT = nowMs; this._sfxCount = 0; }
    if ((this._sfxCount = (this._sfxCount || 0) + 1) > 18) return;
    const now = ac.currentTime;
    const o = opts || {};
    const vol = Math.max(0.0001, o.volume !== undefined ? o.volume : 0.4);
    try {
      // 统一输出节点：支持声像，并走 sfx 总线（旧版直连 destination，绕过音量设置）
      const out = ac.createGain();
      out.gain.value = 1;
      if (o.pan !== undefined && ac.createStereoPanner) {
        const panNode = ac.createStereoPanner();
        panNode.pan.value = Math.max(-1, Math.min(1, o.pan));
        out.connect(panNode).connect(audio.sfxGain || ac.destination);
      } else {
        out.connect(audio.sfxGain || ac.destination);
      }
      const noise = (dur, gain, type, freq, when = 0) => {
        const len = Math.max(1, Math.floor(ac.sampleRate * dur));
        const buffer = ac.createBuffer(1, len, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) {
          const env = Math.exp(-i / len * (type === 'step' ? 9 : 4));
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ac.createBufferSource();
        src.buffer = buffer;
        const g = ac.createGain();
        g.gain.value = gain;
        const f = ac.createBiquadFilter();
        f.type = type === 'step' ? 'bandpass' : 'lowpass';
        f.frequency.value = freq;
        f.Q.value = type === 'step' ? 0.9 : 0.7;
        src.connect(f).connect(g).connect(out);
        src.start(now + when); src.stop(now + when + dur + 0.02);
      };
      const tone = (wave, f0, f1, dur, gain, when = 0) => {
        const osc = ac.createOscillator();
        osc.type = wave;
        osc.frequency.setValueAtTime(Math.max(20, f0), now + when);
        if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + when + dur);
        const g = ac.createGain();
        g.gain.setValueAtTime(gain, now + when);
        g.gain.exponentialRampToValueAtTime(0.0001, now + when + dur);
        osc.connect(g).connect(out);
        osc.start(now + when); osc.stop(now + when + dur + 0.02);
      };

      if (name.startsWith('shot_')) {
        const kind = name.slice(5);
        const distant = o.distant || 0;
        const lp = Math.max(700, 4200 - distant * 22);
        if (kind === 'sniper') {
          noise(0.4, vol * 1.6, 'shot', lp);
          tone('sine', 90, 45, 0.35, vol * 0.9);
          tone('square', 220, 60, 0.12, vol * 0.25);
        } else if (kind === 'shotgun') {
          noise(0.28, vol * 1.5, 'shot', lp * 0.85);
          tone('sine', 110, 55, 0.22, vol * 0.7);
        } else if (kind === 'pistol') {
          noise(0.12, vol * 0.9, 'shot', lp * 1.2);
          tone('square', 320, 120, 0.06, vol * 0.25);
        } else {
          noise(0.2, vol * 1.15, 'shot', lp);
          tone('square', 260, 90, 0.08, vol * 0.3);
        }
      } else if (name.startsWith('step_')) {
        const kind = name.slice(5);
        if (kind === 'run') { noise(0.11, vol * 0.9, 'step', 520); tone('sine', 95, 55, 0.08, vol * 0.35); }
        else if (kind === 'crouch') { noise(0.07, vol * 0.5, 'step', 340); }
        else { noise(0.09, vol * 0.7, 'step', 420); tone('sine', 80, 50, 0.06, vol * 0.2); }
      } else if (name === 'loot') {
        noise(0.14, vol * 0.8, 'step', 2600);
        noise(0.12, vol * 0.6, 'step', 1800, 0.11);
        tone('triangle', 600, 300, 0.08, vol * 0.12, 0.02);
      } else if (name === 'explosion') {
        noise(0.7, vol * 1.8, 'shot', 900);
        tone('sine', 70, 28, 0.6, vol * 1.2);
        tone('sawtooth', 180, 40, 0.25, vol * 0.4);
      } else if (name === 'tinnitus') {
        tone('sine', 3900, 3700, 2.4, vol * 0.22);
        tone('sine', 6100, 5800, 1.8, vol * 0.12, 0.05);
        tone('sine', 760, 620, 0.5, vol * 0.2);
      } else if (name === 'nade_bounce') {
        tone('triangle', 1250, 520, 0.09, vol * 0.55);
        noise(0.05, vol * 0.35, 'step', 3200);
      } else if (name === 'hit') {
        tone('square', 900, 500, 0.05, vol * 0.5);
      } else if (name === 'armor_hit') {
        tone('triangle', 1800, 900, 0.09, vol * 0.35);
        noise(0.05, vol * 0.3, 'step', 3000);
      } else if (name === 'dry') {
        tone('square', 240, 180, 0.04, vol * 0.3);
      } else if (name === 'reload') {
        for (let i = 0; i < 3; i++) {
          tone('triangle', i === 0 ? 300 : (i === 1 ? 520 : 420), 200, 0.06, vol * 0.35, i * 0.11);
          noise(0.05, vol * 0.2, 'step', 2400, i * 0.11);
        }
      } else if (name === 'switch') {
        tone('square', 420, 640, 0.07, vol * 0.25);
      } else if (name === 'hurt') {
        tone('sawtooth', 220, 70, 0.22, vol * 0.5);
      } else if (name === 'voice_hurt' || name === 'voice_hurt_ally' || name === 'voice_pain') {
        // 受伤/疼痛的短促叫唤：基频低、快速下滑，像被闷住的一声“呃”
        const base = name === 'voice_hurt_ally' ? 235 : (name === 'voice_pain' ? 190 : 165);
        tone('sawtooth', base, base * 0.55, 0.22, vol * 0.55);
        tone('square', base * 1.7, base * 0.9, 0.13, vol * 0.18, 0.01);
        noise(0.12, vol * 0.18, 'voice', 1200);
      } else if (name === 'voice_breath') {
        // 疼痛时的粗重呼吸：两声带滤波的噪声，一吸一呼
        noise(0.32, vol * 0.55, 'step', 700);
        noise(0.42, vol * 0.42, 'step', 480, 0.3);
        tone('sine', 90, 70, 0.28, vol * 0.08, 0.02);
      } else if (name === 'voice_scream') {
        // 着火：更长、更高、更破的惨叫，明显区别于普通受伤
        noise(0.85, vol * 0.75, 'shot', 2400);
        tone('sawtooth', 640, 240, 0.9, vol * 0.65);
        tone('square', 980, 410, 0.72, vol * 0.28, 0.04);
        tone('sine', 140, 62, 0.8, vol * 0.55);
      } else if (name === 'voice_death') {
        tone('sawtooth', 210, 55, 0.65, vol * 0.5);
        noise(0.5, vol * 0.35, 'shot', 600);
      } else if (name === 'skill') {
        [420, 620, 900].forEach((f, i) => tone('sine', f, f, 0.16, vol * 0.3, i * 0.05));
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

  // ★ 给玩家的即时提示：HUD 顶部横幅 + 背包打开时的置顶 toast。
  //   HUD 的 z-index 低于背包遮罩，旧版在背包里点医疗只写 _log，玩家什么都看不见。
  _hint(text, cls = 'y') {
    this._log(text, cls);
    const bu = this.engine.app && this.engine.app.bagUI;
    if (bu && bu.open && bu.showToast) bu.showToast(text);
  }

  /* ===================== 队内建议 / 标记点 ===================== */
  _getSuggestionPoint() {
    const cam = this.engine.renderer.camera;
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const hit = this.physics.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, 70,
      body => body.userData && (body.userData.type === 'obstacle' || body.userData.type === 'container'));
    let t = hit ? hit.t : 70;
    if (dir.y < -0.02) {
      const tg = (0.2 - origin.y) / dir.y;
      if (tg > 0 && tg < t) t = tg;
    }
    t = Math.max(2, Math.min(70, t));
    const pt = origin.clone().add(dir.clone().multiplyScalar(t));
    pt.y = 0.2;
    // 无人机在高空俯视时落点可能超出地图；建议点必须落在地图内
    const half = ((this.mapSpec && this.mapSpec.size) || 200) / 2 - 3;
    pt.x = Math.max(-half, Math.min(half, pt.x));
    pt.z = Math.max(-half, Math.min(half, pt.z));
    return pt;
  }

  /* ===================== 队友战术计划 ===================== */
  _nearestExtract(x, z) {
    let best = null, bestD = Infinity;
    for (const ex of (this.extracts || [])) {
      const d = Math.hypot(ex.x - x, ex.z - z);
      if (d < bestD) { bestD = d; best = ex; }
    }
    return best;
  }

  _updateSquadPlan(dt) {
    if (!this.allies || !this.allies.length) return;
    if (this.time < 8) return;
    if (this.time < (this._squadPlanT || 0)) return;
    this._squadPlanT = this.time + 6;
    const p = this.player;
    if (!p || !p.body || !p.alive) return;
    const ex = this._nearestExtract(p.body.position.x, p.body.position.z);
    const exDist = ex ? Math.hypot(ex.x - p.body.position.x, ex.z - p.body.position.z) : Infinity;
    const timeLow = this.timeLimit > 0 && (this.timeLimit - this.time) < 75;
    let plan = 'search';
    if (ex && (exDist < COMBAT.EXTRACT_RADIUS + 2 || timeLow || (ex.active && ex.timer > 0))) {
      plan = 'extract';
    } else if (this._squadOrder && this.time < this._squadOrder.t) {
      plan = 'order';
    } else if (this.allies.some(a => a.alive && a.targetEntity)) {
      plan = 'fight';
    }
    if (plan !== this._squadPlan) {
      const leader = this.allies.find(a => a.alive && a.allyIndex === 0) || this.allies.find(a => a.alive);
      if (leader) {
        const line = plan === 'extract' ? '时间不多了，往撤离点靠，别恋战。'
          : (plan === 'fight' ? '保持火力，别追太深。' : '这一片暂时安全，继续搜。');
        this._squadSay(leader.allyName, line);
      }
    }
    this._squadPlan = plan;
    this._squadExtract = ex;
  }

  /* ===================== AI 导航网格 / A* ===================== */
  // 纯 CPU 的 2m 网格寻路：不是完美 navmesh，但能解决“所有 AI 直线撞墙”的主问题。
  // 建筑内部没有多层 navmesh，因此门洞/楼梯仍靠 _avoidObstacles 兜底。
  _ensureNavGrid() {
    if (this._navGrid) return this._navGrid;
    const size = (this.mapSpec && this.mapSpec.size) || 200;
    const cell = 2.0;
    const cols = Math.max(8, Math.ceil(size / cell));
    const rows = cols;
    const min = -size / 2;
    const blocked = new Uint8Array(cols * rows);
    const bodies = [];
    for (const o of (this.obstacles || [])) if (o && o.body) bodies.push(o.body);
    for (const c of (this.containers || [])) if (c && c.body) bodies.push(c.body);
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const x = min + (gx + 0.5) * cell;
        const z = min + (gy + 0.5) * cell;
        let b = 0;
        for (const body of bodies) {
          if (this._navBodyBlocked(body, x, z, 0.55)) { b = 1; break; }
        }
        blocked[gy * cols + gx] = b;
      }
    }
    this._navGrid = { cell, cols, rows, min, blocked };
    return this._navGrid;
  }

  _navBodyBlocked(body, x, z, r) {
    if (!body) return false;
    const halfH = body.halfH || (body.height || 2.4) / 2;
    const y0 = body.yMin !== null && body.yMin !== undefined ? body.yMin : (body.position.y - halfH);
    const y1 = body.yMax !== null && body.yMax !== undefined ? body.yMax : (body.position.y + halfH);
    // 脚踝以下可跨/头顶以上可穿，其余都按阻挡处理
    if (y1 <= 0.45 || y0 >= 2.1) return false;
    if (body.shape === 'aabb') {
      return Math.abs(x - body.position.x) < (body.halfW || 0) + r &&
        Math.abs(z - body.position.z) < (body.halfD || 0) + r;
    }
    return Math.hypot(x - body.position.x, z - body.position.z) < (body.radius || 1) + r;
  }

  _navCellIndex(x, z, g) {
    const gx = Math.max(0, Math.min(g.cols - 1, Math.floor((x - g.min) / g.cell)));
    const gy = Math.max(0, Math.min(g.rows - 1, Math.floor((z - g.min) / g.cell)));
    return gy * g.cols + gx;
  }

  _navCellCenter(idx, g) {
    const gx = idx % g.cols;
    const gy = Math.floor(idx / g.cols);
    return { x: g.min + (gx + 0.5) * g.cell, z: g.min + (gy + 0.5) * g.cell };
  }

  _navNearestWalkable(idx, g, maxRing = 4) {
    if (idx < 0 || idx >= g.blocked.length) return -1;
    if (!g.blocked[idx]) return idx;
    const cx = idx % g.cols, cy = Math.floor(idx / g.cols);
    for (let r = 1; r <= maxRing; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) continue;
          const ni = y * g.cols + x;
          if (!g.blocked[ni]) return ni;
        }
      }
    }
    return -1;
  }

  _findNavPath(sx, sz, tx, tz) {
    const g = this._ensureNavGrid();
    let start = this._navNearestWalkable(this._navCellIndex(sx, sz, g), g);
    let goal = this._navNearestWalkable(this._navCellIndex(tx, tz, g), g);
    if (start < 0 || goal < 0) return null;
    if (start === goal) return [this._navCellCenter(goal, g)];

    const n = g.blocked.length;
    const gScore = new Float32Array(n);
    gScore.fill(Infinity);
    const came = new Int32Array(n);
    came.fill(-1);
    const closed = new Uint8Array(n);
    const heap = [];
    const h = (i) => {
      const ax = i % g.cols, ay = Math.floor(i / g.cols);
      const bx = goal % g.cols, by = Math.floor(goal / g.cols);
      return Math.hypot(ax - bx, ay - by);
    };
    const push = (idx, f) => {
      heap.push([f, idx]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        const t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length && last) {
        heap[0] = last;
        let i = 0;
        while (true) {
          let l = i * 2 + 1, r = l + 1, m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          const t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m;
        }
      }
      return top;
    };

    gScore[start] = 0;
    push(start, h(start));
    const dirs = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
    let found = false;
    while (heap.length) {
      const cur = pop()[1];
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === goal) { found = true; break; }
      const cx = cur % g.cols, cy = Math.floor(cur / g.cols);
      for (const [dx, dz, cost] of dirs) {
        const nx = cx + dx, ny = cy + dz;
        if (nx < 0 || ny < 0 || nx >= g.cols || ny >= g.rows) continue;
        const ni = ny * g.cols + nx;
        if (g.blocked[ni] || closed[ni]) continue;
        // 斜向不允许切墙角
        if (dx !== 0 && dz !== 0) {
          if (g.blocked[cy * g.cols + nx] || g.blocked[ny * g.cols + cx]) continue;
        }
        const ng = gScore[cur] + cost;
        if (ng < gScore[ni]) {
          gScore[ni] = ng;
          came[ni] = cur;
          push(ni, ng + h(ni));
        }
      }
    }
    if (!found) return null;
    const cells = [];
    let cur = goal;
    for (let guard = 0; guard < n && cur !== -1; guard++) {
      cells.push(cur);
      if (cur === start) break;
      cur = came[cur];
    }
    if (cells[cells.length - 1] !== start) return null;
    cells.reverse();
    const path = cells.map(idx => this._navCellCenter(idx, g));
    if (path.length) path.shift(); // 起点格不需要作为路点
    return path;
  }

  _navLineClear(sx, sz, tx, tz) {
    const dx = tx - sx, dz = tz - sz;
    const len = Math.hypot(dx, dz);
    if (len < 0.15) return true;
    const filter = body => body.userData && (body.userData.type === 'obstacle' || body.userData.type === 'container');
    // 小腿高度也要探：矮墙/箱子在 1.05m 视线高度可能“看得过去”，但身体过不去
    const low = this.physics.raycast(sx, 0.55, sz, dx / len, 0, dz / len, len, filter);
    if (low && low.t < len - 0.25) return false;
    const hit = this.physics.raycast(sx, 1.05, sz, dx / len, 0, dz / len, len, filter);
    return !hit || hit.t >= len - 0.25;
  }

  // 所有 AI 的目标移动统一入口：视线直通就走直线，被挡就 A* 绕路。
  _aiMoveTo(enemy, tx, tz, speed, dt) {
    if (!enemy || !enemy.body) return false;
    const ex = enemy.body.position.x, ez = enemy.body.position.z;
    const dx0 = tx - ex, dz0 = tz - ez;
    const dist = Math.hypot(dx0, dz0);
    if (dist < 0.2) {
      enemy.body.velocity.x = 0;
      enemy.body.velocity.z = 0;
      return true;
    }
    const setDirect = () => {
      enemy.angle = Math.atan2(dz0, dx0);
      enemy.body.velocity.x = dx0 / dist * speed;
      enemy.body.velocity.z = dz0 / dist * speed;
    };
    if (dist < 1.2 || this._navLineClear(ex, ez, tx, tz)) {
      enemy._navPath = null;
      setDirect();
      return true;
    }
    const now = this.time;
    const goalMoved = !enemy._navGoal || Math.hypot(tx - enemy._navGoal.x, tz - enemy._navGoal.z) > 2.2;
    if (goalMoved || now > (enemy._navRepathAt || 0) || !enemy._navPath || (enemy._stuckT || 0) > 0.9) {
      enemy._navPath = this._findNavPath(ex, ez, tx, tz);
      enemy._navGoal = { x: tx, z: tz };
      enemy._navRepathAt = now + 1.4 + Math.random() * 0.6;
      enemy._navIndex = 0;
      enemy._stuckT = 0;
    }
    const path = enemy._navPath;
    if (!path || !path.length) { setDirect(); return true; }
    let idx = enemy._navIndex || 0;
    while (idx < path.length - 1) {
      const wp0 = path[idx];
      if (Math.hypot(wp0.x - ex, wp0.z - ez) > 0.7) break;
      idx++;
    }
    enemy._navIndex = idx;
    const wp = path[Math.min(idx, path.length - 1)];
    const dx = wp.x - ex, dz = wp.z - ez;
    const d = Math.hypot(dx, dz);
    if (d < 0.15) { setDirect(); return true; }
    enemy.angle = Math.atan2(dz, dx);
    enemy.body.velocity.x = dx / d * speed;
    enemy.body.velocity.z = dz / d * speed;
    return true;
  }

  /* ===================== 友方 AI 探索记忆 ===================== */
  // 10m 一格；玩家与所有活着的队友每 0.5s 把周围 3×3 格记为已探索。
  // 这个集合只服务友方 AI，不参与战斗/伤害/存档。
  _updateExplorationMemory(dt) {
    if (!this.allies || !this.allies.length) return;
    if (!this._exploredCells) this._exploredCells = new Set();
    if (this._exploreTick > 0) { this._exploreTick -= dt; return; }
    this._exploreTick = 0.5;
    if (this.player && this.player.alive) this._markExplored(this.player.body.position.x, this.player.body.position.z);
    for (const a of this.allies) {
      if (a && a.alive && a.body) this._markExplored(a.body.position.x, a.body.position.z);
    }
  }

  _markExplored(x, z, r = 1) {
    if (!this._exploredCells) this._exploredCells = new Set();
    const cs = 10;
    const cx = Math.floor(x / cs), cz = Math.floor(z / cs);
    for (let i = -r; i <= r; i++) {
      for (let j = -r; j <= r; j++) this._exploredCells.add((cx + i) + ',' + (cz + j));
    }
  }

  _isExplored(x, z) {
    if (!this._exploredCells) return false;
    return this._exploredCells.has(Math.floor(x / 10) + ',' + Math.floor(z / 10));
  }

  // 给队友挑一个“没去过、看得见、别离队长太远”的探索点。
  // 不用完整 A*：候选点先做视线检查，移动中再由 _avoidObstacles 绕墙。
  _pickAllyExplorePoint(enemy) {
    const p = this.player;
    if (!enemy || !enemy.body || !p || !p.body || !this.mapSpec) return null;
    const half = (this.mapSpec.size || 200) / 2 - 3;
    const ex = enemy.body.position.x, ez = enemy.body.position.z;
    const py = enemy.body.position.y || 1;
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < 32; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 28;
      const x = Math.max(-half, Math.min(half, ex + Math.cos(ang) * dist));
      const z = Math.max(-half, Math.min(half, ez + Math.sin(ang) * dist));
      if (Math.hypot(x - ex, z - ez) < 7) continue;
      if (this._isExplored(x, z)) continue;
      const dp = Math.hypot(x - p.body.position.x, z - p.body.position.z);
      if (dp > 48) continue;
      // 别两个队友抢同一个角落
      let taken = false;
      for (const mate of (this.allies || [])) {
        if (!mate || mate === enemy || !mate.alive || !mate._explorePoint) continue;
        if (Math.hypot(mate._explorePoint.x - x, mate._explorePoint.z - z) < 9) { taken = true; break; }
      }
      if (taken) continue;
      const dx = x - ex, dz = z - ez;
      const len = Math.hypot(dx, dz) || 1;
      // 视线检查：从胸口高度看向目标点，墙体/大箱子后面的点不选
      const hit = this.physics.raycast(ex, py + 0.4, ez, dx / len, 0, dz / len, len,
        body => body.userData && (body.userData.type === 'obstacle' || body.userData.type === 'container'));
      if (hit && hit.t < len - 1.2) continue;
      // 偏好 15~22m、离队长 15~35m 的点，避免全队挤在出生点
      let score = 20 - Math.abs(dist - 18) - Math.abs(dp - 25) * 0.18 + Math.random() * 3;
      if (dp < 10) score -= 4;
      if (score > bestScore) { bestScore = score; best = { x, z }; }
    }
    return best;
  }

  _issueSquadOrder(type) {
    if (this.replayMode) return;
    if (!this.allies || !this.allies.some(a => a.alive)) {
      this._hint('当前没有可指挥的友方 AI', 'y');
      return;
    }
    const pt = this._getSuggestionPoint();
    this._squadOrder = {
      type, x: pt.x, z: pt.z, t: this.time + 8,
      id: (this._squadOrderId = (this._squadOrderId || 0) + 1),
    };
    this._spawnSquadOrderMarker(pt.x, pt.z, type === 'advance' ? 0x66e8ff : 0xffb066);
    this._squadSay('队长', type === 'advance'
      ? '建议向标记点推进。'
      : '建议向标记点撤退，别硬顶。');
    this._hint('已发出' + (type === 'advance' ? '前进' : '撤退') + '建议（队友会自行判断是否执行）', 'p');
  }

  _spawnSquadOrderMarker(x, z, color) {
    if (this.replayMode) return;
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.95, 28), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);
    const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 3.2, 8, 1, true), beamMat);
    beam.position.y = 1.6;
    group.add(beam);
    group.position.set(x, 0, z);
    this.engine.renderer.scene.add(group);
    if (!this._squadMarkers) this._squadMarkers = [];
    this._squadMarkers.push(group);
    const start = performance.now();
    const step = () => {
      const t = (performance.now() - start) / 5000;
      if (t >= 1) {
        this.engine.renderer.scene.remove(group);
        group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        const idx = this._squadMarkers ? this._squadMarkers.indexOf(group) : -1;
        if (idx >= 0) this._squadMarkers.splice(idx, 1);
        return;
      }
      const s = 1 + Math.sin(t * Math.PI * 8) * 0.08;
      group.scale.set(s, 1, s);
      mat.opacity = 0.8 * (1 - t);
      beamMat.opacity = 0.22 * (1 - t);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _clearSquadMarkers() {
    if (!this._squadMarkers) { this._squadMarkers = []; return; }
    for (const group of this._squadMarkers) {
      this.engine.renderer.scene.remove(group);
      group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
    this._squadMarkers.length = 0;
  }

  _updateSquadOrderUI() {
    const has = !!(this.allies && this.allies.some(a => a.alive));
    for (const [id, type] of [['squad-advance-btn', 'advance'], ['squad-retreat-btn', 'retreat']]) {
      const btn = document.getElementById(id);
      if (!btn) continue;
      btn.style.display = has ? 'block' : 'none';
      if (btn._squadWorld !== this) {
        btn._squadWorld = this;
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._issueSquadOrder(type);
        };
      }
    }
  }

  /* ===================== 友方小队对话（纯文字，无框） ===================== */
  _squadSay(name, text) {
    if (!text || this.replayMode) return;
    const line = { name: name || '队友', text: String(text), t: this.time };
    const last = this._squadChat[this._squadChat.length - 1];
    if (last && last.name === line.name && last.text === line.text && this.time - last.t < 3) return;
    this._squadChat.push(line);
    if (this._squadChat.length > 30) this._squadChat.shift();
    this._renderSquadChat();
  }

  _renderSquadChat() {
    const el = document.getElementById('squad-chat');
    if (!el) return;
    // ★ 顶部战术字幕：只显示最近 4 条，单行省略，不接收滚动事件。
    //   历史仍保留在 _squadChat 里供回放/调试，但不再撑出一个可误触的滚动区。
    const lines = this._squadChat.slice(-4);
    el.innerHTML = lines.map(l =>
      '<div class="sc-line"><span class="sc-name">' + this._esc(l.name) + '</span>'
      + '<span class="sc-text">' + this._esc(l.text) + '</span></div>'
    ).join('');
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
        const isPositive = !!def.positive;
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
    // ★ 产生时提示：中下靠左、半透明方块，避免长条遮挡
    container.style.cssText = 'position:absolute; left:20%; bottom:180px; transform:translateX(-50%); display:flex; flex-direction:column; align-items:flex-start; gap:6px; pointer-events:none; z-index:60;';
    const hud = document.getElementById('hud');
    if (hud) { hud.appendChild(container); } else { document.body.appendChild(container); }
  }
  
  const el = document.createElement('div');
  const bg = isPositive ? 'rgba(40,160,90,.45)' : 'rgba(180,40,40,.45)';
  const border = isPositive ? 'rgba(120,255,170,.6)' : 'rgba(255,110,110,.6)';
  el.style.cssText = 'padding:8px 12px; background:' + bg + '; border:1px solid ' + border + '; border-radius:8px; color:#fff; font-size:13px; font-weight:700; letter-spacing:1px; box-shadow:0 4px 14px rgba(0,0,0,.45); backdrop-filter:blur(2px); opacity:0; transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform:translateY(16px) scale(0.92); display:flex; align-items:center; gap:8px;';
  el.innerHTML = `<span style="font-size:16px">${icon}</span><span>${name}</span>`;
  container.appendChild(el);
  
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0) scale(1)';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-16px) scale(0.92)';
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
  // 玩家与所有武装阵营敌对；不同 AI 阵营之间默认不主动开战。
  // 这样三个派系是“各自盘踞的据点势力”，而不是一张图里互相绞肉的大战场。
  if (factionA === 'player' || factionB === 'player') return true;
  return false;
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
    if (!this.soundEvents || this.soundEvents.length === 0) break;
    const ai = e.spec.ai || { perception: 0.5 };
    const eFaction = e.spec.faction;

    for (const s of this.soundEvents) {
      // 不听自己发出的声音
      if (s.source === 'enemy' && Math.hypot(s.x - e.body.position.x, s.z - e.body.position.z) < 1.0) continue;
      if (e.state === 'combat' || e.state === 'flee') continue;

      const dist = Math.hypot(e.body.position.x - s.x, e.body.position.z - s.z);
      // 枪声（malignant）传得比脚步远得多：远距离交火也能惊动附近小队
      const earRange = (14 + ai.perception * 24) * (s.type === 'malignant' ? 2.6 : 1);
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

  // 开镜 FOV：机瞄 1.2x，2 倍镜 2x，4 倍镜 4x；同时更新激光指示线
  _updateAimFovAndLaser(dt){
    const p = this.player;
    if (!p || !p.alive) return;
    const cam = this.engine.renderer.camera;
    if (!p._controllingDrone) {
      const w = this.currentWeapon;
      let zoom = 1.2; // 机瞄也有轻微放大
      if (w && w.mods && w.mods.zoom > 1) zoom = w.mods.zoom;
      const target = p.ads ? Math.max(12, 60 / zoom) : 60;
      if (Math.abs(cam.fov - target) > 0.05) {
        cam.fov += (target - cam.fov) * Math.min(1, dt * 12);
        cam.updateProjectionMatrix();
      }
    }
    // 激光：只有当前武器装了激光指示器才显示
    const w = this.currentWeapon;
    const hasLaser = !!(w && !w.isFist && w.mods && w.mods.laser);
    if (!hasLaser) {
      if (this._laserLine) this._laserLine.visible = false;
      return;
    }
    if (!this._laserLine) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.75, depthWrite: false });
      this._laserLine = new THREE.Line(geo, mat);
      this._laserLine.frustumCulled = false;
      this.engine.renderer.scene.add(this._laserLine);
    }
    const origin = new THREE.Vector3();
    cam.getWorldPosition(origin);
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const start = origin.clone().add(dir.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0.12, -0.08, 0));
    let end = start.clone().add(dir.clone().multiplyScalar(45));
    const hit = this.physics.raycast(start.x, start.y, start.z, dir.x, dir.y, dir.z, 45,
      body => body.userData && (body.userData.type === 'obstacle' || body.userData.type === 'enemy' || body.userData.type === 'player' || body.userData.type === 'container'));
    if (hit) end = new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z);
    const arr = this._laserLine.geometry.attributes.position.array;
    arr[0] = start.x; arr[1] = start.y; arr[2] = start.z;
    arr[3] = end.x; arr[4] = end.y; arr[5] = end.z;
    this._laserLine.geometry.attributes.position.needsUpdate = true;
    this._laserLine.visible = true;
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
        if (e.deathTimer <= 0) e.mesh.visible = !!e.trainingDummy;
      } else {
        e.mesh.visible = !!e.trainingDummy;
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
this._killcamKiller = null;
this._deathReplayFrames = null;
this._deathReplayKiller = null;
this._hideKillcamLabel();
// ★ 清理死亡姿态，避免污染下一局
if (this.engine.cameraCtl && this.engine.cameraCtl.resetDeathPose) {
  this.engine.cameraCtl.resetDeathPose();
}
// ★ 收起眼皮 + 清掉死亡暗红蒙版/受击闪光/技能滤镜
this._resetScreenFx();
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
this.paused = false;
// 清掉友方战术对话，避免下一局残留上一队的话
const _squadChatEl = document.getElementById('squad-chat');
if (_squadChatEl) _squadChatEl.innerHTML = '';
this._squadChat = [];
// ★ 轮盘监听器属于本世界，退出时解绑，避免多局叠加
if (this._wheelBound) {
  try {
    document.removeEventListener('pointermove', this._onWheelPointerMove, true);
    document.removeEventListener('pointerdown', this._onWheelPointerDown, true);
    document.removeEventListener('pointerup', this._onWheelPointerUp, true);
    document.removeEventListener('pointercancel', this._onWheelPointerCancel, true);
    document.removeEventListener('mousedown', this._onWheelMouseDown, true);
    document.removeEventListener('mouseup', this._onWheelMouseUp, true);
    window.removeEventListener('keydown', this._onWheelKey, true);
  } catch (_) {}
  this._wheelBound = false;
}
if (this._replayBadgeTextures) {
  for (const tex of this._replayBadgeTextures.values()) { try { tex.dispose(); } catch (_) {} }
  this._replayBadgeTextures.clear();
}
this._clearReplayBadges();
// ★ 如果正在回放时退出，别把回放 HUD/遮罩带进菜单或下一局
this.replayMode = false;
document.getElementById('replay-overlay')?.remove();
const _replayHud = document.getElementById('hud');
if (_replayHud) _replayHud.classList.remove('replay-hud');
// ★ 退出战局时一并复位暂停蒙版，避免下一局开局卡在暂停界面
const _pause = document.getElementById('pause-screen');
if (_pause) _pause.classList.remove('on');
// ★ 清理死亡姿态
if (this.engine.cameraCtl && this.engine.cameraCtl.resetDeathPose) {
  this.engine.cameraCtl.resetDeathPose();
}
// ★ 收起眼皮 + 清掉全屏滤镜
this._resetScreenFx();
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
    if (this._replayGun) {
      this.engine.renderer.camera.remove(this._replayGun);
      this._replayGun = null;
    }
    for (const t of this.tracers) {
      this.engine.renderer.scene.remove(t.line);
      t.line.geometry.dispose();
      t.line.material.dispose();
    }
    this.tracers = [];
    for (const pr of this.projectiles) {
      this.engine.renderer.scene.remove(pr.mesh);
      if (pr.mesh.geometry) pr.mesh.geometry.dispose();
      if (pr.mesh.material) pr.mesh.material.dispose();
    }
    this.projectiles = [];
    for (const f of this.fireFields || []) {
      this.engine.renderer.scene.remove(f.group);
      f.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
    this.fireFields = [];
    this._hazardVfx.clear();
    document.getElementById('hazard-overlay')?.remove();
    document.getElementById('dazzle-overlay')?.remove();
    this._clearThrowPreview();
    this._removeHeldThrowable();
    if (this.drones) {
      for (const d of this.drones) this._removeDrone(d);
      this.drones = [];
    }
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
      // ★ 是否匹配友方 AI 小队（默认关闭，保持原单人体验；可在菜单勾选）
      matchAllies: false,
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
  // 匹配友方 AI 的开关写入 flags，跨局保留
  const _flags = this.engine.save.data && this.engine.save.data.flags;
  this.menuState.matchAllies = !!(_flags && _flags.matchAllies);
  this._setupMenu();
  this._bindGlobalHandlers();
  this._registerDevCommands();

  this.inventory = new Inventory(this.engine.content);
  if (this.engine.save.data && this.engine.save.data.inventory) {
    try { this.inventory.deserialize(this.engine.save.data.inventory); }
    catch (e) { console.warn('[Bag] 库存反序列化失败，重置', e); }
  }
  // ★ 大厅就要完成插板迁移，否则配装页详情里看不到、也取不出插板
  migratePlateToFiber(this.inventory);
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

  this._renderOptions('map-options', e.content.all('maps').filter(m => !m.training), (i) => i.id === this.menuState.map, (i) => ({ title: i18n.t(i.name), sub: `${i.size}×${i.size}m`, value: i.id }), (i) => { this.menuState.map = i.id; });
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
  this._updateCredits();
  e.profile.onChange(() => { this._updateDifficultyDisplay(); this._syncCustomSettingsUI(); });

  // ★ 匹配友方 AI 开关：写 flags，下一局生效
  const matchChk = document.getElementById('chk-match-allies');
  if (matchChk) {
    matchChk.checked = !!this.menuState.matchAllies;
    matchChk.onchange = () => {
      this.menuState.matchAllies = !!matchChk.checked;
      const data = this.engine.save.data || (this.engine.save.data = {});
      if (!data.flags) data.flags = {};
      data.flags.matchAllies = this.menuState.matchAllies;
      try { this.engine.save.save(); } catch (_) {}
    };
  }
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

  // 无人机专用投掷按钮（触屏/鼠标均可）
  document.getElementById('drone-frag-btn')?.addEventListener('click', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    if (this.world && this.world._droneThrowPayload) this.world._droneThrowPayload(this.world.player, 'frag');
  });
  document.getElementById('drone-emp-btn')?.addEventListener('click', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    if (this.world && this.world._droneThrowPayload) this.world._droneThrowPayload(this.world.player, 'emp');
  });
  // 无人机 HUD 的前进/撤退点：移动端没有 P/O 键盘也能在鸟瞰视角下指挥队友
  for (const [id, type] of [['drone-advance-btn', 'advance'], ['drone-retreat-btn', 'retreat']]) {
    document.getElementById(id)?.addEventListener('click', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      if (this.world) this.world._issueSquadOrder(type);
    });
  }

  // 靶场设置
  document.getElementById('training-settings-btn')?.addEventListener('click', () => this._openTrainingModal());
  document.getElementById('tr-close')?.addEventListener('click', () => {
    document.getElementById('training-modal')?.classList.remove('on');
  });
  document.getElementById('tr-apply')?.addEventListener('click', () => this._applyTrainingModal());
  document.getElementById('tr-creative-inv')?.addEventListener('click', () => this._openCreativeModal());
  document.getElementById('tr-refill')?.addEventListener('click', () => {
    if (this.world && this.world._refillTrainingLoadout) this.world._refillTrainingLoadout();
  });
  document.getElementById('tr-restart')?.addEventListener('click', () => {
    document.getElementById('training-modal')?.classList.remove('on');
    this.startMatch('training');
  });

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

  document.getElementById('btn-loadout-ticket')?.addEventListener('click', () => this._openLoadoutPage());
  document.getElementById('btn-loadout-close')?.addEventListener('click', () => this._closeLoadoutPage());
  document.getElementById('btn-loadout-reroll')?.addEventListener('click', () => this._rollLoadout(this._loadoutTier));
  document.getElementById('btn-loadout-equip')?.addEventListener('click', () => this._applyLoadout());
  document.getElementById('btn-loadout-empty')?.addEventListener('click', () => this._applyEmptyLoadout());

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
      // 倒地/死亡时不能再翻背包，否则会出现“躺着整理装备”的假活人观感
      const p = this.world && this.world.player;
      if (p && (!p.alive || (p.status && p.status.isDowned()))) return;
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

  // 把 content 里所有可用防具填进四个下拉框（每个槽位独立选择）
  _populateTrainingArmorSelects(){
    const tableMap = {
      shell: 'helmetShell',
      visor: 'helmetVisor',
      fiber: 'vestFiber',
      plate: 'vestPlate',
    };
    for (const slot in tableMap) {
      const el = document.getElementById('tr-dummy-' + slot);
      if (!el) continue;
      el.innerHTML = '<option value="">无</option>';
      const defs = this.engine.content.all(tableMap[slot])
        .filter(d => d.armorLv > 0)
        .sort((a, b) => (a.armorLv - b.armorLv) || String(a.name).localeCompare(String(b.name)));
      for (const def of defs) {
        const opt = document.createElement('option');
        opt.value = def.id;
        opt.textContent = this.engine.i18n.t(def.name) + ' · Lv' + def.armorLv;
        el.appendChild(opt);
      }
    }
  }

  // ===================== 靶场创造模式 =====================
  _openTrainingWeaponRack(){
    const w = this.world;
    if (!w || !w.training) return;
    if (document.pointerLockElement) document.exitPointerLock();
    let modal = document.getElementById('rack-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rack-modal';
      modal.className = 'modal-overlay';
      modal.style.zIndex = '96';
      modal.innerHTML =
        '<div style="width:min(820px,94vw);max-height:86vh;display:flex;flex-direction:column;padding:16px 18px;background:rgba(10,18,30,.99);border:1px solid rgba(255,200,90,.5);border-radius:12px;text-align:left">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
            '<h2 style="font-size:17px;letter-spacing:3px;margin:0;color:#ffe8b0">靶场武器架</h2>' +
            '<button id="rack-close" class="icon-btn" style="padding:4px 12px">关闭</button>' +
          '</div>' +
          '<div style="font-size:10px;color:#8fb0c8;margin-bottom:8px">点击「主」或「副」直接替换对应槽位；旧武器会放回背包/仓库。</div>' +
          '<div id="rack-list" style="overflow-y:auto;max-height:66vh;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px;font-size:11px"></div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.classList.remove('on'); });
      modal.querySelector('#rack-close').addEventListener('click', () => modal.classList.remove('on'));
    }
    this._renderRackWeapons();
    modal.classList.add('on');
  }

  _renderRackWeapons(){
    const host = document.getElementById('rack-list');
    if (!host) return;
    const content = this.engine.content;
    const i18n = this.engine.i18n;
    const weapons = (content.all('weapons') || []).filter(d => !d.melee);
    host.innerHTML = weapons.map(d => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 8px;background:rgba(20,34,52,.85);border:1px solid rgba(105,170,235,.22);border-radius:6px">
        <div style="min-width:0">
          <div style="font-weight:700;color:#d8e8ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._esc(i18n.t(d.name))}</div>
          <div style="font-size:9px;color:#7f9cb8">${d.ammoType} · ${d.mag} 发 · ${d.rpm} rpm · 射程 ${d.range}m</div>
        </div>
        <div style="display:flex;gap:4px;flex:0 0 auto">
          <button class="icon-btn" data-rack-weapon="${d.id}" data-rack-slot="main" style="padding:3px 8px;font-size:10px">主</button>
          <button class="icon-btn" data-rack-weapon="${d.id}" data-rack-slot="side" style="padding:3px 8px;font-size:10px">副</button>
        </div>
      </div>`).join('');
    host.querySelectorAll('[data-rack-weapon]').forEach(btn => {
      btn.onclick = () => this._equipRackWeapon(btn.dataset.rackWeapon, btn.dataset.rackSlot);
    });
  }

  _equipRackWeapon(defId, slot){
    const w = this.world;
    if (!w || !w.training || !this.inventory) return;
    const inv = this.inventory;
    const def = this.engine.content.get('weapons', defId);
    if (!def) return;
    const uid = inv.createItem('weapons', defId, { loadedQty: def.mag || 0 });
    if (!uid) return;
    const r = inv.equip(slot, uid);
    if (!r.ok) { inv.destroyItem(uid); alert('替换失败：' + (r.reason || '未知原因')); return; }
    if (r.swapped) {
      let placed = false;
      for (const c of ['bag', 'chest', 'pocket', 'stash']) {
        if (inv.addToContainer(c, r.swapped).ok) { placed = true; break; }
      }
      if (!placed) inv.destroyItem(r.swapped);
    }
    w._syncWeaponsFromInventory();
    w._log('武器架：已替换' + (slot === 'main' ? '主武器' : '副武器') + '为 ' + this.engine.i18n.t(def.name), 'p');
  }

  _openCreativeModal(){
    const w = this.world;
    if (!w || !w.training) return;
    const creativeChk = document.getElementById('tr-creative');
    const creativeOn = creativeChk ? !!creativeChk.checked : (w.training.creative !== false);
    if (!creativeOn) {
      alert('请先在靶场设置中勾选“创造模式”');
      return;
    }
    // 打开物品库前先提交靶场设置，避免“改了护具/移动但没点应用”
    if (document.getElementById('training-modal')?.classList.contains('on')) {
      this._applyTrainingModal();
    }
    document.getElementById('training-modal')?.classList.remove('on');
    if (document.pointerLockElement) document.exitPointerLock();
    let modal = document.getElementById('creative-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'creative-modal';
      modal.className = 'modal-overlay';
      modal.style.zIndex = '95';
      modal.innerHTML =
        '<div style="width:min(760px,94vw);max-height:86vh;display:flex;flex-direction:column;padding:16px 18px;background:rgba(10,18,30,.99);border:1px solid rgba(255,200,90,.5);border-radius:12px;text-align:left">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
            '<h2 style="font-size:17px;letter-spacing:3px;margin:0;color:#ffe8b0">创造模式 · 物品库</h2>' +
            '<button id="creative-close" class="icon-btn" style="padding:4px 12px">关闭</button>' +
          '</div>' +
          '<div id="creative-list" style="overflow-y:auto;max-height:66vh;font-size:11px"></div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', (ev) => {
        if (ev.target === modal) modal.classList.remove('on');
      });
      modal.querySelector('#creative-close').addEventListener('click', () => modal.classList.remove('on'));
    }
    this._renderCreativeList();
    modal.classList.add('on');
  }

  _renderCreativeList(){
    const host = document.getElementById('creative-list');
    if (!host) return;
    host.innerHTML = '';
    const categories = [
      ['weapons', '武器'],
      ['ammo', '弹药'],
      ['melee', '近战'],
      ['nade', '投掷物'],
      ['helmetShell', '头盔壳'],
      ['helmetVisor', '面罩'],
      ['helmetEar', '耳罩'],
      ['vestFiber', '纤维内衬'],
      ['vestPlate', '防弹插板'],
      ['backpack', '背包'],
      ['chestRig', '胸挂'],
      ['valuables', '贵重品 / 情报'],
      ['medical', '医疗物资'],
    ];
    const i18n = this.engine.i18n;
    for (const [table, label] of categories) {
      const defs = this.engine.content.all(table);
      if (!defs.length) continue;
      const title = document.createElement('div');
      title.textContent = label;
      title.style.cssText = 'color:#7fe8ff;font-weight:800;letter-spacing:2px;margin:10px 0 5px;border-bottom:1px solid rgba(80,140,200,.2);padding-bottom:3px';
      host.appendChild(title);
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px';
      for (const def of defs) {
        if (!def || !def.id) continue;
        const btn = document.createElement('button');
        btn.className = 'btn ghost';
        btn.style.cssText = 'padding:6px 8px;font-size:11px;text-align:left;white-space:normal;line-height:1.3';
        const lv = def.armorLv ? ' · Lv' + def.armorLv : '';
        btn.textContent = i18n.t(def.name) + lv;
        btn.onclick = () => this._giveCreativeItem(table, def.id);
        grid.appendChild(btn);
      }
      host.appendChild(grid);
    }
  }

  _giveCreativeItem(table, defId){
    const inv = this.inventory;
    if (!inv) return;
    const def = this.engine.content.get(table, defId);
    if (!def) return;
    const extras = {};
    if (table === 'weapons') extras.loadedQty = def.mag || 0;
    if (table === 'ammo') extras.qty = 120;
    if (table === 'nade') extras.qty = Math.min(3, def.stackLimit || 3);
    if (table === 'medical') extras.qty = Math.min(3, def.stackLimit || 3);
    const uid = inv.createItem(table, defId, extras);
    if (!uid) { this.world?._log?.('创造物品失败：' + defId); return; }
    let placed = false;
    for (const cName of ['bag', 'chest', 'pocket', 'stash']) {
      const r = inv.addToContainer(cName, uid, { noMerge: table !== 'ammo' });
      if (r && r.ok) { placed = true; break; }
    }
    if (!placed) {
      inv.destroyItem(uid);
      alert('背包/胸挂/口袋/仓库都放不下了');
      return;
    }
    if (this.bagUI && this.bagUI.open) this.bagUI.refresh();
    const qty = extras.qty ? ' ×' + extras.qty : '';
    if (this.world) this.world._log('创造模式：已发放 ' + this.engine.i18n.t(def.name) + qty, 'p');
  }

  _openTrainingModal(){
    const w = this.world;
    if (!w || !w.training) return;
    const t = w.training;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    const sel = (id, val) => { const el = document.getElementById(id); if (el) el.value = String(val); };
    this._populateTrainingArmorSelects();
    set('tr-show-damage', t.showDamage);
    set('tr-show-panel', t.showAttackPanel);
    set('tr-infinite-ammo', t.infiniteAmmo);
    set('tr-infinite-nades', t.infiniteNades);
    set('tr-skills', t.skills);
    set('tr-nocd', t.noCd);
    set('tr-creative', t.creative !== false);
    sel('tr-dummy-move', t.dummyMoveMode || 'patrol');
    sel('tr-dummy-hp', t.dummyHp);
    const gear = t.dummyGear || {};
    for (const slot of ['shell', 'visor', 'fiber', 'plate']) {
      sel('tr-dummy-' + slot, gear[slot] || '');
    }
    const invBtn = document.getElementById('tr-creative-inv');
    if (invBtn) invBtn.disabled = t.creative === false;
    if (document.pointerLockElement) document.exitPointerLock();
    document.getElementById('training-modal')?.classList.add('on');
  }

  _applyTrainingModal(){
    const w = this.world;
    if (!w || !w.training) return;
    const get = (id) => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : null; };
    w.training.showDamage = !!get('tr-show-damage');
    w.training.showAttackPanel = !!get('tr-show-panel');
    w.training.infiniteAmmo = !!get('tr-infinite-ammo');
    w.training.infiniteNades = !!get('tr-infinite-nades');
    w.training.skills = !!get('tr-skills');
    w.training.noCd = !!get('tr-nocd');
    w.training.creative = !!get('tr-creative');
    w.training.dummyMoveMode = get('tr-dummy-move') || 'patrol';
    w.training.dummyMove = w.training.dummyMoveMode !== 'still';
    w.training.dummyHp = parseInt(get('tr-dummy-hp'), 10) || 100;
    w.training.dummyGear = {
      shell: get('tr-dummy-shell') || null,
      visor: get('tr-dummy-visor') || null,
      fiber: get('tr-dummy-fiber') || null,
      plate: get('tr-dummy-plate') || null,
    };
    w._applyTrainingSettings();
    document.getElementById('training-modal')?.classList.remove('on');
  }

   _renderMarketList() {   const el = document.getElementById('market-list');
  if (!el) return;
  if (!this.market) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:#5c82a8">市场加载中…</div>';
    setTimeout(() => this._renderMarketList(), 200);
    return;
  }
  
  const content = this.engine.content;
  const tables = ['weapons', 'ammo', 'melee', 'nade', 'attach', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig', 'valuables', 'medical'];
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
      this._updateCredits();
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
        if (p.status) {
          p.status.blood = p.status.maxBlood;
          p.status.effects.clear();
          for (const k in p.status.parts) {
            const part = p.status.parts[k];
            part.hp = part.maxHp; part.wound = 0; part.fracture = 0;
            if (part.wounds) part.wounds = [];
          }
          p.status.updateOverallHealth();
        }
        return 'HP 与耦合能已回满';
      }
    });

    dc.register('burn', {
      desc: '点燃自己测试燃烧效果，用法：burn [档位1-3]',
      usage: 'burn [1-3]',
      fn: (args) => {
        if (!this.world || !this.world.player) return '当前无对局';
        const s = Math.min(3, Math.max(1, parseInt(args[0], 10) || 1));
        this.world.player.status.ignite('thorax', s);
        return '已点燃 ' + s + ' 档燃烧';
      }
    });

    dc.register('wound', {
      desc: '给自己加伤口测试，用法：wound <部位> <等级1-4>',
      usage: 'wound <part> <level>',
      fn: (args) => {
        if (!this.world || !this.world.player) return '当前无对局';
        const part = args[0] || 'thorax';
        const lv = Math.min(4, Math.max(1, parseInt(args[1], 10) || 1));
        this.world.player.status.addWound(part, lv);
        this.world.player.status.addEffect('bleeding', 999, this.world.player.status.totalWoundLevel());
        return '已添加 ' + part + ' 伤口 Lv' + lv;
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

    dc.register('nade', {
      desc: '补充投掷物，用法：nade [数量]',
      usage: 'nade [count]',
      fn: (args) => {
        if (!this.world || !this.world.player) return '当前无对局';
        const n = Math.min(20, Math.max(1, parseInt(args[0], 10) || 2));
        this.world.player.grenades = (this.world.player.grenades || 0) + n;
        return `投掷物 +${n}（当前 ${this.world.player.grenades}）`;
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

_ensureStarterThrowables(){
  const inv = this.inventory;
  if (!inv) return;
  const has = (defId) => {
    for (const cn of ['chest', 'pocket', 'bag', 'safe']) {
      const c = inv.containers[cn];
      if (!c) continue;
      for (const uid of c.items.keys()) {
        const it = inv.items.get(uid);
        if (it && it.table === 'nade' && it.defId === defId) return true;
      }
    }
    return false;
  };
  const give = (defId, qty) => {
    const uid = inv.createItem('nade', defId, { qty });
    if (!uid) return;
    if (inv.addToContainer('chest', uid).ok) return;
    if (inv.addToContainer('bag', uid).ok) return;
    inv.addToContainer('stash', uid);
  };
  // 老存档没有投掷物时补发，便于测试
  if (!has('frag')) give('frag', 2);
  if (!has('flashbang')) give('flashbang', 1);
  if (!has('stun')) give('stun', 1);
  if (!has('emp')) give('emp', 1);

  // 基础急救：保证新玩家能真正体验止血/止痛流程（老存档缺则补）
  const hasMed = (defId) => {
    for (const cn of ['chest', 'pocket', 'bag', 'safe']) {
      const c = inv.containers[cn];
      if (!c) continue;
      for (const uid of c.items.keys()) {
        const it = inv.items.get(uid);
        if (it && it.table === 'medical' && it.defId === defId) return true;
      }
    }
    return false;
  };
  const giveMed = (defId, qty) => {
    const uid = inv.createItem('medical', defId, { qty });
    if (!uid) return;
    if (inv.addToContainer('chest', uid).ok) return;
    if (inv.addToContainer('bag', uid).ok) return;
    inv.addToContainer('stash', uid);
  };
  if (!hasMed('bandage')) giveMed('bandage', 2);
  if (!hasMed('painkiller')) giveMed('painkiller', 1);

  // 枪械改装：给新手各一个瞄具/握把，保证进战局就能在背包里试装（老存档缺则补）
  const hasAttach = (defId) => {
    for (const cn of ['chest', 'pocket', 'bag', 'safe']) {
      const c = inv.containers[cn];
      if (!c) continue;
      for (const uid of c.items.keys()) {
        const it = inv.items.get(uid);
        if (it && it.table === 'attach' && it.defId === defId) return true;
      }
    }
    return false;
  };
  const giveAttach = (defId) => {
    const uid = inv.createItem('attach', defId);
    if (!uid) return;
    if (inv.addToContainer('chest', uid).ok) return;
    if (inv.addToContainer('bag', uid).ok) return;
    inv.addToContainer('stash', uid);
  };
  if (!hasAttach('sight_2x')) giveAttach('sight_2x');
  if (!hasAttach('grip_angled')) giveAttach('grip_angled');
}

// ★ GameApp 侧的弹药统计：战局外的配装/制式券也要用它，
//   不能误调 GameWorld 的同名方法（那会导致 startMatch 在 try 之前抛错、加载遮罩卡死）
_countAmmoInInventory(inv, ammoType) {
  if (!inv) return 0;
  let total = 0;
  for (const cName of ['chest', 'pocket', 'bag', 'safe']) {
    const c = inv.containers[cName];
    if (!c) continue;
    for (const uid of c.items.keys()) {
      const item = inv.items.get(uid);
      if (item && item.table === 'ammo' && item.defId === ammoType) total += item.qty;
    }
  }
  return total;
}

_ensureInitialInventory(forceReset){
  const inv = this.inventory;
  if (!inv) return;
  const data = this.engine.save.data;
  if (!data) return;
  if (!data.flags) data.flags = {};

  if (forceReset) {
    this._stripInventoryForLoadout();
  }
  // ★ 不再因 initialInventoryGiven 而整体跳过：战败会清空装备，
  //   下一局必须补齐缺失的主/副武器、护具与基础弹药，否则玩家只能空手上阵。

  const charSpec = this.engine.content.get('characters', this.menuState.char);
  if (!charSpec) return;

  if (!inv.equipped.main && charSpec.weapon) {
    const wDef = this.engine.content.get('weapons', charSpec.weapon);
    const uid = inv.createItem('weapons', charSpec.weapon, {
      loadedQty: wDef ? (wDef.mag || 0) : 0,
    });
    if (uid) inv.equip('main', uid);
  }
  // ★ 角色副武器也要实际发放，否则玩家永远只有一把主武器，1/2 切换形同虚设
  if (!inv.equipped.side && charSpec.sidearm) {
    const sDef = this.engine.content.get('weapons', charSpec.sidearm);
    const suid = inv.createItem('weapons', charSpec.sidearm, {
      loadedQty: sDef ? (sDef.mag || 0) : 0,
    });
    if (suid) inv.equip('side', suid);
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
    if (wDef && this._countAmmoInInventory(inv, wDef.ammoType) < 30) giveAmmo(wDef.ammoType, 120);
  }
  if (charSpec.sidearm) {
    const sDef = this.engine.content.get('weapons', charSpec.sidearm);
    if (sDef && this._countAmmoInInventory(inv, sDef.ammoType) < 20) giveAmmo(sDef.ammoType, 90);
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

  // ★ 初始近战与投掷物（便于测试刀/破片/闪光/震撼/EMP）
  if (!inv.equipped.melee) {
    const kuid = inv.createItem('melee', 'knife');
    if (kuid) inv.equip('melee', kuid);
  }
  const hasNade = (defId) => {
    for (const cn of ['chest', 'pocket', 'bag', 'safe']) {
      const c = inv.containers[cn];
      if (!c) continue;
      for (const uid of c.items.keys()) {
        const it = inv.items.get(uid);
        if (it && it.table === 'nade' && it.defId === defId) return true;
      }
    }
    return false;
  };
  const giveNade = (defId, qty) => {
    if (hasNade(defId)) return;
    const uid = inv.createItem('nade', defId, { qty });
    if (!uid) return;
    if (inv.addToContainer('chest', uid).ok) return;
    if (inv.addToContainer('bag', uid).ok) return;
    inv.addToContainer('stash', uid);
  };
  giveNade('frag', 2);
  giveNade('flashbang', 1);
  giveNade('stun', 1);
  giveNade('emp', 1);

  data.flags.initialInventoryGiven = true;
  this.engine.save.save();
}

_stripInventoryForLoadout(){
  const inv = this.inventory;
  if (!inv) return;
  // 先把胸挂/口袋/背包里的东西全部转进仓库，避免卸下背包时把内容一起销毁
  for (const cName of ['pocket', 'bag', 'chest']) {
    const c = inv.containers[cName];
    if (!c) continue;
    for (const uid of Array.from(c.items.keys())) {
      inv.addToContainer('stash', uid);
    }
  }
  // 再卸下装备槽；能进仓库就保留，实在放不下才销毁
  for (const slot of ['main', 'side', 'melee', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig']) {
    const uid = inv.equipped[slot];
    if (!uid) continue;
    inv.unequip(slot);
    if (!inv.addToContainer('stash', uid).ok) inv.destroyItem(uid);
  }
  // 安全箱不动；如果还有残留的随身容器物品（仓库已满），尽量塞回仓库
  for (const cName of ['chest', 'pocket', 'bag']) {
    const c = inv.containers[cName];
    if (!c) continue;
    for (const uid of Array.from(c.items.keys())) inv.addToContainer('stash', uid);
  }
}

  /* ===================== 制式券 / 配装页 ===================== */
  _updateCredits(){
    const credits = (this.engine.save.data && this.engine.save.data.credits) || 0;
    for (const id of ['menu-credits', 'loadout-credits']) {
      const el = document.getElementById(id);
      if (el) el.textContent = credits.toLocaleString('en-US') + ' cp';
    }
  }

  _pick(arr){ return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; }
  _randInt(a, b){ return a + Math.floor(Math.random() * (b - a + 1)); }
  _esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  _openLoadoutPage(){
    this._showScreen('menu');
    document.getElementById('loadout-page')?.classList.add('on');
    const tiers = this.engine.content.all('loadoutTiers') || [];
    this._loadoutTier = this._loadoutTier || (tiers[0] && tiers[0].id) || 'standard';
    this._rollLoadout(this._loadoutTier);
    this._updateCredits();
  }

  _closeLoadoutPage(){
    document.getElementById('loadout-page')?.classList.remove('on');
    this._setupMenu();
  }

  _rollLoadout(tierId){
    const content = this.engine.content;
    const tier = content.get('loadoutTiers', tierId) || content.get('loadoutTiers', 'standard') || {
      id: 'standard', name: '标准', desc: '', primary: ['ar556'], sidearm: ['p9'], dual: 0,
      armorLv: [3, 4], plateChance: 1, bag: ['medium'], rig: ['large'], ammo: 120, sideAmmo: 45,
      meds: 3, nades: 2, attach: 1, special: [],
    };
    this._loadoutTier = tier.id || tierId;
    const primary = this._pick(tier.primary);
    const primaryDef = content.get('weapons', primary);
    let second = null;
    if (Math.random() < (tier.dual || 0)) {
      const pool = (tier.primary || []).filter(w => w !== primary);
      second = this._pick(pool);
    }
    const sidearm = !second && Math.random() < 0.85 ? this._pick(tier.sidearm) : null;
    const lvRange = tier.armorLv || [3, 4];
    const lv = this._randInt(lvRange[0], lvRange[1]);
    const shellLv = Math.max(2, Math.min(5, lv));
    const fiberLv = Math.max(3, Math.min(5, lv));
    const plateLv = Math.max(3, Math.min(5, lv));
    const armor = {
      shell: 'lv' + shellLv,
      visor: 'lv' + Math.max(2, Math.min(5, lv)),
      fiber: 'lv' + fiberLv,
      plate: Math.random() < (tier.plateChance || 0) ? 'lv' + plateLv : null,
    };
    const bag = this._pick(tier.bag);
    const rig = this._pick(tier.rig);
    // 随机医疗/投掷物/配件/特殊装备
    const medPool = (content.all('medical') || []).map(m => m.id);
    const meds = [];
    for (let i = 0; i < (tier.meds || 0); i++) { const id = this._pick(medPool); if (id) meds.push(id); }
    const nadePool = ['frag', 'flashbang', 'stun', 'emp', 'molotov', 'stun_impact', 'flash_impact'];
    const nades = [];
    for (let i = 0; i < (tier.nades || 0); i++) { const id = this._pick(nadePool); if (id) nades.push(id); }
    const attachPool = (content.all('attach') || [])
      .filter(a => (!a.fits || a.fits.includes(primary)) && (!a.caliber || a.caliber === (primaryDef && primaryDef.ammoType)))
      .map(a => a.id);
    const attaches = [];
    for (let i = 0; i < (tier.attach || 0); i++) { const id = this._pick(attachPool); if (id) attaches.push(id); }
    const special = (tier.special || []).filter(() => Math.random() < 0.75);
    this._loadoutRoll = {
      tier, primary, primaryDef, second, sidearm, armor, bag, rig,
      ammo: tier.ammo || 120, sideAmmo: tier.sideAmmo || 45,
      meds, nades, attaches, special,
      value: 0,
    };
    // 估算价值（只用于展示）
    const val = (table, id) => { const d = content.get(table, id); return (d && d.value) || 0; };
    let v = val('weapons', primary);
    if (second) v += val('weapons', second);
    if (sidearm) v += val('weapons', sidearm);
    v += val('helmetShell', armor.shell) + val('helmetVisor', armor.visor) + val('vestFiber', armor.fiber);
    if (armor.plate) v += val('vestPlate', armor.plate);
    v += val('backpack', bag) + val('chestRig', rig);
    for (const m of meds) v += val('medical', m);
    for (const a of nades) v += val('nade', a);
    for (const a of attaches) v += val('attach', a);
    for (const s of special) v += val(s.table, s.id);
    this._loadoutRoll.value = v;
    this._renderLoadoutPage();
  }

  _renderLoadoutPage(){
    const content = this.engine.content;
    const i18n = this.engine.i18n;
    const tierHost = document.getElementById('loadout-tiers');
    const preview = document.getElementById('loadout-preview');
    const summary = document.getElementById('loadout-summary');
    if (!tierHost || !preview || !summary) return;
    const tiers = content.all('loadoutTiers') || [];
    tierHost.innerHTML = tiers.map(t => {
      const active = t.id === this._loadoutTier;
      return `<button data-loadout-tier="${t.id}" style="text-align:left;padding:12px;border-radius:10px;cursor:pointer;font-family:inherit;background:${active ? 'rgba(50,110,170,.45)' : 'rgba(14,22,34,.9)'};border:1.5px solid ${active ? 'rgba(120,200,255,.85)' : 'rgba(105,170,235,.25)'};color:#d8e2ee">
        <div style="font-size:14px;font-weight:800;color:${active ? '#9fe8ff' : '#cfe4f8'};letter-spacing:2px">${this._esc(i18n.t(t.name))}</div>
        <div style="font-size:10px;color:#8fb0c8;margin-top:4px;line-height:1.5">${this._esc(i18n.t(t.desc))}</div>
      </button>`;
    }).join('');
    tierHost.querySelectorAll('[data-loadout-tier]').forEach(btn => {
      btn.onclick = () => { this._loadoutTier = btn.dataset.loadoutTier; this._rollLoadout(this._loadoutTier); };
    });

    const L = this._loadoutRoll;
    if (!L) return;
    const name = (table, id) => { const d = content.get(table, id); return d ? i18n.t(d.name) : id; };
    const weaponRow = (label, id) => {
      const d = content.get('weapons', id);
      if (!d) return '';
      return `<div style="padding:5px 0;border-bottom:1px solid rgba(105,170,235,.12)">
        <div><span style="color:#7fd0ff">${label}</span> <b>${this._esc(name('weapons', id))}</b></div>
        <div style="font-size:10px;color:#8fb0c8">${d.ammoType} · ${d.mag} 发 · ${d.rpm} rpm · 射程 ${d.range}m · 后坐 ${d.recoil} · 价值 ${d.value} cp</div>
      </div>`;
    };
    let html = `<div style="font-size:11px;color:#7fd0ff;letter-spacing:2px;margin-bottom:6px">配装预览</div>`;
    html += weaponRow('主武器', L.primary);
    if (L.second) html += weaponRow('副主武器（双枪）', L.second);
    if (L.sidearm) html += weaponRow('手枪', L.sidearm);
    html += `<div style="margin-top:8px;color:#8fb0c8">护具：${this._esc(name('helmetShell', L.armor.shell))} / ${this._esc(name('helmetVisor', L.armor.visor))} / ${this._esc(name('vestFiber', L.armor.fiber))}${L.armor.plate ? ' + ' + this._esc(name('vestPlate', L.armor.plate)) : '（无插板）'}</div>`;
    html += `<div style="color:#8fb0c8">携行：${this._esc(name('backpack', L.bag))} + ${this._esc(name('chestRig', L.rig))}</div>`;
    html += `<div style="color:#8fb0c8;margin-top:4px">医疗：${L.meds.length ? L.meds.map(id => this._esc(i18n.t((content.get('medical', id) || {}).name || id))).join('、') : '无'}</div>`;
    html += `<div style="color:#8fb0c8">投掷物：${L.nades.length ? L.nades.map(id => this._esc(i18n.t((content.get('nade', id) || {}).name || id))).join('、') : '无'}</div>`;
    if (L.attaches.length) html += `<div style="color:#8fb0c8">配件：${L.attaches.map(id => this._esc(i18n.t((content.get('attach', id) || {}).name || id))).join('、')}</div>`;
    if (L.special.length) html += `<div style="color:#ffd93d">特殊装备：${L.special.map(s => this._esc(i18n.t((content.get(s.table, s.id) || {}).name || s.id))).join('、')}</div>`;
    preview.innerHTML = html;

    summary.innerHTML = `<div style="font-size:11px;color:#7fd0ff;letter-spacing:2px">配装估值</div>
      <div style="font-size:22px;font-weight:900;color:#ffd93d;margin:4px 0">${L.value.toLocaleString('en-US')} cp</div>
      <div style="color:#8fb0c8">武器弹药：主武器 ${L.ammo} 发${L.second ? ' ×2 把' : ''}${L.sidearm ? ' · 手枪 ' + L.sideAmmo + ' 发' : ''}</div>
      <div style="color:#8fb0c8">配装来源：<b style="color:#a8d8ff">${this._esc(i18n.t(L.tier.name))}</b> 制式券</div>
      <div style="font-size:10px;color:#5c82a8;margin-top:6px">刷新只改变预览；领取后才会写入仓库/随身装备。</div>`;
  }

  _giveToCarry(inv, table, defId, qty){
    const uid = inv.createItem(table, defId, qty !== undefined ? { qty } : {});
    if (!uid) return null;
    for (const c of ['chest', 'bag', 'pocket', 'safe']) {
      if (inv.addToContainer(c, uid).ok) return uid;
    }
    inv.addToContainer('stash', uid);
    return uid;
  }

  _applyLoadout(){
    const L = this._loadoutRoll;
    if (!L || !this.inventory) return;
    const inv = this.inventory;
    const content = this.engine.content;
    inv.maxCarryWeight = 0; // 菜单配装不受上一局负重硬上限影响
    this._stripInventoryForLoadout();

    const equipWeapon = (defId, slot) => {
      const d = content.get('weapons', defId);
      if (!d) return null;
      const uid = inv.createItem('weapons', defId, { loadedQty: d.mag || 0 });
      if (uid) inv.equip(slot, uid);
      return uid;
    };
    const mainUid = equipWeapon(L.primary, 'main');
    if (L.second) equipWeapon(L.second, 'side');
    else if (L.sidearm) equipWeapon(L.sidearm, 'side');
    // 近战
    const kuid = inv.createItem('melee', 'knife');
    if (kuid) inv.equip('melee', kuid);
    // 护具（插板必须在纤维之后）
    const eqArmor = (table, defId, slot) => {
      if (!defId) return null;
      const uid = inv.createItem(table, defId);
      if (uid) inv.equip(slot, uid);
      return uid;
    };
    eqArmor('helmetShell', L.armor.shell, 'helmetShell');
    eqArmor('helmetVisor', L.armor.visor, 'helmetVisor');
    eqArmor('vestFiber', L.armor.fiber, 'vestFiber');
    if (L.armor.plate) eqArmor('vestPlate', L.armor.plate, 'vestPlate');
    eqArmor('backpack', L.bag, 'backpack');
    eqArmor('chestRig', L.rig, 'chestRig');

    // 弹药：主武器/副主武器/手枪各自口径
    const mainDef = content.get('weapons', L.primary);
    if (mainDef) this._giveToCarry(inv, 'ammo', mainDef.ammoType, L.ammo);
    if (L.second) {
      const d = content.get('weapons', L.second);
      if (d) this._giveToCarry(inv, 'ammo', d.ammoType, Math.round(L.ammo * 0.6));
    }
    if (L.sidearm) {
      const d = content.get('weapons', L.sidearm);
      if (d) this._giveToCarry(inv, 'ammo', d.ammoType, L.sideAmmo);
    }
    // 医疗/投掷物
    for (const m of L.meds) this._giveToCarry(inv, 'medical', m, 1);
    for (const n of L.nades) this._giveToCarry(inv, 'nade', n, 1);
    // 配件：优先装到主武器
    if (L.attaches.length && mainUid) {
      const wItem = inv.items.get(mainUid);
      for (const aId of L.attaches) {
        const aDef = content.get('attach', aId);
        if (!aDef || !wItem) continue;
        const aUid = inv.createItem('attach', aId);
        if (!aUid) continue;
        const ar = inv.attachTo(mainUid, aDef.slot, aUid);
        if (!ar.ok) {
          // 槽位被占/不兼容：放回背包
          for (const c of ['chest', 'bag', 'pocket']) if (inv.addToContainer(c, aUid).ok) break;
        } else if (ar.swapped) {
          // 同槽位被替换下来的旧配件回背包，不能变幽灵
          for (const c of ['chest', 'bag', 'pocket']) if (inv.addToContainer(c, ar.swapped).ok) break;
        }
      }
    }
    for (const s of L.special) this._giveToCarry(inv, s.table, s.id, 1);

    this.engine.save.save();
    if (this.bagUI) this.bagUI.refresh();
    this._updateCredits();
    this._closeLoadoutPage();
    alert('制式券已装备：' + this.engine.i18n.t(L.tier.name) + '配装。按 B 打开背包查看。');
  }

  _applyEmptyLoadout(){
    if (!this.inventory) return;
    if (!confirm('卸下当前随身装备与容器？所有物品会移入仓库，仓库物品保留。')) return;
    this._stripInventoryForLoadout();
    this.engine.save.save();
    if (this.bagUI) this.bagUI.refresh();
    this._closeLoadoutPage();
    alert('已卸下随身装备（物品已移入仓库），可从仓库自行配装后进入战区。');
  }


async startMatch(kind){
  const e = this.engine;
  this._lastMatchKind = kind;

  // ★ 开场统一复位：上一局可能残留暂停蒙版 / 换弹条 / 附近列表
  if (this.bagUI && this.bagUI.open) {
    try { this.bagUI.close(); } catch (err) { console.warn(err); }
  }
  this._clearMatchUI();
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
  // 移动按钮/相机绑定失败不应该把整局卡在加载遮罩里
  try { this._setupMobileControls(isMobile); }
  catch (err) { console.warn('[GameApp] 移动端控件初始化失败（继续启动）:', err); }
  try { this._bindCameraControls(); }
  catch (err) { console.warn('[GameApp] 相机控制初始化失败（继续启动）:', err); }

  if (this.world) {
    try { this.world.destroy(); } catch (err) { console.warn(err); }
    this.world = null;
  }

  // ★ 普通战局不再自动发放制式券/初始装备：玩家可以在制式券页领取，或清空后
  //   从仓库自行配装，甚至什么都不穿直接进。训练场仍自动补一套便于测试。
  try {
    if (!this.inventory) this.inventory = new Inventory(this.engine.content);
    if (kind === 'training') {
      this._ensureInitialInventory();
      this._ensureStarterThrowables();
    }
  } catch (err) {
    console.error('[GameApp] 配装初始化失败:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    this._clearMatchUI();
    this._showScreen('menu');
    alert('配装初始化失败：' + (err && err.message ? err.message : String(err)));
    return;
  }

  // 尝试加载外置地图；训练场固定使用独立靶场，不随菜单地图选择变化
  let layout = null;
  const matchMapId = kind === 'training' ? 'training' : (this.menuState.map || 'factory');
  // ★ 训练场保底：即使 content 表被外部覆盖/旧缓存漏掉 training，
  //   也必须能进入靶场，而不是抛「地图不存在」。
  let mapSpec = e.content.get('maps', matchMapId);
  if (!mapSpec && kind === 'training') mapSpec = this._trainingMapSpec();
  if (!mapSpec) {
    if (loadingEl) loadingEl.style.display = 'none';
    this._clearMatchUI();
    this._showScreen('menu');
    alert('找不到地图：' + matchMapId + '\n可用地图：' + e.content.all('maps').map(m => m.id).join('、'));
    return;
  }
  if (mapSpec.layoutUrl) {
    try {
      // 相对 game.js 解析，避免页面 URL 没有结尾斜杠时 maps/ 被解析到站点根目录
      const layoutUrl = new URL(mapSpec.layoutUrl, import.meta.url).href;
      const res = await fetch(layoutUrl, { cache: 'no-cache' });
      if (res.ok) {
        layout = await res.json();
      } else {
        console.warn('[Map] layoutUrl 加载失败，回退随机生成：', mapSpec.layoutUrl, res.status);
      }
    } catch (err) {
      console.warn('[Map] layoutUrl fetch 异常，回退随机生成：', err);
    }
  }
  // ★ 训练场布局加载失败时用内置布局，而不是随机障碍；
  //   保证“靶场”永远是可测试的固定靶位，而不是报错/空图。
  if (kind === 'training' && (!layout || !Array.isArray(layout.obstacles))) {
    layout = this._trainingFallbackLayout();
  }

  try {
    this.world = new GameWorld(e, {
      mapId: matchMapId,
      mapSpec,
      charId: this.menuState.char,
      diffId: this.menuState.diff,
      modeId: this.menuState.mode,
      kind,
      layout,
      matchAllies: !!this.menuState.matchAllies,
    });

    this.world.onEnd = (success, stats) => this._onMatchEnd(success, stats);
if (loadingBar) loadingBar.style.width = '70%';
this.world.start();
if (isMobile) this.world._updateMobileButtons();
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
    try { if (this.world) { this.world.destroy(); this.world = null; } } catch (_) {}
    this._clearMatchUI();
    alert('启动失败，请查看控制台：' + (err && err.message ? err.message : String(err)));
    this._showScreen('menu');
  }
}

  // 训练场的保底地图定义：与 content.js / maps/training.json 保持同一语义。
  _trainingMapSpec(){
    return {
      id: 'training',
      name: 'content.map.training.name',
      desc: 'content.map.training.desc',
      size: 120,
      obstacleCount: 20,
      enemyCount: 6,
      layoutUrl: 'maps/training.json',
      training: true,
    };
  }

  // 训练场 JSON 不可用时的内置布局：外墙 + 三道矮墙 + 固定靶位。
  // 只用于兜底，正常情况下优先读取 maps/training.json。
  _trainingFallbackLayout(){
    const dummy = (x, z) => ({
      x, z, spec: 'training_dummy', squad: 'dummy', patrolRadius: 2,
    });
    return {
      id: 'training',
      size: 120,
      playerSpawn: { x: 0, z: 46, angle: 0 },
      obstacles: [
        { x: 0, z: -52, w: 100, d: 1, yMin: 0, yMax: 3, type: 'highWall' },
        { x: -50, z: 0, w: 1, d: 104, yMin: 0, yMax: 3, type: 'highWall' },
        { x: 50, z: 0, w: 1, d: 104, yMin: 0, yMax: 3, type: 'highWall' },
        { x: 0, z: 20, w: 64, d: 0.6, yMin: 0, yMax: 1, type: 'lowWall' },
        { x: 0, z: 5, w: 64, d: 0.6, yMin: 0, yMax: 1, type: 'lowWall' },
        { x: 0, z: -10, w: 64, d: 0.6, yMin: 0, yMax: 1, type: 'lowWall' },
        { x: 0, z: -46, w: 70, d: 2, yMin: 0, yMax: 5, type: 'building' },
        { x: -42, z: 34, w: 3, d: 3, yMin: 0, yMax: 1.6, type: 'crate' },
        { x: 42, z: 34, w: 3, d: 3, yMin: 0, yMax: 1.6, type: 'crate' },
      ],
      containers: [{ x: -10, z: 40 }, { x: 10, z: 40 }, { x: 0, z: 30 }],
      extracts: [],
      enemySpawns: [dummy(0, 18), dummy(-12, 3), dummy(12, 3), dummy(0, -12), dummy(-12, -12), dummy(12, -12)],
    };
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
            label: '查看死亡回放',
            onClick: () => {
              this._playDeathReplay();
            },
          },
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

    // ★ 非 straight 失败：结果页提供死亡回放
    let drBtn = document.getElementById('btn-death-replay');
    if (!drBtn && !success && statsEl && statsEl.parentNode) {
      drBtn = document.createElement('button');
      drBtn.id = 'btn-death-replay';
      drBtn.textContent = '死亡回放';
      drBtn.style.cssText = 'margin-top:10px;padding:10px 22px;border-radius:8px;background:rgba(120,40,40,.7);border:1px solid rgba(255,120,120,.5);color:#ffd0d0;font-size:13px;cursor:pointer;';
      statsEl.parentNode.appendChild(drBtn);
    }
    if (drBtn) {
      drBtn.onclick = () => {
        this._playDeathReplay();
      };
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
    document.getElementById('result-screen')?.classList.add('on');
    e.bus.emit('matchEnded', { success, stats, reward: finalReward, assessment });
  } catch (err) {
    console.error('[GameApp] 结算出错:', err);
  }
}

  _togglePause(force){
  const pauseScreen = document.getElementById('pause-screen');
  // ★ 战局已结束/未开始时也要把蒙版收掉，避免暂停界面卡在大厅
  if (!this.world || !this.world.running) {
    if (pauseScreen) pauseScreen.classList.remove('on');
    return;
  }
  const isPaused = this.world.paused;
  const target = force !== undefined ? force : !isPaused;

  if (target) {
    this.world.pause();
    if (pauseScreen) pauseScreen.classList.add('on');
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
    if (pauseScreen) pauseScreen.classList.remove('on');
    /* 从暂停恢复：用户点"继续"是手势事件，直接重新锁鼠标 */
    const canvas = this.engine.renderer.canvas;
    if (typeof canvas.requestPointerLock === 'function') {
      try { canvas.requestPointerLock(); } catch (_) {}
    }
  }
}

    _quitToMenu(){
  if (document.pointerLockElement) document.exitPointerLock();

  // ★ 先关搜刮界面，再统一复位战局内 UI：
  //   暂停蒙版 / 换弹进度 / 附近列表 / 武器栏都不能残留到大厅或下一局
  if (this.bagUI) {
    try { this.bagUI.close(); } catch (e) { console.warn(e); }
  }
  this._clearMatchUI();

  if (this.world) {
    try { this.world.destroy(); } catch (e) { console.warn(e); }
    this.world = null;
    if (this.inventory) {
      // 战局结束解除负重硬上限，仓库/大厅里的整理不受战斗配装限制
      this.inventory.maxCarryWeight = 0;
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

  // 统一清理战局内的临时 DOM 状态（进入/退出战局都要调用）
  _clearMatchUI(){
    if (document.pointerLockElement) document.exitPointerLock();
    if (this.world && this.world._closeNadeWheel) this.world._closeNadeWheel(false);

    for (const id of ['pause-screen', 'result-screen', 'bagui-overlay', 'search-panel', 'training-modal', 'creative-modal', 'loadout-page']) {
      document.getElementById(id)?.classList.remove('on');
    }
    document.getElementById('action-progress')?.classList.remove('on');
    document.getElementById('extract-progress')?.classList.remove('on');

    const nearby = document.getElementById('nearby-list');
    if (nearby) nearby.innerHTML = '';
    const weaponBar = document.getElementById('weapon-bar');
    if (weaponBar) weaponBar.innerHTML = '';
    for (const id of ['nade-wheel-btn', 'med-wheel-btn', 'throwable-arm-btn']) {
      const b = document.getElementById(id);
      if (b) b.style.display = 'none';
    }
    const killFeed = document.getElementById('kill-feed');
    if (killFeed) killFeed.innerHTML = '';
    const taskList = document.getElementById('task-list');
    if (taskList) taskList.innerHTML = '';
    const statusBar = document.getElementById('status-bar');
    if (statusBar) statusBar.innerHTML = '';
    const tacBar = document.getElementById('tactical-state');
    if (tacBar) tacBar.innerHTML = '';
    if (this.world && this.world.hud) {
      this.world.hud._tacSig = '';
      this.world.hud._lastEffectSig = '';
    }
    const hazard = document.getElementById('hazard-overlay');
    if (hazard) { hazard.className = ''; hazard.style.opacity = '0'; }
    const dazzle = document.getElementById('dazzle-overlay');
    if (dazzle) { dazzle.classList.remove('hands'); dazzle.style.opacity = '0'; }
    const ext = document.getElementById('extinguish-btn');
    if (ext) ext.style.display = 'none';
    const alertBar = document.getElementById('alert-bar');
    if (alertBar) alertBar.innerHTML = '';
    const skillBar = document.getElementById('skill-bar');
    if (skillBar) skillBar.innerHTML = '';
    const armorHit = document.getElementById('armor-hit-indicator');
    if (armorHit) { armorHit.classList.remove('on'); armorHit.classList.remove('broken'); }
    const hitMarker = document.getElementById('hit-marker');
    if (hitMarker) hitMarker.style.opacity = '0';
    const fireModeBtn = document.getElementById('fire-mode-btn');
    if (fireModeBtn) fireModeBtn.style.display = 'none';
    const effectPopups = document.getElementById('effect-popups');
    if (effectPopups) effectPopups.innerHTML = '';
    const dummyInfo = document.getElementById('dummy-info-panel');
    if (dummyInfo) dummyInfo.style.display = 'none';
    const kcLabel = document.getElementById('killcam-label');
    if (kcLabel) kcLabel.style.display = 'none';
    const nw = document.getElementById('nade-wheel');
    if (nw) nw.classList.remove('on');
    const bo = document.getElementById('blind-overlay');
    if (bo) bo.style.opacity = '0';
    const th = document.getElementById('throwable-hint');
    if (th) th.style.display = 'none';
    const armBtn = document.getElementById('throwable-arm-btn');
    if (armBtn) armBtn.style.display = 'none';
    const dp = document.getElementById('drone-panel');
    if (dp) dp.style.display = 'none';
    const fxSkill = document.getElementById('fx-skill');
    if (fxSkill) { fxSkill.style.opacity = '0'; fxSkill.style.boxShadow = ''; fxSkill.style.background = ''; }
    const fxLines = document.getElementById('fx-skill-lines');
    if (fxLines) fxLines.classList.remove('on');
    const hudEl = document.getElementById('hud');
    if (hudEl) { hudEl.classList.remove('drone-mode'); hudEl.classList.remove('training-mode'); }
    const droneHud = document.getElementById('drone-hud');
    if (droneHud) droneHud.classList.remove('on');
  }

  // ★ 死亡回放：从死亡记录播放击杀者前十几秒的录像
  _playDeathReplay(){
    const w = this.world;
    if (!w || !w._deathRecord || !w._deathRecord.frames || w._deathRecord.frames.length < 2) {
      alert('没有可用的死亡回放');
      return;
    }
    const reportEl = document.getElementById('combat-report-overlay');
    const resultEl = document.getElementById('result-screen');
    const wasReport = !!(reportEl && reportEl.classList.contains('on'));
    const wasResult = !!(resultEl && resultEl.classList.contains('on'));
    this._replayReturn = wasReport ? 'report' : (wasResult ? 'result' : 'none');
    if (resultEl) resultEl.classList.remove('on');
    hideCombatReport();
    if (this.bagUI && this.bagUI.open) this.bagUI.close();
    const ch = document.getElementById('crosshair');
    if (ch) ch.style.display = 'none';
    const ok = w._startReplay(
      w._deathRecord.frames,
      w._deathRecord.killerName,
      w._deathRecord.shots,
      w._deathRecord.killerIdx,
      w._deathRecord.fx
    );
    if (!ok) alert('录像数据不足');
  }

  _onReplayEnd(){
    const ch = document.getElementById('crosshair');
    if (ch) ch.style.display = 'none';
    if (this._replayReturn === 'report') {
      const ov = document.getElementById('combat-report-overlay');
      if (ov) ov.classList.add('on');
    } else if (this._replayReturn === 'result') {
      document.getElementById('result-screen')?.classList.add('on');
    }
    this._replayReturn = null;
  }

  _showScreen(name){
    const map = { boot: 'boot-screen', menu: 'menu-screen', game: 'game-screen' };
    for (const key in map) {
      const el = document.getElementById(map[key]);
      if (!el) continue;
      el.classList.toggle('on', key === name);
    }
    // ★ 暂停按钮只在战局内显示，防止回大厅后残留
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.style.display = name === 'game' ? 'flex' : 'none';
    if (name === 'menu') this._updateCredits();
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
      // ★ 轮盘打开时鼠标位移用于推轮盘虚拟摇杆，不能再转视角
      if (this.world && this.world._nadeWheelOpen) return;
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
    { key: 'input.adsToggle', name: '瞄准：点按切换', type: 'checkbox', def: false },
    { key: 'input.breathHold', name: '启用屏息', type: 'checkbox', def: true },
    // ★ 新增灵敏度滑块
    { key: 'input.sensitivity', name: '视角灵敏度', type: 'range', min: 0.5, max: 3.0, step: 0.1 },
    { key: 'input.wheelSensitivity', name: '投掷轮盘灵敏度', type: 'range', min: 0.8, max: 4.0, step: 0.1, def: 2.4 },
    { key: 'input.throwPower', name: '投掷力度', type: 'range', min: 0.7, max: 1.6, step: 0.05, def: 1.0 }
  ];

  el.innerHTML = '';
  for (const opt of options) {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;color:#cfe4f8;font-size:12px;padding:6px;background:rgba(20,32,46,.5);border-radius:6px;';
    
    if (opt.type === 'checkbox') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.key = opt.key;
      checkbox.dataset.def = opt.def ? '1' : '0';
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
    const def = input.dataset.def === '1';
    const val = this.engine.profile.get(key, def);
    if (input.type === 'checkbox') {
      input.checked = val === true;
    } else if (input.type === 'range') {
      const rangeDef = key === 'input.wheelSensitivity' ? 2.4 : 1.0;
      const rangeVal = this.engine.profile.get(key, rangeDef);
      input.value = (rangeVal !== false && rangeVal !== undefined) ? rangeVal : rangeDef;
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
} else if (name === 'throwWheel') {
  if (this.world) this.world._toggleNadeWheel();
} else if (name === 'medWheel') {
  if (this.world) this.world._toggleMedWheel();
} else if (name === 'tailStrike') {
  if (this.world) this.world._tailStrike(this.world.player);
} else if (name === 'throw') {
  if (this.world) this.world._quickThrow(this.world.player);
} else if (name === 'droneControl') {
  if (this.world) this.world._toggleDroneControl();
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

  // 如果战局已存在，立刻把技能按钮刷成真实技能名（避免首帧出现“技能1/技能2”）
  if (this.world) this.world._updateMobileButtons();
  else {
    if (this._mobileButtons.skill1) this._mobileButtons.skill1.textContent = '✦';
    if (this._mobileButtons.skill2) this._mobileButtons.skill2.textContent = '✦';
    if (this._mobileButtons.droneControl) this._mobileButtons.droneControl.style.display = 'none';
  }
}
 
}
