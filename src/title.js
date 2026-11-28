/* ============================================================
   LaiAsaka Engine · 主大厅
   ------------------------------------------------------------
   这是进入游戏后的第一屏，也是“主模式（Asaka）”的入口。
   布局按正式单机游戏的习惯：
     · 全屏背景（Default 背景图先留空，使用 CSS 渐变占位）；
     · 左下方纵向菜单：开始游戏 / 继续游戏 / 计划树 / Straight 模式 / 关于；
     · 右上角设置，与 Straight 大厅、战局内设置共用同一套设置面板，
       但按模式分别持久化（见 GameApp 的 settingsContext）。
   本模块不直接改游戏状态，只调用 GameApp 暴露的入口。
   ============================================================ */

import { PlanTree } from './plantree.js';
import { getPlanNode } from './story/asaka-plan.js';

export class TitleScreen {
  constructor(app){
    this.app = app;
    this.planTree = null;
    this._bound = false;
    this._build();
  }

  _t(key){
    const i18n = this.app.engine && this.app.engine.i18n;
    return i18n ? i18n.t(key) : key;
  }

  _build(){
    this.root = document.getElementById('title-screen');
    if (!this.root) {
      console.warn('[Title] 缺少 #title-screen');
      return;
    }
    const item = (id, cn, en, note) => `
      <button class="title-item" id="${id}" type="button">
        <span class="ti-main">${cn}</span>
        <span class="ti-side">${en}</span>
        ${note ? `<span class="ti-note">${note}</span>` : ''}
      </button>`;
    this.root.innerHTML = `
      <div class="title-bg" aria-hidden="true">
        <img class="title-bg-img" src="assets/lobby-bg.jpg" alt="" onerror="if(!this.dataset.png){this.dataset.png='1';this.src='assets/lobby-bg.png'}else{this.style.display='none'}">
        <div class="title-bg-shade"></div>
        <div class="title-bg-glow"></div>
        <div class="title-bg-vignette"></div>
      </div>
      <nav class="title-nav">
        ${item('title-new', '开始游戏', 'NEW GAME', '开启一份主模式新存档')}
        ${item('title-continue', '继续游戏', 'CONTINUE', '读取退出前的最新状态')}
        ${item('title-home', '据点', 'HOME BASE', '队伍、仓库、神庙与出战准备')}
        ${item('title-plan', '计划树', 'PLAN TREE', '剧情轨迹与存档管理')}
        ${item('title-straight', 'Straight 模式', 'STRAIGHT', '硬核撤离 · 独立战斗模式')}
        ${item('title-about', '关于', 'ABOUT', '')}
        ${item('title-settings', '设置', 'SETTINGS', '主模式设置')}
        <div id="title-save-hint" class="title-save-hint"></div>
      </nav>`;
    this.planTree = new PlanTree(this.app);
    this._bind();
    this._refresh();
  }

  _bind(){
    if (this._bound) return;
    this._bound = true;
    this.root.querySelector('#title-new')?.addEventListener('click', () => this._startNew());
    this.root.querySelector('#title-continue')?.addEventListener('click', () => this._continue());
    this.root.querySelector('#title-home')?.addEventListener('click', () => this._openHome());
    this.root.querySelector('#title-plan')?.addEventListener('click', () => this.planTree.show());
    this.root.querySelector('#title-straight')?.addEventListener('click', () => this.app.enterStraightLobby());
    this.root.querySelector('#title-about')?.addEventListener('click', () => this.app.openAbout());
    this.root.querySelector('#title-settings')?.addEventListener('click', () => this.app.openSettingsModal('asaka'));
  }

  show(){
    this._refresh();
    this.app.showTitleScreen();
  }

  _refresh(){
    if (!this.root) return;
    const save = this.app.asakaSave;
    const has = save && save.hasSave();
    const cont = this.root.querySelector('#title-continue');
    const note = cont ? cont.querySelector('.ti-note') : null;
    if (cont) {
      cont.disabled = !has;
      cont.classList.toggle('locked', !has);
    }
    if (note) {
      const latest = has ? save.getLatest() : null;
      note.textContent = has
        ? (latest ? '最新状态 · ' + this._time(latest.at) : '读取最近的主模式进度')
        : '没有找到主模式存档';
    }
    const homeBtn = this.root.querySelector('#title-home');
    if (homeBtn) {
      const owned = !!(save && save.data && save.data.home && save.data.home.purchased);
      homeBtn.disabled = !owned;
      homeBtn.classList.toggle('locked', !owned);
      const noteEl = homeBtn.querySelector('.ti-note');
      if (noteEl) noteEl.textContent = owned ? '队伍、仓库、神庙与出战准备' : '完成序章买房后开放';
    }
    const hint = this.root.querySelector('#title-save-hint');
    if (hint) {
      if (has) {
        const latest = save.getLatest();
        const auto = save.getAutosave();
        hint.innerHTML = `<span class="dot"></span>${latest ? '退出前状态 · ' + this._time(latest.at) : '已抵达关键节点 · ' + this._esc(this._nodeName((auto && auto.nodeId) || save.data.node))}`;
      } else {
        hint.innerHTML = '<span class="dot dim"></span>尚未建立主模式存档';
      }
    }
  }

  _nodeName(id){
    const node = getPlanNode(id);
    return node ? node.label : id;
  }

  _time(iso){
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    } catch (_) { return String(iso); }
  }

  _startNew(){
    const save = this.app.asakaSave;
    if (save && save.hasSave()) {
      if (!confirm('开始新游戏会覆盖当前主模式进度、关键节点与最新状态。\n确定重新开始？')) return;
    }
    this._openNewGameSetup();
  }

  // ★ 新档第一次进入主模式：先让玩家确认 4 种玩法模板与设置，再开始剧情。
  //   模板写入存档 profileLocked；之后仍可在设置里手动改，但新档会记录最初选择。
  _openNewGameSetup(){
    let el = document.getElementById('newgame-setup');
    if (!el) {
      el = document.createElement('div');
      el.id = 'newgame-setup';
      el.className = 'screen';
      el.style.cssText = 'position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;background:rgba(3,5,9,.9);backdrop-filter:blur(8px);color:#e8eef6;font-family:inherit';
      el.innerHTML = `
        <div style="width:min(760px,94vw);max-height:88vh;overflow-y:auto;padding:24px 26px;border:1px solid rgba(216,170,80,.35);border-radius:14px;background:linear-gradient(180deg,rgba(24,20,14,.98),rgba(7,9,12,.98));box-shadow:0 30px 100px rgba(0,0,0,.75)">
          <div style="font-size:9px;letter-spacing:5px;color:#a78a56;font-family:ui-monospace,monospace">NEW GAME · ASAKA</div>
          <h2 style="margin:4px 0 6px;font-size:22px;letter-spacing:5px;color:#ffe0a0">出发前</h2>
          <p style="margin:0 0 16px;font-size:12px;line-height:1.8;color:#b9c7d6">先确认你想要的游戏性模板。主模式会记住这次选择；进入后仍可在设置里手动调整。\n开局配发一套基础装备与 4200 信用点，不会从空手开始。</p>
          <div id="newgame-profiles" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px;gap:10px">
            <span style="font-size:9px;color:#7f8d9c;line-height:1.6">模板只影响初始游戏性设置；剧情/好感/任务不因模板改变。</span>
            <span style="display:flex;gap:8px">
              <button type="button" id="newgame-cancel" style="padding:9px 18px;border-radius:6px;border:1px solid rgba(160,180,200,.3);background:rgba(30,40,50,.5);color:#cfdae6;font-family:inherit;cursor:pointer">取消</button>
              <button type="button" id="newgame-start" style="padding:9px 22px;border-radius:6px;border:1px solid rgba(255,204,120,.5);background:rgba(120,80,30,.4);color:#ffe8c0;font-family:inherit;letter-spacing:2px;cursor:pointer">开始</button>
            </span>
          </div>
        </div>`;
      document.body.appendChild(el);
      const closeSetup = () => { el.classList.remove('on'); el.style.display = 'none'; };
      el.querySelector('#newgame-cancel')?.addEventListener('click', closeSetup);
      el.addEventListener('pointerdown', (ev) => { if (ev.target === el) closeSetup(); });
    }
    const box = el.querySelector('#newgame-profiles');
    const profiles = (this.app.engine.content.all('profiles') || []);
    const current = this.app.engine.profile.currentProfileId || 'tactical';
    this._newGameProfile = current;
    box.innerHTML = profiles.map(p => {
      const name = this.app.engine.i18n.t(p.name);
      const desc = this.app.engine.i18n.t(p.desc);
      return `<button type="button" class="ng-profile" data-pid="${p.id}" style="text-align:left;padding:11px 13px;border-radius:8px;border:1px solid ${p.id === current ? 'rgba(255,204,120,.55)' : 'rgba(150,180,210,.18)'};background:${p.id === current ? 'rgba(216,170,80,.12)' : 'rgba(255,255,255,.025)'};color:#dfe8f2;font-family:inherit;cursor:pointer">
        <div style="font-size:13px;letter-spacing:2px;color:#ffe0a0">${this._esc(name)}</div>
        <div style="font-size:10px;line-height:1.6;color:#93a4b5;margin-top:3px">${this._esc(desc)}</div>
      </button>`;
    }).join('');
    box.querySelectorAll('.ng-profile').forEach(btn => {
      btn.addEventListener('click', () => {
        this._newGameProfile = btn.dataset.pid;
        box.querySelectorAll('.ng-profile').forEach(b => {
          const on = b === btn;
          b.style.borderColor = on ? 'rgba(255,204,120,.55)' : 'rgba(150,180,210,.18)';
          b.style.background = on ? 'rgba(216,170,80,.12)' : 'rgba(255,255,255,.025)';
        });
      });
    });
    el.querySelector('#newgame-start').onclick = () => {
      el.classList.remove('on');
      el.style.display = 'none';
      this.app.startAsakaNewGame(this._newGameProfile);
    };
    el.classList.add('on');
    el.style.display = 'flex';
  }

  _continue(){
    if (!this.app.asakaSave || !this.app.asakaSave.hasSave()) return;
    this.app.continueAsaka();
  }

  _openHome(){
    const save = this.app.asakaSave;
    if (!save || !save.data.home || !save.data.home.purchased) return;
    this.app.openHome({ tab: 'hall' });
  }

  // 关于页：引擎、游戏、世界观入口、制作者与授权。
  // 图片依赖：游戏图标使用本地 assets/game-icon.svg；引擎图标沿用启动页的 LA 标识。
  openAbout(){
    let el = document.getElementById('about-screen');
    if (!el) {
      el = document.createElement('div');
      el.id = 'about-screen';
      el.className = 'screen about-screen';
      document.body.appendChild(el);
    }
    el.innerHTML = `
      <div class="about-stars"></div>
      <div class="about-head">
        <div>
          <div class="about-kicker">ABOUT · LAIASAKA</div>
          <h2>关于</h2>
        </div>
        <button class="title-btn small" id="about-close">关闭</button>
      </div>
      <div class="about-wrap">
        <div class="about-hero">
          <div class="about-engine-icon" aria-hidden="true">LA</div>
          <div class="about-game-icon"><img src="assets/game-icon.svg" alt="Asaka 游戏图标"></div>
          <div class="about-hero-text">
            <h3>Asaka <span>主模式</span></h3>
            <p>一部以物理仿真为核心的硬核撤离射击游戏。这里没有血条，只有动能、穿透、失血与判断。</p>
            <p class="about-hero-sub">LaiAsaka Engine · 纯 Web ES Modules + Three.js</p>
          </div>
        </div>
        <section class="about-card">
          <h4>世界观</h4>
          <p>故事发生在 Praze 世界观下的阿萨卡大陆。人类、Prazer 与旧秩序在这片土地上互相挤压。主模式从这里开始；Straight 是同一套战斗规则下的独立模式。</p>
          <a class="about-link" href="https://zpycua.github.io/Praze_Site/" target="_blank" rel="noopener noreferrer">阅读 Praze 世界观设定 →</a>
        </section>
        <section class="about-card">
          <h4>制作者</h4>
          <div class="about-credit-row"><b>ZpycuA</b><span>企划 / 制作人 / 程序 / 文案 / 美术 / 音频</span></div>
          <p class="about-small">本作目前由 ZpycuA 独立推进。引擎、内容表、剧情与界面均在这一套 Web 原型中迭代，之后再迁移到 Unity。</p>
        </section>
        <section class="about-card">
          <h4>协议与说明</h4>
          <div class="about-license-row"><b>游戏资产</b><span><a class="about-link" href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer">CC BY-NC 4.0</a> · 允许署名、非商业分享与改编，禁止商业使用。</span></div>
          <div class="about-license-row"><b>游戏本体 / 代码</b><span><a class="about-link" href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer">Apache-2.0</a> · 源码可自由使用、修改与再分发，保留版权与许可声明即可。</span></div>
          <div class="about-license-row"><b>Three.js</b><span><a class="about-link" href="https://github.com/mrdoob/three.js/blob/dev/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a> · 渲染引擎依赖。</span></div>
          <div class="about-license-row"><b>字体</b><span>使用系统字体栈（PingFang SC / Microsoft YaHei / system-ui），不随包分发字体文件。</span></div>
          <p class="about-small">第三方组件仅列直接依赖；后续接入新的开源库时会同步补充到此页与仓库 NOTICE。</p>
        </section>
        <div class="about-foot">© 2026 ZpycuA · LaiAsaka Engine · Asaka Straight Project</div>
      </div>`;
    el.querySelector('#about-close')?.addEventListener('click', () => this.closeAbout());
    el.classList.add('on');
    if (document.pointerLockElement) {
      try { document.exitPointerLock(); } catch (_) {}
    }
  }

  closeAbout(){
    document.getElementById('about-screen')?.classList.remove('on');
  }

  _esc(str){
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
}
