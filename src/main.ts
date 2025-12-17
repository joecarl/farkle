import './style.css';
import { FarkleGame } from './farkle.ts';
import { AudioManager } from './audio.ts';
import { PWAManager } from './pwa.ts';
import { DebugManager } from './debug.ts';
import diceIcon from './assets/icons/dice.png';
import nextIcon from './assets/icons/next.png';

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
				<button id="debugBtn" class="icon-btn hidden" type="button" title="Herramientas de Debug"></button>
				<button id="musicBtn" class="icon-btn" type="button" title="Música"></button>
				<div class="score-display">
					<span id="topBarPlayerName">Player 1</span>: <span id="topBarTotalScore">0</span>
					<span class="separator">|</span>
					Turno: <span id="topBarTurnScore">0</span>
				</div>
			</div>
			<div class="top-controls">
				<button id="easterEggBtn" class="icon-btn hidden" type="button"></button>
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
							<li>Tres 1s = 1000 puntos</li>
							<li>Tres 2s = 200 puntos</li>
							<li>Tres 3s = 300 puntos</li>
							<li>Tres 4s = 400 puntos</li>
							<li>Tres 5s = 500 puntos</li>
							<li>Tres 6s = 600 puntos</li>
							<li>Tres parejas = 1500 puntos</li>
							<li>Escalera (1-6) = 1500 puntos</li>
						</ul>
						<p><em>* En combinaciones de 3 iguales, cada dado adicional idéntico duplica el valor puntuado.</em></p>
					</div>
					<div class="instructions">
						<h3>Cómo Jugar:</h3>
						<p>1. <strong>Tirar:</strong> Pulsa <img src="${diceIcon}" class="inline-icon" alt="dice"> para lanzar los dados.</p>
						<p>2. <strong>Seleccionar:</strong> Arrastra los dados a la sección izquierda para hacer combinaciones y puntuar.</p>
						<p>3. <strong>Decidir:</strong>
							<ul style="list-style-type: disc; padding-left: 20px; margin: 5px 0;">
								<li>Arriesgar: Tira los dados restantes (<img src="${diceIcon}" class="inline-icon" alt="dice">) para sumar más puntos.</li>
								<li>Plantarse: Pulsa <img src="${nextIcon}" class="inline-icon" alt="stop"> para guardar tus puntos y pasar el turno.</li>
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

		<div id="nextTurnOverlay" class="overlay hidden">
			<div class="overlay-content" style="max-width: 400px; text-align: center;">
				<h2>Siguiente Turno</h2>
				<h1 id="nextPlayerName" style="color: var(--p-color-1); margin: 20px 0;">Player Name</h1>
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
			
			<canvas id="gameCanvas"></canvas>

			<div class="players-overlay">
				<h3>Jugadores</h3>
				<ul id="playersList"></ul>
			</div>

			<div class="controls">
				<button id="rollBtn" class="icon-btn" type="button" title="Tirar Dados"></button>
				<button id="bankBtn" class="icon-btn" type="button" disabled title="Terminar turno"></button>
			</div>
			
		</div>
	</div>
`;

// PWA Install Logic
const pwaManager = new PWAManager();
pwaManager.init();

if (!pwaManager.mustInstallApp()) {
	const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas')!;
	const game = new FarkleGame(canvas);
	game.init();

	// Debug Overlay Logic
	const debugManager = new DebugManager(game);
	debugManager.init();

	// Audio Logic
	const audioManager = new AudioManager();
	audioManager.init().then(() => {
		const easterEggMeta = audioManager.getEasterEggMeta();
		if (!easterEggMeta) return;
		const easterBtn = document.getElementById('easterEggBtn')!;
		easterBtn.classList.remove('hidden');
		easterBtn.style.backgroundImage = `url(${easterEggMeta.imageUrl})`;
		easterBtn.addEventListener('click', () => {
			audioManager.toggleEasterEggTrack();
			easterBtn.classList.toggle('easter-egg-festive');
		});
	});
	game.setAudioManager(audioManager);

	const musicBtn = document.getElementById('musicBtn') as HTMLButtonElement;
	musicBtn.addEventListener('click', () => {
		const isMuted = audioManager.toggleMute();
		musicBtn.style.opacity = isMuted ? '0.5' : '1';
		// Ensure it plays if it wasn't playing (first interaction)
		audioManager.play();
	});

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
}
