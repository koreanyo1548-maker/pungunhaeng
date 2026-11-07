import './styles/base.css';
import './styles/title.css';
import './styles/hud.css';
import './styles/actives.css';
import './styles/panels.css';
import './styles/choice.css';
import './ui/input';
import './debug/debug';
import { load } from './core/assets';
import { registerQuestListeners } from './systems/quest';
import { registerAbilityListeners } from './systems/abilities';
import { frame } from './systems/loop';

// order matters: quest progress is counted before abilities react to the same event
registerQuestListeners();
registerAbilityListeners();
load();
requestAnimationFrame(frame);
