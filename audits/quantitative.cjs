/* Read-only design audit. Replays existing public-action records against current rules. */
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../js/world.js');
require('../js/engine.js');
const data = TowerData;
const count = (arr, key) => arr.reduce((o, a) => ((o[key(a)] = (o[key(a)] || 0) + 1), o), {});
const worlds = data.floors.map(f => ({
  floor: f.id + 1, name: f.name,
  enemies: f.entities.filter(e => e.type === 'enemy').length,
  altars: f.entities.filter(e => e.type === 'altar').length,
  levers: f.entities.filter(e => e.type === 'switch' && e.kind === 'lever').length,
  plates: f.entities.filter(e => e.type === 'switch' && e.kind === 'plate').length,
  bridges: f.map.join('').split('~').length - 1,
  bars: f.map.join('').split('=').length - 1,
  items: count(f.entities.filter(e => e.item), e => e.item)
}));
const runs = ['none', 'atk', 'def'].map(build => {
  const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../tests/playthrough-' + build + '.json')));
  const engine = new TowerEngine(data); engine.newGame();
  const fights = [], mana = [], floorTotals = {}, failed = [], purchase = [], returns = [];
  for (let i = 0; i < source.actions.length; i++) {
    const action = source.actions[i], before = engine.snapshot();
    let preview;
    if (action.type === 'fight') preview = engine.preview(action.args[0].enemy);
    const result = engine[action.type](...action.args), after = engine.state;
    if (['fight', 'openDoor', 'useAbility', 'shop', 'travel', 'useConsumable'].includes(action.type) && !result) failed.push({i, action});
    const floor = before.floor + 1;
    const totals = floorTotals[floor] ||= {floor, hpGain:0, damage:0, spells:0, kills:0, zeroDamage:0};
    if (after.hp > before.hp) totals.hpGain += after.hp - before.hp;
    if (action.type === 'fight') {
      const enemy = data.enemies[action.args[0].enemy];
      const record = {i,floor,enemy:enemy.name,enemyId:action.args[0].enemy,entity:action.args[0].id,
        beforeHP:before.hp,atk:before.atk,def:before.def,damage:preview.damage,rounds:preview.rounds,gold:enemy.gold,
        plus3Atk: TowerRules.battle({...before, atk:before.atk+3}, enemy).damage,
        plus3Def: TowerRules.battle({...before, def:before.def+3}, enemy).damage};
      fights.push(record); totals.damage += preview.damage; totals.kills++; if (!preview.damage) totals.zeroDamage++;
    }
    if (action.type === 'useAbility') totals.spells++;
    if (after.mana !== before.mana) mana.push({i,floor,action:action.type,args:action.args,manaBefore:before.mana,manaAfter:after.mana});
    if (action.type === 'shop') purchase.push({i,floor,kind:action.args[0],cost:before.coins-after.coins});
    if (action.type === 'travel') returns.push({i,from:floor,to:after.floor+1,manaAfter:after.mana});
  }
  return {build,actions:source.actions.length,failed,final:engine.snapshot(),fights,
    summary:{kills:fights.length,zeroDamage:fights.filter(f=>!f.damage).length,totalDamage:fights.reduce((n,f)=>n+f.damage,0),
      boss:fights.find(f=>f.enemyId==='heart'),damageBeforeBoss:fights.filter(f=>f.enemyId!=='heart').reduce((n,f)=>n+f.damage,0),
      hpMargin:engine.state.hp+200*engine.state.elixirs,orbUses:source.actions.filter(a=>a.type==='useConsumable'&&a.args[0]==='orb').length,
      healsUsed:source.actions.filter(a=>a.type==='useConsumable'&&a.args[0]==='elixir').length,
      abilityUses:count(source.actions.filter(a=>a.type==='useAbility'),a=>a.args[0]),purchase},
    floorTotals:Object.values(floorTotals),mana,returns};
});
const output = {worlds,runs};
fs.writeFileSync(path.join(__dirname, 'economy.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify({worlds,runs:runs.map(r=>({build:r.build,failed:r.failed,summary:r.summary,floorTotals:r.floorTotals,
  final:{hp:r.final.hp,elixirs:r.final.elixirs,orbs:r.final.orbs,coins:r.final.coins,keys:r.final.keys}}))},null,2));
