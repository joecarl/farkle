import { component, type Signal, computed, signal } from 'chispa';
import tpl from './rpg-view.html';
import { NpcListItem } from './npc-list-item';
import { NpcDetail } from './npc-detail';
import { TravelGrid } from './travel-grid';
import { getImageStyle } from '../rpg-ui-utils';
import type { RpgProfile, RpgTile, RpgNpc, RpgStateResponse } from '../rpg-types';

export interface RpgViewProps {
	isVisible: Signal<boolean>;
	profile: Signal<RpgProfile | null>;
	tile: Signal<RpgTile | null>;
	npcs: Signal<RpgNpc[]>;
	adjacent: Signal<RpgStateResponse['adjacent']>;
	onClose: () => void;
	onMove: (dx: number, dy: number) => void;
	onExplore: () => void;
	onGamble: (npcId: number) => void;
	onTalk: (npcId: number) => void;
}

export const RpgView = component<RpgViewProps>((props) => {
	const { isVisible, profile, tile, npcs, adjacent, onClose, onMove, onExplore, onGamble, onTalk } = props;

	// Internal state
	const selectedNpcId = signal<number | null>(null);

	const selectedNpc = computed(() => {
		const id = selectedNpcId.get();
		if (id === null) return undefined;
		return (npcs.get() || []).find((n) => n.id === id);
	});

	const tileDescription = computed(() => tile.get()?.description || 'Explora el mundo de Farkle.');

	const tileName = computed(() => {
		const t = tile.get();

		const name = t?.name || 'Tierras Salvajes';
		return `${name}`;
	});
	const tileCoordinates = computed(() => {
		const p = profile.get();

		// Format coordinates
		let coordStr = '?, ?';
		if (p) {
			const { x, y } = p;
			const ns = y === 0 ? '' : `${Math.abs(y)}${y > 0 ? 'N' : 'S'}`;
			const ew = x === 0 ? '' : `${Math.abs(x)}${x > 0 ? 'E' : 'O'}`;
			if (!ns && !ew) coordStr = '0, 0';
			else coordStr = [ns, ew].filter(Boolean).join(' ');
		}

		return `[${coordStr}]`;
	});

	const gold = computed(() => profile.get()?.gold || 0);

	const bgStyleData = computed(() => {
		const ref = tile.get()?.image_ref;
		if (!ref) return {};
		return getImageStyle(ref, 'tiles');
	});

	const renderNpcList = computed(() => {
		const list = npcs.get() || [];
		if (list.length === 0) return 'No hay nadie aquí.';
		return list.map((npc) =>
			NpcListItem({
				npc,
				isSelected: computed(() => selectedNpcId.get() === npc.id),
				onClick: () => {
					selectedNpcId.set(npc.id);
				},
			})
		);
	});

	const renderContent = computed(() => {
		const npc = selectedNpc.get();
		if (npc) {
			return NpcDetail({
				npc,
				onBack: () => {
					selectedNpcId.set(null);
				},
				onTalk: () => onTalk(npc.id),
				onGamble: () => onGamble(npc.id),
			});
		} else {
			return TravelGrid({
				adjacent: adjacent,
				currentTile: tile,
				onMove: (dx: number, dy: number) => {
					selectedNpcId.set(null);
					onMove(dx, dy);
				},
			});
		}
	});

	return tpl.fragment({
		overlayRoot: {
			classes: { hidden: computed(() => !isVisible.get()) },
			nodes: {
				closeBtn: { onclick: onClose },
				dashboard: {
					nodes: {
						locationName: { inner: tileName },
						locationCoordinates: { inner: tileCoordinates },
						locationDescription: { inner: tileDescription },
						goldAmount: { inner: gold },
						npcList: { inner: renderNpcList },
						mainContentBg: {
							style: {
								backgroundImage: computed(() => {
									const bg = bgStyleData.get().backgroundImage;
									return bg ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), ${bg}` : '';
								}),
								backgroundPosition: computed(() => bgStyleData.get().backgroundPosition || ''),
								backgroundSize: computed(() => bgStyleData.get().backgroundSize || ''),
								backgroundRepeat: computed(() => bgStyleData.get().backgroundRepeat || ''),
							},
							nodes: {
								contentView: { inner: renderContent },
							},
						},
						exploreBtn: { onclick: onExplore },
						shopBtn: { onclick: () => console.log('Shop not impl') },
					},
				},
			},
		},
	});
});
