# Rendu 3D des calques de restitution XIIIe — étude & plan de développement

**Périmètre de cette étude** : le mode *transparence / X-ray avec arêtes renforcées* pour les calques
`restitution-XIIIe-transparence` et `restitution-XIIIe` (`js/config.js` → `LAYERS`).
Le mode *texturé* (matériaux PBR du GLTF) est traité en phase ultérieure — il existe déjà "gratuitement"
puisque c'est le matériau natif du modèle.

**Contrainte absolue** (rappel `wapps/landevennec/CLAUDE.md`) : aucune modification de `public/src/`,
`services/`, ni du core ATON. Tout reste dans `wapps/landevennec/` (+ éventuellement `data/scenes/...`
pour la déclaration des nœuds).

---

## 1. État actuel de la scène

`data/scenes/alban/landevennec/scene.json` :

```json
"restitution-XIIIe-transparence": { "urls": [], "show": false },
"restitution-XIIIe":              { "urls": ["alban/models/abbaye_001.glb"], "show": false }
```

Les deux nœuds sont enfants de `.` (racine). Aujourd'hui, **`restitution-XIIIe-transparence` est vide** :
il n'a pas son propre modèle. Il faudra lui assigner la même URL (`alban/models/abbaye_001.glb`).

Le système de chargement ATON (`ATON.node.js#load`) **dédoublonne par URL** : la seconde requête sur la
même URL réutilise la promesse déjà résolue et fait un `.clone()` de la hiérarchie THREE — donc charger
le même `.glb` sur les deux nœuds ne coûte pas de bande passante supplémentaire, et donne deux
hiérarchies `Object3D` indépendantes (donc deux jeux de matériaux indépendants).

→ **Conclusion** : ajouter `"urls": ["alban/models/abbaye_001.glb"]` au nœud
`restitution-XIIIe-transparence` est la base technique pour avoir deux rendus différents du même modèle.

---

## 2. Comment ATON expose THREE.js — ce qu'on peut faire depuis une wapp

### 2.1 Matériaux par nœud : `node.setMaterial()` / `restoreMaterials()`

`ATON.node.js` (méthodes disponibles sur tout `SceneNode`, donc sur `ATON.getSceneNode("restitution-XIIIe-transparence")`) :

- **`setMaterial(M)`** : applique en cascade un `THREE.Material` à tous les meshes du nœud et de ses
  enfants (présents *et futurs*, car le matériau est mémorisé dans `userData.cMat` et réappliqué aux
  meshes chargés ultérieurement — cf. `ATON.node.js:535`). L'ancien matériau de chaque mesh est sauvegardé
  dans `mesh.userData.origMat`.
- **`restoreMaterials()`** : restaure les matériaux d'origine (les PBR du GLTF) — utile pour basculer
  vers le mode "texturé" plus tard.

C'est **exactement le mécanisme qu'il faut** pour appliquer un `ShaderMaterial` X-ray au nœud
`restitution-XIIIe-transparence` sans toucher au core : on appelle simplement
`ATON.getSceneNode("restitution-XIIIe-transparence").setMaterial(monShaderXray)` une fois le modèle chargé
(événement `AllNodeRequestsCompleted`, déjà utilisé dans `main.js:31`).

⚠️ Limite : `setMaterial` applique **un seul matériau partagé** à tous les meshes. Si le modèle a
plusieurs matériaux d'origine (pierre, bois, etc.) et qu'on veut un jour moduler l'effet par matériau
(ex. couleur d'arête différente par matériau), il faudra soit cloner le matériau par mesh
(`mesh.material = monMat.clone()` dans un `traverse()` maison, en gardant `mesh.userData.origMat`), soit
encoder l'info dans les `userData` du mesh avant d'écraser le matériau.

### 2.2 `ATON.MatHub` — bibliothèque de matériaux

`public/src/ATON.mathub.js` contient déjà des `ShaderMaterial` de référence très proches du besoin :

- **`MatHub.materials.defUI`** (= bibliothèque "X-Ray") : Fresnel simple — `gl_FragColor = vec4(tint, f)`
  où `f` dépend de l'angle de vue par rapport à la normale (effet de bord lumineux / transparence au
  centre). C'est la **base idéale** pour l'effet "X-ray" demandé.
- **`MatHub.materials.xray`** : clone de `defUI` avec `opacity=0.5`, blanc.
- **`MatHub.materials.wireframe`** : `MeshBasicMaterial` natif avec `wireframe: true` — **ce n'est PAS**
  ce qui est demandé (le wireframe THREE dessine *toutes* les arêtes de triangulation, pas seulement les
  arêtes géométriques "dures").
- `MatHub.getDefVertexShader()` fournit un vertex shader standard (varyings position/normale monde et
  vue, UV) réutilisable tel quel pour bâtir notre propre `ShaderMaterial`.

Ces matériaux sont **enregistrés globalement** dans `ATON.MatHub.materials` / `_matLib`. On peut soit :

- les réutiliser directement (`ATON.MatHub.getMaterial("defUI").clone()`),
- soit enregistrer un nouveau matériau custom via `ATON.MatHub.addMaterial("xray-edges", monMat)` —
  **ceci est une API publique du core pensée pour être appelée depuis l'extérieur** (cf. exemple dans la
  JSDoc `ATON.MatHub.registerInLibrary("mymat", {...})`), donc parfaitement dans les clous de la
  contrainte "pas de modification du core".

### 2.3 Post-processing (`ATON.FX` / `EffectComposer`) — ⚠️ inutilisable en VR

`public/src/ATON.fx.js` expose `ATON.FX.composer` (un `THREE.EffectComposer` déjà construit, avec passes
AO/Bloom/DOF/SSR désactivées par défaut). On pourrait y ajouter un `OutlinePass`
(`node_modules/three/examples/jsm/postprocessing/OutlinePass.js`, dispo dans `THREE.bundle.js`) pour
dessiner des contours par sélection d'objets.

**Mais** : `ATON.js:2512`

```js
if (!ATON.FX.composer || ATON.XR._bPresenting)
    ATON._renderer.render(...);     // rendu direct
else
    ATON.FX.composer.render();      // post-processing
```

→ **dès qu'on est en session WebXR (casque), tout le pipeline `EffectComposer` est court-circuité** et le
rendu repasse en direct. Comme Landévennec est une expérience **principalement VR (Meta Quest 3)**,
toute solution basée sur `OutlinePass` / post-processing ne fonctionnera **que sur le médiateur
desktop (`control3d.html`)**, pas dans le casque.

→ **Conclusion** : on écarte l'`OutlinePass` comme solution *principale*. Il reste éventuellement
utilisable comme "bonus" pour la vue médiateur desktop, mais l'effet visiteur-casque doit être porté par
de la **géométrie / du matériau**, qui fonctionne identiquement en VR et en desktop.

### 2.4 Géométrie d'arêtes : `THREE.EdgesGeometry` + `THREE.Line2` / `THREE.LineMaterial`

THREE (bundlé, `0.184.0`) expose nativement :

- **`THREE.EdgesGeometry(geometry, thresholdAngle)`** : calcule uniquement les arêtes dont l'angle
  dièdre dépasse `thresholdAngle` (défaut 1°). C'est **exactement** la notion d'"arêtes de la géométrie"
  demandée (≠ wireframe qui inclut les diagonales de triangulation). Classe core THREE, toujours
  disponible.
- **`THREE.LineSegments`** + `THREE.LineBasicMaterial` : rendu simple, mais `linewidth` est ignoré sur
  la plupart des drivers (limitation WebGL historique) → traits fins de 1px quel que soit le réglage.
- **`THREE.Line2` / `THREE.LineMaterial` / `THREE.LineGeometry`** : "fat lines" (épaisseur en pixels ou
  en unités monde, couleur, opacité, dash...). **Vérifié dans `tools/bundle.js`** (source du build
  `THREE.bundle.js`) : ces trois classes sont explicitement importées depuis
  `three/addons/lines/{Line2,LineMaterial,LineGeometry}.js` et assignées à
  `THREE.Line2`, `THREE.LineMaterial`, `THREE.LineGeometry` sur l'objet global — donc **disponibles
  directement** dans la wapp (`new THREE.Line2(...)`, `new THREE.LineGeometry()`, etc.), sans import
  supplémentaire.
  - ⚠️ Nuance : les classes de base `LineSegments2` et `LineSegmentsGeometry` (dont héritent
    respectivement `Line2` et `LineGeometry`) ne sont **pas** exposées séparément sur `THREE` — mais ce
    n'est pas un problème : `LineGeometry` hérite de `LineSegmentsGeometry` (et donc de sa méthode
    `fromEdgesGeometry()`), et `Line2` hérite de `LineSegments2` (rendu identique). On utilise donc
    `THREE.LineGeometry` + `THREE.Line2` directement, ce qui couvre le besoin "segments d'arêtes".
  - `LineMaterial` a un uniform `resolution` qu'il faut tenir à jour sur `resize` (et idéalement par œil
    en VR — voir limitations ci-dessous).

**Génération** : pour chaque `THREE.Mesh` du modèle chargé, créer

```js
const edgesGeom = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);
const lineGeom  = new THREE.LineGeometry().fromEdgesGeometry(edgesGeom);
const lines     = new THREE.Line2(lineGeom, lineMaterial);
```

positionné/orienté comme le mesh (même `matrix`), ajouté comme **frère** du mesh (ou enfant du même
parent) dans le nœud `restitution-XIIIe-transparence` uniquement.

⚠️ Coût : `EdgesGeometry` + `LineGeometry` sont calculés une fois au chargement (pas par frame) — coût
négligeable pour un bâtiment de taille abbaye, sauf si le `.glb` est très haute densité (à vérifier avec
`abbaye_001.glb`).

⚠️ Limitation connue de `Line2`/`LineMaterial` en WebXR : le uniform `resolution` est global au renderer,
pas par œil — dans certains setups stéréo l'épaisseur en pixels peut légèrement différer entre les deux
yeux. Pour une abbaye (échelle architecturale), privilégier `worldUnits: true` sur `LineMaterial`
(épaisseur en mètres, ex. 0.01–0.02m) plutôt qu'en pixels — supprime le problème de `resolution` par œil.

---

## 3. Proposition technique pour l'effet "X-ray + arêtes renforcées"

Combinaison de deux éléments, tous deux applicables uniquement au nœud `restitution-XIIIe-transparence` :

### 3.1 Matériau de surface : `ShaderMaterial` Fresnel (type `MatHub.defUI`/`xray`)

Repartir de `MatHub.getDefVertexShader()` (déjà fourni par le core) + fragment shader Fresnel similaire à
`defUI` :

```glsl
float f = dot(vNormalV, vec3(0,0,1));   // alignement normale/caméra (espace vue)
f = clamp(1.0 - f, 0.0, 1.0);           // 0 = face caméra, 1 = silhouette
f = pow(f, fresnelPower);               // contrôle de la "dureté" du halo
gl_FragColor = vec4(tint, mix(opacityCenter, opacitySilhouette, f));
```

- `transparent: true`, `depthWrite: false`, `side: THREE.DoubleSide` (pour voir l'intérieur du bâtiment
  en X-ray).
- Uniforms exposés (`tint`, `opacityCenter`, `opacitySilhouette`, `fresnelPower`) → réglables en live
  depuis le panneau médiateur si besoin (cf. tiroir `control3d.js`).

### 3.2 Arêtes renforcées : `THREE.Line2` générés depuis `EdgesGeometry`

- `thresholdAngle` configurable (15–30° typiquement pour ne garder que les arêtes architecturales :
  murs, ouvertures, toitures — pas le bruit de la tessellation des surfaces courbes).
- `LineMaterial` : couleur sombre ou contrastée, `worldUnits: true`, épaisseur ~0.01–0.03m,
  `transparent: false`, `depthTest: true` (pour que les arêtes soient occultées correctement entre elles,
  mais visibles à travers le matériau X-ray transparent du point 3.1 — l'ordre de rendu et
  `depthWrite:false` du matériau de surface garantit que les lignes ne sont pas cachées par les faces
  transparentes).

### 3.3 Application au nœud

```js
// au chargement (AllNodeRequestsCompleted), une seule fois :
const N = ATON.getSceneNode("restitution-XIIIe-transparence");

N.setMaterial(xrayMaterial);     // cascade sur tous les meshes (présents + futurs)
addEdgesToNode(N, edgeMaterial); // parcourt N, génère et ajoute les LineSegments2 par mesh
```

`restitution-XIIIe` (mode texturé) n'est pas touché : il garde ses matériaux GLTF d'origine. Le toggle
`LAYER_SET` existant (`config.js` / `network.js`) continue de piloter uniquement la **visibilité** des
deux nœuds — aucun changement requis dans la logique de calques.

### 3.4 État d'implémentation — Fresnel seul, pistes d'arêtes/cavity abandonnées (2026-06-12)

Le matériau Fresnel (§3.1) est implémenté dans `js/render-xray.js` et **fonctionne bien** : appliqué via
`N.setMaterial(xrayMaterial)` sur `restitution-XIIIe-transparence`, il donne le rendu attendu. C'est la
seule technique active dans `render-xray.js`.

Plusieurs pistes de renforcement des arêtes "dures" ont été explorées et **abandonnées** :

- **Arêtes géométriques (§3.2, `EdgesGeometry` + `Line2`)** : calculer un `EdgesGeometry` par sous-mesh
  fait apparaître une arête parasite à chaque jonction entre sous-meshes (le modèle `abbaye_001.glb` compte
  59 sous-meshes) — `EdgesGeometry` trace systématiquement les *boundary edges* (arêtes n'ayant qu'une face
  adjacente dans le mesh courant), même quand la jonction est plane/continue. Deux correctifs ont été
  tentés sans succès :
  - fusion + soudure des vertices de tous les sous-meshes (tolérance 1mm, implémentation manuelle car
    `THREE.BufferGeometryUtils` est `undefined` dans `THREE.bundle.js` — bug de `tools/bundle.js`) avant un
    unique `EdgesGeometry` ;
  - reconstruction complète de la détection d'arêtes (classification par arête : arête de bord réelle vs.
    jonction entre faces, conservée seulement si l'angle dièdre dépasse le seuil).
  Dans les deux cas, de la géométrie d'arêtes parasite persiste sur ces modèles — cause non identifiée.
- **Shader "Cavity" par dérivées d'écran (`dFdx`/`dFdy`, divergence normale plate/lissée)** : effet quasi
  invisible, limité à 1-2 px de large, indépendamment du multiplicateur appliqué.
- **Shader "Cavity" par vertex colors (Dirty Vertex Colors bakées dans Blender)** : non probant — les
  modélisations architecturales manquent de densité de facettes pour que ce type de courbure locale soit
  significatif.

**Conclusion** : pour ces modèles low-poly à arêtes franches, ni les techniques de cavité (pensées pour
des maillages organiques denses) ni la génération d'arêtes géométriques (bloquée par la structure en
nombreux sous-meshes) n'ont donné de résultat satisfaisant en un temps raisonnable. `render-xray.js` est
simplifié au strict matériau Fresnel ; toute reprise de ces pistes nécessiterait vraisemblablement un
retraitement des `.glb` en amont (fusion des sous-meshes, recalcul des normales) plutôt qu'un traitement
à la volée côté client.

---

## 4. Et les "flares" ?

Les *flares* ATON (`config/flares/<name>/flare.json`) sont des **plugins serveur** (Express, enregistrés
au démarrage du service Main) — leur rôle est d'exposer des routes/API côté backend (ex. servir des
données spécifiques, traitement serveur). **Ils n'ont aucun rôle dans le rendu THREE.js côté client.**

→ Pour cette fonctionnalité (shaders, géométrie d'arêtes, matériaux), **les flares ne sont pas le bon
mécanisme**. Tout se fait côté client, dans les modules JS de la wapp (`wapps/landevennec/js/`). On les
gardera en tête seulement si une étape future nécessite un traitement serveur (ex. pré-calcul d'un
`.glb` "edges-only" optimisé, génération d'atlas de textures, etc.) — pas nécessaire pour la phase
transparence.

---

## 5. Plan de développement proposé (phase "transparence")

| Étape | Contenu | Fichiers concernés |
| --- | --- | --- |
| **1. Déclaration scène** | Ajouter `"urls": ["alban/models/abbaye_001.glb"]` au nœud `restitution-XIIIe-transparence` (dédoublonnage automatique côté core, pas de coût réseau additionnel). | `data/scenes/alban/landevennec/scene.json` |
| **2. Module matériaux** | Nouveau fichier `js/render-xray.js` : définit le `ShaderMaterial` Fresnel (X-ray) et le `LineMaterial` pour les arêtes, avec constantes réglables en tête de fichier (tint, opacités, fresnelPower, edge color, edge width, thresholdAngle). | `wapps/landevennec/js/render-xray.js` (nouveau) |
| **3. Génération des arêtes** | Fonction `addEdgesToNode(node, lineMat, thresholdAngle)` : `traverse()` sur les meshes du nœud, `EdgesGeometry` → `LineGeometry` → `Line2`, ajout en frère de chaque mesh. | idem |
| **4. Hook de chargement** | Sur `AllNodeRequestsCompleted` (déjà utilisé dans `main.js:31`), une fois : `getSceneNode("restitution-XIIIe-transparence").setMaterial(xrayMat)` + `addEdgesToNode(...)`. Idempotent (flag pour éviter double-application si l'event refire). | `js/main.js` (quelques lignes d'init) |
| **5. Intégration HTML** | `<script src="js/render-xray.js">` ajouté avant `main.js` dans `index.html` (et `control3d.html` si la vue médiateur doit aussi afficher l'effet). | `index.html`, `control3d.html` |
| **6. Réglages visuels** | Itération empirique sur `abbaye_001.glb` : `thresholdAngle` (filtrer le bruit géométrique), épaisseur/couleur des arêtes, opacités Fresnel — à tester en desktop **et** en casque (le rendu diffère). | — |
| **7. (Optionnel) Panneau médiateur** | Si besoin de régler en live : sliders dans le tiroir `control3d.js` qui modifient les `uniforms` du `ShaderMaterial` et du `LineMaterial` via Photon (similaire aux toggles `LAYER_SET`). | `js/control3d.js`, `mediator.css` |

### Points de vigilance / dépendances à vérifier en implémentation

- **`THREE.Line2` / `THREE.LineGeometry` / `THREE.LineMaterial`** : présence confirmée dans
  `tools/bundle.js` (assignées explicitement au global `THREE`, donc disponibles tel quel dans la wapp).
  `LineGeometry.fromEdgesGeometry()` est hérité de `LineSegmentsGeometry` (non exposée séparément, mais
  pas nécessaire). À valider une fois en pratique avec `console.log(THREE.Line2, THREE.LineGeometry)`.
- **Densité de `abbaye_001.glb`** : si le modèle contient beaucoup de petites faces (ex. pierres
  individuelles), `EdgesGeometry` avec un `thresholdAngle` bas générera un maillage d'arêtes très dense
  (visuellement bruyant + coût mémoire). Prévoir un `thresholdAngle` plus élevé (30–45°) et/ou exclure
  certains sous-objets via leur nom (`mesh.name`).
- **Profondeur / z-fighting** : avec `depthWrite:false` sur le matériau X-ray et `depthTest:true` sur les
  lignes, vérifier qu'il n'y a pas de conflit d'ordre de rendu (THREE trie par défaut `renderOrder` puis
  matériau transparent vs opaque — peut nécessiter de fixer `renderOrder` explicitement sur les `Line2`
  pour qu'ils soient dessinés après les faces transparentes).
- **Performance VR** : tester sur Quest 3 avec le calque actif — chaque `Line2` ajoute un draw call par
  mesh ; pour un modèle très subdivisé, envisager de fusionner les géométries d'arêtes
  (`BufferGeometryUtils.mergeGeometries`) en un seul `Line2` par nœud.

---

## 6. Phase suivante (texturé) — aperçu rapide

Pour `restitution-XIIIe` en mode "texturé", a priori **rien à développer** : le GLTF porte déjà ses
matériaux PBR (`MeshStandardMaterial`/`MeshPhysicalMaterial` avec textures), et tant qu'on n'appelle pas
`setMaterial()` sur ce nœud, le rendu par défaut d'ATON (`GLTFLoader` standard) s'applique. Le travail de
cette phase consistera plutôt à :

- vérifier l'éclairage/IBL (`environment` de la scène) pour que les textures restituées soient lisibles,
- éventuellement un shader de "transition" (fondu entre l'état actuel et la restitution texturée) si le
  médiateur veut un effet de morphing entre calques — à discuter séparément.
