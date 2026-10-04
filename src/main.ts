import './ui/styles/tokens.css';
import './ui/styles/learn.css';
import './ui/styles/components.css';
import './ui/styles/player.css';
import './ui/styles/home.css';
import './ui/styles/course.css';
import './ui/styles/chrome.css';

import { initSpeech } from './ui/speech';
import { initRouter } from './ui/router';
import { initLearn } from './ui/screens/Learn';
import { initConj, renderConj } from './ui/screens/Conj';
import { initDrill, renderProgress } from './ui/screens/Drill';
import { initListen, renderPlayer } from './ui/screens/Listen';
import { initWords } from './ui/screens/Words';
import { initHome, renderHome } from './ui/screens/Home';
import { initSpeak } from './ui/screens/Speak';
import { initDayBar } from './ui/screens/DayBar';
import { initFooter } from './ui/screens/Footer';

initSpeech();
initRouter();
initLearn();
initConj();
initDrill();
initListen();
initWords();
initHome();
initSpeak();
initDayBar();
initFooter();

renderProgress();
renderConj();
renderPlayer();
renderHome();
