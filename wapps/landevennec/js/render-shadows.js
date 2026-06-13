"use strict";

// Ombres portées limitées aux calques qui doivent les projeter/recevoir.
// Indépendant du système d'ombres du core (ATON.toggleShadows), qui active
// castShadow/receiveShadow sur TOUTE la scène via _rootVisible.traverse() —
// ici on ne flague que les nœuds listés dans SHADOW_LAYERS, donc "etat-actuel"
// (tuilage photogrammétrique) n'est jamais concerné.
const RenderShadows = (() => {
  // Calques participant aux ombres (projection + réception entre eux).
  // Pour l'instant seule la maquette "restitution-XIIIe" (clay) ; d'autres
  // calques pourront être ajoutés ici à l'avenir.
  const SHADOW_LAYERS = ["restitution-XIIIe"];

  // Direction du soleil ("vers où la lumière va"), comme ATON.setMainLightDirection.
  const LIGHT_DIRECTION = new THREE.Vector3(0.4, -1.0, 0.3);
  const LIGHT_INTENSITY = 1.0;

  const SHADOW_MAP_SIZE = 4096;
  const SHADOW_BIAS = -0.0005;
  const DEFAULT_RADIUS = 60.0; // fallback (m) si ATON.bounds n'est pas encore calculé

  let _bInitialized = false;
  let _light = null;

  function _createLight(center, radius) {
    const light = new THREE.DirectionalLight(0xffffff, LIGHT_INTENSITY);

    const dir = LIGHT_DIRECTION.clone().normalize();
    light.position.copy(center).addScaledVector(dir, -radius);
    light.target.position.copy(center);

    light.castShadow = true;
    light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    light.shadow.bias = SHADOW_BIAS;

    const cam = light.shadow.camera;
    cam.near = 0.1;
    cam.far = radius * 4;
    cam.left = cam.bottom = -radius * 1.5;
    cam.right = cam.top = radius * 1.5;
    cam.updateProjectionMatrix();

    return light;
  }

  function _flagShadowMeshes(node) {
    node.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
    });
  }

  // À appeler par RenderInstances pour les instances rattachées à un calque
  // listé dans SHADOW_LAYERS (les InstancedMesh sont créés après cette init
  // et n'ont donc pas été traversés par _flagShadowMeshes).
  function isShadowLayer(layerId) {
    return SHADOW_LAYERS.includes(layerId);
  }

  function flagShadowMesh(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  // Bascule l'activation du shadow mapping du renderer (coûteux en VR
  // stéréo) — appelé par xr.js à l'entrée/sortie de session XR.
  function setEnabled(b) {
    ATON._renderer.shadowMap.enabled = b;
  }

  // ── Init ────────────────────────────────────────────────────────────────

  function init() {
    ATON.on("AllNodeRequestsCompleted", () => {
      if (_bInitialized) return;
      _bInitialized = true;

      if (ATON.device.lowGPU) return;

      const radius = ATON.bounds?.radius > 0 ? ATON.bounds.radius : DEFAULT_RADIUS;
      const center = ATON.bounds?.center || new THREE.Vector3();

      ATON._renderer.shadowMap.enabled = true;
      ATON._renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      _light = _createLight(center, radius);

      const root = ATON.getRootScene();
      root.add(_light);
      root.add(_light.target);

      SHADOW_LAYERS.forEach((id) => {
        const N = ATON.getSceneNode(id);
        if (N) _flagShadowMeshes(N);
      });
    });
  }

  return { init, isShadowLayer, flagShadowMesh, setEnabled };
})();
