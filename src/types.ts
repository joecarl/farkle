export interface DieState {
	value: number;
	selected: boolean;
	locked: boolean;
}

export interface ScoringResult {
	score: number;
	usedDice: number[];
	description: string;
}

export interface Player {
	name: string;
	score: number;
	isBot?: boolean;
	id?: string;
	maxTurnScore?: number;
	maxRollScore?: number;
}

export interface GameState {
	players: Player[];
	scoreGoal: number;
	currentPlayerIndex: number;
	turnScore: number;
	isFarkle: boolean;
	canBank: boolean;
	canRoll: boolean;
	dice: DieState[];
	isStartOfTurn?: boolean;
	accumulatedTurnScore?: number;
}

export interface GameConfig {
	players?: Player[];
	scoreGoal?: number;
	roomId?: string;
}

export type DicePositions = { [index: number]: { x: number; y: number; z: number } };
