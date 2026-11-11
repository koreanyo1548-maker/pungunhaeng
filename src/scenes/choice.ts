import { G } from '../core/context';
import { artImage } from '../core/assets';
import { $ } from '../core/dom';
import { syncHUD } from '../ui/hud';

export function openChoice(o) {
  G.mode = 'choice';
  G.toastTimer = 0;
  $('toast').classList.remove('show');
  G.keys.clear();
  G.pointer = null;
  $('choiceEyebrow').textContent = o.eyebrow;
  $('choiceTitle').textContent = o.title;
  $('choiceSub').innerHTML = o.sub || '';
  const box = $('choiceCards');
  box.innerHTML = '';
  $('choice').querySelector('.formation-preview')?.remove();
  $('choice').querySelector('#formationConfirm')?.remove();
  $('choice').classList.toggle('formation-screen', !!o.confirm);
  $('choice').classList.toggle('reward-screen', !!o.reward);
  box.classList.toggle('hero-grid', !!o.confirm);
  let selected = o.cards[0];
  const preview = document.createElement('div');
  preview.className = 'formation-preview';
  preview.setAttribute('aria-live', 'polite');
  const confirm = document.createElement('button');
  confirm.id = 'formationConfirm';
  confirm.className = 'primary';
  confirm.textContent = o.confirm || '';
  function select(c, el) {
    selected = c;
    for (const button of box.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button === el));
    }
    preview.innerHTML = `${artImage(c.fullArt, 'formation-body')}<div><span class="preview-caption">${c.tag}</span><h3>${c.title}</h3><p>${c.detail}</p></div>`;
  }
  confirm.onclick = () => {
    if (G.mode !== 'choice') return;
    $('choice').classList.add('hidden');
    selected.onPick();
  };
  const n = o.cards.length,
    cols = o.cols || (n === 4 ? 2 : Math.min(n, 3));
  box.style.setProperty('--cols', cols);
  box.classList.toggle('multi', cols > 1);
  for (const c of o.cards) {
    const el = document.createElement(c.acts ? 'div' : 'button');
    // stars: a skill's grade, shown under its icon; 2 marks a boss-enhanced skill (gold frame)
    el.className = 'card' + (c.stars === 2 ? ' tier2' : '');
    el.style.setProperty('--c', c.color);
    const stars = c.stars ? `<span class="stars">${c.starsFrom ? '★ → ' : ''}${'★'.repeat(c.stars)}</span>` : '';
    el.innerHTML = `${c.image ? artImage(c.image, c.artClass || 'choice-art') : ''}${stars}<span class="tag">${c.tag}</span><h3>${c.title}</h3>${c.quote ? `<span class="q">“${c.quote}”</span>` : ''}${c.desc && !o.confirm ? `<p>${c.desc}</p>` : ''}${c.footer ? `<span class="card-footer">${c.footer}</span>` : ''}`;
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
        if (o.confirm) {
          select(c, el);
          return;
        }
        $('choice').classList.add('hidden');
        c.onPick();
      };
    if (c.disabled) {
      (el as HTMLButtonElement).disabled = true;
      el.classList.add('off');
    }
    box.appendChild(el);
    if (o.confirm && c === selected) select(c, el);
  }
  if (o.confirm) {
    box.after(preview);
    preview.after(confirm);
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
