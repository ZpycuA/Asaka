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
  valuables: 1,
  medical: 4,
};

const EQUIP_SLOTS = [
  'main', 'side', 'melee',
  'helmetShell', 'helmetVisor', 'helmetEar',
  'vestFiber', 'vestPlate',
  'backpack', 'chestRig',
];

const EQUIP_TABLE = {
  main: 'weapons', side: 'weapons', melee: '__aux__',
  helmetShell: 'helmetShell', helmetVisor: 'helmetVisor', helmetEar: 'helmetEar',
  vestFiber: 'vestFiber', vestPlate: 'vestPlate',
  backpack: 'backpack', chestRig: 'chestRig',
};

const CONTAINER_NAMES = ['chest', 'pocket', 'bag', 'safe', 'stash', 'loot'];
// 计入负重、并受硬上限约束的随身容器（仓库/搜刮临时容器不在此列）
const CARRY_CONTAINER_NAMES = ['chest', 'pocket', 'bag', 'safe'];

const CONTAINER_DEFAULTS = {
  chest:  { w: 0,  h: 0 },   // 由 chestRig 提供
  pocket: { w: 2,  h: 2 },   // 4 格
  bag:    { w: 0,  h: 0 },   // 由 backpack 提供
  safe:   { w: 3,  h: 1 },   // 3 格
  stash:  { w: 20, h: 10 },  // 200 格
  loot:   { w: 8,  h: 6 },   // 搜索时的临时容器（冗余 48 格）
};

const WEAPON_ATTACH_SLOTS = ['muzzle', 'sight', 'mag', 'grip'];

// 未显式配置重量时的兜底（单位：kg；弹药为单发重量）
const DEFAULT_ITEM_WEIGHT = {
  weapons: 3.0, ammo: 0.012, melee: 0.5,
  helmetShell: 1.3, helmetVisor: 0.7, helmetEar: 0.12,
  vestFiber: 3.0, vestPlate: 2.6,
  backpack: 1.5, chestRig: 0.9,
  nade: 0.6, cons: 0.1, attach: 0.3,
  valuables: 0.1, medical: 0.12,
};

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
    // 明确负重上限（kg）。0 表示不限；战局里由 GameWorld 按角色/背包写入。
    // 只有“随身容器”受限制，仓库交易不受影响。
    this.maxCarryWeight = 0;
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
      // ★ 重量（kg；弹药为单发重量，堆叠时乘以数量）
      weight: extras.weight !== undefined ? extras.weight
        : (def.weight !== undefined ? def.weight : (DEFAULT_ITEM_WEIGHT[table] || 0.2)),
      // ★ 电子属性：EMP 只损坏 electronics 物品；empShielded 表示电磁加固（降低概率，非免疫）
      electronics: def.electronics === true,
      empShielded: def.empShielded === true,
      damaged: extras.damaged === true,
      // 电磁冲刷/加固被击穿的痕迹：跨容器转移时必须保留，否则“损坏物品一秒修好”
      empSurge: extras.empSurge || 0,
      empHardenedHit: extras.empHardenedHit === true,
      category: def.category || (table === 'valuables' ? '贵重品' : (table === 'medical' ? '医疗' : '')),
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
  
 item.loaded = { ammoType, qty: loadedQty, queue: [] };
if (extras.loadedQueue && Array.isArray(extras.loadedQueue)) {
  // ★ 还原敌人的彩虹子弹队列
  item.loaded.queue = [...extras.loadedQueue];
  item.loaded.qty = extras.loadedQueue.length;
} else if (loadedQty > 0) {
  for (let i = 0; i < loadedQty; i++) item.loaded.queue.push(ammoType);
}
}

    // ★ 容器类物品初始化 innerGrid
    if (table === 'backpack' || table === 'chestRig') {
      const innerW = def.innerW || 0;
      const innerH = def.innerH || 0;
      item.innerGrid = new GridContainer(innerW, innerH);
    }
    if (table === 'weapons') this.normalizeLoaded(item);

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

  // 旧存档补新字段：电子属性、损坏状态、分类、重量
  _hydrateItem(item) {
    if (!item) return;
    const def = this.content.get(item.table, item.defId);
    if (!def) return;
    if (item.electronics === undefined) item.electronics = def.electronics === true;
    if (item.empShielded === undefined) item.empShielded = def.empShielded === true;
    if (item.damaged === undefined) item.damaged = false;
    if (item.category === undefined) {
      item.category = def.category || (item.table === 'valuables' ? '贵重品' : (item.table === 'medical' ? '医疗' : ''));
    }
    if (item.weight === undefined) {
      item.weight = def.weight !== undefined ? def.weight : (DEFAULT_ITEM_WEIGHT[item.table] || 0.2);
    }
  }

  /* ====================== 武器弹链（loaded.queue） ======================
     弹链是唯一真相源：
       item.loaded.queue = [ammoDefId, ammoDefId, ...] 按“下一发→最后一发”排序
       item.loaded.qty   = queue.length（只做缓存，不应独立写入）
       item.loaded.ammoType = 兼容口径/默认弹种，队列为空时用于兜底
     禁止再添加 item.mag 之类的平行弹匣字段。
     ==================================================================== */
  normalizeLoaded(item) {
    if (!item || item.table !== 'weapons') return null;
    const def = this.content.get('weapons', item.defId);
    // ★ 弹匣容量 = 武器基础容量 × 弹匣配件修正。所有读写都必须走这里，
    //   否则扩容弹匣装到 40 发后，下一次 normalizeLoaded 会按 30 发截断，子弹凭空消失。
    let cap = def ? (def.mag || 0) : 0;
    if (item.attachments && this.getAttachmentStats) {
      const mods = this.getAttachmentStats(item);
      if (mods && mods.magMul && mods.magMul !== 1) cap = Math.max(1, Math.round(cap * mods.magMul));
    }
    // 清理历史遗留的 item.mag 平行字段，防止旧存档继续制造双语义
    if (item.mag !== undefined) delete item.mag;
    if (!item.loaded || typeof item.loaded !== 'object') {
      item.loaded = { ammoType: def ? def.ammoType : null, qty: 0, queue: [] };
    }
    const L = item.loaded;
    if (!Array.isArray(L.queue)) L.queue = [];
    // 旧存档只有 qty/ammoType 时，按默认弹种补出队列
    if (L.queue.length === 0 && (L.qty || 0) > 0) {
      const id = L.ammoType || (def && def.ammoType);
      if (id) {
        const n = Math.min(cap, Math.max(0, L.qty | 0));
        for (let i = 0; i < n; i++) L.queue.push(id);
      }
    }
    if (cap > 0 && L.queue.length > cap) L.queue.length = cap;
    L.qty = Math.min(L.queue.length, cap);
    // 下一发决定当前“显示弹种”；队列空时保留默认弹种
    if (L.queue.length > 0) L.ammoType = L.queue[0];
    else if (!L.ammoType && def) L.ammoType = def.ammoType;
    return { def, cap, loaded: L };
  }

  isAmmoCompatible(weaponDef, ammoDef) {
    return !!(weaponDef && ammoDef && ammoDef.caliber && ammoDef.caliber === weaponDef.ammoType);
  }

  // 按队列顺序返回连续的弹种分组，供详情面板“弹链”显示
  getLoadedGroups(item) {
    const norm = this.normalizeLoaded(item);
    if (!norm) return [];
    const groups = [];
    for (const id of norm.loaded.queue) {
      const last = groups[groups.length - 1];
      if (last && last.ammoId === id) last.count++;
      else groups.push({ ammoId: id, count: 1 });
    }
    return groups;
  }

  // 列出所有容器里与武器口径兼容的弹药（用于“选择弹种装填”）
  listCompatibleAmmo(weaponItem, containerNames) {
    const norm = this.normalizeLoaded(weaponItem);
    if (!norm || !norm.def) return [];
    const names = containerNames || ['chest', 'pocket', 'bag', 'safe', 'stash'];
    const seen = new Map();
    for (const cName of names) {
      const c = this.containers[cName];
      if (!c || !c.isActive) continue;
      for (const uid of c.items.keys()) {
        const it = this.items.get(uid);
        if (!it || it.table !== 'ammo' || !(it.qty > 0)) continue;
        const ad = this.content.get('ammo', it.defId);
        if (!this.isAmmoCompatible(norm.def, ad)) continue;
        const cur = seen.get(it.defId) || { defId: it.defId, def: ad, qty: 0, uids: [] };
        cur.qty += it.qty || 0;
        cur.uids.push(uid);
        seen.set(it.defId, cur);
      }
    }
    return Array.from(seen.values());
  }

  // 从某个弹药物品 UID 装填指定数量到弹链尾部
  loadAmmoFromItem(weaponUid, ammoUid, count) {
    const weapon = this.items.get(weaponUid);
    const ammo = this.items.get(ammoUid);
    const norm = this.normalizeLoaded(weapon);
    if (!norm || !ammo || ammo.table !== 'ammo') return { ok: false, reason: 'no_item' };
    const ammoDef = this.content.get('ammo', ammo.defId);
    if (!this.isAmmoCompatible(norm.def, ammoDef)) return { ok: false, reason: 'caliber' };
    const space = Math.max(0, norm.cap - norm.loaded.queue.length);
    const take = Math.min(space, ammo.qty || 0, Math.max(1, count || 0));
    if (take <= 0) return { ok: false, reason: space <= 0 ? 'full' : 'empty' };
    for (let i = 0; i < take; i++) norm.loaded.queue.push(ammo.defId);
    norm.loaded.qty = norm.loaded.queue.length;
    norm.loaded.ammoType = norm.loaded.queue[0] || norm.loaded.ammoType;
    weapon.loadedPreference = ammoDef.id || ammo.defId;
    ammo.qty -= take;
    if (ammo.qty <= 0) this.destroyItem(ammoUid);
    return { ok: true, taken: take };
  }

  // 按弹种从弹链中取出指定数量；从队首开始匹配，保持其余子弹顺序
  unloadAmmo(weaponUid, ammoId, count) {
    const weapon = this.items.get(weaponUid);
    const norm = this.normalizeLoaded(weapon);
    if (!norm || norm.loaded.queue.length === 0) return { ok: false, reason: 'empty' };
    const want = Math.max(1, count || norm.loaded.queue.length);
    const removed = [];
    const keep = [];
    for (const id of norm.loaded.queue) {
      if (removed.length < want && (!ammoId || id === ammoId)) removed.push(id);
      else keep.push(id);
    }
    if (!removed.length) return { ok: false, reason: 'not_found' };
    // 先把取出的子弹按弹种建造成弹药物品；任何一个放不下就整体回滚
    const counts = new Map();
    for (const id of removed) counts.set(id, (counts.get(id) || 0) + 1);
    const created = [];
    for (const [id, qty] of counts) {
      const uid = this.createItem('ammo', id, { qty, lockValue: true });
      if (!uid) { for (const c of created) this.destroyItem(c); return { ok: false, reason: 'create' }; }
      const targets = ['bag', 'chest', 'pocket', 'safe', 'stash'];
      let placed = false;
      for (const t of targets) {
        if (this.addToContainer(t, uid).ok) { placed = true; break; }
      }
      if (!placed) {
        this.destroyItem(uid);
        for (const c of created) this.destroyItem(c);
        return { ok: false, reason: 'no_space' };
      }
      created.push(uid);
    }
    norm.loaded.queue = keep;
    norm.loaded.qty = keep.length;
    norm.loaded.ammoType = keep[0] || norm.def.ammoType;
    return { ok: true, removed: removed.length };
  }

  countCompatibleAmmo(weaponDef, containerNames) {
    if (!weaponDef) return 0;
    const names = containerNames || ['chest', 'pocket', 'bag', 'safe', 'stash'];
    let total = 0;
    for (const cName of names) {
      const c = this.containers[cName];
      if (!c || !c.isActive) continue;
      for (const uid of c.items.keys()) {
        const it = this.items.get(uid);
        if (!it || it.table !== 'ammo') continue;
        const ad = this.content.get('ammo', it.defId);
        if (this.isAmmoCompatible(weaponDef, ad)) total += it.qty || 0;
      }
    }
    return total;
  }

  consumeCompatibleAmmo(weaponDef, count, containerNames) {
    if (!weaponDef || count <= 0) return 0;
    const names = containerNames || ['chest', 'pocket', 'bag', 'safe', 'stash'];
    let left = count;
    for (const cName of names) {
      if (left <= 0) break;
      const c = this.containers[cName];
      if (!c || !c.isActive) continue;
      for (const uid of Array.from(c.items.keys())) {
        if (left <= 0) break;
        const it = this.items.get(uid);
        if (!it || it.table !== 'ammo') continue;
        const ad = this.content.get('ammo', it.defId);
        if (!this.isAmmoCompatible(weaponDef, ad)) continue;
        const take = Math.min(it.qty || 0, left);
        it.qty -= take;
        left -= take;
        if (it.qty <= 0) this.destroyItem(uid);
      }
    }
    return count - left;
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
    if (item.subSlots) {
      for (const k in item.subSlots) {
        if (item.subSlots[k]) total += this.getItemValue(item.subSlots[k]);
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

  /* ====================== 重量 ====================== */
  // 单件物品重量（含配件与内部容器物品）
  getItemWeight(itemOrUid) {
    const item = typeof itemOrUid === 'string' ? this.items.get(itemOrUid) : itemOrUid;
    if (!item) return 0;
    const def = this.getDef(item);
    const unit = item.weight !== undefined ? item.weight
      : (def && def.weight !== undefined ? def.weight : (DEFAULT_ITEM_WEIGHT[item.table] || 0.2));
    let w = unit * (item.qty || 1);
    if (item.attachments) {
      for (const k in item.attachments) {
        if (item.attachments[k]) w += this.getItemWeight(item.attachments[k]);
      }
    }
    if (item.innerGrid) {
      for (const [uid] of item.innerGrid.items) w += this.getItemWeight(uid);
    }
    // 子槽（例如护甲纤维里的插板）：物品本体挂在宿主上，重量必须计入
    if (item.subSlots) {
      for (const k in item.subSlots) {
        if (item.subSlots[k]) w += this.getItemWeight(item.subSlots[k]);
      }
    }
    return w;
  }

  getContainerWeight(name) {
    const c = this.containers[name];
    if (!c) return 0;
    let w = 0;
    for (const uid of c.items.keys()) w += this.getItemWeight(uid);
    return w;
  }

  // 携带重量：装备槽（背包/胸挂只算本体，内容物由 chest/bag 容器统计）+ chest/pocket/bag/safe
  /* ====================== 电磁脉冲损坏 ======================
     规则：只有 def.electronics 的物品会被 EMP 影响。
       · 无电磁加固（empShielded=false）：按强度概率直接损坏。
       · 电磁加固（empShielded=true）：不是无敌，仍有低概率被击穿/烧毁电路；
         未损坏也会标记“受强电磁干扰”，提示玩家设备被冲刷过。
     损坏后 valueMul 大幅降低，名称与详情由 UI 显示为“[损坏]”，武器不可再开火。
     ========================================================== */
  applyEmpDamage(strength = 1, includeStash = false) {
    const out = { damaged: [], spared: [], hardenedHit: [] };
    for (const item of this.items.values()) {
      if (!item || !item.electronics || item.damaged) continue;
      const parent = this.parentOf.get(item.uid);
      if (!includeStash && parent === 'c:stash') continue;
      if (item.empShielded) {
        // 电磁加固：按强度只有 ~2%~20% 概率被击穿
        const hardenedChance = Math.max(0.02, Math.min(0.2, 0.07 * strength));
        if (Math.random() > hardenedChance) {
          item.empSurge = Math.max(item.empSurge || 0, strength);
          // 加固不等于零损伤：有耐久的设备会被电磁场冲刷掉一点耐久
          if (item.durMax > 0) item.dur = Math.max(0, item.dur - item.durMax * 0.04 * strength);
          out.spared.push(item);
          continue;
        }
        item.empHardenedHit = true;
        out.hardenedHit.push(item);
      }
      const chance = Math.max(0.05, Math.min(1, strength));
      if (Math.random() > chance) { out.spared.push(item); continue; }
      item.damaged = true;
      item.valueMul = Math.max(0.03, (item.valueMul || 1) * 0.12);
      if (item.table === 'weapons' && item.loaded) {
        // 电子击发/供弹组件损坏：弹链保留，但武器不能开火
        item.loaded.disabled = true;
      }
      out.damaged.push(item);
    }
    return out;
  }

  getCarryWeight() {
    let w = 0;
    const eqSlots = ['main', 'side', 'melee', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig'];
    for (const slot of eqSlots) {
      const uid = this.equipped[slot];
      if (!uid) continue;
      const item = this.items.get(uid);
      if (!item) continue;
      if (slot === 'backpack' || slot === 'chestRig') {
        w += (item.weight || 0) * (item.qty || 1);
      } else {
        w += this.getItemWeight(item);
      }
    }
    for (const name of ['chest', 'pocket', 'bag', 'safe']) w += this.getContainerWeight(name);
    return w;
  }

  // ★ 物品当前是否真正“在身上”：装备槽或随身容器（含随身背包的内部网格）。
  //   仓库 c:stash、搜刮临时容器 c:loot 不算携带，从这些位置搬进背包必须重新计重。
  //   旧实现把所有 c: 都当成已携带，导致开箱/从仓库取物完全绕过负重硬上限。
  isCarried(uid) {
    let path = this.parentOf.get(uid);
    let guard = 0;
    while (path && guard++ < 16) {
      if (path === 'c:chest' || path === 'c:pocket' || path === 'c:bag' || path === 'c:safe') return true;
      if (path.startsWith('eq:')) return true;
      if (path.startsWith('inner:')) {
        const hostUid = path.slice(6);
        if (!this.items.get(hostUid)) return false;
        path = this.parentOf.get(hostUid);
        continue;
      }
      // 子槽（护甲里的插板）与配件：parentOf 直接记录宿主物品 UID，继续向上追溯
      if (this.items.has(path)) {
        path = this.parentOf.get(path);
        continue;
      }
      return false;
    }
    return false;
  }

  // 目标容器是否属于“随身承重空间”：inner: 取决于宿主是否被携带。
  _isCarryTarget(name) {
    if (name.startsWith('inner:')) return this.isCarried(name.slice(6));
    return CARRY_CONTAINER_NAMES.includes(name);
  }

  // 硬上限判定：extraWeight 缺省时按该物品重量计算。
  wouldExceedCarryWeight(uid, extraWeight) {
    if (!(this.maxCarryWeight > 0)) return false;
    const extra = extraWeight !== undefined ? extraWeight : this.getItemWeight(uid);
    return this.getCarryWeight() + extra > this.maxCarryWeight + 1e-4;
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
  let container;
  let parentPath;

  if (name.startsWith('inner:')) {
    const hostUid = name.slice(6);
    const host = this.items.get(hostUid);
    if (!host || !host.innerGrid) return { ok: false, reason: 'no_target' };
    container = host.innerGrid;
    parentPath = name;
  } else {
    container = this.containers[name];
    parentPath = 'c:' + name;
  }

  const item = this.items.get(uid);
  if (!container || !item) return { ok: false, reason: 'no_target' };
  if (!container.isActive) return { ok: false, reason: 'no_capacity' };

  if (this.wouldCreateCycle(uid, parentPath)) {
    return { ok: false, reason: 'cycle' };
  }

  // ★ 负重硬上限：只拦截“新带进随身容器”的物品，已在身上的物品挪位置不会重复计算。
  //   超限时拒绝放入，调用方（转移/拾取/拆分）会回滚并提示。
  //   inner: 也必须检查——否则把战利品塞进背包内部网格就能无限超载。
  if (!opts.ignoreWeight && this._isCarryTarget(name) && !this.isCarried(uid) &&
      this.wouldExceedCarryWeight(uid)) {
    return { ok: false, reason: 'overweight' };
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
  this.parentOf.set(uid, parentPath);
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

    // ★ 负重硬上限：从搜刮容器/仓库直接拖到装备槽，同样必须先过承重检查。
    //   已在身上的物品换槽不重复计重。
    // 插板槽单独处理：installPlate 会按“新插板 - 被换下旧插板”的净增重判断，
    // 否则从地上捡一块同重量的新板替换时会被当前旧板的重量重复卡住。
    if (slot !== 'vestPlate' && this.maxCarryWeight > 0 && !this.isCarried(uid) && this.wouldExceedCarryWeight(uid)) {
      return { ok: false, reason: 'overweight' };
    }

    // ★ 插板不再单独穿戴：只能装进当前护甲纤维的子槽。
    //   保留 vestPlate 槽位只是为了兼容旧存档/旧入口，实际数据落在 fiber.subSlots.plate。
    if (slot === 'vestPlate') {
      const fiberUid = this.equipped.vestFiber;
      if (!fiberUid) return { ok: false, reason: 'need_fiber' };
      const r = this.installPlate(fiberUid, uid);
      if (!r.ok) return r;
      return { ok: true, swapped: r.swapped, nested: true, fiberUid };
    }

    const expectedTable = EQUIP_TABLE[slot];
if (expectedTable) {
  if (expectedTable === '__aux__') {
    if (item.table !== 'weapons' && item.table !== 'melee') {
      return { ok: false, reason: 'type_mismatch' };
    }
  } else if (item.table !== expectedTable) {
    return { ok: false, reason: 'type_mismatch' };
  }
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
  // 拆分后必须落在“原物品所在的那个容器”里；只有放不下时才退到其他随身容器。
  // 旧版只认 c:xxx，把 inner:（背包内部网格）的物品拆到别处，甚至拆完
  // 新堆叠 parentOf 悬空，UI 就出现“数量少了、拆出来的东西不见了”。
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
      damaged: item.damaged === true,
      empSurge: item.empSurge || 0,
    });
    if (!newUid) return { ok: false, reason: 'create_failed' };

    const originalParent = this.parentOf.get(uid);
    const targets = [];
    const pushTarget = (name) => { if (name && !targets.includes(name)) targets.push(name); };
    // 1) 原容器（inner: 与 c: 都必须保留）
    if (originalParent && (originalParent.startsWith('c:') || originalParent.startsWith('inner:'))) {
      pushTarget(originalParent.startsWith('c:') ? originalParent.slice(2) : originalParent);
    }
    // 2) UI 指定的优先容器
    if (preferredContainer) pushTarget(preferredContainer);
    // 3) 其他随身容器
    for (const t of ['chest', 'pocket', 'bag', 'safe', 'stash']) pushTarget(t);

    for (const t of targets) {
      const c = t.startsWith('inner:') ? null : this.containers[t];
      if (!t.startsWith('inner:') && (!c || !c.isActive)) continue;
      const r = this.addToContainer(t, newUid, { noMerge: true, ignoreWeight: true });
      if (r.ok) {
        item.qty -= count;
        return { ok: true, newUid, container: t };
      }
    }

    this.destroyItem(newUid);
    return { ok: false, reason: 'no_space' };
  }

 transferItem(targetInv, uid, targetContainer) {
  const item = this.items.get(uid);
  if (!item) return { ok: false, reason: 'no_item' };
  // 源弹链先留档：createItem 内部会用基础弹匣容量做一次 normalize，
  // 扩容弹匣多出来的子弹要在这之后补回去，否则跨容器搬枪会掉子弹。
  const srcQueue = item.loaded && Array.isArray(item.loaded.queue) ? [...item.loaded.queue] : null;

  // ★ 跨 Inventory 装备前先做槽位类型校验，避免"先迁移子物品再失败"造成内容丢失
  if (typeof targetContainer === 'string' && targetContainer.startsWith('eq:')) {
    const slot = targetContainer.slice(3);
    const expected = EQUIP_TABLE[slot];
    if (!expected) return { ok: false, reason: 'bad_slot' };
    if (expected === '__aux__') {
      if (item.table !== 'weapons' && item.table !== 'melee') {
        return { ok: false, reason: 'type_mismatch' };
      }
    } else if (item.table !== expected) {
      return { ok: false, reason: 'type_mismatch' };
    }
  }

  // ★ 跨 Inventory 直接装备也要过负重硬上限；此时目标 Inventory 里还没有新 UID，
  //   用源物品的完整重量（含配件/插板/内部网格）预判，失败则整体不迁移。
  //   插板是“替换”而不是新增：只计算新板与已装在纤维里的旧板之差。
  if (typeof targetContainer === 'string' && targetContainer.startsWith('eq:') &&
      targetInv.maxCarryWeight > 0) {
    const eqSlot = targetContainer.slice(3);
    let extra = this.getItemWeight(item);
    if (eqSlot === 'vestPlate') {
      const fiberUid = targetInv.equipped.vestFiber;
      const fiber = fiberUid ? targetInv.items.get(fiberUid) : null;
      const oldPlateUid = fiber && fiber.subSlots && fiber.subSlots.plate;
      if (oldPlateUid && targetInv.isCarried(fiberUid)) {
        extra -= targetInv.getItemWeight(oldPlateUid);
      }
    }
    if (targetInv.getCarryWeight() + Math.max(0, extra) > targetInv.maxCarryWeight + 1e-4) {
      return { ok: false, reason: 'overweight' };
    }
  }

  const newUid = targetInv.createItem(item.table, item.defId, {
    qty: item.qty,
    lockValue: true,
    valueMul: item.valueMul,
    dur: item.dur,
    loadedQty: item.loaded ? item.loaded.qty : 0,
    loadedQueue: item.loaded && item.loaded.queue ? [...item.loaded.queue] : null,
    // ★ 损坏/电磁冲刷状态必须随物品一起迁移，不能因为换了个背包就“修好”
    damaged: item.damaged === true,
    empSurge: item.empSurge || 0,
    empHardenedHit: item.empHardenedHit === true,
    // ★ 配件 UID 属于源 Inventory，不能直接复制到目标 Inventory；
    //   下面会逐个重建配件，否则会留下指向不存在物品的幽灵槽位。
    attachments: null
  });

  if (!newUid) return { ok: false };

  const newItem = targetInv.items.get(newUid);
  // EMP 导致电子击发组件失效：弹链还在，但 disabled 必须保留
  if (newItem && item.loaded && item.loaded.disabled && newItem.loaded) newItem.loaded.disabled = true;

  // ★ 转移配件：在目标 Inventory 重建配件物品，并挂到新武器的槽位上。
  //   必须在 normalizeLoaded 之前完成，否则扩容弹匣里的 40 发会先被按 30 发截断。
  if (item.attachments && newItem && newItem.attachments) {
    for (const slot in item.attachments) {
      const aUid = item.attachments[slot];
      if (!aUid) continue;
      const aItem = this.items.get(aUid);
      if (!aItem) { item.attachments[slot] = null; continue; }
      const na = targetInv.createItem('attach', aItem.defId, {
        qty: aItem.qty, dur: aItem.dur, lockValue: true, valueMul: aItem.valueMul,
        damaged: aItem.damaged === true, empSurge: aItem.empSurge || 0,
      });
      if (na) {
        newItem.attachments[slot] = na;
        targetInv.parentOf.set(na, newUid);
      }
      // 原配件先保留在原武器上；等整个转移成功后，源武器 destroyItem 会一并回收。
      // 这样转移失败（负重超限/目标容器满）时不会出现“配件先没了”。
    }
  }
  if (newItem) {
    const norm = targetInv.normalizeLoaded(newItem);
    if (norm && srcQueue && srcQueue.length > norm.loaded.queue.length) {
      const cap = norm.cap || norm.loaded.queue.length;
      newItem.loaded.queue = srcQueue.slice(0, cap);
      newItem.loaded.qty = newItem.loaded.queue.length;
      newItem.loaded.ammoType = newItem.loaded.queue[0] || newItem.loaded.ammoType;
    }
  }

  // ★ 子槽物品（护甲里的插板）：跟着宿主一起跨 Inventory 转移，
  //   否则从尸体扒护甲时里面的插板会变成幽灵物品或直接消失。
  if (item.subSlots && newItem) {
    newItem.subSlots = {};
    for (const subSlot in item.subSlots) {
      const suid = item.subSlots[subSlot];
      if (!suid) { newItem.subSlots[subSlot] = null; continue; }
      const sItem = this.items.get(suid);
      if (!sItem) { newItem.subSlots[subSlot] = null; continue; }
      const nsuid = targetInv.createItem(sItem.table, sItem.defId, {
        qty: sItem.qty, dur: sItem.dur, lockValue: true, valueMul: sItem.valueMul,
        damaged: sItem.damaged === true, empSurge: sItem.empSurge || 0,
      });
      if (nsuid) {
        newItem.subSlots[subSlot] = nsuid;
        targetInv.parentOf.set(nsuid, newUid);
      }
    }
  }

  // ★ 递归转移 innerGrid：先转移子物品，再把容器本身放入目标容器
  if (item.innerGrid && newItem && newItem.innerGrid) {
    const childUids = Array.from(item.innerGrid.items.keys());
    for (const childUid of childUids) {
      this.transferItem(targetInv, childUid, `inner:${newUid}`);
    }
  }

  // ★ 支持跨 Inventory 直接装备（targetContainer = 'eq:main' 等）。
  //   先把目标槽位旧装备卸下，让旧背包/胸挂的内部物品 parentOf 正确回挂，
  //   否则直接覆盖 equipped[slot] 会让旧容器的子物品变成幽灵物品。
  if (typeof targetContainer === 'string' && targetContainer.startsWith('eq:')) {
    const slot = targetContainer.slice(3);
    const prevUid = targetInv.equipped[slot] || null;
    if (prevUid) targetInv.unequip(slot);

    const r = targetInv.equip(slot, newUid);
    if (!r.ok) {
      if (prevUid && targetInv.items.get(prevUid)) targetInv.equip(slot, prevUid);
      targetInv.destroyItem(newUid);
      return { ok: false, reason: r.reason };
    }

    this.destroyItem(uid);
    return { ok: true, newUid, swapped: r.swapped || prevUid };
  }

  const r = targetInv.addToContainer(targetContainer, newUid);
  if (!r.ok) {
    targetInv.destroyItem(newUid);
    return { ok: false, reason: r.reason };
  }

  this.destroyItem(uid);
  return { ok: true, newUid };
}

  /* ====================== 配件操作 ====================== */
  // 兼容性校验：槽位 / 武器型号 / 弹匣口径都从 content 表派生，禁止 UI 另写一套。
  canAttach(weaponItem, attachItem, slot) {
    if (!weaponItem || !attachItem) return { ok: false, reason: 'no_item' };
    if (!weaponItem.attachments || weaponItem.table !== 'weapons') return { ok: false, reason: 'not_weapon' };
    if (attachItem.table !== 'attach') return { ok: false, reason: 'type_mismatch' };
    const aDef = this.getDef(attachItem);
    const wDef = this.getDef(weaponItem);
    if (!aDef || !wDef) return { ok: false, reason: 'no_def' };
    if (!(slot in weaponItem.attachments)) return { ok: false, reason: 'bad_slot' };
    if (aDef.slot && aDef.slot !== slot) return { ok: false, reason: 'wrong_slot' };
    if (Array.isArray(aDef.fits) && aDef.fits.length && !aDef.fits.includes(weaponItem.defId)) {
      return { ok: false, reason: 'incompatible_weapon' };
    }
    if (aDef.caliber && aDef.caliber !== wDef.ammoType) return { ok: false, reason: 'incompatible_caliber' };
    return { ok: true };
  }

  // 汇总一件武器全部配件的乘算修正；调用方只读，不要缓存成武器 def 的平行字段。
  getAttachmentStats(weaponItem) {
    const out = { spreadMul: 1, recoilMul: 1, adsSpreadMul: 1, rangeMul: 1, soundMul: 1, magMul: 1, reloadMul: 1, zoom: 1, laser: false, count: 0, list: [] };
    if (!weaponItem || !weaponItem.attachments) return out;
    for (const slot in weaponItem.attachments) {
      const uid = weaponItem.attachments[slot];
      if (!uid) continue;
      const a = this.items.get(uid);
      if (!a) continue;
      const def = this.getDef(a);
      if (!def || !def.stats) continue;
      out.count++;
      out.list.push({ slot, item: a, def });
      for (const k of ['spreadMul', 'recoilMul', 'adsSpreadMul', 'rangeMul', 'soundMul', 'magMul', 'reloadMul']) {
        if (typeof def.stats[k] === 'number') out[k] *= def.stats[k];
      }
      // 倍镜取最大倍率而不是叠乘；激光只标记是否安装
      if (typeof def.stats.zoom === 'number') out.zoom = Math.max(out.zoom, def.stats.zoom);
      if (def.stats.laser === true) out.laser = true;
    }
    return out;
  }

  attachTo(weaponUid, slot, attachUid) {
    const weapon = this.items.get(weaponUid);
    const attach = this.items.get(attachUid);
    if (!weapon || !attach) return { ok: false, reason: 'no_item' };
    if (attach.table !== 'attach') return { ok: false, reason: 'type_mismatch' };
    if (!weapon.attachments) return { ok: false, reason: 'not_weapon' };
    if (!(slot in weapon.attachments)) return { ok: false, reason: 'bad_slot' };

    const compat = this.canAttach(weapon, attach, slot);
    if (!compat.ok) return compat;

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
    // 子槽既接受通用配件（attach），也接受护甲专用的插板（vestPlate）。
    const isPlateSlot = (subSlot === 'plate' && attach.table === 'vestPlate');
    if (attach.table !== 'attach' && !isPlateSlot) return { ok: false, reason: 'type_mismatch' };

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

  // 插板安装：只能装进护甲纤维；返回被替换下来的旧插板，由调用方放回原空间。
  installPlate(fiberUid, plateUid) {
    const fiber = this.items.get(fiberUid);
    const plate = this.items.get(plateUid);
    if (!fiber || !plate) return { ok: false, reason: 'no_item' };
    if (fiber.table !== 'vestFiber') return { ok: false, reason: 'need_fiber' };
    if (plate.table !== 'vestPlate') return { ok: false, reason: 'not_plate' };
    // 从搜刮容器/仓库直接装板也要过承重硬上限；替换时只计算净增重。
    if (this.maxCarryWeight > 0 && !this.isCarried(plateUid)) {
      let extra = this.getItemWeight(plate);
      const oldUid = fiber.subSlots && fiber.subSlots.plate;
      if (oldUid && this.isCarried(fiberUid)) extra -= this.getItemWeight(oldUid);
      if (this.getCarryWeight() + Math.max(0, extra) > this.maxCarryWeight + 1e-4) {
        return { ok: false, reason: 'overweight' };
      }
    }
    return this.attachToSubSlot(fiberUid, 'plate', plateUid);
  }

  detachSubSlot(hostUid, subSlot) {
    const host = this.items.get(hostUid);
    if (!host || !host.subSlots) return null;
    const uid = host.subSlots[subSlot];
    if (!uid) return null;
    host.subSlots[subSlot] = null;
    this.parentOf.set(uid, null);
    const item = this.items.get(uid);
    if (item) item.rotated = false;
    return uid;
  }

  /* ====================== 自环检测 ====================== */
  wouldCreateCycle(sourceUid, targetParent) {
  if (!targetParent) return false;
  if (targetParent.startsWith('eq:')) return false;

  if (targetParent.startsWith('c:')) {
    const name = targetParent.slice(2);
    const container = this.containers[name];
    const source = this.items.get(sourceUid);
    if (source && source.innerGrid && container === source.innerGrid) return true;
    return this.isDescendant(sourceUid, targetParent);
  }

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
    this._hydrateItem(item);
    // 恢复 innerGrid
    if (item.innerGrid) {
      item.innerGrid = GridContainer.fromJSON(item.innerGrid);
    }
    
    // ★ 核心修复：修复旧存档里武器丢失的 loaded 结构
    if (item.table === 'weapons') {
      const def = this.content.get('weapons', item.defId);
      const magCap = def ? (def.mag || 0) : 0;
      if (!item.loaded) {
        item.loaded = { ammoType: def ? def.ammoType : '9mm', qty: magCap, queue: [] };
        for (let i = 0; i < magCap; i++) item.loaded.queue.push(item.loaded.ammoType);
      } else if (!item.loaded.queue) {
        item.loaded.queue = [];
        for (let i = 0; i < item.loaded.qty; i++) item.loaded.queue.push(item.loaded.ammoType);
      }
      this.normalizeLoaded(item);
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
    this._hydrateItem(item);
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
    
    // ★ 核心修复：修复旧存档武器丢失 loaded 结构
    if (item.table === 'weapons') {
      const magCap = def ? (def.mag || 0) : 0;
      if (!item.loaded) {
        item.loaded = { ammoType: def ? def.ammoType : '9mm', qty: magCap, queue: [] };
      }
      if (!item.loaded.queue) {
        item.loaded.queue = [];
        for (let i = 0; i < item.loaded.qty; i++) item.loaded.queue.push(item.loaded.ammoType);
      }
      this.normalizeLoaded(item);
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
