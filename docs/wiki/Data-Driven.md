# 软编码规范（数据 / 逻辑参数 / 台词）

> 硬性要求：**枪械数据、枪械逻辑参数、AI 参数、Boss 行为、角色台词，一律不得写死在 `game.js`。**
> `game.js` 只负责“读表 + 计算 + 表现”，数据与文案统一放 `content.js`（UI 文案放 `locale.*.js`）。
>
> 目的：换数值不改代码、加枪不加分支、换 AI 不复制粘贴、台词可审查可本地化。

---

## 0. 一句话规则

**能进表的，不进代码；能进 `_dlg()` 的，不写字符串。**

新增内容时按这个顺序问自己：

1. 这个数字/文案/武器行为，是不是以后还要调？
2. 如果要调，我是否愿意在 `game.js` 里全局搜索几十处魔法数字？
3. 如果换一个人/AI 接手，他能不能只看 `content.js` 就知道这把枪、这个 Boss、这句台词？

只要有一项答案是“不想/不能”，就把它抽到表里。

---

## 1. 新增的数据表（content.js）

| 表 | 内容 | 读取方 |
|---|---|---|
| `weaponRules` | 枪械**逻辑参数**：后坐力系数 `recoilK`、开镜/蹲下后坐倍率、回正比例、水平抖动、AI 散布倍率、AI 点射发数/冷却、AI 换弹秒数、玩家真实/快速换弹倍率、榴弹初速/重力/抬升 | `AISystem._weaponRule()` → `_fireWeapon` / `_updateSpeedFeedback` / `_combat` / `_startReload` / `_fireLauncher` |
| `aiRules.default` | 通用 AI 手感：近身距离、间距余量、交火距离、推进/后撤/侧移、反应时间、点射、包抄间距、掩体 | `AISystem._aiRule()` → `_combat` / `_combatMove` / `_meleeCombat` |
| `bossProfiles` | 每名 Boss 的交战距离、侧移、血量阶段、导弹 CD、召唤增援、冲刺、掩体行为 | `AISystem._bossProfile()` → `_bossMove` / `_bossAbilities`；`GameWorld._bossSummon` / `_fireBossMissiles` |
| `asce.default` | Assee 异常容器：概率、延迟、破坏倒计时、感知半径、奖励、Moments 职责列表、警告/破坏台词 | `GameWorld._scheduleAsce/_spawnAsce/_updateAsce/_breachAsce/_spawnMomentSquad` |
| `enemies.moment_*` | Moments『初等』六职责：`partScale` / `damageResist` / `headArmor` / `armorDurMul` / `headHpMul` / `weapons` / `melee` / `ai` / `momentRole` | `EntityStatus` / `_spawnEnemy` / `_spawnMomentSquad` |
| `dialogue` | 全部角色台词：友方报点/闲聊/计划/救援/背叛、小队计划、Boss 增援播报 | `GameWorld._dlg(key, params)` → `_squadSay` / `addAlert` |
| `enemies.*`（Boss 字段） | `bossPartScale` / `damageResist` / `headArmor` / `armorDurMul` / `headHpMul` | `EntityStatus` / `GameWorld._spawnEnemy` |

> 枪械**数值**（质量、初速、穿透、射程、散布、RPM、弹匣）仍然只放 `weapons` / `ammo` 表；
> `weaponRules` 只放“手感与 AI 逻辑”，两者不重复。

---

## 2. 加一把枪（不改 game.js）

1. 在 `content.js` 的 `WEAPONS` 加一条：`w/h/weight/ammoType/rpm/mag/reload/range/spread/auto/fireModes/pellets/recoil/stability/handling/...`。
2. 在 `content.js` 的 `AMMO` 里确认口径存在；没有就补弹药。
3. 在 `locale.zh-CN.js` / `locale.en-US.js` 补 `content.weapon.<id>.name/desc`。
4. 只有这把枪需要偏离同类手感时，才在 `weaponRules` 加一条**同名 id 覆盖**（例如 `lmg556: { aiReload: 4.6 }`）。
5. 不要改 `_fireWeapon`：它已经按“id 覆盖 → 武器类别 → default”读表。

武器类别由 `AISystem._weaponClass(def)` 自动判断（launcher / shotgun / sniper / pistol / smg / lmg / rifle），
新增类别时才需要改这个函数，并在 `weaponRules` 加一组默认值。

---

## 3. 加一句台词（不改 game.js）

1. 在 `content.js` 的 `DIALOGUE` 加 key，例如 `'ally.reloadCover': '我换弹，帮我掩护！'`。
2. 调用处只写 `world._dlg('ally.reloadCover')` 或 `this._dlg('ally.reloadCover', { name: ... })`。
3. 需要随机时写数组；需要中英双语时写 `{ zh: [...], en: [...] }`（缺 `en` 时回退中文）。
4. 占位符统一用 `{name}` / `{dist}` / `{enemy}` 这种花括号形式。
5. `DIALOGUE` 的 value 可能是字符串/数组，**注册时必须包成 `{ zh: ... }`**，不能直接 `registerAll`（会把字符串拆成字符对象，UI 就会泄露 `ally.xxx` 引用）。

**禁止**在 `game.js` 里出现新的中文台词字符串，包括 `_squadSay('……')`、`addAlert('……')` 的直接文本。

---

## 4. 调 AI / Boss（不改 game.js）

### 普通 AI
- 改 `aiRules.default`：间距、反应、点射、侧移、包抄。
- 单个兵种性格改 `enemies.<id>.ai`：`aggression / composure / perception / opportunism / keepDistance / meleeBias / switchBias / grenade`。

### Boss
- 行为档改 `bossProfiles.<enemyId>`：`preferredRange / backOffRange / strafeMul / phase / missile / summon / cover / dash`。
- 体质改 `enemies.<bossId>`：`bossPartScale / damageResist / headArmor / armorDurMul / headHpMul`。
- 新增 Boss 必须同时补 `bossProfiles`，否则只会走普通 AI 移动（不会召唤/冲刺/导弹节奏）。

### 阶段与召唤
- `phase: [0.62, 0.32]` 表示血量降到 62%、32% 时各进一阶。
- `summon[].atHp` 为触发血量；`ids` 为 `enemies` 表 id；`count` 为数量。
- 召唤物继承 Boss 的难度倍率，并在 `GameWorld._bossSummon` 中立即进入战斗。

---

## 5. 禁止事项（违反即回滚）

1. **禁止**在 `game.js` 里新增 `0.00015`、`2.5`、`0.5 + Math.random() * 0.8` 这类枪械/AI 魔法数字——先查 `weaponRules` / `aiRules`。
2. **禁止**在 `game.js` 里写角色台词——先查 `DIALOGUE`，用 `_dlg()`。
3. **禁止**给同一把枪建第二套数值来源（例如 `weapon.rules` 与 `weaponRules` 并存）。
4. **禁止**让 Boss 行为按名字分支（`if (spec.id === 'boss_krona')`）——按 `bossProfiles` 的能力字段分支。
5. **禁止**在 `content.js` 写运行时逻辑；表只描述“是什么”，不描述“怎么跑”。
6. **禁止**只改 `content.js` 不更新 Wiki：数值/行为表变了，必须同步本页与 `Changelog.md`。

---

## 6. 表现层与 Unity 迁移约定

- **数据**（枪械/配件/近战 moveset/敌人/Boss/Assee/Moment）：只放 `content.js`，未来可直接导出成 Unity 的 ScriptableObject / JSON 数据。
- **表现**（第一人称枪模、配件挂点、检视动作、刀术动画、激光/灯光、P 空间特效）：目前在 `game.js` 的 `_ensureViewmodel`、`_updateSpeedFeedback`、`_meleeAttack`、`_updateAimFovAndLaser`、`_spawnAsce/_breachAsce` 中；未来应拆成 Unity 的 Prefab + Animator Controller + VFX Graph，**不要把模型/动画参数写回数据表**。
- **规则**（伤害、后坐、AI 行为）：保持与表现解耦；Unity 侧同一套数据表驱动，不复制第二套数值。
- 新增武器时，`content.js` 的 `weapons`/`weaponRules` 是唯一真相源；新增近战时，`melee.moveset` 的 `label` 同时决定 AO/动画分支（如 `thrust`、`slash_h`、`spin`）。
- 新增 Boss/Moment 时，`bossProfiles`/`asce` 只描述行为，不描述模型；模型名/动画名以后由 Unity 资源侧映射。

---

## 7. 验证清单

- [ ] 新增枪械：能正常开火、换弹、AI 能捡起使用；AI 点射/换弹节奏符合 `weaponRules`。
- [ ] 新增台词：只在 `content.js` 出现；`_dlg()` 能正确替换 `{...}`；英文环境不崩。
- [ ] 改 AI 参数：普通兵不再直线贴脸，交火时会侧移/包抄；近身不会把玩家推着走。
- [ ] 改 Boss：血量阶段会触发召唤/导弹/冲刺；Boss 电池耗尽后仍有普通护甲，不是裸奔。
- [ ] 全文搜索 `game.js`：没有新增中文台词、没有新增枪械/AI 硬编码常量。


---

## 8. 剧情 / 计划树数据（v3.3.0）

| 文件 | 内容 | 读取方 |
|---|---|---|
| `src/story/asaka-plan.js` | 计划树节点：id/父节点/坐标/标签/说明/是否关键节点 | `plantree.js`、`GameApp` |
| `src/story/asaka.prologue.js` | 章节文本、说话人、选项、下一节点、章节关键存档节点 | `story.js` |
| `src/asakaSave.js` | 主模式进度、唯一 autosave、关键节点白名单 | `GameApp`、`PlanTree` |

规则：

1. 章节文件只描述“谁说了什么、给什么选择”，不得出现 DOM/Three.js/存档逻辑。
2. 新增关键节点时，必须同时更新 `asaka-plan.js`、章节的 `autoSaveNode`、`asakaSave.js` 的 `AUTOSAVE_NODES`，三处缺一不可。
3. 演出途中不写盘；自动存档只在章节开始前或章节结束后的关键节点写入。
4. 计划树节点坐标是逻辑画布（1000×640），渲染器只负责缩放，不在 UI 里硬编码剧情。
5. 新章节的 flag 由选项的 `flags` 字段声明，禁止在 `story.js` 里写死分支名。
