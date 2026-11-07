import { G } from '../core/context';
import { relText } from '../core/math';
import { BR, COND } from '../data/branches';
import { COURSES } from '../data/courses';
import { HEROES } from '../data/heroes';
import { NPCS } from '../data/npcs';
import { ARTS, SKILLS } from '../data/skills';

export function runSummary() {
  if (!G.state) return '';
  const path =
    G.state.path
      .map(
        p =>
          `관문 ${p.stage} · ${NPCS[p.npc].name} — ${p.mode === 'follow' ? '따름' : '거스름'} (${COND[p.t].label}) · <b>${p.result}</b>`,
      )
      .join('<br>') || '아직 없음';
  const sk =
    G.state.skills
      .map(s => {
        const d = SKILLS[s.id];
        return `<b style="color:${BR[d.br].color}">${d.name}</b>${s.mod ? ' + ' + ARTS[s.mod].name : ''}`;
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
  return `<span class="h">${COURSES[G.state.course].label} · 편대</span>${form} · 교대 ${G.state.swaps || 0}회 (강화 ${G.state.combos2 || 0}회) · 엽전 사용 ${G.state.spent || 0}냥<span class="h">지나온 길</span>${path}<span class="h">깨달음과 무공</span>${sk}<span class="h">인연</span>${rel}`;
}
export function dominantTitle() {
  const end = G.state.course === 'sky' ? '하늘에 닿다' : '땅 끝에 서다';
  const c = { yu: 0, gang: 0, gi: 0, art: 0 };
  for (const s of G.state.skills) c[SKILLS[s.id].br]++;
  const top = Object.keys(c).sort((a, b) => c[b] - c[a]),
    m = c[top[0]];
  if (!m) return '맨몸으로 ' + end;
  if (top.filter(k => c[k] === m).length > 1) return '여러 갈래를 아울러 ' + end;
  return BR[top[0]].name + '(' + BR[top[0]].hanja + ')의 길로 ' + end;
}
