"use strict";

const UI = (() => {

    function init() {
        _initLoadingEvents();
        _initCollabEvents();
        _initControls();
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

    return { init, showPanel, hidePanel, toast };
})();
