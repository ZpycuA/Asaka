/* ============================================================
   LaiAsaka Engine · 剧情播放器（机制层）
   ------------------------------------------------------------
   本模块只认识“章节数据 + DOM”，不写任何剧情文本。
   支持：
     · 逐字显示、点击/空格/数字键选择；
     · 限时选择：进度条走完自动走 timeout 分支（沉默/没回答）；
     · 选择/节点效果：好感、flags、能力、属性、物品、任务、函数调用；
     · 进入条件：flag / 好感 / 属性 / 队伍 / 物品；
     · 语音三接口预留：本地音频文件 / 远端 TTS / 浏览器 SpeechSynthesis；
       —— 同一个节点只播一次，不提供“重新听”。
     · 章节结束总结算：回顾文本 + 每个已入队角色的定性好感变化；
     · 剧情内音游（结算阶段）：由 StoryPlayer 调用 RhythmGame，结果回写角色默契。
   ============================================================ */

import { getStoryChapter } from './story/asaka.prologue.js';
import { RhythmGame } from './story/rhythm.js';

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
    this._timer = null;
    this._timeLeft = 0;
    this._timeLimit = 0;
    this._rhythm = null;
    this._pendingRhythm = null;
    this._summaryOpen = false;
    this._appliedNodes = new Set();
    this._bound = false;
    this._buildDom();
  }

  _style(){
    if (document.getElementById('story-mech-style')) return;
    const st = document.createElement('style');
    st.id = 'story-mech-style';
    st.textContent = `
#story-timer{display:none;height:4px;margin:10px 0 2px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
#story-timer.on{display:block}
#story-timer i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#e7b85f,#ff5f8f);transition:width .1s linear}
#story-timer-label{display:none;font-size:9px;letter-spacing:2px;color:#d8b06a;margin-top:3px}
#story-timer-label.on{display:block}
.story-choice.locked{opacity:.38;cursor:not-allowed;filter:grayscale(.5)}
.story-choice .sc-why{font-size:9px;color:#a9895e;margin-left:auto}
#story-summary{position:absolute;inset:0;z-index:160;display:none;align-items:center;justify-content:center;background:rgba(3,5,8,.72);backdrop-filter:blur(6px)}
#story-summary.on{display:flex;animation:story-in .35s ease both}
.ss-card{width:min(620px,92vw);max-height:86vh;overflow-y:auto;padding:24px 28px 22px;border-radius:12px;border:1px solid rgba(216,170,80,.4);background:linear-gradient(180deg,rgba(28,22,14,.98),rgba(8,8,10,.98));box-shadow:0 24px 80px rgba(0,0,0,.7);color:#efe4cf}
.ss-kicker{font-size:9px;letter-spacing:5px;color:#9b8358;font-family:ui-monospace,monospace}
.ss-card h3{margin:4px 0 10px;font-size:20px;letter-spacing:4px;color:#ffd98a}
.ss-text{font-size:12px;line-height:1.9;color:#d9cbb4;border-left:2px solid rgba(216,170,80,.35);padding-left:12px;margin:0 0 14px}
.ss-sec{font-size:10px;letter-spacing:3px;color:#b08f58;margin:14px 0 6px}
.ss-aff{display:flex;flex-direction:column;gap:5px}
.ss-aff-row{display:flex;justify-content:space-between;font-size:11px;padding:5px 8px;border-radius:5px;background:rgba(255,255,255,.035)}
.ss-aff-row b{color:#ffd98a;font-weight:600}
.ss-choice-log{font-size:10px;line-height:1.7;color:#9f9a8e;max-height:110px;overflow-y:auto}
.ss-choice-log div{padding:2px 0;border-bottom:1px dashed rgba(255,255,255,.06)}
.ss-foot{display:flex;justify-content:flex-end;margin-top:18px}
.ss-foot button{padding:9px 22px;border-radius:6px;border:1px solid rgba(255,204,120,.5);background:rgba(120,80,30,.35);color:#ffe8c0;font-family:inherit;cursor:pointer;letter-spacing:2px}
#story-gate{position:absolute;inset:0;z-index:170;display:none;align-items:center;justify-content:center;background:rgba(3,5,8,.78)}
#story-gate.on{display:flex}
.gate-card{width:min(520px,92vw);padding:22px 24px;border-radius:12px;border:1px solid rgba(255,140,110,.45);background:linear-gradient(180deg,rgba(30,14,12,.98),rgba(8,8,10,.98));color:#f0dfd2}
.gate-card h3{margin:0 0 8px;font-size:16px;letter-spacing:3px;color:#ffb09a}
.gate-card p{margin:0 0 14px;font-size:12px;line-height:1.8;color:#d9c9bc}
.gate-card .gate-actions{display:flex;gap:8px;justify-content:flex-end}
.gate-card button{padding:8px 16px;border-radius:6px;border:1px solid rgba(255,180,130,.45);background:rgba(120,60,40,.35);color:#ffe4d0;font-family:inherit;cursor:pointer}
`;
    document.head.appendChild(st);
  }

  _buildDom(){
    this._style();
    if (document.getElementById('story-ui')) {
      this.root = document.getElementById('story-ui');
      this.elSpeaker = document.getElementById('story-speaker');
      this.elText = document.getElementById('story-text');
      this.elChoices = document.getElementById('story-choices');
      this.elNext = document.getElementById('story-next');
      this.elTitle = document.getElementById('story-title');
      this.elKnot = document.getElementById('story-knot');
      this._ensureExtras();
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
        '<div id="story-timer"><i></i></div><div id="story-timer-label"></div>' +
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
    this._ensureExtras();
    this._bindDom();
  }

  _ensureExtras(){
    if (!this.root) return;
    let timer = document.getElementById('story-timer');
    if (!timer) {
      timer = document.createElement('div');
      timer.id = 'story-timer';
      timer.innerHTML = '<i></i>';
      const box = this.root.querySelector('.story-box');
      if (box) box.insertBefore(timer, this.elChoices);
    }
    this.elTimer = timer;
    this.elTimerBar = timer.querySelector('i');
    let label = document.getElementById('story-timer-label');
    if (!label) {
      label = document.createElement('div');
      label.id = 'story-timer-label';
      timer.insertAdjacentElement('afterend', label);
    }
    this.elTimerLabel = label;
    // 总结算 / 条件拒绝 弹窗（惰性创建）
    if (!document.getElementById('story-summary')) {
      const sum = document.createElement('div');
      sum.id = 'story-summary';
      sum.innerHTML = '<div class="ss-card"><div class="ss-kicker">SETTLEMENT</div><h3></h3><p class="ss-text"></p><div class="ss-aff"></div><div class="ss-sec">回览 · 本次选择</div><div class="ss-choice-log"></div><div class="ss-foot"><button type="button" id="ss-close">收起</button></div></div>';
      this.root.appendChild(sum);
      sum.querySelector('#ss-close')?.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation(); this._closeSummary();
      });
    }
    this.elSummary = document.getElementById('story-summary');
    if (!document.getElementById('story-gate')) {
      const gate = document.createElement('div');
      gate.id = 'story-gate';
      gate.innerHTML = '<div class="gate-card"><h3>现在还不能进入这段剧情</h3><p id="gate-reason"></p><div class="gate-actions"><button type="button" id="gate-retry">状态已处理，继续</button><button type="button" id="gate-cancel">暂时离开</button></div></div>';
      this.root.appendChild(gate);
      gate.querySelector('#gate-retry')?.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation(); this._retryGate();
      });
      gate.querySelector('#gate-cancel')?.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation(); this._cancelGate();
      });
    }
    this.elGate = document.getElementById('story-gate');
    this.elGateReason = document.getElementById('gate-reason');
  }

  _bindDom(){
    if (this._bound || !this.root) return;
    this._bound = true;
    this.root.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('button')) return;
      if (this._rhythm && (this._rhythm.open || this._rhythm._result)) return;
      if (this._summaryOpen || (this._gatePending && this.elGate && this.elGate.classList.contains('on'))) return;
      ev.preventDefault();
      this._advance();
    });
    window.addEventListener('keydown', (ev) => {
      if (!this.playing) return;
      if (this._rhythm && (this._rhythm.open || this._rhythm._result)) return;
      if (this._summaryOpen || (this.elGate && this.elGate.classList.contains('on'))) return;
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        this._advance();
        return;
      }
      if (this._choicesShown && /^[1-9]$/.test(ev.key)) {
        const idx = parseInt(ev.key, 10) - 1;
        const btns = this.elChoices.querySelectorAll('button:not(.locked)');
        if (btns[idx]) { ev.preventDefault(); btns[idx].click(); }
      }
    });
  }

  isPlaying(){ return this.playing; }

  _pick(value){
    if (value == null) return '';
    if (typeof value === 'object' && !Array.isArray(value)) {
      const lang = this.app.engine && this.app.engine.i18n ? this.app.engine.i18n.currentCode : 'zh-CN';
      return value[lang] || value['zh-CN'] || value.zh || '';
    }
    return String(value);
  }

  play(chapterId, opts = {}){
    if (this.playing) return false;
    const chapter = getStoryChapter(chapterId);
    if (!chapter) {
      console.warn('[Story] 未找到章节：' + chapterId);
      return false;
    }
    // ★ 进入剧情前的状态检查：负面状态可能中断任务/必需剧情。
    const gate = this._checkGate(chapter);
    if (!gate.ok) {
      this._pendingChapter = chapter;
      this._pendingOpts = opts;
      this.world = opts.world || this.app.world || null;
      // 剧情入口被负面状态挡住时也暂停世界，避免玩家在弹窗后面被打死。
      if (this.world && this.world.running && !this.world.paused) {
        try { this.world.pause(); this._gatePausedWorld = true; } catch (_) {}
      }
      this._showGate(gate.reason);
      return false;
    }
    // 章节级进入条件：好感/队伍/flag 不满足时同样走“继续口”，不会硬跳剧情。
    const req = this._checkRequires(chapter.requires || null);
    if (!req.ok) {
      this._pendingChapter = chapter;
      this._pendingOpts = opts;
      this.world = opts.world || this.app.world || null;
      if (this.world && this.world.running && !this.world.paused) {
        try { this.world.pause(); this._gatePausedWorld = true; } catch (_) {}
      }
      this._showGate(req.reason || '这段剧情的前置条件还没有满足。');
      return false;
    }
    return this._begin(chapter, opts);
  }

  // 条件入口，可由外部直接调用（例如好感剧情菜单）。
  canPlay(chapterId){
    const chapter = getStoryChapter(chapterId);
    if (!chapter) return { ok: false, reason: '章节不存在' };
    return this._checkGate(chapter);
  }

  _checkGate(chapter){
    if (this.app && typeof this.app.canStartStory === 'function') {
      try { return this.app.canStartStory(chapter) || { ok: true }; }
      catch (e) { console.warn('[Story] canStartStory failed', e); }
    }
    return { ok: true };
  }

  _showGate(reason){
    this._gatePending = true;
    if (this.elGateReason) this.elGateReason.textContent = reason || '当前身上的负面状态可能中断这段剧情。先去处理伤口、止血或解除异常状态。';
    document.getElementById('story-ui')?.classList.add('on');
    document.getElementById('game-screen')?.classList.add('story-mode');
    this.elGate?.classList.add('on');
    this._stopVoice();
  }

  _retryGate(){
    const chapter = this._pendingChapter;
    const opts = this._pendingOpts || {};
    const gate = chapter ? this._checkGate(chapter) : { ok: false };
    if (!gate.ok) {
      if (this.elGateReason) this.elGateReason.textContent = gate.reason || '负面状态仍未处理。';
      return;
    }
    const req = chapter ? this._checkRequires(chapter.requires || null) : { ok: false };
    if (!req.ok) {
      if (this.elGateReason) this.elGateReason.textContent = req.reason || '前置条件仍未满足。';
      return;
    }
    this.elGate?.classList.remove('on');
    this._gatePending = false;
    this._pendingChapter = null;
    if (this._gatePausedWorld && this.world) {
      try { this.world.resume(); } catch (_) {}
      this._gatePausedWorld = false;
    }
    if (chapter) this._begin(chapter, opts);
  }

  _cancelGate(){
    this.elGate?.classList.remove('on');
    this._gatePending = false;
    this._pendingChapter = null;
    this._pendingOpts = null;
    if (this._gatePausedWorld && this.world) {
      try { this.world.resume(); } catch (_) {}
      this._gatePausedWorld = false;
    }
    if (!this.playing) {
      document.getElementById('story-ui')?.classList.remove('on');
      document.getElementById('game-screen')?.classList.remove('story-mode');
    }
  }

  _begin(chapter, opts = {}){
    this._gatePending = false;
    this.chapter = chapter;
    this.world = opts.world || this.app.world || null;
    const save = this.app.asakaSave;
    this.state = {
      flags: {},
      affection: {},
      stats: {},
      abilities: [],
      items: [],
      missions: [],
      rhythmResults: [],
      choices: [],
      // 用于结算时算“本次变化”而不是重复显示长期值
      affectionBefore: save ? Object.assign({}, save.data.affection || {}) : {},
      compatibilityBefore: save ? Object.assign({}, (save.data.attributes || {})) : {},
      visited: [],
    };
    this._appliedNodes = new Set();
    this.nodeId = chapter.start;
    this.playing = true;
    this._openedAt = performance.now();
    this.pausedByStory = false;
    this._pendingRhythm = null;
    this._summaryOpen = false;
    this._stopTimer();
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
    if (this.elKnot) this.elKnot.classList.remove('auto');
    this._showNode(this.nodeId);
    return true;
  }

  _showNode(nodeId){
    const node = this.chapter && this.chapter.nodes ? this.chapter.nodes[nodeId] : null;
    if (!node) { this._finish(); return; }
    this.nodeId = nodeId;
    this._pendingRhythm = null;
    this._rhythmDoneForNode = false;
    this._stopTimer();
    this._choicesShown = false;
    this.elChoices.innerHTML = '';
    this.elChoices.classList.remove('on');
    this.elNext.classList.remove('on');
    this.elTimer?.classList.remove('on');
    this.elTimerLabel?.classList.remove('on');

    // 节点效果只在第一次进入时结算，避免回看/重入重复加好感。
    if (!this._appliedNodes.has(nodeId)) {
      this._appliedNodes.add(nodeId);
      this.state.visited.push(nodeId);
      this._applyEffects(node.effects);
    }

    const speaker = this._pick(node.speaker);
    this.elSpeaker.textContent = speaker;
    this.elSpeaker.classList.toggle('narration', !speaker);
    this.root.dataset.speaker = speaker ? 'character' : 'narration';
    // ★ 语音三接口：node.voice.audio（本地文件）→ node.voice.tts（远端）→ 浏览器朗读。
    //   同一节点只自动播一次，不提供“重新听”。
    this._speak(node);

    this._type(this._pick(node.text), () => {
      if (node.rhythm) {
        this._pendingRhythm = node.rhythm;
        // 有音游的节点先等玩家点击，再进入结算阶段，读台词不会被音游打断。
        this.elNext.classList.add('on');
        if (node.choices && node.choices.length) this._showChoices(node);
        return;
      }
      if (node.choices && node.choices.length) this._showChoices(node);
      else this.elNext.classList.add('on');
    });
  }

  _speak(node){
    if (!node || node.voice === false) return;
    if (this.chapter && this.chapter.voice === false) return;
    const v = node.voice && typeof node.voice === 'object' ? node.voice : {};
    if (v.enabled === false) return;
    const text = this._pick(v.text || node.text || '');
    if (!text) return;
    const speaker = this._pick(node.speaker || '');
    // 旁白不自动朗读；只有角色台词或显式 voice.text/audio 才出声。
    if (!speaker && !v.text && !v.audio && !node.audio) return;
    const audio = v.audio || node.audio;
    if (audio) {
      try {
        this._voiceAudio = new Audio(audio);
        this._voiceAudio.play().catch(() => {});
      } catch (_) {}
      return;
    }
    // 预留远端 TTS：app.storyTtsEndpoint 存在时才走网络，否则自动回退浏览器朗读。
    if (v.tts !== 'browser' && this.app.storyTtsEndpoint) {
      try {
        fetch(this.app.storyTtsEndpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, speaker, voice: v.ttsVoice || null, lang: 'zh-CN' }),
        }).then(r => r.ok ? r.json() : null).then(data => {
          if (data && data.url) { this._voiceAudio = new Audio(data.url); this._voiceAudio.play().catch(() => {}); }
          else this._browserSpeak(text, v);
        }).catch(() => this._browserSpeak(text, v));
        return;
      } catch (_) {}
    }
    this._browserSpeak(text, v);
  }

  _browserSpeak(text, v = {}){
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (this.app && this.app.engine && this.app.engine.profile && !this.app.engine.profile.get('story.voice', true)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = v.rate !== undefined ? v.rate : 1.0;
      u.pitch = v.pitch !== undefined ? v.pitch : 1.0;
      u.volume = v.volume !== undefined ? v.volume : 0.85;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  _stopVoice(){
    try { if (this._voiceAudio) { this._voiceAudio.pause(); this._voiceAudio = null; } } catch (_) {}
    try { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
  }

  _applyEffects(effects){
    if (!effects) return;
    const list = Array.isArray(effects) ? effects : [effects];
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      const e = raw;
      if (e.flags && typeof e.flags === 'object') Object.assign(this.state.flags, e.flags);
      if (e.affection && typeof e.affection === 'object') {
        for (const [k, v] of Object.entries(e.affection)) {
          this.state.affection[k] = (this.state.affection[k] || 0) + Number(v || 0);
        }
      }
      if (e.stats && typeof e.stats === 'object') {
        for (const [k, v] of Object.entries(e.stats)) this.state.stats[k] = (this.state.stats[k] || 0) + Number(v || 0);
      }
      if (Array.isArray(e.abilities)) this.state.abilities.push(...e.abilities);
      if (Array.isArray(e.items)) this.state.items.push(...e.items);
      if (e.mission) this.state.missions.push(e.mission);
      if (e.rhythm) this._pendingRhythm = e.rhythm;
      if (e.command) this._runCommand(e.command);
      if (e.credits) this.state.credits = (this.state.credits || 0) + Number(e.credits || 0);
      try {
        if (this.app && typeof this.app.applyStoryEffects === 'function') {
          this.app.applyStoryEffects(e, this.state, this.chapter, this.world);
        }
      } catch (err) { console.warn('[Story] applyStoryEffects failed', err); }
    }
  }

  _runCommand(command){
    try {
      if (!command) return;
      if (this.app && typeof this.app.storyCommand === 'function') {
        this.app.storyCommand(command.name || command.fn, command.args || command.params || [], this.state, this.world, this.chapter);
      } else if (this.world && typeof this.world[command.name] === 'function') {
        this.world[command.name](...(command.args || []));
      }
    } catch (e) { console.warn('[Story] command failed', command, e); }
  }

  _checkRequires(req){
    if (!req || typeof req !== 'object') return { ok: true };
    const save = this.app.asakaSave;
    const flags = Object.assign({}, save ? save.data.flags || {} : {}, this.state ? this.state.flags : {});
    const aff = Object.assign({}, save ? save.data.affection || {} : {}, this.state ? this.state.affection : {});
    if (req.flags) {
      for (const k in req.flags) if (flags[k] !== req.flags[k]) return { ok: false, reason: '条件未满足：' + k };
    }
    if (req.notFlags) {
      for (const k in req.notFlags) if (flags[k] === req.notFlags[k]) return { ok: false, reason: '条件未满足：' + k };
    }
    if (req.affectionMin) {
      for (const k in req.affectionMin) if ((aff[k] || 0) < req.affectionMin[k]) return { ok: false, reason: '好感不足：' + k };
    }
    if (req.affectionMax) {
      for (const k in req.affectionMax) if ((aff[k] || 0) > req.affectionMax[k]) return { ok: false, reason: '好感过高：' + k };
    }
    if (req.party) {
      const roster = this.app && typeof this.app.getPartyRoster === 'function' ? this.app.getPartyRoster() : [];
      const ids = roster.map(r => r.id);
      for (const id of req.party) if (!ids.includes(id)) return { ok: false, reason: '队伍中没有：' + id };
    }
    if (req.items) {
      const inv = this.app && this.app.inventory;
      for (const it of req.items) {
        if (!inv || !inv.items) return { ok: false, reason: '物品不足' };
        let n = 0;
        for (const x of inv.items.values()) if (x && x.defId === it) n++;
        if (n <= 0) return { ok: false, reason: '缺少物品：' + it };
      }
    }
    return { ok: true };
  }

  _showChoices(node){
    this._choicesShown = true;
    this.elNext.classList.remove('on');
    this.elChoices.innerHTML = '';
    const timed = Number(node.timeLimit || 0) > 0;
    node.choices.forEach((choice, i) => {
      const gate = this._checkRequires(choice.requires);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'story-choice' + (gate.ok ? '' : ' locked');
      btn.innerHTML = '<span class="sc-num">' + (i + 1) + '</span><span>' + this._escape(this._pick(choice.text)) + '</span>' +
        (gate.ok ? '' : '<span class="sc-why">' + this._escape(gate.reason || '条件未满足') + '</span>');
      btn.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); });
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!gate.ok) return;
        this._choose(choice);
      });
      this.elChoices.appendChild(btn);
    });
    this.elChoices.classList.add('on');
    if (timed) this._startTimer(node);
  }

  _startTimer(node){
    this._stopTimer();
    this._timeLimit = Number(node.timeLimit || 0) * 1000;
    this._timeLeft = this._timeLimit;
    this._timedNode = node;
    if (this.elTimer) this.elTimer.classList.add('on');
    if (this.elTimerLabel) {
      this.elTimerLabel.textContent = '回答时间有限 · 不回答也会被记住';
      this.elTimerLabel.classList.add('on');
    }
    const tick = () => {
      this._timeLeft -= 100;
      const pct = Math.max(0, Math.min(1, this._timeLeft / this._timeLimit));
      if (this.elTimerBar) this.elTimerBar.style.width = (pct * 100) + '%';
      if (this._timeLeft <= 0) {
        this._stopTimer();
        this._timeoutChoice();
      }
    };
    this._timer = setInterval(tick, 100);
  }

  _stopTimer(){
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this.elTimer?.classList.remove('on');
    this.elTimerLabel?.classList.remove('on');
  }

  _timeoutChoice(){
    if (!this.playing || !this._choicesShown) return;
    const node = this.chapter && this.chapter.nodes ? this.chapter.nodes[this.nodeId] : null;
    if (!node) return;
    this._choicesShown = false;
    this.elChoices.classList.remove('on');
    const timeoutEffects = node.timeoutEffects || node.timeoutChoice?.effects || null;
    this._applyEffects(timeoutEffects);
    this.state.choices.push({ at: this.nodeId, text: '（没有回答）', timedOut: true });
    const next = node.timeoutNext || (node.timeoutChoice ? node.timeoutChoice.next : null);
    if (next) { this._showNode(next); return; }
    this._finish();
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
    if (node && node.rhythm) this.elNext.classList.add('on');
    else if (node && node.choices && node.choices.length) this._showChoices(node);
    else this.elNext.classList.add('on');
    return true;
  }

  _choose(choice){
    if (!this.playing || !choice) return;
    this._stopTimer();
    this._applyEffects(choice.effects);
    if (choice.flags && typeof choice.flags === 'object') Object.assign(this.state.flags, choice.flags);
    if (choice.affection && typeof choice.affection === 'object') {
      for (const [k, v] of Object.entries(choice.affection)) {
        this.state.affection[k] = (this.state.affection[k] || 0) + Number(v || 0);
      }
    }
    this.state.choices.push({ at: this.nodeId, text: this._pick(choice.text), tone: choice.tone || '' });
    this.elChoices.classList.remove('on');
    this._choicesShown = false;
    if (choice.rhythm) this._pendingRhythm = choice.rhythm;
    const nextId = choice.next;
    if (!nextId) { this._finish(); return; }
    this._showNode(nextId);
  }

  _advance(){
    if (!this.playing) return;
    if (this._rhythm && (this._rhythm.open || this._rhythm._result)) return;
    if (performance.now() - this._openedAt < CLICK_GUARD) return;
    if (this._summaryOpen) return;
    if (this.typing) { this._completeTyping(); return; }
    if (this._choicesShown) return;
    const node = this.chapter.nodes[this.nodeId];
    if (!node) { this._finish(); return; }
    if (this._pendingRhythm && !this._rhythmDoneForNode) {
      this._startRhythm(this._pendingRhythm, node);
      return;
    }
    if (node.end) { this._finish(); return; }
    if (node.next) { this._showNode(node.next); return; }
    this._finish();
  }

  _startRhythm(cfg, node){
    if (this._rhythm) return;
    const gate = this._checkRequires(cfg.requires || null);
    if (!gate.ok) {
      this._pendingRhythm = null;
      this._rhythmDoneForNode = true;
      if (this.elHint) this.elHint.textContent = gate.reason;
      if (node && node.next) this._showNode(node.next);
      else this._finish();
      return;
    }
    this._stopVoice();
    this._rhythmDoneForNode = true;
    this._rhythmNodeId = this.nodeId;
    this._rhythm = new RhythmGame({
      app: this.app,
      character: cfg.character || 'lingna',
      title: cfg.title || '结算阶段',
      subtitle: cfg.subtitle || '',
      duration: cfg.duration || 30,
      onFinish: (result) => this._finishRhythm(result, cfg, node),
    });
    this._rhythm.start();
  }

  _finishRhythm(result, cfg, node){
    if (result) {
      this.state.rhythmResults.push(result);
      // 角色默契是长期属性，交给 App 写存档（只写数值，不给玩家看数字）。
      try {
        if (this.app && typeof this.app.applyRhythmResult === 'function') {
          this.app.applyRhythmResult(result, this.chapter, this.state);
        }
      } catch (e) { console.warn('[Story] applyRhythmResult failed', e); }
    }
    try { this._rhythm?.destroy(); } catch (_) {}
    this._rhythm = null;
    this._pendingRhythm = null;
    if (node && node.next) { this._showNode(node.next); return; }
    if (node && node.end) { this._finish(); return; }
    this._finish();
  }

  _finish(){
    if (!this.playing || this._summaryOpen) return;
    this._stopTimer();
    this._stopVoice();
    const chapterId = this.chapter.id;
    const endNode = this.chapter.nodes[this.nodeId] || {};
    // 结束节点如果是从选择直接跳过来（没有经过 _showNode），补一次节点效果；
    // 正常播放过的节点不重复加好感/flag。
    if (!this._appliedNodes.has(this.nodeId)) {
      this._appliedNodes.add(this.nodeId);
      this._applyEffects(endNode.effects);
    }
    this.playing = false;
    this.typing = false;
    if (this._typeTimer) { clearInterval(this._typeTimer); this._typeTimer = null; }
    this.elChoices.classList.remove('on');
    this.elNext.classList.remove('on');
    // 交给 App 写关键节点/存档、更新队伍与好感。
    try {
      if (this.app && typeof this.app.onStoryEnd === 'function') {
        this.app.onStoryEnd(chapterId, this.state, endNode);
      }
    } catch (e) { console.error('[Story] onStoryEnd failed', e); }
    this._showSummary(chapterId, endNode);
  }

  _affectionWord(delta){
    if (delta >= 6) return '明显靠近';
    if (delta >= 3) return '好感上升';
    if (delta >= 1) return '稍微在意';
    if (delta === 0) return '没有变化';
    if (delta >= -2) return '有点疏远';
    if (delta >= -5) return '明显不满';
    return '关系恶化';
  }

  _showSummary(chapterId, endNode){
    this._summaryOpen = true;
    const save = this.app.asakaSave;
    const roster = this.app && typeof this.app.getPartyRoster === 'function' ? this.app.getPartyRoster() : [];
    const affBefore = this.state.affectionBefore || {};
    const delta = this.state.affection || {};
    const after = Object.assign({}, save ? save.data.affection || {} : {}, affBefore);
    for (const [k, v] of Object.entries(delta)) after[k] = (after[k] || 0) + Number(v || 0);
    const add = this.state.affection || {};
    let affHtml = '';
    const chars = roster.length ? roster : Object.keys(add).map(id => ({ id, name: id }));
    for (const c of chars) {
      const d = Number(add[c.id] || 0);
      if (!d && !roster.length) continue;
      affHtml += '<div class="ss-aff-row"><span>' + this._escape(c.name || c.id) + '</span><b>' + this._escape(this._affectionWord(d)) + '</b></div>';
    }
    if (!affHtml) affHtml = '<div class="ss-aff-row"><span>队伍</span><b>这次没留下什么</b></div>';
    const sum = this.chapter.summary || {};
    const text = this._pick((endNode && endNode.summaryText) || sum.text || '故事在这里暂时收束。');
    const title = this._pick(sum.title || this.chapter.title || chapterId);
    const choices = this.state.choices.slice(-8);
    let choiceHtml = choices.map(c => '<div>' + (c.timedOut ? '（沉默）' : '· ' + this._escape(c.text)) + '</div>').join('');
    if (!choiceHtml) choiceHtml = '<div>（没有留下选择记录）</div>';
    const card = this.elSummary?.querySelector('.ss-card');
    if (card) {
      card.querySelector('h3').textContent = title;
      card.querySelector('.ss-text').textContent = text;
      card.querySelector('.ss-aff').innerHTML = affHtml;
      card.querySelector('.ss-choice-log').innerHTML = choiceHtml;
    }
    this.elSummary?.classList.add('on');
  }

  _closeSummary(){
    if (!this._summaryOpen) return;
    const chapterId = this.chapter ? this.chapter.id : null;
    this._summaryOpen = false;
    this.elSummary?.classList.remove('on');
    this._teardown();
    try {
      if (this.app && typeof this.app.onStorySummaryClosed === 'function') this.app.onStorySummaryClosed(chapterId);
    } catch (e) { console.warn('[Story] onStorySummaryClosed failed', e); }
  }

  _teardown(){
    const chapterId = this.chapter ? this.chapter.id : null;
    document.getElementById('story-ui')?.classList.remove('on');
    document.getElementById('game-screen')?.classList.remove('story-mode');
    if (this.world) {
      this.world._storyPlaying = false;
      if (this.pausedByStory) {
        try { this.world.resume(); } catch (e) { console.warn('[Story] resume world failed', e); }
      }
      this.pausedByStory = false;
      const mobile = document.getElementById('mobile-controls');
      if (mobile && this.world.engine.app._mobileButtons) mobile.style.display = 'block';
    }
    this.world = null;
    this.chapter = null;
    this.nodeId = null;
    this.state = null;
    this._rhythmDoneForNode = false;
    this._stopVoice();
  }

  // 中途退出战局/回大厅：不写任何存档，只清理演出状态。
  abort(){
    if (!this.playing && !this._summaryOpen && !this._gatePending) return;
    this.playing = false;
    this._summaryOpen = false;
    this.typing = false;
    this._stopTimer();
    this._stopVoice();
    if (this._typeTimer) { clearInterval(this._typeTimer); this._typeTimer = null; }
    try { this._rhythm?.destroy(); } catch (_) {}
    this._rhythm = null;
    this.elSummary?.classList.remove('on');
    this.elGate?.classList.remove('on');
    document.getElementById('story-ui')?.classList.remove('on');
    document.getElementById('game-screen')?.classList.remove('story-mode');
    if (this.world) {
      this.world._storyPlaying = false;
      if (this.pausedByStory || this._gatePausedWorld) {
        try { this.world.resume(); } catch (_) {}
      }
    }
    this.pausedByStory = false;
    this._gatePausedWorld = false;
    this.world = null;
    this.chapter = null;
    this.nodeId = null;
    this.state = null;
  }

  _escape(str){
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
}
