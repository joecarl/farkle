import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { logConnection, createGameRecord, endGameRecord, getStats } from './db';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: '*', // Allow all for dev, restrict in prod
		methods: ['GET', 'POST'],
	},
});

app.use(cors());
app.use(express.json());

// API to get stats
app.get('/api/stats', (req, res) => {
	res.json(getStats());
});

interface Room {
	id: string;
	players: { id: string; name: string; ready: boolean }[];
	gameStarted: boolean;
	gameId?: number | bigint;
	gameState?: any;
	scoreGoal: number;
}

const rooms: Record<string, Room> = {};

io.on('connection', (socket: Socket) => {
	const clientIp = socket.handshake.address;
	console.log(`Client connected: ${socket.id} from ${clientIp}`);
	logConnection(clientIp, socket.id, 'connect');

	socket.on('create_room', (data: { playerName: string; scoreGoal?: number }) => {
		const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
		rooms[roomId] = {
			id: roomId,
			players: [{ id: socket.id, name: data.playerName, ready: false }],
			gameStarted: false,
			scoreGoal: data.scoreGoal || 10000,
		};
		socket.join(roomId);
		socket.emit('room_created', { roomId, players: rooms[roomId].players, scoreGoal: rooms[roomId].scoreGoal });
		console.log(`Room created: ${roomId} by ${data.playerName} with score goal ${rooms[roomId].scoreGoal}`);
	});

	// Simple matchmaking: find an open room or create one
	// TODO: no mezclar con rooms privadas
	socket.on('find_match', (data: { playerName: string; scoreGoal?: number }) => {
		// Try to find a room that's not started and not full
		const candidate = Object.values(rooms).find((r) => !r.gameStarted && r.players.length < 6);
		if (candidate) {
			candidate.players.push({ id: socket.id, name: data.playerName, ready: false });
			socket.join(candidate.id);
			io.to(candidate.id).emit('player_joined', { players: candidate.players, scoreGoal: candidate.scoreGoal, roomId: candidate.id });
			console.log(`${data.playerName} matched into room ${candidate.id}`);
		} else {
			const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
			rooms[roomId] = {
				id: roomId,
				players: [{ id: socket.id, name: data.playerName, ready: false }],
				gameStarted: false,
				scoreGoal: data.scoreGoal || 10000,
			};
			socket.join(roomId);
			socket.emit('room_created', { roomId, players: rooms[roomId].players, scoreGoal: rooms[roomId].scoreGoal });
			console.log(`Matchmaking created room: ${roomId} for ${data.playerName}`);
		}
	});

	socket.on('join_room', (data: { roomId: string; playerName: string }) => {
		const room = rooms[data.roomId];
		if (room) {
			if (room.gameStarted) {
				socket.emit('error', { message: 'Game already started' });
				return;
			}
			if (room.players.length >= 6) {
				// Max players
				socket.emit('error', { message: 'Room is full' });
				return;
			}

			room.players.push({ id: socket.id, name: data.playerName, ready: false });
			socket.join(data.roomId);
			io.to(data.roomId).emit('player_joined', { players: room.players, scoreGoal: room.scoreGoal });
			console.log(`${data.playerName} joined room ${data.roomId}`);
		} else {
			socket.emit('error', { message: 'Room not found' });
		}
	});

	socket.on('player_ready', (data: { roomId: string; isReady: boolean }) => {
		const room = rooms[data.roomId];
		if (room) {
			const player = room.players.find((p) => p.id === socket.id);
			if (player) {
				player.ready = data.isReady;
				io.to(data.roomId).emit('player_update', { players: room.players });

				// Check if all ready to start
				if (room.players.length >= 2 && room.players.every((p) => p.ready)) {
					// Host (first player) usually triggers start, or auto start
					io.to(data.roomId).emit('ready_to_start', { canStart: true });
				}
			}
		}
	});

	socket.on('start_game', (data: { roomId: string }) => {
		const room = rooms[data.roomId];
		if (room && room.players[0].id === socket.id) {
			// Only host can start
			room.gameStarted = true;
			room.gameId = createGameRecord(room.players);
			io.to(data.roomId).emit('game_started', {
				players: room.players,
				currentPlayerIndex: 0,
				scoreGoal: room.scoreGoal,
			});
		}
	});

	// Game actions relay
	socket.on('game_action', (data: { roomId: string; action: string; payload: any }) => {
		const room = rooms[data.roomId];
		if (room) {
			// Broadcast action to everyone else in the room
			socket.to(data.roomId).emit('game_action', {
				action: data.action,
				payload: data.payload,
				senderId: socket.id,
			});

			// If game over
			if (data.action === 'game_over') {
				console.log(`Game over in room ${data.roomId}`);
				if (room.gameId) {
					const finalPlayers = data.payload?.players ?? room.players;
					const winnerName = data.payload?.winnerName ?? null;
					endGameRecord(room.gameId, winnerName, finalPlayers);
				}
				delete rooms[data.roomId]; // Cleanup
			}
		}
	});

	socket.on('disconnect', () => {
		console.log(`Client disconnected: ${socket.id}`);
		logConnection(clientIp, socket.id, 'disconnect');

		// Handle cleanup if player was in a room
		for (const roomId in rooms) {
			const room = rooms[roomId];
			const playerIndex = room.players.findIndex((p) => p.id === socket.id);
			if (playerIndex !== -1) {
				room.players.splice(playerIndex, 1);
				io.to(roomId).emit('player_left', { players: room.players });

				if (room.players.length === 0) {
					delete rooms[roomId];
				}
				break;
			}
		}
	});
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
