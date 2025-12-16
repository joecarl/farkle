export class AudioManager {
	private baseUrl = 'https://games.copinstar.com/hq/';
	private jsonUrl = 'https://games.copinstar.com/hq/farkle.json';
	private audio: HTMLAudioElement;
	private isPlaying: boolean = false;

	constructor() {
		this.audio = new Audio();
		this.audio.loop = true;
		this.audio.volume = 0.3;
	}

	async init() {
		try {
			const response = await fetch(this.jsonUrl);
			const files = await response.json();
			if (Array.isArray(files) && files.length > 0) {
				const randomFile = files[Math.floor(Math.random() * files.length)];
				this.audio.src = this.baseUrl + randomFile;
			}
		} catch (e) {
			console.error('Failed to load music config', e);
		}

		// Start music on first interaction with the page if not started
		document.body.addEventListener(
			'click',
			() => {
				this.play();
			},
			{ once: true }
		);
	}

	play() {
		if (this.isPlaying) return;

		this.audio
			.play()
			.then(() => {
				this.isPlaying = true;
			})
			.catch((e) => {
				console.log('Audio play failed (waiting for user interaction)', e);
			});
	}

	toggleMute() {
		this.audio.muted = !this.audio.muted;
		return this.audio.muted;
	}
}
