# 第一部分 · HUD、靶场、投掷轮盘与死亡回放

> 对应 `index.html` 的 HUD DOM/CSS、`game.js` 的 `HUDSystem`、`GameWorld`、`BagUI`。
> 本页记录 UI 排版规则、交互路径与已知坑。

---

## 1. HUD 分区

| 区域 | 内容 | 定位 |
|---|---|---|
| 顶部左 | 任务面板 | `left:12 top:12` |
| 顶部右 | 小地图 | `right:12 top:64`，150×150 |
| 右上偏左 | 击杀提示 | `right:176 top:64` |
| 底部左 | 玩家状态/护甲/负重 | `left:12 bottom:12` |
| 底部右 | 武器/弹药/携带价值 | `right:16 bottom:16` |
| 底部中 | 武器栏 | `left:50% bottom:88` |
| 底部中上 | 技能栏 | `left:50% bottom:132` |
| 底部中 | 状态图标 | `left:50% bottom:6` |
| 右侧中 | 附近物品/尸体 | `right:180 top:52%` |
| 左中 | 防护快捷按钮 | `left:12 bottom:260` |
| 右中下 | 投掷轮盘按钮 | `right:16 bottom:248` |

### 原则

- 中央准星/命中提示永不被面板覆盖。
- 左下玩家面板、右下武器面板是“永久信息”，不随训练场变化。
- 训练场额外面板不能覆盖左下/右下：现在改为**右侧竖列**，并隐藏训练场的附近物品列表。

---

## 1.1 战术状态与效果条

- `#tactical-state`：底部中上，显示 `蹲伏 / 疾跑 / 开镜 / 屏息 / 左倾 / 右倾 / 投掷蓄力 / 无人机操控`。
- 侧身同时会通过相机 roll 和该状态条反馈，解决“按了 Z/X 看不出是否生效”。
- `#status-bar` 的效果图标透明度按 `duration / maxDuration` 衰减；`persistent`（技能持续刷新）效果保持不透明。
- `#hazard-overlay`：玩家身上着火/急性玻纤时的屏幕遮罩；`#dazzle-overlay`：强光刺眼时的手部遮眼 + “无法开镜”。
- 死亡时 HUD 健康条强制为 0，状态文字优先显示“死亡 / 濒死击倒”。

---

## 2. 训练场 HUD 排版（2026-11-20 修改）

训练场会给 `#hud` 加 `training-mode` 类。

```css
#hud.training-mode #training-settings-btn{ right:12px; top:224px }
#hud.training-mode #training-attack-panel{ right:12px; top:256px; width:248px }
#hud.training-mode #dummy-info-panel{ right:12px; top:382px; width:248px; max-height:34vh }
#hud.training-mode #nearby-list{ display:none }
```

原因：
- 旧版攻击面板/详情面板在左侧 `top:178/392`，与左侧防护按钮、技能按钮、移动端操作键重叠。
- 小地图占右上 `64~214px`，所以训练面板从 `224px` 开始向下排。
- 面板 z-index 提升到 47/48，避免被移动端按钮盖住文字。

移动端（`max-width:900px`）：

```css
#hud.training-mode #training-settings-btn{ right:8px; top:176px }
#hud.training-mode #training-attack-panel{ right:8px; top:208px; width:200px }
#hud.training-mode #dummy-info-panel{ right:8px; top:318px; width:200px; max-height:26vh }
```

> 改训练 HUD 时，先检查 360×640、720×1280、1920×1080 三种尺寸：面板不能覆盖准星、底部玩家/武器面板、右侧主操作键。

---

## 3. 开火模式按钮

- 位置：`#bottom-right .weapon-box .wb-top #fire-mode-btn`。
- 旧逻辑：只有 `fireModes.length > 1` 才显示 → 单模式枪看不到默认模式。
- 新逻辑：所有非空手/非近战枪都显示；单模式按钮只显示默认模式，不可切换。
- 点击：`_cycleFireMode()` 轮换 `fireModes`；单模式无变化。
- 文案：`_fireModeLabel()`：`single=单发`、`semi=半自动`、`auto=全自动`、`pump=泵动`。

---

## 4. 投掷轮盘

### 4.1 交互

- PC：按 `T` 打开；保持 Pointer Lock；鼠标位移推动虚拟摇杆；松开/点击确认。
- 触屏：点“投掷轮盘”按钮；在任意位置按下、拖向扇区、松手确认。
- 中心圆：取消。
- 数字键 1~9：快速选择对应扇区。
- `Esc` / `T`：关闭。

### 4.2 布局

- 中心圆 108×108。
- 4 个物品：上/右/下/左。
- 3 个：均分 120°。
- 5~8 个：环形均分。
- 扇区是可点击的大卡片，不是细线按钮；中心有当前选中名称/“取消”。
- 轮盘灵敏度由 `input.wheelSensitivity` 控制，默认 2.4（0.8~4.0 可调）。

### 4.3 投掷手感

- 长按攻击键同时完成拔销/蓄力和瞄准；松手投出。
- 保险式：按住瞬间拔销，引信开始倒计时；手里到点会自爆。压感式：撞墙/地面/人立即引爆。
- 投掷力度由 `input.throwPower` 控制；基础速度 24→38m/s（随蓄力）。

### 4.3 为什么改

- 旧版是纵向列表，按钮小、指针锁定切换导致闪屏/点空。
- 新版保持 Pointer Lock，不反复 `exitPointerLock/requestPointerLock`；用 `pointerdown/up` + `mousedown/up` 兜底。
- 轮盘打开时 `_updatePlayer` 冻结玩家输入，避免点击轮盘误开火。

---

## 5. 靶场设置面板

### 5.1 选项

- 显示伤害数字
- 显示攻击数据面板
- 无限子弹
- 无限投掷物
- 启用技能
- 技能无冷却
- 人偶移动：`静止 / 左右巡逻 / 随机游走`
- 人偶血量：50/100/200/500
- 人偶护具：头盔壳 / 面罩 / 纤维内衬 / 防弹插板，各自独立下拉
- 创造模式 + 打开物品库
- 补满配装 / 重开靶场 / 应用 / 关闭

### 5.2 应用逻辑

`_applyTrainingModal()`：

- 读取所有控件。
- `dummyMoveMode`：`still/patrol/random`。
- `dummyGear`：四个槽位的 defId 或 null。
- `_applyTrainingSettings()`：
  - 对所有存活训练人偶 `_configureTrainingDummy()`。
  - 重置血量/血液/伤口，扶正倒地人偶。
  - 按 gear 重建 `enemy.armor`（等级、耐久、`defId`、`red`）。
  - 补满玩家配装。

### 5.3 人偶移动

`AISystem._trainingDummyMove()`：

- `still`：不调用，停住。
- `patrol`：以出生点为中心，左右 ±4m，2.2m/s。
- `random`：在出生点 ±6m（x）/±1.5m（z）随机目标，1.8m/s，2~4.5s 重选。
- 始终面向玩家，方便查看详情/测试护具。
- 直接更新 `body.position`，并清零速度，避免物理积分冲突。

---

## 6. 人偶详情面板

显示条件：训练场 + 玩家 6.5m 内最近的一只存活训练人偶。

内容：
- 名称、距离
- 当前 `getHealthText()`、健康度 %
- 血液 ml / max
- 异常状态（图标 + 名称 + 强度）
- 四件护具：名称 + 耐久 %

更新：
- `HUDSystem._updateDummyInfoPanel(w)`，每帧计算最近人偶，做签名比较，只在内容变化时重绘。
- `#hud.replay-hud #dummy-info-panel{display:none}`，回放不显示。
- `_clearMatchUI()` 退出时隐藏。

---

## 7. 创造模式物品库

- 入口：靶场设置 → 勾选创造模式 → 打开物品库。
- 打开前会先应用靶场设置（避免护具/移动改了没生效）。
- 分类按钮直接发放：
  - 武器装满弹匣
  - 弹药 120 发
  - 投掷物 3 枚
  - 防具/背包/胸挂按原物品创建
- 放入顺序：`bag → chest → pocket → stash`；全部失败则销毁并提示。
- 只对训练场生效，不写入正式玩法。

---

## 8. 死亡回放

### 8.1 快照

- 10Hz，保留最近约 15s。
- 每帧记录玩家/所有敌人：位置、朝向、生死、击倒、HP、血液、护具、武器名、弹匣、备弹、瞄准点、`status.effects`。
- 另记录射击事件（敌方开火/是否命中玩家）与瞬时表现事件（爆炸、闪光球、技能光环）。

### 8.2 回放开始

- 清空 `fx-filter` 暗红蒙版、`fx-vignette`、`fx-hit-flash`、`fx-coupling`、`fx-skill`、`fx-skill-lines`、`blind-overlay`、`flash-overlay`、眼皮、无人机干扰。
- 退出 Pointer Lock，隐藏移动端控件/暂停按钮。
- 隐藏玩家第一人称枪模，构建击杀者第一人称枪模。
- `hud.replay-hud`：保留玩家同款 HUD，隐藏任务/小地图/击杀提示/附近列表/武器栏/技能栏/防护/训练面板/血雾滤镜/伤害指示器。

### 8.3 回放每帧

- 插值实体位置/朝向。
- 状态效果：身体发光（致盲白、震撼紫、燃烧橙、流血红）+ 头顶状态图标。
- 击杀者 HUD：HP、护具、武器、弹匣、状态栏、受击红闪。
- 击杀者失明：显示 `blind-overlay`。
- 无击杀者：HUD 显示“死亡回放 / 无击杀者”，不残留玩家濒死面板。
- 爆炸/闪光/技能光环按事件时间轴重放。

### 8.4 回放结束

- 清空状态图标/材质发光。
- 恢复玩家武器可见性、击杀者身体可见性。
- 移除 `replay-overlay`、`replay-hud`。
- 回到战斗记录/结算页。

---

## 9. 键位与移动端布局

### PC

保持主流 FPS：
- WASD 移动，Shift 疾跑，Space 跳，C 蹲。
- 左键开火，右键开镜，R 换弹，F 切枪。
- 1/2/3/0 武器槽，Q/E 技能，G 投掷，T 轮盘，B 背包。
- `[ ] \` 防护，Y 无人机，Z/X 倾斜，H 屏息，K 拔除/灭火，Esc 暂停。

### 移动端（2026-11-20 调整）

右侧主战斗区：
- 开火：右下，`right:20 bottom:100`，76px。
- 开镜：开火上方，`right:20 bottom:188`，55px。
- 换弹：开火左侧，`right:102 bottom:112`，58px。
- 蹲：右下偏左，`right:112 bottom:38`，55px。
- 跳：右下更左，`right:196 bottom:38`，60px。
- 切枪：右上，`right:20 bottom:268`，55px。
- 背包：切枪左侧，`right:82 bottom:268`，55px。

左侧：
- 技能、投掷轮盘、无人机、倾斜、屏息。

> 原则：开火/开镜/换弹/蹲/跳形成右手拇指可覆盖的扇区；切枪/背包上移；技能/投掷在左手。不要把开火键放在屏幕中央或与换弹重叠。

---

## 10. UI 修改检查清单

- [ ] 新面板是否避开准星、左下玩家面板、右下武器面板？
- [ ] 新面板是否在 `#hud.replay-hud` 下被隐藏？
- [ ] 新面板是否在 `_clearMatchUI()` 中清理？
- [ ] 新按钮是否有 `pointer-events:auto`，且不会挡住射击？
- [ ] 训练场面板在 360×640 / 720×1280 / 1920×1080 是否仍可读？
- [ ] 移动端按钮位置是否与 `ACTION_MAP` 单一真相源一致？
- [ ] 单模式枪是否仍显示开火模式？
- [ ] 投掷轮盘是否仍保持 Pointer Lock、不误开火？
