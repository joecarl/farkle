import db from '../db';

type Acc = { wins: number; losses: number; totalGames: number; totalScore: number };

const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-n');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
	console.log('Uso: npm run recompute-stats -- [--dry-run]');
	process.exit(0);
}

console.log(dryRun ? 'Recalculando estadísticas (dry-run): no se modificarán datos.' : 'Recalculando estadísticas de usuarios a partir de la tabla `games`...');

// Resetear columnas para evitar residuos (solo si no es dry-run)
if (!dryRun) {
	db.exec('UPDATE users SET wins = 0, losses = 0, total_games = 0, total_score = 0');
} else {
	console.log('Modo dry-run: no se resetearán columnas ni se escribirán cambios en la BD.');
}

const games = db.prepare('SELECT id, winner_id, winner_name, players_json FROM games WHERE end_time IS NOT NULL AND players_json IS NOT NULL').all() as any[];

const accum = new Map<string, Acc>();

for (const g of games) {
	try {
		const players = JSON.parse(g.players_json) as any[];
		if (!Array.isArray(players) || players.length === 0) continue;

		const scores = players.map((p) => (p && typeof p.score === 'number' ? p.score : 0));
		const minScore = Math.min(...scores);
		const multiplePlayers = players.length > 1;

		let winnerId = g.winner_id;
		if (!winnerId && g.winner_name) {
			const winner = players.find((p) => p && (p.id === g.winner_name || p.name === g.winner_name || p.displayName === g.winner_name));
			if (winner && winner.id) winnerId = winner.id;
		}

		for (const p of players) {
			if (!p || !p.id) continue;
			const id = p.id;
			const score = typeof p.score === 'number' ? p.score : 0;

			if (!accum.has(id)) accum.set(id, { wins: 0, losses: 0, totalGames: 0, totalScore: 0 });
			const entry = accum.get(id)!;
			entry.totalGames += 1;
			entry.totalScore += score;
			if (id === winnerId) entry.wins += 1;
			const isLast = multiplePlayers && score === minScore;
			if (isLast && id !== winnerId) entry.losses += 1;
		}
	} catch (e) {
		console.error(`Error procesando partida ${g.id}:`, e);
	}
}

// Aplicar actualizaciones sólo a usuarios existentes (no insertar nuevos)
const userExistsStmt = db.prepare('SELECT id FROM users WHERE id = ?');
const getUserStmt = db.prepare('SELECT wins, losses, total_games, total_score FROM users WHERE id = ?');
const updateStmt = db.prepare('UPDATE users SET wins = ?, losses = ?, total_games = ?, total_score = ? WHERE id = ?');

let updated = 0;
let missing = 0;
const toUpdate: Array<[string, Acc]> = [];
for (const [id, v] of accum.entries()) {
	const existing = userExistsStmt.get(id);
	if (!existing) {
		console.warn(`Usuario no encontrado: ${id} — se omite actualización.`);
		missing++;
		continue;
	}
	if (dryRun) {
		const current = getUserStmt.get(id) as any;
		console.log(
			`[DRY] ${id}: wins ${current?.wins ?? 'N/A'} -> ${v.wins}, losses ${current?.losses ?? 'N/A'} -> ${v.losses}, total_games ${current?.total_games ?? 'N/A'} -> ${v.totalGames}, total_score ${current?.total_score ?? 'N/A'} -> ${v.totalScore}`
		);
		continue;
	}
	toUpdate.push([id, v]);
}

if (!dryRun) {
	const tx = db.transaction((items: Array<[string, Acc]>) => {
		for (const [id, v] of items) {
			updateStmt.run(v.wins, v.losses, v.totalGames, v.totalScore, id);
		}
	});
	if (toUpdate.length > 0) tx(toUpdate);
	updated = toUpdate.length;
	console.log(`Hecho. Usuarios actualizados: ${updated}. Usuarios faltantes omitidos: ${missing}.`);
} else {
	console.log(`Dry-run completado. Usuarios que serían actualizados: ${accum.size - missing}. Usuarios faltantes: ${missing}.`);
}

process.exit(0);
