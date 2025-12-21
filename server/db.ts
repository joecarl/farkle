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
`);

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
