"use strict";

const Network = (() => {

    function init() {
        // Navigation vers un point de vue nommé
        ATON.Photon.on("GOTO_POV", (d) => {
            if (!d?.id) return;
            ATON.Nav.requestPOVbyID(d.id, 2.0);
            UI.toast("Vue : " + d.id);
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
    }

    return { init };
})();
