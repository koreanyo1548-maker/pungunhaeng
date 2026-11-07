import './styles/main.css';
import './ui/input';
import './debug/debug';
import { load } from './core/assets';
import { frame } from './systems/loop';

load();
requestAnimationFrame(frame);
