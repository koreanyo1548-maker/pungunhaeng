import { isFinal } from '../systems/run-plan';
import { G } from '../core/context';
import { artImage, heroPictures, npcPictures, skillImage } from '../core/assets';
import { $, H, W } from '../core/dom';
import { fmt } from '../core/math';
import { BR, COND } from '../data/branches';
import { HEROES } from '../data/heroes';
import { ARTS, SKILLS, skillStars } from '../data/skills';
import { TUNE } from '../data/tune';
import { movementName, region, stageDuration } from '../systems/flow';

export function notify(text, duration = 1.5) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  G.toastTimer = duration;
}
export function showBest() {
  $('best').textContent = '최고 ' + fmt(G.best);
  $('introBest').textContent = '최고 기록 ' + fmt(G.best);
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
  $('stage').textContent = isFinal() ? region().name + ' · 최종 관문' : movementName() + ' · 관문 ' + G.state.stage;
  syncQuestHUD();
  $('stageName').textContent = region().name;
  $('stagefill').style.width =
    (G.state.phase === 'flight' ? Math.min(100, (G.state.stageTime / stageDuration()) * 100) : 100) + '%';
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
  const key = G.state.skills.map(s => s.id + (s.mod || '')).join();
  if (key !== G.skillsKey) {
    G.skillsKey = key;
    $('skills').innerHTML = G.state.skills
      .map(s => {
        const d = SKILLS[s.id];
        return `<span class="chip${s.mod ? ' mod' : ''}" data-id="${s.id}" title="${d.name} ${skillStars(s.mod)}${s.mod ? ' (' + ARTS[s.mod].name + ')' : ''}" style="--c:${BR[d.br].color}">${artImage(skillImage(s.id))}<i class="stars">${skillStars(s.mod)}</i></span>`;
      })
      .join('');
  }
  for (const el of $('skills').children) {
    const sk = G.state.skills.find(x => x.id === (el as HTMLElement).dataset.id);
    el.classList.toggle('lit', !!sk && G.time - (sk.flash ?? -9) < 0.3);
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
    show = !!q && q.stage === G.state.stage && !isFinal();
  el.classList.toggle('hidden', !show);
  if (!show) return;
  el.style.setProperty('--c', BR[q.br].color);
  $('questTitle').textContent = q.mode === 'follow' ? '따름' : '거스름';
  $('questImg').classList.toggle('defy', q.mode !== 'follow');
  el.classList.toggle('hot', !q.done && !q.failed && q.prog / q.target >= 0.8);
  const qp = npcPictures[q.npc] || '';
  if ($('questImg').dataset.src !== qp) {
    $('questImg').dataset.src = qp;
    $('questImg').src = qp;
  }
  $('questText').textContent = q.done
    ? '의뢰 성공 · ' + BR[q.br].name + ' 기술 획득'
    : q.failed
      ? '의뢰 실패'
      : COND[q.t].label;
  $('questCount').textContent = Math.floor(q.prog) + ' / ' + q.target;
  $('questFill').style.width = Math.min(100, (q.prog / q.target) * 100) + '%';
}
export function syncSwapHUD() {
  const nxtId = G.state.formation[1 - G.state.active],
    nxt = HEROES[nxtId],
    cd = Math.max(0, G.state.swapReady - G.time),
    sw = $('swap'),
    ub = $('blast');
  sw.style.setProperty('--c', nxt.color);
  sw.style.setProperty('--p', String(Math.round(100 - (cd / TUNE.swapCd) * 100)));
  const pic = heroPictures[nxtId] || '';
  if ($('swapImg').dataset.src !== pic) {
    $('swapImg').dataset.src = pic;
    $('swapImg').src = pic;
  }
  $('swapCd').textContent = cd > 0 ? String(Math.ceil(cd)) : '';
  $('swapName').textContent = '교체 · ' + nxt.name;
  const boss = G.enemies.find(e => e.boss && !e.dead),
    win = cd <= 0 && G.mode === 'play' && (G.time - G.state.lastHurt < 1.5 || (!!boss && boss.action === 'recover'));
  sw.classList.toggle('cool', cd > 0);
  sw.classList.toggle('burst', win);
  ub.style.setProperty('--c', '#ffd77a');
  ub.style.setProperty('--p', String(G.state.bombs >= G.state.maxBombs ? 100 : Math.round(G.state.charge)));
  ub.classList.toggle('cool', !G.state.bombs);
  {
    const q = G.state.quest,
      qt = q && !q.done && !q.failed && q.stage === G.state.stage ? q.t : null,
      hint = $('ultHint');
    let ht = '',
      go = false;
    if (qt === 'blastKill') {
      const n = G.enemies.filter(e => !e.dead && !e.boss && e.y > 0 && e.y < H).length;
      ht = '화면 적 ' + n;
      go = n >= 6 && G.state.bombs > 0;
    } else if (qt === 'blast') {
      ht = G.state.bombs > 0 ? '필살기!' : '충전 중';
      go = G.state.bombs > 0;
    }
    hint.textContent = ht;
    hint.classList.toggle('go', go);
    ub.classList.toggle('focus', ['fullCharge', 'charge', 'blast', 'blastKill'].includes(qt));
    if (go) ub.classList.add('burst');
    else ub.classList.remove('burst');
  }
  // 오른쪽 줄의 적이 버튼 뒤를 지나가면 버튼을 흐리게 해서 적을 가리지 않는다.
  const veil = G.enemies.some(e => !e.dead && !e.boss && e.x > W - 120 && e.y > H * 0.42 && e.y < H * 0.7);
  sw.classList.toggle('veil', veil && !sw.classList.contains('burst'));
  ub.classList.toggle('veil', veil && !ub.classList.contains('burst'));
}
