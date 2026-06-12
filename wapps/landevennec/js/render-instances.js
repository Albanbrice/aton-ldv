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
  const INSTANCE_GROUPS = [
    // {
    //   url: "alban/models/colonne_type1.glb",
    //   rootTransform: { rotation: [-1.57079632679, 0, 0] },
    //   transformsUrl: "data/instances-colonnes-type1.json",
    // },
  ];

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
    const transforms = group.transforms || await _fetchTransforms(group.transformsUrl);
    if (!transforms || transforms.length === 0) return;

    const url = ATON.PATH_COLLECTION + group.url;
    new THREE.GLTFLoader().load(url, (gltf) => {
      const mesh = _findFirstMesh(gltf.scene);
      if (!mesh) return;

      const instanced = new THREE.InstancedMesh(mesh.geometry, mesh.material, transforms.length);

      const m = new THREE.Matrix4();
      transforms.forEach((t, i) => {
        _composeMatrix(m, t);
        instanced.setMatrixAt(i, m);
      });
      instanced.instanceMatrix.needsUpdate = true;

      const root = new THREE.Group();
      root.add(instanced);
      _applyTransform(root, group.rootTransform);

      ATON.getRootScene().add(root);
    });
  }

  async function _fetchTransforms(url) {
    if (!url) return null;
    const res = await fetch(url);
    return res.json();
  }

  // ── Utilitaires ─────────────────────────────────────────────────────────

  function _findFirstMesh(obj) {
    if (obj.isMesh) return obj;
    for (const child of obj.children) {
      const found = _findFirstMesh(child);
      if (found) return found;
    }
    return null;
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
