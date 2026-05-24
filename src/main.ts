import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { buildLevel, WALL_HEIGHT } from './level';
import { buildOutdoorLevel } from './outdoor';
import { createPlayer, updatePlayer, getPlayerPosition, EYE_HEIGHT_OFFSET } from './player';
import {
  createWeapons,
  currentWeapon,
  switchWeapon,
  tryFire,
  getShotRays,
  updateWeapon,
} from './weapon';
import { spawnEnemy, updateEnemies, enemies, hitEnemy, type Enemy } from './enemies';
import { createSwitch, findAimedSwitch, toggleSwitch, type Switch } from './switches';
import { createPortal, checkPortalTrigger, updatePortals } from './portal';
import * as audio from './audio';

await RAPIER.init();

const isOutdoor = new URLSearchParams(location.search).get('level') === 'outdoor';

const scene = new THREE.Scene();
const indoorBg = 0x2a2520;
const outdoorBg = 0x9ec4e8;
scene.background = new THREE.Color(isOutdoor ? outdoorBg : indoorBg);
scene.fog = isOutdoor ? new THREE.Fog(outdoorBg, 20, 70) : new THREE.Fog(indoorBg, 12, 50);

const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.05, 200);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const torch = new THREE.PointLight(0xffc070, 0, 16, 1.5);
scene.add(torch);

if (isOutdoor) {
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  scene.add(new THREE.HemisphereLight(0xbfdcff, 0x4a6638, 0.9));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.6);
  sun.position.set(20, 30, 10);
  scene.add(sun);
} else {
  scene.add(new THREE.AmbientLight(0xffeacc, 1.1));
  scene.add(new THREE.HemisphereLight(0xfff2d0, 0x554433, 0.6));
  torch.intensity = 1.6;
  const ceilingLights: {
    color: number;
    intensity: number;
    distance: number;
    pos: [number, number];
  }[] = [
    { color: 0xfff0d0, intensity: 1.2, distance: 26, pos: [0, 0] },
    { color: 0xffcc88, intensity: 1.4, distance: 16, pos: [-15, -11] },
    { color: 0xffcc88, intensity: 1.4, distance: 16, pos: [11, 13] },
    { color: 0xfff0d0, intensity: 1.0, distance: 22, pos: [-22, -18] },
    { color: 0xfff0d0, intensity: 1.0, distance: 22, pos: [22, -18] },
    { color: 0xfff0d0, intensity: 1.0, distance: 22, pos: [-22, 18] },
    { color: 0xfff0d0, intensity: 1.0, distance: 22, pos: [22, 18] },
  ];
  for (const l of ceilingLights) {
    const light = new THREE.PointLight(l.color, l.intensity, l.distance, 1);
    light.position.set(l.pos[0], WALL_HEIGHT - 0.2, l.pos[1]);
    scene.add(light);
  }
}

const world = new RAPIER.World({ x: 0, y: -25, z: 0 });

const level = isOutdoor ? buildOutdoorLevel(scene, world) : buildLevel(scene, world);
const player = createPlayer(world, level.spawn);
for (const ep of level.enemySpawns) spawnEnemy(scene, ep, isOutdoor ? 'bite' : 'classic');
const regularEnemyCount = enemies.length;
const totalEnemies = regularEnemyCount + (isOutdoor ? 1 : 0);
let bossSpawned = false;

if (isOutdoor) {
  createPortal(scene, 0, -6, 'indoor');
} else {
  createSwitch(scene, { x: -29.98, y: 1.6, z: -1 }, 'E');
  createSwitch(scene, { x: 29.98, y: 1.6, z: -13 }, 'W');
  createSwitch(scene, { x: 1, y: 1.6, z: -21.98 }, 'S');
  createPortal(scene, 5, 0, 'outdoor');
}

const weapons = createWeapons(camera);

const hpEl = document.getElementById('hp')!;
const ammoEl = document.getElementById('ammo')!;
const weaponEl = document.getElementById('weapon')!;
const killsEl = document.getElementById('kills')!;
const messageEl = document.getElementById('message')!;
const damageEl = document.getElementById('damage')!;
const actionHintEl = document.getElementById('action-hint')!;
let aimedSwitch: Switch | null = null;

let kills = 0;
let lastHp = player.hp;
let damageFlash = 0;
let footstepDist = 0;
let sprintOn = false;
const lastPos = new THREE.Vector3(level.spawn.x, 0, level.spawn.z);

const keys = new Set<string>();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyM') {
    audio.setMuted(!audio.isMuted());
    return;
  }
  if (gameOver) return;
  if (e.code === 'Digit1') {
    if (switchWeapon(weapons, 0)) audio.playSwitch();
  } else if (e.code === 'Digit2') {
    if (switchWeapon(weapons, 1)) audio.playSwitch();
  } else if (e.code === 'KeyE' && !e.repeat) {
    if (aimedSwitch) {
      toggleSwitch(aimedSwitch);
      audio.playSwitch();
    }
  } else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) {
    sprintOn = !sprintOn;
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));

let yaw = 0,
  pitch = 0;
let gameOver = false;

let mouseDown = false;

function fireWeapon(initiated: boolean) {
  if (!player.alive) return;
  const def = currentWeapon(weapons);
  if (def.ammo <= 0) {
    if (initiated && weapons.cooldown <= 0) audio.playEmpty();
    return;
  }
  if (!tryFire(weapons)) return;
  if (def.id === 'shotgun') audio.playShotgun();
  else audio.playPistol();
  const damageByEnemy = new Map<Enemy, number>();
  for (const ray of getShotRays(weapons, camera)) {
    const hit = raycastShot(ray.origin, ray.direction);
    if (hit && hit.alive) {
      damageByEnemy.set(hit, (damageByEnemy.get(hit) ?? 0) + def.damagePerPellet);
    }
  }
  for (const [e, dmg] of damageByEnemy) {
    if (!e.alive) continue;
    const dist = Math.hypot(
      e.sprite.position.x - camera.position.x,
      e.sprite.position.z - camera.position.z,
    );
    if (hitEnemy(e, dmg)) {
      kills++;
      audio.playEnemyDeath(dist);
    } else {
      audio.playEnemyHurt(dist);
    }
  }
}

renderer.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  audio.initAudio();
  audio.startMusic();
  if (gameOver) {
    location.reload();
    return;
  }
  if (document.pointerLockElement !== renderer.domElement) {
    void renderer.domElement.requestPointerLock();
    return;
  }
  mouseDown = true;
  fireWeapon(true);
});

addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseDown = false;
});

addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch));
});

const raycaster = new THREE.Raycaster();
raycaster.camera = camera;
function raycastShot(origin: THREE.Vector3, direction: THREE.Vector3): Enemy | null {
  raycaster.set(origin, direction);
  const aliveSprites = enemies.filter((e) => e.alive).map((e) => e.sprite);
  if (aliveSprites.length === 0) return null;
  const hits = raycaster.intersectObjects(aliveSprites, false);
  if (hits.length === 0) return null;
  const hit = hits[0];
  const rayR = new RAPIER.Ray(
    { x: origin.x, y: origin.y, z: origin.z },
    { x: direction.x, y: direction.y, z: direction.z },
  );
  const wallHit = world.castRay(rayR, hit.distance, true, undefined, undefined, player.collider);
  if (wallHit && wallHit.timeOfImpact < hit.distance - 0.05) return null;
  return enemies.find((e) => e.sprite === hit.object) ?? null;
}

function showMessage(text: string, subtitle: string) {
  messageEl.innerHTML = `${text}<small>${subtitle}</small>`;
  messageEl.classList.remove('hidden');
}

function refreshHud() {
  hpEl.textContent = String(Math.max(0, player.hp | 0));
  hpEl.classList.toggle('low', player.hp < 30);
  const def = currentWeapon(weapons);
  weaponEl.textContent = def.label;
  ammoEl.textContent = String(def.ammo);
  ammoEl.classList.toggle('low', def.ammo < Math.max(2, Math.ceil(def.maxAmmo * 0.15)));
  killsEl.textContent = `${kills}/${totalEnemies}`;
}

let portalTriggered = false;
function travelTo(target: string) {
  if (portalTriggered) return;
  portalTriggered = true;
  document.exitPointerLock();
  const url = new URL(location.href);
  if (target === 'outdoor') url.searchParams.set('level', 'outdoor');
  else url.searchParams.delete('level');
  location.href = url.toString();
}

const clock = new THREE.Clock();
let elapsed = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  updatePlayer(player, keys, dt, yaw, sprintOn);
  world.step();

  const pos = getPlayerPosition(player);
  camera.position.set(pos.x, pos.y + EYE_HEIGHT_OFFSET, pos.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
  torch.position.copy(camera.position);

  if (player.alive) updateEnemies(dt, pos, world, player);
  updateWeapon(weapons, dt);

  aimedSwitch = player.alive ? findAimedSwitch(camera, world, player.collider) : null;
  actionHintEl.classList.toggle('hidden', !aimedSwitch);

  updatePortals(camera, elapsed);
  if (player.alive && !portalTriggered) {
    const hit = checkPortalTrigger(pos);
    if (hit) travelTo(hit.target);
  }

  if (mouseDown && player.alive && document.pointerLockElement === renderer.domElement) {
    fireWeapon(false);
  }

  if (player.hp < lastHp) {
    damageFlash = 1;
    if (player.alive) audio.playPlayerHurt();
  }
  lastHp = player.hp;
  if (damageFlash > 0) {
    damageEl.style.opacity = String(damageFlash * 0.9);
    damageFlash = Math.max(0, damageFlash - dt * 3);
    if (damageFlash === 0) damageEl.style.opacity = '0';
  }

  if (player.alive) {
    const stepDelta = Math.hypot(pos.x - lastPos.x, pos.z - lastPos.z);
    footstepDist += stepDelta;
    if (footstepDist > 1.6 && player.controller.computedGrounded()) {
      audio.playStep();
      footstepDist = 0;
    }
    lastPos.set(pos.x, 0, pos.z);
  }

  if (isOutdoor && !bossSpawned && kills >= regularEnemyCount && regularEnemyCount > 0) {
    bossSpawned = true;
    spawnEnemy(scene, { x: 0, y: 0, z: -22 }, 'bite-boss');
    audio.playEnemyHurt(2);
    showMessage('LE BOSS APPARAÎT', 'Bonne chance');
    setTimeout(() => messageEl.classList.add('hidden'), 1800);
  }

  if (player.alive && player.hp <= 0) {
    player.alive = false;
    gameOver = true;
    document.exitPointerLock();
    audio.stopMusic(0.4);
    audio.playGameOver();
    showMessage('VOUS ÊTES MORT', 'Clic pour recommencer');
  }

  refreshHud();
  renderer.render(scene, camera);
});
