/* ============================================================
   LaiAsaka Engine · 据点 / 队伍 / 出战准备
   ------------------------------------------------------------
   当前是 DOM 据点层（3D 住所内部后续替换）：
     · 大厅：仓库入口、终端、任务、休息、出战门
     · 队伍：角色面板、好感定性、身体状态、技能、默契、抚摸、装备建议
     · 仓库：打开现有 BagUI 的 stash 网格
     · 终端：流动信用点、当前任务、存档状态
     · 神庙：Assee 供奉 + 普勒语祷词 → 概率获得 Prazing 技巧
     · 出战：可拖动队伍站位的小地图，确认后进入战局
   所有长期数据只写 AsakaSave，不直接改 GameWorld。
   ============================================================ */

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const AFF_WORD = (v) => {
  if (v < 0) return '敌意';
  if (v < 2) return '冷淡';
  if (v < 4) return '稍微在意';
  if (v < 7) return '有些亲近';
  if (v < 11) return '信任';
  if (v < 16) return '依赖';
  return '不想离开';
};

const COMPAT_WORD = (v) => {
  if (v < 0) return '错拍';
  if (v < 4) return '生疏';
  if (v < 10) return '开始合拍';
  if (v < 18) return '默契';
  if (v < 28) return '呼吸同拍';
  return '几乎不用看';
};

const ROLE_LABEL = {
  leader: '队长', shield: '盾兵', breacher: '破障手', assault: '突击手',
  carrier: '携带员', scout_medic: '侦察/医疗',
};

export class HomeScreen {
  constructor(app){
    this.app = app;
    this.root = null;
    this._tab = 'hall';
    this._selectedChar = null;
    this._deployOffsets = {};
    this._shrineTier = 0;
    this._build();
  }

  _data(){
    const save = this.app && this.app.asakaSave;
    if (!save) return null;
    const d = save.data;
    d.partyGear = d.partyGear || {};
    d.attributes = d.attributes || {};
    d.compatibility = d.compatibility || {};
    d.missions = d.missions || { current: null, active: {}, done: {} };
    d.abilities = d.abilities || [];
    return d;
  }

  _roster(){
    return this.app && typeof this.app.getPartyRoster === 'function' ? this.app.getPartyRoster() : [];
  }

  _char(id){
    return this.app.engine.content.get('characters', id);
  }

  _charName(id){
    const c = this._char(id);
    return c ? this.app.engine.i18n.t(c.name) : id;
  }

  _style(){
    if (document.getElementById('home-style')) return;
    const st = document.createElement('style');
    st.id = 'home-style';
    st.textContent = `
#home-screen{position:fixed;inset:0;z-index:140;display:none;color:#e9eef5;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:#07090d}
#home-screen.on{display:block}
.home-bg{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,7,10,.55),rgba(5,7,10,.94)),url('assets/home-bg.jpg') center/cover no-repeat;filter:saturate(.9) brightness(.55)}
.home-bg:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 35%,transparent 0%,rgba(2,4,7,.75) 70%)}
.home-shell{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;padding:22px 28px 18px}
.home-head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid rgba(216,170,80,.22);padding-bottom:12px}
.home-head .k{font-size:9px;letter-spacing:6px;color:#a78a56;font-family:ui-monospace,monospace}
.home-head h1{margin:3px 0 0;font-size:24px;letter-spacing:7px;color:#ffe0a0;font-weight:800}
.home-head .sub{font-size:10px;color:#8fa3b6;margin-top:4px;letter-spacing:1px}
.home-close{padding:8px 18px;border-radius:6px;border:1px solid rgba(170,190,210,.3);background:rgba(20,30,40,.48);color:#d3e1ee;font-family:inherit;cursor:pointer}
.home-tabs{display:flex;gap:4px;margin:14px 0 12px;flex-wrap:wrap}
.home-tab{padding:7px 16px;border-radius:6px;border:1px solid rgba(150,180,210,.16);background:rgba(15,22,30,.55);color:#9fb3c6;font-size:11px;letter-spacing:2px;font-family:inherit;cursor:pointer}
.home-tab.on{color:#ffe0a0;border-color:rgba(216,170,80,.42);background:rgba(80,55,20,.32)}
.home-body{flex:1;min-height:0;overflow-y:auto;padding-right:4px}
.home-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.home-card{border:1px solid rgba(150,190,230,.16);border-radius:10px;background:linear-gradient(180deg,rgba(18,26,36,.88),rgba(8,11,16,.9));padding:14px 16px}
.home-card h3{margin:0 0 4px;font-size:14px;letter-spacing:3px;color:#ffd98a}
.home-card p{margin:0;font-size:11px;line-height:1.8;color:#9fb2c5}
.home-card .big{font-size:22px;font-weight:900;color:#ffe7a8;letter-spacing:2px;margin:6px 0}
.home-btn{display:inline-block;margin-top:10px;padding:7px 13px;border-radius:6px;border:1px solid rgba(170,200,230,.28);background:rgba(35,55,75,.38);color:#d8e7f4;font-size:10px;letter-spacing:1px;font-family:inherit;cursor:pointer}
.home-btn:hover{border-color:rgba(255,211,120,.55);color:#ffecc4}
.home-btn.primary{border-color:rgba(255,204,120,.55);background:rgba(120,80,30,.4);color:#ffe8c0}
.home-btn:disabled{opacity:.35;cursor:not-allowed}
.home-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.home-roster{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.party-card{border:1px solid rgba(150,190,230,.2);border-radius:12px;background:linear-gradient(160deg,rgba(24,30,42,.92),rgba(8,10,14,.94));padding:16px 18px}
.party-card .pc-head{display:flex;justify-content:space-between;align-items:baseline}
.party-card h3{margin:0;font-size:18px;letter-spacing:4px;color:#ffe0a0}
.party-card .aff{font-size:10px;color:#9fd4b0;letter-spacing:1px}
.party-card .meta{font-size:10px;line-height:1.9;color:#9cafc2;margin-top:6px}
.party-card .meta b{color:#cfe4f8;font-weight:600}
.party-card .part-row{display:flex;justify-content:space-between;font-size:10px;color:#8fa3b6;padding:2px 0;border-bottom:1px dashed rgba(255,255,255,.05)}
.party-card .skill-row{display:inline-block;margin:3px 4px 0 0;padding:2px 6px;border-radius:4px;background:rgba(80,120,160,.2);font-size:9px;color:#bcd4e8}
.pet-zone{margin-top:10px;border-top:1px solid rgba(255,255,255,.06);padding-top:9px}
.pet-zone .pet-r{font-size:10px;line-height:1.8;color:#e8d9c2;min-height:18px;margin-top:5px}
.gear-row{display:flex;justify-content:space-between;font-size:10px;color:#b9c9d8;padding:4px 0;border-bottom:1px dashed rgba(255,255,255,.06)}
.gear-row b{color:#ffe0a0}
.home-modal{position:absolute;inset:0;z-index:5;display:none;align-items:center;justify-content:center;background:rgba(2,4,7,.7);backdrop-filter:blur(5px)}
.home-modal.on{display:flex}
.home-modal-card{width:min(520px,92vw);max-height:84vh;overflow-y:auto;padding:20px 22px;border-radius:12px;border:1px solid rgba(216,170,80,.34);background:linear-gradient(180deg,rgba(26,22,16,.98),rgba(7,9,12,.98))}
.home-modal-card h3{margin:0 0 8px;font-size:16px;letter-spacing:3px;color:#ffd98a}
.home-modal-card textarea{width:100%;height:76px;margin-top:8px;padding:8px;border-radius:6px;border:1px solid rgba(150,190,230,.25);background:rgba(5,8,12,.8);color:#e8eef5;font-family:inherit;font-size:12px;resize:vertical}
.shrine-prayer{font-size:10px;color:#8f9dab;line-height:1.7}
.deploy-wrap{display:grid;grid-template-columns:1fr 280px;gap:12px}
.deploy-map{position:relative;min-height:430px;border:1px solid rgba(150,190,230,.2);border-radius:10px;background:
  linear-gradient(rgba(120,160,200,.05) 1px,transparent 1px),
  linear-gradient(90deg,rgba(120,160,200,.05) 1px,transparent 1px),
  radial-gradient(circle at 50% 50%,rgba(40,70,100,.25),rgba(8,12,18,.95));
  background-size:40px 40px,40px 40px,auto;overflow:hidden}
.deploy-marker{position:absolute;transform:translate(-50%,-50%);width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#071018;font-weight:900;cursor:grab;user-select:none;touch-action:none}
.deploy-marker.player{background:#7fe8ff;box-shadow:0 0 18px rgba(100,220,255,.5);cursor:default}
.deploy-marker.ally{background:#ffd36b;box-shadow:0 0 16px rgba(255,200,90,.4)}
.deploy-marker.objective{background:rgba(200,110,255,.8);border-radius:4px;transform:translate(-50%,-50%) rotate(45deg);color:#1a0b22;cursor:default}
.deploy-hint{position:absolute;left:12px;bottom:10px;font-size:9px;color:#7f95a8;letter-spacing:1px}
.debrief{border:1px solid rgba(120,200,160,.25);background:rgba(20,45,35,.32);border-radius:9px;padding:10px 13px;margin-bottom:12px;font-size:11px;line-height:1.8;color:#cfe8dc}
.home-empty{font-size:11px;color:#7f95a8;padding:16px 0}
`;
    document.head.appendChild(st);
  }

  _build(){
    this._style();
    let root = document.getElementById('home-screen');
    if (!root) {
      root = document.createElement('div');
      root.id = 'home-screen';
      root.innerHTML = `
        <div class="home-bg"></div>
        <div class="home-shell">
          <div class="home-head">
            <div>
              <div class="k">ASAKA · HOME BASE</div>
              <h1>据点</h1>
              <div class="sub" id="home-sub">城北 · 旧仓库</div>
            </div>
            <button class="home-close" type="button">关闭</button>
          </div>
          <div class="home-tabs">
            <button class="home-tab" data-tab="hall">大厅</button>
            <button class="home-tab" data-tab="team">队伍</button>
            <button class="home-tab" data-tab="stash">仓库</button>
            <button class="home-tab" data-tab="terminal">终端</button>
            <button class="home-tab" data-tab="shrine">神庙</button>
            <button class="home-tab" data-tab="deploy">出战</button>
          </div>
          <div class="home-body" id="home-body"></div>
        </div>
        <div class="home-modal" id="home-modal"><div class="home-modal-card" id="home-modal-card"></div></div>`;
      document.body.appendChild(root);
      root.querySelector('.home-close')?.addEventListener('click', () => this.close());
      root.querySelectorAll('.home-tab').forEach(btn => {
        btn.addEventListener('click', () => { this._tab = btn.dataset.tab; this.render(); });
      });
      root.querySelector('#home-modal')?.addEventListener('pointerdown', (ev) => {
        if (ev.target && ev.target.id === 'home-modal') this._hideModal();
      });
    }
    this.root = root;
    this.elBody = root.querySelector('#home-body');
    this.elSub = root.querySelector('#home-sub');
    this.elModal = root.querySelector('#home-modal');
    this.elModalCard = root.querySelector('#home-modal-card');
  }

  open(opts = {}){
    const data = this._data();
    if (!data) return;
    this._tab = opts.tab || this._tab || 'hall';
    this._debrief = opts.debrief || null;
    this.root.classList.add('on');
    document.body.classList.add('home-active');
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (_) {} }
    if (this.app.world && this.app.world.running && !this.app.world.paused) {
      try { this.app.world.pause(); this._pausedWorld = true; } catch (_) {}
    }
    this.render();
  }

  close(){
    this.root.classList.remove('on');
    document.body.classList.remove('home-active');
    this._hideModal();
    if (this._pausedWorld && this.app.world) {
      try { this.app.world.resume(); } catch (_) {}
      this._pausedWorld = false;
    }
    // 从战局结算回到据点后，世界已经停止；关掉据点应回主大厅，而不是留在空场景。
    if (!this.app._deployingFromHome && this.app.world && !this.app.world.running && this.app.activeMode === 'asaka') {
      try { this.app._quitToMenu(); } catch (_) {}
    }
  }

  isOpen(){ return !!(this.root && this.root.classList.contains('on')); }

  _showModal(html){
    this.elModalCard.innerHTML = html;
    this.elModal.classList.add('on');
  }

  _hideModal(){ this.elModal.classList.remove('on'); this.elModalCard.innerHTML = ''; }

  render(){
    const d = this._data();
    if (!d) return;
    this.root.querySelectorAll('.home-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === this._tab));
    const cur = this.app.engine.content.get('missions', d.missions.current);
    this.elSub.textContent = '城北 · 旧仓库' + (cur ? ' · 当前主线：' + this.app.engine.i18n.t(cur.title || cur.id) : '');
    if (this._tab === 'team') this._renderTeam(d);
    else if (this._tab === 'stash') this._renderStash(d);
    else if (this._tab === 'terminal') this._renderTerminal(d);
    else if (this._tab === 'shrine') this._renderShrine(d);
    else if (this._tab === 'deploy') this._renderDeploy(d);
    else this._renderHall(d);
  }

  _renderHall(d){
    const roster = this._roster();
    const credits = d.credits || 0;
    const debrief = this._debrief;
    this.elBody.innerHTML = `
      ${debrief ? `<div class="debrief">${esc(debrief).replace(/\n/g, '<br>')}</div>` : ''}
      <div class="home-grid">
        <div class="home-card">
          <h3>大厅 · 仓库</h3>
          <p>大厅中央的大箱子。所有出击前的装备、弹药与缴获都在这里整理。</p>
          <div class="big">${this.app.inventory ? this.app.inventory.getContainerValue('stash') : 0} cp</div>
          <button class="home-btn primary" data-h="stash">打开仓库网格</button>
        </div>
        <div class="home-card">
          <h3>终端</h3>
          <p>当前流动信用点与任务。电脑还没有联网，只能显示本地账本。</p>
          <div class="big">${credits} <span style="font-size:10px;color:#8fa3b6">CP</span></div>
          <button class="home-btn" data-h="terminal">查看终端</button>
        </div>
        <div class="home-card">
          <h3>房间 · 休息</h3>
          <p>回到据点后先处理伤口与状态。剧情入口需要干净的负面状态。</p>
          <button class="home-btn" data-h="rest">处理状态</button>
        </div>
        <div class="home-card">
          <h3>队伍</h3>
          <p>${roster.length ? roster.map(r => esc(r.name)).join('、') : '还没有队友。'}</p>
          <div class="big">${roster.length} 人</div>
          <button class="home-btn" data-h="team">查看队伍</button>
        </div>
        <div class="home-card">
          <h3>神庙</h3>
          <p>供奉 Assee，为队里的 Prazer 求一个 Prazing 技巧。祷词不会给提示。</p>
          <button class="home-btn" data-h="shrine">前往神庙</button>
        </div>
        <div class="home-card">
          <h3>大门 · 出战</h3>
          <p>靠近大门就是准备出站。先规划队伍站位，再确认出发。</p>
          <button class="home-btn primary" data-h="deploy">出战准备</button>
        </div>
      </div>`;
    this.elBody.querySelectorAll('[data-h]').forEach(btn => {
      btn.addEventListener('click', () => this._hallAction(btn.dataset.h));
    });
  }

  _hallAction(action){
    if (action === 'stash') {
      this.close();
      if (this.app.bagUI) this.app.bagUI.toggle();
      return;
    }
    if (action === 'rest') return this._rest();
    this._tab = action;
    this.render();
  }

  _rest(){
    const d = this._data();
    const party = d.party || {};
    let healed = 0;
    for (const key of Object.keys(party)) {
      const snap = party[key];
      if (!snap) continue;
      snap.effects = (snap.effects || []).filter(e => {
        const def = this.app.engine.content.get('effects', e.id);
        return def && def.positive !== false;
      });
      if (snap.parts) {
        for (const k in snap.parts) {
          const p = snap.parts[k];
          if (p) { p.hp = Math.max(p.hp || 0, 60); p.wounds = (p.wounds || []).map(w => ({ ...w, treated: true })); }
        }
      }
      healed++;
    }
    // 如果据点覆盖在运行中的世界上，本体/队友的实时状态也要一起处理，
    // 否则“在据点休息”只改存档，剧情闸门仍然挡住。
    try {
      const world = this.app.world;
      const list = [];
      if (world && world.player) list.push(world.player);
      if (world && Array.isArray(world.allies)) list.push(...world.allies);
      for (const ent of list) {
        if (!ent || !ent.status) continue;
        for (const [id, eff] of Array.from(ent.status.effects.entries())) {
          const def = this.app.engine.content.get('effects', id);
          if (def && def.positive === false) ent.status.removeEffect(id);
        }
        for (const k in ent.status.parts) {
          const p = ent.status.parts[k];
          if (p) p.hp = Math.max(p.hp || 0, (p.maxHp || 100) * 0.6);
        }
        ent.status.updateOverallHealth();
      }
    } catch (_) {}
    d.flags = d.flags || {};
    d.flags.home_rested = Date.now();
    this.app.asakaSave.save();
    this._showModal('<h3>休息</h3><p class="shrine-prayer">你把大厅的灯调暗。伤口重新包扎，枪放在门边。\n下次进入战局时，身体状态会从更好的起点开始；但已经死去的队友不会回来。</p><div class="home-row"><button class="home-btn primary" id="rest-ok">好</button></div>');
    this.elModalCard.querySelector('#rest-ok')?.addEventListener('click', () => { this._hideModal(); this.render(); });
  }

  _renderTeam(d){
    const roster = this._roster();
    if (!roster.length) {
      this.elBody.innerHTML = '<div class="home-empty">队伍里还没有人。先在新手剧情里找到凯特与玲娜。</div>';
      return;
    }
    let html = '<div class="home-roster">';
    for (const r of roster) {
      const char = this._char(r.id) || {};
      const aff = d.affection[r.id] || 0;
      const compat = d.compatibility[r.id] || 0;
      const attr = d.attributes[r.id] || {};
      const ase = attr.aselevel !== undefined ? attr.aselevel : (char.A || 1);
      const snap = d.party['ally:' + r.id];
      const parts = [];
      if (snap && snap.parts) {
        for (const k of ['head', 'thorax', 'abdomen', 'larm', 'rarm', 'lleg', 'rleg']) {
          const p = snap.parts[k];
          if (!p) continue;
          const partMax = { head: 60, thorax: 800, abdomen: 600, larm: 400, rarm: 400, lleg: 500, rleg: 500 };
          const max = p.maxHp || p.max || partMax[k] || 0;
          const pct = max > 0 ? Math.round((p.hp / max) * 100) : 100;
          parts.push('<div class="part-row"><span>' + ({ head: '头部', thorax: '胸部', abdomen: '腹部', larm: '左臂', rarm: '右臂', lleg: '左腿', rleg: '右腿' }[k] || k) + '</span><span>' + (pct >= 90 ? '正常' : (pct >= 60 ? '轻伤 ' + pct + '%' : (pct >= 30 ? '重伤 ' + pct + '%' : '危重'))) + '</span></div>');
        }
        if (!parts.length) parts.push('<div class="part-row"><span>身体</span><span>无外伤</span></div>');
      } else {
        parts.push('<div class="part-row"><span>身体</span><span>无外伤</span></div>');
      }
      const prazing = (attr.prazing || []).map(pid => {
        const t = this.app.engine.content.get('prazing', pid);
        return t ? t.name : pid;
      });
      const skills = (char.skills || []).map(sid => {
        const sk = this.app.engine.content.get('skills', sid);
        return '<span class="skill-row">' + esc(sk ? this.app.engine.i18n.t(sk.name) : sid) + '</span>';
      }).join('') || '<span class="skill-row">无技能</span>';
      const canPet = aff >= 0;
      html += `<div class="party-card">
        <div class="pc-head"><h3>${esc(r.name)}</h3><span class="aff">${esc(AFF_WORD(aff))}</span></div>
        <div class="meta">Aselevel：<b>${typeof ase === 'number' ? ase.toFixed(2) : '—'}</b> · 默契：<b>${esc(COMPAT_WORD(compat))}</b> · 模板：<b>${esc(char.tag ? this.app.engine.i18n.t(char.tag) : '—')}</b></div>
        <div class="meta">技能：${skills}</div>
        <div class="meta">技能经验：<b>${attr.skillExp || 0}</b> · Lv.<b>${attr.skillLevel || 1}</b></div>
        <div class="meta">Prazing：<b>${prazing.length ? esc(prazing.join('、')) : '未获得技巧'}</b></div>
        <div class="meta" style="margin-top:7px">${parts.join('')}</div>
        <div class="pet-zone">
          <div class="home-row">
            <button class="home-btn" data-pet="head" data-char="${r.id}" ${canPet ? '' : 'disabled'}>摸头</button>
            <button class="home-btn" data-pet="ear" data-char="${r.id}" ${canPet ? '' : 'disabled'}>摸耳羽</button>
            <button class="home-btn" data-pet="tail" data-char="${r.id}" ${canPet ? '' : 'disabled'}>摸尾巴</button>
            <button class="home-btn" data-pet="hand" data-char="${r.id}" ${canPet ? '' : 'disabled'}>握手</button>
            <button class="home-btn" data-gear="${r.id}">物品</button>
          </div>
          <div class="pet-r" id="pet-r-${r.id}">${canPet ? '她还愿意让你靠近。' : '她侧过身，不让你碰。'}</div>
        </div>
      </div>`;
    }
    html += '</div>';
    this.elBody.innerHTML = html;
    this.elBody.querySelectorAll('[data-pet]').forEach(btn => {
      btn.addEventListener('click', () => this._pet(btn.dataset.char, btn.dataset.pet));
    });
    this.elBody.querySelectorAll('[data-gear]').forEach(btn => {
      btn.addEventListener('click', () => this._gearPanel(btn.dataset.gear));
    });
  }

  _pet(id, part){
    const d = this._data();
    const aff = d.affection[id] || 0;
    const out = document.getElementById('pet-r-' + id);
    if (!out) return;
    if (aff < 0) { out.textContent = '她侧过身，不让你碰。'; return; }
    const lines = {
      kate: {
        head: aff >= 7 ? '……别摸。再摸一下。' : '她偏了偏头，没躲开。',
        ear: '耳朵不行！她拍开你的手，但没用力。',
        tail: '尾巴甩了一下，正好打在你腿上。',
        hand: '她握住你的手，检查了一下你指节上的伤。',
      },
      lingna: {
        head: aff >= 7 ? '嗯……再摸一会儿。' : '她眯起眼，没有躲。',
        ear: '她咬了你一口。很轻，像在确认什么。',
        tail: '尾巴绕上你的手腕，收紧了一点。',
        hand: '她抓了抓你的手指，像猫踩奶。',
      },
      buwen: {
        head: '她低头配合了一下，盔甲发出响声。',
        ear: '她把你的手按开：“别碰甲缝。”',
        tail: '尾巴在盔甲外面敲了一下。',
        hand: '她把手套脱了，和你握了一下。',
      },
    };
    out.textContent = (lines[id] && lines[id][part]) || '她没有反应。';
  }

  _gearPanel(id){
    const d = this._data();
    const char = this._char(id) || {};
    const gear = d.partyGear[id] || (d.partyGear[id] = { main: char.weapon, side: char.sidearm });
    const inv = this.app.inventory;
    const stashWeapons = [];
    if (inv) {
      for (const it of inv.items.values()) {
        if (!it || it.table !== 'weapons') continue;
        if (inv.parentOf.get(it.uid) !== 'c:stash') continue;
        stashWeapons.push(it);
      }
    }
    const rows = stashWeapons.slice(0, 20).map(it => {
      const def = this.app.engine.content.get('weapons', it.defId);
      const name = def ? this.app.engine.i18n.t(def.name) : it.defId;
      return `<div class="gear-row"><span>${esc(name)}</span><button class="home-btn" data-give="${it.uid}" data-char="${id}">给他/她</button></div>`;
    }).join('') || '<div class="home-empty">仓库里没有多余的枪。</div>';
    let suggest = '';
    if (stashWeapons.length) {
      const currentVal = (() => { const d0 = this.app.engine.content.get('weapons', gear.main); return d0 ? (d0.value || 0) : 0; })();
      const best = stashWeapons.map(it => ({ it, def: this.app.engine.content.get('weapons', it.defId) }))
        .filter(x => x.def).sort((a, b) => (b.def.value || 0) - (a.def.value || 0))[0];
      if (best && (best.def.value || 0) > currentVal * 1.15) {
        suggest = `<div class="gear-row" style="color:#bfe8c8"><span>建议：仓库里的「${esc(this.app.engine.i18n.t(best.def.name))}」更适合当前任务</span><button class="home-btn" data-give="${best.it.uid}" data-char="${id}">接受建议</button></div>`;
      }
    }
    this._showModal(`<h3>${esc(this._charName(id))} · 物品</h3>
      <div class="gear-row"><span>主武器</span><b>${esc(this._weaponName(gear.main))}</b></div>
      <div class="gear-row"><span>副武器</span><b>${esc(this._weaponName(gear.side))}</b></div>
      <div class="home-row" style="margin-top:10px">
        <button class="home-btn" data-take="${id}" data-slot="main">拿回主武器</button>
        <button class="home-btn" data-take="${id}" data-slot="side">拿回副武器</button>
      </div>
      <p class="shrine-prayer" style="margin-top:12px">仓库里的武器可以直接交给队友。她会自己判断要不要用；拿走她的武器会让她不高兴。</p>
      ${suggest}
      ${rows}
      <div class="home-row" style="justify-content:flex-end"><button class="home-btn" id="gear-close">关闭</button></div>`);
    this.elModalCard.querySelector('#gear-close')?.addEventListener('click', () => this._hideModal());
    this.elModalCard.querySelectorAll('[data-give]').forEach(btn => {
      btn.addEventListener('click', () => this._giveGear(btn.dataset.char, btn.dataset.give));
    });
    this.elModalCard.querySelectorAll('[data-take]').forEach(btn => {
      btn.addEventListener('click', () => this._takeGear(btn.dataset.take, btn.dataset.slot));
    });
  }

  _weaponName(id){
    if (!id) return '空';
    const def = this.app.engine.content.get('weapons', id);
    return def ? this.app.engine.i18n.t(def.name) : id;
  }

  _giveGear(id, uid){
    const inv = this.app.inventory;
    if (!inv || !uid) return;
    const item = inv.items.get(uid);
    if (!item || item.table !== 'weapons') return;
    const d = this._data();
    const char = this._char(id) || {};
    const gear = d.partyGear[id] || (d.partyGear[id] = { main: char.weapon, side: char.sidearm });
    gear.main = item.defId;
    inv.destroyItem(uid);
    d.affection[id] = (d.affection[id] || 0) + 1;
    this.app.asakaSave.save();
    if (this.app.bagUI) this.app.bagUI.refresh?.();
    this._hideModal();
    this._gearPanel(id);
  }

  _takeGear(id, slot){
    const d = this._data();
    const char = this._char(id) || {};
    const gear = d.partyGear[id] || (d.partyGear[id] = { main: char.weapon, side: char.sidearm });
    const defId = gear[slot];
    if (!defId) { this._hideModal(); return; }
    const inv = this.app.inventory;
    const uid = inv ? inv.createItem('weapons', defId, { loadedQty: 0 }) : null;
    if (!uid) { this._hideModal(); return; }
    {
      // 弹匣与弹药走 Inventory 的常规规则，不在 UI 里塞“幽灵子弹”。
      let placed = false;
      for (const cName of ['stash', 'bag', 'chest', 'pocket']) {
        if (inv.addToContainer(cName, uid).ok) { placed = true; break; }
      }
      if (!placed) { inv.destroyItem(uid); this._hideModal(); return; }
      const def = this.app.engine.content.get('weapons', defId);
      if (def && def.stdMag) {
        const mag = inv.createItem('attach', def.stdMag, { loadedQueue: [] });
        if (mag) inv.attachTo(uid, 'mag', mag);
      }
    }
    d.affection[id] = (d.affection[id] || 0) - 1;
    gear[slot] = null;
    this.app.asakaSave.save();
    this._hideModal();
    this._gearPanel(id);
  }

  _renderStash(d){
    const inv = this.app.inventory;
    const count = inv ? inv.containers.stash.items.size : 0;
    const value = inv ? inv.getContainerValue('stash') : 0;
    this.elBody.innerHTML = `<div class="home-card">
      <h3>大厅 · 仓库</h3>
      <p>大箱子里的东西。打开后使用现有背包网格整理、拖动配件、拆分弹药与整备弹匣。</p>
      <div class="big">${count} 件 · ${value} CP</div>
      <button class="home-btn primary" data-stash-open="1">打开仓库网格</button>
      <p class="shrine-prayer">提示：仓库容量与升级功能预留；当前容量由 Inventory 的 stash 网格决定。</p>
    </div>`;
    this.elBody.querySelector('[data-stash-open]')?.addEventListener('click', () => {
      this.close();
      if (this.app.bagUI) this.app.bagUI.toggle();
    });
  }

  _renderTerminal(d){
    const cur = this.app.engine.content.get('missions', d.missions.current);
    const latest = this.app.asakaSave.getLatest();
    this.elBody.innerHTML = `<div class="home-grid">
      <div class="home-card"><h3>流动信用点</h3><div class="big">${d.credits || 0} CP</div><p>用于买房、供奉与战前整备。主模式与 Straight 的信用点分开。</p></div>
      <div class="home-card"><h3>当前主线</h3><h3 style="font-size:12px;letter-spacing:2px;margin-top:6px">${cur ? esc(this.app.engine.i18n.t(cur.title || cur.id)) : '暂无'}</h3><p>${cur ? esc(cur.chapter || '') : ''}</p></div>
      <div class="home-card"><h3>存档</h3><p>槽位固定在本地：最新状态 ${latest ? new Date(latest.at).toLocaleString() : '—'}<br>关键节点 ${Object.keys(this.app.asakaSave.data.keyframes || {}).length} 个</p></div>
      <div class="home-card"><h3>玩法模板</h3><div class="big" style="font-size:16px">${esc(d.profileLocked || '—')}</div><p>新档时确定；之后仍可在设置里手动调整。</p></div>
      <div class="home-card"><h3>任务</h3><button class="home-btn" data-open-missions="1">打开任务页</button></div>
    </div>`;
    this.elBody.querySelector('[data-open-missions]')?.addEventListener('click', () => {
      if (this.app.world && this.app.world.missions) this.app.world.missions.open();
      else this._showModal('<h3>任务</h3><p class="shrine-prayer">任务页只在战局内可打开。当前任务：' + (cur ? esc(this.app.engine.i18n.t(cur.title || cur.id)) : '暂无') + '</p><div class="home-row"><button class="home-btn" id="m-close">关闭</button></div>');
      const btn = this.elModalCard.querySelector('#m-close');
      if (btn) btn.addEventListener('click', () => this._hideModal());
    });
  }

  _renderShrine(d){
    const roster = this._roster();
    const prazer = roster.filter(r => { const c = this._char(r.id); return c && c.prazer; });
    if (!prazer.length) {
      this.elBody.innerHTML = '<div class="home-empty">神庙的祭司看了看你的队伍：没有 Prazer，供奉无法生效。</div>';
      return;
    }
    const opts = prazer.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
    this.elBody.innerHTML = `<div class="home-grid">
      <div class="home-card">
        <h3>神庙 · Assee 供奉</h3>
        <p>普通供奉会消耗少量信用点；全图广播会让所有 Prazer 听见你的祷词，但更贵。</p>
        <div class="home-row" style="margin-top:8px">祝福对象：<select id="shrine-target" style="padding:5px;border-radius:5px;background:#0b1118;color:#dff0ff;border:1px solid rgba(150,190,230,.3)">${opts}</select></div>
        <div class="home-row" style="margin-top:10px">
          <button class="home-btn" data-offer="1">普通供奉 · 300 CP</button>
          <button class="home-btn primary" data-offer="2">全图广播 · 1200 CP</button>
        </div>
        <p class="shrine-prayer">供奉完成后，你需要自己念一段普勒语祷词。庙里不会提示“正确”的词；说对了才会有 Prazing 技巧的回应。</p>
      </div>
      <div class="home-card"><h3>Prazing 技巧</h3><p class="shrine-prayer">${(this.app.engine.content.all('prazing') || []).map(t => '· ' + esc(t.name)).join('<br>')}</p></div>
    </div>`;
    this.elBody.querySelectorAll('[data-offer]').forEach(btn => {
      btn.addEventListener('click', () => this._offer(btn.dataset.offer, this.elBody.querySelector('#shrine-target').value));
    });
  }

  _offer(tier, target){
    const d = this._data();
    const cost = Number(tier) === 2 ? 1200 : 300;
    if ((d.credits || 0) < cost) {
      this._showModal('<h3>信用点不足</h3><p class="shrine-prayer">供奉需要 ' + cost + ' CP，当前只有 ' + (d.credits || 0) + ' CP。</p><div class="home-row"><button class="home-btn" id="o-close">关闭</button></div>');
      this.elModalCard.querySelector('#o-close')?.addEventListener('click', () => this._hideModal());
      return;
    }
    this._shrineTier = Number(tier) || 1;
    this._shrineTarget = target;
    this._showModal(`<h3>献上祷词</h3><p class="shrine-prayer">对象：${esc(this._charName(target))} · ${this._shrineTier === 2 ? '全图广播' : '普通供奉'} · 消耗 ${cost} CP</p><textarea id="shrine-prayer-input" placeholder="在祭司面前念出祷词……"></textarea><div class="home-row" style="justify-content:flex-end;margin-top:10px"><button class="home-btn" id="p-cancel">取消</button><button class="home-btn primary" id="p-submit">献上</button></div>`);
    this.elModalCard.querySelector('#p-cancel')?.addEventListener('click', () => this._hideModal());
    this.elModalCard.querySelector('#p-submit')?.addEventListener('click', () => this._resolvePrayer());
  }

  _resolvePrayer(){
    const d = this._data();
    const target = this._shrineTarget;
    const tier = this._shrineTier || 1;
    const cost = tier === 2 ? 1200 : 300;
    if ((d.credits || 0) < cost) { this._hideModal(); return; }
    const text = (this.elModalCard.querySelector('#shrine-prayer-input')?.value || '').trim();
    d.credits -= cost;
    const tricks = this.app.engine.content.all('prazing') || [];
    const hit = tricks.find(t => {
      const words = [t.id, t.name, ...(t.aliases || [])].filter(Boolean);
      return words.some(w => text.includes(w));
    });
    const chance = tier === 2 ? 0.55 : 0.35;
    let result = '';
    if (hit && Math.random() < chance) {
      const attr = d.attributes[target] || (d.attributes[target] = { aselevel: 1, skillExp: 0, compatibility: d.compatibility[target] || 0 });
      attr.prazing = attr.prazing || [];
      if (!attr.prazing.includes(hit.id)) attr.prazing.push(hit.id);
      result = '祭司沉默了很久。你听见供坛下面有东西在回应。\n' + this._charName(target) + '记住了「' + hit.name + '」。';
    } else {
      d.compatibility[target] = (d.compatibility[target] || 0) + (tier === 2 ? 4 : 2);
      result = hit
        ? '祷词对了，但回应只停留在供坛表面。' + this._charName(target) + '记住了你念过的词。'
        : '祭司摇了摇头。祷词没有落在正确的位置。';
    }
    d.affection[target] = (d.affection[target] || 0) + (tier === 2 ? 1 : 0);
    this.app.asakaSave.save();
    this._showModal(`<h3>供奉结束</h3><p class="shrine-prayer">${esc(result).replace(/\n/g, '<br>')}</p><div class="home-row" style="justify-content:flex-end"><button class="home-btn primary" id="o-done">离开</button></div>`);
    this.elModalCard.querySelector('#o-done')?.addEventListener('click', () => { this._hideModal(); this.render(); });
  }

  _renderDeploy(d){
    const roster = this._roster();
    const cur = this.app.engine.content.get('missions', d.missions.current);
    this._deployOffsets = this.app._deploymentOffsets || {};
    for (const r of roster) {
      if (!this._deployOffsets[r.id]) this._deployOffsets[r.id] = { x: (Object.keys(this._deployOffsets).indexOf(r.id) ? 4 : -4), z: 3 };
    }
    let markers = '<div class="deploy-marker player" style="left:50%;top:50%">你</div>';
    for (const r of roster) {
      const o = this._deployOffsets[r.id];
      const left = 50 + (o.x / 40) * 100;
      const top = 50 + (o.z / 40) * 100;
      markers += `<div class="deploy-marker ally" data-drag="${r.id}" style="left:${left}%;top:${top}%">${esc(r.name.slice(0, 1))}</div>`;
    }
    this.elBody.innerHTML = `<div class="deploy-wrap">
      <div class="deploy-map" id="deploy-map">
        ${markers}
        <div class="deploy-marker objective" style="left:64%;top:38%">目标</div>
        <div class="deploy-hint">拖动金色队员标记规划站位 · 距离会换算成相对当前位置的偏移</div>
      </div>
      <div>
        <div class="home-card">
          <h3>出战准备</h3>
          <p>${cur ? esc(this.app.engine.i18n.t(cur.title || cur.id)) + '<br>' + esc(cur.chapter || '') : '暂无当前主线'}</p>
          <div class="home-row" style="margin-top:8px">
            <button class="home-btn" data-form="wedge">楔形</button>
            <button class="home-btn" data-form="split">分翼</button>
            <button class="home-btn" data-form="line">一线</button>
          </div>
          <p class="shrine-prayer" style="margin-top:10px">队友只能使用仓库里分配给她们的装备。确认后从大门出站。</p>
          <button class="home-btn primary" id="deploy-go" style="width:100%;margin-top:12px">确认出战</button>
        </div>
      </div>
    </div>`;
    const map = this.elBody.querySelector('#deploy-map');
    this.elBody.querySelectorAll('[data-drag]').forEach(el => {
      const id = el.dataset.drag;
      const start = (ev) => {
        ev.preventDefault();
        const rect = map.getBoundingClientRect();
        const move = (e2) => {
          const pt = e2.touches ? e2.touches[0] : e2;
          const nx = Math.max(0.06, Math.min(0.94, (pt.clientX - rect.left) / rect.width));
          const nz = Math.max(0.06, Math.min(0.94, (pt.clientY - rect.top) / rect.height));
          this._deployOffsets[id] = { x: (nx - 0.5) * 40, z: (nz - 0.5) * 40 };
          el.style.left = (nx * 100) + '%';
          el.style.top = (nz * 100) + '%';
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('touchmove', move);
          window.removeEventListener('touchend', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', up);
      };
      el.addEventListener('pointerdown', start);
    });
    this.elBody.querySelectorAll('[data-form]').forEach(btn => {
      btn.addEventListener('click', () => {
        const form = btn.dataset.form;
        roster.forEach((r, i) => {
          this._deployOffsets[r.id] = form === 'wedge'
            ? { x: i === 0 ? -3 : 3, z: i === 0 ? 3 : 4 }
            : form === 'split' ? { x: i === 0 ? -5 : 5, z: 4 } : { x: 0, z: 4 + i * 2 };
        });
        this.render();
      });
    });
    this.elBody.querySelector('#deploy-go')?.addEventListener('click', () => {
      this.app._deploymentOffsets = this._deployOffsets;
      this.app.startAsakaDeployment();
    });
  }
}
