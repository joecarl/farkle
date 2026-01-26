import { component } from 'chispa';
import tpl from './online-room-setup.html';

export interface OnlineRoomSetupProps {
	onBack: () => void;
	onCreateRoom: () => void;
	onJoinRoom: () => void;
}

export const OnlineRoomSetup = component<OnlineRoomSetupProps>(({ onBack, onCreateRoom, onJoinRoom }) => {
	return tpl.fragment({
		backBtn: { onclick: onBack },
		createBtn: { onclick: onCreateRoom },
		joinBtn: { onclick: onJoinRoom },
	});
});
