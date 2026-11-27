import { done } from '../systems/scene-flow';
import { G } from '../core/context';
import { artImage, heroPictures } from '../core/assets';
import { $ } from '../core/dom';
import { heroOwned, profile, saveProfile } from '../core/profile';
import { HEROES } from '../data/heroes';
import { PLAYABLE_HEROES, pieceLevel, starText } from '../data/meta';
import type { HeroId } from '../data/meta';

/** "특성 「질풍」 근접 처치 시 …" with its scope; a trait that waits for a later step says so. */
export function traitText(id: HeroId, L: number) {
  const t = HEROES[id].trait;
  return `<b>특성 「${t.name}」</b> ${t.desc(L)}${t.pending ? ` <i>(${t.pending})</i>` : ''}`;
}
/** "등장 기술 「불굴」 15초 · …": what the hero does when entering as the second of the party. */
export function entryText(id: HeroId, L: number) {
  const e = HEROES[id].entry,
    s = e.seconds(L);
  return `<b>등장 기술 「${e.name}」</b> ${s ? s + '초 · ' : ''}${e.desc(L)}`;
}
/** 편대 편성 (one screen, docs/terms.md): an info window (the hero last touched: portrait, 성급 stars, level, trait,
 *  entry skill), the party's two slots (선봉, 후발) and the roster grid. Tapping a hero puts it in the next free slot
 *  (two at most); tapping a chosen one takes it out, and the 후발 moves up to 선봉. 출발 starts once both are set.
 *  The last run's party is filled in to begin with (profile.formation). Locked heroes are dim and do nothing. */
export function openFormation() {
  const ids = [...PLAYABLE_HEROES].sort((a, b) => Number(heroOwned(b)) - Number(heroOwned(a)));
  const party: HeroId[] = profile.formation.filter(id => heroOwned(id)).slice(0, 2);
  let shown: HeroId | null = party[1] ?? party[0] ?? null;
  G.mode = 'choice';
  G.keys.clear();
  G.pointer = null;
  const root = $('choice');
  root.classList.remove('reward-screen', 'formation-screen', 'encounter-screen');
  root.classList.add('party-screen');
  $('choiceEyebrow').textContent = '편대 편성';
  $('choiceTitle').textContent = '편대';
  $('choiceSub').innerHTML = '';
  const box = $('choiceCards');
  box.className = 'cards party-cards';
  box.innerHTML = `<div class="party-info" aria-live="polite"></div>
    <div class="party-slots"><span class="party-label">편대</span><button class="party-slot" data-slot="0"></button><button class="party-slot" data-slot="1"></button></div>
    <div class="party-grid"></div>`;
  const info = box.querySelector('.party-info') as HTMLElement,
    slots = [...box.querySelectorAll('.party-slot')] as HTMLButtonElement[],
    grid = box.querySelector('.party-grid') as HTMLElement;
  const go = document.createElement('button');
  go.id = 'formationConfirm';
  go.className = 'primary';
  go.textContent = '출발';
  root.querySelector('#formationConfirm')?.remove();
  root.querySelector('.formation-preview')?.remove();
  box.after(go);

  const draw = () => {
    // the info window: the hero last touched
    if (shown) {
      const h = HEROES[shown],
        L = G.state.meta.heroes[shown];
      info.innerHTML = `<div class="party-pic">${artImage(heroPictures[shown], 'party-portrait')}<span class="stars">${starText(pieceLevel(profile.heroes[shown]))}</span></div>
        <div class="party-text"><h3>${h.name}<span class="party-level">Lv ${profile.levels[shown]}</span></h3><span class="tag">${h.projectile}${h.trait.scope === 'party' ? ' · 지원형' : ''}</span><p>${traitText(shown, L)}<br>${entryText(shown, L)}</p></div>`;
    } else
      info.innerHTML =
        '<p class="party-empty">함께 갈 고수 둘을 고른다. 1번은 선봉, 2번은 선봉이 쓰러지면 나서는 후발이다.</p>';
    slots.forEach((el, i) => {
      const id = party[i];
      el.classList.toggle('on', !!id);
      el.innerHTML = `<span class="party-n">${i + 1}</span>${id ? `${artImage(heroPictures[id], 'party-slot-art')}<span>${HEROES[id].name}</span>` : `<span class="party-slot-empty">${i ? '후발' : '선봉'}</span>`}`;
    });
    for (const el of grid.children as HTMLCollectionOf<HTMLButtonElement>) {
      const at = party.indexOf(el.dataset.id as HeroId);
      el.classList.toggle('sel', at >= 0);
      el.setAttribute('aria-pressed', String(at >= 0));
      const n = el.querySelector('.party-n') as HTMLElement;
      n.textContent = at >= 0 ? String(at + 1) : '';
      n.hidden = at < 0;
    }
    go.disabled = party.length < 2;
  };
  for (const id of ids) {
    const el = document.createElement('button'),
      locked = !heroOwned(id);
    el.className = 'card party-hero' + (locked ? ' locked' : '');
    el.dataset.id = id;
    el.style.setProperty('--c', HEROES[id].color);
    el.disabled = locked;
    el.innerHTML = `<span class="party-n" hidden></span>${locked ? '<span class="party-lock">잠김</span>' : ''}${artImage(heroPictures[id], 'party-hero-art')}<h3>${HEROES[id].name}</h3>`;
    el.onclick = () => {
      if (G.mode !== 'choice' || locked) return;
      const at = party.indexOf(id);
      if (at >= 0) party.splice(at, 1);
      else if (party.length < 2) party.push(id);
      else return;
      shown = id;
      draw();
    };
    grid.appendChild(el);
  }
  slots.forEach(
    (el, i) =>
      (el.onclick = () => {
        if (!party[i]) return;
        shown = party[i];
        draw();
      }),
  );
  go.onclick = () => {
    if (G.mode !== 'choice' || party.length < 2) return;
    G.state.formation = [party[0], party[1]];
    G.state.active = 0;
    profile.formation = [party[0], party[1]];
    saveProfile();
    root.classList.add('hidden');
    root.classList.remove('party-screen');
    done('formation');
  };
  draw();
  root.classList.remove('hidden');
  (root.querySelector('.panel') as HTMLElement).scrollTop = 0;
}
