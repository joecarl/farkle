import type { Player } from './types';
import { mobileDelayedClick } from './utils';

const FARKLE_SUGGESTED_NAMES = 'farkle.suggestedNames';
const FARKLE_USERNAME = 'farkle.username';

export class NewGameMenu {
	private modal: HTMLDivElement;
	private tempNewGamePlayers: Player[] = [];
	private suggestedNames: string[] = [];
	private onStartGame: (players: Player[]) => void;

	constructor(onStartGame: (players: Player[]) => void) {
		this.onStartGame = onStartGame;
		this.loadSuggestedNames();
		this.modal = this.createModal();
		document.body.appendChild(this.modal);
		this.setupEventListeners();
	}

	private loadSuggestedNames() {
		try {
			const stored = localStorage.getItem(FARKLE_SUGGESTED_NAMES);
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
			localStorage.setItem(FARKLE_SUGGESTED_NAMES, JSON.stringify(this.suggestedNames));
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
					<span>Partida local</span>
				</button>
				<button id="randomOnlineBtn" class="menu-btn">
					<div class="icon-wrapper online-random-icon">
						<div class="map-bg"></div>
						<div class="compass-mini-group">
							<div class="compass-base"></div>
							<div class="compass-arrow"></div>
						</div>
					</div>
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

		mobileDelayedClick(container.querySelector('#localGameBtn')!, () => {
			this.renderLocalGameSetup();
		});
		mobileDelayedClick(container.querySelector('#randomOnlineBtn')!, () => {
			this.renderRandomOnlineSetup();
		});
		mobileDelayedClick(container.querySelector('#roomOnlineBtn')!, () => {
			this.renderRoomOnlineSetup();
		});
	}

	private getStoredUsername(): string {
		return localStorage.getItem(FARKLE_USERNAME) || '';
	}

	private setStoredUsername(name: string) {
		localStorage.setItem(FARKLE_USERNAME, name);
	}

	private renderRandomOnlineSetup() {
		const container = this.modal.querySelector('#menuContent')!;
		const storedName = this.getStoredUsername();

		container.innerHTML = `
			<div class="online-setup">
				<button id="backToMenuBtn" class="back-btn"></button>
				<h2>Aleatorio Online</h2>
				<div class="input-group">
					<label for="onlineUsername">Nombre de usuario</label>
					<input type="text" id="onlineUsername" value="${storedName}" placeholder="Tu nombre">
				</div>
				<div class="action-buttons">
					<button id="searchMatchBtn" class="primary-btn">Buscar partida</button>
				</div>
			</div>
		`;

		const backBtn = container.querySelector('#backToMenuBtn') as HTMLButtonElement;
		const searchBtn = container.querySelector('#searchMatchBtn') as HTMLButtonElement;
		const nameInput = container.querySelector('#onlineUsername') as HTMLInputElement;

		backBtn.addEventListener('click', () => this.renderMainMenu());

		searchBtn.addEventListener('click', () => {
			const name = nameInput.value.trim();
			if (name) {
				this.setStoredUsername(name);
				console.log('Searching match for:', name);
				// TODO: Implement search match logic
			} else {
				nameInput.focus();
			}
		});
	}

	private renderRoomOnlineSetup() {
		const container = this.modal.querySelector('#menuContent')!;

		container.innerHTML = `
			<div class="online-setup">
				<button id="backToMenuBtn" class="back-btn"></button>
				<h2>Sala Online</h2>
				<div class="menu-buttons">
					<button id="createRoomBtn" class="menu-btn">
						<span>Crear sala</span>
					</button>
					<button id="joinRoomBtn" class="menu-btn">
						<span>Unirse a sala</span>
					</button>
				</div>
			</div>
		`;

		const backBtn = container.querySelector('#backToMenuBtn') as HTMLButtonElement;
		backBtn.addEventListener('click', () => this.renderMainMenu());

		container.querySelector('#createRoomBtn')!.addEventListener('click', () => this.renderCreateRoomSetup());
		container.querySelector('#joinRoomBtn')!.addEventListener('click', () => this.renderJoinRoomSetup());
	}

	private renderCreateRoomSetup() {
		const container = this.modal.querySelector('#menuContent')!;
		const storedName = this.getStoredUsername();

		container.innerHTML = `
			<div class="online-setup">
				<button id="backToRoomMenuBtn" class="back-btn"></button>
				<h2>Crear Sala</h2>
				<div class="input-group">
					<label for="onlineUsername">Nombre de usuario</label>
					<input type="text" id="onlineUsername" value="${storedName}" placeholder="Tu nombre">
				</div>
				<div class="action-buttons">
					<button id="doCreateRoomBtn" class="primary-btn">Crear sala</button>
				</div>
			</div>
		`;

		const backBtn = container.querySelector('#backToRoomMenuBtn') as HTMLButtonElement;
		const createBtn = container.querySelector('#doCreateRoomBtn') as HTMLButtonElement;
		const nameInput = container.querySelector('#onlineUsername') as HTMLInputElement;

		backBtn.addEventListener('click', () => this.renderRoomOnlineSetup());

		createBtn.addEventListener('click', () => {
			const name = nameInput.value.trim();
			if (name) {
				this.setStoredUsername(name);
				console.log('Creating room for:', name);
				// TODO: Implement create room logic
			} else {
				nameInput.focus();
			}
		});
	}

	private renderJoinRoomSetup() {
		const container = this.modal.querySelector('#menuContent')!;
		const storedName = this.getStoredUsername();

		container.innerHTML = `
			<div class="online-setup">
				<button id="backToRoomMenuBtn" class="back-btn"></button>
				<h2>Unirse a Sala</h2>
				<div class="input-group">
					<label for="onlineUsername">Nombre de usuario</label>
					<input type="text" id="onlineUsername" value="${storedName}" placeholder="Tu nombre">
				</div>
				<div class="input-group">
					<label for="roomCode">Código de sala</label>
					<input type="text" id="roomCode" placeholder="Código">
				</div>
				<div class="action-buttons">
					<button id="doJoinRoomBtn" class="primary-btn">Entrar en la sala</button>
				</div>
			</div>
		`;

		const backBtn = container.querySelector('#backToRoomMenuBtn') as HTMLButtonElement;
		const joinBtn = container.querySelector('#doJoinRoomBtn') as HTMLButtonElement;
		const nameInput = container.querySelector('#onlineUsername') as HTMLInputElement;
		const codeInput = container.querySelector('#roomCode') as HTMLInputElement;

		backBtn.addEventListener('click', () => this.renderRoomOnlineSetup());

		joinBtn.addEventListener('click', () => {
			const name = nameInput.value.trim();
			const code = codeInput.value.trim();

			if (!name) {
				nameInput.focus();
				return;
			}

			if (!code) {
				codeInput.focus();
				return;
			}

			this.setStoredUsername(name);
			console.log('Joining room:', code, 'as', name);
			// TODO: Implement join room logic
		});
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
						<div style="flex: 1 1 auto;">
							<div class="add-player-group">
								<input type="text" id="newGamePlayerName" placeholder="Nombre">
								<button id="addPlayerToGameBtn" type="button"> <div class="inline-icon beer-icon-small"></div> Añadir</button>
							</div>
							<div class="add-bot-group">
								<button id="addBotBtn" type="button" class="secondary-btn">🤖 Añadir Bot</button>
							</div>
						</div>
						<div class="suggested-names-section">
							<h4>Sugerencias</h4>
							<div id="suggestedNamesList" class="suggested-list"></div>
						</div>
					</div>
				</div>

				<div class="action-buttons">
					<button id="startGameBtn" class="primary-btn" disabled>Comenzar partida</button>
				</div>
			</div>
		`;

		this.updatePlayersList();
		this.renderSuggestedNames();

		const nameInput = container.querySelector('#newGamePlayerName') as HTMLInputElement;
		const addBtn = container.querySelector('#addPlayerToGameBtn') as HTMLButtonElement;
		const addBotBtn = container.querySelector('#addBotBtn') as HTMLButtonElement;
		const startBtn = container.querySelector('#startGameBtn') as HTMLButtonElement;
		const backBtn = container.querySelector('#backToMenuBtn') as HTMLButtonElement;

		addBtn.addEventListener('click', () => this.addPlayer(nameInput));
		addBotBtn.addEventListener('click', () => this.addBot());
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
		const playerNames = this.tempNewGamePlayers.map((p) => p.name);
		const availableSuggestions = this.suggestedNames.filter((name) => !playerNames.includes(name));

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
		localStorage.setItem(FARKLE_SUGGESTED_NAMES, JSON.stringify(this.suggestedNames));
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

	private addBot() {
		const botCount = this.tempNewGamePlayers.filter((p) => p.isBot).length;
		const name = `Bot ${botCount + 1}`;
		this.addPlayerByName(name, true);
	}

	private addPlayerByName(name: string, isBot: boolean = false) {
		if (!this.tempNewGamePlayers.some((p) => p.name === name)) {
			this.tempNewGamePlayers.push({ name, score: 0, isBot });
			if (!isBot) {
				this.saveSuggestedName(name);
			}
			this.updatePlayersList();
			this.renderSuggestedNames();
		}
	}

	private removePlayer(name: string) {
		this.tempNewGamePlayers = this.tempNewGamePlayers.filter((p) => p.name !== name);
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
			this.tempNewGamePlayers.forEach((player) => {
				const li = document.createElement('li');

				const nameSpan = document.createElement('span');
				nameSpan.textContent = player.name + (player.isBot ? ' 🤖' : '');

				const deleteBtn = document.createElement('button');
				deleteBtn.textContent = '×';
				deleteBtn.className = 'delete-player-btn';
				deleteBtn.title = 'Quitar jugador';
				deleteBtn.addEventListener('click', () => this.removePlayer(player.name));

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
