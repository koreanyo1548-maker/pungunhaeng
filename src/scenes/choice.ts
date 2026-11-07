import { G } from '../core/context';
import { artImage } from '../core/assets';
import { $ } from '../core/dom';
import { syncHUD } from '../ui/hud';

export function openChoice(o) {
  G.mode = 'choice';
  G.keys.clear();
  G.pointer = null;
  $('choiceEyebrow').textContent = o.eyebrow;
  $('choiceTitle').textContent = o.title;
  $('choiceSub').innerHTML = o.sub || '';
  const box = $('choiceCards');
  box.innerHTML = '';
  const n = o.cards.length,
    cols = o.cols || (n === 4 ? 2 : Math.min(n, 3));
  box.style.setProperty('--cols', cols);
  box.classList.toggle('multi', cols > 1);
  for (const c of o.cards) {
    const el = document.createElement(c.acts ? 'div' : 'button');
    el.className = 'card';
    el.style.setProperty('--c', c.color);
    el.innerHTML = `${c.image ? artImage(c.image, c.artClass || 'choice-art') : ''}<span class="tag">${c.tag}</span><h3>${c.title}</h3>${c.quote ? `<span class="q">“${c.quote}”</span>` : ''}${c.desc ? `<p>${c.desc}</p>` : ''}`;
    if (c.acts) {
      const row = document.createElement('div');
      row.className = 'acts';
      for (const a of c.acts) {
        const b = document.createElement('button');
        b.className = 'act';
        b.style.setProperty('--c', a.color);
        b.innerHTML = a.html;
        b.onclick = () => {
          if (G.mode !== 'choice') return;
          $('choice').classList.add('hidden');
          a.onPick();
        };
        row.appendChild(b);
      }
      el.appendChild(row);
    } else
      el.onclick = () => {
        if (G.mode !== 'choice') return;
        $('choice').classList.add('hidden');
        c.onPick();
      };
    if (c.disabled) {
      (el as HTMLButtonElement).disabled = true;
      el.classList.add('off');
    }
    box.appendChild(el);
  }
  $('choice').classList.remove('hidden');
  $('choice').querySelector('.panel').scrollTop = 0;
  syncHUD();
}
export function resumePlay() {
  $('choice').classList.add('hidden');
  G.mode = 'play';
  G.player.inv = Math.max(G.player.inv, 0.8);
  syncHUD();
}
