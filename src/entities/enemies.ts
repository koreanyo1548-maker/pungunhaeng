import { skillCue } from '../render/skill-animation';
import { enemyArt } from '../render/enemy-art';
import { contactFX } from '../render/contact-fx';
import { setPhase } from '../systems/stage-phases';
import { random } from '../core/rng';
import { emit } from '../core/events';
import { G } from '../core/context';
import { boom, tone } from '../core/audio';
import { W, reduced } from '../core/dom';
import { clamp, fxRnd, rnd } from '../core/math';
import { RANKS } from '../data/enemies';
import { TUNE } from '../data/tune';
import { dropChestCoins, dropLoot } from './pickups';
import { hyperQuestKill, questEvent } from '../systems/quest';
import { ROW_CLEAR_SCORE, addScore, bossScore, comboMult, killScore } from '../systems/score';
import { burst, impact, label, paintFX, ring } from '../render/fx';
import { pfx, pfxOn, ramp } from '../render/pfx';
import { enemyFrameIndex } from '../render/util';
import { hasSkill } from '../systems/skill-state';
import { bondArmor } from '../data/skills';
import { difficulty, enemyHealth, region } from '../systems/flow';
import { rowTiers, stepTier, strongTier } from '../systems/ladder';
import { BASELINE } from '../data/baseline';
import { coinsForKill, critical, onComboKill, onNearKill } from '../systems/hero-effects';
import { catchElite } from '../systems/elite';

const ENRAGE = ramp('#ffa475');
export function spawnRow() {
  // the tier ladder (systems/ladder.ts): the step's tier, and in the second half of the step 1 to 5 slots one tier up;
  // now and then a slot holds a 보물상자 instead (as strong as the step's strong tier, it bursts into 엽전)
  const id = ++G.rowId,
    chestSlot = random() < BASELINE.chest.perRow ? Math.floor(rnd(0, 5)) : -1;
  G.rows.set(id, { remaining: 5, missed: false });
  if (chestSlot >= 0) G.state.drops.chest++;
  const tiers = rowTiers(),
    base = stepTier();
  for (let i = 0; i < 5; i++) {
    const tier = tiers[i],
      rank = tier - 1,
      r = RANKS[rank],
      hp = enemyHealth(tier),
      stagger = G.state.stage % 3 === 0 ? Math.abs(i - 2) * 22 : G.state.stage % 3 === 2 ? i * 16 : 0;
    if (i === chestSlot) {
      const ch = enemyHealth(strongTier());
      G.enemies.push({
        x: 48 + i * 96,
        baseX: 48 + i * 96,
        y: -70 - stagger,
        hp: ch,
        maxHp: ch,
        type: 0,
        rank: strongTier() - 1,
        tier: strongTier(),
        chest: true,
        size: 88,
        r: 28,
        color: '#e8b45a',
        phase: rnd(0, 6.28),
        hit: 0,
        row: id,
        weak: false,
        dead: false,
      });
      continue;
    }
    // 바위 (산길 terrain, not on S1) and 관문 stones: as strong as the step's strong tier
    const terrain = region().terrain,
      rockChance = G.state.stage === 1 ? 0 : terrain === 'rock' ? TUNE.rockChance : terrain === 'gate' ? 0.15 : 0;
    if (random() < rockChance) {
      const rh = enemyHealth(strongTier());
      G.enemies.push({
        x: 48 + i * 96,
        baseX: 48 + i * 96,
        y: -70 - stagger,
        hp: rh,
        maxHp: rh,
        type: 0,
        rank: 2,
        tier: strongTier(),
        rock: true,
        size: 74,
        r: 27,
        color: '#c9b391',
        phase: rnd(0, 6.28),
        hit: 0,
        row: id,
        weak: false,
        dead: false,
        shape: Array.from({ length: 9 }, () => fxRnd(0.78, 1.08)),
      });
      continue;
    }
    G.enemies.push({
      x: 48 + i * 96,
      baseX: 48 + i * 96,
      y: -70 - stagger,
      hp,
      maxHp: hp,
      type: r.type,
      rank,
      tier,
      size: r.size,
      r: r.r,
      color: r.color,
      phase: rnd(0, 6.28),
      hit: 0,
      row: id,
      weak: tier === base,
      dead: false,
    });
  }
}
/** The end of 무아지경: the whole screen bursts, and every enemy on it (not the boss) turns into 엽전. */
export function hyperFinish() {
  if (G.mode !== 'play') return;
  for (const e of G.enemies) if (!e.dead && !e.boss && !e.elite && e.y > -40) kill(e, true);
  G.flash = Math.max(G.flash, 0.35);
  G.shake = Math.max(G.shake, 8);
  ring(G.player.x, G.player.y, '#fff2b0', 20, 520, 0.55);
  tone(120, 0.5, 'sawtooth', 0.16, 600);
}
export function resolveRow(e, missed = false) {
  const row = G.rows.get(e.row);
  if (!row) return;
  row.missed ||= missed;
  row.remaining--;
  if (row.remaining === 0) {
    if (!row.missed) {
      addScore(ROW_CLEAR_SCORE);
      if (!G.state.blasting)
        label(`한 줄 전멸 +${ROW_CLEAR_SCORE * (G.state.double > 0 ? 2 : 1)}`, W / 2, 270, '#a3ffe0', 18);
      ring(240, 270, '#a3ffe0', 10, 160, 0.42);
      tone(880, 0.12, 'sine', 0.12, 1320);
      if (!G.state.blasting) {
        emit('rowClear');
      }
    }
    G.rows.delete(e.row);
  }
}
export function kill(e, byHyper = false) {
  if (e.dead) return;
  if (e.elite) {
    // the 정예 적: no kill count, combo or loot, a 장비 상자 (systems/elite.ts)
    e.dead = true;
    const art = enemyArt(e);
    G.wrecks.push({
      image: art.image,
      artSize: art.size,
      x: e.x,
      y: e.y,
      type: e.type,
      size: e.size,
      angle: 0,
      spin: fxRnd(-2, 2),
      life: 0.6,
      total: 0.6,
      boss: false,
      pose: enemyFrameIndex(e),
    });
    G.shake = Math.max(G.shake, 8);
    boom(true);
    catchElite(e);
    return;
  }
  e.dead = true;
  G.state.kills++;
  G.state.combo++;
  G.state.comboTimer = 2;
  const dy = G.player.y - e.y,
    // 근접 × is for the player's own close kills: not the boss, not what 무아지경 cuts down by itself
    near = e.boss || byHyper ? 1 : dy < TUNE.nearDy ? 3 : dy < 304 ? 2 : 1,
    mult = comboMult(G.state.combo);
  addScore((e.boss ? bossScore(G.state.stage) : killScore(e.rank)) * near * mult);
  const color = e.boss ? region().color : e.color;
  const art = enemyArt(e);
  G.wrecks.push({
    image: art.image,
    artSize: art.size,
    x: e.x,
    y: e.y,
    type: e.type,
    size: e.size,
    angle: 0,
    spin: fxRnd(-2, 2),
    life: e.boss ? 1.3 : 0.42,
    total: e.boss ? 1.3 : 0.42,
    boss: !!e.boss,
    pose: enemyFrameIndex(e),
  });
  if (e.boss) {
    paintFX(1, e.x, e.y, 190, 0.38, fxRnd(-0.6, 0.6));
    const shade = ramp(color);
    if (!pfx('plasma', e.x, e.y, { palette: shade, accent: shade.slice(1, 6) })) {
      impact(e.x, e.y, color, 180);
      burst(e.x, e.y, color, 65, 330);
      ring(e.x, e.y, color, 8, 300, 1);
    }
  } else {
    contactFX(e, true);
    if (e.rock || !pfxOn()) burst(e.x, e.y, e.rock ? '#b4a489' : color, e.rock ? 5 : 3, 110);
  }
  G.shake = Math.max(G.shake, e.boss ? 14 : 2.4);
  if (!byHyper) {
    if (G.time - G.lastBoom > 0.055 || e.boss) {
      boom(e.boss);
      G.lastBoom = G.time;
    }
    G.hitstop = Math.max(G.hitstop, e.boss ? 0.09 : 0.018);
  }
  if (e.boss) {
    G.finisher = { x: e.x, y: e.y, life: 1.25, total: 1.25 };
    for (let i = 0; i < 5; i++)
      paintFX(
        3,
        e.x + (i ? fxRnd(-70, 70) : 0),
        e.y + (i ? fxRnd(-65, 65) : 0),
        i ? 150 : 330,
        0.65,
        i * 0.7,
        i * 0.14,
      );
    G.flash = reduced ? 0.06 : 0.24;
    G.state.cleared++;
    setPhase('clear');
  } else {
    onComboKill();
    // 무아지경 kills drop 엽전 only: an item from them could chain 무아지경 without end
    if (e.chest) dropChestCoins(e.x, e.y);
    else dropLoot(e.x, e.y, coinsForKill(), !byHyper);
    if (near > 1 && !G.state.blasting) label('근접 ×' + near, e.x, e.y, '#ffe0a0', 15);
    resolveRow(e);
    if (G.state.combo % 10 === 0) {
      if (!G.state.blasting) label(G.state.combo + ' 연속!', 240, 205, '#fff3b8', 22);
      tone(720, 0.15, 'triangle', 0.13, 1100);
    }
    if (!byHyper && !G.state.blasting) {
      if (G.player.y - e.y < TUNE.nearDy) {
        emit('nearKill', { e });
        onNearKill();
      }
      emit('kill', { e });
    }
    // a passer-by's 적 처치 의뢰 counts every kill but 무아지경's; a 연속 처치 의뢰 leaves 무아지경 kills out
    if (byHyper) hyperQuestKill();
    else questEvent('kills');
  }
}
export function hitEnemy(e, damage, skill?: string) {
  if (e.dead || (e.boss && ['enter', 'return'].includes(e.action))) return;
  if (e.elite) {
    // every hit takes one, whatever its damage (docs/equipment-plan.md, 2장)
    e.hp -= 1;
    e.hit = 0.055;
    e.recoil = 0.12;
    if (G.time - (e.lastImpact ?? -1) > 0.085) {
      e.lastImpact = G.time;
      contactFX(e);
    }
    if (e.hp <= 0) kill(e);
    return;
  }
  const armor = bondArmor();
  if (armor > 1 && (e.rank >= 2 || e.boss || e.rock)) {
    damage *= armor;
    skillCue('swaegap', e.x, e.y, 65, true);
  }
  damage = critical(e, damage);
  e.hp -= damage * (e.boss && e.action === 'recover' ? 1.6 : 1);
  e.hit = 0.055;
  e.recoil = 0.12;
  if (G.time - (e.lastImpact ?? -1) > 0.085) {
    e.lastImpact = G.time;
    if (skill) skillCue(skill, e.x, e.y, e.boss ? 95 : 62, true);
    else if (e.hp > 0) contactFX(e);
  }
  if (e.boss && !e.enraged && e.hp > 0 && e.hp < e.maxHp * 0.45) {
    e.enraged = true;
    paintFX(3, e.x, e.y, 230, 0.65);
    if (!pfx('mana', e.x, e.y + 60, { palette: ENRAGE })) ring(e.x, e.y, '#ffa475', 20, 150, 0.5);
    label('기세 폭발', 240, 190, '#ffc591', 24);
    tone(100, 0.3, 'triangle', 0.2, 50);
  }
  if (e.hp <= 0) kill(e);
}
export function meteor() {
  const x = clamp(G.player.x + rnd(-28, 28), 30, W - 30);
  G.hazards.push({ kind: 'meteor', x, y: -70, warn: BASELINE.meteor.warn, r: 23, vy: 620 });
  if (G.state.stage >= 2) {
    const other = x < W / 2 ? W - 65 : 65;
    G.hazards.push({ kind: 'meteor', x: other, y: -100, warn: BASELINE.meteor.warn + 0.35, r: 23, vy: 620 });
  }
  tone(340, 0.14, 'triangle', 0.14, 280);
}
export function targetable(e) {
  return !e.dead && e.y > -40 && !(e.boss && ['enter', 'return'].includes(e.action));
}
export function nearestEnemy(x, y) {
  let best = null,
    bd = 1e9;
  for (const e of G.enemies) {
    if (!targetable(e)) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}
export function strongestEnemy() {
  let best = null;
  for (const e of G.enemies) {
    if (!targetable(e)) continue;
    if (!best || e.hp > best.hp) best = e;
  }
  return best;
}
export function spear() {
  const x = random() < 0.5 ? clamp(G.player.x + rnd(-75, 75), 30, W - 30) : rnd(30, W - 30);
  G.hazards.push({ kind: 'spear', skin: region().skin, x, y: -70, warn: 0.45, r: 8, vy: rnd(520, 600) });
}
