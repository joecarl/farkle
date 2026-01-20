// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AchievementManager } from '../src/achievements';
import { OnlineManager } from '../src/online-manager';
import { FarkleLogic } from '../src/logic';
import { GameState } from '../src/types';

describe('Online Game Achievements Simulation', () => {
	// Simular 2 jugadores en una partida online
	let player1Manager: AchievementManager;
	let player2Manager: AchievementManager;
	let sharedLogic: FarkleLogic;

	const player1Id = 'player-1';
	const player2Id = 'player-2';

	let mockOnlineManager1: any;
	let mockOnlineManager2: any;

	beforeEach(() => {
		document.body.innerHTML = '';

		// Crear lógica compartida del juego (como si fuera sincronizada)
		sharedLogic = new FarkleLogic([
			{ name: 'Player 1', score: 0, id: player1Id },
			{ name: 'Player 2', score: 0, id: player2Id },
		]);

		// Mock para jugador 1
		mockOnlineManager1 = {
			getUserId: vi.fn().mockReturnValue(player1Id),
			isInGame: true,
			unlockAchievement: vi.fn(),
		} as unknown as OnlineManager;

		// Mock para jugador 2
		mockOnlineManager2 = {
			getUserId: vi.fn().mockReturnValue(player2Id),
			isInGame: true,
			unlockAchievement: vi.fn(),
		} as unknown as OnlineManager;

		player1Manager = new AchievementManager(mockOnlineManager1, sharedLogic);
		player2Manager = new AchievementManager(mockOnlineManager2, sharedLogic);
	});

	describe('Scenario: Player 1 rolls and gets SURVIVOR_1', () => {
		it('should ONLY unlock achievement for Player 1 (the active player), not Player 2', () => {
			// Setup: Es el turno del jugador 1 (currentPlayerIndex = 0)
			const gameState = sharedLogic.getGameState();
			expect(gameState.currentPlayerIndex).toBe(0);
			expect(gameState.players[0].id).toBe(player1Id);

			// Simular que Player 1 lanza 1 dado y obtiene un 5
			// (esto normalmente lo haría rollDice, pero lo simulamos directamente)

			// Player 1 procesa su propia acción
			player1Manager.checkAchievements('roll', {
				diceCount: 1,
				targetValues: [5],
			});

			// Player 2 también recibe la acción remota y la procesa
			// (esto pasa en onGameAction cuando llega el mensaje del servidor)
			player2Manager.checkAchievements('roll', {
				diceCount: 1,
				targetValues: [5],
			});

			// Verificar: SOLO Player 1 debe desbloquear el logro
			expect(mockOnlineManager1.unlockAchievement).toHaveBeenCalledWith('SURVIVOR_1');
			expect(mockOnlineManager2.unlockAchievement).not.toHaveBeenCalledWith('SURVIVOR_1');
		});
	});

	describe('Scenario: Player 2 rolls during their turn', () => {
		it('should ONLY unlock achievement for Player 2 when it is their turn', () => {
			// Avanzar el juego para que sea el turno de Player 2
			sharedLogic.bankPoints(); // Termina turno de Player 1

			const gameState = sharedLogic.getGameState();
			expect(gameState.currentPlayerIndex).toBe(1);
			expect(gameState.players[1].id).toBe(player2Id);

			// Player 2 lanza dados y obtiene 6 unos
			player2Manager.checkAchievements('roll', {
				diceCount: 6,
				targetValues: [1, 1, 1, 1, 1, 1],
			});

			// Player 1 también procesa la acción remota
			player1Manager.checkAchievements('roll', {
				diceCount: 6,
				targetValues: [1, 1, 1, 1, 1, 1],
			});

			// Solo Player 2 debe desbloquear SIX_ONES
			expect(mockOnlineManager2.unlockAchievement).toHaveBeenCalledWith('SIX_ONES');
			expect(mockOnlineManager1.unlockAchievement).not.toHaveBeenCalledWith('SIX_ONES');
		});
	});

	describe('Scenario: State tracking contamination', () => {
		it('should NOT contaminate state between players (hotDiceCount test)', () => {
			// Player 1 hace hot dice (usa todos los 6 dados)
			const p1State = sharedLogic.getGameState();
			expect(p1State.currentPlayerIndex).toBe(0);

			// Primera tirada de 6 dados
			player1Manager.checkAchievements('roll', {
				diceCount: 6,
				targetValues: [1, 1, 1, 2, 2, 2],
			});

			// Player 2 recibe la acción remota
			player2Manager.checkAchievements('roll', {
				diceCount: 6,
				targetValues: [1, 1, 1, 2, 2, 2],
			});

			// Segunda tirada de 6 dados (hot dice)
			player1Manager.checkAchievements('roll', {
				diceCount: 6,
				targetValues: [3, 3, 3, 4, 4, 4],
			});

			player2Manager.checkAchievements('roll', {
				diceCount: 6,
				targetValues: [3, 3, 3, 4, 4, 4],
			});

			// Player 1 hace bank con todos los dados usados
			// Mock: dice todos locked/selected
			const mockGameState = {
				...sharedLogic.getGameState(),
				dice: Array(6)
					.fill(null)
					.map(() => ({ value: 1, locked: true, selected: false })),
				turnScore: 5000,
			};

			vi.spyOn(sharedLogic, 'getGameState').mockReturnValue(mockGameState);

			player1Manager.checkAchievements('bank');
			player2Manager.checkAchievements('bank');

			// Solo Player 1 debe obtener PERFECT_AIM
			expect(mockOnlineManager1.unlockAchievement).toHaveBeenCalledWith('PERFECT_AIM');
			expect(mockOnlineManager2.unlockAchievement).not.toHaveBeenCalledWith('PERFECT_AIM');
		});
	});

	describe('Scenario: CURSED_DICE tracking across players', () => {
		it('should track consecutive farkles per player independently', () => {
			// Setup mock to return player 1 as active
			const baseState = sharedLogic.getGameState();
			const mockGameState = {
				...baseState,
				currentPlayerIndex: 0,
				lostScore: 100,
				players: [
					{ id: player1Id, name: 'Player 1', score: 0 },
					{ id: player2Id, name: 'Player 2', score: 0 },
				],
			} as any;

			vi.spyOn(sharedLogic, 'getGameState').mockReturnValue(mockGameState);

			// Player 1 tiene 4 farkles consecutivos
			for (let i = 0; i < 4; i++) {
				player1Manager.checkAchievements('farkle');
				player2Manager.checkAchievements('farkle'); // Recibe evento remoto pero no debería afectarle
			}

			// Solo Player 1 debe tener CURSED_DICE (4 farkles consecutivos)
			expect(mockOnlineManager1.unlockAchievement).toHaveBeenCalledWith('CURSED_DICE');
			expect(mockOnlineManager2.unlockAchievement).not.toHaveBeenCalledWith('CURSED_DICE');
		});
	});

	describe('Edge case: Player disconnects and reconnects', () => {
		it('should not give achievements from actions that happened while disconnected', () => {
			// Player 2 se desconecta
			mockOnlineManager2.isInGame = false;

			// Player 1 obtiene un logro mientras Player 2 está desconectado
			player1Manager.checkAchievements('roll', {
				diceCount: 1,
				targetValues: [5],
			});

			// Player 2 NO debe recibir el logro (está desconectado)
			player2Manager.checkAchievements('roll', {
				diceCount: 1,
				targetValues: [5],
			});

			expect(mockOnlineManager1.unlockAchievement).toHaveBeenCalledWith('SURVIVOR_1');
			expect(mockOnlineManager2.unlockAchievement).not.toHaveBeenCalled(); // isInGame = false
		});
	});
});
