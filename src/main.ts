import './styles/base.css';
import './styles/title.css';
import './styles/hud.css';
import './styles/actives.css';
import './styles/panels.css';
import './styles/choice.css';
import './ui/input';
import './debug/debug';
import { load } from './core/assets';
import { frame } from './systems/loop';

load();
requestAnimationFrame(frame);
