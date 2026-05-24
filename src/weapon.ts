import * as THREE from 'three';
import { weaponTexture, shotgunTexture } from './textures';

export type WeaponDef = {
  id: string;
  label: string;
  damagePerPellet: number;
  pellets: number;
  spread: number;
  cooldown: number;
  flashTime: number;
  recoilDip: number;
  ammo: number;
  maxAmmo: number;
  idleTex: THREE.CanvasTexture;
  fireTex: THREE.CanvasTexture;
  planeSize: number;
  pos: { x: number; y: number; z: number };
};

export type Weapons = {
  group: THREE.Group;
  mesh: THREE.Mesh;
  defs: WeaponDef[];
  current: number;
  fireTime: number;
  cooldown: number;
};

const SWITCH_DELAY = 0.15;

export function createWeapons(camera: THREE.PerspectiveCamera): Weapons {
  const pistol: WeaponDef = {
    id: 'pistol',
    label: 'PISTOLET',
    damagePerPellet: 25,
    pellets: 1,
    spread: 0,
    cooldown: 0.32,
    flashTime: 0.08,
    recoilDip: 0.05,
    ammo: 50,
    maxAmmo: 99,
    idleTex: weaponTexture(false),
    fireTex: weaponTexture(true),
    planeSize: 0.55,
    pos: { x: 0.18, y: -0.24, z: -0.5 },
  };
  const shotgun: WeaponDef = {
    id: 'shotgun',
    label: 'FUSIL',
    damagePerPellet: 12,
    pellets: 7,
    spread: 0.085,
    cooldown: 0.75,
    flashTime: 0.1,
    recoilDip: 0.09,
    ammo: 12,
    maxAmmo: 32,
    idleTex: shotgunTexture(false),
    fireTex: shotgunTexture(true),
    planeSize: 0.7,
    pos: { x: 0.12, y: -0.28, z: -0.55 },
  };

  const mat = new THREE.MeshBasicMaterial({
    map: pistol.idleTex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pistol.planeSize, pistol.planeSize), mat);
  mesh.renderOrder = 999;
  mesh.position.set(pistol.pos.x, pistol.pos.y, pistol.pos.z);

  const group = new THREE.Group();
  group.add(mesh);
  camera.add(group);

  return { group, mesh, defs: [pistol, shotgun], current: 0, fireTime: 0, cooldown: 0 };
}

export function currentWeapon(w: Weapons): WeaponDef {
  return w.defs[w.current];
}

function applyWeaponSlot(w: Weapons, d: WeaponDef) {
  const mat = w.mesh.material as THREE.MeshBasicMaterial;
  mat.map = d.idleTex;
  mat.needsUpdate = true;
  w.mesh.geometry.dispose();
  w.mesh.geometry = new THREE.PlaneGeometry(d.planeSize, d.planeSize);
  w.mesh.position.set(d.pos.x, d.pos.y, d.pos.z);
}

function setFiringVisual(w: Weapons, d: WeaponDef, firing: boolean) {
  const mat = w.mesh.material as THREE.MeshBasicMaterial;
  mat.map = firing ? d.fireTex : d.idleTex;
  mat.needsUpdate = true;
  w.mesh.position.y = firing ? d.pos.y - d.recoilDip : d.pos.y;
}

export function switchWeapon(w: Weapons, index: number): boolean {
  if (index < 0 || index >= w.defs.length || index === w.current) return false;
  w.current = index;
  w.fireTime = 0;
  w.cooldown = Math.max(w.cooldown, SWITCH_DELAY);
  applyWeaponSlot(w, w.defs[index]);
  return true;
}

export function tryFire(w: Weapons): boolean {
  if (w.cooldown > 0) return false;
  const d = currentWeapon(w);
  if (d.ammo <= 0) return false;
  d.ammo--;
  w.cooldown = d.cooldown;
  w.fireTime = d.flashTime;
  setFiringVisual(w, d, true);
  return true;
}

export type ShotRay = { origin: THREE.Vector3; direction: THREE.Vector3 };

export function getShotRays(w: Weapons, camera: THREE.PerspectiveCamera): ShotRay[] {
  const d = currentWeapon(w);
  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const out: ShotRay[] = [];
  for (let i = 0; i < d.pellets; i++) {
    let dir: THREE.Vector3;
    if (d.spread <= 0) {
      dir = fwd.clone();
    } else {
      const r = Math.sqrt(Math.random()) * d.spread;
      const t = Math.random() * Math.PI * 2;
      dir = fwd
        .clone()
        .addScaledVector(right, Math.cos(t) * r)
        .addScaledVector(up, Math.sin(t) * r)
        .normalize();
    }
    out.push({ origin: origin.clone(), direction: dir });
  }
  return out;
}

export function updateWeapon(w: Weapons, dt: number) {
  if (w.cooldown > 0) w.cooldown -= dt;
  if (w.fireTime > 0) {
    w.fireTime -= dt;
    if (w.fireTime <= 0) {
      setFiringVisual(w, currentWeapon(w), false);
    }
  }
}
