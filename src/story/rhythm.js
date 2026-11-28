/* ============================================================
   LaiAsaka Engine · 剧情结算阶段 · 音轨音游
   ------------------------------------------------------------
   设计目标（不是传统音游）：
     · 轨迹不是固定谱面：键速与复杂度由“氛围值”实时决定；
     · 氛围值只记录本局，从 0 开始，命中上升、失误下降；
     · “默契值”是角色长期属性，正确命中会累积，失误会回退；
     · 不同角色对节奏的舒适区不同：
         - 玲娜吃快节奏，快起来她更配合；
         - 凯特要先慢后快，长期处在过快氛围会掉默契；
     · 默契/氛围过低会提前中断，不是必得奖励。
   本模块只负责播放与结算，把结果交给 StoryPlayer；不写存档、不改剧情。
   ============================================================ */

const CHARACTER_TEMPO = {
  lingna: {
    name: '玲娜',
    baseInterval: 520,
    fastComfort: 30,
    slowPenaltyAfter: 12,
    quote: ['再快一点。别停。', '这才像在活着。', '队长，跟得上吗？'],
    resultLine: ['节奏对上了。下一次别慢下来。', '还行。你的手比嘴诚实。'],
    avatar: 'assets/chibi/lingna.png',
    initial: '玲',
    color: '#ff9ec4',
  },
  kate: {
    name: '凯特',
    baseInterval: 760,
    fastComfort: 55,
    slowPenaltyAfter: 0,
    quote: ['慢一点。先把呼吸稳住。', '别急着证明什么。', '我在这里，不用慌。'],
    resultLine: ['你终于学会等我了。', '慢下来之后，反而更准。'],
    avatar: 'assets/chibi/kate.png',
    initial: '凯',
    color: '#8fd6ff',
  },
  default: {
    name: '队员',
    baseInterval: 650,
    fastComfort: 45,
    slowPenaltyAfter: 0,
    quote: ['继续。'],
    resultLine: ['还行。'],
    avatar: '',
    initial: '？',
    color: '#ffd98a',
  },
};

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

export class RhythmGame {
  constructor(opts = {}){
    this.app = opts.app || null;
    this.characterId = opts.character || 'lingna';
    this.cfg = CHARACTER_TEMPO[this.characterId] || CHARACTER_TEMPO.default;
    this.onFinish = typeof opts.onFinish === 'function' ? opts.onFinish : null;
    this.title = opts.title || '结算阶段';
    this.subtitle = opts.subtitle || '';
    this.duration = opts.duration || 30;
    this.open = false;
    this.hits = 0;
    this.misses = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.atmosphere = 0;
    this.compatibility = 0;
    this.thoughts = 0;
    this.notes = [];
    this.lane = 4;
    this.noteSeq = 0;
    this.startedAt = 0;
    this.lastSpawn = 0;
    this.raf = null;
    this._boundKeys = null;
    this._aborted = false;
    this._buildDom();
    this._bind();
  }

  _style(){
    if (document.getElementById('rhythm-style')) return;
    const st = document.createElement('style');
    st.id = 'rhythm-style';
    st.textContent = `
#rhythm-ui{position:absolute;inset:0;z-index:150;display:none;background:radial-gradient(circle at 50% 42%,rgba(48,30,58,.55),rgba(3,5,8,.96) 72%);color:#f5ead8;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
#rhythm-ui.on{display:flex;align-items:center;justify-content:center}
.rhythm-stage{width:min(940px,94vw);display:grid;grid-template-columns:250px 1fr;gap:18px}
.rhythm-side{position:relative;border:1px solid rgba(255,190,120,.35);background:linear-gradient(180deg,rgba(38,24,30,.9),rgba(10,8,12,.94));border-radius:12px;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-height:390px;overflow:hidden}
.rhythm-avatar{position:absolute;left:0;right:0;top:0;bottom:58px;display:flex;align-items:center;justify-content:center;font-size:84px;font-weight:900;color:rgba(255,255,255,.12);background:radial-gradient(circle at 50% 30%,rgba(255,180,220,.22),transparent 62%)}
.rhythm-avatar img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 8px 20px rgba(0,0,0,.6))}
.rhythm-avatar .fallback{width:128px;height:128px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,220,160,.35);background:rgba(255,255,255,.04);font-size:46px;color:rgba(255,220,160,.75)}
.rhythm-name{position:relative;font-size:16px;letter-spacing:4px;color:#ffd98a;z-index:2}
.rhythm-quote{position:relative;min-height:34px;margin-top:5px;font-size:11px;line-height:1.6;color:#e8dcc8;text-align:center;z-index:2}
.rhythm-main{position:relative;border:1px solid rgba(100,190,255,.22);background:linear-gradient(180deg,rgba(12,20,28,.9),rgba(4,7,10,.96));border-radius:12px;padding:14px 16px 16px;overflow:hidden}
.rhythm-head{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;letter-spacing:2px;color:#9fc7e8}
.rhythm-head b{font-size:15px;color:#fff2cf}
.rhythm-meter{height:6px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;margin:4px 0 10px}
.rhythm-meter i{display:block;height:100%;width:0%;background:linear-gradient(90deg,#d66bff,#ffd36b);transition:width .12s}
.rhythm-lanes{position:relative;height:330px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.rhythm-lane{position:relative;border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(120,180,255,.06));border:1px solid rgba(120,180,255,.12);overflow:hidden}
.rhythm-lane .hit{position:absolute;left:5px;right:5px;bottom:56px;height:7px;border-radius:4px;background:rgba(255,220,150,.28);box-shadow:0 0 16px rgba(255,200,100,.25)}
.rhythm-note{position:absolute;left:12%;right:12%;height:13px;border-radius:5px;background:linear-gradient(90deg,#ffcf6b,#ff8fb8);box-shadow:0 0 12px rgba(255,160,180,.55);will-change:top}
.rhythm-note.good{background:linear-gradient(90deg,#9effc0,#5bd8ff)}
.rhythm-key{position:absolute;left:5px;right:5px;bottom:12px;height:38px;border-radius:7px;border:1px solid rgba(180,220,255,.35);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#cfe8ff;background:rgba(40,80,120,.35)}
.rhythm-key.hit{background:rgba(255,220,140,.28);transform:scale(.96)}
.rhythm-key.touch{cursor:pointer}
.rhythm-combo{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font-size:34px;font-weight:900;color:rgba(255,220,150,.8);text-shadow:0 0 22px rgba(255,180,80,.35);pointer-events:none;opacity:0;transition:opacity .1s}
.rhythm-combo.on{opacity:1}
.rhythm-edge{position:absolute;inset:0;pointer-events:none;opacity:0;box-shadow:inset 0 0 120px rgba(255,90,160,.55),inset 0 0 30px rgba(255,190,120,.35);transition:opacity .2s}
.rhythm-result{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(4,6,10,.88);z-index:5}
.rhythm-result.on{display:flex}
.rhythm-result-card{width:min(520px,90vw);padding:24px 28px;border:1px solid rgba(255,200,120,.42);border-radius:12px;background:linear-gradient(180deg,rgba(28,20,15,.98),rgba(8,8,10,.98));text-align:center}
.rhythm-result-card h3{margin:0 0 4px;font-size:18px;letter-spacing:5px;color:#ffd98a}
.rhythm-result-card .sub{font-size:10px;letter-spacing:2px;color:#8f9dab;margin-bottom:14px}
.rhythm-result-card .grade{font-size:42px;font-weight:900;color:#ffe7a8;line-height:1;margin:6px 0 12px}
.rhythm-result-card .row{display:flex;justify-content:space-between;font-size:12px;color:#d9e6f2;padding:5px 0;border-top:1px solid rgba(255,255,255,.07)}
.rhythm-result-card .line{margin:14px 0 18px;font-size:12px;line-height:1.8;color:#e8dcc8}
.rhythm-result-card button{padding:9px 22px;border-radius:6px;border:1px solid rgba(255,204,120,.5);background:rgba(120,80,30,.4);color:#ffe8c0;font-family:inherit;cursor:pointer;letter-spacing:2px}
.rhythm-howto{font-size:10px;color:#7f9ab3;letter-spacing:1px;margin-top:8px}
@media(max-width:700px){.rhythm-stage{grid-template-columns:1fr}.rhythm-side{display:none}.rhythm-main{padding:10px}.rhythm-lanes{height:280px}}
`;
    document.head.appendChild(st);
  }

  _buildDom(){
    this._style();
    let root = document.getElementById('rhythm-ui');
    if (!root) {
      root = document.createElement('div');
      root.id = 'rhythm-ui';
      root.innerHTML = `
        <div class="rhythm-stage">
          <div class="rhythm-side">
            <div class="rhythm-avatar"></div>
            <div class="rhythm-name"></div>
            <div class="rhythm-quote"></div>
          </div>
          <div class="rhythm-main">
            <div class="rhythm-head"><span style="color:#ffd98a">${this.title}</span><span>默契 <b id="rhythm-compat">0</b> · 氛围 <b id="rhythm-atmo">0</b></span></div>
            <div class="rhythm-meter"><i id="rhythm-atmo-bar"></i></div>
            <div class="rhythm-lanes" id="rhythm-lanes"></div>
            <div class="rhythm-combo" id="rhythm-combo"></div>
            <div class="rhythm-howto">D / F / J / K 对应四条音轨 · 命中越准，氛围越快、谱面越复杂</div>
            <div class="rhythm-edge" id="rhythm-edge"></div>
          </div>
        </div>
        <div class="rhythm-result" id="rhythm-result">
          <div class="rhythm-result-card">
            <h3 id="rhythm-result-title">结算阶段</h3>
            <div class="sub" id="rhythm-result-sub"></div>
            <div class="grade" id="rhythm-result-grade">—</div>
            <div id="rhythm-result-rows"></div>
            <div class="line" id="rhythm-result-line"></div>
            <button id="rhythm-result-close" type="button">收下这次默契</button>
          </div>
        </div>`;
      document.getElementById('game-screen')?.appendChild(root) || document.body.appendChild(root);
    }
    this.root = root;
    this.elLanes = root.querySelector('#rhythm-lanes');
    this.elCompat = root.querySelector('#rhythm-compat');
    this.elAtmo = root.querySelector('#rhythm-atmo');
    this.elAtmoBar = root.querySelector('#rhythm-atmo-bar');
    this.elCombo = root.querySelector('#rhythm-combo');
    this.elEdge = root.querySelector('#rhythm-edge');
    this.elResult = root.querySelector('#rhythm-result');
    this.elResultTitle = root.querySelector('#rhythm-result-title');
    this.elResultSub = root.querySelector('#rhythm-result-sub');
    this.elResultGrade = root.querySelector('#rhythm-result-grade');
    this.elResultRows = root.querySelector('#rhythm-result-rows');
    this.elResultLine = root.querySelector('#rhythm-result-line');
    this.elName = root.querySelector('.rhythm-name');
    this.elQuote = root.querySelector('.rhythm-quote');
    this.elAvatar = root.querySelector('.rhythm-avatar');
    this.elLanes.innerHTML = '';
    const keys = ['D', 'F', 'J', 'K'];
    this.laneEls = [];
    for (let i = 0; i < this.lane; i++) {
      const lane = document.createElement('div');
      lane.className = 'rhythm-lane';
      lane.dataset.lane = String(i);
      lane.innerHTML = '<div class="hit"></div><div class="rhythm-key touch" data-lane="' + i + '">' + keys[i] + '</div>';
      this.elLanes.appendChild(lane);
      this.laneEls.push(lane);
    }
    this.elName.textContent = this.cfg.name;
    this.elName.style.color = this.cfg.color;
    this.elQuote.textContent = this.cfg.quote[0];
    this._renderAvatar();
    this.elAvatar.style.fontSize = '84px';
    this.elAvatar.style.color = 'rgba(255,255,255,.10)';
  }

  _renderAvatar(){
    if (!this.elAvatar) return;
    this.elAvatar.innerHTML = '';
    if (this.cfg.avatar) {
      const img = document.createElement('img');
      img.src = this.cfg.avatar;
      img.alt = this.cfg.name;
      img.onerror = () => {
        this.elAvatar.innerHTML = '<div class="fallback" style="color:' + this.cfg.color + '">' + this.cfg.initial + '</div>';
      };
      this.elAvatar.appendChild(img);
    } else {
      this.elAvatar.innerHTML = '<div class="fallback" style="color:' + this.cfg.color + '">' + this.cfg.initial + '</div>';
    }
  }

  _bind(){
    this._onKey = (ev) => {
      if (!this.open) return;
      if (this._finished) return;
      const k = String(ev.key || '').toLowerCase();
      const map = { d: 0, f: 1, j: 2, k: 3 };
      if (!(k in map)) return;
      ev.preventDefault();
      this._hit(map[k]);
    };
    window.addEventListener('keydown', this._onKey, true);
    this.root.querySelectorAll('.rhythm-key').forEach(el => {
      el.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!this.open || this._finished) return;
        this._hit(parseInt(el.dataset.lane, 10) || 0);
      });
    });
    this.root.querySelector('#rhythm-result-close')?.addEventListener('click', () => this._closeResult());
    // 防止剧情 UI 的 pointerdown 推进在音游上误触
    this.root.addEventListener('pointerdown', (ev) => { if (this.open) ev.stopPropagation(); });
  }

  start(){
    if (this.open) return;
    this.open = true;
    this._finished = false;
    this.hits = 0; this.misses = 0; this.combo = 0; this.maxCombo = 0;
    this.atmosphere = 0; this.compatibility = 0; this.thoughts = 0;
    this.notes = [];
    this.noteSeq = 0;
    this.startedAt = performance.now();
    this.lastSpawn = this.startedAt;
    this.elResult.classList.remove('on');
    this.root.classList.add('on');
    this._updateHud();
    this._loop();
  }

  _loop(){
    if (!this.open || this._finished) return;
    const now = performance.now();
    const t = (now - this.startedAt) / 1000;
    if (t > this.duration) { this._finish('complete'); return; }
    const interval = this._currentInterval();
    if (now - this.lastSpawn >= interval) {
      this.lastSpawn = now;
      this._spawnNote(t);
    }
    this._updateNotes(now);
    // 氛围/默契过低：提前中断
    if (t > 8 && (this.compatibility <= -18 || (this.characterId === 'kate' && this.atmosphere > 92 && this.compatibility <= -10))) {
      this._finish('interrupted');
      return;
    }
    if (this.characterId === 'lingna' && t > this.cfg.slowPenaltyAfter && this.atmosphere < 14) {
      this.compatibility = Math.max(-30, this.compatibility - 0.35 * (1 / 60));
    }
    this.raf = requestAnimationFrame(() => this._loop());
  }

  _currentInterval(){
    // 氛围越高，音符生成越快；也就是“谱面跟着气氛走”。
    const fast = this.characterId === 'lingna' ? 1.25 : 1.0;
    const speedUp = 1 + (this.atmosphere / 100) * 1.6 * fast;
    return this.cfg.baseInterval / speedUp;
  }

  _spawnNote(t){
    const lane = Math.floor(Math.random() * this.lane);
    const note = { lane, hitAt: performance.now() + 1400, el: document.createElement('div'), judged: false };
    note.el.className = 'rhythm-note';
    note.el.style.top = '-20px';
    this.laneEls[lane].appendChild(note.el);
    this.notes.push(note);
    // 高氛围时出现双押/三押，谱面更复杂
    const extra = this.atmosphere > 70 ? (Math.random() < 0.28 ? 2 : (Math.random() < 0.35 ? 1 : 0))
      : (this.atmosphere > 40 ? (Math.random() < 0.18 ? 1 : 0) : 0);
    for (let i = 0; i < extra; i++) {
      const l2 = (lane + 1 + i) % this.lane;
      const n2 = { lane: l2, hitAt: note.hitAt, el: document.createElement('div'), judged: false };
      n2.el.className = 'rhythm-note';
      n2.el.style.top = '-20px';
      this.laneEls[l2].appendChild(n2.el);
      this.notes.push(n2);
    }
  }

  _hit(lane){
    const now = performance.now();
    let best = null;
    for (const n of this.notes) {
      if (n.judged || n.lane !== lane) continue;
      const dt = Math.abs(n.hitAt - now);
      if (dt <= 180 && (!best || dt < best.dt)) best = { n, dt };
    }
    const keyEl = this.root.querySelector('.rhythm-key[data-lane="' + lane + '"]');
    if (keyEl) { keyEl.classList.add('hit'); setTimeout(() => keyEl.classList.remove('hit'), 90); }
    if (!best) {
      // 空击：不重罚，但会断连击、轻微掉氛围
      this.combo = 0;
      this.atmosphere = clamp(this.atmosphere - 1.5, 0, 100);
      this._updateHud();
      return;
    }
    const n = best.n;
    n.judged = true;
    n.el.remove();
    const dt = best.dt;
    const perfect = dt <= 65;
    this.hits++;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    // 凯特：氛围过快时命中收益下降（违背她的节奏）
    const tooFastForKate = this.characterId === 'kate' && this.atmosphere > this.cfg.fastComfort;
    let compatGain = perfect ? 1.4 : 1.0;
    if (tooFastForKate) compatGain *= 0.35;
    if (this.characterId === 'lingna' && this.atmosphere > this.cfg.fastComfort) compatGain += 0.35;
    this.compatibility += compatGain;
    this.atmosphere = clamp(this.atmosphere + (perfect ? 2.2 : 1.5), 0, 100);
    this.thoughts++;
    if (this.combo > 0 && this.combo % 12 === 0) {
      this.elCombo.textContent = this.combo + ' COMBO';
      this.elCombo.classList.add('on');
      setTimeout(() => this.elCombo.classList.remove('on'), 700);
      const q = this.cfg.quote[Math.floor(Math.random() * this.cfg.quote.length)];
      if (this.elQuote) this.elQuote.textContent = q;
    }
    this._updateHud();
  }

  _updateNotes(now){
    const laneH = (this.laneEls && this.laneEls[0] && this.laneEls[0].clientHeight) || 330;
    const hitTopPct = 100 - (56 / laneH) * 100;
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      if (n.judged) continue;
      const remain = n.hitAt - now;
      // 音符在 hitAt 时正好落到判定线，而不是滑到 lane 最底部。
      const top = hitTopPct * (1 - remain / 1400);
      n.el.style.top = clamp(top, 0, 108) + '%';
      if (remain < -180) {
        n.judged = true;
        n.el.remove();
        this.notes.splice(i, 1);
        this.misses++;
        this.combo = 0;
        this.compatibility -= this.characterId === 'kate' && this.atmosphere > this.cfg.fastComfort ? 2.2 : 1.3;
        this.atmosphere = clamp(this.atmosphere - (this.characterId === 'kate' && this.atmosphere > 70 ? 3.6 : 2.4), 0, 100);
        this._updateHud();
      }
    }
  }

  _updateHud(){
    this.elCompat.textContent = String(Math.round(this.compatibility));
    this.elAtmo.textContent = String(Math.round(this.atmosphere));
    this.elAtmoBar.style.width = clamp(this.atmosphere, 0, 100) + '%';
    // 氛围越高，边缘愉悦光越明显
    if (this.elEdge) this.elEdge.style.opacity = String(clamp(this.atmosphere / 100 * 0.85, 0, 0.85));
  }

  _finish(reason){
    if (this._finished) return;
    this._finished = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this._reason = reason;
    for (const n of this.notes) { try { n.el.remove(); } catch (_) {} }
    this.notes = [];
    const grade = reason === 'interrupted' ? '中断' : (this.compatibility >= 28 ? 'S' : (this.compatibility >= 16 ? 'A' : (this.compatibility >= 6 ? 'B' : 'C')));
    const result = {
      character: this.characterId,
      compatibilityDelta: Math.round(reason === 'interrupted' ? Math.min(this.compatibility, -4) : this.compatibility),
      compatibilityTotal: Math.round(this.compatibility),
      atmosphere: Math.round(this.atmosphere),
      hits: this.hits,
      misses: this.misses,
      maxCombo: this.maxCombo,
      grade,
      interrupted: reason === 'interrupted',
      line: reason === 'interrupted'
        ? (this.characterId === 'kate' ? '……你又急着往前跑了。先到这里吧。' : '气氛断了。下次再试。')
        : this.cfg.resultLine[Math.floor(Math.random() * this.cfg.resultLine.length)],
    };
    this.elResultTitle.textContent = reason === 'interrupted' ? '这次中断了' : '结算阶段';
    this.elResultSub.textContent = this.cfg.name + ' · 默契与氛围';
    this.elResultGrade.textContent = grade;
    this.elResultRows.innerHTML =
      '<div class="row"><span>命中</span><span>' + this.hits + '</span></div>' +
      '<div class="row"><span>失误</span><span>' + this.misses + '</span></div>' +
      '<div class="row"><span>最高连击</span><span>' + this.maxCombo + '</span></div>' +
      '<div class="row"><span>本次默契</span><span>' + (result.compatibilityDelta >= 0 ? '+' : '') + result.compatibilityDelta + '</span></div>' +
      '<div class="row"><span>氛围值</span><span>' + result.atmosphere + '</span></div>';
    this.elResultLine.textContent = result.line;
    this.elResult.classList.add('on');
    this.open = false;
    this._result = result;
  }

  _closeResult(){
    this.elResult.classList.remove('on');
    this.root.classList.remove('on');
    const result = this._result;
    this._result = null;
    if (this.onFinish) this.onFinish(result || { character: this.characterId, compatibilityDelta: 0, atmosphere: 0, grade: '—', line: '' });
  }

  abort(){
    if (!this.open && !this._result) return;
    this._finished = true;
    this.open = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.elResult.classList.remove('on');
    this.root.classList.remove('on');
  }

  destroy(){
    this.abort();
    if (this._onKey) window.removeEventListener('keydown', this._onKey, true);
    this.root?.remove();
  }
}

export function getRhythmCharacter(id){ return CHARACTER_TEMPO[id] || CHARACTER_TEMPO.default; }
