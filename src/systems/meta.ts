// Run-side bookkeeping for meta progression: what a run writes back to the profile.
// The simulation never reads these writes; it only reads the snapshot taken when the run started.
import { G } from '../core/context';
import { profile, saveProfile } from '../core/profile';
import { CARD_STEPS, HERO_IDS, MASTERY_STEPS, PIECES_MAX, cardLevel, unlocked } from '../data/meta';
import type { HeroId, NpcId } from '../data/meta';
import { NPCS } from '../data/npcs';
import { HEROES } from '../data/heroes';
import { notify } from '../ui/hud';
import { isFinal } from './run-plan';

/** A gate was cleared: the heroes in the formation gain mastery, and the road's record moves forward. */
export function gateCleared() {
  const s = G.state,
    road = s.course as 'ground' | 'sky',
    cap = MASTERY_STEPS[MASTERY_STEPS.length - 1];
  for (const id of new Set<HeroId>(s.formation)) {
    const h = profile.heroes[id];
    h.mastery = Math.min(cap, h.mastery + 1);
  }
  profile.records.gates[road] = Math.max(profile.records.gates[road], Math.min(4, s.stage));
  if (isFinal()) {
    profile.records.clears[road]++;
    // every 인연 who helped at the final gate adds a piece to their card
    for (const id of Object.keys(s.rel)) if (s.rel[id] > 0) addPiece(id as NpcId);
  }
  commit();
}
/** A 의뢰 succeeded: a card piece for the 인연 who was followed, or for the rival of the one who was defied. */
export function questSucceeded(npc: string, mode: string) {
  addPiece((mode === 'follow' ? npc : NPCS[npc].rival) as NpcId);
  saveProfile();
}
function addPiece(id: NpcId) {
  const before = profile.cards[id];
  if (before >= PIECES_MAX) return;
  const now = (profile.cards[id] = before + 1),
    level = cardLevel(now),
    s = G.state;
  (s.pieces ??= {})[id] = (s.pieces[id] || 0) + 1;
  if (level > cardLevel(before)) {
    (s.cardUps ??= []).push(id);
    news(level === 1 ? `새 인연 카드 · ${NPCS[id].name}` : `인연 카드 ${level}단계 · ${NPCS[id].name}`);
  } else news(`인연 카드 조각 +1 · ${NPCS[id].name} (${now} / ${CARD_STEPS[level]})`);
}
/** A line for the top of the next choice screen (a toast would be hidden by that screen). */
function news(text: string) {
  (G.state.news ??= []).push(text);
}
/** The run ended (victory or not): bank what is counted per run. The caller saves the profile. */
export function runEnded() {
  bankGrazes();
  checkUnlocks();
}
function commit() {
  bankGrazes();
  checkUnlocks();
  saveProfile();
}
function bankGrazes() {
  const s = G.state;
  profile.records.grazes += s.grazes - (s.grazesBanked ?? 0);
  s.grazesBanked = s.grazes;
}
function checkUnlocks() {
  for (const id of HERO_IDS) {
    const h = profile.heroes[id];
    if (h.owned || !unlocked(id, profile.records)) continue;
    h.owned = true;
    (G.state.newHeroes ??= []).push(id);
    news('새 영웅 합류 · ' + HEROES[id].name);
    notify('새 영웅 합류 · ' + HEROES[id].name, 2.2);
  }
}
