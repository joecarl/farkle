export interface GameRecord {
	players_json?: string;
	end_time?: string;
	start_time?: string;
	winner_id?: string | null;
	winner_name?: string | null;
	score_goal?: number | string | null;
}

export interface PlayerStats {
	id: string;
	displayName?: string;
	name?: string;
	score?: number | null;
}

export interface ProcessedPlayer {
	name: string;
	score: number | null;
	isWinner: boolean;
	isSelf: boolean;
	title: string;
	classes: string[];
}

export interface ProcessedGame {
	date: string;
	goalText: string | null;
	players: ProcessedPlayer[];
	moreCount: number;
	statusText: string;
	statusClass: string;
}

export class GameStatsLogic {
	static processGameRecord(game: GameRecord, currentUserId: string | null): ProcessedGame {
		const players = this.parsePlayers(game);
		const sortedPlayers = [...players].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));

		const { statusText, statusClass } = this.calculateStatus(game, sortedPlayers, currentUserId);
		const processedPlayers = this.getProcessedPlayers(players, game, currentUserId);

		const moreCount = players.length > 4 ? players.length - 4 : 0;
		const goalText = game.score_goal ? `Meta: ${Number(game.score_goal).toLocaleString()} pts` : null;

		return {
			date: this.formatDate(game),
			goalText,
			players: processedPlayers.slice(0, 4),
			moreCount,
			statusText,
			statusClass,
		};
	}

	static parsePlayers(game: GameRecord): PlayerStats[] {
		try {
			return game.players_json ? JSON.parse(game.players_json) : [];
		} catch (e) {
			return [];
		}
	}

	static formatDate(game: GameRecord): string {
		const dateStr = game.end_time || game.start_time;
		if (!dateStr) return 'Fecha desconocida';
		return new Date(dateStr).toLocaleDateString();
	}

	static getProcessedPlayers(players: PlayerStats[], game: GameRecord, currentUserId: string | null): ProcessedPlayer[] {
		return (players || []).map((p) => {
			const isWinner = !!(game.winner_id && p.id === game.winner_id);
			const isSelf = !!(currentUserId && p.id === currentUserId);
			const name = p.displayName || p.name || 'Jugador';
			const score = p.score ?? null;

			const classes = [] as string[];
			if (isWinner) classes.push('player-winner');
			if (isSelf) {
				classes.push('player-self');
				if (isWinner) classes.push('player-self-winner');
				else classes.push('player-self-loser');
			}

			const title = `${name}${score !== null ? ` — ${Number(score).toLocaleString()} pts` : ''}`;

			return {
				name,
				score,
				isWinner,
				isSelf,
				title,
				classes,
			};
		});
	}

	static calculateStatus(game: GameRecord, sortedPlayers: PlayerStats[], currentUserId: string | null): { statusText: string; statusClass: string } {
		const leaderScore = Number(sortedPlayers[0]?.score ?? 0);
		const secondScore = Number(sortedPlayers[1]?.score ?? 0);
		const crushThreshold = Math.max(2000, Math.floor(leaderScore * 0.4));

		if (currentUserId && game.winner_id && currentUserId === game.winner_id) {
			const diff = leaderScore - secondScore;
			const isCrush = diff >= crushThreshold && sortedPlayers.length > 1;
			return {
				statusText: isCrush ? 'Victoria aplastante' : 'Victoria',
				statusClass: 'status-win',
			};
		} else if (currentUserId) {
			const pos = sortedPlayers.findIndex((p) => p.id === currentUserId);
			if (pos === -1) {
				return {
					statusText: game.winner_name ? `Ganador: ${game.winner_name}` : '-',
					statusClass: 'status-neutral',
				};
			} else if (pos === sortedPlayers.length - 1 && sortedPlayers.length > 1) {
				return {
					statusText: 'Derrota',
					statusClass: 'status-lose',
				};
			} else {
				const playerScore = Number(sortedPlayers[pos].score || 0);
				const diff = leaderScore - playerScore;
				if (diff >= crushThreshold && leaderScore > playerScore) {
					return {
						statusText: 'Derrota aplastante',
						statusClass: 'status-lose',
					};
				} else {
					return {
						statusText: `${pos + 1}º lugar`,
						statusClass: 'status-neutral',
					};
				}
			}
		} else {
			return {
				statusText: game.winner_name ? `Ganador: ${game.winner_name}` : '-',
				statusClass: 'status-neutral',
			};
		}
	}
}
