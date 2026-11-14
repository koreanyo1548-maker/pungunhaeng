// Collection screens (영웅, 인연 카드): a grid of tiles, and a detail popup for the tile that is tapped.
// The screens only describe their entries (tiles and details); this module lays them out. Later growth
// systems (level-ups, 초월) plug into the same detail shape: a progress bar, a track of steps, and actions.
import { $ } from '../core/dom';

/** One cell of the grid. */
export type Tile = {
  id: string;
  name: string;
  image: string;
  /** frame color */
  color: string;
  locked?: boolean;
  /** word on a locked tile (잠김 by default) */
  lockText?: string;
  /** grade under the name: stars, pips or a level */
  grade?: string;
  /** small line under the grade */
  note?: string;
  /** progress toward the next step, drawn as a thin bar (now, goal) */
  progress?: [number, number];
};
/** One step on a growth track (성급, card levels, later 레벨 and 초월). */
export type Step = { label: string; text: string; state: 'done' | 'current' | 'next' };
export type Action = { label: string; note?: string; disabled?: boolean; onClick?: () => void };
/** What the popup shows for one entry. Every part but the header is optional. */
export type Detail = {
  name: string;
  image: string;
  color: string;
  /** line above the name (role, road, title) */
  caption?: string;
  /** grade beside the name */
  grade?: string;
  locked?: boolean;
  progress?: { label: string; now: number; goal: number; text: string };
  /** blocks of text: what the entry does now */
  sections?: { title: string; body: string }[];
  /** the growth track */
  track?: { title: string; steps: Step[] };
  /** buttons at the bottom (none yet: level-ups and 초월 go here) */
  actions?: Action[];
};
export type Collection = {
  eyebrow: string;
  title: string;
  /** line under the title (counts, how to earn more) */
  summary: () => string;
  tiles: () => Tile[];
  detail: (id: string) => Detail;
};

let current: Collection | null = null,
  shown: string | null = null;

const bar = (now: number, goal: number) =>
  `<span class="meter"><i style="width:${goal ? Math.min(100, (100 * now) / goal) : 100}%"></i></span>`;

function renderGrid() {
  const c = current!;
  $('collectionSummary').innerHTML = c.summary();
  $('collectionGrid').innerHTML = c
    .tiles()
    .map(
      t =>
        `<button class="tile${t.locked ? ' locked' : ''}" data-id="${t.id}" style="--c:${t.color}" aria-label="${t.name}${t.locked ? ` (${t.lockText ?? '잠김'})` : ''}"><span class="tile-art"><img alt="" src="${t.image}" draggable="false">${t.locked ? `<em>${t.lockText ?? '잠김'}</em>` : ''}</span><b>${t.name}</b>${t.grade ? `<span class="tile-grade">${t.grade}</span>` : ''}${t.note ? `<small>${t.note}</small>` : ''}${t.progress ? bar(...t.progress) : ''}</button>`,
    )
    .join('');
}

function renderDetail() {
  const d = current!.detail(shown!);
  const p = d.progress,
    t = d.track;
  $('detailBody').innerHTML =
    `<div class="detail-head${d.locked ? ' locked' : ''}" style="--c:${d.color}"><span class="detail-art"><img alt="" src="${d.image}" draggable="false"></span><div>${d.caption ? `<span class="detail-caption">${d.caption}</span>` : ''}<h3>${d.name}</h3>${d.grade ? `<span class="detail-grade">${d.grade}</span>` : ''}</div></div>` +
    (p ? `<div class="detail-progress"><span><b>${p.label}</b>${p.text}</span>${bar(p.now, p.goal)}</div>` : '') +
    (d.sections ?? []).map(s => `<div class="detail-section"><b>${s.title}</b><p>${s.body}</p></div>`).join('') +
    (t
      ? `<div class="detail-track"><b>${t.title}</b><ol>${t.steps.map(s => `<li class="${s.state}"><span>${s.label}</span><p>${s.text}</p></li>`).join('')}</ol></div>`
      : '');
  const box = $('detailActions');
  box.innerHTML = '';
  for (const a of d.actions ?? []) {
    const b = document.createElement('button');
    b.className = 'primary';
    b.disabled = !!a.disabled;
    b.innerHTML = a.label + (a.note ? `<small>${a.note}</small>` : '');
    b.onclick = () => {
      a.onClick?.();
      refreshCollection();
    };
    box.appendChild(b);
  }
  box.classList.toggle('hidden', !box.childElementCount);
}

export function openCollection(c: Collection) {
  current = c;
  $('collectionEyebrow').textContent = c.eyebrow;
  $('collectionTitle').textContent = c.title;
  renderGrid();
  $('collection').classList.remove('hidden');
  $('collection').querySelector('.panel').scrollTop = 0;
}
export function openDetail(id: string) {
  shown = id;
  renderDetail();
  $('detail').classList.remove('hidden');
  $('detail').querySelector('.panel').scrollTop = 0;
}
/** Redraws the open grid and popup, after something changed the profile. */
export function refreshCollection() {
  if (!current) return;
  renderGrid();
  if (shown) renderDetail();
}
function closeDetail() {
  shown = null;
  $('detail').classList.add('hidden');
}
function closeCollection() {
  closeDetail();
  current = null;
  $('collection').classList.add('hidden');
}

$('collectionGrid').addEventListener('click', e => {
  const id = (e.target as HTMLElement).closest<HTMLElement>('.tile')?.dataset.id;
  if (id) openDetail(id);
});
$('collectionClose').onclick = closeCollection;
$('detailClose').onclick = closeDetail;
$('detailBack').onclick = closeDetail;
// tapping the dimmed backdrop around the popup closes it
$('detail').addEventListener('click', e => {
  if (e.target === $('detail')) closeDetail();
});
// Escape closes the popup, then the screen (before the game's own Escape handling sees it)
window.addEventListener(
  'keydown',
  e => {
    if (e.key !== 'Escape' || !current) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    if (shown) closeDetail();
    else closeCollection();
  },
  true,
);
