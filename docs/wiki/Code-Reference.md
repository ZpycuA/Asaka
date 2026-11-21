# 第二部分 · 代码架构与函数参考

> 本页对应仓库当前代码（2026-11-20）。目标：找函数、看调用链、避免改一处崩三处。
> 代码文件按“引擎层 → 数据层 → 应用层 → UI”从下到上排列；上层可以依赖下层，下层不能反向依赖上层。

---

## 1. 文件职责

| 文件 | 层级 | 职责 | 禁止 |
|---|---|---|---|
| `engine.js` | 引擎 | 渲染、物理、输入、事件总线、相机、音频、存档、Profile、DevConsole、i18n | 不写具体玩法数值与武器逻辑 |
| `content.js` | 数据 | 所有静态表：弹药/武器/护具/敌人/角色/地图/技能/任务/效果/预设 | 不含运行时逻辑，不改 `game.js` 状态 |
| `game.js` | 应用 | `GameWorld`、`HUDSystem`、AI、战斗结算、背包运行时、靶场、回放、App 流程 | 不直接改 `engine.js` 内部私有状态 |
| `inventory.js` | 数据层 | 二维网格、容器、装备、弹链辅助、序列化 | 不依赖 UI/Three.js |
| `bagUI.js` | UI | 背包/搜刮/详情/拖拽/装填扣弹/创造物品库入口 | 不直接改 `player.weapons` |
| `combatlog.js` | UI | 战斗记录/结算页面 | 不参与伤害计算 |
| `market.js` | 业务 | 市场价格/买卖 | 不直接改装备栏 |
| `modes.js` | 业务 | `straight` / `asaka` 模式注册与 hooks | 不写具体战斗公式 |
| `locale.*.js` | 文案 | 所有 i18n 文本 | 不写逻辑 |
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
  - `splitStack`
  - `normalizeLoaded / getLoadedGroups / listCompatibleAmmo / loadAmmoFromItem / unloadAmmo / countCompatibleAmmo / consumeCompatibleAmmo`
  - `serialize / deserialize`

### 3.2 弹链函数（新增）

| 函数 | 作用 |
|---|---|
| `normalizeLoaded(item)` | 修复/对齐 `loaded.queue`、`qty`、`ammoType` |
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

---

## 4. 应用层（game.js）

### 4.1 全局类/对象

- `ActionProcess`：同一时间一个动作；`start/cancel/update/getProgress`。
- `CombatSystem`：纯函数 `kinetic / energyAtRange / applyArmor / applyCoupling / energyToHP`。
- `EntityStatus`：部位 HP、伤口、血液、效果、`takeDamage/tick/isDead/isDowned/updateOverallHealth`。
- `AISystem`：感知、警戒、状态机（patrol/investigate/combat/melee/retreat/drone/flee/loot/remove）、训练人偶移动。
- `HUDSystem`：HUD 更新、伤害指示、状态栏/战术状态、护甲、训练 HUD、人偶详情。
- `GameWorld`：一局世界的全部运行时。
- `GameApp`：菜单、配装、市场、开始/结束、训练设置、创造模式、死亡回放入口。

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
  7. `actionProcess/敌人/声纹/撤离/容器/附近列表/曳光/投掷物/无人机/移动端按钮/警报`
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
| `_updatePlayer(dt)` | 输入、体力、移动、射击、换弹、技能、护具 |
| `_fireWeapon(owner, weapon, isPlayer, target)` | 取 queue 首发、弹道、伤害、后坐、曳光 |
| `_startReload()` / `_finishReload()` | 换弹动作与弹链填充 |
| `_cycleFireMode()` / `_fireModeLabel(mode)` | 开火模式 |
| `_startThrow/_doThrowNow/_selectThrowable` | 投掷物 |
| `_pullThrowablePin/_updateThrowFuse/_detonateHeldThrowable` | 保险式拔销、手中引信、自爆 |
| `_throwSpeed` / `_updateThrowPreview` | 蓄力速度与抛物线预览 |
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
| `_updateStatusVfx` | 敌人身上的玻纤碎片/火焰挂件 |
| `_meleeAttack(owner, weapon)` | 近战射线与伤害 |
| `_explodeProjectile/_spawnExplosionFX` | 投掷物爆炸 |
| `_killEnemy/_playerDown` | 死亡、尸体、死亡记录 |

### 4.5 背包/搜刮/训练

| 方法 | 作用 |
|---|---|
| `_updateNearbyList()` | 附近容器/尸体/地面物品 |
| `_openSearch/_closeSearch` | 搜索容器 |
| `_dropItemToGround` | 丢物品 |
| `_applyTrainingSettings()` | 应用靶场设置，配置人偶 |
| `_configureTrainingDummy(enemy)` | 血量/护甲/扶正/清状态 |
| `_updateTrainingHUD()` | 攻击数据面板 + 人偶详情 + training-mode |
| `_openTrainingModal/_applyTrainingModal` | 靶场设置弹窗 |
| `_refillTrainingLoadout()` | 补满玩家弹匣/护具/体力 |

### 4.6 无人机

| 方法 | 作用 |
|---|---|
| `_toggleDroneControl()` | 进入/退出操控 |
| `_exitDroneControl(reason)` | 统一退出：清 HUD/相机/按钮；本体受击、倒地、失联都走它 |
| `_updateDroneControl(dt,e,p)` | WASD 平移、升降、碰撞、持续标记 |
| `_droneMark/_droneScanAttack/_droneThrowPayload` | 标记/光学攻击/投掷 |
| `_spawnDrone/_removeDrone/_destroyDrone` | 生命周期 |

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

### 5.5 跨容器转移

```
BagUI drag
  → 同 Inventory: addToContainer
  → 跨 Inventory: transferItem
  → 目标装备槽: eq:<slot>
```

### 5.6 死亡

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

1. `content.ammo` 注册 `caliber/massG/v0/pen/impulse/effects`。
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
