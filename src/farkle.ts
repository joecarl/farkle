import { Dice3D } from './dice3D';
import * as THREE from 'three';
import { FarkleLogic } from './logic';
import type { DieState } from './types';

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
}

export class FarkleGame {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private dice: VisualDie[] = [];
	private isRolling = false;
	private rollBtn!: HTMLButtonElement;
	private bankBtn!: HTMLButtonElement;
	private newGameBtn!: HTMLButtonElement;
	private farkleOverlay!: HTMLDivElement;

	private newGameModal!: HTMLDivElement;
	private newGamePlayerNameInput!: HTMLInputElement;
	private addPlayerToGameBtn!: HTMLButtonElement;
	private startGameBtn!: HTMLButtonElement;
	private cancelNewGameBtn!: HTMLButtonElement;
	private newGamePlayersList!: HTMLUListElement;

	private nextTurnOverlay!: HTMLDivElement;
	private nextPlayerName!: HTMLHeadingElement;

	private tempNewGamePlayers: string[] = [];

	private readonly DIE_SIZE = 60;
	private readonly DIE_PADDING = 20;

	private canvas3D!: HTMLCanvasElement;
	private dice3D!: Dice3D;
	private logic: FarkleLogic;

	private isDragging = false;
	private draggedDieIndex = -1;
	private dragOffset = new THREE.Vector3();
	private lastTime: number = 0;
	private previousTurnScore: number = 0;
	private isBanking: boolean = false;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d')!;
		this.logic = new FarkleLogic();
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
		this.farkleOverlay = document.querySelector('#farkleOverlay')!;

		this.newGameModal = document.querySelector('#newGameModal')!;
		this.newGamePlayerNameInput = document.querySelector('#newGamePlayerName')!;
		this.addPlayerToGameBtn = document.querySelector('#addPlayerToGameBtn')!;
		this.startGameBtn = document.querySelector('#startGameBtn')!;
		this.cancelNewGameBtn = document.querySelector('#cancelNewGameBtn')!;
		this.newGamePlayersList = document.querySelector('#newGamePlayersList')!;

		this.nextTurnOverlay = document.querySelector('#nextTurnOverlay')!;
		this.nextPlayerName = document.querySelector('#nextPlayerName')!;

		this.rollBtn.addEventListener('click', () => this.rollDice());
		this.bankBtn.addEventListener('click', () => this.bankPoints());
		this.newGameBtn.addEventListener('click', () => this.showNewGameModal());

		this.addPlayerToGameBtn.addEventListener('click', () => this.addPlayerToNewGame());
		this.startGameBtn.addEventListener('click', () => this.startNewGame());
		this.cancelNewGameBtn.addEventListener('click', () => this.hideNewGameModal());

		this.newGamePlayerNameInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				this.addPlayerToNewGame();
			} else if (e.key === 'Escape') {
				this.hideNewGameModal();
			}
		});
	}

	private showNewGameModal() {
		this.tempNewGamePlayers = [];
		this.updateNewGamePlayersList();
		this.newGamePlayerNameInput.value = '';
		this.newGameModal.classList.remove('hidden');
		this.newGamePlayerNameInput.focus();
		this.startGameBtn.disabled = true;
	}

	private hideNewGameModal() {
		this.newGameModal.classList.add('hidden');
	}

	private hideNextTurnOverlay() {
		this.nextTurnOverlay.classList.add('hidden');
	}

	private addPlayerToNewGame() {
		const name = this.newGamePlayerNameInput.value.trim();
		if (name) {
			this.tempNewGamePlayers.push(name);
			this.newGamePlayerNameInput.value = '';
			this.updateNewGamePlayersList();
			this.newGamePlayerNameInput.focus();
		}
	}

	private updateNewGamePlayersList() {
		this.newGamePlayersList.innerHTML = this.tempNewGamePlayers
			.map((name) => `<li style="padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.1);">${name}</li>`)
			.join('');

		this.startGameBtn.disabled = this.tempNewGamePlayers.length < 2;
	}

	private startNewGame() {
		if (this.tempNewGamePlayers.length >= 2) {
			this.logic.resetGame(this.tempNewGamePlayers);
			this.hideNewGameModal();
			this.endTurn();
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

	private rollDice() {
		if (this.isRolling) return;

		// Logic handles the rules of what to roll
		const rolledIndices = this.logic.rollDice();

		if (rolledIndices.length === 0) return;

		this.isRolling = true;
		this.rollBtn.disabled = true;
		this.bankBtn.disabled = true;

		// Sync state (locks might have changed), but don't update score yet (keep "at risk" score visible)
		this.syncDiceState(false);

		// Get dice that should be rolled
		const diceToRoll = this.dice.filter((_, i) => rolledIndices.includes(i));

		// Reposition rolling dice randomly
		this.repositionDice(diceToRoll);

		// Start rolling animation with 3D effect
		diceToRoll.forEach((die) => {
			die.rolling = true;
			die.rollTime = 0;
			// Target value is already set in logic, but we need to grab it
			// Wait, logic.rollDice() set the values.
			// We need to read them from logic.
			die.targetValue = die.value; // Value was updated in syncDiceState?
			// Yes, syncDiceState updated visualDie.value to the NEW value.
			// But for animation we want to show random values until the end.

			// Set start position (off-screen, bottom-right approx)
			die.startPosition = new THREE.Vector3(10 + Math.random() * 4, 5 + Math.random() * 2, 10 + Math.random() * 4);
			this.dice3D.setPosition(die.diceIndex, die.startPosition);

			// Set target rotations based on target value
			this.setDiceRotationForValue(die);
		});
	}

	private repositionDice(diceToRoll: VisualDie[]) {
		const lockedDice = this.dice.filter((d) => d.selected || d.locked);
		const occupiedPositions: THREE.Vector3[] = [];

		// Get positions of locked dice
		lockedDice.forEach((d) => {
			const pos = this.dice3D.getPosition(d.diceIndex);
			if (pos) occupiedPositions.push(pos);
		});

		const radius = 3.5; // Radio de dispersión
		const minDistance = 2.0; // Distancia mínima (doble del grosor 1.0)

		diceToRoll.forEach((die) => {
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

		this.dice.forEach((die) => {
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
			}
		});

		if (needsUpdate || this.isDragging) {
			this.draw();
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
			this.rollBtn.disabled = !gameState.canRoll;
			this.updateScoreDisplay();
			this.draw();
		}
	}

	private async handleFarkleSequence() {
		// 1. Wait 1 second after dice stop
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// 2. Show Overlay
		if (this.farkleOverlay) {
			this.farkleOverlay.classList.remove('hidden');
		}

		// 3. Wait 2 seconds (overlay duration)
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// 4. Hide Overlay
		if (this.farkleOverlay) {
			this.farkleOverlay.classList.add('hidden');
		}
		this.draw();

		// 5. Animate loss
		await this.animateFarkleLoss();

		// 6. Logic update
		this.logic.bankPoints(); // Score 0, switch turn, reset dice
		this.endTurn();
	}

	private animateFarkleLoss(): Promise<void> {
		return new Promise((resolve) => {
			const topBarTurnScore = document.querySelector('#topBarTurnScore');
			if (!topBarTurnScore) {
				resolve();
				return;
			}

			// Add red color class
			topBarTurnScore.classList.add('score-transfer-source');

			let currentScore = parseInt(topBarTurnScore.textContent || '0');
			const step = Math.max(10, Math.floor(currentScore / 20));

			const interval = setInterval(() => {
				currentScore -= step;
				if (currentScore <= 0) {
					currentScore = 0;
					clearInterval(interval);
					topBarTurnScore.classList.remove('score-transfer-source');
					resolve();
				}
				topBarTurnScore.textContent = currentScore.toString();
			}, 30);
		});
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
		if (this.isRolling || this.isBanking) return;

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
					}
				}
			}
		}

		this.isDragging = false;
		this.draggedDieIndex = -1;
		// draw() is called by animate loop
	}

	private bankPoints() {
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
		if (this.bankBtn) this.bankBtn.disabled = true;
		if (this.rollBtn) this.rollBtn.disabled = true;

		const topBarTurnScore = document.querySelector('#topBarTurnScore');
		const topBarTotalScore = document.querySelector('#topBarTotalScore');

		if (topBarTurnScore) topBarTurnScore.classList.add('score-transfer-source');
		if (topBarTotalScore) topBarTotalScore.classList.add('score-transfer-target');

		let currentTurnDisplay = startTurnScore;
		let currentTotalDisplay = startTotalScore;

		const step = Math.max(5, Math.floor(startTurnScore / 15)); // Adjust speed

		const interval = setInterval(() => {
			currentTurnDisplay -= step;
			currentTotalDisplay += step;

			if (currentTurnDisplay <= 0) {
				currentTurnDisplay = 0;
				currentTotalDisplay = startTotalScore + startTurnScore;
				clearInterval(interval);

				if (topBarTurnScore) topBarTurnScore.classList.remove('score-transfer-source');
				if (topBarTotalScore) topBarTotalScore.classList.remove('score-transfer-target');

				this.isBanking = false;
				this.logic.bankPoints();
				this.endTurn();
				return;
			}

			if (topBarTurnScore) topBarTurnScore.textContent = currentTurnDisplay.toString();
			if (topBarTotalScore) topBarTotalScore.textContent = currentTotalDisplay.toString();
		}, 50);
	}

	private endTurn() {
		this.syncDiceState(false);

		// Calculate previous player index (since logic has already switched)
		const gameState = this.logic.getGameState();
		const numPlayers = gameState.players.length;
		const previousPlayerIndex = (gameState.currentPlayerIndex - 1 + numPlayers) % numPlayers;

		this.updateScoreDisplay(previousPlayerIndex);
		this.draw();

		// Wait 1s then collect dice
		setTimeout(() => {
			this.collectDice();

			// Wait another 1s then show overlay
			setTimeout(() => {
				const currentPlayer = gameState.players[gameState.currentPlayerIndex];
				this.nextPlayerName.textContent = currentPlayer.name;
				this.nextTurnOverlay.classList.remove('hidden');

				// Hide automatically after 2 seconds
				setTimeout(() => {
					this.hideNextTurnOverlay();
					this.updateScoreDisplay(); // Update to new player
				}, 2000);
			}, 1000);
		}, 1000);
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
		const topBarPlayerName = document.querySelector('#topBarPlayerName');
		if (topBarPlayerName) topBarPlayerName.textContent = currentPlayer.name;

		const topBarTotalScore = document.querySelector('#topBarTotalScore');
		if (topBarTotalScore) topBarTotalScore.textContent = currentPlayer.score.toString();

		const topBarTurnScore = document.querySelector('#topBarTurnScore');
		if (topBarTurnScore) {
			if (gameState.turnScore > this.previousTurnScore) {
				topBarTurnScore.classList.remove('score-pop');
				void (topBarTurnScore as HTMLElement).offsetWidth; // Trigger reflow
				topBarTurnScore.classList.add('score-pop');
			}
			topBarTurnScore.textContent = gameState.turnScore.toString();
		}
		this.previousTurnScore = gameState.turnScore;

		const playersList = document.querySelector('#playersList')!;
		playersList.innerHTML = gameState.players
			.map((p, i) => `<li style="${i === activeIndex ? 'font-weight: bold; color: #4CAF50;' : ''}">${p.name}: ${p.score}</li>`)
			.join('');

		if (this.bankBtn) {
			this.bankBtn.disabled = !gameState.canBank;
		}

		if (this.rollBtn && !this.isRolling) {
			this.rollBtn.disabled = !gameState.canRoll;
		}
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
