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

    // infoContainer est un ThreeMeshUI.Block figé à width:0.2 height:0.05 dans le core.
    // On le redimensionne avant setInfoNodeText() — ThreeMeshUI.update() est appelé
    // à l'intérieur de setInfoNodeText, ce qui applique les deux changements ensemble.
    function _resizeInfoContainer(text) {
        const c = ATON.SUI?.infoContainer;
        if (!c) return;

        const W             = 0.45;           // plus large que le défaut 0.2
        const FS            = 0.02;           // fontSize défini dans buildInfoNode
        const LINE_H        = FS * 1.5;
        const PAD           = 0.016;
        const CHARS_PER_LINE = Math.floor((W - PAD * 2) / (FS * 0.55));

        let totalLines = 0;
        for (const line of text.split("\n"))
            totalLines += Math.max(1, Math.ceil(line.length / CHARS_PER_LINE));

        const height = Math.max(0.07, totalLines * LINE_H + PAD * 2);
        c.set({ width: W, height, padding: PAD });
    }

    function _showVR(nid, rawDesc) {
        const plain = _stripHTML(rawDesc);
        const text  = nid.toUpperCase() + (plain ? "\n" + plain : "");

        // Redimensionner le cartouche avant d'injecter le texte
        _resizeInfoContainer(text);

        // SUI.infoNode : ATON le positionne et l'affiche automatiquement
        ATON.SUI.setInfoNodeText(text);

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
        // lookAt bypasse Nav._qOri (qui exclut la rotation du rig après snap)
        panel.lookAt(ep);
    }

    return { init };
})();
