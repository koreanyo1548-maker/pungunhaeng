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
  $('choice').classList.remove('party-screen');
  box.classList.remove('party-cards');
  $('choice').classList.toggle('formation-screen', !!o.confirm);
  $('choice').classList.toggle('reward-screen', !!o.reward);
  $('choice').classList.toggle('encounter-screen', !!o.encounter);
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
    // a hero not yet collected can be looked at, not chosen
    confirm.disabled = !!c.locked;
    confirm.textContent = c.locked ? '아직 합류하지 않은 영웅' : o.confirm;
    preview.classList.toggle('locked', !!c.locked);
    preview.innerHTML = `${artImage(c.fullArt, 'formation-body')}<div><span class="preview-caption">${c.tag}</span><h3>${c.heading ?? c.title}</h3><p>${c.detail}</p></div>`;
  }
  confirm.onclick = () => {
    if (G.mode !== 'choice' || selected.locked) return;
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
    el.className = 'card' + (c.stars === 2 ? ' tier2' : '') + (c.locked ? ' locked' : '');
    el.style.setProperty('--c', c.color);
    const stars = c.stars ? `<span class="stars">${c.starsFrom ? '★ → ' : ''}${'★'.repeat(c.stars)}</span>` : '';
    el.innerHTML = `${c.image ? artImage(c.image, c.artClass || 'choice-art') : ''}${stars}<span class="tag">${c.tag}</span><h3>${c.title}</h3>${c.quote ? `<span class="q">“${c.quote}”</span>` : ''}${c.desc && !o.confirm ? `<p>${c.desc}</p>` : ''}${c.footer ? `<span class="card-footer">${c.footer}</span>` : ''}`;
    if (o.encounter) {
      const person = document.createElement('div');
      person.className = 'encounter-person';
      person.innerHTML = el.innerHTML;
      el.replaceChildren(person);
    }
    if (c.acts) {
      const row = document.createElement('div');
      row.className = 'acts';
      for (const [i, a] of c.acts.entries()) {
        const b = document.createElement('button');
        b.className = 'act';
        b.style.setProperty('--c', a.color);
        b.innerHTML = a.html;
        b.disabled = !!a.disabled;
        b.onclick = () => {
          if (G.mode !== 'choice') return;
          $('choice').classList.add('hidden');
          a.onPick();
        };
        if (o.encounter) {
          const offer = document.createElement('section');
          offer.className = 'encounter-offer';
          offer.innerHTML = `<div class="encounter-offer-info" id="encounter-offer-${i}">${a.detail}</div>`;
          b.setAttribute('aria-describedby', `encounter-offer-${i}`);
          offer.appendChild(b);
          row.appendChild(offer);
        } else row.appendChild(b);
      }
      el.appendChild(row);
      if (o.encounter && o.rules) {
        const rules = document.createElement('details');
        rules.className = 'encounter-rules';
        rules.innerHTML = `<summary>정·사와 만남 규칙 보기</summary><p>${o.rules}</p>`;
        el.appendChild(rules);
      }
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
