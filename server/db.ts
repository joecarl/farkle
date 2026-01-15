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
		locale TEXT,
		last_ip TEXT,
		is_banned INTEGER DEFAULT 0
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

export const createGameRecord = (players: any[]) => {
	const stmt = db.prepare('INSERT INTO games (players_json) VALUES (?)');
	const info = stmt.run(JSON.stringify(players));
	return info.lastInsertRowid;
};

export const endGameRecord = (gameId: number | bigint, winnerName: string | null, players?: any[]) => {
	const stmt = db.prepare('UPDATE games SET end_time = CURRENT_TIMESTAMP, winner_name = ?, players_json = ? WHERE id = ?');
	stmt.run(winnerName, players ? JSON.stringify(players) : null, gameId);
};

export const getStats = () => {
	const games = db.prepare('SELECT * FROM games WHERE end_time IS NOT NULL ORDER BY start_time DESC LIMIT 10').all();

	let connectionCount = 0;
	try {
		if (fs.existsSync(logPath)) {
			// Simple line count. For very large logs, this should be optimized.
			const content = fs.readFileSync(logPath, 'utf-8');
			connectionCount = content.trim().split('\n').length;
		}
	} catch (error) {
		console.error('Error reading connection log:', error);
	}

	return {
		recentGames: games,
		totalConnections: connectionCount,
	};
};

export default db;
