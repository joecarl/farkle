import { appendChild, signal } from 'chispa';
import { RpgView } from './ui/rpg-view';
import type { RpgManager } from './rpg-manager';
import type { OverlayManager } from '../overlay-manager';
import type { GameState } from '../types';
import type { RpgProfile, RpgTile, RpgNpc, RpgStateResponse } from './rpg-types';

export class RpgUi {
	private isVisible = signal(false);
	private profile = signal<RpgProfile | null>(null);
	private tile = signal<RpgTile | null>(null);
	private npcs = signal<RpgNpc[]>([]);
	private adjacent = signal<RpgStateResponse['adjacent']>({});

	private rpgManager: RpgManager;
	private overlayManager: OverlayManager;

	constructor(parent: HTMLElement, rpgManager: RpgManager, overlayManager: OverlayManager) {
		this.rpgManager = rpgManager;
		this.overlayManager = overlayManager;

		this.init(parent);
	}

	private init(parent: HTMLElement) {
		appendChild(
			parent,
			RpgView({
				isVisible: this.isVisible,
				profile: this.profile,
				tile: this.tile,
				npcs: this.npcs,
				adjacent: this.adjacent,
				onClose: () => this.close(),
				onMove: (dx, dy) => this.handleMove(dx, dy),
				onExplore: () => this.handleExplore(),
				onGamble: (npcId) => this.handleGamble(npcId),
				onTalk: (npcId) => this.handleTalk(npcId),
			})
		);
	}

	public open() {
		this.refreshState().then(() => {
			this.isVisible.set(true);
		});
	}

	public close() {
		this.isVisible.set(false);
	}

	public async handleMatchEnd(_result: { winnerId: string; gameState: GameState }) {
		await this.refreshState();
		this.open();
	}

	private async refreshState() {
		await this.rpgManager.refreshState();
		const state = this.rpgManager.getState();
		this.profile.set(state.profile);
		this.tile.set(state.tile);
		this.npcs.set(state.npcs);
		this.adjacent.set(state.adjacent || {});
	}

	private async handleMove(dx: number, dy: number) {
		await this.rpgManager.move(dx, dy);
		await this.refreshState();
	}

	private async handleExplore() {
		await this.rpgManager.explore();
		await this.refreshState();
	}

	private async handleGamble(npcId: number) {
		const amountStr = await this.overlayManager.prompt('Apostar', '¿Cuánto quieres apostar?', '10');
		if (amountStr) {
			const amount = parseInt(amountStr);
			if (!isNaN(amount) && amount > 0) {
				await this.rpgManager.gamble(amount, npcId);
				await this.refreshState();
			} else {
				await this.overlayManager.alert('Error', 'Cantidad inválida.');
			}
		}
	}

	private async handleTalk(_npcId: number) {
		await this.overlayManager.alert('Hablar', 'El NPC te saluda.');
	}
}
