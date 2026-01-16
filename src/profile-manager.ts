import { OnlineManager } from './online-manager';

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
                            <div class="stat-card">
                                <span class="stat-label">Victorias</span>
                                <span id="stat-wins" class="stat-value">-</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-label">Derrotas</span>
                                <span id="stat-losses" class="stat-value">-</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-label">Record Personal</span>
                                <span id="stat-max-score" class="stat-value">-</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-label">Puntos Totales</span>
                                <span id="stat-total-score" class="stat-value">-</span>
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
		document.getElementById('stat-max-score')!.textContent = stats.maxScore.toLocaleString();
		document.getElementById('stat-total-score')!.textContent = stats.totalScore.toLocaleString();

		const list = document.getElementById('recent-games-list')!;
		if (stats.recentGames && stats.recentGames.length > 0) {
			list.innerHTML = stats.recentGames
				.map((g: any) => {
					console.log(g);
					const date = new Date(g.end_time || g.start_time).toLocaleDateString();
					const isWinner = g.winner_id === this.onlineManager.getUserId();
					const status = isWinner ? '<span class="winner-marker">Victoria</span>' : '<span class="loser-marker">Derrota</span>';
					return `
                    <div class="recent-game-item">
                        <span>${date}</span>
                        <span>${status}</span>
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
	}
}
