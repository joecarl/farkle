export class AudioManager {
	private baseUrl = 'https://games.copinstar.com/hq';
	private jsonUrl = this.baseUrl + '/farkle.json';
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
		this.audio.muted = !this.audio.muted;
		return this.audio.muted;
	}
}
