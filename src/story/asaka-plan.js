/* ============================================================
   LaiAsaka Engine · Asaka 计划树数据
   ------------------------------------------------------------
   计划树同时承担三件事：
     1. 剧情轨迹追踪（走过的分支会点亮）；
     2. 存档管理（只有一个自动存档，能回到关键节点）；
     3. 向玩家展示尚未抵达的命运分支（暗金色，可见但不可读）。
   坐标使用 1000×640 的逻辑画布，由 plantree.js 缩放适配。
   ============================================================ */

export const ASAKA_PLAN = {
  title: '计划树',
  subtitle: 'PLAN TREE',
  // 关键节点：只有这些节点允许写入自动存档（与 asakaSave.js 的 AUTOSAVE_NODES 对应）
  nodes: [
    {
      id: 'root', label: '沙尘里的第一间房', sub: '起点', x: 500, y: 598, parent: null,
      desc: '你带着一套政治主张和一支还不存在的队伍，走进 Asaka 的沙尘。计划树在这里生根。',
    },
    {
      id: 'prologue_start', label: '序章 · 沙尘里的第一间房', sub: '第一步', x: 500, y: 526, parent: 'root',
      desc: '凯特与玲娜循着你的名字找来。她们认同你描绘的秩序，也想知道你究竟准备付出什么。',
      chapter: 'asaka.opening', autosave: true,
    },
    {
      id: 'prologue_end', label: '第一根枝', sub: '序章完成', x: 500, y: 492, parent: 'prologue_start',
      desc: '沙尘落定，三个人的名字第一次写在同一张纸上。计划树长出了第一根枝。',
      autosave: true,
    },
    {
      id: 'base_purchased', label: '据点', sub: '立足', x: 500, y: 456, parent: 'prologue_end',
      desc: '一支小队需要一个能回去的地方。Asaka 土地管理部还认旧契——买下城北的旧仓库，把名字挂上门口。',
      autosave: true,
    },
    {
      id: 'squad_formed', label: '三人小队', sub: '同行', x: 500, y: 386, parent: 'base_purchased',
      desc: '凯特、玲娜与你第一次以小队的名义出勤。她们会记住你在第一场战斗里做的每一个决定。',
      autosave: true,
    },
    {
      id: 'first_deployment', label: '第一次出击', sub: '试刃', x: 500, y: 316, parent: 'squad_formed',
      desc: '尼珀斯尔的巡逻线在城外延伸。你可以打掉一个哨点，也可以绕开它——两条路都会留下痕迹。',
      autosave: true,
    },
    {
      id: 'bank_job', label: '大陆银行', sub: '钱与账本', x: 344, y: 316, parent: 'first_deployment',
      desc: '大陆银行不是敌人，至少现在不是。雪乃会记住每一位来存东西的客人，也会记住谁欠了她的账。',
    },
    {
      id: 'yukino', label: '二里缘 雪乃', sub: '中立', x: 344, y: 242, parent: 'bank_job',
      desc: '大陆银行总经理。她只对两样东西有耐心：钱，以及能生钱的计划。',
    },
    {
      id: 'buwen', label: '布雯·叶', sub: '可选', x: 656, y: 316, parent: 'first_deployment',
      desc: '一套贵金属重甲，一腔没处使的莽劲。她可能是队友，也可能只是你路上的一块铁。',
    },
    {
      id: 'krona', label: '黑奈 契', sub: '复仇者', x: 656, y: 242, parent: 'buwen',
      desc: '沙城那一夜之后，黑奈家只剩她一个。她不关心你的政治，只关心谁能让她重新走回沙城。',
    },
    {
      id: 'before_sandcity', label: '沙城之前', sub: '关键节点', x: 500, y: 232, parent: 'first_deployment',
      desc: '所有路线在这里收束。进入沙城前，小队会最后一次清点弹药与名字。这是最后一个能回头的自动存档。',
      autosave: true,
    },
    {
      id: 'end_te', label: 'TE · 沙城覆灭', sub: '结局一', x: 664, y: 132, parent: 'before_sandcity', ending: true,
      desc: '你选择强攻沙城。那是一座空城，也是一张已经合拢的网。小队在夜里被围，火光把城墙照得像一块烧红的铁。',
    },
    {
      id: 'end_se', label: 'SE · 死守', sub: '结局二', x: 500, y: 118, parent: 'before_sandcity', ending: true,
      desc: '你选择留下驻守。如果真能凭一队人打穿整支围剿军，计划树会为你亮起一条几乎不可能的支线。',
    },
    {
      id: 'end_he', label: 'HE · 金盆洗手', sub: '结局三', x: 336, y: 132, parent: 'before_sandcity', ending: true,
      desc: '你选择不进攻沙城。带走能带走的人，把枪埋进沙里。结局的车会开出大陆，活着的人坐在同一排座位上。',
    },
    {
      id: 'end_lonely', label: '独行', sub: '隐藏', x: 782, y: 380, parent: 'first_deployment', ending: true,
      desc: '如果你独自走到最后，计划树不会为你收束。它只会留下一根没有分叉的枯枝。',
    },
  ],
};

export function getPlanNode(id){
  return ASAKA_PLAN.nodes.find(n => n.id === id) || null;
}
