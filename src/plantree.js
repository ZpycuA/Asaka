/* ============================================================
   LaiAsaka Engine · 计划树
   ------------------------------------------------------------
   设定中的“计划树”是金色树形分支，同时负责剧情轨迹追踪与存档管理。
   本模块的约定：
     · 节点位置/文案全部来自 story/asaka-plan.js，不在代码里写死剧情；
     · “已完成 / 当前 / 未抵达”三种状态由 AsakaSave 计算，不存第二套状态；
     · 自动存档只有一个，只有关键节点可读，未点亮节点不可跳转。
   ============================================================ */

import { ASAKA_PLAN, getPlanNode } from './story/asaka-plan.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class PlanTree {
  constructor(app){
    this.app = app;
    this.save = app.asakaSave;
    this.selectedId = null;
    this.open = false;
    this._bound = false;
    this._build();
  }

  _build(){
    this.root = document.getElementById('plan-tree-screen');
    if (!this.root) {
      console.warn('[PlanTree] 缺少 #plan-tree-screen，跳过初始化');
      return;
    }
    this.root.innerHTML = `
      <div class="pt-stars"></div>
      <div class="pt-head">
        <div class="pt-heading">
          <span class="pt-kicker">ASAKA · PLAN TREE</span>
          <h2>计划树</h2>
          <p id="pt-subtitle">每一次选择，都会在这里长出一根枝</p>
        </div>
        <div class="pt-head-actions">
          <button class="title-btn small" id="pt-close">返回大厅</button>
        </div>
      </div>
      <div class="pt-body">
        <div class="pt-canvas" id="pt-canvas">
          <svg id="pt-svg" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid meet" aria-label="计划树"></svg>
          <div class="pt-knot-badge" id="pt-knot-badge" title="唯一自动存档">
            <span class="pt-knot" aria-hidden="true">${this._knotSvg()}</span>
            <div><b>自动存档</b><span id="pt-knot-label">尚未写入</span></div>
          </div>
          <div class="pt-legend">
            <span><i class="lg-current"></i>当前</span>
            <span><i class="lg-done"></i>已抵达</span>
            <span><i class="lg-locked"></i>未抵达</span>
          </div>
        </div>
        <aside class="pt-panel" id="pt-panel"></aside>
      </div>
      <div class="pt-foot">
        <span>只有关键节点会自动存档，全局仅保留一个自动存档；剧情演出途中不能存档。</span>
        <span id="pt-save-status">尚未开始</span>
      </div>`;
    this.svg = this.root.querySelector('#pt-svg');
    this.panel = this.root.querySelector('#pt-panel');
    this.root.querySelector('#pt-close')?.addEventListener('click', () => this.close());
    this.root.addEventListener('pointerdown', (ev) => {
      if (ev.target === this.root) this.close();
    });
    this._bound = true;
    this.selectedId = 'root';
  }

  show(){
    if (!this.root) return;
    this.open = true;
    // 默认选中“当前进度”，而不是每次都从根节点开始读。
    const cur = this.save && this.save.data ? this.save.data.node : null;
    if (cur && getPlanNode(cur)) this.selectedId = cur;
    this.root.classList.add('on');
    this._refresh();
  }

  close(){
    this.open = false;
    this.root?.classList.remove('on');
  }

  _state(id){
    try { return this.save.nodeState(id); }
    catch (_) { return 'locked'; }
  }

  _refresh(){
    if (!this.root) return;
    const autosave = this.save.getAutosave();
    const status = this.root.querySelector('#pt-save-status');
    if (status) {
      status.textContent = this.save.hasSave()
        ? '当前进度：' + (getPlanNode(this.save.data.node)?.label || this.save.data.node)
        : '尚未开始';
    }
    const knotLabel = this.root.querySelector('#pt-knot-label');
    if (knotLabel) {
      knotLabel.textContent = autosave
        ? (getPlanNode(autosave.nodeId)?.label || autosave.nodeId) + ' · ' + this._time(autosave.at)
        : '尚未写入';
    }
    const badge = this.root.querySelector('#pt-knot-badge');
    if (badge) badge.classList.toggle('has-save', !!autosave);
    this._renderTree();
    this._renderPanel(this.selectedId);
  }

  _time(iso){
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch (_) { return String(iso); }
  }

  _renderTree(){
    if (!this.svg) return;
    const nodes = ASAKA_PLAN.nodes;
    const byId = new Map(nodes.map(n => [n.id, n]));
    const parts = [];

    parts.push(`
      <defs>
        <linearGradient id="pt-gold" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#6b4a16"/>
          <stop offset="55%" stop-color="#d7a63f"/>
          <stop offset="100%" stop-color="#ffe6a0"/>
        </linearGradient>
        <linearGradient id="pt-gold-dim" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#2a2113"/>
          <stop offset="100%" stop-color="#59451e"/>
        </linearGradient>
        <radialGradient id="pt-node-core" cx="42%" cy="38%" r="65%">
          <stop offset="0%" stop-color="#fff6d5"/>
          <stop offset="45%" stop-color="#ffd873"/>
          <stop offset="100%" stop-color="#8b6424"/>
        </radialGradient>
        <filter id="pt-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="pt-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="12"/>
        </filter>
      </defs>
      <g class="pt-root-flare" filter="url(#pt-soft)">
        <ellipse cx="500" cy="616" rx="190" ry="26" fill="rgba(216,166,63,.22)"/>
      </g>`);

    // 主根与枝干：从父节点画一条带弧度的金线
    for (const n of nodes) {
      if (!n.parent) continue;
      const p = byId.get(n.parent);
      if (!p) continue;
      const midY = (p.y + n.y) / 2;
      const d = `M ${p.x} ${p.y} C ${p.x} ${midY}, ${n.x} ${midY}, ${n.x} ${n.y}`;
      const state = this._state(n.id);
      const lit = state === 'completed' || state === 'current';
      parts.push(`<path d="${d}" class="pt-branch ${lit ? 'lit' : ''} ${n.ending ? 'ending' : ''}" />`);
    }

    for (const n of nodes) {
      const state = this._state(n.id);
      const selected = n.id === this.selectedId;
      const auto = this.save.isAutoSaveNode(n.id);
      const labelX = n.x >= 620 ? n.x + 18 : (n.x <= 380 ? n.x - 18 : n.x + 18);
      const anchor = n.x <= 380 ? 'end' : 'start';
      const cls = ['pt-node', state, selected ? 'selected' : '', n.ending ? 'ending' : '', auto ? 'autosave' : ''].join(' ');
      parts.push(`<g class="${cls}" data-node="${n.id}" transform="translate(${n.x},${n.y})">
        <circle class="pt-node-halo" r="${state === 'current' ? 26 : 20}"></circle>
        <circle class="pt-node-ring" r="10.5"></circle>
        <circle class="pt-node-core" r="${state === 'locked' ? 3.2 : 4.6}"></circle>
        ${auto ? '<g class="pt-mini-knot"><ellipse rx="8.5" ry="4.2"/><ellipse rx="8.5" ry="4.2" transform="rotate(60)"/><ellipse rx="8.5" ry="4.2" transform="rotate(120)"/></g>' : ''}
        <text class="pt-label" x="${labelX}" y="3" text-anchor="${anchor}">${this._esc(n.label)}</text>
        <text class="pt-sublabel" x="${labelX}" y="19" text-anchor="${anchor}">${this._esc(n.sub || '')}</text>
      </g>`);
    }

    this.svg.innerHTML = parts.join('');
    this.svg.querySelectorAll('[data-node]').forEach(g => {
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.selectedId = g.dataset.node;
        this._renderTree();
        this._renderPanel(this.selectedId);
      });
    });
  }

  _renderPanel(id){
    if (!this.panel) return;
    const n = getPlanNode(id) || getPlanNode('root');
    if (!n) return;
    const state = this._state(n.id);
    const autosave = this.save.getAutosave();
    const isCurrentAutosave = !!(autosave && autosave.nodeId === n.id);
    const canLoad = isCurrentAutosave && this.save.hasSave();
    const stateText = { current: '当前节点', completed: '已抵达', unlocked: '已抵达', locked: '尚未抵达' }[state] || '尚未抵达';
    const autoLine = n.autosave
      ? (isCurrentAutosave
        ? `<div class="pt-auto-box has">${this._knotSvg()}<div><b>自动存档 · ${this._time(autosave.at)}</b><span>${this._esc(autosave.label || '关键节点')}</span></div></div>`
        : `<div class="pt-auto-box">${this._knotSvg()}<div><b>关键节点</b><span>${state === 'locked' ? '尚未抵达，无法写入自动存档' : '已抵达，但被更新后的关键节点覆盖'}</span></div></div>`)
      : `<div class="pt-auto-box plain"><div><b>普通节点</b><span>不写入自动存档，只记录轨迹</span></div></div>`;

    this.panel.innerHTML = `
      <div class="pt-panel-kicker">${n.ending ? 'ENDING' : (n.autosave ? 'KEY NODE' : 'BRANCH')}</div>
      <h3>${this._esc(n.label)}</h3>
      <div class="pt-panel-sub">${this._esc(n.sub || '')} · <span class="pt-state ${state}">${stateText}</span></div>
      <p class="pt-desc">${this._esc(n.desc || '')}</p>
      ${autoLine}
      <div class="pt-panel-actions">
        <button class="title-btn primary" id="pt-load" ${canLoad ? '' : 'disabled'}>读取此自动存档</button>
        <button class="title-btn" id="pt-back">返回大厅</button>
      </div>
      <div class="pt-panel-note">计划树不是存档列表。每个分支点都会覆盖唯一的自动存档；你无法回到已经错过的节点。</div>`;
    this.panel.querySelector('#pt-load')?.addEventListener('click', () => this._load());
    this.panel.querySelector('#pt-back')?.addEventListener('click', () => this.close());
  }

  _load(){
    const autosave = this.save.getAutosave();
    if (!autosave) return;
    if (autosave.nodeId !== this.selectedId) return;
    this.close();
    if (this.app && typeof this.app.continueAsaka === 'function') {
      this.app.continueAsaka({ fromPlanTree: true });
    }
  }

  _knotSvg(){
    return `<svg class="pt-knot-svg" viewBox="0 0 60 60" aria-hidden="true">
      <g class="knot-spin">
        <ellipse cx="30" cy="30" rx="22" ry="10" transform="rotate(0 30 30)"/>
        <ellipse cx="30" cy="30" rx="22" ry="10" transform="rotate(60 30 30)"/>
        <ellipse cx="30" cy="30" rx="22" ry="10" transform="rotate(120 30 30)"/>
      </g>
    </svg>`;
  }

  _esc(str){
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
}
