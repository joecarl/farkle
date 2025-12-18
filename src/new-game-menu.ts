export class NewGameMenu {
	private modal: HTMLDivElement;
	private tempNewGamePlayers: string[] = [];
	private suggestedNames: string[] = [];
	private onStartGame: (players: string[]) => void;

	constructor(onStartGame: (players: string[]) => void) {
		this.onStartGame = onStartGame;
		this.loadSuggestedNames();
		this.modal = this.createModal();
		document.body.appendChild(this.modal);
		this.setupEventListeners();
	}

	private loadSuggestedNames() {
		try {
			const stored = localStorage.getItem('farkle_suggested_names');
			if (stored) {
				this.suggestedNames = JSON.parse(stored);
			}
		} catch (e) {
			console.error('Error loading suggested names', e);
		}

		if (!Array.isArray(this.suggestedNames)) {
			this.suggestedNames = [];
		}
	}

	private saveSuggestedName(name: string) {
		if (!this.suggestedNames.includes(name)) {
			this.suggestedNames.push(name);
			localStorage.setItem('farkle_suggested_names', JSON.stringify(this.suggestedNames));
			this.renderSuggestedNames();
		}
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
				<button id="backToMenuBtn" class="back-btn"></button>
				<h2>Configurar Jugadores</h2>
				
				<div class="setup-columns">
					<div class="left-column">
						<div id="playersListContainer" class="players-list-container">
							<!-- Content updated by updatePlayersList -->
						</div>
						
					</div>
					
					<div class="right-column">
						<div class="add-player-group">
							<input type="text" id="newGamePlayerName" placeholder="Nombre">
							<button id="addPlayerToGameBtn" type="button"> <div class="inline-icon beer-icon-small"></div> Añadir</button>
						</div>
						<div style="flex: 1 1 auto;"></div>
						<div class="suggested-names-section">
							<h4>Sugerencias</h4>
							<div id="suggestedNamesList" class="suggested-list"></div>
						</div>
					</div>
				</div>

				<div class="action-buttons">
					<button id="startGameBtn" class="primary-btn" disabled>Comenzar Juego</button>
				</div>
			</div>
		`;

		this.updatePlayersList();
		this.renderSuggestedNames();

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

	private renderSuggestedNames() {
		const list = this.modal.querySelector('#suggestedNamesList');
		if (!list) return;

		list.innerHTML = '';
		const availableSuggestions = this.suggestedNames.filter((name) => !this.tempNewGamePlayers.includes(name));

		if (availableSuggestions.length === 0) {
			list.innerHTML = '<span class="no-suggestions">No hay sugerencias disponibles</span>';
			return;
		}

		availableSuggestions.forEach((name) => {
			const tag = document.createElement('div');
			tag.className = 'suggested-name-tag';

			const nameSpan = document.createElement('span');
			nameSpan.textContent = name;
			nameSpan.className = 'name-text';
			nameSpan.addEventListener('click', () => {
				this.addPlayerByName(name);
			});

			const deleteBtn = document.createElement('span');
			deleteBtn.textContent = '×';
			deleteBtn.className = 'delete-suggestion-btn';
			deleteBtn.title = 'Eliminar sugerencia';
			deleteBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.removeSuggestedName(name);
			});

			tag.appendChild(nameSpan);
			tag.appendChild(deleteBtn);
			list.appendChild(tag);
		});
	}

	private removeSuggestedName(name: string) {
		this.suggestedNames = this.suggestedNames.filter((n) => n !== name);
		localStorage.setItem('farkle_suggested_names', JSON.stringify(this.suggestedNames));
		this.renderSuggestedNames();
	}

	private addPlayer(input: HTMLInputElement) {
		const name = input.value.trim();
		if (name) {
			this.addPlayerByName(name);
			input.value = '';
			input.focus();
		}
	}

	private addPlayerByName(name: string) {
		if (!this.tempNewGamePlayers.includes(name)) {
			this.tempNewGamePlayers.push(name);
			this.saveSuggestedName(name);
			this.updatePlayersList();
			this.renderSuggestedNames();
		}
	}

	private removePlayer(name: string) {
		this.tempNewGamePlayers = this.tempNewGamePlayers.filter((p) => p !== name);
		this.updatePlayersList();
		this.renderSuggestedNames();
	}

	private updatePlayersList() {
		const container = this.modal.querySelector('#playersListContainer')!;
		const startBtn = this.modal.querySelector('#startGameBtn') as HTMLButtonElement;

		if (this.tempNewGamePlayers.length === 0) {
			container.innerHTML = '<div class="no-players-warning">No hay jugadores añadidos</div>';
		} else {
			const ul = document.createElement('ul');
			ul.id = 'newGamePlayersList';
			this.tempNewGamePlayers.forEach((name) => {
				const li = document.createElement('li');

				const nameSpan = document.createElement('span');
				nameSpan.textContent = name;

				const deleteBtn = document.createElement('button');
				deleteBtn.textContent = '×';
				deleteBtn.className = 'delete-player-btn';
				deleteBtn.title = 'Quitar jugador';
				deleteBtn.addEventListener('click', () => this.removePlayer(name));

				li.appendChild(nameSpan);
				li.appendChild(deleteBtn);
				ul.appendChild(li);
			});
			container.innerHTML = '';
			container.appendChild(ul);
		}

		if (startBtn) {
			startBtn.disabled = this.tempNewGamePlayers.length < 2;
		}
	}
}
