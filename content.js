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
  '9mm':    { name: 'content.ammo.9mm.name',    desc: 'content.ammo.9mm.desc',    w: 1, h: 1, caliber: '9mm', massG: 8.0,  v0: 360, tier: 0, pen: 0, value: 15, rarity: 'L0', stackLimit: 999 },
  '5.56':   { name: 'content.ammo.556.name',    desc: 'content.ammo.556.desc',    w: 1, h: 1, caliber: '5.56', massG: 4.0,  v0: 940, tier: 2, pen: 3, value: 60, rarity: 'L1', stackLimit: 999 },
'7.62':   { name: 'content.ammo.762.name',    desc: 'content.ammo.762.desc',    w: 1, h: 1, caliber: '7.62', massG: 8.0,  v0: 800, tier: 2, pen: 5, value: 80, rarity: 'L2', stackLimit: 999 }, // ★ v0 从 730 提到 800
'.45acp': { name: 'content.ammo.45acp.name',  desc: 'content.ammo.45acp.desc',  w: 1, h: 1, caliber: '.45acp', massG: 14.9, v0: 290, tier: 0, pen: 1, value: 25, rarity: 'L0', stackLimit: 999 },
  '12ga':   { name: 'content.ammo.12ga.name',   desc: 'content.ammo.12ga.desc',   w: 1, h: 1, caliber: '12ga', massG: 3.5,  v0: 410, tier: 0, pen: 0, value: 40, rarity: 'L0', stackLimit: 999 },
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
  p9:    { name: 'content.weapon.p9.name',    desc: 'content.weapon.p9.desc',    w: 2, h: 1, ammoType: '9mm',    rpm: 420, mag: 15, reload: 1.5, range: 80,  spread: 0.032, auto: false, pellets: 1, color: 0x6a6a7a, value: 600,  rarity: 'L0', stackLimit: 1, recoil: 20, stability: 50, handling: 80, adsSpread: 0.01, drop: 0.01, falloff: 0.5 },
  smg45: { name: 'content.weapon.smg45.name', desc: 'content.weapon.smg45.desc', w: 3, h: 1, ammoType: '.45acp', rpm: 780, mag: 25, reload: 2.0, range: 60,  spread: 0.048, auto: true,  pellets: 1, color: 0x4a4a5a, value: 1500, rarity: 'L1', stackLimit: 1, recoil: 30, stability: 40, handling: 75, adsSpread: 0.02, drop: 0.015, falloff: 0.6 },
  ar556: { name: 'content.weapon.ar556.name', desc: 'content.weapon.ar556.desc', w: 4, h: 2, ammoType: '5.56',   rpm: 850, mag: 30, reload: 2.3, range: 140, spread: 0.025, auto: true,  pellets: 1, color: 0x3a4a5a, value: 3000, rarity: 'L2', stackLimit: 1, recoil: 40, stability: 60, handling: 65, adsSpread: 0.005, drop: 0.02, falloff: 0.4 },
ak762: { name: 'content.weapon.ak762.name', desc: 'content.weapon.ak762.desc', w: 4, h: 2, ammoType: '7.62',   rpm: 620, mag: 30, reload: 2.6, range: 130, spread: 0.034, auto: true,  pellets: 1, color: 0x5a3a2a, value: 3200, rarity: 'L2', stackLimit: 1, recoil: 55, stability: 45, handling: 55, adsSpread: 0.01, drop: 0.025, falloff: 0.5 },
sr762: { name: 'content.weapon.sr762.name', desc: 'content.weapon.sr762.desc', w: 5, h: 2, ammoType: '7.62',   rpm: 55,  mag: 5,  reload: 3.2, range: 350, spread: 0.002, auto: false, pellets: 1, color: 0x2a3a4a, value: 8000, rarity: 'L3', stackLimit: 1, recoil: 80, stability: 95, handling: 30, adsSpread: 0.0, drop: 0.005, falloff: 0.1 }, // ★ range 250->350
  sg12:  { name: 'content.weapon.sg12.name',  desc: 'content.weapon.sg12.desc',  w: 4, h: 2, ammoType: '12ga',   rpm: 85,  mag: 6,  reload: 3.0, range: 35,  spread: 0.100, auto: false, pellets: 9, color: 0x5a4a2a, value: 2500, rarity: 'L3', stackLimit: 1, recoil: 70, stability: 50, handling: 50, adsSpread: 0.05, drop: 0.01, falloff: 0.8 },
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
  lv3: { name: 'content.helmetShell.lv3.name', desc: 'content.helmetShell.lv3.desc', w: 2, h: 2, armorLv: 3, maxDur: 100, value: 800,  rarity: 'L1', stackLimit: 1 },
  lv4: { name: 'content.helmetShell.lv4.name', desc: 'content.helmetShell.lv4.desc', w: 2, h: 2, armorLv: 4, maxDur: 100, value: 1500, rarity: 'L2', stackLimit: 1 },
};
c.registerAll('helmetShell', HELMET_SHELL);

const HELMET_VISOR = {
  lv3: { name: 'content.helmetVisor.lv3.name', desc: 'content.helmetVisor.lv3.desc', w: 2, h: 1, armorLv: 3, maxDur: 100, value: 600,  rarity: 'L1', stackLimit: 1 },
  lv4: { name: 'content.helmetVisor.lv4.name', desc: 'content.helmetVisor.lv4.desc', w: 2, h: 1, armorLv: 4, maxDur: 100, value: 1200, rarity: 'L2', stackLimit: 1 },
};
c.registerAll('helmetVisor', HELMET_VISOR);

const HELMET_EAR = {
  basic: { name: 'content.helmetEar.basic.name', desc: 'content.helmetEar.basic.desc', w: 1, h: 1, maxDur: 100, value: 400, rarity: 'L1', stackLimit: 1 },
};
c.registerAll('helmetEar', HELMET_EAR);

const VEST_FIBER = {
  lv3: { name: 'content.vestFiber.lv3.name', desc: 'content.vestFiber.lv3.desc', w: 3, h: 3, armorLv: 3, maxDur: 100, value: 900,  rarity: 'L2', stackLimit: 1 },
  lv4: { name: 'content.vestFiber.lv4.name', desc: 'content.vestFiber.lv4.desc', w: 3, h: 3, armorLv: 4, maxDur: 100, value: 1600, rarity: 'L3', stackLimit: 1 },
};
c.registerAll('vestFiber', VEST_FIBER);

const VEST_PLATE = {
  lv3: { name: 'content.vestPlate.lv3.name', desc: 'content.vestPlate.lv3.desc', w: 2, h: 2, armorLv: 3, maxDur: 100, value: 600, rarity: 'L1', stackLimit: 1 },
  lv4: { name: 'content.vestPlate.lv4.name', desc: 'content.vestPlate.lv4.desc', w: 2, h: 2, armorLv: 4, maxDur: 100, value: 1200, rarity: 'L2', stackLimit: 1 },
  lv5: { name: 'content.vestPlate.lv5.name', desc: 'content.vestPlate.lv5.desc', w: 2, h: 2, armorLv: 5, maxDur: 100, value: 2400, rarity: 'L3', stackLimit: 1 },
};
c.registerAll('vestPlate', VEST_PLATE);

const BACKPACK = {
  small:  { name: 'content.backpack.small.name',  desc: 'content.backpack.small.desc',  w: 2, h: 2, cap: 8,  innerW: 4, innerH: 2, value: 300,  rarity: 'L1', stackLimit: 1 },
  medium: { name: 'content.backpack.medium.name', desc: 'content.backpack.medium.desc', w: 3, h: 3, cap: 16, innerW: 4, innerH: 4, value: 800,  rarity: 'L2', stackLimit: 1 },
  large:  { name: 'content.backpack.large.name',  desc: 'content.backpack.large.desc',  w: 4, h: 4, cap: 24, innerW: 6, innerH: 4, value: 1800, rarity: 'L3', stackLimit: 1 },
};
c.registerAll('backpack', BACKPACK);

const CHEST_RIG = {
  small: { name: 'content.chestRig.small.name', desc: 'content.chestRig.small.desc', w: 2, h: 2, cap: 4, innerW: 2, innerH: 2, value: 400, rarity: 'L1', stackLimit: 1 },
  large: { name: 'content.chestRig.large.name', desc: 'content.chestRig.large.desc', w: 3, h: 2, cap: 6, innerW: 3, innerH: 2, value: 900, rarity: 'L2', stackLimit: 1 },
};
c.registerAll('chestRig', CHEST_RIG);

  /* ==========================================================
     4. 敌人
     ----------------------------------------------------------
     weapon:  引用武器 id
     faction: 阵营 id（用于模式层派系系统）
     color:   网格颜色
     radius:  碰撞半径
     ========================================================== */
  const ENEMIES = {
  grunt: {
    name: 'content.enemy.grunt.name',
    hp: 75, speed: 4.5, acc: 0.55, faction: 'nipsel', weapon: 'p9',
    color: 0x8a5a5a, radius: 1.2,
    ai: { aggression: 0.3, composure: 0.2, perception: 0.4, opportunism: 0.2 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv3', lv: 3 }, visor: { defId: 'lv3', lv: 3 }, fiber: { defId: 'lv3', lv: 3 }, plate: { defId: 'lv3', lv: 3 } } },
  },
  rifleman: {
    name: 'content.enemy.rifleman.name',
    hp: 100, speed: 5.0, acc: 0.68, faction: 'nipsel', weapon: 'ar556',
    color: 0x9a6a4a, radius: 1.2,
    ai: { aggression: 0.5, composure: 0.6, perception: 0.6, opportunism: 0.6 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv4', lv: 4 } } },
  },
  smgman: {
    name: 'content.enemy.smgman.name',
    hp: 85, speed: 5.5, acc: 0.60, faction: 'nipsel', weapon: 'smg45',
    color: 0xa05050, radius: 1.2,
    ai: { aggression: 0.9, composure: 0.4, perception: 0.5, opportunism: 0.3 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv3', lv: 3 }, visor: { defId: 'lv3', lv: 3 }, fiber: { defId: 'lv3', lv: 3 }, plate: { defId: 'lv3', lv: 3 } } },
  },
  sniper: {
    name: 'content.enemy.sniper.name',
    hp: 68, speed: 3.8, acc: 0.86, faction: 'nipsel', weapon: 'sr762',
    color: 0x6a5a8a, radius: 1.1,
    ai: { aggression: 0.2, composure: 0.9, perception: 0.9, opportunism: 0.8 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } } },
  },
  elite: {
    name: 'content.enemy.elite.name',
    hp: 160, speed: 5.2, acc: 0.82, faction: 'nipsel', weapon: 'ak762',
    color: 0xc04a4a, radius: 1.3,
    ai: { aggression: 0.9, composure: 0.9, perception: 0.8, opportunism: 0.9 },
    prazer: false, A: 0,
    gear: { armor: { shell: { defId: 'lv4', lv: 4 }, visor: { defId: 'lv4', lv: 4 }, fiber: { defId: 'lv4', lv: 4 }, plate: { defId: 'lv5', lv: 5 } } },
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
    prazer: false, A: 0,
    color: 0x5a6b7c,
    skills: ['drone', 'rally'],
    staminaRegen: { move: 1.5, idle: 6 },
    sprintCost: 2.5,
  },
  kate: {
    name: 'content.char.kate.name', tag: 'content.char.kate.tag',
    hp: 130, speed: 5.2, radius: 1.1,
    weapon: 'sr762', sidearm: 'p9',
    prazer: true, A: 3,
    color: 0xff9ec4,
    skills: ['jump', 'aimbuff'],
    staminaRegen: { move: 2.0, idle: 8 },
    sprintCost: 2.0,
  },
  lingna: {
    name: 'content.char.lingna.name', tag: 'content.char.lingna.tag',
    hp: 130, speed: 5.3, radius: 1.1,
    weapon: 'ar556', sidearm: 'smg45',
    prazer: true, A: 3,
    color: 0xffb066,
    skills: ['dash', 'suppress'],
    staminaRegen: { move: 2.0, idle: 8 },
    sprintCost: 2.0,
  },
  buwen: {
    name: 'content.char.buwen.name', tag: 'content.char.buwen.tag',
    hp: 115, speed: 4.6, radius: 1.2,
    weapon: 'sg12', sidearm: 'p9',
    prazer: false, A: 0,
    color: 0xc8e05a,
    skills: ['shield', 'taunt'],
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
    size: 120, obstacleCount: 50, enemyCount: 6,
    layoutUrl: 'maps/factory.json',
  },
  desert: {
    name: 'content.map.desert.name',
    desc: 'content.map.desert.desc',
    size: 160, obstacleCount: 35, enemyCount: 8,
    layoutUrl: 'maps/desert.json',
  },
  lab: {
    name: 'content.map.lab.name',
    desc: 'content.map.lab.desc',
    size: 100, obstacleCount: 70, enemyCount: 10,
    layoutUrl: 'maps/lab.json',
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
    jump:     { name: 'content.skill.jump.name',     kind: 'dash',       cd: 20, cost: 10, distance: 5,  invuln: 0.3 },
    aimbuff:  { name: 'content.skill.aimbuff.name',  kind: 'timedBuff',  cd: 45, cost: 15, duration: 3,  effect: 'aimBuff' },
    dash:     { name: 'content.skill.dash.name',     kind: 'timedBuff',  cd: 25, cost: 12, duration: 5,  effect: 'speedBuff' },
    suppress: { name: 'content.skill.suppress.name', kind: 'timedBuff',  cd: 60, cost: 20, duration: 4,  effect: 'suppress' },
    drone:    { name: 'content.skill.drone.name',    kind: 'drone',      cd: 30, cost: 0,  duration: 25, markRadius: 20, markDuration: 15 },
    rally:    { name: 'content.skill.rally.name',    kind: 'healPercent',cd: 75, cost: 0,  percent: 0.15 },
    shield:   { name: 'content.skill.shield.name',   kind: 'timedBuff',  cd: 30, cost: 0,  duration: 5,  effect: 'shield' },
    taunt:    { name: 'content.skill.taunt.name',    kind: 'taunt',      cd: 60, cost: 0,  duration: 3 },
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
  bleeding:      { name: '流血',     icon: '🩸', awareness: 0 },
  fracture:      { name: '骨折',     icon: '🦴', awareness: 0 },
  hypovolemia:   { name: '失血过多', icon: '💔', awareness: 0 },
  pain:          { name: '疼痛',     icon: '💢', awareness: 0 },
  moving_speed_up:{ name: '加速',     icon: '💨', awareness: 0 },
  aim_buff:      { name: '精准',     icon: '🎯', awareness: 0 },
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
