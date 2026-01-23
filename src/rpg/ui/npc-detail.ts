import { component } from 'chispa';
import tpl from './npc-detail.html';
import type { RpgNpc } from '../rpg-types';
import { getImageStyle } from '../rpg-ui-utils';

interface Props {
	npc: RpgNpc;
	onBack: () => void;
	onTalk: () => void;
	onGamble: () => void;
}

export const NpcDetail = component<Props>(({ npc, onBack, onTalk, onGamble }) => {
	const avatarStyle = getImageStyle(npc.image_ref, 'npcs');

	return tpl.fragment({
		backBtn: { onclick: onBack },
		avatar: {
			style: {
				width: '100px',
				height: '100px',
				backgroundImage: avatarStyle.backgroundImage || '',
				backgroundPosition: avatarStyle.backgroundPosition || '',
				backgroundSize: avatarStyle.backgroundSize || '',
				backgroundRepeat: avatarStyle.backgroundRepeat || '',
			},
		},
		name: { inner: npc.name },
		level: { inner: `Nivel ${npc.level}` },
		desc: { inner: `"${npc.description}"` },
		talkBtn: { onclick: onTalk },
		gambleBtn: { onclick: onGamble },
	});
});
