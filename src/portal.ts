import * as THREE from 'three';
import { portalTexture } from './textures';

export type Portal = {
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  pos: THREE.Vector3;
  target: string;
};

const portals: Portal[] = [];

export function createPortal(scene: THREE.Scene, x: number, z: number, target: string): Portal {
  const tex = portalTexture();
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.6), mat);
  mesh.position.set(x, 1.35, z);
  scene.add(mesh);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x88aaff,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.15, 32), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.03, z);
  scene.add(ring);

  const portal: Portal = { mesh, ring, pos: new THREE.Vector3(x, 0, z), target };
  portals.push(portal);
  return portal;
}

export function checkPortalTrigger(playerPos: THREE.Vector3): Portal | null {
  for (const p of portals) {
    const d = Math.hypot(playerPos.x - p.pos.x, playerPos.z - p.pos.z);
    if (d < 0.9) return p;
  }
  return null;
}

export function updatePortals(camera: THREE.Camera, time: number) {
  for (const p of portals) {
    const dx = camera.position.x - p.mesh.position.x;
    const dz = camera.position.z - p.mesh.position.z;
    p.mesh.rotation.y = Math.atan2(dx, dz);
    const pulse = 0.55 + 0.15 * Math.sin(time * 3);
    (p.ring.material as THREE.MeshBasicMaterial).opacity = pulse;
  }
}
