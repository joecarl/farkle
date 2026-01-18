import { OnlineManager } from './online-manager';
import { GameStatsLogic } from './game-stats-logic';

const ACHIEVEMENT_META: Record<string, { title: string; desc: string; icon: string }> = {
	first_win: { title: '¡Primera Victoria!', desc: 'Has ganado tu primera partida de Farkle.', icon: '🏆' },
	high_scorer: { title: 'Gran Puntuador', desc: 'Has conseguido más de 5000 puntos en una partida.', icon: '🔥' },
	veteran: { title: 'Veterano', desc: 'Has jugado 10 partidas o más.', icon: '🎖️' },
	puntuacion_perfecta: { title: 'Maestría Total', desc: 'Has alcanzado 10000 puntos en una partida.', icon: '👑' },
};

export class ProfileManager {
	private parent: HTMLElement;
	private onlineManager: OnlineManager;
	private savedPhrases: string[] = ['', '', '', ''];

	private profileOverlay!: HTMLDivElement;

	constructor(parent: HTMLElement) {
		this.parent = parent;
		this.onlineManager = OnlineManager.getInstance();
		this.injectHtml();
		this.setupElements();
		this.setupListeners();
		this.setupSocketHandlers();
	}

	private injectHtml() {
		const html = `
			<div id="profileOverlay" class="overlay hidden">
				<div class="overlay-content menu-container">
					<button id="closeProfileMgrBtn" class="close-btn">×</button>
					
					<div class="profile-tabs">
						<button class="tab-btn active" data-tab="phrases">Mis Frases</button>
						<button class="tab-btn" data-tab="profile">Perfil</button>
						<button class="tab-btn" data-tab="achievements">Logros</button>
					</div>

					<div id="tab-phrases" class="tab-content active">
						<div class="phrases-config">
							<input type="text" id="phrase1" placeholder="Frase 1" maxlength="30" />
							<input type="text" id="phrase2" placeholder="Frase 2" maxlength="30" />
							<input type="text" id="phrase3" placeholder="Frase 3" maxlength="30" />
							<input type="text" id="phrase4" placeholder="Frase 4" maxlength="30" />
						</div>
						<p style="text-align: left; color: #ccc;">Configura hasta 4 frases para usar en el chat de reacciones</p>

						<div class="menu-buttons" style="margin-top: 30px;">
							<button id="saveSettingsBtn" class="primary-btn">Guardar</button>
						</div>
					</div>

					<div id="tab-profile" class="tab-content hidden">
						<div class="stats-container">
							<div class="stats-container-row">
								<div class="stat-card">
									<span class="stat-label">Victorias</span>
									<span id="stat-wins" class="stat-value">-</span>
								</div>
								<div class="stat-card">
									<span class="stat-label">Derrotas</span>
									<span id="stat-losses" class="stat-value">-</span>
								</div>
								<div class="stat-card">
									<span class="stat-label">Partidas</span>
									<span id="stat-total-games" class="stat-value">-</span>
								</div>
							</div>
							<div class="stats-container-row">
								<div class="stat-card hidden">
									<span class="stat-label">Record Personal</span>
									<span id="stat-max-score" class="stat-value">-</span>
								</div>
								<div class="stat-card">
									<span class="stat-label">Mejor Turno</span>
									<span id="stat-max-turn" class="stat-value">-</span>
								</div>
								<div class="stat-card">
									<span class="stat-label">Mejor Tirada</span>
									<span id="stat-max-roll" class="stat-value">-</span>
								</div>
							</div>
							<div class="stats-container-row">
								<div class="stat-card">
									<span class="stat-label">Puntos Totales</span>
									<span id="stat-total-score" class="stat-value">-</span>
								</div>
							</div>
						</div>
						<div class="recent-games">
							<h3>Partidas Recientes</h3>
							<div id="recent-games-list" class="recent-games-list">Cargando...</div>
						</div>
					</div>

					<div id="tab-achievements" class="tab-content hidden">
						<div id="achievements-list" class="achievements-grid">
							Cargando logros...
						</div>
					</div>
				</div>
			</div>
        `;
		this.parent.insertAdjacentHTML('beforeend', html);
	}

	private setupElements() {
		this.profileOverlay = document.getElementById('profileOverlay')! as HTMLDivElement;
	}

	private setupListeners() {
		const saveBtn = document.getElementById('saveSettingsBtn')!;
		const closeProfileMgrBtn = document.getElementById('closeProfileMgrBtn')!;

		saveBtn.addEventListener('click', () => this.saveSettings());
		closeProfileMgrBtn.addEventListener('click', () => this.profileOverlay.classList.add('hidden'));

		// Tab switching
		const tabButtons = this.profileOverlay.querySelectorAll('.tab-btn');
		tabButtons.forEach((btn) => {
			btn.addEventListener('click', () => {
				const tab = btn.getAttribute('data-tab');
				if (tab) this.switchTab(tab);
			});
		});
	}

	private setupSocketHandlers() {
		this.onlineManager.onStatsData = (data) => this.renderStats(data.stats);
		this.onlineManager.onAchievementsData = (data) => this.renderAchievements(data.achievements);
	}

	private switchTab(tabId: string) {
		// Buttons
		const tabButtons = this.profileOverlay.querySelectorAll('.tab-btn');
		tabButtons.forEach((btn) => {
			if (btn.getAttribute('data-tab') === tabId) {
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		});

		// Contents
		const tabContents = this.profileOverlay.querySelectorAll('.tab-content');
		tabContents.forEach((content) => {
			if (content.id === `tab-${tabId}`) {
				content.classList.remove('hidden');
			} else {
				content.classList.add('hidden');
			}
		});

		// Fetch data if needed
		if (tabId === 'profile') {
			this.onlineManager.getStats();
		} else if (tabId === 'achievements') {
			this.onlineManager.getAchievements();
		}
	}

	private renderStats(stats: any) {
		if (!stats) return;
		document.getElementById('stat-wins')!.textContent = stats.wins.toString();
		document.getElementById('stat-losses')!.textContent = stats.losses.toString();
		document.getElementById('stat-total-games')!.textContent = (stats.totalGames || 0).toString();
		document.getElementById('stat-max-score')!.textContent = stats.maxScore.toLocaleString();
		document.getElementById('stat-max-turn')!.textContent = (stats.maxTurnScore || 0).toLocaleString();
		document.getElementById('stat-max-roll')!.textContent = (stats.maxRollScore || 0).toLocaleString();
		document.getElementById('stat-total-score')!.textContent = stats.totalScore.toLocaleString();

		const list = document.getElementById('recent-games-list')!;
		if (stats.recentGames && stats.recentGames.length > 0) {
			const curId = this.onlineManager.getUserId();
			list.innerHTML = stats.recentGames
				.map((g: any) => {
					const data = GameStatsLogic.processGameRecord(g, curId);
					const playersHtml = data.players
						.map((p) => {
							const scoreText = p.score !== null ? `<span class="player-score">${p.score.toLocaleString()}</span>` : '';
							const winnerIcon = p.isWinner ? '🏆 ' : '';
							const classAttr = p.classes.length > 0 ? ` class="player-chip ${p.classes.join(' ')}"` : ' class="player-chip"';
							return `<div${classAttr} title="${p.title}">${winnerIcon}<span class="player-name">${p.name}</span>${scoreText}</div>`;
						})
						.join('');

					const moreHtml = data.moreCount > 0 ? `<div class="player-chip">+${data.moreCount}</div>` : '';
					const goalHtml = data.goalText ? `<div class="game-goal">${data.goalText}</div>` : '';

					return `
                    <div class="recent-game-item">
                        <div class="game-left">
                            <div class="game-date">${data.date}</div>
                            ${goalHtml}
                        </div>
                        <div class="game-players">${playersHtml}${moreHtml}</div>
                        <div class="game-status">
                            <div class="game-status ${data.statusClass}">${data.statusText}</div>
                        </div>
                    </div>
                `;
				})
				.join('');
		} else {
			list.textContent = 'No hay partidas recientes.';
		}
	}

	private renderAchievements(achievements: any[]) {
		const list = document.getElementById('achievements-list')!;
		if (achievements && achievements.length > 0) {
			list.innerHTML = achievements
				.map((a: any) => {
					const meta = ACHIEVEMENT_META[a.achievement_key] || { title: a.achievement_key, desc: '', icon: '❓' };
					const date = new Date(a.unlocked_at).toLocaleDateString();
					return `
                    <div class="achievement-item">
                        <div class="achievement-icon">${meta.icon}</div>
                        <div class="achievement-info">
                            <h4>${meta.title}</h4>
                            <p>${meta.desc}</p>
                            <div class="achievement-date">Obtenido el ${date}</div>
                        </div>
                    </div>
                `;
				})
				.join('');
		} else {
			list.innerHTML = '<p style="text-align: center; color: #666; width: 100%;">Aún no has desbloqueado ningún logro.</p>';
		}
	}

	private updateSettingsInputs() {
		// Update from cached profile
		const phrases = this.onlineManager.currentUserProfile?.preferences?.phrases;
		if (Array.isArray(phrases)) {
			this.savedPhrases = phrases;
		}

		for (let i = 0; i < 4; i++) {
			const input = document.getElementById(`phrase${i + 1}`) as HTMLInputElement;
			if (input) input.value = this.savedPhrases[i] || '';
		}
	}

	private saveSettings() {
		// Save Phrases
		const newPhrases: string[] = [];
		for (let i = 0; i < 4; i++) {
			const input = document.getElementById(`phrase${i + 1}`) as HTMLInputElement;
			newPhrases.push(input.value.trim());
		}
		this.savedPhrases = newPhrases;
		this.onlineManager.updatePhrases(newPhrases);

		// Close
		this.profileOverlay.classList.add('hidden');
	}

	public open() {
		this.updateSettingsInputs();
		this.profileOverlay.classList.remove('hidden');
		const tabPhrases = document.getElementById('tab-phrases')!;
		if (this.onlineManager.currentRoomId !== null) {
			tabPhrases.classList.add('tab-disabled');
		} else {
			tabPhrases.classList.remove('tab-disabled');
		}

		// Ensure the currently visible tab updates its data when the overlay opens.
		// If the "phrases" tab is disabled while it was previously active, switch to "profile".
		const activeBtn = this.profileOverlay.querySelector('.tab-btn.active') as HTMLButtonElement | null;
		let activeTab = activeBtn?.dataset.tab ?? 'phrases';

		this.switchTab(activeTab);
	}
}
