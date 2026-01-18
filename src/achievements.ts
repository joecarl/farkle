import { OnlineManager } from './online-manager';

export interface Achievement {
	id: string;
	name: string;
	description: string;
	iconClass: string;
	secret?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
	// Fila 1
	{ id: 'FARKLE_6', name: 'Farkle con 6 dados', description: '¡Farkle! con una tirada completa de 6 dados.', iconClass: 'ach-farkle-6' },
	{ id: 'BIG_ROLL', name: 'Gran tirada', description: 'Consigue más de 1,500 puntos en una sola tirada.', iconClass: 'ach-big-roll' },
	{ id: 'SURVIVOR_1', name: 'Salir airoso', description: 'Consigue puntos tirando solo 1 dado.', iconClass: 'ach-survivor-1' },
	{ id: 'GOLD_HOARDER', name: 'Acumulador de oro', description: 'Alcanza un total acumulado de monedas (Simulado).', iconClass: 'ach-gold-hoarder' },
	{ id: 'TAVERN_KING', name: 'Rey de la taberna', description: 'Gana 50 partidas.', iconClass: 'ach-tavern-king' },

	// Fila 2
	{ id: 'DUEL_WINNER', name: 'Duelista', description: 'Gana un duelo 1 contra 1.', iconClass: 'ach-duel-winner' },
	{ id: 'PERFECT_AIM', name: 'Precisión absoluta', description: 'Termina una ronda sin desperdiciar ningún dado.', iconClass: 'ach-perfect-aim' },
	{ id: 'HIDDEN_TREASURE', name: 'Tesoro escondido', description: 'Logro secreto desbloqueado.', iconClass: 'ach-hidden-treasure', secret: true },
	{ id: 'CHRONICLER', name: 'Cronista', description: 'Crea 10 salas de juego.', iconClass: 'ach-chronicler' },
	{ id: 'RECOGNIZED_HERO', name: 'Héroe reconocido', description: 'Alcanza el nivel 10 (Simulado).', iconClass: 'ach-recognized-hero' },

	// Fila 3
	{ id: 'CHAMPION', name: 'Campeón', description: 'Gana un torneo.', iconClass: 'ach-champion' },
	{ id: 'SIX_ONES', name: 'Seis unos', description: 'Saca seis 1s en una sola tirada.', iconClass: 'ach-six-ones' },
	{ id: 'AGAINST_TIME', name: 'Contra el tiempo', description: 'Gana en el último turno remontando.', iconClass: 'ach-against-time' },
	{ id: 'KEY_OF_DESTINY', name: 'Llave del destino', description: 'Desbloquea una nueva skin de dados.', iconClass: 'ach-key-destiny' },
	{ id: 'ALCHEMIST', name: 'Alquimista', description: 'Usa una poción o habilidad especial.', iconClass: 'ach-alchemist' },

	// Fila 4
	{ id: 'DRAGON_FIRE', name: 'Fuego del dragón', description: 'Consigue mas de 3,000 puntos en un turno.', iconClass: 'ach-dragon-fire' },
	{ id: 'SHADOW_LORD', name: 'Señor de las sombras', description: 'Gana sin que nadie se lo espere.', iconClass: 'ach-shadow-lord' },
	{ id: 'LUCKY_CLOVER', name: 'Suerte del trébol', description: 'Saca escalera completa (1-6) en una tirada.', iconClass: 'ach-lucky-clover' },
	{ id: 'DRUNKARD', name: 'Borracho de la taberna', description: 'Juega 10 partidas seguidas.', iconClass: 'ach-drunkard' },
	{ id: 'BLOOD_AND_DICE', name: 'Sangre y dados', description: 'Pierde mas de 1000 puntos por un Farkle.', iconClass: 'ach-blood-dice' },

	// Fila 5
	{ id: 'THOUSAND_COINS', name: 'Mil monedas', description: 'Alcanza 100,000 puntos totales en tu carrera.', iconClass: 'ach-thousand-coins' },
	{ id: 'VETERAN', name: 'Tahúr veterano', description: 'Juega por más de 10 horas totales.', iconClass: 'ach-veteran' },
	{ id: 'LEGENDARY_VICTORY', name: 'Victoria legendaria', description: 'Gana con exactamente 10,000 puntos.', iconClass: 'ach-legendary-victory' },
	{ id: 'CURSED_DICE', name: 'Dados malditos', description: 'Saca 3 Farkles seguidos.', iconClass: 'ach-cursed-dice' },
	{ id: 'WISE_MAN', name: 'Sabio del azar', description: 'Juega 100 partidas.', iconClass: 'ach-wise-man' },
];

export class AchievementManager {
	private unlockedIds: Set<string> = new Set();
	private onlineManager: OnlineManager;
	private container: HTMLElement;

	constructor(onlineManager: OnlineManager) {
		this.onlineManager = onlineManager;
		this.container = document.createElement('div');
		this.container.id = 'achievement-container';
		document.body.appendChild(this.container);

		// Load initially unlocked from somewhere if possible,
		// but typically we fetch from server on connect.
		// For now, we assume transient session or fetched later.
	}

	public setUnlocked(ids: string[]) {
		ids.forEach((id) => this.unlockedIds.add(id));
	}

	public unlock(id: string) {
		if (this.unlockedIds.has(id)) return;

		const achievement = ACHIEVEMENTS.find((a) => a.id === id);
		if (!achievement) return;

		this.unlockedIds.add(id);
		this.showNotification(achievement);

		if (this.onlineManager) {
			this.onlineManager.unlockAchievement(id);
		}
	}

	public checkStats(stats: any) {
		if (!stats) return;

		if (stats.wins >= 50) this.unlock('TAVERN_KING');
		if (stats.totalGames >= 100) this.unlock('WISE_MAN');
		if (stats.totalScore >= 100000) this.unlock('THOUSAND_COINS');

		// "Acumulador de oro" (Simulado con totalScore/10 ?)
		// Let's assume 1 gold = 100 points
		if (stats.totalScore >= 100000) this.unlock('GOLD_HOARDER');

		// Veteran: 10 hours. Not tracked in simple stats yet.
	}

	private showNotification(achievement: Achievement) {
		const el = document.createElement('div');
		el.className = 'achievement-notification';
		el.innerHTML = `
            <div class="ach-icon ${achievement.iconClass}"></div>
            <div class="ach-text">
                <div class="ach-title">¡Logro Desbloqueado!</div>
                <div class="ach-name">${achievement.name}</div>
            </div>
        `;

		this.container.appendChild(el);

		// Play sound if available?
		// const audio = new Audio('/assets/sounds/achievement.mp3');
		// audio.play().catch(()=>{});

		// Animate in
		requestAnimationFrame(() => {
			el.classList.add('show');
		});

		// Remove after time
		setTimeout(() => {
			el.classList.remove('show');
			setTimeout(() => el.remove(), 500); // Wait for transition
		}, 4000);
	}
}
