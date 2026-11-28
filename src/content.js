/* ============================================================
   LaiAsaka Engine · Content Registry
   v3.0.0 · © 2026 ZpycuA · 游戏代码 Apache-2.0 · 游戏资产 CC BY-NC 4.0
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
  // Moments『初等』的 P 空间激光器：玩家无法正常获得，质量/初速按高能脉冲设定
  'p_laser': { name: 'content.ammo.p_laser.name', desc: 'content.ammo.p_laser.desc', w: 1, h: 1, weight: 0.02, caliber: 'p_laser', massG: 12.0, v0: 3000, tier: 5, pen: 9, impulse: 5, effects: [], value: 9000, rarity: 'INC', stackLimit: 999, momentOnly: true },
  // Moments 机枪专用高压弹：不是普通 5.56，穿甲与动能都更高
  'moment_hv': { name: 'content.ammo.moment_hv.name', desc: 'content.ammo.moment_hv.desc', w: 1, h: 1, weight: 0.018, caliber: 'moment_hv', massG: 9.5, v0: 1250, tier: 4, pen: 6, impulse: 3, effects: [], value: 1200, rarity: 'INC', stackLimit: 999, momentOnly: true },
  // 12.7×99mm 全威力弹：反器材步枪/重机枪
  '12.7mm': { name: 'content.ammo.127.name', desc: 'content.ammo.127.desc', w: 1, h: 2, weight: 0.11, caliber: '12.7mm', massG: 42, v0: 900, tier: 5, pen: 10, impulse: 4, effects: [], value: 280, rarity: 'L5', stackLimit: 999 },
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
  p9:    { name: 'content.weapon.p9.name',    desc: 'content.weapon.p9.desc',    w: 2, h: 1, weight: 0.8, ammoType: '9mm',    rpm: 420, mag: 15, reload: 1.5, range: 80,  spread: 0.032, auto: false, fireModes: ['semi'], pellets: 1, color: 0x6a6a7a, value: 600,  rarity: 'L0', stackLimit: 1, recoil: 20, stability: 50, handling: 80, adsSpread: 0.01, drop: 0.01, falloff: 0.5 , stdMag: 'mag_std_9mm', electronics: false, empShielded: true },
  p45:   { name: 'content.weapon.p45.name',   desc: 'content.weapon.p45.desc',   w: 2, h: 1, weight: 1.1, ammoType: '.45acp', rpm: 350, mag: 8,  reload: 1.7, range: 65,  spread: 0.035, auto: false, fireModes: ['semi'], pellets: 1, color: 0x5a4a3a, value: 950,  rarity: 'L1', stackLimit: 1, recoil: 30, stability: 48, handling: 72, adsSpread: 0.012, drop: 0.012, falloff: 0.55, stdMag: 'mag_std_45', electronics: false, empShielded: true },
  rev357:{ name: 'content.weapon.rev357.name',desc: 'content.weapon.rev357.desc',w: 2, h: 1, weight: 1.0, ammoType: '.357',   rpm: 120, mag: 6,  reload: 2.6, range: 95,  spread: 0.02,  auto: false, fireModes: ['single'], pellets: 1, color: 0x4a3a3a, value: 1600, rarity: 'L2', stackLimit: 1, recoil: 55, stability: 62, handling: 55, adsSpread: 0.006, drop: 0.008, falloff: 0.35, feed: 'cylinder', electronics: false, empShielded: true },
  smg9:  { name: 'content.weapon.smg9.name',  desc: 'content.weapon.smg9.desc',  w: 3, h: 1, weight: 2.6, ammoType: '9mm',    rpm: 900, mag: 30, reload: 2.0, range: 75,  spread: 0.044, auto: true,  fireModes: ['auto', 'semi'], pellets: 1, color: 0x3a3a4a, value: 1800, rarity: 'L2', stackLimit: 1, recoil: 24, stability: 52, handling: 88, adsSpread: 0.018, drop: 0.016, falloff: 0.65, stdMag: 'mag_std_9mm_smg', electronics: false, empShielded: true },
  lmg556:{ name: 'content.weapon.lmg556.name',desc: 'content.weapon.lmg556.desc',w: 5, h: 3, weight: 9.2, ammoType: '5.56',    rpm: 700, mag: 100,reload: 5.4, range: 180, spread: 0.042, auto: true,  fireModes: ['auto'], pellets: 1, color: 0x3a4a3a, value: 12500,rarity: 'L4', stackLimit: 1, recoil: 32, stability: 78, handling: 35, adsSpread: 0.02, drop: 0.03, falloff: 0.4, stdMag: 'mag_box_556', electronics: false, empShielded: true },
  dmr762:{ name: 'content.weapon.dmr762.name',desc: 'content.weapon.dmr762.desc',w: 5, h: 2, weight: 6.8, ammoType: '762x54', rpm: 180, mag: 10, reload: 3.0, range: 300, spread: 0.009, auto: false, fireModes: ['semi'], pellets: 1, color: 0x3a3a2a, value: 9800, rarity: 'L4', stackLimit: 1, recoil: 62, stability: 86, handling: 42, adsSpread: 0.003, drop: 0.006, falloff: 0.15, stdMag: 'mag_std_762x54_dmr', electronics: false, empShielded: true },
  smg45: { name: 'content.weapon.smg45.name', desc: 'content.weapon.smg45.desc', w: 3, h: 1, weight: 2.5, ammoType: '.45acp', rpm: 780, mag: 25, reload: 2.0, range: 60,  spread: 0.048, auto: true,  fireModes: ['auto'], pellets: 1, color: 0x4a4a5a, value: 1500, rarity: 'L1', stackLimit: 1, recoil: 30, stability: 40, handling: 75, adsSpread: 0.02, drop: 0.015, falloff: 0.6 , stdMag: 'mag_std_45_smg', electronics: false, empShielded: true },
  // ★ 短管卡宾/冲锋枪：填补“室内/车内近战”武器生态，不引入新口径。
  mk18: { name: 'content.weapon.mk18.name', desc: 'content.weapon.mk18.desc', w: 4, h: 2, weight: 3.1, ammoType: '5.56', rpm: 900, mag: 30, reload: 2.2, range: 120, spread: 0.030, auto: true, fireModes: ['semi', 'auto'], pellets: 1, color: 0x3f4a4a, value: 3400, rarity: 'L2', stackLimit: 1, recoil: 44, stability: 56, handling: 72, adsSpread: 0.007, drop: 0.021, falloff: 0.45, stdMag: 'mag_std_556', electronics: false, empShielded: true },
  vss9: { name: 'content.weapon.vss9.name', desc: 'content.weapon.vss9.desc', w: 4, h: 2, weight: 2.2, ammoType: '9mm', rpm: 1000, mag: 30, reload: 2.4, range: 60, spread: 0.050, auto: true, fireModes: ['auto', 'semi'], pellets: 1, color: 0x2f3a3a, value: 2800, rarity: 'L3', stackLimit: 1, recoil: 22, stability: 48, handling: 90, adsSpread: 0.022, drop: 0.018, falloff: 0.7, stdMag: 'mag_std_9mm_smg', electronics: false, empShielded: true },
  ar556: { name: 'content.weapon.ar556.name', desc: 'content.weapon.ar556.desc', w: 4, h: 2, weight: 3.6, ammoType: '5.56',   rpm: 850, mag: 30, reload: 2.3, range: 140, spread: 0.025, auto: true,  fireModes: ['semi', 'auto'], pellets: 1, color: 0x3a4a5a, value: 3000, rarity: 'L2', stackLimit: 1, recoil: 40, stability: 60, handling: 65, adsSpread: 0.005, drop: 0.02, falloff: 0.4 , stdMag: 'mag_std_556', electronics: false, empShielded: true },
ak762: { name: 'content.weapon.ak762.name', desc: 'content.weapon.ak762.desc', w: 4, h: 2, weight: 4.0, ammoType: '7.62',   rpm: 620, mag: 30, reload: 2.6, range: 130, spread: 0.034, auto: true,  fireModes: ['auto', 'semi'], pellets: 1, color: 0x5a3a2a, value: 3200, rarity: 'L2', stackLimit: 1, recoil: 55, stability: 45, handling: 55, adsSpread: 0.01, drop: 0.025, falloff: 0.5 , stdMag: 'mag_std_762', electronics: false, empShielded: true },
sr762: { name: 'content.weapon.sr762.name', desc: 'content.weapon.sr762.desc', w: 5, h: 2, weight: 6.5, ammoType: '762x54', rpm: 55,  mag: 5,  reload: 3.2, range: 350, spread: 0.002, auto: false, fireModes: ['single'], pellets: 1, color: 0x2a3a4a, value: 8000, rarity: 'L3', stackLimit: 1, recoil: 80, stability: 95, handling: 30, adsSpread: 0.0, drop: 0.005, falloff: 0.1 , feed: 'internal', electronics: false, empShielded: true }, // ★ 改为 7.62×54R 全威力弹，range 350
  sg12:  { name: 'content.weapon.sg12.name',  desc: 'content.weapon.sg12.desc',  w: 4, h: 2, weight: 3.8, ammoType: '12ga',   rpm: 85,  mag: 6,  reload: 3.0, range: 35,  spread: 0.100, auto: false, fireModes: ['pump'], pellets: 9, color: 0x5a4a2a, value: 2500, rarity: 'L3', stackLimit: 1, recoil: 70, stability: 50, handling: 50, adsSpread: 0.05, drop: 0.01, falloff: 0.8 , feed: 'tube', electronics: false, empShielded: true },
  // ★ 四联发榴弹炮：弹膛按“投掷物实物”逐发装填，不发射子弹。
  //   launchNades 让 _fireWeapon 走 _fireLauncher 分支；可用弹种由 nade 表的 launchable 决定。
  gl4:   { name: 'content.weapon.gl4.name',   desc: 'content.weapon.gl4.desc',   w: 5, h: 3, weight: 6.4, ammoType: '40mm',   rpm: 60,  mag: 4,  reload: 4.4, range: 120, spread: 0.018, auto: false, fireModes: ['semi'], pellets: 1, color: 0x3a4a3a, value: 14500, rarity: 'L4', stackLimit: 1, recoil: 58, stability: 72, handling: 38, adsSpread: 0.008, drop: 0.02, falloff: 0.3, electronics: false, empShielded: true, launcher: true, launchNades: true },
  // ★ Moment『初等』专用：玩家无法正常携行（数百公斤），只作为敌人武器与战利品展示
  // ★ 12.7mm 反器材步枪 / 重机枪：全威力弹，后坐与重量都极高
  am50: {
    name: 'content.weapon.am50.name', desc: 'content.weapon.am50.desc',
    w: 6, h: 2, weight: 14.5, ammoType: '12.7mm', rpm: 20, mag: 5, reload: 4.8,
    range: 520, spread: 0.0015, auto: false, fireModes: ['single'], pellets: 1,
    color: 0x2a3040, value: 38000, rarity: 'L5', stackLimit: 1,
    recoil: 130, stability: 78, handling: 20, adsSpread: 0.0, drop: 0.004, falloff: 0.05,
    stdMag: 'mag_std_127',
    electronics: false, empShielded: true,
  },
  hmg50: {
    name: 'content.weapon.hmg50.name', desc: 'content.weapon.hmg50.desc',
    w: 6, h: 3, weight: 32, ammoType: '12.7mm', rpm: 850, mag: 50, reload: 6.8,
    range: 300, spread: 0.075, auto: true, fireModes: ['auto'], pellets: 1,
    color: 0x3a3a32, value: 26000, rarity: 'L5', stackLimit: 1,
    recoil: 95, stability: 28, handling: 14, adsSpread: 0.05, drop: 0.02, falloff: 0.25,
    stdMag: 'mag_box_127',
    electronics: false, empShielded: true,
  },
  saw762: {
    name: 'content.weapon.saw762.name', desc: 'content.weapon.saw762.desc',
    w: 5, h: 3, weight: 9.8, ammoType: '7.62', rpm: 700, mag: 100, reload: 6.2,
    range: 220, spread: 0.048, auto: true, fireModes: ['auto'], pellets: 1,
    color: 0x3a4a3a, value: 18000, rarity: 'L4', stackLimit: 1,
    recoil: 48, stability: 55, handling: 25, adsSpread: 0.03, drop: 0.025, falloff: 0.35,
    stdMag: 'mag_box_762',
    electronics: false, empShielded: true,
  },
  moment_hmg: {
    name: 'content.weapon.moment_hmg.name', desc: 'content.weapon.moment_hmg.desc',
    w: 6, h: 3, weight: 240, ammoType: 'moment_hv', rpm: 12000, mag: 300, reload: 7.5,
    range: 220, spread: 0.055, auto: true, fireModes: ['auto'], pellets: 1,
    color: 0x2a2a30, value: 260000, rarity: 'INC', stackLimit: 1,
    recoil: 60, stability: 30, handling: 18, adsSpread: 0.04, drop: 0.02, falloff: 0.3,
    feed: 'belt',
    electronics: true, empShielded: true, momentOnly: true,
  },
  moment_laser: {
    name: 'content.weapon.moment_laser.name', desc: 'content.weapon.moment_laser.desc',
    w: 6, h: 3, weight: 180, ammoType: 'p_laser', rpm: 900, mag: 200, reload: 6.0,
    range: 420, spread: 0.0015, auto: true, fireModes: ['auto'], pellets: 1,
    color: 0x303a52, value: 320000, rarity: 'INC', stackLimit: 1,
    recoil: 8, stability: 92, handling: 32, adsSpread: 0.001, drop: 0.0, falloff: 0.02,
    feed: 'belt',
    electronics: true, empShielded: true, momentOnly: true, laserWeapon: true,
  },
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
    // ★ 尼珀斯尔智能外骨骼：不是普通护甲，实际减伤由 game.js 的外骨骼能量结算覆盖
    lv6: { name: 'content.armor.lv6.name', red: 0.90, maxDur: 120 },
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
  // ★ Incredible 级：尼珀斯尔“执政官”智能外骨骼。占护甲槽，不可修补，靠科技电池供电。
  exo_nipsel: {
    name: 'content.vestFiber.exo_nipsel.name',
    desc: 'content.vestFiber.exo_nipsel.desc',
    w: 5, h: 4, weight: 18.5, armorLv: 6, maxDur: 1200,
    value: 68000, rarity: 'INC', stackLimit: 1,
    subSlots: ['battery'], electronics: true, empShielded: true,
    // ★ 抗磁层耐久：一次 EMP 先扣抗磁层，层破前不会直接损坏头显/外骨骼。
    empShieldMax: 240,
    exoskeleton: true,
    // ★ 外骨骼自身的 6 个挂载硬点：只接受枪械，头显接入后才可切换/自动射击。
    mountSlots: 6,
  },
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
    ammo: 60, sideAmmo: 30, meds: 2, nades: 1, attach: 1, sideAttach: 0, spareMags: 1, sideSpareMags: 0,
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
    ammo: 120, sideAmmo: 45, meds: 3, nades: 2, attach: 3, sideAttach: 1, spareMags: 2, sideSpareMags: 1,
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
    ammo: 180, sideAmmo: 60, meds: 4, nades: 3, attach: 4, sideAttach: 2, spareMags: 3, sideSpareMags: 1,
    special: [{ table: 'medical', id: 'morphine' }],
  },
  special: {
    name: '特种', desc: '试验性配装：5 级护具、双主武器/狙击枪、满配弹药与特殊装备。价值高，风险也高。',
    order: 4,
    primary: ['lmg556', 'dmr762', 'sr762', 'ar556', 'gl4'],
    sidearm: ['rev357', 'p45'],
    dual: 0.8,
    armorLv: [5, 5], plateChance: 1,
    bag: ['heavy'], rig: ['heavy'],
    ammo: 240, sideAmmo: 90, meds: 5, nades: 4, attach: 5, sideAttach: 2, spareMags: 4, sideSpareMags: 2,
    // ★ 特种配装不再硬塞一个没有玩法的野战电台占 3.2kg；
    //   换成真正能救命的血袋。电台仍作为可搜刮/可出售的电子战利品存在。
    special: [{ table: 'medical', id: 'quickclot' }, { table: 'medical', id: 'blood_pack' }],
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
    damage: 620,
    range: 1.9,
    cooldown: 0.55,
    value: 200,
    rarity: 'L1',
    stackLimit: 1,
    melee: true,
    moveset: [
      { label: 'content.melee.move.thrust', mul: 1.00, range: 1.9, cd: 0.55, bleed: 1 },
      { label: 'content.melee.move.slash_d', mul: 1.05, range: 1.8, cd: 0.55, bleed: 1 },
      { label: 'content.melee.move.slash_h', mul: 1.10, range: 1.8, cd: 0.60, bleed: 1 },
    ],
  },
  // ★ 军队战术刀：比战术匕首长、重，刀术是标准的“刺—割—斜劈”循环。
  combat_knife: {
    name: 'content.melee.combat_knife.name',
    desc: 'content.melee.combat_knife.desc',
    w: 2, h: 1, weight: 0.34,
    damage: 780,
    range: 2.1,
    cooldown: 0.58,
    value: 950,
    rarity: 'L2',
    stackLimit: 1,
    melee: true,
    moveset: [
      { label: 'content.melee.move.thrust', mul: 1.00, range: 2.1, cd: 0.55, bleed: 1.1 },
      { label: 'content.melee.move.slash_h', mul: 1.05, range: 2.0, cd: 0.58, bleed: 1.1 },
      { label: 'content.melee.move.slash_d', mul: 1.18, range: 2.0, cd: 0.66, bleed: 1.2 },
    ],
  },
  // ★ 开山刀：挥砍距离最长，单发伤害高，但出刀慢、体力消耗大。
  kukri: {
    name: 'content.melee.kukri.name',
    desc: 'content.melee.kukri.desc',
    w: 3, h: 1, weight: 0.72,
    damage: 1150,
    range: 2.45,
    cooldown: 0.82,
    value: 1600,
    rarity: 'L3',
    stackLimit: 1,
    melee: true,
    moveset: [
      { label: 'content.melee.move.slash_d', mul: 1.05, range: 2.4, cd: 0.78, bleed: 1.3 },
      { label: 'content.melee.move.backhand', mul: 1.10, range: 2.3, cd: 0.82, bleed: 1.3 },
      { label: 'content.melee.move.chop', mul: 1.35, range: 2.2, cd: 0.95, bleed: 1.4 },
    ],
  },
  // ★ 黑奈·夜切（FAN）：黑奈家传短刀。单发基础伤害不高，但刀术极快——
  //   前三刀 0.3s 一刀，第四刀转刀在 0.1s 内造成 6 道伤口，收刀斜劈伤害最高。
  krona_nightcut: {
    name: 'content.melee.krona_nightcut.name',
    desc: 'content.melee.krona_nightcut.desc',
    w: 2, h: 1, weight: 0.41,
    damage: 560,
    range: 2.05,
    cooldown: 0.30,
    value: 48000,
    rarity: 'FAN',
    stackLimit: 1,
    melee: true,
    bleedMul: 2.6,
    moveset: [
      { label: 'content.melee.move.slash_h', mul: 0.95, range: 2.05, cd: 0.30, bleed: 1.8 },
      { label: 'content.melee.move.slash_v', mul: 1.00, range: 2.0, cd: 0.30, bleed: 1.8 },
      { label: 'content.melee.move.slash_d', mul: 1.05, range: 2.0, cd: 0.30, bleed: 1.9 },
      { label: 'content.melee.move.spin', mul: 0.30, range: 1.75, cd: 0.42, hits: 6, window: 0.1, bleed: 2.4, spin: true },
      { label: 'content.melee.move.finisher', mul: 2.35, range: 2.25, cd: 0.72, bleed: 2.2 },
    ],
  },
  // ★ Moment『初等』的贴身肘击：物理上就是上百公斤装甲 + 数千级力量的一击，
  //   动能足以直接把人打飞/打死；玩家无法正常携行。
  moment_elbow: {
    name: 'content.melee.moment_elbow.name', desc: 'content.melee.moment_elbow.desc',
    w: 2, h: 1, weight: 12, damage: 12000, range: 2.35, cooldown: 1.15,
    value: 0, rarity: 'INC', stackLimit: 1, melee: true, momentOnly: true,
    moveset: [
      { label: 'content.melee.move.chop', mul: 1.0, range: 2.35, cd: 1.15, bleed: 3.5 },
    ],
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
  // ★ 烟雾弹：定时引信，落地后形成持续烟幕。烟幕会遮挡 AI 视线，
  //   但不会阻挡子弹/破片，也不会伤害目标；是撤退、救人、换位的重要战术道具。
  smoke: {
    name: 'content.nade.smoke.name',
    desc: 'content.nade.smoke.desc',
    w: 1, h: 1, weight: 0.5,
    damage: 0,
    radius: 9,
    fuse: 1.8,
    trigger: 'timed',
    effect: 'smoke',
    smokeRadius: 8.5,
    smokeDuration: 20,
    icon: '🌫',
    value: 240,
    rarity: 'L1',
    stackLimit: 3,
    color: 0xbfc4c8,
  },
  // ★ 40×46mm 高爆弹（HE）：只能由四联榴弹炮发射，手投会直接炸膛，故 launchOnly。
  //   预制破片少、装药大，靠超压与壳体破片杀人；对掩体后的目标衰减明显。
  gl_he: {
    name: 'content.nade.gl_he.name',
    desc: 'content.nade.gl_he.desc',
    w: 1, h: 2, weight: 0.92,
    damage: 5200,
    radius: 11,
    fuse: 0.04,
    trigger: 'impact',
    effect: 'frag',
    fragments: 240,
    fragmentCount: 16,
    value: 820,
    rarity: 'L3',
    stackLimit: 3,
    launchOnly: true,
    color: 0x4a5a3a,
  },
  // ★ 40×46mm 温压弹（TB）：云爆剂先抛撒、二次点火；开阔地气体迅速稀释，
  //   室内/坑道里聚集后形成持续超压与缺氧。数值由 game.js 的温压场仿真结算。
  gl_thermo: {
    name: 'content.nade.gl_thermo.name',
    desc: 'content.nade.gl_thermo.desc',
    w: 1, h: 2, weight: 1.05,
    damage: 4200,
    radius: 9,
    fuse: 0.16,
    trigger: 'impact',
    effect: 'thermo',
    fuel: 1.2,
    fireDuration: 8,
    value: 1260,
    rarity: 'L4',
    stackLimit: 3,
    launchOnly: true,
    color: 0x6a4a2a,
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
  // ★ Assee 容器核心：每个都有独立编号，属于“电子资产”式 INC 物品。
  //   拾取后会触发 P 空间追踪；带离撤离点才算真正完成事件。
  asce_core: {
    name: 'content.valuable.asce_core.name', desc: 'content.valuable.asce_core.desc',
    w: 2, h: 2, weight: 1.35, value: 240000, rarity: 'INC', stackLimit: 1, icon: '🌀',
    electronics: true, empShielded: true, asc: true,
  },
  // ★ 从 Prazer 尸体里取出的 Assee 核心：先变成一件真正的物品，
  //   物品等级（L1~L5 / INC）由原主 Aselevel 决定；之后可在背包详情里吸收。
  praze_core: {
    name: 'content.valuable.praze_core.name', desc: 'content.valuable.praze_core.desc',
    w: 2, h: 2, weight: 1.15, value: 6000, rarity: 'L1', stackLimit: 1, icon: '🌌',
    electronics: true, empShielded: true, asc: true, prazeCore: true,
  },
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
  // ★ 主模式与 Straight 共用的“故事小件”：不给机制，只给世界观与搜刮理由。
  sandglass: {
    name: 'content.valuable.sandglass.name', desc: 'content.valuable.sandglass.desc',
    w: 1, h: 1, weight: 0.24, value: 900, rarity: 'L2', stackLimit: 1, icon: '⏳',
  },
  cat_bell: {
    name: 'content.valuable.cat_bell.name', desc: 'content.valuable.cat_bell.desc',
    w: 1, h: 1, weight: 0.05, value: 300, rarity: 'L1', stackLimit: 1, icon: '🔔',
  },
  praze_charm: {
    name: 'content.valuable.praze_charm.name', desc: 'content.valuable.praze_charm.desc',
    w: 1, h: 1, weight: 0.04, value: 1400, rarity: 'L3', stackLimit: 1, icon: '🪶',
  },
  old_letter: {
    name: 'content.valuable.old_letter.name', desc: 'content.valuable.old_letter.desc',
    w: 1, h: 1, weight: 0.01, value: 450, rarity: 'L2', stackLimit: 1, icon: '✉️',
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
    name: '吗啡自动注射笔', desc: '一次性吗啡注射笔。强效镇痛，能让人带伤继续行动；过量会抑制呼吸。',
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
  // ★ 甲修 / 头修：只修护甲耐久，不修外骨骼、不改变材质
  armor_repair_kit: {
    name: '护甲维修套件', desc: '含陶瓷片、纤维补片与固化胶的便携维修包。可恢复纤维/插板/头盔的耐久，但无法修复外骨骼。',
    w: 2, h: 2, weight: 0.9, value: 780, rarity: 'L3', stackLimit: 2, icon: '🧰',
    use: { kind: 'repair', target: 'armor', time: 5.0, amount: 35 },
  },
  helmet_repair_kit: {
    name: '头盔维修套件', desc: '含面罩抛光片、壳体补强片与密封胶。用于修复头盔壳/面罩，不能修纤维或插板。',
    w: 1, h: 1, weight: 0.45, value: 520, rarity: 'L3', stackLimit: 2, icon: '⛑',
    use: { kind: 'repair', target: 'helmet', time: 4.0, amount: 40 },
  },
};
c.registerAll('medical', MEDICAL);

// ★ 外骨骼科技电池：占外骨骼的 battery 子槽，电量就是 dur
const BATTERY = {
  exo_cell_hi: {
    name: '尼珀斯尔高密度科技电池',
    desc: '外骨骼专用高密度电池，外壳有电磁加固。电量用尽后外骨骼只剩死重；可更换，但价格极高。',
    w: 1, h: 1, weight: 0.55, maxDur: 300, value: 5200,
    rarity: 'L4', stackLimit: 1, electronics: true, empShielded: true,
    empShieldMax: 160,
  },
};
c.registerAll('battery', BATTERY);

/* ==========================================================
   3.9.5 枪械配件
   ----------------------------------------------------------
   slot:       安装槽位（muzzle 枪口 / sight 瞄具 / mag 弹匣 / grip 握把）
   fits:       兼容武器 defId 列表；缺省表示按槽位通用（枪口仍必须过口径校验）
   caliber:    枪口/弹匣的兼容口径。唯一真相源是武器 def.ammoType；
               枪口件没有标定口径时视为“无适配螺纹”，不允许安装。
   spreadMul / recoilMul / adsSpreadMul / rangeMul / soundMul / magMul:
               乘算修正。未写视为 1。
   禁止：配件不要直接改写武器 def，运行时统一由 Inventory.getAttachmentStats 汇总。
   ========================================================== */
const ATTACH = {
  // ---------- 枪口 ----------
  supp_556: {
    slot: 'muzzle', name: '5.56 抑制器', desc: '钢制消音器，能明显削弱枪口焰与枪声，并略微收束散布；重量会让枪口更沉。',
    w: 1, h: 1, weight: 0.42, value: 1100, rarity: 'L3', stackLimit: 1, icon: '🔇',
    caliber: '5.56', stats: { spreadMul: 0.88, recoilMul: 0.86, soundMul: 0.42 },
  },
  supp_762: {
    slot: 'muzzle', name: '7.62 抑制器', desc: '为 7.62 口径步枪设计的粗管抑制器。消声效果略逊于小口径型号，但能压住 AK 的枪口焰。',
    w: 1, h: 1, weight: 0.52, value: 1250, rarity: 'L3', stackLimit: 1, icon: '🔇',
    caliber: '7.62', stats: { spreadMul: 0.9, recoilMul: 0.88, soundMul: 0.45 },
  },
  supp_762x54: {
    slot: 'muzzle', name: '7.62×54R 抑制器', desc: '全威力弹专用重型抑制器，体积大、重量高，但能把狙击枪的枪声压到难以定位。',
    w: 2, h: 1, weight: 0.85, value: 2100, rarity: 'L4', stackLimit: 1, icon: '🔇',
    caliber: '762x54', stats: { spreadMul: 0.86, recoilMul: 0.9, soundMul: 0.4 },
  },
  supp_9mm: {
    slot: 'muzzle', name: '9mm 抑制器', desc: '手枪/冲锋枪用小型抑制器，消声效果好，重量对操控影响明显。',
    w: 1, h: 1, weight: 0.28, value: 820, rarity: 'L2', stackLimit: 1, icon: '🔇',
    caliber: '9mm', stats: { spreadMul: 0.92, recoilMul: 0.94, soundMul: 0.5 },
  },
  comp_556: {
    slot: 'muzzle', name: '5.56 制退器', desc: '5.56 口径多孔制退器，牺牲一点枪声隐蔽性换取更好的连续射击控制。',
    w: 1, h: 1, weight: 0.18, value: 620, rarity: 'L2', stackLimit: 1, icon: '🔩',
    caliber: '5.56', stats: { recoilMul: 0.72, spreadMul: 1.06, soundMul: 1.15 },
  },
  comp_762: {
    slot: 'muzzle', name: '7.62 制退器', desc: '7.62 口径制退器，明显压低 AK 的上跳；枪口冲击波会让无耳机的射手耳鸣。',
    w: 1, h: 1, weight: 0.24, value: 700, rarity: 'L2', stackLimit: 1, icon: '🔩',
    caliber: '7.62', stats: { recoilMul: 0.68, spreadMul: 1.08, soundMul: 1.2 },
  },
  comp_762x54: {
    slot: 'muzzle', name: '7.62×54R 制退器', desc: '全威力弹制退器。降后坐效果极强，但侧向冲击和枪声也更大。',
    w: 1, h: 1, weight: 0.38, value: 980, rarity: 'L3', stackLimit: 1, icon: '🔩',
    caliber: '762x54', stats: { recoilMul: 0.62, spreadMul: 1.1, soundMul: 1.28 },
  },
  comp_12ga: {
    slot: 'muzzle', name: '12 号枪口制退器', desc: '霰弹枪用制退器，降低后坐但会让弹丸散布略微变差。',
    w: 1, h: 1, weight: 0.26, value: 520, rarity: 'L2', stackLimit: 1, icon: '🔩',
    caliber: '12ga', stats: { recoilMul: 0.76, spreadMul: 1.08, soundMul: 1.15 },
  },
  flash_556: {
    slot: 'muzzle', name: '5.56 消焰器', desc: '标准鸟笼消焰器。对后坐帮助有限，但能显著削弱夜间枪口焰，也略降枪声。',
    w: 1, h: 1, weight: 0.1, value: 320, rarity: 'L1', stackLimit: 1, icon: '🔥',
    caliber: '5.56', stats: { recoilMul: 0.95, spreadMul: 1.01, soundMul: 0.88 },
  },
  choke_12ga: {
    slot: 'muzzle', name: '12 号收束器', desc: '收束弹丸的喉缩，霰弹分布更集中、有效射程更远；近距离容错下降。',
    w: 1, h: 1, weight: 0.14, value: 460, rarity: 'L2', stackLimit: 1, icon: '⭕',
    caliber: '12ga', stats: { spreadMul: 0.78, rangeMul: 1.12 },
  },
  // 旧版通用制退器的兼容项：旧存档里已经装着的 comp_rifle 仍能解析，
  // 但口径被固定为 5.56，AK762 再装会被 canAttach 拒绝。
  comp_rifle: {
    slot: 'muzzle', name: '5.56 制退器（旧型）', desc: '旧式多孔制退器，只适配 5.56 口径。旧存档仍可拆下使用。',
    w: 1, h: 1, weight: 0.18, value: 500, rarity: 'L2', stackLimit: 1, icon: '🔩',
    caliber: '5.56', stats: { recoilMul: 0.74, spreadMul: 1.04, soundMul: 1.15 },
  },

  // ---------- 瞄具 ----------
  sight_1x: {
    slot: 'sight', name: '1 倍红点镜', desc: '轻量红点镜，开镜快、视野开阔，适合近距离快速点射。',
    w: 1, h: 1, weight: 0.12, value: 540, rarity: 'L1', stackLimit: 1, icon: '🔴',
    fits: ['ar556', 'ak762', 'smg9', 'smg45', 'p9', 'sg12', 'lmg556'],
    stats: { adsSpreadMul: 0.82, spreadMul: 0.96, zoom: 1.2 },
  },
  sight_2x: {
    slot: 'sight', name: '2 倍战术镜', desc: '低倍率棱镜镜，中距离目标更清楚；开镜后视野略窄。',
    w: 1, h: 1, weight: 0.24, value: 900, rarity: 'L2', stackLimit: 1, icon: '🔭',
    fits: ['ar556', 'ak762', 'sr762', 'smg45', 'sg12'], stats: { adsSpreadMul: 0.7, spreadMul: 0.94, zoom: 2.0 },
  },
  sight_3x: {
    slot: 'sight', name: '3 倍棱镜镜', desc: '中远距离折中瞄具，重量和视野损失都在可接受范围。',
    w: 2, h: 1, weight: 0.3, value: 1250, rarity: 'L3', stackLimit: 1, icon: '🔭',
    fits: ['ar556', 'ak762', 'sr762', 'dmr762', 'lmg556'],
    stats: { adsSpreadMul: 0.58, spreadMul: 0.92, zoom: 3.0 },
  },
  sight_4x: {
    slot: 'sight', name: '4 倍狙击镜', desc: '高倍率狙击镜，远距离精度优秀，近距离视野极差。',
    w: 2, h: 1, weight: 0.38, value: 1800, rarity: 'L3', stackLimit: 1, icon: '🎯',
    fits: ['sr762', 'dmr762', 'ar556'], stats: { adsSpreadMul: 0.45, spreadMul: 0.88, zoom: 4.0 },
  },
  sight_6x: {
    slot: 'sight', name: '6 倍远程镜', desc: '为全威力弹狙击枪准备的远程镜。重量大、近距离几乎无法跟枪，但 300 米外仍是清晰的。',
    w: 2, h: 1, weight: 0.52, value: 2600, rarity: 'L4', stackLimit: 1, icon: '🎯',
    fits: ['sr762', 'dmr762'], stats: { adsSpreadMul: 0.34, spreadMul: 0.84, zoom: 6.0 },
  },

  // ---------- 握把 / 下挂 ----------
  grip_angled: {
    slot: 'grip', name: '斜角握把', desc: '前握把降低后坐力回复时间，对散布有小幅帮助。',
    w: 1, h: 1, weight: 0.12, value: 480, rarity: 'L1', stackLimit: 1, icon: '✊',
    fits: ['ar556', 'ak762', 'smg9', 'smg45', 'sr762'], stats: { recoilMul: 0.82, spreadMul: 0.95 },
  },
  grip_vertical: {
    slot: 'grip', name: '垂直握把', desc: '垂直前握把把枪口下压得更稳，连发时弹道更可控；横向摆动仍要靠射手。',
    w: 1, h: 1, weight: 0.16, value: 560, rarity: 'L2', stackLimit: 1, icon: '✊',
    fits: ['ar556', 'ak762', 'lmg556', 'smg9'], stats: { recoilMul: 0.76, spreadMul: 0.97 },
  },
  grip_stubby: {
    slot: 'grip', name: '短握把', desc: '短小轻量的手挡，几乎不增加重量，主要抑制腰射散布。',
    w: 1, h: 1, weight: 0.07, value: 380, rarity: 'L1', stackLimit: 1, icon: '✊',
    fits: ['ar556', 'ak762', 'smg9', 'smg45'],
    stats: { spreadMul: 0.9, recoilMul: 0.92 },
  },
  grip_handstop: {
    slot: 'grip', name: '手挡', desc: '一片铝合金手挡，防止手滑到枪口，对精度只有微小帮助。',
    w: 1, h: 1, weight: 0.04, value: 180, rarity: 'L0', stackLimit: 1, icon: '✋',
    fits: ['ar556', 'ak762', 'smg9', 'smg45', 'sg12'], stats: { spreadMul: 0.95, recoilMul: 0.96 },
  },
  bipod: {
    slot: 'grip', name: '轻型两脚架', desc: '为机枪/精确射手步枪设计的两脚架。架枪时极稳，但携行重量和展开时间都是代价。',
    w: 2, h: 1, weight: 0.55, value: 980, rarity: 'L3', stackLimit: 1, icon: '🦵',
    fits: ['lmg556', 'dmr762', 'sr762'], stats: { recoilMul: 0.62, spreadMul: 0.9 },
  },
  laser_sight: {
    slot: 'grip', name: '激光指示器', desc: '可见激光辅助指向，腰射散布明显收束；会暴露位置。内置小电池，开启时消耗电量。',
    w: 1, h: 1, weight: 0.09, value: 760, rarity: 'L2', stackLimit: 1, icon: '🔴',
    maxDur: 100, electronics: true, empShielded: true,
    fits: ['ar556', 'ak762', 'smg9', 'smg45', 'p9'], stats: { spreadMul: 0.78, adsSpreadMul: 1.05, laser: true },
  },
  flashlight: {
    slot: 'grip', name: '战术强光灯', desc: '高流明战术灯，照亮前方并压制暗处目标。内置小电池，开启时持续耗电。',
    w: 1, h: 1, weight: 0.14, value: 620, rarity: 'L2', stackLimit: 1, icon: '🔦',
    maxDur: 100, electronics: true, empShielded: true,
    fits: ['ar556', 'ak762', 'smg9', 'smg45', 'p9', 'sg12'], stats: { light: true },
  },

  // ---------- 弹匣 ----------
  mag_ext_556: {
    slot: 'mag', name: '5.56 扩容弹匣', desc: '40 发扩容弹匣，换弹更慢、重量更大。',
    w: 1, h: 2, weight: 0.35, value: 700, rarity: 'L2', stackLimit: 1, icon: '🧱',
    caliber: '5.56', capacity: 40, stats: { reloadMul: 1.15 },
  },
  mag_drum_556: {
    slot: 'mag', name: '5.56 弹鼓', desc: '60 发弹鼓。持续火力最猛，但换弹极慢、携行重量几乎等于再背一把枪。',
    w: 2, h: 2, weight: 0.95, value: 1600, rarity: 'L4', stackLimit: 1, icon: '🥁',
    caliber: '5.56', capacity: 60, stats: { reloadMul: 1.55 },
  },
  mag_ext_762: {
    slot: 'mag', name: '7.62 扩容弹匣', desc: '40 发扩容弹匣，适配 7.62 口径步枪。',
    w: 1, h: 2, weight: 0.4, value: 760, rarity: 'L2', stackLimit: 1, icon: '🧱',
    caliber: '7.62', capacity: 40, stats: { reloadMul: 1.15 },
  },
  mag_ext_762x54: {
    slot: 'mag', name: '7.62×54R 扩容弹匣', desc: '全威力弹扩容弹匣，把 5 发弹仓扩到 7 发；体积和重量都很可观。',
    w: 1, h: 2, weight: 0.32, value: 880, rarity: 'L3', stackLimit: 1, icon: '🧱',
    caliber: '762x54', capacity: 7, stats: { reloadMul: 1.1 },
  },
  mag_ext_9mm: {
    slot: 'mag', name: '9mm 延长弹匣', desc: '9mm 加长弹匣，适合冲锋枪持续压制；手枪上会明显影响操控。',
    w: 1, h: 2, weight: 0.24, value: 420, rarity: 'L2', stackLimit: 1, icon: '🧱',
    caliber: '9mm', capacity: 22, stats: { reloadMul: 1.12 },
  },
  mag_ext_45: {
    slot: 'mag', name: '.45 扩容弹匣', desc: '.45 ACP 扩容弹匣，让大口径冲锋枪的换弹间隔更从容。',
    w: 1, h: 2, weight: 0.28, value: 460, rarity: 'L2', stackLimit: 1, icon: '🧱',
    caliber: '.45acp', capacity: 12, stats: { reloadMul: 1.12 },
  },
  mag_ext_12ga: {
    slot: 'mag', name: '12 号弹匣', desc: '霰弹枪扩容弹匣，多带几发独头弹或鹿弹。',
    w: 1, h: 2, weight: 0.35, value: 640, rarity: 'L2', stackLimit: 1, icon: '🧱',
    caliber: '12ga', capacity: 9, stats: { reloadMul: 1.2 },
  },
  // ---------- 标准弹匣：现在是每把枪必需的供弹具，不再是“可选扩容” ----------
  mag_std_556: {
    slot: 'mag', name: '5.56 标准弹匣', desc: '30 发标准钢弹匣。没有弹匣的枪就是一块铁，必须安装适配口径的弹匣才能供弹。',
    w: 1, h: 2, weight: 0.28, value: 220, rarity: 'L0', stackLimit: 1, icon: '🧱',
    caliber: '5.56', capacity: 30, stats: {},
  },
  mag_std_762: {
    slot: 'mag', name: '7.62 标准弹匣', desc: '30 发 7.62 钢弹匣，适配 AK 系列。',
    w: 1, h: 2, weight: 0.32, value: 240, rarity: 'L0', stackLimit: 1, icon: '🧱',
    caliber: '7.62', capacity: 30, stats: {},
  },
  mag_std_762x54: {
    slot: 'mag', name: '7.62×54R 弹匣', desc: '5 发全威力弹弹匣，适配狙击枪/精确射手步枪。',
    w: 1, h: 2, weight: 0.2, value: 260, rarity: 'L1', stackLimit: 1, icon: '🧱',
    caliber: '762x54', capacity: 5, stats: {},
  },
  mag_std_9mm: {
    slot: 'mag', name: '9mm 标准弹匣', desc: '15 发 9mm 弹匣，手枪/冲锋枪通用。',
    w: 1, h: 1, weight: 0.16, value: 140, rarity: 'L0', stackLimit: 1, icon: '🧱',
    caliber: '9mm', capacity: 15, stats: {},
  },
  mag_std_45: {
    slot: 'mag', name: '.45 标准弹匣', desc: '8 发 .45 ACP 弹匣，适配大口径手枪。',
    w: 1, h: 1, weight: 0.2, value: 160, rarity: 'L0', stackLimit: 1, icon: '🧱',
    caliber: '.45acp', capacity: 8, stats: {},
  },
  mag_std_12ga: {
    slot: 'mag', name: '12 号标准弹匣', desc: '6 发 12 号霰弹弹匣。',
    w: 1, h: 2, weight: 0.3, value: 180, rarity: 'L0', stackLimit: 1, icon: '🧱',
    caliber: '12ga', capacity: 6, stats: {},
  },
  // ★ 各枪专用制式弹匣：容量必须跟随武器实际弹匣，不能全口径共用一个容量。
  //   旧版 SMG9 也被塞 15 发手枪弹匣，等于把 30 发冲锋枪砍半。
  mag_std_9mm_smg: {
    slot: 'mag', name: '9mm 冲锋枪标准弹匣', desc: '30 发 9mm 冲锋枪弹匣，双排双进。',
    w: 1, h: 2, weight: 0.22, value: 200, rarity: 'L1', stackLimit: 1, icon: '🧱',
    caliber: '9mm', capacity: 30, stats: {},
  },
  mag_std_45_smg: {
    slot: 'mag', name: '.45 冲锋枪标准弹匣', desc: '25 发 .45 ACP 冲锋枪弹匣。',
    w: 1, h: 2, weight: 0.26, value: 220, rarity: 'L1', stackLimit: 1, icon: '🧱',
    caliber: '.45acp', capacity: 25, stats: {},
  },
  mag_std_762x54_dmr: {
    slot: 'mag', name: '7.62×54R 精确射手弹匣', desc: '10 发全威力弹弹匣，供 DMR762 使用。',
    w: 1, h: 2, weight: 0.26, value: 340, rarity: 'L1', stackLimit: 1, icon: '🧱',
    caliber: '762x54', capacity: 10, stats: {},
  },
  mag_box_556: {
    slot: 'mag', name: '5.56 轻机枪弹箱', desc: '100 发弹链箱，供 LMG556 使用；重量大，换弹慢。',
    w: 2, h: 2, weight: 1.1, value: 680, rarity: 'L2', stackLimit: 1, icon: '🧱',
    caliber: '5.56', capacity: 100, stats: {},
  },
  mag_box_762: {
    slot: 'mag', name: '7.62 轻机枪弹箱', desc: '100 发 7.62 弹链箱，供 SAW762 使用。',
    w: 2, h: 2, weight: 1.2, value: 720, rarity: 'L2', stackLimit: 1, icon: '🧱',
    caliber: '7.62', capacity: 100, stats: {},
  },
  mag_std_127: {
    slot: 'mag', name: '12.7mm 反器材弹匣', desc: '5 发 12.7×99mm 弹匣，供 AM50 使用。',
    w: 1, h: 2, weight: 0.9, value: 900, rarity: 'L3', stackLimit: 1, icon: '🧱',
    caliber: '12.7mm', capacity: 5, stats: {},
  },
  mag_box_127: {
    slot: 'mag', name: '12.7mm 重机枪弹箱', desc: '50 发 12.7mm 弹链箱，供 HMG50 使用。',
    w: 2, h: 2, weight: 3.2, value: 1800, rarity: 'L4', stackLimit: 1, icon: '🧱',
    caliber: '12.7mm', capacity: 50, stats: {},
  },

  // ---------- 枪托 ----------
  stock_light: {
    slot: 'stock', name: '轻量伸缩枪托', desc: '轻量伸缩托，改善抵肩与连续射击的稳定性；对开镜速度影响很小。',
    w: 2, h: 1, weight: 0.28, value: 520, rarity: 'L1', stackLimit: 1, icon: '📏',
    stats: { recoilMul: 0.9, spreadMul: 0.98 },
  },
  stock_heavy: {
    slot: 'stock', name: '重型固定枪托', desc: '厚重的固定托，连发最稳，但重心后移、开镜与转身更慢。',
    w: 2, h: 1, weight: 0.62, value: 780, rarity: 'L2', stackLimit: 1, icon: '📏',
    stats: { recoilMul: 0.78, spreadMul: 0.94, adsSpreadMul: 0.96 },
  },
  stock_folding: {
    slot: 'stock', name: '折叠枪托', desc: '可折叠托，重量轻、携行方便，稳定性只比裸枪好一点。',
    w: 1, h: 1, weight: 0.2, value: 360, rarity: 'L1', stackLimit: 1, icon: '📏',
    stats: { recoilMul: 0.95, spreadMul: 0.97 },
  },

  // ---------- 侧瞄 / 侧面战术具 / 枪口贴片 ----------
  side_sight: {
    slot: 'sideSight', name: '侧置机械瞄具', desc: '45 度侧瞄，主镜被遮挡或近距离遭遇时可直接偏转枪身瞄准；不提供倍率。',
    w: 1, h: 1, weight: 0.06, value: 260, rarity: 'L1', stackLimit: 1, icon: '📐',
    stats: { spreadMul: 0.99, adsSpreadMul: 0.94 },
  },
  side_laser: {
    slot: 'sideTactical', name: '侧面激光模块', desc: '装在护木侧轨的小型激光，腰射指向更清楚；会暴露位置，电池耗尽后失效。',
    w: 1, h: 1, weight: 0.08, value: 520, rarity: 'L2', stackLimit: 1, icon: '🔴',
    maxDur: 80, electronics: true, empShielded: true,
    stats: { spreadMul: 0.9, laser: true },
  },
  side_light: {
    slot: 'sideTactical', name: '侧面战术灯', desc: '侧轨战术灯，照亮侧面与暗角；同样会暴露位置并消耗电池。',
    w: 1, h: 1, weight: 0.1, value: 420, rarity: 'L2', stackLimit: 1, icon: '🔦',
    maxDur: 80, electronics: true, empShielded: true,
    stats: { light: true },
  },
  muzzle_patch: {
    slot: 'muzzlePatch', name: '枪口配重贴片', desc: '缠绕在枪口附近的配重贴片，轻微压制枪口上跳，但增加前端重量。',
    w: 1, h: 1, weight: 0.09, value: 140, rarity: 'L0', stackLimit: 1, icon: '🩹',
    stats: { recoilMul: 0.94, spreadMul: 0.99 },
  },

  // ---------- 遮光罩：只安装在倍镜上 ----------
  // ★ 倍镜镜片在阳光下会反光，敌人（以及 AI）能据此发现射手；
  //   遮光罩把 glintMul 压到 0，消除反光，但增加一点重量。
  //   是否可装有硬条件：必须已装倍率 ≥ 2 的瞄具，见 Inventory.canAttach。
  lens_hood: {
    slot: 'lensHood', name: '遮光罩', desc: '套在倍镜前端的遮光筒。把镜片反光压到几乎看不见，代价是一点点重量和更慢的收枪动作。只适配 2 倍及以上倍镜。',
    w: 1, h: 1, weight: 0.06, value: 260, rarity: 'L1', stackLimit: 1, icon: '🕶',
    stats: { glintMul: 0 },
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
    moment:  { name: 'content.faction.moment.name',  short: 'content.faction.moment.short',  color: 0xb05aff, css: '#d0a0ff' },
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
    barks: {
      combat: ['别过来。', '我开枪了。'],
      low: ['我撑不住了。'],
      death: ['……撤。'],
    },
    // ★ 尼珀斯尔私兵中混有低阶 Prazer：死亡后尸体可回收 Assee 核心（A 低于玩家 3）
    prazer: true, A: 1.1,
    gear: { armor: { shell: { defId: 'lv2', lv: 2 }, visor: { defId: 'lv2', lv: 2 }, fiber: { defId: 'lv3', lv: 3 }, plate: { defId: 'lv3', lv: 3 } } },
  },
  nipsel_assault: {
    name: 'content.enemy.nipsel_assault.name',
    faction: 'nipsel', group: 'nipsel', rank: 'assault',
    hp: 102, speed: 5.0, acc: 0.68,
    weapons: ['ar556'],
    color: 0x8f5a3f, radius: 1.2,
    ai: { aggression: 0.66, composure: 0.60, perception: 0.64, opportunism: 0.55, keepDistance: 12, meleeBias: 0.45, switchBias: 0.5, grenade: 0.45 },
    barks: {
      combat: ['看见他了。压制。', '换位，别停火。', '手雷，散开。'],
      low: ['我中弹，掩护。'],
      death: ['别管我。'],
    },
    prazer: true, A: 1.7,
    gear: { armor: { shell: { defId: 'lv3', lv: 3 }, visor: { defId: 'lv3', lv: 3 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv4', lv: 4 } }, nades: ['frag'] },
  },
  nipsel_sniper: {
    name: 'content.enemy.nipsel_sniper.name',
    faction: 'nipsel', group: 'nipsel', rank: 'sniper',
    hp: 66, speed: 3.9, acc: 0.88,
    weapons: ['sr762'],
    color: 0x6a5a8a, radius: 1.1,
    ai: { aggression: 0.18, composure: 0.90, perception: 0.90, opportunism: 0.80, keepDistance: 42, meleeBias: 0.0, switchBias: 0.75 },
    barks: {
      combat: ['目标进入射界。', '别露头。'],
      low: ['位置暴露，转移。'],
      death: ['……转移。'],
    },
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
    barks: {
      combat: ['锁定。别放走。', '按小队推进。'],
      low: ['还能打。'],
      death: ['不差这一次。'],
    },
    prazer: true, A: 2.5,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'flashbang'] },
  },
  nipsel_mobile: {
    name: 'content.enemy.nipsel_mobile.name',
    faction: 'nipsel', group: 'nipsel', rank: 'mobile',
    hp: 88, speed: 5.6, acc: 0.60,
    weapons: ['smg45', 'sg12'],
    color: 0xb05a4a, radius: 1.18,
    ai: { aggression: 0.92, composure: 0.44, perception: 0.60, opportunism: 0.40, keepDistance: 7, meleeBias: 0.55, switchBias: 0.8, grenade: 0.85 },
    barks: {
      combat: ['我上。', '近点，快。'],
      low: ['退开，我还能冲。'],
      death: ['太快了。'],
    },
    prazer: true, A: 1.4,
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
    barks: {
      combat: ['银行财产，禁止靠近。', '警告一次。'],
      low: ['请求支援。'],
      death: ['防线……'],
    },
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
    barks: {
      combat: ['射界已封锁。', '不要探头。'],
      low: ['被盯上了。'],
      death: ['……换位。'],
    },
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
    barks: {
      combat: ['有人。', '散开。'],
      low: ['我受伤了。'],
      death: ['撤……'],
    },
    prazer: true, A: 1.3,
    gear: { armor: { shell: { defId: 'lv2', lv: 2 }, visor: { defId: 'lv2', lv: 2 }, fiber: { defId: 'lv3', lv: 3 }, plate: { defId: 'lv3', lv: 3 } } },
  },
  unknown_leader: {
    name: 'content.enemy.unknown_leader.name',
    faction: 'unknown', group: 'unknown', rank: 'leader',
    hp: 132, speed: 5.05, acc: 0.80,
    weaponSets: [['sr762', 'ar556'], ['sr762', 'smg45']],
    color: 0x9a5ac0, radius: 1.25,
    ai: { aggression: 0.74, composure: 0.82, perception: 0.78, opportunism: 0.84, keepDistance: 22, meleeBias: 0.4, switchBias: 0.9, grenade: 0.7 },
    barks: {
      combat: ['按小队展开。', '别追散。'],
      low: ['我还能指挥。'],
      death: ['队伍……交给你们。'],
    },
    prazer: true, A: 2.2,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'flashbang'] },
  },
  // ================= Boss =================
  // ★ 废弃工厂 · 尼珀斯尔领导：不拿普通枪，靠外骨骼同时操纵重机枪与
  //   AI 专用导弹巢（锁定后齐射半追踪导弹）。外骨骼能量层与玩家同规则。
  boss_nipsel_leader: {
    name: 'content.enemy.boss_nipsel_leader.name',
    faction: 'nipsel', group: 'nipsel', rank: 'boss',
    hp: 850, speed: 5.05, acc: 0.84,
    weapons: ['lmg556'],
    exo: { battery: 460, durMax: 460 },
    boss: true, bossAbility: 'missile', lootBonus: 6,
    // ★ Boss 体质（数据源，禁止在 game.js 里另写一套）：部位耐久倍率 / 伤害系数 /
    //   头部护具等级 / 护甲耐久倍率。越低 damageResist 越硬。
    bossPartScale: 5.2, damageResist: 0.55, headArmor: 5, armorDurMul: 2.2, headHpMul: 2.6,
    barks: {
      spawn: ['谁在厂区开枪？出来。', '封门。一个都别放走。'],
      combat: ['锁定。别躲。', '火力不够。'],
      missile: ['导弹，齐射。'],
      low: ['外壳撑住。', '还没完。'],
      death: ['……原来如此。'],
    },
    color: 0x8a5a3a, radius: 1.45,
    ai: { aggression: 0.88, composure: 0.92, perception: 0.88, opportunism: 0.70, keepDistance: 18, meleeBias: 0.15, switchBias: 0.9, grenade: 0.9 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'flashbang'] },
  },
  // ★ 陲延镇 · 黑奈契：夜切刀术，近战极激进；远程只有常规精英稍下水平。
  boss_krona: {
    name: 'content.enemy.boss_krona.name',
    faction: 'unknown', group: 'unknown', rank: 'boss',
    hp: 700, speed: 6.8, acc: 0.52,
    weapons: ['smg45'], melee: 'krona_nightcut',
    boss: true, bossAbility: 'melee', lootBonus: 5,
    bossPartScale: 4.6, damageResist: 0.62, headArmor: 4, armorDurMul: 1.8, headHpMul: 2.2,
    barks: {
      spawn: ['黑奈家的刀，还没断。', '挡路的，让开。'],
      combat: ['太近了。', '这一刀，替黑奈家。'],
      missile: [],
      low: ['还没完。'],
      death: ['契契……走。'],
    },
    color: 0x8fa8c8, radius: 1.28,
    ai: { aggression: 1.0, composure: 0.72, perception: 0.86, opportunism: 0.30, keepDistance: 2, meleeBias: 1.0, switchBias: 0.9, grenade: 0.15 },
    prazer: true, A: 4,
    gear: { armor: { shell: { defId: 'lv3', lv: 3 }, visor: { defId: 'lv3', lv: 3 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv4', lv: 4 } }, nades: ['stun'] },
  },
  // ★ 大陆银行B1 · 二里缘雪乃：生命值极高、非常狡猾；重机枪/榴弹炮压制。
  boss_yukino: {
    name: 'content.enemy.boss_yukino.name',
    faction: 'bank', group: 'bank', rank: 'boss',
    hp: 1400, speed: 4.55, acc: 0.80,
    weapons: ['gl4', 'lmg556'],
    boss: true, bossAbility: 'heavy', lootBonus: 7,
    bossPartScale: 7.0, damageResist: 0.5, headArmor: 5, armorDurMul: 2.6, headHpMul: 3.0,
    barks: {
      spawn: ['欢迎光临。武器放门口。', '这笔账，慢慢算。'],
      combat: ['别急。', '你们的装备，我收下了。'],
      missile: [],
      low: ['有点意外。', '手续费要加了。'],
      death: ['可惜。'],
    },
    color: 0x4a7a9a, radius: 1.4,
    ai: { aggression: 0.82, composure: 0.95, perception: 0.92, opportunism: 0.98, keepDistance: 16, meleeBias: 0.2, switchBias: 1.0, grenade: 0.95 },
    prazer: true, A: 10,
    gear: { armor: { shell: { defId: 'lv5', lv: 5 }, visor: { defId: 'lv5', lv: 5 }, fiber: { defId: 'lv5', lv: 5 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'emp', 'flashbang'] },
  },
  // ================= Moments『初等』（P 空间异常小队） =================
  // 只由 Assee 容器事件生成；6 人编制：队长/盾兵/破门爆破手/突击队员/携带员/侦查医疗兵。
  // 玩家无法正常获取其武器，单件重量 180~240kg。
  moment_leader: {
    name: 'content.enemy.moment_leader.name',
    faction: 'moment', group: 'moment', rank: 'moment',
    hp: 9800, speed: 6.6, acc: 0.99,
    weapons: ['moment_hmg', 'moment_laser'], melee: 'moment_elbow',
    moment: true, passiveMoment: true, lootBonus: 3, momentRole: 'leader',
    partScale: 16, damageResist: 0.10, headArmor: 5, armorDurMul: 10, headHpMul: 12,
    color: 0x7a3ac0, radius: 0.7,
    ai: { aggression: 0.9, composure: 0.99, perception: 0.99, opportunism: 0.95, keepDistance: 22, meleeBias: 0.8, switchBias: 1.0, grenade: 0.9 },
    // ★ 队长（Monk）受过完整战术训练：任何时候都是冷静、简短的汇报，不喊叫。
    voiceTone: 'calm',
    barks: {
      alert: ['听到动静。全体停火，确认。'],
      search: ['目标失去目视。按最后位置展开。'],
      combat: ['接触。按楔形展开。', '压制正面，不要追。'],
      reload: ['换弹。保持火线。'],
      low: ['装甲受损。任务继续。'],
      death: ['……任务，交给你们。'],
    },
    prazer: true, A: 3600,
    gear: { armor: { shell: { defId: 'lv5', lv: 5 }, visor: { defId: 'lv5', lv: 5 }, fiber: { defId: 'lv5', lv: 5 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'emp', 'flashbang'] },
  },
  moment_shield: {
    name: 'content.enemy.moment_shield.name',
    faction: 'moment', group: 'moment', rank: 'moment',
    hp: 12000, speed: 5.8, acc: 0.98,
    weapons: ['moment_hmg'], melee: 'moment_elbow',
    moment: true, passiveMoment: true, lootBonus: 2, momentRole: 'shield', shield: true,
    partScale: 19, damageResist: 0.06, headArmor: 5, armorDurMul: 13, headHpMul: 13,
    color: 0x5a2a90, radius: 0.72,
    ai: { aggression: 0.95, composure: 0.99, perception: 0.96, opportunism: 0.7, keepDistance: 12, meleeBias: 0.9, switchBias: 1.0, grenade: 0.4 },
    barks: {
      combat: ['盾线前压。'],
      low: ['盾面过载。还能撑。'],
      death: ['……盾，交给下一个。'],
    },
    prazer: true, A: 3800,
    gear: { armor: { shell: { defId: 'lv5', lv: 5 }, visor: { defId: 'lv5', lv: 5 }, fiber: { defId: 'lv5', lv: 5 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag'] },
  },
  moment_breacher: {
    name: 'content.enemy.moment_breacher.name',
    faction: 'moment', group: 'moment', rank: 'moment',
    hp: 8600, speed: 6.5, acc: 0.98,
    weapons: ['moment_hmg'], melee: 'moment_elbow',
    moment: true, passiveMoment: true, lootBonus: 2, momentRole: 'breacher',
    partScale: 14, damageResist: 0.12, headArmor: 5, armorDurMul: 9, headHpMul: 11,
    color: 0x8a4ad0, radius: 0.68,
    ai: { aggression: 1.0, composure: 0.97, perception: 0.97, opportunism: 0.85, keepDistance: 16, meleeBias: 0.8, switchBias: 1.0, grenade: 1.0 },
    barks: {
      combat: ['破门准备。清空房间。'],
      grenade: ['投掷物。清走廊。'],
      low: ['爆破装具受损，继续。'],
      death: ['……门，开了。'],
    },
    prazer: true, A: 3300,
    gear: { armor: { shell: { defId: 'lv5', lv: 5 }, visor: { defId: 'lv5', lv: 5 }, fiber: { defId: 'lv5', lv: 5 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'gl_thermo', 'emp'] },
  },
  moment_assault: {
    name: 'content.enemy.moment_assault.name',
    faction: 'moment', group: 'moment', rank: 'moment',
    hp: 8200, speed: 6.8, acc: 0.98,
    weapons: ['moment_hmg'], melee: 'moment_elbow',
    moment: true, passiveMoment: true, lootBonus: 2, momentRole: 'assault',
    partScale: 14, damageResist: 0.12, headArmor: 5, armorDurMul: 9, headHpMul: 11,
    color: 0x8a4ad0, radius: 0.68,
    ai: { aggression: 1.0, composure: 0.96, perception: 0.96, opportunism: 0.9, keepDistance: 14, meleeBias: 0.9, switchBias: 1.0, grenade: 0.95 },
    barks: {
      combat: ['正面压制。'],
      reload: ['换弹。别让他们抬头。'],
      low: ['还能动。继续。'],
      death: ['……位置，交给你们。'],
    },
    prazer: true, A: 3300,
    gear: { armor: { shell: { defId: 'lv5', lv: 5 }, visor: { defId: 'lv5', lv: 5 }, fiber: { defId: 'lv5', lv: 5 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'flashbang'] },
  },
  moment_carrier: {
    name: 'content.enemy.moment_carrier.name',
    faction: 'moment', group: 'moment', rank: 'moment',
    hp: 8000, speed: 7.1, acc: 0.97,
    weapons: ['moment_hmg'], melee: 'moment_elbow',
    moment: true, passiveMoment: true, lootBonus: 3, momentRole: 'carrier', carrier: true,
    partScale: 13, damageResist: 0.14, headArmor: 5, armorDurMul: 8, headHpMul: 10,
    color: 0x6a3aa8, radius: 0.66,
    ai: { aggression: 0.7, composure: 0.99, perception: 0.99, opportunism: 1.0, keepDistance: 34, meleeBias: 0.4, switchBias: 1.0, grenade: 0.5 },
    barks: {
      combat: ['我去拿容器。火力掩护。'],
      low: ['携带员受伤。别让核心落地。'],
      death: ['……核心……'],
    },
    prazer: true, A: 3000,
    gear: { armor: { shell: { defId: 'lv5', lv: 5 }, visor: { defId: 'lv5', lv: 5 }, fiber: { defId: 'lv5', lv: 5 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'stun'] },
  },
  moment_scout_medic: {
    name: 'content.enemy.moment_scout_medic.name',
    faction: 'moment', group: 'moment', rank: 'moment',
    hp: 7600, speed: 6.7, acc: 0.97,
    weapons: ['moment_hmg'], melee: 'moment_elbow',
    moment: true, passiveMoment: true, lootBonus: 2, momentRole: 'scout_medic', droneSupport: true, medic: true,
    partScale: 13, damageResist: 0.14, headArmor: 5, armorDurMul: 8, headHpMul: 10,
    color: 0x5a3aa0, radius: 0.66,
    ai: { aggression: 0.8, composure: 0.98, perception: 0.99, opportunism: 0.9, keepDistance: 28, meleeBias: 0.6, switchBias: 1.0, grenade: 0.7 },
    barks: {
      alert: ['有信号。上报队长。'],
      combat: ['无人机升空。标记目标。'],
      low: ['医疗兵受伤。自救。'],
      death: ['……链路中断。'],
    },
    prazer: true, A: 2800,
    gear: { armor: { shell: { defId: 'lv5', lv: 5 }, visor: { defId: 'lv5', lv: 5 }, fiber: { defId: 'lv5', lv: 5 }, plate: { defId: 'lv5', lv: 5 } }, nades: ['frag', 'stun'] },
  },
  // ★ 城市平民：没有武器，不参与阵营敌对，听到枪声/看到玩家靠近只会逃。
  civilian: {
    name: '平民',
    faction: 'civilian', group: 'civilian', rank: 'dummy',
    hp: 50, speed: 5.2, acc: 0,
    color: 0xb9a88f, radius: 0.45,
    ai: { aggression: 0, composure: 0.2, perception: 0.6, opportunism: 0, keepDistance: 20, meleeBias: 0, switchBias: 0, grenade: 0 },
    prazer: false, A: 0,
    melee: '__none__',
    gear: { armor: {} },
  },
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
     4.5 AI 规则（软编码）
     ----------------------------------------------------------
     以后 AI 的手感参数一律写在这里，禁止再散落成 game.js 里的魔法数字。
     GameWorld / AISystem 每帧通过 content.get('aiRules','default') 读取。
     ========================================================== */
  const AI_RULES = {
    default: {
      // 近身：低于该距离优先拔刀；实际停止距离 = 双方碰撞半径 + spacingMargin
      meleeRange: 2.8,
      spacingMargin: 0.5,
      // 交火距离：preferred 由 ai.keepDistance 与武器射程共同决定
      preferredMin: 6,
      preferredMax: 60,
      tooFarMul: 1.12,
      tooCloseMul: 0.52,
      advanceMul: 0.55,
      advanceAggroMul: 0.45,
      backOffMul: 0.6,
      // 在舒适距离内的侧移幅度与换向间隔（秒）
      strafeBase: 0.28,
      strafeAggroMul: 0.22,
      strafeSwitchMin: 1.1,
      strafeSwitchMax: 2.4,
      // 反应时间：base - composure*composureMul + 随机抖动
      reactionBase: 1.5,
      reactionComposureMul: 1.2,
      reactionJitter: 0.3,
      // 点射：min + floor(aggression * aggroMul) 发，之后冷却
      burstBase: 2,
      burstAggroMul: 4,
      burstCdMin: 0.5,
      burstCdMax: 1.3,
      // 血量低于该值且无掩体时找掩体
      coverHpPct: 35,
      coverCooldown: 10,
      coverHold: 2.2,
      // 小队包抄：推进目标点向侧翼偏移，避免全队排成一条线
      flankOffset: 5.5,
      flankSpacing: 2.4,
      // ★ 无人机仇恨：不能“站在敌人脸上还在打飞机”。
      //   interest 权重越低越不爱抬头；玩家在近处且可见时按 threatMul 继续压低。
      droneInterestBase: 0.10,
      droneInterestPerception: 0.28,
      droneInterestComposure: 0.12,
      droneInterestAggro: 0.18,
      droneMaxDistBase: 20,
      droneMaxDistPerception: 18,
      droneThreatRange: 22,
      droneThreatMul: 0.18,
      droneBreakRange: 13,
      droneMaxFocus: 3.2,
      // ★ 我方狙击镜反光：AI 能看见的间隔、距离与视野锥（弧度）。
      scopeGlint: { interval: 1.7, range: 140, minZoom: 2, cone: 1.15, awareness: 0.7 },
    },
  };
  c.registerAll('aiRules', AI_RULES);

  /* ==========================================================
     4.05 玩家移动手感（软编码）
     ----------------------------------------------------------
     把“走路/疾跑倍率、加速度、地面摩擦、冲刺 FOV”集中成一张表，
     避免以后调手感又要在 _updatePlayer 里到处改魔法数字。
     ========================================================== */
  const MOVEMENT = {
    default: {
      walkSpeedMul: 1.20,
      sprintMul: 1.80,
      prazerSprintMul: 1.85,
      groundFriction: 4.6,
      accelWalk: 64,
      accelSprint: 48,
      decel: 58,
      sprintFov: 16,
    },
  };
  c.registerAll('movement', MOVEMENT);

  /* ==========================================================
     4.51 AI 枪械配装（软编码）
     ----------------------------------------------------------
     敌人不再“凭空发射裸枪子弹”：每把可拆弹匣的枪都会生成真实弹匣，
     并按类别/兵种生成瞄具、枪口、握把、枪托等实体配件；这些配件和
     弹匣都会随尸体一起被玩家搜到。
       sight:    按武器类别的主瞄具候选（按顺序尝试，口径/适配不符就换下一个）
       muzzle:   按弹药口径的枪口候选
       grip / stock: 按武器类别
       chances / eliteChances: 普通兵/精英兵安装概率
     ========================================================== */
  const AI_LOADOUT = {
    default: {
      sight: {
        sniper: ['sight_6x', 'sight_4x'],
        rifle: ['sight_2x', 'sight_1x'],
        smg: ['sight_1x'],
        lmg: ['sight_2x', 'sight_3x'],
        pistol: [],
        shotgun: [],
      },
      muzzle: {
        '5.56': ['comp_556', 'flash_556'],
        '7.62': ['comp_762'],
        '762x54': ['comp_762x54'],
        '12ga': ['comp_12ga', 'choke_12ga'],
        '9mm': [],
        '.45acp': [],
        '12.7mm': [],
      },
      grip: {
        sniper: ['bipod'],
        rifle: ['grip_angled', 'grip_vertical'],
        smg: ['grip_stubby', 'grip_handstop'],
        lmg: ['grip_vertical'],
      },
      stock: { rifle: ['stock_light'], lmg: ['stock_light'] },
      chances: { muzzle: 0.45, grip: 0.30, stock: 0.20 },
      eliteChances: { muzzle: 0.85, grip: 0.70, stock: 0.55 },
      // 消音器只给精英少量装备：普通兵装抑制器会让玩家完全失去枪声线索。
      suppressor: { '5.56': 'supp_556', '7.62': 'supp_762', '762x54': 'supp_762x54', '9mm': 'supp_9mm' },
      suppressorEliteChance: 0.25,
      // ★ 遮光罩：按用户要求，当前小兵不配发，敌方狙击的反光仍然可见。
      //   以后要恢复“精英狙击带遮光罩”，在这里加 lensHoodChance 并在 _equipAIWeapon 读取即可。
      lensHoodChance: 0,
    },
  };
  c.registerAll('aiLoadout', AI_LOADOUT);

  /* ==========================================================
     4.55 Assee 异常容器（软编码）
     ----------------------------------------------------------
     chance:      每局生成概率
     delay:       开局后多久开始“降临”
     breachTime:  无人带离时，从出现到 P 空间破坏的秒数
     alertRadius: Prazer/敌人能感知波动的半径
     momentSquad: Moment『初等』各职责与数量
     ========================================================== */
  const ASCE = {
    default: {
      // 难度越高，降临概率越高（game.js 再乘 difficulty 系数）。
      chance: 0.22, delay: 14, breachTime: 180, alertRadius: 120,
      // 警告阶段的“贴脸也先不开火”保护：召唤后至少 8 秒只警告，
      // 避免玩家正蹲在容器边搜刮时，Moments 一出场就因距离过近立刻仇恨。
      warnGrace: 14, proximityRange: 3.2, armedLinger: 13,
      // ★ 降级/脱离：玩家收起武器或跑出接触距离后，Moments 会暂时回到警告/搜索，
      //   不再“仇恨一旦点亮就追到天涯海角”。
      deescalate: { stowTime: 8, breakDistance: 45, breakTime: 12, forgetTime: 25 },
      // 频谱对消阵：与容器分开刷新。核心是“电源”，玩家必须按相位顺序
      // 站到三根锚柱旁完成对消，而不是站在中央读秒。
      // anchorTime 是总对消秒数，平均分给三根锚柱；完成后失稳计时停止。
      stationMinDist: 40, stationMaxDist: 65,
      riftMinDist: 45, riftMaxDist: 75,
      // 对消是“把核心接入电子资产登记”的短流程，不是漫长的解码。
      // 90s 足够在 180s 失稳前完成，但需要清理落点周围的威胁并不断换位。
      anchorTime: 90, anchorRadius: 5.0,
      reward: 50000,
      // 未锚定就直接撤离：核心会在撤离舱里崩解，只能拿 15% 的残值，且不保留资产。
      rawRewardMul: 0.15,
      momentSquad: ['moment_leader', 'moment_shield', 'moment_breacher', 'moment_assault', 'moment_carrier', 'moment_scout_medic'],
      arrivalLines: [
        '检测到 P 空间波动。坐标已标记。',
        '有东西落下来了。去确认。',
      ],
      warningLines: [
        'Moments：这里是 Moments 处置组。平民，停止接近容器。',
        'Moments：你已进入管制区。放下武器，双手可见，退到黄线以外。',
        'Moments：最后警告。我们不针对平民，但会清除任何携带核心的人。',
        'Moments：注意，目标身上可能有 P 空间残留。先控制距离。',
        'Moments：别开枪。让他退。队长，我压左翼。',
        'Moments：重复一次，放下武器、慢慢后退，你不在我们的清除名单上。',
      ],
      warn30Lines: [
        '读数还在升。三十秒。',
        '结构快撑不住了。',
      ],
      breachLines: [
        'P 空间破裂。接触。',
        '他们进场了。带核心走。',
      ],
      anchorLines: [
        '对消阵启动。去亮起的锚柱。',
        '相位切换。跟住亮柱。',
      ],
      anchorDoneLines: [
        '三段对齐。核心稳定。撤离。',
      ],
      // Cat Cat Catch：听到声音 / 感知到 Prazer 或 P 空间波动后进入的猎杀状态。
      // 对外播报用战术口令，不把内部代号当台词喊。
      catCatchLines: [
        '目标确认。展开。',
        '接触。封住退路。',
        '按楔形推进。',
      ],
      trackedWarning: '位置暴露：已被锁定',
      supplyLines: [
        '补给口开启。',
        '补给到了。',
      ],
      // 侦查无人机：实体可击落，标记与队长无人机同级，带 2 枚破片。
      scoutDrone: {
        durability: 70, markInterval: 5, nadeInterval: 13, nades: 2,
      },
      provokeLine: '警告无效。开火。',
      momentSpawnLines: {
        leader: '按计划推进。',
        shield: '就位。',
        breacher: '准备破门。',
        assault: '压正面。',
        carrier: '我去拿核心。',
        scout_medic: '已标记。',
      },
      momentCombatLines: [
        '保持交叉火力，别一起探头。',
        '换弹，掩护我。',
        '目标移动，东侧。',
        '压上去，别让他摸到核心。',
        '别打碎核心。',
        '他们撑不住了。',
        '盾兵上前，其他人跟半拍。',
        '我数三下，一起推。',
        '右翼有动静，确认是不是同一个人。',
        '他把枪收了……先别停火，继续观察。',
        '补给口开了，携带员去拿弹。',
        '队长，目标在往撤离方向跑。',
      ],
      // ★ 战术小队电台：彼此报位置、报动作，而不是只对玩家喊一句。
      //   {dir} 方向，{dist} 距离档位，{role} 队员职责。
      momentRadioLines: [
        '{role}：目标在{dir}，{dist}。',
        '{role}：我压{dir}侧，别打到我。',
        '{role}：看到他了，在{dir}那排掩体后面。',
        '{role}：他没开枪，保持观察。',
        '{role}：弹药还剩一半，队长。',
        '{role}：携带员往后站，别把核心带进枪线。',
        '{role}：确认，{dir}侧交给我。',
        '{role}：平民已清空，可以推进。',
      ],
      momentDeescalateLines: [
        '目标收枪了。保持警戒，别开枪。',
        '他退出了管制区。先回容器，任务优先。',
        '解除接触。各位置报数，继续搜索核心。',
        '不是威胁，别浪费弹药。回去。',
      ],
    },
  };
  c.registerAll('asce', ASCE);

  /* ==========================================================
     4.6 Boss 行为档（软编码）
     ----------------------------------------------------------
     每名 Boss 的交战距离、侧移、阶段、技能 CD、召唤物、掩体行为都在这里。
     game.js 的 _bossMove / _bossAbilities 只读表，不写死 Boss 名字。
     phase: 血量百分比阈值（从高到低），进入后提高侵略性与技能频率。
     ========================================================== */
  const BOSS_PROFILES = {
    boss_nipsel_leader: {
      preferredRange: 26, backOffRange: 11,
      strafeMul: 0.55, strafeSwitch: 1.6,
      phase: [0.62, 0.32],
      phaseSpeedMul: 1.18, phaseAggroAdd: 0.12,
      missile: { minDist: 8, maxDist: 85, cdMin: 20, cdMax: 27, phaseCdMul: 0.62 },
      summon: [
        { atHp: 0.62, ids: ['nipsel_elite', 'nipsel_assault'], count: 2, squad: 'boss-adds', line: '增援。把门守住。' },
        { atHp: 0.32, ids: ['nipsel_mobile', 'nipsel_assault'], count: 2, squad: 'boss-adds', line: '最后一批，压上去。' },
      ],
      cover: { onReload: true, batteryBelow: 0.25, hold: 2.6, cd: 12 },
      dash: null,
    },
    boss_krona: {
      preferredRange: 3.2, backOffRange: 0.8,
      strafeMul: 1.0, strafeSwitch: 0.9,
      phase: [0.55],
      phaseSpeedMul: 1.25, phaseAggroAdd: 0.2,
      missile: null,
      dash: { minDist: 4, maxDist: 15, cd: 6.5, speed: 13, duration: 0.26 },
      summon: [],
      cover: { onReload: false, hold: 1.6, cd: 9 },
    },
    boss_yukino: {
      preferredRange: 30, backOffRange: 14,
      strafeMul: 0.42, strafeSwitch: 2.4,
      phase: [0.66, 0.36],
      phaseSpeedMul: 1.12, phaseAggroAdd: 0.15,
      missile: null,
      summon: [
        { atHp: 0.66, ids: ['bank_guard'], count: 2, squad: 'boss-adds', line: '保安部，上来清场。' },
        { atHp: 0.36, ids: ['bank_guard', 'bank_sniper'], count: 2, squad: 'boss-adds', line: '这笔账，用你们的命来付。' },
      ],
      cover: { onReload: true, hold: 2.2, cd: 10 },
      dash: null,
    },
  };
  c.registerAll('bossProfiles', BOSS_PROFILES);

  /* ==========================================================
     4.7 武器行为规则（软编码）
     ----------------------------------------------------------
     数值表在 WEAPONS；这里只放“手感/逻辑参数”：
       recoilK        镜头后坐上抬系数
       aiSpreadMul    AI 使用该枪时的散布倍率
       aiBurst*       AI 点射发数与冷却
       aiReload       AI 换弹秒数
       reloadRealMul / reloadFastMul  玩家真实/快速换弹倍率
       aiAccMul       对 AI 命中率的整体修正
     查找顺序：武器 id 覆盖 → 武器类别 → default。
     ========================================================== */
  const WEAPON_RULES = {
    default: {
      recoilK: 0.00030, aiSpreadMul: 1.0, aiAccMul: 1.0,
      recoilAdsMul: 0.65, recoilCrouchMul: 0.8, recoilRecover: 0.32, recoilYawMul: 0.35,
      aiBurstBase: 2, aiBurstAggro: 4, aiBurstCdMin: 0.5, aiBurstCdMax: 1.3,
      aiReload: 2.5, reloadRealMul: 1.5, reloadFastMul: 0.8,
    },
    rifle: { recoilK: 0.00032, aiSpreadMul: 1.0, aiBurstBase: 3, aiBurstAggro: 5, aiBurstCdMin: 0.45, aiBurstCdMax: 1.1, aiReload: 2.6, reloadRealMul: 1.5, reloadFastMul: 0.8 },
    smg: { recoilK: 0.00023, aiSpreadMul: 0.9, aiBurstBase: 4, aiBurstAggro: 7, aiBurstCdMin: 0.5, aiBurstCdMax: 1.2, aiReload: 2.2, reloadRealMul: 1.5, reloadFastMul: 0.8 },
    pistol: { recoilK: 0.00020, aiSpreadMul: 1.05, aiBurstBase: 2, aiBurstAggro: 2, aiBurstCdMin: 0.5, aiBurstCdMax: 1.0, aiReload: 1.8, reloadRealMul: 1.4, reloadFastMul: 0.85 },
    sniper: { recoilK: 0.00060, aiSpreadMul: 0.7, aiBurstBase: 1, aiBurstAggro: 1, aiBurstCdMin: 1.4, aiBurstCdMax: 2.6, aiReload: 3.6, reloadRealMul: 1.6, reloadFastMul: 0.9, enemySpreadMul: 3.4, enemySettleTime: 2.6, enemySettleSpreadMul: 2.0, enemyHeadChance: 0.01 },
    shotgun: { recoilK: 0.00050, aiSpreadMul: 1.0, aiBurstBase: 1, aiBurstAggro: 2, aiBurstCdMin: 0.8, aiBurstCdMax: 1.5, aiReload: 3.2, reloadRealMul: 1.5, reloadFastMul: 0.85 },
    lmg: { recoilK: 0.00022, aiSpreadMul: 1.15, aiBurstBase: 6, aiBurstAggro: 10, aiBurstCdMin: 0.9, aiBurstCdMax: 1.8, aiReload: 4.0, reloadRealMul: 1.6, reloadFastMul: 0.9 },
    launcher: { recoilK: 0.00055, aiSpreadMul: 1.0, aiBurstBase: 1, aiBurstAggro: 1, aiBurstCdMin: 2.0, aiBurstCdMax: 3.0, aiReload: 4.6, reloadRealMul: 1.3, reloadFastMul: 0.85, launchSpeed: 44, launchGravity: 14, launchLift: 3.5 },
    // 个别武器的覆盖项：只写需要偏离类别的字段
    lmg556: { aiReload: 4.6, reloadRealMul: 1.6, reloadFastMul: 0.95 },
    sr762: { recoilK: 0.00060, aiAccMul: 1.0 },
  };
  c.registerAll('weaponRules', WEAPON_RULES);

  /* ==========================================================
     4.8 对白/台词（软编码）
     ----------------------------------------------------------
     规则：任何角色台词都写在这里，不允许再硬编码在 game.js。
       - 字符串：固定台词
       - 数组：随机挑一句
       - {zh, en}：按语言挑选，en 缺省时回退 zh
     占位符用 {name} 形式，由 GameWorld._dlg(key, params) 替换。
     ========================================================== */
  const DIALOGUE = {
    'ally.spot': [
      '发现{enemy}，距离 {dist} 米，准备接战。',
      '{enemy}在{dist}米，我先架住。',
      '有动静，{enemy}，别急着冲。',
      '看到{enemy}了，掩护我换位。',
    ],
    'ally.idle': [
      '弹药还够，继续搜。',
      '这一片没人，我去前面看看。',
      '注意高点，别被人架枪。',
      '有药就留着，别急着用。',
      '队长，撤离点在哪边？',
      '箱子都翻过了，没值钱货。',
      '脚步轻点，这附近可能有埋伏。',
    ],
    'ally.idlePrazer': [
      '覆耳羽在响……有脚步，靠近了。',
      '尾巴别扫到枪线，压低。',
      'P 空间有波动，别摘耳机。',
    ],
    'ally.planCombat': [
      '我从左侧包抄，你压住正面。',
      '目标被压制，准备推进。',
      '我换弹，帮我掩护两秒。',
      '别追太深，先确认侧翼。',
      '他躲在掩体后，我扔雷逼一下。',
    ],
    'ally.planIdle': [
      '我在你右后方，继续搜索。',
      '这一片暂时安全。',
      '有情况就喊我，我会共享标记。',
      '我去前面那栋楼看看。',
      '箱子翻完了，往下一个点走。',
      '队长，注意时间。',
    ],
    'ally.mark': '已标记目标，位置共享。',
    'ally.heal': '正在给{target}处理伤口。',
    'ally.low': '我伤得很重，需要掩护！',
    'ally.playerLow': '队长，你伤得很重！先找掩体。',
    'ally.playerDown': '队长倒下了！',
    'ally.ammoLow': '弹匣快空了，我换弹。',
    'ally.ammoOut': '弹药见底，谁有备用弹匣？',
    'ally.skill': '【{name}】',
    'ally.downed': '我被打倒了，别管我……',
    'ally.shareMark': '共享标记有目标，我过去确认。',
    'ally.fire': '我着火了，先灭火！',
    'ally.retreat': '我伤得太重，先撤到掩体后！',
    'ally.grenade': '手雷出手，注意爆区！',
    'ally.orderAdvance': '收到，向标记点推进。',
    'ally.orderRetreat': '明白，我往标记点撤。',
    'ally.rescuePlayer': '队长倒下了，我去拉人！',
    'ally.rescueMate': '有人倒了，我去救！',
    'ally.selfaid': '我处理一下伤口，掩护我。',
    'ally.join': '友方小队已接入：{names}。他们会共享标记、汇报敌情并主动支援。',
    'ally.friendlyFire': '停火！我中弹了！',
    'ally.betrayal': '你疯了？我们不是敌人——散开，还击！',
    'ally.death': '我撑不住了……别管我。',
    'ally.thanks': '收到，队长。',
    'ally.revive': '把{target}拉起来了。',
    'ally.healDoneSelf': '给自己包扎一下。',
    'ally.healDoneBlood': '打了一袋血浆。',
    'ally.healDoneSurgery': '给自己做了手术。',
    'ally.healDoneOther': '给{target}处理好了。',
    'squad.planExtract': '时间不多了，往撤离点靠，别恋战。',
    'squad.planFight': '保持火力，别追太深。',
    'squad.planSearch': '这一片暂时安全，继续搜。',
    'squad.orderAdvance': '建议向标记点推进。',
    'squad.orderRetreat': '建议向标记点撤退，别硬顶。',
    // Boss 专属的“增援”播报；常规战斗台词仍走 enemies.*.barks
    'boss.summon': '增援。把门守住。',
    // ★ 普通敌兵的语音文本：按训练程度分三档（raw 民兵 / trained 正规 / veteran 老兵）。
    //   兵种没有单独 barks 时由 _unitBark 按 rank 自动回退到这些文本，
    //   不同兵种仍可在 enemies.*.barks 覆盖。
    'enemy.alert.raw': ['谁在那儿？', '什么声音？', '出来！'],
    'enemy.alert.trained': ['前方有动静。', '可疑接触，确认一下。', '十一点方向，有人。'],
    'enemy.alert.veteran': ['听到了，别急。', '有人在动，等他露头。', '脚步很近。压低。'],
    'enemy.search.raw': ['他跑不远。', '分头找！', '刚才还在这儿。'],
    'enemy.search.trained': ['散开搜索，保持间距。', '他换了位置，包过去。', '看脚印，往右。'],
    'enemy.search.veteran': ['失去目视。按最后位置展开。', '别追太急，先控侧翼。', '他会再出声的。'],
    'enemy.combat.raw': ['看见他了！', '开火！', '别让他跑了！'],
    'enemy.combat.trained': ['接触，压制。', '目标在掩体后，换位。', '火力跟上。'],
    'enemy.combat.veteran': ['锁定。别停火。', '交叉火力，封住退路。', '稳住，他会探头。'],
    'enemy.reload.raw': ['没子弹了！', '换弹！'],
    'enemy.reload.trained': ['换弹，掩护我。', '弹匣空了！', '补弹，两秒。'],
    'enemy.reload.veteran': ['换弹。保持火力。', '弹匣。', '掩护。'],
    'enemy.grenade.raw': ['手雷！跑！', '有东西扔过来了！'],
    'enemy.grenade.trained': ['手雷！散开！', '投掷物，离开爆区！', '闪光，闭眼！'],
    'enemy.grenade.veteran': ['投掷物。散开，别回头。', '爆区。离墙。'],
    'enemy.low.raw': ['我撑不住了。', '救命……'],
    'enemy.low.trained': ['我中弹了，掩护。', '伤得很重，撤。', '还能打……'],
    'enemy.low.veteran': ['轻伤。继续。', '装甲挡住了。'],
    'enemy.death.raw': ['……我不想死。', '妈……'],
    'enemy.death.trained': ['……别管我。', '告诉队长……', '撤……'],
    'enemy.death.veteran': ['……任务。', '……换位。'],
  };
  // ★ DIALOGUE 的 value 可能是字符串/数组，不能直接 registerAll（spread 会把字符串拆成字符）。
  //   统一包成 { zh: ... }，_dlg 再按语言/随机取值。
  for (const [id, spec] of Object.entries(DIALOGUE)) {
    c.register('dialogue', id, { zh: spec });
  }

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
    boss: 'boss_nipsel_leader',
    layoutUrl: 'maps/factory.json',
  },
  desert: {
    name: 'content.map.desert.name',
    desc: 'content.map.desert.desc',
    size: 240, obstacleCount: 45, enemyCount: 28,
    boss: 'boss_krona',
    layoutUrl: 'maps/desert.json',
  },
  lab: {
    name: 'content.map.lab.name',
    desc: 'content.map.lab.desc',
    size: 180, obstacleCount: 80, enemyCount: 22,
    boss: 'boss_yukino',
    layoutUrl: 'maps/lab.json',
  },
  training: {
    name: 'content.map.training.name',
    desc: 'content.map.training.desc',
    size: 120, obstacleCount: 20, enemyCount: 6,
    layoutUrl: 'maps/training.json',
    training: true,
  },
  // ★ 主模式序章的“空地图”：只保留边界与一个剧情触发点。
  //   正式主模式地图以后从这里扩展，剧情系统只认 layout.storyTriggers。
  asaka_void: {
    name: 'content.map.asaka_void.name',
    desc: 'content.map.asaka_void.desc',
    size: 160, obstacleCount: 0, enemyCount: 0,
    layoutUrl: 'maps/void.json',
    storyOnly: true,
  },
  // ★ 主模式第一次出战用的城北战区：先复用工厂大布局，等大地图完成后再替换 layoutUrl。
  //   剧情/任务/据点仍按 asaka 模式结算；这张图只负责“有街道、有掩体、有敌人”的战斗空间。
  asaka_city: {
    name: 'Asaka 城北战区',
    desc: '城北旧工业区与居民区交界。街道、仓库和检查线把地图切成几块。',
    size: 320, obstacleCount: 0, enemyCount: 0, civilianCount: 14,
    layoutUrl: 'maps/asaka_city.json',
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
     6.0 Prazing 技巧（神庙供奉）
     ----------------------------------------------------------
     · 不在 UI 里直接列出“正确答案”的提示；玩家/角色只能通过祷词猜。
     · aliases 用于祷词匹配，name 是最终显示名。
     ========================================================== */
  const PRAZING = {
    cat_step: {
      name: '猫步', aliases: ['猫步', '无声落步', '踏影'],
      desc: '把体重分散到脚掌与尾尖，短距离移动几乎不发出声音。',
    },
    ear_listen: {
      name: '听羽', aliases: ['听羽', '覆耳羽聆听', '风里听'],
      desc: '用覆耳羽感受气流振动，短暂强化对脚步与枪声的方向判断。',
    },
    tail_guard: {
      name: '尾守', aliases: ['尾守', '绕尾', '尾巴护住'],
      desc: '尾巴在身后形成一个短促的防护弧，降低背后近战与破片的伤害。',
    },
    pspace_breathe: {
      name: '空间呼吸', aliases: ['空间呼吸', 'P空间呼吸', '在裂缝里呼吸'],
      desc: '在 P 空间波动中维持呼吸节律，减少恶心与耳鸣的影响。',
    },
    blood_echo: {
      name: '血回声', aliases: ['血回声', '血里的回声', '听见血'],
      desc: '通过血液振动感知附近受伤者的位置；对失血目标尤其清晰。',
    },
  };
  c.registerAll('prazing', PRAZING);

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

  /* ==========================================================
     6.1 主线任务 / 计划
     ----------------------------------------------------------
     任务不是二游奖励，只推动剧情与计划树。
       chapter: 左上角显示的“所在章”
       stages:  [{ text }] 按顺序推进
       waypoint: 可选，小地图任务标记
     ========================================================== */
  const MISSIONS = {
    opening_meet: {
      title: '接头',
      chapter: '序章 · 沙尘里的第一间房',
      category: 'main',
      desc: '在旧公路检查线附近与凯特、玲娜会合。她们看过你写的东西，但还没有决定要不要把命交给你。',
      stages: [
        { text: '前往旧公路检查线' },
        { text: '与凯特、玲娜会合' },
      ],
      waypoint: { x: 0, z: 44 },
    },
    opening_home: {
      title: '城北的房子',
      chapter: '序章 · 沙尘里的第一间房',
      category: 'main',
      desc: 'Asaka 土地管理部还认旧契。买下一处偏僻的旧仓库住所，把仓库、终端和出战门安置进去。',
      stages: [
        { text: '前往 Asaka 土地管理部' },
        { text: '买下城北的据点' },
        { text: '在据点里安顿下来' },
      ],
      waypoint: { x: 18, z: -18 },
    },
    first_deployment: {
      title: '第一次出战准备',
      chapter: '第一章 · 把名字挂上门口',
      category: 'main',
      desc: '回到据点大门，召集凯特与玲娜，确认装备与路线。下一次出门就不是散步了。',
      stages: [
        { text: '在据点里完成出战准备' },
        { text: '从大门离开据点' },
      ],
    },
  };
  c.registerAll('missions', MISSIONS);

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
  // ★ P空间波动祝福：体能/操控/恢复短时上升，但伴随恶心、耳鸣与视野压制。
  //   正负两面同时存在，所以 positive 仍标为 true（HUD 用它区分颜色），
  //   nausea 单独由波动入口挂上，不在这里叠第二套 debuff。
  pspace_echo:   { name: 'P空间共鸣', icon: '🌀', positive: true, awareness: 0 },
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
        hud: { hpBar: false, cpBar: false, ammoCounter: false, taskList: true, statusIcons: false, warnings: false, warnNade: false, soundRadar: false },
        visual: { damageNumbers: false, hitMarkers: false, minimap: false, enemyOutline: false, extractGuide: false, bossMarkers: false },
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
        hud: { hpBar: true, cpBar: true, ammoCounter: true, taskList: true, statusIcons: true, warnings: true, warnNade: true, soundRadar: true },
        visual: { damageNumbers: true, hitMarkers: true, minimap: true, enemyOutline: false, extractGuide: true, bossMarkers: false },
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
        hud: { hpBar: true, cpBar: true, ammoCounter: true, taskList: true, statusIcons: true, warnings: true, warnNade: true, soundRadar: true },
        visual: { damageNumbers: true, hitMarkers: true, minimap: true, enemyOutline: true, extractGuide: true, bossMarkers: false },
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
        hud: { hpBar: true, cpBar: true, ammoCounter: true, taskList: true, statusIcons: true, warnings: true, warnNade: true, soundRadar: true },
        visual: { damageNumbers: true, hitMarkers: true, minimap: true, enemyOutline: true, extractGuide: true, bossMarkers: false },
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
      'aiRules=' + c.count('aiRules') + ' ' +
      'aiLoadout=' + c.count('aiLoadout') + ' ' +
      'bossProfiles=' + c.count('bossProfiles') + ' ' +
      'weaponRules=' + c.count('weaponRules') + ' ' +
      'dialogue=' + c.count('dialogue') + ' ' +
      'characters=' + c.count('characters') + ' ' +
      'maps=' + c.count('maps') + ' ' +
      'skills=' + c.count('skills') + ' ' +
      'missions=' + c.count('missions') + ' ' +
      'tasks=' + c.count('tasks')
    );
  }
}
