import { component } from 'chispa';
import tpl from './achievements-tab.html';
import { OnlineManager } from '../online-manager';
import { ACHIEVEMENTS } from '../achievements';

export const AchievementsTab = component(() => {
	const onlineManager = OnlineManager.getInstance();
	const unlockedList = onlineManager.state.achievements;

	const renderAchievements = () => {
		const unlocked = unlockedList.get();
		const unlockedSet = new Set(unlocked.map((u) => u.achievement_key));

		return ACHIEVEMENTS.map((ach) => {
			const isUnlocked = unlockedSet.has(ach.id);
			return tpl.achievementItem({
				classes: { 'achievement-card': true, unlocked: isUnlocked, locked: !isUnlocked },
				title: ach.description,
				nodes: {
					achIcon: { classes: { 'ach-icon': true, [ach.iconClass]: true } },
					achName: { inner: ach.name },
					achDesc: { inner: ach.secret && !isUnlocked ? '???' : ach.description },
				},
			});
		});
	};

	return tpl.fragment({
		listContainer: {
			inner: renderAchievements,
		},
	});
});
