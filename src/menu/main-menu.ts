import { component, signal, computed, type Signal } from 'chispa';
import tpl from './main-menu.html';
import { MenuHome } from './home-view';
import { LocalSetup } from './local-setup';
import { OnlineRandomSetup } from './online-random-setup';
import { OnlineRoomSetup } from './online-room-setup';
import { RoomLobby } from './lobby-view';
import { OnlineCreateRoom } from './online-create-room';
import { OnlineJoinRoom } from './online-join-room';
import { OnlineManager } from '../online-manager';
import type { GameConfig, Player } from '../types';
import type { OverlayManager } from '../overlay-manager';

export type MenuState = 'home' | 'local' | 'online-random' | 'online-room' | 'lobby' | 'create-room' | 'join-room';

export interface MainMenuProps {
	isVisible: Signal<boolean>;
	onClose: () => void;
	onStartGame: (config: GameConfig) => void;
	overlayManager: OverlayManager;
}

export const MainMenu = component<MainMenuProps>(({ isVisible, onClose, onStartGame, overlayManager }) => {
	const currentView = signal<MenuState>('home');
	const onlineManager = OnlineManager.getInstance();

	// Lobby state
	const lobbyPlayers = signal<any[]>([]);

	onlineManager.onRoomCreated = (data) => {
		lobbyPlayers.set(data.players);
		currentView.set('lobby');
	};

	onlineManager.onPlayerJoined = (data) => {
		if (onlineManager.currentRoomId) {
			lobbyPlayers.set(data.players);
			if (currentView.get() !== 'lobby') {
				currentView.set('lobby');
			}
		}
	};

	onlineManager.onPlayerUpdate = (data) => {
		if (onlineManager.currentRoomId) {
			lobbyPlayers.set(data.players);
		}
	};

	onlineManager.onGameStarted = (data) => {
		onClose();
		const players: Player[] = data.players.map((p: any) => ({
			name: p.name,
			score: 0,
			isBot: false,
			id: p.id,
			maxTurnScore: 0,
			maxRollScore: 0,
		}));
		onStartGame({ players, roomId: onlineManager.currentRoomId!, scoreGoal: data.scoreGoal });
	};

	onlineManager.onError = (data) => {
		overlayManager.alert('Error', data.message);
	};

	// Reset view when opening
	const visibleComputed = computed(() => {
		const vis = isVisible.get();
		if (vis && currentView.get() === 'lobby' && !onlineManager.currentRoomId) {
			currentView.set('home');
		}
		return vis;
	});

	const handleClose = () => {
		if (!onlineManager.isInGame && onlineManager.currentRoomId) {
			onlineManager.leaveRoom();
		}
		onClose();
	};

	const renderView = computed(() => {
		switch (currentView.get()) {
			case 'home':
				return MenuHome({
					onLocal: () => currentView.set('local'),
					onRandom: () => currentView.set('online-random'),
					onRoom: () => currentView.set('online-room'),
				});
			case 'local':
				return LocalSetup({
					onBack: () => currentView.set('home'),
					onStart: (config) => {
						onStartGame(config);
						onClose();
					},
				});
			case 'online-random':
				return OnlineRandomSetup({
					onBack: () => currentView.set('home'),
				});
			case 'online-room':
				return OnlineRoomSetup({
					onBack: () => currentView.set('home'),
					onCreateRoom: () => currentView.set('create-room'),
					onJoinRoom: () => currentView.set('join-room'),
				});
			case 'lobby':
				return RoomLobby({
					players: lobbyPlayers,
					onBack: () => {
						onlineManager.leaveRoom();
						currentView.set('home');
					},
				});
			case 'create-room':
				return OnlineCreateRoom({
					onBack: () => currentView.set('online-room'),
				});
			case 'join-room':
				return OnlineJoinRoom({
					onBack: () => currentView.set('online-room'),
				});
		}
		return null;
	});

	return tpl.fragment({
		overlayRoot: {
			classes: { hidden: () => !visibleComputed.get() },
		},
		closeBtn: { onclick: handleClose },
		currentView: { inner: renderView },
	});
});
