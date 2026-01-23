import type { RpgProfile, RpgTile, RpgNpc, RpgItem, RpgStateResponse } from './rpg-types';
import type { GameConfig } from '../types';
import { OnlineManager } from '../online-manager';

export class RpgManager {
	private onPlayFarkle: (config: GameConfig) => void;
	private onlineManager: OnlineManager;
	private activeMatchBet: number | null = null;

	// Cache
	private profile: RpgProfile | null = null;
	private currentTile: RpgTile | null = null;
	private currentAdjacent: RpgStateResponse['adjacent'] = {};
	private currentNpcs: RpgNpc[] = [];
	private allItems: RpgItem[] = [];
	private logs: string[] = [];

	constructor(onPlayFarkle: (config: GameConfig) => void) {
		this.onPlayFarkle = onPlayFarkle;
		this.onlineManager = OnlineManager.getInstance();
		this.init();
	}

	private async init() {
		if (!this.onlineManager.getUserId()) {
			this.addToLog('Conéctate para jugar al RPG.');
			return;
		}

		await this.fetchAllItems();
		await this.refreshState();
		this.addToLog('Bienvenido al mundo de Farkle RPG.');
	}

	private async fetchAllItems() {
		try {
			const res = await fetch('/api/rpg/items');
			if (res.ok) {
				this.allItems = await res.json();
			}
		} catch (e) {
			console.error(e);
		}
	}

	public async refreshState() {
		const userId = this.onlineManager.getUserId();
		if (!userId) return;
		try {
			const res = await fetch('/api/rpg/state', {
				headers: { 'x-user-id': userId },
			});
			if (res.ok) {
				const data: RpgStateResponse = await res.json();
				this.profile = data.profile;
				this.currentTile = data.tile;
				this.currentNpcs = data.npcs;
				this.currentAdjacent = data.adjacent || {};
			}
		} catch (e) {
			console.error(e);
		}
	}

	public getState() {
		return {
			profile: this.profile,
			tile: this.currentTile,
			adjacent: this.currentAdjacent,
			npcs: this.currentNpcs,
			logs: this.logs,
		};
	}

	public getItems() {
		return this.allItems;
	}

	public async move(dx: number, dy: number) {
		if (!this.profile) await this.refreshState();
		if (!this.profile) return;

		const newX = this.profile.x + dx;
		const newY = this.profile.y + dy;

		// Optimistic update
		this.addToLog(`Viajando a coordenadas (${newX}, ${newY})...`);

		try {
			const res = await fetch('/api/rpg/move', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-user-id': this.onlineManager.getUserId()!,
				},
				body: JSON.stringify({ x: newX, y: newY }),
			});

			if (res.ok) {
				const data = await res.json();
				this.currentTile = data.tile;
				this.currentNpcs = data.npcs;
				if (this.profile) {
					this.profile.x = data.x;
					this.profile.y = data.y;
				}
				const tileName = this.currentTile ? this.currentTile.name : 'Unknown';
				this.addToLog(`Llegaste a ${tileName}.`);
			}
		} catch (e) {
			console.error(e);
			this.addToLog('Error al viajar.');
		}
	}

	public async gamble(amount: number, npcId?: number) {
		if (!this.profile) return;
		if (this.profile.gold < amount) {
			this.addToLog('No tienes suficiente oro.');
			return;
		}

		// Find NPC name
		let opponentName = 'Jugador RPG';
		if (npcId) {
			const npc = this.currentNpcs.find((n) => n.id === npcId);
			if (npc) opponentName = npc.name;
		}

		this.activeMatchBet = amount;
		this.onPlayFarkle({
			players: [
				{ name: 'Jugador', isBot: false, score: 0 },
				{ name: opponentName, isBot: true, score: 0 },
			],
			scoreGoal: 2000,
		});
	}

	public getActiveMatch() {
		return this.activeMatchBet !== null ? { bet: this.activeMatchBet } : null;
	}

	public handleGameResult(isWin: boolean) {
		const bet = this.activeMatchBet || 0;
		this.activeMatchBet = null;
		// NOTE: In a real server-authoritative RPG, the server should handle the result logic
		// securely. For now, we simulate stats update locally or would need an API call.
		if (isWin) {
			if (this.profile) this.profile.gold += bet;
			this.addToLog(`¡Ganaste! (Simulado: ganó ${bet} oro).`);
		} else {
			if (this.profile) this.profile.gold -= bet;
			this.addToLog(`Perdiste ${bet} oro.`);
		}
	}

	public buy(itemId: number) {
		this.addToLog(`Compra de objeto ${itemId} no implementada aún.`);
	}

	public explore() {
		this.addToLog('Explorando... nada interesante.');
	}

	public rest() {
		this.addToLog('Descansando...');
	}

	private addToLog(msg: string) {
		const time = new Date().toLocaleTimeString();
		this.logs.unshift(`[${time}] ${msg}`);
		if (this.logs.length > 20) this.logs.pop();
	}
}
