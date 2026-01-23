import { component, type Signal, computed } from 'chispa';
import tpl from './travel-grid.html';
import type { RpgStateResponse, RpgTile } from '../rpg-types';
import { getImageStyle } from '../rpg-ui-utils';

interface Props {
	adjacent: Signal<RpgStateResponse['adjacent']>;
	currentTile: Signal<RpgTile | null>;
	onMove: (dx: number, dy: number) => void;
}

export const TravelGrid = component<Props>(({ adjacent, currentTile, onMove }) => {
	const getStyle = (dir: 'n' | 's' | 'e' | 'w') => {
		const styleSignal = computed(() => {
			const adj = adjacent?.get();
			const tile = adj?.[dir];
			// If no tile, maybe keep it empty or return placeholder?
			if (!tile || !tile.image_ref) return {};
			return getImageStyle(tile.image_ref, 'tiles');
		});

		return {
			backgroundImage: computed(() => styleSignal.get().backgroundImage || ''),
			backgroundPosition: computed(() => styleSignal.get().backgroundPosition || ''),
			backgroundSize: computed(() => styleSignal.get().backgroundSize || ''),
			backgroundRepeat: computed(() => styleSignal.get().backgroundRepeat || ''),
		};
	};

	const currentStyleSignal = computed(() => {
		const tile = currentTile.get();
		if (!tile || !tile.image_ref) return {};
		return getImageStyle(tile.image_ref, 'tiles');
	});

	const currentStyle = {
		backgroundImage: computed(() => currentStyleSignal.get().backgroundImage || ''),
		backgroundPosition: computed(() => currentStyleSignal.get().backgroundPosition || ''),
		backgroundSize: computed(() => currentStyleSignal.get().backgroundSize || ''),
		backgroundRepeat: computed(() => currentStyleSignal.get().backgroundRepeat || ''),
	};

	return tpl.fragment({
		moveN: { onclick: () => onMove(0, 1), style: getStyle('n') },
		moveS: { onclick: () => onMove(0, -1), style: getStyle('s') },
		moveE: { onclick: () => onMove(1, 0), style: getStyle('e') },
		moveW: { onclick: () => onMove(-1, 0), style: getStyle('w') },
		centerCell: { style: currentStyle },
	});
});
