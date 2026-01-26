import { component, signal, computed, bindControlledInput } from 'chispa';
import tpl from './local-setup.html';
import { ScoreControl } from './score-control';
import { DEFAULT_SCORE_GOAL } from '../logic';
import type { GameConfig, Player, BotPersonality } from '../types';
import { generateNameFromSyllables } from '../utils';
import { BotLogic } from '../bot-logic';

export interface LocalSetupProps {
	onBack: () => void;
	onStart: (config: GameConfig) => void;
	onStartGame?: any; // To match interface if needed, but onStart handles it.
}

const FARKLE_SUGGESTED_NAMES = 'farkle.suggestedNames';

export const LocalSetup = component<LocalSetupProps>(({ onBack, onStart }) => {
	const players = signal<Player[]>([]);
	const scoreGoal = signal(DEFAULT_SCORE_GOAL);
	const suggestedNames = signal<string[]>([]);
	const inputValue = signal('');

	// Load suggestions
	try {
		const stored = localStorage.getItem(FARKLE_SUGGESTED_NAMES);
		if (stored) suggestedNames.set(JSON.parse(stored));
	} catch (e) {
		console.error(e);
	}

	const saveSuggestedName = (name: string) => {
		const current = suggestedNames.get();
		if (!current.includes(name)) {
			const next = [...current, name];
			suggestedNames.set(next);
			localStorage.setItem(FARKLE_SUGGESTED_NAMES, JSON.stringify(next));
		}
	};

	const removeSuggestedName = (name: string) => {
		const next = suggestedNames.get().filter((n) => n !== name);
		suggestedNames.set(next);
		localStorage.setItem(FARKLE_SUGGESTED_NAMES, JSON.stringify(next));
	};

	const addPlayerByName = (name: string, isBot = false, personality?: BotPersonality) => {
		if (!players.get().some((p) => p.name === name)) {
			players.set([
				...players.get(),
				{
					name,
					score: 0,
					isBot,
					maxTurnScore: 0,
					maxRollScore: 0,
					personality,
				},
			]);
			if (!isBot) saveSuggestedName(name);
		}
	};

	let nameInputEl: HTMLInputElement | null = null;

	const addPlayer = () => {
		const name = inputValue.get().trim();
		if (name) {
			addPlayerByName(name);
			inputValue.set('');
		} else {
			nameInputEl?.focus();
		}
	};

	const addBot = () => {
		const usedNames = players.get().map((p) => p.name);
		let name = '';

		// Try generating
		for (let i = 0; i < 6; i++) {
			const gen = generateNameFromSyllables(2, 3);
			if (!usedNames.includes(gen)) {
				name = gen;
				break;
			}
		}

		if (!name) {
			const botCount = players.get().filter((p) => p.isBot).length;
			name = `Bot ${botCount + 1}`;
		}

		name += ' 🤖';
		addPlayerByName(name, true, BotLogic.getRandomPersonality());
	};

	const removePlayer = (name: string) => {
		players.set(players.get().filter((p) => p.name !== name));
	};

	const canStart = computed(() => players.get().length >= 2);

	const renderPlayers = computed(() => {
		const list = players.get();
		return list.map((p) =>
			tpl.playerItem({
				nodes: {
					playerName: { inner: p.name },
					deletePlayerBtn: { onclick: () => removePlayer(p.name) },
				},
			})
		);
	});

	const renderSuggestions = computed(() => {
		const pNames = players.get().map((p) => p.name);
		const avail = suggestedNames.get().filter((n) => !pNames.includes(n));

		return avail.map((name) =>
			tpl.suggestionItem({
				onclick: () => addPlayerByName(name),
				nodes: {
					suggestionName: { inner: name },
					deleteSuggestionBtn: {
						onclick: (e: Event) => {
							e.stopPropagation();
							removeSuggestedName(name);
						},
					},
				},
			})
		);
	});

	return tpl.fragment({
		backBtn: { onclick: onBack },
		noPlayersMsg: {
			classes: { hidden: () => players.get().length > 0 },
		},
		playersList: { inner: renderPlayers },
		nameInput: {
			_ref: (el) => {
				nameInputEl = el;
				bindControlledInput(el, inputValue);
			},
			onkeydown: (e: KeyboardEvent) => {
				if (e.key === 'Enter') addPlayer();
			},
		},
		addBtn: { onclick: addPlayer },
		botBtn: { onclick: addBot },
		noSuggestionsMsg: {
			classes: {
				hidden: () => {
					const pNames = players.get().map((p) => p.name);
					const avail = suggestedNames.get().filter((n) => !pNames.includes(n));
					return avail.length > 0;
				},
			},
		},
		suggestedList: { inner: renderSuggestions },
		scoreControl: { inner: ScoreControl({ value: scoreGoal }) },
		startBtn: {
			disabled: computed(() => !canStart.get()),
			onclick: () => onStart({ players: players.get(), scoreGoal: scoreGoal.get() }),
		},
	});
});
