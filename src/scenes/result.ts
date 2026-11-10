import { G } from '../core/context';
import { relText } from '../core/math';
import { BR, COND } from '../data/branches';
import { COURSES } from '../data/courses';
import { HEROES } from '../data/heroes';
import { NPCS } from '../data/npcs';
import { ARTS, SKILLS, skillStars } from '../data/skills';

// Run results are stored as 성취 / 미달 / 진행 중; shown in plain words.
const RESULT_TEXT = { 성취: '성공', 미달: '실패' };

export function runSummary() {
  if (!G.state) return '';
  const path =
    G.state.path
      .map(
        p =>
          `관문 ${p.stage} · ${NPCS[p.npc].name} — ${p.mode === 'follow' ? '따름' : '거스름'} (${COND[p.t].label.replace(/ \(.*\)$/, '')}) · <b>${RESULT_TEXT[p.result] ?? p.result}</b>`,
      )
      .join('<br>') || '아직 없음';
  const sk =
    G.state.skills
      .map(s => {
        const d = SKILLS[s.id];
        return `<b style="color:${BR[d.br].color}">${d.name}</b> ${skillStars(s.mod)}${s.mod ? ' (' + ARTS[s.mod].name + ')' : ''}`;
      })
      .join(', ') || '없음';
  const rel =
    Object.keys(G.state.rel)
      .filter(k => G.state.rel[k])
      .map(k => `${NPCS[k].name} ${relText(G.state.rel[k])}`)
      .join(', ') || '없음';
  const form = G.state.formation
    .map(id => HEROES[id].name + (HEROES[id].terrain === G.state.course ? '' : ' (적성 아님)'))
    .join(' · ');
  return `<span class="h">${COURSES[G.state.course].label} · 편대</span>${form} · 교체 ${G.state.swaps || 0}회 (제때 교체 ${G.state.combos2 || 0}회) · 엽전 사용 ${G.state.spent || 0}냥<span class="h">지나온 길</span>${path}<span class="h">기술</span>${sk}<span class="h">인연 호감도</span>${rel}`;
}
export function dominantTitle() {
  const end = G.state.course === 'sky' ? '하늘에 닿다' : '땅 끝에 서다';
  const c = { yu: 0, gang: 0, gi: 0, art: 0 };
  for (const s of G.state.skills) c[SKILLS[s.id].br]++;
  const top = Object.keys(c).sort((a, b) => c[b] - c[a]),
    m = c[top[0]];
  if (!m) return '맨몸으로 ' + end;
  if (top.filter(k => c[k] === m).length > 1) return '여러 계열을 아울러 ' + end;
  return (top[0] === 'art' ? '보스 기술로 ' : BR[top[0]].name + ' 계열로 ') + end;
}
