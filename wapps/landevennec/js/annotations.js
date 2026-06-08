"use strict";

const Annotations = (() => {

    let _vrImgPanel = null; // SUI.MediaPanel créé à la demande

    // ── Init ──────────────────────────────────────────────────────────────────

    function init() {
        ATON.on("SemanticNodeHover", (nid) => {
            const s = ATON.getSemanticNode(nid);
            if (!s) return;
            const rawDesc = s.getDescription() || "";

            // Desktop / tablet : panneau HTML classique
            UI.showPanel(nid, rawDesc);

            // VR : label texte (infoNode ATON) + image éventuelle (MediaPanel)
            if (ATON.XR.isPresenting()) _showVR(nid, rawDesc);
        });

        ATON.on("SemanticNodeLeave", () => {
            UI.hidePanel();
            _hideVR();
        });
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    function _stripHTML(html) {
        const d = document.createElement("div");
        d.innerHTML = html;
        return (d.textContent || d.innerText || "").trim();
    }

    function _extractImgSrcs(html) {
        const srcs = [];
        const re   = /<img[^>]+src=["']([^"']+)["']/gi;
        let m;
        while ((m = re.exec(html)) !== null) srcs.push(m[1]);
        return srcs;
    }

    // ── VR ────────────────────────────────────────────────────────────────────

    function _showVR(nid, rawDesc) {
        const plain = _stripHTML(rawDesc);

        // SUI.infoNode : ATON le positionne et l'affiche automatiquement
        // On surcharge le texte par défaut (= semid) avec le contenu réel.
        ATON.SUI.setInfoNodeText(
            nid.toUpperCase() + (plain ? "\n" + plain : "")
        );

        // Images extraites du HTML de description
        const imgs = _extractImgSrcs(rawDesc);
        if (!imgs.length) {
            if (_vrImgPanel) _vrImgPanel.hide();
            return;
        }

        // Création unique du MediaPanel
        if (!_vrImgPanel) {
            _vrImgPanel = new ATON.SUI.MediaPanel("anno-img");
            _vrImgPanel.disablePicking();
            _vrImgPanel.attachToRoot();
        }

        _vrImgPanel.setTitle(nid);
        _vrImgPanel.load(imgs[0]);
        _placeVRPanel(_vrImgPanel);
        _vrImgPanel.show();
    }

    function _hideVR() {
        if (_vrImgPanel) _vrImgPanel.hide();
    }

    function _placeVRPanel(panel) {
        const sp = ATON._queryDataSem?.p;
        const ep = ATON.Nav.getCurrentEyeLocation();
        if (!sp || !ep) return;

        // Entre le point d'annotation et l'observateur, décalé vers la droite
        panel.position.lerpVectors(sp, ep, 0.3);
        panel.position.x += 0.15;
        panel.setScale(0.4); // ≈ 0.4 m de large
        panel.orientToCamera();
    }

    return { init };
})();
