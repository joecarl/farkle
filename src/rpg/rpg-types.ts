export interface RpgProfile {
	user_id: string;
	x: number;
	y: number;
	gold: number;
	inventory_json: string; // JSON array of items
	equipment_json: string; // JSON object of slots
}

export interface RpgTile {
	id: number;
	name: string;
	description: string;
	x: number;
	y: number;
	image_ref?: string;
	actions_json: string; // JSON array of strings
	is_passable: number; // 0 or 1 from DB
}

export interface RpgNpc {
	id: number;
	name: string;
	x: number;
	y: number;
	description: string;
	intro_text: string;
	level: number;
	image_ref?: string;
}

export interface RpgItem {
	id: number;
	name: string;
	description: string;
	cost: number;
	kind: string; // 'WEAPON', 'RING', 'CONSUMABLE', etc.
	weight: number;
	image_ref?: string;
	props_equip_json: string;
	props_consume_json: string;
}

export interface RpgStateResponse {
	profile: RpgProfile;
	tile: RpgTile;
	npcs: RpgNpc[];
	adjacent?: {
		n?: RpgTile;
		s?: RpgTile;
		e?: RpgTile;
		w?: RpgTile;
	};
}

export type RpgAction = 'gamble' | 'shop' | 'quest' | 'talk' | 'explore' | 'rest';
