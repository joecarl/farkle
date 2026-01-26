import { component, type WritableSignal, computed } from 'chispa';
import tpl from './score-control.html';

export interface ScoreControlProps {
	value: WritableSignal<number>;
}

export const ScoreControl = component<ScoreControlProps>(({ value }) => {
	const update = (delta: number) => {
		let v = value.get() + delta;
		if (v < 1000) v = 1000;
		value.set(v);
	};

	return tpl.fragment({
		minus1000: { onclick: () => update(-1000) },
		minus500: { onclick: () => update(-500) },
		display: { inner: computed(() => value.get().toString()) },
		plus500: { onclick: () => update(500) },
		plus1000: { onclick: () => update(1000) },
	});
});
