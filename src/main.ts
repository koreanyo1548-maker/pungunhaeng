import './styles/base.css';
import './styles/title.css';
import './styles/hud.css';
import './styles/actives.css';
import './styles/panels.css';
import './styles/choice.css';
import './styles/mobile-game.css';
import './styles/encounter.css';
import './ui/input';
import './scenes/gacha';
import './scenes/roster';
// (scenes/cards.ts, the 인연 screen, is not loaded while 인연 are not used: 2026-11, 공명 replaced them)
import './debug/debug';
import { load } from './core/assets';
import { registerQuestListeners } from './systems/quest';
import { registerAbilityListeners } from './systems/abilities';
import { frame } from './systems/loop';

// order matters: 조짐 progress is counted before 공명 기술 react to the same event
registerQuestListeners();
registerAbilityListeners();
load();
requestAnimationFrame(frame);
