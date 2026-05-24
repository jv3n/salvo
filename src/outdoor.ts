import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { grassTexture } from './textures';
import type { LevelData } from './level';

const SIZE = 64;
const HALF = SIZE / 2;
const WALL_H = 6;

export function buildOutdoorLevel(scene: THREE.Scene, world: RAPIER.World): LevelData {
  const grass = grassTexture();
  grass.repeat.set(SIZE / 2, SIZE / 2);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE, SIZE),
    new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  world.createCollider(RAPIER.ColliderDesc.cuboid(HALF, 0.1, HALF).setTranslation(0, -0.1, 0));

  const edges: [number, number, number, number, number, number][] = [
    [0, WALL_H / 2, -HALF - 0.5, HALF, WALL_H / 2, 0.5],
    [0, WALL_H / 2, HALF + 0.5, HALF, WALL_H / 2, 0.5],
    [-HALF - 0.5, WALL_H / 2, 0, 0.5, WALL_H / 2, HALF],
    [HALF + 0.5, WALL_H / 2, 0, 0.5, WALL_H / 2, HALF],
  ];
  for (const [x, y, z, hx, hy, hz] of edges) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z));
  }

  const spawnX = 0;
  const spawnZ = 6;
  const portalZ = -6;
  const rng = mulberry32(1337);
  const placed: [number, number][] = [];
  for (let attempts = 0; attempts < 400 && placed.length < 36; attempts++) {
    const x = (rng() - 0.5) * (SIZE - 6);
    const z = (rng() - 0.5) * (SIZE - 6);
    if (Math.hypot(x - spawnX, z - spawnZ) < 3.5) continue;
    if (Math.hypot(x, z - portalZ) < 3.5) continue;
    if (placed.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 3.4)) continue;
    placed.push([x, z]);
    placeTree(scene, world, x, z, rng);
  }

  const enemySpawns: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < 6; i++) {
    let attempts = 0;
    while (attempts++ < 30) {
      const x = (rng() - 0.5) * (SIZE - 10);
      const z = (rng() - 0.5) * (SIZE - 10);
      if (Math.hypot(x - spawnX, z - spawnZ) < 12) continue;
      if (placed.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 2)) continue;
      enemySpawns.push({ x, y: 0, z });
      break;
    }
  }

  return {
    spawn: { x: spawnX, y: 1, z: spawnZ },
    enemySpawns,
  };
}

function placeTree(
  scene: THREE.Scene,
  world: RAPIER.World,
  x: number,
  z: number,
  rng: () => number,
) {
  const trunkH = 2.2 + rng() * 1.8;
  const trunkR = 0.18 + rng() * 0.1;
  const trunkColor = new THREE.Color().setHSL(0.08, 0.4, 0.18 + rng() * 0.06);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkR * 0.75, trunkR, trunkH, 8),
    new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 1 }),
  );
  trunk.position.set(x, trunkH / 2, z);
  scene.add(trunk);

  const foliageH = 2.4 + rng() * 1.6;
  const foliageR = 0.95 + rng() * 0.55;
  const foliageColor = new THREE.Color().setHSL(
    0.27 + (rng() - 0.5) * 0.06,
    0.55,
    0.3 + rng() * 0.08,
  );
  const foliage = new THREE.Mesh(
    new THREE.ConeGeometry(foliageR, foliageH, 8),
    new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 1 }),
  );
  foliage.position.set(x, trunkH + foliageH / 2 - 0.3, z);
  scene.add(foliage);

  world.createCollider(
    RAPIER.ColliderDesc.cylinder(trunkH / 2, trunkR + 0.05).setTranslation(x, trunkH / 2, z),
  );
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
