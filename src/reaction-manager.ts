import { OnlineManager } from './online-manager';
import { sleep } from './utils';

export class ReactionManager {
	private parent: HTMLElement;
	private onlineManager: OnlineManager;
	private savedPhrases: string[] = ['', '', '', ''];
	private emojis = ['😀', '😂', '😎', '😭', '😡', '👍', '👎', '🎉', '🔥', '🎲', '🍺', '🤢', '🤔', '👀', '💩'];

	private reactionPicker!: HTMLDivElement;
	private reactionDisplay!: HTMLDivElement;

	constructor(parent: HTMLElement) {
		this.parent = parent;
		this.onlineManager = OnlineManager.getInstance();
		this.injectHtml();
		this.setupElements();
		this.setupListeners();
		this.loadPhrases();
	}

	private injectHtml() {
		const html = `
			<div id="reactionPicker" class="overlay hidden click-outside-close">
				<div class="overlay-content reaction-picker-container">
					<h3>Enviar Reacción</h3>
					<button id="closePickerBtn" class="close-btn">×</button>
					<div class="reaction-picker-content">
						<div class="phrases-list" id="pickerPhrases"></div>
						<div class="emojis-grid" id="pickerEmojis"></div>
					</div>
				</div>
			</div>

			<div id="reactionDisplay" class="reaction-display hidden">
				<div id="reactionContent" class="reaction-content"></div>
				<div id="reactionSender" class="reaction-sender"></div>
			</div>
        `;
		this.parent.insertAdjacentHTML('beforeend', html);
	}

	private setupElements() {
		this.reactionPicker = document.getElementById('reactionPicker')! as HTMLDivElement;
		this.reactionDisplay = document.getElementById('reactionDisplay')! as HTMLDivElement;
	}

	private setupListeners() {
		// Online Events
		this.onlineManager.addProfileListener((profile) => {
			if (profile && profile.preferences && Array.isArray(profile.preferences.phrases)) {
				this.savedPhrases = profile.preferences.phrases;
			}
		});

		this.onlineManager.onReactionReceived = (data) => {
			this.showReaction(data);
		};

		// Close picker on outside click
		this.reactionPicker.addEventListener('click', (e) => {
			if (e.target === this.reactionPicker) {
				this.reactionPicker.classList.add('hidden');
			}
		});
		document.getElementById('closePickerBtn')!.addEventListener('click', () => {
			this.reactionPicker.classList.add('hidden');
		});
	}

	private loadPhrases() {
		// Used to call onlineManager.getPhrases(), now we just check cache or wait for identify/update
		const phrases = this.onlineManager.currentUserProfile?.preferences?.phrases;
		if (Array.isArray(phrases)) {
			this.savedPhrases = phrases;
		}
	}

	public openReactionPicker() {
		this.renderPickerContent();
		this.reactionPicker.classList.remove('hidden');
	}

	private renderPickerContent() {
		const phrasesContainer = document.getElementById('pickerPhrases')!;
		phrasesContainer.innerHTML = '';

		this.savedPhrases.forEach((phrase) => {
			if (phrase) {
				const btn = document.createElement('button');
				btn.className = 'reaction-btn phrase-btn';
				btn.textContent = phrase;
				btn.onclick = () => {
					this.sendReaction(phrase, 'text');
					this.reactionPicker.classList.add('hidden');
				};
				phrasesContainer.appendChild(btn);
			}
		});

		if (this.savedPhrases.filter((p) => p).length === 0) {
			const noPhrasesMsg = document.createElement('div');
			noPhrasesMsg.className = 'no-phrases-msg';
			noPhrasesMsg.textContent = 'No hay frases guardadas.';
			phrasesContainer.appendChild(noPhrasesMsg);
		}

		const emojisContainer = document.getElementById('pickerEmojis')!;
		emojisContainer.innerHTML = '';
		this.emojis.forEach((emoji) => {
			const btn = document.createElement('button');
			btn.className = 'reaction-btn emoji-btn';
			btn.textContent = emoji;
			btn.onclick = () => {
				this.sendReaction(emoji, 'emoji');
				this.reactionPicker.classList.add('hidden');
			};
			emojisContainer.appendChild(btn);
		});
	}

	private sendReaction(content: string, type: 'text' | 'emoji') {
		this.onlineManager.sendReaction(content, type);
	}

	private timeoutHandle: any = null;

	private async showReaction(data: { senderId: string; senderName: string; content: string; type: 'text' | 'emoji' }) {
		const contentEl = document.getElementById('reactionContent')!;
		const senderEl = document.getElementById('reactionSender')!;

		const isEmoji = data.type === 'emoji';

		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
		}

		this.reactionDisplay.classList.add('hidden');
		this.reactionDisplay.classList.remove('animate-pop');
		await sleep(10); // Allow DOM to update

		contentEl.textContent = data.content;
		contentEl.style.fontSize = isEmoji ? '4rem' : '2rem';
		senderEl.textContent = data.senderName;
		this.reactionDisplay.classList.remove('hidden');
		this.reactionDisplay.classList.add('animate-pop');

		this.timeoutHandle = setTimeout(() => {
			this.reactionDisplay.classList.add('hidden');
			this.reactionDisplay.classList.remove('animate-pop');
		}, 3000);
	}
}
