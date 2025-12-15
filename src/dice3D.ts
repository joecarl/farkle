import * as THREE from 'three';

import tableTextureUrl from './assets/table.jpg';

interface DiceMeshData {
	mesh: THREE.Mesh;
	position3D: THREE.Vector3;
}

export class Dice3D {
	private canvas: HTMLCanvasElement;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private diceMeshes: DiceMeshData[] = [];
	private raycaster: THREE.Raycaster;
	private mouse: THREE.Vector2;
	private onTextureLoaded?: () => void;

	constructor(canvas: HTMLCanvasElement, transparent: boolean = false, onTextureLoaded?: () => void) {
		this.canvas = canvas;
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();
		this.onTextureLoaded = onTextureLoaded;

		// Setup scene
		this.scene = new THREE.Scene();
		if (!transparent) {
			this.scene.background = new THREE.Color(0xffffff);
		}

		// Setup camera with angle (not purely from top)
		this.camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 1000);
		this.camera.position.set(1, 12, 6);
		this.camera.lookAt(0, 0, 0);

		// Setup renderer
		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: transparent,
		});
		this.renderer.setSize(canvas.width, canvas.height);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		if (transparent) {
			this.renderer.setClearColor(0x000000, 0);
		}

		// Add lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(5, 10, 7);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.width = 2048;
		directionalLight.shadow.mapSize.height = 2048;
		directionalLight.shadow.camera.left = -25;
		directionalLight.shadow.camera.right = 25;
		directionalLight.shadow.camera.top = 25;
		directionalLight.shadow.camera.bottom = -25;
		directionalLight.shadow.camera.near = 0.1;
		directionalLight.shadow.camera.far = 100;
		this.scene.add(directionalLight);

		this.createTable();
	}

	private createTable(): void {
		const loader = new THREE.TextureLoader();
		const texture = loader.load(tableTextureUrl, () => {
			if (this.onTextureLoaded) {
				this.onTextureLoaded();
			}
		});
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(1, 1);
		texture.colorSpace = THREE.SRGBColorSpace;

		const size = 4.5;
		const geometry = new THREE.PlaneGeometry(size * 6.12, size * 4.08);
		const material = new THREE.MeshStandardMaterial({
			map: texture,
			color: 0xffffff, // Base color white to multiply with texture
			roughness: 0.8,
			metalness: 0.1,
		});

		const plane = new THREE.Mesh(geometry, material);
		plane.rotation.x = -Math.PI / 2;
		plane.position.y = -0.5;
		plane.receiveShadow = true;
		this.scene.add(plane);
	}

	public addDice(position3D: THREE.Vector3): number {
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const materials = this.createDiceMaterials();
		const mesh = new THREE.Mesh(geometry, materials);
		mesh.position.copy(position3D);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		this.scene.add(mesh);

		const diceData: DiceMeshData = { mesh, position3D };
		this.diceMeshes.push(diceData);
		return this.diceMeshes.length - 1;
	}

	private createDiceMaterials(): THREE.MeshStandardMaterial[] {
		const textures = this.createDiceTextures();
		return textures.map((texture) => {
			return new THREE.MeshStandardMaterial({
				map: texture,
				roughness: 0.4,
				metalness: 0.1,
			});
		});
	}

	private createDiceTextures(): THREE.CanvasTexture[] {
		const size = 256;
		const textures: THREE.CanvasTexture[] = [];

		// Caras del dado en orden: [+X(derecha), -X(izquierda), +Y(arriba), -Y(abajo), +Z(frente), -Z(atrás)]
		// Queremos: [3, 4, 5, 2, 1, 6]
		const faceValues = [3, 4, 5, 2, 1, 6];

		for (const value of faceValues) {
			const canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext('2d');
			if (!ctx) continue;

			// Fondo blanco
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, size, size);

			// Borde
			ctx.strokeStyle = '#cccccc';
			ctx.lineWidth = 3;
			ctx.strokeRect(0, 0, size, size);

			// Dibujar puntos
			this.drawDots(ctx, size, value);

			const texture = new THREE.CanvasTexture(canvas);
			texture.needsUpdate = true;
			textures.push(texture);
		}

		return textures;
	}

	private drawDots(ctx: CanvasRenderingContext2D, size: number, value: number): void {
		ctx.fillStyle = '#000000';
		const dotRadius = size / 12;
		const quarter = size / 4;
		const center = size / 2;

		const drawDot = (x: number, y: number) => {
			ctx.beginPath();
			ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
			ctx.fill();
		};

		switch (value) {
			case 1:
				drawDot(center, center);
				break;
			case 2:
				drawDot(quarter, quarter);
				drawDot(center + quarter, center + quarter);
				break;
			case 3:
				drawDot(quarter, quarter);
				drawDot(center, center);
				drawDot(center + quarter, center + quarter);
				break;
			case 4:
				drawDot(quarter, quarter);
				drawDot(quarter, center + quarter);
				drawDot(center + quarter, quarter);
				drawDot(center + quarter, center + quarter);
				break;
			case 5:
				drawDot(quarter, quarter);
				drawDot(quarter, center + quarter);
				drawDot(center, center);
				drawDot(center + quarter, quarter);
				drawDot(center + quarter, center + quarter);
				break;
			case 6:
				drawDot(quarter, quarter);
				drawDot(quarter, center);
				drawDot(quarter, center + quarter);
				drawDot(center + quarter, quarter);
				drawDot(center + quarter, center);
				drawDot(center + quarter, center + quarter);
				break;
		}
	}

	public setRotation(index: number, x: number, y: number, z: number): void {
		if (index >= 0 && index < this.diceMeshes.length) {
			this.diceMeshes[index].mesh.rotation.x = x;
			this.diceMeshes[index].mesh.rotation.y = y;
			this.diceMeshes[index].mesh.rotation.z = z;
		}
	}

	public rotate(index: number, dx: number, dy: number, dz: number): void {
		if (index >= 0 && index < this.diceMeshes.length) {
			this.diceMeshes[index].mesh.rotation.x += dx;
			this.diceMeshes[index].mesh.rotation.y += dy;
			this.diceMeshes[index].mesh.rotation.z += dz;
		}
	}

	public setPosition(index: number, position: THREE.Vector3): void {
		if (index >= 0 && index < this.diceMeshes.length) {
			this.diceMeshes[index].mesh.position.copy(position);
			this.diceMeshes[index].position3D.copy(position);
		}
	}

	public render(): void {
		this.renderer.render(this.scene, this.camera);
	}

	public resize(width: number, height: number): void {
		this.canvas.width = width;
		this.canvas.height = height;
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	}

	public getIntersectedDice(canvasX: number, canvasY: number): number | null {
		this.mouse.x = (canvasX / this.canvas.width) * 2 - 1;
		this.mouse.y = -(canvasY / this.canvas.height) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera);

		const intersects = this.raycaster.intersectObjects(this.diceMeshes.map((d) => d.mesh));

		if (intersects.length > 0) {
			const object = intersects[0].object;
			const index = this.diceMeshes.findIndex((d) => d.mesh === object);
			return index;
		}
		return null;
	}

	public getPlaneIntersection(canvasX: number, canvasY: number): THREE.Vector3 | null {
		this.mouse.x = (canvasX / this.canvas.width) * 2 - 1;
		this.mouse.y = -(canvasY / this.canvas.height) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera);

		const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
		const target = new THREE.Vector3();
		const intersection = this.raycaster.ray.intersectPlane(plane, target);

		return intersection;
	}

	public getPosition(index: number): THREE.Vector3 | null {
		if (index >= 0 && index < this.diceMeshes.length) {
			return this.diceMeshes[index].position3D.clone();
		}
		return null;
	}

	public getScreenPosition(index: number): { x: number; y: number } | null {
		if (index >= 0 && index < this.diceMeshes.length) {
			const mesh = this.diceMeshes[index].mesh;
			const vector = mesh.position.clone();
			vector.project(this.camera);

			const x = (vector.x * 0.5 + 0.5) * this.canvas.width;
			const y = (-(vector.y * 0.5) + 0.5) * this.canvas.height;

			return { x, y };
		}
		return null;
	}

	public setDiceState(index: number, selected: boolean, locked: boolean): void {
		if (index >= 0 && index < this.diceMeshes.length) {
			const mesh = this.diceMeshes[index].mesh;
			if (Array.isArray(mesh.material)) {
				mesh.material.forEach((m) => {
					const mat = m as THREE.MeshStandardMaterial;
					if (selected) {
						mat.emissive.setHex(0x4caf50);
						mat.emissiveIntensity = 0.5;
						mat.color.setHex(0xffffff);
					} else if (locked) {
						mat.emissive.setHex(0x000000);
						mat.emissiveIntensity = 0;
						mat.color.setHex(0x888888);
					} else {
						mat.emissive.setHex(0x000000);
						mat.emissiveIntensity = 0;
						mat.color.setHex(0xffffff);
					}
				});
			}
		}
	}

	public dispose(): void {
		this.diceMeshes.forEach((diceData) => {
			diceData.mesh.geometry.dispose();
			if (Array.isArray(diceData.mesh.material)) {
				diceData.mesh.material.forEach((mat) => {
					mat.dispose();
				});
			}
		});
		this.renderer.dispose();
	}
}
