import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import {
	logConnection,
	createGameRecord,
	endGameRecord,
	getUser,
	createUser,
	touchUser,
	updateUserPreferences,
	updateDisplayName,
	getPlayerAchievements,
	getPlayerStats,
	unlockAchievement,
} from './db';
import crypto from 'crypto';

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

// Public API to list available rooms (joinable non-random lobbies)
app.get('/api/rooms', (req, res) => {
	const list = Object.values(rooms)
		.filter((r) => !r.gameStarted && !r.isRandom && r.players.length < MAX_PLAYERS_PER_ROOM)
		.map((r) => ({
			id: r.id,
			players: r.players.length,
			scoreGoal: r.scoreGoal,
			hostName: r.players[0]?.name ?? 'Host',
		}));
	res.json(list);
});

const MAX_PLAYERS_PER_ROOM = 8;

interface Room {
	id: string;
	players: { id: string; name: string; ready: boolean; disconnected?: boolean }[];
	gameStarted: boolean;
	gameId?: number | bigint;
	gameState?: any;
	scoreGoal: number;
	isRandom?: boolean;
}

const rooms: Record<string, Room> = {};
const usersSocketMap: Record<string, string> = {}; // userId -> socketId

function printRooms() {
	console.log('Current Rooms:');
	for (const roomId in rooms) {
		const room = rooms[roomId];
		let players = '';
		room.players.forEach((p) => {
			players += `${p.name}${p.disconnected ? ' (disconnected)' : ''}, `;
		});
		console.log(`- Room ${roomId}: started=${room.gameStarted}, players(${players.length})=[${players}]`);
	}
}

function getPublicRooms() {
	return Object.values(rooms)
		.filter((r) => !r.gameStarted && !r.isRandom && r.players.length < MAX_PLAYERS_PER_ROOM)
		.map((r) => ({
			id: r.id,
			players: r.players.length,
			scoreGoal: r.scoreGoal,
			hostName: r.players[0]?.name ?? 'Host',
		}));
}

function broadcastRooms() {
	try {
		io.emit('rooms_updated', getPublicRooms());
	} catch (e) {
		console.error('Failed to broadcast rooms', e);
	}
}

// Note: per-connection bound user id is stored locally inside the connection handler.

io.on('connection', (socket: Socket) => {
	const clientIp = socket.handshake.address;
	console.log(`Client connected: ${socket.id} from ${clientIp}`);
	logConnection(clientIp, socket.id, 'connect');

	// Per-connection bound user id (set after identify)
	let boundUserId: string | undefined;

	// Helper to resolve a user id for this socket (fallback to socket.id)
	const getUserId = () => {
		if (!boundUserId) {
			socket.emit('error', { message: 'This request requires identification. Please identify first.' });
			return null;
		}
		return boundUserId;
	};

	// Client should emit 'identify' on connect with optional { userId }
	socket.on('identify', (data: { userId?: string }) => {
		let userId = data?.userId;
		let ongoingRoom: Room | null = null;
		if (userId) {
			// If client provided an id, validate it exists in DB. Do NOT create a new one here.
			const existing = getUser(userId);
			if (!existing) {
				socket.emit('error', { message: 'User not found' });
				console.log(`Socket ${socket.id} provided unknown user id ${userId}`);
				return;
			}
			// Update last seen
			touchUser(userId);
			console.log(`Socket ${socket.id} identified as existing user ${userId}`);

			// Check if this user is part of any ongoing game (so they can be prompted to rejoin)
			ongoingRoom =
				Object.values(rooms).find(
					(r) => r.players.some((p) => p.id === userId) && r.players.some((p) => !p.disconnected && p.id !== userId) && r.gameStarted
				) ?? null;
		} else {
			// Generate a new random id and persist
			userId = crypto.randomBytes(12).toString('hex');
			createUser(userId);
			console.log(`Socket ${socket.id} assigned new user id ${userId}`);
		}

		boundUserId = userId;
		usersSocketMap[userId] = socket.id;

		// Fetch fresh full user data to return
		const freshUser = getUser(userId)!;

		// Acknowledge identification and return full profile
		socket.emit('identified', {
			userId,
			profile: {
				displayName: freshUser.display_name,
				wins: freshUser.wins,
				losses: freshUser.losses,
				totalScore: freshUser.total_score,
				maxScore: freshUser.max_score,
				maxTurnScore: freshUser.max_turn_score,
				maxRollScore: freshUser.max_roll_score,
				preferences: freshUser.preferences_json ? JSON.parse(freshUser.preferences_json) : {},
			},
		});

		if (ongoingRoom) {
			console.log(`Socket ${socket.id} has an ongoing game in room ${ongoingRoom.id}, prompting to rejoin`);
			socket.emit('rejoin_prompt', {
				roomId: ongoingRoom.id,
				players: ongoingRoom.players,
				scoreGoal: ongoingRoom.scoreGoal,
				gameStarted: ongoingRoom.gameStarted,
				gameId: ongoingRoom.gameId ?? null,
			});
		}
	});

	socket.on('update_phrases', (data: { phrases: string[] }) => {
		const userId = getUserId();
		if (!userId) return;

		const user = getUser(userId);
		let prefs: any = {};
		if (user && user.preferences_json) {
			try {
				prefs = JSON.parse(user.preferences_json);
			} catch (e) {}
		}

		prefs['phrases'] = data.phrases;
		updateUserPreferences(userId, prefs);
		socket.emit('phrases_updated', { phrases: data.phrases });
		// Send updated profile as well to keep client sync simpler if they listen to 'profile_updated' (future)
	});

	socket.on('get_achievements', () => {
		const userId = getUserId();
		if (!userId) return;
		const achievements = getPlayerAchievements(userId);
		socket.emit('achievements_data', { achievements });
	});

	socket.on('get_stats', () => {
		const userId = getUserId();
		if (!userId) return;
		const stats = getPlayerStats(userId);
		socket.emit('stats_data', { stats });
	});

	socket.on('send_reaction', (data: { roomId: string; content: string; type: 'text' | 'emoji' }) => {
		const userId = getUserId();
		if (!userId) return;
		const user = getUser(userId);
		const userName = user ? user.display_name || 'Unknown' : 'Unknown';
		io.to(data.roomId).emit('reaction_received', {
			senderId: userId,
			senderName: userName,
			content: data.content,
			type: data.type,
		});
	});

	socket.on('create_room', (data: { playerName: string; scoreGoal?: number }) => {
		const roomId = Math.random().toString(36).substring(2, 7).toUpperCase().replaceAll(/[0O]/g, 'X');
		const userId = getUserId();
		if (!userId) return;

		updateDisplayName(userId, data.playerName);

		rooms[roomId] = {
			id: roomId,
			players: [{ id: userId, name: data.playerName, ready: false }],
			gameStarted: false,
			scoreGoal: data.scoreGoal || 10000,
			isRandom: false,
		};
		socket.join(roomId);
		socket.emit('room_created', { roomId, players: rooms[roomId].players, scoreGoal: rooms[roomId].scoreGoal, isRandom: false });
		console.log(`Room created: ${roomId} by ${data.playerName} with score goal ${rooms[roomId].scoreGoal}`);
		// Notify clients about updated rooms
		broadcastRooms();
	});

	// Random matchmaking: independent pool, 2 players, 10000 points, auto-start
	socket.on('find_match', (data: { playerName: string }) => {
		// Try to find a random room that's not started and not full
		const candidate = Object.values(rooms).find((r) => r.isRandom && !r.gameStarted && r.players.length < 2);

		const userId = getUserId();
		if (!userId) return;

		updateDisplayName(userId, data.playerName);

		if (candidate) {
			candidate.players.push({ id: userId, name: data.playerName, ready: true }); // Auto-ready
			socket.join(candidate.id);
			io.to(candidate.id).emit('player_joined', { players: candidate.players, scoreGoal: candidate.scoreGoal, roomId: candidate.id, isRandom: true });
			console.log(`${data.playerName} matched into random room ${candidate.id}`);

			// Auto-start if full (2 players)
			if (candidate.players.length === 2) {
				candidate.gameStarted = true;
				candidate.gameId = createGameRecord(candidate.players, candidate.scoreGoal);
				io.to(candidate.id).emit('game_started', {
					players: candidate.players,
					currentPlayerIndex: 0,
					scoreGoal: candidate.scoreGoal,
				});
			}
		} else {
			const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
			rooms[roomId] = {
				id: roomId,
				players: [{ id: userId, name: data.playerName, ready: true }], // Auto-ready
				gameStarted: false,
				scoreGoal: 10000, // Fixed for random
				isRandom: true,
			};
			socket.join(roomId);
			socket.emit('room_created', { roomId, players: rooms[roomId].players, scoreGoal: rooms[roomId].scoreGoal, isRandom: true });
			console.log(`Matchmaking created random room: ${roomId} for ${data.playerName}`);
			// random rooms are not listed publicly
		}
	});

	socket.on('join_room', (data: { roomId: string; playerName: string }) => {
		const userId = getUserId();
		if (!userId) return;

		updateDisplayName(userId, data.playerName);

		const room = rooms[data.roomId];
		if (room) {
			if (room.isRandom) {
				socket.emit('error', { message: 'Cannot join random rooms manually' });
				return;
			}
			if (room.gameStarted) {
				socket.emit('error', { message: 'Game already started' });
				return;
			}
			if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
				// Max players
				socket.emit('error', { message: 'Room is full' });
				return;
			}

			room.players.push({ id: userId, name: data.playerName, ready: false });
			socket.join(data.roomId);
			io.to(data.roomId).emit('player_joined', { players: room.players, scoreGoal: room.scoreGoal, isRandom: false });
			console.log(`${data.playerName} joined room ${data.roomId}`);
			// Notify public list changed
			broadcastRooms();
		} else {
			socket.emit('error', { message: 'Room not found' });
		}
	});

	socket.on('leave_room', () => {
		const userId = getUserId();
		if (!userId) return;
		// Find room user is in
		for (const roomId in rooms) {
			const room = rooms[roomId];
			const playerIndex = room.players.findIndex((p) => p.id === userId);
			if (playerIndex !== -1) {
				room.players.splice(playerIndex, 1);
				socket.leave(roomId);
				io.to(roomId).emit('player_left', { players: room.players });
				console.log(`User ${userId} left room ${roomId}`);

				if (room.players.length === 0) {
					delete rooms[roomId];
					console.log(`Room ${roomId} deleted (empty)`);
					// Public list changed
					broadcastRooms();
				}
				break;
			}
		}
	});

	socket.on('rejoin_game', (data: { roomId: string }) => {
		const room = rooms[data.roomId];
		const userId = getUserId();
		if (!userId) return;
		if (room && room.gameStarted) {
			const player = room.players.find((p) => p.id === userId);
			if (player) {
				player.disconnected = false;
				socket.join(data.roomId);

				// Notify others and request state sync
				socket.to(data.roomId).emit('player_rejoined', { playerId: userId });

				// Ask one of the other players for the state
				const otherPlayer = room.players.find((p) => p.id !== userId && !p.disconnected);
				if (otherPlayer) {
					// We can't easily target by socket ID since we don't store it in room.players (we store user ID)
					// But we can broadcast to room "request_state_sync" and anyone can answer
					socket.to(data.roomId).emit('request_state_sync', { requesterId: userId });
					console.log(`Requesting state sync for user ${userId} in room ${data.roomId} from other players`);
				} else {
					// No one else? Maybe game over or wait.
					console.log(`User ${userId} rejoined room ${data.roomId} but no other players to sync from`);
				}
				console.log(`User ${userId} rejoined room ${data.roomId}`);
			}
		}
	});

	socket.on('state_sync', (data: { targetId: string; roomId: string; state: any }) => {
		// Relay state to the target user
		// We need to find the socket for targetId.
		// Since we don't have a map of userId -> socket, we can broadcast to room with "for: targetId"
		// Or we can iterate sockets.
		// Broadcasting to room is easier if we trust clients to ignore if not for them.
		// But better: The socket that sent this is in the room. The target is also in the room.
		// We can emit to the room "state_sync" with targetId.
		const userId = getUserId();
		if (!userId) return;
		// Find room
		const room = rooms[data.roomId];
		if (room && room.players.some((p) => p.id === userId)) {
			io.to(room.id).emit('state_sync', { state: data.state, targetId: data.targetId });
		}
	});

	socket.on('player_ready', (data: { roomId: string; isReady: boolean }) => {
		const userId = getUserId();
		if (!userId) return;
		const room = rooms[data.roomId];
		if (room) {
			const player = room.players.find((p) => p.id === userId);
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
		// readiness doesn't affect listing but emit updated rooms to be safe
		broadcastRooms();
	});

	socket.on('start_game', (data: { roomId: string }) => {
		const room = rooms[data.roomId];
		const userId = getUserId();
		if (!userId) return;
		if (room && room.players[0].id === userId) {
			// Only host can start
			room.gameStarted = true;
			room.gameId = createGameRecord(room.players, room.scoreGoal);
			io.to(data.roomId).emit('game_started', {
				players: room.players,
				currentPlayerIndex: 0,
				scoreGoal: room.scoreGoal,
			});
			// Room no longer joinable -> update public list
			broadcastRooms();
		}
	});

	// Game actions relay
	socket.on('game_action', (data: { roomId: string; action: string; payload: any }) => {
		const userId = getUserId();
		if (!userId) return;
		const room = rooms[data.roomId];
		if (room) {
			// Broadcast action to everyone else in the room
			socket.to(data.roomId).emit('game_action', {
				action: data.action,
				payload: data.payload,
				senderId: userId,
			});

			// If game over
			if (data.action === 'game_over') {
				console.log(`Game over in room ${data.roomId}`);
				if (room.gameId) {
					const finalPlayers = data.payload?.players ?? room.players;
					const winnerName = data.payload?.winnerName ?? null;
					const winnerId = data.payload?.winnerId ?? null;
					console.log('GAME OVER', data.payload);
					endGameRecord(room.gameId, winnerName, finalPlayers, winnerId);
				}
				delete rooms[data.roomId]; // Cleanup
				// Room removed -> update public list
				broadcastRooms();
			}
		}
	});

	socket.on('disconnect', () => {
		console.log(`Client disconnected: ${socket.id}`);
		logConnection(clientIp, socket.id, 'disconnect');

		// boundUserId is per-connection and will be garbage-collected when this handler ends
		const userId = getUserId();
		if (!userId) return;

		// Handle cleanup if player was in a room
		for (const roomId in rooms) {
			const room = rooms[roomId];
			const player = room.players.find((p) => p.id === userId);

			if (!player) continue;
			if (room.gameStarted) {
				// Mark as disconnected but keep in room for reconnection
				player.disconnected = true;
				io.to(roomId).emit('player_disconnected', { playerId: userId });
				console.log(`Player ${userId} disconnected from active game in room ${roomId}`);
			} else {
				// Not started, remove completely
				const playerIndex = room.players.indexOf(player);
				room.players.splice(playerIndex, 1);
				io.to(roomId).emit('player_left', { players: room.players });
				console.log(`Player ${userId} removed from lobby ${roomId}`);

				if (room.players.length === 0) {
					delete rooms[roomId];
					console.log(`Room ${roomId} deleted (empty)`);
					// reflect deletion publicly
					broadcastRooms();
				}
			}
		}
		printRooms();
	});
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
