"use strict";

const XRModule = (() => {

    // ── Constantes ────────────────────────────────────────────────────────────

    const SNAP_ANGLE      = 15 * (Math.PI / 180); // radians
    const SNAP_COOLDOWN   = 350;  // ms — délai minimum entre deux snaps (boutons/swipe)
    const SWIPE_THRESHOLD = 0.05; // m/frame — vitesse minimale pour un swipe intentionnel

    // ── État interne ──────────────────────────────────────────────────────────

    let _bTeleportEnabled = false; // guidée par défaut
    let _stickArmed       = true;  // thumbstick prêt à déclencher (reset au neutre)
    let _snapCooldown     = false; // verrou partagé boutons + swipe
    let _prevLX           = null;  // position X gauche frame précédente (swipe)

    // ── Init ──────────────────────────────────────────────────────────────────

    function init() {
        ATON.on("XRstart", () => {
            document.getElementById("ui-overlay")?.classList.add("xr-active");
            ATON.XR.setupControllerUI();
            ATON.Nav.setFirstPersonControl();
            ATON.Nav.setUserControl(_bTeleportEnabled);
            _stickArmed   = true;
            _snapCooldown = false;
            _prevLX       = null;
        });

        ATON.on("XRend", () => {
            document.getElementById("ui-overlay")?.classList.remove("xr-active");
            ATON.Nav.setUserControl(true);
            _prevLX = null;
        });
    }

    // ── Boucle principale ─────────────────────────────────────────────────────

    function update() {
        if (!ATON.XR.isPresenting()) return;
        _updateSnap();
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

    function _updateSnap() {

        // ── 1. Thumbstick gauche ─────────────────────────────────────────────
        // Pattern "armé" : on déclenche au passage du seuil, puis on attend
        // que le stick revienne au neutre avant de permettre un nouveau snap.
        const ax = ATON.XR.getAxisValue(ATON.XR.HAND_SECONDARY);
        if (ax) {
            if (Math.abs(ax.x) < 0.2) {
                _stickArmed = true;
            } else if (_stickArmed) {
                if      (ax.x >  0.7) { _snap(-1); _stickArmed = false; }
                else if (ax.x < -0.7) { _snap(+1); _stickArmed = false; }
            }
        }

        // ── 2. Boutons X / Y manette gauche ─────────────────────────────────
        // X (buttons[4]) = tourner à gauche, Y (buttons[5]) = tourner à droite
        if (!_snapCooldown) {
            const gp = ATON.XR.gpad1;
            if (gp?.buttons) {
                if      (gp.buttons[4]?.pressed) { _snap(+1); _cooldown(); }
                else if (gp.buttons[5]?.pressed) { _snap(-1); _cooldown(); }
            }
        }

        // ── 3. Swipe horizontal main gauche ─────────────────────────────────
        // On mesure le déplacement X de controller1 entre deux frames.
        // Swipe vers la droite → scene tourne à droite ; vers la gauche → gauche.
        const ctrl = ATON.XR.controller1;
        if (ctrl?.visible) {
            const lx = ctrl.userData.pos.x;
            if (_prevLX !== null && !_snapCooldown) {
                const delta = lx - _prevLX;
                if      (delta >  SWIPE_THRESHOLD) { _snap(-1); _cooldown(); }
                else if (delta < -SWIPE_THRESHOLD) { _snap(+1); _cooldown(); }
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

    return { init, update, setTeleportEnabled };
})();
