"use strict";

// Instanciation générique d'éléments architectoniques répétés (colonnes, modénatures,
// claveaux, etc.) via THREE.InstancedMesh, à partir de listes de transforms
// exportées depuis Blender.
const RenderInstances = (() => {
  // ── Déclaration des groupes d'instances ──────────────────────────────────
  // Chaque entrée :
  //   url           : chemin du modèle source, relatif à la collection
  //                    (ex: "alban/models/colonne_type1.glb")
  //   transforms     : tableau de { position:[x,y,z], rotation:[x,y,z], scale:[x,y,z] }
  //                    rotation = angles d'Euler XYZ en radians.
  //   transformsUrl  : alternative à `transforms` — chemin (relatif à ce dossier)
  //                    vers un fichier JSON contenant ce même tableau.
  //   rootTransform  : transform optionnelle appliquée au groupe entier
  //                    (ex: conversion Z-up Blender -> Y-up ATON, comme pour
  //                    le nœud "etat-actuel" dans scene.json).
  //   layer          : optionnel — ID d'un nœud du scenegraph (ex:
  //                    "restitution-XIIIe-transparence") auquel rattacher
  //                    le groupe d'instances. Sa visibilité (show/hide,
  //                    pilotée par LAYERS dans config.js) s'applique alors
  //                    aussi aux instances. Si absent, le groupe est ajouté
  //                    à la racine de la scène (toujours visible).
  const INSTANCE_GROUPS = [
    {
      url: "alban/models/chapiteau_double.glb",
      transformsUrl: "json/instances-cloitre-galeries.json",
      layer: "restitution-XIIIe-transparence",
    },
    {
      url: "alban/models/chapiteau_quadruple.glb",
      transformsUrl: "json/instances-cloitre-chapiteau_quadruple.json",
      layer: "restitution-XIIIe-transparence",
    },
    {
      url: "alban/models/chapiteau_double.glb",
      transformsUrl: "json/instances-cloitre-galeries.json",
      layer: "restitution-XIIIe",
    },
    {
      url: "alban/models/chapiteau_quadruple.glb",
      transformsUrl: "json/instances-cloitre-chapiteau_quadruple.json",
      layer: "restitution-XIIIe",
    },
  ];

  // Constructeur de matériau "instanced" par calque — chaque calque applique
  // son propre rendu (cf. render-xray.js / render-clay.js) ; les instances
  // (chapiteaux), montées séparément du modèle principal, doivent recevoir le
  // même matériau pour rester cohérentes visuellement.
  const LAYER_MATERIAL_BUILDERS = {
    "restitution-XIIIe-transparence": () => RenderXray.buildMaterial({ instanced: true }),
    // MeshStandardMaterial (clay) gère l'instancing nativement, pas besoin de
    // variante de shader dédiée. RenderClay.buildMaterial() peut être appelé
    // avant que l'environnement (IBL) soit chargé : le matériau est mis à jour
    // rétroactivement dès que celui-ci est prêt.
    "restitution-XIIIe": () => RenderClay.buildMaterial(),
  };

  let _bInitialized = false;

  // ── Init ────────────────────────────────────────────────────────────────

  function init() {
    ATON.on("AllNodeRequestsCompleted", () => {
      if (_bInitialized) return;
      _bInitialized = true;

      INSTANCE_GROUPS.forEach(_loadGroup);
    });
  }

  // ── Chargement d'un groupe ──────────────────────────────────────────────

  async function _loadGroup(group) {
    const transforms =
      group.transforms || (await _fetchTransforms(group.transformsUrl));
    if (!transforms || transforms.length === 0) return;

    const layerNode = group.layer && ATON.getSceneNode(group.layer);
    const target = layerNode || ATON.getRootScene();

    // Matériau du calque (ex: shader X-ray, clay), décliné pour gérer
    // THREE.InstancedMesh.
    const materialBuilder = group.layer && LAYER_MATERIAL_BUILDERS[group.layer];
    const instancedMaterial = materialBuilder?.();

    const url = ATON.PATH_COLLECTION + group.url;
    new THREE.GLTFLoader().load(url, (gltf) => {
      const meshes = _findAllMeshes(gltf.scene);
      if (meshes.length === 0) return;

      const root = new THREE.Group();

      meshes.forEach((mesh) => {
        mesh.updateWorldMatrix(true, false);
        const localMatrix = mesh.matrixWorld;

        const material = instancedMaterial || mesh.material;
        const instanced = new THREE.InstancedMesh(
          mesh.geometry,
          material,
          transforms.length
        );

        const m = new THREE.Matrix4();
        transforms.forEach((t, i) => {
          _composeMatrix(m, t);
          m.multiply(localMatrix);
          instanced.setMatrixAt(i, m);
        });
        instanced.instanceMatrix.needsUpdate = true;

        if (RenderShadows.isShadowLayer(group.layer)) RenderShadows.flagShadowMesh(instanced);

        root.add(instanced);
      });

      _applyTransform(root, group.rootTransform);
      target.add(root);
    });
  }

  async function _fetchTransforms(url) {
    if (!url) return null;
    const res = await fetch(url);
    return res.json();
  }

  // ── Utilitaires ─────────────────────────────────────────────────────────

  function _findAllMeshes(obj, out = []) {
    if (obj.isMesh) out.push(obj);
    for (const child of obj.children) _findAllMeshes(child, out);
    return out;
  }

  function _composeMatrix(m, t) {
    const pos = new THREE.Vector3().fromArray(t.position || [0, 0, 0]);
    const rot = new THREE.Euler().fromArray(t.rotation || [0, 0, 0]);
    const scl = new THREE.Vector3().fromArray(t.scale || [1, 1, 1]);
    m.compose(pos, new THREE.Quaternion().setFromEuler(rot), scl);
  }

  function _applyTransform(obj, t) {
    if (!t) return;
    if (t.position) obj.position.fromArray(t.position);
    if (t.rotation) obj.rotation.fromArray(t.rotation);
    if (t.scale) obj.scale.fromArray(t.scale);
  }

  return { init };
})();
