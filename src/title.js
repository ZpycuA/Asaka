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
        <div class="title-bg-glow"></div>
        <div class="title-bg-horizon"></div>
        <div class="title-bg-grain"></div>
      </div>
      <div class="title-top">
        <div class="title-brand">
          <div class="title-la" aria-hidden="true">LA</div>
          <div>
            <div class="title-engine">LaiAsaka Engine</div>
            <div class="title-version">ASP · MAIN MODE</div>
          </div>
        </div>
        <div class="title-top-actions">
          <button class="title-ghost" id="title-settings">设置</button>
        </div>
      </div>
      <div class="title-hero">
        <div class="title-kicker">LAIASKA ENGINE PRESENTS</div>
        <h1>ASAKA</h1>
        <div class="title-rule"><i></i><span>阿萨卡大陆</span><i></i></div>
        <p class="title-tagline">沙尘之下，计划仍在生长。</p>
      </div>
      <nav class="title-nav">
        ${item('title-new', '开始游戏', 'NEW GAME', '开启一份主模式新存档')}
        ${item('title-continue', '继续游戏', 'CONTINUE', '读取最近的主模式进度')}
        ${item('title-plan', '计划树', 'PLAN TREE', '剧情轨迹与存档管理')}
        ${item('title-straight', 'Straight 模式', 'STRAIGHT', '硬核撤离 · 独立战斗模式')}
        ${item('title-about', '关于', 'ABOUT', '')}
      </nav>
      <div class="title-foot">
        <span>v3.3.0 · 主模式</span>
        <span class="title-license">Assets CC BY-NC 4.0 · Code GPL-3.0</span>
      </div>
      <div id="title-save-hint" class="title-save-hint"></div>`;
    this.planTree = new PlanTree(this.app);
    this._bind();
    this._refresh();
  }

  _bind(){
    if (this._bound) return;
    this._bound = true;
    this.root.querySelector('#title-new')?.addEventListener('click', () => this._startNew());
    this.root.querySelector('#title-continue')?.addEventListener('click', () => this._continue());
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
      const auto = has ? save.getAutosave() : null;
      note.textContent = has
        ? (auto ? '最近自动存档 · ' + this._time(auto.at) : '读取最近的主模式进度')
        : '没有找到主模式存档';
    }
    const hint = this.root.querySelector('#title-save-hint');
    if (hint) {
      if (has) {
        const auto = save.getAutosave();
        hint.innerHTML = `<span class="dot"></span>主模式存档已建立${auto ? ' · 最近关键节点：' + this._esc(this._nodeName(auto.nodeId)) : ''}`;
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
      if (!confirm('开始新游戏会覆盖当前主模式进度与唯一的自动存档。\n确定重新开始？')) return;
    }
    this.app.startAsakaNewGame();
  }

  _continue(){
    if (!this.app.asakaSave || !this.app.asakaSave.hasSave()) return;
    this.app.continueAsaka();
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
          <div class="about-license-row"><b>游戏本体 / 代码</b><span><a class="about-link" href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">GPL-3.0</a> · 源码可自由使用、修改与再分发，衍生作品须以同一协议开源。</span></div>
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
