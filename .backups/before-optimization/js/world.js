/* 大圣：舍利魔塔 — authored, fixed tower data. No generated rooms or encounters. */
(function () {
  'use strict';
  const items = {
    amber: { name: '赤铜灵晶', kind: 'atk', value: 3, description: '永久攻击 +3。每次出手都生效。' },
    ruby: { name: '朱砂灵晶', kind: 'atk', value: 5, description: '永久攻击 +5。可改变整层战损。' },
    jade: { name: '青玉灵晶', kind: 'def', value: 2, description: '永久防御 +2。无法抵挡法术与真实伤害。' },
    emerald: { name: '碧髓灵晶', kind: 'def', value: 4, description: '永久防御 +4。' },
    peach: { name: '小蟠桃', kind: 'hp', value: 60, description: '立即恢复 60 生命。生命没有上限。' },
    bigPeach: { name: '仙酿蟠桃', kind: 'hp', value: 120, description: '立即恢复 120 生命。' },
    feast: { name: '九转仙桃', kind: 'hp', value: 180, description: '立即恢复 180 生命。' },
    yellowKey: { name: '黄铜钥匙', kind: 'key', color: 'yellow', value: 1, description: '开启一扇黄门；门永久消失。' },
    blueKey: { name: '青玉钥匙', kind: 'key', color: 'blue', value: 1, description: '开启一扇青门；门永久消失。' },
    redKey: { name: '归根心钥', kind: 'key', color: 'red', value: 1, description: '五舍利唤醒的唯一心钥，用于十八层中央朱门。' },
    coins: { name: '功德钱', kind: 'coin', value: 12, description: '获得 12 功德，可在息灵坛换取成长或治疗。' },
    elixir: { name: '随身蟠桃', kind: 'elixir', value: 1, description: '收入行囊；随时使用，恢复 200 生命。' },
    orb: { name: '凝息珠', kind: 'orb', value: 1, description: '收入行囊；随时使用，补满 6 点灵息。' }
  };
  const enemies = {
    imp: { name: '巡山小妖', hp: 36, atk: 20, def: 4, gold: 5, trait: 'normal', special: 0, desc: '普通守卫。你先出手，击杀一击不受反击。', lore: '还记得花果山的路，却忘了自己为何守在这里。' },
    bat: { name: '赤眼夜蝠', hp: 48, atk: 23, def: 6, gold: 7, trait: 'first', special: 0, desc: '先攻：战斗开始额外攻击一次。', lore: '它的眼睛只照得见来者的恐惧。' },
    stone: { name: '石胎守卫', hp: 86, atk: 29, def: 10, gold: 13, trait: 'normal', special: 0, desc: '普通重卫。提高攻击可明显减少反击次数。', lore: '第一枚舍利照亮它胸前的裂缝。' },
    thorn: { name: '荆棘山魈', hp: 72, atk: 29, def: 10, gold: 10, trait: 'counter', special: 2, desc: '棘反：你的每一次攻击额外反伤 2，包含最后一击。', lore: '曾经保护山门的藤蔓，也开始伤害归来的人。' },
    acolyte: { name: '灰烬沙弥', hp: 80, atk: 31, def: 12, gold: 11, trait: 'normal', special: 0, desc: '普通守卫。没有隐藏附加伤害。', lore: '一遍遍诵读没有最后一句的经文。' },
    bell: { name: '铜铃怨灵', hp: 64, atk: 24, def: 10, gold: 12, trait: 'magic', special: 0, desc: '法术：每次反击无视防御；慈悲舍利可减免每击 8 点。', lore: '铃声里藏着未说出口的求救。' },
    viper: { name: '青鳞蛇使', hp: 85, atk: 34, def: 12, gold: 13, trait: 'venom', special: 20, desc: '余毒：战斗结束额外造成 20 真实伤害；没有持续中毒。', lore: '丹毒随碎舍利一同落入塔内。' },
    brass: { name: '铜面罗汉', hp: 100, atk: 35, def: 18, gold: 17, trait: 'armor', special: 0, desc: '重甲：防御较高。攻击不超过防御时无法战胜。', lore: '执着于不破之身，便听不见身后的哭声。' },
    bone: { name: '照骨禅师', hp: 130, atk: 38, def: 16, gold: 24, trait: 'first', special: 0, desc: '先攻：额外先手一击。请先比较成长后的战损。', lore: '“我看透过所有人的骨头，唯独没看见自己的心。”' },
    water: { name: '溺水灯魂', hp: 95, atk: 28, def: 16, gold: 15, trait: 'magic', special: 0, desc: '法术：无视防御。慈悲舍利减免每次反击 8 点。', lore: '它仍举着灯，等一个不会再回来的人。' },
    crab: { name: '玄甲河将', hp: 130, atk: 42, def: 22, gold: 21, trait: 'armor', special: 0, desc: '重甲：较高防御；可以先取灵晶再来。', lore: '水牢的锁在岸上，河将却一直潜在水底。' },
    puppet: { name: '悬丝傀儡', hp: 100, atk: 38, def: 20, gold: 18, trait: 'counter', special: 3, desc: '棘反：每次攻击反伤 3，包含最后一击。', lore: '丝线另一端，竟然也系在它自己的手里。' },
    flood: { name: '覆水龙侍', hp: 174, atk: 44, def: 21, gold: 28, trait: 'normal', special: 0, desc: '普通重卫。守护解锁分身的渡厄舍利。', lore: '“一人独行，如何渡尽这一河众生？”' },
    flame: { name: '丹炉火灵', hp: 130, atk: 34, def: 20, gold: 20, trait: 'magic', special: 0, desc: '法术：无视防御。慈悲觉醒后更适合处理。', lore: '不是炉火炼坏了丹，是炼丹的人忘了为何点火。' },
    alchemist: { name: '丹毒方士', hp: 150, atk: 46, def: 22, gold: 23, trait: 'venom', special: 36, desc: '余毒：结束时额外造成 36 真实伤害。', lore: '他把长生炼成了漫长的囚禁。' },
    furnace: { name: '赤炉金刚', hp: 180, atk: 50, def: 28, gold: 31, trait: 'armor', special: 0, desc: '重甲：防御 28。适合比较先加攻击或防御的收益。', lore: '躯壳滚烫，掌心却护着最后一点温柔。' },
    judge: { name: '两仪判官', hp: 200, atk: 51, def: 24, gold: 35, trait: 'first', special: 0, desc: '先攻：额外先手一击。守护慈悲舍利。', lore: '它一直在判善恶，从未问过谁有权判。' },
    mirror: { name: '镜中行者', hp: 150, atk: 38, def: 24, gold: 24, trait: 'magic', special: 0, desc: '法术：慈悲舍利使每次反击降低 8。', lore: '镜中没有怪物，只有你没有带走的自己。' },
    ink: { name: '墨骨书妖', hp: 170, atk: 53, def: 28, gold: 25, trait: 'counter', special: 4, desc: '棘反：每次攻击反伤 4，包含最后一击。', lore: '它将所有答案写在书中，却不许人提问。' },
    sentinel: { name: '无字碑将', hp: 220, atk: 55, def: 34, gold: 32, trait: 'armor', special: 0, desc: '重甲：可绕行。身后珍藏能改变最终战的灵晶。', lore: '碑文被擦去后，它终于无需再替谎言站岗。' },
    archivist: { name: '藏经无相', hp: 240, atk: 58, def: 29, gold: 42, trait: 'first', special: 0, desc: '先攻：额外先手一击。守护最后的明心舍利。', lore: '“若你找回了所有碎片，可还愿意承认它们属于你？”' },
    shade: { name: '失心战影', hp: 180, atk: 57, def: 28, gold: 28, trait: 'normal', special: 0, desc: '普通守卫。道路两侧的战影可分别处理。', lore: '每一次挥棒，都曾有一个没有挥下去的可能。' },
    wrath: { name: '嗔火金刚', hp: 210, atk: 60, def: 32, gold: 34, trait: 'first', special: 0, desc: '先攻：额外先手一击。请预留最终战所需生命。', lore: '怒意可以开山，不能替你决定往何处走。' },
    heart: { name: '无相 · 心猿', hp: 1200, atk: 90, def: 48, gold: 0, trait: 'boss', special: 80, desc: '先攻；战后心火 80 真实伤害，慈悲减至 72。必须集齐五枚舍利。', lore: '被镇在塔心的不是另一个妖魔，是大圣被切走的嗔怒。' }
  };
  const relics = [
    { name: '石生舍利', title: '其一 · 破执', ability: 'staff', description: '金箍棒：对相邻断桥施术，消耗 1 灵力，永久架桥。', story: '石中传来久违的心跳。金箍棒伸出云海，你想起：力量不是用来把所有门打碎。' },
    { name: '照骨舍利', title: '其二 · 见微', ability: 'morph', description: '七十二变 · 青蝉：对相邻铁栅施术，消耗 1 灵力，穿栅并从内侧永久解锁。', story: '大圣化作一只青蝉。最细的缝隙，原来容得下一段不肯低头的人生。旧山门的铁栅正在等待你。' },
    { name: '渡厄舍利', title: '其三 · 同行', ability: 'clone', description: '毫毛分身：点击四格内的镜台，消耗 2 灵力留下永久分身。可隔墙投影，无需直线视野。', story: '你拔下一根毫毛，另一个你向对岸伸出手。分身可以留守多处镜台，替你完成一个人做不到的选择。' },
    { name: '慈悲舍利', title: '其四 · 息嗔', ability: 'ward', description: '被动慈悲护持：每次法术反击减少 8；最终心火真实伤害减少 8。', story: '点灯僧摘下面具。他没有脸，却有你当年没有伸出的那只手。“我是你舍下的慈悲。如今，还给你。”' },
    { name: '明心舍利', title: '其五 · 归真', ability: 'truth', description: '五舍利共鸣：返回一层出生处，开启归根之匣，取得六层朱门的唯一心钥。', story: '所有碎片拼成的不是佛像，而是一颗心。塔心里，锁着你被分割的嗔怒。回到最初的山门，带走完整的自己。' }
  ];
  const dialogues = {
    lantern: { title: '一盏不灭的灯', speaker: '点灯僧', lines: ['舍利碎了，塔也失了心。五枚碎片散在前五层，各守着一种被遗忘的念头。', '这里不比谁的棒更快。每一战的代价都能看清，敌人不会重生。先拿灵晶，再战守卫，往往能少流很多血。', '息灵坛可免费恢复灵力；功德钱可换成长。生命不会因上下楼恢复。你手中的回元丹留给真正需要的时候。'] },
    rootChest: { title: '归根之匣', speaker: '山门石刻', lines: ['“五光归一，初心为钥。”此匣在五舍利齐聚后开启。', '匣中只有一把归根心钥，用来开启六层中央朱门。现在便记下它的位置：一层，山门最东。'] },
    bridge: { title: '伸长的不是执念', speaker: '残破碑文', lines: ['金箍棒可以填补断桥，每次消耗 1 灵力。桥会永久留下。', '第一枚舍利觉醒后，山门西南的断桥后藏着朱砂灵晶。黄门也能抵达那里：花钥匙走近路，还是先得到架桥能力？'] },
    mirrorLesson: { title: '细微处有天地', speaker: '照骨壁画', lines: ['铁栅不是墙。得到照骨舍利后，用青蝉之变穿过相邻铁栅，可从内侧把锁卸下。', '机关只消耗灵力，不消耗生命。此层中央栅室与一层东侧密室，都值得回头。'] },
    waterLesson: { title: '同渡一河', speaker: '水牢石简', lines: ['西北扳杆与中央镜台，共同控制东南水闸。扳杆可以亲手扳动；镜台需要留下一个分身。', '渡厄舍利在中央西侧，由覆水龙侍守护。得到它后，点击四格内的镜台即可留下分身，墙壁不阻挡毫毛投影。', '每个镜台只需施术一次，分身会永久留守。分身不会跟你上下楼，也不会在存档后消失。'] },
    alchemy: { title: '两仪不判善恶', speaker: '点灯僧', lines: ['西侧的两个丹门共用一套机关：南侧的慈心镜台，中央的止火扳杆。先安排好留守者，再来走这条路。', '桥与铁栅通向不同方向。金箍棒、青蝉之变、分身会共用灵力；本层息灵坛能免费补满。', '守卫没有义务等你走最短的路。先探明另一侧的成长资源，再决定出棒顺序。'] },
    compassion: { title: '他没有脸', speaker: '点灯僧', lines: ['你问我为何认得每一层的路。因为我在这里等了你很久。', '那年你为了永不犹豫，把慈悲留在了塔里。塔把你的嗔怒也切下来，想炼出一颗“无暇”的心。', '没有慈悲的力量只会重复毁灭；没有嗔怒的慈悲也不敢反抗。去把最后一枚舍利找回来。这次，别再舍下自己。'] },
    library: { title: '镜外之人', speaker: '无字经卷', lines: ['西北经室的门需要东南扳杆，以及北侧隔墙镜台同时响应。你无需走到镜台上：四格之内，毫毛会替你找到路。', '此层东方的两条上行通道，一条是铁栅，一条是断桥。不同能力可以解决同一个问题。', '五枚舍利齐聚后，请回到第一层山门东侧的归根之匣。塔心的朱门只认那把心钥。'] },
    truth: { title: '塔不是为了困住你', speaker: '点灯僧', lines: ['经卷里写着：大圣曾求塔主为他除去痛苦。塔主照做了，连同慈悲与愤怒一并剥离。', '可一颗不会痛的心，也记不得为何出发。五舍利并非五份神力，是五段被你否认的记忆。', '塔心的怪物叫心猿。它在替你记住所有不公。胜过它，然后自己决定：带它离开，还是再次把它镇住。'] },
    finalLesson: { title: '最后一道题', speaker: '塔心铭文', lines: ['西侧：金箍棒架桥，扳下止战扳杆。东侧：青蝉穿栅，将分身留在归心镜台。二者齐备，中央心门才会开启。', '中央朱门需要归根心钥。若未取得，请返回一层东南的归根之匣；五枚舍利会让它开启。', '心猿会先攻，随后每次反击按攻击减防御计算；最后另有一次心火。火眼金睛展示的损失，已经包括慈悲减伤。请在最后一战前用尽真正需要的准备。'] }
  };

  const E = (x, y, type, details = {}) => ({ x, y, type, ...details });
  const I = (x, y, item) => E(x, y, 'item', { item });
  const M = (x, y, enemy) => E(x, y, 'enemy', { enemy });
  const N = (x, y, dialogue, name = '碑文') => E(x, y, 'monument', { dialogue, name });
  const S = (x, y, to, tx, ty, label) => E(x, y, 'stairs', { to, tx, ty, label });
  const G = (x, y, group, label) => E(x, y, 'gate', { group, mode: 'all', label });
  const floors = [
    {
      id: 0, name: '石生山门', subtitle: '一 · 石中有心', theme: 'jade',
      intro: '云海吞没了来路。塔门后，点灯僧认出了你，却不肯直呼你的名字。',
      objective: '向北寻找石生舍利，唤醒金箍棒。',
      hints: ['北侧石胎守卫背后是第一枚舍利。战斗前先取出生处北方的青玉灵晶。', '山门西南宝室可以用黄钥匙进入，也能得到金箍棒后从北侧断桥进入。', '东南铁栅后有碧髓灵晶，需第二枚舍利。最东侧归根匣需五舍利，之后务必回来。'],
      map: [
        '#############',
        '#...#.#.#...#',
        '#.#.#...#.#.#',
        '#.#.......#.#',
        '#.###.#.###.#',
        '#.....#.....#',
        '#.###.#.###.#',
        '#...#...#...#',
        '###~###.###=#',
        '#...#...#...#',
        '#.###...#####',
        '#...........#',
        '#############'
      ],
      entities: [
        E(4, 11, 'npc', { dialogue: 'lantern', name: '点灯僧' }), E(1, 7, 'altar', { name: '山门息灵坛' }),
        M(8, 11, 'imp'), M(7, 9, 'imp'), M(4, 5, 'imp'), M(9, 5, 'thorn'), M(5, 2, 'stone'), M(11, 2, 'bat'),
        I(5, 9, 'jade'), I(3, 11, 'yellowKey'), I(1, 11, 'peach'), I(5, 7, 'blueKey'), I(3, 1, 'amber'), I(1, 3, 'bigPeach'),
        I(1, 9, 'ruby'), I(9, 9, 'emerald'), I(11, 3, 'yellowKey'), I(7, 5, 'peach'),
        E(1, 10, 'door', { color: 'yellow', label: '朱砂宝室 · 黄门' }),
        E(6, 3, 'door', { color: 'blue', label: '东院青门' }), E(5, 1, 'relic', { relic: 0 }),
        E(11, 11, 'chest', { item: 'redKey', requires: 5, label: '归根之匣 · 五舍利共鸣，取得六层心钥' }),
        N(2, 7, 'bridge', '断桥古碑'), N(10, 11, 'rootChest', '归根石刻'),
        S(11, 1, 1, 11, 11, '上行 · 照骨禅院')
      ]
    },
    {
      id: 1, name: '照骨禅院', subtitle: '二 · 一蝉入梦', theme: 'amber',
      intro: '这里的佛像都没有影子。铜铃声中，你看到自己的骨骼竟是金色。',
      objective: '探索西北禅院，取得照骨舍利；用青蝉之变打开旧路。',
      hints: ['照骨禅师守在西北角。不同通道能让你先拿到攻击或治疗。', '中央栅室的朱砂灵晶，须得到本层舍利后用青蝉之变进入。', '西南黄门是近路，并非唯一通道。不要把所有功德都花在治疗上。'],
      map: [
        '#############',
        '#.....#.....#',
        '#.###.#.###.#',
        '#.#...#...#.#',
        '#.#.#####.#.#',
        '#...##.##...#',
        '###.##=##.###',
        '#...#...#...#',
        '#.#.##.##.#.#',
        '#.#.......#.#',
        '#.#####.###.#',
        '#...........#',
        '#############'
      ],
      entities: [
        S(11, 11, 0, 11, 1, '下行 · 石生山门'), S(11, 1, 2, 1, 11, '上行 · 悬丝水牢'),
        E(7, 11, 'altar', { name: '禅院息灵坛' }), N(10, 11, 'mirrorLesson', '照骨壁画'),
        M(1, 2, 'bone'), M(3, 6, 'acolyte'), M(7, 9, 'bell'), M(9, 5, 'viper'), M(7, 3, 'brass'), M(3, 1, 'acolyte'),
        E(1, 1, 'relic', { relic: 1 }), E(3, 8, 'door', { color: 'yellow', label: '西院捷径 · 黄门' }),
        I(5, 11, 'amber'), I(1, 9, 'jade'), I(9, 9, 'bigPeach'), I(5, 3, 'bigPeach'), I(9, 1, 'amber'),
        I(6, 5, 'ruby'), I(5, 7, 'yellowKey'), I(1, 7, 'elixir'), I(11, 5, 'peach'), I(5, 1, 'blueKey'),
        E(1, 5, 'chest', { item: 'emerald', requires: 3, label: '同行之匣 · 三舍利后碧髓觉醒' }), N(7, 7, 'mirrorLesson', '中央栅室铭文')
      ]
    },
    {
      id: 2, name: '悬丝水牢', subtitle: '三 · 一人，如何同渡', theme: 'blue',
      intro: '水声没有回响。每一条渡船都系着绳，却没有一条绳握在岸上的人手中。',
      objective: '取中央渡厄舍利；西北扳杆与中央分身镜台共同开启东南水闸。',
      hints: ['渡厄舍利在中央西室，覆水龙侍守在入口。中央断桥也能开出另一条路线。', '水闸需要两处机关：西北扳杆（3,3）与中央镜台（7,5）。镜台需要分身留守。', '四格内即可点击镜台施放分身。拿到舍利后，原地即可看见可以投影的镜台。'],
      map: [
        '#############',
        '#.....#.....#',
        '#.###.#.###.#',
        '#...#...#...#',
        '###.#####.###',
        '#...#...#...#',
        '#.###.~.###.#',
        '#...#...#...#',
        '###.#.#.#.###',
        '#...#.#...#.#',
        '#.###.###.#.#',
        '#...........#',
        '#############'
      ],
      entities: [
        S(1, 11, 1, 11, 1, '下行 · 照骨禅院'), S(11, 1, 3, 6, 11, '上行 · 两仪丹庭'),
        E(5, 11, 'altar', { name: '渡口息灵坛' }), N(2, 11, 'waterLesson', '水牢石简'),
        M(3, 7, 'water'), M(5, 6, 'flood'), M(1, 2, 'crab'), M(9, 8, 'puppet'), M(9, 3, 'water'), M(11, 5, 'viper'),
        E(5, 5, 'relic', { relic: 2 }), E(3, 3, 'switch', { group: 'sluice', kind: 'lever', label: '止水扳杆' }),
        E(7, 5, 'switch', { group: 'sluice', kind: 'plate', label: '同渡镜台 · 分身留守' }), G(7, 9, 'sluice', '双生水闸 · 止水扳杆 + 同渡镜台'),
        I(3, 9, 'amber'), I(1, 5, 'bigPeach'), I(5, 1, 'emerald'), I(7, 3, 'peach'), I(9, 7, 'amber'), I(9, 1, 'bigPeach'),
        I(11, 9, 'elixir'), I(3, 1, 'yellowKey'), I(9, 11, 'blueKey'), I(1, 1, 'ruby'), I(7, 7, 'orb'),
        E(11, 7, 'door', { color: 'blue', label: '东侧水牢青门' })
      ]
    },
    {
      id: 3, name: '两仪丹庭', subtitle: '四 · 慈悲也曾是你', theme: 'crimson',
      intro: '丹炉仍在燃烧。丹庭被分成慈与怒的两半，而火焰分不清二者的颜色。',
      objective: '让分身留守西南镜台，扳动中央扳杆，打开双丹门寻找慈悲舍利。',
      hints: ['西南慈心镜台与中央止火扳杆共同控制两个丹门。两个门都能通往西北舍利。', '南侧断桥与铁栅分别提供入口；每次施法的代价先在面板上显示。', '获得慈悲舍利后，旧层的法术敌人会变得容易。可以回访水牢换取此前未取的资源。'],
      map: [
        '#############',
        '#.....#.....#',
        '#.###...###.#',
        '#...#.#.#...#',
        '###.#.#.#.###',
        '#...#...#...#',
        '#.#.#####.#.#',
        '#.#...#...#.#',
        '#.###.#.###.#',
        '#...#...#...#',
        '###~##=##.###',
        '#...........#',
        '#############'
      ],
      entities: [
        S(6, 11, 2, 11, 1, '下行 · 悬丝水牢'), S(11, 1, 4, 1, 11, '上行 · 倒影经阁'),
        E(7, 11, 'altar', { name: '丹庭息灵坛' }), E(5, 2, 'altar', { name: '止火息灵坛' }),
        E(4, 11, 'npc', { dialogue: 'alchemy', name: '点灯僧' }), N(3, 1, 'compassion', '慈悲残像'),
        M(1, 2, 'judge'), M(5, 7, 'flame'), M(9, 7, 'alchemist'), M(9, 3, 'furnace'), M(5, 3, 'flame'), M(11, 8, 'puppet'),
        E(1, 1, 'relic', { relic: 3 }), E(1, 9, 'switch', { group: 'furnace', kind: 'plate', label: '慈心镜台 · 分身留守' }),
        E(5, 5, 'switch', { group: 'furnace', kind: 'lever', label: '止火扳杆' }),
        G(1, 6, 'furnace', '西丹门 · 慈心镜台 + 止火扳杆'), G(3, 6, 'furnace', '东丹门 · 慈心镜台 + 止火扳杆'),
        I(3, 9, 'ruby'), I(11, 9, 'bigPeach'), I(3, 7, 'jade'), I(7, 5, 'emerald'), I(5, 1, 'feast'),
        I(9, 1, 'ruby'), I(3, 3, 'elixir'), I(9, 11, 'yellowKey'), I(11, 5, 'blueKey'), I(1, 7, 'orb'),
        E(11, 2, 'door', { color: 'blue', label: '丹庭上行青门' })
      ]
    },
    {
      id: 4, name: '倒影经阁', subtitle: '五 · 真相在镜外', theme: 'violet',
      intro: '所有经卷都在描绘同一个人。每翻一页，那个人便少了一种情感。',
      objective: '隔墙投影北侧镜台，开启西北经室；取得明心舍利后回山门取心钥。',
      hints: ['西北经室入口需要北侧隔墙镜台（5,3）与东南扳杆（9,9）。在西侧长廊（5,5）即可投影。', '舍利藏在西北角，无字碑将身后的灵晶是额外奖励，可自行衡量战损。', '五舍利齐聚：返回一层（石生山门）东南归根匣取得红钥匙，然后上六层。'],
      map: [
        '#############',
        '#...#...#...#',
        '#.#.#.#.#.#.#',
        '#.#...#...#.#',
        '#.#####=###~#',
        '#.....#.....#',
        '###.#.#.#.###',
        '#...#...#...#',
        '#.###.###.#.#',
        '#.....#...#.#',
        '#.#####.###.#',
        '#...........#',
        '#############'
      ],
      entities: [
        S(1, 11, 3, 11, 1, '下行 · 两仪丹庭'), S(11, 1, 5, 6, 11, '上行 · 无相塔心'),
        E(7, 11, 'altar', { name: '经阁息灵坛' }), N(2, 11, 'library', '无字经卷'), E(6, 11, 'npc', { dialogue: 'truth', name: '点灯僧' }),
        M(1, 2, 'archivist'), M(3, 6, 'mirror'), M(5, 7, 'ink'), M(5, 2, 'sentinel'), M(9, 5, 'mirror'), M(9, 3, 'ink'),
        E(1, 1, 'relic', { relic: 4 }), E(5, 3, 'switch', { group: 'scripture', kind: 'plate', label: '镜外镜台 · 可隔墙投影' }),
        E(9, 9, 'switch', { group: 'scripture', kind: 'lever', label: '归真扳杆' }), G(1, 4, 'scripture', '无字经门 · 镜外镜台 + 归真扳杆'),
        I(1, 9, 'ruby'), I(5, 5, 'emerald'), I(3, 1, 'bigPeach'), I(5, 1, 'ruby'), I(7, 1, 'emerald'),
        I(11, 7, 'bigPeach'), I(9, 7, 'amber'), I(3, 9, 'peach'), I(9, 1, 'feast'), I(11, 9, 'elixir'),
        E(5, 9, 'chest', { item: 'feast', requires: 4, label: '慈悲之匣 · 四舍利共鸣' })
      ]
    },
    {
      id: 5, name: '无相塔心', subtitle: '终 · 心猿归处', theme: 'gold',
      intro: '塔心没有佛像。金色牢笼中，一只与你一模一样的猿猴，抬起了眼睛。',
      objective: '西桥扳杆、东栅分身、归根心钥。打开中央心门，面对无相心猿。',
      hints: ['西路断桥使用金箍棒（1 灵力），东路铁栅使用青蝉之变（1 灵力），东镜台留分身（2 灵力）。', '心门由西北止战扳杆（1,3）和东北归心镜台（11,3）共同开启。', '红钥匙只在一层出生区东侧归根匣内，五舍利齐聚后可开启。最终战前可以自由离塔准备。'],
      map: [
        '#############',
        '######.######',
        '#####...#####',
        '#...##.##...#',
        '#.####.####.#',
        '#......#....#',
        '###~#####=###',
        '#...#...#...#',
        '#.#.#.#.#.#.#',
        '#.#...#...#.#',
        '#.###.#.###.#',
        '#...........#',
        '#############'
      ],
      entities: [
        S(6, 11, 4, 11, 1, '下行 · 倒影经阁'), E(5, 11, 'altar', { name: '归心息灵坛' }), N(7, 11, 'finalLesson', '塔心铭文'),
        M(3, 7, 'shade'), M(9, 7, 'shade'), M(1, 4, 'wrath'), M(11, 4, 'wrath'), M(7, 7, 'mirror'), M(6, 2, 'heart'),
        E(1, 3, 'switch', { group: 'heart', kind: 'lever', label: '止战扳杆' }), E(11, 3, 'switch', { group: 'heart', kind: 'plate', label: '归心镜台 · 分身留守' }),
        E(6, 4, 'door', { color: 'red', label: '归根朱门 · 需一层归根心钥' }), G(6, 3, 'heart', '无相心门 · 止战扳杆 + 归心镜台'),
        E(6, 5, 'seal', { requires: 5, label: '五光心印 · 五舍利齐聚方可通过' }), E(6, 1, 'finale', { label: '心猿归处' }),
        I(1, 11, 'feast'), I(11, 11, 'feast'), I(3, 9, 'ruby'), I(9, 9, 'emerald'), I(5, 7, 'elixir'), I(1, 5, 'peach'), I(11, 5, 'peach')
      ]
    }
  ];
  /* Each chapter contains three different authored spaces. Relics are earned at
     3 / 6 / 9 / 12 / 15; the final three floors synthesize their rules. */
  const chapterEnds = floors.slice();
  const room = (name, subtitle, theme, intro, objective, hints, map, entities) => ({ name, subtitle, theme, intro, objective, hints, map, entities });
  const additions = [
    room('云垂山门', '第一章 · 不灭的灯', 'jade', '七十二道雷声之后，破碎的舍利落进一座没有名字的塔。大圣循着熟悉的心跳而来。',
      '从山门出发。观察战损、收集灵晶，前往第三层石胎古殿寻找第一枚舍利。',
      ['先向左取赤铜灵晶，再比较巡山小妖的战损。攻击的价值取决于能否少打一轮。', '北侧黄门是一条近路；西侧长廊也可绕行。敌人、钥匙和灵晶均不会重生。', '出生处最东的归根匣需五舍利。记住这里，完整的旅程必须回到出发之地。'],
      ['#############','#.....#.....#','#.###.#.###.#','#...#...#...#','###.#.#.#.###','#...#.#.....#','#.#.#.#####.#','#.#...#.....#','#.###.#.###.#','#.....#...~.#','#.#######.#.#','#...........#','#############'],
      [E(4,11,'npc',{dialogue:'lantern',name:'点灯僧'}), E(7,11,'altar',{name:'山门息灵坛'}), N(10,11,'rootChest','归根石刻'), E(11,11,'chest',{item:'redKey',requires:5,label:'归根之匣 · 五舍利共鸣，取得十八层心钥'}), M(11,7,'imp'),M(7,3,'bat'),M(3,7,'imp'),I(1,11,'peach'),I(9,5,'yellowKey'),I(3,3,'blueKey'),I(1,5,'bigPeach'),E(11,3,'door',{color:'yellow',label:'云阶近路 · 黄门'}),E(9,9,'chest',{item:'emerald',requires:3,label:'三光旧匣 · 三舍利共鸣'})]),
    room('残钟回廊', '第一章 · 先看见代价', 'jade', '钟声在西殿响起，东侧的石门却随之振动。塔开始试探你的耐心。',
      '找到西殿启钟扳杆，让北侧双钟门响应，再前往石胎古殿。',
      ['西侧扳杆在（3,5），从西南长廊可达；右侧走廊会先看到还未开启的钟门。', '钟门共用一个扳杆。机关状态永久保存，不需要赶在倒计时内通过。', '青钥匙用于可绕行的捷径；留到下一章也是一种选择。'],
      ['#############','#...#.......#','#.#.#.#####.#','#.#...#...#.#','#.#####.#.#.#','#...#...#...#','###.#.###.#.#','#...#...#.#.#','#.#####.#.#.#','#.......#...#','#.#######.#.#','#...........#','#############'],
      [E(5,11,'altar',{name:'残钟息灵坛'}), E(3,5,'switch',{group:'bell',kind:'lever',label:'启钟扳杆'}),G(10,1,'bell','西钟门 · 启钟扳杆'),G(11,2,'bell','东钟门 · 启钟扳杆'),M(3,6,'imp'),M(11,7,'bat'),M(5,3,'stone'),I(1,9,'peach'),I(9,3,'bigPeach'),I(3,1,'coins'),I(7,5,'elixir'),E(11,3,'door',{color:'blue',label:'钟廊青门 · 西侧可绕行'})]),
    room('断云栈道', '第二章 · 棒可架桥', 'amber', '石生舍利在掌心微热。前方的云阶只缺一截，却曾阻断无数归途。',
      '金箍棒为北侧断云架桥；探索南侧断桥后的旧栈道。',
      ['北侧（7,4）的断桥是上行必经之处。相邻后选择金箍棒施术，桥永久留下。', '南侧另有断桥，通向被遗弃的栈道与补给。这次绕行会花费额外灵力。', '第三层古殿西南宝室与第一层旧匣，仍值得今后回访。'],
      ['#############','#...#.......#','#.#.#.#####.#','#.#...#.....#','#.###.#~#####','#.....#.....#','#.#######.#.#','#...#.....#.#','###.#.#####.#','#...#...#...#','#.#####.#.#.#','#....~......#','#############'],
      [E(7,11,'altar',{name:'断云息灵坛'}),M(9,7,'acolyte'),M(7,3,'bell'),M(3,3,'brass'),I(3,11,'bigPeach'),I(1,5,'coins'),I(11,5,'peach'),I(1,3,'yellowKey'),N(3,5,'bridge','云桥铭文')]),
    room('百锁偏殿', '第二章 · 钥匙与绕路', 'amber', '偏殿的锁比门还多。有人相信，关上所有门便能守住真相。',
      '选择中央青门或东侧黄门的路线，前往照骨禅院。',
      ['中央青门与东侧黄门提供两条上行路线。南廊给出的青钥匙保证其中一条可行。', '先比较两条路的守卫损失与宝物收益。钥匙没有额外的战斗加成。', '北侧高处藏着治疗，西南死角有赤铜灵晶。'],
      ['#############','#...........#','#.###.###.#.#','#...#.#...#.#','###.#.#.###.#','#...#...#...#','#.#####.#.###','#.....#.#...#','#.###.#.###.#','#.#...#.....#','#.#.#######.#','#...........#','#############'],
      [E(5,11,'altar',{name:'百锁息灵坛'}),I(9,11,'blueKey'),E(7,6,'door',{color:'blue',label:'中央青门 · 正面上行'}),E(9,6,'door',{color:'yellow',label:'东廊黄门 · 侧路上行'}),M(7,5,'acolyte'),M(11,5,'viper'),M(5,9,'bell'),I(1,5,'bigPeach'),I(5,1,'peach'),I(3,3,'coins'),I(7,1,'orb')]),
    room('缝天井', '第三章 · 缝隙的方向', 'blue', '院中没有门，只有细得几乎看不见的缝。化蝉的记忆正在苏醒。',
      '选择西侧或东侧铁栅，规划不同的战斗与补给路线。',
      ['两道铁栅都能从内侧永久卸锁。西侧路长、补给多；东侧路短但有蛇使。', '青蝉之变每次花费 1 灵力。息灵坛免费补充，但生命只来自有限的道具。', '第六层中央栅室、第三层东南密室，已经可以进入。'],
      ['#############','#...#.......#','#.#.#.###.#.#','#.#...#...#.#','#.#####.###.#','#.....#.....#','#####=#####=#','#.....#.....#','#.###.#.###.#','#...#...#...#','###.#####.###','#...........#','#############'],
      [E(7,11,'altar',{name:'缝天息灵坛'}),M(11,7,'viper'),M(5,5,'water'),M(3,3,'brass'),I(1,7,'bigPeach'),I(1,1,'coins'),I(7,3,'peach'),I(11,5,'blueKey'),N(3,7,'mirrorLesson','蝉蜕石画')]),
    room('无声梵井', '第三章 · 一条路不止一种走法', 'blue', '声音落到井底便消失了。只有扳杆转动时，北端的石门会遥遥应答。',
      '进入中央小室扳动定风杆；用桥与铁栅选择不同的外环路线。',
      ['中央扳杆在（5,5），由南侧铁栅进入中央竖井。它同时控制上方两扇门。', '东侧断桥可直达北方，但去不了中央扳杆。近路与目标不总在同一个方向。', '留下灵力给接下来的水牢。每座息灵坛都可重复恢复。'],
      ['#############','#...........#','#.###.#.###.#','#.#...#...#.#','#.#.#####.#.#','#...#...#...#','###.#.#.###~#','#...#.#.....#','#.###.#####.#','#.....#...#.#','#.###=#.#.#.#','#...........#','#############'],
      [E(7,11,'altar',{name:'梵井息灵坛'}),E(5,5,'switch',{group:'wind',kind:'lever',label:'定风扳杆'}),G(10,1,'wind','梵井北门 · 定风扳杆'),G(11,2,'wind','梵井东门 · 定风扳杆'),M(5,8,'puppet'),M(11,7,'water'),M(3,3,'viper'),I(9,9,'bigPeach'),I(1,5,'peach'),I(7,5,'coins')]),
    room('留影棋坪', '第四章 · 留一个自己', 'crimson', '棋坪上没有棋子。你的影子落下时，远处的石门第一次有了回应。',
      '西侧照影镜台留下分身，东南扳杆亲手开启，双影门才会响应。',
      ['分身镜台在（3,3），隔着墙也能在四格内施术。投影永久留守，不用赶时间。', '东南扳杆在（9,9），与西侧镜台共同控制出口。', '九层得到分身后，六层西侧同行之匣与一层三光旧匣都已共鸣。'],
      ['#############','#.....#.....#','#.###.#.#.#.#','#...#...#.#.#','###.###.#.#.#','#...#...#...#','#.###.#####.#','#.....#.....#','###.###.#.###','#...#...#...#','#.###.#.###.#','#...........#','#############'],
      [E(5,11,'altar',{name:'留影息灵坛'}),E(3,3,'switch',{group:'chess',kind:'plate',label:'照影镜台 · 分身留守'}),E(9,9,'switch',{group:'chess',kind:'lever',label:'落子扳杆'}),G(10,1,'chess','双影北门 · 镜台 + 扳杆'),G(11,2,'chess','双影东门 · 镜台 + 扳杆'),M(1,6,'flame'),M(11,7,'alchemist'),M(7,3,'flame'),I(1,9,'bigPeach'),I(9,1,'peach'),I(3,1,'coins')]),
    room('千丝庭', '第四章 · 两处留守', 'crimson', '一根毫毛可以作一座桥，两根毫毛可以替你守住两端。塔从不催你，只等答案。',
      '南侧与北侧两个镜台都留下分身，开启千丝双门。',
      ['两个镜台分别在（3,9）与（7,3）。同层可以留下多个分身，每个镜台花费 2 灵力。', '两处永久留守后，所有千丝门都会开启。中央息灵坛适合中途补充。', '不用站上镜台。靠近后点击，四格投影范围内即可施术。'],
      ['#############','#...........#','#.#####.###.#','#...#...#...#','###.#.###.#.#','#...#.....#.#','#.#######.#.#','#.....#...#.#','###.#.#.###.#','#...#...#...#','#.#######.#.#','#...........#','#############'],
      [E(5,5,'altar',{name:'千丝息灵坛'}),E(3,9,'switch',{group:'silk',kind:'plate',label:'南丝镜台 · 第一分身'}),E(7,3,'switch',{group:'silk',kind:'plate',label:'北丝镜台 · 第二分身'}),G(10,1,'silk','千丝北门 · 双镜台'),G(11,2,'silk','千丝东门 · 双镜台'),G(11,6,'silk','千丝侧门 · 双镜台'),M(3,7,'puppet'),M(9,5,'alchemist'),M(11,3,'flame'),I(11,9,'bigPeach'),I(1,7,'peach'),I(1,3,'coins'),I(7,9,'orb')]),
    room('息火莲台', '第五章 · 为何不再灼痛', 'violet', '慈悲舍利使塔中的火焰变得温和。你终于听清，火声之下有人在哭。',
      '利用慈悲护持比较法术近路与普通守卫的绕路，寻找旧塔的真相。',
      ['慈悲被动已计入所有敌情预览：每次法术反击减少 8 生命损失。', '东侧火灵路短，中央罗汉路长。请用真实战损比较，不要只看敌人名字。', '慈悲不能减免蛇使余毒或荆棘反伤；这些是真实伤害。'],
      ['#############','#.....#.....#','#.###.#.###.#','#...#...#...#','#.###.###.#.#','#.....#...#.#','###.###.###.#','#...#.....#.#','#.###.###.#.#','#.....#.....#','#.#####.###.#','#...........#','#############'],
      [E(7,11,'altar',{name:'息火莲坛'}),M(3,6,'mirror'),M(11,7,'flame'),M(7,3,'brass'),I(1,9,'bigPeach'),I(9,5,'peach'),I(5,1,'coins'),E(5,9,'chest',{item:'elixir',requires:4,label:'息火之匣 · 慈悲共鸣'})]),
    room('问心断碑', '第五章 · 答案不在碑上', 'violet', '碑将守着一块空白的石头。你忽然意识到，很多守卫并不值得战胜。',
      '找到西北问心扳杆，开启断碑门；自行决定是否挑战支路碑将。',
      ['问心扳杆在（3,3）。中央回廊可通往它，右侧直路会先遇到封闭门。', '西南无字碑将是可绕过的资源守卫。它的收益与战损都能提前查看。', '下一层是明心舍利所在地。得到后，应先回第一层拿归根心钥。'],
      ['#############','#...........#','#.#####.#.#.#','#.#...#.#.#.#','#.#.#.#.###.#','#...#...#...#','#####.###.#.#','#...#.....#.#','#.#.#####.#.#','#.#...#...#.#','#.###.#.###.#','#...........#','#############'],
      [E(7,11,'altar',{name:'问心息灵坛'}),E(3,3,'switch',{group:'question',kind:'lever',label:'问心扳杆'}),G(10,1,'question','断碑北门 · 问心扳杆'),G(11,2,'question','断碑东门 · 问心扳杆'),M(5,6,'ink'),M(11,7,'mirror'),M(3,7,'sentinel'),I(1,7,'bigPeach'),I(9,3,'peach'),I(1,3,'coins')]),
    room('逆莲天梯', '第六章 · 回到出发之地', 'gold', '五枚舍利齐鸣，整座塔的脚步声都在向下。你知道，最后的钥匙不在高处。',
      '确认已回一层取得归根心钥，再完成西杆东台的逆莲机关。',
      ['第五枚舍利不会直接给出红钥匙。请回第一层出生处最东的归根匣，五光共鸣后开启。', '西侧逆莲扳杆（3,5）与东侧归途镜台（9,5）共同开启上方双门。', '最终三层没有新的舍利。这里检验的是此前能力之间的组合，以及生命与钥匙的长期规划。'],
      ['#############','#.....#.....#','#.###.#.###.#','#...#...#...#','###.#####.#.#','#...#.....#.#','#.###.#####.#','#.....#.....#','#.###.#.###.#','#.#...#...#.#','#.#.#####.#.#','#...........#','#############'],
      [E(7,11,'altar',{name:'逆莲息灵坛'}),E(3,5,'switch',{group:'echo',kind:'lever',label:'逆莲扳杆'}),E(9,5,'switch',{group:'echo',kind:'plate',label:'归途镜台 · 分身留守'}),G(10,1,'echo','逆莲北门 · 西杆东台'),G(11,2,'echo','逆莲东门 · 西杆东台'),M(1,6,'shade'),M(11,7,'wrath'),M(5,3,'mirror'),I(1,9,'bigPeach'),I(9,3,'peach'),I(3,3,'coins'),E(11,6,'seal',{requires:5,label:'五光莲印 · 五舍利齐聚'})]),
    room('三问无生门', '第六章 · 你为何而战', 'gold', '最后一段阶梯上，点灯僧没有再出现。他的灯，已经在你的心里。',
      '西侧止妄扳杆与中央无生镜台共同开启双门；为塔心之战做最后准备。',
      ['西侧扳杆在（1,3），中央镜台在（6,5）。仍然只需四格内投影。', '南部断桥提供中央捷径；两边长廊也可以抵达。能力与绕行是两种同样有效的答案。', '这里与下一层都有补给，敌人不会刷新。回元丹、功德与未探索过的旧路，都可以成为最后的胜机。'],
      ['#############','#.....#.....#','#.###...###.#','#.#...#...#.#','#.#.#####.#.#','#...#...#...#','###=#.#.#.###','#...#.#.#...#','#.###.#.###.#','#...........#','#.####~####.#','#...........#','#############'],
      [E(5,11,'altar',{name:'无生息灵坛'}),E(1,3,'switch',{group:'living',kind:'lever',label:'止妄扳杆'}),E(6,5,'switch',{group:'living',kind:'plate',label:'无生镜台 · 分身留守'}),G(10,1,'living','无生北门 · 止妄 + 分身'),G(11,2,'living','无生东门 · 止妄 + 分身'),M(5,6,'wrath'),M(1,8,'shade'),M(11,8,'mirror'),I(1,11,'bigPeach'),I(11,11,'bigPeach'),I(7,7,'elixir'),I(3,1,'orb')])
  ];
  const moveItem = (chapter, x, y, destination, nx, ny) => {
    const index = chapterEnds[chapter].entities.findIndex(e => e.x === x && e.y === y && e.type === 'item');
    if (index < 0) throw new Error('Missing relocated resource');
    const entity = chapterEnds[chapter].entities.splice(index, 1)[0];
    entity.x = nx; entity.y = ny; additions[destination].entities.push(entity);
  };
  // Spread each chapter's finite stat budget across three floors, rather than
  // adding eighteen floors of inflation. Mandatory abilities retain old rewards.
  moveItem(0,3,1,0,5,11); moveItem(0,5,9,1,1,7);
  moveItem(1,5,11,2,5,9); moveItem(1,9,1,3,1,7); moveItem(1,1,9,3,3,9);
  moveItem(2,3,9,4,5,11); moveItem(2,9,7,5,3,9); moveItem(2,5,1,4,3,1);
  moveItem(3,3,9,6,9,11); moveItem(3,9,1,7,1,5); moveItem(3,3,7,6,5,7);
  moveItem(4,1,9,8,5,11); moveItem(4,9,7,9,1,5); moveItem(4,5,5,9,1,9);
  moveItem(5,3,9,10,3,11); moveItem(5,9,9,11,9,9);
  chapterEnds[0].name = '石胎古殿';
  chapterEnds[0].intro = '山门后的古殿里，一尊石胎守着最初的心跳。第一枚舍利就在它身后。';
  chapterEnds[0].entities = chapterEnds[0].entities.filter(e => e.type !== 'chest' && e.dialogue !== 'rootChest' && e.dialogue !== 'lantern');
  chapterEnds[0].hints = ['北侧石胎守卫背后是第一枚舍利。先观察附近灵晶与治疗，再决定出手。','古殿西南宝室可以用黄钥匙进入，也能得到金箍棒后从北侧断桥进入。','东南铁栅后有碧髓灵晶，需第六层的照骨舍利；第一层归根匣需五枚舍利。'];
  chapterEnds[1].hints = ['照骨禅师守在西北角。不同通道能让你先拿到攻击或治疗。','中央栅室的朱砂灵晶，须得到本层舍利后用青蝉之变进入。','西南黄门是近路，并非唯一通道。第九层得到分身舍利后可开启西侧同行之匣。'];
  chapterEnds[1].hints[0] = '照骨禅师守在西北角，但上方廊道也能绕过它。比较先攻战损与绕路守卫，再作决定。';
  chapterEnds[2].hints[0] = '渡厄舍利在中央西室。正门龙侍可战，也能从中央断桥架棒绕行；用 1 灵息换一场战斗。';
  chapterEnds[3].map[1] = '#.#...#.....#';
  chapterEnds[3].map[3] = '#...#.#.....#';
  chapterEnds[4].map[3] = '#.#.#.#...#.#';
  additions[2].map[1] = '#...#.#.....#';
  chapterEnds[4].entities = chapterEnds[4].entities.map(e => e.x === 6 && e.y === 11 ? {...e, x: 5} : e);
  chapterEnds[4].hints[2] = '五舍利齐聚：返回第一层（云垂山门）最东侧归根匣取得红钥匙，然后前往十八层。';
  chapterEnds[4].objective = '隔墙投影北侧镜台，开启西北经室；取得明心舍利后回第一层取心钥。';
  chapterEnds[5].entities.forEach(e => { if (e.type === 'door') e.label = '归根朱门 · 需第一层归根心钥'; });
  floors.splice(0, floors.length);
  chapterEnds.forEach((end, chapter) => floors.push(additions[chapter * 2], additions[chapter * 2 + 1], end));
  floors.forEach((floor, index) => {
    floor.id = index;
    floor.entities = floor.entities.filter(e => e.type !== 'stairs');
    if (index > 0) floor.entities.push(S(6,11,index-1,11,1,'下行 · '+floors[index-1].name));
    if (index < 17) floor.entities.push({...S(11,1,index+1,6,11,'上行 · '+floors[index+1].name),requires:Math.min(5,Math.floor((index+1)/3))});
  });
  const rationKey = (floor, x, y, replacement) => {
    const entity = floors[floor].entities.find(e => e.type === 'item' && e.x === x && e.y === y);
    if (!entity || !['yellowKey','blueKey'].includes(entity.item)) throw new Error('Invalid finite-key allocation');
    entity.item = replacement;
  };
  // Three yellow keys in the entire adventure, including the one carried on
  // arrival. Four yellow doors compete with abilities and alternate corridors.
  rationKey(2,11,3,'coins'); rationKey(3,1,3,'orb'); rationKey(5,5,7,'coins');
  rationKey(8,3,1,'orb'); rationKey(11,9,11,'coins');
  // Blue keys appear in chapters one, two and three. Later blue doors remain
  // optional shortcuts, rewarding the player who saved a key across chapters.
  rationKey(2,5,7,'coins'); rationKey(5,5,1,'orb'); rationKey(6,11,5,'coins'); rationKey(11,11,5,'orb');
  floors[0].hints.push('黄钥匙连同随身的一把，全塔共三把，黄门却有四扇。能绕行或等神通觉醒时，不必立即花钥匙。');
  floors[0].hints.push('青钥匙全塔仅三把，分布在第一、第五、第九层，青门共有五扇。每扇都有其他走法，节省的钥匙可换取后面的近路。');
  floors[4].hints[0] = '中央青门与东侧黄门提供两条上行路线。南廊给出青钥匙；黄钥匙全塔仅三把，需权衡留给其他宝室还是此处近路。';
  floors[8].hints.push('东侧青门可用钥匙换近路；也能从西北回廊绕行，但要面对额外守卫。南廊有全塔最后一枚青钥匙。');
  floors[11].hints.push('上行青门是捷径，可由中央上方的北侧长廊绕过。全塔只有三枚青钥匙，留到此处才会有这条选择。');
  // Propagate the eighteen-floor geography into narrative instructions.
  for (const dialogue of Object.values(dialogues)) dialogue.lines = dialogue.lines.map(line => line.replaceAll('六层','十八层'));
  dialogues.lantern.lines[0] = '舍利碎了，塔也失了心。五枚碎片分散在第三、第六、第九、第十二与第十五层，各守着一种被遗忘的念头。';
  items.redKey.description = '五舍利唤醒的唯一心钥，用于十八层中央朱门。';
  relics[1].story = '大圣化作一只青蝉。最细的缝隙，原来容得下一段不肯低头的人生。第三层古殿的铁栅正在等待你。';
  relics[4].description = '五舍利共鸣：返回第一层云垂山门，开启归根之匣，取得十八层朱门的唯一心钥。';
  relics[4].story = '所有碎片拼成的不是佛像，而是一颗心。塔心里，锁着你被分割的嗔怒。回到第一层出发的山门，带走完整的自己。';
  const unifyTerms = object => {
    for (const key of Object.keys(object)) {
      const value = object[key];
      if (typeof value === 'string') object[key] = value.replaceAll('灵力','灵息').replaceAll('回元丹','随身蟠桃').replaceAll('凝神珠','凝息珠').replaceAll('功德钱','功德金').replaceAll('息灵坛','灵息坛');
      else if (value && typeof value === 'object') unifyTerms(value);
    }
  };
  [floors,enemies,items,relics,dialogues].forEach(unifyTerms);
  // Eighteen floors share one finite economy. Shop choices must compete with
  // healing, not grow three times richer merely because the route is longer.
  Object.values(enemies).forEach(enemy => { if (enemy.gold > 0) enemy.gold = Math.max(1, Math.round(enemy.gold / 2)); });
  floors.forEach(floor => {
    if (floor.map.length !== 13 || floor.map.some(row => row.length !== 13)) throw new Error('Invalid authored map: ' + floor.name);
    const used = new Set();
    floor.entities.forEach((entity, index) => {
      entity.id = 'f' + floor.id + '-' + index;
      const key = entity.x + ',' + entity.y;
      if (used.has(key)) throw new Error('Overlapping authored entities: ' + floor.name + ' ' + key);
      if (floor.map[entity.y][entity.x] !== '.') throw new Error('Entity outside floor: ' + floor.name + ' ' + key);
      used.add(key);
    });
  });
  window.TowerData = { title: '大圣：舍利魔塔', version: 1, floors, enemies, items, relics, dialogues };
})();
