/* 心猿三势、六器共鸣录、十二大圣印谱与入门试炼注册（纯确定性，无隐藏随机）。 */
(function (root) {
  'use strict';

  const SEAL_KEY = 'dasheng-mastery-seals-v46';
  const STANCE_ORDER = ['balanced', 'cleave', 'whirl'];
  const STANCE_ICONS = {
    balanced: 'assets/ui-v46/stance-dinghai.webp',
    cleave: 'assets/ui-v46/stance-pishan.webp',
    whirl: 'assets/ui-v46/stance-wuhua.webp'
  };

  const RAW_SYNERGIES = {
    'iron+lotus': { name: '刚柔并济', summary: '定海铁补足莲灯减攻短板，兼顾重甲破防与法术减免。', tag: '攻法兼备' },
    'iron+thorn': { name: '破军断锋', summary: '高攻速斩叠加先手减击，迎战重甲先攻守卫事半功倍。', tag: '破甲断先' },
    'iron+tide': { name: '镇海定波', summary: '先借重铁压低受击轮次，再以听潮贝折减总损。', tag: '速战守血' },
    'iron+ember': { name: '焚山重钧', summary: '首棒烈焰配合高额实攻，极易跨过一棒斩杀临界。', tag: '极限破防' },
    'iron+mirror': { name: '双钧破阵', summary: '抵消双影镜减攻并压制反震，分身调度与正面攻坚两宜。', tag: '破阵灵枢' },
    'lotus+thorn': { name: '净莲照骨', summary: '先手免受首击、法术大额减伤，幽魂夜蝠难伤分毫。', tag: '镇魂辟邪' },
    'lotus+tide': { name: '慈航听潮', summary: '法术先减 6 点再享九折护持，水火法阵从容渡厄。', tag: '万法不侵' },
    'ember+lotus': { name: '红莲业火', summary: '首棒爆发缩短法术守卫出手轮数，法术护盾稳住余伤。', tag: '业火渡莲' },
    'lotus+mirror': { name: '镜花水月', summary: '法术与反震双重化解，毫毛分身仅耗 1 点灵息。', tag: '化影无痕' },
    'thorn+tide': { name: '折戟听涛', summary: '削去先手锋芒并折减全程战损，稳健推进上选。', tag: '稳守反击' },
    'ember+thorn': { name: '疾雷破晓', summary: '免受先手首击且首棒重创，瞬斩高攻脆身守卫。', tag: '先声夺人' },
    'mirror+thorn': { name: '奇门遁影', summary: '先手与反震皆可周旋，低耗分身灵动开合机关。', tag: '奇门控场' },
    'ember+tide': { name: '沧溟覆火', summary: '听潮九折连同炉烬战后余温一并折算，爆发更稳。', tag: '覆海收烬' },
    'mirror+tide': { name: '潮生双影', summary: '反震减免叠加九折护体，多阵眼楼层调度游刃有余。', tag: '叠浪回影' },
    'ember+mirror': { name: '烬影同归', summary: '首棒烈火压低轮次，双影镜化解反震每棒余波。', tag: '烈影诛邪' }
  };

  const SYNERGY_INDEX = Object.fromEntries(Object.entries(RAW_SYNERGIES).map(([k, v]) => [k.split("+").sort().join("+"), v]));
  const SYNERGIES = SYNERGY_INDEX;

  const SEALS = [
    { id: 'flawless', code: '壹', name: '毫发无伤', glyph: '净', desc: '在一场守卫交锋中以 0 点生命损失取胜。' },
    { id: 'cleave_breaker', code: '贰', name: '劈山碎甲', glyph: '破', desc: '以「劈山破甲」击败守卫，并较定海正棒节省至少 10 点生命。' },
    { id: 'whirl_ward', code: '叁', name: '舞花化劲', glyph: '化', desc: '以「舞花卸力」击败先手、法术或反震守卫并降低战损。' },
    { id: 'truth_eye', code: '肆', name: '火眼识妄', glyph: '明', desc: '以火眼金睛照破塔中任意一处伪佛幻壁。' },
    { id: 'cloud_bridge', code: '伍', name: '一棒渡云', glyph: '渡', desc: '觉醒石生心印，首次以金箍棒化桥连通断口。' },
    { id: 'cicada_shed', code: '陆', name: '金蝉脱锁', glyph: '蜕', desc: '觉醒照骨心印，化作青蝉穿过铁栅或从内侧卸锁。' },
    { id: 'twin_shadow', code: '柒', name: '身外有身', glyph: '影', desc: '觉醒渡厄心印，遣出毫毛分身驻守青色阵眼。' },
    { id: 'fellow_rescue', code: '捌', name: '同道归心', glyph: '义', desc: '在塔中救出受困同道，重续西行援手。' },
    { id: 'arsenal_pair', code: '玖', name: '六器共鸣', glyph: '器', desc: '在莲灯同时佩戴两件法器，唤醒双器共鸣之效。' },
    { id: 'trial_clear', code: '拾', name: '章回问策', glyph: '策', desc: '完成任意一卷独立「章回试炼」并留存战果。' },
    { id: 'tri_aspect', code: '拾壹', name: '三相伏心', glyph: '伏', desc: '在第十八层正面击败黑莲三相心猿。' },
    { id: 'boneless_true', code: '拾贰', name: '无骨归真', glyph: '真', desc: '集齐十六外舍利与五重心印，照见第十七颗无骨舍利。' }
  ];

  function readSeals() {
    try {
      const raw = JSON.parse(localStorage.getItem(SEAL_KEY) || '{}');
      return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    } catch {
      return {};
    }
  }

  function writeSeals(map) {
    try {
      localStorage.setItem(SEAL_KEY, JSON.stringify(map));
    } catch {}
  }

  let unlockedCache = null;
  function unlockedMap() {
    if (!unlockedCache) unlockedCache = readSeals();
    return unlockedCache;
  }

  function unlockSeal(id, onUnlock) {
    const spec = SEALS.find(s => s.id === id);
    if (!spec) return false;
    const map = unlockedMap();
    if (map[id]) return false;
    map[id] = Date.now();
    writeSeals(map);
    onUnlock?.(spec);
    return true;
  }

  function sealStats() {
    const map = unlockedMap();
    const list = SEALS.map(s => ({ ...s, unlocked: !!map[s.id], unlockedAt: map[s.id] || 0 }));
    return { list, unlockedCount: list.filter(s => s.unlocked).length, total: SEALS.length };
  }

  function activeSynergy(equipped) {
    if (!Array.isArray(equipped) || equipped.length !== 2) return null;
    const key = [...equipped].sort().join('+');
    const info = SYNERGY_INDEX[key];
    return info ? { key, ids: [...equipped], ...info } : null;
  }

  function compareStances(engine, enemyOrId, options = {}) {
    const enemy = typeof enemyOrId === 'string' ? engine.data.enemies[enemyOrId] : enemyOrId;
    if (!enemy) return null;
    const currentId = engine.getStance?.() || 'balanced';
    const entries = STANCE_ORDER.map(id => {
      const preview = engine.preview(enemy, { ...options, stance: id });
      return {
        id,
        info: root.TowerRules.stances[id],
        icon: STANCE_ICONS[id],
        preview,
        possible: preview.possible,
        survive: preview.survive,
        damage: preview.damage
      };
    });
    const cur = entries.find(e => e.id === currentId) || entries[0];
    const bal = entries.find(e => e.id === 'balanced') || entries[0];
    const viable = entries.filter(e => e.possible);
    let best = cur;
    if (viable.length) {
      best = viable.slice().sort((a, b) => {
        if (a.damage !== b.damage) return a.damage - b.damage;
        if (a.id === currentId) return -1;
        if (b.id === currentId) return 1;
        if (a.id === 'balanced') return -1;
        if (b.id === 'balanced') return 1;
        return 0;
      })[0];
    }
    const savedVsCurrent = best.possible && (!cur.possible || best.damage < cur.damage)
      ? (cur.possible ? cur.damage - best.damage : Infinity)
      : 0;
    const savedVsBalanced = best.possible && (!bal.possible || best.damage < bal.damage)
      ? (bal.possible ? bal.damage - best.damage : Infinity)
      : 0;
    return { current: cur, balanced: bal, best, entries, savedVsCurrent, savedVsBalanced };
  }

  function rankLoadouts(engine, steps = []) {
    const P = root.TowerPlanning;
    if (!P) return [];
    const combos = P.combinations(engine);
    return combos.map(ids => {
      const r = P.simulate(engine, steps, ids);
      const syn = activeSynergy(ids);
      return { ids, result: r, synergy: syn };
    }).sort((a, b) => {
      if (a.result.possible !== b.result.possible) return a.result.possible ? -1 : 1;
      if (a.result.damage !== b.result.damage) return a.result.damage - b.result.damage;
      return (b.result.after?.coins || 0) - (a.result.after?.coins || 0);
    });
  }

  function bindEngine(engine, onUnlock) {
    const checkState = () => {
      const s = engine.state;
      if (!s) return;
      if (Object.keys(s.revealed || {}).some(k => s.revealed[k])) unlockSeal('truth_eye', onUnlock);
      if ((s.rescued || []).length > 0) unlockSeal('fellow_rescue', onUnlock);
      if ((s.equipped || []).length === 2) unlockSeal('arsenal_pair', onUnlock);
      if (s.selfAwakened) unlockSeal('boneless_true', onUnlock);
    };
    engine.on((type, detail) => {
      if (type === 'effect' && detail) {
        const meta = detail.meta || {};
        if (detail.type === 'attack' && meta.victory) {
          if (meta.damage === 0) unlockSeal('flawless', onUnlock);
          if (meta.stance === 'cleave' && (meta.stanceSaved || 0) >= 10) unlockSeal('cleave_breaker', onUnlock);
          if (meta.stance === 'whirl' && (meta.stanceSaved || 0) > 0 && ['first', 'magic', 'counter'].includes(meta.enemyTrait)) unlockSeal('whirl_ward', onUnlock);
          if (meta.enemyTrait === 'boss') unlockSeal('tri_aspect', onUnlock);
        } else if (detail.type === 'magic') {
          if (meta.ability === 'eye') unlockSeal('truth_eye', onUnlock);
          else if (meta.ability === 'staff') unlockSeal('cloud_bridge', onUnlock);
          else if (meta.ability === 'morph') unlockSeal('cicada_shed', onUnlock);
          else if (meta.ability === 'clone') unlockSeal('twin_shadow', onUnlock);
          else if (meta.ability === 'rescue') unlockSeal('fellow_rescue', onUnlock);
        }
      } else if (type === 'trialComplete') {
        unlockSeal('trial_clear', onUnlock);
      }
      if (['change', 'reset', 'awakening', 'ending'].includes(type)) checkState();
    });
    checkState();
  }

  function buildStarterSeeds() {
    if (!root.TowerEngine || !root.TowerEncounters) return [];
    const data = root.TowerEncounters.latest;
    const rulesHash = root.TOWER_TRIALS?.rulesHash || '2f3469e17cd6611a50649be836cb105d6ed02806d1f7a7fc3b9ffcece67f5537';
    const g0 = new root.TowerEngine(data, { persist: false });
    g0.newGame();
    g0.state.startedAt = 1792810000001;
    const seedGate = g0.snapshot();

    const g1 = new root.TowerEngine(data, { persist: false });
    g1.newGame();
    g1.state.startedAt = 1792810000002;
    Object.assign(g1.state, {
      floor: 1,
      x: 10,
      y: 19,
      facing: 'up',
      hp: 590,
      atk: 27,
      def: 10,
      mana: 6,
      coins: 4,
      keys: { yellow: 2, blue: 1, red: 0 },
      fragments: [0],
      externalRelics: 1,
      visited: [0, 1],
      revealed: { 'f0-16': true },
      removed: {
        'f0-13': true,
        'f0-8': true,
        'f0-9': true,
        'f0-5': true,
        'f0-fragment-0': true
      },
      seenIntros: { '0': true, '1': true },
      turn: 42
    });
    const seedBell = g1.snapshot();

    return [
      {
        id: 'gate-r7',
        starter: true,
        title: '山门初试',
        revision: 7,
        floor: 0,
        exitTo: 1,
        layout: '入门实战',
        startHash: 'v46-gate-r7-seed-01',
        rulesHash,
        seed: seedGate,
        objectives: [
          {
            id: 'keep-keys',
            label: '双钥封存',
            description: '照破山门幻壁、寻回第 1 枚外舍利，集齐并保住全部 2 把铜钥抵达上行处。'
          },
          {
            id: 'feast-peach',
            label: '破龛取桃',
            description: '开启宝龛取得仙酿蟠桃，寻回外舍利并以至少 660 点生命抵达上行处。'
          }
        ],
        conditions: [
          '开局即开放，不影响任何主线存档',
          '按 Q 或在敌情卡切换「定海 / 劈山 / 舞花」三式棍势可显著省血',
          '达成目标后走到右上角上行塔阶按 F 归卷'
        ]
      },
      {
        id: 'bell-r7',
        starter: true,
        title: '残钟问铁',
        revision: 7,
        floor: 1,
        exitTo: 2,
        layout: '入门实战',
        startHash: 'v46-bell-r7-seed-02',
        rulesHash,
        seed: seedBell,
        objectives: [
          {
            id: 'front-iron',
            label: '劈山夺铁',
            description: '偏转台选「留玉护身」，活用劈山破甲正面击败镇海猿卫夺得定海铁并上行。'
          },
          {
            id: 'vow-bypass',
            label: '舍玉开径',
            description: '偏转台选「舍玉开门」，不战镇海猿卫从北门绕取定海铁并完成上行。'
          }
        ],
        conditions: [
          '正面迎战镇海猿卫时，比较「劈山破甲」与「舞花卸力」的回合临界',
          '须同时寻回第 2 枚外舍利并扳动西侧启钟扳杆',
          '达标后在右上角上行塔阶按 F 结算并对比剩余资源'
        ]
      }
    ];
  }

  function installStarterTrials() {
    if (!root.TOWER_TRIALS || !Array.isArray(root.TOWER_TRIALS.trials)) return;
    const starters = buildStarterSeeds();
    for (const item of starters.reverse()) {
      if (!root.TOWER_TRIALS.trials.some(t => t.id === item.id)) {
        root.TOWER_TRIALS.trials.unshift(item);
      }
    }
  }

  installStarterTrials();

  const api = {
    STANCE_ORDER,
    STANCE_ICONS,
    SYNERGIES,
    SEALS,
    activeSynergy,
    compareStances,
    rankLoadouts,
    sealStats,
    unlockSeal,
    bindEngine,
    installStarterTrials
  };

  root.TowerMastery = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
