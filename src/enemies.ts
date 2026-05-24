import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { enemyTexture, enemyTextureBite, enemyTextureBoss } from './textures';
import type { Player } from './player';

export type EnemyVariant = 'classic' | 'bite' | 'bite-boss';

type EnemyTextures = {
  idle: THREE.CanvasTexture;
  hurt: THREE.CanvasTexture;
  dead: THREE.CanvasTexture;
};

type VariantConfig = {
  textures: EnemyTextures;
  hp: number;
  damage: number;
  scale: number;
  attackRange: number;
};

export type Enemy = {
  sprite: THREE.Sprite;
  hp: number;
  alive: boolean;
  hurtTime: number;
  attackCooldown: number;
  damage: number;
  attackRange: number;
  scale: number;
  textures: EnemyTextures;
};

export const enemies: Enemy[] = [];

const variants: Record<EnemyVariant, VariantConfig> = {
  classic: {
    textures: {
      idle: enemyTexture('idle'),
      hurt: enemyTexture('hurt'),
      dead: enemyTexture('dead'),
    },
    hp: 50,
    damage: 8,
    scale: 1,
    attackRange: 1.4,
  },
  bite: {
    textures: {
      idle: enemyTextureBite('idle'),
      hurt: enemyTextureBite('hurt'),
      dead: enemyTextureBite('dead'),
    },
    hp: 50,
    damage: 8,
    scale: 1,
    attackRange: 1.4,
  },
  'bite-boss': {
    textures: {
      idle: enemyTextureBoss('idle'),
      hurt: enemyTextureBoss('hurt'),
      dead: enemyTextureBoss('dead'),
    },
    hp: 350,
    damage: 18,
    scale: 2.6,
    attackRange: 2.4,
  },
};

const BASE_SPRITE = 1.4;
const SPEED = 1.8;
const ATTACK_COOLDOWN = 1.0;
const SIGHT_RANGE = 18;
const SPRITE_HALF = 0.7;

export function spawnEnemy(
  scene: THREE.Scene,
  pos: { x: number; y: number; z: number },
  variant: EnemyVariant = 'classic',
) {
  const cfg = variants[variant];
  const mat = new THREE.SpriteMaterial({ map: cfg.textures.idle, transparent: true, alphaTest: 0.5 });
  const sprite = new THREE.Sprite(mat);
  const size = BASE_SPRITE * cfg.scale;
  sprite.scale.set(size, size, 1);
  sprite.position.set(pos.x, pos.y + SPRITE_HALF * cfg.scale, pos.z);
  scene.add(sprite);
  enemies.push({
    sprite,
    hp: cfg.hp,
    alive: true,
    hurtTime: 0,
    attackCooldown: 0,
    damage: cfg.damage,
    attackRange: cfg.attackRange,
    scale: cfg.scale,
    textures: cfg.textures,
  });
}

export function updateEnemies(
  dt: number,
  playerPos: THREE.Vector3,
  world: RAPIER.World,
  player: Player,
) {
  for (const e of enemies) {
    if (!e.alive) continue;

    if (e.hurtTime > 0) {
      e.hurtTime -= dt;
      if (e.hurtTime <= 0) {
        (e.sprite.material as THREE.SpriteMaterial).map = e.textures.idle;
        (e.sprite.material as THREE.SpriteMaterial).needsUpdate = true;
      }
    }

    const dx = playerPos.x - e.sprite.position.x;
    const dz = playerPos.z - e.sprite.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.01 && dist < SIGHT_RANGE && dist > e.attackRange) {
      const step = SPEED * dt;
      const dirx = dx / dist;
      const dirz = dz / dist;
      const ray = new RAPIER.Ray(
        { x: e.sprite.position.x, y: 0.9, z: e.sprite.position.z },
        { x: dirx, y: 0, z: dirz },
      );
      const probe = step + 0.45;
      const hit = world.castRay(ray, probe, true);
      if (!hit || hit.timeOfImpact > probe) {
        e.sprite.position.x += dirx * step;
        e.sprite.position.z += dirz * step;
      }
    }

    e.attackCooldown -= dt;
    if (dist < e.attackRange && e.attackCooldown <= 0 && player.alive) {
      player.hp -= e.damage;
      e.attackCooldown = ATTACK_COOLDOWN;
    }
  }
}

export function hitEnemy(e: Enemy, damage: number): boolean {
  e.hp -= damage;
  if (e.hp <= 0) {
    e.alive = false;
    const mat = e.sprite.material as THREE.SpriteMaterial;
    mat.map = e.textures.dead;
    mat.needsUpdate = true;
    e.sprite.scale.set(BASE_SPRITE * e.scale, 0.5 * e.scale, 1);
    e.sprite.position.y = 0.25 * e.scale;
    return true;
  }
  const mat = e.sprite.material as THREE.SpriteMaterial;
  mat.map = e.textures.hurt;
  mat.needsUpdate = true;
  e.hurtTime = 0.18;
  return false;
}
