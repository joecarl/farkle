import db from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize tables
db.exec(`
	-- 4.1 rpg_tiles
	CREATE TABLE IF NOT EXISTS rpg_tiles (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		description TEXT,
		x INTEGER,
		y INTEGER,
		image_ref TEXT, -- Format: SetID,Row,Col (e.g. "1,0,0")
		actions_json TEXT, -- JSON array of actions
		is_passable INTEGER DEFAULT 1,
		UNIQUE(x, y)
	);
	CREATE INDEX IF NOT EXISTS idx_rpg_tiles_xy ON rpg_tiles(x, y);

	-- 4.2 rpg_items
	CREATE TABLE IF NOT EXISTS rpg_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		description TEXT,
		cost INTEGER DEFAULT 0,
		kind TEXT,
		weight INTEGER DEFAULT 0,
		image_ref TEXT, -- Format: SetID,Row,Col
		props_equip_json TEXT, -- JSON array of modifiers
		props_consume_json TEXT -- JSON effects
	);

	-- 4.3 rpg_npcs
	CREATE TABLE IF NOT EXISTS rpg_npcs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		x INTEGER,
		y INTEGER,
		description TEXT,
		intro_text TEXT,
		level INTEGER DEFAULT 1,
		gold INTEGER DEFAULT 0,
		image_ref TEXT, -- Format: SetID,Row,Col
		actions_json TEXT -- JSON actions specific to NPC
	);

	-- 4.4 rpg_quests
	CREATE TABLE IF NOT EXISTS rpg_quests (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		description TEXT,
		data_json TEXT, -- JSON requirements
		reward_json TEXT -- JSON rewards
	);

	-- 4.5 rpg_inventory
	CREATE TABLE IF NOT EXISTS rpg_inventory (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		owner_id TEXT, -- Player ID or NPC ID (string to match users.id)
		owner_type TEXT CHECK(owner_type IN ('player', 'npc')),
		item_id INTEGER,
		quantity INTEGER DEFAULT 1,
		FOREIGN KEY(item_id) REFERENCES rpg_items(id)
	);

	-- 4.6 rpg_player_state
	CREATE TABLE IF NOT EXISTS rpg_player_state (
		player_id TEXT PRIMARY KEY,
		x INTEGER DEFAULT 0,
		y INTEGER DEFAULT 0,
		hp INTEGER DEFAULT 100,
		max_hp INTEGER DEFAULT 100,
		gold INTEGER DEFAULT 0,
		target_x INTEGER,
		target_y INTEGER,
		current_travel_end_time INTEGER, -- Timestamp
		stats_json TEXT DEFAULT '{"strength": 10, "agility": 10, "luck": 10}',
		equipment_kind_slots TEXT DEFAULT '["WEAPON", "BODY", "LEGS", "FEET", "HEAD"]',
		active_equipment_set INTEGER,
		FOREIGN KEY(player_id) REFERENCES users(id),
		FOREIGN KEY(active_equipment_set) REFERENCES rpg_player_equipment_set(id)
	);

	-- 4.7 rpg_player_equipment_set
	CREATE TABLE IF NOT EXISTS rpg_player_equipment_set (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		player_id TEXT,
		items TEXT, -- JSON array of item IDs
		FOREIGN KEY(player_id) REFERENCES users(id)
	);
`);

// Types based on the DB Schema
export interface RPGPlayerState {
	player_id: string;
	x: number;
	y: number;
	hp: number;
	max_hp: number;
	gold: number;
	target_x: number | null;
	target_y: number | null;
	current_travel_end_time: number | null;
	stats_json: string;
	equipment_kind_slots: string;
	active_equipment_set: number | null;
}

// RPG Helper Functions

export const getTileAt = (x: number, y: number) => {
	const tile = db.prepare('SELECT * FROM rpg_tiles WHERE x = ? AND y = ?').get(x, y) as any;
	if (tile && tile.actions_json) {
		try {
			tile.actions = JSON.parse(tile.actions_json);
		} catch (e) {
			tile.actions = [];
		}
	}
	return tile;
};

export const getNPCsAt = (x: number, y: number) => {
	const npcs = db.prepare('SELECT * FROM rpg_npcs WHERE x = ? AND y = ?').all(x, y) as any[];
	return npcs.map((npc) => {
		if (npc.actions_json) {
			try {
				npc.actions = JSON.parse(npc.actions_json);
			} catch (e) {
				npc.actions = [];
			}
		}
		return npc;
	});
};

export const getAllItems = () => {
	const items = db.prepare('SELECT * FROM rpg_items').all() as any[];
	return items.map((item) => {
		try {
			item.props_equip = JSON.parse(item.props_equip_json || '[]');
			item.props_consume = JSON.parse(item.props_consume_json || '{}');
		} catch (e) {
			item.props_equip = [];
			item.props_consume = {};
		}
		return item;
	});
};

export const getRPGProfile = (userId: string): RPGPlayerState => {
	// Try to get from correctly named table
	let profile = db.prepare('SELECT * FROM rpg_player_state WHERE player_id = ?').get(userId) as RPGPlayerState | undefined;

	if (!profile) {
		// Initialize profile if not exists
		try {
			// Basic initialization
			db.prepare(
				`
				INSERT INTO rpg_player_state (player_id, x, y, hp, max_hp, gold) 
				VALUES (?, 0, 0, 100, 100, 100)
			`
			).run(userId);
		} catch (e) {
			// Ignore if race condition
			console.error('Error creating profile', e);
		}
		profile = db.prepare('SELECT * FROM rpg_player_state WHERE player_id = ?').get(userId) as RPGPlayerState;
	}
	return profile;
};

export const updateRPGProfileLocation = (userId: string, x: number, y: number) => {
	// Ensure profile exists first
	getRPGProfile(userId);
	db.prepare('UPDATE rpg_player_state SET x = ?, y = ? WHERE player_id = ?').run(x, y, userId);
};

export const getInventory = (ownerId: string, ownerType: 'player' | 'npc' = 'player') => {
	const items = db
		.prepare(
			`
		SELECT i.*, inv.quantity 
		FROM rpg_inventory inv
		JOIN rpg_items i ON inv.item_id = i.id
		WHERE inv.owner_id = ? AND inv.owner_type = ?
	`
		)
		.all(ownerId, ownerType);
	return items;
};

// Initial Seed Data Check
const seedRPGData = () => {
	try {
		const SEEDS_DIR = path.join(__dirname, 'seeds');

		// Seed Tiles
		const tilesPath = path.join(SEEDS_DIR, 'tiles.json');
		if (fs.existsSync(tilesPath)) {
			console.log('Seeding Tiles from JSON...');
			db.prepare('DELETE FROM rpg_tiles').run();
			db.prepare("DELETE FROM sqlite_sequence WHERE name='rpg_tiles'").run();

			const tiles = JSON.parse(fs.readFileSync(tilesPath, 'utf8'));
			const insertTile = db.prepare(`
                INSERT INTO rpg_tiles (id, name, description, x, y, image_ref, actions_json, is_passable)
                VALUES (@id, @name, @description, @x, @y, @image_ref, @actions_json, @is_passable)
            `);

			const tm = db.transaction((tiles) => {
				for (const tile of tiles) {
					insertTile.run({
						...tile,
						actions_json: JSON.stringify(tile.actions_json),
						is_passable: tile.is_passable !== false ? 1 : 0,
					});
				}
			});
			tm(tiles);
			console.log(`Seeded ${tiles.length} tiles.`);
		}

		// Seed NPCs
		const npcsPath = path.join(SEEDS_DIR, 'npcs.json');
		if (fs.existsSync(npcsPath)) {
			console.log('Seeding NPCs from JSON...');
			db.prepare('DELETE FROM rpg_npcs').run();
			db.prepare("DELETE FROM sqlite_sequence WHERE name='rpg_npcs'").run();

			const npcs = JSON.parse(fs.readFileSync(npcsPath, 'utf8'));
			const insertNpc = db.prepare(`
                INSERT INTO rpg_npcs (id, name, x, y, description, intro_text, level, gold, image_ref, actions_json)
                VALUES (@id, @name, @x, @y, @description, @intro_text, @level, @gold, @image_ref, @actions_json)
            `);

			const nm = db.transaction((npcs) => {
				for (const npc of npcs) {
					insertNpc.run({
						...npc,
						actions_json: JSON.stringify(npc.actions_json),
					});
				}
			});
			nm(npcs);
			console.log(`Seeded ${npcs.length} NPCs.`);
		}

		// Seed some basic items if none exist
		const items = getAllItems();
		if (items.length === 0) {
			const insertItem = db.prepare(`
				INSERT INTO rpg_items (name, description, cost, kind, weight, image_ref, props_equip_json, props_consume_json)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`);

			insertItem.run('Poción de Salud', 'Restaura 50 HP', 50, 'CONSUMABLE', 1, '3,0,0', '[]', JSON.stringify({ type: 'HEAL', value: 50 }));
			insertItem.run('Daga Vieja', 'Una daga oxidada pero funcional', 100, 'WEAPON', 2, '3,0,1', JSON.stringify([{ type: 'ATTACK', value: 5 }]), '{}');
			insertItem.run('Botas de Cuero', 'Ligeras y cómodas', 150, 'FEET', 2, '3,0,2', JSON.stringify([{ type: 'DEFENSE', value: 2 }]), '{}');
		}
	} catch (e) {
		console.error('Failed to seed RPG data', e);
	}
};

seedRPGData();
