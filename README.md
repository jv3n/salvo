# Salvo

Un FPS minimaliste en navigateur, construit avec [Three.js](https://threejs.org/) pour le rendu et [Rapier](https://rapier.rs/) pour la physique.

**Jouer en ligne :** [jv3n.github.io/salvo](https://jv3n.github.io/salvo)

## Stack

- **Three.js** — rendu 3D
- **@dimforge/rapier3d-compat** — physique (WASM)
- **TypeScript** en mode strict
- **Vite** — dev server et bundler

## Démarrage

```bash
npm install
npm run dev
```

Le serveur Vite démarre sur `http://localhost:5173` (port suivant disponible sinon) et ouvre le navigateur automatiquement.

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement avec HMR |
| `npm run build` | Type-check (`tsc`) puis build de production (`vite build`) |
| `npm run preview` | Sert le build de production en local |
| `npm run format` | Formate le code avec Prettier |
| `npm run format:check` | Vérifie le formatage sans modifier les fichiers |
| `npx tsc --noEmit` | Type-check sans émettre de fichiers |

## Contrôles

- **ZQSD / WASD** — déplacement
- **Espace** — saut
- **Souris** — viser
- **Clic gauche** — tirer
- **Molette / chiffres** — changer d'arme

## Structure

```
src/
├── main.ts        # Bootstrap (init Rapier, boucle de rendu, raycast de tir)
├── level.ts       # Génération du niveau depuis une grille ASCII
├── player.ts      # Character controller kinematic (Rapier)
├── enemies.ts     # IA et sprites des ennemis
├── weapon.ts      # Modèle d'arme attaché à la caméra
├── textures.ts    # Textures générées au runtime via canvas
└── audio.ts       # Effets sonores
```

Voir `.claude/CLAUDE.md` pour les détails d'architecture.
