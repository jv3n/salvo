import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { enemyTexture, enemyTextureBite } from './textures';
import type { Player } from './player';

export type EnemyVariant = 'classic' | 'bite';

type EnemyTextures = {
  idle: THREE.CanvasTexture;
  hurt: THREE.CanvasTexture;
  dead: THREE.CanvasTexture;
};

export type Enemy = {
  sprite: THREE.Sprite;
  hp: number;
  alive: boolean;
  hurtTime: number;
  attackCooldown: number;
  textures: EnemyTextures;
};

export const enemies: Enemy[] = [];

const textureCache: Record<EnemyVariant, EnemyTextures> = {
  classic: {
    idle: enemyTexture('idle'),
    hurt: enemyTexture('hurt'),
    dead: enemyTexture('dead'),
  },
  bite: {
    idle: enemyTextureBite('idle'),
    hurt: enemyTextureBite('hurt'),
    dead: enemyTextureBite('dead'),
  },
};

const SPEED = 1.8;
const ATTACK_RANGE = 1.4;
const ATTACK_COOLDOWN = 1.0;
const SIGHT_RANGE = 18;
const HP = 50;
const SPRITE_HALF = 0.7;

export function spawnEnemy(
  scene: THREE.Scene,
  pos: { x: number; y: number; z: number },
  variant: EnemyVariant = 'classic',
) {
  const textures = textureCache[variant];
  const mat = new THREE.SpriteMaterial({ map: textures.idle, transparent: true, alphaTest: 0.5 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.4, 1.4, 1);
  sprite.position.set(pos.x, pos.y + SPRITE_HALF, pos.z);
  scene.add(sprite);
  enemies.push({ sprite, hp: HP, alive: true, hurtTime: 0, attackCooldown: 0, textures });
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

    if (dist > 0.01 && dist < SIGHT_RANGE && dist > ATTACK_RANGE) {
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
    if (dist < ATTACK_RANGE && e.attackCooldown <= 0 && player.alive) {
      player.hp -= 8;
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
    e.sprite.scale.set(1.4, 0.5, 1);
    e.sprite.position.y = 0.25;
    return true;
  }
  const mat = e.sprite.material as THREE.SpriteMaterial;
  mat.map = e.textures.hurt;
  mat.needsUpdate = true;
  e.hurtTime = 0.18;
  return false;
}
