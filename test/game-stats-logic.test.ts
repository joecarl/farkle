import { describe, it, expect } from 'vitest';
import { GameStatsLogic, GameRecord, PlayerStats } from '../src/game-stats-logic';

describe('GameStatsLogic', () => {
	describe('parsePlayers', () => {
		it('should parse valid JSON players', () => {
			const game: GameRecord = {
				players_json: JSON.stringify([{ id: 'user-1', name: 'Alice', score: 1000 }]),
			};
			const players = GameStatsLogic.parsePlayers(game);
			expect(players).toHaveLength(1);
			expect(players[0].id).toBe('user-1');
			expect(players[0].name).toBe('Alice');
		});

		it('should return empty array for missing players_json', () => {
			const game: GameRecord = {};
			expect(GameStatsLogic.parsePlayers(game)).toEqual([]);
		});

		it('should return empty array for invalid JSON', () => {
			const game: GameRecord = { players_json: '{ invalid }' };
			expect(GameStatsLogic.parsePlayers(game)).toEqual([]);
		});
	});

	describe('formatDate', () => {
		it('should use end_time if available', () => {
			const game: GameRecord = { end_time: '2023-10-27T10:00:00Z', start_time: '2023-10-27T09:00:00Z' };
			const date = GameStatsLogic.formatDate(game);
			expect(date).toBe(new Date('2023-10-27T10:00:00Z').toLocaleDateString());
		});

		it('should use start_time if end_time is missing', () => {
			const game: GameRecord = { start_time: '2023-10-27T09:00:00Z' };
			const date = GameStatsLogic.formatDate(game);
			expect(date).toBe(new Date('2023-10-27T09:00:00Z').toLocaleDateString());
		});

		it('should return default text if no date is available', () => {
			const game: GameRecord = {};
			expect(GameStatsLogic.formatDate(game)).toBe('Fecha desconocida');
		});
	});

	describe('calculateStatus', () => {
		const players: PlayerStats[] = [
			{ id: 'user-1', name: 'Alice', score: 10000 },
			{ id: 'user-2', name: 'Bob', score: 5000 },
			{ id: 'user-3', name: 'Charlie', score: 2000 },
		];

		it('should return "Victoria aplastante" when current user is winner and margin is large', () => {
			const game: GameRecord = { winner_id: 'user-1' };
			const result = GameStatsLogic.calculateStatus(game, players, 'user-1');
			expect(result.statusText).toBe('Victoria aplastante');
			expect(result.statusClass).toBe('status-win');
		});

		it('should return "Victoria" when current user is winner and margin is small', () => {
			const regularPlayers: PlayerStats[] = [
				{ id: 'user-1', name: 'Alice', score: 10000 },
				{ id: 'user-2', name: 'Bob', score: 9500 },
			];
			const game: GameRecord = { winner_id: 'user-1' };
			const result = GameStatsLogic.calculateStatus(game, regularPlayers, 'user-1');
			expect(result.statusText).toBe('Victoria');
			expect(result.statusClass).toBe('status-win');
		});

		it('should return "Derrota absoluta" when current user is last in a multi-player game', () => {
			const game: GameRecord = { winner_id: 'user-1' };
			const result = GameStatsLogic.calculateStatus(game, players, 'user-3');
			expect(result.statusText).toBe('Derrota');
			expect(result.statusClass).toBe('status-lose');
		});

		it('should return "Derrota aplastante" when current user is not winner and margin is large', () => {
			const game: GameRecord = { winner_id: 'user-1' };
			const result = GameStatsLogic.calculateStatus(game, players, 'user-2');
			expect(result.statusText).toBe('Derrota aplastante');
			expect(result.statusClass).toBe('status-lose');
		});

		it('should return ordinal position when current user is not winner and margin is small', () => {
			const closePlayers: PlayerStats[] = [
				{ id: 'user-1', name: 'Alice', score: 10000 },
				{ id: 'user-2', name: 'Bob', score: 9000 },
				{ id: 'user-3', name: 'Charlie', score: 8000 },
			];
			const game: GameRecord = { winner_id: 'user-1' };
			const result = GameStatsLogic.calculateStatus(game, closePlayers, 'user-2');
			expect(result.statusText).toBe('2º lugar');
			expect(result.statusClass).toBe('status-neutral');
		});
	});

	describe('processGameRecord', () => {
		it('should produce a complete data object', () => {
			const game: GameRecord = {
				players_json: JSON.stringify([{ id: 'user-1', name: 'Alice', score: 10000 }]),
				winner_id: 'user-1',
				score_goal: 10000,
			};
			const data = GameStatsLogic.processGameRecord(game, 'user-1');
			expect(data.statusText).toBe('Victoria');
			expect(data.players).toHaveLength(1);
			expect(data.players[0].name).toBe('Alice');
			expect(data.players[0].isSelf).toBe(true);
			expect(data.goalText).toMatch(/10.000|10,000/);
		});

		it('should handle moreCount correctly', () => {
			const players = Array.from({ length: 6 }, (_, i) => ({ id: `${i}`, name: `${i}` }));
			const game: GameRecord = {
				players_json: JSON.stringify(players),
			};
			const data = GameStatsLogic.processGameRecord(game, null);
			expect(data.players).toHaveLength(4);
			expect(data.moreCount).toBe(2);
		});
	});
});
