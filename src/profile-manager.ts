import { OnlineManager } from './online-manager';

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
	}

	private injectHtml() {
		const html = `
            <div id="profileOverlay" class="overlay hidden">
                <div class="overlay-content menu-container">
					<button id="closeProfileMgrBtn" class="close-btn">×</button>
                    
					<div class="profile-tabs">
						<button class="tab-btn active" data-tab="phrases">Mis Frases</button>
						<button class="tab-btn" data-tab="profile" disabled>Perfil</button>
						<button class="tab-btn" data-tab="achievements" disabled>Logros</button>
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
						<p>Configuración de perfil en construcción...</p>
					</div>

					<div id="tab-achievements" class="tab-content hidden">
						<p>Sistema de logros en construcción...</p>
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
