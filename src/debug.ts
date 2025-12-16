import { FarkleGame } from './farkle';

export class DebugManager {
	private game: FarkleGame;
	private debugBtn!: HTMLButtonElement;
	private rotationTest!: HTMLDivElement;
	private rotXSlider!: HTMLInputElement;
	private rotYSlider!: HTMLInputElement;
	private rotZSlider!: HTMLInputElement;
	private rotXValue!: HTMLSpanElement;
	private rotYValue!: HTMLSpanElement;
	private rotZValue!: HTMLSpanElement;

	constructor(game: FarkleGame) {
		this.game = game;
	}

	public init() {
		this.injectHTML();
		this.initializeElements();
		this.setupEventListeners();
	}

	private injectHTML() {
		const container = document.querySelector('.game-container');
		if (!container) return;

		const debugHTML = `
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
		`;
		container.insertAdjacentHTML('beforeend', debugHTML);
	}

	private initializeElements() {
		this.debugBtn = document.querySelector<HTMLButtonElement>('#debugBtn')!;
		this.rotationTest = document.querySelector<HTMLDivElement>('.rotation-test')!;
		this.rotXSlider = document.querySelector<HTMLInputElement>('#rotXSlider')!;
		this.rotYSlider = document.querySelector<HTMLInputElement>('#rotYSlider')!;
		this.rotZSlider = document.querySelector<HTMLInputElement>('#rotZSlider')!;
		this.rotXValue = document.querySelector<HTMLSpanElement>('#rotXValue')!;
		this.rotYValue = document.querySelector<HTMLSpanElement>('#rotYValue')!;
		this.rotZValue = document.querySelector<HTMLSpanElement>('#rotZValue')!;
	}

	private setupEventListeners() {
		this.debugBtn.addEventListener('click', () => {
			this.rotationTest.classList.toggle('hidden');
		});

		this.rotXSlider.addEventListener('input', (e) => {
			const degrees = parseInt((e.target as HTMLInputElement).value);
			this.rotXValue.textContent = degrees.toString();
			this.game.setTestDiceRotation(degrees, parseInt(this.rotYSlider.value), parseInt(this.rotZSlider.value));
		});

		this.rotYSlider.addEventListener('input', (e) => {
			const degrees = parseInt((e.target as HTMLInputElement).value);
			this.rotYValue.textContent = degrees.toString();
			this.game.setTestDiceRotation(parseInt(this.rotXSlider.value), degrees, parseInt(this.rotZSlider.value));
		});

		this.rotZSlider.addEventListener('input', (e) => {
			const degrees = parseInt((e.target as HTMLInputElement).value);
			this.rotZValue.textContent = degrees.toString();
			this.game.setTestDiceRotation(parseInt(this.rotXSlider.value), parseInt(this.rotYSlider.value), degrees);
		});
	}
}
