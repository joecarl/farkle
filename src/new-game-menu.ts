export class NewGameMenu {
	private modal: HTMLDivElement;
	private tempNewGamePlayers: string[] = [];
	private onStartGame: (players: string[]) => void;

	constructor(onStartGame: (players: string[]) => void) {
		this.onStartGame = onStartGame;
		this.modal = this.createModal();
		document.body.appendChild(this.modal);
		this.setupEventListeners();
	}

	private createModal(): HTMLDivElement {
		const modal = document.createElement('div');
		modal.id = 'newGameModal';
		modal.className = 'overlay hidden';
		modal.innerHTML = `
			<div class="overlay-content new-game-menu-content">
				<button class="close-btn">×</button>
				<div id="menuContent"></div>
			</div>
		`;
		return modal;
	}

	private setupEventListeners() {
		const closeBtn = this.modal.querySelector('.close-btn')!;
		closeBtn.addEventListener('click', () => this.hide());
	}

	public show() {
		this.renderMainMenu();
		this.modal.classList.remove('hidden');
	}

	public hide() {
		this.modal.classList.add('hidden');
	}

	private renderMainMenu() {
		const container = this.modal.querySelector('#menuContent')!;
		container.innerHTML = `
			<h2>Nuevo Juego</h2>
			<div class="menu-buttons">
				<button id="localGameBtn" class="menu-btn">
					<div class="icon-wrapper beer-toast">					
						<div class="shield-bg"></div>
						<div class="beer left"></div>
						<div class="beer right"></div>
					</div>
					<span>Juego local</span>
				</button>
				<button id="randomOnlineBtn" class="menu-btn">
					<div class="icon-wrapper map-icon"></div>
					<span>Aleatorio online</span>
				</button>
				<button id="roomOnlineBtn" class="menu-btn">
					<div class="icon-wrapper room-icon">
						<div class="map-bg"></div>
						<div class="beer-mini-group">
							<div class="beer left" ></div>
							<div class="beer right" ></div>
						</div>
					</div>
					<span>Sala online</span>
				</button>
			</div>
		`;

		container.querySelector('#localGameBtn')!.addEventListener('click', () => this.renderLocalGameSetup());
		container.querySelector('#randomOnlineBtn')!.addEventListener('click', () => console.log('Random Online clicked'));
		container.querySelector('#roomOnlineBtn')!.addEventListener('click', () => console.log('Room Online clicked'));
	}

	private renderLocalGameSetup() {
		this.tempNewGamePlayers = [];
		const container = this.modal.querySelector('#menuContent')!;
		container.innerHTML = `
			<div class="local-game-setup">
				<button id="backToMenuBtn" class="back-btn">← Volver</button>
				<h3>Configurar Jugadores</h3>
				<div id="playersListContainer" class="players-list-container">
					<ul id="newGamePlayersList"></ul>
				</div>
				<div class="add-player-group">
					<input type="text" id="newGamePlayerName" placeholder="Nombre del jugador">
					<button id="addPlayerToGameBtn" type="button">+</button>
				</div>
				<div class="action-buttons">
					<button id="startGameBtn" class="primary-btn" disabled>Comenzar Juego</button>
				</div>
			</div>
		`;

		this.updatePlayersList();

		const nameInput = container.querySelector('#newGamePlayerName') as HTMLInputElement;
		const addBtn = container.querySelector('#addPlayerToGameBtn') as HTMLButtonElement;
		const startBtn = container.querySelector('#startGameBtn') as HTMLButtonElement;
		const backBtn = container.querySelector('#backToMenuBtn') as HTMLButtonElement;

		addBtn.addEventListener('click', () => this.addPlayer(nameInput));
		nameInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') this.addPlayer(nameInput);
		});

		startBtn.addEventListener('click', () => {
			if (this.tempNewGamePlayers.length >= 2) {
				this.onStartGame(this.tempNewGamePlayers);
				this.hide();
			}
		});

		backBtn.addEventListener('click', () => this.renderMainMenu());

		setTimeout(() => nameInput.focus(), 100);
	}

	private addPlayer(input: HTMLInputElement) {
		const name = input.value.trim();
		if (name) {
			this.tempNewGamePlayers.push(name);
			input.value = '';
			this.updatePlayersList();
			input.focus();
		}
	}

	private updatePlayersList() {
		const list = this.modal.querySelector('#newGamePlayersList')!;
		const startBtn = this.modal.querySelector('#startGameBtn') as HTMLButtonElement;

		if (list) {
			list.innerHTML = this.tempNewGamePlayers.map((name) => `<li>${name}</li>`).join('');
		}

		if (startBtn) {
			startBtn.disabled = this.tempNewGamePlayers.length < 2;
		}
	}
}
