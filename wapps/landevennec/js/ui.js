"use strict";

const UI = (() => {

    function init() {
        _initLoadingEvents();
        _initCollabEvents();
        _initControls();
        _buildLocalLayerPanel();
    }

    function _initLoadingEvents() {
        ATON.on("SceneJSONLoaded", () => {
            const ls = document.getElementById("loading-screen");
            if (!ls) return;
            ls.classList.add("hidden");
            setTimeout(() => { ls.style.display = "none"; }, 700);
        });
    }

    function _initCollabEvents() {
        ATON.on("VRC_Connected",    _updateCollab);
        ATON.on("VRC_Disconnected", _updateCollab);
        ATON.on("VRC_UserEnter",    _updateCollab);
        ATON.on("VRC_UserLeave",    _updateCollab);
    }

    function _updateCollab() {
        const n   = ATON.Photon?.getNumUsers?.() ?? 0;
        const dot = document.getElementById("collab-dot");
        const lbl = document.getElementById("collab-label");
        if (!dot || !lbl) return;

        if (n > 1) {
            dot.style.display = "block";
            lbl.textContent   = n + " utilisateur" + (n > 1 ? "s" : "") +
                                " connecté"         + (n > 1 ? "s" : "");
        } else {
            dot.style.display = "none";
            lbl.textContent   = "";
        }
    }

    function _initControls() {
        document.getElementById("btn-enter-vr")?.addEventListener("click", () => {
            ATON.XR.toggle();
        });
        document.getElementById("btn-home")?.addEventListener("click", () => {
            ATON.Nav.requestHomePOV();
        });
        document.getElementById("info-panel-close")?.addEventListener("click", () => {
            hidePanel();
        });
    }

    // ── Panneau calques local visiteur ───────────────────────────────────────

    function _buildLocalLayerPanel() {
        buildLayerRows(
            "local-layers-list",
            { row: "local-layer-row", label: "local-layer-label", toggle: "local-layer-toggle" },
            (layer, _btn, vis) => {
                const n = ATON.getSceneNode?.(layer.node);
                if (n) vis ? n.show() : n.hide();
            }
        );
    }

    // Synchronise les toggles locaux sur la visibilité réelle des nœuds
    // (le médiateur peut avoir modifié les calques depuis le chargement de la scène)
    function _syncLocalLayerToggles() {
        LAYERS.forEach((layer) => {
            const n = ATON.getSceneNode?.(layer.node);
            if (!n) return;
            const btn = document.querySelector(`#local-layers-list [data-node="${layer.node}"]`);
            if (!btn) return;
            const vis = n.visible;
            btn.dataset.visible = String(vis);
            btn.textContent = vis ? "ON" : "OFF";
            btn.classList.toggle("active", vis);
        });
    }

    function setLayerControlEnabled(enabled) {
        const panel = document.getElementById("local-layers-panel");
        if (!panel) return;
        if (enabled) _syncLocalLayerToggles();
        panel.classList.toggle("visible", enabled);
        toast(enabled ? "Exploration des calques activée" : "Exploration des calques désactivée");
    }

    // ── API publique ──────────────────────────────────────────────────────────

    function showPanel(title, html) {
        const p = document.getElementById("info-panel");
        const t = document.getElementById("info-panel-title");
        const c = document.getElementById("info-panel-content");
        if (!p) return;
        t.textContent = title;
        c.innerHTML   = html || "<em>Pas de description disponible.</em>";
        p.classList.add("visible");
    }

    function hidePanel() {
        document.getElementById("info-panel")?.classList.remove("visible");
    }

    function toast(msg, dur = 2500) {
        const el = document.getElementById("toast");
        if (!el) return;
        el.textContent = msg;
        el.classList.add("show");
        setTimeout(() => el.classList.remove("show"), dur);
    }

    return { init, showPanel, hidePanel, toast, setLayerControlEnabled };
})();
