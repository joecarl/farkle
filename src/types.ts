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
	personality?: BotPersonality;
}

export interface BotPersonality {
	intelligence: number; // 0-1 (making better decisions)
	riskTaking: number; // 0-1 (rolling more frequently with fewer dice)
	madness: number; // 0-1 (randomizing choices)
}

export interface GameState {
	players: Player[];
	scoreGoal: number;
	currentPlayerIndex: number;
	turnScore: number;
	isFarkle: boolean;
	lostScore: number;
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
