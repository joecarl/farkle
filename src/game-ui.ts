import { component, computed, signal, type Signal } from 'chispa';
import type { Player } from './types';
import tpl from './game-ui.html';

export interface GameUiProps {
	playerName: Signal<string>;
	totalScore: Signal<string>;
	turnScore: Signal<string>;
	timer: Signal<string>;
	timerLow: Signal<boolean>;
	scoreGoal: Signal<string>;
	isFinalRound: Signal<boolean>;

	players: Signal<Player[]>;
	currentPlayerIndex: Signal<number>; // To highlight current player in list

	canRoll: Signal<boolean>;
	canBank: Signal<boolean>;

	isDebugVisible: Signal<boolean>;
	easterEggMeta: Signal<any>;
	isOnline: Signal<boolean>;
	isMusicMuted: Signal<boolean>;

	// Animation states
	scorePop: Signal<boolean>;
	scoreTransferSource: Signal<boolean>;
	scoreTransferTarget: Signal<boolean>;

	// Events
	onRoll: () => void;
	onBank: () => void;
	onNewGame: () => void;
	onProfile: () => void;
	onChat: () => void;
	onInfo: () => void;
	onDebug: () => void;
	onMusic: () => void;
	onEasterEgg: () => void;
}

export const GameUi = component<GameUiProps>((props) => {
	const {
		playerName,
		totalScore,
		turnScore,
		timer,
		timerLow,
		scoreGoal,
		isFinalRound,
		players,
		currentPlayerIndex,
		canRoll,
		canBank,
		isDebugVisible,
		easterEggMeta,
		isOnline,
		isMusicMuted,
		scorePop,
		scoreTransferSource,
		scoreTransferTarget,
		onRoll,
		onBank,
		onNewGame,
		onProfile,
		onChat,
		onInfo,
		onDebug,
		onMusic,
		onEasterEgg,
	} = props;

	const easterEggActive = signal(false);

	return tpl.fragment({
		infoBtn: { onclick: onInfo },
		debugBtn: {
			onclick: onDebug,
			classes: { hidden: () => !isDebugVisible.get() },
		},
		musicBtn: {
			onclick: onMusic,
			style: { opacity: () => (isMusicMuted.get() ? '0.5' : '1') },
		},
		topBarPlayerName: { inner: playerName },
		topBarTotalScore: {
			inner: totalScore,
			classes: { 'score-transfer-target': scoreTransferTarget },
		},
		topBarTurnScore: {
			inner: turnScore,
			classes: {
				'score-pop': scorePop,
				'score-transfer-source': scoreTransferSource,
			},
		},
		turnTimer: {
			inner: timer,
			classes: { 'timer-low': timerLow },
		},
		finalRoundIndicator: {
			classes: { hidden: () => !isFinalRound.get() },
		},
		easterEggBtn: {
			onclick: () => {
				onEasterEgg();
				easterEggActive.update((v) => !v);
			},
			classes: { hidden: () => !easterEggMeta.get(), 'easter-egg-festive': easterEggActive },
			style: { backgroundImage: () => `url(${easterEggMeta.get()?.imageUrl})` },
		},
		profileBtn: { onclick: onProfile },
		newGameBtn: { onclick: onNewGame },
		scoreGoalValue: { inner: scoreGoal },
		chatBtn: {
			onclick: onChat,
			classes: { hidden: () => !isOnline.get() },
		},
		playersList: {
			inner: computed(() => {
				const list = players.get();
				const currentIndex = currentPlayerIndex.get();
				return list.map((p, i) => {
					return tpl.playerItem({
						nodes: {
							itemName: { inner: p.name },
							itemScore: { inner: `${p.score} p` },
						},
						style: i === currentIndex ? { fontWeight: 'bold', color: 'var(--p-color-1)' } : {},
					});
				});
			}),
		},
		rollBtn: {
			onclick: onRoll,
			disabled: computed(() => !canRoll.get()),
		},
		bankBtn: {
			onclick: onBank,
			disabled: computed(() => !canBank.get()),
		},
		gameCanvas: {}, // Placeholder to ensure it's rendered
		discoLights: {}, // Placeholder
	});
});
