export function interval(callback: (endInterval: () => void) => void, delay: number) {
	return new Promise<void>((resolve) => {
		let interval: any;
		const endInterval = () => {
			resolve();
			clearInterval(interval);
		};
		interval = setInterval(() => {
			callback(endInterval);
		}, delay);
	});
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isMobile(): boolean {
	// return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
	return window.matchMedia('(max-width: 768px)').matches;
}

export function isTouchDevice() {
	return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function mobileDelayedClick(btn: HTMLElement, handler: () => void, delay: number = 300) {
	btn.addEventListener('click', () => {
		if (isTouchDevice()) {
			setTimeout(() => {
				handler();
			}, delay);
		} else {
			handler();
		}
	});
}

export function getPathname(): string {
	let pn = location.pathname;
	const lastPos = pn.length - 1;
	if (pn[lastPos] === '/') pn = pn.substring(0, lastPos);
	return pn;
}

const SAFE_SYLLABLES = [
	'ka',
	'ra',
	'lo',
	'mi',
	'na',
	'to',
	'zu',
	'pi',
	'xe',
	'no',
	'ru',
	'sa',
	'be',
	'ti',
	'vo',
	'qu',
	'si',
	'la',
	'do',
	'fa',
	'ge',
	'hi',
	'jo',
	'ku',
	'ma',
	'nu',
	'pa',
	'ro',
	'su',
	'ki',
	'zi',
	'la',
];

export function generateNameFromSyllables(minSyllables = 2, maxSyllables = 3): string {
	const count = Math.floor(Math.random() * (maxSyllables - minSyllables + 1)) + minSyllables;
	let name = '';
	for (let i = 0; i < count; i++) {
		const idx = Math.floor(Math.random() * SAFE_SYLLABLES.length);
		name += SAFE_SYLLABLES[idx];
	}
	// Capitalize first letter
	return name.charAt(0).toUpperCase() + name.slice(1);
}
