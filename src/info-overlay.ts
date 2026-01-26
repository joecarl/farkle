import { component, type WritableSignal } from 'chispa';
import infoTpl from './info-overlay.html';

export interface GameInfoOverlayProps {
	isVisible: WritableSignal<boolean>;
}
export const GameInfoOverlay = component<GameInfoOverlayProps>(({ isVisible }) => {
	return infoTpl.fragment({
		infoOverlay: {
			classes: { hidden: () => !isVisible.get() },
		},
		closeInfoBtn: {
			onclick: () => {
				isVisible.set(false);
			},
		},
	});
});
