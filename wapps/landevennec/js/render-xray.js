"use strict";

// Rendu "X-ray" du calque restitution-XIIIe-transparence.
// Les shaders eux-mêmes vivent dans js/shaders/ (une variante par fichier) ;
// ce module se contente de choisir la variante active et de l'appliquer au
// nœud du scenegraph. Voir RAPPORT_RENDU_RESTITUTION.md pour le détail de
// l'approche et les pistes explorées (arêtes renforcées, cavity) puis
// abandonnées.
const RenderXray = (() => {
  const NODE_ID = "restitution-XIIIe-transparence";

  // ── Variante active ─────────────────────────────────────────────────────
  // XrayFresnel    : Fresnel simple (silhouette opaque / face caméra transparente).
  // XrayDepthCue   : Fresnel + fondu/assombrissement selon la distance caméra,
  //                  pour mieux lire la profondeur dans la pile de volumes.
  // const ACTIVE_VARIANT = XrayFresnel;
  const ACTIVE_VARIANT = XrayDepthCue;

  let _bInitialized = false;

  function buildMaterial(options = {}) {
    return ACTIVE_VARIANT.buildMaterial(options);
  }

  // ── Init ────────────────────────────────────────────────────────────────

  function init() {
    ATON.on("AllNodeRequestsCompleted", () => {
      if (_bInitialized) return;

      const N = ATON.getSceneNode(NODE_ID);
      if (!N) return;

      N.setMaterial(buildMaterial());

      _bInitialized = true;
    });
  }

  return { init, buildMaterial };
})();
