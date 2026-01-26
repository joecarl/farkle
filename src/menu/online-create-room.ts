import { bindControlledInput, component, signal } from 'chispa';
import tpl from './online-create-room.html';
import { ScoreControl } from './score-control';
import { OnlineManager } from '../online-manager';
import { DEFAULT_SCORE_GOAL } from '../logic';

const FARKLE_USERNAME = 'farkle.username';

export interface OnlineCreateRoomProps {
	onBack: () => void;
}

export const OnlineCreateRoom = component<OnlineCreateRoomProps>(({ onBack }) => {
	const username = signal(localStorage.getItem(FARKLE_USERNAME) || '');
	const scoreGoal = signal(DEFAULT_SCORE_GOAL);
	const onlineManager = OnlineManager.getInstance();

	let nameInputEl: HTMLInputElement | null = null;

	const createRoom = () => {
		const name = username.get().trim();
		if (name) {
			localStorage.setItem(FARKLE_USERNAME, name);
			onlineManager.createRoom(name, scoreGoal.get());
		} else {
			nameInputEl?.focus();
		}
	};

	return tpl.fragment({
		backBtn: { onclick: onBack },
		nameInput: {
			_ref: (el) => {
				nameInputEl = el;
				bindControlledInput(el, username);
			},
		},
		scoreControl: { inner: ScoreControl({ value: scoreGoal }) },
		createBtn: { onclick: createRoom },
	});
});
