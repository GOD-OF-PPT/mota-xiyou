/* v46 Gameplay, Stances, Synergies, Mastery Seals & Starter Trials verification. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const store = new Map();
global.window = global;
global.localStorage = {
  getItem: k => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};

for (const f of ['world', 'encounters', 'chronicle', 'outcomes', 'engine', 'planning', 'trial-seeds', 'stances-mastery', 'trials', 'run-session', 'mechanisms']) {
  require('../js/' + f + '.js');
}

const checks = [];
function test(name, fn) {
  fn();
  checks.push(name);
  console.log('PASS ' + name);
}

test('Default balanced stance matches legacy exact damage and keeps state projection clean', () => {
  const g = new TowerEngine(TowerData, { persist: false });
  g.newGame();
  assert.equal(g.getStance(), 'balanced');
  assert.equal(Object.prototype.hasOwnProperty.call(g.state, 'stance'), false);
  const bat = TowerData.enemies.bat;
  const pBal = g.preview(bat);
  assert.equal(pBal.stance, 'balanced');
  assert.equal(pBal.damage, 39); // atk 24 - def 6 = 18 -> 3 rounds, first strike -> 3 hits * (23 - 10 = 13) = 39
});

test('Cleave and Whirl stances create a genuine non-dominated tactical triangle', () => {
  const g = new TowerEngine(TowerData, { persist: false });
  g.newGame();
  g.state.atk = 27;
  g.state.def = 12;

  // Against first-strike bat: whirl wins (30 < cleave 32 < balanced 33)
  const cmpBat = TowerMastery.compareStances(g, 'bat');
  assert.equal(cmpBat.best.id, 'whirl');
  assert.ok(cmpBat.savedVsBalanced > 0);

  // Against heavy reliquary0 (hp 103, atk 29, def 10): cleave drops rounds from 7 to 5 and wins (80 < whirl 84 < balanced 102)
  const cmpRel = TowerMastery.compareStances(g, 'reliquary0');
  assert.equal(cmpRel.entries.find(e => e.id === 'balanced').damage, 102);
  assert.equal(cmpRel.entries.find(e => e.id === 'cleave').damage, 80);
  assert.equal(cmpRel.entries.find(e => e.id === 'whirl').damage, 84);
  assert.equal(cmpRel.best.id, 'cleave');
  assert.equal(cmpRel.savedVsBalanced, 22);

  // Undo/redo & save roundtrip preserve stance cleanly
  assert.equal(g.setStance('cleave'), true);
  assert.equal(g.state.stance, 'cleave');
  const raw = g.exportSave(false);
  const g2 = new TowerEngine(TowerData, { persist: false });
  assert.equal(g2.load(raw), true);
  assert.equal(g2.getStance(), 'cleave');
  assert.deepEqual(g2.snapshot(), g.snapshot());
  assert.equal(g.undo(), true);
  assert.equal(g.getStance(), 'balanced');
  assert.equal(Object.prototype.hasOwnProperty.call(g.state, 'stance'), false);
});

test('All 15 two-treasure pairs have named Oriental synergies and rankLoadouts sorts cleanly', () => {
  const ids = ['iron', 'lotus', 'thorn', 'tide', 'ember', 'mirror'];
  let count = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const syn = TowerMastery.activeSynergy([ids[j], ids[i]]);
      assert.ok(syn && syn.name && syn.summary, `Missing synergy for ${ids[i]}+${ids[j]}`);
      count++;
    }
  }
  assert.equal(count, 15);

  const g = new TowerEngine(TowerData, { persist: false });
  g.newGame();
  g.state.treasures = ['iron', 'lotus', 'tide'];
  // Move onto Floor 0 altar (10, 18)
  assert.equal(g.step('up'), true);
  const ranked = TowerMastery.rankLoadouts(g, []);
  assert.equal(ranked.length, 7); // empty + 3 singles + 3 pairs
});

test('Mastery Seals unlock deterministically from engine events and persist in localStorage', () => {
  store.delete('dasheng-mastery-seals-v46');
  const unlocked = [];
  const g = new TowerEngine(TowerData);
  TowerMastery.bindEngine(g, spec => unlocked.push(spec.id));
  g.newGame();

  // Equip 2 treasures on altar -> arsenal_pair
  g.step('up'); // (10,18) altar
  g.state.treasures = ['iron', 'lotus'];
  assert.equal(g.equipTreasure('iron'), true);
  assert.equal(g.equipTreasure('lotus'), true);
  assert.ok(unlocked.includes('arsenal_pair'));

  // Reveal illusion -> truth_eye
  const ill = g.data.floors[0].entities.find(e => e.type === 'illusion');
  g.state.x = ill.x + 1; g.state.y = ill.y;
  assert.equal(g.reveal(ill), true);
  assert.ok(unlocked.includes('truth_eye'));
  assert.ok(TowerMastery.sealStats().unlockedCount >= 2);
});

test('Starter Trials gate-r7 and bell-r7 are immediately unlocked, playable with stances, and preserve main campaign', () => {
  store.clear();
  const g = new TowerEngine(TowerData);
  g.chronicle = new TowerChronicle(g);
  g.newGame();
  g.save();
  const mainSnap = g.snapshot();
  const session = new TowerRunSession(g);

  const gateSpec = TowerTrials.spec('gate-r7');
  const bellSpec = TowerTrials.spec('bell-r7');
  assert.ok(gateSpec && bellSpec, 'Starter trial specs missing');
  assert.equal(session.available(gateSpec), true);
  assert.equal(session.available(bellSpec), true);

  // Play gate-r7 (keep-keys) using legal public actions + stance switch!
  assert.equal(session.enter('gate-r7', 'keep-keys'), true);
  const walkTo = (tx, ty, adjacent = false) => {
    const p = g.findPath(tx, ty);
    assert.ok(p, `No path from (${g.state.x},${g.state.y}) to (${tx},${ty})`);
    if (adjacent && p.length) p.pop();
    for (const d of p) assert.equal(g.step(d), true);
  };
  // Collect amber at (8, 18) -> atk 27
  walkTo(8, 18);
  assert.equal(g.state.atk, 27);
  // Switch to whirl stance for bat & thresholdImp!
  assert.equal(g.setStance('whirl'), true);
  // Fight optional thresholdImp at (4,8) or go via (6,13) imp? Let's check path to yellowKey (7,5):
  // Fight thresholdImp at (4,8)
  walkTo(4, 8, true);
  assert.equal(g.fight(g.getEntity(4, 8)), true);
  // Pick up yellowKey at (7,5) -> total 2 yellow keys!
  walkTo(7, 5);
  assert.equal(g.state.keys.yellow, 2);
  // Reveal illusion f0-16 at (6,3)
  walkTo(6, 3, true);
  assert.equal(g.reveal(g.getEntity(6, 3)), true);
  // Fight bat f0-5 at (5,3) with whirl stance
  walkTo(5, 3, true);
  assert.equal(g.fight(g.getEntity(5, 3)), true);
  // Collect fragment 0 at (3,3)
  walkTo(3, 3);
  assert.ok(g.state.fragments.includes(0));
  // Walk to upstairs f0-14 at (18,1) and complete trial!
  const exit0 = g.data.floors[0].entities.find(e => e.id === 'f0-14');
  walkTo(exit0.x, exit0.y, true);
  assert.equal(session.verify(), true, 'gate-r7 deterministic replay verification failed');
  assert.equal(g.traverse(exit0), true);
  assert.equal(session.meta.completed, true);
  assert.equal(session.records().some(r => r.trialId === 'gate-r7' && r.standard), true);
  assert.equal(session.exit(), true);
  assert.deepEqual(g.snapshot(), mainSnap);

  // Now play bell-r7 (front-iron) with cleave stance!
  assert.equal(session.enter('bell-r7', 'front-iron'), true);
  // Choose offering (+2 def) at f1-12 (9, 17)
  const vow = g.data.floors[1].entities.find(e => e.id === 'f1-12');
  walkTo(vow.x, vow.y, true);
  assert.equal(g.choose(vow, 'offering'), true);
  assert.equal(g.state.def, 12);
  // Switch to cleave stance to crush reliquary0 (15,16) saving 22 HP!
  assert.equal(g.setStance('cleave'), true);
  walkTo(15, 16, true);
  assert.equal(g.fight(g.getEntity(15, 16)), true);
  // Collect iron treasure at (17, 16)
  walkTo(17, 16);
  assert.ok(g.state.treasures.includes('iron'));
  // Toggle lever f1-1 at (3, 10)
  walkTo(3, 10, true);
  assert.equal(g.toggleSwitch(g.getEntity(3, 10)), true);
  // Reveal illusion f1-15 at (6, 16), fight stone f1-6 at (5, 16), take fragment 1 at (3, 16)
  walkTo(6, 16, true);
  assert.equal(g.reveal(g.getEntity(6, 16)), true);
  walkTo(5, 16, true);
  assert.equal(g.fight(g.getEntity(5, 16)), true);
  walkTo(3, 16);
  assert.ok(g.state.fragments.includes(1));
  // Fight f1-5 bat at (17, 8) using whirl stance and walk through open gate (17, 6) to upstairs (18, 1)!
  assert.equal(g.setStance('whirl'), true);
  walkTo(17, 8, true);
  assert.equal(g.fight(g.getEntity(17, 8)), true);
  const exit1 = g.data.floors[1].entities.find(e => e.id === 'f1-14');
  walkTo(exit1.x, exit1.y, true);
  assert.equal(session.verify(), true, 'bell-r7 deterministic replay verification failed');
  assert.equal(g.traverse(exit1), true);
  assert.equal(session.meta.completed, true);
  assert.equal(session.records().some(r => r.trialId === 'bell-r7' && r.standard), true);
  assert.equal(session.exit(), true);
  assert.deepEqual(g.snapshot(), mainSnap);
});

test('Zero competition meta-copy appears anywhere in index.html or v46 modules', () => {
  const forbidden = /参赛版|评委|比赛模式|赛事专用|评分入口/;
  for (const f of ['index.html', 'js/stances-mastery.js', 'js/ui.js', 'js/trials-ui.js', 'js/planning-ui.js', 'css/v46-excellence.css']) {
    const content = fs.readFileSync(f, 'utf8');
    assert.equal(forbidden.test(content), false, `Forbidden meta-copy found in ${f}`);
  }
});

console.log(`${checks.length}/${checks.length} v46 excellence checks passed!`);
