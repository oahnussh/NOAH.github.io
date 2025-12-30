import { initApp, showInitError } from './modules/main.js';

initApp().catch(showInitError);
