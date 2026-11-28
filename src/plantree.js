/* ============================================================
   LaiAsaka Engine · 计划树
   ------------------------------------------------------------
   规则（与 AsakaSave 保持一致）：
     · 存档分两类：退出前最新状态 latest、所有重要节点 keyframe；
     · 从根部到当前节点的一条路径点亮，过去的节点可回档；
     · 未来节点只作为疏散的拟态枝显示，不给文字、不可点、不剧透；
     · 树是长地图，数据变长时画布自动变高，可上下滚动。
   ============================================================ */

import { ASAKA_PLAN, getPlanNode } from './story/asaka-plan.js';

export class PlanTree {
  constructor(app){
    this.app = app;
    this.save = app.asakaSave;
    this.selectedId = null;
    this.open = false;
    this._bound = false;
    this._lastScrollNode = null;
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
      <div class="pt-particles" id="pt-particles"></div>
      <div class="pt-head">
        <div class="pt-heading">
          <span class="pt-kicker">ASAKA · PLAN TREE</span>
          <h2>计划树</h2>
          <p id="pt-subtitle">每一次选择，都会在这里长出一根枝</p>
        </div>
        <div class="pt-head-actions">
          <button class="title-btn small" id="pt-latest">读取最新状态</button>
          <button class="title-btn small" id="pt-close">返回大厅</button>
        </div>
      </div>
      <div class="pt-body">
        <div class="pt-canvas" id="pt-canvas">
          <svg id="pt-svg" viewBox="0 0 1000 660" preserveAspectRatio="xMidYMid meet" aria-label="计划树"></svg>
          <div class="pt-legend">
            <span><i class="lg-current"></i>当前</span>
            <span><i class="lg-done"></i>已抵达</span>
            <span><i class="lg-locked"></i>未抵达</span>
            <span class="pt-scroll-hint">滚轮 / 拖动上下查看</span>
          </div>
        </div>
        <aside class="pt-panel" id="pt-panel"></aside>
      </div>
      <div class="pt-foot">
        <span>两类存档：退出前的最新状态 + 所有重要节点。未来节点不会显示内容。</span>
        <span id="pt-save-status">尚未开始</span>
      </div>`;
    this.svg = this.root.querySelector('#pt-svg');
    this.canvas = this.root.querySelector('#pt-canvas');
    this.panel = this.root.querySelector('#pt-panel');
    this.root.querySelector('#pt-close')?.addEventListener('click', () => this.close());
    this.root.querySelector('#pt-latest')?.addEventListener('click', () => this._loadLatest());
    this._spawnParticles();
    this._bindPan();
    this._bound = true;
    this.selectedId = 'root';
  }

  _spawnParticles(){
    const host = this.root.querySelector('#pt-particles');
    if (!host) return;
    host.innerHTML = '';
    for (let i = 0; i < 34; i++) {
      const s = document.createElement('i');
      const x = (i * 37 + 13) % 100;
      const y = (i * 61 + 7) % 100;
      s.style.left = x + '%';
      s.style.top = y + '%';
      s.style.animationDelay = (-(i * 0.73)).toFixed(2) + 's';
      s.style.animationDuration = (7 + (i % 7) * 1.6).toFixed(1) + 's';
      s.style.opacity = (0.12 + (i % 5) * 0.06).toFixed(2);
      host.appendChild(s);
    }
  }

  _bindPan(){
    if (!this.canvas) return;
    let drag = null;
    this.canvas.addEventListener('wheel', (ev) => {
      this.canvas.scrollTop += ev.deltaY;
      ev.preventDefault();
    }, { passive: false });
    this.canvas.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('.pt-node')) return;
      drag = { x: ev.clientX, y: ev.clientY, top: this.canvas.scrollTop };
      try { this.canvas.setPointerCapture(ev.pointerId); } catch (_) {}
    });
    this.canvas.addEventListener('pointermove', (ev) => {
      if (!drag) return;
      this.canvas.scrollTop = drag.top - (ev.clientY - drag.y);
    });
    const end = () => { drag = null; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  }

  show(){
    if (!this.root) return;
    this.open = true;
    const cur = this.save && this.save.data ? this.save.data.node : null;
    this.selectedId = (cur && getPlanNode(cur)) ? cur : 'root';
    this.root.classList.add('on');
    this._refresh(true);
  }

  close(){
    this.open = false;
    this.root?.classList.remove('on');
  }

  _state(id){
    try { return this.save.nodeState(id); }
    catch (_) { return 'locked'; }
  }

  // 从根到当前节点的祖先链；只有这条链是“点亮”的。
  _litPath(){
    const cur = this.save && this.save.data ? this.save.data.node : 'root';
    const out = new Set();
    let id = cur;
    let guard = 0;
    while (id && guard++ < 64) {
      out.add(id);
      const n = getPlanNode(id);
      if (!n || !n.parent) break;
      id = n.parent;
    }
    out.add('root');
    return out;
  }

  _refresh(keepScroll){
    if (!this.root) return;
    const autosave = this.save.getAutosave();
    const latest = this.save.getLatest();
    const status = this.root.querySelector('#pt-save-status');
    if (status) {
      status.textContent = this.save.hasSave()
        ? '当前：' + (getPlanNode(this.save.data.node)?.label || this.save.data.node)
        : '尚未开始';
    }
    const latestBtn = this.root.querySelector('#pt-latest');
    if (latestBtn) {
      latestBtn.disabled = !latest;
      latestBtn.title = latest ? '回到退出前状态' : '还没有退出前存档';
    }
    this._renderTree();
    this._renderPanel(this.selectedId);
    if (!keepScroll) this._scrollToCurrent();
    else this._scrollToCurrent();
  }

  _scrollToCurrent(){
    if (!this.canvas || !this._vb) return;
    if (this._lastScrollNode === this.save.data.node) return;
    const cur = getPlanNode(this.save.data.node);
    if (!cur) return;
    const ratio = (cur.y - this._vb.y) / this._vb.h;
    const top = Math.max(0, this.canvas.scrollHeight * ratio - this.canvas.clientHeight * 0.55);
    this.canvas.scrollTop = top;
    this._lastScrollNode = this.save.data.node;
  }

  _hash(str){
    let h = 2166136261;
    for (let i = 0; i < String(str).length; i++) h = (h ^ String(str).charCodeAt(i)) * 16777619;
    return Math.abs(h >>> 0);
  }

  _jitter(node, axis){
    const h = this._hash(node.id + ':' + axis);
    return ((h % 17) - 8) * 0.9;
  }

  _renderTree(){
    if (!this.svg) return;
    const nodes = ASAKA_PLAN.nodes;
    const byId = new Map(nodes.map(n => [n.id, n]));
    const lit = this._litPath();
    const currentId = this.save.data.node;
    // 动态高度：节点数据以后向下/向上扩展时，树自动变长并滚动。
    const ys = nodes.map(n => n.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 92;
    const vbY = minY - pad;
    const vbH = Math.max(660, (maxY - minY) + pad * 2);
    this._vb = { y: vbY, h: vbH };
    this.svg.setAttribute('viewBox', `0 ${vbY} 1000 ${vbH}`);
    // 保持宽高比，让长树在容器里自然出现纵向滚动
    this.svg.style.height = 'auto';

    const parts = [];
    parts.push(`
      <defs>
        <linearGradient id="pt-gold" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#6b4a16"/>
          <stop offset="55%" stop-color="#d7a63f"/>
          <stop offset="100%" stop-color="#ffe6a0"/>
        </linearGradient>
        <linearGradient id="pt-gold-dim" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#221b0e"/>
          <stop offset="100%" stop-color="#4e3c1a"/>
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
        <ellipse cx="500" cy="${maxY + 18}" rx="190" ry="26" fill="rgba(216,166,63,.22)"/>
      </g>`);

    // 主线：父 -> 子；已点亮的路径用亮金，未来的枝用暗金。
    for (const n of nodes) {
      if (!n.parent) continue;
      const p = byId.get(n.parent);
      if (!p) continue;
      const pyd = p.y + this._jitter(p, 'y');
      const nyd = n.y + this._jitter(n, 'y');
      const pxd = p.x + this._jitter(p, 'x');
      const nxd = n.x + this._jitter(n, 'x');
      const midY = (pyd + nyd) / 2;
      const bend = (this._hash(n.id) % 7 - 3) * 5;
      const d = `M ${pxd} ${pyd} C ${pxd + bend} ${midY}, ${nxd - bend} ${midY}, ${nxd} ${nyd}`;
      const isLit = lit.has(n.id) && lit.has(p.id);
      const cls = navClass(n, isLit);
      parts.push(`<path d="${d}" class="pt-branch ${cls} ${isLit ? 'lit' : 'ghost-branch'} ${n.ending ? 'ending' : ''}" />`);
    }

    // 装饰性拟态枝：只是效果，不是未来节点，不承载任何文字/交互。
    for (let i = 0; i < 9; i++) {
      const seed = this._hash('ghost' + i);
      const a = nodes[seed % nodes.length];
      if (!a) continue;
      const ax = a.x + this._jitter(a, 'x');
      const ay = a.y + this._jitter(a, 'y');
      const dir = seed % 2 ? 1 : -1;
      const dx = (34 + (seed % 70)) * dir;
      const dy = -(18 + (seed % 80));
      parts.push(`<path d="M ${ax} ${ay} C ${ax + dx * 0.5} ${ay + dy * 0.25}, ${ax + dx * 0.8} ${ay + dy * 0.7}, ${ax + dx} ${ay + dy}" class="pt-ghost-twig"/>`);
    }

    for (const n of nodes) {
      const state = this._state(n.id);
      const isLit = lit.has(n.id);
      const selected = n.id === this.selectedId;
      const hasKey = this.save.hasKeyframe(n.id);
      const x = n.x + this._jitter(n, 'x');
      const y = n.y + this._jitter(n, 'y');
      const labelX = n.x >= 620 ? x + 18 : (n.x <= 380 ? x - 18 : x + 18);
      const anchor = n.x <= 380 ? 'end' : 'start';
      const cls = ['pt-node', state, selected ? 'selected' : '', n.ending ? 'ending' : '',
        isLit ? 'lit' : 'locked', hasKey ? 'has-save' : ''].join(' ');
      parts.push(`<g class="${cls}" data-node="${n.id}" transform="translate(${x},${y})">
        <circle class="pt-node-halo" r="${state === 'current' ? 28 : (isLit ? 21 : 14)}"></circle>
        <circle class="pt-node-ring" r="${isLit ? (state === 'current' ? 10.5 : 8.5) : 3.4}"></circle>
        <circle class="pt-node-core" r="${isLit ? 4.6 : 2.6}"></circle>
        ${isLit ? `<text class="pt-label" x="${labelX}" y="3" text-anchor="${anchor}">${this._esc(n.label)}</text>
        <text class="pt-sublabel" x="${labelX}" y="19" text-anchor="${anchor}">${this._esc(n.sub || '')}</text>` : ''}
        ${hasKey && isLit ? `<g class="pt-mini-knot">${this._knotRings()}</g>` : ''}
      </g>`);
    }

    this.svg.innerHTML = parts.join('');
    this.svg.querySelectorAll('.pt-node.lit').forEach(g => {
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.selectedId = g.dataset.node;
        this._renderTree();
        this._renderPanel(this.selectedId);
      });
    });
  }

  _knotRings(){
    return `<ellipse rx="9.5" ry="4.6"/><ellipse rx="9.5" ry="4.6" transform="rotate(60)"/><ellipse rx="9.5" ry="4.6" transform="rotate(120)"/>`;
  }

  _renderPanel(id){
    if (!this.panel) return;
    const n = getPlanNode(id);
    if (!n) { this.panel.innerHTML = '<div class="pt-panel-empty">尚未抵达</div>'; return; }
    const state = this._state(n.id);
    const latest = this.save.getLatest();
    const key = this.save.getKeyframe(n.id);
    if (state === 'locked' || (!this._litPath().has(n.id))) {
      // 未来节点不显示名字、描述、时间或按钮——计划树不能剧透。
      this.panel.innerHTML = `<div class="pt-panel-kicker">UNKNOWN</div>
        <h3 class="pt-locked-title">未抵达</h3>
        <p class="pt-desc">这根枝还没有长出来。</p>`;
      return;
    }
    const stateText = state === 'current' ? '当前节点' : '已抵达';
    const autoLine = key
      ? `<div class="pt-auto-box has">${this._knotSvg()}<div><b>重要节点 · ${this._time(key.at)}</b><span>${this._esc(key.label || '关键节点')} · 可回档</span></div></div>`
      : `<div class="pt-auto-box plain"><div><b>普通节点</b><span>只有抵达记录，没有独立快照</span></div></div>`;
    const latestLine = latest
      ? `<div class="pt-latest-line"><span>退出前状态</span><b>${this._time(latest.at)}</b></div>`
      : `<div class="pt-latest-line dim"><span>退出前状态</span><b>尚未保存</b></div>`;
    this.panel.innerHTML = `
      <div class="pt-panel-kicker">${n.ending ? 'ENDING' : (key ? 'KEY NODE' : 'PATH')}</div>
      <h3>${this._esc(n.label)}</h3>
      <div class="pt-panel-sub">${this._esc(n.sub || '')} · <span class="pt-state ${state}">${stateText}</span></div>
      <p class="pt-desc">${this._esc(n.desc || '')}</p>
      ${autoLine}
      ${latestLine}
      <div class="pt-panel-actions">
        <button class="title-btn primary" id="pt-load" ${key ? '' : 'disabled'}>读取此重要节点</button>
        <button class="title-btn" id="pt-back">返回大厅</button>
      </div>
      <div class="pt-panel-note">重要节点是回档点；退出前状态是另一条独立存档。未来节点不会显示内容。</div>`;
    this.panel.querySelector('#pt-load')?.addEventListener('click', () => this._loadNode(n.id));
    this.panel.querySelector('#pt-back')?.addEventListener('click', () => this.close());
  }

  _loadNode(nodeId){
    if (!this.save.hasKeyframe(nodeId)) return;
    this.close();
    if (this.app && typeof this.app.continueAsaka === 'function') {
      this.app.continueAsaka({ nodeId });
    }
  }

  _loadLatest(){
    const latest = this.save.getLatest();
    if (!latest) return;
    this.close();
    if (this.app && typeof this.app.continueAsaka === 'function') {
      this.app.continueAsaka({});
    }
  }

  _knotSvg(){
    return `<svg class="pt-knot-svg" viewBox="0 0 60 60" aria-hidden="true">
      <g class="knot-spin">
        <ellipse cx="30" cy="30" rx="22" ry="10"/>
        <ellipse cx="30" cy="30" rx="22" ry="10" transform="rotate(60 30 30)"/>
        <ellipse cx="30" cy="30" rx="22" ry="10" transform="rotate(120 30 30)"/>
      </g>
    </svg>`;
  }

  _time(iso){
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch (_) { return String(iso); }
  }

  _esc(str){
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
}

function navClass(n, isLit){
  return isLit ? 'path' : 'future';
}
