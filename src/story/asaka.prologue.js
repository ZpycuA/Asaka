/* ============================================================
   LaiAsaka · 主模式剧情 · 序章「沙尘里的第一间房」
   ------------------------------------------------------------
   剧情文件只描述“谁说了什么、给玩家什么选择、产生什么长期效果”，
   不包含运行逻辑。支持字段见 story.js：
     text / speaker / next / choices / end
     timeLimit + timeoutNext + timeoutEffects   → 限时问答/沉默分支
     effects: flags / affection / stats / items / abilities / party /
              credits / home / planNode / mission / command / rhythm
     requires: flags / notFlags / affectionMin / affectionMax / party / items
     rhythm: { character, title, duration, requires }
     summary / summaryText → 章节结算框的回览文字
   语音：node.voice = { audio, tts:'browser', rate, pitch }；也可直接 node.audio。
   本文件不写任何存档、不改世界状态，所有效果由 StoryPlayer → GameApp 落地。
   ============================================================ */

export const STORY_CHAPTERS = {
  'asaka.opening': {
    id: 'asaka.opening',
    title: '序章 · 沙尘里的第一间房',
    start: 'p01',
    autoSaveNode: 'prologue_start',
    summary: {
      title: '第一根枝',
      text: '三个人在一张没有盖章的购房契上写下名字。Asaka 的土地管理部已经破败，但这间房是你们的。计划树长出了第一根枝；从今天开始，每次活着回来，都要回到这里。',
    },
    nodes: {
      p01: {
        speaker: '队长',
        text: '有些人把旗子插在城里，告诉别人这里归谁。我不信旗子。\nAsaka 的问题从来不是旗子太少，而是人太多、规矩太少，而每一条规矩最后都只保护写规矩的人。\n我想做的很简单：让愿意守规矩的人有一块能站住的地，让不守规矩的人付出代价。哪怕这片土地只剩下一条街。',
        effects: { mission: 'opening_meet', flags: { opening_started: true } },
        next: 'p02',
      },
      p02: {
        text: '沙尘从旧公路尽头压过来。检查线的探照灯扫过废弃收费站，又慢慢转开。远处有两个影子，一大一小，正在朝你走来。',
        next: 'p03',
      },
      p03: {
        speaker: '玲娜',
        text: '队长？你比照片上矮一点。\n……别误会，这不是贬低。矮一点的人，目标小。',
        next: 'p04',
      },
      p04: {
        speaker: '凯特',
        text: '玲娜，别一见面就说人家矮。\n——不过她说得对，目标小是好事。我们看过你写的那几页东西。不是全部同意，但至少不是那种只会喊口号的疯子。',
        next: 'p05',
      },
      p05: {
        speaker: '队长',
        text: '那你们来找我，是想听我继续喊，还是想看看我能不能做？',
        next: 'q01',
      },
      q01: {
        speaker: '凯特',
        text: '先回答一个问题。你为什么想改变 Asaka？说快点——我不喜欢想太久的人。',
        timeLimit: 9,
        timeoutNext: 'q01_silent',
        timeoutEffects: { flags: { opening_hesitated: true }, affection: { kate: -1, lingna: 0 } },
        choices: [
          {
            text: '因为现在的规矩只保护写规矩的人。',
            next: 'q01_a',
            effects: { flags: { opening_answer: 'rule' }, affection: { kate: 2, lingna: 1 } },
            tone: '坚定',
          },
          {
            text: '因为我想让跟着我的人活着回来。',
            next: 'q01_b',
            effects: { flags: { opening_answer: 'survive' }, affection: { kate: 1, lingna: 2 } },
            tone: '护短',
          },
          {
            text: '因为总得有人先把第一间房买下来。',
            next: 'q01_c',
            effects: { flags: { opening_answer: 'home' }, affection: { kate: 1, lingna: 1 }, credits: 0 },
            tone: '务实',
          },
        ],
      },
      q01_silent: {
        speaker: '凯特',
        text: '……想了九秒，一个字都没说。行，我记住你了。',
        next: 'q02',
      },
      q01_a: {
        speaker: '玲娜',
        text: '这句话写在纸上很好看。写在尸体旁边就不太好看了。\n不过，至少你知道问题在哪。',
        next: 'q02',
      },
      q01_b: {
        speaker: '凯特',
        text: '活着回来。说得轻巧。\n但如果你真能做到，我不介意替你挡第一轮子弹。',
        next: 'q02',
      },
      q01_c: {
        speaker: '凯特',
        text: '买房子？我还以为你要先买枪。\n……不过也对，子弹总得有个地方放。',
        next: 'q02',
      },
      q02: {
        speaker: '玲娜',
        text: '我们两个能打。凯特负责远距离，我负责把靠近你的人按进土里。\n问题是，你有地方让我们睡吗？还是说，我们得跟你一起睡桥洞？',
        next: 'q03',
      },
      q03: {
        speaker: '队长',
        text: '没有桥洞。我们去 Asaka 土地管理部。那里还认旧契，也还收旧钱。',
        effects: { party: ['kate', 'lingna'], flags: { recruited_kate: true, recruited_lingna: true }, planNode: 'prologue_end', affection: { kate: 1, lingna: 1 }, mission: { complete: 'opening_meet', start: 'opening_home' } },
        next: 'p06',
      },
      p06: {
        text: '你们穿过半座空城。街角有卖热食的小贩，有孩子在拆一辆废弃的运输车，也有穿着旧制服的人坐在门口，谁也不看谁。\nAsaka 土地管理部在一栋掉漆的三层楼里。柜台后面的人抬头看了你们一眼，又低下去。',
        next: 'p07',
      },
      p07: {
        speaker: '土地管理部办事员',
        text: '买房？行。城北还有几处没人要的。一栋两层，带院子，旧仓库改的。\n价钱不便宜，而且不赊账。你们确定？',
        next: 'q04',
      },
      q04: {
        prompt: '房契上要写名字。你准备怎么付？',
        choices: [
          {
            text: '按市价付清，契上写三个人的名字。',
            next: 'p08_paid',
            requires: { party: ['kate', 'lingna'] },
            effects: { credits: -2600, home: { purchased: true, price: 2600, node: 'base_purchased' }, flags: { base_purchased: true }, affection: { kate: 1, lingna: 1 }, mission: { complete: 'opening_home', start: 'first_deployment' } },
            tone: '公平',
          },
          {
            text: '先付一半，剩下的用接下来的活抵。',
            next: 'p08_debt',
            effects: { credits: -1300, home: { purchased: true, price: 2600, debt: 1300, node: 'base_purchased' }, flags: { base_purchased: true, home_debt: 1300 }, affection: { kate: 1 }, mission: { complete: 'opening_home', start: 'first_deployment' } },
            tone: '务实',
          },
        ],
      },
      p08_paid: {
        speaker: '玲娜',
        text: '三个人的名字……你就不怕我们哪天把房子卷走？',
        next: 'p09',
      },
      p08_debt: {
        speaker: '凯特',
        text: '欠着钱买房子。胆子不小。\n行，那接下来的活就不能挑轻松的了。',
        next: 'p09',
      },
      p09: {
        speaker: '队长',
        text: '钥匙给我。今天开始，这里叫据点。\n大厅放仓库，电脑放流动信用点。门是出战口——谁想进来，得先问过我们。',
        effects: { flags: { base_ready: true }, planNode: 'base_purchased' },
        next: 'p10',
      },
      p10: {
        text: '房子比想象中空。大厅里有一只旧木箱，桌上有台落满灰的终端，窗外是城北的围墙。\n凯特把枪靠在门边，玲娜已经蹲在仓库的箱子上，像一只占好位置的猫。',
        next: 'q05',
      },
      q05: {
        prompt: '第一晚怎么过？',
        choices: [
          {
            text: '把收音机打开，和玲娜听一会儿。',
            next: 'p11_radio',
            requires: { party: ['lingna'], affectionMin: { lingna: 1 } },
            tone: '靠近',
          },
          {
            text: '陪凯特检查门窗。',
            next: 'p11_kate',
            effects: { affection: { kate: 1 } },
            tone: '稳妥',
          },
          {
            text: '先一个人把终端点亮。',
            next: 'p11_alone',
            effects: { flags: { opening_alone: true } },
            tone: '独处',
          },
        ],
      },
      p11_radio: {
        speaker: '玲娜',
        text: '这台的旋钮都松了。来，你按这个节奏，别掉队。',
        rhythm: { character: 'lingna', title: '结算阶段 · 电台里的第一拍', duration: 28, requires: { affectionMin: { lingna: 1 } } },
        next: 'p12',
      },
      p11_kate: {
        speaker: '凯特',
        text: '门框变形了，得换。窗子从里面钉死，留一条缝。\n这些事看起来小，但真到半夜有人砸门的时候，就是这些小事让你能活下来。',
        next: 'p12',
      },
      p11_alone: {
        text: '终端亮起来，屏幕上只有一行跳动的数字：当前流动信用点。\n你把它记在纸上，又把纸折好放进内袋。明天开始，每一次出击都要让这个数字变大。',
        next: 'p12',
      },
      p12: {
        text: '凌晨，城市安静下来。你站在据点的门口，背后是刚刚开始有人的房间，前面是还亮着灯的街。\n计划树在某个地方长出第一根枝。',
        next: 'end',
      },
      end: {
        speaker: '队长',
        text: '明天开始，我们为这间房而战。',
        end: true,
        nextNode: 'base_purchased',
        effects: { flags: { opening_done: true }, planNode: 'base_purchased' },
        summaryText: '你们在 Asaka 的城北买下了一间旧仓库改成的房子。门关上以后，凯特和玲娜没有走。\n第一根枝已经长出来；下一次出门，要记得回到这里。',
      },
    },
  },
};

// 兼容旧存档/旧触发点：旧 id 永远指向同一章，不再维护两份剧情文本。
STORY_CHAPTERS['asaka.prologue'] = STORY_CHAPTERS['asaka.opening'];

export function getStoryChapter(id){
  return STORY_CHAPTERS[id] || null;
}
