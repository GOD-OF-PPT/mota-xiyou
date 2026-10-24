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
  /* Three authored routes commit a finite key to a different growth plan.
     Both mouths of each lane are keyed to the same choice, so returning from
     the north cannot harvest the two unchosen lanes. Existing entity indices
     are retained for saved maps; new mechanics append after the old stairs. */
  enemies.thresholdImp={...enemies.imp,name:'守阶小妖',hp:42,desc:'普通守卫。初始攻击 24 需三棒；先取赤铜灵晶升至 27，可减少一轮还击。',lore:'它守着第一道门，也守着你第一次看清的因果。'};
  floors[0].entities.filter(e=>e.type==='enemy'&&e.enemy==='imp').forEach(e=>{e.enemy='thresholdImp';});
  const choices = {
    locks: {
      title:'百锁三契 · 一念成路',grant:'cache',
      description:'三条通路只可选一条。青契走灰烬守卫，黄契走余毒蛇使，无钥契须经过两名守卫。各路在北侧汇合，抵达共鸣匣才取得契约成长；另外两路会封存。',
      options:[
        {id:'blue',label:'青契 · 破甲之路',description:'付出青钥匙，面对一名灰烬沙弥。支路有功德金，北匣获得攻击，适合提前跨过攻击临界。',cost:{key:{color:'blue',amount:1}},reward:{atk:5}},
        {id:'gold',label:'黄契 · 护心之路',description:'付出黄钥匙，面对一名带余毒的蛇使。支路有小蟠桃，北匣获得防御与治疗。余毒不会被防御抵消。',cost:{key:{color:'yellow',amount:1}},reward:{def:4,hp:80}},
        {id:'free',label:'无钥契 · 承担之路',description:'保留所有钥匙，先过铜铃怨灵、再过巡山小妖。支路有凝息珠，北匣获得功德金，可自行供奉。',cost:{},reward:{coins:24}}
      ]
    },
    silk: {
      title:'千丝双愿 · 只取一愿',grant:'immediate',
      description:'本层三个镜台只能同时维持两个分身。甲乙开上行，甲丙开攻击经室，乙丙开护身经室。两份经卷只能取一份；取卷后需召回丙，重新安排甲乙才能上楼。',
      options:[
        {id:'atk',label:'破执经 · 攻击',description:'甲镜台与丙镜台同时响应，抵达西侧经室后领取。另一份经卷封存。',cost:{},reward:{atk:4}},
        {id:'def',label:'护心经 · 防御',description:'乙镜台与丙镜台同时响应，抵达东侧经室后领取。另一份经卷封存。',cost:{},reward:{def:4,hp:60}}
      ]
    },
    residual: {
      title:'山门余香 · 留给谁',grant:'immediate',
      description:'石生舍利唤醒第一层的余香古炉。残香只余一缕：可为自己疗伤，也可化为功德金供后日修行，只能选一次。',
      options:[
        {id:'heal',label:'残香疗伤',description:'立即恢复生命，不增加可重复使用的补给。',cost:{},reward:{hp:80}},
        {id:'offering',label:'余香供奉',description:'留下这次治疗，换取可自由分配的功德金。',cost:{},reward:{coins:16}}
      ]
    },
    compassion: {
      title:'还灯于魂 · 力量的归处',grant:'immediate',
      description:'慈悲舍利使第九层石壁中的灯魂现形。取走它护持的灯芯可增长攻击；归还灯火则受到它最后一次祝福。选择公开，二者都能打通此处旧墙。',
      options:[
        {id:'claim',label:'取灯 · 增长力量',description:'灯魂归于沉寂，灯芯化作攻击。此决定会记入最后的归心回顾。',cost:{},reward:{atk:3}},
        {id:'release',label:'还灯 · 解放心愿',description:'保留它的灯，以一次祝福恢复生命。此决定会记入最后的归心回顾。',cost:{},reward:{hp:120}}
      ]
    }
  };
  const locks = floors[4];
  locks.map = [
    '#############','###########.#','###########.#','##..........#',
    '##.###.###.##','##.###.###.##','##.###.###.##','##.###.###.##',
    '##.###.###.##','##.###.###.##','#...........#','#...........#','#############'
  ];
  locks.subtitle='第二章 · 三路一契';
  locks.intro='百锁殿的门各刻一问：你愿把钥匙交给力量，把生命交给守护，还是把代价留在自己身上？三条路，只有一份契约。';
  locks.objective='在南廊比较青、黄、无钥三契，选定一路；抵达北侧共鸣匣领取所选成长。';
  locks.hints=[
    '三路的守卫、通行代价与北匣奖励都可提前查看。选契才花钥匙，查看不消耗；另外两路会封存。',
    '青契换攻击，黄契换防御和治疗，无钥契保留钥匙但须承担两场战斗。普通防御不能抵挡铜铃法术或蛇使余毒。',
    '南廊有青钥匙与莲灯，任何成长状态都有无钥路线。所选奖励须在北侧共鸣匣领取，不能隔墙取走。'
  ];
  const lockPositions = [[5,11],[9,11],[2,9],[6,9],[2,6],[6,6],[10,7],[1,11],[6,5],[2,5],[10,5],[4,3],[6,3]];
  lockPositions.forEach(([x,y],i)=>{locks.entities[i].x=x;locks.entities[i].y=y;});
  locks.entities[2]=E(2,9,'choice',{choice:'locks',option:'blue',label:'青契台 · 一青钥换破甲之路'});
  locks.entities[3]=E(6,9,'choice',{choice:'locks',option:'gold',label:'黄契台 · 一黄钥换护心之路'});
  // Contract rewards redistribute the chapter's old growth budget.
  locks.entities[11].item='coins';
  locks.entities[12].item='peach';
  locks.entities.push(
    E(10,9,'choice',{choice:'locks',option:'free',label:'无钥契台 · 两名守卫，保留钥匙'}),
    E(11,2,'cache',{choice:'locks',label:'北侧共鸣匣 · 兑现所选契约'}),
    M(10,6,'imp'),
    E(2,4,'choice',{choice:'locks',option:'blue',label:'青契北锁 · 仅青契可通过'}),
    E(6,4,'choice',{choice:'locks',option:'gold',label:'黄契北锁 · 仅黄契可通过'}),
    E(10,4,'choice',{choice:'locks',option:'free',label:'无钥北锁 · 仅无钥契可通过'})
  );
  const silk = floors[10];
  silk.map = [
    '#############','#####.......#','#####.#####.#','#...#..#..#.#',
    '###.#..##.#.#','#...........#','#.###.#.###.#','#...........#',
    '#.###.#.###.#','#...........#','######.######','#...........#','#############'
  ];
  silk.cloneLimit=2;
  silk.subtitle='第四章 · 三台两影';
  silk.intro='三个镜台浮现三段旧愿，只有两道影子能留在此间。大圣第一次需要把一个已经守住的自己，轻轻唤回。';
  silk.objective='甲乙开上行，甲丙开西经室，乙丙开东经室。至多两处分身，双经卷只取一份。';
  silk.hints=[
    '本层最多同时驻守两个分身。甲在西侧，乙在东侧，丙在上方；火眼金睛可查看每道门需要的镜台。',
    '想取攻击经卷，先部署甲丙；想取防御经卷，先部署乙丙。取卷后免费召回丙，再补另一处镜台，让甲乙共同开启上行。',
    '召回可在本层任意位置执行，回收免费，重新派驻仍花 2 灵息。先取一份经卷再上楼共需三次部署，初始 6 灵息即可完成；莲灯始终在安全中庭。',
    '经卷只取其一。门会随镜台即时开合，但两侧经室与上行走廊都有开放退路，不会把真身困在门后。'
  ];
  const silkPositions=[[5,5],[3,7],[9,7],[10,1],[11,2],[3,4],[3,9],[9,9],[11,3],[11,9],[1,7],[1,3],[7,9],[1,5]];
  silkPositions.forEach(([x,y],i)=>{silk.entities[i].x=x;silk.entities[i].y=y;});
  Object.assign(silk.entities[1],{controlId:'silk-a',group:'silk',label:'甲镜台 · 西影'});
  Object.assign(silk.entities[2],{controlId:'silk-b',group:'silk',label:'乙镜台 · 东影'});
  Object.assign(silk.entities[3],{controls:['silk-a','silk-b'],label:'上行西门 · 甲 + 乙'});
  Object.assign(silk.entities[4],{controls:['silk-a','silk-b'],label:'上行东门 · 甲 + 乙'});
  Object.assign(silk.entities[5],{controls:['silk-a','silk-c'],releaseOnChoice:'silk',label:'破执经门 · 甲 + 丙，取卷后退路常开'});
  silk.entities[13].item='coins';
  silk.entities.push(
    E(6,3,'switch',{controlId:'silk-c',group:'silk',kind:'plate',label:'丙镜台 · 归影'}),
    E(9,4,'gate',{group:'silk',controls:['silk-b','silk-c'],releaseOnChoice:'silk',mode:'all',label:'护心经门 · 乙 + 丙，取卷后退路常开'}),
    E(2,3,'choice',{choice:'silk',option:'atk',label:'破执经卷 · 双愿择一'}),
    E(8,3,'choice',{choice:'silk',option:'def',label:'护心经卷 · 双愿择一'})
  );
  // A choice hidden in an old wall is a new connection as well as a reward.
  floors[0].entities.push(E(7,1,'choice',{choice:'residual',requires:1,blocking:false,label:'余香古炉 · 石生共鸣'}));
  floors[8].map[3]=floors[8].map[3].slice(0,4)+'.'+floors[8].map[3].slice(5);
  floors[8].entities.push(E(4,3,'choice',{choice:'compassion',requires:4,label:'墙中灯魂 · 慈悲共鸣'}));
  const revisits = [
    {id:'stone-incense',relic:0,floor:0,x:7,y:1,title:'山门余香古炉',description:'石生舍利唤醒北侧古炉。一次余香可选恢复 80 生命，或获得 16 功德金。'},
    {id:'bone-bars',relic:1,floor:2,x:9,y:9,title:'古殿东南密室',description:'照骨舍利让青蝉能穿过古殿东南铁栅。密室中仍留有防御 +4 的碧髓灵晶。'},
    {id:'fellowship-cache',relic:2,floor:5,x:1,y:5,title:'禅院同行之匣',description:'三枚舍利使第六层西侧旧匣共鸣。再访可领取防御 +4，为后半程准备。'},
    {id:'compassion-spirit',relic:3,floor:8,x:4,y:3,title:'水牢墙中灯魂',description:'慈悲让第九层旧墙现出灯魂。取灯增加 3 攻击，或还灯恢复 120 生命；这条旧墙也将成为新通路。'},
    {id:'truth-root',relic:4,floor:0,x:11,y:11,title:'归根之匣',description:'五光归一：返回出发处最东侧，取得十八层归根朱门所需的唯一心钥。'}
  ];
  const bossPlans = [
    {id:'direct',label:'执棒破阵',description:'保留攻击，直接迎战三相。无需凝息珠。',cost:{orbs:0}},
    {id:'anchor',label:'定海镇心',description:'消耗 1 凝息珠；攻击 −6，第二相防御 −20，第三相每击伤害减半，最后心火 −40。',cost:{orbs:1}},
    {id:'echoes',label:'毫毛合击',description:'消耗 2 凝息珠；第一相少受两击，第二相每棒伤害 +18，第三相每棒伤害 +8。',cost:{orbs:2}}
  ];
  enemies.heart.phases=[
    {name:'破妄 · 金甲',hp:360,atk:90,def:48,trait:'first'},
    {name:'执念 · 重甲',hp:420,atk:84,def:54,trait:'normal'},
    {name:'归心 · 心火',hp:420,atk:62,def:48,trait:'magic'}
  ];
  enemies.heart.desc='三相连续结算：金甲先手、执念重甲、归心法术；战后心火 80，慈悲减至 72。战前可比较三种准备方案，确认时才消耗凝息珠。';
  items.orb.description='收入行囊。可补满灵息；灯前可换 8 金或 50 生命，也可保留给十八层的临战准备。';
  relics[2].description='四格内可隔墙投影，耗 2 灵息。分身留守镜台；同层可免费召回。千丝庭最多驻守两处，其他旧层不限。';
  relics[2].story='你拔下一根毫毛，另一个你向对岸伸出手。影子可以留下，也能唤回。有些选择，需要先放下已经守住的一端。';
  floors[0].hints[3]='黄钥匙全塔有限。古殿宝室、百锁护心契与其他黄门会竞争同一份资源，能绕行或等待神通时，不必立即消耗。';
  floors[0].hints[4]='青钥匙仅分布在第一、第五、第九层。百锁破甲契与后期青门竞争钥匙；不花钥匙的路线始终存在。';
  floors[0].hints.push('经过阶梯与扳杆不会触发机关。靠近后按 E，或点目标后的交互按钮；踩上莲灯只补息，主动交互才修心。');
  floors[17].objective='完成西杆东台与朱门，比较三种准备的三相总战损，再决定如何面对心猿。';
  floors[17].hints.push('三相并非普通先攻守卫：第一相先手，第二相重甲，第三相法术。凝息珠可换取不同准备；战前可免费逐项比较完整损失。');
  dialogues.waterLesson.lines[2]='分身留守不会随换层消失；同层可免费召回，关联机关会重新计算。第十一层千丝庭仅容两处驻守，需要在三个镜台之间调度。';
  dialogues.finalLesson.lines[2]='心猿连战三相：先手金甲、重甲执念、法术心火，末尾再结算心火。战前比较执棒破阵、定海镇心与毫毛合击，完整损失与灵珠代价都会公开。';
  // Authored hints formerly used array coordinates. All player-facing locations
  // are now one-based, while focus targets remain canonical zero-based data.
  floors.forEach(floor=>{
    floor.hints=floor.hints.map(h=>h.replace(/([（(])(\d+)\s*[,，]\s*(\d+)([）)])/g,(_,open,x,y,close)=>`${open}${Number(x)+1},${Number(y)+1}${close}`));
    floor.hintTargets=floor.entities.filter(e=>['switch','relic','chest','choice'].includes(e.type)).map(e=>({text:e.label||(e.type==='relic'?relics[e.relic].name:'目标'),x:e.x,y:e.y}));
  });
  // Propagate the eighteen-floor geography into narrative instructions.
  for (const dialogue of Object.values(dialogues)) dialogue.lines = dialogue.lines.map(line => line.replaceAll('六层','十八层'));
  dialogues.lantern.lines[0] = '舍利碎了，塔也失了心。五枚碎片分散在第三、第六、第九、第十二与第十五层，各守着一种被遗忘的念头。';
  items.redKey.description = '五舍利唤醒的唯一心钥，用于十八层中央朱门。';
  relics[1].story = '大圣化作一只青蝉。最细的缝隙，原来容得下一段不肯低头的人生。第三层古殿的铁栅正在等待你。';
  relics[4].description = '五舍利共鸣：返回第一层云垂山门，开启归根之匣，取得十八层朱门的唯一心钥。';
  relics[4].story = '所有碎片拼成的不是佛像，而是一颗心。塔心里，锁着你被分割的嗔怒。回到第一层出发的山门，带走完整的自己。';
  /* v3 parallel adaptation. Five heart-seals gate five abilities; the sixteen
     external relics are a narrative total, never sixteen stat-upgrade drops.
     Append new entities after the v2 list so existing saved IDs stay stable. */
  const relicGroups = [3, 3, 3, 3, 4];
  const chapters = [
    {id:0,title:'火眼辨真',floors:[0,1,2],architecture:'mountain',landmark:'黑莲伪佛与照心石狮',relicGroup:3,controls:[],quests:[],objective:'识破黑莲幻墙，重启石生心印。'},
    {id:1,title:'双塔合印',floors:[3,4,5],architecture:'twintowers',landmark:'东西铜塔与合拢的金色檐线',relicGroup:3,controls:['east-tower','west-tower'],quests:[],objective:'校准两层塔影，走完一份百锁契约。'},
    {id:2,title:'弱水同渡',floors:[6,7,8],architecture:'weakwater',landmark:'悬链水牢、两向水纹与莲灯倒影',relicGroup:3,controls:[],quests:['bajie'],objective:'救出八戒，借安全水轮改变渡路。'},
    {id:3,title:'黑莲炼炉',floors:[9,10,11],architecture:'furnace',landmark:'三口铜炉与逐一熄灭的焰窗',relicGroup:3,controls:['furnace-shadow','furnace-latch','silk-a','silk-b','furnace-mercy','furnace-stop'],quests:[],objective:'同时稳定三组炉心，唤醒慈悲心印。'},
    {id:4,title:'七伤善念',floors:[12,13,14],architecture:'scripture',landmark:'破损经壁、白衣善念与归来的灯魂',relicGroup:4,controls:[],quests:[],objective:'在公开代价间选择，取回最后四枚外舍利。'},
    {id:5,title:'无骨归真',floors:[15,16,17],architecture:'blacklotus',landmark:'十六点外环与中央悟空的空位',relicGroup:0,controls:[],quests:[],objective:'胜过三相黑莲化影，认识第十七颗无骨舍利。'}
  ];
  const setTile = (floor,x,y,tile) => { floor.map[y]=floor.map[y].slice(0,x)+tile+floor.map[y].slice(x+1); };
  floors.forEach((floor,index)=>{
    floor.chapter=Math.floor(index/3);
    floor.chapterName=chapters[floor.chapter].title;
    floor.architecture=chapters[floor.chapter].architecture;
    floor.landmark=chapters[floor.chapter].landmark;
    for(const entity of floor.entities)if(entity.type==='npc')entity.archetype='lantern';
  });
  relics.forEach((relic,index)=>{relic.externalCount=relicGroups[index];relic.milestone=index+1;});
  Object.assign(relics[0],{name:'石生心印',title:'第一印 · 破执 · 外舍利三枚',story:'三枚外舍利从伪佛石胎中浮起，结成第一重心印。你不是来替佛像收拾供品，而是来救被黑莲封住的众生。金箍棒应声伸长，云垂山门的古炉也重新透出微光。'});
  Object.assign(relics[1],{name:'照骨心印',title:'第二印 · 见微 · 外舍利六枚',description:'青蝉化形：对相邻铁栅消耗 1 灵息，飞入开闩后返回原格；铁栅永久卸下。双塔共鸣门同时苏醒。',story:'东西铜塔的影子终于叠在一起，又有三枚舍利归于心印。佛与魔的面孔都可能是假，门缝与锁闩却有真实的因果。你化蝉飞去卸锁，再回到原处；两座塔间的旧渡门从此相通。'});
  Object.assign(relics[2],{name:'渡厄心印',title:'第三印 · 同行 · 外舍利九枚',story:'八戒在弱水岸边稳住悬链，三枚舍利沿水光升起。你终于明白：不必让每个人都变成自己，也能有人替你守住另一端。毫毛化影，从此可以留下，也可以唤回。'});
  Object.assign(relics[3],{name:'慈悲心印',title:'第四印 · 息嗔 · 外舍利十二枚',description:'被动慈悲护持：每次法术反击少损失 8 生命；最终心火少损失 8。三组炉心同步熄灭后才可觉醒。',story:'三组炉心终于一同熄灭，炉中三枚舍利脱离黑莲。点灯僧把灯递进你的掌心：“我只是你看见苦难后，仍愿停下的那一念。”灯下没有第二道影子，那一点慈悲原来始终在你心中。'});
  Object.assign(relics[4],{name:'明心心印',title:'第五印 · 归真 · 外舍利十六枚',description:'十六枚外舍利与五重心印齐聚。返回第一层归根之匣取得心钥，再去十八层；中央的第十七个位置仍然空着。',story:'最后四枚外舍利从无字经壁中显形。十六点金光围成一环，中央却没有任何宝物。白衣无天没有替你说出答案：无骨者不在别处。先回第一层取心钥，再去看看，自己愿意为谁承担最后一击。'});
  dialogues.lantern={title:'灯下有名',speaker:'点灯僧',archetype:'lantern',lines:[
    '无天的黑莲把十六枚外舍利封进五重心印，又用众生的记忆筑成这十八层塔。乔灵儿在塔外等你。先把困在这里的人带出去，别让那些名字也化成一堵墙。',
    '五重心印分守第三、六、九、十二、十五层，依次藏着三、三、三、三、四枚外舍利。每解开一印，都会唤回一种神通；灵晶与功德才决定每一棒的轻重。',
    '火眼辨真免费，只揭穿幻象，不改写真实战损。敌人不重生；生命、钥匙、功德都有限。先看清代价，再决定往哪边走。莲灯可免费补满灵息。'
  ]};
  dialogues.rootChest={title:'归根之匣',speaker:'山门石刻',archetype:'stone',lines:[
    '“五印归一，初心为钥。”集齐五重心印、十六枚外舍利后，这里会给出唯一的归根心钥。它只开第十八层的朱门。',
    '“外环十六，中央留空。匣中有钥，无骨无藏。”最末一行已经磨损，只剩一道与你身形相似的刻痕。'
  ]};
  dialogues.bridge={title:'力能架桥，不能平定弱水',speaker:'断桥古碑',archetype:'stone',lines:[
    '石生心印唤醒金箍棒。对相邻浅断口施术，消耗 1 灵息，永久留下桥。黑色深弱水另有水脉，不能用棒架桥。',
    '古殿西南朱砂灵晶可以花黄钥走近路，也可以先取得心印再从北侧架桥。不是每道门都必须立即打开。'
  ]};
  dialogues.mirrorLesson={title:'青蝉卸锁，真身不移',speaker:'照骨壁画',archetype:'stone',lines:[
    '第二重照骨心印需要第四层东塔与第六层西塔同时校准。各塔只需激活一次，跨层与读档都保留状态。',
    '青蝉之变消耗 1 灵息，飞过相邻铁栅、卸下内锁，再回原格。栅栏永久消失。它不能穿石墙，也不能代替钥匙打开彩色门。'
  ]};
  dialogues.waterLesson={title:'八戒守岸，你来渡厄',speaker:'水牢石简',archetype:'bajie',lines:[
    '第七层西北缝院困着八戒。救援不收费，但你要先化蝉卸栅，算清通向他的守卫损失。他稳住水脉后，第八层水轮才会响应。',
    '第八层南庭的水轮可以自由切换低、高水位。低水西渡先面对傀儡与余毒；高水东渡先面对法术灯魂。轮、莲灯与下楼梯始终相连；水位不会自行计时变化。',
    '此层仍需西北扳杆与中央镜台共同开启东南水闸。渡厄心印解锁毫毛分身：四格内投影，耗 2 灵息，留守跨层保存，同层免费召回。'
  ]};
  dialogues.alchemy={title:'三炉同熄',speaker:'点灯僧',archetype:'lantern',lines:[
    '黑莲把舍利当成炉薪。第十层照影镜台与落子杆是第一炉；第十一层甲乙两影是第二炉；这里慈心镜台与止火杆是第三炉。三组都稳定，慈悲心印才会脱离炉心。',
    '千丝庭最多两处分身。甲丙取攻击卷，乙丙取防御卷，双卷只取一份；取卷后召回丙、留下甲乙。免费召回不退灵息，重新派驻仍耗 2 点。',
    '不需要计时赶路。用途中莲灯补满灵息，再检查三炉进度。外面熄灭的火窗会记得你的安排。'
  ]};
  dialogues.compassion={title:'灯从何来',speaker:'点灯僧',archetype:'lantern',lines:[
    '“我是这座塔映出的一个念头。”点灯僧把灯向前递来，“你看过苦难，却仍愿意停下。那一念慈悲，才让我有了形状。”',
    '“白衣人守着无天未灭的善念。我守着的，是你经过苦难时，仍肯停下的一瞬。黑莲可以囚住记忆，却没能把那一瞬烧尽。”',
    '“带走灯，也带走愤怒。温柔要有敢反抗的力量；力量也要记得它想保护谁。”'
  ]};
  dialogues.library={title:'经壁留下的路',speaker:'无字经卷',archetype:'tangseng',lines:[
    '无字经门需要西北镜台与东南扳杆。镜台仍可在四格内隔墙投影，桥与青蝉分别提供东方的两条上行路线。',
    '若你在七伤路亲自护送受困者，唐僧的映身会打开西北援手侧门。它能绕过藏经无相，但不能代替经门的两处机关。没有救援也有原路，真实战损始终公开。',
    '明心心印藏着最后四枚外舍利。五印齐聚后回第一层最东侧归根匣拿心钥，再往十八层。'
  ]};
  dialogues.truth={title:'十六之外',speaker:'白衣无天',archetype:'whiteWutian',lines:[
    '“我从无天未灭的善念中走来。”白衣人没有让你跪拜，“我能开一扇门，却不能替人作最后的选择。点灯人认得你的心，我仍记得无天未曾沉没的那一面。”',
    '“十六枚外舍利已在路上。中央缺的那一点，没有骨，没有匣，也没有守卫能替你保管。”',
    '“黑莲化影会让你看见三种执念。胜过它以后，你可以化身无骨舍利，把塔外的路打通；也可以留下守住塔门。不论往哪边走，都别再把自己的心留在身后。”'
  ]};
  dialogues.finalLesson={title:'先算清，再承担',speaker:'塔心铭文',archetype:'stone',lines:[
    '西路用金箍棒架桥、亲手扳止战杆；东路化蝉卸栅、留下归心分身。两者同响，中央心门才开。朱门另需第一层归根心钥。',
    '黑莲化影连续三相：金甲先手、重甲执念、法术心火，末尾再结算心火。三种临战准备的完整损失、凝息珠费用可免费比较，确认战斗才扣珠。',
    '胜利后走到北端无骨莲台。十六枚外舍利只能点亮外环；中央之位，等的从来不是另一件宝物。先站在那里，再决定这道光该通向何处。'
  ]};
  dialogues.bajie={title:'先把绳握住',speaker:'猪八戒',archetype:'bajie',lines:[
    '“猴哥，可算来了。俺老猪不是怕水——这水把人的念头都往下拽。”八戒攥着一截悬链，“把牢扣解开，俺替你稳住两岸，别再一个人往前冲。”',
    '救援免费并永久生效：开启下一层水轮与第九层心印的渡路条件。它不恢复生命，也不给额外属性。'
  ]};
  dialogues.whiteGoodness={title:'善念有自己的名字',speaker:'白衣无天',archetype:'whiteWutian',lines:[
    '“一个人的恶，不会使他曾有的善变成谎言。”白衣人站在熄火的莲台上，“唐僧他们在七伤路护送众生，黑莲便把他们的映身困在此地。乔灵儿在塔外，每一次呼唤都被这里的经壁吞去了。”',
    '“下一层，亲自护送要耗去你 70 生命，他们脱困后会替你开经阁侧门。也可交我 20 功德，借碧髓护关，换你防御 +4。若都不愿，原路仍在——走哪条，先算清自己能承担什么。”'
  ]};
  dialogues.sevenWounds={title:'七伤路账簿',speaker:'唐僧的映身',archetype:'tangseng',lines:[
    '护送要承担 70 生命代价，生命不足时不会扣费，更不会让你死于选择。唐僧、哪吒与乔灵儿的受困映身会共同离开，随后为你打开第十五层西北援手侧门。',
    '若选择白衣守关，则花 20 功德获得防御 +4，三名映身暂留灯下等待塔劫结束。它不扣生命，也不打开援手侧门。原经门与正面守卫仍可通行。'
  ]};
  dialogues.emptyRing={title:'外环十六，中央无骨',speaker:'乔灵儿的映身',archetype:'qiao',lines:[
    '“在塔外的人，也听得见这里的灯。”少年望着十六点金光，“救来的每个名字都会被记住，但你不必先赢得所有人的赞美，才有资格走到最后。”',
    '这座莲阵还缺中央一位。五印已经齐全；第十七颗不会再以拾取物出现。'
  ]};
  // Three optional fire-eye passages teach truth without falsifying enemies.
  [[0,6,9,'山门幻壁 · 照见东西旧径'],[1,8,9,'残钟幻壁 · 西东回廊相接'],[2,4,7,'石胎幻壁 · 古殿侧廊']].forEach(([f,x,y,label])=>{
    setTile(floors[f],x,y,'.');floors[f].entities.push(E(x,y,'illusion',{label,name:label,revealText:'火眼映出黑莲纹：这是一层幻壁。免费辨真后，此格永久成为可行通路。'}));
  });
  floors[0].intro='本作是《西游记后传》启发的平行篇章。无天劫中，十六枚外舍利被黑莲锁入五重心印。悟空踏进十八层幻塔，塔外的乔灵儿与塔内的众生都在等一条归路。';
  floors[0].subtitle='第一章 · 火眼辨真';
  floors[0].objective='先看战损、取灵晶；火眼免费揭开南部幻壁。前往第三层开启石生心印。';
  floors[0].hints.unshift('火眼辨真免费。南部中央（7,10）的黑莲幻壁被识破后会永久开路，敌情计算不会被幻象改写。');
  floors[1].intro='伪佛像的脸朝着西钟，影子却落在东廊。火眼看见墙缝中的黑莲纹；钟门仍须真正的扳杆来开。';
  floors[1].objective='启钟扳杆接通双钟门；辨真南部幻壁，选择回廊或钥匙捷径。';
  floors[1].hints.push('南部（9,10）的幻壁免费辨真可开出横向连廊。辨真只改变幻象，不能代替北门扳杆。');
  floors[2].intro='古殿石胎的胸中，三枚外舍利围着一个空洞缓缓转动。石狮的眼睛终于映出你的脸。';
  floors[2].objective='比较石胎守卫与可绕行成长，取得三枚外舍利与石生心印；金箍棒可回访山门。';
  floors[2].hints.push('中西侧（5,8）还有一层幻壁。免费辨真会连接古殿侧廊，但深断口仍需第一印解锁的金箍棒。');
  // Cross-floor state uses control IDs, while existing IDs and array order stay.
  floors[3].entities.push(E(9,3,'resonator',{controlId:'east-tower',label:'东塔照骨轴 · 校准后永久接通',name:'东塔照骨轴'}));
  floors[5].entities.push(E(3,3,'resonator',{controlId:'west-tower',label:'西塔照骨轴 · 校准后永久接通',name:'西塔照骨轴'}));
  floors[5].entities.find(e=>e.type==='relic').requiresControls=['east-tower','west-tower'];
  floors[3].entities.push(E(8,11,'portal',{to:5,tx:8,ty:11,requires:2,requiresControls:['east-tower','west-tower'],label:'合塔渡门 · 双轴与第二印共鸣'}));
  floors[5].entities.push(E(8,11,'portal',{to:3,tx:8,ty:11,requires:2,requiresControls:['east-tower','west-tower'],label:'合塔渡门 · 返回东塔栈道'}));
  floors[3].intro='断云间浮着两座不相触的铜塔。一根金色檐线在高处断开；第四层的东轴只照亮半片塔影。';
  floors[3].objective='为北侧断云架桥，校准东塔照骨轴；继续经第五层契约，寻找第六层西轴。';
  floors[3].hints.push('东塔轴在（10,4），免费激活、永久保存。另一半位于第六层西北（4,4）；第二印要求两轴都接通。南庭渡门在第二印后才可用，不会跳过第五层三契。');
  floors[4].intro='三座锁廊夹在铜塔的两道投影之间。你可借一枚钥匙换一条成长方向，也能亲自承担无钥路的两场战斗。';
  floors[5].intro='西塔的檐影压在照骨壁画上。两轴相合，三枚外舍利才肯从佛像的骨缝里出来。';
  floors[5].objective='校准西塔照骨轴，并确认第四层东轴已接通；开启照骨心印、解锁青蝉与合塔渡门。';
  floors[5].hints.unshift('西轴在（4,4）。照骨心印同时检查第四层东轴；若遗漏，返回激活即可，不会重复扣资源。取得第二印后南庭渡门直通第四层。');
  // Rescue is a persistent gate to the water system, not a following NPC AI.
  floors[6].name='弱水缝院';floors[6].subtitle='第三章 · 先救守岸人';
  floors[6].intro='水牢的锁缝只容一只青蝉。八戒在西北院攥着悬链，水面上的莲影却被黑色波纹一遍遍吞下。';
  floors[6].entities.push(E(1,3,'rescue',{quest:'bajie',archetype:'bajie',name:'猪八戒',dialogue:'bajie',label:'解救八戒 · 免费，永久稳住水脉'}));
  floors[6].entities.find(e=>e.type==='stairs'&&e.to===7).requiresQuests=['bajie'];
  floors[6].objective='化蝉穿过铁栅，抵达西北院救八戒；他稳住水脉后才可进入弱水梵井。';
  floors[6].hints.unshift('八戒在西北（2,4）。救援不花生命、金钱或钥匙，但到达前要规划铁栅与守卫。营救后水脉永久稳定，可开启第八层水轮及第九层心印。');
  const weakwater=floors[7];
  weakwater.name='弱水梵井';weakwater.subtitle='第三章 · 一轮两渡';
  weakwater.map=[
    '#############','#...........#','#.###.#.###.#','#...#.......#',
    '###w#.#.#w###','#...#...#...#','###.#####.###','###w#####w###',
    '###.#####.###','#...........#','#.####.####.#','#...........#','#############'
  ];
  weakwater.waterTiles=[{x:3,y:7,openWhen:'low'},{x:3,y:4,openWhen:'low'},{x:9,y:7,openWhen:'high'},{x:9,y:4,openWhen:'high'}];
  weakwater.tideGroup='weakwater';weakwater.defaultTide='low';
  const waterPositions=[[7,11],[5,5],[10,1],[11,2],[3,6],[9,6],[3,3],[9,5],[1,5],[7,5],[3,5],[6,11],[11,1]];
  waterPositions.forEach(([x,y],index)=>{weakwater.entities[index].x=x;weakwater.entities[index].y=y;});
  weakwater.entities.push(E(6,9,'tide',{group:'weakwater',requireQuest:'bajie',name:'八戒稳水轮',label:'稳水轮 · 低水西渡 / 高水东渡'}));
  weakwater.intro='八戒稳住两岸悬链，水轮终于能停在你选定的位置。西渡在低水时浮出，东渡在高水时连通；回头路没有倒计时。';
  weakwater.objective='在安全南庭切换水位，比较西渡傀儡与东渡灯魂；抵达定风杆，开启北端双门。';
  weakwater.hints=[
    '水轮在（7,10），南庭莲灯在（8,12），下楼梯在（7,12）。这三处始终相通。低水开西渡（4,8），高水开东渡（10,8），不会自动涨落。',
    '低水西渡先面对傀儡，继续向西北还有余毒蛇使；高水东渡先面对法术灯魂。北部中庭连通两岸，成长与治疗可以先拿再回头挑战另一岸。',
    '黑色深弱水不能架棒。所有水位变化都在轮旁主动执行，切换前会检查安全退路；返回水轮再换渡路，不会把自己困在水里。',
    '中央定风杆在（6,6），仍需亲手激活才开上行门。八戒只是稳水，不会替你打怪、加属性或重置生命。'
  ];
  floors[8].entities.find(e=>e.type==='relic').requiresQuests=['bajie'];
  floors[8].intro='八戒的悬链延伸到水牢深处。被困的灯魂仍举着灯，三枚舍利的倒影正从弱水中央抬头。';
  floors[8].objective='借已稳定的水脉取渡厄心印；安排分身与扳杆开水闸，并记住慈悲后可重访的灯魂。';
  // One furnace condition per previous puzzle, all visible and reversible.
  Object.assign(floors[9].entities[1],{controlId:'furnace-shadow'});
  Object.assign(floors[9].entities[2],{controlId:'furnace-latch'});
  Object.assign(floors[11].entities[11],{controlId:'furnace-mercy'});
  Object.assign(floors[11].entities[12],{controlId:'furnace-stop'});
  floors[11].entities.find(e=>e.type==='relic').requiresControls=[...chapters[3].controls];
  floors[9].intro='第一口铜炉占住棋坪背后。西镜台与东扳杆的光线接通时，炉壁的火窗才会暗下一对。';
  floors[9].objective='西台留影、东杆落子，稳定第一炉；状态将与十一、十二层炉心一同检查。';
  floors[9].hints.push('第一炉绑定此层照影镜台与落子杆。跨层保存；最后在第十二层检查三炉共六处机关，召回旧分身会让对应炉窗重燃。');
  floors[10].intro='第二口铜炉垂下三束丝线，只容两道毫毛留守。甲乙稳住炉心，甲丙或乙丙则短暂打开两份不同经愿。';
  floors[10].hints.push('甲乙同时驻守既开上行，也熄第二炉。取卷后重新留下甲乙再离开；若日后召回其中一影，第十二层心印也会重新要求你补齐。');
  floors[11].intro='第三口铜炉在塔心投下黑莲的影子。你已在前两层安排了自己；现在要把三口炉火一起放下，才能带走炉中的三枚舍利。';
  floors[11].objective='同步第十层西台东杆、第十一层甲乙、第十二层慈台止火杆，稳定三炉并唤醒慈悲心印。';
  floors[11].hints.unshift('慈悲心印检查三组炉心：10层照影台＋落子杆、11层甲＋乙、12层慈心台＋止火杆。已完成状态跨层保留；若缺一项，可按进度提示回层补齐。');
  // A meaningful optional rescue trades finite life for a real bypass; the
  // defence alternative reuses the old emerald budget instead of adding +4.
  floors[12].entities.push(E(4,11,'npc',{dialogue:'whiteGoodness',name:'白衣无天',archetype:'whiteWutian'}));
  floors[12].intro='炉火熄灭后，白衣人从黑莲的影子里走出。他不是点灯僧，而是无天未灭的善念。破损经壁上，七伤路的呼唤渐渐有了名字。';
  floors[12].objective='用慈悲心印比较两条战斗路线；听白衣善念说明七伤护送的公开代价。';
  floors[12].hints.push('白衣无天在南庭（5,12），他与点灯僧是独立人物。下一层七伤护送可用生命换真实通路，也可用功德换原碧髓的防御。两种都不是必选。');
  choices.sevenWounds={title:'七伤同行 · 谁来承担',grant:'immediate',description:'塔内是唐僧、哪吒与乔灵儿的受困映身。亲自护送花 70 生命，救出三者并打开下一层西北援手侧门；或花 20 功德请白衣善念守关，把原碧髓炼成防御 +4。也可暂不选择，走原本守卫路线。两选互斥，没有隐藏善恶值。',options:[
    {id:'rescue',label:'亲自护送 · 生命换援手',description:'花费 70 生命，三名映身脱困；第十五层援手侧门开启，可绕过藏经无相。原经门的镜台与扳杆仍需完成。救援名字会进入归心回顾。',cost:{hp:70},reward:{rescue:['tangseng','nezha','qiao'],quests:{sevenWounds:true,sevenRescue:true}}},
    {id:'power',label:'白衣守关 · 功德换防御',description:'花费 20 功德，永久防御 +4。三名映身暂留灯下等待塔劫结束，援手侧门保持关闭；仍可按公开战损走原守卫路线。',cost:{coins:20},reward:{def:4,quests:{sevenWounds:true}}}
  ]};
  Object.assign(floors[13].entities[11],{type:'monument',dialogue:'sevenWounds',name:'七伤路账簿'});
  delete floors[13].entities[11].item;
  floors[13].entities.push(E(1,10,'choice',{choice:'sevenWounds',blocking:false,label:'七伤护送台 · 70生命救人 / 20功德修身'}));
  floors[13].intro='问心碑上没有判词，只有三个人的名字。唐僧的映身说：要不要救、拿什么救，都应该由活着的人自己看清。';
  floors[13].objective='选择是否护送七伤映身；完成问心扳杆，打开断碑双门。救援与成长均为可选。';
  floors[13].hints.push('西南护送台在（2,11）。亲送：损失70生命，开下一层援手侧门；白衣守关：花20功德得防御+4。两选只可取一，也可暂时离开、以后回来决定。');
  setTile(floors[14],2,3,'.');
  floors[14].entities.push(E(2,3,'gate',{requiresQuests:['sevenRescue'],label:'援手侧门 · 七伤亲送后开启'}));
  floors[14].entities.find(e=>e.type==='npc').dialogue='truth';
  Object.assign(floors[14].entities.find(e=>e.type==='npc'),{name:'白衣无天',archetype:'whiteWutian'});
  floors[14].intro='经壁上最后四枚外舍利一一显形。白衣善念停在门外；若七伤映身已经获救，一道原本封死的侧门会为你打开。';
  floors[14].objective='镜台与扳杆开经门，选择正面守卫或已解锁的援手侧路，唤醒明心心印、收齐十六枚外舍利。';
  floors[14].hints.push('西北援手侧门在（3,4），仅七伤亲送开启。它让你从上侧绕过藏经无相；未救援仍可走原路。无论选哪条，主线不要求隐藏道德值。');
  floors[15].intro='五重心印带着十六枚外舍利一同亮起。逆莲天梯的中央仍是空的，你第一次意识到：最后的答案不是“再找到一件东西”。';
  floors[15].objective='回第一层取得归根心钥，再完成西杆东台逆莲机关；记录剩余资源，为三相总战损做准备。';
  floors[15].hints[0]='五重心印与十六枚外舍利不会直接给出红钥匙。返回第一层最东侧归根匣，完成共鸣后取唯一心钥。';
  floors[16].intro='无生门的十六点光环围住一处空位。你救过的名字落在灯上；没有救到的人，也不该成为这次旅途无声的代价。';
  floors[16].entities.push(E(8,11,'npc',{name:'乔灵儿的映身',dialogue:'emptyRing',archetype:'qiao'}));
  floors[17].name='无骨莲心';floors[17].subtitle='第六章 · 外环十六，中心归来';
  floors[17].intro='黑莲把你一路的怀疑塑成心猿。十六枚外舍利悬在外环，中央没有宝物，只有与你一样的剪影。';
  floors[17].objective='开朱门、比较三相准备并战胜黑莲化影；到北端无骨莲台觉醒自身第十七颗，再选择破劫或守塔。';
  Object.assign(floors[17].entities.find(e=>e.type==='finale'),{label:'无骨莲台 · 战后觉醒自身第十七颗',name:'无骨莲台'});
  Object.assign(enemies.heart,{name:'黑莲化影 · 心猿',lore:'黑莲以悟空的记忆塑出的三相守卫。击败它不是消灭自己的愤怒，而是决定把力量交给谁。'});
  enemies.heart.phases[0].name='破妄 · 伪佛金甲';
  enemies.heart.phases[1].name='执念 · 黑莲重壳';
  enemies.heart.phases[2].name='归心 · 无骨心火';
  // Lamp choice now remembers an actual rescued soul, without morality locks.
  choices.compassion.options.find(o=>o.id==='release').reward.rescue=['waterSoul'];
  choices.compassion.options.find(o=>o.id==='release').reward.quests={waterSoulFreed:true};
  choices.residual.description='石生心印使第一层余香古炉复明。残香只余一缕：可为自己疗伤，也可化为功德金，只能选择一次。';
  choices.compassion.description='慈悲心印使第九层石壁中的灯魂现形。取灯芯可增长攻击，归还灯火则救出灯魂并获得一次祝福。结果公开，两选都能打通旧墙；没有隐藏道德锁。';
  items.redKey.description='五重心印与十六枚外舍利唤醒的唯一心钥，只用于十八层归根朱门。';
  // Consistent player language, including labels authored before this revision.
  const heartSealTerms = value => {
    if(typeof value==='string')return value
      .replaceAll('石生舍利','石生心印').replaceAll('照骨舍利','照骨心印').replaceAll('渡厄舍利','渡厄心印').replaceAll('慈悲舍利','慈悲心印').replaceAll('明心舍利','明心心印')
      .replaceAll('五枚舍利','五重心印').replaceAll('五舍利','五印').replaceAll('三枚舍利使','三重心印使').replaceAll('三舍利','三印').replaceAll('四舍利','四印')
      .replaceAll('第一枚舍利','第一重心印').replaceAll('第二枚舍利','第二重心印').replaceAll('第五枚舍利','第五重心印').replaceAll('分身舍利','渡厄心印')
      .replaceAll('第九层得到分身心印','第九层觉醒渡厄心印');
    if(Array.isArray(value))return value.map(heartSealTerms);
    if(value&&typeof value==='object')for(const key of Object.keys(value))value[key]=heartSealTerms(value[key]);
    return value;
  };
  // Only legacy source strings are normalized. Explicit v3 external counts are
  // already correct and must not be turned into three additional heart-seals.
  [floors,enemies,items,choices,revisits,bossPlans].forEach(heartSealTerms);
  floors[0].entities.find(e=>e.type==='chest'&&e.item==='redKey').label='归根之匣 · 五印十六舍利共鸣，取得十八层心钥';
  floors[15].entities.find(e=>e.type==='seal').label='五印莲门 · 五重心印与十六枚外舍利齐聚';
  floors[17].entities.find(e=>e.type==='seal').label='五印心门 · 十六外舍利已归位';
  revisits[0].description='石生心印使山门古炉与石狮眼复明。一次余香可选恢复 80 生命，或获得 16 功德金。';
  revisits[1].description='照骨心印让青蝉能卸下古殿东南铁栅。密室中仍有防御 +4；双塔南庭渡门也已永久开启。';
  revisits[2].description='第三重心印使第六层西侧同行匣共鸣，可领取防御 +4。分身回访不会自动替你作战。';
  revisits[3].description='慈悲让水牢旧墙的灯魂现形。取灯攻击 +3；还灯恢复 120 生命并救出灯魂。两选都打开旧墙，救援也进入最终回顾。';
  revisits[4].description='五重心印、十六枚外舍利齐聚：回第一层最东归根匣取得心钥。第十七颗尚未觉醒，它不是匣中物。';
  floors.forEach(floor=>{
    floor.hintTargets=floor.entities.filter(e=>['switch','relic','chest','choice','illusion','resonator','rescue','tide','portal'].includes(e.type)).map(e=>({text:e.label||(e.type==='relic'?relics[e.relic].name:'目标'),x:e.x,y:e.y}));
    // New names are reflected in every stair label, including old saved IDs.
    floor.entities.filter(e=>e.type==='stairs').forEach(e=>{e.label=(e.to>floor.id?'上行 · ':'下行 · ')+floors[e.to].name;});
  });
  const unifyTerms = object => {
    for (const key of Object.keys(object)) {
      const value = object[key];
      if (typeof value === 'string') object[key] = value.replaceAll('灵力','灵息').replaceAll('回元丹','随身蟠桃').replaceAll('凝神珠','凝息珠').replaceAll('功德钱','功德金').replaceAll('息灵坛','灵息坛');
      else if (value && typeof value === 'object') unifyTerms(value);
    }
  };
  [floors,enemies,items,relics,dialogues,choices,revisits,bossPlans].forEach(unifyTerms);
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
  /* v4: each floor is a hand-authored group of halls, courtyards and wings.
     Rectangles and polylines below are authoring primitives, not a generator.
     Existing entities retain their IDs while the geography is rebuilt. */
  const fragmentGroups=[[0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14,15]];
  const treasures={
    iron:{name:'定海铁',description:'攻击 +6，防御 −3。'},
    lotus:{name:'莲灯芯',description:'法术每击伤害 −6，攻击 −2。'},
    tide:{name:'听潮贝',description:'整场战损取 90% 向下取整；战利功德金取 75% 向下取整。'},
    thorn:{name:'照骨齿',description:'先攻守卫少一次先手攻击，防御 −2。'},
    mirror:{name:'双影镜',description:'分身耗 1 灵息，架桥与化蝉耗 2 灵息；每棒反震 −2，攻击 −2。'},
    ember:{name:'心炉烬',description:'每相首棒伤害 +18，整场战后额外损失 8 生命。'}
  };
  // A small, finite side-grade collection. Exact battle effects are owned by
  // TowerRules so previews, equipment and settlement share one source of truth.
  const chamberPlans=[
    {rooms:[[7,15,13,19],[1,8,6,12],[8,6,12,10],[14,8,19,12],[14,1,19,5],[8,1,11,3]],paths:[[[10,17],[4,17],[4,10]],[[10,17],[17,17],[17,10]],[[4,10],[10,10],[10,8]],[[10,8],[10,2]],[[17,10],[17,3]],[[10,2],[17,2]]],fragment:'nw',join:[4,10],exit:[18,1],landmark:'buddha'},
    {rooms:[[7,16,13,19],[1,7,5,12],[8,8,12,13],[15,9,19,14],[8,1,12,5],[15,1,19,5]],paths:[[[10,18],[10,11]],[[10,11],[3,11],[3,8]],[[3,8],[3,6],[10,6],[10,3]],[[10,3],[17,3]],[[17,3],[17,11]],[[17,11],[17,18],[10,18]],[[10,11],[14,11],[17,11]]],fragment:'sw',join:[3,10],exit:[18,1],landmark:'buddha',treasure:'iron'},
    {rooms:[[7,15,13,19],[1,8,6,13],[8,7,12,11],[14,8,19,13],[1,1,6,5],[8,1,12,4]],paths:[[[10,18],[4,18],[4,10]],[[10,18],[17,18],[17,10]],[[4,10],[4,3]],[[4,3],[10,3]],[[10,3],[10,9]],[[10,9],[17,9]]],fragment:'ne',join:[10,3],exit:[10,1],landmark:'buddha'},
    {rooms:[[7,16,13,19],[1,9,6,13],[8,7,12,11],[14,9,19,13],[1,1,5,5],[14,1,19,5]],paths:[[[10,18],[4,18],[4,11]],[[4,11],[10,11],[10,9]],[[10,9],[17,9],[17,3]],[[17,3],[10,3],[10,9]],[[4,11],[3,11],[3,3]]],fragment:'se',join:[17,11],exit:[18,1],landmark:'pagoda'},
    {special:'contracts',fragment:'nw',join:[10,3],exit:[18,1],landmark:'pagoda',treasure:'lotus'},
    {rooms:[[7,16,13,19],[1,8,5,12],[8,7,12,12],[15,8,19,12],[1,1,6,5],[8,1,12,4]],paths:[[[10,18],[10,10]],[[10,10],[3,10]],[[3,10],[3,3]],[[3,3],[10,3]],[[10,3],[10,10]],[[10,10],[17,10]],[[17,10],[17,16],[10,16]]],fragment:'ne',join:[10,3],exit:[10,1],landmark:'pagoda'},
    {rooms:[[7,16,13,19],[1,8,5,12],[8,8,12,12],[15,8,19,13],[14,1,19,5],[8,1,12,4]],paths:[[[10,18],[3,18],[3,10]],[[3,10],[10,10]],[[10,10],[17,10]],[[17,10],[17,3]],[[17,3],[10,3]],[[10,3],[10,10]]],fragment:'nw',join:[3,10],exit:[18,1],landmark:'dragon'},
    {special:'water',fragment:'nw',join:[4,10],exit:[18,1],landmark:'dragon',treasure:'tide'},
    {rooms:[[7,16,13,19],[1,8,5,12],[8,7,12,12],[15,8,19,12],[1,1,6,5],[8,1,12,4]],paths:[[[10,18],[10,10]],[[10,10],[3,10],[3,3]],[[3,3],[10,3]],[[10,3],[10,10]],[[10,10],[17,10]],[[17,10],[17,17],[10,17]]],fragment:'ne',join:[10,3],exit:[10,1],landmark:'dragon'},
    {rooms:[[7,16,13,19],[1,8,6,12],[8,8,12,12],[14,8,19,12],[14,1,19,5],[8,1,12,4]],paths:[[[10,18],[4,18],[4,10]],[[4,10],[10,10]],[[10,10],[17,10],[17,3]],[[17,3],[10,3]],[[10,3],[10,10]],[[17,10],[17,18],[10,18]]],fragment:'nw',join:[4,10],exit:[18,1],landmark:'furnace'},
    {special:'silk',fragment:'sw',join:[4,10],exit:[10,1],landmark:'furnace',treasure:'thorn'},
    {rooms:[[7,16,13,19],[1,8,5,12],[8,7,12,11],[15,8,19,12],[1,1,6,5],[8,1,12,4]],paths:[[[10,18],[3,18],[3,10]],[[3,10],[10,10],[10,9]],[[10,9],[17,9]],[[17,9],[17,16],[10,16]],[[10,9],[10,3]],[[10,3],[3,3]],[[3,3],[3,10]]],fragment:'ne',join:[10,3],exit:[10,1],landmark:'furnace'},
    {rooms:[[7,16,13,19],[1,8,6,13],[8,8,12,12],[14,9,19,13],[14,1,19,5],[8,1,12,4]],paths:[[[10,18],[10,10]],[[10,10],[4,10]],[[4,10],[4,6],[10,6],[10,3]],[[10,3],[17,3]],[[17,3],[17,11]],[[17,11],[10,11]]],fragment:'nw',join:[4,10],exit:[18,1],landmark:'scripture'},
    {rooms:[[7,16,13,19],[1,8,5,12],[8,7,12,11],[15,8,19,12],[1,1,6,5],[8,1,12,4]],paths:[[[10,18],[3,18],[3,10]],[[3,10],[10,10],[10,9]],[[10,9],[17,9]],[[17,9],[17,17],[10,17]],[[10,9],[10,3]],[[10,3],[3,3]]],fragment:'ne',join:[10,3],exit:[10,1],landmark:'scripture',treasure:'mirror'},
    {rooms:[[7,16,13,19],[1,8,6,12],[8,7,12,11],[14,8,19,12],[1,1,6,5],[14,1,19,5]],paths:[[[10,18],[4,18],[4,10]],[[4,10],[4,3]],[[4,3],[10,3],[10,9]],[[10,9],[17,9],[17,3]],[[17,3],[10,3]],[[17,9],[17,18],[10,18]]],fragment:'se',join:[17,10],exit:[18,1],landmark:'scripture'},
    {rooms:[[7,16,13,19],[1,9,6,13],[8,7,12,11],[14,9,19,13],[1,1,6,5],[14,1,19,5]],paths:[[[10,18],[4,18],[4,11]],[[4,11],[4,3]],[[4,3],[10,3],[10,9]],[[10,9],[17,9],[17,3]],[[17,3],[10,3]],[[17,9],[17,18],[10,18]]],fragment:null,exit:[18,1],landmark:'blacklotus'},
    {rooms:[[7,16,13,19],[1,8,5,12],[8,7,12,12],[15,8,19,12],[1,1,6,5],[14,1,19,5]],paths:[[[10,18],[10,10]],[[10,10],[3,10],[3,3]],[[3,3],[10,3],[17,3]],[[17,3],[17,10]],[[17,10],[10,10]],[[17,10],[17,18],[10,18]]],fragment:null,exit:[18,1],landmark:'blacklotus',treasure:'ember'},
    {special:'final',fragment:null,exit:[10,1],landmark:'blacklotus'}
  ];
  const built=[];
  const army=['imp','bat','acolyte','bell','viper','brass','water','puppet','crab','alchemist','flame','furnace','mirror','ink','sentinel','shade','wrath','shade'];
  const vaultFor=side=>({nw:{rect:[1,1,6,6],inside:[2,2,4,4],at:[3,3],mouth:[5,3],out:[6,3]},ne:{rect:[14,1,19,6],inside:[16,2,18,4],at:[17,3],mouth:[15,3],out:[14,3]},sw:{rect:[1,14,6,19],inside:[2,15,4,17],at:[3,16],mouth:[5,16],out:[6,16]},se:{rect:[14,14,19,19],inside:[16,15,18,17],at:[17,16],mouth:[15,16],out:[14,16]}}[side]);
  const chapterTypes=['buddha','pagoda','dragon','furnace','scripture','blacklotus'];
  // All new healing and loose money replace old supplies. No expansion bonus.
  for(const item of Object.values(items))if(item.kind==='hp')item.value=Math.round(item.value*.75);
  items.peach.description='立即恢复 45 生命。';items.bigPeach.description='立即恢复 90 生命。';items.feast.description='立即恢复 135 生命。';
  items.coins.value=9;items.coins.description='获得 9 功德金，可在灵息坛换取成长或治疗。';
  const allOldGold=Object.values(enemies).filter(e=>e.gold>0);
  allOldGold.forEach(e=>{e.gold=Math.max(1,Math.round(e.gold*.64));});
  const eliteNames=['镇海猿卫','六叶铜僧','沉渊龙姬','离火执炉者','无字明王','余烬黑将'];
  const eliteBase=['stone','brass','crab','furnace','sentinel','wrath'];
  eliteBase.forEach((id,c)=>{enemies['reliquary'+c]={...enemies[id],name:eliteNames[c],hp:Math.round(enemies[id].hp*1.2),gold:enemies[id].gold,lore:'它只守一件可改变战斗取舍的旧宝。宝物不增加基础属性，守卫不会重生。',desc:enemies[id].desc+' 击败后进入宝龛取得可配戴异宝。'};});
  const cluePages={
    'f5-14':['双塔回访簿','合塔渡门在第二印觉醒后直连第四与第六层，不会再耗钥匙。第三层原来的青蝉旧匣，也在第二印后能领取防御 +4。','异宝只许同时配戴两件，在任意莲灯可免费换装。定海铁的攻击收益与防御代价已计入每一场预览。'],
    'f11-18':['三炉熄火诀','第十层照影台与落子杆、第十一层甲乙镜台、第十二层慈心台与止火杆：共六处控制同时成立，慈悲心印才会觉醒。','旧分身在跨层后仍留守；若召回，旧炉会重燃。取卷后记得重新让甲乙共同留影。'],
    'f12-7':['七伤侧门图','下一层亲自护送需付 70 生命，可开启第十五层东南舍利支院上侧的援手门。它确实绕开藏经守卫，不会替你完成经门机关。','花 20 功德修身则增加防御 +4，援手门仍关闭。两选互斥，也能暂不选择；主线始终保留正面战斗路。'],
    'f16-10':['终局余烬记','本层西南宝龛藏有心炉烬，精英只挡异宝，不挡上楼。每相首棒 +18 对三相连续战尤有用，代价为整场末尾再失 8 生命。','配装与临战准备可以在确认前反复比较。预览显示的三相总损失已经包括法器的全部收益与代价。'],
    'f4-10':['北庭异宝记','三契的北端通向共享回廊。回廊中央向南的一条窄廊通往六叶铜僧守护的莲灯芯，任一契约都能前往。','莲灯芯让每次法术伤害降低 6，但攻击降低 2。它会增加某些物理守卫的出手轮数，取得后仍需按敌情选择配戴。'],
    'f5-16':['外舍利点名册','第一至第十二层各藏一枚外舍利，第十三、十四层各一枚，第十五层有两枚。上楼口会检查本层是否遗漏。','五重心印是能力觉醒点，不会凭空补齐舍利。每章必须亲自找回支院中的碎片，再到章末开印。'],
    'f8-19':['灵珠留用簿','凝息珠全塔只有四颗，含入塔时携带的一颗。用作回息，或在莲灯换 8 金、50 生命，都将永久失去它。','十八层的定海镇心需要一珠，毫毛合击需要两珠。执棒破阵不用珠；所有准备可在战前查看真实损失再决定。'],
    'f10-12':['三台独立经图','甲镜台在西庭，乙镜台在东庭，丙镜台在中央。甲丙开西经室、乙丙开东经室、甲乙开中央上行。','本层最多同时留两影。经卷只取一愿，读卷后免费召回丙，再补上缺失的甲或乙；三处分身一共消耗 6 灵息。'],
    'f11-20':['法器与炉魂','莲灯芯降低每次法术伤害，但降低攻击；听潮贝降低整场损失，却同时减少战利功德。它们不总是越早戴上越好。','火灵的法术还击无视普通防御；慈悲觉醒前后的战损不同。可以先稳三炉、再回来处理可选火灵。'],
    'f11-21':['息火的顺序','支院的晶石不会自动获得。先比较守卫的下一攻击临界，再决定先买攻击、拿防御，还是先消耗一颗随身蟠桃。','灵息可在莲灯免费回满，生命不会因换层或回灯恢复。每一颗桃、每一笔修行功德，都属于整座塔的有限预算。']
  };
  for(const floor of floors)for(const e of floor.entities){const page=cluePages[e.id];if(page){e.type='monument';delete e.item;e.dialogue='v4-'+e.id;e.name=page[0];dialogues[e.dialogue]={title:page[0],speaker:'塔中旧记',lines:page.slice(1)};}}
  const oldBoneReward=floors[2].entities.find(e=>e.type==='item'&&e.item==='emerald');if(oldBoneReward)Object.assign(oldBoneReward,{type:'chest',requires:2,label:'青蝉旧匣 · 第二印后防御 +4'});
  choices.locks.options.find(o=>o.id==='free').description='保留钥匙，面对铜铃怨灵与巡山小妖；北匣获得 24 功德金。北庭另有任一契约都能进入的精英异宝龛。';
  floors.forEach((floor,index)=>{
    const plan=chamberPlans[index],grid=Array.from({length:21},()=>Array(21).fill('#'));
    const rect=(x1,y1,x2,y2,value='.')=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)grid[y][x]=value;};
    const line=(points,value='.')=>{for(let i=1;i<points.length;i++){let[x,y]=points[i-1],[X,Y]=points[i];if(x!==X&&y!==Y)throw new Error('Non-orthogonal authored corridor');while(x!==X||y!==Y){grid[y][x]=value;x+=Math.sign(X-x);y+=Math.sign(Y-y);}grid[Y][X]=value;}};
    const used=new Set(),at=(x,y)=>x+','+y;
    const place=(entity,x,y)=>{if(used.has(at(x,y)))throw new Error('v4 occupied '+index+' '+at(x,y));grid[y][x]='.';entity.x=x;entity.y=y;used.add(at(x,y));return entity;};
    const freeNear=([cx,cy],exclude=[])=>{let candidates=[];for(let y=1;y<20;y++)for(let x=1;x<20;x++)if(grid[y][x]==='.'&&!used.has(at(x,y))&&!exclude.some(([X,Y])=>Math.abs(x-X)+Math.abs(y-Y)<2)&&![fragmentVault,treasureVault].some(v=>v&&(x>=v.rect[0]&&x<=v.rect[2]&&y>=v.rect[1]&&y<=v.rect[3]||Math.abs(x-v.out[0])+Math.abs(y-v.out[1])<=2)))candidates.push([x,y]);candidates.sort((a,b)=>Math.abs(a[0]-cx)+Math.abs(a[1]-cy)-Math.abs(b[0]-cx)-Math.abs(b[1]-cy));if(!candidates.length)throw new Error('No v4 cell');return candidates[0];};
    const add=(entity,x,y,id)=>{entity.id='f'+index+'-'+id;floor.entities.push(entity);return place(entity,x,y);};
    let entry=[10,19],exit=plan.exit,fragmentVault=null,treasureVault=null;
    if(plan.rooms){plan.rooms.forEach(r=>rect(...r));plan.paths.forEach(p=>line(p));}
    if(plan.special==='contracts'){
      rect(1,16,19,19);rect(2,1,19,4);[3,10,17].forEach(x=>{rect(x-1,6,x+1,14);line([[x,3],[x,18]]);});
      [[3,10],[10,10],[17,11],[17,8]].forEach(([x,y])=>{grid[y][x-1]='#';grid[y][x+1]='#';});
    }else if(plan.special==='water'){
      rect(7,16,13,19);rect(1,8,6,12);rect(14,8,19,12);rect(7,6,13,10);rect(14,1,19,4);
      line([[10,18],[4,18],[4,10]]);line([[10,18],[17,18],[17,10]]);line([[4,10],[10,10],[10,8],[17,8],[17,10]]);line([[17,10],[17,3]]);
    }else if(plan.special==='silk'){
      rect(7,16,13,19);rect(1,8,6,12);rect(8,7,12,11);rect(14,8,19,12);rect(1,1,6,4);rect(14,1,19,4);rect(8,1,12,4);
      line([[10,18],[10,10],[4,10],[4,3]]);line([[10,10],[17,10],[17,3]]);line([[10,10],[10,3]]);
    }else if(plan.special==='final'){
      rect(7,16,13,19);rect(1,8,5,12);rect(15,8,19,12);rect(7,6,13,11);rect(8,1,12,4);
      line([[10,18],[3,18],[3,10]]);line([[10,18],[17,18],[17,10]]);line([[3,10],[10,10],[17,10]]);line([[10,10],[10,2]]);
    }
    // A relic wing has one real mouth. Its guard cannot be walked around in
    // the spacious chamber; a shortcut is earned with a later ability.
    if(plan.fragment){fragmentVault=vaultFor(plan.fragment);rect(...fragmentVault.rect,'#');rect(...fragmentVault.inside);const outerX=fragmentVault.out[0]===6?7:13;line([plan.join,[outerX,plan.join[1]],[outerX,fragmentVault.out[1]],fragmentVault.out]);line([fragmentVault.at,fragmentVault.out]);}
    // Treasure wings occupy the unused lower corner and are optional.
    if(plan.treasure){
      if(index===4){treasureVault={rect:[5,8,8,12],inside:[6,9,7,11],at:[6,10],mouth:[6,8],out:[6,7]};rect(...treasureVault.rect,'#');rect(...treasureVault.inside);line([[6,3],[6,7],treasureVault.at]);}
      else if(index===7){treasureVault={rect:[8,1,12,5],inside:[9,2,11,4],at:[10,3],mouth:[10,5],out:[10,6]};rect(...treasureVault.rect,'#');rect(...treasureVault.inside);line([treasureVault.at,treasureVault.out]);}
      else {const side=plan.fragment==='sw'?'se':'sw';treasureVault=vaultFor(side);rect(...treasureVault.rect,'#');rect(...treasureVault.inside);const outerX=treasureVault.out[0]===6?7:13;line([[10,18],[outerX,18],[outerX,treasureVault.out[1]],treasureVault.out]);line([treasureVault.at,treasureVault.out]);}
    }
    // Landmark footprints are kept solid, large and clear of authored roads.
    let footprint=null;for(const [w,h] of [[5,6],[4,5],[3,4]]){for(let y=1;y<=19-h&&!footprint;y++)for(let x=1;x<=19-w&&!footprint;x++){let clear=true;for(let Y=y;Y<y+h;Y++)for(let X=x;X<x+w;X++)if(grid[Y][X]!== '#')clear=false;if(clear)footprint={type:plan.landmark,x,y,w,h};}if(footprint)break;}
    floor.landmarks=footprint?[footprint]:[];if(!footprint)throw new Error('No landmark space '+floor.name);
    rect(footprint.x,footprint.y,footprint.x+footprint.w-1,footprint.y+footprint.h-1,'v');
    const originals=floor.entities.slice(),pending=new Set(originals);
    const set=(e,pos)=>{if(!e)return;pending.delete(e);return place(e,...pos);};
    const first=type=>originals.find(e=>e.type===type);
    // Safe hubs remain reachable on every revisit, regardless of water/clone.
    const altar=set(first('altar'),[10,18]);floor.spawn={x:10,y:19};
    for(const e of originals.filter(e=>e.type==='stairs'))set(e,e.to<index?entry:exit);
    for(const e of originals.filter(e=>e.type==='portal'))set(e,freeNear([11,18]));
    const switches=originals.filter(e=>e.type==='switch');
    const switchAnchors=[[3,10],[17,10],[10,8],[4,3],[17,3]];
    switches.forEach((e,k)=>set(e,freeNear(switchAnchors[k%switchAnchors.length])));
    for(const e of originals.filter(e=>e.type==='resonator'))set(e,freeNear(index===3?[3,3]:[3,10]));
    for(const e of originals.filter(e=>e.type==='rescue'))set(e,freeNear([3,10]));
    for(const e of originals.filter(e=>e.type==='tide'))set(e,[10,17]);
    for(const e of originals.filter(e=>e.type==='relic')){set(e,freeNear([10,3]));e.requiresFragments=fragmentGroups[e.relic].slice();}
    for(const e of originals.filter(e=>e.type==='finale'))set(e,[10,1]);
    // Gates sit in one-cell approaches, rather than as isolated floor props.
    for(const [k,e]of originals.filter(e=>['gate','seal','door'].includes(e.type)).entries())set(e,freeNear(k===0?[10,6]:k===1?[17,6]:[4,6]));
    for(const e of originals.filter(e=>e.type==='illusion'))set(e,freeNear([10,13]));
    const chapter=Math.floor(index/3),guardian=originals.filter(e=>e.type==='enemy'&&e.enemy!=='heart').sort((a,b)=>enemies[b.enemy].hp-enemies[a.enemy].hp)[0];
    if(fragmentVault&&guardian)set(guardian,fragmentVault.mouth);
    const fragmentIds=index<14?[index]:index===14?[14,15]:[];
    for(const [k,id]of fragmentIds.entries()){
      const pos=k===0?fragmentVault.at:freeNear([3,3]);
      add(E(...pos,'fragment',{fragment:id,label:'外舍利 · '+(id+1)+'/16',name:'外舍利 '+(id+1)}),...pos,'fragment-'+id);
    }
    const up=originals.find(e=>e.type==='stairs'&&e.to>index);if(up)up.requiresFragments=fragmentIds.slice();
    if(treasureVault){const tid=plan.treasure,c=Math.floor(index/3);add(M(...treasureVault.mouth,'reliquary'+c),...treasureVault.mouth,'reliquary');add(E(...treasureVault.at,'treasure',{treasure:tid,label:treasures[tid].name+' · 可配戴异宝',name:treasures[tid].name}),...treasureVault.at,'treasure-'+tid);}
    // Preserve the principal combat and choice identities in authored rooms.
    if(index===17){const heart=originals.find(e=>e.enemy==='heart');set(heart,[10,3]);}
    for(const e of originals.filter(e=>e.type==='choice'))set(e,freeNear(e.choice==='locks'?e.option==='blue'?[3,15]:e.option==='gold'?[10,15]:[17,15]:e.choice==='silk'?e.option==='atk'?[3,2]:[17,2]:[3,11]));
    for(const e of originals.filter(e=>e.type==='cache'))set(e,freeNear([18,3]));
    for(const e of originals.filter(e=>e.type==='chest'))set(e,freeNear(e.item==='redKey'?[18,18]:[4,3]));
    let remainingEnemy=0,remainingItem=0;
    for(const e of pending){
      let anchor;
      if(e.type==='enemy')anchor=[[4,8],[17,8],[10,12],[8,3],[17,4],[3,9]][remainingEnemy++%6];
      else if(e.type==='item')anchor=[[3,11],[17,11],[10,7],[4,4],[17,4],[12,17],[8,18]][remainingItem++%7];
      else anchor=[[11,18],[9,18],[10,11],[17,12]][remainingItem++%4];
      set(e,freeNear(anchor));
    }
    // Two new encounters are placed at branch approaches; no new crystal or
    // healing drops accompany them. Their gold uses the reduced global budget.
    for(let k=0;k<(index===0?1:2);k++){const pos=freeNear(k===0?[6,10]:[14,10]);add(M(...pos,army[index]),...pos,'wing-guard-'+k);}
    const move=(e,p)=>{if(!e)return;used.delete(at(e.x,e.y));const occupant=floor.entities.find(a=>a!==e&&a.x===p[0]&&a.y===p[1]);if(occupant){used.delete(at(occupant.x,occupant.y));place(occupant,...freeNear([10,17]));}return place(e,...p);};
    // Dedicated puzzle geography keeps the three contracts mutually exclusive.
    if(index===4){
      // The blue north lock shares the south face of the northwest relic
      // wing. Keep the one-cell approach when that wing is walled in.
      grid[6][3]='.';
      const mouths={blue:[3,15],gold:[10,15],free:[17,15]},north={blue:[3,5],gold:[10,5],free:[17,5]};
      const byChoice=originals.filter(e=>e.type==='choice'&&e.choice==='locks');
      for(const option of ['blue','gold','free']){const es=byChoice.filter(e=>e.option===option);move(es[0],mouths[option]);if(es[1])move(es[1],north[option]);}
      const laneEnemies=originals.filter(e=>e.type==='enemy');[[3,10],[10,10],[17,11],[17,8]].forEach((p,k)=>{if(laneEnemies[k])move(laneEnemies[k],p);});
      const frag=floor.entities.find(e=>e.type==='fragment');move(frag,[3,3]);
      move(floor.entities.find(e=>e.id==='f4-wing-guard-0'),[5,3]);
      move(originals.find(e=>e.type==='item'&&e.item==='blueKey'),[9,18]);
      // Guarded fragment alcove branches from the shared north gallery, so no
      // contract can collect the other two contract rewards from behind.
    }
    if(index===7){
      floor.waterTiles=[{x:4,y:14,openWhen:'low'},{x:17,y:14,openWhen:'high'}];floor.waterTiles.forEach(t=>grid[t.y][t.x]='w');
      // Northern court links both banks, but two gates in the southern arms
      // make the initial bank selection real and leave the wheel always safe.
      floor.tideGroup='weakwater';floor.defaultTide='low';
    }else delete floor.waterTiles;
    // The first chapter's fire-eye passages are genuine entrances. Later
    // relic wings deliberately combine an acquired traversal art with combat.
    const illusion=first('illusion');if(index<3&&illusion)move(illusion,fragmentVault.out);
    if(fragmentVault&&index>=3&&index!==4&&index!==7){const [x,y]=fragmentVault.out;if(used.has(at(x,y))){const e=floor.entities.find(e=>e.x===x&&e.y===y);move(e,freeNear([10,12]));}grid[y][x]=[6,8,11,12,14].includes(index)?'=':'~';}
    // Every switch has a global identity. Floor exits publicly require the
    // actual circuits, even where a broad courtyard offers several approaches.
    switches.forEach((e,k)=>{if(!e.controlId)e.controlId='v4-'+index+'-switch-'+k;});
    const requiredControls=index===10?['silk-a','silk-b']:switches.map(e=>e.controlId);
    if(up&&requiredControls.length)up.requiresControls=[...new Set([...(up.requiresControls||[]),...requiredControls])];
    if(index===10){
      const gates=originals.filter(e=>e.type==='gate');
      move(gates[0],[10,5]);move(gates[1],[10,6]);move(gates[2],[4,6]);move(gates[3],[17,6]);
      floor.hints.push('西经室入口（5,7）需要甲丙，东经室入口（18,7）需要乙丙；中央上行（11,6）必须甲乙。三道通路彼此独立，不能沿北廊绕开。');
    }else if(index===7){const gates=originals.filter(e=>e.type==='gate');move(gates[0],[17,5]);move(gates[1],[17,6]);}
    else if(index===14){
      const sideGate=originals.find(e=>e.type==='gate'&&e.requiresQuests);grid[13][17]='.';move(sideGate,[17,14]);
      floor.hints.push('援手侧门在舍利南东支院上侧（18,15），仅亲自护送七伤映身后开通；未救援可从西口正面挑战藏经守卫。');
    }else if(index===17){
      move(originals.find(e=>e.enemy==='heart'),[10,5]);move(originals.find(e=>e.type==='door'&&e.color==='red'),[10,6]);
      move(originals.find(e=>e.type==='gate'),[6,10]);move(originals.find(e=>e.type==='seal'),[10,4]);
      const eastGate=add(G(14,10,'heart','归心东门 · 止战扳杆 + 归心镜台'),...freeNear([12,10]),'east-heart-gate');move(eastGate,[14,10]);
      grid[14][3]='~';grid[14][17]='=';
      floor.hints.push('西翼断口（4,15）需架桥、东翼铁栅（18,15）需化蝉。两翼各有一处控制，双门接通后才进入中央黑莲殿。朱门之后的狭阶必须战胜三相心猿。');
    }
    floor.map=grid.map(row=>row.join(''));
    floor.titleLandmark=chapterTypes[chapter];floor.width=21;floor.height=21;
    floor.objective=(fragmentIds.length?'进入舍利支院，找回本层外舍利'+fragmentIds.map(id=>' '+(id+1)).join('、')+'；':'')+floor.objective;
    floor.hints=floor.hints.filter(h=>!/[（(]\d+\s*[,，]\s*\d+[）)]/.test(h));
    floor.hints.unshift('地图为完整 21×21 殿院。舍利不在上楼口：先看全图，比较支院守卫、成长宝室与机关，再安排路线。');
    if(fragmentVault)floor.hints.push('本层舍利支院入口（'+(fragmentVault.mouth[0]+1)+','+(fragmentVault.mouth[1]+1)+'）由 '+enemies[guardian.enemy].name+' 守护；先取院外成长可减少战损。');
    if(treasureVault)floor.hints.push('异宝龛位于（'+(treasureVault.at[0]+1)+','+(treasureVault.at[1]+1)+'）。精英只守异宝，不挡主线；可先记住它，成长后回访。');
    built.push({entry,exit,altar:[altar.x,altar.y]});
  });
  // Stair and cloud portals use the destination's actual safe hub.
  floors.forEach(f=>f.entities.filter(e=>['stairs','portal'].includes(e.type)).forEach(e=>{e.tx=built[e.to].altar[0];e.ty=built[e.to].altar[1]+1;}));
  revisits.forEach(r=>{const f=floors[r.floor],e=f.entities.find(e=>r.id==='truth-root'?e.type==='chest'&&e.item==='redKey':r.id==='stone-incense'?e.choice==='residual':r.id==='bone-bars'?e.item==='emerald':r.id==='fellowship-cache'?e.type==='chest':e.choice==='compassion');if(e){r.x=e.x;r.y=e.y;}});
  floors.forEach(f=>{f.hintTargets=f.entities.filter(e=>['fragment','treasure','switch','relic','chest','choice','illusion','resonator','rescue','tide','portal'].includes(e.type)).map(e=>({text:e.label||(e.type==='relic'?relics[e.relic].name:'目标'),x:e.x,y:e.y}));const seen=new Set();f.entities.forEach(e=>{const k=e.x+','+e.y;if(seen.has(k)||f.map[e.y]?.[e.x]!=='.')throw new Error('Invalid v4 placement '+f.id+' '+e.id+' '+k);seen.add(k);});});
  dialogues.lantern.lines[1]='十六枚外舍利散在前十五层的支院。每三层组成一印：前三组各三枚，炼炉三枚，经阁最后四枚。先逐一寻回，再到第三、六、九、十二、十五层解开心印。灵晶与功德决定每一棒的轻重，支院异宝则让你选择自己的解法。';
  dialogues.library.lines[2]='明心心印需要这一章四枚外舍利，其中两枚在第十五层不同的位置。五印齐聚后回第一层归根匣拿心钥，再往十八层。';
  dialogues.library.lines[0]='经门需要西侧镜台与东侧扳杆同时响应。镜台仍可在四格内隔墙投影；先看全图比较舍利支院、守卫与两条机关路线，再安排分身。';
  dialogues.waterLesson.lines[1]='第八层南庭水轮可自由切换低、高水位。低水西渡靠近灯魂与舍利支院，高水东渡靠近蛇使与北门；北庭又连接两岸。水轮、莲灯与下楼始终安全，水位不会计时变化。先看全图中的真实守卫与战损，再选择第一条渡路。';
  floors[7].hints=floors[7].hints.filter(h=>!h.includes('低水西渡先面对'));
  floors[7].hints.push('低水西渡靠近法术灯魂与舍利支院，高水东渡靠近余毒蛇使与北门；北庭连接两岸，可从另一侧回到水轮再切换。');
  floors[4].hints=floors[4].hints.filter(h=>!h.startsWith('本层舍利支院入口'));
  floors[4].hints.push('青契另有一条背廊：穿过青契北锁后，可从南面直接拿到西北外舍利，暂避东口的青鳞蛇使。黄契和无钥契从共同北庭进入时，需先面对蛇使；钥匙也能换来一次不同的战斗顺序。');
  floors[4].entities.find(e=>e.type==='fragment').description='青契北锁通向南面背廊，可先取此舍利、暂避青鳞蛇使；黄契和无钥契从东口进院时需先迎战。';
  const v4Terms=value=>{if(typeof value==='string')return value.replaceAll('西北援手侧门','东南援手侧门');if(Array.isArray(value))return value.map(v4Terms);if(value&&typeof value==='object')for(const key of Object.keys(value))value[key]=v4Terms(value[key]);return value;};
  [floors,dialogues,choices].forEach(v4Terms);
  /* v5: deepen decisions inside the authored halls. These additions spend
     existing supply slots, preserve every old entity ID, and add no combatant.
     A side door is useful because of what it lets the player decline, rather
     than because its corridor takes longer to walk. */
  const depthBefore={items:{},enemies:0};
  for(const f of floors)for(const e of f.entities){if(e.type==='item')depthBefore.items[e.item]=(depthBefore.items[e.item]||0)+1;if(e.type==='enemy')depthBefore.enemies++;}
  const editFloor=(index,fn)=>{
    const floor=floors[index],grid=floor.map.map(row=>row.split(''));
    const paint=(x,y,value='.')=>{if(grid[y][x]==='v')throw new Error('v5 landmark overlap '+index+' '+x+','+y);grid[y][x]=value;};
    const shift=(e,x,y)=>{if(!e)throw new Error('Missing v5 entity '+index);if(floor.entities.some(a=>a!==e&&a.x===x&&a.y===y))throw new Error('Occupied v5 cell '+index+' '+x+','+y);paint(x,y);e.x=x;e.y=y;return e;};
    const append=(x,y,type,id,details={})=>{if(floor.entities.some(e=>e.x===x&&e.y===y))throw new Error('Occupied v5 append '+index+' '+x+','+y);paint(x,y);const e=E(x,y,type,{...details,id:'f'+index+'-v5-'+id});floor.entities.push(e);return e;};
    fn(floor,{grid,paint,shift,append});floor.map=grid.map(row=>row.join(''));
  };
  const convertSupply=(floor,id,choice,label)=>{
    const e=floor.entities.find(e=>e.id===id);if(!e||e.type!=='item')throw new Error('Missing v5 supply '+id);
    e.originalSupply=e.item;delete e.item;Object.assign(e,{type:'choice',choice,blocking:false,label,name:label});return e;
  };
  choices.bellVow={title:'残钟偏转 · 以玉换路',grant:'immediate',description:'这枚青玉只够做一件事：炼作防御 +2，或填入钟缺打开定海铁宝龛北门。开北门可避开镇海猿卫，但也放弃它的战利功德；正面精英路始终保留。没有计时，可以先查看精英战损，再回钟前决定。',options:[
    {id:'offering',label:'留玉护身 · 防御 +2',description:'立即获得原青玉的防御 +2。宝龛北门保持关闭，想取定海铁仍须挑战镇海猿卫；也可以先上楼，以后再来。',cost:{},reward:{def:2}},
    {id:'passage',label:'补钟开门 · 舍防御换异宝侧路',description:'永久放弃这份防御 +2，打开东南宝龛北门，可绕过镇海猿卫取得定海铁。不会获得精英的战利功德。',cost:{},reward:{quests:{bellPassage:true}}}
  ]};
  editFloor(1,(floor,{paint,shift,append})=>{
    const bell=convertSupply(floor,'f1-12','bellVow','残钟偏转台 · 防御 +2 / 异宝北门');shift(bell,9,17);
    paint(17,15);append(17,14,'gate','bell-gate',{requiresQuests:['bellPassage'],label:'补钟北门 · 舍弃青玉后开启'});
    floor.hints.push('南庭残钟台（10,18）将原青玉分成两条互斥用途：防御 +2，或打开定海铁北门（18,15）绕过精英。北门不会赠送精英功德，查看与等待都免费。');
  });
  // The first tower's crystal is a real combat investment. The courtyard
  // remains a loop, while its small copper niche has exactly one mouth.
  editFloor(3,(floor,{paint,shift})=>{
    const crystal=floor.entities.find(e=>e.id==='f3-9'),guard=floor.entities.find(e=>e.id==='f3-wing-guard-1'),coins=floor.entities.find(e=>e.id==='f3-5');
    shift(coins,12,18);shift(crystal,18,10);shift(guard,17,10);
    [[17,9],[18,9],[19,9],[19,10],[17,11],[18,11],[19,11]].forEach(([x,y])=>paint(x,y,'#'));
    floor.hints.push('东庭朱砂小龛只有西口（18,11），铜铃怨灵无法绕开；原南庭攻击 +3 移入龛内。可先取西庭仙桃承受法术，或留待后层配戴莲灯芯再回取。小龛不挡双塔校准。');
  });
  choices.ferryVow={title:'渡灯留用 · 桃还是路',grant:'immediate',description:'西庭原有的一枚仙桃，现在可留给自己恢复 90 生命，也可用它供养渡灯并交一把黄钥，开放西缘栈道。栈道直通外舍利西侧，绕开西渡灯魂和支院傀儡；北门仍须亲自激活定风杆。两选互斥，普通渡口始终可走。',options:[
    {id:'offering',label:'留桃养身 · 生命 +90',description:'立即获得原仙桃的 90 生命，保留黄钥；西缘栈道保持关闭。可主动切换低水西渡与高水东渡，按真实战损规划入口。',cost:{},reward:{hp:90}},
    {id:'passage',label:'供灯开栈 · 一黄钥与仙桃换路',description:'消耗一把黄钥并永久放弃这份 90 生命，开启西缘两道渡灯门。可从南庭沿栈道直入舍利支院，暂避西渡灯魂与傀儡；不会获得绕过守卫的功德。',cost:{key:{color:'yellow',amount:1}},reward:{quests:{ferryPassage:true}}}
  ]};
  editFloor(7,(floor,{paint,shift,append})=>{
    const ferry=convertSupply(floor,'f7-7','ferryVow','渡灯台 · 留90生命 / 黄钥供灯开栈');shift(ferry,9,17);
    shift(floor.entities.find(e=>e.id==='f7-5'),4,12);shift(floor.entities.find(e=>e.id==='f7-6'),17,12);
    // Keep the north-to-south crossings narrow. The same two existing
    // puppets now guard the cross-bank links instead of standing in a square.
    for(const x of [6,14])for(let y=8;y<=12;y++)if(y!==10)paint(x,y,'#');
    for(const [left,right,mouth]of [[1,6,4],[14,19,17]])for(let x=left;x<=right;x++)if(x!==mouth)paint(x,12,'#');
    for(let y=4;y<=18;y++)paint(2,y);for(let x=2;x<=4;x++)paint(x,18);
    append(2,14,'gate','ferry-south',{requiresQuests:['ferryPassage'],label:'渡灯南栈门 · 黄钥供灯后开启'});
    append(2,6,'gate','ferry-north',{requiresQuests:['ferryPassage'],label:'渡灯北栈门 · 通往舍利支院'});
    floor.hints=floor.hints.filter(h=>!h.includes('低水西渡靠近'));
    floor.hints.push('低水西渡口（5,13）由溺水灯魂守住，高水东渡口（18,13）由余毒蛇使守住；两岸通中央各有一名棘反傀儡。先看渡口与横桥两场总损失，不能从宽院绕过。');
    floor.hints.push('南庭渡灯台（10,18）可留90生命，或花一黄钥并舍弃治疗，开启西缘栈道（3,15与3,7）。栈道绕过两场守卫，但不替你扳定风杆。');
  });
  choices.emberVow={title:'无生末问 · 留甲还是取烬',grant:'immediate',description:'终局前最后一枚碧髓，只能炼成防御 +4，或填入无生门开出心炉烬北径。北径绕过余烬黑将，代价是永远放弃这份防御；心炉烬仍有每战损失 8 生命的副作用。可先比较三相战损与法器组合，之后再决定。',options:[
    {id:'offering',label:'留髓成甲 · 防御 +4',description:'立即获得原碧髓的防御 +4。心炉烬仍能经西南正面精英路取得；也可完全不拿异宝，直接准备终战。',cost:{},reward:{def:4}},
    {id:'passage',label:'燃髓开径 · 舍防御避精英',description:'永久放弃防御 +4，开西南宝龛北径，避开余烬黑将取得心炉烬。异宝不是永久加成：仍需到莲灯装配，且同一时间只装两件。',cost:{},reward:{quests:{emberPassage:true}}}
  ]};
  editFloor(16,(floor,{paint,shift,append})=>{
    const vow=convertSupply(floor,'f16-12','emberVow','无生髓台 · 防御 +4 / 心炉烬北径');shift(vow,9,17);
    paint(3,13);paint(3,15);append(3,14,'gate','ember-gate',{requiresQuests:['emberPassage'],label:'燃髓北径 · 舍弃碧髓后开启'});
    floor.hints.push('南庭髓台（10,18）把原碧髓分为防御 +4与异宝北径两选。北径（4,15）可绕过余烬黑将；心炉烬每相首棒+18、每战末损8生命，须和当前两件法器比较，不能全拿所有利益。');
  });
  items.yellowKey.description='可开启一扇黄门，也可留到第八层，配合舍弃一枚仙桃供渡灯、开舍利栈道。每次用途都会永久消耗一把。';
  floors[0].hints.push('黄钥还有后日用途：第八层渡灯可用一黄钥与一枚仙桃的治疗份额换开舍利栈道。普通渡口始终保留，想走避战路线可提前保留一把。');
  floors[4].hints.push('黄契与之后的黄门会消耗有限黄钥；第八层另有一黄钥供灯的可选避战栈道。青契与无钥契可为此保留黄钥，主线不要求一定走栈道。');
  dialogues.lantern.lines.push('黄钥不只开门。八层渡灯还认一把黄钥与一份仙桃：它会为你开一条避战的舍利栈道。普通渡口一直都在；想换那条路，便从现在留下一把。');
  const depthDesigns=[
    ['先救哪一份资源？','先比较普通守卫与先攻夜蝠；攻击临界常比多一次治疗更省。','黄门近路可少走一程；等第一印架桥则保留钥匙。',['fragment','item:amber','chest:redKey']],
    ['一枚青玉，是护身还是敲开宝龛？','固定属性与避战通路可以互换；不必为了全清而立即打精英。','防御 +2与定海铁北门互斥，绕过精英也放弃功德。',['choice:bellVow','treasure:iron','fragment']],
    ['本章先成长，还是先开第一印？','火眼看到的是实际入口；章末心印要前两层的外舍利。','旧碧髓需第二印后回访，当前不能把未来成长算进战损。',['fragment','relic','chest:emerald']],
    ['为了攻击 +3，现在承受铜铃还是以后回访？','支院成长被真实守卫保护，双塔任务与成长投资可分开完成。','朱砂小龛内的攻击 +3要承受法术；先行可留待莲灯芯后再取。',['item:amber','resonator','fragment']],
    ['一把钥匙如何改变整章出手顺序？','路线承诺不仅改变奖励，也决定谁先面对舍利东口蛇使。','青契攻击、黄契防护、无钥保钥三路互斥；异宝另付精英战损。',['choice:locks','cache','treasure:lotus']],
    ['西塔合印后，先拿新术还是回旧院？','能力是跨层通路：第二印打开旧铁栅，不直接替你拿到宝物。','回访青蝉旧匣可换成长，但同行匣仍需第三印。',['resonator','relic','chest:emerald']],
    ['八戒与舍利，哪个先保障后续通路？','救援不是陪衬；只有稳定水脉，下一层水轮才可主动改变渡口。','本层余毒与法术守卫分属不同院，可先取资源再选战序。',['rescue','fragment','item:emerald']],
    ['生命、黄钥、两场守卫：该用什么换这一渡？','水位选择决定先承担的伤害类型，横桥与外舍利各有独立代价。','留90生命，或舍桃并花黄钥开边栈；西灯魂/东余毒均有真实嘴口。',['choice:ferryVow','tide','fragment','treasure:tide']],
    ['开水闸之后，该拿心印还是保留后日的灯？','分身留守与机关跨层保存；章末开印后还可回来做慈悲选择。','墙中灯魂需第四印，取攻击或还灯治疗只能选一。',['switch','relic','choice:compassion']],
    ['第一炉要先留影，还是先投资攻击？','跨层控制与个人成长不是同一目标；完成炉心不要求清空每只火灵。','慈悲前的法术较昂贵，可先稳定炉心再回访非必需守卫。',['switch','item:ruby','fragment']],
    ['两道影子，如何完成三种愿望？','解题在重排驻守而非耗更多毫毛；经卷到手后应召回丙。','攻击经与护身经互斥；上楼要求甲乙而不是领取经卷时的组合。',['choice:silk','switch','treasure:thorn']],
    ['三口炉已经熄灭了吗？','看见当前门开，不等于跨层条件都完成；六处炉心可逐项核对。','慈悲使旧层法术战变便宜，当前生命不足时有回访与治疗空间。',['relic','switch','fragment']],
    ['获得慈悲后，要清旧敌还是护送新同行？','新能力会改变过去的战损，旧区域不是只能捡遗漏的东西。','下一层70生命护送可替代一场主卫战，先比较战损再备生命。',['npc','fragment','item:ruby']],
    ['把70生命交给救援，还是把20功德交给防御？','公开的人情结果直接转化为下一层通路，不使用隐藏善恶分。','三名映身与援手门，或防御+4；双影镜另需精英战损与配装位。',['choice:sevenWounds','treasure:mirror','fragment']],
    ['取齐两枚舍利，需要正面守卫还是援手侧路？','一层可以有两个目标；第十六枚在不同经室，不能只盯上楼口。','护送决定可绕过藏经无相，但不能替代经门两处机关。',['fragment','relic','gate']],
    ['此刻的成长，还值得花终战的功德吗？','不再增加心印，任务转为把剩余资源转换成可测量的终战收益。','回山门取得心钥；购攻、防御、留治疗与保凝息珠互相竞争。',['switch','item:ruby','stairs']],
    ['最后的防御 +4，能否换来更合算的三相首棒？','法器不是越多越好：装配位和负面效果迫使终局重算。','留碧髓护身或燃髓开精英侧路互斥；宝物、精英功德不能无代价全取。',['choice:emberVow','treasure:ember','switch']],
    ['此前保存的钥匙、灵珠、神通该怎样一起用？','三相使用同一真实预览；先安排双翼机关，再确认资源消耗。','执棒保珠、镇心一珠、合击两珠互斥；认出自身才是第十七颗。',['enemy:heart','switch','finale']]
  ];
  const depthTarget=(floor,key)=>{const [type,value]=key.split(':');const entities=floor.entities.filter(e=>e.type===type&&(!value||e.item===value||e.choice===value||e.enemy===value||e.treasure===value));return entities.map(e=>({text:e.label||e.name||(e.type==='item'?items[e.item].name:e.type==='relic'?relics[e.relic].name:e.type==='enemy'?enemies[e.enemy].name:'本层'+({fragment:'外舍利',switch:'机关',resonator:'塔轴',rescue:'救援',tide:'水轮',npc:'同道',stairs:'塔阶',gate:'通路',finale:'归心'}[e.type]||'目标')),x:e.x,y:e.y}));};
  floors.forEach((floor,index)=>{
    const [question,insight,opportunityCost,targets]=depthDesigns[index];
    floor.depth={question,insight,opportunityCost,objectives:targets.flatMap(key=>depthTarget(floor,key))};
    floor.hints.unshift(question+' '+opportunityCost);
    floor.hintTargets=floor.entities.filter(e=>['fragment','treasure','switch','relic','chest','choice','illusion','resonator','rescue','tide','portal'].includes(e.type)).map(e=>({text:e.label||(e.type==='relic'?relics[e.relic].name:'目标'),x:e.x,y:e.y}));
    const occupied=new Set();for(const e of floor.entities){const key=e.x+','+e.y;if(occupied.has(key)||floor.map[e.y]?.[e.x]!=='.')throw new Error('Invalid v5 placement '+floor.id+' '+e.id+' '+key);occupied.add(key);}
  });
  // Descriptive data revision; serialized state remains save version 4.
  // v9: a lock must protect an actual reward or save a real route. These
  // two-cell alcoves use formerly solid stone, never a landmark or old road.
  // Entity IDs and the finite supply budget survive the repair.
  const alcoveRepairs=[
    [0,'f0-11','f0-10',[12,5],[12,4]],[0,'f0-wing-guard-0','f0-7',[6,13],[6,14]],
    [1,'f1-11','f1-10',[5,5],[5,4]],[1,'f1-wing-guard-0','f1-7',[5,13],[5,14]],
    [2,'f2-15','f2-10',[10,12],[10,13]],[2,'f2-16','f2-11',[17,7],[17,6]],[2,'f2-wing-guard-0','f2-8',[8,12],[8,13]],
    [3,'f3-wing-guard-0','f3-4',[6,8],[6,7]],
    [4,'f4-wing-guard-0','f4-7',[6,1],[5,1]],
    [5,'f5-wing-guard-0','f5-10',[6,6],[6,7]],
    [6,'f6-wing-guard-0','f6-4',[6,6],[5,6]],
    [7,'f7-wing-guard-0','f7-8',[6,6],[5,6]],
    [8,'f8-20','f8-15',[17,7],[17,6]],[8,'f8-wing-guard-0','f8-12',[6,6],[6,7]],
    [9,'f9-wing-guard-0','f9-8',[6,13],[6,14]],
    [10,'f10-wing-guard-0','f10-9',[6,7],[6,6]],
    [11,'f11-22','f11-15',[6,6],[6,7]],[11,'f11-wing-guard-0','f11-17',[6,12],[7,12]],
    [12,'f12-wing-guard-0','f12-4',[6,6],[5,6]],
    [13,'f13-wing-guard-0','f13-7',[6,12],[7,12]],
    [14,'f14-wing-guard-0','f14-13',[6,13],[6,14]],
    [15,'f15-wing-guard-0','f15-8',[6,8],[6,7]],
    [16,'f16-wing-guard-0','f16-8',[6,6],[6,7]],
    [17,'f17-wing-guard-0','f17-14',[10,15],[10,14]],
    [17,'f17-5','f17-16',[1,13],[1,14]],[17,'f17-6','f17-18',[15,13],[15,14]]
  ];
  for(const [index,guardId,rewardId,mouth,inside]of alcoveRepairs){
    const f=floors[index],guard=f.entities.find(e=>e.id===guardId),reward=f.entities.find(e=>e.id===rewardId),grid=f.map.map(r=>r.split(''));
    for(const [x,y]of [mouth,inside]){if(grid[y][x]!=='#'||f.entities.some(e=>e.x===x&&e.y===y))throw new Error('Occupied repair alcove '+index);grid[y][x]='.';}
    if(f.depth)for(const t of f.depth.objectives||[]){if(t.x===reward.x&&t.y===reward.y){t.x=inside[0];t.y=inside[1];}else if(t.x===guard.x&&t.y===guard.y){t.x=mouth[0];t.y=mouth[1];}}
    Object.assign(guard,{x:mouth[0],y:mouth[1],guards:[rewardId],role:'treasure',purpose:'守护'+items[reward.item].name+'；可放弃奖励，保留资源。'});
    Object.assign(reward,{x:inside[0],y:inside[1]});
    if(guard.type==='door')guard.label=items[reward.item].name+'宝龛 · '+({yellow:'铜',blue:'青'}[guard.color]||'朱')+'钥换取';
    f.map=grid.map(r=>r.join(''));
  }
  // These former props neither protected a reward nor shortened a road. The
  // exit already checks their controls, so remove the misleading duplicate.
  const redundantGates=new Set(['f1-2','f9-3','f11-13','f11-14','f13-3','f14-12','f16-3','f15-3','f7-3','f10-4']);
  floors.forEach(f=>{f.entities=f.entities.filter(e=>!redundantGates.has(e.id));});
  const heartGrid=floors[17].map.map(r=>r.split(''));for(const [x,y]of [[9,4],[11,4],[9,6],[11,6]])heartGrid[y][x]='#';floors[17].map=heartGrid.map(r=>r.join(''));
  Object.assign(floors[5].entities.find(e=>e.id==='f5-9'),{role:'shortcut',purpose:'节省十四步的中庭近路；不花铜钥也能沿西院到达。'});
  // White Wutian's help changes the map. The free southern approach really
  // bypasses the guardian, while the original guarded approach remains valid.
  const mercyGrid=floors[12].map.map(r=>r.split(''));for(const y of [5,6,7])mercyGrid[y][3]='.';floors[12].map=mercyGrid.map(r=>r.join(''));
  floors[12].entities.push({id:'f12-white-passage',x:3,y:5,type:'gate',requiresQuests:['whiteGoodness'],label:'善念南径 · 白衣无天引路',purpose:'直达外舍利，绕过正门守卫。'});
  floors[14].entities.push({id:'f14-white-return',x:11,y:17,type:'portal',to:0,tx:10,ty:19,requires:5,requiresQuests:['whiteGoodness'],label:'白衣归根云廊 · 直达第一层归根匣'});
  for(const f of floors){
    for(const e of f.entities){
      if(e.type==='door'&&e.color==='blue'){e.morphable=true;e.purpose=(e.purpose||e.label)+' 青蝉觉醒后可花灵息卸锁，保留钥匙。';}
      if(e.type==='npc'&&e.archetype==='whiteWutian'){e.aid='whiteGoodness';e.aidText='请开慈悲归路';e.purpose='免费开启十三层善念南径；五印齐聚后开启十五层归根云廊。';}
      if(e.type==='enemy'&&!e.role){e.role=e.enemy==='heart'?'boss':/reliquary/.test(e.id)?'treasure':f.entities.some(a=>a.type==='fragment'&&Math.abs(a.x-e.x)+Math.abs(a.y-e.y)<=3)?'guardian':'optional';e.purpose=e.role==='optional'?'可绕行的功德挑战；胜利功德可在莲灯换取成长。':e.role==='boss'?'守护最后莲阵，战胜三相后才能完成归真。':'守护支院宝物；可先成长再挑战。';}
    }
    // Repair the targets as well as the map. Stale coordinates were another
    // way the journal could point the player into an empty wall.
    if(f.depth)for(const t of f.depth.objectives||[]){const plan=alcoveRepairs.find(p=>p[0]===f.id&&p[2]&&items[f.entities.find(e=>e.id===p[2])?.item]?.name===t.text);if(plan){t.x=plan[4][0];t.y=plan[4][1];}}
    f.hintTargets=f.entities.filter(e=>['fragment','treasure','switch','relic','chest','choice','illusion','resonator','rescue','tide','portal','npc'].includes(e.type)).map(e=>({text:e.label||e.name||'目标',x:e.x,y:e.y}));
    const occupied=new Set();for(const e of f.entities){const key=e.x+','+e.y;if(occupied.has(key)||f.map[e.y]?.[e.x]!=='.')throw new Error('Invalid repaired placement '+e.id);occupied.add(key);}
  }
  enemies.sentinel.desc='重甲：先看守护目标，再比较攻击临界和实际战损。';
  const levelDepth={revision:6,decisionChoices:['bellVow','locks','ferryVow','silk','sevenWounds','emberVow'],supplyBefore:depthBefore,spentSupplySlots:['f1-12','f7-7','f16-12'],alcoveRepairs};
  const narrative={lanternStages:{
    staff:{title:'一棒也能渡人',lines:['石生心印亮了。你没有拿金箍棒再砸一堵墙，反倒能替后来的人搭一条路。旧层的断口，现在都认得你了。','前面那两座铜塔各守着半道影。把两边塔轴归位，再把舍利送回照骨心印。别急着把每一把钥匙都花在眼前。']},
    cicada:{title:'听见弱水里的人',lines:['青蝉之变不是为了逃。你能钻过铁栅，从里面卸下门闩，把路留给那些不能变化的人。','弱水里传来八戒的声音。第七层先救他，水轮才有人接应。舍利能找回来，同伴也得带回来。']},
    rescued:{title:'有人替你守住归路',lines:['八戒已经脱困，水脉便不再只听黑莲的命令。你转动水轮时，他会替你守住另一头。','把弱水一篇的三枚舍利送到第九层。渡厄心印要教你的，不是一人走得更远，是怎样留下另一个自己，等后来的人。']},
    companions:{title:'分身不是替身',lines:['毫毛已经能独守阵眼。可不是每一根线都该永远绷紧；该召回时就召回，给另一条路留一点余地。','三炉的火各系着一组机关。看清哪一道门真在等你的分身，再落那根毫毛。你要救出来的，不能只是宝匣里的舍利。']},
    mercy:{title:'那盏灯原来在你心里',lines:['慈悲心印归来了，我也终于能认回自己的名字。我是你曾经舍下的犹疑，是听见求救时，你没有挥下去的那一棒。','七伤路上，每一个决定都有代价。看清代价之后仍愿意伸手，才是慈悲。经阁的最后四枚外舍利，还在等你。']},
    five:{title:'回到第一盏灯前',lines:['五重心印都认回了你，十六枚外舍利也已归位。可数到最后，仍会少一个名字。','山门东南的归根之匣已经回应五印。带上心钥，再去十八层。那扇门后等着的，不是又一个该被打碎的妖怪。']},
    rootKey:{title:'去见那颗不肯低头的心',lines:['心钥已取。你不必再证明自己能打碎多少门，只需走过塔心两翼，把最后的阵眼安置妥当。','黑莲把你的嗔怒塑成三相。看清每一相的代价，再决定怎样出棒。打败它，是为了把它带回心里，不是再舍掉一次。']},
    heart:{title:'最后那个名字',lines:['三相已经平静，十六道光却还围着一个空位。那个位置从来不在宝匣里。','去十八层中央莲阵。你一路救下的那些人，都在等你把自己的名字也带回来。']},
    awakened:{title:'这一次，不再舍下自己',lines:['十七道光终于圆满。无骨舍利不是让你成为一件宝物，是让你记得自己为何愿意出发。','走到莲台前作最后的选择：带着众生归去，或留一盏灯守住归路。这一次，是你自己决定。']}
  }};
  window.TowerData = { title: '大圣：舍利魔塔', version: 4, floors, enemies, items, relics, relicGroups, fragmentGroups, treasures, chapters, dialogues, choices, revisits, bossPlans, levelDepth, narrative };
})();
