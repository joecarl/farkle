import { io, Socket } from 'socket.io-client';
import { DEFAULT_SCORE_GOAL } from './logic';
import { getPathname } from './utils';

const SERVER_URL = import.meta.env.DEV ? 'http://localhost:3000' : location.origin;

export class OnlineManager {
	private socket: Socket;
	private static instance: OnlineManager;

	public currentRoomId: string | null = null;
	public isHost: boolean = false;
	public scoreGoal: number = DEFAULT_SCORE_GOAL;

	public onRoomCreated?: (data: { roomId: string; players: any[]; scoreGoal: number }) => void;
	public onPlayerJoined?: (data: { players: any[]; scoreGoal?: number }) => void;
	public onPlayerUpdate?: (data: { players: any[] }) => void;
	public onGameStarted?: (data: { players: any[]; currentPlayerIndex: number; scoreGoal: number }) => void;
	public onGameAction?: (data: { action: string; payload: any; senderId: string }) => void;
	public onError?: (data: { message: string }) => void;

	private constructor() {
		const socketPath = getPathname() + '/socket.io';
		this.socket = io(SERVER_URL, { path: socketPath });
		this.setupListeners();
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
		});

		this.socket.on('room_created', (data) => {
			this.currentRoomId = data.roomId;
			this.isHost = true;
			this.scoreGoal = data.scoreGoal;
			if (this.onRoomCreated) this.onRoomCreated(data);
		});

		this.socket.on('player_joined', (data) => {
			if (data.scoreGoal) this.scoreGoal = data.scoreGoal;
			if (this.onPlayerJoined) this.onPlayerJoined(data);
		});

		this.socket.on('player_left', (data) => {
			if (this.onPlayerJoined) this.onPlayerJoined(data); // Reuse same callback for list update
		});

		this.socket.on('player_update', (data) => {
			if (this.onPlayerUpdate) this.onPlayerUpdate(data);
		});

		this.socket.on('game_started', (data) => {
			if (this.onGameStarted) this.onGameStarted(data);
		});

		this.socket.on('game_action', (data) => {
			if (this.onGameAction) this.onGameAction(data);
		});

		this.socket.on('error', (data) => {
			console.error('Socket error:', data);
			// If we failed to join/create, reset state if necessary
			if (data.message === 'Room not found' || data.message === 'Room is full' || data.message === 'Game already started') {
				this.currentRoomId = null;
				this.isHost = false;
			}
			if (this.onError) this.onError(data);
		});
	}

	public createRoom(playerName: string, scoreGoal: number) {
		this.socket.emit('create_room', { playerName, scoreGoal });
	}

	public joinRoom(roomId: string, playerName: string) {
		this.currentRoomId = roomId;
		this.isHost = false;
		this.socket.emit('join_room', { roomId, playerName });
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

	public leaveRoom() {
		this.currentRoomId = null;
		this.isHost = false;
		// Optional: emit 'leave_room' if server supports it,
		// currently server handles disconnect or game_over
	}

	public getSocketId() {
		return this.socket.id;
	}
}
