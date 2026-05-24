import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { wallTexture, floorTexture, ceilingTexture } from './textures';

export const TILE = 2;
export const WALL_HEIGHT = 3.5;

const MAP: string[] = [
  '################################',
  '#..............................#',
  '#..S...........................#',
  '#..............................#',
  '#......#####...................#',
  '#......#...#..........eee......#',
  '#......#.e.#..........eee......#',
  '#......#...#...................#',
  '#......##.##...................#',
  '#..............................#',
  '#............#..#..............#',
  '#............#..#......e.......#',
  '#......e.....#..#..............#',
  '#............#..#..............#',
  '#..............................#',
  '#..............................#',
  '#...................#####......#',
  '#...................#...#......#',
  '#...................#.e.#......#',
  '#........##.........#...#......#',
  '#...................##.##......#',
  '#..............................#',
  '#......e.......................#',
  '################################',
];

const COLS = MAP[0].length;
const ROWS = MAP.length;
const HALF_W = (COLS * TILE) / 2;
const HALF_H = (ROWS * TILE) / 2;

function tileToWorld(col: number, row: number): { x: number; z: number } {
  return { x: (col + 0.5) * TILE - HALF_W, z: (row + 0.5) * TILE - HALF_H };
}

export type LevelData = {
  spawn: { x: number; y: number; z: number };
  enemySpawns: { x: number; y: number; z: number }[];
};

export function buildLevel(scene: THREE.Scene, world: RAPIER.World): LevelData {
  const enemySpawns: { x: number; y: number; z: number }[] = [];
  let spawn = { x: 0, y: 1, z: 0 };

  const wW = COLS * TILE;
  const wH = ROWS * TILE;

  const floorTex = floorTexture();
  floorTex.repeat.set(COLS, ROWS);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(wW, wH),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceilTex = ceilingTexture();
  ceilTex.repeat.set(COLS, ROWS);
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(wW, wH),
    new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 1 }),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = WALL_HEIGHT;
  scene.add(ceil);

  world.createCollider(RAPIER.ColliderDesc.cuboid(wW / 2, 0.1, wH / 2).setTranslation(0, -0.1, 0));
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(wW / 2, 0.1, wH / 2).setTranslation(0, WALL_HEIGHT + 0.1, 0),
  );

  const wallTex = wallTexture();
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
  const wallGeom = new THREE.BoxGeometry(TILE, WALL_HEIGHT, TILE);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = MAP[row][col];
      const { x, z } = tileToWorld(col, row);
      if (ch === '#') {
        const m = new THREE.Mesh(wallGeom, wallMat);
        m.position.set(x, WALL_HEIGHT / 2, z);
        scene.add(m);
        world.createCollider(
          RAPIER.ColliderDesc.cuboid(TILE / 2, WALL_HEIGHT / 2, TILE / 2).setTranslation(
            x,
            WALL_HEIGHT / 2,
            z,
          ),
        );
      } else if (ch === 'S') {
        spawn = { x, y: 1.2, z };
      } else if (ch === 'e') {
        enemySpawns.push({ x, y: 0, z });
      }
    }
  }

  return { spawn, enemySpawns };
}
