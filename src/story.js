/* ============================================================
   LaiAsaka Engine · 剧情播放器
   ------------------------------------------------------------
   主模式剧情是“3D 场景中的 UI”，不是立绘 + 背景图：
     · 剧情在现有 GameWorld 上播放，镜头与世界保持渲染；
     · 播放时暂停世界推进、隐藏战斗 HUD 与移动端控件；
     · 点击 / 空格 / 回车推进，选项用鼠标或数字键选择；
     · 演出途中禁止存档，章节结束才由 AsakaSave 写关键节点。
   本模块只认识“章节数据 + DOM”，不写任何剧情文本。
   ============================================================ */

import { getStoryChapter } from './story/asaka.prologue.js';

const TYPE_SPEED = 24;      // 每字毫秒数
const CLICK_GUARD = 220;    // 打开剧情后的防误触时间

export class StoryPlayer {
  constructor(app){
    this.app = app;
    this.world = null;
    this.chapter = null;
    this.nodeId = null;
    this.state = null;
    this.playing = false;
    this.typing = false;
    this._typeTimer = null;
    this._fullText = '';
    this._shownChars = 0;
    this._choicesShown = false;
    this._openedAt = 0;
    this._pausedByStory = false;
    this._bound = false;
    this._buildDom();
  }

  _buildDom(){
    if (document.getElementById('story-ui')) {
      this.root = document.getElementById('story-ui');
      this.elSpeaker = document.getElementById('story-speaker');
      this.elText = document.getElementById('story-text');
      this.elChoices = document.getElementById('story-choices');
      this.elNext = document.getElementById('story-next');
      this.elTitle = document.getElementById('story-title');
      this.elKnot = document.getElementById('story-knot');
      this._bindDom();
      return;
    }
    // 兜底：index.html 里没有剧情骨架时自动创建，保证主模式不会因为缺 UI 卡死。
    const root = document.createElement('div');
    root.id = 'story-ui';
    root.innerHTML =
      '<div class="story-cinema top"></div><div class="story-cinema bottom"></div>' +
      '<div class="story-head"><span id="story-title"></span><span class="story-no-save">剧情演出中 · 无法存档</span></div>' +
      '<div class="story-box">' +
        '<div class="story-speaker-row"><span id="story-speaker"></span><span id="story-knot" title="自动存档节点"></span></div>' +
        '<div id="story-text"></div>' +
        '<div id="story-choices"></div>' +
        '<div id="story-next">点击继续 <span>▾</span></div>' +
      '</div>';
    document.getElementById('game-screen')?.appendChild(root);
    this.root = root;
    this.elSpeaker = root.querySelector('#story-speaker');
    this.elText = root.querySelector('#story-text');
    this.elChoices = root.querySelector('#story-choices');
    this.elNext = root.querySelector('#story-next');
    this.elTitle = root.querySelector('#story-title');
    this.elKnot = root.querySelector('#story-knot');
    this._bindDom();
  }

  _bindDom(){
    if (this._bound || !this.root) return;
    this._bound = true;
    this.root.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('button')) return;
      ev.preventDefault();
      this._advance();
    });
    window.addEventListener('keydown', (ev) => {
      if (!this.playing) return;
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        this._advance();
        return;
      }
      if (this._choicesShown && /^[1-9]$/.test(ev.key)) {
        const idx = parseInt(ev.key, 10) - 1;
        const btns = this.elChoices.querySelectorAll('button');
        if (btns[idx]) { ev.preventDefault(); btns[idx].click(); }
      }
    });
  }

  isPlaying(){ return this.playing; }

  play(chapterId, opts = {}){
    if (this.playing) return false;
    const chapter = getStoryChapter(chapterId);
    if (!chapter) {
      console.warn('[Story] 未找到章节：' + chapterId);
      return false;
    }
    this.chapter = chapter;
    this.world = opts.world || this.app.world || null;
    this.state = { flags: {}, affection: {}, choices: [] };
    this.nodeId = chapter.start;
    this.playing = true;
    this._openedAt = performance.now();
    this.pausedByStory = false;
    // 章节开始是允许写关键节点的时间点；演出开始后到章节结束前不再落盘。
    try {
      if (this.app && typeof this.app.onStoryStart === 'function') this.app.onStoryStart(chapter);
    } catch (e) { console.warn('[Story] onStoryStart failed', e); }

    if (this.world && this.world.running && !this.world.paused) {
      try { this.world.pause(); this.pausedByStory = true; } catch (e) { console.warn('[Story] pause world failed', e); }
    }
    if (this.world) this.world._storyPlaying = true;
    document.getElementById('story-ui')?.classList.add('on');
    document.getElementById('game-screen')?.classList.add('story-mode');
    const mobile = document.getElementById('mobile-controls');
    if (mobile) mobile.style.display = 'none';
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (_) {} }
    if (this.elTitle) this.elTitle.textContent = this._pick(chapter.title);
    // 演出途中不展示存档标记：本章的自动存档在进入章节前已经写入，
    // 不能让玩家误以为可以在台词中途存档。
    if (this.elKnot) this.elKnot.classList.remove('auto');
    this._showNode(this.nodeId);
    return true;
  }

  _pick(value){
    if (value == null) return '';
    if (typeof value === 'object') {
      const lang = this.app.engine && this.app.engine.i18n ? this.app.engine.i18n.currentCode : 'zh-CN';
      return value[lang] || value['zh-CN'] || value.zh || '';
    }
    return String(value);
  }

  _showNode(nodeId){
    const node = this.chapter.nodes[nodeId];
    if (!node) { this._finish(); return; }
    this.nodeId = nodeId;
    this._choicesShown = false;
    this.elChoices.innerHTML = '';
    this.elChoices.classList.remove('on');
    this.elNext.classList.remove('on');
    const speaker = this._pick(node.speaker);
    this.elSpeaker.textContent = speaker;
    this.elSpeaker.classList.toggle('narration', !speaker);
    this.root.dataset.speaker = speaker ? 'character' : 'narration';
    this._type(this._pick(node.text), () => {
      if (node.choices && node.choices.length) this._showChoices(node);
      else this.elNext.classList.add('on');
    });
  }

  _type(text, onDone){
    this._fullText = text || '';
    this._shownChars = 0;
    this.typing = true;
    this.elText.textContent = '';
    if (this._typeTimer) clearInterval(this._typeTimer);
    if (!this._fullText) { this.typing = false; onDone && onDone(); return; }
    this._typeTimer = setInterval(() => {
      this._shownChars += 1;
      this.elText.textContent = this._fullText.slice(0, this._shownChars);
      if (this._shownChars >= this._fullText.length) {
        clearInterval(this._typeTimer);
        this._typeTimer = null;
        this.typing = false;
        onDone && onDone();
      }
    }, TYPE_SPEED);
  }

  _completeTyping(){
    if (!this.typing) return false;
    if (this._typeTimer) clearInterval(this._typeTimer);
    this._typeTimer = null;
    this.typing = false;
    this.elText.textContent = this._fullText;
    const node = this.chapter.nodes[this.nodeId];
    if (node && node.choices && node.choices.length) this._showChoices(node);
    else this.elNext.classList.add('on');
    return true;
  }

  _showChoices(node){
    this._choicesShown = true;
    this.elNext.classList.remove('on');
    this.elChoices.innerHTML = '';
    node.choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'story-choice';
      btn.innerHTML = '<span class="sc-num">' + (i + 1) + '</span><span>' + this._escape(this._pick(choice.text)) + '</span>';
      btn.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); });
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._choose(choice);
      });
      this.elChoices.appendChild(btn);
    });
    this.elChoices.classList.add('on');
  }

  _choose(choice){
    if (!this.playing || !choice) return;
    if (choice.flags && typeof choice.flags === 'object') Object.assign(this.state.flags, choice.flags);
    if (choice.affection && typeof choice.affection === 'object') {
      for (const [k, v] of Object.entries(choice.affection)) {
        this.state.affection[k] = (this.state.affection[k] || 0) + Number(v || 0);
      }
    }
    this.state.choices.push({ at: this.nodeId, text: this._pick(choice.text) });
    this.elChoices.classList.remove('on');
    this._choicesShown = false;
    const nextId = choice.next;
    if (!nextId) { this._finish(); return; }
    this._showNode(nextId);
  }

  _advance(){
    if (!this.playing) return;
    if (performance.now() - this._openedAt < CLICK_GUARD) return;
    if (this.typing) { this._completeTyping(); return; }
    if (this._choicesShown) return;
    const node = this.chapter.nodes[this.nodeId];
    if (!node) { this._finish(); return; }
    if (node.end) { this._finish(); return; }
    if (node.next) { this._showNode(node.next); return; }
    this._finish();
  }

  _finish(){
    if (!this.playing) return;
    const chapterId = this.chapter.id;
    const endNode = this.chapter.nodes[this.nodeId] || {};
    this.playing = false;
    this.typing = false;
    if (this._typeTimer) { clearInterval(this._typeTimer); this._typeTimer = null; }
    this.elChoices.classList.remove('on');
    this.elNext.classList.remove('on');
    document.getElementById('story-ui')?.classList.remove('on');
    document.getElementById('game-screen')?.classList.remove('story-mode');
    if (this.world) {
      this.world._storyPlaying = false;
      if (this.pausedByStory) {
        try { this.world.resume(); } catch (e) { console.warn('[Story] resume world failed', e); }
      }
      this.pausedByStory = false;
      if (!this.world.training && this.world.engine && this.world.engine.app) {
        // 移动端控件恢复显示；具体按钮可见性由 HUD/GameApp 自己再刷新一次
        const mobile = document.getElementById('mobile-controls');
        if (mobile && this.world.engine.app._mobileButtons) mobile.style.display = 'block';
      }
    }
    try {
      if (this.app && typeof this.app.onStoryEnd === 'function') {
        this.app.onStoryEnd(chapterId, this.state, endNode);
      }
    } catch (e) { console.error('[Story] onStoryEnd failed', e); }
    this.world = null;
    this.chapter = null;
    this.nodeId = null;
  }

  // 中途退出战局/回大厅：不写任何存档，只清理演出状态。
  abort(){
    if (!this.playing) return;
    this.playing = false;
    this.typing = false;
    if (this._typeTimer) { clearInterval(this._typeTimer); this._typeTimer = null; }
    document.getElementById('story-ui')?.classList.remove('on');
    document.getElementById('game-screen')?.classList.remove('story-mode');
    if (this.world) {
      this.world._storyPlaying = false;
      if (this.pausedByStory) {
        try { this.world.resume(); } catch (_) {}
      }
    }
    this.pausedByStory = false;
    this.world = null;
    this.chapter = null;
    this.nodeId = null;
  }

  _escape(str){
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
}
