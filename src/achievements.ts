import { OnlineManager } from './online-manager';
import { FarkleLogic } from './logic';

export interface Achievement {
	id: string;
	name: string;
	description: string;
	iconClass: string;
	secret?: boolean;
}

export const ACHIEVEMENT_THRESHOLDS = {
	BIG_ROLL_SCORE: 2000,
	TAVERN_KING_WINS: 50,
	CHRONICLER_ROOMS: 10,
	RECOGNIZED_HERO_LEVEL: 10,
	DRAGON_FIRE_SCORE: 4500,
	BLOOD_AND_DICE_LOSS: 1500,
	THOUSAND_COINS_TOTAL: 100000,
	LEGENDARY_VICTORY_SCORE: 10000,
	CURSED_DICE_FARKLES: 4,
	WISE_MAN_GAMES: 100,
	DRUNKARD_SESSIONS: 10,
	VETERAN_HOURS: 10,
};

export const ACHIEVEMENTS: Achievement[] = [
	// Fila 1
	{ id: 'FARKLE_6', name: 'Farkle con 6 dados', description: '¡Farkle! con una tirada completa de 6 dados.', iconClass: 'ach-farkle-6' },
	{
		id: 'BIG_ROLL',
		name: 'Gran tirada',
		description: `Consigue ${ACHIEVEMENT_THRESHOLDS.BIG_ROLL_SCORE.toLocaleString()} puntos o más en una sola tirada.`,
		iconClass: 'ach-big-roll',
	},
	{ id: 'SURVIVOR_1', name: 'Salir airoso', description: 'Consigue puntos tirando solo 1 dado.', iconClass: 'ach-survivor-1' },
	{ id: 'GOLD_HOARDER', name: 'Acumulador de oro', description: 'Alcanza un total acumulado de monedas (Simulado).', iconClass: 'ach-gold-hoarder' },
	{ id: 'TAVERN_KING', name: 'Rey de la taberna', description: `Gana ${ACHIEVEMENT_THRESHOLDS.TAVERN_KING_WINS} partidas.`, iconClass: 'ach-tavern-king' },

	// Fila 2
	{ id: 'DUEL_WINNER', name: 'Duelista', description: 'Gana un duelo 1 contra 1.', iconClass: 'ach-duel-winner' },
	{
		id: 'PERFECT_AIM',
		name: 'Precisión absoluta',
		description: 'Termina una ronda sin desperdiciar ningún dado en varias tiradas.',
		iconClass: 'ach-perfect-aim',
	},
	{ id: 'HIDDEN_TREASURE', name: 'Tesoro escondido', description: 'Logro secreto desbloqueado.', iconClass: 'ach-hidden-treasure', secret: true },
	{ id: 'CHRONICLER', name: 'Cronista', description: `Crea ${ACHIEVEMENT_THRESHOLDS.CHRONICLER_ROOMS} salas de juego.`, iconClass: 'ach-chronicler' },
	{
		id: 'RECOGNIZED_HERO',
		name: 'Héroe reconocido',
		description: `Alcanza el nivel ${ACHIEVEMENT_THRESHOLDS.RECOGNIZED_HERO_LEVEL} (Simulado).`,
		iconClass: 'ach-recognized-hero',
	},

	// Fila 3
	{ id: 'CHAMPION', name: 'Campeón', description: 'Gana un torneo.', iconClass: 'ach-champion' },
	{ id: 'SIX_ONES', name: 'Seis unos', description: 'Saca seis 1s en una sola tirada.', iconClass: 'ach-six-ones' },
	{ id: 'AGAINST_TIME', name: 'Contra el tiempo', description: 'Gana en el último turno remontando.', iconClass: 'ach-against-time' },
	{ id: 'KEY_OF_DESTINY', name: 'Llave del destino', description: 'Desbloquea una nueva skin de dados.', iconClass: 'ach-key-destiny' },
	{ id: 'ALCHEMIST', name: 'Alquimista', description: 'Usa una poción o habilidad especial.', iconClass: 'ach-alchemist' },

	// Fila 4
	{
		id: 'DRAGON_FIRE',
		name: 'Fuego del dragón',
		description: `Consigue más de ${ACHIEVEMENT_THRESHOLDS.DRAGON_FIRE_SCORE.toLocaleString()} puntos en un turno.`,
		iconClass: 'ach-dragon-fire',
	},
	{ id: 'SHADOW_LORD', name: 'Señor de las sombras', description: 'Gana sin que nadie se lo espere.', iconClass: 'ach-shadow-lord' },
	{ id: 'LUCKY_CLOVER', name: 'Suerte del trébol', description: 'Saca escalera completa (1-6) en una tirada.', iconClass: 'ach-lucky-clover' },
	{
		id: 'DRUNKARD',
		name: 'Borracho de la taberna',
		description: `Juega ${ACHIEVEMENT_THRESHOLDS.DRUNKARD_SESSIONS} partidas seguidas.`,
		iconClass: 'ach-drunkard',
	},
	{
		id: 'BLOOD_AND_DICE',
		name: 'Sangre y dados',
		description: `Pierde más de ${ACHIEVEMENT_THRESHOLDS.BLOOD_AND_DICE_LOSS.toLocaleString()} puntos por un Farkle.`,
		iconClass: 'ach-blood-dice',
	},

	// Fila 5
	{
		id: 'THOUSAND_COINS',
		name: 'Mil monedas',
		description: `Alcanza ${ACHIEVEMENT_THRESHOLDS.THOUSAND_COINS_TOTAL.toLocaleString()} puntos totales en tu carrera.`,
		iconClass: 'ach-thousand-coins',
	},
	{ id: 'VETERAN', name: 'Tahúr veterano', description: `Juega por más de ${ACHIEVEMENT_THRESHOLDS.VETERAN_HOURS} horas totales.`, iconClass: 'ach-veteran' },
	{
		id: 'LEGENDARY_VICTORY',
		name: 'Victoria legendaria',
		description: `Gana con exactamente ${ACHIEVEMENT_THRESHOLDS.LEGENDARY_VICTORY_SCORE.toLocaleString()} puntos.`,
		iconClass: 'ach-legendary-victory',
	},
	{
		id: 'CURSED_DICE',
		name: 'Dados malditos',
		description: `Saca ${ACHIEVEMENT_THRESHOLDS.CURSED_DICE_FARKLES} Farkles seguidos.`,
		iconClass: 'ach-cursed-dice',
	},
	{ id: 'WISE_MAN', name: 'Sabio del azar', description: `Juega ${ACHIEVEMENT_THRESHOLDS.WISE_MAN_GAMES} partidas.`, iconClass: 'ach-wise-man' },
];

export interface AchievementRecord {
	achievement_key: string;
	unlocked_at: string;
	player_id: string;
}

export class AchievementManager {
	private unlockedIds: Set<string> = new Set();
	private onlineManager: OnlineManager;
	private container: HTMLElement;

	// Internal state tracking for achievements
	private lastRolledCount: number = 0;
	private consecutiveFarkles: number = 0;
	private turnWasWinning: boolean = false;
	private hotDiceCount: number = 0;

	private logic: FarkleLogic;

	constructor(onlineManager: OnlineManager, logic: FarkleLogic) {
		this.onlineManager = onlineManager;
		this.logic = logic;
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
		if (this.unlockedIds.has(id)) {
			console.log(`Achievement ${id} already unlocked.`); // IGNORE
			return;
		}
		const achievement = ACHIEVEMENTS.find((a) => a.id === id);
		if (!achievement) return;

		this.unlockedIds.add(id);
		this.showNotification(achievement);

		if (this.onlineManager) {
			this.onlineManager.unlockAchievement(id);
		}
	}

	public checkAchievements(context: string, data: any = {}) {
		if (!this.onlineManager.isInGame) {
			// Achievements only in online game context
			return;
		}
		const currentUserId = this.onlineManager.getUserId();
		const gs = this.logic.getGameState();

		if (context !== 'gameOver') {
			const activePlayerId = gs.players[gs.currentPlayerIndex]?.id;
			// If it's not our turn, we generally don't process achievements
			if (activePlayerId && activePlayerId !== currentUserId) {
				return;
			}
		}

		// Update internal state
		switch (context) {
			case 'startTurn':
				if (gs && gs.players) {
					const currentPlayer = gs.players[gs.currentPlayerIndex];
					const isMyTurn = currentPlayer.id === currentUserId;
					if (isMyTurn) {
						this.hotDiceCount = 0;
						const sorted = [...gs.players].sort((a: any, b: any) => b.score - a.score);
						const leader = sorted[0];
						this.turnWasWinning = currentPlayer.score >= leader.score;
					}
				}
				break;
			case 'roll':
				this.lastRolledCount = data.diceCount || 0;
				if (this.lastRolledCount === 6) {
					this.hotDiceCount++;
				}
				break;
			case 'bank':
				this.consecutiveFarkles = 0;
				break;
			case 'farkle':
				this.consecutiveFarkles++;
				break;
		}

		switch (context) {
			case 'startTurn':
				// Handle Start of turn checks if any
				break;

			case 'roll':
				// SIX_ONES, LUCKY_CLOVER
				const targetValues: number[] = data.targetValues || [];
				const diceCount: number = data.diceCount || 0;
				const sorted = [...targetValues].sort((a, b) => a - b).join('');
				if (diceCount === 6) {
					if (sorted === '111111') this.unlock('SIX_ONES');
					if (sorted === '123456') this.unlock('LUCKY_CLOVER');
				}
				if (diceCount === 1 && !gs.isFarkle) {
					this.unlock('SURVIVOR_1');
				}
				break;

			case 'beforeRoll':
				// BIG_ROLL: High selection score before rolling again
				if (gs.turnScore >= ACHIEVEMENT_THRESHOLDS.BIG_ROLL_SCORE) {
					this.unlock('BIG_ROLL');
				}
				break;

			case 'farkle':
				// FARKLE_6, BLOOD_AND_DICE
				const turnScoreLost = gs.lostScore;
				if (this.lastRolledCount === 6) {
					this.unlock('FARKLE_6');
				}
				if (turnScoreLost > ACHIEVEMENT_THRESHOLDS.BLOOD_AND_DICE_LOSS) {
					this.unlock('BLOOD_AND_DICE');
				}
				if (this.consecutiveFarkles >= ACHIEVEMENT_THRESHOLDS.CURSED_DICE_FARKLES) {
					this.unlock('CURSED_DICE');
				}
				break;

			case 'bank':
				// DRAGON_FIRE, SURVIVOR_1, PERFECT_AIM
				const bankedScore = gs.turnScore;
				if (bankedScore > ACHIEVEMENT_THRESHOLDS.DRAGON_FIRE_SCORE) {
					this.unlock('DRAGON_FIRE');
				}
				if (this.hotDiceCount >= 2 && gs.dice.filter((d) => d.locked || d.selected).length === 6) {
					this.unlock('PERFECT_AIM');
				}
				break;

			case 'gameOver':
				// DUEL_WINNER, LEGENDARY_VICTORY, AGAINST_TIME
				const winner = this.logic.getWinner();
				const winnerId = winner?.id;
				const currentUserId = this.onlineManager.getUserId();

				if (this.onlineManager.isInGame && winnerId && winnerId === currentUserId) {
					const playersCount = gs.players.length;
					const winScore = winner?.score || 0;

					if (playersCount === 2) {
						this.unlock('DUEL_WINNER');
					}
					if (winScore === ACHIEVEMENT_THRESHOLDS.LEGENDARY_VICTORY_SCORE) {
						this.unlock('LEGENDARY_VICTORY');
					}
					if (!this.turnWasWinning && playersCount > 1) {
						this.unlock('AGAINST_TIME');
					}
				}
				break;
		}
	}

	public checkStats(stats: any) {
		if (!stats) return;

		if (stats.wins >= ACHIEVEMENT_THRESHOLDS.TAVERN_KING_WINS) this.unlock('TAVERN_KING');
		if (stats.totalGames >= ACHIEVEMENT_THRESHOLDS.WISE_MAN_GAMES) this.unlock('WISE_MAN');
		if (stats.totalScore >= ACHIEVEMENT_THRESHOLDS.THOUSAND_COINS_TOTAL) this.unlock('THOUSAND_COINS');

		// "Acumulador de oro" (Simulado con totalScore/10 ?)
		// Let's assume 1 gold = 100 points
		//if (stats.totalScore >= 100000) this.unlock('GOLD_HOARDER');

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
