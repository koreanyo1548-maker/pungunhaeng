import { G } from '../core/context';
import { BR, COND } from '../data/branches';
import { HEROES } from '../data/heroes';
import { NPCS } from '../data/npcs';
import { NPC_IDS } from '../data/roster';
import { SKILLS } from '../data/skills';
import { alignText } from '../systems/alignment';
import { region } from '../systems/flow';
import { bondLevel } from '../systems/relationship';

// Run results are stored as 성취 / 미달 / 진행 중; shown in plain words.
const RESULT_TEXT = { 성취: '성공', 미달: '실패' };

/** The road so far (pause and result screens): party, 선·악, the 만남 in order, 인연 levels and their skills. */
export function runSummary() {
  if (!G.state) return '';
  const path =
    G.state.path
      .map(p =>
        p.npc
          ? `만남 ${p.stage} · ${NPCS[p.npc].name} — ${p.mode === 'follow' ? '따름' : '거스름'} (${COND[p.t].label.replace(/ \(.*\)$/, '')}) · <b>${RESULT_TEXT[p.result] ?? p.result}</b>`
          : `만남 ${p.stage} · ${p.who} (행인) — <b>${p.result}</b>`,
      )
      .join('<br>') || '아직 없음';
  const bonds =
    NPC_IDS.filter(id => bondLevel(id))
      .map(id => `${NPCS[id].name} ${bondLevel(id)}단계`)
      .join(', ') || '없음';
  const sk =
    G.state.skills.map(s => `<b style="color:${BR[SKILLS[s.id].br].color}">${SKILLS[s.id].name}</b>`).join(', ') ||
    '없음';
  const form = G.state.formation.map((id, i) => (i ? '후발 ' : '선봉 ') + HEROES[id].name).join(' · ');
  return `<span class="h">S${G.state.stage} ${region().name} · 편대</span>${form} · ${alignText()} · 엽전 사용 ${G.state.spent || 0}냥<span class="h">지나온 길</span>${path}<span class="h">인연</span>${bonds}<span class="h">기술</span>${sk}`;
}
