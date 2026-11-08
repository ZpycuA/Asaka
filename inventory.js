/* ============================================================
   LaiAsaka Engine · Inventory Data Layer (Grid Edition)
   v2.0.0 · © 2026 ZpycuA · CC BY-NC 4.0
   ------------------------------------------------------------
   本版本引入网格容器：
     · 每个物品有 w × h 占位，可旋转（rotated）
     · 容器是 GridContainer（w × h 网格 + slots + items 索引）
     · 背包/胸挂物品自带 innerGrid（内部也是 GridContainer）
     · addToContainer 自动找位 + 自动旋转
     · item.searched 支持塔科夫式未搜物品
     · 旧 v1 存档自动迁移（uids 数组 → grid）
   ============================================================ */

let _uidCounter = 0;

function _genUid(prefix) {
  _uidCounter++;
  return prefix + '_' + Date.now().toString(36) + '_' + _uidCounter.toString(36);
}

const STACK_LIMITS = {
  ammo: 999,
  cons: 99,
  nade: 20,
  attach: 1,
  weapon: 1,
  helmetShell: 1,
  helmetVisor: 1,
  helmetEar: 1,
  vestFiber: 1,
  vestPlate: 1,
  backpack: 1,
  chestRig: 1,
};

const EQUIP_SLOTS = [
  'main', 'side',
  'helmetShell', 'helmetVisor', 'helmetEar',
  'vestFiber', 'vestPlate',
  'backpack', 'chestRig',
];

const EQUIP_TABLE = {
  main: 'weapons', side: 'weapons',
  helmetShell: 'helmetShell', helmetVisor: 'helmetVisor', helmetEar: 'helmetEar',
  vestFiber: 'vestFiber', vestPlate: 'vestPlate',
  backpack: 'backpack', chestRig: 'chestRig',
};

const CONTAINER_NAMES = ['chest', 'pocket', 'bag', 'safe', 'stash', 'loot'];

const CONTAINER_DEFAULTS = {
  chest:  { w: 0,  h: 0 },   // 由 chestRig 提供
  pocket: { w: 2,  h: 2 },   // 4 格
  bag:    { w: 0,  h: 0 },   // 由 backpack 提供
  safe:   { w: 3,  h: 1 },   // 3 格
  stash:  { w: 20, h: 10 },  // 200 格
  loot:   { w: 8,  h: 6 },   // 搜索时的临时容器（冗余 48 格）
};

const WEAPON_ATTACH_SLOTS = ['muzzle', 'sight', 'mag', 'grip'];

/* ====================== GridContainer ====================== */
export class GridContainer {
  constructor(w = 0, h = 0) {
    this.w = w;
    this.h = h;
    this.slots = new Map();   // "x,y" → uid
    this.items = new Map();   // uid → { x, y, w, h, rotated }
  }
  get cap()     { return this.w * this.h; }
  get uids()    { return Array.from(this.items.keys()); }
  get count()   { return this.items.size; }
  get isActive(){ return this.w > 0 && this.h > 0; }

  // 序列化用
  toJSON() {
    const out = [];
    for (const [uid, pos] of this.items) {
      out.push([uid, { x: pos.x, y: pos.y, w: pos.w, h: pos.h, rotated: !!pos.rotated }]);
    }
    return { w: this.w, h: this.h, items: out };
  }

  static fromJSON(data) {
    const g = new GridContainer(data.w || 0, data.h || 0);
    for (const [uid, pos] of data.items || []) {
      g.items.set(uid, {
        x: pos.x, y: pos.y,
        w: pos.w, h: pos.h,
        rotated: !!pos.rotated,
      });
      for (let dy = 0; dy < pos.h; dy++) {
        for (let dx = 0; dx < pos.w; dx++) {
          g.slots.set((pos.x + dx) + ',' + (pos.y + dy), uid);
        }
      }
    }
    return g;
  }
}

/* ====================== Inventory ====================== */
export class Inventory {
  constructor(contentRegistry) {
    this.content = contentRegistry;
    this.items = new Map();
    this.parentOf = new Map();
    this.equipped = {};
    this.containers = {};

    for (const slot of EQUIP_SLOTS) this.equipped[slot] = null;
    for (const name of CONTAINER_NAMES) {
      const d = CONTAINER_DEFAULTS[name];
      this.containers[name] = new GridContainer(d.w, d.h);
    }
  }

  /* ====================== 创建 / 销毁 ====================== */
  createItem(table, defId, extras = {}) {
    const def = this.content.get(table, defId);
    if (!def) {
      console.warn('[Inv] 未找到定义:', table, defId);
      return null;
    }
    const uid = _genUid(table === 'weapons' ? 'w' : defId);

    const valueMul = extras.lockValue ? (extras.valueMul !== undefined ? extras.valueMul : 1) : (0.9 + Math.random() * 0.2);
    const item = {
      uid,
      table,
      defId,
      qty: extras.qty || 1,
      dur: extras.dur !== undefined ? extras.dur : (def.maxDur || 0),
      durMax: def.maxDur || 0,
      attachments: null,
      subSlots: null,
      rarity: def.rarity || 'L0',
      effects: [],
      valueMul,
      stackLimit: def.stackLimit || STACK_LIMITS[table] || 1,
      // ★ 网格字段
      w: def.w || 1,
      h: def.h || 1,
      rotated: false,
      searched: extras.searched !== false,  // 默认已搜
      innerGrid: null,
    };

    if (table === 'weapons') {
      item.attachments = {};
      for (const k of WEAPON_ATTACH_SLOTS) item.attachments[k] = null;

      if (extras.attachments && typeof extras.attachments === 'object') {
        for (const k in extras.attachments) {
          if (k in item.attachments && extras.attachments[k]) {
            item.attachments[k] = extras.attachments[k];
          }
        }
      }

      const ammoType = def.ammoType || null;
      const magCap = def.mag || 0;
      let loadedQty = 0;
      if (extras.loadedQty !== undefined) {
        const n = extras.loadedQty | 0;
        loadedQty = Math.max(0, Math.min(magCap, n));
      }
      item.loaded = { ammoType, qty: loadedQty };
    }

    // ★ 容器类物品初始化 innerGrid
    if (table === 'backpack' || table === 'chestRig') {
      const innerW = def.innerW || 0;
      const innerH = def.innerH || 0;
      item.innerGrid = new GridContainer(innerW, innerH);
    }

    this.items.set(uid, item);
    this.parentOf.set(uid, null);
    return uid;
  }

  destroyItem(uid) {
    const item = this.items.get(uid);
    if (!item) return false;

    if (item.attachments) {
      for (const k in item.attachments) {
        if (item.attachments[k]) this.destroyItem(item.attachments[k]);
      }
    }
    if (item.subSlots) {
      for (const k in item.subSlots) {
        if (item.subSlots[k]) this.destroyItem(item.subSlots[k]);
      }
    }
    // ★ innerGrid 递归销毁
    if (item.innerGrid) {
      const childUids = Array.from(item.innerGrid.items.keys());
      for (const cu of childUids) this.destroyItem(cu);
      item.innerGrid = null;
    }

    // ★ 从父容器移除
    this._detach(uid);

    this.items.delete(uid);
    this.parentOf.delete(uid);
    return true;
  }

  /* ====================== 查询 ====================== */
  getItem(uid) {
    return this.items.get(uid) || null;
  }

  getDef(itemOrUid) {
    const item = typeof itemOrUid === 'string' ? this.items.get(itemOrUid) : itemOrUid;
    if (!item) return null;
    return this.content.get(item.table, item.defId);
  }

  getContainer(name) {
    return this.containers[name] || null;
  }

  getItemValue(itemOrUid) {
    const item = typeof itemOrUid === 'string' ? this.items.get(itemOrUid) : itemOrUid;
    if (!item) return 0;
    const def = this.getDef(item);
    if (!def) return 0;
    let unit = def.value || 0;
    if (item.durMax > 0 && item.dur !== undefined) {
      const ratio = Math.max(0, Math.min(1, item.dur / item.durMax));
      unit = Math.round(unit * (0.3 + 0.7 * ratio));
    }
    let total = unit * (item.qty || 1) * (item.valueMul || 1);
    if (item.table === 'weapons' && item.loaded && item.loaded.qty > 0) {
      const ammoDef = this.content.get('ammo', item.loaded.ammoType);
      if (ammoDef) total += (ammoDef.value || 0) * item.loaded.qty * (item.valueMul || 1);
    }
    // 内部物品算入总价值
    if (item.innerGrid) {
      for (const [childUid] of item.innerGrid.items) {
        total += this.getItemValue(childUid);
      }
    }
    return Math.round(total);
  }

  getContainerValue(name) {
    const c = this.containers[name];
    if (!c) return 0;
    let total = 0;
    for (const uid of c.uids) total += this.getItemValue(uid);
    return total;
  }

  getTotalValue() {
    let total = 0;
    for (const slot in this.equipped) {
      const uid = this.equipped[slot];
      if (uid) total += this.getItemValue(uid);
    }
    for (const name of CONTAINER_NAMES) {
      total += this.getContainerValue(name);
    }
    return total;
  }

  /* ====================== 网格辅助 ====================== */
  _regionFree(container, x, y, w, h) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (container.slots.has((x + dx) + ',' + (y + dy))) return false;
      }
    }
    return true;
  }

  _findSlot(container, itemW, itemH, preferredRotated) {
    if (container.w <= 0 || container.h <= 0) return null;

    const tryPlace = (w, h, rotated) => {
      if (w > container.w || h > container.h) return null;
      for (let y = 0; y <= container.h - h; y++) {
        for (let x = 0; x <= container.w - w; x++) {
          if (this._regionFree(container, x, y, w, h)) {
            return { x, y, rotated };
          }
        }
      }
      return null;
    };

    if (preferredRotated && itemW !== itemH) {
      const r = tryPlace(itemH, itemW, true);
      if (r) return r;
      return tryPlace(itemW, itemH, false);
    }
    const n = tryPlace(itemW, itemH, false);
    if (n) return n;
    if (itemW !== itemH) return tryPlace(itemH, itemW, true);
    return null;
  }

  _occupy(container, uid, x, y, w, h, rotated) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        container.slots.set((x + dx) + ',' + (y + dy), uid);
      }
    }
    container.items.set(uid, { x, y, w, h, rotated: !!rotated });
  }

  _vacate(container, uid) {
    const pos = container.items.get(uid);
    if (!pos) return;
    for (let dy = 0; dy < pos.h; dy++) {
      for (let dx = 0; dx < pos.w; dx++) {
        container.slots.delete((pos.x + dx) + ',' + (pos.y + dy));
      }
    }
    container.items.delete(uid);
  }

  /* ====================== 容器操作 ====================== */
  addToContainer(name, uid, opts) {
    opts = opts || {};
    const container = this.containers[name];
    const item = this.items.get(uid);
    if (!container || !item) return { ok: false, reason: 'no_target' };
    if (!container.isActive) return { ok: false, reason: 'no_capacity' };

    if (this.wouldCreateCycle(uid, 'c:' + name)) {
      return { ok: false, reason: 'cycle' };
    }

    // ---- 1. 先尝试合并堆叠 ----
    const stackLimit = item.stackLimit || 1;
    if (!opts.noMerge && stackLimit > 1 && item.dur === item.durMax) {
      for (const [otherUid] of container.items) {
        const other = this.items.get(otherUid);
        if (!other) continue;
        if (other.table !== item.table || other.defId !== item.defId) continue;
        if (other.dur !== item.dur) continue;
        const otherLimit = other.stackLimit || 1;
        const space = otherLimit - other.qty;
        if (space >= item.qty) {
          other.qty += item.qty;
          this._detach(uid);
          this.destroyItem(uid);
          return { ok: true, merged: true };
        }
        // 部分合并：只有容器还有空位放剩余时才做
        if (space > 0) {
          const slotCheck = this._findSlot(container, item.w, item.h, false);
          if (slotCheck) {
            other.qty += space;
            item.qty -= space;
          }
        }
      }
    }

    // ---- 2. 找空位（含自动旋转） ----
    const slot = this._findSlot(container, item.w, item.h, opts.preferRotated || false);
    if (!slot) return { ok: false, reason: 'full' };

    // ---- 3. 放入 ----
    this._detach(uid);
    const placedW = slot.rotated ? item.h : item.w;
    const placedH = slot.rotated ? item.w : item.h;
    this._occupy(container, uid, slot.x, slot.y, placedW, placedH, slot.rotated);
    item.rotated = slot.rotated;
    this.parentOf.set(uid, 'c:' + name);
    return { ok: true, position: slot };
  }

  removeFromContainer(name, uid) {
    const container = this.containers[name];
    if (!container) return false;
    if (!container.items.has(uid)) return false;
    this._vacate(container, uid);
    if (this.parentOf.get(uid) === 'c:' + name) this.parentOf.set(uid, null);
    return true;
  }

  // 在指定容器内移动物品到另一位置（拖拽吸附用）
  moveWithinContainer(name, uid, newX, newY, newRotated) {
    const container = this.containers[name];
    const item = this.items.get(uid);
    if (!container || !item) return { ok: false, reason: 'no_target' };
    const pos = container.items.get(uid);
    if (!pos) return { ok: false, reason: 'not_in_container' };

    const w = newRotated ? item.h : item.w;
    const h = newRotated ? item.w : item.h;
    if (newX < 0 || newY < 0 || newX + w > container.w || newY + h > container.h) {
      return { ok: false, reason: 'out_of_bounds' };
    }

    // 先移除自己，再检查新区域
    this._vacate(container, uid);
    if (!this._regionFree(container, newX, newY, w, h)) {
      // 回滚
      this._occupy(container, uid, pos.x, pos.y, pos.w, pos.h, pos.rotated);
      return { ok: false, reason: 'overlap' };
    }
    this._occupy(container, uid, newX, newY, w, h, !!newRotated);
    item.rotated = !!newRotated;
    return { ok: true };
  }

  /* ====================== 装备操作 ====================== */
  equip(slot, uid) {
    if (!EQUIP_SLOTS.includes(slot)) return { ok: false, reason: 'bad_slot' };
    const item = this.items.get(uid);
    if (!item) return { ok: false, reason: 'no_item' };

    const expectedTable = EQUIP_TABLE[slot];
    if (expectedTable && item.table !== expectedTable) {
      return { ok: false, reason: 'type_mismatch' };
    }

    if (this.wouldCreateCycle(uid, 'eq:' + slot)) {
      return { ok: false, reason: 'cycle' };
    }

    const oldUid = this.equipped[slot];
this._detach(uid);
// ★ 核心修复：不要清空老装备的 parentOf，让它保持原来的状态，由外部 UI 处理它的去向
// if (oldUid) this.parentOf.set(oldUid, null); 

this.equipped[slot] = uid;
    this.parentOf.set(uid, 'eq:' + slot);

    // ★ 背包/胸挂：替换容器，并更新子物品 parentOf
    if (slot === 'backpack') {
      if (!item.innerGrid) item.innerGrid = new GridContainer(0, 0);
      this.containers.bag = item.innerGrid;
      for (const [childUid] of item.innerGrid.items) {
        this.parentOf.set(childUid, 'c:bag');
      }
    }
    if (slot === 'chestRig') {
      if (!item.innerGrid) item.innerGrid = new GridContainer(0, 0);
      this.containers.chest = item.innerGrid;
      for (const [childUid] of item.innerGrid.items) {
        this.parentOf.set(childUid, 'c:chest');
      }
    }
    return { ok: true, swapped: oldUid };
  }

  unequip(slot) {
    if (!EQUIP_SLOTS.includes(slot)) return null;
    const uid = this.equipped[slot];
    if (!uid) return null;
    const item = this.items.get(uid);

    if (slot === 'backpack') {
      const grid = this.containers.bag;
      if (grid) {
        for (const [childUid] of grid.items) {
          this.parentOf.set(childUid, 'inner:' + uid);
        }
      }
      this.containers.bag = new GridContainer(0, 0);
    }
    if (slot === 'chestRig') {
      const grid = this.containers.chest;
      if (grid) {
        for (const [childUid] of grid.items) {
          this.parentOf.set(childUid, 'inner:' + uid);
        }
      }
      this.containers.chest = new GridContainer(0, 0);
    }

    this.equipped[slot] = null;
    this.parentOf.set(uid, null);
    return uid;
  }

  /* ====================== 拆分堆叠 ====================== */
  splitStack(uid, count, preferredContainer) {
    const item = this.items.get(uid);
    if (!item) return { ok: false, reason: 'no_item' };
    if (item.qty <= 1) return { ok: false, reason: 'qty_too_small' };
    if (count <= 0 || count >= item.qty) return { ok: false, reason: 'bad_count' };

    const newUid = this.createItem(item.table, item.defId, {
      qty: count,
      lockValue: true,
      valueMul: item.valueMul,
      dur: item.dur,
    });
    if (!newUid) return { ok: false, reason: 'create_failed' };

    const originalParent = this.parentOf.get(uid);
    const targets = [];
    if (preferredContainer) targets.push(preferredContainer);
    if (originalParent && originalParent.startsWith('c:')) {
      const origContainer = originalParent.slice(2);
      if (!targets.includes(origContainer)) targets.push(origContainer);
    }
    for (const t of ['stash', 'bag', 'chest', 'pocket', 'safe']) {
      if (!targets.includes(t)) targets.push(t);
    }

    for (const t of targets) {
      const c = this.containers[t];
      if (!c || !c.isActive) continue;
      const r = this.addToContainer(t, newUid, { noMerge: true });
      if (r.ok) {
        item.qty -= count;
        return { ok: true, newUid };
      }
    }

    this.destroyItem(newUid);
    return { ok: false, reason: 'no_space' };
  }

  /* ====================== 配件操作（不变） ====================== */
  attachTo(weaponUid, slot, attachUid) {
    const weapon = this.items.get(weaponUid);
    const attach = this.items.get(attachUid);
    if (!weapon || !attach) return { ok: false, reason: 'no_item' };
    if (!weapon.attachments) return { ok: false, reason: 'not_weapon' };
    if (attach.table !== 'attach') return { ok: false, reason: 'type_mismatch' };
    if (!(slot in weapon.attachments)) return { ok: false, reason: 'bad_slot' };

    if (this.wouldCreateCycle(attachUid, weaponUid)) {
      return { ok: false, reason: 'cycle' };
    }

    const oldUid = weapon.attachments[slot];
    this._detach(attachUid);
    weapon.attachments[slot] = attachUid;
    this.parentOf.set(attachUid, weaponUid);
    return { ok: true, swapped: oldUid };
  }

  detachFrom(weaponUid, slot) {
    const weapon = this.items.get(weaponUid);
    if (!weapon || !weapon.attachments) return null;
    const uid = weapon.attachments[slot];
    if (!uid) return null;
    weapon.attachments[slot] = null;
    this.parentOf.set(uid, null);
    return uid;
  }

  attachToSubSlot(hostUid, subSlot, attachUid) {
    const host = this.items.get(hostUid);
    const attach = this.items.get(attachUid);
    if (!host || !attach) return { ok: false, reason: 'no_item' };
    if (attach.table !== 'attach') return { ok: false, reason: 'type_mismatch' };

    if (!host.subSlots) {
      const hostDef = this.getDef(host);
      const subSlots = hostDef && hostDef.subSlots;
      if (!subSlots || !subSlots.includes(subSlot)) {
        return { ok: false, reason: 'bad_slot' };
      }
      host.subSlots = {};
      for (const s of subSlots) host.subSlots[s] = null;
    }
    if (!(subSlot in host.subSlots)) return { ok: false, reason: 'bad_slot' };

    if (this.wouldCreateCycle(attachUid, hostUid)) {
      return { ok: false, reason: 'cycle' };
    }

    const oldUid = host.subSlots[subSlot];
    this._detach(attachUid);
    host.subSlots[subSlot] = attachUid;
    this.parentOf.set(attachUid, hostUid);
    return { ok: true, swapped: oldUid };
  }

  /* ====================== 自环检测 ====================== */
  wouldCreateCycle(sourceUid, targetParent) {
    if (!targetParent) return false;
    if (targetParent.startsWith('c:') || targetParent.startsWith('eq:')) return false;
    return this.isDescendant(sourceUid, targetParent);
  }

  isDescendant(ancestorUid, nodeUid) {
    let cur = nodeUid;
    const seen = new Set();
    while (cur) {
      if (cur === ancestorUid) return true;
      if (seen.has(cur)) return true;
      seen.add(cur);
      const parent = this.parentOf.get(cur);
      if (!parent) return false;
      if (parent.startsWith('eq:') || parent.startsWith('c:')) return false;
      if (parent.startsWith('inner:')) cur = parent.slice(6);
      else cur = parent;
    }
    return false;
  }

  /* ====================== 内部 ====================== */
  _detach(uid) {
    const parent = this.parentOf.get(uid);
    if (!parent) return;

    if (parent.startsWith('eq:')) {
      const slot = parent.slice(3);
      if (this.equipped[slot] === uid) {
        this.equipped[slot] = null;
        if (slot === 'backpack') this.containers.bag = new GridContainer(0, 0);
        if (slot === 'chestRig') this.containers.chest = new GridContainer(0, 0);
      }
    } else if (parent.startsWith('c:')) {
      const name = parent.slice(2);
      const container = this.containers[name];
      if (container) this._vacate(container, uid);
    } else if (parent.startsWith('inner:')) {
      const hostUid = parent.slice(6);
      const host = this.items.get(hostUid);
      if (host && host.innerGrid) this._vacate(host.innerGrid, uid);
    } else {
      // 附件/子槽
      const parentItem = this.items.get(parent);
      if (parentItem) {
        if (parentItem.attachments) {
          for (const k in parentItem.attachments) {
            if (parentItem.attachments[k] === uid) parentItem.attachments[k] = null;
          }
        }
        if (parentItem.subSlots) {
          for (const k in parentItem.subSlots) {
            if (parentItem.subSlots[k] === uid) parentItem.subSlots[k] = null;
          }
        }
      }
    }
    this.parentOf.set(uid, null);
  }

  /* ====================== 序列化 ====================== */
  serialize() {
    const items = [];
    for (const item of this.items.values()) {
      const copy = JSON.parse(JSON.stringify(item));
      // innerGrid 里存的是对象，JSON.stringify 会把它还原成 {w, h, slots: Map, items: Map} 的错乱对象
      // 所以手动替换成可序列化格式
      if (item.innerGrid) {
        copy.innerGrid = item.innerGrid.toJSON();
      }
      items.push(copy);
    }
    const parentOf = [];
    for (const [k, v] of this.parentOf) parentOf.push([k, v]);
    const containers = {};
    for (const name in this.containers) {
      containers[name] = this.containers[name].toJSON();
    }
    return {
      _version: 2,
      items,
      parentOf,
      equipped: JSON.parse(JSON.stringify(this.equipped)),
      containers,
      uidCounter: _uidCounter,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.items.clear();
    this.parentOf.clear();

    // 判断是否新版
    const stashC = data.containers && data.containers.stash;
    const isV2 = data._version === 2 ||
                 (stashC && !Array.isArray(stashC.uids) && stashC.w !== undefined);

    if (isV2) {
      this._deserializeV2(data);
    } else {
      this._deserializeV1(data);
    }
  }

  _deserializeV2(data) {
    // 1. 物品
    for (const raw of data.items || []) {
      const item = raw;
      // 恢复 innerGrid
      if (item.innerGrid) {
        item.innerGrid = GridContainer.fromJSON(item.innerGrid);
      }
      this.items.set(item.uid, item);
    }
    // 2. parentOf
    for (const [k, v] of data.parentOf || []) this.parentOf.set(k, v);
    // 3. equipped
    this.equipped = data.equipped || {};
    for (const slot of EQUIP_SLOTS) {
      if (!(slot in this.equipped)) this.equipped[slot] = null;
    }
    // 4. containers
    this.containers = {};
    for (const name of CONTAINER_NAMES) {
      const raw = data.containers && data.containers[name];
      this.containers[name] = raw
        ? GridContainer.fromJSON(raw)
        : new GridContainer(CONTAINER_DEFAULTS[name].w, CONTAINER_DEFAULTS[name].h);
    }
    // 5. 修正背包/胸挂的 containers 引用
    if (this.equipped.backpack) {
      const bp = this.items.get(this.equipped.backpack);
      if (bp && bp.innerGrid) this.containers.bag = bp.innerGrid;
    }
    if (this.equipped.chestRig) {
      const cr = this.items.get(this.equipped.chestRig);
      if (cr && cr.innerGrid) this.containers.chest = cr.innerGrid;
    }
    _uidCounter = data.uidCounter || 0;
  }

  _deserializeV1(data) {
    // 1. 物品（补 w/h/innerGrid/searched）
    for (const item of data.items || []) {
      const def = this.content.get(item.table, item.defId);
      if (item.w === undefined) item.w = def ? (def.w || 1) : 1;
      if (item.h === undefined) item.h = def ? (def.h || 1) : 1;
      if (item.rotated === undefined) item.rotated = false;
      if (item.searched === undefined) item.searched = true;
      if (item.innerGrid === undefined) {
        if (item.table === 'backpack' || item.table === 'chestRig') {
          const innerW = def ? (def.innerW || 0) : 0;
          const innerH = def ? (def.innerH || 0) : 0;
          item.innerGrid = new GridContainer(innerW, innerH);
        } else {
          item.innerGrid = null;
        }
      }
      this.items.set(item.uid, item);
    }
    // 2. parentOf
    for (const [k, v] of data.parentOf || []) this.parentOf.set(k, v);
    // 3. equipped
    this.equipped = data.equipped || {};
    for (const slot of EQUIP_SLOTS) {
      if (!(slot in this.equipped)) this.equipped[slot] = null;
    }
    // 4. containers：uids 数组 → grid
    this.containers = {};
    for (const name of CONTAINER_NAMES) {
      const old = data.containers && data.containers[name];
      const d = CONTAINER_DEFAULTS[name];
      const grid = new GridContainer(d.w, d.h);
      this.containers[name] = grid;

      if (old && Array.isArray(old.uids)) {
        for (const uid of old.uids) {
          const item = this.items.get(uid);
          if (!item) continue;
          const slot = this._findSlot(grid, item.w, item.h, false);
          if (slot) {
            const pw = slot.rotated ? item.h : item.w;
            const ph = slot.rotated ? item.w : item.h;
            this._occupy(grid, uid, slot.x, slot.y, pw, ph, slot.rotated);
            item.rotated = slot.rotated;
          } else {
            // 放不下的先不处理，等玩家手动整理
            console.warn('[Inv] 迁移时空间不足，物品未放置:', uid);
          }
        }
      }
    }
    // 5. 背包/胸挂：把容器内容交给 innerGrid 并重新指向
    if (this.equipped.backpack) {
      const bp = this.items.get(this.equipped.backpack);
      if (bp) {
        const oldBag = this.containers.bag;
        if (bp.innerGrid) {
          // 老存档里装备的背包，容器内容本来就在 containers.bag
          // 把旧内容塞进 innerGrid（直接接管）
          bp.innerGrid = oldBag;
        }
        this.containers.bag = bp.innerGrid || oldBag;
        for (const [childUid] of this.containers.bag.items) {
          this.parentOf.set(childUid, 'c:bag');
        }
      }
    }
    if (this.equipped.chestRig) {
      const cr = this.items.get(this.equipped.chestRig);
      if (cr) {
        const oldChest = this.containers.chest;
        if (cr.innerGrid) {
          cr.innerGrid = oldChest;
        }
        this.containers.chest = cr.innerGrid || oldChest;
        for (const [childUid] of this.containers.chest.items) {
          this.parentOf.set(childUid, 'c:chest');
        }
      }
    }
    _uidCounter = data.uidCounter || 0;
  }
}
