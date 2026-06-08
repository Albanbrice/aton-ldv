"use strict";

const XRModule = (() => {
  // ── Constantes ────────────────────────────────────────────────────────────

  const SNAP_ANGLE = 15 * (Math.PI / 180); // radians
  const SNAP_COOLDOWN = 350; // ms — délai minimum entre deux snaps (boutons/swipe)
  const SWIPE_THRESHOLD = 0.012; // m/frame — vitesse minimale pour un swipe intentionnel (≈0.87 m/s à 72fps)
  const SWIPE_ON_PRIMARY = false; // true = main droite (téléportation) ; false = main gauche (joystick / X·Y)
  const AVATAR_CULL_RADIUS = 0.5; // m — avatars trop proches masqués localement
  const ANNO_LABEL_T = 0.5; // 0..1 — position du label entre annotation (0) et œil (1)
  const ALTITUDE_STEP   = 2;   // m par snap vertical (thumbstick Y gauche)
  const FLOOR_OFFSET    = 1.7; // m — hauteur œil au-dessus du terrain (rig.y = hauteur yeux dans ATON)
  // Nœuds terrain par ordre de priorité — le premier visible sert de référence
  const TERRAIN_NODES   = ["etat-actuel", "restitution-XIIIe"];

  // ── État interne ──────────────────────────────────────────────────────────

  let _bTeleportEnabled = false; // guidée par défaut
  let _stickArmed  = true;  // thumbstick prêt à déclencher (reset au neutre)
  let _stickYArmed = true;  // axe Y — armement indépendant de l'axe X
  let _snapCooldown = false; // verrou partagé boutons + swipe
  let _prevLX = null; // position X gauche frame précédente (swipe)
  let _floorY = 0;   // plancher dynamique — mis à jour au XRstart et à chaque téléport

  // Pré-alloués pour le raycast terrain — aucune allocation par appel
  const _rigQ       = new THREE.Quaternion();
  const _raycaster  = new THREE.Raycaster();
  const _rayDown    = new THREE.Vector3(0, -1, 0);
  const _rayOrigin  = new THREE.Vector3();

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    ATON.on("XRstart", () => {
      document.getElementById("ui-overlay")?.classList.add("xr-active");
      ATON.XR.setupControllerUI();
      ATON.Nav.setFirstPersonControl();
      ATON.Nav.setUserControl(_bTeleportEnabled);
      _floorY = ATON.XR.rig.position.y; // capture le sol au démarrage de la session
      _stickArmed = true;
      _stickYArmed = true;
      _snapCooldown = false;
      _prevLX = null;
    });

    ATON.on("XRend", () => {
      document.getElementById("ui-overlay")?.classList.remove("xr-active");
      ATON.Nav.setUserControl(true);
      _prevLX = null;
    });

    // Réinitialise la rotation virtuelle du rig à chaque téléportation.
    // La téléportation repositionne le rig mais ne touche pas sa rotation —
    // sans ce reset, les snaps précédents créent un décalage angulaire persistant.
    ATON.on("XRselectStart", (hand) => {
      if (hand !== ATON.XR.HAND_R) return;
      if (!_bTeleportEnabled) return;
      ATON.XR.rig.rotation.set(0, 0, 0);
    });

    // Met à jour le plancher après chaque téléportation.
    // ATON déplace le rig sur XRselectEnd (relâchement gâchette) — le délai
    // de 50 ms laisse le temps au moteur de poser le rig sur le sol local.
    ATON.on("XRselectEnd", (hand) => {
      if (hand !== ATON.XR.HAND_R) return;
      if (!_bTeleportEnabled) return;
      setTimeout(() => { _floorY = ATON.XR.rig.position.y; }, 50);
    });
  }

  // ── Boucle principale ─────────────────────────────────────────────────────

  function update() {
    _updateAvatarCulling(); // actif en VR et en vue 3D standard
    if (!ATON.XR.isPresenting()) return;
    _updateSnap();
    _fixInfoNodeOrientation();
  }

  // ── Masquage local des avatars trop proches ───────────────────────────────

  function _updateAvatarCulling() {
    const avatars = ATON.Photon?.avatarList;
    if (!avatars?.length) return;

    const myPos = ATON.Nav.getCurrentEyeLocation();
    const myUID = ATON.Photon.uid;

    for (let uid = 0; uid < avatars.length; uid++) {
      const A = avatars[uid];
      if (!A || uid === myUID) continue;
      A.visible = myPos.distanceTo(A.position) > AVATAR_CULL_RADIUS;
    }
  }

  // ── Correction orientation et position infoNode ───────────────────────────
  // SUI.update() place l'infoNode sur le bout de la manette (controller.userData.pos)
  // quand les controllers sont visibles, ce qui le colle au poignet.
  // On le replace entre le point d'annotation et l'œil (t=0.3 ≈ 70% vers l'annotation),
  // puis on corrige le quaternion qui exclut la rotation snap du rig.

  function _fixInfoNodeOrientation() {
    const node = ATON.SUI?.infoNode;
    if (!node?.visible) return;

    // Repositionnement — indépendant du controller
    const sp = ATON._queryDataSem?.p;
    const ep = ATON.Nav.getCurrentEyeLocation();
    if (sp && ep) node.position.lerpVectors(sp, ep, ANNO_LABEL_T);

    // Correction quaternion (snap rotation non incluse dans Nav._qOri)
    ATON.XR.rig.getWorldQuaternion(_rigQ);
    node.quaternion.premultiply(_rigQ);
  }

  // ── Snap rotation ─────────────────────────────────────────────────────────

  function _snap(dir) {
    // dir : +1 = gauche (CCW vue du dessus), -1 = droite (CW)
    ATON.XR.rig.rotateY(dir * SNAP_ANGLE);
  }

  function _cooldown() {
    _snapCooldown = true;
    setTimeout(() => { _snapCooldown = false; }, SNAP_COOLDOWN);
  }

  // Retourne le Y du terrain sous le rig via raycast vers le bas.
  // Appelée uniquement sur snap descendant (one-shot, pas par frame).
  // Fallback sur _floorY si aucun nœud terrain n'est visible ou pas d'intersection.
  function _getTerrainY() {
    let terrainNode = null;
    for (const name of TERRAIN_NODES) {
      const n = ATON.getSceneNode(name);
      if (n?.visible) { terrainNode = n; break; }
    }
    if (!terrainNode) return _floorY;

    const rig = ATON.XR.rig;
    _rayOrigin.set(rig.position.x, rig.position.y + 100, rig.position.z);
    _raycaster.set(_rayOrigin, _rayDown);
    const hits = _raycaster.intersectObject(terrainNode, true);
    return hits.length > 0 ? hits[0].point.y : _floorY;
  }

  function _updateSnap() {
    // ── 1. Thumbstick gauche ─────────────────────────────────────────────
    // Pattern "armé" : on déclenche au passage du seuil, puis on attend
    // que le stick revienne au neutre avant de permettre un nouveau snap.
    const ax = ATON.XR.getAxisValue(ATON.XR.HAND_SECONDARY);
    if (ax) {
      // Axe X — snap rotation
      if (Math.abs(ax.x) < 0.2) {
        _stickArmed = true;
      } else if (_stickArmed) {
        if (ax.x > 0.7) {
          _snap(-1);
          _stickArmed = false;
        } else if (ax.x < -0.7) {
          _snap(+1);
          _stickArmed = false;
        }
      }

      // Axe Y — snap altitude (pousser = monter, tirer = descendre)
      if (Math.abs(ax.y) < 0.2) {
        _stickYArmed = true;
      } else if (_stickYArmed) {
        const rig = ATON.XR.rig;
        if (ax.y > 0.7) {
          rig.position.y += ALTITUDE_STEP;
          _stickYArmed = false;
        } else if (ax.y < -0.7) {
          const localFloor = _getTerrainY() + FLOOR_OFFSET;
          _floorY = localFloor; // mise à jour du plancher de référence
          rig.position.y = Math.max(localFloor, rig.position.y - ALTITUDE_STEP);
          _stickYArmed = false;
        }
      }
    }

    // ── 2. Boutons X / Y manette gauche ─────────────────────────────────
    // X (buttons[4]) = tourner à gauche, Y (buttons[5]) = tourner à droite
    // ATON.XR.gpad1 reste undefined (jamais assigné dans le core) — on lit
    // directement le gamepad live via getSecondaryController().userData.gm.
    if (!_snapCooldown) {
      const gp = ATON.XR.getSecondaryController()?.userData.gm;
      if (gp?.buttons) {
        if (gp.buttons[4]?.pressed) {
          _snap(+1);
          _cooldown();
        } else if (gp.buttons[5]?.pressed) {
          _snap(-1);
          _cooldown();
        }
      }
    }

    // ── 3. Swipe horizontal main gauche ─────────────────────────────────
    // On mesure le déplacement X de controller1 entre deux frames.
    // On utilise ctrl.position.x (espace local WebXR = espace salle) plutôt que
    // userData.pos.x (espace monde) : après un snap, la composante X monde change
    // avec la rotation du rig, rendant le swipe inopérant passé ~90° cumulés.
    const ctrl = SWIPE_ON_PRIMARY
      ? ATON.XR.getPrimaryController()
      : ATON.XR.getSecondaryController();
    if (ctrl?.visible) {
      const lx = ctrl.position.x;
      if (_prevLX !== null && !_snapCooldown) {
        const delta = lx - _prevLX;
        if (delta > SWIPE_THRESHOLD) {
          _snap(-1);
          _cooldown();
        } else if (delta < -SWIPE_THRESHOLD) {
          _snap(+1);
          _cooldown();
        }
      }
      _prevLX = lx;
    } else {
      _prevLX = null; // tracking perdu → évite un snap fantôme au retour
    }
  }

  // ── API publique ──────────────────────────────────────────────────────────

  function setTeleportEnabled(enabled) {
    _bTeleportEnabled = enabled;
    if (ATON.XR.isPresenting()) ATON.Nav.setUserControl(enabled);
    UI.toast(enabled ? "Navigation libre activée" : "Navigation guidée");
  }

  return { init, update, setTeleportEnabled, ANNO_LABEL_T };
})();
