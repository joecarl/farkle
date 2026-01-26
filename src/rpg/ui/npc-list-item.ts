import { component, type Signal, computed } from 'chispa';
import tpl from './npc-list-item.html';
import type { RpgNpc } from '../rpg-types';
import { getImageStyle } from '../rpg-ui-utils';

interface Props {
	npc: RpgNpc;
	isSelected: boolean | Signal<boolean> | (() => boolean);
	onClick: () => void;
}

export const NpcListItem = component<Props>(({ npc, isSelected, onClick }) => {
	const avatarStyle = computed(() => getImageStyle(npc.image_ref, 'npcs'));

	return tpl.fragment({
		container: {
			classes: { selected: isSelected },
			onclick: onClick,
			dataset: { npcId: npc.id.toString() },
		},
		avatar: {
			style: {
				backgroundImage: computed(() => avatarStyle.get().backgroundImage || ''),
				backgroundPosition: computed(() => avatarStyle.get().backgroundPosition || ''),
				backgroundSize: computed(() => avatarStyle.get().backgroundSize || ''),
				backgroundRepeat: computed(() => avatarStyle.get().backgroundRepeat || ''),
			},
		},
		name: { inner: npc.name },
	});
});
