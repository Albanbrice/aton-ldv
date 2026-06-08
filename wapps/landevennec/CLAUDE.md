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

Chaque fichier est un module IIFE renvoyant une API publique. Ils sont chargés via `<script>` dans l'ordre ; `config.js` puis `common.js` doivent être les premiers.

| Module | Objet global | Rôle |
|---|---|---|
| `config.js` | constantes globales | `SESSION_ID`, `SCENE_DEFAULT`, `POVS`, `LAYERS` — source de vérité unique |
| `common.js` | fonctions globales | `flash(el)`, `buildLayerRows(...)` — utilitaires partagés entre les 3 interfaces |
| `main.js` | — | Setup visiteur : `APP.setup` + `APP.update` |
| `ui.js` | `UI` | DOM 2D : loading screen, panneau annotation, toast, boutons VR/accueil, panneau calques local |
| `network.js` | `Network` | Réception des événements Photon côté visiteur |
| `annotations.js` | `Annotations` | Hover sémantique → panneau HTML (desktop) + infoNode + MediaPanel (VR) |
| `xr.js` | `XRModule` | Snap rotation, snap altitude, swipes, correction infoNode, avatar culling |
| `control.js` | — | Setup médiateur headless : `ATON.realize(true)`, pas de 3D |
| `control3d.js` | — | Setup médiateur 3D : calques, POVs, partage de vue, message broadcast |

## Feuilles de style (`css/`)

| Fichier | Chargé par | Contenu |
|---|---|---|
| `common.css` | les 3 pages | Reset, variables CSS (`--eye-closed`, `--eye-open`, couleurs), toast |
| `viewer.css` | `index.html` + `control3d.html` | Canvas 3D, overlay, barre de contrôles, panneau infos, loading, calques locaux, collab |
| `control.css` | `control.html` | Layout page médiateur tablette |
| `mediator.css` | `control3d.html` | Tiroir médiateur 3D (drawer, sections, éléments `.med-*`) |

## Constantes de paramétrage (`xr.js`)

```js
const SNAP_ANGLE         = 15 * (Math.PI / 180); // angle par snap rotation
const SNAP_COOLDOWN      = 350;    // ms entre deux snaps (partagé rotation + altitude + swipes)
const SWIPE_THRESHOLD    = 0.012;  // m/frame — seuil vitesse swipe (≈0.87 m/s à 72fps)
const SWIPE_ON_PRIMARY   = false;  // false = main gauche ; true = main droite
const AVATAR_CULL_RADIUS = 0.5;    // m — rayon de masquage des avatars locaux
const ANNO_LABEL_T       = 0.5;    // 0..1 — position infoNode entre annotation (0) et œil (1)
const ALTITUDE_STEP      = 2;      // m par snap vertical
const FLOOR_OFFSET       = 1.7;    // m — hauteur œil au-dessus du terrain (rig.y = hauteur yeux)
const CEILING_HEIGHT     = 30;     // m au-dessus du sol — plafond maximal
const TERRAIN_NODES      = ["etat-actuel", "restitution-XIIIe"]; // priorité de raycast terrain
```

## Inputs VR (manette gauche = secondaire)

| Input | Action |
|---|---|
| Thumbstick axe X | Snap rotation ±15° (pattern armé) |
| Thumbstick axe Y | Snap altitude ±2m (pousser = monter) |
| Bouton X (`buttons[4]`) | Snap rotation gauche |
| Bouton Y (`buttons[5]`) | Snap rotation droite |
| Swipe horizontal | Snap rotation (même main que SWIPE_ON_PRIMARY) |
| Swipe vertical | Snap altitude (même main) |

Plancher : raycast vers le bas sur le premier nœud terrain visible + `FLOOR_OFFSET`.
Plafond : terrain + `FLOOR_OFFSET` + `CEILING_HEIGHT`.
Plancher mis à jour à `XRstart` et 50ms après chaque téléportation (`XRselectEnd`).

## Événements Photon (canal `landevennec`)

| Événement | Payload | Émetteur → Récepteur |
|---|---|---|
| `GOTO_POV` | `{ id }` | médiateur → visiteurs |
| `GOTO_POV_RAW` | `{ pos, target, fov }` | médiateur → visiteurs |
| `LAYER_SET` | `{ node, visible }` | médiateur → visiteurs + médiateur 3D |
| `NAV_TOGGLE` | `{ enabled }` | médiateur → visiteurs + médiateur 3D |
| `LAYERS_UNLOCK` | `{ enabled }` | médiateur → visiteurs (autorise contrôle local des calques) |
| `BROADCAST` | `{ text }` | médiateur → tous |

## Calques (`config.js` → `LAYERS`)

```js
const LAYERS = [
  { node: "etat-actuel",       label: "Etat actuel du site",   visible: true  },
  { node: "restitution-XIIIe", label: "Restitution XIIIe s.",  visible: false },
  { node: "archives-photo",    label: "Photos d'archives",     visible: false },
];
```

`visible` est la source de vérité pour l'état initial. Les nœuds correspondent aux IDs du scenegraph dans `data/scenes/alban/landevennec/scene.json`. `buildLayerRows()` (common.js) factorise la construction des toggles pour les 3 interfaces ; le callback `onToggle(layer, btn, vis)` porte la logique métier propre à chaque interface.

## Décisions de conception non-évidentes

**Swipe : `ctrl.position.x/y` et non `userData.pos.x/y`**
`userData.pos` est mis à jour via `getWorldPosition()` — il inclut la rotation du rig. Après des snaps cumulés, les composantes monde s'annulent et le swipe cesse de fonctionner. `ctrl.position` est la pose brute WebXR en espace salle, indépendante de la rotation du rig.

**`ATON.XR.gpad1` est toujours `undefined`**
Dans le core ATON, `gpad0`/`gpad1` sont initialisés à `undefined` et jamais réassignés (le bloc d'assignation est commenté). Pour lire les boutons X/Y, utiliser `ATON.XR.getSecondaryController().userData.gm.buttons`.

**Correction quaternion infoNode (`_fixInfoNodeOrientation`)**
`SUI.orientToCamera()` utilise `Nav._qOri = cameras[0].quaternion` (quaternion LOCAL de la caméra), qui n'inclut pas la rotation snap du rig. On corrige en appelant `node.quaternion.premultiply(rig.getWorldQuaternion(...))` après chaque appel à `SUI.update()`.

**Redimensionnement `infoContainer` (`annotations.js`)**
Le `ThreeMeshUI.Block` du core est figé à `width:0.2 height:0.05`. On appelle `infoContainer.set({width, height})` avant `setInfoNodeText()` ; `ThreeMeshUI.update()` est déclenché à l'intérieur de `setInfoNodeText`, ce qui applique les deux changements ensemble.

**DOM invisible en `immersive-vr`**
Les interfaces HTML (`control.html`, `control3d.html`) ne sont pas visibles dans le casque. Le contrôle médiateur en VR se fait depuis une tablette ou un PC — pas de panneau 3D (SUI) pour les contrôles médiateur.

**Reset rotation au `XRselectStart` — désactivé pour le médiateur**
Pour les visiteurs, chaque téléportation réinitialise `rig.rotation` à `(0,0,0)` (évite le décalage angulaire post-snap). Pour le médiateur, ce reset est désactivé via `setResetRotationOnTeleport(false)` : sans cela, chaque pression de gâchette effaçait silencieusement les snaps accumulés.

**Plancher altitude terrain-aware**
`rig.position.y` dans ATON = hauteur des yeux (pas des pieds). `_getTerrainY()` lance un raycast one-shot vers le bas sur le premier nœud terrain visible. Le résultat est additionné de `FLOOR_OFFSET` (1.7m) pour que le plancher corresponde à la hauteur debout, pas au sol visuel.
