export class AudioManager {
	private baseUrl = 'https://games.copinstar.com/hq';
	private jsonUrl = this.baseUrl + '/farkle.json';
	private audio: HTMLAudioElement;
	private isPlaying: boolean = false;
	private shakeSounds: HTMLAudioElement[] = [];
	private rollSounds: HTMLAudioElement[] = [];
	private _muted: boolean = false;

	constructor() {
		this.audio = new Audio();
		this.audio.loop = true;
		this.audio.volume = 0.3;
		this.loadSFX();
	}

	private loadSFX() {
		const shakeModules = import.meta.glob('./assets/sounds/shake*.mp3', { eager: true });
		this.shakeSounds = this.processAudioModules(shakeModules, 0.7);

		const rollModules = import.meta.glob('./assets/sounds/roll*.mp3', { eager: true });
		this.rollSounds = this.processAudioModules(rollModules, 0.5);
	}

	private processAudioModules(modules: Record<string, any>, volume: number): HTMLAudioElement[] {
		return Object.values(modules).map((module) => {
			const url = module.default;
			const audio = new Audio(url);
			audio.volume = volume;
			return audio;
		});
	}

	async init() {
		try {
			const response = await fetch(this.jsonUrl);
			const files = await response.json();
			const tracks = files.tracks;
			if (tracks && Array.isArray(tracks) && tracks.length > 0) {
				const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
				this.audio.src = this.baseUrl + '/' + randomTrack;
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
		this._muted = !this._muted;
		this.audio.muted = this._muted;
		return this._muted;
	}

	playShake() {
		if (this._muted) return;
		const sound = this.shakeSounds[Math.floor(Math.random() * this.shakeSounds.length)];
		sound.currentTime = 0;
		sound.play().catch((e) => console.log('Play shake failed', e));
	}

	playRoll(diceCount: number) {
		if (this._muted) return;

		let countToPlay = 1;
		if (diceCount >= 2 && diceCount <= 3) countToPlay = 2;
		if (diceCount > 3) countToPlay = 3;

		// Shuffle roll sounds to pick random ones
		const shuffled = [...this.rollSounds].sort(() => 0.5 - Math.random());
		const selected = shuffled.slice(0, countToPlay);

		selected.forEach((sound) => {
			sound.currentTime = 0;
			sound.play().catch((e) => console.log('Play roll failed', e));
		});
	}
}
