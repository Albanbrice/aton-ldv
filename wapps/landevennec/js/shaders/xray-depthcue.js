"use strict";

// Variante X-ray "Fresnel + depth cueing" : reprend l'effet Fresnel de
// XrayFresnel (silhouette plus opaque que la face caméra) et y ajoute un
// fondu/assombrissement en fonction de la distance à la caméra, pour mieux
// distinguer les volumes proches des volumes lointains dans la pile de
// surfaces transparentes.
const XrayDepthCue = (() => {
  const TINT = new THREE.Color(0.85, 1, 0.95);
  const OPACITY_CENTER = 0.05; // opacité face caméra, au premier plan
  const OPACITY_SILHOUETTE = 0.5; // opacité en silhouette (rasant), au premier plan
  const FRESNEL_POWER = 1.5; // dureté du dégradé Fresnel

  // Distances (mètres, échelle de la scène) au-delà desquelles l'effet de
  // profondeur s'applique. En-dessous de FADE_NEAR : rendu identique à
  // XrayFresnel. Au-delà de FADE_FAR : opacité et teinte saturées au minimum.
  const FADE_NEAR = 10.0;
  const FADE_FAR = 150.0;
  const FAR_OPACITY_SCALE = 0.35; // atténuation d'opacité 2au-delà de FADE_FAR
  const FAR_TINT_SCALE = 0.75; // assombrissement de la teinte au-delà de FADE_FAR

  const _fragmentShader = `
        varying vec3 vPositionW;
        varying vec3 vNormalW;
        varying vec3 vNormalV;

        uniform vec3  tint;
        uniform float opacityCenter;
        uniform float opacitySilhouette;
        uniform float fresnelPower;
        uniform float fadeNear;
        uniform float fadeFar;
        uniform float farOpacityScale;
        uniform float farTintScale;

        void main(){
            float f = dot(vNormalV, vec3(0,0,1));
            f = clamp(1.0 - f, 0.0, 1.0);
            f = pow(f, fresnelPower);

            float alpha = mix(opacityCenter, opacitySilhouette, f);

            float dist = length(cameraPosition - vPositionW);
            float depthT = clamp((dist - fadeNear) / max(fadeFar - fadeNear, 0.0001), 0.0, 1.0);

            vec3 col = mix(tint, tint * farTintScale, depthT);
            alpha *= mix(1.0, farOpacityScale, depthT);

            gl_FragColor = vec4(col, alpha);
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
        tint: { value: TINT },
        opacityCenter: { value: OPACITY_CENTER },
        opacitySilhouette: { value: OPACITY_SILHOUETTE },
        fresnelPower: { value: FRESNEL_POWER },
        fadeNear: { value: FADE_NEAR },
        fadeFar: { value: FADE_FAR },
        farOpacityScale: { value: FAR_OPACITY_SCALE },
        farTintScale: { value: FAR_TINT_SCALE },
      },
      vertexShader: options.instanced
        ? _instancedVertexShader
        : ATON.MatHub.getDefVertexShader(),
      fragmentShader: _fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  return { buildMaterial };
})();
