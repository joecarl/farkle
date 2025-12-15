import type { ScoringResult, DieState, GameState, Player } from './types';

export class FarkleLogic {
	private players: Player[] = [];
	private currentPlayerIndex: number = 0;
	private accumulatedTurnScore: number = 0;
	private dice: DieState[];
	private isFarkleState: boolean = false;

	constructor() {
		this.players = [
			{ name: 'Player 1', score: 0 },
			{ name: 'Player 2', score: 0 },
		];
		this.dice = Array(6)
			.fill(null)
			.map(() => ({
				value: 1,
				selected: false,
				locked: false,
			}));
	}

	public addPlayer(name: string) {
		this.players.push({ name, score: 0 });
	}

	public getGameState(): GameState {
		const selectedDice = this.dice.filter((d) => d.selected);
		const scoring = this.calculateScore(selectedDice.map((d) => d.value));

		// Bank button always available unless Farkle
		const canBank = !this.isFarkleState;

		// Roll button logic
		// 1. Start of turn (no locked, no selected)
		const isStartOfTurn = this.dice.every((d) => !d.locked && !d.selected);

		// 2. Mid-turn: Must have valid selection to roll again
		const hasValidSelection = selectedDice.length > 0 && scoring.score > 0 && scoring.usedDice.length === selectedDice.length;

		let canRoll = false;
		if (!this.isFarkleState) {
			if (isStartOfTurn) {
				canRoll = true;
			} else if (hasValidSelection) {
				canRoll = true;
			}
		}

		return {
			players: this.players,
			currentPlayerIndex: this.currentPlayerIndex,
			turnScore: this.accumulatedTurnScore + scoring.score,
			isFarkle: this.isFarkleState,
			canBank,
			canRoll,
			dice: this.dice.map((d) => ({ ...d })), // Copy
		};
	}

	public getDice(): DieState[] {
		return this.dice;
	}

	public rollDice(): number[] {
		// Commit score from selection if any
		const selectionScore = this.calculateScore(this.getSelectedDiceValues()).score;
		if (selectionScore > 0) {
			this.accumulatedTurnScore += selectionScore;
			// Lock selected dice
			this.dice
				.filter((d) => d.selected)
				.forEach((d) => {
					d.locked = true;
					d.selected = false;
				});
		}

		// If all dice are locked (hot dice), unlock all
		if (this.dice.every((d) => d.locked)) {
			this.dice.forEach((d) => (d.locked = false));
		}

		// Roll available dice
		const rolledIndices: number[] = [];
		this.dice.forEach((d, i) => {
			if (!d.locked) {
				d.value = Math.floor(Math.random() * 6) + 1;
				rolledIndices.push(i);
			}
		});

		if (rolledIndices.length === 0) {
			return [];
		}

		// Check for Farkle
		const newRollValues = this.dice.filter((d) => !d.locked).map((d) => d.value);
		const bestScore = this.calculateBestScore(newRollValues);
		if (bestScore.score === 0) {
			// Farkle
			this.accumulatedTurnScore = 0;
			this.isFarkleState = true;
		} else {
			this.isFarkleState = false;
		}

		return rolledIndices;
	}

	public toggleSelection(index: number) {
		const die = this.dice[index];
		if (!die.locked) {
			die.selected = !die.selected;
		}
	}

	public calculateScore(values: number[]): ScoringResult {
		return this.calculateBestScore(values);
	}

	private getSelectedDiceValues(): number[] {
		return this.dice.filter((d) => d.selected).map((d) => d.value);
	}

	private calculateBestScore(values: number[]): ScoringResult {
		if (values.length === 0) {
			return { score: 0, usedDice: [], description: '' };
		}

		const counts = [0, 0, 0, 0, 0, 0, 0]; // index 0 unused, 1-6 for die values
		values.forEach((v) => counts[v]++);

		let score = 0;
		const usedDice: number[] = [];
		const descriptions: string[] = [];

		// Check for three pairs
		const pairs = counts.filter((c) => c === 2).length;
		if (pairs === 3 && values.length === 6) {
			return { score: 1500, usedDice: [...values], description: 'Tres pares' };
		}

		// Check for straight (1-2-3-4-5-6)
		if (values.length === 6 && counts.slice(1).every((c) => c === 1)) {
			return { score: 1500, usedDice: [...values], description: 'Escalera' };
		}

		// Check for three of a kind (or more)
		for (let i = 1; i <= 6; i++) {
			if (counts[i] >= 3) {
				const threeScore = i === 1 ? 1000 : i * 100;
				const extraDice = counts[i] - 3;
				const totalForThis = threeScore * Math.pow(2, extraDice);
				score += totalForThis;

				if (counts[i] === 3) descriptions.push(`Tres ${i}s`);
				else if (counts[i] === 4) descriptions.push(`Cuatro ${i}s`);
				else if (counts[i] === 5) descriptions.push(`Cinco ${i}s`);
				else if (counts[i] === 6) descriptions.push(`Seis ${i}s`);

				for (let k = 0; k < counts[i]; k++) usedDice.push(i);

				counts[i] = 0; // Used these dice
			}
		}

		// Count remaining 1s and 5s
		score += counts[1] * 100;
		if (counts[1] > 0) {
			descriptions.push(`${counts[1]} Uno(s)`);
			for (let k = 0; k < counts[1]; k++) usedDice.push(1);
		}

		score += counts[5] * 50;
		if (counts[5] > 0) {
			descriptions.push(`${counts[5]} Cinco(s)`);
			for (let k = 0; k < counts[5]; k++) usedDice.push(5);
		}

		return {
			score,
			usedDice,
			description: descriptions.join(', '),
		};
	}

	public bankPoints() {
		const selectionScore = this.calculateScore(this.getSelectedDiceValues()).score;
		this.players[this.currentPlayerIndex].score += this.accumulatedTurnScore + selectionScore;
		this.accumulatedTurnScore = 0;
		this.resetDice();
		this.nextTurn();
	}

	private nextTurn() {
		this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
		this.isFarkleState = false;
	}

	public resetDice() {
		this.dice.forEach((d) => {
			d.selected = false;
			d.locked = false;
		});
	}

	public resetGame(newPlayerNames?: string[]) {
		if (newPlayerNames && newPlayerNames.length > 0) {
			this.players = newPlayerNames.map((name) => ({ name, score: 0 }));
		} else {
			this.players.forEach((p) => (p.score = 0));
		}
		this.currentPlayerIndex = 0;
		this.accumulatedTurnScore = 0;
		this.isFarkleState = false;
		this.resetDice();
	}

	public getTotalScore(): number {
		return this.players[this.currentPlayerIndex].score;
	}

	public getTurnScore(): number {
		return this.accumulatedTurnScore;
	}

	public resetTurnScore() {
		this.accumulatedTurnScore = 0;
	}
}
