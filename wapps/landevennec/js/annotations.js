"use strict";

const Annotations = (() => {

    function init() {
        ATON.on("SemanticNodeHover", (nid) => {
            const s = ATON.getSemanticNode(nid);
            if (!s) return;
            UI.showPanel(nid, s.getDescription() || "");
        });

        // Phase 4 : panneau SUI en VR + fermeture au déshover
    }

    return { init };
})();
