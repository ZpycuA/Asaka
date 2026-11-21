/* ============================================================
   LaiAsaka Engine · Content Registry
   v3.0.0 · © 2026 ZpycuA · CC BY-NC 4.0
   ------------------------------------------------------------
   本文件是"所有游戏内容的注册入口"。引擎不认识这里的东西，
   只是把数据存到 ContentRegistry 里，由 game.js 取用。
   
   所有 name/desc 字段是 i18n key，由 locale 文件提供翻译。
   外部可用 window.LAIASAKA_CONTENT 覆盖/扩展。
   ============================================================ */

export function registerDefaultContent(engine) {
  const c = engine.content;

  /* ==========================================================
/* ==========================================================
   1. 弹药
   ----------------------------------------------------------
   massG: 弹头质量（克）
   v0:    枪口初速（米/秒）
   tier:  稀有度（0~5），仅用于掉落/展示，与穿透力无关
   pen:   穿透力（0~9），供 CombatSystem.applyArmor 消费
          与护甲 lv 对比：pen-lv>=3 → 几乎无视，>=1 → 削弱减伤，
          =0 → 正常，<=-2 → 减伤增强
   ⚠ 这两者独立：tier 高不代表穿透高，反之亦然
   ========================================================== */
const AMMO = {
  '9mm':    { name: 'content.ammo.9mm.name',    desc: 'content.ammo.9mm.desc',    w: 1, h: 1, weight: 0.008, caliber: '9mm', massG: 8.0,  v0: 360, tier: 0, pen: 0, impulse: 0, effects: [], value: 15, rarity: 'L0', stackLimit: 999 },
  '5.56':   { name: 'content.ammo.556.name',    desc: 'content.ammo.556.desc',    w: 1, h: 1, weight: 0.012, caliber: '5.56', massG: 4.0,  v0: 940, tier: 2, pen: 3, impulse: 1, effects: [], value: 60, rarity: 'L1', stackLimit: 999 },
'7.62':   { name: 'content.ammo.762.name',    desc: 'content.ammo.762.desc',    w: 1, h: 1, weight: 0.016, caliber: '7.62', massG: 8.0,  v0: 800, tier: 2, pen: 5, impulse: 2, effects: [], value: 80, rarity: 'L2', stackLimit: 999 }, // ★ v0 从 730 提到 800
  // 7.62×54R 全威力步枪弹：给 SR762 这类狙击枪用，和 AK 的 7.62×39 中威力弹不是一回事
  '762x54': { name: 'content.ammo.762x54.name', desc: 'content.ammo.762x54.desc', w: 1, h: 1, weight: 0.022, caliber: '762x54', massG: 9.6, v0: 830, tier: 3, pen: 7, impulse: 3, effects: [], value: 140, rarity: 'L3', stackLimit: 999 },
  '.357': { name: 'content.ammo.357.name', desc: 'content.ammo.357.desc', w: 1, h: 1, weight: 0.018, caliber: '.357', massG: 10.2, v0: 380, tier: 1, pen: 2, impulse: 1, effects: [], value: 45, rarity: 'L2', stackLimit: 999 },
'.45acp': { name: 'content.ammo.45acp.name',  desc: 'content.ammo.45acp.desc',  w: 1, h: 1, weight: 0.015, caliber: '.45acp', massG: 14.9, v0: 290, tier: 0, pen: 1, impulse: 1, effects: [], value: 25, rarity: 'L0', stackLimit: 999 },
  '12ga':   { name: 'content.ammo.12ga.name',   desc: 'content.ammo.12ga.desc',   w: 1, h: 1, weight: 0.045, caliber: '12ga', massG: 3.5,  v0: 410, tier: 0, pen: 0, impulse: 0, effects: [], value: 40, rarity: 'L0', stackLimit: 999 },
  'dragon': { name: 'content.ammo.dragon.name', desc: 'content.ammo.dragon.desc', w: 1, h: 1, weight: 0.05, caliber: '12ga', massG: 3.5, v0: 410, tier: 2, pen: 0, impulse: 0, effects: ['incendiary'], burn: 1, burnLevel: 2, burnFieldRadius: 2.2, value: 180, rarity: 'L2', stackLimit: 999 },
  'glassfiber': { name: 'content.ammo.glassfiber.name', desc: 'content.ammo.glassfiber.desc', w: 1, h: 1, weight: 0.014, caliber: '5.56', massG: 4.0, v0: 940, tier: 3, pen: 0, impulse: 0, effects: ['glassfiber'], glassfiber: true, fiberAcute: 2, fiberChronic: 1, fiberArmorDamage: 18, value: 420, rarity: 'L4', stackLimit: 999 },
  '9mm_gf': { name: 'content.ammo.9mm_gf.name', desc: 'content.ammo.gf.desc', w: 1, h: 1, weight: 0.009, caliber: '9mm', massG: 8.0, v0: 360, tier: 3, pen: 0, impulse: 0, effects: ['glassfiber'], glassfiber: true, fiberAcute: 1, fiberChronic: 1, fiberArmorDamage: 8, value: 210, rarity: 'L4', stackLimit: 999 },
  '762_gf': { name: 'content.ammo.762_gf.name', desc: 'content.ammo.gf.desc', w: 1, h: 1, weight: 0.017, caliber: '7.62', massG: 8.0, v0: 800, tier: 3, pen: 0, impulse: 0, effects: ['glassfiber'], glassfiber: true, fiberAcute: 2, fiberChronic: 1, fiberArmorDamage: 16, value: 460, rarity: 'L4', stackLimit: 999 },
  '762x54_gf': { name: 'content.ammo.762x54_gf.name', desc: 'content.ammo.gf.desc', w: 1, h: 1, weight: 0.023, caliber: '762x54', massG: 9.6, v0: 830, tier: 3, pen: 0, impulse: 0, effects: ['glassfiber'], glassfiber: true, fiberAcute: 2, fiberChronic: 1, fiberArmorDamage: 19, value: 620, rarity: 'L4', stackLimit: 999 },
  '45acp_gf': { name: 'content.ammo.45acp_gf.name', desc: 'content.ammo.gf.desc', w: 1, h: 1, weight: 0.016, caliber: '.45acp', massG: 14.9, v0: 290, tier: 3, pen: 0, impulse: 0, effects: ['glassfiber'], glassfiber: true, fiberAcute: 1, fiberChronic: 1, fiberArmorDamage: 10, value: 240, rarity: 'L4', stackLimit: 999 },
  '12ga_gf': { name: 'content.ammo.12ga_gf.name', desc: 'content.ammo.gf.desc', w: 1, h: 1, weight: 0.05, caliber: '12ga', massG: 3.5, v0: 410, tier: 3, pen: 0, impulse: 0, effects: ['glassfiber'], glassfiber: true, fiberAcute: 2, fiberChronic: 1, fiberArmorDamage: 14, value: 380, rarity: 'L4', stackLimit: 999 },
  // 非制式穿甲弹：钨芯，穿透高、对护具耐久破坏大，但价值极高
  'ap556': { name: 'content.ammo.ap556.name', desc: 'content.ammo.ap556.desc', w: 1, h: 1, weight: 0.013, caliber: '5.56', massG: 3.6, v0: 1010, tier: 4, pen: 7, impulse: 2, effects: [], armorWearMul: 1.35, value: 360, rarity: 'L3', stackLimit: 999 },
  // 12 号独头弹：单颗重弹头，近距离对护具冲压极高
  '12ga_slug': { name: 'content.ammo.12ga_slug.name', desc: 'content.ammo.12ga_slug.desc', w: 1, h: 1, weight: 0.05, caliber: '12ga', massG: 28.0, v0: 450, tier: 2, pen: 4, impulse: 1, effects: [], pellets: 1, value: 120, rarity: 'L2', stackLimit: 999 },
};
  c.registerAll('ammo', AMMO);

  /* ==========================================================
     2. 武器
     ----------------------------------------------------------
     ammoType:  引用弹药 id
     rpm:       每分钟射速
     mag:       弹匣容量
     reload:    换弹时间（秒）
     range:     有效射程（米）
     spread:    扩散（弧度）
     auto:      是否全自动
     pellets:   每次射击弹丸数（霰弹 > 1）
     ========================================================== */
  const WEAPONS = {
  p9:    { name: 'content.weapon.p9.name',    desc: 'content.weapon.p9.desc',    w: 2, h: 1, weight: 0.8, ammoType: '9mm',    rpm: 420, mag: 15, reload: 1.5, range: 80,  spread: 0.032, auto: false, fireModes: ['semi'], pellets: 1, color: 0x6a6a7a, value: 600,  rarity: 'L0', stackLimit: 1, recoil: 20, stability: 50, handling: 80, adsSpread: 0.01, drop: 0.01, falloff: 0.5 , electronics: false, empShielded: true },
  p45:   { name: 'content.weapon.p45.name',   desc: 'content.weapon.p45.desc',   w: 2, h: 1, weight: 1.1, ammoType: '.45acp', rpm: 350, mag: 8,  reload: 1.7, range: 65,  spread: 0.035, auto: false, fireModes: ['semi'], pellets: 1, color: 0x5a4a3a, value: 950,  rarity: 'L1', stackLimit: 1, recoil: 30, stability: 48, handling: 72, adsSpread: 0.012, drop: 0.012, falloff: 0.55, electronics: false, empShielded: true },
  rev357:{ name: 'content.weapon.rev357.name',desc: 'content.weapon.rev357.desc',w: 2, h: 1, weight: 1.0, ammoType: '.357',   rpm: 120, mag: 6,  reload: 2.6, range: 95,  spread: 0.02,  auto: false, fireModes: ['single'], pellets: 1, color: 0x4a3a3a, value: 1600, rarity: 'L2', stackLimit: 1, recoil: 55, stability: 62, handling: 55, adsSpread: 0.006, drop: 0.008, falloff: 0.35, electronics: false, empShielded: true },
  smg9:  { name: 'content.weapon.smg9.name',  desc: 'content.weapon.smg9.desc',  w: 3, h: 1, weight: 2.6, ammoType: '9mm',    rpm: 900, mag: 30, reload: 2.0, range: 75,  spread: 0.044, auto: true,  fireModes: ['auto', 'semi'], pellets: 1, color: 0x3a3a4a, value: 1800, rarity: 'L2', stackLimit: 1, recoil: 24, stability: 52, handling: 88, adsSpread: 0.018, drop: 0.016, falloff: 0.65, electronics: false, empShielded: true },
  lmg556:{ name: 'content.weapon.lmg556.name',desc: 'content.weapon.lmg556.desc',w: 5, h: 3, weight: 9.2, ammoType: '5.56',    rpm: 700, mag: 100,reload: 5.4, range: 180, spread: 0.042, auto: true,  fireModes: ['auto'], pellets: 1, color: 0x3a4a3a, value: 12500,rarity: 'L4', stackLimit: 1, recoil: 32, stability: 78, handling: 35, adsSpread: 0.02, drop: 0.03, falloff: 0.4, electronics: false, empShielded: true },
  dmr762:{ name: 'content.weapon.dmr762.name',desc: 'content.weapon.dmr762.desc',w: 5, h: 2, weight: 6.8, ammoType: '762x54', rpm: 180, mag: 10, reload: 3.0, range: 300, spread: 0.009, auto: false, fireModes: ['semi'], pellets: 1, color: 0x3a3a2a, value: 9800, rarity: 'L4', stackLimit: 1, recoil: 62, stability: 86, handling: 42, adsSpread: 0.003, drop: 0.006, falloff: 0.15, electronics: false, empShielded: true },
  smg45: { name: 'content.weapon.smg45.name', desc: 'content.weapon.smg45.desc', w: 3, h: 1, weight: 2.5, ammoType: '.45acp', rpm: 780, mag: 25, reload: 2.0, range: 60,  spread: 0.048, auto: true,  fireModes: ['auto'], pellets: 1, color: 0x4a4a5a, value: 1500, rarity: 'L1', stackLimit: 1, recoil: 30, stability: 40, handling: 75, adsSpread: 0.02, drop: 0.015, falloff: 0.6 , electronics: false, empShielded: true },
  ar556: { name: 'content.weapon.ar556.name', desc: 'content.weapon.ar556.desc', w: 4, h: 2, weight: 3.6, ammoType: '5.56',   rpm: 850, mag: 30, reload: 2.3, range: 140, spread: 0.025, auto: true,  fireModes: ['semi', 'auto'], pellets: 1, color: 0x3a4a5a, value: 3000, rarity: 'L2', stackLimit: 1, recoil: 40, stability: 60, handling: 65, adsSpread: 0.005, drop: 0.02, falloff: 0.4 , electronics: false, empShielded: true },
ak762: { name: 'content.weapon.ak762.name', desc: 'content.weapon.ak762.desc', w: 4, h: 2, weight: 4.0, ammoType: '7.62',   rpm: 620, mag: 30, reload: 2.6, range: 130, spread: 0.034, auto: true,  fireModes: ['auto', 'semi'], pellets: 1, color: 0x5a3a2a, value: 3200, rarity: 'L2', stackLimit: 1, recoil: 55, stability: 45, handling: 55, adsSpread: 0.01, drop: 0.025, falloff: 0.5 , electronics: false, empShielded: true },
sr762: { name: 'content.weapon.sr762.name', desc: 'content.weapon.sr762.desc', w: 5, h: 2, weight: 6.5, ammoType: '762x54', rpm: 55,  mag: 5,  reload: 3.2, range: 350, spread: 0.002, auto: false, fireModes: ['single'], pellets: 1, color: 0x2a3a4a, value: 8000, rarity: 'L3', stackLimit: 1, recoil: 80, stability: 95, handling: 30, adsSpread: 0.0, drop: 0.005, falloff: 0.1 , electronics: false, empShielded: true }, // ★ 改为 7.62×54R 全威力弹，range 350
  sg12:  { name: 'content.weapon.sg12.name',  desc: 'content.weapon.sg12.desc',  w: 4, h: 2, weight: 3.8, ammoType: '12ga',   rpm: 85,  mag: 6,  reload: 3.0, range: 35,  spread: 0.100, auto: false, fireModes: ['pump'], pellets: 9, color: 0x5a4a2a, value: 2500, rarity: 'L3', stackLimit: 1, recoil: 70, stability: 50, handling: 50, adsSpread: 0.05, drop: 0.01, falloff: 0.8 , electronics: false, empShielded: true },
};
  c.registerAll('weapons', WEAPONS);

  /* ==========================================================
     3. 护甲等级
     ----------------------------------------------------------
     red:     动能减伤比例（0~1）
     maxDur:  耐久上限
     ========================================================== */
  const ARMOR = {
    lv0: { name: 'content.armor.lv0.name', red: 0.00, maxDur: 100 },
    lv1: { name: 'content.armor.lv1.name', red: 0.22, maxDur: 100 },
    lv2: { name: 'content.armor.lv2.name', red: 0.38, maxDur: 100 },
    lv3: { name: 'content.armor.lv3.name', red: 0.52, maxDur: 100 },
    lv4: { name: 'content.armor.lv4.name', red: 0.64, maxDur: 100 },
    lv5: { name: 'content.armor.lv5.name', red: 0.74, maxDur: 100 },
  };
  c.registerAll('armor', ARMOR);

  /* ==========================================================
   3.5 装备部位
   ----------------------------------------------------------
   armorLv:  引用 armor 表的等级（1~5，0 表示无防护）
   maxDur:   耐久上限
   cap:      容器容量（仅背包/胸挂）
   ========================================================== */
const HELMET_SHELL = {
  lv2: { name: 'content.helmetShell.lv2.name', desc: 'content.helmetShell.lv2.desc', w: 2, h: 2, weight: 1.1, armorLv: 2, maxDur: 100, value: 450,  rarity: 'L1', stackLimit: 1 },
  lv3: { name: 'content.helmetShell.lv3.name', desc: 'content.helmetShell.lv3.desc', w: 2, h: 2, weight: 1.35, armorLv: 3, maxDur: 100, value: 800,  rarity: 'L1', stackLimit: 1 },
  lv4: { name: 'content.helmetShell.lv4.name', desc: 'content.helmetShell.lv4.desc', w: 2, h: 2, weight: 1.65, armorLv: 4, maxDur: 100, value: 1500, rarity: 'L2', stackLimit: 1 },
  lv5: { name: 'content.helmetShell.lv5.name', desc: 'content.helmetShell.lv5.desc', w: 2, h: 2, weight: 2.1, armorLv: 5, maxDur: 100, value: 2800, rarity: 'L4', stackLimit: 1 },
};
c.registerAll('helmetShell', HELMET_SHELL);

const HELMET_VISOR = {
  lv2: { name: 'content.helmetVisor.lv2.name', desc: 'content.helmetVisor.lv2.desc', w: 2, h: 1, weight: 0.42, armorLv: 2, maxDur: 100, value: 350,  rarity: 'L1', stackLimit: 1 },
  lv3: { name: 'content.helmetVisor.lv3.name', desc: 'content.helmetVisor.lv3.desc', w: 2, h: 1, weight: 0.55, armorLv: 3, maxDur: 100, value: 600,  rarity: 'L1', stackLimit: 1 },
  lv4: { name: 'content.helmetVisor.lv4.name', desc: 'content.helmetVisor.lv4.desc', w: 2, h: 1, weight: 0.72, armorLv: 4, maxDur: 100, value: 1200, rarity: 'L2', stackLimit: 1 },
  lv5: { name: 'content.helmetVisor.lv5.name', desc: 'content.helmetVisor.lv5.desc', w: 2, h: 1, weight: 0.9, armorLv: 5, maxDur: 100, value: 2200, rarity: 'L4', stackLimit: 1 },
};
c.registerAll('helmetVisor', HELMET_VISOR);

const HELMET_EAR = {
  basic: { name: 'content.helmetEar.basic.name', desc: 'content.helmetEar.basic.desc', w: 1, h: 1, weight: 0.16, maxDur: 100, value: 400, rarity: 'L1', stackLimit: 1, electronics: true, empShielded: false },
};
c.registerAll('helmetEar', HELMET_EAR);

const VEST_FIBER = {
  // ★ 插板只能装进护甲纤维的 plate 子槽，不能单独穿戴（现实中不存在只绑一块板）。
  lv3: { name: 'content.vestFiber.lv3.name', desc: 'content.vestFiber.lv3.desc', w: 3, h: 3, weight: 2.4, armorLv: 3, maxDur: 100, value: 900,  rarity: 'L2', stackLimit: 1, subSlots: ['plate'] },
  lv4: { name: 'content.vestFiber.lv4.name', desc: 'content.vestFiber.lv4.desc', w: 3, h: 3, weight: 3.1, armorLv: 4, maxDur: 100, value: 1600, rarity: 'L3', stackLimit: 1, subSlots: ['plate'] },
  lv5: { name: 'content.vestFiber.lv5.name', desc: 'content.vestFiber.lv5.desc', w: 3, h: 3, weight: 4.0, armorLv: 5, maxDur: 100, value: 3200, rarity: 'L4', stackLimit: 1, subSlots: ['plate'] },
};
c.registerAll('vestFiber', VEST_FIBER);

const VEST_PLATE = {
  lv3: { name: 'content.vestPlate.lv3.name', desc: 'content.vestPlate.lv3.desc', w: 2, h: 2, weight: 2.2, armorLv: 3, maxDur: 100, value: 600, rarity: 'L1', stackLimit: 1 },
  lv4: { name: 'content.vestPlate.lv4.name', desc: 'content.vestPlate.lv4.desc', w: 2, h: 2, weight: 2.9, armorLv: 4, maxDur: 100, value: 1200, rarity: 'L2', stackLimit: 1 },
  lv5: { name: 'content.vestPlate.lv5.name', desc: 'content.vestPlate.lv5.desc', w: 2, h: 2, weight: 3.7, armorLv: 5, maxDur: 100, value: 2400, rarity: 'L3', stackLimit: 1 },
};
c.registerAll('vestPlate', VEST_PLATE);

const BACKPACK = {
  small:  { name: 'content.backpack.small.name',  desc: 'content.backpack.small.desc',  w: 2, h: 2, weight: 0.7, cap: 8,  innerW: 4, innerH: 2, value: 300,  rarity: 'L1', stackLimit: 1 },
  medium: { name: 'content.backpack.medium.name', desc: 'content.backpack.medium.desc', w: 3, h: 3, weight: 1.3, cap: 16, innerW: 4, innerH: 4, value: 800,  rarity: 'L2', stackLimit: 1 },
  large:  { name: 'content.backpack.large.name',  desc: 'content.backpack.large.desc',  w: 4, h: 4, weight: 2.2, cap: 24, innerW: 6, innerH: 4, value: 1800, rarity: 'L3', stackLimit: 1 },
  heavy:  { name: 'content.backpack.heavy.name',  desc: 'content.backpack.heavy.desc',  w: 5, h: 4, weight: 3.6, cap: 40, innerW: 8, innerH: 5, value: 3600, rarity: 'L4', stackLimit: 1 },
};
c.registerAll('backpack', BACKPACK);

const CHEST_RIG = {
  small: { name: 'content.chestRig.small.name', desc: 'content.chestRig.small.desc', w: 2, h: 2, weight: 0.45, cap: 4, innerW: 2, innerH: 2, value: 400, rarity: 'L1', stackLimit: 1 },
  large: { name: 'content.chestRig.large.name', desc: 'content.chestRig.large.desc', w: 3, h: 2, weight: 0.85, cap: 6, innerW: 3, innerH: 2, value: 900, rarity: 'L2', stackLimit: 1 },
  heavy: { name: 'content.chestRig.heavy.name', desc: 'content.chestRig.heavy.desc', w: 4, h: 2, weight: 1.25, cap: 12, innerW: 4, innerH: 3, value: 1900, rarity: 'L3', stackLimit: 1 },
};
c.registerAll('chestRig', CHEST_RIG);

/* ==========================================================
   3.6.5 可搜刮容器类型（数据驱动，禁止把容器规则写死在 game.js）
   ----------------------------------------------------------
   name:   显示名
   color:  建模颜色
   size:   [w, h, d]（米）
   count:  [min,max] 随机物品件数
   weights: 各分类的抽取权重（合计不必为 1）
   ========================================================== */
const CONTAINER_TYPES = {
  crate: {
    name: '军用物资箱', color: 0x8a7a4a, size: [1.6, 1.3, 1.6], count: [2, 3],
    weights: { ammo: 30, weapons: 8, armor: 10, valuables: 14, medical: 8, attach: 8, nade: 12 },
  },
  ammobox: {
    name: '弹药箱', color: 0x5e6b3a, size: [1.3, 0.9, 1.2], count: [2, 3],
    weights: { ammo: 62, nade: 20, attach: 6, weapons: 4, valuables: 8 },
  },
  medbox: {
    name: '医疗箱', color: 0xd8d8d8, size: [1.0, 0.7, 0.8], count: [1, 2],
    weights: { medical: 72, valuables: 10, ammo: 8, attach: 10 },
  },
  toolbox: {
    name: '工具箱', color: 0x4a6a8a, size: [1.2, 0.8, 0.9], count: [1, 3],
    weights: { attach: 46, valuables: 22, weapons: 4, ammo: 18, medical: 10 },
  },
  safe: {
    name: '保险柜', color: 0x3a3a42, size: [1.3, 1.8, 1.1], count: [1, 2],
    weights: { valuables: 58, weapons: 12, armor: 12, attach: 10, medical: 8 },
  },
  fridge: {
    name: '冷藏柜', color: 0x9ac8d8, size: [1.1, 1.9, 0.9], count: [1, 2],
    weights: { medical: 55, valuables: 25, ammo: 10, attach: 10 },
  },
};
c.registerAll('containers', CONTAINER_TYPES);

/* ==========================================================
   3.6.6 制式券配装档位（数据驱动）
   ----------------------------------------------------------
   primary/sidearm: 随机武器池
   dual:            双主武器概率（高档次可同时带两把长枪）
   armorLv:         护甲等级区间 [min,max]
   plateChance:     是否装插板
   bag/rig:         背包/胸挂型号池
   ammo/meds/nades: 携带数量基准
   attach:          随机配件数量
   special:         额外特殊装备 {table,id}
   ========================================================== */
const LOADOUT_TIERS = {
  light: {
    name: '轻装', desc: '最低限度的自卫配装：手枪/冲锋枪、轻甲、少量弹药与急救。适合快速进出或空手开局。',
    order: 1,
    primary: ['p9', 'p45', 'smg9', 'smg45', 'rev357'],
    sidearm: ['p9', 'p45', 'rev357'],
    dual: 0,
    armorLv: [1, 2], plateChance: 0,
    bag: ['small', 'medium'], rig: ['small'],
    ammo: 60, sideAmmo: 30, meds: 2, nades: 1, attach: 0,
    special: [],
  },
  standard: {
    name: '标准', desc: '常规制式配装：突击步枪/冲锋枪、3~4 级护具、基础医疗与投掷物。适合大多数战局。',
    order: 2,
    primary: ['ar556', 'ak762', 'smg9', 'smg45', 'sg12'],
    sidearm: ['p9', 'p45'],
    dual: 0.15,
    armorLv: [3, 4], plateChance: 0.8,
    bag: ['medium', 'large'], rig: ['large'],
    ammo: 120, sideAmmo: 45, meds: 3, nades: 2, attach: 1,
    special: [],
  },
  heavy: {
    name: '重装', desc: '高防护配装：4~5 级护具、轻机枪/精确射手步枪、较多弹药与医疗。移动速度会明显下降。',
    order: 3,
    primary: ['ar556', 'ak762', 'lmg556', 'dmr762'],
    sidearm: ['p45', 'rev357'],
    dual: 0.35,
    armorLv: [4, 5], plateChance: 1,
    bag: ['large', 'heavy'], rig: ['large', 'heavy'],
    ammo: 180, sideAmmo: 60, meds: 4, nades: 3, attach: 2,
    special: [{ table: 'medical', id: 'morphine' }],
  },
  special: {
    name: '特种', desc: '试验性配装：5 级护具、双主武器/狙击枪、满配弹药与特殊装备。价值高，风险也高。',
    order: 4,
    primary: ['lmg556', 'dmr762', 'sr762', 'ar556'],
    sidearm: ['rev357', 'p45'],
    dual: 0.8,
    armorLv: [5, 5], plateChance: 1,
    bag: ['heavy'], rig: ['heavy'],
    ammo: 240, sideAmmo: 90, meds: 5, nades: 4, attach: 3,
    special: [{ table: 'valuables', id: 'field_radio' }, { table: 'medical', id: 'quickclot' }],
  },
};
c.registerAll('loadoutTiers', LOADOUT_TIERS);


/* ==========================================================
   3.7 近战武器
   ----------------------------------------------------------
   melee 表独立于 weapons：近战没有 rpm / mag / range（米）等字段，
   改为 damage（动能 J）/ range（近战范围 m）/ cooldown（攻击间隔 s）。
   ========================================================== */
const MELEE = {
  knife: {
    name: 'content.melee.knife.name',
    desc: 'content.melee.knife.desc',
    w: 2, h: 1, weight: 0.25,
    damage: 700,
    range: 3,
    cooldown: 0.65,
    value: 200,
    rarity: 'L1',
    stackLimit: 1,
    melee: true,
  },
};
c.registerAll('melee', MELEE);

/* ==========================================================
   3.8 投掷物
   ----------------------------------------------------------
   damage: 中心动能(J)，按距离平方衰减
   radius: 杀伤半径（米）
   fuse:   引信时间（秒）
   ========================================================== */
const NADES = {
  // trigger: 'timed' = 保险式（拔销后倒计时）；'impact' = 压感式（撞到物体立即生效）
  frag: {
    name: 'content.nade.frag.name',
    desc: 'content.nade.frag.desc',
    w: 1, h: 1, weight: 0.6,
    damage: 2600,
    radius: 7.5,
    fuse: 3.2,
    trigger: 'timed',
    effect: 'frag',
    fragments: 120,
    fragmentCount: 12,
    value: 300,
    rarity: 'L1',
    stackLimit: 3,
    color: 0x3a3a3a,
  },
  stun_impact: {
    name: 'content.nade.stun_impact.name',
    desc: 'content.nade.stun_impact.desc',
    w: 1, h: 1, weight: 0.48,
    damage: 0,
    radius: 11,
    fuse: 0.02,
    trigger: 'impact',
    effect: 'stun',
    stunDuration: 5.0,
    value: 340,
    rarity: 'L2',
    stackLimit: 3,
    color: 0x8a8ad8,
  },
  flash_impact: {
    name: 'content.nade.flash_impact.name',
    desc: 'content.nade.flash_impact.desc',
    w: 1, h: 1, weight: 0.4,
    damage: 0,
    radius: 16,
    fuse: 0.02,
    trigger: 'impact',
    effect: 'flash',
    flashDuration: 5.5,
    flashPeak: 1.05,
    value: 320,
    rarity: 'L2',
    stackLimit: 3,
    color: 0xe8e8ff,
  },
  flashbang: {
    name: 'content.nade.flash.name',
    desc: 'content.nade.flash.desc',
    w: 1, h: 1, weight: 0.35,
    damage: 0,
    radius: 20,
    fuse: 1.8,
    trigger: 'timed',
    effect: 'flash',
    flashDuration: 7.0,
    flashPeak: 1.1,
    value: 250,
    rarity: 'L2',
    stackLimit: 3,
    color: 0xd8d8d8,
  },
  stun: {
    name: 'content.nade.stun.name',
    desc: 'content.nade.stun.desc',
    w: 1, h: 1, weight: 0.45,
    damage: 0,
    radius: 13,
    fuse: 1.8,
    trigger: 'timed',
    effect: 'stun',
    stunDuration: 5.0,
    value: 220,
    rarity: 'L2',
    stackLimit: 3,
    color: 0x8a8ad8,
  },
  emp: {
    name: 'content.nade.emp.name',
    desc: 'content.nade.emp.desc',
    w: 1, h: 1, weight: 0.5,
    damage: 0,
    radius: 14,
    fuse: 2,
    trigger: 'timed',
    effect: 'emp',
    empPeak: 1.0,
    alertLevel: 0,
    value: 260,
    rarity: 'L3',
    stackLimit: 3,
    color: 0x66ffcc,
  },
  molotov: {
    name: 'content.nade.molotov.name',
    desc: 'content.nade.molotov.desc',
    w: 1, h: 1, weight: 0.72,
    damage: 0,
    radius: 5.2,
    fuse: 0.02,
    trigger: 'impact',
    effect: 'fire',
    fireDuration: 11,
    fireDps: 55,
    value: 320,
    rarity: 'L2',
    stackLimit: 3,
    color: 0xd06a2a,
  },
};
c.registerAll('nade', NADES);

/* ==========================================================
   3.9 贵重品 / 医疗 / 情报
   ----------------------------------------------------------
   这些物品不参与战斗，只用于搜刮、负重与撤离价值判断。
   文案保持客观，不写无法验证的夸张效果。
   ========================================================== */
const VALUABLES = {
  gold_chain: {
    name: '镀金链条', desc: '一条成色尚可的镀金铜链，接口处有佩戴磨损。熔炼价值高于整件出售价值。',
    w: 1, h: 1, weight: 0.06, value: 720, rarity: 'L3', stackLimit: 1, icon: '📿',
  },
  rolex: {
    name: '机械腕表', desc: '不锈钢表壳的自动机械表，表盘有细密划痕。二手市场仍有稳定需求。',
    w: 1, h: 1, weight: 0.11, value: 1450, rarity: 'L3', stackLimit: 1, icon: '⌚',
  },
  silver_cutlery: {
    name: '银质餐具组', desc: '用绒布包着的四件银质餐具，柄部刻有已经模糊的家族缩写。',
    w: 1, h: 1, weight: 0.28, value: 560, rarity: 'L2', stackLimit: 1, icon: '🍴',
  },
  jade_figurine: {
    name: '翡翠小像', desc: '掌心大小的翡翠雕像，雕的是一只蜷睡的猫。石材有天然棉絮，不是顶级料。',
    w: 1, h: 1, weight: 0.18, value: 2100, rarity: 'L4', stackLimit: 1, icon: '🗿',
  },
  cigarette_case: {
    name: '银质烟盒', desc: '内衬仍残留烟草气味，盒盖弹片有些松。收藏市场对这类小件出价不低。',
    w: 1, h: 1, weight: 0.13, value: 380, rarity: 'L2', stackLimit: 1, icon: '🚬',
  },
  cash_stack: {
    name: '现金捆', desc: '用橡皮筋扎住的一小叠纸币，面额混杂，部分边角受潮。',
    w: 1, h: 1, weight: 0.09, value: 480, rarity: 'L2', stackLimit: 1, icon: '💵',
  },
  bank_bond: {
    name: '不记名债券', desc: '大陆银行早期发行的不记名债券，兑付窗口早已关闭，但收藏者愿意接手。',
    w: 1, h: 1, weight: 0.02, value: 1750, rarity: 'L4', stackLimit: 1, icon: '📜',
  },
  military_docs: {
    name: '军用文件袋', desc: '封口有拆检痕迹的牛皮纸袋，里面是几份调拨单和一张手绘巡逻图。',
    w: 1, h: 1, weight: 0.12, value: 620, rarity: 'L2', stackLimit: 1, icon: '📁',
  },
  intel_folder: {
    name: '情报文件夹', desc: '印着“内部传阅”的硬壳文件夹。内容已被抽走大半，只剩页脚的编号。',
    w: 1, h: 1, weight: 0.2, value: 980, rarity: 'L3', stackLimit: 1, icon: '🗂',
  },
  dogtag: {
    name: '士兵铭牌', desc: '两片一组的金属铭牌，边缘被磨得发亮。名字一栏被人为划去。',
    w: 1, h: 1, weight: 0.03, value: 260, rarity: 'L1', stackLimit: 1, icon: '🏷',
  },
  vintage_camera: {
    name: '老式相机', desc: '一台全机械旁轴相机，快门仍能动作。皮套内侧用铅笔写着拍摄日期。',
    w: 2, h: 1, weight: 0.62, value: 880, rarity: 'L3', stackLimit: 1, icon: '📷',
  },
  hard_drive: {
    name: '加密硬盘', desc: '2.5 英寸移动硬盘，外壳有撬动痕迹。通电后指示灯仍会亮，但数据需要专用设备读取。',
    w: 1, h: 1, weight: 0.16, value: 1350, rarity: 'L4', stackLimit: 1, icon: '💽', electronics: true, empShielded: false,
  },
  encrypted_ssd: {
    name: '军用固态盘', desc: '带硬件自毁电路的军用固态盘。外壳有电磁加固层，但接口暴露在外。',
    w: 1, h: 1, weight: 0.09, value: 2600, rarity: 'L5', stackLimit: 1, icon: '💾', electronics: true, empShielded: true,
  },
  gold_tooth: {
    name: '金牙', desc: '一颗带旧式固定脚的金牙，成色不高，胜在容易脱手。',
    w: 1, h: 1, weight: 0.01, value: 180, rarity: 'L1', stackLimit: 1, icon: '🦷',
  },
  ceremonial_coin: {
    name: '仪式纪念币', desc: '勒耶教仪式用的纪念币，正面是抽象的耳与尾纹样。信众之间流通性很好。',
    w: 1, h: 1, weight: 0.04, value: 540, rarity: 'L2', stackLimit: 1, icon: '🪙',
  },
  fuel_can: {
    name: '军用燃料罐', desc: '八升装金属燃料罐，密封圈老化但罐体完好。可用于交换或作为燃烧物。',
    w: 2, h: 2, weight: 7.8, value: 240, rarity: 'L1', stackLimit: 1, icon: '⛽',
  },
  gold_bar: {
    name: '小规格金条', desc: '50 克压印金条，边角有检验刻印。体积小、保值稳定，撤离时的硬通货。',
    w: 1, h: 1, weight: 0.05, value: 3200, rarity: 'L4', stackLimit: 1, icon: '🪙',
  },
  diamond: {
    name: '未镶嵌钻石', desc: '装在纸包里的单颗裸钻，切工一般但净度不错。来源不明，出手需要固定渠道。',
    w: 1, h: 1, weight: 0.01, value: 4800, rarity: 'L5', stackLimit: 1, icon: '💎',
  },
  military_medal: {
    name: '旧式军功章', desc: '绶带褪色的军功章，背面刻着已撤销的番号。收藏价值高于金属本身。',
    w: 1, h: 1, weight: 0.04, value: 1100, rarity: 'L3', stackLimit: 1, icon: '🎖',
  },
  laptop: {
    name: '加固笔记本', desc: '带防滚架的军用笔记本，硬盘已被拆走。外壳和接口仍能卖钱，但 EMP 会直接烧毁主板。',
    w: 2, h: 1, weight: 1.9, value: 1600, rarity: 'L3', stackLimit: 1, icon: '💻',
    electronics: true, empShielded: false,
  },
  field_radio: {
    name: '野战电台', desc: '背负式短波电台，电池仓有电磁加固。主板仍会被强电磁场击穿，损坏后只能拆零件。',
    w: 2, h: 2, weight: 3.2, value: 2600, rarity: 'L4', stackLimit: 1, icon: '📻',
    electronics: true, empShielded: true,
  },
  silver_bar: {
    name: '银锭', desc: '一公斤粗炼银锭，表面有氧化层。价值不高但容易出手，适合填充背包空隙。',
    w: 1, h: 1, weight: 1.0, value: 700, rarity: 'L2', stackLimit: 1, icon: '🧱',
  },
};
c.registerAll('valuables', VALUABLES);

/*
  医疗物品的 use 字段是“可使用”的唯一真相源：
    kind:       bandage 止血 / painkiller 止痛 / splint 固定骨折 / blood 补血 / surgery 手术 / stim 兴奋剂
    time:       使用耗时（秒）。现实里包扎、夹板、输血、手术都不可能是瞬间完成。
    bleedSeal:  本次最多封堵的流血等级（按部位伤口总等级扣减，不抹掉伤口本身）
    blood:      补充的血量（ml）
    fracture:   可处理的骨折等级上限（1=闭合性骨折，2=粉碎性骨折）
    pain:       使用后立即增加的疼痛（处理伤口本身会痛）
    painkiller: 止痛持续时间（秒），期间疼痛相关惩罚不生效
    duration:   增益/副作用持续时间
  禁止：不要在 use 之外再写第二套“医疗效果”字段。
*/
const MEDICAL = {
  bandage: {
    name: '压缩绷带', desc: '真空包装的压缩绷带，用于处理外出血。包装完好，未过期。',
    w: 1, h: 1, weight: 0.08, value: 180, rarity: 'L1', stackLimit: 4, icon: '🩹',
    use: { kind: 'bandage', time: 2.4, bleedSeal: 3, pain: 2 },
  },
  painkiller: {
    name: '止痛药', desc: '一小板非甾体止痛药。能压低疼痛感，但不能替代止血。',
    w: 1, h: 1, weight: 0.03, value: 140, rarity: 'L1', stackLimit: 4, icon: '💊',
    use: { kind: 'painkiller', time: 1.2, painkiller: 90, pain: 0 },
  },
  splint: {
    name: '折叠夹板', desc: '铝条加尼龙带的可折叠夹板，用于临时固定骨折肢体。',
    w: 1, h: 1, weight: 0.22, value: 260, rarity: 'L2', stackLimit: 3, icon: '🦴',
    use: { kind: 'splint', time: 3.5, fracture: 1, pain: 4 },
  },
  blood_pack: {
    name: '血浆袋', desc: '低温保存的 O 型血浆，包装上贴着已模糊的血站标签。需要尽快使用。',
    w: 1, h: 1, weight: 0.45, value: 420, rarity: 'L3', stackLimit: 2, icon: '🩸',
    use: { kind: 'blood', time: 4.0, blood: 900 },
  },
  surgical_kit: {
    name: '野外手术包', desc: '含止血钳、缝合线与局部麻醉剂的小型手术包。只有受过训练的人能安全使用。',
    w: 2, h: 1, weight: 0.8, value: 680, rarity: 'L3', stackLimit: 1, icon: '🧰',
    use: { kind: 'surgery', time: 7.0, bleedSeal: 9, fracture: 2, blood: 250, pain: 6, painkiller: 30 },
  },
  stimulant: {
    name: '军用兴奋剂', desc: '单支自动注射器，标签上写着“仅限战斗伤亡使用”。效果强，副作用同样明显。',
    w: 1, h: 1, weight: 0.05, value: 520, rarity: 'L3', stackLimit: 3, icon: '💉',
    use: { kind: 'stim', time: 1.5, duration: 25, painkiller: 25, pain: 0 },
  },
  tourniquet: {
    name: '战术止血带', desc: '旋压式止血带，用于肢体大出血的快速封堵。操作比绷带快，但完全阻断血流的时间不能太长。',
    w: 1, h: 1, weight: 0.09, value: 260, rarity: 'L2', stackLimit: 3, icon: '🩹',
    use: { kind: 'bandage', time: 1.5, bleedSeal: 5, pain: 4 },
  },
  quickclot: {
    name: '止血粉（QuickClot）', desc: '含高岭土的战伤止血粉，直接倾倒在出血伤口上。封堵能力强，但清理时非常疼。',
    w: 1, h: 1, weight: 0.06, value: 420, rarity: 'L3', stackLimit: 2, icon: '🧂',
    use: { kind: 'bandage', time: 2.0, bleedSeal: 7, pain: 6 },
  },
  morphine: {
    name: '吗啡自动注射笔', desc: '一次性吗啡注射笔。强效镇痛，能让人带伤继续行动；过量会抑制呼吸，这里不模拟成瘾。',
    w: 1, h: 1, weight: 0.04, value: 680, rarity: 'L3', stackLimit: 2, icon: '💊',
    use: { kind: 'painkiller', time: 1.0, painkiller: 240, pain: 0 },
  },
  adrenaline: {
    name: '肾上腺素注射器', desc: '战斗应激用的肾上腺素，短时间提升移速并压住疼痛，药效过后会明显疲惫。',
    w: 1, h: 1, weight: 0.05, value: 720, rarity: 'L3', stackLimit: 2, icon: '💉',
    use: { kind: 'stim', time: 1.0, duration: 18, painkiller: 18, pain: 0 },
  },
  saline: {
    name: '生理盐水袋', desc: '500ml 生理盐水，用于快速补充循环血量。没有凝血因子，不能替代止血。',
    w: 1, h: 1, weight: 0.55, value: 220, rarity: 'L2', stackLimit: 2, icon: '💧',
    use: { kind: 'blood', time: 3.2, blood: 500 },
  },
};
c.registerAll('medical', MEDICAL);

/* ==========================================================
   3.9.5 枪械配件
   ----------------------------------------------------------
   slot:       安装槽位（muzzle 枪口 / sight 瞄具 / mag 弹匣 / grip 握把）
   fits:       兼容武器 defId 列表；缺省表示全部兼容
   caliber:    弹匣类配件的兼容口径（唯一真相源：武器 def.ammoType）
   spreadMul / recoilMul / adsSpreadMul / rangeMul / soundMul / magMul:
               乘算修正。未写视为 1。
   禁止：配件不要直接改写武器 def，运行时统一由 Inventory.getAttachmentStats 汇总。
   ========================================================== */
const ATTACH = {
  supp_556: {
    slot: 'muzzle', name: '5.56 抑制器', desc: '钢制消音器，能明显削弱枪口焰与枪声，并略微收束散布；重量会让枪口更沉。',
    w: 1, h: 1, weight: 0.42, value: 1100, rarity: 'L3', stackLimit: 1, icon: '🔇',
    fits: ['ar556'], stats: { spreadMul: 0.88, recoilMul: 0.86, soundMul: 0.42 },
  },
  comp_rifle: {
    slot: 'muzzle', name: '制退器', desc: '多孔枪口制退器，牺牲一点枪声隐蔽性换取更好的连续射击控制。',
    w: 1, h: 1, weight: 0.18, value: 620, rarity: 'L2', stackLimit: 1, icon: '🔩',
    fits: ['ar556', 'ak762', 'sr762', 'sg12'], stats: { recoilMul: 0.74, spreadMul: 1.04, soundMul: 1.15 },
  },
  sight_2x: {
    slot: 'sight', name: '2 倍战术镜', desc: '低倍率棱镜镜，中距离目标更清楚；开镜后视野略窄。',
    w: 1, h: 1, weight: 0.24, value: 900, rarity: 'L2', stackLimit: 1, icon: '🔭',
    fits: ['ar556', 'ak762', 'sr762', 'smg45', 'sg12'], stats: { adsSpreadMul: 0.7, spreadMul: 0.94, zoom: 2.0 },
  },
  sight_4x: {
    slot: 'sight', name: '4 倍狙击镜', desc: '高倍率狙击镜，远距离精度优秀，近距离视野极差。',
    w: 2, h: 1, weight: 0.38, value: 1800, rarity: 'L3', stackLimit: 1, icon: '🎯',
    fits: ['sr762', 'ar556'], stats: { adsSpreadMul: 0.45, spreadMul: 0.88, zoom: 4.0 },
  },
  grip_angled: {
    slot: 'grip', name: '斜角握把', desc: '前握把降低后坐力回复时间，对散布有小幅帮助。',
    w: 1, h: 1, weight: 0.12, value: 480, rarity: 'L1', stackLimit: 1, icon: '✊',
    fits: ['ar556', 'ak762', 'smg45', 'sr762'], stats: { recoilMul: 0.82, spreadMul: 0.95 },
  },
  laser_sight: {
    slot: 'grip', name: '激光指示器', desc: '可见激光辅助指向，腰射散布明显收束；会暴露位置。',
    w: 1, h: 1, weight: 0.09, value: 760, rarity: 'L2', stackLimit: 1, icon: '🔴',
    fits: ['ar556', 'ak762', 'smg45', 'p9'], stats: { spreadMul: 0.78, adsSpreadMul: 1.05, laser: true },
  },
  mag_ext_556: {
    slot: 'mag', name: '5.56 扩容弹匣', desc: '40 发扩容弹匣，换弹更慢、重量更大。',
    w: 1, h: 2, weight: 0.35, value: 700, rarity: 'L2', stackLimit: 1, icon: '🧱',
    caliber: '5.56', stats: { magMul: 1.33, reloadMul: 1.15 },
  },
  mag_ext_762: {
    slot: 'mag', name: '7.62 扩容弹匣', desc: '40 发扩容弹匣，适配 7.62 口径步枪。',
    w: 1, h: 2, weight: 0.4, value: 760, rarity: 'L2', stackLimit: 1, icon: '🧱',
    caliber: '7.62', stats: { magMul: 1.33, reloadMul: 1.15 },
  },
};
c.registerAll('attach', ATTACH);


  /* ==========================================================
     4. 阵营与敌人
     ----------------------------------------------------------
     faction: 阵营 id（决定敌我关系和小地图/击杀提示颜色）
     group:   阵营所属大组（同组默认友军）
     weapons: 按优先级排列的武器 id；AI 会按距离/弹量切换
     weaponOptions: 随机抽取一把作为主武器（用于"手枪或霰弹"这类兵种）
     ai.keepDistance: AI 试图保持的理想交战距离（低于该值会后退）
     ========================================================== */
  const FACTIONS = {
    nipsel:  { name: 'content.faction.nipsel.name',  short: 'content.faction.nipsel.short',  color: 0xd08a4a, css: '#ffb066' },
    bank:    { name: 'content.faction.bank.name',    short: 'content.faction.bank.short',    color: 0x4a9ad0, css: '#6fc8ff' },
    unknown: { name: 'content.faction.unknown.name', short: 'content.faction.unknown.short', color: 0x9a6ad0, css: '#c79bff' },
    player:  { name: 'content.faction.player.name',  short: 'content.faction.player.short',  color: 0x5fd47a, css: '#7fe89a' },
    training:{ name: 'content.faction.training.name', short: 'content.faction.training.short', color: 0x8fa8c0, css: '#a8c8e8' },
  };
  c.registerAll('factions', FACTIONS);

  const ENEMIES = {
  // ================= 第 1 组 · 尼珀斯尔私兵 =================
  nipsel_guard: {
    name: 'content.enemy.nipsel_guard.name',
    faction: 'nipsel', group: 'nipsel', rank: 'private',
    hp: 62, speed: 4.4, acc: 0.50,
    weaponOptions: ['p9', 'sg12'],
    color: 0x9a6a4a, radius: 1.15,
    ai: { aggression: 0.32, composure: 0.28, perception: 0.42, opportunism: 0.30, keepDistance: 4, meleeBias: 0.25, switchBias: 0.35 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv2', lv: 2 }, visor: { defId: 'lv2', lv: 2 }, fiber: { defId: 'lv3', lv: 3 }, plate: { defId: 'lv3', lv: 3 } } },
  },
  nipsel_assault: {
    name: 'content.enemy.nipsel_assault.name',
    faction: 'nipsel', group: 'nipsel', rank: 'assault',
    hp: 102, speed: 5.0, acc: 0.68,
    weapons: ['ar556'],
    color: 0x8f5a3f, radius: 1.2,
    ai: { aggression: 0.66, composure: 0.60, perception: 0.64, opportunism: 0.55, keepDistance: 12, meleeBias: 0.45, switchBias: 0.5, grenade: 0.45 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv3', lv: 3 }, visor: { defId: 'lv3', lv: 3 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv4', lv: 4 } }, nades: ['frag'] },
  },
  nipsel_sniper: {
    name: 'content.enemy.nipsel_sniper.name',
    faction: 'nipsel', group: 'nipsel', rank: 'sniper',
    hp: 66, speed: 3.9, acc: 0.88,
    weapons: ['sr762'],
    color: 0x6a5a8a, radius: 1.1,
    ai: { aggression: 0.18, composure: 0.90, perception: 0.90, opportunism: 0.80, keepDistance: 42, meleeBias: 0.0, switchBias: 0.75 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv3', lv: 3 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv3', lv: 3 }, plate: { defId: 'lv4', lv: 4 } } },
  },
  nipsel_elite: {
    name: 'content.enemy.nipsel_elite.name',
    faction: 'nipsel', group: 'nipsel', rank: 'elite',
    hp: 155, speed: 5.15, acc: 0.83,
    weapons: ['ar556', 'sr762'],
    color: 0xc04a4a, radius: 1.3,
    ai: { aggression: 0.86, composure: 0.90, perception: 0.84, opportunism: 0.88, keepDistance: 20, meleeBias: 0.5, switchBias: 0.95, grenade: 0.8 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'flashbang'] },
  },
  nipsel_mobile: {
    name: 'content.enemy.nipsel_mobile.name',
    faction: 'nipsel', group: 'nipsel', rank: 'mobile',
    hp: 88, speed: 5.6, acc: 0.60,
    weapons: ['smg45', 'sg12'],
    color: 0xb05a4a, radius: 1.18,
    ai: { aggression: 0.92, composure: 0.44, perception: 0.60, opportunism: 0.40, keepDistance: 7, meleeBias: 0.55, switchBias: 0.8, grenade: 0.85 },
    prazer: false, A: 0,
    // ★ 战术机动人员是激进的特殊兵种：高概率携带特种装备组合。
    //   special 是“额外抽取档”，未抽中时仍使用下面的基础配装。
    //   ammo 按口径映射：sg12 -> 12ga 龙息弹；smg45 -> .45acp 玻纤弹。
    special: {
      chance: 0.72,
      weaponSets: [['sg12', 'smg45'], ['sg12'], ['smg45']],
      ammo: { '12ga': 'dragon', '.45acp': '45acp_gf', '9mm': '9mm_gf' },
      armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } },
      nades: ['frag', 'flashbang', 'stun'],
    },
    gear: { armor: { shell: { defId: 'lv3', lv: 3 }, visor: { defId: 'lv3', lv: 3 }, fiber: { defId: 'lv3', lv: 3 }, plate: { defId: 'lv3', lv: 3 } }, nades: ['frag'] },
  },
  // ================= 第 2 组 · 大陆银行武装部 =================
  bank_guard: {
    name: 'content.enemy.bank_guard.name',
    faction: 'bank', group: 'bank', rank: 'guard',
    hp: 148, speed: 4.35, acc: 0.70,
    weapons: ['ar556'],
    color: 0x3f6a9a, radius: 1.35,
    ai: { aggression: 0.58, composure: 0.72, perception: 0.62, opportunism: 0.52, keepDistance: 14, meleeBias: 0.35, switchBias: 0.4, grenade: 0.6 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv5', lv: 5 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag'] },
  },
  bank_sniper: {
    name: 'content.enemy.bank_sniper.name',
    faction: 'bank', group: 'bank', rank: 'sniper',
    hp: 96, speed: 4.0, acc: 0.94,
    weapons: ['sr762'],
    color: 0x2f5a8a, radius: 1.12,
    ai: { aggression: 0.25, composure: 0.96, perception: 0.96, opportunism: 0.70, keepDistance: 55, meleeBias: 0.0, switchBias: 0.6 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } } },
  },
  // ================= 第 3 组 · 未知政治势力 / 模拟玩家 =================
  unknown_member: {
    name: 'content.enemy.unknown_member.name',
    faction: 'unknown', group: 'unknown', rank: 'member',
    hp: 82, speed: 4.9, acc: 0.58,
    weaponOptions: ['smg45', 'p9', 'ar556', 'ak762'],
    color: 0x7a5a9a, radius: 1.15,
    ai: { aggression: 0.55, composure: 0.45, perception: 0.55, opportunism: 0.55, keepDistance: 10, meleeBias: 0.4, switchBias: 0.55 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv2', lv: 2 }, visor: { defId: 'lv2', lv: 2 }, fiber: { defId: 'lv3', lv: 3 }, plate: { defId: 'lv3', lv: 3 } } },
  },
  unknown_leader: {
    name: 'content.enemy.unknown_leader.name',
    faction: 'unknown', group: 'unknown', rank: 'leader',
    hp: 132, speed: 5.05, acc: 0.80,
    weaponSets: [['sr762', 'ar556'], ['sr762', 'smg45']],
    color: 0x9a5ac0, radius: 1.25,
    ai: { aggression: 0.74, composure: 0.82, perception: 0.78, opportunism: 0.84, keepDistance: 22, meleeBias: 0.4, switchBias: 0.9, grenade: 0.7 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'flashbang'] },
  },
  // ================= 靶场 =================
  training_dummy: {
    name: 'content.enemy.training_dummy.name',
    faction: 'training', group: 'training', rank: 'dummy',
    hp: 100, speed: 0, acc: 0,
    color: 0x8fa8c0, radius: 1.0,
    ai: { aggression: 0, composure: 1, perception: 0, opportunism: 0 },
    prazer: false, A: 0,
    gear: { armor: {} },
  },
};
  c.registerAll('enemies', ENEMIES);

  /* ==========================================================
     5. 角色
     ----------------------------------------------------------
     prazer:    是否为 Prazer（有耦合能系统）
     A:         Aselevel（Prazer 用）
     sidearm:   副武器 id（null 表示无）
     heavyArmor: 是否重装
     ========================================================== */
  const CHARACTERS = {
  captain: {
    name: 'content.char.captain.name', tag: 'content.char.captain.tag',
    hp: 115, speed: 4.6, radius: 1.2,
    weapon: 'ar556', sidearm: 'p9',
    prazer: false, A: 0, alertness: 1,
    color: 0x5a6b7c,
    skills: ['drone', 'inspire'],
    passive: 'intuition',
    staminaRegen: { move: 1.5, idle: 6 },
    sprintCost: 2.5,
  },
  kate: {
    name: 'content.char.kate.name', tag: 'content.char.kate.tag',
    hp: 130, speed: 5.2, radius: 1.1,
    weapon: 'sr762', sidearm: 'p9',
    prazer: true, A: 3, alertness: 4,
    color: 0xff9ec4,
    skills: ['srdispte', 'catleap'],
    passive: 'stress',
    staminaRegen: { move: 2.0, idle: 8 },
    sprintCost: 2.0,
  },
  lingna: {
    name: 'content.char.lingna.name', tag: 'content.char.lingna.tag',
    hp: 130, speed: 5.3, radius: 1.1,
    weapon: 'ar556', sidearm: 'smg45',
    prazer: true, A: 3, alertness: 2,
    color: 0xffb066,
    skills: ['hate', 'suppress'],
    passive: 'covey',
    staminaRegen: { move: 2.0, idle: 8 },
    sprintCost: 2.0,
  },
  buwen: {
    name: 'content.char.buwen.name', tag: 'content.char.buwen.tag',
    hp: 115, speed: 4.6, radius: 1.2,
    weapon: 'sg12', sidearm: 'p9',
    prazer: false, A: 0, alertness: 1,
    color: 0xc8e05a,
    skills: ['radiantReturn', 'backflash'],
    passive: 'adapt',
    carryBonus: 0.25,
    staminaRegen: { move: 1.5, idle: 6 },
    sprintCost: 2.5,
  },
};
  c.registerAll('characters', CHARACTERS);

  /* ==========================================================
     6. 地图
     ----------------------------------------------------------
     size:           正方形边长（米）
     obstacleCount:  障碍数量
     enemyCount:     敌人数量
     ========================================================== */
  const MAPS = {
  factory: {
    name: 'content.map.factory.name',
    desc: 'content.map.factory.desc',
    size: 200, obstacleCount: 60, enemyCount: 24,
    layoutUrl: 'maps/factory.json',
  },
  desert: {
    name: 'content.map.desert.name',
    desc: 'content.map.desert.desc',
    size: 240, obstacleCount: 45, enemyCount: 28,
    layoutUrl: 'maps/desert.json',
  },
  lab: {
    name: 'content.map.lab.name',
    desc: 'content.map.lab.desc',
    size: 180, obstacleCount: 80, enemyCount: 22,
    layoutUrl: 'maps/lab.json',
  },
  training: {
    name: 'content.map.training.name',
    desc: 'content.map.training.desc',
    size: 120, obstacleCount: 20, enemyCount: 6,
    layoutUrl: 'maps/training.json',
    training: true,
  },
};
  c.registerAll('maps', MAPS);

  /* ==========================================================
     7. 技能
     ----------------------------------------------------------
     kind: 'dash' | 'timedBuff' | 'drone' | 'healPercent' | 'taunt' ...
     cost: 耦合能消耗（0 = 不消耗）
     cd:   冷却（秒）
     ========================================================== */
  const SKILLS = {
    // ================= 队长 · 侦察/辅助 =================
    drone: {
      name: 'content.skill.drone.name',
      desc: 'content.skill.drone.desc',
      kind: 'drone',
      cd: 75, cost: 0, duration: 40,
      batteryDrain: 2.4, maxDurability: 70,
      // 电磁加固：降低 EMP 损坏概率/当量，但不是免疫
      empHardened: true, empResist: 0.45,
      deployHeight: 10,
      markRadius: 45, markInterval: 5, alertLevel: 3,
    },
    inspire: {
      name: 'content.skill.inspire.name',
      desc: 'content.skill.inspire.desc',
      kind: 'inspire',
      cd: 45, cost: 0, duration: 9,
      negativeResist: 0.35, handlingBonus: 0.3,
      alliesOnly: true, radius: 36,
    },
    // ================= 凯特 · 突击/狙击 =================
    srdispte: {
      name: 'content.skill.srdispte.name',
      desc: 'content.skill.srdispte.desc',
      kind: 'srdispte',
      cd: 80, cost: 20, minCoupling: 60, drain: 2.0,
      speedMul: 1.32, handlingMul: 1.25, adsSpreadMul: 0.4,
      dodgeCost: 5, dodgeDistance: 5.5,
    },
    catleap: {
      name: 'content.skill.catleap.name',
      desc: 'content.skill.catleap.desc',
      kind: 'catleap',
      cd: 10, cost: 5, maxCharges: 2, leap: 8, chargeRecover: 10,
      lockout: 0.35,
    },
    // ================= 玲娜 · 突击 =================
    hate: {
      name: 'content.skill.hate.name',
      desc: 'content.skill.hate.desc',
      kind: 'hate',
      cd: 80, cost: 20, minCoupling: 60, drain: 3.0,
      speedMul: 1.45, handlingMul: 1.2, reloadMul: 0.3, fireRateMul: 1.5, adsSpreadMul: 0.7,
      bloodCost: 0.12, extendDebuff: 6,
    },
    suppress: {
      name: 'content.skill.suppress.name',
      desc: 'content.skill.suppress.desc',
      kind: 'suppress',
      cd: 30, cost: 10, duration: 7, radius: 22, cone: Math.PI * 0.9,
      noReload: true,
    },
    // ================= 叶 · 拟载 =================
    radiantReturn: {
      name: 'content.skill.radiantReturn.name',
      desc: 'content.skill.radiantReturn.desc',
      kind: 'mimicArmor',
      cd: 100, cost: 0, duration: 25,
      armorLv: 7, durability: 520, impactRatingJ: 20800,
      weightKg: 18.4, speedMul: 0.72, rarity: 'INC',
    },
    backflash: {
      name: 'content.skill.backflash.name',
      desc: 'content.skill.backflash.desc',
      kind: 'backflash',
      cd: 20, cost: 0, duration: 6,
      flashRadius: 12, flashDuration: 4.2, flashPeak: 1.0,
      speedMul: 1.3, selfImmune: true,
    },
    // ================= 兼容旧 id（当前角色未使用） =================
    jump:     { name: 'content.skill.jump.name',     desc: 'content.skill.jump.desc',     kind: 'dash',       cd: 20, cost: 10, distance: 5,  invuln: 0.3 },
    aimbuff:  { name: 'content.skill.aimbuff.name',  desc: 'content.skill.aimbuff.desc',  kind: 'timedBuff',  cd: 45, cost: 15, duration: 3,  effect: 'aimBuff' },
    dash:     { name: 'content.skill.dash.name',     desc: 'content.skill.dash.desc',     kind: 'timedBuff',  cd: 25, cost: 12, duration: 5,  effect: 'speedBuff' },
    rally:    { name: 'content.skill.rally.name',    desc: 'content.skill.rally.desc',    kind: 'healPercent',cd: 75, cost: 0,  percent: 0.15 },
    shield:   { name: 'content.skill.shield.name',   desc: 'content.skill.shield.desc',    kind: 'timedBuff',  cd: 30, cost: 0,  duration: 5,  effect: 'shield' },
    taunt:    { name: 'content.skill.taunt.name',    desc: 'content.skill.taunt.desc',     kind: 'taunt',      cd: 60, cost: 0,  duration: 3 },
  };
  c.registerAll('skills', SKILLS);

  /* ==========================================================
     8. 任务（DSL 结构）
     ----------------------------------------------------------
     trigger.kind: 'kill' | 'loot' | 'survive' | 'extract' | 'boss'
     goal:         目标数量
     onComplete:   完成时执行的效果列表
       kind: 'credits' | 'flag' | 'unlock' | ...
     ========================================================== */
  const TASKS = {
    kill5: {
      name: 'content.task.kill5.name',
      desc: 'content.task.kill5.desc',
      source: 'default',
      trigger: { kind: 'kill' },
      goal: 5,
      onComplete: [{ kind: 'credits', amount: 500 }],
    },
    loot3: {
      name: 'content.task.loot3.name',
      desc: 'content.task.loot3.desc',
      source: 'default',
      trigger: { kind: 'loot' },
      goal: 3,
      onComplete: [{ kind: 'credits', amount: 400 }],
    },
    extract: {
      name: 'content.task.extract.name',
      desc: 'content.task.extract.desc',
      source: 'default',
      trigger: { kind: 'extract' },
      goal: 1,
      onComplete: [{ kind: 'credits', amount: 800 }],
    },
    survive: {
      name: 'content.task.survive.name',
      desc: 'content.task.survive.desc',
      source: 'default',
      trigger: { kind: 'survive' },
      goal: 180,
      onComplete: [{ kind: 'credits', amount: 300 }],
    },
  };
  c.registerAll('tasks', TASKS);

   const EFFECTS = {
  bleeding:      { name: '流血',     icon: '🩸', positive: false, awareness: 0 },
  fracture:      { name: '骨折',     icon: '🦴', positive: false, awareness: 0 },
  hypovolemia:   { name: '失血过多', icon: '💔', positive: false, awareness: 0 },
  pain:          { name: '疼痛',     icon: '💢', positive: false, awareness: 0 },
  burning:       { name: '燃烧',     icon: '🔥', positive: false, awareness: 0 },
  burnShock:     { name: '烧伤休克', icon: '🔥', positive: false, awareness: 0 },
  fiber_acute:   { name: '玻纤滞留·急性', icon: '🧪', positive: false, awareness: 0 },
  fiber_chronic: { name: '玻纤滞留·慢性', icon: '🧬', positive: false, awareness: 0 },
  blind:         { name: '闪光失明', icon: '😵', positive: false, awareness: 0 },
  dazzle:        { name: '强光刺眼', icon: '😵‍💫', positive: false, awareness: 0 },
  stun:          { name: '震撼',     icon: '💫', positive: false, awareness: 0 },
  emp_disrupted: { name: '电磁干扰', icon: '📡', positive: false, awareness: 0 },
  emp_silence:   { name: '强电磁干扰', icon: '📡', positive: false, awareness: 0 },
  fiber_pulling: { name: '拔除玻纤中', icon: '🩹', positive: true, awareness: 0 },
  srdispte:      { name: 'Srdispte', icon: '🌪', positive: true,  awareness: 0 },
  hate:          { name: 'Hate',     icon: '🔥', positive: true,  awareness: 0 },
  inspire:       { name: '激励',     icon: '🎖', positive: true,  awareness: 0 },
  stress:        { name: '应激',     icon: '⚡', positive: true,  awareness: 0 },
  flashback:     { name: '闪回',     icon: '🧠', positive: false, awareness: 0 },
  mimic:         { name: '拟载·BYinC', icon: '💎', positive: true, awareness: 0 },
  covey:         { name: '覆柔',     icon: '🎗', positive: true,  awareness: 0 },
  moving_speed_up:{ name: '加速',     icon: '💨', positive: true,  awareness: 0 },
  aim_buff:      { name: '精准',     icon: '🎯', positive: true,  awareness: 0 },
  drone:         { name: '无人机链路', icon: '🛸', positive: true, awareness: 0 },
  catleap:       { name: '猫跃',     icon: '🐾', positive: true,  awareness: 0 },
  suppress:      { name: '压制',     icon: '🎯', positive: true,  awareness: 0 },
  backflash:     { name: '背闪',     icon: '✨', positive: true,  awareness: 0 },
  intuition:     { name: '直觉与回忆', icon: '👁', positive: true, awareness: 0 },
  adapt:         { name: '适应',     icon: '🧩', positive: true,  awareness: 0 },
  suppressed:    { name: '被压制',   icon: '😖', positive: false, awareness: 0 },
  weakness:      { name: '精力虚弱', icon: '🥀', positive: false, awareness: 0 },
  hate_backlash: { name: '血液反噬', icon: '🩸', positive: false, awareness: 0 },
  melee_ready:   { name: '白刃',     icon: '🔪', positive: true,  awareness: 0 },
  painkiller:    { name: '止痛生效', icon: '💊', positive: true,  awareness: 0 },
  stimulant:     { name: '兴奋剂',   icon: '💉', positive: true,  awareness: 0 },
  bandaged:      { name: '已包扎',   icon: '🩹', positive: true,  awareness: 0 },
  tinnitus:      { name: '耳鸣',     icon: '🔔', positive: false, awareness: 0 },
  deafened:      { name: '听力受损', icon: '🔇', positive: false, awareness: 0 },
  // ★ 止痛药/兴奋剂副作用：药不是越多越好，重复用药必须付出代价
  nausea:        { name: '恶心',     icon: '🤢', positive: false, awareness: 0 },
  sedation:      { name: '镇静过度', icon: '😴', positive: false, awareness: 0 },
  overdose:      { name: '药物过量', icon: '☠️', positive: false, awareness: 0 },
  stim_crash:    { name: '药效反噬', icon: '🥀', positive: false, awareness: 0 },
};
c.registerAll('effects', EFFECTS);

    /* ==========================================================
     8.5. 玩法预设（Profile）
     ----------------------------------------------------------
     控制"仿真 ↔ 游戏性"平衡。玩家可在主菜单切换。
     每个配置项含义见 engine.js 的 ProfileSystem.auxWeights / realismWeights。
     ========================================================== */
  const PROFILES = {
    hardcore: {
      name: 'profile.hardcore.name',
      desc: 'profile.hardcore.desc',
      config: {
        hud: { hpBar: false, cpBar: false, ammoCounter: false, taskList: true },
        visual: { damageNumbers: false, hitMarkers: false, minimap: false, enemyOutline: false, extractGuide: false },
        combat: {
          limbDamage: true, armorLayerBreak: true, bulletDrop: true,
          headshotInstantKill: true, realisticRecoil: true, realisticReload: true,
          friendlyFire: true,
        },
        skills: { enabled: false, cooldownReduction: 1.0 },
      },
    },
    tactical: {
      name: 'profile.tactical.name',
      desc: 'profile.tactical.desc',
      config: {
        hud: { hpBar: true, cpBar: true, ammoCounter: true, taskList: true },
        visual: { damageNumbers: true, hitMarkers: true, minimap: true, enemyOutline: false, extractGuide: true },
        combat: {
          limbDamage: true, armorLayerBreak: true, bulletDrop: false,
          headshotInstantKill: true, realisticRecoil: true, realisticReload: true,
          friendlyFire: false,
        },
        skills: { enabled: true, cooldownReduction: 1.0 },
      },
    },
    arcade: {
      name: 'profile.arcade.name',
      desc: 'profile.arcade.desc',
      config: {
        hud: { hpBar: true, cpBar: true, ammoCounter: true, taskList: true },
        visual: { damageNumbers: true, hitMarkers: true, minimap: true, enemyOutline: true, extractGuide: true },
        combat: {
          limbDamage: false, armorLayerBreak: false, bulletDrop: false,
          headshotInstantKill: false, realisticRecoil: false, realisticReload: false,
          friendlyFire: false,
        },
        skills: { enabled: true, cooldownReduction: 0.7 },
      },
    },
    apex: {
      name: 'profile.apex.name',
      desc: 'profile.apex.desc',
      config: {
        hud: { hpBar: true, cpBar: true, ammoCounter: true, taskList: true },
        visual: { damageNumbers: true, hitMarkers: true, minimap: true, enemyOutline: true, extractGuide: true },
        combat: {
          limbDamage: false, armorLayerBreak: false, bulletDrop: false,
          headshotInstantKill: false, realisticRecoil: false, realisticReload: false,
          friendlyFire: false,
        },
        skills: { enabled: true, cooldownReduction: 0.5 },
      },
    },
  };
  c.registerAll('profiles', PROFILES);

  /* ==========================================================
     9. 外部覆盖（window.LAIASAKA_CONTENT）
     ----------------------------------------------------------
     格式：{ table: { id: spec, ... }, ... }
     已存在的 id 会被覆盖；新的 id 会追加。
     ========================================================== */
  if (typeof window !== 'undefined' && window.LAIASAKA_CONTENT) {
    try {
      c.load(window.LAIASAKA_CONTENT);
      console.log('[Content] 已应用外部内容覆盖');
    } catch (e) {
      console.warn('[Content] 外部内容加载失败:', e);
    }
  }

    /* --- 注册到 ProfileSystem --- */
  if (engine.profile) {
    engine.profile.registerProfiles(PROFILES);
    if (!engine.profile.currentProfileId) {
      engine.profile.setProfile('tactical');   // 默认平衡
    }
  }

  /* ==========================================================
     10. 校验
     ========================================================== */
  const errors = c.validate();
  if (errors.length) {
    console.warn('[Content] 引用校验发现 ' + errors.length + ' 个问题：');
    for (const e of errors) console.warn('  · ' + e);
  } else {
    console.log(
      '[Content] 注册完成：' +
      'weapons=' + c.count('weapons') + ' ' +
      'ammo=' + c.count('ammo') + ' ' +
      'enemies=' + c.count('enemies') + ' ' +
      'characters=' + c.count('characters') + ' ' +
      'maps=' + c.count('maps') + ' ' +
      'skills=' + c.count('skills') + ' ' +
      'tasks=' + c.count('tasks')
    );
  }
}
