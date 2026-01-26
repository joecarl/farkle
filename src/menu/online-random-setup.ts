import { bindControlledInput, component, signal } from 'chispa';
import tpl from './online-random-setup.html';
import { OnlineManager } from '../online-manager';

const FARKLE_USERNAME = 'farkle.username';

export interface OnlineRandomSetupProps {
	onBack: () => void;
}

export const OnlineRandomSetup = component<OnlineRandomSetupProps>(({ onBack }) => {
	const username = signal(localStorage.getItem(FARKLE_USERNAME) || '');
	const onlineManager = OnlineManager.getInstance();

	let nameInputEl: HTMLInputElement | null = null;

	const searchMatch = () => {
		const name = username.get().trim();
		if (!name) {
			nameInputEl?.focus();
			return;
		}
		localStorage.setItem(FARKLE_USERNAME, name);
		onlineManager.findMatch(name);
	};

	return tpl.fragment({
		backBtn: { onclick: onBack },
		nameInput: {
			_ref: (el) => {
				nameInputEl = el;
				bindControlledInput(el, username);
			},
		},
		searchBtn: { onclick: searchMatch },
	});
});
