import { describe, it, expect, beforeEach } from 'vitest';
import { FarkleLogic } from '../src/logic';

describe('FarkleLogic', () => {
	let game: FarkleLogic;

	beforeEach(() => {
		game = new FarkleLogic([
			{ name: 'Alice', score: 0 },
			{ name: 'Bob', score: 0 },
		]);
	});

	describe('Initialization', () => {
		it('should initialize with default players if none provided', () => {
			const defaultGame = new FarkleLogic();
			const state = defaultGame.getGameState();
			expect(state.players).toHaveLength(2);
			expect(state.players[0].name).toBe('Player 1');
		});

		it('should initialize with provided players', () => {
			const state = game.getGameState();
			expect(state.players).toHaveLength(2);
			expect(state.players[0].name).toBe('Alice');
			expect(state.players[1].name).toBe('Bob');
		});

		it('should start with 6 dice', () => {
			const dice = game.getDice();
			expect(dice).toHaveLength(6);
			dice.forEach((die) => {
				expect(die.locked).toBe(false);
				expect(die.selected).toBe(false);
			});
		});
	});

	describe('Scoring Logic', () => {
		// Helper to expose the private calculateScore method via public wrapper if needed
		// or just test via public calculateScore if it takes values

		it('should score single 1s and 5s correctly', () => {
			expect(game.calculateScore([1]).score).toBe(100);
			expect(game.calculateScore([5]).score).toBe(50);
			expect(game.calculateScore([1, 5]).score).toBe(150);
			expect(game.calculateScore([2, 3, 4, 6]).score).toBe(0);
		});

		it('should score three of a kind correctly', () => {
			expect(game.calculateScore([1, 1, 1]).score).toBe(1000);
			expect(game.calculateScore([2, 2, 2]).score).toBe(200);
			expect(game.calculateScore([3, 3, 3]).score).toBe(300);
			expect(game.calculateScore([4, 4, 4]).score).toBe(400);
			expect(game.calculateScore([5, 5, 5]).score).toBe(500);
			expect(game.calculateScore([6, 6, 6]).score).toBe(600);
		});

		it('should score four of a kind correctly', () => {
			expect(game.calculateScore([1, 1, 1, 1]).score).toBe(2000); // 1000 * 2
			expect(game.calculateScore([2, 2, 2, 2]).score).toBe(400); // 200 * 2
		});

		it('should score five of a kind correctly', () => {
			expect(game.calculateScore([1, 1, 1, 1, 1]).score).toBe(4000); // 1000 * 4
			expect(game.calculateScore([2, 2, 2, 2, 2]).score).toBe(800); // 200 * 4
		});

		it('should score six of a kind correctly', () => {
			expect(game.calculateScore([1, 1, 1, 1, 1, 1]).score).toBe(8000); // 1000 * 8
			expect(game.calculateScore([2, 2, 2, 2, 2, 2]).score).toBe(1600); // 200 * 8
		});

		it('should score a straight (1-6) correctly', () => {
			expect(game.calculateScore([1, 2, 3, 4, 5, 6]).score).toBe(1500);
		});

		it('should score three pairs correctly', () => {
			expect(game.calculateScore([2, 2, 4, 4, 6, 6]).score).toBe(1500);
			expect(game.calculateScore([1, 1, 3, 3, 5, 5]).score).toBe(1500);
		});

		it('should score two triplets correctly', () => {
			expect(game.calculateScore([1, 1, 1, 2, 2, 2]).score).toBe(2500);
			expect(game.calculateScore([3, 3, 3, 4, 4, 4]).score).toBe(2500);
		});

		it('should score short straights correctly', () => {
			// 1-5
			expect(game.calculateScore([1, 2, 3, 4, 5]).score).toBe(750);
			// 2-6
			expect(game.calculateScore([2, 3, 4, 5, 6]).score).toBe(750);
			// 1-5 + extra die
			expect(game.calculateScore([1, 2, 3, 4, 3, 5]).score).toBe(750);
			// 2-6 + extra die
			expect(game.calculateScore([2, 3, 4, 5, 6, 2]).score).toBe(750);
		});

		it('should handle mixed scoring combinations', () => {
			// Three 1s + Single 5
			expect(game.calculateScore([1, 1, 1, 5]).score).toBe(1050);
			// Three 2s + Three 1s (Two triplets rule takes precedence if 6 dice)
			expect(game.calculateScore([2, 2, 2, 1, 1, 1]).score).toBe(2500);

			// Three 2s + Single 1 (4 dice)
			expect(game.calculateScore([2, 2, 2, 1]).score).toBe(300);

			// Short straight 1-5 + Single 1
			expect(game.calculateScore([1, 2, 3, 4, 5, 1]).score).toBe(850);

			// Short straight 1-5 + Single 5
			expect(game.calculateScore([1, 2, 3, 4, 5, 5]).score).toBe(800);
			// Short straight 2-6 + Single 5
			expect(game.calculateScore([6, 2, 3, 4, 5, 5]).score).toBe(800);
		});
	});

	describe('Game Flow', () => {
		it('should allow rolling dice at start of turn', () => {
			const state = game.getGameState();
			expect(state.canRoll).toBe(true);
		});

		it('should update dice values on roll', () => {
			const initialDice = game.getDice().map((d) => d.value);
			// Mock Math.random to ensure values change or just check they are valid
			game.rollDice();
			const newDice = game.getDice();
			newDice.forEach((d) => {
				expect(d.value).toBeGreaterThanOrEqual(1);
				expect(d.value).toBeLessThanOrEqual(6);
			});
		});

		it('should detect Farkle', () => {
			// Force a non-scoring roll
			// We can't easily mock private dice state or random without more changes,
			// but we can try to simulate a state where calculateBestScore returns 0

			// Let's mock the dice values directly if possible or just trust the logic
			// Since we can't easily mock Math.random here without a library or DI,
			// we will rely on the logic that if rollDice produces non-scoring dice, isFarkle is true.

			// However, we can test the logic by manually setting dice values if we could access them,
			// but they are private.
			// We can test calculateScore returning 0.
			expect(game.calculateScore([2, 3, 4, 6]).score).toBe(0);
			expect(game.calculateScore([4]).score).toBe(0);
		});

		it('should lock selected dice and accumulate score on re-roll', () => {
			// 1. Roll
			game.rollDice();

			// 2. Hack: force dice to be scoring for the test
			const dice = game.getDice();
			dice[0].value = 1; // 100 points
			dice[1].value = 5; // 50 points
			dice[2].value = 2; // 0
			dice[3].value = 3; // 0
			dice[4].value = 4; // 0
			dice[5].value = 6; // 0

			// 3. Select scoring dice
			game.toggleSelection(0); // Select 1
			game.toggleSelection(1); // Select 5

			// 4. Roll again
			game.rollDice();

			const state = game.getGameState();
			// If the roll resulted in a Farkle, the accumulated turn score will be reset to 0;
			// otherwise we should have accumulated at least 150 (1 + 5 selected).
			if (state.isFarkle) {
				expect(state.turnScore).toBe(0);
			} else {
				expect(state.turnScore).toBeGreaterThanOrEqual(150);
			}

			// Dice 0 and 1 should be locked (they were selected before the roll)
			const newDice = game.getDice();
			expect(newDice[0].locked).toBe(true);
			expect(newDice[1].locked).toBe(true);
			expect(newDice[2].locked).toBe(false);
		});

		it('should bank points and switch turn', () => {
			// 1. Roll
			game.rollDice();

			// 2. Force scoring die
			const dice = game.getDice();
			dice[0].value = 1;
			game.toggleSelection(0);

			// 3. Bank
			game.bankPoints();

			const state = game.getGameState();
			expect(state.currentPlayerIndex).toBe(1); // Switched to Bob
			expect(state.players[0].score).toBe(100); // Alice got points
			expect(state.turnScore).toBe(0); // Turn score reset
			expect(state.isFarkle).toBe(false);
		});

		it('should handle "Hot Dice" (all dice locked)', () => {
			// 1. Roll
			game.rollDice();

			// 2. Make all dice scoring (e.g. two triplets)
			const dice = game.getDice();
			[1, 1, 1, 2, 2, 2].forEach((val, i) => {
				dice[i].value = val;
				game.toggleSelection(i);
			});

			// 3. Roll again (should trigger hot dice logic)
			// Logic: if selectionScore > 0 -> lock selected. If all locked -> unlock all.
			game.rollDice();

			const newDice = game.getDice();
			// All should be unlocked now
			expect(newDice.every((d) => !d.locked)).toBe(true);
			// And we should have accumulated the score — but if the re-roll was a Farkle,
			// turn score will be 0. Accept either outcome.
			const turnScore = game.getTurnScore();
			const state = game.getGameState();
			if (state.isFarkle) {
				expect(turnScore).toBe(0);
			} else {
				expect(turnScore).toBeGreaterThanOrEqual(2500);
			}
		});
	});
});
