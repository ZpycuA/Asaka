# LaiAsaka Engine · GitHub Wiki

> 本 Wiki 面向两个目的：
> 1. **审查设计**：所有玩法、数值、公式、内容表集中在这里，便于发现丢失、重复或被人为曲解的设计。
> 2. **修改代码**：函数职责、数据流、单一真相源、禁止事项集中在这里，换 AI / 换人接手不用重新通读 10000 行 `game.js`。
>
> 当前版本：**v3.2.0 · Grid & Loot Edition**  
> 整理日期：2026-11-20  
> 项目所有者：ZpycuA  
> 授权：CC BY-NC 4.0

---

## 0. 怎么用这份 Wiki

- 做**平衡/数值审查**：先看 [Game-Design](Game-Design.md) 和 [Combat-And-Health](Combat-And-Health.md)。
- 改**背包/弹药/搜刮**：先看 [Inventory-And-Ammo](Inventory-And-Ammo.md)，尤其“禁止事项”。
- 改**HUD/训练场/回放/轮盘**：看 [UI-Training-Replay](UI-Training-Replay.md)。
- 改**代码结构/找函数**：看 [Code-Reference](Code-Reference.md)。
- 每次合并改动，必须更新 [Changelog](Changelog.md)，并在本页“最近更新”补一行。

---

## 1. 两大部分

### 第一部分 · 游戏设计

| 页面 | 内容 |
|---|---|
| [Game-Design](Game-Design.md) | 世界观定位、核心循环、模式、地图、角色、敌人、技能、经济、任务、操作与键位 |
| [Combat-And-Health](Combat-And-Health.md) | 动能、弹道衰减、穿透、护具分层、钝击、部位血量、失血、伤口、状态效果 |
| [Inventory-And-Ammo](Inventory-And-Ammo.md) | 二维网格、容器、`parentOf`、`transferItem`、弹链 `loaded.queue`、装填/扣弹、创造模式 |
| [UI-Training-Replay](UI-Training-Replay.md) | HUD 排版、开火模式按钮、投掷轮盘、靶场设置、人偶详情、死亡回放 |

### 第二部分 · 函数功能与实现

| 页面 | 内容 |
|---|---|
| [Code-Reference](Code-Reference.md) | 文件职责、类、核心函数索引、调用链、数据流、扩展新内容/新效果的步骤、历史血泪教训 |
| [Changelog](Changelog.md) | 按日期记录每次改动，包含“改了什么、为什么、影响文件、验证点” |

---

## 2. 当前状态速览

- 技术栈：纯 **ES Modules + Three.js + 原生 DOM**，无 npm、无打包。
- 主模式：`straight`（硬核撤离战斗）；`asaka` 目前是空壳。
- 核心公式：`E = ½mv²` → 射程衰减 → 穿透/护甲分层 → 部位组织损伤 + 失血 + 状态。
- 背包：二维网格 `GridContainer`；跨 Inventory 必须走 `transferItem`。
- 弹药：`item.loaded.queue` 是**唯一弹链真相源**；`loaded.qty` 只是 `queue.length` 的缓存。
- 训练场：独立 `training` 地图；人偶移动/护具/详情/创造物品库；不会写入正式玩法。
- 死亡回放：10Hz 全实体快照 + 瞬时表现事件；持续状态读 `status.effects`。
- 投掷轮盘：径向中心圆 + 四/八向扇区，PC 保持 Pointer Lock。

---

## 3. 最近更新

- **2026-11-21**：生死每帧同步/累计伤害；投掷轮盘灵敏度与蓄力物理、压感/保险引信；真实闪光/EMP 光场与强光刺眼；技能对齐；负重与贵重品/医疗/EMP 损坏；玻纤/燃烧表现与 AI 障碍规避；HUD 战术状态与效果透明度。
- **2026-11-20**：弹链/弹药详情重构；训练场 HUD 右栏重排；开火模式按钮常显；伤害/护甲/失血模型校准；新建本 Wiki。
- **2026-11-15**：死亡回放状态效果与全屏蒙版修复；径向投掷轮盘；训练场地图保底与内置布局。
- **2026-11-15 之前**：v3.2.0 网格背包/搜刮、v3.1.0 战斗重构，详见 [Changelog](Changelog.md)。

---

## 4. 文档维护规则

1. **先改代码，再改 Wiki**；文档必须描述当前真实实现，不写“应该会”。
2. 数值改了必须同步 [Combat-And-Health](Combat-And-Health.md) / [Game-Design](Game-Design.md) 的表格。
3. 新函数必须进 [Code-Reference](Code-Reference.md) 的索引。
4. 新效果/新弹药必须写清数据源与回放/UI 兼容方式。
5. 每次改动在 [Changelog](Changelog.md) 增加条目，格式：
   `日期 · 标题 / 原因 / 文件 / 验证方法 / 兼容性`。
