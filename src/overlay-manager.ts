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

			<div id="winnerOverlay" class="overlay hidden">
				<div class="overlay-content" style="max-width: 400px; text-align: center;">
					<h2>¡Ganador!</h2>
					<h1 id="winnerName" style="color: var(--p-color-1); margin: 20px 0;">Player Name</h1>
					<ul id="winnerRanking" class="winner-ranking" style="list-style: none; padding: 0; margin: 20px 0; text-align: left;"></ul>
					<button id="winnerNewGameBtn" class="primary-btn" style="margin-top: 20px;">Nuevo Juego</button>
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

		this.winnerNewGameBtn.addEventListener('click', () => {
			this.hideWinner();
			this.onNewGame();
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
