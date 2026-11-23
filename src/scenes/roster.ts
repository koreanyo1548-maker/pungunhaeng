// 영웅: who has joined, each hero's 성급 and level. Opened from the title screen.
// Heroes join and rise in 성급 through pieces from 뽑기 (systems/gacha.ts); each 성급 opens ten levels, raised here
// with banked 엽전 (레벨업). A level raises the attack (one shot a volley at every level).
import { heroPictures } from '../core/assets';
import { shotPicture } from '../render/projectiles';
import { $ } from '../core/dom';
import { heroLevelCap, heroOwned, heroStars, levelUp, levelUpCost, profile } from '../core/profile';
import { fmt } from '../core/math';
import { showBank } from '../ui/hud';
import { HEROES } from '../data/heroes';
import { PLAYABLE_HEROES, LEVEL_MAX, LEVELS_PER_STAR, PIECE_STEPS, starText } from '../data/meta';
import { TUNE } from '../data/tune';
import type { HeroId } from '../data/meta';
import { openCollection, refreshCollection } from '../ui/collection';
import { equip, equippedGear, gearOf, profile as save, wearer } from '../core/profile';
import { ENCHANT_COST, GEAR_ITEMS, SLOTS, SLOT_INFO, gearFactors, gearName, plusCost } from '../data/gear';
import type { Gear, Slot } from '../data/gear';
import { addFactors, factorText } from '../data/factors';
import type { FactorId, Factors } from '../data/factors';
import { gearPicture, slotPicture } from '../render/gear-art';
import { enchant, enchantMaterials, enhance, plusBlock } from '../systems/gear';
import type { Collection, Detail, Tile } from '../ui/collection';
import { LOCKED_HOW } from './setup';

const attackAt = (level: number) => TUNE.attack + level - 1;

/** [pieces held, pieces the next 성급 needs] (the last 성급 counts as full) */
function toNext(id: HeroId): [number, number] {
  const pieces = profile.heroes[id],
    stars = heroStars(id);
  return stars >= LEVEL_MAX ? [1, 1] : [pieces, PIECE_STEPS[stars]];
}

function tile(id: HeroId): Tile {
  const h = HEROES[id];
  if (!heroOwned(id)) return { id, name: h.name, image: heroPictures[id], color: h.color, locked: true };
  // on the portrait: the level in its top-left corner, the name and the 성급 under it (pieces are in the popup)
  return {
    id,
    name: h.name,
    image: heroPictures[id],
    color: h.color,
    badge: `Lv ${profile.levels[id]}`,
    grade: starText(heroStars(id)),
  };
}

/** The 영웅 popup: the portrait, then the level, 성급, trait and entry skill; tabs 레벨 (the basic shot, attack,
 *  레벨업) and 성급 (pieces, what each 성급 brings). A hero not joined yet shows how to join in the 레벨 tab. */
function detail(id: HeroId): Detail {
  const h = HEROES[id],
    stars = heroStars(id),
    L = Math.max(0, stars - 1),
    caption = `${h.projectile} · ${h.trait.scope === 'party' ? '지원형 (특성이 편대 전체에)' : '특성은 싸우는 동안'}`;
  const seconds = h.entry.seconds(L);
  const level = profile.levels[id],
    cap = heroLevelCap(id);
  const sections = [
    {
      title: stars ? `Lv ${level} · <span class="stars">${starText(stars)}</span>` : '<span class="stars">☆☆☆☆☆</span>',
      body: '',
    },
    {
      title: `특성 「${h.trait.name}」`,
      body: h.trait.desc(L) + (h.trait.pending ? ` (${h.trait.pending})` : ''),
    },
    {
      title: `등장 기술 「${h.entry.name}」 · 후발로 나설 때`,
      body: (seconds ? seconds + '초 · ' : '') + h.entry.desc(L),
    },
  ];
  const track = {
    title: '성급마다 · ★3·★5에서 등장 기술 모양이 바뀐다',
    steps: PIECE_STEPS.map((need, i) => ({
      label: `★${i + 1}`,
      text:
        `조각 ${need}개 · ${i ? '' : '합류 · '}최대 Lv ${(i + 1) * LEVELS_PER_STAR} · ${h.trait.desc(i)}` +
        (h.entry.seconds(i) ? ` · 등장 ${h.entry.seconds(i)}초` : '') +
        (i === 2 || i === 4 ? ` · ${h.entry.name} 강화` : ''),
      state: (i + 1 < stars ? 'done' : i + 1 === stars ? 'current' : 'next') as 'done' | 'current' | 'next',
    })),
  };
  const [now, goal] = toNext(id);
  const starTab = {
    label: '성급',
    progress: stars
      ? {
          label: '조각',
          text: stars >= LEVEL_MAX ? `${now}개 · 최고 성급` : `${now} / ${goal} · 다음 성급까지 ${goal - now}개`,
          now,
          goal,
        }
      : { label: '조각', text: `0 / 1 · 1개면 합류`, now: 0, goal: 1 },
    track,
  };
  const levelTab = stars
    ? {
        label: '레벨',
        figure: {
          image: shotPicture(id),
          text: `<b>공격력 ${attackAt(level)}</b> · ${h.projectile} 한 번에 1발<br>레벨 ${level} / ${cap} · 레벨마다 공격력 +1, 성급마다 최대 레벨 +${LEVELS_PER_STAR}`,
        },
        actions: [levelAction(id)],
      }
    : { label: '레벨', sections: [{ title: '합류', body: LOCKED_HOW }] };
  return {
    name: h.name,
    image: heroPictures[id],
    color: h.color,
    caption,
    locked: !stars,
    grade: stars ? '' : '잠김',
    sections,
    tabs: stars ? [levelTab, gearTab(id), starTab] : [levelTab, starTab],
  };
}

// ---- the 장비 tab (docs/equipment-plan.md, 3장): four slots; tapping one opens it (what can go in it, 강화, 인챈트)
let gearHero: HeroId | null = null,
  openSlot: Slot | null = null,
  enchanting = false,
  armed: number | null = null;

const factorsLine = (list: { factor: FactorId; value: number }[]) =>
  list.map(f => factorText(f.factor, f.value)).join(' · ');
const gearLine = (g: Gear) =>
  `${factorsLine(gearFactors(g).slice(0, 1))}${g.enchant ? ` · <i>인챈트 ${factorText(g.enchant.factor, g.enchant.value)}</i>` : ''}`;
const itemButton = (g: Gear, attrs: string, note = '', armedOne = false) =>
  `<button class="gear-item${armedOne ? ' armed' : ''}" ${attrs}><img alt="" src="${gearPicture(g.item, g.grade)}" draggable="false"><span><b>${gearName(g)}</b><em>${gearLine(g)}</em>${note ? `<small>${note}</small>` : ''}</span></button>`;

function gearTab(id: HeroId) {
  if (gearHero !== id) {
    gearHero = id;
    openSlot = null;
    enchanting = false;
    armed = null;
  }
  const worn = equippedGear(id),
    sum: Factors = {};
  for (const g of worn) addFactors(sum, gearFactors(g));
  const total = (Object.keys(sum) as FactorId[]).map(f => factorText(f, sum[f]!)).join(' · ');
  const rows = SLOTS.map(slot => {
    const g = gearOf(save.equipped[id][slot]),
      info = SLOT_INFO[slot];
    const row = `<button class="gear-slot${openSlot === slot ? ' open' : ''}" data-slot="${slot}"><img alt="" src="${g ? gearPicture(g.item, g.grade) : slotPicture(slot)}" draggable="false"><span><small>${info.name} · ${info.kindName}</small><b>${g ? gearName(g) : '비어 있음'}</b>${g ? `<em>${gearLine(g)}</em>` : ''}</span></button>`;
    return row + (openSlot === slot ? slotPanel(slot, g) : '');
  }).join('');
  return {
    label: '장비',
    html: `<div class="gear-sum"><b>판에서 받는 장비 효과</b><p>${total || '없음 · 칸을 눌러 장비를 낀다'}</p></div><div class="gear-slots">${rows}</div>`,
    bind: (root: HTMLElement) => {
      root.onclick = e => {
        const el = (e.target as HTMLElement).closest<HTMLElement>('[data-slot],[data-uid],[data-act],[data-mat]');
        if (!el) return;
        if (el.dataset.slot) {
          const slot = el.dataset.slot as Slot;
          openSlot = openSlot === slot ? null : slot;
          enchanting = false;
          armed = null;
        } else if (el.dataset.uid) equip(id, openSlot!, Number(el.dataset.uid));
        else if (el.dataset.mat) {
          const m = Number(el.dataset.mat),
            target = save.equipped[id][openSlot!];
          if (armed !== m) armed = m;
          else if (target !== undefined && enchant(target, m)) {
            enchanting = false;
            armed = null;
            showBank();
          }
        } else if (el.dataset.act === 'off') equip(id, openSlot!, null);
        else if (el.dataset.act === 'plus') {
          if (enhance(save.equipped[id][openSlot!]!)) showBank();
        } else if (el.dataset.act === 'enchant') {
          enchanting = !enchanting;
          armed = null;
        }
        refreshCollection();
      };
    },
  };
}

/** An open slot: 강화 and 인챈트 for what it holds, then the pieces that can go in it (or, choosing an 인챈트
 *  material, every piece nobody wears). */
function slotPanel(slot: Slot, g: Gear | undefined) {
  let out = '<div class="gear-panel">';
  if (g) {
    const block = plusBlock(g),
      cost = g.plus < 5 ? plusCost(g.grade, g.plus) : 0;
    out += `<div class="gear-acts"><button class="primary" data-act="plus"${block ? ' disabled' : ''}>강화 +${g.plus} → +${Math.min(5, g.plus + 1)}${cost ? ` · ${fmt(cost)}냥` : ''}<small>${block ?? `재료: 착용하지 않은 ${GEAR_ITEMS[g.item].name} 1개`}</small></button><button class="primary${enchanting ? ' armed' : ''}" data-act="enchant"${save.coins < ENCHANT_COST ? ' disabled' : ''}>인챈트 · ${ENCHANT_COST}냥<small>${enchanting ? '아래에서 재료를 고른다' : `${SLOT_INFO[slot].kindName} 효과 하나가 무작위로 붙는다`}</small></button><button data-act="off">빼기</button></div>`;
  }
  if (g && enchanting) {
    const mats = enchantMaterials(g);
    out += `<b class="gear-head">인챈트 재료 · 고른 장비는 사라진다 (두 번 누르기)</b>`;
    out += mats.length
      ? mats
          .map(m =>
            itemButton(m, `data-mat="${m.uid}"`, armed === m.uid ? '한 번 더 누르면 재료로 쓴다' : '', armed === m.uid),
          )
          .join('')
      : '<p class="gear-empty">착용하지 않은 장비가 없다</p>';
    return out + '</div>';
  }
  const list = save.gear.filter(x => GEAR_ITEMS[x.item].slot === slot && x.uid !== g?.uid);
  out += `<b class="gear-head">보관함의 ${SLOT_INFO[slot].name} ${list.length}개</b>`;
  out += list.length
    ? list
        .sort((a, b) => b.grade - a.grade || b.plus - a.plus || a.uid - b.uid)
        .map(x => {
          const who = wearer(x.uid);
          return itemButton(
            x,
            `data-uid="${x.uid}"`,
            who ? `${HEROES[who].name} 착용 중 · 누르면 옮겨 낀다` : '누르면 낀다',
          );
        })
        .join('')
    : '<p class="gear-empty">정예 적을 잡거나 뽑기의 장비 상자로 얻는다</p>';
  return out + '</div>';
}

/** The 레벨업 button: the next level's price, or why it cannot go up. */
function levelAction(id: HeroId) {
  const cost = levelUpCost(id),
    level = profile.levels[id];
  if (cost === null)
    return { label: '최대 레벨', note: heroStars(id) < LEVEL_MAX ? '성급을 올리면 열린다' : '', disabled: true };
  return {
    label: `레벨업 · ${fmt(cost)}냥`,
    note: `Lv ${level} → ${level + 1} · 공격력 ${attackAt(level)} → ${attackAt(level + 1)} · 지닌 엽전 ${fmt(profile.coins)}냥`,
    disabled: profile.coins < cost,
    onClick: () => {
      if (levelUp(id)) showBank();
    },
  };
}

const ROSTER: Collection = {
  eyebrow: '함께 강호를 걷는 이들',
  title: '영웅',
  summary: () =>
    `합류한 영웅 <b>${PLAYABLE_HEROES.filter(heroOwned).length} / ${PLAYABLE_HEROES.length}</b> · 눌러서 자세히 보기`,
  // joined heroes first, the rest in roster order
  tiles: () => [...PLAYABLE_HEROES].sort((a, b) => Number(heroOwned(b)) - Number(heroOwned(a))).map(tile),
  detail: id => detail(id as HeroId),
  portraits: true,
};

export const openRoster = () => openCollection(ROSTER);
$('openRoster').onclick = openRoster;
