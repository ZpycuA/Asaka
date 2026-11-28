# 第二部分 · 代码架构与函数参考

> 本页对应仓库当前代码（2026-11-20）。目标：找函数、看调用链、避免改一处崩三处。
> 代码文件按“引擎层 → 数据层 → 应用层 → UI”从下到上排列；上层可以依赖下层，下层不能反向依赖上层。

---

## 1. 文件职责

| 文件 | 层级 | 职责 | 禁止 |
|---|---|---|---|
| `src/engine.js` | 引擎 | 渲染、物理、输入、事件总线、相机、音频、存档、Profile、DevConsole、i18n | 不写具体玩法数值与武器逻辑 |
| `src/content.js` | 数据 | 所有静态表：弹药/武器/护具/敌人/角色/地图/技能/任务/效果/预设；以及 `weaponRules`（枪械逻辑参数）、`aiRules`（AI 手感）、`bossProfiles`（Boss 行为档）、`dialogue`（台词） | 不含运行时逻辑，不改 `game.js` 状态 |
| `src/game.js` | 应用 | `GameWorld`、`HUDSystem`、AI、战斗结算、背包运行时、靶场、回放、App 流程 | 不直接改 `engine.js` 内部私有状态 |
| `src/inventory.js` | 数据层 | 二维网格、容器、装备、弹链辅助、序列化 | 不依赖 UI/Three.js |
| `src/bagUI.js` | UI | 背包/搜刮/详情/拖拽/装填扣弹/创造物品库入口 | 不直接改 `player.weapons` |
| `src/combatlog.js` | UI | 战斗记录/结算页面 | 不参与伤害计算 |
| `src/market.js` | 业务 | 市场价格/买卖 | 不直接改装备栏 |
| `src/modes.js` | 业务 | `straight` / `asaka` 模式注册与 hooks | 不写具体战斗公式 |
| `src/locale/*.js` | 文案 | 所有 i18n 文本 | 不写逻辑 |
| `src/title.js` | 主大厅 | 主大厅菜单、关于页、入口路由 | 不直接改 GameWorld |
| `src/plantree.js` | 计划树 | SVG 金色树、节点状态、唯一自动存档读取 | 不写剧情文本 |
| `src/story.js` | 剧情 | 3D 场景内剧情 UI、打字机、选项、暂停/隐藏 HUD | 不写章节数据 |
| `src/asakaSave.js` | 主模式存档 | 主模式进度、flag、唯一 autosave、关键节点白名单 | 不碰 Straight 存档/装备 |
| `src/settings.js` | 设置 | asaka/straight 分模式 localStorage 快照 | 不保存语言（语言全局） |
| `src/story/*.js` | 剧情数据 | 计划树节点、章节文本、选项、触发节点 | 不含运行时逻辑 |
| `index.html` | 壳 | DOM 骨架、全局 CSS、Bootloader | 不写复杂游戏逻辑 |
| `maps/*.json` | 数据 | 地图布局/出生点/容器/敌人布置 | 不写脚本 |

---

## 2. 引擎层（engine.js）

### 2.1 主要类

- `Engine`
  - `init({canvas, locale, defaultLocale})`
  - `start()` / `stop()` / 主循环
  - 持有 `renderer / physicsFactory / input / cameraCtl / audio / save / profile / content / i18n / devConsole / bus / modeRegistry / app`
- `ContentRegistry`
  - `register(table,id,spec)` / `registerAll(table,items)` / `load(json)`
  - `get/all/ids/count/has/remove/clear`
  - `validate()`：检查武器→弹药、角色→武器/技能等引用
- `InputSystem`
  - `registerAction(name,{keys,mouse})`
  - `isActive(name)`：键/鼠标/虚拟动作
  - `getMoveVector()`：WASD + 左摇杆 + 触摸
  - `startLeftStick / moveLeftStick / endLeftStick`
  - `startRightDrag / moveRightDrag / endRightDrag`
- `CameraController`
  - `follow(x,y,z)`、`rotate(dx,dy)`、`setDeathPose(roll, drop, pitch)`、`resetDeathPose()`
  - `shake(amp,time)`、`setBob`、`setHurtOffset`
  - `yaw/pitch/target`
- `Renderer`：Three.js 场景/相机/渲染/`clearScene()`
- `Body` / Physics：AABB/圆体、速度积分、raycast
- `SaveSystem`：`data`、`load/save`
- `ProfileSystem`：玩法预设读取/写入、`assess()`
- `AudioSystem`：`play(name,opts)`、空间音效
- `DevConsole`：`register(name,{desc,fn})`
- `I18n`：`t(key,params)`、语言切换事件

### 2.2 输入→动作

`ACTION_MAP`（`game.js` 顶部）是键位唯一真相源：

- `keys`：PC 键
- `mouse`：鼠标键
- `mobile`：位置/尺寸/颜色/模式（hold/click）/是否旋转
- `actionId`：按钮复用动作（如 `fire_left -> fire`）

`GameWorld._registerInputActions()` 把 `ACTION_MAP` 注册进 `InputSystem`。
`GameApp._setupMobileControls()` 根据 `mobile` 生成按钮。
**禁止**在 HTML 里另写一套固定按钮位置。

---

## 3. 数据层（inventory.js）

### 3.1 类

- `GridContainer(w,h)`
  - `items: Map<uid,{x,y,w,h,rotated}>`
  - `isActive`
  - `toJSON/fromJSON`
  - 负责占用/释放/碰撞检测
- `Inventory(content)`
  - `items`、`parentOf`、`containers`、`equipped`
  - `createItem / destroyItem`
  - `addToContainer / removeFromContainer / moveWithinContainer`
  - `transferItem`（跨 Inventory）
  - `equip / unequip`
  - `getDef / getItemValue / getCarryWeight`
  - `isCarried / _isCarryTarget / wouldExceedCarryWeight`（负重硬上限唯一判定）
  - `splitStack`
  - `normalizeLoaded / getLoadedGroups / listCompatibleAmmo / loadAmmoFromItem / unloadAmmo / countCompatibleAmmo / consumeCompatibleAmmo`
  - `resolveLoadedDef(id)`：普通弹药查 `ammo`，`nade:` 前缀查 `nade`；GL-4 弹链统一走这里
  - `mountToExo / dismountExo / getExoMounts`：外骨骼 6 个挂载硬点；挂载枪 `parentOf=外骨骼 UID`，计入负重
  - `applyEmpDamage`：先扣 `empShield` 抗磁层，层破后才进入损坏概率结算
  - `serialize / deserialize`

### 3.2 弹链函数（新增）

| 函数 | 作用 |
|---|---|
| `normalizeLoaded(item)` | 修复/对齐 `loaded.queue`、`qty`、`ammoType` |
| `normalizeMagazine / loadOneRoundIntoMagazine / unloadOneRoundFromMagazine` | 弹匣物品独立存弹；逐发压入/退出一发，容量与口径以配件定义为准 |
| `loadOneRoundIntoWeapon / unloadOneRoundFromWeapon` | 非弹匣武器（转轮/管式/内置弹仓）逐发装填；有实体弹匣时拒绝绕过弹匣 |
| `usesDetachableMagazine(weaponDef)` | `feed:'mag'` 才需要弹匣；`cylinder/internal/tube/belt` 不需要 |
| `listAmmoByCaliber(caliber)` | 弹匣详情/逐发压弹的可选散装弹药列表 |
| `getLoadedGroups(item)` | 按队列顺序返回连续弹种组 |
| `isAmmoCompatible(weaponDef, ammoDef)` | 口径匹配 |
| `listCompatibleAmmo(weaponItem, names)` | 汇总兼容弹药（按 defId 分组，带 uids） |
| `loadAmmoFromItem(weaponUid, ammoUid, count)` | 从指定 stack 追加到弹链尾部 |
| `unloadAmmo(weaponUid, ammoId, count)` | 从弹链取出并创建 ammo item，失败整体回滚 |
| `countCompatibleAmmo(weaponDef, names)` | 备用弹统计 |
| `consumeCompatibleAmmo(weaponDef, count, names)` | 按兼容口径消耗 |

### 3.3 序列化

- `_version = 2`；`items` 为数组，`parentOf` 为 `[uid,path]` 数组，`containers` 为网格 JSON。
- 反序列化 V1/V2 都会调用 `normalizeLoaded` 修复旧武器。
- 新增 item 字段默认会被 `JSON.stringify` 保留；但 `innerGrid` 必须用 `toJSON/fromJSON`。

### 3.4 负重硬上限（唯一判定）

- `maxCarryWeight` 由 `GameWorld._updatePlayer()` 每 0.25s 写成 `carryLimit × 1.35`；离开战局归 0。
- 只有 `isCarried(uid)` 为真的物品才被视为“已在身上”：装备槽、`c:chest/pocket/bag/safe`、以及这些容器里背包的 `inner:` 子物品。
- `c:stash`、`c:loot`（世界容器/地面临时网格）都不算携带；从这些地方搬进随身容器必须计重。
- 所有入口都要过 `wouldExceedCarryWeight()`：
  - `addToContainer`（含 `inner:`，但宿主必须被携带）；
  - `equip`（直接拖到装备槽）；
  - `transferItem(..., 'eq:...')`（跨 Inventory 直接装备）；
  - `installPlate`（按“新板 − 旧板”的净增重计算）。
- 已携带物品挪位置、拆分堆叠（`splitStack` 传 `ignoreWeight`）不重复计重。

---

## 4. 应用层（game.js）

### 4.1 全局类/对象

- `ActionProcess`：同一时间一个动作；`start/cancel/update/getProgress`。
- `CombatSystem`：纯函数 `kinetic / energyAtRange / applyArmor / applyCoupling / energyToHP`。
- `EntityStatus`：部位 HP、伤口、血液、效果、`takeDamage/tick/isDead/isDowned/updateOverallHealth`。
- `AISystem`：感知、警戒、状态机（patrol/investigate/combat/melee/retreat/drone/flee/loot/remove/nade/aid/selfaid）、训练人偶移动、友方 AI（`_updateAlly` / `_allySupport` / `_allyCombatTalk` / `_allyExplore` / `_allyFollowPlayer` / `_findDownedMate` / `_aidDowned` / `_considerSelfAid` / `_aidSelf`）。所有目标移动走 `GameWorld._aiMoveTo`（视线直达或 A* 绕路）。
  - **规则读取**：`_aiRule(world)` / `_weaponRule(world, def)` / `_weaponClass(def)` / `_bossProfile(world, enemy)` / `_bossPhase(enemy, prof)`。
  - **切枪**：`_switchEnemyWeapon` 综合距离、类别、目标护甲/弹种穿透、弹匣/备弹与切换惯性；敌我 AI 共用。
  - **移动**：`_combatMove`（普通 AI 间距/侧移/包抄）、`_bossMove`（Boss 交战距离/侧移/掩体/冲刺）、`_setCrouch`（保持脚底高度，避免模型弹跳）。
  - **Boss**：`_bossAbilities`（阶段、导弹、召唤、冲刺）→ `GameWorld._bossSummon` / `_fireBossMissiles`。
  - **台词**：所有角色台词走 `GameWorld._dlg(key, params)`，数据在 `content.dialogue`；禁止在 `AISystem` 里写死中文对白。
- `HUDSystem`：HUD 更新、伤害指示、状态栏/战术状态、护甲、训练 HUD、人偶详情。`_hitMarker(isHead, opts)` 负责爆头双线、耦合防护虚线与命中反馈；闪光/震撼/燃烧/EMP 的群体效果也会调用。
- `GameWorld`：一局世界的全部运行时。
- `GameApp`：菜单、配装、市场、开始/结束、训练设置、创造模式、死亡回放入口。

### 4.1.1 软编码数据表（新增）

| 表 | 读取入口 | 说明 |
|---|---|---|
| `weaponRules` | `AISystem._weaponRule(world, def)` | 后坐力系数、AI 散布/点射/换弹、玩家换弹倍率；查找顺序 id → 类别 → default |
| `aiRules.default` | `AISystem._aiRule(world)` | 间距、交火距离、反应、点射、侧移、包抄、掩体 |
| `bossProfiles` | `AISystem._bossProfile(world, enemy)` | 每名 Boss 的 range/phase/missile/summon/cover/dash |
| `dialogue` | `GameWorld._dlg(key, params)` | 角色台词；数组随机、`{zh,en}` 双语、`{name}` 占位符 |
| `enemies.*` Boss 字段 | `EntityStatus` / `GameWorld._spawnEnemy` | `bossPartScale/damageResist/headArmor/armorDurMul/headHpMul` |

完整规范见 [Data-Driven](Data-Driven.md)。

### 4.2 GameWorld 构造/启动

- `constructor(engine, config)`
  - 解析 `mapSpec/charSpec/modeConfig`
  - 初始化 `training` 配置、`trainingStats`
  - `physics/player/enemies/containers/...`
  - `HUDSystem/CombatLog/ActionProcess`
  - 回放缓冲
- `start()`
  - `_setupScene -> _spawnPlayer -> _spawnEnemies -> _spawnExtracts -> _spawnContainers`
  - `_registerInputActions`
  - 相机跟随、`running=true`、模式 hooks、日志
- `update(dt)`
  1. 回放分支 `_updateReplay`
  2. `time += dt`
  3. 状态 `status.tick`
  4. 击倒超时
  5. `_updatePlayer`
  6. `_checkPlayerEffects`
  7. `actionProcess/敌人/探索记忆/声纹/撤离/容器/附近列表/曳光/投掷物/无人机/移动端按钮/警报`
  8. `physics.step` + `_syncMeshes` + `_recordReplayFrame`
  9. 相机跟随/死亡相机
  10. `hud.update`
  11. 时间限制
- `destroy()`：清动作、背包、轮盘监听、回放图标、场景、物理、无人机、UI 类。

### 4.3 玩家/武器

| 方法 | 作用 |
|---|---|
| `_spawnPlayer()` | 建玩家实体、武器组、护具、技能、状态 |
| `_buildWeapon(id)` | 给 AI/临时武器建运行时（`loaded.queue` 初始满弹） |
| `_buildWeaponFromInventory(inv, slot)` | 从装备槽建运行时；`mag/reserve/loaded` 指向 item |
| `_syncWeaponsFromInventory()` | 背包变化后同步 `player.weapons` |
| `_syncArmorFromInventory()` | 背包/装备变化后从装备槽重建 `player.armor` |
| `_updatePlayer(dt)` | 输入、体力、移动、射击、换弹、技能、护具；含跳跃净空/自动跨越 |
| `_carryLimitFor/_strengthPullKg/_meleeStrengthMul/_climbHeight` | 人类 34kg 基准 + Prazer `140·ln(A)` 力量折算 |
| `_tailStrike` | Prazer 尾击：2.8m、2.2× 拳击能量、24 体力、1.1s 冷却 |
| `_updateExoskeleton/_exoActive` | 外骨骼电量、目镜标记、自动火力、冲刺/喷气耗电 |
| `_syncExoMounts/_selectExoMount` | 6 个挂载硬点运行时同步 / 4~9 接管 |
| `_toggleExoVisor/_toggleExoAutoFire/_updateExoHud/_updateExoOverlay` | 头显开关、NIPsel 冷启动、蓝色叠层与挂载 HUD |
| `_exoJet` | 空中二段喷气（电池 -7） |
| `_fireLauncher` | GL-4 四联榴弹炮：从 `nade:` 队列取投掷物实物发射 |
| `_spawnThermoField/_updateThermoFields` | 温压气体聚集/扩散与持续超压、缺氧结算 |
| `_fireBossMissiles` | Boss 导弹巢齐射（半追踪、近炸） |
| `_updateBossBar` | 顶部 Boss 名称/血量/距离状态条；小地图与光柱定位 |
| `_bossSpeak` | Boss 台词字幕 + SpeechSynthesis 语音 |
| `_spawnTrainingAI/_setTrainingGod` | 训练场按 content id 召唤真实 AI、调试无敌 |
| `_tryAIVault` | AI 翻越矮墙/箱子，避免绕障原地打转 |
| `_applyArmorLayers` 外骨骼分支 | 每点电量抵消 50J，最多吸收 78%，头部/爆炸/钝击全覆盖 |
| `_applyMedicalUse` repair 分支 | 甲修/头修：只改 shell/visor 或 fiber/plate 的 `dur`，跳过外骨骼 |
| `_tryMantle/_pointBlocked/_ceilingClearance` | 自动跨越/攀爬与低顶防挤飞；落点只比近侧表面多 0.35m |
| `_hasFriendlyInLine` | AI 枪线友军检查，避免同阵营互射 |
| `_noteFriendlyFire/_triggerBetrayal` | 连续/重度误伤队友后判定背叛 |
| `_updateBetrayedAlly` | 叛徒队友脱离枪线并把玩家当敌人 |
| `_fireWeapon(owner, weapon, isPlayer, target)` | 取 queue 首发、弹道、伤害、后坐、曳光；玩家射线从相机中心发出 |
| `_ensureViewmodel/_clearViewmodel` | 按武器类别 + `mods.list` 生成/释放第一人称枪模（瞄具/消音器/扩容弹匣/握把/激光/灯） |
| `_flashPlayerMuzzle` | 第一人称枪口焰 + 短促点光；位置取视图武器 `muzzleZ` |
| `_updateSpeedFeedback` | 后坐回正、枪模摆动/后坐、开镜 FOV（唯一 FOV 写入点）、屏息/开镜降摆 |
| `_updateAimFovAndLaser/_toggleWeaponDevice` | 激光细束/小光点、战术灯 SpotLight、电量与 HUD；无人机视角直接隐藏 |
| `_cancelCurrentAction` | 按钮/Backspace 统一取消当前 `actionProcess`，并阻止换弹自动重开 |
| `_startWeaponInspect/_updateScopeOverlay` | 检视武器动作；高倍镜黑边圆孔遮罩 + 十字分划 |
| `_applyKnockback` | 按实际动能/质量计算击退；≥3000J 进入玩家失衡或 AI 硬直 |
| `_destabilize / _updateStability / _applyStabilityImpact` | 身体稳定性：拳/尾击/枪托按力量差扣稳定性；散布/后坐/移速惩罚，恢复后回正 |
| `_knockdownEntity` | 爆炸冲击波/极端力量差击倒；倒地和起身期间禁止移动/开火/换弹 |
| `_quickMelee / _nearestMeleeTarget / _updateQuickMeleeHint` | 玩家应急近战：优先随身刀、无刀拳击；靠近 2.9m 自动显示提示/移动端按钮 |
| `_scheduleAsce/_spawnAsce/_updateAsce/_breachAsce` | Assee 概率降临（调度在地图容器早退之前）、独立锚定站/撕裂口、全图暴露、90s 锚定、180s 失稳、P 空间波动与撕裂特效 |
| `_buildAsseeContainerMesh/_buildPspaceRift/_spawnAsceStation` | 悬浮多面体结晶容器、狭长裂缝 + 碎片/电弧、锚定站三柱法阵；全部在 `_removeAsceFx` 统一释放 |
| `_pspacePulse/_spawnPspaceWave/_updatePspaceWaves` | P 空间波动的可见扩张环与 Prazer 结算（`pspace_echo + nausea`）；容器/裂口周期触发 |
| `_findCarriedAsceCore/_isItemCarried` | 只把 chest/bag/pocket/safe/装备槽视为“携带”，旧局核心与仓库核心不触发事件 |
| `_extractCorpseAssee/_absorbPrazeCoreItem/_rejectAssee` | Prazer 尸体核心的等级校验、提取为 `praze_core` 物品（L1~L5/INC）、背包内吸收、人类 `Kaprz,haispelo` 拒绝 |
| `_spawnMomentSquad/_momentWarn/_momentProvoke/_momentTactics` | 生成 Moments『初等』六职责、先警告后开火、开火/携带/超时挑衅、盾兵前沿盾位与携带员直取容器 |
| `_momentCatCatch` | Cat Cat Catch 狩猎状态：声音/附近 Prazer/技能/P空间波动/失去视野触发；全队加速、加侵略性、加精度并共享目标；Prazer 收到“位置暴露：被遡踪” |
| `_momentSupplyTick/_spawnMomentSupplyPortal/_refillMomentFromPspace` | 缺弹/重伤 Moments 撕开 P空间补给口，补弹药/血量/破片 |
| `_ensureMomentScoutDrone/_updateMomentDrones/_momentDroneDropNade/_damageMomentDrone` | 侦查医疗兵的实体无人机：标记共享、投破片、可被子弹击落；凯特额外获得方位直觉 |
| `_collapseAsceContainer` | 核心被拿走后立即移除晶体模型与容器刚体，避免原地残留特效 |
| `_momentTryTakeCore/_takeCoreByMoment/_momentStoleAsce/_dropMomentCarriedCore` | 携带员从容器/地面取走核心 → 向裂口撤退；击杀携带员核心掉回地面；进入裂口判 Moments 得手 |
| `_startReload()` / `_finishReload()` | 换弹动作与弹链填充；可拆弹匣优先换备用匣，无备用匣走逐发压弹 |
| `_findSpareMagazine / _spareMagCount` | 查找/统计随身已压好的备用弹匣；HUD 显示“备用弹匣 N” |
| `startLoadRounds / _loadOneRound / isItemLocked` | 逐发压弹/装填进程：0.42~0.85s/发，可中断且保留已压子弹，进程期间锁定弹匣/枪/弹药堆 |
| `_toggleWeaponDevice / _syncWeaponDeviceAggregate` | 激光/战术灯按单件 `item.deviceOn` 独立开关；`p.laserOn` 只做兼容汇总 |
| `_cycleFireMode()` / `_fireModeLabel(mode)` | 开火模式 |
| `_toggleSideSight()` | 侧瞄切换：`sideSight` 配件存在时枪身侧倾、开镜保持 1x；F4/HUD/移动端按钮 |
| `_spawnScopeGlint/_updateScopeGlints` | 敌方狙击镜反光：3D 高光 + 方向/距离提示，周期性出现 |
| `_startThrow/_doThrowNow/_selectThrowable` | 投掷物 |
| `_pullThrowablePin/_updateThrowFuse/_detonateHeldThrowable` | 保险式拔销、手中引信、自爆 |
| `_throwSpeed` / `_updateThrowPreview` | 蓄力速度与抛物线预览 |
| `_aiGrenadeList/_takeEnemyThrowable/_aiThrowGrenade` | AI 投掷物库存与抛物线投掷 |
| `_spawnAllies/_allyArmorFromPlayer` | 匹配友方 AI（装备按玩家当前价值生成） |
| `_findDownedMate/_aidDowned/_reviveByAI` | 同阵营互救（敌我通用） |
| `_considerSelfAid/_aidSelf` | 敌我 AI 自我急救：停步蹲下 2.6~3.6s，按伤情选绷带/血浆/手术包 |
| `_allyExplore/_allyFollowPlayer/_pickAllyExplorePoint` | 队友主动探索未探索区域；离队长过远时归队 |
| `_allyUseSmoke` | 队友重伤/挨打/后撤时在敌我之间拉烟；只消耗真实烟雾弹库存 |
| `_allyAvoidPlayerLine` | 玩家开镜/屏息时，队友横移离开准星枪线，减少误伤 |
| `_allyAttackEnemyDrone` | 队友主动射击敌方侦察无人机（有枪线/有弹时） |
| `_allyPrep` | 开局 7~12s 蹲守整备/观察，不主动散开 |
| `_allyProjectileDefense / _allyShootProjectile` | 队友横移规避来袭导弹，并尝试用枪打爆（命中率随距离/训练度衰减） |
| `_updateExplorationMemory/_markExplored/_isExplored` | 10m 网格探索记忆（玩家 + 存活队友） |
| `_updateAllyCarePanel/_useMedicalOnAlly/_applyMedicalToAlly` | 靠近队友查看伤情并用自己的药品救治 |
| `_issueSquadOrder/_getSuggestionPoint/_spawnSquadOrderMarker` | 准星/无人机准星建议点（前进/撤退） |
| `_squadSay/_renderSquadChat` | 队内顶部战术字幕（最多 4 行、不可滚动/不可误触） |
| `_updateSquadPlan/_nearestExtract` | 队友自主计划：搜索/交战/撤离；撤离区/时间不足时全队靠拢 |
| `_ensureNavGrid/_findNavPath/_navLineClear/_aiMoveTo` | 2m 网格 + A* 寻路；视线直达时走直线，被挡时绕路 |
| `_collectCarriedItems` | 递归遍历胸挂/背包/口袋/安全箱与嵌套 `innerGrid`（医疗/投掷物共用） |
| `_markEntity/_findMarkedTarget` | 同阵营共享标记（带 `markedFaction`） |
| `_entityVoice/_updateEntityVoice` | 敌我受伤/疼痛/着火叫唤 |
| `_hint(text, cls)` | 玩家即时提示（HUD 横幅 + 背包 toast） |
| `_avoidObstacles` | AI 障碍规避（AISystem） |

### 4.4 战斗/伤害

| 方法 | 作用 |
|---|---|
| `_raycastBullet(...)` | 射线、射程衰减、穿透衰减、部位判定、调用伤害 |
| `_applyArmorLayers(entity, energy, pen, hitPart, damageType)` | 护具分层 + 钝击 |
| `_damageEnemy(enemy, energy, pen, hitPart, byPlayer, damageType)` | 敌人伤害结算、累计伤害、击倒/击杀 |
| `_damagePlayer(player, energy, pen, part, srcX, srcZ, sourceEnt, damageType)` | 玩家伤害、受击反馈、技能打断、死亡/击倒 |
| `_syncEntityLifecycle(ent, isPlayer)` | 每帧按 status 同步死亡/击倒；持续伤害致死入口 |
| `_setEntityDowned(ent, down, isPlayer)` | 击倒姿态/相机/提示与恢复 |
| `_applyAmmoEffects(status, part, ammoDef)` | 燃烧/玻纤 |
| `_applyFlash/_spawnLightField/_dazzleScreen` | 距离/视线衰减的闪光、真实光场、强光刺眼 |
| `_applyEmpField/_spawnEmpRings` | 电磁场、电子物品损坏、EMP 警告 |
| `_spawnFireField/_updateFireFields` | 燃烧瓶火焰区域 |
| `_spawnSmokeField/_updateSmokeFields/_smokeBlocksLine` | 烟雾弹烟幕：可视球体 + 遮挡 AI 视线，不阻挡子弹 |
| `_updateStatusVfx` | 敌人身上的玻纤碎片/火焰挂件 |
| `_meleeAttack(owner, weapon)` | 近战射线与伤害 |
| `_explodeProjectile/_spawnExplosionFX` | 投掷物爆炸 |
| `_killEnemy/_playerDown` | 死亡、尸体、死亡记录；Prazer 尸体额外生成 `prazeCore`（A 等级 / L1~L5 / INC），供搜索界面的 Praze 栏读取 |

### 4.5 背包/搜刮/训练

| 方法 | 作用 |
|---|---|
| `_updateNearbyList()` | 附近容器/尸体/地面物品 |
| `_openSearch/_closeSearch` | 搜索容器 |
| `_dropItemToGround` | 丢物品 |
| `_applyTrainingSettings()` | 应用靶场设置，配置人偶 |
| `_configureTrainingDummy(enemy)` | 从固定 `PART_MAX_HP` 硬复位血量/部位/伤口/状态/护甲/姿势；清 `_dummyInfoSig` |
| `_updateTrainingHUD()` | 攻击数据面板 + 人偶详情 + training-mode |
| `_openTrainingModal/_applyTrainingModal` | 靶场设置弹窗 |
| `_refillTrainingLoadout()` | 补满玩家弹匣/护具/体力 |

### 4.6 无人机

| 方法 | 作用 |
|---|---|
| `_toggleDroneControl()` | 进入/退出操控 |
| `_exitDroneControl(reason)` | 统一退出：清 HUD/相机/按钮；本体受击、倒地、失联都走它 |
| `_updateDroneControl(dt,e,p)` | WASD 平移、升降、碰撞、持续标记 |
| `_droneMark/_droneScanAttack/_droneThrowPayload` | 标记/光学攻击/手雷与 EMP |
| `_spawnDrone/_removeDrone/_destroyDrone` | 生命周期；坠毁时剩余 payload 抛散为真实弹体并殉爆（不再掉盒子） |

> 无人机不再有「标记信标」投掷物：自动标记 + 光学标记已覆盖同一功能，`_droneDropBeacon()` 与 `marker` 爆炸分支已删除。

### 4.7 死亡回放

| 方法 | 作用 |
|---|---|
| `_recordReplayFrame(dt)` | 10Hz 全实体快照 |
| `_recordReplayShot(owner,...)` | 敌方开火事件 |
| `_recordReplayFx(type,data)` | 爆炸/闪光/技能光环事件 |
| `_startReplay(frames,...)` | 进入回放、清屏、建枪模、HUD |
| `_updateReplay(dt)` | 插值、相机、HUD、曳光、事件 |
| `_applyReplayFrame/_applyReplayEffects/_updateReplayBadges` | 实体/状态图标/材质发光 |
| `_endReplay()` | 清理并回调 `GameApp._onReplayEnd` |
| `_resetScreenFx()` | 清死亡蒙版/眼皮/滤镜 |

### 4.8 GameApp

| 方法 | 作用 |
|---|---|
| `boot()` | 存档、菜单、全局事件、仓库、市场 |
| `_setupMenu/_renderOptions` | 地图/角色/预设/平台 |
| `startMatch(kind)` | 加载地图、建世界、进入战局；训练场 mapSpec/layout 兜底 |
| `_onMatchEnd(success,stats)` | 结算、掉落、战斗记录/结果页 |
| `_quitToMenu()` | 销毁世界、保存库存、清 UI |
| `_ensureInitialInventory/_stripInventoryForLoadout` | 配装初始化/清空 |
| `_preloadSpareMags` | 制式券备用弹匣：创建标准匣并从随身散弹逐发压满（轻1/标准2/重装3/特种4） |
| `_openTrainingModal/_applyTrainingModal` | 靶场设置 |
| `_openCreativeModal/_renderCreativeList/_giveCreativeItem` | 创造模式物品库 |
| `_playDeathReplay/_onReplayEnd` | 回放入口/返回 |
| `_clearMatchUI()` | 统一清理战局临时 DOM |
| `_registerDevCommands()` | DevConsole 命令 |

---

## 5. 关键数据流

### 5.1 开局

```
GameApp.startMatch(kind)
  → 清 UI / 初始化配装
  → mapSpec + layout fetch（训练场兜底）
  → new GameWorld(...)
  → world.start()
      → scene / player / enemies / extracts / containers
      → HUD / 相机 / running
```

### 5.2 射击

```
_updatePlayer → _fireWeapon
  → queue.shift() 取 ammoId
  → 弹道/散布/后坐
  → _raycastBullet
      → energyAtRange
      → pen 衰减
      → 部位判定
      → _damageEnemy / _damagePlayer
          → coupling → armor layers → status.takeDamage
          → 伤口/失血/状态/死亡
```

### 5.3 装填

```
BagUI._loadAmmoFrom / GameWorld._finishReload
  → normalizeLoaded
  → 按 loadedPreference / 兼容口径 找 ammo item
  → queue.push(ammoDefId)
  → qty = queue.length
  → ammo.qty -= take / destroy if 0
```

### 5.4 扣弹

```
BagUI._unloadAmmoFrom
  → Inventory.unloadAmmo
  → 按 ammoId 从 queue 取
  → createItem('ammo')
  → addToContainer(bag/chest/pocket/safe/stash)
  → 全部成功才提交 queue
```

### 5.4.1 尸体搜索

```
_killEnemy → lootInv 全部 item.searched=false
BagUI 点击装备/物品 → _startSearchLoot(uid) 0.8s
或 BagUI「搜索尸体」→ ActionProcess('search_corpse') 1.2~6.5s，onTick 逐件翻开
  → 打断时已翻开的 searched=true 保留
```

- 尸体装备槽未搜索时只显示 `?`；搜索完成后才显示名称/可拖拽。

### 5.5 跨容器转移

```
BagUI drag
  → 同 Inventory: addToContainer
  → 跨 Inventory: transferItem
  → 目标装备槽: eq:<slot>
```

### 5.6 AI 投掷

```
AISystem.update -> _considerGrenade
  → 检查 ai.grenade / lootInv 投掷物 / 7~34m / _nadeCd / 队友爆区 / 自身安全距离
  → state='nade'，记录 _nadeDefId/_nadeWindup
_update -> _throwEnemyGrenade
  → 前摇 0.7~1.2s + 拉环声
  → GameWorld._aiThrowGrenade
      → _takeEnemyThrowable（销毁 lootInv 中的一枚实物）
      → 计算抛物线速度，推入 projectiles
      → 与玩家投掷共用 _updateProjectiles/_explodeProjectile
```

- AI 投掷物库存的唯一真相源是 `enemy.lootInv` 中的 `nade` 物品，不是独立计数器。
- 闪光/震撼在 `_explodeProjectile` 中把 AI 投掷者作为 `exclude`；破片/燃烧不豁免，所以用安全距离避免自伤。
- 破片/冲击波判定用“爆心到身体胶囊最近点”的三维距离，不是水平距离；高空爆炸不会波及正下方。

### 5.7 死亡

```
_damagePlayer → status.takeDamage → isDead
  → _playerDown
      → 关闭动作/背包/搜索/轮盘
      → 记录 combatLog downed/death
      → 生成死亡录像 _deathRecord
      → 死亡相机/眼皮
      → 2s 后 _end(false)
  → GameApp._onMatchEnd
      → 掉落装备/容器
      → 战斗记录 / 死亡回放入口
```

### 5.8 友方 AI 小队

```
菜单 chk-match-allies → GameApp.menuState.matchAllies → flags.matchAllies
startMatch → GameWorld(config.matchAllies)
start → _spawnAllies（仅非训练场）
  → 2 名 isAlly，faction='player'
  → 武器/护甲按玩家当前 equipped 生成
AISystem.update
  → if (enemy.isAlly) _updateAlly
      → _findTarget / _findMarkedTarget(120m)
      → 互救 / selfaid / 建议 / 撤退 / _combat / _considerGrenade
      → 有共享标记：investigate 最后位置（18s）
      → 无目标：_allyExplore（未探索区域）或 _allyFollowPlayer（>50m 归队）
      → _allySupport：共享标记、医疗兵包扎、低血量/计划对话
      → _squadSay → #squad-chat
```

- 友方 AI 仍在 `world.enemies` 里：复用伤害、护甲、感知、尸体掉落；`faction='player'` 让 `isHostile` 自动区分敌我。
- 共享标记唯一入口：`world._markEntity(target, duration, by, faction)`；同阵营 AI 用 `AISystem._findMarkedTarget` 获取最后已知位置。敌方无人机/侦察技能沿用同一套即可。
- 队友读取 120m 内共享标记并追击 18s；标记过期后清掉旧 `targetPos`，不会永远朝同一个空点走。
- 探索：`_updateExplorationMemory` 每 0.5s 把玩家/队友周围 3×3 个 10m 格记为已探索；`_pickAllyExplorePoint` 选未探索、视线可达、离队长 ≤48m 的点；`_allyExplore` 到达后标记并换点。`_stuckT > 1.2` 会强制换点。
- 自我急救：敌我通用 `selfaid` 状态；`_considerSelfAid` 检查药品/出血/健康度，`_aidSelf` 停步蹲下，完成时 `_aiHealByAI` 按伤情挑药。没有视线或撤退到 16m 外才允许停步。
- 对话只做文字字幕（桌面顶部中央 / 移动端小地图下方），不用面板框、`pointer-events:none`、最多 4 行；`destroy()` 清空 `#squad-chat`。
- 训练场不刷队友，避免和人偶逻辑混用。
- 互救：`_findDownedMate` 找 16m 内同阵营倒地者；`_aidDowned` 到 2.3m 后 3.2s 调 `_reviveByAI`。敌方 AI 走同一套，靠 `_spawnEnemy` 发放的基础药品。
- 玩家救治：`_updateAllyCarePanel` 每帧找 4.5m 内最近友军，显示 `#ally-care`；`U` 释放 Pointer Lock 后点击药品；`_useMedicalOnAlly` 走 ActionProcess，完成时才消耗物品。
- 建议：`P/O` -> `_issueSquadOrder` -> `_getSuggestionPoint` 射线落点 + 8s `_squadOrder`；无人机操控中同样可发，标记点取无人机准星落点。队友在 `_updateAlly` 中按血量自行决定是否执行。
- 撤退：友军血量 <55% 或出血 ≥2 级进入 `_allyRetreating`，>68% 且无出血解除；撤退到 16m 外会进入 `selfaid` 自我包扎。

### 5.9 AI 寻路与撤离计划

```
_aiMoveTo(enemy, tx, tz, speed, dt)
  → _navLineClear? 直线
  → 否则 _findNavPath → _ensureNavGrid（首次构建 2m 网格）
  → 记录 _navPath/_navGoal/_navRepathAt，1.4~2.0s 重算
  → 所有 AISystem 移动入口（investigate/loot/aid/flee/patrol/follow/explore/order/retreat）调用
```

- 网格用 `obstacles + containers` 的 AABB/圆体，按 `yMin/yMax` 过滤可跨越/头顶障碍；斜向禁止切墙角。
- `_navLineClear` 用胸口高度射线，只有墙体/大箱子会触发绕路，开阔地仍是直线。
- `_updateSquadPlan` 每 6s 计算 `search/fight/extract`；玩家进入撤离区、撤离开始或剩余 <75s 时，`_updateAlly` 的 `extract` 分支优先于搜索/交战，到点后就地防守。
- 小地图 `_renderMinimap` 读 `world.allies`，绿点=存活、红点+白叉=倒地。
- 友谊/背叛：`_fireWeapon` 的 AI 分支先跑 `_hasFriendlyInLine`；玩家枪/近战命中队友走 `_noteFriendlyFire`，第一次警告，6s 内第二次或单次 >60% 健康/击倒才 `_triggerBetrayal`。背叛后 `_updateAlly` 直接转 `_updateBetrayedAlly`，不再跟随/治疗/接受命令。
- 战斗记录：`FILTER_GROUPS.dealt` 包含非 self 的 `downed`；`taken` 只包含 `self=true` 的 `downed`。

---

## 6. 扩展指南

### 6.1 新增武器

1. `content.weapons` 注册。
2. `content.ammo` 有匹配 `caliber`。
3. `locale.*.js` 补 name/desc。
4. 是否需要新开火模式？`fireModes` 加值。
5. Wiki：Game-Design 表格 + Changelog。
6. 测试：装填/扣弹/混合弹链/换弹/开火模式。

### 6.2 新增弹药

1. `content.ammo` 注册 `caliber/massG/v0/pen/impulse/effects`；独头弹等特殊弹种用 `pellets` 覆盖武器弹丸数。
2. 如有效果：`content.effects` 注册，`_applyAmmoEffects` 处理。
3. `stackLimit`、`weight`、`value`。
4. 检查所有同口径武器的 `reserve`/装填列表是否自动包含。
5. 回放：是否需要在 `_recordReplayFx` 中记录特殊表现。

### 6.3 新增护具

1. 对应装备表（`helmetShell/helmetVisor/vestFiber/vestPlate`）注册 `armorLv/maxDur`。
2. `content.armor` 有对应 `lv` 的 `red`。
3. 敌人 `gear.armor` 引用 defId/lv。
4. 检查 `_applyArmorLayers` 层级：壳/面罩/插板/纤维。
5. 训练场下拉会自动出现（按 `armorLv` 过滤）。

### 6.4 新增持续效果

1. `content.effects` 注册 id/name/icon/positive。
2. `status.addEffect(id, duration, strength)`。
3. 在 `EntityStatus.tick` 处理持续伤害/失血/移速等。
4. HUD 状态栏自动显示；回放自动显示头顶图标。
5. 如影响伤害/操控，在 `_fireWeapon` / `getMoveSpeedMul` / `getHandlingMul` 接入。

### 6.5 新增瞬时表现

1. 使用 `_spawnExplosionFX` / `_spawnFlashFX` / `_spawnSkillAura`。
2. 它们内部调用 `_recordReplayFx`，自动进入回放。
3. 新类型需在 `_playReplayFxEvent` 增加分支。

### 6.6 新增地图

1. `content.maps` 注册 `size/obstacleCount/enemyCount/layoutUrl`。
2. `maps/<id>.json` 写布局。
3. 训练场不要进正式地图选择（`training:true` 会被过滤）。
4. 测试：出生点不卡墙、敌人不在墙内、撤离点可达。

---

## 7. 单一真相源与禁止事项

| 数据 | 唯一来源 | 禁止 |
|---|---|---|
| 武器弹匣 | `item.loaded.queue` / `qty` | `item.mag`、`weapon.mag` 平行字段 |
| 物品位置 | `parentOf` | 第二套容器归属逻辑 |
| 容器内容 | `GridContainer.items` | `c.grid` 与 `c.loot` 并存 |
| 玩家武器运行时 | `_syncWeaponsFromInventory()` | 直接读写 Inventory 当运行时 |
| 键位 | `ACTION_MAP` | HTML 写死按钮位置 |
| 护具吸收 | `content.armor.red` | 代码里再写一套等级表（旧 bug） |
| 弹种兼容 | `isAmmoCompatible` | 各处散落 `def.caliber === ...` |
| 回放状态 | `snapshot.status.effects` | 另录一套“假状态” |
| 训练场配置 | `world.training` | 写进正式模式/存档 |
| 是否已携带 | `Inventory.isCarried()` | 用 `c:` 前缀猜携带（`c:loot`/`c:stash` 会误判） |

---

## 8. 历史血泪教训

1. **改前查调用方**：`_applyArmorLayers` 同时被 `_damageEnemy/_damagePlayer` 调用，曾只改一处导致伤害 0.003J。
2. **跨 Inventory 必须 transferItem**：曾只复制武器 `loaded`，没递归 `innerGrid`，扒背包丢内容。
3. **弹链不要双语义**：`get mag()` 曾指向 `item.mag`，换弹扣备弹不加弹匣。
4. **UI 渲染源不能混**：搜刮左侧永远玩家，右侧尸体/容器；`viewInv` 只在尸体时切换。
5. **退出战局必须清状态**：动作进程、背包、暂停/结算/搜刮/附近列表、武器栏、死亡相机、眼皮。
6. **训练场不要写正式存档**：无限子弹/技能无冷却/创造物品只在 `training` 分支。
7. **回放不要残留玩家蒙版**：死亡相机把 `fx-filter` 写成暗红；回放/结算/退出必须 `_resetScreenFx()`。

---

## 9. 调试入口

- DevConsole：`window` 里的 `engine.devConsole`；命令注册在 `GameApp._registerDevCommands()`。
- 常用：
  - 查看内容表：`engine.content.count(table)` / `.all(table)`
  - 查看玩家状态：`world.player.status`
  - 查看护具：`world.player.armor`
  - 查看弹链：`world.player.activeWeapon.item.loaded`
  - 查看训练人偶：`world.enemies.filter(e=>e.trainingDummy)`
  - 查看回放缓冲：`world._replayBuf.length` / `_replayFx.length`
- 控制台日志前缀：`[GameApp]`、`[World]`、`[Map]`、`[Inv]`、`[BagUI]`、`[Content]`、`[Mode]`。

---

## 10. 改代码后的最低验证

1. `game.js` / `bagUI.js` / `inventory.js` 语法检查（`node --check` 或浏览器控制台无报错）。
2. 进入普通战局：能出生、能开枪、能换弹、能搜刮、能撤离/死亡结算。
3. 训练场：能进、人偶移动/护具/详情/创造物品库正常。
4. 背包：玩家↔容器、玩家↔尸体、容器↔容器三条拖拽路径。
5. 死亡回放：无蒙版、状态图标正确、能关闭回到结算。
6. 退出战局再进：无残留 HUD/动作/背包/暂停。

---

## 11. 2026-11-27 新增 / 改动函数

| 函数 | 所在类 | 职责 | 禁止 |
|---|---|---|---|
| `ActionProcess.onTick(pct,dt)` | `ActionProcess` | 分段动作每帧回调；医疗按进度写入部分效果 | 不要在 `onTick` 里扣物品，物品在完成/取消时统一结算 |
| `_tickMedicalUse` | `GameWorld` | 血包/手术按 ml、包扎按封堵等级、维修按耐久分段生效 | 不要绕过 `EntityStatus` 直接写部位血量 |
| `_renderSoundRadar` / `_drawSoundBars` | `HUDSystem` | 声纹 HUD：白/红/紫竖线、贴边方向三角 | 不要恢复全屏同心圆/受伤阴影；颜色只由声纹类型决定 |
| `_pspaceFlash` / `_spawnPspaceShatter` / `_updatePspaceShatter` | `GameWorld` | P 空间破碎的紫色闪屏、碎片爆发与生命周期 | 不要改伤害/弹道；这些只是表现 |
| `_beginMomentMaterialize` / `_updateMomentMaterialize` | `GameWorld` | Moments 从裂口缩放/淡入凝实 | 不要缩碰撞体（只缩 mesh） |
| `_genericAttachAllowed`（改） | `Inventory` | 枪口必须匹配 `caliber`；瞄具/握把仍可通用 | 不要把口径校验写到 bagUI |
| `_allyUseSkills`（改） | `AISystem` | 队友使用 Srdispte/Hate/拟载/猫跃等技能 | 不要给队友直接改 spec.hp 做难度补正 |
| `_unitBark` / `_unitVoice` | `GameWorld` | 敌兵三档台词回退 + 距离衰减无线电语音 | 不要用 TTS 同时念多个敌兵；不要绕开 `content.dialogue` |
| `_momentHuntingStart` / `_momentHuntingEnd` | `GameWorld` | 狩猎本能：最后目击点搜索、26s 超时回容器 | 不要把它写成 Cat Cat Catch 的别名；Cat Cat Catch 才共享实时目标 |
| `_updateThrowChargeUI` / `_quickThrow`（改） | `GameWorld` / HUD | 投掷蓄力条、G 快速投掷自动拔销、出手反馈 | 不要用 UI 状态替代 `_throwCharge/_throwFuse` 的物理真相 |
| `_interactNearest` | `GameWorld` | PC Tab 打开最近容器/尸体/地面物 | 不要另写一套“最近容器”扫描 |
| `_toggleKeyHelp` | `GameApp` | F1 键位速查，遍历 `ACTION_MAP` | 不要手写第二份键位表 |

---

## 12. 2026-11-27 第二轮新增 / 改动

| 函数/字段 | 所在层 | 职责 | 禁止 |
|---|---|---|---|
| `ProfileSystem.list()` | engine | 返回带 `id` 的预设对象，供大厅选项绑定 | 不要只返回 config，否则所有选项 id 为 undefined |
| `_unitBark` / `_unitVoice` | GameWorld | 敌兵台词只广播语音，不写 `_squadSay`；TTS 按距离衰减，失败回退 `voice_radio` | 不要把敌方台词塞进玩家小队字幕 |
| `_abortAid` / `_aidDowned` | AISystem | 单人认领伤员、4s 内被击中/可见敌人时中断救援并还击 | 不要让整队围着一个倒地单位读条 |
| `prone` / `p.bracing` | 玩家 | 卧姿低碰撞/低视高/低移速；开镜贴墙获得散布与后坐加成 | 不要把 bracing 写成只改 UI 的假状态 |
| `_laserSpotted` | GameWorld | 敌人从激光落点/玩家躯干反推大致位置 | 不要给精确坐标，必须带推测误差 |
| `ActionProcess.startPassive` | ActionProcess | 与主动动作并存的被动进程（治疗/持续效果） | 不要用 `start` 做被动治疗，会阻塞换弹/观察 |
| `_spawnEnemies` safeRadius | GameWorld | 出生点 60m 内过滤敌人，补位同样过滤 | 不要只在第一轮刷怪时过滤 |
| `_exoJet` / `_jetpackUntil` | GameWorld | 喷气背包写入短时真实速度并压过走位加速 | 不要只做镜头震动/粒子 |

---

## 13. 2026-11-27 第三轮新增 / 改动

| 函数/字段 | 所在层 | 职责 | 禁止 |
|---|---|---|---|
| `wantsAds` / `_landDip` | GameWorld | ADS 时禁止冲刺；常规落地只给 2~5cm 下沉 | 不要用镜头震动代替姿态/物理 |
| `_pspacePulse` 主动事件判定 | GameWorld | 只有技能/核心/对消等主动 P 空间事件才触发 Cat Cat Catch | 不要让容器周期脉冲自动开战 |
| `_spawnPspaceWave` 声纹 | GameWorld | P 空间波动写入 `pspace:true` 的紫色声纹 | 不要只画地面光圈不进入声纹表 |
| `_ensureWeaponMagazines` | GameApp | 给旧存档/新枪补制式弹匣 | 不要在没有弹匣时静默允许开火 |
| `mag_std_*` / `capacity` | content | 标准/扩容弹匣的容量唯一来源 | 不要再把 `magMul` 当主字段 |
| `_keepEssentialAllyDowned` / `_extractEssentialAlly` | GameWorld | 剧情队友致命伤转倒地，45s 未救自动后送 | 不要让剧情队友永久死亡/掉装备 |
| `EntityStatus.onEffect` / `_onStatusGained` | EntityStatus / GameWorld | 新状态产生时独立提示，状态栏继续做持续显示 | 不要把状态栏当通知列表 |
| `_breachAsce(forceAnchored)` / `momentRaidAt` | GameWorld | 对消完成后核心仍在场，Moments 仍会追来 | 不要在 anchored 时永久取消事件 |
| `_asceAggro` | AISystem | 其他阵营主动向核心/携带者推进 | 不要只写 flag 不驱动移动 |

---

## 14. 2026-11-28 第四轮新增 / 改动

| 函数/字段 | 所在层 | 职责 | 禁止 |
|---|---|---|---|
| `WEAPON_ATTACH_SLOTS` | Inventory | 8 个硬点：muzzle/muzzlePatch/sight/sideSight/grip/stock/mag/sideTactical | 不要在 bagUI 另写槽位列表 |
| `_genericAttachAllowed` / `canAttach` | Inventory | 枪托/侧瞄/侧战术具/枪口贴片兼容校验 | 不要只靠 fits 白名单绕过硬点限制 |
| `_syncMagLoaded` / `_copyLoaded` | Inventory | 弹匣独立存弹，换匣保留/读取子弹 | 不要只改 weapon.loaded 不写回弹匣 |
| `addToContainer(...,{x,y,rotated})` / `transferItem(...,targetPos)` | Inventory | 指定格精确放置；被占用则失败 | 不要回退到自动补左上角 |
| `_allyThreatNear` / `_allyFollowPlayer` | AISystem | 队友威胁感知、左右后方错位跟队 | 不要恢复“剧情不死”保护 |
| `_findCover` 后撤 | AISystem | 低血队友优先撤到掩体点而非直线后退 | 不要在开阔地原地包扎 |
| `_spawnPspaceWave` 声纹 | GameWorld | P 空间波动写入紫色声纹 | 不要只画地面光圈 |
| `_breachAsce(forceAnchored)` / `_asceAggro` | GameWorld | anchored 后 Moments 仍来；其他阵营抢核心 | 不要在对消完成时永久关闭事件 |


---

## 9. 主模式 / 剧情 / 计划树（v3.3.0）

- `GameApp.showTitle()` → 主大厅；`startAsakaNewGame()` 建立 `AsakaSave` 新档并写 `prologue_start` 自动存档；`continueAsaka({fromPlanTree:true})` 会先 `restoreAutosave()`。
- `GameWorld._updateStoryTriggers(dt)` 读取 `layout.storyTriggers`；进入半径后调用 `world.startStory(chapterId)` → `StoryPlayer.play()`。
- `StoryPlayer` 暂停世界、隐藏 HUD、播放章节、在 `onStoryEnd` 回写计划树节点与关键节点自动存档。演出中禁止存档、暂停、背包与设置。
- 设置快照：`ModeSettings.capture/apply`；旧 `save.data.flags.profileConfig` 只在首次升级时迁移到 Straight 快照，之后不再读写。
- 剧情数据扩展：在 `src/story/` 新建章节文件，保持 `{ id,title,start,autoSaveNode,nodes }` 结构，并在 `story.js` 的 `getStoryChapter` 注册；计划树节点在 `asaka-plan.js` 增加，并把关键节点 id 加进 `asakaSave.js` 的 `AUTOSAVE_NODES`。
