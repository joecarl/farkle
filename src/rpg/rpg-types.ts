export interface RpgState {
	gold: number;
	inventory: string[];
	location: string;
	log: string[];
	stats: {
		farkleWins: number;
		farkleLosses: number;
		battlesWon: number;
	};
}

export type RpgAction = 'explore' | 'travel' | 'shop' | 'gamble' | 'rest';

export interface Npc {
	id: string;
	name: string;
	description: string;
	canGamble: boolean;
	image?: string;
}

export interface Location {
	id: string;
	name: string;
	description: string;
	actions: RpgAction[];
	connections: string[]; // ids of connected locations
	npcs?: Npc[];
	image?: string; // CSS class or asset path
}

export interface Item {
	id: string;
	name: string;
	cost: number;
	description: string;
}
