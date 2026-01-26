import { component, signal, computed, bindControlledInput } from 'chispa';
import tpl from './online-join-room.html';
import { OnlineManager } from '../online-manager';

const FARKLE_USERNAME = 'farkle.username';

export interface OnlineJoinRoomProps {
	onBack: () => void;
}

export const OnlineJoinRoom = component<OnlineJoinRoomProps>(({ onBack }) => {
	const username = signal(localStorage.getItem(FARKLE_USERNAME) || '');
	const roomCode = signal('');
	const availableRooms = signal<any[]>([]);
	const onlineManager = OnlineManager.getInstance();

	// Setup listener for rooms
	onlineManager.onRoomsUpdated = (rooms) => {
		availableRooms.set(rooms);
	};

	// Initial fetch
	onlineManager.fetchRooms();

	let nameInputEl: HTMLInputElement | null = null;
	let codeInputEl: HTMLInputElement | null = null;

	const joinRoom = () => {
		const name = username.get().trim();
		const code = roomCode.get().trim();
		if (!name) {
			nameInputEl?.focus();
			return;
		}
		if (!code) {
			codeInputEl?.focus();
			return;
		}

		localStorage.setItem(FARKLE_USERNAME, name);
		onlineManager.joinRoom(code, name);
	};

	const renderRooms = computed(() => {
		const rooms = availableRooms.get();

		return rooms.map((r) =>
			tpl.roomItem({
				nodes: {
					roomId: { inner: r.id },
					roomHost: { inner: r.hostName },
					roomPlayers: { inner: r.players },
					roomScore: { inner: `${r.scoreGoal} pts` },
				},
				dataset: { roomId: r.id },
				onclick: () => {
					const name = username.get().trim();
					roomCode.set(r.id);
					if (name) {
						localStorage.setItem(FARKLE_USERNAME, name);
						onlineManager.joinRoom(r.id, name);
					} else {
						nameInputEl?.focus();
					}
				},
			})
		);
	});

	return tpl.fragment({
		backBtn: { onclick: onBack },
		nameInput: {
			_ref: (el) => {
				nameInputEl = el;
				bindControlledInput(el, username);
			},
		},
		codeInput: {
			_ref: (el) => {
				codeInputEl = el;
				bindControlledInput(el, roomCode);
			},
		},
		refreshBtn: { onclick: () => onlineManager.fetchRooms() },
		noRoomsMsg: {
			classes: { hidden: () => (availableRooms.get() || []).length > 0 },
		},
		roomsList: { inner: renderRooms },
		joinBtn: { onclick: joinRoom },
	});
});
