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
}

export interface GameState {
	players: Player[];
	currentPlayerIndex: number;
	turnScore: number;
	isFarkle: boolean;
	canBank: boolean;
	canRoll: boolean;
	dice: DieState[];
}

export interface GameConfig {
	players?: Player[];
	scoreGoal?: number;
	roomId?: string;
}

export type DicePositions = { [index: number]: { x: number; y: number; z: number } };
