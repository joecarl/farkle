import { bindControlledInput, component, signal } from 'chispa';
import tpl from './phrases-tab.html';
import { OnlineManager } from '../online-manager';

interface PhrasesTabProps {
	onClose?: () => void;
}

export const PhrasesTab = component<PhrasesTabProps>((props) => {
	const onlineManager = OnlineManager.getInstance();
	const phrases: string[] = onlineManager.currentUserProfile?.preferences?.phrases || ['', '', '', ''];
	const values = phrases.map((p) => signal(p));

	const save = () => {
		const newPhrases = values.map((p) => p.get().trim());
		onlineManager.updatePhrases(newPhrases);
		props.onClose && props.onClose();
	};

	return tpl.fragment({
		phrase1: {
			_ref: (el) => {
				bindControlledInput(el, values[0]);
			},
		},
		phrase2: {
			_ref: (el) => {
				bindControlledInput(el, values[1]);
			},
		},
		phrase3: {
			_ref: (el) => {
				bindControlledInput(el, values[2]);
			},
		},
		phrase4: {
			_ref: (el) => {
				bindControlledInput(el, values[3]);
			},
		},
		saveBtn: { onclick: save },
	});
});
