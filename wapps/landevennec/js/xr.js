"use strict";

const XRModule = (() => {
  // ── Constantes ────────────────────────────────────────────────────────────

  const SNAP_ANGLE = 15 * (Math.PI / 180); // radians
  const SNAP_COOLDOWN = 350; // ms — délai minimum entre deux snaps (boutons/swipe)
  const SWIPE_THRESHOLD = 0.012; // m/frame — vitesse minimale pour un swipe intentionnel (≈0.87 m/s à 72fps)
  const SWIPE_ON_PRIMARY = false; // true = main droite (téléportation) ; false = main gauche (joystick / X·Y)
  const AVATAR_CULL_RADIUS = 1; // m — avatars trop proches masqués localement
  const ANNO_LABEL_T = 0.5; // 0..1 — position du label entre annotation (0) et œil (1)
  const ALTITUDE_STEP = 2; // m par snap vertical (thumbstick Y gauche)
  const FLOOR_OFFSET = 1.7; // m — hauteur œil au-dessus du terrain (rig.y = hauteur yeux dans ATON)
  const CEILING_HEIGHT = 30; // m au-dessus du sol — plafond maximal pour éviter de perdre les visiteurs
  // Nœuds terrain par ordre de priorité — le premier visible sert de référence
  const TERRAIN_NODES = ["etat-actuel", "restitution-XIIIe"];

  // ── État interne ──────────────────────────────────────────────────────────

  let _bTeleportEnabled = false; // guidée par défaut
  let _stickArmed = true; // thumbstick prêt à déclencher (reset au neutre)
  let _stickYArmed = true; // axe Y — armement indépendant de l'axe X
  let _snapCooldown = false; // verrou partagé boutons + swipes
  let _prevLX = null; // position X gauche frame précédente (swipe horizontal)
  let _prevLY = null; // position Y gauche frame précédente (swipe vertical)
  let _floorY = 0; // plancher dynamique — mis à jour à l'entrée en XR et à chaque téléport
  let _wasPresenting = false; // détecte la transition non-XR -> XR et XR -> non-XR (cf. note "XRmode" cassé)
  let _pendingAlign = null; // {dx,dz} direction cible à appliquer dès que Nav._vDir est valide en XR
  let _initialVDir = null; // {x,z} Nav._vDir capturé à l'entrée XR (direction desktop, pas encore resynchronisée)
  let _alignFrameCountdown = 0; // frames restantes avant d'abandonner l'attente et appliquer quand même

  // Pré-alloués pour le raycast terrain — aucune allocation par appel
  const _rigQ = new THREE.Quaternion();
  const _raycaster = new THREE.Raycaster();
  const _rayDown = new THREE.Vector3(0, -1, 0);
  const _rayOrigin = new THREE.Vector3();

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    // ATON.fire("XRmode", ...) existe bien dans le core (ATON.xr.js), mais le
    // handler enregistré par ATON.MRes (ATON.mres.js) appelle TS.setXRSession(...)
    // qui n'existe pas dans cette version → TypeError non rattrapée qui casse
    // la chaîne de handlers AVANT que le nôtre ne soit appelé. "XRmode" n'est
    // donc jamais reçu ici. On détecte à la place la transition de présence XR
    // par scrutation dans update() (cf. _onXRStart/_onXRExit).

    // Met à jour le plancher après chaque téléportation.
    // ATON déplace le rig sur XRselectEnd (relâchement gâchette) — le délai
    // de 50 ms laisse le temps au moteur de poser le rig sur le sol local.
    ATON.on("XRselectEnd", (hand) => {
      if (hand !== ATON.XR.HAND_R) return;
      if (!_bTeleportEnabled) return;
      setTimeout(() => {
        _floorY = ATON.XR.rig.position.y;
      }, 50);
    });
  }

  // ── Transitions de session XR (détectées par scrutation, cf. note init()) ──

  function _onXRStart() {
    document.getElementById("ui-overlay")?.classList.add("xr-active");
    ATON.Nav.setUserControl(_bTeleportEnabled);
    // Oriente le rig vers la cible du POV courant : sans cela, le rig
    // démarre avec une rotation nulle et le visiteur regarde toujours
    // dans la direction "par défaut" (nord), quel que soit le POV affiché.
    // Reporté le temps que Nav._vDir reflète la pose réelle du casque
    // (cf. update()).
    const cpov = ATON.Nav._currPOV;
    if (cpov?.pos && cpov?.target) {
      _pendingAlign = {
        dx: cpov.target.x - cpov.pos.x,
        dz: cpov.target.z - cpov.pos.z,
      };
      const v = ATON.Nav._vDir;
      _initialVDir = v ? { x: v.x, z: v.z } : null;
      _alignFrameCountdown = 90; // ~1.25s à 72fps — garde-fou si vDir ne change jamais
    }
    _floorY = ATON.XR.rig.position.y; // capture le sol au démarrage de la session
    _stickArmed = true;
    _stickYArmed = true;
    _snapCooldown = false;
    _prevLX = null;
    _prevLY = null;
  }

  function _onXRExit() {
    document.getElementById("ui-overlay")?.classList.remove("xr-active");
    ATON.Nav.setUserControl(true);
    _prevLX = null;
    _pendingAlign = null;
    _initialVDir = null;
  }

  // ── Boucle principale ─────────────────────────────────────────────────────

  function update() {
    _updateAvatarCulling(); // actif en VR et en vue 3D standard

    const presenting = ATON.XR.isPresenting();
    if (presenting && !_wasPresenting) _onXRStart();
    else if (!presenting && _wasPresenting) _onXRExit();
    _wasPresenting = presenting;

    if (!presenting) return;
    // Réapplique le verrou à chaque frame : robuste si Nav._bControl est
    // réinitialisé ailleurs dans le core entre l'entrée en XR et la 1ère frame.
    ATON.Nav.setUserControl(_bTeleportEnabled);
    // Rotation/altitude snap suivent le même verrou que la téléportation :
    // en visite guidée (par défaut), le visiteur ne doit avoir aucun déplacement libre.
    if (_bTeleportEnabled) _updateSnap();
    _fixInfoNodeOrientation();

    // Orientation initiale du rig, reportée le temps que Nav._vDir reflète
    // la pose réelle du casque (et non plus la direction de la vue desktop).
    if (_pendingAlign) {
      const v = ATON.Nav._vDir;
      const changed =
        v &&
        _initialVDir &&
        (Math.abs(v.x - _initialVDir.x) > 1e-4 ||
          Math.abs(v.z - _initialVDir.z) > 1e-4);
      _alignFrameCountdown--;
      if (changed || !_initialVDir || _alignFrameCountdown <= 0) {
        _applyYawToFace(_pendingAlign.dx, _pendingAlign.dz);
        _pendingAlign = null;
        _initialVDir = null;
      }
    }
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

  function _snapAltitude(dir) {
    // dir : +1 = monter, -1 = descendre
    const rig = ATON.XR.rig;
    if (dir > 0) {
      const ceiling = _getTerrainY() + FLOOR_OFFSET + CEILING_HEIGHT;
      rig.position.y = Math.min(ceiling, rig.position.y + ALTITUDE_STEP);
    } else {
      const localFloor = _getTerrainY() + FLOOR_OFFSET;
      _floorY = localFloor;
      rig.position.y = Math.max(localFloor, rig.position.y - ALTITUDE_STEP);
    }
  }

  function _cooldown() {
    _snapCooldown = true;
    setTimeout(() => {
      _snapCooldown = false;
    }, SNAP_COOLDOWN);
  }

  // Retourne le Y du terrain sous le rig via raycast vers le bas.
  // Appelée uniquement sur snap descendant (one-shot, pas par frame).
  // Fallback sur _floorY si aucun nœud terrain n'est visible ou pas d'intersection.
  function _getTerrainY() {
    let terrainNode = null;
    for (const name of TERRAIN_NODES) {
      const n = ATON.getSceneNode(name);
      if (n?.visible) {
        terrainNode = n;
        break;
      }
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
        if (ax.y > 0.7) {
          _snapAltitude(+1);
          _stickYArmed = false;
        } else if (ax.y < -0.7) {
          _snapAltitude(-1);
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
      // Swipe horizontal — snap rotation
      const lx = ctrl.position.x;
      if (_prevLX !== null && !_snapCooldown) {
        const dx = lx - _prevLX;
        if (dx > SWIPE_THRESHOLD) {
          _snap(-1);
          _cooldown();
        } else if (dx < -SWIPE_THRESHOLD) {
          _snap(+1);
          _cooldown();
        }
      }
      _prevLX = lx;

      // Swipe vertical — snap altitude (monter la main = monter, descendre = descendre)
      const ly = ctrl.position.y;
      if (_prevLY !== null && !_snapCooldown) {
        const dy = ly - _prevLY;
        if (dy > SWIPE_THRESHOLD) {
          _snapAltitude(+1);
          _cooldown();
        } else if (dy < -SWIPE_THRESHOLD) {
          _snapAltitude(-1);
          _cooldown();
        }
      }
      _prevLY = ly;
    } else {
      _prevLX = null; // tracking perdu → évite un snap fantôme au retour
      _prevLY = null;
    }
  }

  // ── API publique ──────────────────────────────────────────────────────────

  function setTeleportEnabled(enabled) {
    _bTeleportEnabled = enabled;
    if (ATON.XR.isPresenting()) ATON.Nav.setUserControl(enabled);
    UI.toast(enabled ? "Navigation libre activée" : "Navigation guidée");
  }

  // Tourne le rig (rotation Y uniquement) pour que la direction de vue
  // actuelle du casque (Nav._vDir, repère local au rig — cf. note ci-dessous)
  // pointe vers (dx,dz) en coordonnées scène (Y = altitude).
  //
  // Nav._vDir est calculé via xrcam.getWorldDirection() où xrcam (cameras[0])
  // n'a pas de parent dans le graphe de scène : c'est donc la direction de
  // visée du casque dans son propre repère local, indépendante de
  // rig.rotation. Le rendu réel applique rig.rotation à cette direction
  // locale (cameraXR.matrixWorld = rig.matrixWorld * device.matrix). On en
  // déduit l'angle de rotation absolu à appliquer au rig pour que la
  // direction rendue corresponde à (dx,dz).
  function _applyYawToFace(dx, dz) {
    const cur = ATON.Nav._vDir;
    if (!cur) return;
    if (dx === 0 && dz === 0) return;
    if (cur.x === 0 && cur.z === 0) return;
    const aCur = Math.atan2(cur.z, cur.x);
    const aDes = Math.atan2(dz, dx);
    ATON.XR.rig.rotation.y = aCur - aDes;
  }

  // Réoriente le rig sur la cible d'un POV imposé par le médiateur (GOTO_POV
  // / GOTO_POV_RAW) : une orientation snap héritée de l'ancien emplacement
  // n'a plus lieu d'être dans la nouvelle vue.
  function alignRigToPOV(pov) {
    if (!ATON.XR.isPresenting()) return;
    if (!pov?.pos || !pov?.target) return;
    _applyYawToFace(pov.target.x - pov.pos.x, pov.target.z - pov.pos.z);
  }

  return {
    init,
    update,
    setTeleportEnabled,
    alignRigToPOV,
    ANNO_LABEL_T,
  };
})();
