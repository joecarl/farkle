import express from 'express';
import { getTileAt, getNPCsAt, getRPGProfile, updateRPGProfileLocation, getAllItems, getInventory } from './rpg_db';

const router = express.Router();

router.get('/state', (req, res) => {
	const userId = req.headers['x-user-id'];
	if (!userId || typeof userId !== 'string') {
		res.status(401).json({ error: 'Missing user ID' });
		return;
	}

	const profile = getRPGProfile(userId) as any;
	const inventory = getInventory(userId, 'player');
	const tile = getTileAt(profile.x, profile.y);
	const npcs = getNPCsAt(profile.x, profile.y);

	// Get adjacent tiles for navigation preview
	const adjacent = {
		n: getTileAt(profile.x, profile.y + 1),
		s: getTileAt(profile.x, profile.y - 1),
		e: getTileAt(profile.x + 1, profile.y),
		w: getTileAt(profile.x - 1, profile.y),
	};

	res.json({
		profile: { ...profile, inventory }, // Merge inventory into profile for backward compat or ease of use
		tile:
			tile ||
			({
				name: 'Wilderness',
				description: 'Unknown territory.',
				x: profile.x,
				y: profile.y,
				image_url: null,
				actions_json: '[]',
			} as any),
		npcs,
		adjacent,
	});
});

router.post('/move', (req, res) => {
	const userId = req.headers['x-user-id'];
	const { x, y } = req.body;

	if (!userId || typeof userId !== 'string') {
		res.status(401).json({ error: 'Missing user ID' });
		return;
	}

	// Here we can validation logic (distance, time, etc.)
	// For now, just teleport
	updateRPGProfileLocation(userId, x, y);

	const tile = getTileAt(x, y);
	const npcs = getNPCsAt(x, y);

	res.json({
		success: true,
		x,
		y,
		tile:
			tile ||
			({
				name: 'Wilderness',
				description: 'Unknown territory.',
				x: x,
				y: y,
				image_url: null,
				actions_json: '[]',
			} as any),
		npcs,
	});
});

router.get('/items', (req, res) => {
	const items = getAllItems();
	console.log(`Fetched ${items.length} RPG items`, items);
	res.json(items);
});

export default router;
