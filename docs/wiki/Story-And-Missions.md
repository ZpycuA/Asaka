# 剧情 / 任务 / 结算阶段

> 版本：2026-11-28 第十三轮
> 适用文件：`src/story.js`、`src/story/asaka.prologue.js`、`src/story/rhythm.js`、`src/missions.js`、`src/asakaSave.js`、`src/game.js`

---

## 0. 分层

| 层 | 文件 | 职责 | 禁止 |
|---|---|---|---|
| 播放器 | `src/story.js` | 逐字显示、限时选择、条件、效果分发、总结算、语音三接口 | 🈲 写剧情文本/存档结构 |
| 章节数据 | `src/story/asaka.prologue.js` | 剧情节点、选择、效果、条件、音游触发 | 🈲 调用运行时函数 |
| 结算阶段 | `src/story/rhythm.js` | 音轨音游、氛围/默契、角色节奏偏好、结算框 | 🈲 直接写 AsakaSave |
| 任务系统 | `src/missions.js` | 当前主线、阶段、任务页、小地图点位 | 🈲 直接改进度数值之外的存档 |
| 长期存档 | `src/asakaSave.js` | 好感/队伍/属性/默契/信用点/任务 | 🈲 由 UI 直接改字段 |

剧情只向 `GameApp` 发“效果”，由 `GameApp.applyStoryEffects / startMission / applyRhythmResult` 落地。

---

## 1. 章节节点字段

```js
{
  speaker, text, next, end,
  effects,              // 进入节点时结算一次
  choices: [{
    text, next, tone,
    requires,           // 条件，不满足时显示锁定与原因
    effects,
  }],
  timeLimit: 9,          // 秒；选择出现后开始计时
  timeoutNext: '...',    // 沉默/没回答分支
  timeoutEffects,        // 超时也要写入的好感/flag/物品
  rhythm: { character, title, duration, requires },
  summaryText,
}
```

章节级字段：`requires`、`summary`、`autoSaveNode`、`voice`。

---

## 2. 效果（effects）

| 字段 | 语义 | 落地位置 |
|---|---|---|
| `flags` | 剧情分支标记 | `AsakaSave.data.flags` |
| `affection` | 好感增量；玩家只看到定性词 | `AsakaSave.data.affection` |
| `party` / `leaveParty` | 入队/离队 | `partyRoster` |
| `credits` | 主模式信用点增减 | `AsakaSave.data.credits` |
| `home` | `{purchased, price, debt, node}` 住所状态 | `AsakaSave.data.home` |
| `planNode` | 点亮计划树节点 | `AsakaSave.setNode` |
| `stats` | 长期属性（Aselevel/技能经验） | `AsakaSave.data.attributes` |
| `compatibility` | 角色默契值 | `AsakaSave.data.compatibility` |
| `abilities` | 技能/技巧解锁 | `AsakaSave.data.abilities` |
| `items` | `[{table,id,qty}]` 实物 | `giveStoryItems` |
| `mission` | `'id'` 或 `{start,advance,complete}` | `MissionSystem` |
| `rhythm` | 音游配置 | `RhythmGame` |
| `command` | `{name,args}` 显式函数调用 | `GameApp.storyCommand` 白名单 |

> 好感永远不在 UI 显示具体数值；结算只显示“稍微在意 / 好感上升 / 有点疏远”等定性词。

---

## 3. 条件（requires）

```js
requires: {
  flags: { recruited_kate: true },
  notFlags: { ... },
  affectionMin: { lingna: 1 },
  affectionMax: { ... },
  party: ['kate', 'lingna'],
  items: ['asaka_deed'],
}
```

不满足时选择按钮显示锁定与原因；章节级 `requires` 不满足会弹出“继续口”，不会硬跳剧情。

---

## 4. 负面状态闸门

进入剧情前 `GameApp.canStartStory(chapter)` 检查：

- 是否倒地/重伤；
- `status.effects` 中 `content.effects.*.positive === false` 的持续状态（流血、骨折、疼痛、失明、玻纤等）。

被挡下时世界暂停，弹窗提示具体状态，并提供：

- **状态已处理，继续** → 重新检查并接上同一章节；
- **暂时离开** → 恢复世界，剧情入口不消耗。

---

## 5. 语音三接口

`story.js → _speak()` 固定优先级：

1. `node.voice.audio` / `node.audio`：本地音频文件；
2. `app.storyTtsEndpoint`：远端 TTS（POST `{text,speaker,voice,lang}`，返回 `{url}`）；
3. 浏览器 `SpeechSynthesis`（当前默认）。

同一个节点只自动播一次；**不提供“重新听”**。旁白默认不朗读，角色台词默认朗读。

---

## 6. 结算阶段（音游）

- 入口：节点 `rhythm: { character: 'lingna'|'kate'|..., duration }`。
- `RhythmGame`：四轨 D/F/J/K（移动端可点按键），音符速度与复杂度随**氛围值**实时上升。
- **默契值**是长期属性，写入 `AsakaSave.data.compatibility[角色]`。
- 角色舒适区不同：
  - 玲娜：偏好快节奏；氛围过低会掉默契，慢太久可中断；
  - 凯特：先慢后快；氛围过快去点她收益下降、失误惩罚更重。
- 默契/氛围过低会提前中断；结算框显示命中/失误/连击/本次默契/氛围/评价词与一句话。
- Q 版图依赖：`assets/chibi/<角色>.png`，缺失时用首字占位，不影响逻辑。

---

## 7. 任务

- 定义表：`content.missions`（`title/chapter/desc/stages/waypoint/category`）。
- 状态：`AsakaSave.data.missions = { current, active:{id:{stage}}, done:{id} }`。
- 左上角只显示当前主线：所在章 + 标题 + 当前阶段；点击进入任务页。
- 任务页：全部可显示任务、阶段勾选、描述、小地图标记；**没有二游式奖励**。
- 主模式的 `TaskSystem` 不再显示 Straight 的击杀/搜刮任务。

---

## 8. 存盘

- 两类：`latest`（退出前最新状态）与 `keyframes`（关键节点）。
- 存储介质：浏览器 `localStorage`（`LaiAsaka_AsakaSave_v2`），不是服务器。
- 剧情演出中途不写盘；章节开始/结束由 `GameApp.onStoryStart/onStoryEnd` 写关键节点。
- 退出/切后台 `beforeunload/visibilitychange` → `saveLatest`。

---

## 9. 当前边界（后续内容层）

已实现：

- 剧情机制、序章、任务、结算音游、语音三接口；
- **DOM 据点**：大厅/仓库入口/终端/任务/休息/队伍面板/神庙/出战准备；
- 角色面板（Aselevel、部位伤、技能、Prazing、默契定性）；
- 抚摸（好感为负时禁止；不改变好感）；
- 队友装备交给/拿回与仓库武器建议；
- 神庙供奉 + 普勒语祷词 + 概率获得 Prazing 技巧；
- 出战准备的可拖动队伍站位与 320×320 城北街区地图 `maps/asaka_city.json`；
- 城北战区平民：无武器、非敌对、靠近或听到枪声会逃跑；
- 战后回据点短对白、技能经验小幅成长。

仍是后续：

- 真正的 3D 城市步行、土地管理部/住所内部场景与可交互家具；
- 大地图美术与真实占点/区域规划（当前为程序化街区 + DOM 抽象出战地图）；
- Prazing 技巧的战斗内实际效果；队友 AI 对仓库装备的自主评分；
- 角色 Q 版差分立绘与语音文件（当前为占位/浏览器 TTS）。

---

## 10. 给内容创作者 / 其他模型的编写契约

> 写剧情、任务时只改**数据文件**，不要改播放器逻辑。  
> 数据文件：`src/story/asaka.prologue.js`（章节）、`src/content.js` 的 `MISSIONS` / `PRAZING`、`src/story/asaka-plan.js`（计划树节点）。

### 10.1 一章剧情的最小骨架

```js
'asaka.chapter_xxx': {
  id: 'asaka.chapter_xxx',
  title: '第 X 章 · 标题',
  start: 'n01',
  autoSaveNode: 'base_purchased',       // 必须是 AsakaSave.KEY_NODES 里的节点
  requires: { party: ['kate', 'lingna'] }, // 可选，进入条件
  summary: { title: '结算标题', text: '结算回览文字' },
  nodes: {
    n01: {
      speaker: '凯特',
      text: '台词。',
      next: 'q01',
      effects: {
        flags: { chapter_x_started: true },
        mission: { start: 'chapter_x_main' },
      },
    },
    q01: {
      prompt: '限时问题。',
      timeLimit: 8,
      timeoutNext: 'q01_silent',
      timeoutEffects: { affection: { kate: -1 } },
      choices: [
        {
          text: '回答。',
          next: 'n02',
          tone: '坚定',
          requires: { affectionMin: { kate: 2 } },
          effects: { affection: { kate: 1 }, flags: { answer_a: true } },
        },
      ],
    },
    end: { text: '结束。', end: true, nextNode: 'base_purchased', summaryText: '回览。' },
  },
},
```

硬规则：

1. 所有 `next` / `timeoutNext` / `nextNode` 必须指向存在的节点或计划树节点。
2. `end:true` 的节点必须写 `nextNode`，且 `nextNode` 要在 `AsakaSave.KEY_NODES` 白名单里。
3. 好感变化只写 `affection`，**不要在文本里写具体数值**；UI 只显示定性词。
4. 需要“沉默/没回答”的分支就写 `timeLimit + timeoutNext + timeoutEffects`，不要用假的选项。
5. 不要在一个节点里同时写 `rhythm` 和 `choices`；音游节点应单独放，节点后接 `next`。
6. 语音字段：`voice: { audio:'assets/voice/xxx.ogg', tts:'browser', rate, pitch }`；没有文件就用浏览器朗读，不要写“重新听”按钮。
7. 章节文本只写 **Asaka**，不要写“阿萨卡”。

### 10.2 效果白名单

| 效果 | 写法 | 落地 |
|---|---|---|
| flag | `flags:{k:v}` | 存档 flags |
| 好感 | `affection:{kate:1}` | 存档 affection |
| 入队 | `party:['kate','lingna']` | partyRoster |
| 离队 | `leaveParty:'buwen'` | 移除 |
| 物品 | `items:[{table:'weapons',id:'ar556',qty:1}]` | giveStoryItems |
| 属性 | `stats:{aselevel:1.2, skillExp:10}` | attributes |
| 默契 | `compatibility:{lingna:2}` | compatibility |
| 能力 | `abilities:['prazing:cat_step']` | abilities |
| 信用点 | `credits:-2600` | credits |
| 住所 | `home:{purchased:true, price:2600}` | home + base_purchased |
| 计划树 | `planNode:'base_purchased'` | setNode |
| 任务 | `mission:'opening_meet'` 或 `{start,advance,complete}` | MissionSystem |
| 音游 | 节点字段 `rhythm:{character:'lingna',duration:28}` | RhythmGame |
| 函数 | `command:{name:'giveStoryItems',args:[...]}` | GameApp.storyCommand 白名单 |

`command` 只允许：`setPlanNode/addCredits/startMission/advanceMission/completeMission/giveStoryItems/setStoryFlag/openHome/startMatch`。  
不要在剧情数据里写任意函数名；不在白名单会被拒绝并警告。

### 10.3 条件写法

```js
requires: {
  flags: { recruited_kate: true },
  notFlags: { betrayed: true },
  affectionMin: { kate: 2 },
  affectionMax: { kate: 10 },
  party: ['kate'],
  items: ['asce_core'],
}
```

条件不满足时：
- 选择支显示锁定与原因；
- 章节级条件走 `story-gate` 弹窗，玩家可以在处理后点“继续”，不会消耗剧情。

### 10.4 任务定义

```js
chapter_x_main: {
  title: '任务名',
  chapter: '第 X 章 · 标题',
  category: 'main',
  desc: '任务描述。',
  stages: [{ text: '第一步' }, { text: '第二步' }],
  waypoint: { x: 0, z: 44 },   // 可选
},
```

- 任务阶段由 `startMission / advanceMission / completeMission` 推进；
- 左上角只显示 `missions.current`；任务页显示 all；
- 任务没有二游奖励；需要发物品/信用点就在剧情 `effects` 里写。
- 主模式任务不要用 `TASKS`（那是 Straight 的击杀/搜刮任务）。

### 10.5 角色资源路径

- 标题大厅背景：`assets/lobby-bg.jpg`（优先），缺失时尝试 `.png`，再缺失走 CSS 渐变。
- 据点背景：`assets/home-bg.jpg`。
- Q 版立绘：`assets/chibi/kate.png`、`assets/chibi/lingna.png`、`assets/chibi/buwen.png`；缺失时用首字占位。
- 语音：`assets/voice/<chapter>/<node>.ogg`（可选）；未放文件时自动走浏览器 TTS。
- 所有路径都是相对 `index.html` 的站点根路径。

### 10.6 存档位置

- 浏览器固定槽：`localStorage['LaiAsaka_AsakaSave_v2']`（主模式）与 engine 的 Straight 存档键。
- 不提供运行时“导入/导出”按钮；读写在固定键上完成。
- 自动保存/关键节点由 `AsakaSave` 写；退出/切后台由 `GameApp` 写 `latest`。
