import { FarkleLogic } from './logic';
import type { BotPersonality } from './types';

export class BotLogic {
	private logic: FarkleLogic;

	constructor(logic: FarkleLogic) {
		this.logic = logic;
	}

	/**
	 * Decides which dice to select from the current roll.
	 */
	public decideSelection(personality: BotPersonality): number[] {
		const dice = this.logic.getDice();
		const unlockedIndices = dice
			.map((d, i) => ({ ...d, index: i }))
			.filter((d) => !d.locked && !d.selected)
			.map((d) => d.index);
		const unlockedValues = unlockedIndices.map((i) => dice[i].value);

		// Use logic to find best scoring combination
		const result = this.logic.calculateScore(unlockedValues);
		if (result.score === 0) return [];

		let selectedIndices: number[] = [];
		const valuesToSelect = [...result.usedDice];
		const tempIndices = [...unlockedIndices];

		for (const val of valuesToSelect) {
			const idx = tempIndices.findIndex((i) => dice[i].value === val);
			if (idx !== -1) {
				selectedIndices.push(tempIndices[idx]);
				tempIndices.splice(idx, 1);
			}
		}

		// Apply madness: might skip some dice or even select non-scoring ones (though non-scoring isn't allowed by rules to roll again effectively)
		if (personality.madness > 0.3 && Math.random() < personality.madness * 0.5) {
			// Randomly remove some selected dice (but keep at least one if possible)
			if (selectedIndices.length > 1) {
				const skipCount = Math.floor(Math.random() * (selectedIndices.length - 1));
				for (let i = 0; i < skipCount; i++) {
					selectedIndices.splice(Math.floor(Math.random() * selectedIndices.length), 1);
				}
			}
		}

		// Re-verify that the selection is valid for logic (it should be if we just removed some)
		// But if madness is VERY high, it might try to select nothing (which is a Farkle if it doesn't change)

		return selectedIndices;
	}

	/**
	 * Decides whether to roll again or bank.
	 */
	public shouldRollAgain(personality: BotPersonality): boolean {
		const gameState = this.logic.getGameState();
		if (!gameState.canRoll) return false;

		const currentPlayer = gameState.players[gameState.currentPlayerIndex];
		const turnScore = gameState.turnScore;
		const totalPotentialScore = currentPlayer.score + turnScore;

		// Always bank if it wins the game
		if (totalPotentialScore >= gameState.scoreGoal) {
			return false;
		}

		// Hot dice: all dice are locked or selected
		const allDiceUsed = gameState.dice.every((d) => d.locked || d.selected);
		if (allDiceUsed) {
			// Even with hot dice, a very cowardly bot might bank if they have a huge score?
			// In Farkle, hot dice is usually a "must roll" because you don't lose anything extra by rolling all 6.
			// Actually, you DO lose the turn score if you Farkle on the next roll.
			// But the probability of Farkling with 6 dice is very low (~2.3%).
			if (personality.intelligence > 0.8 && turnScore > 2000 && personality.riskTaking < 0.3) {
				return false;
			}
			return true;
		}

		const diceRemaining = gameState.dice.filter((d) => !d.locked && !d.selected).length;
		const riskTaking = personality.riskTaking;
		const intelligence = personality.intelligence;
		const madness = personality.madness;

		// Base probability of rolling again based on dice count
		let rollProbability = 0;
		if (diceRemaining >= 4) rollProbability = 0.95;
		else if (diceRemaining === 3) rollProbability = 0.7;
		else if (diceRemaining === 2) rollProbability = 0.4;
		else if (diceRemaining === 1) rollProbability = 0.15;

		// Adjust by risk taking (up to +40% or -40%)
		rollProbability += (riskTaking - 0.5) * 0.8;

		// Adjust by intelligence: smart bots bank more when they have a good score
		const safeScore = 300 + intelligence * 400 - riskTaking * 200;
		if (turnScore >= safeScore) {
			rollProbability -= (turnScore - safeScore) / 1000;
		}

		// Madness adds random noise
		rollProbability += (Math.random() - 0.5) * madness;

		// Ensure probability is within bounds
		rollProbability = Math.max(0.01, Math.min(0.99, rollProbability));

		return Math.random() < rollProbability;
	}

	/**
	 * Helper to generate a random personality
	 */
	public static getRandomPersonality(): BotPersonality {
		return {
			intelligence: Math.random(),
			riskTaking: Math.random(),
			madness: Math.random(),
		};
	}
}
