/* ============================================================
   LaiAsaka Engine · Asaka 主模式存档
   ------------------------------------------------------------
   主模式（Asaka）与 Straight 的存档彼此独立。
   规则（来自设定集）：
     · 演出/剧情途中不允许存档；
     · 只有关键节点会写入自动存档，且全局只有一个自动存档槽；
     · 读档只能回到关键节点，不能回到任意一句台词。
   本模块只负责“存什么、什么时候能存”，不负责渲染。
   ============================================================ */

const STORAGE_KEY = 'LaiAsaka_AsakaSave_v1';

// 允许写入自动存档的关键节点。不在表里的节点只能被记录为“已读过”，不能落盘。
// 以后新增关键节点时，在这里登记，并让剧情/任务在该节点调用 autosave()。
const AUTOSAVE_NODES = new Set([
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
    version: 1,
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
    // 队友好感度（主模式长期数据）
    affection: {},
    // 唯一自动存档
    autosave: null,
    // 关键选择轨迹，计划树与“剧情轨迹追踪”共用
    trail: [],
  };
}

export class AsakaSave {
  constructor(){
    this.key = STORAGE_KEY;
    this.data = this._read();
  }

  _read(){
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyData();
      const base = emptyData();
      const data = Object.assign(base, parsed);
      if (!Array.isArray(data.unlocked)) data.unlocked = ['root'];
      if (!data.flags || typeof data.flags !== 'object') data.flags = {};
      if (!data.affection || typeof data.affection !== 'object') data.affection = {};
      if (!data.storySeen || typeof data.storySeen !== 'object') data.storySeen = {};
      if (!Array.isArray(data.trail)) data.trail = [];
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
    this._unlock('root');
    this._unlock('prologue_start');
    this.save();
    return this.data;
  }

  save(){
    try {
      this.data.updatedAt = Date.now();
      localStorage.setItem(this.key, JSON.stringify(this.data));
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

  setNode(id, opts = {}){
    if (!id) return false;
    this.data.node = id;
    this._unlock(id);
    if (opts.flags && typeof opts.flags === 'object') {
      Object.assign(this.data.flags, opts.flags);
    }
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

  // 唯一自动存档：只接受关键节点，后写覆盖前写。
  autosave(nodeId, extra = {}){
    if (!AUTOSAVE_NODES.has(nodeId)) {
      console.warn('[AsakaSave] 非关键节点，拒绝自动存档：' + nodeId);
      return false;
    }
    this.data.node = nodeId;
    this._unlock(nodeId);
    this.data.autosave = {
      nodeId,
      at: nowIso(),
      chapter: extra.chapter || null,
      label: extra.label || '',
      flags: Object.assign({}, this.data.flags),
      affection: Object.assign({}, this.data.affection),
      storySeen: Object.assign({}, this.data.storySeen),
      trail: this.data.trail.slice(-24),
    };
    return this.save();
  }

  markStorySeen(chapterId){
    if (!chapterId) return;
    this.data.storySeen[chapterId] = true;
    this.save();
  }

  hasSeenStory(chapterId){
    return !!this.data.storySeen[chapterId];
  }

  getAutosave(){
    return this.data.autosave || null;
  }

  // 从唯一的自动存档回到关键节点：只回滚该节点之后的选择与 flag。
  restoreAutosave(){
    const a = this.data.autosave;
    if (!a) return false;
    this.data.node = a.nodeId;
    this.data.flags = Object.assign({}, a.flags || {});
    this.data.affection = Object.assign({}, a.affection || {});
    this.data.storySeen = Object.assign({}, a.storySeen || {});
    this.data.trail = Array.isArray(a.trail) ? a.trail.slice() : [];
    this._unlock(a.nodeId);
    return this.save();
  }

  // 计划树节点的状态：completed / current / unlocked / locked
  nodeState(nodeId){
    if (!this.data.started) return nodeId === 'root' ? 'current' : 'locked';
    if (this.data.node === nodeId) return 'current';
    if (this.data.autosave && this.data.autosave.nodeId === nodeId) return 'completed';
    if (this.data.unlocked.includes(nodeId)) return 'completed';
    return 'locked';
  }

  isAutoSaveNode(nodeId){
    return !!(this.data.autosave && this.data.autosave.nodeId === nodeId);
  }

  reset(){
    this.data = emptyData();
    return this.save();
  }
}
