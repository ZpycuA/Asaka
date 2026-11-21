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
'.45acp': { name: 'content.ammo.45acp.name',  desc: 'content.ammo.45acp.desc',  w: 1, h: 1, weight: 0.015, caliber: '.45acp', massG: 14.9, v0: 290, tier: 0, pen: 1, impulse: 1, effects: [], value: 25, rarity: 'L0', stackLimit: 999 },
  '12ga':   { name: 'content.ammo.12ga.name',   desc: 'content.ammo.12ga.desc',   w: 1, h: 1, weight: 0.045, caliber: '12ga', massG: 3.5,  v0: 410, tier: 0, pen: 0, impulse: 0, effects: [], value: 40, rarity: 'L0', stackLimit: 999 },
  'dragon': { name: 'content.ammo.dragon.name', desc: 'content.ammo.dragon.desc', w: 1, h: 1, weight: 0.05, caliber: '12ga', massG: 3.5, v0: 410, tier: 2, pen: 0, impulse: 0, effects: ['incendiary'], burn: 1, burnLevel: 2, burnFieldRadius: 2.2, value: 180, rarity: 'L2', stackLimit: 999 },
  'glassfiber': { name: 'content.ammo.glassfiber.name', desc: 'content.ammo.glassfiber.desc', w: 1, h: 1, weight: 0.014, caliber: '5.56', massG: 4.0, v0: 940, tier: 3, pen: 0, impulse: 0, effects: ['glassfiber'], glassfiber: true, fiberAcute: 2, fiberChronic: 1, fiberArmorDamage: 18, value: 420, rarity: 'L4', stackLimit: 999 },
  // 非制式穿甲弹：钨芯，穿透高、对护具耐久破坏大，但价值极高
  'ap556': { name: 'content.ammo.ap556.name', desc: 'content.ammo.ap556.desc', w: 1, h: 1, weight: 0.013, caliber: '5.56', massG: 3.6, v0: 1010, tier: 4, pen: 7, impulse: 2, effects: [], armorWearMul: 1.35, value: 360, rarity: 'L3', stackLimit: 999 },
  // 12 号独头弹：单颗重弹头，近距离对护具冲压极高
  '12ga_slug': { name: 'content.ammo.12ga_slug.name', desc: 'content.ammo.12ga_slug.desc', w: 1, h: 1, weight: 0.05, caliber: '12ga', massG: 28.0, v0: 450, tier: 2, pen: 4, impulse: 1, effects: [], value: 120, rarity: 'L2', stackLimit: 999 },
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
  smg45: { name: 'content.weapon.smg45.name', desc: 'content.weapon.smg45.desc', w: 3, h: 1, weight: 2.5, ammoType: '.45acp', rpm: 780, mag: 25, reload: 2.0, range: 60,  spread: 0.048, auto: true,  fireModes: ['auto'], pellets: 1, color: 0x4a4a5a, value: 1500, rarity: 'L1', stackLimit: 1, recoil: 30, stability: 40, handling: 75, adsSpread: 0.02, drop: 0.015, falloff: 0.6 , electronics: true, empShielded: false },
  ar556: { name: 'content.weapon.ar556.name', desc: 'content.weapon.ar556.desc', w: 4, h: 2, weight: 3.6, ammoType: '5.56',   rpm: 850, mag: 30, reload: 2.3, range: 140, spread: 0.025, auto: true,  fireModes: ['semi', 'auto'], pellets: 1, color: 0x3a4a5a, value: 3000, rarity: 'L2', stackLimit: 1, recoil: 40, stability: 60, handling: 65, adsSpread: 0.005, drop: 0.02, falloff: 0.4 , electronics: true, empShielded: false },
ak762: { name: 'content.weapon.ak762.name', desc: 'content.weapon.ak762.desc', w: 4, h: 2, weight: 4.0, ammoType: '7.62',   rpm: 620, mag: 30, reload: 2.6, range: 130, spread: 0.034, auto: true,  fireModes: ['auto', 'semi'], pellets: 1, color: 0x5a3a2a, value: 3200, rarity: 'L2', stackLimit: 1, recoil: 55, stability: 45, handling: 55, adsSpread: 0.01, drop: 0.025, falloff: 0.5 , electronics: false, empShielded: true },
sr762: { name: 'content.weapon.sr762.name', desc: 'content.weapon.sr762.desc', w: 5, h: 2, weight: 6.5, ammoType: '7.62',   rpm: 55,  mag: 5,  reload: 3.2, range: 350, spread: 0.002, auto: false, fireModes: ['single'], pellets: 1, color: 0x2a3a4a, value: 8000, rarity: 'L3', stackLimit: 1, recoil: 80, stability: 95, handling: 30, adsSpread: 0.0, drop: 0.005, falloff: 0.1 , electronics: true, empShielded: false }, // ★ range 250->350
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
};
c.registerAll('helmetShell', HELMET_SHELL);

const HELMET_VISOR = {
  lv2: { name: 'content.helmetVisor.lv2.name', desc: 'content.helmetVisor.lv2.desc', w: 2, h: 1, weight: 0.42, armorLv: 2, maxDur: 100, value: 350,  rarity: 'L1', stackLimit: 1 },
  lv3: { name: 'content.helmetVisor.lv3.name', desc: 'content.helmetVisor.lv3.desc', w: 2, h: 1, weight: 0.55, armorLv: 3, maxDur: 100, value: 600,  rarity: 'L1', stackLimit: 1 },
  lv4: { name: 'content.helmetVisor.lv4.name', desc: 'content.helmetVisor.lv4.desc', w: 2, h: 1, weight: 0.72, armorLv: 4, maxDur: 100, value: 1200, rarity: 'L2', stackLimit: 1 },
};
c.registerAll('helmetVisor', HELMET_VISOR);

const HELMET_EAR = {
  basic: { name: 'content.helmetEar.basic.name', desc: 'content.helmetEar.basic.desc', w: 1, h: 1, weight: 0.16, maxDur: 100, value: 400, rarity: 'L1', stackLimit: 1, electronics: true, empShielded: false },
};
c.registerAll('helmetEar', HELMET_EAR);

const VEST_FIBER = {
  lv3: { name: 'content.vestFiber.lv3.name', desc: 'content.vestFiber.lv3.desc', w: 3, h: 3, weight: 2.4, armorLv: 3, maxDur: 100, value: 900,  rarity: 'L2', stackLimit: 1 },
  lv4: { name: 'content.vestFiber.lv4.name', desc: 'content.vestFiber.lv4.desc', w: 3, h: 3, weight: 3.1, armorLv: 4, maxDur: 100, value: 1600, rarity: 'L3', stackLimit: 1 },
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
};
c.registerAll('backpack', BACKPACK);

const CHEST_RIG = {
  small: { name: 'content.chestRig.small.name', desc: 'content.chestRig.small.desc', w: 2, h: 2, weight: 0.45, cap: 4, innerW: 2, innerH: 2, value: 400, rarity: 'L1', stackLimit: 1 },
  large: { name: 'content.chestRig.large.name', desc: 'content.chestRig.large.desc', w: 3, h: 2, weight: 0.85, cap: 6, innerW: 3, innerH: 2, value: 900, rarity: 'L2', stackLimit: 1 },
};
c.registerAll('chestRig', CHEST_RIG);


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
  frag_impact: {
    name: 'content.nade.frag_impact.name',
    desc: 'content.nade.frag_impact.desc',
    w: 1, h: 1, weight: 0.52,
    damage: 1850,
    radius: 6.2,
    fuse: 0.02,
    trigger: 'impact',
    effect: 'frag',
    fragments: 72,
    fragmentCount: 8,
    value: 380,
    rarity: 'L2',
    stackLimit: 3,
    color: 0x4a3a2a,
  },
  flashbang: {
    name: 'content.nade.flash.name',
    desc: 'content.nade.flash.desc',
    w: 1, h: 1, weight: 0.35,
    damage: 0,
    radius: 15,
    fuse: 1.8,
    trigger: 'timed',
    effect: 'flash',
    flashDuration: 6.2,
    flashPeak: 1.0,
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
    name: '军用固态盘', desc: '带硬件自毁电路的军用固态盘。外壳有抗磁屏蔽层，但接口暴露在外。',
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
};
c.registerAll('valuables', VALUABLES);

const MEDICAL = {
  bandage: {
    name: '压缩绷带', desc: '真空包装的压缩绷带，用于处理外出血。包装完好，未过期。',
    w: 1, h: 1, weight: 0.08, value: 180, rarity: 'L1', stackLimit: 4, icon: '🩹',
  },
  painkiller: {
    name: '止痛药', desc: '一小板非甾体止痛药。能压低疼痛感，但不能替代止血。',
    w: 1, h: 1, weight: 0.03, value: 140, rarity: 'L1', stackLimit: 4, icon: '💊',
  },
  splint: {
    name: '折叠夹板', desc: '铝条加尼龙带的可折叠夹板，用于临时固定骨折肢体。',
    w: 1, h: 1, weight: 0.22, value: 260, rarity: 'L2', stackLimit: 3, icon: '🦴',
  },
  blood_pack: {
    name: '血浆袋', desc: '低温保存的 O 型血浆，包装上贴着已模糊的血站标签。需要尽快使用。',
    w: 1, h: 1, weight: 0.45, value: 420, rarity: 'L3', stackLimit: 2, icon: '🩸',
  },
  surgical_kit: {
    name: '野外手术包', desc: '含止血钳、缝合线与局部麻醉剂的小型手术包。只有受过训练的人能安全使用。',
    w: 2, h: 1, weight: 0.8, value: 680, rarity: 'L3', stackLimit: 1, icon: '🧰',
  },
  stimulant: {
    name: '军用兴奋剂', desc: '单支自动注射器，标签上写着“仅限战斗伤亡使用”。效果强，副作用同样明显。',
    w: 1, h: 1, weight: 0.05, value: 520, rarity: 'L3', stackLimit: 3, icon: '💉',
  },
};
c.registerAll('medical', MEDICAL);


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
    ai: { aggression: 0.66, composure: 0.60, perception: 0.64, opportunism: 0.55, keepDistance: 12, meleeBias: 0.45, switchBias: 0.5 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv3', lv: 3 }, visor: { defId: 'lv3', lv: 3 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv4', lv: 4 } } },
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
    ai: { aggression: 0.86, composure: 0.90, perception: 0.84, opportunism: 0.88, keepDistance: 20, meleeBias: 0.5, switchBias: 0.95 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } } },
  },
  nipsel_mobile: {
    name: 'content.enemy.nipsel_mobile.name',
    faction: 'nipsel', group: 'nipsel', rank: 'mobile',
    hp: 88, speed: 5.6, acc: 0.60,
    weapons: ['smg45', 'sg12'],
    color: 0xb05a4a, radius: 1.18,
    ai: { aggression: 0.92, composure: 0.44, perception: 0.60, opportunism: 0.40, keepDistance: 7, meleeBias: 0.55, switchBias: 0.8 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv3', lv: 3 }, visor: { defId: 'lv3', lv: 3 }, fiber: { defId: 'lv3', lv: 3 }, plate: { defId: 'lv3', lv: 3 } } },
  },
  // ================= 第 2 组 · 大陆银行武装部 =================
  bank_guard: {
    name: 'content.enemy.bank_guard.name',
    faction: 'bank', group: 'bank', rank: 'guard',
    hp: 148, speed: 4.35, acc: 0.70,
    weapons: ['ar556'],
    color: 0x3f6a9a, radius: 1.35,
    ai: { aggression: 0.58, composure: 0.72, perception: 0.62, opportunism: 0.52, keepDistance: 14, meleeBias: 0.35, switchBias: 0.4 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv5', lv: 5 }, plate: { defId: 'lv5', lv: 5 } } },
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
    ai: { aggression: 0.74, composure: 0.82, perception: 0.78, opportunism: 0.84, keepDistance: 22, meleeBias: 0.4, switchBias: 0.9 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } } },
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
  fiber_acute:   { name: '玻纤滞留·急性', icon: '🧪', positive: false, awareness: 0 },
  fiber_chronic: { name: '玻纤滞留·慢性', icon: '🧬', positive: false, awareness: 0 },
  blind:         { name: '闪光失明', icon: '😵', positive: false, awareness: 0 },
  dazzle:        { name: '强光刺眼', icon: '😵‍💫', positive: false, awareness: 0 },
  stun:          { name: '震撼',     icon: '💫', positive: false, awareness: 0 },
  emp_disrupted: { name: '电磁干扰', icon: '📡', positive: false, awareness: 0 },
  emp_silence:   { name: '电磁静默', icon: '🛰', positive: false, awareness: 0 },
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
