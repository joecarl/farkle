import { component, type Signal, computed } from 'chispa';
import tpl from './lobby-view.html';
import { OnlineManager } from '../online-manager';

export interface RoomLobbyProps {
	players: Signal<any[]>;
	onBack: () => void;
}

export const RoomLobby = component<RoomLobbyProps>(({ players, onBack }) => {
	const onlineManager = OnlineManager.getInstance();

	// Derived state
	const myId = onlineManager.getUserId();
	const isRandom = onlineManager.isRandom;
	const currentRoomId = onlineManager.currentRoomId;
	const scoreGoal = onlineManager.scoreGoal;

	// Actions
	const toggleReady = () => {
		const me = players.get().find((p: any) => p.id === myId);
		if (currentRoomId) {
			onlineManager.setReady(currentRoomId, !me?.ready);
		}
	};

	const startGame = () => {
		if (currentRoomId) {
			onlineManager.startGame(currentRoomId);
		}
	};

	const renderPlayers = computed(() => {
		const list = players.get();
		return list.map((p) =>
			tpl.playerItem({
				nodes: {
					playerName: { inner: `${p.name} ${p.id === myId ? '(Tú)' : ''}` },
					playerStatus: {
						classes: { ready: p.ready, 'not-ready': !p.ready },
						inner: () => (p.ready ? 'Listo' : 'Esperando'),
					},
				},
			})
		);
	});

	const title = isRandom ? 'Buscando oponente...' : `Sala: ${currentRoomId}`;

	return tpl.fragment({
		backBtn: { onclick: onBack },
		title: { inner: title },
		playersList: { inner: renderPlayers },
		scoreGoal: { inner: `${scoreGoal.toLocaleString()} pts` },
		waitingMsg: {
			classes: { hidden: computed(() => !isRandom) },
		},
		readyBtn: {
			classes: {
				hidden: isRandom,
				'ready-active': () => {
					const me = players.get().find((p: any) => p.id === myId);
					return me?.ready || false;
				},
			},
			inner: () => {
				const me = players.get().find((p: any) => p.id === myId);
				return me?.ready ? 'Listo ✓' : 'Marcar como Listo';
			},
			onclick: toggleReady,
		},
		startBtn: {
			classes: {
				hidden: isRandom || !onlineManager.isHost,
			},
			disabled: computed(() => {
				const list = players.get();
				const allReady = list.length >= 2 && list.every((p: any) => p.ready);
				return !allReady;
			}),
			onclick: startGame,
		},
	});
});
