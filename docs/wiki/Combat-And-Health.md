# 第一部分 · 战斗与健康模型

> 本页对应 `game.js` 顶部 `COMBAT`、`PART_MAX_HP`、`EntityStatus`、`CombatSystem`、`_applyArmorLayers`、`_damageEnemy`、`_damagePlayer`。
> 任何数值改动必须同步本页。

---

## 1. 总流程

一次子弹命中：

```
初速 v0 + 弹头质量 m
  ↓ E0 = ½ m v0²
射程衰减
  ↓ E = E0 · exp(-k · traveled / effectiveRange)
穿透衰减
  ↓ pen = basePen - floor((traveled - 0.8·range) / range)
命中部位
  ↓ head / thorax / abdomen / legs
护具分层
  ↓ 插板/壳/面罩/纤维吸收 + 钝击传导
部位组织损伤
  ↓ part.hp -= remainingEnergy
伤口 / 骨折 / 失血 / 状态
  ↓ wound level, bleeding, fracture, pain, hypovolemia
死亡 / 击倒判定
```

所有伤害入口最终只有两个：

- `GameWorld._damageEnemy(enemy, energy, pen, hitPart, byPlayer, damageType)`
- `GameWorld._damagePlayer(player, energy, pen, part, srcX, srcZ, sourceEnt, damageType)`

新增伤害来源（火焰、毒、坠落、技能）必须走这两个入口，禁止直接改 `status.hp`。

---

## 2. 常数

```js
const COMBAT = {
  PSI: 0.00335791,
  T_EFF: 0.5,
  BODY_COEFF_HUMAN: 34,
  BODY_COEFF_PRAZER: 48,
  HEAD_MULT: 2.0,
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
  PROTECT_ABSORB: { L1_MELEE: 1.0, L2_BALLISTIC: 0.86, L3_BALLISTIC: 0.80 },
  EXTRACT_TIME: 8,
  SEARCH_TIME: 2.5,
  SEARCH_RADIUS: 3.5,
  EXTRACT_RADIUS: 4.5,
};
```

说明：
- `BODY_COEFF_*` 与 `energyToHP()` 目前是**预留**的旧人体换算工具，实际伤害走部位 J 值；不要在未统一调用的情况下单独使用。
- `ARMOR_J_PER_DUR = 40`：护具耐久按 `absorbed / 40` 扣，**不是**“1 点耐久挡 40J 命中”。Lv3（red 0.52）前段每点耐久吃 1/0.52×40 ≈ 77J 命中，Lv5 约 54J；穿透 ≥ 护具等级时还要再除以 `redMul`。见 §5.1。
- `RANGE_DECAY` 是默认指数衰减系数：`E = E0·exp(-k·t)`，`t = traveled / range`。k=0.25 时一个有效射程存能 77.9%，两个 60.7%，五个（上限）28.7%。`RANGE_DECAY_REALISTIC = 0.50` 只在“真实弹道”预设下被用到——目前 `ProfileSystem` 并没有这个键，硬核预设也没切换它，所以默认全局都是 0.25。

---

## 3. 部位血量

```js
const PART_MAX_HP = {
  head: 60,
  thorax: 800,
  abdomen: 600,
  larm: 400,
  legs: 500,
};
```

- 单位：焦耳（J），表示该部位肌肉/骨骼被彻底摧毁的阈值。
- 头部 ≤0 即死；胸部 ≤0 进入击倒；失血 ≤0 即死。
- 四肢不计入 `healthQuality`，但影响移速/操控/骨折。
- **Boss 的体型倍率目前没有接进 `EntityStatus`**：`_spawnEnemy` 只传 `spec`，`spec.bossPartScale` 不会被读取，`headHpMul` 只抬头部。所以“雪乃 1400 HP”在部位伤害上是和小兵同一套 60/800/600/400/500。做 Boss 难度评估前先决定这是设计还是漏接（见 Game-Design §16.1）。
- 敌人/玩家身上都会存一份 `enemy.hp`（`spec.hp × diffMul × (0.5 + 实时难度评分)`），但 `isDead()` / `isDowned()` 不看它，它只用于 HUD 与比例显示。

### 命中部位判定

射线命中点相对身体中心的高度比 `r = relY / halfH`：

| r | 部位 |
|---|---|
| > 0.5625 | head |
| > 0.0833 | thorax |
| > -0.1667 | abdomen |
| ≤ -0.1667 | legs |

（手臂近战/特殊逻辑可能使用 `larm`，命中判定目前主要落在头/胸/腹/腿。）

---

## 4. 弹道能量与穿透

### 4.1 枪口动能

```js
E0 = 0.5 * (massG / 1000) * v0²
```

例：
- 5.56：`0.5*0.004*940² = 1767J`
- 7.62：`0.5*0.008*800² = 2560J`
- 9mm：`0.5*0.008*360² = 518J`

### 4.2 射程衰减

```js
E(traveled) = E0 * exp(-k * traveled / effectiveRange)
```

- `effectiveRange` 取武器 `range` 字段。
- `k = 0.25`（默认）或 `0.50`（真实弹道预设）。
- 最大按 5 个有效射程计算，避免极端值。

> 这是工程近似，不是严格空气阻力积分；优点是稳定、可解释、不会在远距离产生负能量。

### 4.3 穿透

```js
basePen = ammo.pen + ammo.impulse
```

超出有效射程 80% 后，每超出一个有效射程，穿透 -1，最低 0。

---

## 5. 护具公式

### 5.1 单层吸收

`CombatSystem.applyArmor(armorItem, energy, pen, applyBruise=false)`：

1. 基础吸收比例来自 `armor.red`（content `armor` 表），没有 `red` 才回退等级表。
2. 穿透差 `diff = pen - armor.lv`：

| diff | 吸收倍率 `redMul` |
|---:|---:|
| ≥4 | 0.05 |
| 3 | 0.20 |
| 2 | 0.40 |
| 1 | 0.70 |
| 0 | 1.00 |
| -1 | 1.15 |
| ≤-2 | 1.30 |

3. 耐久损耗惩罚：

```js
durRatio = clamp(armor.dur / armor.max, 0, 1)
wearPenalty = 0.2 + 0.8 * durRatio
```

4. 实际吸收：

```js
effRed = min(0.99, armor.red * redMul * wearPenalty)
absorbed = energy * effRed
afterArmor = energy - absorbed
```

5. 护具耐久损耗：`wear = min(armor.dur, absorbed / 40)`；`armor.dur -= wear`。

> ⚠ **每点耐久实际挡住的命中能量不是 40J。** 挡住的是 `absorbed`，耐久扣的是 `absorbed/40`；`absorbed = energy × red × redMul × wearPenalty`。
> 反推：`energy_per_dur = 40 / (red × redMul)`。red 0.52、redMul 1（diff 0）时是 77J；red 0.74 时 54J；被穿透（redMul 0.2~0.7）时 96~270J/点；diff ≤ -2 时 `redMul 1.3`、约 42J/点。所以“100 耐久 ≈ 4kJ”的说法只在 `red·redMul = 1`（满额吸收）时成立。

6. `pierced = diff >= 1`。

### 5.2 钝击传导

`_applyArmorLayers` 按护具层处理：

| 层 | 钝击比例（未被击穿时） |
|---|---:|
| 插板 | 0.08 |
| 头盔壳 | 0.10 |
| 面罩 | 0.12 |
| 纤维 | 0.28 |

规则：
- 只有 `!pierced` 且 `absorbed > 0` 时，剩余能量才乘钝击比例。
- 被击穿时，剩余能量直接进入人体（不再乘钝击）。
- 近战不额外乘钝击系数；护具按等级吸收，余能直接进人体。
- 外骨骼先于所有护具结算：每点电池电量抵消 50J，最多吸收 78% 伤害；头部/钝击/爆炸同样覆盖。电池 0 或 EMP 损坏后外骨骼失效并跳过 lv6 纤维层。
- EMP 抗磁层：`empShield` 先扣耐久；层未耗尽时只记录电磁冲刷，耗尽后才按概率损坏电子设备。
- 爆炸 `damageType='blast'` **完全绕过护具**，直接按冲击波能量算（硬插板挡不住超压）。
- 耦合防护额外对 `explosion` 吸收 42%/58%（L2/L3），对 `blast` 吸收 22%/32%；这是“能量场偏转”，不是护甲。

### 5.3 层组合

- 头：有壳走壳；无壳才走面罩。一次命中只走一层。
- 胸：插板 → 纤维（先硬后软）。
- 腹：仅纤维。
- 四肢：仅纤维。

> 历史 bug：旧版头部“壳+面罩”叠加、腹部也吃插板、全局再乘 0.25 钝击，导致伤害既不可解释又和 content 不一致。现版本禁止再引入全局 `×0.25`。

---

## 6. 组织损伤、伤口、失血

### 6.1 部位伤害

```js
part.hp = max(-part.maxHp*2, part.hp - remainingEnergy)
```

### 6.2 伤口等级

```js
WOUND_ENERGY_THRESHOLD = [0, 100, 350, 700, 1200]
```

- 单次剩余能量 ≥100 → 1 级；≥350 → 2 级；≥700 → 3 级；≥1200 → 4 级。
- 每部位最多 3 个伤口，伤口等级上限 4。
- 有伤口 → `bleeding` 持续存在，强度 = 全身伤口等级总和。

### 6.3 即时失血

```js
vascularity = { head:1.4, thorax:1.2, abdomen:1.15, larm:0.55, legs:0.6 }[part] || 0.7
instantBleed = energy * 0.18 * vascularity + newWound * 35   // ml
blood -= instantBleed
```

例：5.56 胸部 1700J：
`1700*0.18*1.2 + 4*35 = 367.2 + 140 = 507.2ml`（约 10% 血容量，命中瞬间就掉）

- 这是“中枪瞬间”的失血，不是等伤口开始流血才结算。
- 低能量/护具削能后的命中按剩余能量计算，避免轻伤也大量失血。
- 9mm 胸部 500J 约为 `500*0.18*1.2 + 35 = 143ml`。

### 6.4 持续流血

```js
bleedRate = totalWoundLevel * 40 ml/s
```

- 额外：`fiber_acute` 按强度 +50 / +64 / +78ml/s；`fiber_chronic` +10ml/s。
- 燃烧每秒额外失血 `burn.strength * 7 ml`（灼烧伤害为 `strength * 42 J/s`）。
- 血液最大：人类 5000ml，Prazer 6000ml。
- 玩家被动「闪回」出血 ×1.18，Hate 反噬 ×1.12。
- `totalWoundLevel` 现在累加每个部位的所有伤口等级，而不是只取每部位最高伤口；同一部位连续中弹会显著加快流血。
- 4 级伤口约 160ml/s，5L 血约 31 秒流尽；多处重伤会更快。

### 6.5 低血容量

```js
if (blood < maxBlood * 0.35) addEffect('hypovolemia')
```

- 35% 阈值约等于 1750ml（人类），对应临床上有意义的失血性休克。
- `hypovolemia`：移速 ×0.75，操控 ×0.8，视野红雾/收缩。

### 6.6 健康度

```js
partWeights = { head:0.28, thorax:0.30, abdomen:0.16, larm:0.06, legs:0.20 }
tissueQuality = Σ clamp(part.hp/part.maxHp, 0, 1) * partWeights
bloodRatio = clamp(blood / maxBlood, 0, 1)
healthQuality = clamp(min(1, tissueQuality, bloodRatio) * 100, 0, 100)
if (blood <= 0 || head.hp <= 0) healthQuality = 0
```

- 所有与生命直接相关的部位都计入，不再只算头/胸/腹。
- 不能出现“组织完好但失血 40% 还显示健康”。
- 死亡时强制归零，HUD 状态条在死亡帧恰好为 0。
- `healthQuality` 用于 HUD、AI 判断、战斗记录。

### 6.7 死亡 / 击倒

- `isDead()`：`blood ≤ 0` 或 `head.hp ≤ 0`。
- `isDowned()`：未死，且 `thorax.hp ≤ 0` 或 `blood < maxBlood * 0.2`。
- **死亡/击倒每帧由 `GameWorld._syncEntityLifecycle()` 同步**，不只在受击瞬间检查；流血、燃烧、玻纤、EMP 等持续伤害同样能触发。
- 击倒后玩家锁定为 0.9m 碰撞高度、禁止跳跃/疾跑/开背包；30s 未救援 → 失血死亡。
- 训练人偶只有在“应用靶场设置/重开靶场”时才复位，不会自动复活。

---

## 7. 状态效果

`EntityStatus.effects` 是 `Map<id,{duration,strength,awareness}>`。
新增效果必须注册到 `content.effects`（名称/图标/正负），否则 HUD 与回放无法显示。

### 7.1 当前效果

| id | 名称 | 图标 | 正负 | 主要影响 |
|---|---|---|---|---|
| `bleeding` | 流血 | 🩸 | 负 | 持续失血 |
| `fracture` | 骨折 | 🦴 | 负 | 移速/操控 |
| `hypovolemia` | 失血过多 | 💔 | 负 | 移速/操控/视野 |
| `pain` | 疼痛 | 💢 | 负 | 移速/操控/散布 |
| `burning` | 燃烧 | 🔥 | 负 | 随机部位灼烧 + 失血 |
| `fiber_acute` | 玻纤滞留·急性 | 🧪 | 负 | 剧痛 + 大出血 |
| `fiber_chronic` | 玻纤滞留·慢性 | 🧬 | 负 | 轻度持续失血 |
| `blind` | 闪光失明 | 😵 | 负 | 视野/散布/移速 |
| `dazzle` | 强光刺眼 | 😵‍💫 | 负 | 禁止开镜/散布/移速 |
| `stun` | 震撼 | 💫 | 负 | 操控/移速 |
| `emp_disrupted` | 电磁干扰 | 📡 | 负 | 操控/移速/电子设备损坏 |
| `srdispte` | Srdispte | 🌪 | 正 | 速度/开镜 |
| `hate` | Hate | 🔥 | 正 | 速度/射速/换弹 |
| `inspire` | 激励 | 🎖 | 正 | 负抗/操控 |
| `stress` | 应激 | ⚡ | 正 | 凯特被动 |
| `flashback` | 闪回 | 🧠 | 负 | 剧情预留 |
| `mimic` | 拟载·BYinC | 💎 | 正 | 拟载护甲 |
| `covey` | 覆柔 | 🎗 | 正 | 叶被动 |
| `moving_speed_up` | 加速 | 💨 | 正 | 移速 |
| `aim_buff` | 精准 | 🎯 | 正 | 散布 |
| `drone` | 无人机链路 | 🛸 | 正 | 无人机 |
| `catleap` | 猫跃 | 🐾 | 正 | 位移 |
| `suppress` | 压制 | 🎯 | 正 | 压制 |
| `backflash` | 背闪 | ✨ | 正 | 背闪 |
| `intuition` | 直觉与回忆 | 👁 | 正 | 队长被动 |
| `adapt` | 适应 | 🧩 | 正 | 叶被动 |
| `suppressed` | 被压制 | 😖 | 负 | 移速/散布 |
| `weakness` | 精力虚弱 | 🥀 | 负 | 体力 |
| `hate_backlash` | 血液反噬 | 🩸 | 负 | 反噬 |
| `melee_ready` | 白刃 | 🔪 | 正 | 近战 |
| `pspace_echo` | P空间共鸣 | 🌀 | 正 | 移速 ×1.10、操控 ×1.12、近战力量 ×1.25、体力恢复 ×1.35；由 Assee 波动/尸体核心吸收触发 |
| `nausea` | 恶心 | 🤢 | 负 | 移速/操控/视野（止痛药副作用；P空间波动同样附带） |
| `sedation` | 镇静过度 | 😴 | 负 | 移速/操控/视野（止痛药副作用） |
| `overdose` | 药物过量 | ☠️ | 负 | 重度移速/操控/视野惩罚 |
| `stim_crash` | 药效反噬 | 🥀 | 负 | 兴奋剂到期后的疲惫 |

> `pain` 是持续效果：伤口/燃烧/急性玻纤存在时每帧刷新；`painkiller` 只压制惩罚，不删除疼痛。

### 7.2 燃烧

```js
每个着火部位：dmg = level * 8 * dt J   // 只烧该部位
失血：level * 1.6 * dt ml
扩散：每 4 秒，2 级及以上着火部位向相邻部位扩散 1 级
熄灭：主动灭火 / 离开火源后 12 秒
```

- 火焰不再每帧随机挑一个部位；命中 Dragon’s Breath 时只点燃实际命中的部位，燃烧瓶/地面火从腿部开始。
- 状态面板会显示具体着火部位和等级；3D 火焰只出现在着火部位。
- **灭火 ≠ 休克结束**：`burnShock` 不再随 `burning` 移除或自然熄灭被删除；主动灭火按火势等级补挂至少 40s 的休克，并继续按等级失血。AI 灭火同样保留。

### 7.3 玻纤弹

- 命中立即 `fiber_acute`（强度由 `ammo.fiberAcute` 决定）+ `fiber_chronic`（强度 1）+ `pain`。
- 对 `armor.fiber` 额外 -N 耐久（`ammo.fiberArmorDamage`）。
- 急性：流血 +50 / +64 / +78ml/s（按 `fiberAcute` 强度），疼痛固定 4 级“剧痛”；慢性：+10ml/s。
- 玻纤疼痛的视野惩罚 0.46（4 级），移速 ×0.83、操控 ×0.78、散布 ×1.28，明显重于普通枪伤。
- GF 弹覆盖 9mm / 5.56 / 7.62 / .45acp / 12ga；显示名统一为“口径 + GF 玻纤弹”。
- 玩家可按 K / 点击「拔除玻纤」耗时 4s 移除急性；AI 在安全时会进入 `remove` 状态自行拔除。
- 玩家与敌人身上都有玻纤碎片特效。

### 7.4 闪光与强光

- `_applyFlash()` 先用射线检查墙体遮挡，再按 `(1 - d/radius)^1.05 × 遮挡 × 强度` 计算照度。
- 照度 ≥0.22：`blind`，失明时长按照度缩放；
- 0.05~0.22：`dazzle`，强光刺眼，强制退出开镜并显示抬手遮眼遮罩；
- `<0.05`：不生效。
- 闪光弹半径 20m / 失明基准 7s；5m 内基本必盲，10m 左右开始转为刺眼。
- `_spawnLightField()` 同时生成真实点光源和扩散球，不是只给半径内贴状态。
- 2026-11-21：闪光判定改用三维距离；近距/高照度额外附带 `stun` 眩晕与 `tinnitus` 耳鸣。

### 7.4.1 震撼与听觉

- 震撼弹按三维距离 + 墙体遮挡衰减计算，`(1-d/r) × 遮挡(0.4)`，不再只看水平投影。
- 爆炸/破片命中玩家会施加 `tinnitus`（耳鸣）与近距离 `deafened`（听力受损）。
- `Status.getHearingMul()`：耳鸣 ×0.42、耳聋 ×0.2、震撼 ×0.7，作用于 `_playSFXAt` 的外部音效音量。
- `tinnitus` 播放 3.9k/6.1k 高频铃声，1.2 秒内只叠一次。

### 7.5 EMP

- `_applyEmpField()` 按距离衰减计算电磁场强度。
- 无电磁加固（`empShielded=false`）的 `electronics` 物品：按强度概率 `damaged = true`、`valueMul ×0.12`、电子枪械 `disabled`，UI 显示 `[损坏]`。
- 电磁加固（`empShielded=true`）**不是免疫**：被击穿概率约 `2%~20%`（随强度），未击穿也会掉 `4% × 强度` 耐久并留下 `empSurge`。
- 无人机按 `empResist` 折算耐久损失（默认 0.45 → 约 55% 当量）；EMP 后图传出现雪花/马赛克，只在操控无人机时显示。
- 警告：有物品实际损坏 → “电磁干扰：N 件电子物品已损坏”；只有加固设备被冲刷 → “强电磁干扰”。
- `emp_silence` 已接入为“强电磁干扰”状态，用于加固设备被冲刷但未损坏的情况。

### 7.6 投掷物碰撞与 AI 规避（2026-11-21）

- 所有投掷物逐帧用“上一帧位置 → 当前帧位置”的线段做物理射线，薄墙也不会被穿透。
- 定时引信撞墙/箱子：按法线反射并乘以 0.45 弹性；落地保留 28% 垂直速度。
- 碰撞触发 `nade_bounce` 音效与 `malignant` 声纹，AI 能听见脚边落雷。
- AI 发现 9.5m 内的爆炸投掷物会进入 `flee`，目标点设在反方向 13m；威胁消失后立刻回到战斗。
- 强 AI 也会投掷：`nade` 状态、`ai.grenade` 概率、7~34m 距离窗、队友爆区检查、0.7~1.2s 前摇与拉环声；闪光/震撼豁免投掷者本人。

### 7.7 疼痛与药物副作用（2026-11-21）

- `pain` 不再是一次性 10 秒：只要 `totalWoundLevel > 0`、存在 `fiber_acute` 或仍在燃烧，`EntityStatus.tick()` 每帧刷新 `pain`（强度 1~4，20 秒刷新窗口）。
- 疼痛分级：1 轻 / 2 中 / 3 重 / 4 剧痛（玻纤急性固定 4 级；重度烧伤可到 4 级）。
- 疼痛惩罚按强度缩放：
  - 移速 ×0.95 / 0.91 / 0.87 / 0.83；
  - 操控 ×0.90 / 0.86 / 0.82 / 0.78；
  - 视野惩罚 0.19 / 0.28 / 0.37 / 0.46；
  - 玩家散布 ×1.10 / 1.16 / 1.22 / 1.28。
- 敌我受伤、疼痛、着火都会叫唤：普通受伤为短促闷哼；疼痛会持续粗重喘气（3~4 级更急促并偶尔惨叫）；着火为明显更响、更长的剧烈惨叫；死亡有独立死亡音。
- AI 互救：同阵营倒地者会被 16m 内同伴在 2.3m 处持续救治 3.2s 后扶起；普通兵带绷带，精锐/队长/机动/警卫额外带手术包，友方 AI 额外带血浆袋。玩家可用 `U` 靠近队友查看伤情并用自己的药品救治。
- AI 自愈：敌我通用 `selfaid` 状态；无视线（或撤退到安全距离）且健康 <68 / 有出血时，停步蹲下 2.6~3.6s，按伤情使用绷带、血浆或手术包，不能边跑边回血。
- `painkiller` 只让上述惩罚失效（`painSuppressed()`），疼痛状态本身仍然存在；药效过期后惩罚立即回来。
- 重复服用止痛药（150 秒窗口）：
  - 2 剂：`nausea`（恶心）30s，移速 ×0.95、操控 ×0.9、视野 +0.18；
  - 3 剂：`sedation`（镇静过度）45s，移速 ×0.76、操控 ×0.74、视野 +0.35；
  - 4 剂及以上：`overdose`（药物过量）60s，移速 ×0.55、操控 ×0.6、视野 +0.55。
- 兴奋剂：`stimulant` 到期后追加 `stim_crash`（药效反噬）18~30s，移速 ×0.88、操控 ×0.93、视野 +0.2；与描述中的“药效过后明显疲惫”一致。使用独立 id 是为了避开技能系统每帧 `clear('weakness')` 的清理。
- 医疗预检失败必须给提示：`GameWorld._hint()` 同时写 HUD 事件横幅和背包内 toast；不能只在 HUD 写日志。

---

## 8. 伤害类型

| `damageType` | 来源 | 护具处理 |
|---|---|---|
| `ballistic` | 子弹 | 正常分层 + 钝击 |
| `melee` | 近战 | 按等级吸收（`min(0.5, lv×0.05)`），不乘钝击 |
| `blast` | 手雷/爆炸 | **完全绕过护具**，直接冲击波 |
| `explosion` | 破片 | 走正常护具（破片可被护具挡） |
| `fire` | 燃烧 | 走正常入口，通常无护具 |
| `thermo` | 温压云团 | **完全绕过护具/插板**；外骨骼能量层仍可先吸收，剩余直接进人体 |

- 近战实际吸收比例：Lv3 15%、Lv4 20%、Lv5 25%（封顶 0.5）。开山刀第三刀约 1550J，打 Lv5 纤维后仍有 ~1160J 进身体，所以穿甲近战根本不靠“穿甲”，靠的是“部位先被打碎打残”。

- `blast` 且剩余 ≥900J：直接 `blood=0`，避免手雷只把人打成“濒死站立”。
- 同阵营友伤默认由 Profile `friendlyFire` 控制；子弹/投掷物入口本身不区分敌我。

---

## 9. 近战

- 伤害来自 `melee.damage × moveset.mul`（刀 560~1150J）× `_meleeStrengthMul()`：人类 1×，Prazer 按 `140·ln(A)/80` 放大并封顶 4.5×。
- 每把刀有独立 `moveset`：连续出刀按数组顺序循环，2.4s 不出刀重置。每刀有自己的距离、出刀间隔、倍率与出血倍率；夜切 `bleedMul 2.6` 会额外撕开伤口。
- 尾击：Prazer 专属，2.8m、`FIST.damage × 力量倍率 × 2.2`、穿透 7、消耗 24 体力、1.1s 冷却；AI Prazer 近战也有概率使用。
- 甲修/头修：只改护具 `dur`，不改变材质或等级；外骨骼完全不可修补。
- 穿透固定 6（尾击 7），远高于普通护具等级，因此护具只能减伤，难以完全挡住。
- 命中部位同射线高度判定。
- 玩家近战用相机真实朝向；AI 用自身 `angle`。
- 体力：冲刺消耗 `baseCost × 疲劳(1~2.2) × 负重系数`；恢复 `baseRegen × (0.55~1.45)`，低体力恢复更慢。

---

## 10. 爆炸

```js
// distance = 爆心到身体胶囊最近点的三维距离
nearestY = clamp(blastY, bodyY - halfH, bodyY + halfH)
distance = hypot(bodyX - blastX, nearestY - blastY, bodyZ - blastZ)
falloff = max(0, 1 - distance/radius)
energy = centerDamage * falloff²
```

- 中心 2600J，7.5m。
- 使用三维距离：高空爆炸对正下方目标不再造成伤害；贴脚爆炸仍按 0m 计算。
- 能量 ≥40J 才结算中心伤害；破片数据为 120 枚预制，模拟按 `fragmentCount`（默认 8~12）抽样，每片 28~98J，走 `explosion` 类型。
- 爆炸/破片/燃烧日志使用 `source`（破片/爆炸冲击波/燃烧），不再继承当前武器名。

---

## 11. 护具数值示例

### 5.56 对 Lv3 插板 + Lv4 纤维（胸部，100m）

- 5.56 的 basePen = pen 3 + impulse 1 = **4**（旧版按 pen 3 算）。对 Lv4 插板 diff = 0。
- 命中能量约 1477J
- 插板（若为 Lv4、`red=0.64`，diff=0，`redMul=1`）：吸收 945J，余 532J，未击穿，钝击 ×0.08 → 42.6J
- 纤维（Lv4、`red=0.64`，diff=0，`redMul=1`）：吸收 27.2J，余 14.8J，钝击 ×0.28 → 4.2J
- 最终约 46.8J 进入胸部（800J 上限）→ 不致命，但两块护具各掉 23.6 / 0.68 点耐久。

### 5.56 对 Lv3 插板（真正写 Lv3 的老配装）

- 5.56 basePen 4 vs Lv3 → diff=1 → `redMul=0.7`，`effRed = 0.52×0.7 = 0.364`
- 1477J → 吸收 537.6J，余 939J，**被击穿**（不乘钝击），直接进胸，两发必倒。


### 7.62×39 对 Lv4 插板（胸部）

- basePen = 5 + 2 = **7**，对 Lv4 diff = 3 → `redMul = 0.2`，`effRed = 0.64×0.2 = 0.128`
- 命中能量 2560J → 吸收 327.7J，余 2232J；**被击穿**，不乘钝击
- 进胸 2232J，约 2.8 发一个 Lv4 胸口。护具耐久只掉 8.2 点——所以“打穿不等于打坏”。

### 秒杀线速查（打胸口，无护具；头部 60J）

| 弹种 | 胸腔 800J | 头部 60J |
|---|---|---|
| 9mm 518J | 2 发 | 1 发 |
| .45 ACP 626J | 2 发 | 1 发 |
| 5.56 1767J | 1 发 | 1 发 |
| 7.62×39 2560J | 1 发 | 1 发 |
| 12.7mm 17010J | 1 发（还把胸口打成 -maxHp×2） | 1 发 |

> 头部 60J 意味着：**任何一颗能穿过你头盔的子弹、甚至一颗未击穿的钝击余能**，只要进到 60J 以上，就是瞬死。


> 这些例子用于审查“是否符合直觉”。如果改动 `red`、`redMul`、钝击系数，必须重算并更新本页。

---

## 12. 审查/调试建议

- 打开训练场，给人偶装不同护具，使用 9mm / 5.56 / 7.62 / 12ga / 玻纤弹分别打头、胸、腹、腿。
- 观察 `targetHpBefore/After`、`armor.absorbed`、`armor.wear`、`armor.pierced` 日志。
- 检查护具耐久是否按 `absorbed/40` 下降，而不是旧版 `/25`；Lv3 对不穿透弹的换算约 77J/点。
- 检查头部是否只走一层护具。
- 检查失血：受伤后 HUD 的血液量、`hypovolemia` 触发点（35%）、健康度是否同步下降。
- 检查死亡回放：敌人被闪/被烧/流血时，头顶状态图标与身体颜色是否出现。
- **难度的直觉基线**：按部位 J 值，Boss 与小兵共用 60/800/600/400/500，Boss 硬在哪全看 `damageResist`、护具 `armorDurMul`、`headHpMul`、外骨骼能量层和 AI 行为档。测试“某角色打某 Boss 要几发”时，别拿 `spec.hp` 当血量算。
