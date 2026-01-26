import { component, signal, computed, type WritableSignal } from 'chispa';
import tpl from './profile-overlay.html';
import { OnlineManager } from '../online-manager';
import { PhrasesTab } from './phrases-tab';
import { StatsTab } from './stats-tab';
import { AchievementsTab } from './achievements-tab';

export interface ProfileOverlayProps {
	isVisible: WritableSignal<boolean>;
	onOpenRpg: () => void;
}

export const ProfileOverlay = component<ProfileOverlayProps>(({ isVisible, onOpenRpg }) => {
	const onlineManager = OnlineManager.getInstance();
	const activeTab = signal('phrases');

	const isPhrasesDisabled = computed(() => onlineManager.currentRoomId !== null);

	const setTab = (tab: string) => {
		if (tab === 'phrases' && isPhrasesDisabled.get()) return;

		if (tab === 'stats') onlineManager.getStats();
		else if (tab === 'achievements') onlineManager.getAchievements();

		activeTab.set(tab);
	};

	const close = () => {
		isVisible.set(false);
	};

	const triggerRpg = () => {
		close();
		onOpenRpg();
	};

	return tpl.fragment({
		root: {
			classes: { hidden: () => !isVisible.get() },
		},
		closeBtn: { onclick: close },
		tabPhrases: {
			classes: {
				active: () => activeTab.get() === 'phrases',
				'tab-disabled': isPhrasesDisabled,
			},
			onclick: () => setTab('phrases'),
		},
		tabStats: {
			classes: { active: () => activeTab.get() === 'stats' },
			onclick: () => setTab('stats'),
		},
		tabAchievements: {
			classes: { active: () => activeTab.get() === 'achievements' },
			onclick: () => setTab('achievements'),
		},
		tabRpg: { onclick: triggerRpg },

		phrasesContent: {
			classes: { hidden: () => activeTab.get() !== 'phrases' },
			nodes: {
				phrasesComponent: { inner: PhrasesTab({ onClose: close }) },
			},
		},
		statsContent: {
			classes: { hidden: () => activeTab.get() !== 'stats' },
			nodes: {
				statsComponent: { inner: StatsTab({}) },
			},
		},
		achievementsContent: {
			classes: { hidden: () => activeTab.get() !== 'achievements' },
			nodes: {
				achievementsComponent: { inner: AchievementsTab({}) },
			},
		},
	});
});
