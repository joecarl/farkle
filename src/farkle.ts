import type { DicePositions, DieState, GameConfig } from './types';
import * as THREE from 'three';
import { Dice3D } from './dice3D';
import { FarkleLogic } from './logic';
import { AudioManager } from './audio';
import { NewGameMenu } from './new-game-menu';
import { OverlayManager } from './overlay-manager';
import { OnlineManager } from './online-manager';
import { interval, sleep } from './utils';

// Visual representation of a die, extending the logical state
interface VisualDie extends DieState {
	x: number;
	y: number;
	rolling: boolean;
	targetValue: number;
	rollTime: number;
	rotationX: number;
	rotationY: number;
	rotationZ: number;
	targetRotationX: number;
	targetRotationY: number;
	targetRotationZ: number;
	diceIndex: number;
	startPosition?: THREE.Vector3;
	targetPosition?: THREE.Vector3;
	currentPosition: THREE.Vector3;
	settling: boolean;
	collecting: boolean;
	remoteDragging?: boolean;
}

export class FarkleGame {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private dice: VisualDie[] = [];
	private isRolling = false;
	private rollBtn!: HTMLButtonElement;
	private bankBtn!: HTMLButtonElement;
	private newGameBtn!: HTMLButtonElement;

	private overlayManager!: OverlayManager;

	private newGameMenu!: NewGameMenu;

	private topBarPlayerName!: HTMLElement;
	private topBarTurnScore!: HTMLElement;
	private topBarTotalScore!: HTMLElement;
	private playersList!: HTMLUListElement;

	private readonly DIE_SIZE = 60;
	private readonly DIE_PADDING = 20;

	private canvas3D!: HTMLCanvasElement;
	private dice3D!: Dice3D;
	private logic: FarkleLogic;
	private audioManager?: AudioManager;

	private isDragging = false;
	private draggedDieIndex = -1;
	private dragOffset = new THREE.Vector3();
	private lastTime: number = 0;
	private previousTurnScore: number = 0;
	private isBanking: boolean = false;
	private actionsDisabled: boolean = false;

	private onlineManager: OnlineManager;
	private roomId: string | null = null;
	private isOnline: boolean = false;
	private lastMoveSendTime: number = 0;
	private remoteUpdatePending: boolean = false;

	private readonly container: HTMLDivElement;

	constructor(container: HTMLDivElement) {
		this.container = container;
		this.injectHtml();
		this.canvas = this.container.querySelector('#gameCanvas')!;
		this.ctx = this.canvas.getContext('2d')!;
		this.logic = new FarkleLogic();
		this.onlineManager = OnlineManager.getInstance();
	}

	init() {
		this.setupButtons();
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

		this.draw();
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
					</div>
					
					<div style="flex: 1 1 auto"></div>

					<button id="easterEggBtn" class="icon-btn hidden" type="button"></button>
					<button id="newGameBtn" class="icon-btn" type="button" title="Nuevo Juego"></button>
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

		this.newGameMenu = new NewGameMenu((cfg) => this.startNewGame(cfg));

		const gameContainer = this.container.querySelector('.game-container') as HTMLElement;
		this.overlayManager = new OverlayManager(gameContainer, () => this.newGameMenu.show());

		this.topBarPlayerName = document.querySelector('#topBarPlayerName')!;
		this.topBarTurnScore = document.querySelector('#topBarTurnScore')!;
		this.topBarTotalScore = document.querySelector('#topBarTotalScore')!;

		this.playersList = document.querySelector('#playersList')!;

		this.rollBtn.addEventListener('click', () => this.rollDice());
		this.bankBtn.addEventListener('click', () => this.bankPoints());
		this.newGameBtn.addEventListener('click', () => this.newGameMenu.show());
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
		this.logic = new FarkleLogic(config.players, config.scoreGoal);
		this.roomId = config.roomId || null;
		this.isOnline = !!config.roomId;

		if (this.isOnline) {
			this.setupOnlineListeners();
		}

		this.endTurn();
	}

	private setupOnlineListeners() {
		this.onlineManager.onGameAction = (data) => {
			if (data.senderId === this.onlineManager.getSocketId()) return;

			switch (data.action) {
				case 'roll':
					console.log('Received remote roll action', data.payload);
					this.rollDice(true, data.payload.values, data.payload.positions);
					break;
				case 'bank':
					this.bankPoints(true);
					break;
				case 'select_die':
					this.toggleDieSelection(data.payload.index, true);
					break;
				case 'die_move':
					this.handleRemoteDieMove(data.payload.index, data.payload.position);
					break;
				case 'die_settle':
					this.handleRemoteDieSettle(data.payload.index, data.payload.targetPosition);
					break;
			}
		};
	}

	private handleRemoteDieMove(index: number, position: { x: number; y: number; z: number }) {
		const die = this.dice.find((d) => d.diceIndex === index);
		if (die) {
			if (!die.remoteDragging || !die.targetPosition) {
				die.targetPosition = new THREE.Vector3(position.x, position.y, position.z);
				die.remoteDragging = true;
				// If distance is huge, snap immediately
				if (die.currentPosition.distanceTo(die.targetPosition) > 5) {
					die.currentPosition.copy(die.targetPosition);
				}
			} else {
				die.targetPosition.set(position.x, position.y, position.z);
			}
			this.remoteUpdatePending = true;
		}
	}

	private handleRemoteDieSettle(index: number, targetPosition: { x: number; y: number; z: number }) {
		const die = this.dice.find((d) => d.diceIndex === index);
		if (die) {
			die.remoteDragging = false; // Stop remote dragging
			die.targetPosition = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
			die.settling = true;
		}
	}

	private initializeDice() {
		this.dice = [];
		const startX = 100;
		const startY = 150;

		// Crear un único canvas 3D compartido con fondo transparente
		this.canvas3D = document.createElement('canvas');
		this.canvas3D.width = this.canvas.width;
		this.canvas3D.height = this.canvas.height;
		this.dice3D = new Dice3D(this.canvas3D, true, () => this.draw());

		for (let i = 0; i < 6; i++) {
			const col = i % 3;
			const row = Math.floor(i / 3);

			// Posición 3D en la escena (distribuir dados en grid)
			// const position3D = new THREE.Vector3(
			// 	(col - 1) * 1.5, // -1.5, 0, 1.5
			// 	0,
			// 	(row - 0.5) * 1.5 // -0.75, 0.75
			// );

			const position3D = new THREE.Vector3(0, 0, 10);

			const diceIndex = this.dice3D.addDice(position3D);

			const die: VisualDie = {
				value: 1,
				selected: false,
				locked: false,
				x: startX + col * (this.DIE_SIZE + this.DIE_PADDING),
				y: startY + row * (this.DIE_SIZE + this.DIE_PADDING),
				rolling: false,
				targetValue: 1,
				rollTime: 0,
				rotationX: 0,
				rotationY: 0,
				rotationZ: 0,
				targetRotationX: 0,
				targetRotationY: 0,
				targetRotationZ: 0,
				diceIndex,
				currentPosition: position3D.clone(),
				settling: false,
				collecting: false,
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

	private toggleDieSelection(index: number, isRemote: boolean = false) {
		if (isRemote) {
			this.logic.toggleSelection(index);
			this.syncDiceState();

			const die = this.dice[index];
			// Clear remote drag target to avoid conflict
			die.remoteDragging = false;

			if (die.selected) {
				// Move to selection area (left side)
				die.targetPosition = new THREE.Vector3(-3 + Math.random(), 0, Math.random() * 4 - 2);
			} else {
				// Move to play area (right side)
				die.targetPosition = new THREE.Vector3(2.5 + Math.random(), 0, Math.random() * 4 - 2);
			}
			die.collecting = true;
		}
	}

	private async rollDice(isRemote: boolean = false, forcedValues?: number[], forcedPositions?: DicePositions) {
		if (this.isRolling) return;

		if (this.isOnline && !isRemote) {
			const state = this.logic.getGameState();
			const currentPlayer = state.players[state.currentPlayerIndex];
			if (currentPlayer.id !== this.onlineManager.getSocketId()) {
				return;
			}
		}

		this.isRolling = true;
		this.actionsDisabled = true;

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
		const calculatedPositions = new Map<number, THREE.Vector3>();
		diceToRoll.forEach((d) => {
			if (d.targetPosition) {
				calculatedPositions.set(d.diceIndex, d.targetPosition.clone());
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
		const collectionPoint = new THREE.Vector3(10, 0, 10);

		diceToRoll.forEach((die) => {
			die.collecting = true;
			die.targetPosition = collectionPoint.clone();
			die.targetPosition.x += Math.random() * 4;
			die.targetPosition.z += Math.random() * 4;
		});

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
			if (pos) d.targetPosition = pos;
		});

		// Start rolling animation with 3D effect
		diceToRoll.forEach((die) => {
			die.rolling = true;
			die.rollTime = 0;
			die.targetValue = die.value;

			// Set start position (off-screen, bottom-right approx)
			die.startPosition = new THREE.Vector3(10 + Math.random() * 4, 2 + Math.random() * 1.5, 10 + Math.random() * 4);
			this.dice3D.setPosition(die.diceIndex, die.startPosition);

			// Set target rotations based on target value
			this.setDiceRotationForValue(die);
		});
		this.actionsDisabled = false;
	}

	private repositionDice(diceToRoll: VisualDie[], forcedPositions?: DicePositions) {
		const lockedDice = this.dice.filter((d) => !diceToRoll.includes(d));
		const occupiedPositions: THREE.Vector3[] = [];

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
				die.targetPosition = new THREE.Vector3(pos.x, pos.y, pos.z);
				return;
			}

			let validPosition = false;
			let newPos = new THREE.Vector3();
			let attempts = 0;

			while (!validPosition && attempts < 100) {
				// Generar posición aleatoria en un círculo en el plano XZ, desplazado a la derecha
				const angle = Math.random() * Math.PI * 2;
				const r = Math.sqrt(Math.random()) * radius; // Distribución uniforme en círculo
				const centerX = 2.5; // Desplazamiento a la derecha (ajustado para centrar en los 2/3 derechos)
				newPos.set(centerX + Math.cos(angle) * r, 0, Math.sin(angle) * r);

				// Verificar colisiones con dados bloqueados y dados ya posicionados en esta tirada
				let collision = false;
				for (const pos of occupiedPositions) {
					if (newPos.distanceTo(pos) < minDistance) {
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
				die.targetPosition = newPos;
			}
		});
	}

	private animate(time: number = 0) {
		if (this.lastTime === 0) {
			this.lastTime = time;
		}
		const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
		this.lastTime = time;

		let needsUpdate = false;

		// Time-based constants
		const ROLL_DURATION = 1.0;
		// Calculate lerp factors: 1 - (1 - factor)^ (deltaTime * 60)
		const lerpFactor = 1 - Math.pow(1 - 0.1, deltaTime * 60);
		const dragLerpFactor = 1 - Math.pow(1 - 0.2, deltaTime * 60);
		const collectLerpFactor = 1 - Math.pow(1 - 0.05, deltaTime * 60);
		let anyAnimating = false;

		this.dice.forEach((die) => {
			let animatingDie = true;
			// Rolling Animation
			if (die.rolling) {
				needsUpdate = true;
				die.rollTime += deltaTime;
				const progress = Math.min(die.rollTime / ROLL_DURATION, 1);
				const easeProgress = 1 - Math.pow(1 - progress, 3);

				die.rotationX = die.targetRotationX * easeProgress;
				die.rotationY = die.targetRotationY * easeProgress;
				die.rotationZ = die.targetRotationZ * easeProgress;

				if (die.startPosition && die.targetPosition) {
					die.currentPosition.lerpVectors(die.startPosition, die.targetPosition, easeProgress);
					this.dice3D.setPosition(die.diceIndex, die.currentPosition);
				}

				if (progress < 0.85) {
					die.value = Math.floor(Math.random() * 6) + 1;
				} else {
					die.value = die.targetValue;
				}

				if (progress >= 1) {
					die.rolling = false;
					die.value = die.targetValue;
					if (die.targetPosition) {
						die.currentPosition.copy(die.targetPosition);
						this.dice3D.setPosition(die.diceIndex, die.currentPosition);
						this.updateDieScreenPosition(die);
					}

					// Check if all dice finished rolling
					if (!this.dice.some((d) => d.rolling)) {
						this.isRolling = false;
						this.checkForScore();
					}
				}
			}
			// Dragging Animation (Smooth Lift)
			else if (this.isDragging && die.diceIndex === this.draggedDieIndex) {
				needsUpdate = true;
				// Target Y is 0.5 when dragging
				const targetY = 0.5;
				die.currentPosition.y += (targetY - die.currentPosition.y) * dragLerpFactor;

				this.dice3D.setPosition(die.diceIndex, die.currentPosition);
				this.updateDieScreenPosition(die);
			}
			// Remote Dragging Animation
			else if (die.remoteDragging && die.targetPosition) {
				needsUpdate = true;
				// Interpolate towards remote target
				die.currentPosition.lerp(die.targetPosition, 0.3);
				this.dice3D.setPosition(die.diceIndex, die.currentPosition);
				this.updateDieScreenPosition(die);
			}
			// Settling Animation (Drop & Collision Avoidance)
			else if (die.settling && die.targetPosition) {
				needsUpdate = true;
				die.currentPosition.lerp(die.targetPosition, lerpFactor);
				this.dice3D.setPosition(die.diceIndex, die.currentPosition);
				this.updateDieScreenPosition(die);

				if (die.currentPosition.distanceTo(die.targetPosition) < 0.01) {
					die.currentPosition.copy(die.targetPosition);
					this.dice3D.setPosition(die.diceIndex, die.currentPosition);
					die.settling = false;
				}
			}
			// Collecting Animation
			else if (die.collecting && die.targetPosition) {
				needsUpdate = true;
				die.currentPosition.lerp(die.targetPosition, collectLerpFactor);
				this.dice3D.setPosition(die.diceIndex, die.currentPosition);
				this.updateDieScreenPosition(die);

				if (die.currentPosition.distanceTo(die.targetPosition) < 0.1) {
					die.currentPosition.copy(die.targetPosition);
					this.dice3D.setPosition(die.diceIndex, die.currentPosition);
					die.collecting = false;
				}
			}
			// Idle - Ensure Y is 0
			else if (!die.locked && !die.selected && Math.abs(die.currentPosition.y) > 0.01) {
				needsUpdate = true;
				die.currentPosition.y += (0 - die.currentPosition.y) * dragLerpFactor;
				this.dice3D.setPosition(die.diceIndex, die.currentPosition);
			} else {
				animatingDie = false;
			}
			if (animatingDie) {
				anyAnimating = true;
			}
		});

		if (needsUpdate || this.isDragging || this.remoteUpdatePending) {
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

	private updateDieScreenPosition(die: VisualDie) {
		const screenPos = this.dice3D.getScreenPosition(die.diceIndex);
		if (screenPos) {
			die.x = screenPos.x - this.DIE_SIZE / 2;
			die.y = screenPos.y - this.DIE_SIZE / 2;
		}
	}

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
		}
	}

	private async handleFarkleSequence() {
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
			if (currentPlayer.id !== this.onlineManager.getSocketId()) {
				return;
			}
		}

		const rect = this.canvas.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		const clickedIndex = this.dice3D.getIntersectedDice(x, y);

		if (clickedIndex !== null) {
			const die = this.dice.find((d) => d.diceIndex === clickedIndex);
			if (die && !die.locked) {
				this.isDragging = true;
				this.draggedDieIndex = clickedIndex;

				// Calcular offset para arrastre suave
				const intersection = this.dice3D.getPlaneIntersection(x, y);
				const diePos = this.dice3D.getPosition(clickedIndex);
				if (intersection && diePos) {
					this.dragOffset.subVectors(diePos, intersection);
				}
			}
		}
	}

	private onInputMove(clientX: number, clientY: number) {
		if (!this.isDragging || this.draggedDieIndex === -1) return;

		const rect = this.canvas.getBoundingClientRect();
		const x = clientX - rect.left;
		const y = clientY - rect.top;

		const intersection = this.dice3D.getPlaneIntersection(x, y);
		if (intersection) {
			const newPos = new THREE.Vector3().addVectors(intersection, this.dragOffset);

			// Update currentPosition X and Z immediately for responsiveness
			const die = this.dice.find((d) => d.diceIndex === this.draggedDieIndex);
			if (die) {
				die.currentPosition.x = newPos.x;
				die.currentPosition.z = newPos.z;
				// Y is handled in animate() for smoothness

				if (this.roomId) {
					const now = Date.now();
					if (now - this.lastMoveSendTime > 30) {
						this.onlineManager.sendGameAction(this.roomId, 'die_move', {
							index: die.diceIndex,
							position: die.currentPosition,
						});
						this.lastMoveSendTime = now;
					}
				}
			}
		}
	}

	private onInputEnd() {
		if (!this.isDragging) return;

		const die = this.dice.find((d) => d.diceIndex === this.draggedDieIndex);
		if (die) {
			// Check for collisions and find valid position
			const otherDice = this.dice.filter((d) => d.diceIndex !== die.diceIndex);
			let targetPos = die.currentPosition.clone();
			targetPos.y = 0; // Target floor

			// Physics-based relaxation to find closest valid position
			const minDistance = 1.6;
			let iterations = 0;
			const maxIterations = 20;

			while (iterations < maxIterations) {
				let moveVector = new THREE.Vector3(0, 0, 0);
				let collisionCount = 0;

				for (const other of otherDice) {
					// Use other.targetPosition if settling/rolling, else currentPosition
					const otherPos = other.targetPosition || other.currentPosition;
					const dist = targetPos.distanceTo(otherPos);

					if (dist < minDistance) {
						collisionCount++;
						const pushDir = new THREE.Vector3().subVectors(targetPos, otherPos);

						// If exact overlap, pick random direction
						if (pushDir.lengthSq() < 0.0001) {
							pushDir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
						}

						pushDir.normalize();
						const overlap = minDistance - dist;
						// Add push vector (weighted by overlap)
						moveVector.add(pushDir.multiplyScalar(overlap));
					}
				}

				if (collisionCount === 0) break;

				// Apply correction (with some damping factor if needed, but 0.8 works well)
				targetPos.add(moveVector.multiplyScalar(0.5));
				iterations++;
			}

			die.targetPosition = targetPos;
			die.settling = true;

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
						targetPosition: die.targetPosition,
					});
				}
			}
		}

		this.isDragging = false;
		this.draggedDieIndex = -1;
		// draw() is called by animate loop
	}

	private async bankPoints(isRemote: boolean = false) {
		if (this.isOnline && !isRemote) {
			const state = this.logic.getGameState();
			const currentPlayer = state.players[state.currentPlayerIndex];
			if (currentPlayer.id !== this.onlineManager.getSocketId()) {
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
		const previousPlayer = gameState.players[previousPlayerIndex];

		if (previousPlayer.score >= this.logic.scoreGoal) {
			this.overlayManager.showWinner(previousPlayer.name, gameState.players);

			if (this.roomId) {
				const payload = { winnerName: previousPlayer.name, players: gameState.players };
				console.log('Sending game over action', payload);
				this.onlineManager.sendGameAction(this.roomId, 'game_over', payload);
				this.onlineManager.leaveRoom(); // Clean up local state
			}

			this.startNewGame(); // Reset for next game
			return;
		}

		this.updateScoreDisplay(previousPlayerIndex);
		this.draw();

		this.collectDice();

		const currentPlayer = gameState.players[gameState.currentPlayerIndex];

		await sleep(500);
		this.overlayManager.showNextTurn(currentPlayer.name);

		// Hide automatically after 2 seconds
		await sleep(2000);
		this.overlayManager.hideNextTurn();
		this.updateScoreDisplay(); // Update to new player
		this.checkBotTurn();
		this.updateButtonsState();
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

				const targetPos = visualDie.currentPosition.clone();
				// Truquito para evitar solapamientos: distribuir en X y Z según índice
				const i = lockedDiceCount + d++;
				targetPos.x = i * 0.2 - 5.0 + Math.random() * 0.5;
				targetPos.z = i * 1.5 - 3.5 + Math.random() * 0.5;

				visualDie.targetPosition = targetPos;
				visualDie.settling = true;

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
		return gameState.players[gameState.currentPlayerIndex].id === this.onlineManager.getSocketId();
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
		const collectionPoint = new THREE.Vector3(-5, 0, 14);

		this.dice.forEach((die) => {
			die.collecting = true;
			die.targetPosition = collectionPoint.clone();
			// Add some randomness to avoid perfect stacking
			die.targetPosition.x += (Math.random() - 0.5) * 1;
			die.targetPosition.z += (Math.random() - 0.5) * 1;
		});
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

	private setDiceRotationForValue(die: VisualDie): void {
		// Añadir múltiplos de 2π para dar vueltas completas (n >= 1)
		const extraRotationsX = getExtraRotations(2);
		const extraRotationsY = getExtraRotations(2);
		const extraRotationsZ = getExtraRotations(2);

		// Rotación aleatoria para el eje vertical
		const randomVerticalRotation = Math.random() * Math.PI * 2;

		// Set target rotation to show the correct face
		switch (die.targetValue) {
			case 1:
				die.targetRotationX = -Math.PI / 2 + extraRotationsX;
				die.targetRotationY = 0 + extraRotationsY;
				die.targetRotationZ = randomVerticalRotation + extraRotationsZ;
				break;
			case 2:
				die.targetRotationX = Math.PI + extraRotationsX;
				die.targetRotationY = randomVerticalRotation + extraRotationsY;
				die.targetRotationZ = 0 + extraRotationsZ;
				break;
			case 3:
				die.targetRotationX = 0 + extraRotationsX;
				die.targetRotationY = randomVerticalRotation + extraRotationsY;
				die.targetRotationZ = Math.PI / 2 + extraRotationsZ;
				break;
			case 4:
				die.targetRotationX = 0 + extraRotationsX;
				die.targetRotationY = randomVerticalRotation + extraRotationsY;
				die.targetRotationZ = -Math.PI / 2 + extraRotationsZ;
				break;
			case 5:
				die.targetRotationX = 0 + extraRotationsX;
				die.targetRotationY = randomVerticalRotation + extraRotationsY;
				die.targetRotationZ = 0 + extraRotationsZ;
				break;
			case 6:
				die.targetRotationX = Math.PI / 2 + extraRotationsX;
				die.targetRotationY = 0 + extraRotationsY;
				die.targetRotationZ = randomVerticalRotation + extraRotationsZ;
				break;
		}
	}

	private drawDie(die: VisualDie) {
		const { selected, locked } = die;

		// Update 3D dice rotation
		this.dice3D.setRotation(die.diceIndex, die.rotationX, die.rotationY, die.rotationZ);

		// Update 3D visual state
		this.dice3D.setDiceState(die.diceIndex, selected, locked);
	}

	public setTestDiceRotation(xDegrees: number, yDegrees: number, zDegrees: number): void {
		if (this.dice.length > 0) {
			const testDie = this.dice[0];
			testDie.rotationX = (xDegrees * Math.PI) / 180;
			testDie.rotationY = (yDegrees * Math.PI) / 180;
			testDie.rotationZ = (zDegrees * Math.PI) / 180;
			this.draw();
		}
	}
}

function getExtraRotations(max: number): number {
	return Math.PI * 2 * (Math.floor(Math.random() * max) + 1);
}
