import { G } from '../core/context';
import { BR, COND } from '../data/branches';
import { HEROES } from '../data/heroes';
import { SKILLS } from '../data/skills';
import { region } from '../systems/flow';

// Run results are stored as 성취 / 미달 / 진행 중; shown in plain words.
const RESULT_TEXT = { 성취: '성공', 미달: '실패' };

/** The road so far (pause and result screens): the hero, the 공명의 조짐 in order, and the 공명 기술 held. */
export function runSummary() {
  if (!G.state) return '';
  const path =
    G.state.path
      .map(
        p =>
          `조짐 ${p.stage} · ${COND[p.t].label.replace(/ \(.*\)$/, '')} · <b>${RESULT_TEXT[p.result] ?? p.result}</b>`,
      )
      .join('<br>') || '아직 없음';
  const sk =
    G.state.skills
      .map(s => `<b style="color:${BR[SKILLS[s.id].br].color}">${SKILLS[s.id].name}</b> Lv ${s.level}`)
      .join(', ') || '없음';
  return `<span class="h">S${G.state.stage} ${region().name} · 영웅</span>${HEROES[G.state.hero].name} · 엽전 사용 ${G.state.spent || 0}냥<span class="h">공명의 조짐</span>${path}<span class="h">공명 기술</span>${sk}`;
}
