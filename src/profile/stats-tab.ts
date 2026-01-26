import { component } from 'chispa';
import tpl from './stats-tab.html';
import { OnlineManager } from '../online-manager';
import { GameStatsLogic } from '../game-stats-logic';

function toClasses(arr: string[]): any {
	const classes: any = {};
	for (const c of arr) {
		classes[c] = true;
	}
	return classes;
}

export const StatsTab = component(() => {
	const onlineManager = OnlineManager.getInstance();
	const stats = onlineManager.state.stats;

	const renderRecentGames = () => {
		const s = stats.get();
		if (!s || !s.recentGames) return [];

		const curId = onlineManager.getUserId();

		return s.recentGames.map((g: any) => {
			const data = GameStatsLogic.processGameRecord(g, curId);

			const playersNodes = data.players.map((p: any) => {
				return tpl.playerChip({
					classes: toClasses(p.classes),
					title: p.title,
					nodes: {
						playerWinnerIcon: { inner: p.isWinner ? '🏆 ' : '' },
						playerName: { inner: p.name },
						playerScore: { inner: p.score !== null ? p.score.toLocaleString() : '' },
					},
				});
			});

			if (data.moreCount > 0) {
				playersNodes.push(
					tpl.morePlayersChip({
						inner: `+${data.moreCount}`,
					})
				);
			}

			return tpl.recentGameItem({
				nodes: {
					gameDate: { inner: data.date },
					gameGoal: { inner: data.goalText || '', classes: { hidden: !data.goalText } },
					gamePlayers: { inner: playersNodes },
					gameStatus: { inner: data.statusText, classes: { [data.statusClass]: true } },
				},
			});
		});
	};

	return tpl.fragment({
		statWins: { inner: () => stats.get()?.wins ?? '-' },
		statLosses: { inner: () => stats.get()?.losses ?? '-' },
		statTotalGames: { inner: () => stats.get()?.totalGames ?? '-' },
		statMaxScore: { inner: () => stats.get()?.maxScore?.toLocaleString() ?? '-' },
		statMaxTurn: { inner: () => stats.get()?.maxTurnScore?.toLocaleString() ?? '-' },
		statMaxRoll: { inner: () => stats.get()?.maxRollScore?.toLocaleString() ?? '-' },
		statTotalScore: { inner: () => stats.get()?.totalScore?.toLocaleString() ?? '-' },
		noGamesMsg: {
			classes: { hidden: () => (stats.get()?.recentGames?.length || 0) > 0 },
		},
		listContainer: {
			inner: renderRecentGames,
		},
	});
});
