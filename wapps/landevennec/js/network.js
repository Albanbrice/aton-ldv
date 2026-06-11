"use strict";

const Network = (() => {

    function init() {
        // Navigation vers un point de vue nommé
        ATON.Photon.on("GOTO_POV", (d) => {
            if (!d?.id) return;
            XRModule.resetRigRotation();
            ATON.Nav.requestPOVbyID(d.id, PovTransition.getDuration());
            UI.toast("Vue : " + d.id);
        });

        // Bascule du mode de transition entre POVs en XR (médiateur → visiteurs)
        ATON.Photon.on("POV_TRANSITION_MODE", (d) => {
            if (!d?.mode) return;
            PovTransition.setMode(d.mode);
        });

        // Affichage / masquage d'un calque
        ATON.Photon.on("LAYER_SET", (d) => {
            if (!d?.node) return;
            const n = ATON.getSceneNode(d.node);
            if (!n) return;
            d.visible ? n.show() : n.hide();
        });

        // Message diffusé par le médiateur
        ATON.Photon.on("BROADCAST", (d) => {
            if (!d?.text) return;
            UI.toast(d.text, 5000);
        });

        // Activation / désactivation de la téléportation (Phase 3)
        ATON.Photon.on("NAV_TOGGLE", (d) => {
            if (d?.enabled === undefined) return;
            XRModule.setTeleportEnabled(d.enabled);
        });

        // Autorisation / révocation du contrôle local des calques
        ATON.Photon.on("LAYERS_UNLOCK", (d) => {
            if (d?.enabled === undefined) return;
            UI.setLayerControlEnabled(d.enabled);
        });

        // Navigation vers la vue courante du médiateur (position + cible exactes)
        ATON.Photon.on("GOTO_POV_RAW", (d) => {
            if (!d?.pos || !d?.target) return;
            const pov = new ATON.POV()
                .setPosition(d.pos[0],    d.pos[1],    d.pos[2])
                .setTarget(  d.target[0], d.target[1], d.target[2])
                .setFOV(d.fov || ATON.Nav.STD_FOV);
            XRModule.resetRigRotation();
            ATON.Nav.requestPOV(pov, PovTransition.getDuration());
            UI.toast("Vue du médiateur");
        });
    }

    return { init };
})();
