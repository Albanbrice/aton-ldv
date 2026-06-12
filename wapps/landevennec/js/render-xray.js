"use strict";

// Rendu "X-ray" (transparence Fresnel) du calque restitution-XIIIe-transparence.
// Voir RAPPORT_RENDU_RESTITUTION.md pour le détail de l'approche et les pistes
// explorées (arêtes renforcées, cavity) puis abandonnées.
const RenderXray = (() => {
  const NODE_ID = "restitution-XIIIe-transparence";

  // ── Réglages ────────────────────────────────────────────────────────────

  const XRAY_TINT = new THREE.Color(0.85, 1, 0.95);
  const XRAY_OPACITY_CENTER = 0.05; // opacité face caméra
  const XRAY_OPACITY_SILHOUETTE = 0.5; // opacité en silhouette (rasant)
  const XRAY_FRESNEL_POWER = 1.5; // dureté du dégradé Fresnel

  let _bInitialized = false;

  // ── Matériau ────────────────────────────────────────────────────────────

  const _fragmentShader = `
        varying vec3 vPositionW;
        varying vec3 vNormalW;
        varying vec3 vNormalV;

        uniform vec3  tint;
        uniform float opacityCenter;
        uniform float opacitySilhouette;
        uniform float fresnelPower;

        void main(){
            float f = dot(vNormalV, vec3(0,0,1));
            f = clamp(1.0 - f, 0.0, 1.0);
            f = pow(f, fresnelPower);

            float alpha = mix(opacityCenter, opacitySilhouette, f);
            gl_FragColor = vec4(tint, alpha);
        }
    `;

  // Variante du vertex shader par défaut d'ATON (MatHub.getDefVertexShader)
  // gérant le THREE.InstancedMesh : applique `instanceMatrix` (injecté
  // automatiquement par three.js via #ifdef USE_INSTANCING) à la position
  // et à la normale avant le calcul des varyings.
  const _instancedVertexShader = `
        varying vec3 vPositionW;
        varying vec3 vNormalW;
        varying vec3 vNormalV;

        void main(){
            vec3 pos = position;
            vec3 nrm = normal;

            #ifdef USE_INSTANCING
                pos = (instanceMatrix * vec4(pos, 1.0)).xyz;
                nrm = mat3(instanceMatrix) * nrm;
            #endif

            vPositionW = ( modelMatrix * vec4( pos, 1.0 )).xyz;
            vNormalV   = normalize( vec3( normalMatrix * nrm ));
            vNormalW   = ( modelMatrix * vec4( nrm, 0.0 )).xyz;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
        }
    `;

  function buildMaterial(options = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        tint: { value: XRAY_TINT },
        opacityCenter: { value: XRAY_OPACITY_CENTER },
        opacitySilhouette: { value: XRAY_OPACITY_SILHOUETTE },
        fresnelPower: { value: XRAY_FRESNEL_POWER },
      },
      vertexShader: options.instanced ? _instancedVertexShader : ATON.MatHub.getDefVertexShader(),
      fragmentShader: _fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
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
