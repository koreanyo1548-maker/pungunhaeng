// Equipment presentation only: transactions remain in systems/gear and core/profile.
import { heroPictures } from '../core/assets';
import { $ } from '../core/dom';
import { equip, equippedGear, gearOf, profile, wearer } from '../core/profile';
import { fmt } from '../core/math';
import { HEROES } from '../data/heroes';
import { SLOTS, SLOT_INFO, GEAR_ITEMS, gearFactors, gearName, plusCost, ENCHANT_COST } from '../data/gear';
import type { Gear, Slot } from '../data/gear';
import type { HeroId } from '../data/meta';
import { FACTORS, addFactors, factorText } from '../data/factors';
import type { Factors, FactorId } from '../data/factors';
import { gearPicture, slotPicture, GRADE_COLORS } from '../render/gear-art';
import { enhance, enchant, plusBlock, plusMaterials, enchantMaterials } from '../systems/gear';
import { refreshCollection } from '../ui/collection';
import type { DetailTab } from '../ui/collection';
import { showBank } from '../ui/hud';

let hero: HeroId = 'pungun',
  filter: Slot | 'all' = 'all',
  selected: number | null = null;
let mode: 'detail' | 'plus' | 'enchant' = 'detail',
  material: number | null = null,
  message = '';
let opener: HTMLElement | null = null;
const factors = (g: Gear) =>
  gearFactors(g)
    .map(f => factorText(f.factor, f.value))
    .join(' · ');
const tile = (g: Gear, attr: string, picked = false) => {
  const who = wearer(g.uid);
  return `<button class="equipment-tile${picked ? ' picked' : ''}" ${attr} style="--grade:${GRADE_COLORS[g.grade - 1]}" aria-label="${gearName(g)}${who ? ` · ${HEROES[who].name} 착용 중` : ''}"><img src="${gearPicture(g.item, g.grade)}" alt=""><span class="equipment-stars">${'★'.repeat(g.grade)}</span>${g.plus ? `<span class="equipment-plus">+${g.plus}</span>` : ''}<b>${GEAR_ITEMS[g.item].name}</b>${who ? `<small>${HEROES[who].name}</small>` : ''}</button>`;
};
function slotButton(id: HeroId, slot: Slot) {
  const g = gearOf(profile.equipped[id][slot]);
  return `<button class="loadout-slot" data-slot="${slot}" aria-label="${SLOT_INFO[slot].name}: ${g ? gearName(g) : '비어 있음'}" style="--grade:${g ? GRADE_COLORS[g.grade - 1] : '#66786e'}"><small>${SLOT_INFO[slot].name}</small><img src="${g ? gearPicture(g.item, g.grade) : slotPicture(slot)}" alt=""><b>${g ? '★'.repeat(g.grade) + (g.plus ? ` +${g.plus}` : '') : '비어 있음'}</b></button>`;
}
export function gearTab(id: HeroId): DetailTab {
  if (hero !== id) {
    hero = id;
    filter = 'all';
  }
  const sum: Factors = {};
  for (const g of equippedGear(id)) addFactors(sum, gearFactors(g));
  const list = profile.gear
    .filter(g => filter === 'all' || GEAR_ITEMS[g.item].slot === filter)
    .sort((a, b) => b.grade - a.grade || b.plus - a.plus || a.uid - b.uid);
  return {
    label: '장비',
    compact: true,
    html: `<div class="loadout"><div>${slotButton(id, 'weapon')}${slotButton(id, 'robe')}</div><div class="loadout-hero"><img src="${heroPictures[id]}" alt="${HEROES[id].name}"><b>${HEROES[id].name}</b><small>Lv ${profile.levels[id]}</small></div><div>${slotButton(id, 'charm')}${slotButton(id, 'manual')}</div></div><details class="equipment-summary"><summary>장비 효과 합계</summary><p>${
      Object.entries(sum)
        .map(([f, v]) => factorText(f as FactorId, v!))
        .join(' · ') || '착용한 장비가 없습니다'
    }</p></details><div class="equipment-bank">보관함 <b>${profile.gear.length}</b><span>${fmt(profile.coins)}냥</span></div><div class="equipment-filters" aria-label="장비 부위">${(['all', ...SLOTS] as const).map(s => `<button data-filter="${s}" aria-pressed="${s === filter}">${s === 'all' ? '전체' : SLOT_INFO[s].name}</button>`).join('')}</div><div class="equipment-grid">${list.map(g => tile(g, `data-gear="${g.uid}"`)).join('')}</div>${!list.length ? '<p class="equipment-empty">장비가 없습니다.<br>정예 적 보상이나 뽑기의 장비 상자로 얻을 수 있어요.</p>' : ''}`,
    bind(root) {
      root.onclick = e => {
        const el = (e.target as HTMLElement).closest<HTMLElement>('[data-filter],[data-gear],[data-slot]');
        if (!el) return;
        if (el.dataset.filter) {
          filter = el.dataset.filter as typeof filter;
          refreshCollection();
        }
        if (el.dataset.gear) openGear(Number(el.dataset.gear), el);
        if (el.dataset.slot) {
          filter = el.dataset.slot as Slot;
          const uid = profile.equipped[id][filter];
          if (uid !== undefined) openGear(uid, el);
          else {
            refreshCollection();
            $('detailBody').querySelector('.equipment-bank').scrollIntoView({ block: 'nearest' });
          }
        }
      };
    },
  };
}
function modal() {
  let el = document.getElementById('gearDetail');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gearDetail';
    el.className = 'overlay modal hidden';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'gearTitle');
    $('detail').parentElement.appendChild(el);
    el.onclick = e => {
      if (e.target === el) closeGear();
    };
    el.onkeydown = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeGear();
      }
      if (e.key === 'Tab') {
        const buttons = [...el!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const first = buttons[0],
          last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
  }
  return el;
}
function openGear(uid: number, from: HTMLElement) {
  selected = uid;
  mode = 'detail';
  material = null;
  message = '';
  opener = from;
  $('detail').inert = true;
  modal().classList.remove('hidden');
  renderGear();
}
function closeGear() {
  modal().classList.add('hidden');
  $('detail').inert = false;
  refreshCollection();
  const selector = opener?.dataset.slot ? `[data-slot="${opener.dataset.slot}"]` : `[data-gear="${selected}"]`;
  $('detailBody').querySelector(selector)?.focus();
  selected = null;
}
function comparison(g: Gear) {
  const current = gearOf(profile.equipped[hero][GEAR_ITEMS[g.item].slot]);
  if (current?.uid === g.uid) return '<p>이 영웅이 착용 중</p>';
  const diff: Factors = {};
  addFactors(diff, gearFactors(g));
  if (current) for (const f of gearFactors(current)) diff[f.factor] = (diff[f.factor] ?? 0) - f.value;
  return `<div class="equipment-compare"><b>착용 시 변화</b><small>현재: ${current ? gearName(current) : '빈 장착 칸'}</small>${
    Object.entries(diff)
      .filter(([, v]) => Math.abs(v!) > 0.00001)
      .map(
        ([f, v]) =>
          `<p class="${v! > 0 ? 'gain' : 'loss'}">${v! > 0 ? factorText(f as FactorId, v!) : factorText(f as FactorId, -v!).replace(' +', ' −')}</p>`,
      )
      .join('') || '<p>효과 변화 없음</p>'
  }</div>`;
}
function renderGear(focus = true) {
  const g = selected === null ? undefined : gearOf(selected);
  if (!g) {
    closeGear();
    return;
  }
  const slot = GEAR_ITEMS[g.item].slot,
    who = wearer(g.uid),
    mine = who === hero;
  let content = '',
    actions = '';
  if (mode === 'detail') {
    content = mine ? '<p class="equipment-equipped">이 영웅이 착용 중</p>' : comparison(g);
    actions = `<button class="primary" data-action="equip">${mine ? '장착 해제' : who ? `${HEROES[who].name}에게서 옮겨 장착` : '장착'}</button><div class="equipment-action-row"><button class="secondary" data-action="plus">강화</button><button class="secondary" data-action="enchant">인챈트</button></div>`;
  } else if (mode === 'plus') {
    const mat = plusMaterials(g)[0],
      block = plusBlock(g);
    const next = { ...g, plus: Math.min(5, g.plus + 1) };
    content = `<div class="equipment-compare"><b>강화 +${g.plus} → +${next.plus}</b><p>${factors(g)}</p><p class="gain">→ ${factors(next)}</p></div><p>비용: ${fmt(plusCost(g.grade, g.plus))}냥 · 지닌 엽전 ${fmt(profile.coins)}냥</p><p>소모 재료: ${mat ? gearName(mat) : '동일 장비 없음'}</p>${mat ? `<div class="equipment-material">${tile(mat, 'disabled')}<p>이 장비 1개가 사라집니다.<br>미착용 동일 장비 중 낮은 등급·강화부터 사용합니다.</p></div>` : ''}${block ? `<p class="equipment-empty">${block}</p>` : ''}`;
    actions = `<button class="primary" data-action="confirm-plus" ${block ? 'disabled' : ''}>${g.plus >= 5 ? '최대 강화' : '재료를 사용해 강화'}</button>`;
  } else {
    const mats = enchantMaterials(g),
      m = material === null ? undefined : mats.find(x => x.uid === material);
    content = `<p>영웅 능력치 효과 하나를 무작위로 부여합니다.${g.enchant ? '<br>현재 인챈트는 새 효과로 교체됩니다.' : ''}</p><p>비용: ${ENCHANT_COST}냥 · 지닌 엽전 ${fmt(profile.coins)}냥</p>${m ? `<div class="equipment-consume"><b>소모: ${gearName(m)}</b><p>${factors(m)}<br>확정하면 이 장비가 사라집니다.</p></div>` : '<p>소모할 미착용 장비 1개를 선택하세요.</p>'}<div class="equipment-grid material-grid">${mats.map(x => tile(x, `data-material="${x.uid}"`, x.uid === material)).join('')}</div>${!mats.length ? '<p>사용할 미착용 장비가 없습니다.</p>' : ''}`;
    actions = `<button class="primary" data-action="confirm-enchant" ${!m || profile.coins < ENCHANT_COST ? 'disabled' : ''}>선택 재료를 사용해 인챈트</button>`;
  }
  modal().innerHTML = `<div class="panel equipment-dialog mode-${mode}"><header><small>${HEROES[hero].name} · ${SLOT_INFO[slot].name}${mode !== 'detail' ? ` · ${mode === 'plus' ? '강화' : '인챈트'}` : ''}</small><button data-action="close" aria-label="장비 상세 닫기">×</button></header><div class="equipment-dialog-scroll"><div class="equipment-detail-art" style="--grade:${GRADE_COLORS[g.grade - 1]}"><img src="${gearPicture(g.item, g.grade)}" alt=""></div><h3 id="gearTitle">${gearName(g)}</h3><div class="equipment-stats">${gearFactors(
    g,
  )
    .map((f, i) => `<p><small>${i ? '인챈트' : '기본 효과'}</small>${factorText(f.factor, f.value)}</p>`)
    .join(
      '',
    )}</div><p class="equipment-message" role="status">${message}</p>${content}</div><div class="equipment-dialog-actions">${actions}${mode !== 'detail' ? '<button class="secondary" data-action="back">장비 정보로</button>' : ''}</div></div>`;
  modal()
    .querySelectorAll<HTMLButtonElement>('[data-action]')
    .forEach(
      b =>
        (b.onclick = () => {
          switch (b.dataset.action) {
            case 'close':
              closeGear();
              return;
            case 'back':
              mode = 'detail';
              material = null;
              break;
            case 'equip':
              equip(hero, slot, mine ? null : g.uid);
              message = mine ? '장착을 해제했어요.' : '장착했어요.';
              break;
            case 'plus':
              mode = 'plus';
              message = '';
              break;
            case 'enchant':
              mode = 'enchant';
              material = null;
              message = '';
              break;
            case 'confirm-plus':
              if (enhance(g.uid)) {
                message = `강화 +${g.plus} 완료`;
                mode = 'detail';
              }
              break;
            case 'confirm-enchant':
              if (material !== null && enchant(g.uid, material)) {
                message = '인챈트 완료';
                mode = 'detail';
                material = null;
              }
              break;
          }
          showBank();
          refreshCollection();
          renderGear();
        }),
    );
  modal()
    .querySelectorAll<HTMLButtonElement>('[data-material]')
    .forEach(
      b =>
        (b.onclick = () => {
          material = Number(b.dataset.material);
          renderGear(false);
          modal().querySelector<HTMLButtonElement>(`[data-material="${material}"]`)?.focus({ preventScroll: true });
        }),
    );
  if (focus) {
    modal().querySelector('.panel')!.scrollTop = 0;
    modal().querySelector<HTMLButtonElement>('[data-action="close"]')?.focus({ preventScroll: true });
  }
}
