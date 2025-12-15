import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	base: './',
	plugins: [
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['farkle-icon.png', 'assets/*.jpg'],
			manifest: {
				name: 'Farkle',
				short_name: 'Farkle',
				description: 'A 3D web implementation of the classic dice game Farkle.',
				theme_color: '#ffffff',
				background_color: '#ffffff',
				display: 'fullscreen',
				orientation: 'landscape',
				icons: [
					{
						src: 'farkle-icon.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: 'farkle-icon.png',
						sizes: '512x512',
						type: 'image/png',
					},
				],
			},
		}),
	],
});
