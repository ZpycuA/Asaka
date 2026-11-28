/* ============================================================
   LaiAsaka Engine · 主线任务 / 计划追踪
   ------------------------------------------------------------
   任务只推动剧情与计划，不给“二游式奖励”。
   真相源：
     · content.missions  — 任务定义（标题/章节/描述/阶段/点位）；
     · AsakaSave.data.missions — 当前主线、各任务阶段、已完成记录。
   左上角只显示当前主线；点击进入任务页查看全部任务与阶段。
   剧情/战局通过 GameApp.startMission / advanceMission / completeMission 写入。
   ============================================================ */

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export class MissionSystem {
  constructor(app, world){
    this.app = app;
    this.world = world;
    this._waypointPoi = null;
    this._style();
    this._ensurePage();
    this.refresh();
  }

  _style(){
    if (document.getElementById('mission-style')) return;
    const st = document.createElement('style');
    st.id = 'mission-style';
    st.textContent = `
#top-left .task-panel{background:linear-gradient(180deg,rgba(10,12,16,.88),rgba(6,8,12,.72));border:1px solid rgba(216,170,80,.18);box-shadow:0 10px 30px rgba(0,0,0,.45)}
.mission-kicker{font-size:9px;letter-spacing:2px;color:#a78a56;text-shadow:0 2px 6px rgba(0,0,0,.9);margin-bottom:2px}
.mission-title{font-size:13px;font-weight:800;letter-spacing:2px;color:#ffe0a0;text-shadow:0 2px 8px rgba(0,0,0,.95);line-height:1.35}
.mission-stage{font-size:10px;color:#c8d9e8;text-shadow:0 2px 6px rgba(0,0,0,.9);line-height:1.55;margin-top:3px}
.mission-stage b{color:#ffd36b;font-weight:600}
.mission-more{margin-top:5px;font-size:9px;letter-spacing:1px;color:#87a6c0;background:none;border:none;padding:0;font-family:inherit;cursor:pointer;text-shadow:0 1px 4px #000;pointer-events:auto}
.mission-more:hover{color:#cfe8ff}
#mission-page{position:fixed;inset:0;z-index:145;display:none;background:rgba(4,7,11,.86);backdrop-filter:blur(6px);color:#e7edf5;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
#mission-page.on{display:flex;align-items:center;justify-content:center}
.mission-sheet{width:min(960px,94vw);max-height:88vh;display:flex;flex-direction:column;border-radius:14px;border:1px solid rgba(150,190,230,.28);background:linear-gradient(180deg,rgba(18,25,34,.98),rgba(7,10,15,.98));box-shadow:0 30px 100px rgba(0,0,0,.7)}
.mission-sheet-head{display:flex;justify-content:space-between;align-items:flex-end;padding:18px 22px 12px;border-bottom:1px solid rgba(150,190,230,.12)}
.mission-sheet-head h2{margin:0;font-size:20px;letter-spacing:5px;color:#ffe0a0}
.mission-sheet-head .sub{font-size:9px;letter-spacing:3px;color:#7f95a8;margin-top:3px}
.mission-sheet-body{display:grid;grid-template-columns:300px 1fr;gap:0;min-height:360px;overflow:hidden}
.mission-list{overflow-y:auto;border-right:1px solid rgba(150,190,230,.1);padding:10px}
.mission-entry{padding:9px 10px;border-radius:7px;border:1px solid transparent;cursor:pointer;margin-bottom:5px}
.mission-entry:hover{background:rgba(255,255,255,.04)}
.mission-entry.on{background:rgba(216,170,80,.10);border-color:rgba(216,170,80,.28)}
.mission-entry .mt{font-size:11px;color:#ffe0a0;line-height:1.4}
.mission-entry .mc{font-size:9px;color:#7f95a8;margin-top:2px}
.mission-entry .md{font-size:9px;color:#6fae82;margin-top:2px}
.mission-detail{padding:16px 20px;overflow-y:auto}
.mission-detail h3{margin:0 0 4px;font-size:16px;letter-spacing:3px;color:#ffd98a}
.mission-detail .mchap{font-size:9px;letter-spacing:2px;color:#8fa7bd}
.mission-detail .mdesc{font-size:12px;line-height:1.85;color:#cbd8e5;margin:12px 0}
.mission-detail .mstage{font-size:11px;line-height:1.8;padding:7px 9px;border-radius:6px;background:rgba(255,255,255,.035);margin-bottom:4px;color:#8fa3b6}
.mission-detail .mstage.on{color:#ffe7b0;background:rgba(216,170,80,.1);border-left:2px solid #d8aa50}
.mission-detail .mstage.done{color:#7fae8a}
.mission-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
.mission-actions button{padding:7px 14px;border-radius:6px;border:1px solid rgba(150,190,230,.3);background:rgba(40,70,100,.3);color:#d9e8f5;font-family:inherit;font-size:10px;letter-spacing:1px;cursor:pointer}
.mission-actions button:hover{border-color:rgba(255,210,120,.5);color:#ffe8c0}
.mission-close{padding:7px 16px;border-radius:6px;border:1px solid rgba(160,190,220,.35);background:rgba(30,45,60,.5);color:#d9e8f5;font-family:inherit;font-size:10px;letter-spacing:2px;cursor:pointer;align-self:flex-start}
`;
    document.head.appendChild(st);
  }

  _ensurePage(){
    let page = document.getElementById('mission-page');
    if (!page) {
      page = document.createElement('div');
      page.id = 'mission-page';
      page.innerHTML = '<div class="mission-sheet"><div class="mission-sheet-head"><div><h2>任务</h2><div class="sub">MISSIONS · 计划与主线</div></div><button class="mission-close" type="button">关闭</button></div><div class="mission-sheet-body"><div class="mission-list"></div><div class="mission-detail"></div></div></div>';
      document.getElementById('game-screen')?.appendChild(page) || document.body.appendChild(page);
      page.querySelector('.mission-close')?.addEventListener('click', () => this.close());
      page.addEventListener('pointerdown', (ev) => { if (ev.target === page) this.close(); });
    }
    this.page = page;
    this.elList = page.querySelector('.mission-list');
    this.elDetail = page.querySelector('.mission-detail');
  }

  _data(){
    const save = this.app && this.app.asakaSave;
    if (!save) return null;
    save.data.missions = save.data.missions || { current: null, active: {}, done: {} };
    save.data.missions.active = save.data.missions.active || {};
    save.data.missions.done = save.data.missions.done || {};
    return save.data.missions;
  }

  _defs(){
    return (this.app && this.app.engine && this.app.engine.content.all('missions')) || [];
  }

  _def(id){
    return (this._defs() || []).find(m => m.id === id) || null;
  }

  start(id){
    const d = this._data();
    const def = this._def(id);
    if (!d || !def) return false;
    d.active[id] = d.active[id] || { stage: 0, startedAt: Date.now() };
    d.current = id;
    this._save();
    this.refresh();
    return true;
  }

  advance(id, stage){
    const d = this._data();
    if (!d) return;
    const inst = d.active[id] || (d.active[id] = { stage: 0, startedAt: Date.now() });
    inst.stage = stage !== undefined ? Number(stage) : (inst.stage || 0) + 1;
    this._save();
    this.refresh();
  }

  complete(id){
    const d = this._data();
    if (!d) return;
    if (d.active[id]) {
      d.done[id] = { at: Date.now(), stage: d.active[id].stage || 0 };
      delete d.active[id];
    }
    if (d.current === id) d.current = null;
    // 自动把下一条 active 任务提为当前主线
    if (!d.current) {
      const next = Object.keys(d.active)[0];
      if (next) d.current = next;
    }
    this._save();
    this.refresh();
  }

  current(){
    const d = this._data();
    if (!d) return null;
    if (d.current && d.active[d.current]) return { id: d.current, def: this._def(d.current), inst: d.active[d.current] };
    for (const id of Object.keys(d.active)) {
      const def = this._def(id);
      if (def) return { id, def, inst: d.active[id] };
    }
    return null;
  }

  _save(){
    if (this.app && this.app.asakaSave) this.app.asakaSave.save();
  }

  renderTracker(){
    const el = document.getElementById('task-list');
    if (!el) return;
    const cur = this.current();
    if (!cur) {
      el.innerHTML = '<div class="mission-kicker">主线 · 暂无</div><div class="mission-stage">回到据点后，靠近大门准备下一次出战。</div>';
      return;
    }
    const def = cur.def;
    const stageIdx = Math.min((def.stages || []).length - 1, cur.inst.stage || 0);
    const stage = (def.stages || [])[stageIdx];
    el.innerHTML =
      '<div class="mission-kicker">主线 · ' + esc(def.chapter || '') + '</div>' +
      '<div class="mission-title">' + esc(this.app.engine.i18n.t(def.title || def.id)) + '</div>' +
      '<div class="mission-stage"><b>◈</b> ' + esc(stage ? (stage.text || '') : '') + '</div>' +
      '<button class="mission-more" type="button">查看全部任务 →</button>';
    const btn = el.querySelector('.mission-more');
    if (btn) btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); this.open(); });
  }

  refresh(){ this.renderTracker(); if (this.page && this.page.classList.contains('on')) this.open(); }

  open(){
    if (!this.page || !this.page.isConnected) this._ensurePage();
    this.page.classList.add('on');
    const defs = this._defs();
    const d = this._data() || { active: {}, done: {}, current: null };
    this._selected = this._selected && (d.active[this._selected] || d.done[this._selected]) ? this._selected : (d.current || Object.keys(d.active)[0] || (defs[0] && defs[0].id));
    let html = '';
    for (const def of defs) {
      if (def.hidden) continue;
      const active = !!d.active[def.id];
      const done = !!d.done[def.id];
      if (!active && !done && def.category !== 'main') continue;
      html += '<div class="mission-entry' + (this._selected === def.id ? ' on' : '') + '" data-mid="' + esc(def.id) + '">' +
        '<div class="mt">' + esc(this.app.engine.i18n.t(def.title || def.id)) + '</div>' +
        '<div class="mc">' + esc(def.chapter || '') + '</div>' +
        '<div class="md">' + (done ? '已完成' : (active ? '进行中' : '未开始')) + '</div></div>';
    }
    if (!html) html = '<div class="mission-stage">还没有可显示的任务。</div>';
    this.elList.innerHTML = html;
    this.elList.querySelectorAll('.mission-entry').forEach(el => {
      el.addEventListener('click', () => { this._selected = el.dataset.mid; this.open(); });
    });
    this._renderDetail();
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (_) {} }
  }

  _renderDetail(){
    const def = this._def(this._selected);
    if (!def) { this.elDetail.innerHTML = '<div class="mdesc">选择左侧任务查看详情。</div>'; return; }
    const d = this._data() || { active: {}, done: {} };
    const inst = d.active[def.id] || null;
    const done = d.done[def.id] || null;
    const stageIdx = inst ? (inst.stage || 0) : (done ? 99 : -1);
    const stages = def.stages || [];
    let stageHtml = '';
    stages.forEach((s, i) => {
      const cls = done || i < stageIdx ? 'done' : (i === stageIdx ? 'on' : '');
      stageHtml += '<div class="mstage ' + cls + '">' + (done || i < stageIdx ? '✓ ' : (i === stageIdx ? '◈ ' : '○ ')) + esc(s.text || '') + '</div>';
    });
    this.elDetail.innerHTML = '<h3>' + esc(this.app.engine.i18n.t(def.title || def.id)) + '</h3>' +
      '<div class="mchap">' + esc(def.category === 'main' ? '主线任务' : '支线任务') + ' · ' + esc(def.chapter || '') + '</div>' +
      '<div class="mdesc">' + esc(def.desc || '') + '</div>' +
      '<div class="mchap">阶段</div>' + stageHtml +
      '<div class="mission-actions">' +
        (def.waypoint ? '<button type="button" id="mission-waypoint">在小地图标记方向</button>' : '') +
        (inst ? '<button type="button" id="mission-complete">标记完成</button>' : '') +
      '</div>';
    this.elDetail.querySelector('#mission-waypoint')?.addEventListener('click', () => this.setWaypoint(def));
    this.elDetail.querySelector('#mission-complete')?.addEventListener('click', () => this.complete(def.id));
  }

  setWaypoint(def){
    if (!def || !def.waypoint || !this.world) return;
    if (this._waypointPoi) {
      const i = this.world.pois.indexOf(this._waypointPoi);
      if (i >= 0) this.world.pois.splice(i, 1);
    }
    this._waypointPoi = { x: def.waypoint.x, z: def.waypoint.z, type: 'mission', color: '#ffd36b' };
    this.world.pois.push(this._waypointPoi);
    if (this.world._log) {
      const p = this.world.player;
      const d = p ? Math.round(Math.hypot(p.body.position.x - def.waypoint.x, p.body.position.z - def.waypoint.z)) : 0;
      this.world._log('任务点已标记：' + this.app.engine.i18n.t(def.title || def.id) + '（约 ' + d + 'm）', 'p');
    }
    this.close();
  }

  close(){
    this.page?.classList.remove('on');
    if (this.app && this.app.home && this.app.home.isOpen && this.app.home.isOpen()) return;
    if (this.world) {
      const p = this.world.player;
      if (p && p.alive && this.world.running && !this.world.paused && !this.world._storyPlaying) {
        try { this.world.engine.input.requestPointerLock?.(); } catch (_) {}
      }
    }
  }
}
