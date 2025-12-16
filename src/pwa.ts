export class PWAManager {
	private deferredPrompt: any;
	private installBtn: HTMLButtonElement;
	private pwaOverlay: HTMLDivElement;
	private iosInstructions: HTMLParagraphElement;

	private isMobile: boolean = false;
	private isInStandaloneMode: boolean = false;

	constructor() {
		this.installBtn = document.getElementById('installBtn') as HTMLButtonElement;
		this.pwaOverlay = document.getElementById('pwaInstallOverlay') as HTMLDivElement;
		this.iosInstructions = document.getElementById('iosInstructions') as HTMLParagraphElement;
	}

	public init() {
		this.checkInstallationStatus();
		this.setupEventListeners();
	}

	private checkInstallationStatus() {
		// Detect Mobile
		this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
		// Detect iOS
		const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
		// Check if running in standalone mode (already installed)
		this.isInStandaloneMode =
			window.matchMedia('(display-mode: standalone)').matches ||
			window.matchMedia('(display-mode: fullscreen)').matches ||
			window.matchMedia('(display-mode: minimal-ui)').matches ||
			('standalone' in window.navigator && (window.navigator as any).standalone === true);

		// If mobile and not standalone, show overlay
		if (this.mustInstallApp()) {
			this.pwaOverlay.classList.remove('hidden');
			if (isIos) {
				this.iosInstructions.classList.remove('hidden');
			}
		}
	}

	public mustInstallApp(): boolean {
		return this.isMobile && !this.isInStandaloneMode;
	}

	private setupEventListeners() {
		window.addEventListener('beforeinstallprompt', (e) => {
			// Prevent the mini-infobar from appearing on mobile
			e.preventDefault();
			// Stash the event so it can be triggered later.
			this.deferredPrompt = e;
			// If we are on mobile, the overlay is already visible.
		});

		this.installBtn.addEventListener('click', async () => {
			const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

			if (this.deferredPrompt) {
				// Show the install prompt
				this.deferredPrompt.prompt();
				// Wait for the user to respond to the prompt
				const { outcome } = await this.deferredPrompt.userChoice;
				console.log(`User response to the install prompt: ${outcome}`);
				// We've used the prompt, and can't use it again, throw it away
				this.deferredPrompt = null;
			} else if (isIos) {
				// Instructions are already visible
				alert('Sigue las instrucciones en pantalla: Pulsa Compartir y Añadir a inicio.');
			} else {
				// Fallback for other browsers
				alert('Usa la opción "Añadir a pantalla de inicio" o "Instalar" del menú de tu navegador.');
			}
		});

		window.addEventListener('appinstalled', () => {
			// Do NOT hide the overlay in the browser.
			// Instead, tell the user to open the app.
			const pwaContent = this.pwaOverlay.querySelector('.pwa-content')!;
			pwaContent.innerHTML = `
				<h1>Instalando ...</h1>
				<p>La aplicación se instalará en su dispositivo.</p>
				<p>Por favor, ciérrala aquí y ábrela desde tu pantalla de inicio para jugar.</p>
			`;
			// Clear the deferredPrompt so it can be garbage collected
			this.deferredPrompt = null;
			console.log('PWA was installed');
		});
	}
}
