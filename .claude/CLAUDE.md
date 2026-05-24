# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server (default port 5173, auto-falls back if busy; opens browser via `vite.config.ts`)
- `npm run build` — `tsc` type-check then `vite build`
- `npm run preview` — serve the production build
- `npx tsc --noEmit` — type-check only (no test framework configured)

There is no linter and no test runner; correctness is enforced by the strict `tsconfig.json` (`noUnusedLocals`, `noUnusedParameters`, `strict`).

## Architecture

A first-person shooter built on **Three.js** (rendering) + **@dimforge/rapier3d-compat** (physics). All source is under `src/`; each module owns one concern and they are assembled in `main.ts`.

### Bootstrap order (matters)

`main.ts` does `await RAPIER.init()` at the top level before any other module work — this is why `package.json` sets `"type": "module"` and `vite.config.ts` has `optimizeDeps.exclude: ['@dimforge/rapier3d-compat']` (Vite's pre-bundler chokes on the WASM init). Don't move the init call or import Rapier in modules that execute side-effects at import time.

### World layout

The level is an ASCII tile grid in `src/level.ts` (`#` wall, `.` floor, `S` player spawn, `e` enemy spawn). `buildLevel()`:

- Each tile is `TILE = 2` world units; ceiling height is `WALL_HEIGHT = 3.5`.
- The grid is centered on the origin via `tileToWorld()`.
- One floor plane + one ceiling plane span the whole map (texture `repeat` matches grid size).
- Each `#` tile becomes one `BoxGeometry` mesh **plus** one Rapier cuboid collider at the same transform — visuals and colliders are kept in sync by construction, not by syncing.
- Floor/ceiling get dedicated thin cuboid colliders at y = -0.1 and y = WALL_HEIGHT + 0.1.

### Player

`src/player.ts` uses Rapier's **kinematic character controller** (not a dynamic body). `updatePlayer()` computes a desired translation each frame from WASD/Space + gravity, calls `controller.computeColliderMovement()`, then applies the corrected movement via `setNextKinematicTranslation()`. The camera in `main.ts` reads the player's translation and offsets by `EYE_HEIGHT_OFFSET` — the camera is a child of the scene, not the player.

### Enemies

`src/enemies.ts` keeps a module-level `enemies: Enemy[]` registry. Enemies are `THREE.Sprite` (always camera-facing) with three pre-baked canvas textures (`idle` / `hurt` / `dead`) swapped in-place via `material.map = …; needsUpdate = true`. AI per frame:

- Compute 2D distance to player on the XZ plane.
- If in sight range and outside attack range, cast a short Rapier ray forward to check for walls, then translate the sprite directly (no physics body for enemies).
- If in attack range and cooldown elapsed, decrement `player.hp`.

Enemies have no collider — they pass through each other and only walls block them via the per-step raycast.

### Weapon

`src/weapon.ts` attaches a textured plane to the camera (`camera.add(group)`), which is why `scene.add(camera)` is required in `main.ts`. The plane uses `depthTest: false` + high `renderOrder` so it always draws on top. Firing swaps idle/flash textures and dips the plane Y for recoil; `updateWeapon()` reverses both when the timers expire.

### Shooting

`raycastShot(origin, direction)` in `main.ts` does a **hybrid raycast**: Three.js raycast against enemy sprites, then a Rapier ray on the same line to check if a wall is closer (passing `player.collider` as `filterExcludeCollider` so the cast doesn't hit the player capsule from inside). The Rapier hit type is `RayColliderHit` with `.timeOfImpact` (not `.toi`).

**Gotcha** — when using `raycaster.set(origin, direction)` (instead of `setFromCamera`), you MUST also assign `raycaster.camera = camera` once. `Sprite.raycast` reads it to project the sprite into camera space; without it, sprite intersections silently return zero hits.

### Weapons

`src/weapon.ts` holds one mesh attached to the camera and swaps its geometry/texture/position on weapon switch (`applyWeaponSlot`). Each `WeaponDef` carries its own ammo, cooldown, damage-per-pellet, pellet count, spread (cone half-angle in radians), and view-model dimensions. `getShotRays()` returns N rays in a uniform-disk cone around the camera forward; the caller raycasts each and aggregates damage per enemy via a `Map<Enemy, number>` so multi-pellet hits on one enemy count as a single damage event.

### Textures

`src/textures.ts` builds all visual assets at runtime via `<canvas>` → `THREE.CanvasTexture`. Walls/floor/ceiling repeat (`RepeatWrapping` + `NearestFilter` for a chunky pixel-art look). Enemy and weapon textures are returned as fresh canvases per call — cache them at module load time when reused (see `enemies.ts` which calls `enemyTexture(state)` once per state at import).

### HUD

DOM-based, declared in `index.html` (`#crosshair`, `#hud`, `#message`, `#damage`). `main.ts` holds element references and updates `textContent` / `classList` / `style.opacity` each frame. There is no React or DOM framework.

## Conventions

- Avoid putting setup that depends on Rapier at import time in modules other than `main.ts`; the WASM init only runs in `main.ts`.
- When adding new colliders, place them so they don't overlap the player capsule at spawn (the controller will eject the player and you'll see them launched).
- The strict tsconfig will reject unused imports/locals — clean up as you go rather than batching.
