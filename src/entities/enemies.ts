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
import { addPickup } from './pickups';
import { burst, impact, label, paintFX, ring } from '../render/fx';
import { pfx, pfxOn, ramp } from '../render/pfx';
import { enemyFrameIndex } from '../render/util';
import { hasSkill } from '../systems/abilities';
import { gainCharge } from '../systems/combat';
import { difficulty, region } from '../systems/flow';
import { traitNearCharge, traitOn } from '../systems/formation';

const ENRAGE = ramp('#ffa475');
export function spawnRow() {
  const id = ++G.rowId,
    weak = Math.floor(rnd(0, 5)),
    maxRank = Math.min(3, G.state.stage);
  G.rows.set(id, { remaining: 5, missed: false });
  for (let i = 0; i < 5; i++) {
    const rank =
        i === weak
          ? 0
          : random() < (G.state.stage === 1 ? TUNE.earlyWeak : G.state.stage === 2 ? TUNE.secondWeak : 0.25)
            ? 0
            : Math.max(1, maxRank - (random() < 0.45 ? 1 : 0)),
      r = RANKS[rank],
      hp = r.hp * (1 + 0.28 * difficulty()),
      stagger = G.state.stage % 3 === 0 ? Math.abs(i - 2) * 22 : G.state.stage % 3 === 2 ? i * 16 : 0;
    const terrain = region().terrain,
      rockChance =
        terrain === 'rock' ? (G.state.stage === 1 ? TUNE.earlyRock : TUNE.rockChance) : terrain === 'gate' ? 0.15 : 0;
    if (i !== weak && random() < rockChance) {
      const rh = (G.state.stage === 1 ? TUNE.earlyRockHp : 26) * (1 + 0.28 * difficulty());
      G.enemies.push({
        x: 48 + i * 96,
        baseX: 48 + i * 96,
        y: -70 - stagger,
        hp: rh,
        maxHp: rh,
        type: 0,
        rank: 2,
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
      size: r.size,
      r: r.r,
      color: r.color,
      phase: rnd(0, 6.28),
      hit: 0,
      row: id,
      weak: i === weak,
      dead: false,
    });
  }
}
export function resolveRow(e, missed = false) {
  const row = G.rows.get(e.row);
  if (!row) return;
  row.missed ||= missed;
  row.remaining--;
  if (row.remaining === 0) {
    if (!row.missed) {
      G.state.score += 500;
      if (!G.state.blasting) label('한 줄 전멸 +500', W / 2, 270, '#a3ffe0', 18);
      gainCharge(8);
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
  e.dead = true;
  G.state.kills++;
  G.state.combo++;
  G.state.comboTimer = 2;
  const dy = G.player.y - e.y,
    near = e.boss ? 1 : dy < 154 ? 3 : dy < 304 ? 2 : 1,
    mult = Math.min(5, 1 + Math.floor(G.state.combo / 10));
  G.state.score += (e.boss ? 5000 + G.state.stage * 1000 : 100 + e.rank * 65) * near * mult;
  gainCharge(e.boss ? 20 : 3);
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
    for (let i = 0; i < 3; i++) addPickup('coin', e.x + rnd(-15, 15), e.y + rnd(-10, 10));
    if (G.state.kills % 18 === 0 && G.player.weapon < 3 && !G.pickups.some(p => p.kind === 'power'))
      addPickup('power', e.x, e.y);
    if (near > 1 && !G.state.blasting) label('근접 ×' + near, e.x, e.y, '#ffe0a0', 15);
    resolveRow(e);
    if (G.state.combo % 10 === 0) {
      if (!G.state.blasting) label(G.state.combo + ' 연속!', 240, 205, '#fff3b8', 22);
      tone(720, 0.15, 'triangle', 0.13, 1100);
    }
    if (!byHyper && !G.state.blasting) {
      if (G.player.y - e.y < TUNE.nearDy) {
        emit('nearKill', { e });
        if (traitOn('pungun')) gainCharge(traitNearCharge());
      }
      emit('kill', { e });
      if (G.state.combo % 10 === 0) emit('combo10');
    }
  }
}
export function hitEnemy(e, damage, skill?: string) {
  if (e.dead || (e.boss && ['enter', 'return'].includes(e.action))) return;
  if (hasSkill('swaegap') && (e.rank >= 2 || e.boss || e.rock)) {
    damage *= 1.4;
    skillCue('swaegap', e.x, e.y, 65, true);
  }
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
  G.hazards.push({ kind: 'meteor', x, y: -70, warn: 1.05, r: 23, vy: 620 });
  if (G.state.stage >= 2) {
    const other = x < W / 2 ? W - 65 : 65;
    G.hazards.push({ kind: 'meteor', x: other, y: -100, warn: 1.4, r: 23, vy: 620 });
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
