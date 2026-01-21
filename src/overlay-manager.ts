import type { Player } from './types';

export class OverlayManager {
	private parent: HTMLElement;
	private onNewGame: () => void;

	private farkleOverlay!: HTMLDivElement;
	private nextTurnOverlay!: HTMLDivElement;
	private nextPlayerName!: HTMLHeadingElement;
	private winnerOverlay!: HTMLDivElement;
	private winnerName!: HTMLHeadingElement;
	private winnerRanking!: HTMLUListElement;
	private winnerNewGameBtn!: HTMLButtonElement;

	private promptOverlay!: HTMLDivElement;
	private promptTitle!: HTMLHeadingElement;
	private promptMessage!: HTMLHeadingElement;
	private promptInput!: HTMLInputElement;
	private promptAcceptBtn!: HTMLButtonElement;
	private promptCancelBtn!: HTMLButtonElement;

	constructor(parent: HTMLElement, onNewGame: () => void) {
		this.parent = parent;
		this.onNewGame = onNewGame;
		this.render();
		this.setupElements();
	}

	private render() {
		const overlaysHtml = `
			<div id="farkleOverlay" class="overlay hidden">
				<div class="farkle-message">
					<h1>¡FARKLE!</h1>
					<p>Perdiste los puntos del turno</p>
				</div>
			</div>

			<div id="nextTurnOverlay" class="overlay hidden">
				<div class="overlay-content" style="max-width: 400px; text-align: center;">
					<h2>Siguiente Turno</h2>
					<h1 id="nextPlayerName" style="color: var(--p-color-1); margin: 20px 0;">Player Name</h1>
				</div>
			</div>
			
			<div id="promptOverlay" class="overlay hidden">
				<div class="overlay-content" style="max-width: 400px; text-align: center;">
					<h2 id="promptTitle" style="color: var(--p-color-1); ">Prompt title</h2>
					<div id="promptMessage" style="font-size: 1.2em; margin: 20px 0;">Prompt message</div>
					<input id="promptInput" type="text" class="hidden" style="width: 100%; padding: 10px; margin-bottom: 20px; box-sizing: border-box; background: rgba(0,0,0,0.3); border: 1px solid #555; color: white; border-radius: 4px; font-size: 1.1em;" />
					<div id="promptButtons" style="margin-top: 20px;">
						<button id="promptAcceptBtn" class="primary-btn">Sí</button>
						<button id="promptCancelBtn" class="secondary-btn">No</button>
					</div>
				</div>
			</div>

			<div id="winnerOverlay" class="overlay hidden">
				<div class="overlay-content" style="max-width: 400px; text-align: center;">
					<h2 style="margin: 0;">¡Ganador!</h2>
					<h1 id="winnerName" style="color: var(--p-color-1); margin: 1vh 0;">Player Name</h1>
					<ul id="winnerRanking" class="winner-ranking" style="list-style: none; padding: 0; text-align: left;"></ul>
					<button id="winnerNewGameBtn" class="primary-btn" style="margin-top: 20px;">Menú principal</button>
				</div>
			</div>
		`;

		this.parent.insertAdjacentHTML('beforeend', overlaysHtml);
	}

	private setupElements() {
		this.farkleOverlay = this.parent.querySelector('#farkleOverlay')!;
		this.nextTurnOverlay = this.parent.querySelector('#nextTurnOverlay')!;
		this.nextPlayerName = this.parent.querySelector('#nextPlayerName')!;
		this.winnerOverlay = this.parent.querySelector('#winnerOverlay')!;
		this.winnerName = this.parent.querySelector('#winnerName')!;
		this.winnerRanking = this.parent.querySelector('#winnerRanking')!;
		this.winnerNewGameBtn = this.parent.querySelector('#winnerNewGameBtn')!;

		this.promptOverlay = this.parent.querySelector('#promptOverlay')!;
		this.promptTitle = this.parent.querySelector('#promptTitle')!;
		this.promptMessage = this.parent.querySelector('#promptMessage')!;
		this.promptInput = this.parent.querySelector('#promptInput')!;
		this.promptAcceptBtn = this.parent.querySelector('#promptAcceptBtn')!;
		this.promptCancelBtn = this.parent.querySelector('#promptCancelBtn')!;

		this.winnerNewGameBtn.addEventListener('click', () => {
			this.hideWinner();
			this.onNewGame();
		});
	}

	public async confirm(title: string, message: string) {
		this.promptTitle.textContent = title;
		this.promptMessage.innerHTML = message;
		this.promptInput.classList.add('hidden');
		this.promptCancelBtn.classList.remove('hidden');
		this.promptAcceptBtn.textContent = 'Sí';
		this.promptCancelBtn.textContent = 'No';
		this.promptOverlay.classList.remove('hidden');
		return new Promise<boolean>((resolve) => {
			this.promptAcceptBtn.onclick = () => {
				this.promptOverlay.classList.add('hidden');
				resolve(true);
			};
			this.promptCancelBtn.onclick = () => {
				this.promptOverlay.classList.add('hidden');
				resolve(false);
			};
		});
	}

	public async alert(title: string, message: string) {
		this.promptTitle.textContent = title;
		this.promptMessage.innerHTML = message;
		this.promptInput.classList.add('hidden');
		this.promptCancelBtn.classList.add('hidden');
		this.promptAcceptBtn.textContent = 'OK';
		this.promptOverlay.classList.remove('hidden');
		return new Promise<void>((resolve) => {
			this.promptAcceptBtn.onclick = () => {
				this.promptOverlay.classList.add('hidden');
				resolve();
			};
		});
	}

	public async prompt(title: string, message: string, defaultValue: string = '') {
		this.promptTitle.textContent = title;
		this.promptMessage.innerHTML = message;
		this.promptInput.value = defaultValue;
		this.promptInput.classList.remove('hidden');
		this.promptCancelBtn.classList.remove('hidden');
		this.promptAcceptBtn.textContent = 'OK';
		this.promptCancelBtn.textContent = 'Cancelar';
		this.promptOverlay.classList.remove('hidden');
		return new Promise<string | null>((resolve) => {
			this.promptAcceptBtn.onclick = () => {
				this.promptOverlay.classList.add('hidden');
				resolve(this.promptInput.value);
			};
			this.promptCancelBtn.onclick = () => {
				this.promptOverlay.classList.add('hidden');
				resolve(null);
			};
		});
	}

	public showUpdateRequired(serverVersion: string, clientVersion: string) {
		const overlaysHtml = `
			<div id="updateRequiredOverlay" class="overlay">
				<div class="overlay-content" style="max-width: 400px; text-align: center;">
					<h2 style="color: var(--p-color-1);">¡Actualización requerida!</h2>
					<p>Tu versión: <b>${clientVersion}</b></p>
					<p>Versión del servidor: <b>${serverVersion}</b></p>
					<p style="margin: 20px 0;">Es necesario actualizar la aplicación para continuar jugando.</p>
					<button id="updateBtn" class="primary-btn">Actualizar ahora</button>
				</div>
			</div>
		`;
		this.parent.insertAdjacentHTML('beforeend', overlaysHtml);
		const updateBtn = this.parent.querySelector('#updateBtn') as HTMLButtonElement;
		updateBtn.addEventListener('click', () => {
			window.location.reload();
		});
	}

	public showFarkle() {
		this.farkleOverlay.classList.remove('hidden');
	}

	public hideFarkle() {
		this.farkleOverlay.classList.add('hidden');
	}

	public showNextTurn(playerName: string) {
		this.nextPlayerName.textContent = playerName;
		this.nextTurnOverlay.classList.remove('hidden');
	}

	public hideNextTurn() {
		this.nextTurnOverlay.classList.add('hidden');
	}

	public showWinner(playerName: string, players: Player[]) {
		this.winnerName.textContent = playerName;

		const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

		this.winnerRanking.innerHTML = sortedPlayers
			.map(
				(p, i) => `
			<li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
				<span>${i + 1}. ${p.name}</span>
				<span style="font-weight: bold;">${p.score}</span>
			</li>
		`
			)
			.join('');

		this.winnerOverlay.classList.remove('hidden');
	}

	public hideWinner() {
		this.winnerOverlay.classList.add('hidden');
	}
}
