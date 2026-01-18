import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'farkle.db');
const logPath = path.join(dataDir, 'connections.log');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
	CREATE TABLE IF NOT EXISTS games (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
		end_time DATETIME,
		winner_name TEXT,
		winner_id TEXT,
		score_goal INTEGER,
		players_json TEXT
	);
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		last_seen DATETIME,
		display_name TEXT,
		email TEXT,
		avatar_url TEXT,
		role TEXT DEFAULT 'player',
		preferences_json TEXT,
		wins INTEGER DEFAULT 0,
		losses INTEGER DEFAULT 0,
		total_score INTEGER DEFAULT 0,
		max_score INTEGER DEFAULT 0,
		max_turn_score INTEGER DEFAULT 0,
		max_roll_score INTEGER DEFAULT 0,
		locale TEXT,
		last_ip TEXT,
		is_banned INTEGER DEFAULT 0
	);
	CREATE TABLE IF NOT EXISTS achievements (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		player_id TEXT,
		achievement_key TEXT,
		unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(player_id, achievement_key)
	);
`);

// Ensure columns exist for older DBs: add missing columns safely
const columnInfo = (table: string) => db.prepare(`PRAGMA table_info(${table})`).all();
const hasColumn = (table: string, column: string) => columnInfo(table).some((c: any) => c.name === column);
const addColumnIfMissing = (table: string, columnName: string, columnCfg: string) => {
	try {
		if (!hasColumn(table, columnName)) {
			db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnName} ${columnCfg}`);
		}
	} catch (err) {
		console.error(`Failed to add column ${columnName} to ${table}:`, err);
	}
};

// Run migration additions (no-op if columns already present)
addColumnIfMissing('users', 'display_name', 'TEXT');
addColumnIfMissing('users', 'total_score', 'INTEGER DEFAULT 0');
addColumnIfMissing('users', 'max_score', 'INTEGER DEFAULT 0');
addColumnIfMissing('users', 'max_turn_score', 'INTEGER DEFAULT 0');
addColumnIfMissing('users', 'max_roll_score', 'INTEGER DEFAULT 0');
addColumnIfMissing('games', 'winner_id', 'TEXT');
addColumnIfMissing('games', 'score_goal', 'INTEGER');

// Migration: populate winner_id for existing games
try {
	const gamesToMigrate = db
		.prepare('SELECT id, winner_name, players_json FROM games WHERE end_time IS NOT NULL AND winner_id IS NULL AND winner_name IS NOT NULL')
		.all() as any[];
	for (const game of gamesToMigrate) {
		try {
			const players = JSON.parse(game.players_json);
			const winner = players.find((p: any) => p.name === game.winner_name || p.displayName === game.winner_name);
			if (winner && winner.id) {
				db.prepare('UPDATE games SET winner_id = ? WHERE id = ?').run(winner.id, game.id);
				console.log(`Migrated game ${game.id}: winner ${winner.id}`);
			}
		} catch (e) {
			console.error(`Error migrating game ${game.id}:`, e);
		}
	}
} catch (e) {
	console.error('Migration error:', e);
}

interface User {
	id: string;
	created_at: string;
	last_seen: string;
	display_name?: string;
	email?: string;
	avatar_url?: string;
	role: string;
	preferences_json?: string;
	wins: number;
	losses: number;
	total_score: number;
	max_score: number;
	max_turn_score: number;
	max_roll_score: number;
	locale?: string;
	last_ip?: string;
	is_banned: number;
}
// User helpers
export const getUser = (id: string) => {
	const stmt = db.prepare<[string], User>('SELECT * FROM users WHERE id = ?');
	return stmt.get(id);
};

export const createUser = (id: string) => {
	const stmt = db.prepare('INSERT OR IGNORE INTO users (id, last_seen) VALUES (?, CURRENT_TIMESTAMP)');
	const info = stmt.run(id);
	return info.changes > 0;
};

export const touchUser = (id: string) => {
	const stmt = db.prepare('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?');
	stmt.run(id);
};

export const updateDisplayName = (id: string, name: string) => {
	const stmt = db.prepare('UPDATE users SET display_name = ? WHERE id = ?');
	stmt.run(name, id);
};

export const updateUserPreferences = (id: string, preferences: any) => {
	const stmt = db.prepare('UPDATE users SET preferences_json = ? WHERE id = ?');
	stmt.run(JSON.stringify(preferences), id);
};

export const logConnection = (ip: string, socketId: string, event: 'connect' | 'disconnect') => {
	const timestamp = new Date().toISOString();
	const logEntry = `${timestamp} | ${ip} | ${socketId} | ${event}\n`;
	fs.appendFile(logPath, logEntry, (err) => {
		if (err) console.error('Error writing to log file:', err);
	});
};

export const createGameRecord = (players: any[], scoreGoal?: number) => {
	const stmt = db.prepare('INSERT INTO games (players_json, score_goal) VALUES (?, ?)');
	const info = stmt.run(JSON.stringify(players), scoreGoal ?? null);
	return info.lastInsertRowid;
};

export const endGameRecord = (gameId: number | bigint, winnerName: string | null, players?: any[], providedWinnerId?: string | null) => {
	let winnerId: string | null = providedWinnerId ?? null;
	if (!winnerId && players && winnerName) {
		const winner = players.find((p: any) => p.name === winnerName || p.displayName === winnerName);
		if (winner) winnerId = winner.id;
	}

	const stmt = db.prepare('UPDATE games SET end_time = CURRENT_TIMESTAMP, winner_name = ?, winner_id = ?, players_json = ? WHERE id = ?');
	stmt.run(winnerName, winnerId, players ? JSON.stringify(players) : null, gameId);

	if (players) {
		for (const p of players) {
			if (!p.id) continue;
			const isWinner = p.id === winnerId;
			const score = p.totalScore || p.score || 0;

			db.prepare(
				`
                UPDATE users 
                SET wins = wins + ?, 
                    losses = losses + ?, 
                    total_score = total_score + ?, 
                    max_score = MAX(max_score, ?),
                    max_turn_score = MAX(max_turn_score, ?),
                    max_roll_score = MAX(max_roll_score, ?)
                WHERE id = ?
            `
			).run(isWinner ? 1 : 0, isWinner ? 0 : 1, score, score, p.maxTurnScore || 0, p.maxRollScore || 0, p.id);

			// Logic for achievements
			// if (isWinner) {
			// 	unlockAchievement(p.id, 'first_win');
			// }
			// if (score >= 5000) {
			// 	unlockAchievement(p.id, 'high_scorer');
			// }
			// const user = getUser(p.id);
			// if (user && user.wins + user.losses >= 10) {
			// 	unlockAchievement(p.id, 'veteran');
			// }
			// if (score >= 10000) {
			// 	unlockAchievement(p.id, 'puntuacion_perfecta');
			// }
		}
	}
};

export const unlockAchievement = (playerId: string, achievementKey: string) => {
	const stmt = db.prepare('INSERT OR IGNORE INTO achievements (player_id, achievement_key) VALUES (?, ?)');
	return stmt.run(playerId, achievementKey).changes > 0;
};

export const getPlayerAchievements = (playerId: string) => {
	return db.prepare('SELECT * FROM achievements WHERE player_id = ?').all(playerId);
};

export const getPlayerStats = (playerId: string) => {
	const user = getUser(playerId);
	if (!user) return null;

	const games = db
		.prepare(
			`
			SELECT id, start_time, end_time, winner_id, winner_name, score_goal, players_json
			FROM games 
			WHERE end_time IS NOT NULL AND players_json LIKE ? 
			ORDER BY start_time DESC 
			LIMIT 15
		`
		)
		.all(`%"${playerId}"%`);

	return {
		wins: user.wins,
		losses: user.losses,
		totalScore: user.total_score,
		maxScore: user.max_score,
		maxTurnScore: user.max_turn_score,
		maxRollScore: user.max_roll_score,
		recentGames: games,
	};
};

export default db;
