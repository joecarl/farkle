import type { DicePositions, DieState, GameConfig } from './types';
import { addVectors, Dice3D, distance, subVectors, type Vector3D } from './dice3D';
import { FarkleLogic } from './logic';
import { AudioManager } from './audio';
import { NewGameMenu } from './new-game-menu';
import { OverlayManager } from './overlay-manager';
import { OnlineManager } from './online-manager';
import { ReactionManager } from './reaction-manager';
import { ProfileManager } from './profile-manager';
import { AchievementManager } from './achievements';
import { interval, sleep } from './utils';

// Visual representation of a die, extending the logical state
interface VisualDie extends DieState {
	diceIndex: number;
}

export class FarkleGame {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private dice: VisualDie[] = [];
	private isRolling = false;
	private rollBtn!: HTMLButtonElement;
	private bankBtn!: HTMLButtonElement;
	private newGameBtn!: HTMLButtonElement;
	private profileBtn!: HTMLButtonElement;
	private chatBtn!: HTMLButtonElement;

	private overlayManager!: OverlayManager;
	private reactionManager!: ReactionManager;
	private profileManager!: ProfileManager;
	private achievementManager!: AchievementManager;

	private newGameMenu!: NewGameMenu;

	private topBarPlayerName!: HTMLElement;
	private topBarTurnScore!: HTMLElement;
	private topBarTotalScore!: HTMLElement;
	private turnTimerDisplay!: HTMLElement;
	private scoreGoalValue!: HTMLElement;
	private finalRoundIndicator!: HTMLElement;
	private playersList!: HTMLUListElement;

	private canvas3D!: HTMLCanvasElement;
	private dice3D!: Dice3D;
	private logic: FarkleLogic;
	private audioManager?: AudioManager;

	private draggedDieIndex = -1;
	private dragOffset: Vector3D = { x: 0, y: 0, z: 0 };
	private lastTime: number = 0;
	private previousTurnScore: number = 0;
	private isBanking: boolean = false;
	private actionsDisabled: boolean = false;
	private turnTimer: number = 50;
	private turnTimerInterval: any = null;

	private onlineManager: OnlineManager;
	private roomId: string | null = null;
	private isOnline: boolean = false;
	private lastMoveSendTime: number = 0;
	private remoteUpdatePending: boolean = false;
	private processingRemoteAction: boolean = false;

	private readonly container: HTMLDivElement;

	constructor(container: HTMLDivElement) {
		this.container = container;
		this.injectHtml();
		this.canvas = this.container.querySelector('#gameCanvas')!;
		this.ctx = this.canvas.getContext('2d')!;
		this.logic = new FarkleLogic();
		this.onlineManager = OnlineManager.getInstance();
		this.achievementManager = new AchievementManager(this.onlineManager, this.logic);
	}

	init() {
		this.setupButtons();
		this.setupOnlineListeners();
		this.initializeDice();
		this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
		this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
		this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
		this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

		this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
		this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
		this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

		window.addEventListener('resize', () => this.handleResize());
		this.handleResize();
		this.updateUI();

		this.draw();

		// Periodic resize check (some devices/browsers like iOS Safari don't fire resize events properly)
		setInterval(() => {
			this.handleResize();
		}, 2000);
	}

	private injectHtml() {
		this.container.innerHTML = `
			<div class="game-container">

				<div class="top-bar">
					<button id="infoBtn" class="icon-btn" type="button" title="Información"></button>
					<button id="debugBtn" class="icon-btn hidden" type="button" title="Herramientas de Debug"></button>
					<button id="musicBtn" class="icon-btn" type="button" title="Música"></button>
					<div class="score-display">
						<span id="topBarPlayerName" class="score-label player-name">Player 1</span>
						<span id="topBarTotalScore" class="score-value">0</span>
						<span class="separator">|</span>
						<span class="score-label">Turno</span>
						<span id="topBarTurnScore" class="score-value">0</span>
						<span class="separator">|</span>
						<span id="turnTimer" class="score-value timer-value">50</span>
					</div>
					<div id="finalRoundIndicator" class="hidden">Ronda final</div>
					
					<div style="flex: 1 1 auto"></div>
					
					<button id="easterEggBtn" class="icon-btn hidden" type="button"></button>
					<button id="profileBtn" class="icon-btn" type="button" title="Configuración"></button>
					<button id="newGameBtn" class="icon-btn" type="button" title="Nuevo Juego"></button>
					<div class="right-floating-area">
						<div class="score-goal-display">Meta: <span id="scoreGoalValue">---</span></div>
						<button id="chatBtn" class="icon-btn hidden" type="button" title="Enviar Reacción"></button>							
					</div>
				</div>		
				<canvas id="gameCanvas"></canvas>

				<div class="players-overlay">
					<h3>Jugadores</h3>
					<ul id="playersList"></ul>
				</div>

				<div class="game-controls">
					<button id="rollBtn" class="icon-btn" type="button" title="Tirar Dados"></button>
					<button id="bankBtn" class="icon-btn" type="button" disabled title="Terminar turno"></button>
				</div>
					
			</div>			

			<div class="disco-lights hidden" style="z-index: 1000;">
				<div class="haz rojo"></div>
				<div class="haz azul"></div>
				<div class="haz verde"></div>
			</div>
		`;
	}

	private handleResize() {
		const parent = this.canvas.parentElement;
		if (parent) {
			this.canvas.width = parent.clientWidth;
			this.canvas.height = parent.clientHeight;

			if (this.canvas3D) {
				this.canvas3D.width = this.canvas.width;
				this.canvas3D.height = this.canvas.height;
			}

			if (this.dice3D) {
				this.dice3D.resize(this.canvas.width, this.canvas.height);
			}

			this.draw();
		}
	}

	private setupButtons() {
		this.rollBtn = document.querySelector('#rollBtn')!;
		this.bankBtn = document.querySelector('#bankBtn')!;
		this.newGameBtn = document.querySelector('#newGameBtn')!;
		this.profileBtn = document.querySelector('#profileBtn')!;
		this.chatBtn = document.querySelector('#chatBtn')!;

		this.newGameMenu = new NewGameMenu((cfg) => this.startNewGame(cfg));

		const gameContainer = this.container.querySelector('.game-container') as HTMLElement;
		this.overlayManager = new OverlayManager(gameContainer, () => this.openNewGameMenu());

		this.reactionManager = new ReactionManager(gameContainer);
		this.profileManager = new ProfileManager(gameContainer);

		this.profileBtn.addEventListener('click', () => this.profileManager.open());
		this.chatBtn.addEventListener('click', () => this.reactionManager.openReactionPicker());

		this.topBarPlayerName = document.querySelector('#topBarPlayerName')!;
		this.topBarTurnScore = document.querySelector('#topBarTurnScore')!;
		this.topBarTotalScore = document.querySelector('#topBarTotalScore')!;
		this.turnTimerDisplay = document.querySelector('#turnTimer')!;
		this.finalRoundIndicator = document.querySelector('#finalRoundIndicator')!;
		this.scoreGoalValue = document.querySelector('#scoreGoalValue')!;

		this.playersList = document.querySelector('#playersList')!;

		this.rollBtn.addEventListener('click', () => this.rollDice());
		this.bankBtn.addEventListener('click', () => this.bankPoints());
		this.newGameBtn.addEventListener('click', () => this.openNewGameMenu());
	}

	private async openNewGameMenu() {
		if (this.onlineManager.isInGame) {
			const res = await this.overlayManager.prompt('¿Abandonar partida?', 'Hay una partida online en curso. ¿Deseas abandonarla para crear una nueva?');
			if (!res) return;

			this.onlineManager.leaveRoom();
			this.isOnline = false;
			this.roomId = null;
			this.updateUI();
		}
		this.newGameMenu.show();
	}

	public setAudioManager(audioManager: AudioManager) {
		this.audioManager = audioManager;
		const musicBtn = document.getElementById('musicBtn') as HTMLButtonElement;
		musicBtn.addEventListener('click', () => {
			const isMuted = audioManager.toggleMute();
			musicBtn.style.opacity = isMuted ? '0.5' : '1';
			// Ensure it plays if it wasn't playing (first interaction)
			audioManager.play();
		});
	}

	private startNewGame(config: GameConfig = {}) {
		this.stopTimer();
		this.logic = new FarkleLogic(config.players, config.scoreGoal);
		this.roomId = config.roomId || null;
		this.isOnline = !!config.roomId;
		this.finalRoundIndicator.classList.add('hidden');
		this.updateUI();
		this.startNextTurn();
	}

	private setupOnlineListeners() {
		this.onlineManager.addStatsListener((data) => {
			if (data.stats) {
				this.achievementManager.checkStats(data.stats);
			}
		});

		this.onlineManager.onRejoinPrompt = async (data) => {
			// Simple confirm for now. In a real app, use a nice modal.
			const res = await this.overlayManager.prompt('Reconectar', `Tienes una partida en curso en la sala ${data.roomId}. ¿Quieres volver a unirte?`);
			if (res) {
				this.roomId = data.roomId;
				this.isOnline = true;
				this.onlineManager.rejoinGame(data.roomId);
				// Hide new game menu if open
				this.newGameMenu.hide();
			}
		};

		this.onlineManager.onStateSyncRequest = (data) => {
			// Only send if we are in the same room (checked by server, but good to be safe)
			// and if we have valid state.
			if (this.isOnline && this.roomId) {
				const logicState = this.logic.getGameState();
				// Include visual positions so the requester can restore 3D placement
				const visualState: any = { dice: {} };
				this.dice.forEach((d) => {
					const state = this.dice3D.getDieState(d.diceIndex);
					visualState.dice[d.diceIndex] = { ...d, ...state };
				});
				const payload = { logicState, visualState } as any;
				this.onlineManager.sendStateSync(data.requesterId, this.roomId, payload);
			}
		};

		this.onlineManager.onStateSync = (data) => {
			if (this.isOnline) {
				console.log('Restoring game state...');
				this.logic.restoreState(data.state.logicState);

				// Update visual dice from logical dice
				const logicalDice = this.logic.getDice();
				this.dice.forEach((d, i) => {
					d.value = logicalDice[i].value;
					d.selected = logicalDice[i].selected;
					d.locked = logicalDice[i].locked;
				});

				// If the sender included visual positions, restore them to the 3D scene
				const visualState = data.state.visualState ?? null;
				if (visualState) {
					this.dice.forEach((d) => {
						const vd = visualState.dice[d.diceIndex];
						if (vd) {
							//console.log('Restoring visual die', d.diceIndex);
							this.dice3D.restoreDieState(d.diceIndex, vd);

							d.value = vd.value;
							d.selected = vd.selected;
							d.locked = vd.locked;
						}
					});
				}

				this.updateUI();
				this.draw();
			}
		};

		this.onlineManager.onGameAction = (data) => {
			if (data.senderId === this.onlineManager.getUserId()) return;

			this.processingRemoteAction = true;
			try {
				switch (data.action) {
					case 'roll':
						console.log('Received remote roll action', data.payload);
						this.rollDice(data.payload.values, data.payload.positions);
						break;
					case 'bank':
						this.bankPoints();
						break;
					case 'select_die':
						this.handleRemoteDieSelection(data.payload.index);
						break;
					case 'die_move':
						this.handleRemoteDieMove(data.payload.index, data.payload.position);
						break;
					case 'die_settle':
						this.handleRemoteDieSettle(data.payload.index, data.payload.targetPosition);
						break;
				}
			} finally {
				this.processingRemoteAction = false;
			}
		};
	}

	private handleRemoteDieMove(index: number, position: { x: number; y: number; z: number }) {
		const die = this.dice.find((d) => d.diceIndex === index);
		if (die) {
			const state = this.dice3D.getDieState(index);
			if (state && (state.moveType !== 'drag' || !state.targetPosition)) {
				this.dice3D.setTargetPosition(index, { x: position.x, y: position.y, z: position.z });
				this.dice3D.setDragging(index, true);
			} else {
				this.dice3D.setTargetPosition(index, { x: position.x, y: position.y, z: position.z });
			}
			this.remoteUpdatePending = true;
		}
	}

	private handleRemoteDieSettle(index: number, targetPosition: { x: number; y: number; z: number }) {
		const die = this.dice.find((d) => d.diceIndex === index);
		if (die) {
			this.dice3D.setDragging(index, false);
			this.dice3D.setTargetPosition(index, { x: targetPosition.x, y: targetPosition.y, z: targetPosition.z });
			this.dice3D.setSettle(index, true);
		}
	}

	private initializeDice() {
		this.dice = [];

		// Crear un único canvas 3D compartido con fondo transparente
		this.canvas3D = document.createElement('canvas');
		this.canvas3D.width = this.canvas.width;
		this.canvas3D.height = this.canvas.height;
		this.dice3D = new Dice3D(this.canvas3D, true, () => this.draw());

		for (let i = 0; i < 6; i++) {
			// Posición 3D en la escena (distribuir dados en grid)
			const position3D = { x: 0, y: 0, z: 10 };
			const diceIndex = this.dice3D.addDice(position3D);

			const die: VisualDie = {
				value: 1,
				selected: false,
				locked: false,
				diceIndex,
			};

			this.dice.push(die);
		}

		// Sync with logic
		this.syncDiceState();

		// Start animation loop
		this.animate();
	}

	private syncDiceState(updateScore: boolean = true) {
		const logicalDice = this.logic.getDice();
		this.dice.forEach((visualDie, i) => {
			const logicalDie = logicalDice[i];
			visualDie.value = logicalDie.value;
			visualDie.selected = logicalDie.selected;
			visualDie.locked = logicalDie.locked;
		});
		if (updateScore) {
			this.updateScoreDisplay();
		}
	}

	private handleRemoteDieSelection(index: number) {
		this.logic.toggleSelection(index);
		this.syncDiceState();

		const die = this.dice[index];
		// Clear remote drag target to avoid conflict
		this.dice3D.setDragging(index, false);

		let targetPos: Vector3D;
		if (die.selected) {
			// Move to selection area (left side)
			targetPos = { x: -3 + Math.random(), y: 0, z: Math.random() * 4 - 2 };
		} else {
			// Move to play area (right side)
			targetPos = { x: 2.5 + Math.random(), y: 0, z: Math.random() * 4 - 2 };
		}
		this.dice3D.collectDice([index], targetPos);
	}

	private stopTimer() {
		if (this.turnTimerInterval) {
			clearInterval(this.turnTimerInterval);
			this.turnTimerInterval = null;
		}
	}

	private startTimer() {
		this.stopTimer();

		// Don't start timer if it's a bot turn or if game is over
		if (this.currentPlayerIsBot() || this.logic.hasGameFinished()) {
			this.turnTimerDisplay.textContent = '50';
			return;
		}

		this.turnTimer = 50;
		this.turnTimerDisplay.textContent = this.turnTimer.toString();
		this.turnTimerDisplay.classList.remove('timer-low');

		this.turnTimerInterval = setInterval(() => {
			if (this.isRolling || this.isBanking) return;

			this.turnTimer--;
			this.turnTimerDisplay.textContent = this.turnTimer.toString();

			if (this.turnTimer <= 10) {
				this.turnTimerDisplay.classList.add('timer-low');
			}

			if (this.turnTimer <= 0) {
				this.stopTimer();

				// Only trigger auto-pass if it's our turn
				let isOurTurn = true;
				if (this.isOnline) {
					const state = this.logic.getGameState();
					const currentPlayer = state.players[state.currentPlayerIndex];
					isOurTurn = currentPlayer.id === this.onlineManager.getUserId();
				}

				if (isOurTurn) {
					this.handleAutoPass();
				}
			}
		}, 1000);
	}

	private async handleAutoPass() {
		console.log('Timer expired, auto-passing turn');
		// Determine best action: bank if possible, or just bank (which will end turn)
		await this.bankPoints();
	}

	private async rollDice(forcedValues?: number[], forcedPositions?: DicePositions) {
		if (this.isRolling) return;
		this.stopTimer();

		const isRemote = this.processingRemoteAction;

		if (this.isOnline && !isRemote) {
			const state = this.logic.getGameState();
			const currentPlayer = state.players[state.currentPlayerIndex];
			if (currentPlayer.id !== this.onlineManager.getUserId()) {
				return;
			}
		}

		this.actionsDisabled = true;

		this.achievementManager.checkAchievements('beforeRoll');

		// Logic handles the rules of what to roll
		const rolledIndices = this.logic.rollDice(forcedValues);

		if (rolledIndices.length === 0) {
			this.isRolling = false;
			return;
		}

		// Get dice that should be rolled
		const diceToRoll = this.dice.filter((_, i) => rolledIndices.includes(i));

		// Pre-calculate positions for online sync
		this.repositionDice(diceToRoll, forcedPositions);
		const calculatedPositions = new Map<number, Vector3D>();
		diceToRoll.forEach((d) => {
			const state = this.dice3D.getDieState(d.diceIndex);
			if (state && state.targetPosition) {
				calculatedPositions.set(d.diceIndex, { ...state.targetPosition });
			}
		});

		if (this.roomId && !isRemote) {
			const values = rolledIndices.map((i) => this.logic.getDice()[i].value);
			const positions: DicePositions = {};
			calculatedPositions.forEach((pos, index) => {
				positions[index] = pos;
			});
			this.onlineManager.sendGameAction(this.roomId, 'roll', { values, positions });
		}

		// Animate collection of dice to be rolled
		const collectionPoint = { x: 10, y: 0, z: 10 };
		this.dice3D.collectDice(
			diceToRoll.map((d) => d.diceIndex),
			collectionPoint,
			4
		);

		await sleep(500);

		if (diceToRoll.length > 1) {
			// Play shake sound
			this.audioManager?.playShake();
			await sleep(900);
		}
		await sleep(200);

		// Sync state (locks might have changed), but don't update score yet (keep "at risk" score visible)
		this.syncDiceState(false);

		// Play roll sound
		await sleep(200);
		this.audioManager?.playRoll(diceToRoll.length);

		// Restore calculated positions
		diceToRoll.forEach((d) => {
			const pos = calculatedPositions.get(d.diceIndex);
			if (pos) this.dice3D.setTargetPosition(d.diceIndex, pos);
		});

		// Start rolling animation with 3D effect
		const indices = diceToRoll.map((d) => d.diceIndex);
		const targetValues = diceToRoll.map((d) => d.value);

		this.achievementManager.checkAchievements('roll', {
			diceCount: diceToRoll.length,
			targetValues,
		});

		// Value is already updated by logic.rollDice? No, logic.rollDice returns indices.
		// Wait, logic.rollDice updates internal state. syncDiceState updates visualDie.value.
		// So d.value is correct target value.

		this.dice3D.rollDice(indices, targetValues);
		this.isRolling = true;

		this.actionsDisabled = false;
	}

	private repositionDice(diceToRoll: VisualDie[], forcedPositions?: DicePositions) {
		const lockedDice = this.dice.filter((d) => !diceToRoll.includes(d));
		const occupiedPositions: Vector3D[] = [];

		// Get positions of locked dice
		lockedDice.forEach((d) => {
			const pos = this.dice3D.getPosition(d.diceIndex);
			if (pos) occupiedPositions.push(pos);
		});

		const radius = 3.5; // Radio de dispersión
		const minDistance = 2.0; // Distancia mínima (doble del grosor 1.0)

		diceToRoll.forEach((die) => {
			if (forcedPositions && forcedPositions[die.diceIndex]) {
				const pos = forcedPositions[die.diceIndex];
				this.dice3D.setTargetPosition(die.diceIndex, { x: pos.x, y: pos.y, z: pos.z });
				return;
			}

			let validPosition = false;
			let newPos = { x: 0, y: 0, z: 0 };
			let attempts = 0;

			while (!validPosition && attempts < 100) {
				// Generar posición aleatoria en un círculo en el plano XZ, desplazado a la derecha
				const angle = Math.random() * Math.PI * 2;
				const r = Math.sqrt(Math.random()) * radius; // Distribución uniforme en círculo
				const centerX = 2.5; // Desplazamiento a la derecha (ajustado para centrar en los 2/3 derechos)
				newPos = { x: centerX + Math.cos(angle) * r, y: 0, z: Math.sin(angle) * r };

				// Verificar colisiones con dados bloqueados y dados ya posicionados en esta tirada
				let collision = false;
				for (const pos of occupiedPositions) {
					if (distance(newPos, pos) < minDistance) {
						collision = true;
						break;
					}
				}

				if (!collision) {
					validPosition = true;
					occupiedPositions.push(newPos); // Añadir a ocupados para los siguientes dados
				}
				attempts++;
			}

			if (validPosition) {
				this.dice3D.setTargetPosition(die.diceIndex, newPos);
			}
		});
	}

	private animate(time: number = 0) {
		if (this.lastTime === 0) {
			this.lastTime = time;
		}
		const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
		this.lastTime = time;

		// Update 3D dice animations
		const anyAnimating = this.dice3D.update(deltaTime);

		// Check if rolling finished to trigger score check
		// We need to know if we were rolling and now we are not
		// But here we just check if any die is rolling
		// The original code checked: if (!this.dice.some((d) => d.rolling)) { ... }
		// We can check dice3D state

		if (this.isRolling) {
			const stillRolling = this.dice.some((d) => this.dice3D.getMoveType(d.diceIndex) === 'roll');

			if (!stillRolling) {
				this.isRolling = false;
				this.checkForScore();
			}
		}

		if (anyAnimating || this.remoteUpdatePending) {
			this.draw();
			this.remoteUpdatePending = false;
		}

		if (anyAnimating) {
			this.bankBtn.disabled = true;
			this.rollBtn.disabled = true;
		} else {
			this.updateButtonsState();
		}

		requestAnimationFrame((t) => this.animate(t));
	}

	/**
	 * Checks the game state after a roll to see if there is a score or a Farkle.
	 * This event is triggered after the rolling animation ends.
	 */
	private checkForScore() {
		// Logic already checked for Farkle during rollDice, but we need to handle the UI consequences
		// after animation finishes.

		const gameState = this.logic.getGameState();

		if (gameState.isFarkle) {
			this.handleFarkleSequence();
		} else {
			this.updateScoreDisplay();
			this.draw();
			this.checkBotTurn();
			this.startTimer();
		}
	}

	private async handleFarkleSequence() {
		// Check for achievements
		this.achievementManager.checkAchievements('farkle');

		this.stopTimer();
		// 1. Wait 1 second after dice stop
		await sleep(1000);

		// 2. Show Overlay
		this.overlayManager.showFarkle();

		// 3. Wait 2 seconds (overlay duration)
		await sleep(2000);

		// 4. Hide Overlay
		this.overlayManager.hideFarkle();
		this.draw();

		// 5. Animate loss
		await this.animateFarkleLoss();

		// 6. Logic update
		this.logic.bankPoints(); // Score 0, switch turn, reset dice
		this.endTurn();
	}

	private async animateFarkleLoss() {
		// Add red color class
		this.topBarTurnScore.classList.add('score-transfer-source');

		let currentScore = parseInt(this.topBarTurnScore.textContent || '0');
		const step = Math.max(10, Math.floor(currentScore / 20));

		await interval((endInterval) => {
			currentScore -= step;
			if (currentScore <= 0) {
				currentScore = 0;
				this.topBarTurnScore?.classList.remove('score-transfer-source');
				endInterval();
			}
			this.topBarTurnScore!.textContent = currentScore.toString();
		}, 30);
	}

	private handleTouchStart(e: TouchEvent) {
		if (e.touches.length > 0) {
			e.preventDefault(); // Prevent scrolling
			this.onInputStart(e.touches[0].clientX, e.touches[0].clientY);
		}
	}

	private handleTouchMove(e: TouchEvent) {
		if (e.touches.length > 0) {
			e.preventDefault(); // Prevent scrolling
			this.onInputMove(e.touches[0].clientX, e.touches[0].clientY);
		}
	}

	private handleTouchEnd(_e: TouchEvent) {
		this.onInputEnd();
	}

	private handleMouseDown(e: MouseEvent) {
		this.onInputStart(e.clientX, e.clientY);
	}

	private handleMouseMove(e: MouseEvent) {
		this.onInputMove(e.clientX, e.clientY);
	}

	private handleMouseUp(_e: MouseEvent) {
		this.onInputEnd();
	}

	private onInputStart(clientX: number, clientY: number) {
		if (this.currentPlayerIsBot()) return;
		if (this.isRolling || this.isBanking) return;

		if (this.isOnline) {
			const state = this.logic.getGameState();
			const currentPlayer = state.players[state.currentPlayerIndex];
			if (currentPlayer.id !== this.onlineManager.getUserId()) {
				return;
			}
		}

		const rect = this.canvas.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		const clickedIndex = this.dice3D.getIntersectedDice(x, y);

		if (clickedIndex === null) return;
		const die = this.dice.find((d) => d.diceIndex === clickedIndex);
		if (!die || die.locked) return;

		this.draggedDieIndex = clickedIndex;
		this.actionsDisabled = true;
		this.dice3D.stop(clickedIndex);
		this.dice3D.setDragging(clickedIndex, true);
		this.dice3D.setTargetPosition(clickedIndex, { y: 0.5 });

		// Calcular offset para arrastre suave
		const intersection = this.dice3D.getPlaneIntersection(x, y);
		const diePos = this.dice3D.getPosition(clickedIndex);
		if (intersection && diePos) {
			this.dragOffset = subVectors(diePos, intersection);
		}
	}

	private onInputMove(clientX: number, clientY: number) {
		if (this.draggedDieIndex === -1) return;

		const rect = this.canvas.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		const intersection = this.dice3D.getPlaneIntersection(x, y);
		if (intersection) {
			const newPos = addVectors(intersection, this.dragOffset);

			// Update currentPosition X and Z immediately for responsiveness
			const die = this.dice.find((d) => d.diceIndex === this.draggedDieIndex);
			if (die) {
				const state = this.dice3D.getDieState(die.diceIndex);
				if (!state) return;
				this.dice3D.setDragging(die.diceIndex, true);
				this.dice3D.setDiePosition(die.diceIndex, { x: newPos.x, z: newPos.z });
				let targetPos = { x: newPos.x, z: newPos.z, y: 0.5 };

				// Hay que verificar que no hay dados debajo, en caso de que los haya subir un poco más
				while (true) {
					const closest = this.dice3D.closestDie(targetPos, [die.diceIndex]);
					if (closest.dist < 1.0) {
						targetPos.y += 0.5;
					} else {
						break;
					}
				}
				this.dice3D.setTargetPosition(die.diceIndex, targetPos);

				if (this.roomId) {
					const now = Date.now();
					if (now - this.lastMoveSendTime > 30) {
						this.onlineManager.sendGameAction(this.roomId, 'die_move', {
							index: die.diceIndex,
							position: targetPos,
						});
						this.lastMoveSendTime = now;
					}
				}
			}
		}
	}

	private onInputEnd() {
		if (this.draggedDieIndex === -1) return;

		this.actionsDisabled = false;

		this.dice3D.setDragging(this.draggedDieIndex, false);

		const die = this.dice.find((d) => d.diceIndex === this.draggedDieIndex);
		if (die) {
			const state = this.dice3D.getDieState(die.diceIndex);
			if (!state) return;

			// Check for collisions and find valid position
			const targetPos = this.dice3D.findValidPosition(die.diceIndex, state.currentPosition);

			this.dice3D.setTargetPosition(die.diceIndex, targetPos);
			this.dice3D.setSettle(die.diceIndex, true);

			const screenPos = this.dice3D.getScreenPosition(this.draggedDieIndex);
			if (screenPos) {
				// Zona de selección: Izquierda 1/3 de la pantalla
				const selectionThreshold = this.canvas.width / 3;
				const shouldBeSelected = screenPos.x < selectionThreshold;

				// Only toggle if state changed
				if (shouldBeSelected !== die.selected) {
					// Find index in our array
					const index = this.dice.indexOf(die);
					if (index !== -1) {
						this.logic.toggleSelection(index);
						this.syncDiceState();
						if (this.roomId) {
							this.onlineManager.sendGameAction(this.roomId, 'select_die', { index });
						}
					}
				}

				if (this.roomId) {
					this.onlineManager.sendGameAction(this.roomId, 'die_settle', {
						index: die.diceIndex,
						targetPosition: targetPos,
					});
				}
			}
		}

		this.draggedDieIndex = -1;
		// draw() is called by animate loop
	}

	private async bankPoints() {
		this.stopTimer();

		const isRemote = this.processingRemoteAction;

		if (this.isOnline && !isRemote) {
			const state = this.logic.getGameState();
			const currentPlayer = state.players[state.currentPlayerIndex];
			if (currentPlayer.id !== this.onlineManager.getUserId()) {
				return;
			}
			if (this.roomId) {
				this.onlineManager.sendGameAction(this.roomId, 'bank', {});
			}
		}

		const gameState = this.logic.getGameState();
		const startTurnScore = gameState.turnScore;
		const currentPlayer = gameState.players[gameState.currentPlayerIndex];
		const startTotalScore = currentPlayer.score;

		if (startTurnScore === 0) {
			this.logic.bankPoints();
			this.endTurn();
			return;
		}

		this.achievementManager.checkAchievements('bank');

		this.isBanking = true;

		// Disable buttons during animation
		this.actionsDisabled = true;

		this.topBarTurnScore.classList.add('score-transfer-source');
		this.topBarTotalScore.classList.add('score-transfer-target');

		let currentTurnDisplay = startTurnScore;
		let currentTotalDisplay = startTotalScore;

		const step = Math.max(5, Math.floor(startTurnScore / 40)); // Adjust speed

		await interval((endInterval) => {
			currentTurnDisplay -= step;
			currentTotalDisplay += step;

			if (currentTurnDisplay <= 0) {
				endInterval();
				currentTurnDisplay = 0;
				currentTotalDisplay = startTotalScore + startTurnScore;
				this.topBarTurnScore.classList.remove('score-transfer-source');
				this.topBarTotalScore.classList.remove('score-transfer-target');
			}

			this.topBarTurnScore.textContent = currentTurnDisplay.toString();
			this.topBarTotalScore.textContent = currentTotalDisplay.toString();
		}, 25);

		this.isBanking = false;
		this.logic.bankPoints();

		await sleep(1000);
		await this.endTurn();
		this.actionsDisabled = false;
	}

	private async endTurn() {
		this.syncDiceState(false);

		// Calculate previous player index (since logic has already switched)
		const gameState = this.logic.getGameState();
		const numPlayers = gameState.players.length;
		const previousPlayerIndex = (gameState.currentPlayerIndex - 1 + numPlayers) % numPlayers;

		if (this.logic.hasGameFinished()) {
			const winner = this.logic.getWinner()!;

			// Achievement Checks for Winner
			// Note: All clients evaluate gameOver locally. The achievement logic checks if winnerId matches current user.
			this.achievementManager.checkAchievements('gameOver');

			this.overlayManager.showWinner(winner.name, gameState.players);

			if (this.roomId) {
				const payload = { winnerName: winner.name, winnerId: winner.id ?? null, players: gameState.players };
				console.log('Sending game over action', payload);
				this.onlineManager.sendGameAction(this.roomId, 'game_over', payload);
				this.onlineManager.leaveRoom(); // Clean up local state

				// Fetch stats to check for meta-achievements (wins, games played etc)
				setTimeout(() => this.onlineManager.getStats(), 2000);
			}

			this.startNewGame(); // Reset for next game
			return;
		}

		if (this.logic.isFinalRound()) {
			this.finalRoundIndicator.classList.remove('hidden');
		}

		this.updateScoreDisplay(previousPlayerIndex);
		this.draw();

		await this.startNextTurn();
	}

	private async startNextTurn() {
		const gameState = this.logic.getGameState();
		const currentPlayer = gameState.players[gameState.currentPlayerIndex];
		this.collectDice();

		// Setup tracking for next turn
		this.achievementManager.checkAchievements('startTurn');

		await sleep(500);
		this.overlayManager.showNextTurn(currentPlayer.name);

		// Hide automatically after 2 seconds
		await sleep(2000);
		this.overlayManager.hideNextTurn();
		this.updateScoreDisplay(); // Update to new player
		this.checkBotTurn();
		this.updateButtonsState();
		this.startTimer();
	}

	private currentPlayerIsBot(): boolean {
		const gameState = this.logic.getGameState();
		const currentPlayer = gameState.players[gameState.currentPlayerIndex];
		return !!currentPlayer.isBot;
	}

	private async checkBotTurn() {
		const gameState = this.logic.getGameState();
		if (!this.currentPlayerIsBot()) return;

		this.actionsDisabled = true;
		this.updateButtonsState();

		await sleep(1000);

		if (gameState.canRoll && gameState.turnScore === 0 && !gameState.isFarkle) {
			this.rollDice();
		} else if (!gameState.isFarkle) {
			await this.botDecision();
		}
	}

	private async botDecision() {
		const dice = this.logic.getDice();
		const unlockedDice = dice.map((d, i) => ({ ...d, index: i })).filter((d) => !d.locked && !d.selected);
		const values = unlockedDice.map((d) => d.value);

		// Use logic to find best scoring combination
		const result = this.logic.calculateScore(values);

		// Select dice
		const usedValues = [...result.usedDice];
		const lockedDiceCount = dice.filter((d) => d.locked).length;

		let d = 0;
		for (const val of usedValues) {
			const dieToSelect = unlockedDice.find((d) => d.value === val && !this.logic.getDice()[d.index].selected);
			if (dieToSelect) {
				this.logic.toggleSelection(dieToSelect.index);

				// Move visual die to selection zone
				const visualDie = this.dice[dieToSelect.index];
				visualDie.selected = true;

				const pos = this.dice3D.getPosition(visualDie.diceIndex);
				if (!pos) continue;
				const targetPos = { ...pos };
				// Truquito para evitar solapamientos: distribuir en X y Z según índice
				const i = lockedDiceCount + d++;
				targetPos.x = i * 0.2 - 5.0 + Math.random() * 0.5;
				targetPos.z = i * 1.5 - 3.5 + Math.random() * 0.5;

				this.dice3D.setTargetPosition(visualDie.diceIndex, targetPos);
				this.dice3D.setSettle(visualDie.diceIndex, true);

				this.draw();
				this.updateScoreDisplay(); // Update to new player
				await sleep(800);
			}
		}

		await sleep(800);
		// Re-evaluate state
		const gameState = this.logic.getGameState();

		if (gameState.canRoll && gameState.dice.every((d) => d.locked || d.selected)) {
			// Hot dice, must roll
			this.rollDice();
		} else if (gameState.turnScore >= 300) {
			this.bankPoints();
		} else {
			this.rollDice();
		}
	}

	private isControlableTurn(): boolean {
		if (this.currentPlayerIsBot()) return false;
		if (!this.isOnline) return true;
		const gameState = this.logic.getGameState();
		return gameState.players[gameState.currentPlayerIndex].id === this.onlineManager.getUserId();
	}

	private updateButtonsState() {
		const gameState = this.logic.getGameState();
		const forceDisabled = this.actionsDisabled || !this.isControlableTurn();

		this.bankBtn.disabled = !gameState.canBank || forceDisabled;
		this.rollBtn.disabled = !gameState.canRoll || forceDisabled;
	}

	private collectDice() {
		// Target position: Bottom-left corner (off-screen)
		// Camera is at (1, 12, 6), looking at (0, 0, 0).
		// Moving to negative X (left) and positive Z (down/forward).
		const collectionPoint = { x: -5, y: 0, z: 14 };
		const indices = this.dice.map((d) => d.diceIndex);
		this.dice3D.collectDice(indices, collectionPoint, 1);
	}

	public updateUI() {
		this.updateScoreDisplay();
		this.scoreGoalValue.textContent = this.logic.scoreGoal.toString();

		if (this.isOnline) this.chatBtn.classList.remove('hidden');
		else this.chatBtn.classList.add('hidden');
	}

	private updateScoreDisplay(playerIndex?: number) {
		const gameState = this.logic.getGameState();
		const activeIndex = playerIndex !== undefined ? playerIndex : gameState.currentPlayerIndex;
		const currentPlayer = gameState.players[activeIndex];

		// Update top bar display
		this.topBarPlayerName.textContent = currentPlayer.name;
		this.topBarTotalScore.textContent = currentPlayer.score.toString();

		if (gameState.turnScore > this.previousTurnScore) {
			this.topBarTurnScore.classList.remove('score-pop');
			void (this.topBarTurnScore as HTMLElement).offsetWidth; // Trigger reflow
			this.topBarTurnScore.classList.add('score-pop');
		}
		this.topBarTurnScore.textContent = gameState.turnScore.toString();

		this.previousTurnScore = gameState.turnScore;

		this.playersList.innerHTML = gameState.players
			.map(
				(p, i) => `<li style="${i === activeIndex ? 'font-weight: bold; color: var(--p-color-1);' : ''}">
				<span class="players-list-player-name">${p.name}</span> <span>${p.score} p</span>
			</li>`
			)
			.join('');
	}

	private draw() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Update dice state
		this.dice.forEach((die) => {
			this.drawDie(die);
		});

		// Renderizar el canvas 3D una sola vez con todos los dados
		this.dice3D.render();

		// Dibujar el canvas 3D completo en el canvas principal
		this.ctx.drawImage(this.canvas3D, 0, 0);

		// Draw selection zone overlay (left 1/3)
		this.ctx.save();
		this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
		this.ctx.fillRect(0, 0, this.canvas.width / 3, this.canvas.height);
		this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
		this.ctx.setLineDash([10, 10]);
		this.ctx.beginPath();
		this.ctx.moveTo(this.canvas.width / 3, 0);
		this.ctx.lineTo(this.canvas.width / 3, this.canvas.height);
		this.ctx.stroke();
		this.ctx.restore();
	}

	private drawDie(die: VisualDie) {
		const { selected, locked } = die;

		// Update 3D visual state
		this.dice3D.setDiceState(die.diceIndex, selected, locked);
	}

	public setTestDiceRotation(xDegrees: number, yDegrees: number, zDegrees: number): void {
		if (this.dice.length > 0) {
			const testDie = this.dice[0];
			const rotation = { x: (xDegrees * Math.PI) / 180, y: (yDegrees * Math.PI) / 180, z: (zDegrees * Math.PI) / 180 };
			this.dice3D.setDieRotation(testDie.diceIndex, rotation);
			this.draw();
		}
	}
}
