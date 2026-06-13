"use strict";

// Rendu "maquette blanche" (clay) du calque restitution-XIIIe : matériau mat
// neutre + éclairage par environnement (IBL) non affiché, pour donner du
// volume sans texture. N'affecte que ce calque — "etat-actuel" (tuilage
// photogrammétrique texturé) garde ses matériaux d'origine.
const RenderClay = (() => {
  const NODE_ID = "restitution-XIIIe";

  // ── Réglages matériau ───────────────────────────────────────────────────
  // ATON.ambLight (AmbientLight blanche, intensity 3.0 par défaut, non
  // configurée par cette wapp) ajoute color*3 à chaque surface : avec une
  // couleur claire (~0.85), ce terme seul dépasse 1.0 et sature en blanc sous
  // LinearToneMapping — l'envMap n'a alors plus de marge pour se voir. D'où
  // une couleur de base nettement plus sombre, qui laisse de la place à l'IBL.
  const CLAY_COLOR = new THREE.Color(0.3, 0.3, 0.29);
  const ROUGHNESS = 0.9;
  const METALNESS = 0.0;

  // ── Réglages environnement (IBL, non affiché à l'écran) ────────────────
  // .hdr ou .exr, chemin relatif à la collection (ATON.PATH_COLLECTION).
  // Placeholder : échantillon livré avec ATON. À remplacer par un environnement
  // adapté à l'ambiance du site (ciel/lumière extérieure).
  // const ENV_MAP_URL = "alban/pano/Studio_clay.exr";
  const ENV_MAP_URL = "alban/pano/sunny_country_road_1k.exr";
  const ENV_MAP_INTENSITY = 1.0;

  let _bInitialized = false;
  let _envTex = null;
  const _materials = []; // matériaux créés, pour mise à jour rétroactive de l'envMap

  // Peut être appelée avant que l'environnement soit chargé (ex: par
  // RenderInstances, sur un nœud différent du nœud principal) : le matériau
  // est alors créé sans envMap puis mis à jour dès que celle-ci est prête.
  function buildMaterial() {
    const m = new THREE.MeshStandardMaterial({
      color: CLAY_COLOR,
      roughness: ROUGHNESS,
      metalness: METALNESS,
      envMap: _envTex,
      envMapIntensity: ENV_MAP_INTENSITY,
    });

    _materials.push(m);
    return m;
  }

  // Applique le matériau clay à chaque mesh du nœud. Si le mesh a une aoMap
  // d'origine (occlusion ambiante bakée côté Blender, glTF + UV2), elle est
  // conservée sur un clone du matériau clay pour préserver le bénéfice de l'AO.
  function _applyToNode(node) {
    const shared = buildMaterial();

    node.traverse((o) => {
      if (!o.isMesh) return;

      const origAO = o.material && o.material.aoMap;
      o.userData.origMat = o.material;

      if (origAO) {
        const m = shared.clone();
        m.aoMap = origAO;
        m.aoMapIntensity = o.material.aoMapIntensity ?? 1.0;
        o.material = m;
      } else {
        o.material = shared;
      }
    });
  }

  function _loadEnvMap(onLoaded) {
    const url = ATON.PATH_COLLECTION + ENV_MAP_URL;
    const loader = url.endsWith(".hdr")
      ? new THREE.HDRLoader()
      : new THREE.EXRLoader();

    loader.load(url, (tex) => {
      const pmrem = new THREE.PMREMGenerator(ATON._renderer);
      pmrem.compileEquirectangularShader();

      _envTex = pmrem.fromEquirectangular(tex).texture;

      tex.dispose();
      pmrem.dispose();

      _materials.forEach((m) => {
        m.envMap = _envTex;
        m.needsUpdate = true;
      });

      onLoaded();
    });
  }

  // ── Init ────────────────────────────────────────────────────────────────

  function init() {
    ATON.on("AllNodeRequestsCompleted", () => {
      if (_bInitialized) return;
      _bInitialized = true;

      const N = ATON.getSceneNode(NODE_ID);
      if (!N) return;

      _loadEnvMap(() => _applyToNode(N));
    });
  }

  return { init, buildMaterial };
})();
