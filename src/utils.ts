export function interval(callback: (endInterval: () => void) => void, delay: number) {
	return new Promise<void>((resolve) => {
		let interval: any;
		const endInterval = () => {
			resolve();
			clearInterval(interval);
		};
		interval = setInterval(() => {
			callback(endInterval);
		}, delay);
	});
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
