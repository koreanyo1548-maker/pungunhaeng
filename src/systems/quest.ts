import { on } from '../core/events';
import { G } from '../core/context';
import { chime } from '../core/audio';
import { BR, COND } from '../data/branches';
import { NPCS } from '../data/npcs';
import { TUNE } from '../data/tune';
import { label, ring } from '../render/fx';
import { resumePlay } from '../scenes/choice';
import { beginStage, region } from './flow';
import { announce, syncHUD } from '../ui/hud';

export function questTarget(c) {
  const r = region();
  return Math.max(1, Math.round(c.n * (r.branch && COND[c.t].br !== r.branch ? (COND[c.t].off ?? TUNE.mismatch) : 1)));
}
export function questEvent(type, amount = 1) {
  if (G.state && G.mode === 'play') {
    G.state.stats ??= {};
    G.state.stats[type] =
      type === 'combo' ? Math.max(G.state.stats[type] || 0, G.state.combo) : (G.state.stats[type] || 0) + amount;
  }
  const q = G.state?.quest;
  if (!q || q.done || q.failed || q.t !== type || G.mode !== 'play' || G.state.phase === 'clear') return;
  if (type === 'combo') q.prog = Math.max(q.prog, G.state.combo);
  else q.prog += amount;
  if (q.prog >= q.target) {
    completeQuest();
    return;
  }
  if (type !== 'combo' && type !== 'charge') q.tick = G.time;
}
export function completeQuest() {
  const q = G.state.quest,
    n = NPCS[q.npc];
  q.done = true;
  q.prog = q.target;
  if (q.mode === 'follow') G.state.rel[q.npc] = (G.state.rel[q.npc] || 0) + 1;
  else {
    G.state.rel[q.npc] = (G.state.rel[q.npc] || 0) - 1;
    G.state.rel[n.rival] = (G.state.rel[n.rival] || 0) + 1;
  }
  if (G.state.questPath) G.state.questPath.result = '성취';
  announce(
    '頓悟',
    BR[q.br].name + '(' + BR[q.br].hanja + ')의 깨달음',
    q.mode === 'follow' ? n.name + '의 뜻을 이루었다' : n.name + '의 뜻을 거슬러 제 길을 증명했다',
    BR[q.br].color,
    1.4,
  );
  ring(G.player.x, G.player.y, BR[q.br].color, 10, 260, 0.6);
  G.flash = 0.15;
  chime();
  G.state.donoDelay = 0.6;
  syncHUD();
}
export function closeQuest() {
  const q = G.state?.quest;
  if (q && !q.done && !q.failed) {
    q.failed = true;
    if (G.state.questPath) G.state.questPath.result = '미달';
    if (G.mode === 'play') label('화두를 이루지 못했다', 240, 330, '#d6cdbd', 18);
  }
}
export function acceptQuest(id, qmode) {
  const n = NPCS[id],
    met = G.state.met[id] || 0,
    q = n.quests[Math.min(met, 1)],
    c = qmode === 'follow' ? q.follow : q.defy;
  G.state.met[id] = met + 1;
  G.state.quest = {
    npc: id,
    mode: qmode,
    t: c.t,
    target: questTarget(c),
    prog: 0,
    br: COND[c.t].br,
    done: false,
    failed: false,
    stage: G.state.stage,
  };
  G.state.path.push({ stage: G.state.stage, npc: id, mode: qmode, t: c.t, result: '진행 중' });
  G.state.questPath = G.state.path[G.state.path.length - 1];
  resumePlay();
  beginStage();
  label((qmode === 'follow' ? '따른다' : '거스른다') + ' · ' + n.name, 240, 430, BR[G.state.quest.br].color, 20);
}

// 화두 progress is driven by combat events. blastKill is derived from the blast event.
export function registerQuestListeners() {
  on('charge', d => questEvent('charge', d.n));
  on('fullCharge', () => questEvent('fullCharge'));
  on('blast', d => {
    questEvent('blast');
    if (d.killed >= 6) questEvent('blastKill');
  });
  on('graze', () => questEvent('graze'));
  on('zigzag', () => questEvent('step'));
  on('rowClear', () => questEvent('rowClear'));
  on('nearKill', () => questEvent('nearKill'));
  on('kill', () => questEvent('combo'));
}
