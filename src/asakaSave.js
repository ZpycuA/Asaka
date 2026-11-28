/* ============================================================
   LaiAsaka Engine · Asaka 主模式存档
   ------------------------------------------------------------
   主模式与 Straight 的存档彼此独立。存档分两类：
     · latest    ─ 退出战局/关闭页面前保存的“最新状态”；
     · keyframes ─ 所有重要节点各保存一份，可在计划树回档。
   剧情演出途中不写盘；只有章节开始/结束等关键节点才写 keyframe。
   ============================================================ */

// ★ 固定存档槽：浏览器写 localStorage 的固定键；以后转为桌面端时
//   对应固定文件 saves/asaka.json，不提供运行时导入/导出。
const STORAGE_KEY = 'LaiAsaka_AsakaSave_v2';

// 允许写入“重要节点”的白名单。不在表里的节点只能记录进度，不能成为回档点。
const KEY_NODES = new Set([
  'prologue_start',
  'prologue_end',
  'base_purchased',
  'squad_formed',
  'first_deployment',
  'before_sandcity',
  'end_te',
  'end_se',
  'end_he',
  'end_lonely',
]);

function nowIso(){
  try { return new Date().toISOString(); } catch (_) { return String(Date.now()); }
}

function emptyData(){
  return {
    version: 2,
    started: false,
    createdAt: 0,
    updatedAt: 0,
    // 当前进度节点（计划树 node id）
    node: 'root',
    // 已抵达/已读过的计划树节点
    unlocked: ['root'],
    // 已看过的剧情章节
    storySeen: {},
    // 剧情选择写入的 flags（信任、阵营态度、后续分支）
    flags: {},
    // 队友好感度（主模式长期数据；玩家只看到定性描述）
    affection: {},
    // ★ 队伍成员与长期属性（Aselevel、技能经验、默契等）；剧情/战局结算写入。
    partyRoster: [],
    partyGear: {},
    attributes: {},
    compatibility: {},
    abilities: [],
    // ★ 主模式自己的信用点与住所状态，和 Straight 的 credits 分开。
    credits: 0,
    home: { purchased: false, node: null },
    // ★ 任务/计划进程：当前主线、阶段、完成记录。由任务系统与剧情效果共同写。
    missions: { current: null, active: {}, done: {} },
    // 主模式建立新档时是否已锁定玩法模板
    profileLocked: null,
    // 关键选择轨迹
    trail: [],
    // 主模式当前库存（序列化后的 Inventory；与 Straight 的 save.data.inventory 完全独立）
    inventory: null,
    // 队伍持续状态：部位、伤口、失血、效果；只有主模式写
    party: {},
    // 退出前最新状态（唯一）
    latest: null,
    // 所有重要节点快照（可回档）
    keyframes: {},
  };
}

export class AsakaSave {
  constructor(){
    this.key = STORAGE_KEY;
    this.data = this._read();
  }

  _read(){
    try {
      const raw = localStorage.getItem(this.key)
        || localStorage.getItem('LaiAsaka_AsakaSave_v1');
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyData();
      const data = Object.assign(emptyData(), parsed);
      if (!Array.isArray(data.unlocked)) data.unlocked = ['root'];
      if (!data.flags || typeof data.flags !== 'object') data.flags = {};
      if (!data.affection || typeof data.affection !== 'object') data.affection = {};
      if (!data.storySeen || typeof data.storySeen !== 'object') data.storySeen = {};
      if (!Array.isArray(data.trail)) data.trail = [];
      if (!Array.isArray(data.partyRoster)) data.partyRoster = [];
      if (!data.partyGear || typeof data.partyGear !== 'object') data.partyGear = {};
      if (!data.attributes || typeof data.attributes !== 'object') data.attributes = {};
      if (!data.compatibility || typeof data.compatibility !== 'object') data.compatibility = {};
      if (!Array.isArray(data.abilities)) data.abilities = [];
      if (typeof data.credits !== 'number') data.credits = 0;
      if (!data.home || typeof data.home !== 'object') data.home = { purchased: false, node: null };
      if (!data.missions || typeof data.missions !== 'object') data.missions = { current: null, active: {}, done: {} };
      if (!data.keyframes || typeof data.keyframes !== 'object') data.keyframes = {};
      if (!data.latest || typeof data.latest !== 'object') data.latest = null;
      // v1 只有一个 autosave：迁移成“该节点的 keyframe + 最新状态”。
      if (parsed.autosave && parsed.autosave.nodeId) {
        const a = parsed.autosave;
        if (!data.keyframes[a.nodeId]) data.keyframes[a.nodeId] = Object.assign({}, a);
        if (!data.latest) data.latest = Object.assign({}, a);
      }
      delete data.autosave;
      data.version = 2;
      return data;
    } catch (e) {
      console.warn('[AsakaSave] 读取失败，使用空存档', e);
      return emptyData();
    }
  }

  hasSave(){
    return !!(this.data && this.data.started);
  }

  // 新游戏：清空主模式进度；不在任何剧情演出里调用。
  newGame(){
    this.data = emptyData();
    this.data.started = true;
    this.data.createdAt = Date.now();
    this.data.updatedAt = Date.now();
    this.data.node = 'prologue_start';
    this.data.credits = 4200;
    this.data.partyRoster = [];
    this.data.partyGear = {};
    this.data.attributes = {};
    this.data.compatibility = {};
    this.data.abilities = [];
    this.data.home = { purchased: false, node: null };
    this.data.missions = { current: null, active: {}, done: {} };
    this.data.profileLocked = null;
    this._unlock('root');
    this._unlock('prologue_start');
    this.save();
    return this.data;
  }

  save(){
    try {
      this.data.updatedAt = Date.now();
      localStorage.setItem(this.key, JSON.stringify(this.data));
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('asaka-saved', { detail: { at: this.data.updatedAt, node: this.data.node } }));
        }
      } catch (_) {}
      return true;
    } catch (e) {
      console.warn('[AsakaSave] 写入失败', e);
      return false;
    }
  }

  _unlock(id){
    if (!id) return;
    if (!this.data.unlocked.includes(id)) this.data.unlocked.push(id);
  }

  _snapshot(nodeId, extra = {}){
    return {
      nodeId,
      at: nowIso(),
      chapter: extra.chapter || null,
      label: extra.label || '',
      flags: Object.assign({}, this.data.flags),
      affection: Object.assign({}, this.data.affection),
      storySeen: Object.assign({}, this.data.storySeen),
      trail: this.data.trail.slice(-32),
      partyRoster: JSON.parse(JSON.stringify(this.data.partyRoster || [])),
      partyGear: JSON.parse(JSON.stringify(this.data.partyGear || {})),
      attributes: JSON.parse(JSON.stringify(this.data.attributes || {})),
      compatibility: JSON.parse(JSON.stringify(this.data.compatibility || {})),
      abilities: JSON.parse(JSON.stringify(this.data.abilities || [])),
      credits: this.data.credits || 0,
      home: JSON.parse(JSON.stringify(this.data.home || {})),
      missions: JSON.parse(JSON.stringify(this.data.missions || {})),
      inventory: this.data.inventory ? JSON.parse(JSON.stringify(this.data.inventory)) : null,
      party: this.data.party ? JSON.parse(JSON.stringify(this.data.party)) : {},
    };
  }

  setNode(id, opts = {}){
    if (!id) return false;
    this.data.node = id;
    this._unlock(id);
    if (opts.flags && typeof opts.flags === 'object') Object.assign(this.data.flags, opts.flags);
    if (opts.affection && typeof opts.affection === 'object') {
      for (const [k, v] of Object.entries(opts.affection)) {
        this.data.affection[k] = (this.data.affection[k] || 0) + Number(v || 0);
      }
    }
    if (opts.trail) {
      this.data.trail.push({ node: id, at: nowIso(), ...opts.trail });
      if (this.data.trail.length > 120) this.data.trail.splice(0, this.data.trail.length - 120);
    }
    return this.save();
  }

  // 重要节点快照：同一节点再次抵达会更新，不删除其它节点。
  saveKeyframe(nodeId, extra = {}){
    if (!KEY_NODES.has(nodeId)) {
      console.warn('[AsakaSave] 非关键节点，拒绝写入关键帧：' + nodeId);
      return false;
    }
    this.data.node = nodeId;
    this._unlock(nodeId);
    this.data.keyframes[nodeId] = this._snapshot(nodeId, extra);
    return this.save();
  }

  // 兼容旧调用名
  autosave(nodeId, extra = {}){
    return this.saveKeyframe(nodeId, extra);
  }

  // 退出前最新状态：唯一，覆盖前一次。
  saveLatest(extra = {}){
    if (!this.data.started) return false;
    this.data.latest = this._snapshot(this.data.node, extra);
    return this.save();
  }

  getLatest(){
    return this.data.latest || null;
  }

  // 兼容旧调用名：返回最新状态，没有则返回当前节点的关键帧。
  getAutosave(){
    if (this.data.latest) return this.data.latest;
    const k = this.data.keyframes[this.data.node];
    return k || null;
  }

  getKeyframe(nodeId){
    return this.data.keyframes[nodeId] || null;
  }

  hasKeyframe(nodeId){
    return !!this.data.keyframes[nodeId];
  }

  restoreSnapshot(snap){
    if (!snap) return false;
    this.data.node = snap.nodeId || this.data.node;
    this.data.flags = Object.assign({}, snap.flags || {});
    this.data.affection = Object.assign({}, snap.affection || {});
    this.data.storySeen = Object.assign({}, snap.storySeen || {});
    this.data.trail = Array.isArray(snap.trail) ? snap.trail.slice() : [];
    if (Array.isArray(snap.partyRoster)) this.data.partyRoster = snap.partyRoster.slice();
    if (snap.partyGear) this.data.partyGear = JSON.parse(JSON.stringify(snap.partyGear));
    if (snap.attributes) this.data.attributes = JSON.parse(JSON.stringify(snap.attributes));
    if (snap.compatibility) this.data.compatibility = JSON.parse(JSON.stringify(snap.compatibility));
    if (Array.isArray(snap.abilities)) this.data.abilities = snap.abilities.slice();
    if (typeof snap.credits === 'number') this.data.credits = snap.credits;
    if (snap.home) this.data.home = JSON.parse(JSON.stringify(snap.home));
    if (snap.missions) this.data.missions = JSON.parse(JSON.stringify(snap.missions));
    if (snap.inventory) this.data.inventory = JSON.parse(JSON.stringify(snap.inventory));
    if (snap.party) this.data.party = JSON.parse(JSON.stringify(snap.party));
    this._unlock(this.data.node);
    return this.save();
  }

  restoreLatest(){
    return this.restoreSnapshot(this.getLatest());
  }

  restoreAutosave(){
    return this.restoreLatest();
  }

  restoreKeyframe(nodeId){
    return this.restoreSnapshot(this.getKeyframe(nodeId));
  }

  markStorySeen(chapterId){
    if (!chapterId) return;
    this.data.storySeen[chapterId] = true;
    this.save();
  }

  hasSeenStory(chapterId){
    return !!this.data.storySeen[chapterId];
  }

  // 计划树节点状态：current / completed / locked
  nodeState(nodeId){
    if (!this.data.started) return nodeId === 'root' ? 'current' : 'locked';
    if (this.data.node === nodeId) return 'current';
    if (this.data.keyframes[nodeId]) return 'completed';
    if (this.data.unlocked.includes(nodeId)) return 'completed';
    return 'locked';
  }

  isAutoSaveNode(nodeId){
    return this.hasKeyframe(nodeId);
  }

  reset(){
    this.data = emptyData();
    return this.save();
  }
}
