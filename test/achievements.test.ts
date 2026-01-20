// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AchievementManager } from '../src/achievements';
import { OnlineManager } from '../src/online-manager';
import { FarkleLogic } from '../src/logic';
import { GameState, DieState } from '../src/types';

// Mocks
const mockOnlineManager = {
	getUserId: vi.fn(),
	isInGame: true,
	unlockAchievement: vi.fn(),
} as unknown as OnlineManager;

const mockFarkleLogic = {
	getGameState: vi.fn(),
	getWinner: vi.fn(),
} as unknown as FarkleLogic;

describe('AchievementManager', () => {
	let achievementManager: AchievementManager;
	const userId = 'user-123';
	const opponentId = 'user-456';

	beforeEach(() => {
		vi.resetAllMocks();
		// Setup default behaviors
		(mockOnlineManager.getUserId as any).mockReturnValue(userId);
		mockOnlineManager.isInGame = true;

		// Reset DOM if needed (AchievementManager creates a container)
		document.body.innerHTML = '';

		achievementManager = new AchievementManager(mockOnlineManager, mockFarkleLogic);
	});

	describe('Player Identity Checks', () => {
		it('should NOT unlock achievement if validation action is performed by opponent', () => {
			// Setup game state where it's opponent's turn
			const gameState: Partial<GameState> = {
				players: [
					{ id: opponentId, name: 'Opponent', score: 0 },
					{ id: userId, name: 'Me', score: 0 },
				] as any,
				currentPlayerIndex: 0, // Opponent's turn
				dice: [],
				turnScore: 3000, // Enough for BIG_ROLL (2000)
				isFarkle: false,
				lostScore: 0,
				accumulatedTurnScore: 0,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(gameState);

			// Attempt to trigger BIG_ROLL
			achievementManager.checkAchievements('beforeRoll', {});

			expect(mockOnlineManager.unlockAchievement).not.toHaveBeenCalled();
		});

		it('should unlock achievement if action is performed by current user', () => {
			// Setup game state where it's my turn
			const gameState: Partial<GameState> = {
				players: [
					{ id: opponentId, name: 'Opponent', score: 0 },
					{ id: userId, name: 'Me', score: 0 },
				] as any,
				currentPlayerIndex: 1, // My turn
				dice: [],
				turnScore: 2500, // Enough for BIG_ROLL
				isFarkle: false,
				lostScore: 0,
				accumulatedTurnScore: 0,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(gameState);

			// Attempt to trigger BIG_ROLL
			achievementManager.checkAchievements('beforeRoll', {});

			expect(mockOnlineManager.unlockAchievement).toHaveBeenCalledWith('BIG_ROLL');
		});

		it('should NOT unlock achievement if active player ID is undefined (should fail safe)', () => {
			// Setup game state where it's opponent's turn BUT IDs are missing (simulating issue)
			const gameState: Partial<GameState> = {
				players: [
					{ name: 'Opponent', score: 0 }, // No ID
					{ name: 'Me', score: 0 }, // No ID
				] as any,
				currentPlayerIndex: 0, // Opponent's turn
				dice: [],
				turnScore: 3000, // Enough for BIG_ROLL
				isFarkle: false,
				lostScore: 0,
				accumulatedTurnScore: 0,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(gameState);

			// Attempt to trigger BIG_ROLL
			achievementManager.checkAchievements('beforeRoll', {});

			expect(mockOnlineManager.unlockAchievement).not.toHaveBeenCalled();
		});
	});

	describe('Survivor Achievement (SURVIVOR_1)', () => {
		it('should NOT unlock Survivor if rolling 1 die results in a Farkle (e.g. rolling a 4)', () => {
			const gameState: Partial<GameState> = {
				players: [
					{ id: userId, name: 'Me', score: 0 },
					{ id: opponentId, name: 'Opponent', score: 0 },
				] as any,
				currentPlayerIndex: 0,
				dice: [],
				turnScore: 0,
				isFarkle: true,
				lostScore: 0,
				accumulatedTurnScore: 0,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(gameState);
			// Mock calculateScore to return 0 for a die with value 4
			(mockFarkleLogic.calculateScore as any) = vi.fn().mockReturnValue({ score: 0, usedDice: [], description: '' });

			// Simulate rolling 1 die and getting a 4 (non-scoring)
			achievementManager.checkAchievements('roll', { diceCount: 1, targetValues: [4] });

			expect(mockOnlineManager.unlockAchievement).not.toHaveBeenCalledWith('SURVIVOR_1');
		});

		it('should unlock Survivor if rolling 1 die results in points (e.g. rolling a 5)', () => {
			const gameState: Partial<GameState> = {
				players: [
					{ id: userId, name: 'Me', score: 0 },
					{ id: opponentId, name: 'Opponent', score: 0 },
				] as any,
				currentPlayerIndex: 0,
				dice: [],
				turnScore: 50,
				isFarkle: false,
				lostScore: 0,
				accumulatedTurnScore: 0,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(gameState);
			// Mock calculateScore to return 50 for a die with value 5
			(mockFarkleLogic.calculateScore as any) = vi.fn().mockReturnValue({ score: 50, usedDice: [5], description: '1 Cinco(s)' });

			// Simulate rolling 1 die and getting a 5 (scoring)
			achievementManager.checkAchievements('roll', { diceCount: 1, targetValues: [5] });

			expect(mockOnlineManager.unlockAchievement).toHaveBeenCalledWith('SURVIVOR_1');
		});

		it('should also work with rolling a 1 (100 points)', () => {
			const gameState: Partial<GameState> = {
				players: [
					{ id: userId, name: 'Me', score: 0 },
					{ id: opponentId, name: 'Opponent', score: 0 },
				] as any,
				currentPlayerIndex: 0,
				dice: [],
				turnScore: 100,
				isFarkle: false,
				lostScore: 0,
				accumulatedTurnScore: 0,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(gameState);
			(mockFarkleLogic.calculateScore as any) = vi.fn().mockReturnValue({ score: 100, usedDice: [1], description: '1 Uno(s)' });

			achievementManager.checkAchievements('roll', { diceCount: 1, targetValues: [1] });

			expect(mockOnlineManager.unlockAchievement).toHaveBeenCalledWith('SURVIVOR_1');
		});
	});

	describe('State Tracking Achievements', () => {
		beforeEach(() => {
			// Reset achievement manager for state tracking tests
			achievementManager = new AchievementManager(mockOnlineManager, mockFarkleLogic);
		});

		it('CURSED_DICE: should unlock after 4 consecutive farkles', () => {
			const gameState: Partial<GameState> = {
				players: [
					{ id: userId, name: 'Me', score: 0 },
					{ id: opponentId, name: 'Opponent', score: 0 },
				] as any,
				currentPlayerIndex: 0,
				dice: [],
				turnScore: 0,
				isFarkle: true,
				lostScore: 100,
				accumulatedTurnScore: 0,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(gameState);

			// First 3 farkles shouldn't unlock
			achievementManager.checkAchievements('farkle');
			achievementManager.checkAchievements('farkle');
			achievementManager.checkAchievements('farkle');
			expect(mockOnlineManager.unlockAchievement).not.toHaveBeenCalledWith('CURSED_DICE');

			// 4th farkle should unlock
			achievementManager.checkAchievements('farkle');
			expect(mockOnlineManager.unlockAchievement).toHaveBeenCalledWith('CURSED_DICE');
		});

		it('CURSED_DICE: should reset counter on bank', () => {
			const farkleState: Partial<GameState> = {
				players: [{ id: userId, name: 'Me', score: 0 }] as any,
				currentPlayerIndex: 0,
				dice: [],
				turnScore: 0,
				isFarkle: true,
				lostScore: 100,
				accumulatedTurnScore: 0,
				scoreGoal: 10000,
			};

			const bankState: Partial<GameState> = {
				players: [{ id: userId, name: 'Me', score: 100 }] as any,
				currentPlayerIndex: 0,
				dice: [],
				turnScore: 100,
				isFarkle: false,
				lostScore: 0,
				accumulatedTurnScore: 100,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(farkleState);

			// 3 farkles
			achievementManager.checkAchievements('farkle');
			achievementManager.checkAchievements('farkle');
			achievementManager.checkAchievements('farkle');

			// Bank (should reset counter)
			(mockFarkleLogic.getGameState as any).mockReturnValue(bankState);
			achievementManager.checkAchievements('bank');

			// Another farkle shouldn't unlock (only 1 after reset)
			(mockFarkleLogic.getGameState as any).mockReturnValue(farkleState);
			achievementManager.checkAchievements('farkle');

			expect(mockOnlineManager.unlockAchievement).not.toHaveBeenCalledWith('CURSED_DICE');
		});

		it('PERFECT_AIM: should unlock when using all dice multiple times (hot dice x2+)', () => {
			const gameState: Partial<GameState> = {
				players: [{ id: userId, name: 'Me', score: 0 }] as any,
				currentPlayerIndex: 0,
				dice: Array(6)
					.fill(null)
					.map(() => ({ value: 1, locked: true, selected: false })),
				turnScore: 2000,
				isFarkle: false,
				lostScore: 0,
				accumulatedTurnScore: 2000,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(gameState);

			// First roll with 6 dice
			achievementManager.checkAchievements('roll', { diceCount: 6, targetValues: [1, 1, 1, 1, 1, 1] });

			// Second roll with 6 dice (hot dice)
			achievementManager.checkAchievements('roll', { diceCount: 6, targetValues: [2, 2, 2, 3, 3, 3] });

			// Bank with all dice locked/selected
			achievementManager.checkAchievements('bank');

			expect(mockOnlineManager.unlockAchievement).toHaveBeenCalledWith('PERFECT_AIM');
		});
	});

	describe('Edge Cases & Race Conditions', () => {
		it('should not crash if targetValues is missing', () => {
			const gameState: Partial<GameState> = {
				players: [{ id: userId, name: 'Me', score: 0 }] as any,
				currentPlayerIndex: 0,
				dice: [],
				turnScore: 0,
				isFarkle: false,
				lostScore: 0,
				accumulatedTurnScore: 0,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(gameState);

			expect(() => {
				achievementManager.checkAchievements('roll', { diceCount: 1 });
			}).not.toThrow();
		});

		it('should handle gameOver when winner is null gracefully', () => {
			const gameState: Partial<GameState> = {
				players: [{ id: userId, name: 'Me', score: 0 }] as any,
				currentPlayerIndex: 0,
				dice: [],
				turnScore: 0,
				isFarkle: false,
				lostScore: 0,
				accumulatedTurnScore: 0,
				scoreGoal: 10000,
			};

			(mockFarkleLogic.getGameState as any).mockReturnValue(gameState);
			(mockFarkleLogic.getWinner as any).mockReturnValue(null);

			expect(() => {
				achievementManager.checkAchievements('gameOver');
			}).not.toThrow();

			expect(mockOnlineManager.unlockAchievement).not.toHaveBeenCalled();
		});
	});
});
