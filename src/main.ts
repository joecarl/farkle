import './style.css';
import { FarkleGame } from './farkle.ts';
import { AudioManager } from './audio.ts';
import { PWAManager } from './pwa.ts';
import { DebugManager } from './debug.ts';
import { InfoManager } from './info.ts';

// PWA Install Logic
const pwaManager = new PWAManager();
pwaManager.init();

if (!pwaManager.mustInstallApp()) {
	const appContainer = document.getElementById('app')! as HTMLDivElement;
	const game = new FarkleGame(appContainer);
	game.init();

	// Debug Overlay Logic
	const debugManager = new DebugManager(game);
	debugManager.init();

	// Audio Logic
	const audioManager = new AudioManager();
	audioManager.init().then(() => {
		const easterEggMeta = audioManager.getEasterEggMeta();
		if (!easterEggMeta) return;
		const easterBtn = document.getElementById('easterEggBtn')!;
		easterBtn.classList.remove('hidden');
		easterBtn.style.backgroundImage = `url(${easterEggMeta.imageUrl})`;
		easterBtn.addEventListener('click', () => {
			audioManager.toggleEasterEggTrack();
			easterBtn.classList.toggle('easter-egg-festive');
		});
	});
	game.setAudioManager(audioManager);

	// Info Overlay Logic
	const infoManager = new InfoManager();
	infoManager.init();
}
