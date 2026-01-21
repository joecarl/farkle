import type { RpgState, Location, Item } from './rpg-types';
import type { GameConfig } from '../types';
import { OnlineManager } from '../online-manager';

const STORAGE_KEY = 'farkle_rpg_state_v1';

const INITIAL_STATE: RpgState = {
	gold: 100,
	inventory: [],
	location: 'town',
	log: ['Bienvenido, viajero. Te encuentras en el pueblo de inicio. Tu bolsa contiene 100 monedas de oro.'],
	stats: {
		farkleWins: 0,
		farkleLosses: 0,
		battlesWon: 0,
	},
};

const LOCATIONS: Record<string, Location> = {
	town: {
		id: 'town',
		name: 'Pueblo de Villadados',
		description: 'Un pueblo tranquilo donde el sonido de los dados rodando se escucha en cada esquina.',
		actions: ['shop', 'travel'],
		connections: ['tavern', 'forest'],
		image: 'bg-town',
		npcs: [
			{
				id: 'npc_mayor',
				name: 'Alcalde Poliedro',
				description: 'Un hombre serio que siempre lleva un dado de 20 caras en la mano.',
				canGamble: true,
			},
		],
	},
	tavern: {
		id: 'tavern',
		name: 'Taberna "El 1 Furioso"',
		description: 'El lugar está lleno de humo y ruido. Campesinos y viajeros apuestan sus fortunas en el Farkle.',
		actions: ['gamble', 'rest', 'travel'],
		connections: ['town'],
		image: 'bg-tavern',
		npcs: [
			{
				id: 'npc_innkeeper',
				name: 'Tabernero Bernaldo',
				description: 'Limpia un vaso con un trapo sospechosamente sucio.',
				canGamble: true,
			},
			{
				id: 'npc_drunkard',
				name: 'Borracho Suertudo',
				description: 'Apenas puede mantenerse en pie, pero sus dados parecen obedecerle.',
				canGamble: true,
			},
		],
	},
	forest: {
		id: 'forest',
		name: 'Bosque de la Suerte',
		description: 'Un bosque antiguo. Se dice que encontrar tesoros aquí es cuestión de pura probabilidad.',
		actions: ['explore', 'travel'],
		connections: ['town', 'dungeon'],
		image: 'bg-forest',
	},
	dungeon: {
		id: 'dungeon',
		name: 'Mazmorra del Full House',
		description: 'Un lugar oscuro y peligroso. Solo los más valientes (o necios) entran aquí.',
		actions: ['explore', 'travel'],
		connections: ['forest'],
		image: 'bg-dungeon',
		npcs: [
			{
				id: 'npc_skeleton',
				name: 'Esqueleto Tahúr',
				description: 'Sus dedos de hueso son sorprendentemente ágiles con los dados.',
				canGamble: true,
			},
		],
	},
};

const ITEMS: Item[] = [
	{ id: 'dice_bag', name: 'Bolsa de Dados de Terciopelo', cost: 50, description: 'Da suerte... o eso dicen.' },
	{ id: 'lucky_charm', name: 'Amuleto de la Pata de Conejo', cost: 200, description: 'Un clásico.' },
	{ id: 'map', name: 'Mapa del Tesoro', cost: 500, description: 'Abre nuevas rutas (en tu imaginación por ahora).' },
];

export class RpgManager {
	private state: RpgState;
	private onUpdate: () => void;
	private onPlayFarkle: (config: GameConfig) => void;
	private onlineManager: OnlineManager;
	private activeMatchBet: number | null = null;

	constructor(onUpdate: () => void, onPlayFarkle: (config: GameConfig) => void) {
		this.onUpdate = onUpdate;
		this.onPlayFarkle = onPlayFarkle;
		this.onlineManager = OnlineManager.getInstance();
		this.state = this.loadState();
	}

	private loadState(): RpgState {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				return { ...INITIAL_STATE, ...JSON.parse(stored) };
			} catch (e) {
				console.error('Failed to load RPG state', e);
			}
		}
		return JSON.parse(JSON.stringify(INITIAL_STATE));
	}

	private saveState() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
		this.onUpdate();
	}

	public getState(): RpgState {
		return this.state;
	}

	public getLocation(): Location {
		return LOCATIONS[this.state.location];
	}

	public getLocationById(id: string): Location | undefined {
		return LOCATIONS[id];
	}

	public getItems(): Item[] {
		return ITEMS;
	}

	public getActiveMatch() {
		return this.activeMatchBet !== null ? { bet: this.activeMatchBet } : null;
	}

	public travel(targetId: string) {
		const current = this.getLocation();
		if (current.connections.includes(targetId)) {
			this.state.location = targetId;
			this.addToLog(`Viajaste a ${LOCATIONS[targetId].name}.`);
			this.saveState();
		}
	}

	public rest() {
		if (this.state.gold >= 10) {
			this.state.gold -= 10;
			this.addToLog('Descansaste en la posada. Te sientes renovado (-10 oro).');
			this.saveState();
		} else {
			this.addToLog('No tienes suficiente oro para descansar.');
		}
	}

	public buy(itemId: string) {
		const item = ITEMS.find((i) => i.id === itemId);
		if (!item) return;

		if (this.state.inventory.includes(itemId)) {
			this.addToLog('Ya tienes ese objeto.');
			return;
		}

		if (this.state.gold >= item.cost) {
			this.state.gold -= item.cost;
			this.state.inventory.push(itemId);
			this.addToLog(`Compraste ${item.name} por ${item.cost} de oro.`);
			this.saveState();
		} else {
			this.addToLog('No tienes suficiente oro.');
		}
	}

	public explore() {
		// Simple random event logic
		const roll = Math.random();
		if (roll < 0.3) {
			const goldFound = Math.floor(Math.random() * 20) + 5;
			this.state.gold += goldFound;
			this.addToLog(`¡Encontraste una bolsa olvidada! Contenía ${goldFound} de oro.`);
		} else if (roll < 0.6) {
			this.addToLog('Exploraste la zona pero no encontraste nada interesante.');
		} else if (roll < 0.9) {
			const goldLost = Math.floor(Math.random() * 10) + 1;
			if (this.state.gold >= goldLost) {
				this.state.gold -= goldLost;
				this.addToLog(`Un trasgo te robó ${goldLost} de oro mientras no mirabas.`);
			} else {
				this.addToLog('Un trasgo intentó robarte, pero tus bolsillos estaban vacíos.');
			}
		} else {
			this.addToLog('Te encontraste con un viajero misterioso. "El 1 siempre acecha", te susurró.');
		}
		this.saveState();
	}

	public gamble(amount: number, npcId?: string) {
		const playerName = this.onlineManager.currentUserProfile?.displayName;
		if (!playerName) {
			this.addToLog('Necesitas conexión para jugar a los dados.');
			return;
		}

		if (this.state.gold < amount) {
			this.addToLog('No tienes suficiente oro para esa apuesta.');
			return;
		}

		const location = this.getLocation();
		const npc = location.npcs?.find((n) => n.id === npcId) || location.npcs?.find((n) => n.canGamble);

		const opponentName = npc?.name || 'Oponente';
		const opponentId = npc?.id || 'bot_generic';

		const config: GameConfig = {
			players: [
				{
					name: playerName || 'Viajero',
					id: this.onlineManager.getUserId() || 'player',
					score: 0,
					isBot: false,
					maxTurnScore: 0,
					maxRollScore: 0,
				},
				{
					name: opponentName,
					id: opponentId,
					score: 0,
					isBot: true,
					maxTurnScore: 0,
					maxRollScore: 0,
				},
			],
			scoreGoal: 3000,
		};

		// Deduct logic handled after game, but strictly checking here
		this.addToLog(`Te sientas a la mesa con ${opponentName} y apuestas ${amount} de oro.`);
		this.activeMatchBet = amount;
		this.onPlayFarkle(config);
	}

	public handleGameResult(isWin: boolean) {
		const bet = this.activeMatchBet || 0;
		this.activeMatchBet = null;
		if (isWin) {
			// Standard payout 1:1 (doubles money)
			this.state.gold += bet;
			this.state.stats.farkleWins++;
			this.addToLog(`¡Victoria! Ganaste la partida y obtuviste ${bet} de oro.`);
		} else {
			this.state.gold -= bet;
			this.state.stats.farkleLosses++;
			this.addToLog(`Derrota. Perdiste ${bet} de oro.`);
		}
		this.saveState();
	}

	private addToLog(message: string) {
		const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		this.state.log.unshift(`[${timestamp}] ${message}`);
		if (this.state.log.length > 50) this.state.log.pop();
	}
}
