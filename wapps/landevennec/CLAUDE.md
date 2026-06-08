# Landévennec — wapp CLAUDE.md

Visite guidée VR du site abbatial de Landévennec. Trois points d'entrée servis sous `/a/landevennec/`.

## Contrainte absolue

**Ne jamais modifier** `public/src/`, `services/`, ni aucun fichier du core ATON. Tout le développement reste dans `wapps/landevennec/` et `data/scenes/alban/landevennec/`.

## Points d'entrée

| Fichier | URL | Rôle |
|---|---|---|
| `index.html` | `/a/landevennec/` | Visiteur — vue 3D + VR immersive |
| `control.html` | `/a/landevennec/control.html` | Médiateur headless (tablet/PC) — DOM uniquement, pas de rendu 3D |
| `control3d.html` | `/a/landevennec/control3d.html` | Médiateur 3D — vue immersive + panneau DOM |

## Modules JS (`js/`)

Chaque fichier est un module IIFE renvoyant une API publique. Ils sont chargés via `<script>` dans l'ordre dans le HTML ; `config.js` doit être le premier.

| Module | Objet global | Rôle |
|---|---|---|
| `config.js` | constantes globales | `SESSION_ID`, `SCENE_DEFAULT`, `POVS`, `LAYERS` — source de vérité unique |
| `main.js` | — | Setup visiteur : `APP.setup` + `APP.update` |
| `ui.js` | `UI` | DOM 2D : loading screen, panneau annotation, toast, boutons VR/accueil |
| `network.js` | `Network` | Réception des événements Photon côté visiteur |
| `annotations.js` | `Annotations` | Hover sémantique → panneau HTML (desktop) + infoNode + MediaPanel (VR) |
| `xr.js` | `XRModule` | Snap rotation, correction infoNode, avatar culling |
| `control.js` | — | Setup médiateur headless : `ATON.realize(true)`, pas de 3D |
| `control3d.js` | — | Setup médiateur 3D : calques, POVs, partage de vue, message broadcast |

## Constantes de paramétrage (`xr.js`)

```js
const SNAP_ANGLE         = 15 * (Math.PI / 180); // angle par snap
const SNAP_COOLDOWN      = 350;    // ms entre deux snaps
const SWIPE_THRESHOLD    = 0.012;  // m/frame — seuil vitesse swipe (≈0.87 m/s à 72fps)
const SWIPE_ON_PRIMARY   = false;  // false = main gauche (joystick/X·Y) ; true = main droite
const AVATAR_CULL_RADIUS = 0.5;    // m — rayon de masquage des avatars locaux
const ANNO_LABEL_T       = 0.5;    // 0..1 — position infoNode entre annotation (0) et œil (1)
```

## Événements Photon (canal `landevennec`)

| Événement | Payload | Émetteur → Récepteur |
|---|---|---|
| `GOTO_POV` | `{ id }` | médiateur → visiteurs |
| `GOTO_POV_RAW` | `{ pos, target, fov }` | médiateur → visiteurs |
| `LAYER_SET` | `{ node, visible }` | médiateur → visiteurs + médiateur 3D |
| `NAV_TOGGLE` | `{ enabled }` | médiateur → visiteurs + médiateur 3D |
| `BROADCAST` | `{ text }` | médiateur → tous |

## Calques (`config.js` → `LAYERS`)

```js
const LAYERS = [
  { node: "etat-actuel",       label: "Etat actuel du site",   visible: true  },
  { node: "restitution-XIIIe", label: "Restitution XIIIe s.",  visible: false },
  { node: "archives-photo",    label: "Photos d'archives",     visible: false },
];
```

`visible` est la source de vérité pour l'état initial des toggles dans `control.js` et `control3d.js`. Les nœuds doivent correspondre aux IDs du scenegraph dans `data/scenes/alban/landevennec/scene.json`.

## Décisions de conception non-évidentes

**Swipe : `ctrl.position.x` et non `userData.pos.x`**
`userData.pos` est mis à jour via `getWorldPosition()` — il inclut la rotation du rig. Après des snaps cumulés, la composante X monde s'annule et le swipe cesse de fonctionner. `ctrl.position` est la pose brute WebXR en espace salle, indépendante de la rotation du rig.

**`ATON.XR.gpad1` est toujours `undefined`**
Dans le core ATON, `gpad0`/`gpad1` sont initialisés à `undefined` et jamais réassignés (le bloc d'assignation est commenté). Pour lire les boutons X/Y, utiliser `ATON.XR.getSecondaryController().userData.gm.buttons`.

**Correction quaternion infoNode (`_fixInfoNodeOrientation`)**
`SUI.orientToCamera()` utilise `Nav._qOri = cameras[0].quaternion` (quaternion LOCAL de la caméra), qui n'inclut pas la rotation snap du rig. On corrige en appelant `node.quaternion.premultiply(rig.getWorldQuaternion(...))` après chaque appel à `SUI.update()`.

**Redimensionnement `infoContainer` (`annotations.js`)**
Le `ThreeMeshUI.Block` du core est figé à `width:0.2 height:0.05`. On appelle `infoContainer.set({width, height})` avant `setInfoNodeText()` ; `ThreeMeshUI.update()` est déclenché à l'intérieur de `setInfoNodeText`, ce qui applique les deux changements ensemble.

**DOM invisible en `immersive-vr`**
Les interfaces HTML (`control.html`, `control3d.html`) ne sont pas visibles dans le casque. Le contrôle médiateur en VR se fait depuis une tablette ou un PC via `control3d.html` — pas de panneau 3D (SUI) pour les contrôles médiateur.

**Reset rotation au `XRselectStart` (main droite + téléportation active)**
Chaque téléportation réinitialise `rig.rotation` à `(0,0,0)` pour éviter qu'un décalage angulaire accumulé persiste après changement de position.
