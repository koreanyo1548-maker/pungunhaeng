import { IMG } from '../assets/manifest';
import { G } from './context';
import { $ } from './dom';
import { RANKS } from '../data/enemies';
import { HEROES } from '../data/heroes';
import { NPCS } from '../data/npcs';
import { showBest } from '../ui/hud';

export function atlasCell(atlas, cols, rows, col, row) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const cc = c.getContext('2d'),
    w = atlas.width / cols,
    h = atlas.height / rows,
    k = 248 / Math.max(w, h);
  cc.drawImage(atlas, col * w + 1, row * h + 1, w - 2, h - 2, 128 - (w * k) / 2, 128 - (h * k) / 2, w * k, h * k);
  return c;
}
export function makeWhite(im) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const cc = c.getContext('2d');
  cc.drawImage(im, 0, 0);
  cc.globalCompositeOperation = 'source-in';
  cc.fillStyle = '#fff';
  cc.fillRect(0, 0, 256, 256);
  return c;
}
export function coinImage() {
  return (G.coinPic ||= propArt[3]?.toDataURL() || '');
}
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}
export const PORTRAIT_PROPS = { portraits: IMG['portraits'], props: IMG['props'] };
export const propArt = [],
  rockHitArt = [];
export function cropProp(im, rect) {
  const [x, y, w, h] = rect,
    c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(im, x, y, w, h, 0, 0, w, h);
  return c;
}
export async function loadPortraitProps() {
  const [portraits, props] = await Promise.all(Object.values(PORTRAIT_PROPS).map(loadImage));
  Object.keys(HEROES).forEach((id, i) => {
    heroPictures[id] = cropArt(portraits, 3, 2, i % 3, Math.floor(i / 3)).toDataURL();
  });
  const rects = [
    [130, 135, 305, 275],
    [635, 120, 300, 295],
    [1220, 120, 85, 270],
    [125, 595, 285, 295],
    [610, 575, 325, 325],
    [1120, 590, 285, 305],
  ];
  rects.forEach(r => propArt.push(cropProp(props, r)));
  for (let i = 0; i < 2; i++) {
    const c = document.createElement('canvas');
    c.width = propArt[i].width;
    c.height = propArt[i].height;
    const x = c.getContext('2d');
    x.drawImage(propArt[i], 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#fff3d5';
    x.fillRect(0, 0, c.width, c.height);
    rockHitArt.push(c);
  }
  $('heroArt').src = heroPictures.pungun;
}
export const COMBAT_ART = { projectile: IMG['projectile'], impact: IMG['impact'], utility: IMG['utility'] };
export const projectileArt = [];
export async function loadCombatArt() {
  const [bolts, hits, utility] = await Promise.all(Object.values(COMBAT_ART).map(loadImage));
  for (let i = 0; i < 8; i++) projectileArt.push(cropArt(bolts, 4, 2, i % 4, Math.floor(i / 4)));
  G.fxFrames = [0, 1, 2, 3].map(row => [0, 1, 2, 3].map(col => cropArt(hits, 4, 4, col, row)));
  for (let i = 0; i < 8; i++) {
    const frame = cropArt(utility, 4, 2, i % 4, Math.floor(i / 4));
    G.fxFrames.push([frame, frame, frame, frame]);
  }
}
export const NEW_ART = {
  run: IMG['hero-run'],
  fly: IMG['hero-fly'],
  npc: IMG['npc-portraits'],
  icon: IMG['skill-icons'],
};
export const heroAnimations: Record<string, any> = {},
  heroPictures: Record<string, string> = {},
  npcPictures: Record<string, string> = {},
  skillPictures: string[] = [];
export const skillIconIndex = {
  janyoung: 2,
  yusu: 1,
  biyeon: 1,
  muyoung: 0,
  hoeseon: 3,
  bungsan: 4,
  pajin: 5,
  cheolgol: 13,
  yeonhwan: 6,
  swaegap: 5,
  chukgi: 8,
  geomu: 10,
  manryu: 8,
  gitan: 9,
  hoegi: 11,
  taeguk: 1,
  hyeolma: 9,
  geumgang: 4,
  mancheon: 6,
  hoechun: 11,
  uihyeop: 7,
  art_dobeop: 6,
  art_cheolgap: 13,
  art_cheonma: 9,
};
export function skillImage(id) {
  return skillPictures[skillIconIndex[id] ?? 15] || '';
}
export function artImage(src, cls = 'ability-icon') {
  return src ? `<img class="${cls}" src="${src}" alt="" draggable="false">` : '';
}
export function cropArt(im, cols, rows, col, row) {
  const c = document.createElement('canvas');
  c.width = Math.round(im.width / cols);
  c.height = Math.round(im.height / rows);
  c.getContext('2d').drawImage(
    im,
    (col * im.width) / cols,
    (row * im.height) / rows,
    im.width / cols,
    im.height / rows,
    0,
    0,
    c.width,
    c.height,
  );
  return c;
}
export async function loadNewArt() {
  const [run, fly, npc, icons] = await Promise.all(Object.values(NEW_ART).map(loadImage));
  const ids = Object.keys(HEROES);
  ids.forEach((id, i) => {
    heroAnimations[id] = [0, 1, 2, 3].map(col => cropArt(i < 3 ? run : fly, 4, 3, col, i % 3));
    heroPictures[id] = heroAnimations[id][0].toDataURL();
  });
  Object.keys(NPCS).forEach((id, i) => {
    npcPictures[id] = cropArt(npc, 3, 2, i % 3, Math.floor(i / 3)).toDataURL();
  });
  for (let i = 0; i < 16; i++) skillPictures.push(cropArt(icons, 4, 4, i % 4, Math.floor(i / 4)).toDataURL());
  $('heroArt').src = heroPictures.pungun;
  $('blast').querySelector('.blast-icon').innerHTML = artImage(skillPictures[9]);
}
export async function load() {
  try {
    const [art, world, mobs, bosses, fx, skyEnemies, attack, skyMotion, simma] = await Promise.all([
      loadImage(IMG['title-art']),
      loadImage(IMG['world']),
      loadImage(IMG['mobs']),
      loadImage(IMG['bosses']),
      loadImage(IMG['fx']),
      loadImage(IMG['sky-enemies']),
      loadImage(IMG['pungun-attack']),
      loadImage(IMG['sky-enemies-motion']),
      loadImage(IMG['simma']),
    ]);
    G.skyEnemies = [0, 1, 2].map(i => cropArt(skyEnemies, 3, 1, i, 0));
    G.skyEnemyFrames = [0, 1, 2].map(row => [0, 1, 2, 3].map(col => atlasCell(skyMotion, 4, 3, col, row)));
    G.skyEnemyWhites = G.skyEnemyFrames.map(frames => frames.map(makeWhite));
    const boxes = [
      [0, 105, 313, 460],
      [315, 105, 310, 460],
      [620, 95, 375, 370],
      [995, 0, 259, 615],
      [0, 775, 275, 435],
      [270, 750, 285, 465],
      [550, 625, 340, 600],
      [885, 620, 369, 615],
    ];
    const frames = boxes.map(box => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const cc = c.getContext('2d');
      const factor = art.width / 1254,
        [x, y, w, h] = box,
        k = 244 / Math.max(w, h);
      cc.drawImage(
        art,
        x * factor,
        y * factor,
        w * factor,
        h * factor,
        128 - (w * k) / 2,
        128 - (h * k) / 2,
        w * k,
        h * k,
      );
      return c;
    });
    G.heroFrames = frames.slice(0, 4);
    for (let rank = 0; rank < 4; rank++) {
      const type = RANKS[rank].type;
      G.enemyFrames[type] = [atlasCell(mobs, 4, 2, rank, 0), atlasCell(mobs, 4, 2, rank, 1)];
    }
    for (let i = 0; i < 3; i++) G.enemyFrames[[3, 6, 7][i]] = [0, 1, 2].map(pose => atlasCell(bosses, 3, 3, pose, i));
    // Dedicated Simma poses: ready, telegraph, attack. Shared by intro, trails and defeat art.
    G.enemyFrames[8] = [0, 1, 2].map(pose => atlasCell(simma, 3, 1, pose, 0));
    G.sprite = G.enemyFrames.map(frames => frames?.[0]);
    G.enemyWhites = G.enemyFrames.map(frames => frames.map(makeWhite));
    G.fxFrames = [0, 1].map(row => [0, 1, 2, 3].map(col => atlasCell(fx, 4, 2, col, row)));

    G.whiteSprite = G.sprite.map(im => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const cc = c.getContext('2d');
      cc.drawImage(im, 0, 0);
      cc.globalCompositeOperation = 'source-in';
      cc.fillStyle = '#fff';
      cc.fillRect(0, 0, 256, 256);
      return c;
    });
    for (let i = 0; i < 3; i++) {
      const c = document.createElement('canvas');
      c.width = Math.floor(world.width / 3);
      c.height = world.height;
      c.getContext('2d').drawImage(
        world,
        (i * world.width) / 3,
        0,
        world.width / 3,
        world.height,
        0,
        0,
        c.width,
        c.height,
      );
      G.worlds.push(c);
    }
    await loadNewArt();
    // The attack sheet has a shared empty top/bottom margin; keep a consistent foot baseline.
    heroAnimations.pungun.push(
      ...[0, 1, 2, 3].map(col =>
        cropProp(attack, [(col * attack.width) / 4, attack.height * 0.08, attack.width / 4, attack.height * 0.8]),
      ),
    );
    await loadCombatArt();
    await loadPortraitProps();
    G.loaded = true;
    G.mode = 'title';
    $('start').disabled = false;
    $('start').textContent = '강호에 나서기';
    showBest();
  } catch (err) {
    $('start').textContent = '다시 불러오기';
    $('start').disabled = false;
    $('start').onclick = () => location.reload();
    $('loadError').classList.remove('hidden');
    console.error('Asset loading failed', err);
  }
}
