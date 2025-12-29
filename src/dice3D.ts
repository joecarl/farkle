import * as THREE from 'three';

import tableTextureUrl from './assets/table.png';

export type Vector3D = { x: number; y: number; z: number };
export type Rotation3D = { x: number; y: number; z: number };

export function addVectors(a: Vector3D, b: Vector3D): Vector3D {
	return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subVectors(a: Vector3D, b: Vector3D): Vector3D {
	return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function distance(a: Vector3D, b: Vector3D): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export interface SerializableDieState {
	rotation: Rotation3D;
	targetRotation: Rotation3D;
	startPosition?: Vector3D;
	targetPosition?: Vector3D;
	currentPosition: Vector3D;
	moveType: MoveType | null;
	rollTime: number;
	targetValue: number;
}

type MoveType = 'roll' | 'settle' | 'collect' | 'drag';

interface VisualDieState {
	rotation: THREE.Euler;
	targetRotation: THREE.Euler;
	startPosition?: THREE.Vector3;
	targetPosition?: THREE.Vector3;
	currentPosition: THREE.Vector3;
	moveType: MoveType | null;
	rollTime: number;
	targetValue: number;
}

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
	private visualDice: Map<number, VisualDieState> = new Map();
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
		const ambientLight = new THREE.AmbientLight(0xffffbf, 0.6);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffcfcf, 0.8);
		directionalLight.position.set(3, 10, -6);
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

		const size = 27;
		const geometry = new THREE.PlaneGeometry(size * 1.5, size * 1.0);
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

	public addDice(position3D: Vector3D): number {
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const materials = this.createDiceMaterials();
		const mesh = new THREE.Mesh(geometry, materials);
		const pos = new THREE.Vector3(position3D.x, position3D.y, position3D.z);
		mesh.position.copy(pos);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		this.scene.add(mesh);

		const diceData: DiceMeshData = { mesh, position3D: pos };
		this.diceMeshes.push(diceData);
		const index = this.diceMeshes.length - 1;

		this.visualDice.set(index, {
			rotation: new THREE.Euler(),
			targetRotation: new THREE.Euler(),
			currentPosition: pos.clone(),
			rollTime: 0,
			targetValue: 1,
			moveType: null,
		});

		return index;
	}

	private getLerpFactor(deltaTime: number, die: VisualDieState): number {
		if (die.moveType === 'settle') return 1 - Math.pow(1 - 0.1, deltaTime * 60);
		else if (die.moveType === 'collect') return 1 - Math.pow(1 - 0.05, deltaTime * 60);
		else if (die.moveType === 'drag') return 1 - Math.pow(1 - 0.2, deltaTime * 60);
		return 1;
	}

	public update(deltaTime: number): boolean {
		let anyAnimating = false;
		const ROLL_DURATION = 1.0;

		this.visualDice.forEach((die, index) => {
			let animatingDie = true;
			const mesh = this.diceMeshes[index].mesh;

			if (die.moveType === 'roll') {
				die.rollTime += deltaTime;
				const progress = Math.min(die.rollTime / ROLL_DURATION, 1);
				const easeProgress = 1 - Math.pow(1 - progress, 3);

				die.rotation.x = die.targetRotation.x * easeProgress;
				die.rotation.y = die.targetRotation.y * easeProgress;
				die.rotation.z = die.targetRotation.z * easeProgress;

				if (die.startPosition && die.targetPosition) {
					die.currentPosition.lerpVectors(die.startPosition, die.targetPosition, easeProgress);
				}
				if (progress >= 1) {
					//die.rolling = false;
					die.moveType = null;
					if (die.targetPosition) {
						die.currentPosition.copy(die.targetPosition);
					}
					die.rotation.copy(die.targetRotation);
				}
			} else if (die.moveType !== null && die.targetPosition) {
				const factor = this.getLerpFactor(deltaTime, die);
				die.currentPosition.lerp(die.targetPosition, factor);
				if (die.currentPosition.distanceTo(die.targetPosition) < 0.01) {
					die.currentPosition.copy(die.targetPosition);
					die.moveType = null;
				}
			} else {
				animatingDie = false;
			}

			// Apply to mesh
			mesh.position.copy(die.currentPosition);
			mesh.rotation.copy(die.rotation);
			this.diceMeshes[index].position3D.copy(die.currentPosition);

			if (animatingDie) anyAnimating = true;
		});

		return anyAnimating;
	}

	public rollDice(indices: number[], targetValues: number[]) {
		indices.forEach((index, i) => {
			const die = this.visualDice.get(index);
			if (die) {
				//die.rolling = true;
				die.moveType = 'roll';
				die.rollTime = 0;
				die.targetValue = targetValues[i];
				die.startPosition = new THREE.Vector3(10 + Math.random() * 4, 2 + Math.random() * 1.5, 10 + Math.random() * 4);
				die.currentPosition.copy(die.startPosition);
				this.setDiceRotationForValue(die);
			}
		});
	}

	public collectDice(indices: number[], targetPosition: Vector3D, randomOffset: number = 0) {
		indices.forEach((index) => {
			const die = this.visualDice.get(index);
			if (die) {
				//die.collecting = true;
				die.moveType = 'collect';
				die.targetPosition = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
				if (randomOffset > 0) {
					die.targetPosition.x += (Math.random() - 0.5) * randomOffset;
					die.targetPosition.z += (Math.random() - 0.5) * randomOffset;
				}
			}
		});
	}

	public setTargetPosition(index: number, position: Partial<Vector3D>) {
		const die = this.visualDice.get(index);
		if (die) {
			const px = position.x ?? die.targetPosition?.x ?? die.currentPosition.x;
			const py = position.y ?? die.targetPosition?.y ?? die.currentPosition.y;
			const pz = position.z ?? die.targetPosition?.z ?? die.currentPosition.z;
			die.targetPosition = new THREE.Vector3(px, py, pz);
		}
	}

	public setSettle(index: number, settle: boolean) {
		const die = this.visualDice.get(index);
		if (die) {
			//die.settling = settle;
			if (settle) {
				die.moveType = 'settle';
			} else if (die.moveType === 'settle') {
				die.moveType = null;
			}
		}
	}

	public setDragging(index: number, dragging: boolean) {
		const die = this.visualDice.get(index);
		if (die) {
			//die.remoteDragging = dragging;
			if (dragging) {
				die.moveType = 'drag';
			} else if (die.moveType === 'drag') {
				die.moveType = null;
			}
		}
	}

	public setDiePosition(index: number, position: Partial<Vector3D>) {
		const die = this.visualDice.get(index);
		if (die) {
			const px = position.x ?? die.currentPosition.x;
			const py = position.y ?? die.currentPosition.y;
			const pz = position.z ?? die.currentPosition.z;
			const pos = new THREE.Vector3(px, py, pz);
			die.currentPosition.copy(pos);
			// Also update mesh immediately?
			const mesh = this.diceMeshes[index].mesh;
			mesh.position.copy(pos);
			this.diceMeshes[index].position3D.copy(pos);
		}
	}

	public setDieRotation(index: number, rotation: Rotation3D) {
		const die = this.visualDice.get(index);
		if (die) {
			const rot = new THREE.Euler(rotation.x, rotation.y, rotation.z);
			die.rotation.copy(rot);
			const mesh = this.diceMeshes[index].mesh;
			mesh.rotation.copy(rot);
		}
	}

	public getDieState(index: number): SerializableDieState | undefined {
		const die = this.visualDice.get(index);
		if (!die) return undefined;

		return {
			rotation: { x: die.rotation.x, y: die.rotation.y, z: die.rotation.z },
			targetRotation: { x: die.targetRotation.x, y: die.targetRotation.y, z: die.targetRotation.z },
			startPosition: die.startPosition ? { x: die.startPosition.x, y: die.startPosition.y, z: die.startPosition.z } : undefined,
			targetPosition: die.targetPosition ? { x: die.targetPosition.x, y: die.targetPosition.y, z: die.targetPosition.z } : undefined,
			currentPosition: { x: die.currentPosition.x, y: die.currentPosition.y, z: die.currentPosition.z },
			moveType: die.moveType,
			rollTime: die.rollTime,
			targetValue: die.targetValue,
		};
	}

	public restoreDieState(index: number, state: SerializableDieState) {
		const die = this.visualDice.get(index);
		if (die) {
			die.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
			die.targetRotation.set(state.targetRotation.x, state.targetRotation.y, state.targetRotation.z);
			if (state.startPosition) {
				die.startPosition = new THREE.Vector3(state.startPosition.x, state.startPosition.y, state.startPosition.z);
			}
			if (state.targetPosition) {
				die.targetPosition = new THREE.Vector3(state.targetPosition.x, state.targetPosition.y, state.targetPosition.z);
			}
			die.currentPosition.set(state.currentPosition.x, state.currentPosition.y, state.currentPosition.z);
			die.moveType = state.moveType;
			die.rollTime = state.rollTime;
			die.targetValue = state.targetValue;

			// Update mesh immediately
			const mesh = this.diceMeshes[index].mesh;
			mesh.position.copy(die.currentPosition);
			mesh.rotation.copy(die.rotation);
			this.diceMeshes[index].position3D.copy(die.currentPosition);
		}
	}

	private setDiceRotationForValue(die: VisualDieState): void {
		const getExtraRotations = (max: number) => Math.PI * 2 * (Math.floor(Math.random() * max) + 1);

		const extraRotationsX = getExtraRotations(2);
		const extraRotationsY = getExtraRotations(2);
		const extraRotationsZ = getExtraRotations(2);
		const randomVerticalRotation = Math.random() * Math.PI * 2;

		switch (die.targetValue) {
			case 1:
				die.targetRotation.set(-Math.PI / 2 + extraRotationsX, 0 + extraRotationsY, randomVerticalRotation + extraRotationsZ);
				break;
			case 2:
				die.targetRotation.set(Math.PI + extraRotationsX, randomVerticalRotation + extraRotationsY, 0 + extraRotationsZ);
				break;
			case 3:
				die.targetRotation.set(0 + extraRotationsX, randomVerticalRotation + extraRotationsY, Math.PI / 2 + extraRotationsZ);
				break;
			case 4:
				die.targetRotation.set(0 + extraRotationsX, randomVerticalRotation + extraRotationsY, -Math.PI / 2 + extraRotationsZ);
				break;
			case 5:
				die.targetRotation.set(0 + extraRotationsX, randomVerticalRotation + extraRotationsY, 0 + extraRotationsZ);
				break;
			case 6:
				die.targetRotation.set(Math.PI / 2 + extraRotationsX, 0 + extraRotationsY, randomVerticalRotation + extraRotationsZ);
				break;
		}
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

	public getPlaneIntersection(canvasX: number, canvasY: number): Vector3D | null {
		this.mouse.x = (canvasX / this.canvas.width) * 2 - 1;
		this.mouse.y = -(canvasY / this.canvas.height) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera);

		const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
		const target = new THREE.Vector3();
		const intersection = this.raycaster.ray.intersectPlane(plane, target);

		return intersection ? { x: intersection.x, y: intersection.y, z: intersection.z } : null;
	}

	public getPosition(index: number): Vector3D | null {
		if (index >= 0 && index < this.diceMeshes.length) {
			const pos = this.diceMeshes[index].position3D;
			return { x: pos.x, y: pos.y, z: pos.z };
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

	public stop(index: number): void {
		const die = this.visualDice.get(index);
		if (die) {
			die.moveType = null;
			// Keep current position and rotation as is
		}
	}

	public getMoveType(index: number): MoveType | null {
		const die = this.visualDice.get(index);
		if (die) {
			return die.moveType;
		}
		return null;
	}

	public closestDie(position: Vector3D, excludeIndices: number[] = []) {
		const pos = new THREE.Vector3(position.x, position.y, position.z);
		let closestDist = Infinity;
		let closestDieIndex: number | null = null;

		this.visualDice.forEach((otherState, otherIndex) => {
			if (excludeIndices.includes(otherIndex)) return;

			const otherPos = otherState.currentPosition;

			const otherVector = new THREE.Vector3(otherPos.x, otherPos.y, otherPos.z);
			const dist = pos.distanceTo(otherVector);
			if (dist < closestDist) {
				closestDist = dist;
				closestDieIndex = otherIndex;
			}
		});

		return {
			dist: closestDist,
			dieIndex: closestDieIndex,
		};
	}

	public findValidPosition(index: number, desiredPosition: Vector3D): Vector3D {
		const targetPos = new THREE.Vector3(desiredPosition.x, desiredPosition.y, desiredPosition.z);
		targetPos.y = 0; // Ensure on floor

		const minDistance = 1.6;
		let iterations = 0;
		const maxIterations = 20;

		while (iterations < maxIterations) {
			const moveVector = new THREE.Vector3(0, 0, 0);
			let collisionCount = 0;

			this.visualDice.forEach((otherState, otherIndex) => {
				if (otherIndex === index) return;

				// Use other.targetPosition if settling/rolling, else currentPosition
				const otherPos = otherState.targetPosition || otherState.currentPosition;
				const dist = targetPos.distanceTo(otherPos);

				if (dist < minDistance) {
					collisionCount++;
					const pushDir = new THREE.Vector3().subVectors(targetPos, otherPos);

					// If exact overlap, pick random direction
					if (pushDir.lengthSq() < 0.0001) {
						pushDir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
					}

					pushDir.normalize();
					const overlap = minDistance - dist;
					// Add push vector (weighted by overlap)
					moveVector.add(pushDir.multiplyScalar(overlap));
				}
			});

			if (collisionCount === 0) break;

			// Apply correction
			targetPos.add(moveVector.multiplyScalar(0.5));
			iterations++;
		}

		return { x: targetPos.x, y: targetPos.y, z: targetPos.z };
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
