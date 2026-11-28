/* ============================================================
   LaiAsaka · 主模式剧情 · 序章
   ------------------------------------------------------------
   剧情文件只描述“谁说了什么、给玩家什么选择”，不含任何运行逻辑。
   每个节点支持：
     text      正文（点击推进）
     speaker   说话人；省略时按旁白处理
     next      下一节点 id
     choices   [{ text, next, flags, affection }]
     end       true 表示章节结束
     autoSave  章节开始前由 GameApp 写入关键节点（本文件不直接调用）
   扩展方式：新建 asaka.chapter1.js，保持同样的对象结构，再在 story.js 注册。
   ============================================================ */

export const STORY_CHAPTERS = {
  'asaka.prologue': {
    id: 'asaka.prologue',
    title: '序章 · 沙尘中的旗',
    start: 'n01',
    // 章节开始时由主模式写入的唯一自动存档节点
    autoSaveNode: 'prologue_start',
    nodes: {
      n01: {
        text: '阿萨卡大陆的黄昏总是很长。太阳沉进沙丘以后，天边还会亮很久，像一块没烧完的炭。',
        next: 'n02',
      },
      n02: {
        text: '你把车停在一段废弃公路的尽头。前方是尼珀斯尔设下的检查线，再往前，就是你还买不起的地盘。',
        next: 'n03',
      },
      n03: {
        speaker: '玲娜',
        text: '队长，后面有辆车，跟了我们十七分钟。',
        next: 'n04',
      },
      n04: {
        text: '车灯在沙尘里切开两道昏黄的光。一辆旧越野车停在三十米外，车门打开，先下来的是尾巴。',
        next: 'n05',
      },
      n05: {
        speaker: '凯特',
        text: '别掏枪！我们是来找你的。你是那个说要把尼珀斯尔从地图上抹掉的队长，对吧？',
        next: 'n06',
      },
      n06: {
        speaker: '玲娜',
        text: '她把话说得太满了。我们只是……想先听听你打算怎么做。',
        next: 'c01',
      },
      c01: {
        prompt: '沙尘里站着两个 Prazer。你决定——',
        choices: [
          {
            text: '让她们进来，把水壶递过去。',
            next: 'n07_open',
            flags: { prologue_trust: 'open' },
            affection: { kate: 1, lingna: 1 },
          },
          {
            text: '先问清楚：她们凭什么相信一个陌生人。',
            next: 'n07_careful',
            flags: { prologue_trust: 'careful' },
          },
        ],
      },
      n07_open: {
        speaker: '凯特',
        text: '……你连我们叫什么都没问，就先给水。队长，你这样在阿萨卡活不长的。',
        next: 'n08_open',
      },
      n08_open: {
        speaker: '玲娜',
        text: '但至少比那些先摸枪的人强。凯特，把地图拿出来。',
        next: 'n09',
      },
      n07_careful: {
        speaker: '凯特',
        text: '信任？我们不信任你。我们只是没有别的路可以走了。',
        next: 'n08_careful',
      },
      n08_careful: {
        speaker: '玲娜',
        text: '她没说谎，但也没说全。我们看过你写的那些东西——关于 Prazer 和人类不该再互相防着活。',
        next: 'n09',
      },
      n09: {
        text: '她们把一张折过很多次的地图铺在引擎盖上。上面用铅笔圈着三处尼珀斯尔的补给点，旁边是两行小字：Kate，Lingna。',
        next: 'n10',
      },
      n10: {
        speaker: '凯特',
        text: '我们两个能打。我负责远距离，玲娜负责把他们的头按下去。问题是，你有地方让我们睡吗？',
        next: 'c02',
      },
      c02: {
        prompt: '你要给她们的第一个答案——',
        choices: [
          {
            text: '先拿下第一块地盘。有地盘才有据点。',
            next: 'n11_push',
            flags: { prologue_plan: 'push' },
            affection: { kate: 1 },
          },
          {
            text: '先让小队活着。地盘可以慢慢来。',
            next: 'n11_hold',
            flags: { prologue_plan: 'hold' },
            affection: { lingna: 1 },
          },
        ],
      },
      n11_push: {
        speaker: '凯特',
        text: '我喜欢这个答案。真的。不过下次说这种话之前，先确认我们有两个弹匣。',
        next: 'n12',
      },
      n11_hold: {
        speaker: '玲娜',
        text: '……谢谢。很多人招我们的时候，第一句话就是让我们去死。',
        next: 'n12',
      },
      n12: {
        text: '沙尘慢慢落下来。远处检查线的探照灯扫过公路，又一次扫回来，没有照到这三个人。',
        next: 'n13',
      },
      n13: {
        speaker: '凯特',
        text: '那就说定了。队长，明天开始，你负责想清楚要打哪里。我们负责让你活到能打那里。',
        next: 'n14',
      },
      n14: {
        speaker: '玲娜',
        text: '还有一件事。计划树……你听说过吗？传说每个人的选择都会在某个地方长成一根枝。',
        next: 'n15',
      },
      n15: {
        speaker: '凯特',
        text: '别听她吓人。枝不枝的我不知道，我只知道——现在我们有三个人的名字可以写在同一张纸上了。',
        next: 'end',
      },
      end: {
        text: '序章结束。计划树亮起第一根枝。',
        end: true,
        // 只推进进度，不额外写入自动存档：本节点的自动存档在章节开始前已经写入。
        nextNode: 'prologue_end',
        flags: { prologue_done: true },
        markStorySeen: true,
      },
    },
  },
};

export function getStoryChapter(id){
  return STORY_CHAPTERS[id] || null;
}
