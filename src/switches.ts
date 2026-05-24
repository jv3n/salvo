import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { switchTexture } from './textures';

export type Facing = 'N' | 'S' | 'E' | 'W';

export type Switch = {
  mesh: THREE.Mesh;
  on: boolean;
  onMap: THREE.CanvasTexture;
  offMap: THREE.CanvasTexture;
  light: THREE.PointLight;
};

const LIGHT_COLOR = 0xffd8a0;
const LIGHT_INTENSITY = 1.6;
const LIGHT_DISTANCE = 12;

const switches: Switch[] = [];
const SWITCH_REACH = 2.5;
const raycaster = new THREE.Raycaster();

export function createSwitch(
  scene: THREE.Scene,
  pos: { x: number; y: number; z: number },
  facing: Facing,
): Switch {
  const offMap = switchTexture(false);
  const onMap = switchTexture(true);
  const geom = new THREE.PlaneGeometry(0.5, 0.7);
  const mat = new THREE.MeshBasicMaterial({ map: offMap, transparent: true });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(pos.x, pos.y, pos.z);
  switch (facing) {
    case 'N':
      mesh.rotation.y = Math.PI;
      break;
    case 'S':
      mesh.rotation.y = 0;
      break;
    case 'E':
      mesh.rotation.y = Math.PI / 2;
      break;
    case 'W':
      mesh.rotation.y = -Math.PI / 2;
      break;
  }
  scene.add(mesh);

  const light = new THREE.PointLight(LIGHT_COLOR, 0, LIGHT_DISTANCE, 1.5);
  const offset = new THREE.Vector3(0, 0.6, 0);
  switch (facing) {
    case 'N':
      offset.z -= 0.4;
      break;
    case 'S':
      offset.z += 0.4;
      break;
    case 'E':
      offset.x += 0.4;
      break;
    case 'W':
      offset.x -= 0.4;
      break;
  }
  light.position.set(pos.x + offset.x, pos.y + offset.y, pos.z + offset.z);
  scene.add(light);

  const sw: Switch = { mesh, on: false, onMap, offMap, light };
  switches.push(sw);
  return sw;
}

export function toggleSwitch(sw: Switch) {
  sw.on = !sw.on;
  const mat = sw.mesh.material as THREE.MeshBasicMaterial;
  mat.map = sw.on ? sw.onMap : sw.offMap;
  mat.needsUpdate = true;
  sw.light.intensity = sw.on ? LIGHT_INTENSITY : 0;
}

export function findAimedSwitch(
  camera: THREE.Camera,
  world: RAPIER.World,
  excludeCollider: RAPIER.Collider,
): Switch | null {
  if (switches.length === 0) return null;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  raycaster.far = SWITCH_REACH;
  const meshes = switches.map((s) => s.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) return null;
  const hit = hits[0];
  const dir = raycaster.ray.direction;
  const origin = raycaster.ray.origin;
  const rayR = new RAPIER.Ray(
    { x: origin.x, y: origin.y, z: origin.z },
    { x: dir.x, y: dir.y, z: dir.z },
  );
  const wallHit = world.castRay(rayR, hit.distance, true, undefined, undefined, excludeCollider);
  if (wallHit && wallHit.timeOfImpact < hit.distance - 0.05) return null;
  return switches.find((s) => s.mesh === hit.object) ?? null;
}
