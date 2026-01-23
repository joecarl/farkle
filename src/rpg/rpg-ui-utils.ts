// Format I,J,K -> SetID, Row, Col
export function parseImageRef(ref?: string, prefix = 'tiles') {
	if (!ref) return null;
	// Support both comma and hyphen separators
	const normalized = ref.replace(/-/g, ',');
	const parts = normalized.split(',');
	if (parts.length < 3) return null;

	const set = parseInt(parts[0]);
	const row = parseInt(parts[1]) - 1;
	const col = parseInt(parts[2]) - 1;

	// Assuming fixed grid size for display calculation if needed,
	// but with background-position we often use percentages or pixels.
	// If user says "paquetes de 5x5", it implies a grid relative to the full image.
	// Let's assume the Sprite Sheet is 5 cols x 5 rows.
	// Percentage step = 100 / (5 - 1) = 25%.  (For 0..4 indices).
	// Or if using pixels, we need tile size.
	// Let's try percentage if we assume 5x5 grid exactly filling the image.
	// background-position: X% Y%
	// X = col * (100 / (cols - 1)) if cols > 1

	// Warning: CSS background-position percentages refer to "aligning the X% point of the image with the X% point of the container".
	// For sprites, usually pixels are safer if we know the size, OR we assume standard equal grid.
	// If it's a 5x5 grid:
	// Col 0: 0%
	// Col 1: 25%
	// Col 2: 50%
	// Col 3: 75%
	// Col 4: 100%

	const size = 5;
	const xPos = size > 1 ? (col / (size - 1)) * 100 : 0;
	const yPos = size > 1 ? (row / (size - 1)) * 100 : 0;

	const url = `/assets/rpg/${prefix}/${prefix}${set}.png`;

	return {
		backgroundImage: `url('${url}')`,
		backgroundPosition: `${xPos}% ${yPos}%`,
		backgroundSize: `${size * 100}% ${size * 100}%`, // Zoom in so one cell fills container?
		// No, background-size is relative to the image itself usually or container.
		// If we want 1/5th of the image to show, we need background-size: 500% 500%.
	};
}

export function getImageStyle(ref?: string, prefix = 'tiles') {
	if (!ref) return {};
	const parsed = parseImageRef(ref, prefix);
	if (!parsed) return {};

	// For background-size: 500% means the image is 5x wider than the container.
	// If container is 1 tile size, and image has 5 tiles, then yes 500%.
	const size = 5;

	return {
		backgroundImage: parsed.backgroundImage,
		backgroundPosition: parsed.backgroundPosition,
		backgroundSize: `${size * 115}%`, // proportional
		backgroundRepeat: 'no-repeat',
	};
}
