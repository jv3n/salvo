import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export type Player = {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
  vy: number;
  hp: number;
  alive: boolean;
};

const HEIGHT = 1.7;
const RADIUS = 0.32;
const MOVE_SPEED = 5;
const JUMP_SPEED = 7;
const GRAVITY = -25;

export function createPlayer(
  world: RAPIER.World,
  spawn: { x: number; y: number; z: number },
): Player {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y, spawn.z),
  );
  const collider = world.createCollider(
    RAPIER.ColliderDesc.capsule(HEIGHT / 2 - RADIUS, RADIUS),
    body,
  );
  const controller = world.createCharacterController(0.01);
  controller.enableAutostep(0.2, 0.1, true);
  controller.enableSnapToGround(0.3);
  return { body, collider, controller, vy: 0, hp: 100, alive: true };
}

export function updatePlayer(p: Player, keys: Set<string>, dt: number, yaw: number) {
  if (!p.alive) return;
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const wish = new THREE.Vector3();
  if (keys.has('KeyW')) wish.add(forward);
  if (keys.has('KeyS')) wish.sub(forward);
  if (keys.has('KeyD')) wish.add(right);
  if (keys.has('KeyA')) wish.sub(right);
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(MOVE_SPEED);

  const grounded = p.controller.computedGrounded();
  if (grounded && p.vy < 0) p.vy = 0;
  if (grounded && keys.has('Space')) p.vy = JUMP_SPEED;
  p.vy += GRAVITY * dt;

  const desired = { x: wish.x * dt, y: p.vy * dt, z: wish.z * dt };
  p.controller.computeColliderMovement(p.collider, desired);
  const corr = p.controller.computedMovement();
  const pos = p.body.translation();
  p.body.setNextKinematicTranslation({
    x: pos.x + corr.x,
    y: pos.y + corr.y,
    z: pos.z + corr.z,
  });
}

export function getPlayerPosition(p: Player): THREE.Vector3 {
  const t = p.body.translation();
  return new THREE.Vector3(t.x, t.y, t.z);
}

export const EYE_HEIGHT_OFFSET = 0.55;
