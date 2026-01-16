import { io, Socket } from 'socket.io-client';
import { DEFAULT_SCORE_GOAL } from './logic';
import { getPathname } from './utils';

const SERVER_URL = import.meta.env.DEV ? 'http://localhost:3000' : location.origin;

const FARKLE_USER_ID = 'farkle.userId';

export class OnlineManager {
	private socket: Socket;
	private static instance: OnlineManager;

	public currentRoomId: string | null = null;
	public isHost: boolean = false;
	public isRandom: boolean = false;
	public scoreGoal: number = DEFAULT_SCORE_GOAL;
	public isInGame: boolean = false;

	public onRoomCreated?: (data: { roomId: string; players: any[]; scoreGoal: number; isRandom?: boolean }) => void;
	public onPlayerJoined?: (data: { players: any[]; scoreGoal?: number; isRandom?: boolean }) => void;
	public onPlayerUpdate?: (data: { players: any[] }) => void;
	public onGameStarted?: (data: { players: any[]; currentPlayerIndex: number; scoreGoal: number }) => void;
	public onGameAction?: (data: { action: string; payload: any; senderId: string }) => void;
	public onRoomsUpdated?: (rooms: any[]) => void;
	public onError?: (data: { message: string }) => void;
	public onRejoinPrompt?: (data: { roomId: string; players: any[]; scoreGoal: number; gameStarted: boolean; gameId: any }) => void;
	public onStateSyncRequest?: (data: { requesterId: string }) => void;
	public onStateSync?: (data: { state: any; targetId: string }) => void;
	public onPhrasesUpdated?: (data: { phrases: string[] }) => void;
	public onReactionReceived?: (data: { senderId: string; senderName: string; content: string; type: 'text' | 'emoji' }) => void;

	// Cache for current user profile
	public currentUserProfile: any = null;
	// Support multiple listeners
	private profileListeners: ((profile: any) => void)[] = [];
	public addProfileListener(listener: (profile: any) => void) {
		this.profileListeners.push(listener);
		if (this.currentUserProfile) listener(this.currentUserProfile);
	}
	public removeProfileListener(listener: (profile: any) => void) {
		this.profileListeners = this.profileListeners.filter((l) => l !== listener);
	}

	private constructor() {
		const socketPath = getPathname() + '/socket.io';
		this.socket = io(SERVER_URL, { path: socketPath });
		this.setupListeners();
	}

	// Fetch current public rooms via REST API
	public async fetchRooms() {
		try {
			const res = await fetch(SERVER_URL + '/api/rooms');
			if (!res.ok) return;
			const data = await res.json();
			if (this.onRoomsUpdated) this.onRoomsUpdated(data);
		} catch (e) {
			console.warn('Failed to fetch rooms', e);
		}
	}

	public static getInstance(): OnlineManager {
		if (!OnlineManager.instance) {
			OnlineManager.instance = new OnlineManager();
		}
		return OnlineManager.instance;
	}

	private setupListeners() {
		this.socket.on('connect', () => {
			console.log('Connected to server', this.socket.id);

			// Send stored userId (if any) to server to identify
			try {
				const saved = localStorage.getItem(FARKLE_USER_ID);
				this.socket.emit('identify', { userId: saved });
			} catch (err) {
				console.warn('Could not access localStorage for userId', err);
			}
		});

		// Rooms list updates
		this.socket.on('rooms_updated', (rooms: any[]) => {
			if (this.onRoomsUpdated) this.onRoomsUpdated(rooms);
		});

		// Server will reply with assigned/confirmed userId
		this.socket.on('identified', (data: { userId: string; profile: any }) => {
			try {
				localStorage.setItem(FARKLE_USER_ID, data.userId);
				this.currentUserProfile = data.profile;
				console.log('Identified. User:', data.userId, 'Profile:', data.profile);

				this.profileListeners.forEach((l) => l(this.currentUserProfile));
			} catch (err) {
				console.warn('Could not store User ID or process profile', err);
			}
		});

		this.socket.on('rejoin_prompt', (data) => {
			if (this.onRejoinPrompt) this.onRejoinPrompt(data);
		});

		this.socket.on('request_state_sync', (data) => {
			if (this.onStateSyncRequest) this.onStateSyncRequest(data);
		});

		this.socket.on('state_sync', (data) => {
			if (data.targetId !== this.getUserId()) return;
			if (this.onStateSync) this.onStateSync(data);
		});

		this.socket.on('phrases_updated', (data) => {
			// Update local cache
			if (this.currentUserProfile) {
				if (!this.currentUserProfile.preferences) this.currentUserProfile.preferences = {};
				this.currentUserProfile.preferences.phrases = data.phrases;
				this.profileListeners.forEach((l) => l(this.currentUserProfile));
			}

			if (this.onPhrasesUpdated) this.onPhrasesUpdated(data);
		});

		this.socket.on('reaction_received', (data) => {
			if (this.onReactionReceived) this.onReactionReceived(data);
		});

		this.socket.on('room_created', (data) => {
			this.currentRoomId = data.roomId;
			this.isHost = true;
			this.scoreGoal = data.scoreGoal;
			this.isRandom = !!data.isRandom;
			if (this.onRoomCreated) this.onRoomCreated(data);
		});

		this.socket.on('player_joined', (data) => {
			if (data.roomId) this.currentRoomId = data.roomId;
			if (data.scoreGoal) this.scoreGoal = data.scoreGoal;
			if (data.isRandom !== undefined) this.isRandom = data.isRandom;
			if (this.onPlayerJoined) this.onPlayerJoined(data);
		});

		this.socket.on('player_left', (data) => {
			if (this.onPlayerJoined) this.onPlayerJoined(data); // Reuse same callback for list update
		});

		this.socket.on('player_disconnected', (data) => {
			// Treat as player update or specific UI
			console.log('Player disconnected:', data.playerId);
		});

		this.socket.on('player_rejoined', (data) => {
			console.log('Player rejoined:', data.playerId);
		});

		this.socket.on('player_update', (data) => {
			if (this.onPlayerUpdate) this.onPlayerUpdate(data);
		});

		this.socket.on('game_started', (data) => {
			this.isInGame = true;
			if (this.onGameStarted) this.onGameStarted(data);
		});

		this.socket.on('game_action', (data) => {
			if (data.action === 'game_over') {
				this.isInGame = false;
			}
			if (this.onGameAction) this.onGameAction(data);
		});

		this.socket.on('error', (data) => {
			console.error('Socket error:', data);
			// If we failed to join/create, reset state if necessary
			if (data.message === 'Room not found' || data.message === 'Room is full' || data.message === 'Game already started') {
				this.currentRoomId = null;
				this.isHost = false;
				this.isInGame = false;
			}
			if (this.onError) this.onError(data);
		});
	}

	public createRoom(playerName: string, scoreGoal: number) {
		this.isInGame = false;
		this.socket.emit('create_room', { playerName, scoreGoal });
	}

	public joinRoom(roomId: string, playerName: string) {
		roomId = roomId.toUpperCase();
		this.currentRoomId = roomId;
		this.isHost = false;
		this.isInGame = false;
		this.socket.emit('join_room', { roomId, playerName });
	}

	public rejoinGame(roomId: string) {
		this.currentRoomId = roomId;
		this.isInGame = true;
		this.socket.emit('rejoin_game', { roomId });
	}

	public sendStateSync(targetId: string, roomId: string, state: any) {
		this.socket.emit('state_sync', { targetId, roomId, state });
	}

	public setReady(roomId: string, isReady: boolean) {
		this.socket.emit('player_ready', { roomId, isReady });
	}

	public startGame(roomId: string) {
		this.socket.emit('start_game', { roomId });
	}

	public sendGameAction(roomId: string, action: string, payload: any) {
		this.socket.emit('game_action', { roomId, action, payload });
	}

	public findMatch(playerName: string, scoreGoal?: number) {
		this.socket.emit('find_match', { playerName, scoreGoal });
	}

	public leaveRoom() {
		this.socket.emit('leave_room');
		this.currentRoomId = null;
		this.isHost = false;
		this.isRandom = false;
		this.isInGame = false;
	}

	public updatePhrases(phrases: string[]) {
		this.socket.emit('update_phrases', { phrases });
	}

	public sendReaction(content: string, type: 'text' | 'emoji') {
		if (!this.currentRoomId) return;
		this.socket.emit('send_reaction', { roomId: this.currentRoomId, content, type });
	}

	public getUserId(): string | null {
		try {
			const saved = localStorage.getItem(FARKLE_USER_ID);
			return saved;
		} catch (err) {
			console.warn('Could not access localStorage for userId', err);
			return null;
		}
	}

	public getSocketId() {
		return this.socket.id;
	}
}
