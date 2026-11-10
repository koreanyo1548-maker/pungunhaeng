import { withSkill, skillCue, skillAura, queueSkillLearn } from '../render/skill-animation';
import { skillCallout } from '../render/callout';
import { isFinal } from './run-plan';
import { random } from '../core/rng';
import { on } from '../core/events';
import { G } from '../core/context';
import { W } from '../core/dom';
import { rnd } from '../core/math';
import { BR } from '../data/branches';
import { NPCS } from '../data/npcs';
import { ARTS, SKILLS } from '../data/skills';
import { TUNE } from '../data/tune';
import { hitEnemy, targetable } from '../entities/enemies';
import { burst, label } from '../render/fx';
import { D, column } from './combat';
import { syncHUD } from '../ui/hud';

export function hasSkill(id) {
  return !!G.state?.skills?.some(s => s.id === id);
}
export function trig(type, data = {}) {
  if (!G.state) return;
  for (const s of [...G.state.skills]) {
    const d = SKILLS[s.id];
    if (d.trig !== type || G.time < (s.ready || 0)) continue;
    s.ready = G.time + (d.cd || 0);
    s.flash = G.time;
    performSkill(s, () => d.fx?.(data, s));
    if (s.mod && G.time >= (s.modReady || 0)) {
      s.modReady = G.time + 0.5;
      withSkill(ARTS[s.mod].solo, () => ARTS[s.mod].fx());
      if (+s.mod === 6) {
        skillCue('art_cheolgap', G.player.x, G.player.y, 190, true);
        skillAura('art_cheolgap', 0.5);
      }
    }
  }
}
export function updateSkills(dt, oldX) {
  for (const s of G.strikes) s.life -= dt;
  G.strikes = G.strikes.filter(s => s.life > 0);
  const active = ['flight', 'boss'].includes(G.state.phase);
  for (const s of [...G.state.skills]) {
    const d = SKILLS[s.id];
    if (d.trig !== 'tick' || !active || G.time < (s.ready || 0)) continue;
    if (d.when && !d.when()) continue;
    s.ready = G.time + d.cd;
    s.flash = G.time;
    performSkill(s, () => d.fx(null, s));
    if (s.mod && G.time >= (s.modReady || 0)) {
      s.modReady = G.time + 0.5;
      withSkill(ARTS[s.mod].solo, () => ARTS[s.mod].fx());
      if (+s.mod === 6) {
        skillCue('art_cheolgap', G.player.x, G.player.y, 190, true);
        skillAura('art_cheolgap', 0.5);
      }
    }
  }
  if (hasSkill('hoeseon')) {
    G.state.moveAcc += Math.abs(G.player.x - oldX);
    if (G.state.orbs < 3 && G.state.moveAcc >= TUNE.orbDistance) {
      G.state.moveAcc = 0;
      G.state.orbs++;
      skillCue('hoeseon', G.player.x, G.player.y, 100);
      label('비검 +1', G.player.x, G.player.y - 60, BR.yu.color, 16);
    }
    G.state.orbAngle += dt * 4.2;
    for (let i = 0; i < G.state.orbs; i++) {
      const a = G.state.orbAngle + (i * Math.PI * 2) / G.state.orbs,
        ox = G.player.x + Math.cos(a) * 58,
        oy = G.player.y - 10 + Math.sin(a) * 58;
      for (const e of [...G.enemies]) {
        if (e.dead || (e.orbHit || 0) > G.time) continue;
        if (Math.hypot(e.x - ox, e.y - oy) < (e.boss ? 60 : e.r) + 10) {
          e.orbHit = G.time + 0.22;
          hitEnemy(e, D() * 1.4, 'hoeseon');
        }
      }
      for (const h of G.hazards) {
        if (!h.warn && !h.dead && Math.hypot(h.x - ox, h.y - oy) < h.r + 10) {
          h.dead = true;
          skillCue('hoeseon', ox, oy, 50, true);
          burst(h.x, h.y, BR.yu.color, 5, 90);
        }
      }
    }
  }
  if (G.state.rain > 0) {
    G.state.rain -= dt;
    G.state.rainTimer -= dt;
    if (G.state.rainTimer <= 0) {
      G.state.rainTimer = 0.16;
      const list = G.enemies.filter(targetable);
      const t = list.length ? list[Math.floor(rnd(0, list.length))] : null;
      column(t ? t.x : rnd(40, W - 40), D() * 4, BR.gi.color, 26, 'rain');
    }
  }
  // 천문: 관계가 +인 인연은 돕고, −인 인연은 막아선다.
  if (isFinal() && G.state.phase === 'boss') {
    const allies = Object.keys(G.state.rel).filter(k => G.state.rel[k] > 0),
      foes = Object.keys(G.state.rel).filter(k => G.state.rel[k] < 0),
      boss = G.enemies.find(e => e.boss && !e.dead);
    if (boss && allies.length && !['enter', 'return'].includes(boss.action)) {
      G.state.allyTimer -= dt;
      if (G.state.allyTimer <= 0) {
        G.state.allyTimer = 4.5;
        const n = NPCS[allies[Math.floor(rnd(0, allies.length))]];
        label(n.name + '의 도움', boss.x, boss.y + 120, BR[n.br].color, 18);
        column(boss.x, D() * 10, BR[n.br].color, 44);
      }
    }
    if (foes.length) {
      G.state.foeTimer -= dt;
      if (G.state.foeTimer <= 0) {
        G.state.foeTimer = 5.5;
        const n = NPCS[foes[Math.floor(rnd(0, foes.length))]],
          side = random() < 0.5 ? 30 : W - 30,
          a0 = Math.atan2(G.player.y - 120, G.player.x - side);
        for (let i = 0; i < 5; i++) {
          const a = a0 + (i - 2) * 0.16;
          G.hazards.push({
            kind: 'bullet',
            foe: true,
            x: side,
            y: 120,
            vx: Math.cos(a) * 230,
            vy: Math.sin(a) * 230,
            r: 8,
            warn: 0,
            color: BR[n.br].color,
          });
        }
        label(n.name + '의 방해', side < W / 2 ? 120 : W - 120, 100, '#ff9d8a', 16);
      }
    }
  }
}
export function learn(id) {
  G.state.skills.push({ id });
  SKILLS[id].gain?.();
  queueSkillLearn(id);
  label('새 기술 · ' + SKILLS[id].name, 240, 400, BR[SKILLS[id].br].color, 22);
  syncHUD();
}

// 깨달음 with an action trigger fire from combat events (tick and passive skills are handled in updateSkills).
export function registerAbilityListeners() {
  on('blast', d => trig('blast', d));
  on('graze', d => trig('graze', d));
  on('step', d => trig('step', d));
  on('rowClear', () => trig('rowClear'));
  on('nearKill', d => trig('nearKill', d));
  on('combo10', () => trig('combo10'));
}

/** Visuals are emitted only for actual effects; the gameplay callback still always runs. */
function performSkill(s, fn) {
  const id = s.id,
    hp = G.player.hp,
    shield = G.player.shield;
  const hasTarget = G.enemies.some(targetable);
  withSkill(id, fn);
  if (id === 'hoegi' && G.player.hp === hp) return;
  if (id === 'art_cheolgap') {
    // State transitions draw creation and consumption; the name is called when a shield actually forms.
    if (G.player.shield && !shield) skillCallout(s);
    return;
  }
  if (id === 'art_cheonma' && !hasTarget) return;
  skillCallout(s);
  if (!['yusu', 'bungsan', 'art_cheonma'].includes(id))
    skillCue(id, G.player.x, G.player.y - 45, id === 'hyeolma' ? 165 : 115);
  if (id === 'muyoung') skillAura(id, 0.3);
  if (id === 'geumgang') skillAura(id, 0.45);
  if (id === 'hyeolma') skillAura(id, G.state.hyper, 160);
}
