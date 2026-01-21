import type { RpgManager } from './rpg-manager';
import type { OverlayManager } from '../overlay-manager';
import { OnlineManager } from '../online-manager';
import type { GameState } from '../types';

export class RpgUi {
	private parent: HTMLElement;
	private container!: HTMLElement;
	private overlay!: HTMLElement;
	private rpgManager: RpgManager;
	private overlayManager: OverlayManager;
	private onlineManager: OnlineManager;

	constructor(parent: HTMLElement, rpgManager: RpgManager, overlayManager: OverlayManager) {
		this.parent = parent;
		this.rpgManager = rpgManager;
		this.overlayManager = overlayManager;
		this.onlineManager = OnlineManager.getInstance();
		this.injectHtml();
		this.setupElements();
		this.setupListeners();
	}

	private injectHtml() {
		const html = `
			<div id="rpgOverlay" class="overlay hidden">
				<div class="overlay-content menu-container">
					<button id="closeRpgBtn" class="close-btn">×</button>
					<div id="rpg-container" class="rpg-layout">
						Cargando Aventura...
					</div>
				</div>
			</div>
		`;
		this.parent.insertAdjacentHTML('beforeend', html);
	}

	private setupElements() {
		this.overlay = document.getElementById('rpgOverlay')!;
		this.container = document.getElementById('rpg-container')!;
	}

	private setupListeners() {
		const closeBtn = document.getElementById('closeRpgBtn')!;
		closeBtn.addEventListener('click', () => this.close());

		this.container.addEventListener('click', async (e) => {
			const target = e.target as HTMLElement;
			// Handle buttons with data-action
			if (target.classList.contains('rpg-action-btn') || target.closest('.rpg-action-btn')) {
				const btn = target.classList.contains('rpg-action-btn') ? target : target.closest('.rpg-action-btn')!;
				const action = btn.getAttribute('data-action');
				if (action === 'travel') {
					this.rpgManager.travel(btn.getAttribute('data-target')!);
				} else if (action === 'explore') {
					this.rpgManager.explore();
				} else if (action === 'rest') {
					this.rpgManager.rest();
				} else if (action === 'gamble') {
					const npcId = btn.getAttribute('data-npc') || undefined;
					const amountStr = await this.overlayManager.prompt('Apostar', '¿Cuánto quieres apostar?', '10');
					if (amountStr) {
						const amount = parseInt(amountStr);
						if (!isNaN(amount) && amount > 0) {
							this.rpgManager.gamble(amount, npcId);
						} else {
							await this.overlayManager.alert('Error', 'Cantidad inválida.');
						}
					}
				} else if (action === 'shop') {
					const items = this.rpgManager.getItems();
					let shopMsg = 'Objetos disponibles:<br>';
					items.forEach((i) => (shopMsg += `- ${i.name}: ${i.cost} oro (id: ${i.id})<br>`));
					const choice = await this.overlayManager.prompt('Tienda', shopMsg + '<br>Escribe el ID del objeto para comprar:');
					if (choice) this.rpgManager.buy(choice);
				}
			}
		});
	}

	public render() {
		// If hidden, don't waste time rendering
		if (this.overlay.classList.contains('hidden')) return;

		const state = this.rpgManager.getState();
		const location = this.rpgManager.getLocation();

		let actionsHtml = '';
		location.actions.forEach((action) => {
			if (action === 'travel') {
				location.connections.forEach((connId) => {
					const connLoc = this.rpgManager.getLocationById(connId);
					if (connLoc) {
						actionsHtml += `<button class="action-btn rpg-action-btn" data-action="travel" data-target="${connId}">Viajar a ${connLoc.name}</button>`;
					}
				});
			} else if (action === 'shop') {
				actionsHtml += `<button class="action-btn rpg-action-btn" data-action="shop">Visitar Tienda</button>`;
			} else if (action === 'explore') {
				actionsHtml += `<button class="action-btn rpg-action-btn" data-action="explore">Explorar</button>`;
			} else if (action === 'rest') {
				actionsHtml += `<button class="action-btn rpg-action-btn" data-action="rest">Descansar (10 oro)</button>`;
			}
		});

		const npcsHtml = (location.npcs || [])
			.map(
				(npc) => `
			<div class="npc-card">
				<div>
					<div class="npc-name">${npc.name}</div>
					<div class="npc-description">${npc.description}</div>
				</div>
				${npc.canGamble ? `<button class="action-btn rpg-action-btn gamble-btn" data-action="gamble" data-npc="${npc.id}">Jugar Dados</button>` : ''}
			</div>
		`
			)
			.join('');

		const logHtml = state.log
			.slice(0, 10)
			.map((entry) => `<div class="log-entry">${entry}</div>`)
			.join('');

		this.container.innerHTML = `
            <div class="rpg-header">
                <div class="rpg-stats">
                    <span class="gold-display">💰 ${state.gold}</span>
                    <span class="location-display">📍 ${location.name}</span>
                </div>
            </div>
            <div class="rpg-scene ${location.image || ''}">
                <div class="rpg-description">${location.description}</div>
				<div class="npcs-container">${npcsHtml}</div>
            </div>
            <div class="rpg-log">
                ${logHtml}
            </div>
            <div class="rpg-actions">
                ${actionsHtml}
            </div>
        `;
	}

	public open() {
		this.overlay.classList.remove('hidden');
		this.render();
	}

	public async handleMatchEnd(result: { winnerId: string; gameState: GameState }) {
		const rpgMatch = this.rpgManager.getActiveMatch();
		if (!rpgMatch) return;

		const isWin = result.winnerId === (this.onlineManager.getUserId() || 'player');
		this.rpgManager.handleGameResult(isWin);
		const msg = isWin ? `¡Ganaste! Recibes ${rpgMatch.bet} monedas.` : `Perdiste ${rpgMatch.bet} monedas.`;

		// Show quick alert and return to RPG
		setTimeout(async () => {
			await this.overlayManager.alert('Resultado RPG', msg);
			this.open();
		}, 500);
	}

	public close() {
		this.overlay.classList.add('hidden');
	}
}
