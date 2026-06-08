"use strict";

const XRModule = (() => {

    // ── État interne ──────────────────────────────────────────────────────────

    let _bTeleportEnabled = false; // désactivé par défaut (visite guidée)

    // Phase 2 — snap rotation
    const SNAP_ANGLE = 15 * (Math.PI / 180);
    let _snapCooldown = false;
    let _prevLX       = null;

    // ── Init ──────────────────────────────────────────────────────────────────

    function init() {
        ATON.on("XRstart", () => {
            document.getElementById("ui-overlay")?.classList.add("xr-active");
            ATON.XR.setupControllerUI();
            ATON.Nav.setFirstPersonControl();
            // Appliquer la restriction de téléportation à l'entrée en VR
            ATON.Nav.setUserControl(_bTeleportEnabled);
        });

        ATON.on("XRend", () => {
            document.getElementById("ui-overlay")?.classList.remove("xr-active");
            ATON.Nav.setUserControl(true);
            _prevLX = null;
        });
    }

    // ── Boucle principale (appelée depuis APP.update) ─────────────────────────

    function update() {
        // Phase 2 : snap rotation — implémentée ici
    }

    // ── API publique ──────────────────────────────────────────────────────────

    function setTeleportEnabled(enabled) {
        _bTeleportEnabled = enabled;
        if (ATON.XR.isPresenting()) ATON.Nav.setUserControl(enabled);
        UI.toast(enabled ? "Navigation libre activée" : "Navigation guidée");
    }

    return { init, update, setTeleportEnabled };
})();
