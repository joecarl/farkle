import { component } from 'chispa';
import tpl from './home-view.html';
import { mobileDelayedClick } from '../utils';

export interface MenuHomeProps {
	onLocal: () => void;
	onRandom: () => void;
	onRoom: () => void;
}

export const MenuHome = component<MenuHomeProps>(({ onLocal, onRandom, onRoom }) => {
	return tpl.fragment({
		localBtn: {
			_ref: (el) => {
				mobileDelayedClick(el, onLocal);
			},
		},
		randomBtn: {
			_ref: (el) => {
				mobileDelayedClick(el, onRandom);
			},
		},
		roomBtn: {
			_ref: (el) => {
				mobileDelayedClick(el, onRoom);
			},
		},
	});
});
