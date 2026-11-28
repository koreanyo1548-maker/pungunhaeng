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
/** 영웅 고르기 (one screen, 2026-11: one hero a run, no more 편대 of two): an info window (the hero chosen: portrait,
 *  성급 stars, level, trait) and the roster grid. Tapping a hero chooses it; 출발 starts. The last run's hero is
 *  chosen to begin with (profile.formation). Locked heroes are dim and do nothing.
 *  (The party-* class names and styles are those of the old 편대 screen.) */
export function openHeroPick() {
  const ids = [...PLAYABLE_HEROES].sort((a, b) => Number(heroOwned(b)) - Number(heroOwned(a)));
  let chosen: HeroId | null = profile.formation.find(id => heroOwned(id)) ?? ids.find(id => heroOwned(id)) ?? null;
  G.mode = 'choice';
  G.keys.clear();
  G.pointer = null;
  const root = $('choice');
  root.classList.remove('reward-screen', 'formation-screen', 'encounter-screen');
  root.classList.add('party-screen');
  $('choiceEyebrow').textContent = '출전';
  $('choiceTitle').textContent = '영웅';
  $('choiceSub').innerHTML = '';
  const box = $('choiceCards');
  box.className = 'cards party-cards';
  box.innerHTML = `<div class="party-info" aria-live="polite"></div><div class="party-grid"></div>`;
  const info = box.querySelector('.party-info') as HTMLElement,
    grid = box.querySelector('.party-grid') as HTMLElement;
  const go = document.createElement('button');
  go.id = 'formationConfirm';
  go.className = 'primary';
  go.textContent = '출발';
  root.querySelector('#formationConfirm')?.remove();
  root.querySelector('.formation-preview')?.remove();
  box.after(go);

  const draw = () => {
    if (chosen) {
      const h = HEROES[chosen],
        L = G.state.meta.heroes[chosen];
      info.innerHTML = `<div class="party-pic">${artImage(heroPictures[chosen], 'party-portrait')}<span class="stars">${starText(pieceLevel(profile.heroes[chosen]))}</span></div>
        <div class="party-text"><h3>${h.name}<span class="party-level">Lv ${profile.levels[chosen]}</span></h3><span class="tag">${h.projectile}</span><p>${traitText(chosen, L)}</p></div>`;
    } else info.innerHTML = '<p class="party-empty">함께 갈 영웅 하나를 고른다.</p>';
    for (const el of grid.children as HTMLCollectionOf<HTMLButtonElement>) {
      const on = el.dataset.id === chosen;
      el.classList.toggle('sel', on);
      el.setAttribute('aria-pressed', String(on));
    }
    go.disabled = !chosen;
  };
  for (const id of ids) {
    const el = document.createElement('button'),
      locked = !heroOwned(id);
    el.className = 'card party-hero' + (locked ? ' locked' : '');
    el.dataset.id = id;
    el.style.setProperty('--c', HEROES[id].color);
    el.disabled = locked;
    el.innerHTML = `${locked ? '<span class="party-lock">잠김</span>' : ''}${artImage(heroPictures[id], 'party-hero-art')}<h3>${HEROES[id].name}</h3>`;
    el.onclick = () => {
      if (G.mode !== 'choice' || locked) return;
      chosen = id;
      draw();
    };
    grid.appendChild(el);
  }
  go.onclick = () => {
    if (G.mode !== 'choice' || !chosen) return;
    G.state.hero = chosen;
    profile.formation = [chosen];
    saveProfile();
    root.classList.add('hidden');
    root.classList.remove('party-screen');
    done('hero');
  };
  draw();
  root.classList.remove('hidden');
  (root.querySelector('.panel') as HTMLElement).scrollTop = 0;
}
