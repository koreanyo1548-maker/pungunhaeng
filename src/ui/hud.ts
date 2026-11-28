import { G } from '../core/context';
import { profile } from '../core/profile';
import { artImage, skillImage } from '../core/assets';
import { $, H, W } from '../core/dom';
import { fmt } from '../core/math';
import { BR, COND } from '../data/branches';
import { DRAW_COST, PLAYABLE_HEROES } from '../data/meta';
import { SKILLS } from '../data/skills';
import { region, stageDistance } from '../systems/flow';
import { meetProgress } from '../systems/encounter';
import { windowOn } from '../systems/skill-state';

export function notify(text, duration = 1.5, portrait?: string) {
  $('toast').textContent = text;
  $('toast').classList.toggle('portrait-toast', !!portrait);
  if (portrait) {
    const im = document.createElement('img');
    im.src = portrait;
    im.alt = '';
    im.draggable = false;
    $('toast').prepend(im);
  }
  $('toast').classList.add('show');
  G.toastTimer = duration;
}
export function showBest() {
  $('best').textContent = '최고 ' + fmt(profile.best);
  $('introBest').textContent = '최고 기록 ' + fmt(profile.best);
}
/** The bank of 엽전 on the title screen. */
export function showBank() {
  $('bankCoins').textContent = fmt(profile.coins) + '냥';
  // the ways in on the title: how far each one has come, and a mark on 뽑기 when a draw can be paid for
  // (2026-11: the 인연 tile is hidden while 인연 are not used; index.html, scenes/cards.ts)
  const heroes = PLAYABLE_HEROES.filter(id => profile.heroes[id] > 0).length,
    canDraw = profile.coins >= DRAW_COST;
  $('hubHeroes').textContent = `${heroes} / ${PLAYABLE_HEROES.length}`;
  $('hubDraw').textContent = canDraw ? '뽑기 가능' : `1회 ${DRAW_COST}냥`;
  $('hubBadge').classList.toggle('hidden', !canDraw);
  $('openGacha').classList.toggle('ready', canDraw);
}
export function announce(top, title, sub, color = '#ffe0a0', duration = 2) {
  G.banner = { top, title, sub, color, life: duration, total: duration };
}
export function syncHUD() {
  $('score').textContent = fmt(G.state.score);
  $('distance').textContent = fmt(G.state.distance) + ' m';
  if (G.heartCache !== G.player.hp * 10 + G.player.maxHp) {
    G.heartCache = G.player.hp * 10 + G.player.maxHp;
    $('hearts').innerHTML = Array.from(
      { length: G.player.maxHp },
      (_, i) => `<span class="${i < G.player.hp ? '' : 'lost'}">♥</span>`,
    ).join('');
    $('hearts').setAttribute('aria-label', `남은 체력 ${G.player.hp}`);
  }
  // the stage box: the stage, the time to the next 공명의 조짐 at the latest (the bar), and the distance left to the boss
  const left = Math.max(0, stageDistance() - G.state.distance),
    gauge = meetProgress();
  $('stage').textContent = `S${G.state.stage} ${region().name} · 조짐 ${Math.floor(gauge * 100)}%`;
  syncQuestHUD();
  $('stageName').textContent =
    G.state.phase === 'flight' ? `공명 ${G.state.resonances}번 · 보스까지 ${fmt(left)}m` : `${region().boss} 출현`;
  $('stagefill').style.width = (G.state.phase === 'flight' ? Math.min(100, gauge * 100) : 0) + '%';
  $('bombcount').textContent = G.state.bombs;
  $('blast').disabled = !G.state.bombs || G.mode !== 'play' || ['clear', 'warning'].includes(G.state.phase);
  const boss = G.enemies.find(e => e.boss && !e.dead);
  $('bossbar').classList.toggle('hidden', !boss);
  $('hud').classList.toggle('boss', !!boss);
  $('stageHud').classList.toggle('hidden', !!boss);
  if (boss) {
    $('bossname').textContent = 'S' + G.state.stage + ' · ' + region().boss;
    $('bossfill').style.width = (100 * Math.max(0, boss.hp)) / boss.maxHp + '%';
    $('bosspercent').textContent = Math.ceil((Math.max(0, boss.hp) / boss.maxHp) * 100) + '%';
    $('bossbar').classList.toggle('exposed', boss.action === 'recover');
    $('bossState').textContent =
      boss.action === 'recover'
        ? '빈틈 · 피해 ×1.6'
        : boss.action === 'telegraph'
          ? { fan: '암기 난사 예고', dive: '신법 돌진 예고', lanes: '검진 전개 예고' }[boss.pattern]
          : boss.action === 'attack'
            ? '공격 중'
            : '접근 중';
  }
}
export function syncQuestHUD() {
  // the 공명 기술 held, with their level; a chip lights when its skill goes off (or while a window skill is on)
  const key = G.state.skills.map(s => s.id + s.level).join();
  if (key !== G.skillsKey) {
    G.skillsKey = key;
    $('skills').innerHTML = G.state.skills
      .map(s => {
        const d = SKILLS[s.id];
        return `<span class="chip" data-id="${s.id}" title="${d.name} Lv ${s.level}" style="--c:${BR[d.br].color}">${artImage(skillImage(s.id))}<i class="stars">${s.level}</i></span>`;
      })
      .join('');
  }
  for (const el of $('skills').children) {
    const id = (el as HTMLElement).dataset.id,
      sk = G.state.skills.find(x => x.id === id);
    el.classList.toggle(
      'lit',
      !!sk && (G.time - (sk.flash ?? -9) < 0.3 || ((id === 'hongryeonhwa' || id === 'grimja') && windowOn(id))),
    );
  }
  {
    const cb = $('combo');
    cb.classList.toggle('off', G.state.combo < 5 || G.mode !== 'play');
    $('comboNum').textContent = G.state.combo;
    $('comboMult').textContent = '점수 ×' + Math.min(5, 1 + Math.floor(G.state.combo / 10));
  }
  syncSwapHUD();
  const q = G.state.quest,
    el = $('questHud'),
    show = !!q;
  el.classList.toggle('hidden', !show);
  if (!show) return;
  el.style.setProperty('--c', BR[q.br].color);
  $('questTitle').textContent = '조짐';
  el.classList.toggle('hot', !q.done && !q.failed && q.prog / q.target >= 0.8);
  const qp = skillImage('sign');
  if ($('questImg').dataset.src !== qp) {
    $('questImg').dataset.src = qp;
    $('questImg').src = qp;
  }
  $('questText').textContent = q.done ? '공명' : q.failed ? '흩어짐' : COND[q.t].label;
  $('questCount').textContent = Math.floor(q.prog) + ' / ' + q.target;
  $('questFill').style.width = Math.min(100, (q.prog / q.target) * 100) + '%';
}
/** The action button column: only 필살기 now. The old swap button keeps its place hidden, so 필살기 does not move.
 * There is no charge any more: the ring is full while a 필살기 is left, and the number says how many. */
export function syncSwapHUD() {
  const ub = $('blast');
  ub.style.setProperty('--c', '#ffd77a');
  ub.style.setProperty('--p', G.state.bombs > 0 ? '100' : '0');
  ub.classList.toggle('cool', !G.state.bombs);
  $('ultHint').textContent = '';
  // 오른쪽 줄의 적이 버튼 뒤를 지나가면 버튼을 흐리게 해서 적을 가리지 않는다.
  const veil = G.enemies.some(e => !e.dead && !e.boss && e.x > W - 120 && e.y > H * 0.42 && e.y < H * 0.7);
  ub.classList.toggle('veil', veil);
}
