import { G } from '../core/context';
import { soundToggle } from '../core/audio';
import { $, H, W, canvas } from '../core/dom';
import { clamp } from '../core/math';
import { TUNE } from '../data/tune';
import { blast } from '../systems/combat';
import { home, pause, resume, skyStage, start } from '../systems/flow';

// Touch actions respond on contact, independently of the browser's synthesized click.
// Ignore that later touch click so one tap cannot spend two charges.
function bindAction(id: string, action: () => void) {
  const button = $(id) as HTMLButtonElement;
  button.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || button.disabled) return;
    e.preventDefault();
    action();
  });
  button.addEventListener('click', e => {
    if (['touch', 'pen'].includes((e as PointerEvent).pointerType)) return;
    action();
  });
}
bindAction('blast', blast);
$('start').addEventListener('click', start);
// 다시 강호로: back to the lobby, to pick the stage and set out again
$('retry').onclick = home;
$('restartPause').onclick = start;
$('pause').onclick = pause;
$('resume').onclick = resume;

$('soundIntro').onclick = soundToggle;
$('soundPause').onclick = soundToggle;
canvas.addEventListener('pointerdown', e => {
  if (G.mode !== 'play') return;
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  G.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, start: G.player.target, startY: G.player.targetY };
});
canvas.addEventListener('pointermove', e => {
  if (G.mode !== 'play' || G.pointer?.id !== e.pointerId) return;
  const rect = canvas.getBoundingClientRect();
  G.player.target = clamp(G.pointer.start + (((e.clientX - G.pointer.x) * W) / rect.width) * 1.12, 24, W - 24);
  if (TUNE.freeFlight && skyStage())
    G.player.targetY = clamp(
      G.pointer.startY + (((e.clientY - G.pointer.y) * H) / rect.height) * 1.12,
      TUNE.skyMinY,
      TUNE.skyMaxY,
    );
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
  canvas.addEventListener(event, (e: PointerEvent) => {
    if (G.pointer?.id === e.pointerId) G.pointer = null;
  });
window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape', 'a', 'd', 'w', 's'].includes(e.key))
    e.preventDefault();
  if (e.key === 'Escape') {
    G.mode === 'play' ? pause() : resume();
    return;
  }
  if (G.mode !== 'play') return;
  if (e.key === ' ' && !e.repeat) blast();
  G.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
});
window.addEventListener('keyup', e => G.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
