# 第一部分 · 背包、容器与弹药

> 对应 `inventory.js`、`bagUI.js`、`game.js` 的武器运行时/换弹段。
> 本页是**最容易出“幽灵物品 / 物品消失 / 弹药数量假”**的区域，改代码前必须读完。

---

## 1. 数据模型

### 1.1 Item

```js
{
  uid, table, defId, qty,
  dur, durMax,
  weight, w, h, rotated,
  rarity, valueMul, stackLimit,
  attachments, subSlots, innerGrid,
  loaded: { ammoType, qty, queue } // 仅 weapons
}
```

- `table` 对应 `content.js` 的注册表：`weapons` / `ammo` / `melee` / `nade` / `helmetShell` / `helmetVisor` / `helmetEar` / `vestFiber` / `vestPlate` / `backpack` / `chestRig`。
- `w/h` 是二维网格尺寸。
- `innerGrid` 只用于背包/胸挂，类型 `GridContainer`。

### 1.2 Inventory

- `items: Map<uid,item>`
- `parentOf: Map<uid, parentPath>`：
  - `c:chest` / `c:pocket` / `c:bag` / `c:safe` / `c:stash`
  - `inner:<hostUid>` 表示在某个背包/胸挂的内部网格
  - `null` 表示未放入容器（或已销毁）
- `containers`：
  - `chest`：胸挂内部网格
  - `pocket`：口袋
  - `bag`：背包内部网格
  - `safe`：安全箱
  - `stash`：仓库
- `equipped`：`main/side/melee/helmetShell/helmetVisor/helmetEar/vestFiber/vestPlate/backpack/chestRig`

> 禁止出现第二套归属逻辑。判断物品在哪里，只看 `parentOf`。

---

## 2. 核心操作

### 2.1 创建 / 销毁

- `createItem(table, defId, extras)`：注册 UID，初始化 `loaded`、`innerGrid`、网格尺寸、重量。
- `destroyItem(uid)`：递归销毁配件、子槽、`innerGrid` 内容，并从父容器 detach。

### 2.2 放入容器

```js
inv.addToContainer(containerName, uid, { noMerge, preferRotated })
```

- 同容器内移动也用 `addToContainer`（先 detach 再放回）。
- 会先尝试合并同 `table/defId/dur` 且 `stackLimit>1` 的堆叠。
- 找不到格子返回 `{ok:false, reason:'full'}`。

### 2.3 跨 Inventory 转移

```js
sourceInv.transferItem(targetInv, uid, targetContainerPath)
```

- 跨 Inventory（玩家↔尸体↔仓库）**必须**用它。
- 会创建新 UID、复制 `loaded.queue`、递归转移 `innerGrid`。
- `targetContainer` 可以是 `'eq:main'` 等装备槽。
- **禁止**直接把 item 塞进另一个 `Inventory.items`，否则会产生幽灵物品/重复 UID。

### 2.4 装备

- `equip(slot, uid)` 有类型校验（`EQUIP_TABLE`）。
- `unequip(slot)` 会把背包/胸挂内部物品正确回挂。
- 玩家运行时 `player.weapons` 必须通过 `_syncWeaponsFromInventory()` 同步，不能直接读写 Inventory。

---

## 3. 弹链数据模型（重要）

```js
item.loaded = {
  ammoType: '5.56',       // 默认/当前首发电种；队列空时兜底
  qty: 30,                // 缓存 = queue.length
  queue: ['5.56','5.56','glassfiber',...] // 唯一真相源，队首 = 下一发
}
// 可选：item.loadedPreference = 'glassfiber'
// 只影响“换弹/靶场补弹优先装哪种”，不改写实际队列
```

### 3.1 单一真相源规则

- **只有 `loaded.queue` 决定实际子弹类型与顺序。**
- `loaded.qty` 必须等于 `queue.length`，只做缓存。
- `loaded.ammoType` 只表示“队列为空时的默认弹种”或“当前首发电种”。
- **禁止** `item.mag`、`weapon.mag` 作为平行弹匣字段。
- 运行时 `weapon.mag` 是 getter/setter，指向 `item.loaded.queue.length` 或 `qty`。

### 3.2 规范化

`Inventory.normalizeLoaded(item)`：

- 没有 `loaded` → 按武器 `mag` 与默认弹种补满。
- 有 `qty` 没 `queue` → 按 `qty` 补出 `ammoType` 队列。
- `queue` 超过弹匣 → 截断。
- `qty` 与 `queue` 不一致 → 以 `queue` 为准。
- 队列非空 → `ammoType = queue[0]`。

调用点：
- `createItem`
- `deserialize`（V1/V2）
- `transferItem`
- `_buildWeaponFromInventory`
- `bagUI._renderDetail`
- `_finishReload`

### 3.3 连续弹种分组

```js
inv.getLoadedGroups(item)
// [{ammoId:'5.56',count:10},{ammoId:'glassfiber',count:4},...]
```

用于详情面板“弹链”显示，保留队列顺序。

### 3.4 兼容口径

```js
inv.isAmmoCompatible(weaponDef, ammoDef)
// ammoDef.caliber === weaponDef.ammoType
```

- 备用弹药统计、装填列表、换弹都走这个函数。
- 5.56 武器可以使用 `glassfiber`；12ga 可以使用 `dragon`。

### 3.5 装填

```js
inv.loadAmmoFromItem(weaponUid, ammoUid, count)
```

- 检查口径、弹匣空间、弹药数量。
- 把 `ammo.defId` 追加到 `queue` 尾部（保持玩家选择的顺序）。
- 更新 `qty`、`ammoType`、`loadedPreference`。
- 弹药耗尽时销毁原 stack。

### 3.6 扣弹

```js
inv.unloadAmmo(weaponUid, ammoId, count)
```

- `ammoId` 为 `null`：从队首开始取 `count` 发。
- `ammoId` 指定：取该弹种，保持其余子弹顺序。
- 先把取出的子弹按弹种创建为 ammo item，放入 `bag/chest/pocket/safe/stash`。
- **任何一个放不下 → 整体回滚**，弹链不变。
- 从队首移除后 `qty = queue.length`，`ammoType` 更新。

---

## 4. 装填/扣弹 UI

`bagUI._renderDetail()` 的武器详情：

- 顶部：`弹链 total/cap`、下一发弹种、首选弹种。
- 弹链分组行：`▮ 弹种 ×count` + `取 1` / `全取`。
- `全部扣下`：清空弹链。
- “可用弹药”：
  - 列出所有兼容口径的弹药与数量。
  - 仓库/战局外：`装 1` / `装满` 直接改弹链。
  - 正常战局内：`设为首选`；按 R 换弹时优先装填该弹种。
  - 靶场：允许直接装填，便于排列混合弹链。
- 所有按钮都通过 `loadAmmoFromItem` / `unloadAmmo`，不再手写 queue 操作。

### 旧版问题（已修）

1. 详情只显示 `loaded.ammoType` + `qty`，混合弹链显示假数据。
2. `_loadAmmo` 按容器顺序瞎抓，无法指定弹种。
3. `_finishReload` 靶场无线弹药直接 `new Array(magCap).fill(def.ammoType)`，把玩家排好的特殊弹冲掉。
4. `reserve` 只统计默认弹种，导致有玻纤弹但显示 0、无法换弹。
5. 扣弹按弹种汇总创建，但 queue 顺序/剩余数量可能不一致。

---

## 5. 换弹流程（玩家）

`GameWorld._startReload()`：

- 检查 `w.mag >= w.magCap`、`w.reserve <= 0`。
- `w.reserve` = 随身容器中所有兼容口径弹药总数（不含仓库）。
- 启动 `ActionProcess('reload')`，时长 = `def.reload * 0.8`（真实换弹 1.5 倍）× 技能加成。

`_finishReload()`：

1. `normalizeLoaded`。
2. 靶场无限弹药：保留 queue 顺序，只补到满弹匣；补弹种优先 `loadedPreference`，否则默认。
3. 正常：`need = magCap - queue.length`。
4. 先按 `loadedPreference` 装填，再按 `chest → pocket → bag → safe` 装所有兼容弹种。
5. 更新 `qty`、`ammoType`。

`_fireWeapon()`：

- 从 `queue.shift()` 取当前发弹种。
- `qty--`。
- 靶场无限弹药：补到满弹匣，保留已有顺序，从 `loadedPreference` 或默认弹种补尾部。
- 不再用默认弹种覆盖整条弹链。

---

## 6. 搜刮 UI 的渲染源

- 左侧永远 `this.inv`（玩家）。
- 右侧：
  - 尸体 → `target.lootInv`
  - 普通容器 → `inv.containers.loot`
- `viewInv` 只在“从尸体拿东西”时指向 `target.lootInv`，其他时候指向 `this.inv`。
- 不要把 `viewInv` 和 `this.inv` 混用来判断装备槽/负重。

---

## 7. 创造模式

- 靶场设置勾选“创造模式”。
- `_openCreativeModal()` 打开物品库。
- 分类：武器、弹药、近战、投掷物、头盔壳、面罩、耳罩、纤维内衬、防弹插板、背包、胸挂。
- `_giveCreativeItem(table, defId)`：
  - 武器自动装满弹匣。
  - 弹药 120 发；投掷物 3 枚。
  - 依次尝试 `bag → chest → pocket → stash`；全部失败则销毁并提示。
- 创造模式只影响靶场，不写入正式玩法。

---

## 8. 为“弹匣物品”预留

后续若做可拆卸弹匣：

- 新建 `magazine` 表 / item；弹匣自身也使用 `loaded.queue` + `qty`。
- 武器 `attachments.mag` 指向弹匣 UID；开火/换弹从弹匣 queue 取。
- 换弹动作改为“卸下旧弹匣 → 装上新弹匣”，不要把子弹直接塞进武器 queue。
- 详情面板继续使用 `getLoadedGroups` / `loadAmmoFromItem` / `unloadAmmo`，把作用对象从武器 item 换成弹匣 item。
- **不要**同时保留“武器内置弹匣”和“弹匣物品”两套写弹逻辑；必须有明确的“当前供弹容器”单一入口。

---

## 9. 审查清单

- [ ] 任意武器详情显示的 `total` 是否等于 `queue.length`？
- [ ] 混合弹链能否按顺序显示、取 1、全取？
- [ ] 装填指定弹种后，下一发是否真的是该弹种？
- [ ] 扣弹时背包满了是否整体回滚，没有丢子弹？
- [ ] 靶场无限弹药射击后，玩家排好的特殊弹是否还在队首？
- [ ] `reserve` 是否统计到特殊弹（玻璃纤维/龙息）？
- [ ] 跨尸体转移武器后，弹链 queue 是否完整保留？
- [ ] 旧存档 V1/V2 反序列化后，`qty` 与 `queue` 是否一致？
