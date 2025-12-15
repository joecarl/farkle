import './style.css';
import { FarkleGame } from './farkle.ts';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
	<div id="pwaInstallOverlay" class="pwa-overlay hidden">
		<div class="pwa-content">
			<h1>Farkle</h1>
			<p>Para jugar, instala la aplicación.</p>
			<button id="installBtn" class="pwa-btn">Instalar App 📲</button>
			<p id="iosInstructions" class="hidden small-text">Pulsa <span class="share-icon">⎋</span> y luego "Añadir a inicio"</p>
		</div>
	</div>
	<div>
		<div class="top-bar">
			<div class="left-section">
				<button id="infoBtn" class="icon-btn" type="button" title="Información"></button>
				<button id="debugBtn" class="icon-btn" type="button" title="Herramientas de Debug"></button>
				<div class="score-display">
					<span id="topBarPlayerName">Player 1</span>: <span id="topBarTotalScore">0</span>
					<span class="separator">|</span>
					Turno: <span id="topBarTurnScore">0</span>
				</div>
			</div>
			<div class="top-controls">
				<button id="newGameBtn" class="icon-btn" type="button" title="Nuevo Juego"></button>
			</div>
		</div>
		
		<div id="infoOverlay" class="overlay hidden">
			<div class="overlay-content">
				<button id="closeInfoBtn" class="close-btn">×</button>
				<div class="info-container">
					<div class="scoring-guide">
						<h3>Puntuación:</h3>
						<ul>
							<li>Un 1 = 100 puntos</li>
							<li>Un 5 = 50 puntos</li>
							<li>Tres 1s = 1,000 puntos</li>
							<li>Tres 2s = 200 puntos</li>
							<li>Tres 3s = 300 puntos</li>
							<li>Tres 4s = 400 puntos</li>
							<li>Tres 5s = 500 puntos</li>
							<li>Tres 6s = 600 puntos</li>
							<li>Tres pares = 1,500 puntos</li>
							<li>Escalera (1-6) = 1,500 puntos</li>
						</ul>
						<p><em>* En combinaciones de 3 iguales, cada dado adicional idéntico duplica el valor puntuado.</em></p>
					</div>
					<div class="instructions">
						<h3>Cómo Jugar:</h3>
						<p>1. <strong>Tirar:</strong> Pulsa 🎲 para lanzar los dados.</p>
						<p>2. <strong>Seleccionar:</strong> Arrastra los dados a la sección izquierda para hacer combinaciones y puntuar.</p>
						<p>3. <strong>Decidir:</strong>
							<ul style="list-style-type: disc; padding-left: 20px; margin: 5px 0;">
								<li>Arriesgar: Tira los dados restantes (🎲) para sumar más puntos.</li>
								<li>Plantarse: Pulsa 🛑 para guardar tus puntos y pasar el turno.</li>
							</ul>
						</p>
						<p>4. <strong>Farkle:</strong> Si en una tirada no obtienes puntos, ¡pierdes todo lo acumulado en el turno!</p>
						<p>5. <strong>Mesa limpia:</strong> Si usas los 6 dados, ¡puedes volver a tirar los 6 y seguir sumando!</p>
					</div>
				</div>
			</div>
		</div>

		<div id="farkleOverlay" class="overlay hidden">
			<div class="farkle-message">
				<h1>¡FARKLE!</h1>
				<p>Perdiste los puntos del turno</p>
			</div>
		</div>

		<div id="newGameModal" class="overlay hidden">
			<div class="overlay-content" style="max-width: 400px; text-align: center;">
				<h3 id="newGameModalTitle">Configurar Jugadores</h3>
				<div id="playersListContainer" style="margin-bottom: 20px; text-align: left; max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
					<ul id="newGamePlayersList" style="list-style: none; padding: 0; margin: 0;"></ul>
				</div>
				<div class="add-player-group">
					<input type="text" id="newGamePlayerName" placeholder="Nombre del jugador">
					<button id="addPlayerToGameBtn" type="button">+</button>
				</div>
				
				<div style="border-top: 1px solid rgba(255,255,255,0.2); margin: 0 -30px 20px -30px;"></div>

				<div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
					<button id="startGameBtn" class="btn-primary" type="button" style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);" disabled>Empezar Juego</button>
					<button id="cancelNewGameBtn" class="btn-primary" type="button" style="background: #666;">Cancelar</button>
				</div>
			</div>
		</div>

		<div class="game-container">
			<div class="canvas-wrapper">
				<canvas id="gameCanvas"></canvas>
				<div class="players-overlay">
					<h3>Jugadores</h3>
					<ul id="playersList"></ul>
				</div>
				<div class="rotation-test hidden">
					<h4>Prueba de Rotación (Dado 0):</h4>
					<div>
					<label>
						Rotación X: 
						<input type="range" id="rotXSlider" min="0" max="360" value="0" />
						<span id="rotXValue">0</span>°
					</label>
					</div>
					<div>
					<label>
						Rotación Y: 
						<input type="range" id="rotYSlider" min="0" max="360" value="0" />
						<span id="rotYValue">0</span>°
					</label>
					</div>
					<div>
					<label>
						Rotación Z: 
						<input type="range" id="rotZSlider" min="0" max="360" value="0" />
						<span id="rotZValue">0</span>°
					</label>
					</div>
				</div>
			</div>
			<div class="controls">
				<button id="rollBtn" class="icon-btn" type="button" title="Tirar Dados"></button>
				<button id="bankBtn" class="icon-btn" type="button" disabled title="Terminar turno"></button>
			</div>
		</div>
	</div>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas')!;
const game = new FarkleGame(canvas);
game.init();

// Info Overlay Logic
const infoBtn = document.querySelector<HTMLButtonElement>('#infoBtn')!;
const closeInfoBtn = document.querySelector<HTMLButtonElement>('#closeInfoBtn')!;
const infoOverlay = document.querySelector<HTMLDivElement>('#infoOverlay')!;

function toggleOverlay(show: boolean) {
	if (show) {
		infoOverlay.classList.remove('hidden');
	} else {
		infoOverlay.classList.add('hidden');
	}
}

infoBtn.addEventListener('click', () => toggleOverlay(true));
closeInfoBtn.addEventListener('click', () => toggleOverlay(false));
infoOverlay.addEventListener('click', (e) => {
	if (e.target === infoOverlay) {
		toggleOverlay(false);
	}
});

// Debug Overlay Logic
const debugBtn = document.querySelector<HTMLButtonElement>('#debugBtn')!;
const rotationTest = document.querySelector<HTMLDivElement>('.rotation-test')!;

debugBtn.addEventListener('click', () => {
	rotationTest.classList.toggle('hidden');
});

// Setup rotation test sliders
const rotXSlider = document.querySelector<HTMLInputElement>('#rotXSlider')!;
const rotYSlider = document.querySelector<HTMLInputElement>('#rotYSlider')!;
const rotZSlider = document.querySelector<HTMLInputElement>('#rotZSlider')!;
const rotXValue = document.querySelector<HTMLSpanElement>('#rotXValue')!;
const rotYValue = document.querySelector<HTMLSpanElement>('#rotYValue')!;
const rotZValue = document.querySelector<HTMLSpanElement>('#rotZValue')!;

rotXSlider.addEventListener('input', (e) => {
	const degrees = parseInt((e.target as HTMLInputElement).value);
	rotXValue.textContent = degrees.toString();
	game.setTestDiceRotation(degrees, parseInt(rotYSlider.value), parseInt(rotZSlider.value));
});

rotYSlider.addEventListener('input', (e) => {
	const degrees = parseInt((e.target as HTMLInputElement).value);
	rotYValue.textContent = degrees.toString();
	game.setTestDiceRotation(parseInt(rotXSlider.value), degrees, parseInt(rotZSlider.value));
});

rotZSlider.addEventListener('input', (e) => {
	const degrees = parseInt((e.target as HTMLInputElement).value);
	rotZValue.textContent = degrees.toString();
	game.setTestDiceRotation(parseInt(rotXSlider.value), parseInt(rotYSlider.value), degrees);
});

// PWA Install Logic
let deferredPrompt: any;
const installBtn = document.getElementById('installBtn') as HTMLButtonElement;
const pwaOverlay = document.getElementById('pwaInstallOverlay') as HTMLDivElement;
const iosInstructions = document.getElementById('iosInstructions') as HTMLParagraphElement;

// Detect Mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
// Detect iOS
const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
// Check if running in standalone mode (already installed)
const isInStandaloneMode =
	window.matchMedia('(display-mode: standalone)').matches ||
	window.matchMedia('(display-mode: fullscreen)').matches ||
	window.matchMedia('(display-mode: minimal-ui)').matches ||
	('standalone' in window.navigator && (window.navigator as any).standalone === true);

// If mobile and not standalone, show overlay
if (isMobile && !isInStandaloneMode) {
	pwaOverlay.classList.remove('hidden');
	if (isIos) {
		iosInstructions.classList.remove('hidden');
	}
}

window.addEventListener('beforeinstallprompt', (e) => {
	// Prevent the mini-infobar from appearing on mobile
	e.preventDefault();
	// Stash the event so it can be triggered later.
	deferredPrompt = e;
	// If we are on mobile, the overlay is already visible.
});

installBtn.addEventListener('click', async () => {
	if (deferredPrompt) {
		// Show the install prompt
		deferredPrompt.prompt();
		// Wait for the user to respond to the prompt
		const { outcome } = await deferredPrompt.userChoice;
		console.log(`User response to the install prompt: ${outcome}`);
		// We've used the prompt, and can't use it again, throw it away
		deferredPrompt = null;
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
	const pwaContent = pwaOverlay.querySelector('.pwa-content')!;
	pwaContent.innerHTML = `
		<h1>¡Instalada!</h1>
		<p>La aplicación se ha instalado correctamente.</p>
		<p>Por favor, ciérrala aquí y ábrela desde tu pantalla de inicio para jugar.</p>
	`;
	// Clear the deferredPrompt so it can be garbage collected
	deferredPrompt = null;
	console.log('PWA was installed');
});
