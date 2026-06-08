"use strict";

const SESSION_ID    = "landevennec";
const SCENE_DEFAULT = "alban/landevennec";

// ── App initialization ────────────────────────────────────────────────────────

let APP = ATON.App.realize();

APP.setup = () => {
    ATON.FE.realize();
    ATON.FE.addBasicLoaderEvents();
    ATON.XR.setSessionType("immersive-vr");

    const sid = APP.params.get("s") || SCENE_DEFAULT;
    ATON.FE.loadSceneID(sid);

    ATON.Photon.connect(SESSION_ID);

    _initLoadingEvents();
    _initXREvents();
    _initPhotonEvents();
    _initAnnotationEvents();
    _initHTMLControls();
};

// ── Loading ───────────────────────────────────────────────────────────────────

function _initLoadingEvents() {
    ATON.on("SceneJSONLoaded", () => {
        const ls = document.getElementById("loading-screen");
        if (!ls) return;
        ls.classList.add("hidden");
        setTimeout(() => { ls.style.display = "none"; }, 700);
    });
}

// ── XR ───────────────────────────────────────────────────────────────────────

function _initXREvents() {
    ATON.on("XRstart", () => {
        document.getElementById("ui-overlay")?.classList.add("xr-active");
        ATON.XR.setupControllerUI();
        ATON.Nav.setFirstPersonControl();
    });

    ATON.on("XRend", () => {
        document.getElementById("ui-overlay")?.classList.remove("xr-active");
    });
}

// ── Photon (réseau multi-utilisateurs) ───────────────────────────────────────

function _initPhotonEvents() {
    // Présence
    ATON.on("VRC_Connected",    _updateCollab);
    ATON.on("VRC_Disconnected", _updateCollab);
    ATON.on("VRC_UserEnter",    _updateCollab);
    ATON.on("VRC_UserLeave",    _updateCollab);

    // Commandes du médiateur → visiteurs

    // Navigation vers un point de vue nommé
    ATON.Photon.on("GOTO_POV", (d) => {
        if (!d?.id) return;
        ATON.Nav.requestPOVbyID(d.id, 2.0);
        _toast("Vue : " + d.id);
    });

    // Affichage/masquage d'un calque
    ATON.Photon.on("LAYER_SET", (d) => {
        if (!d?.node) return;
        const n = ATON.getSceneNode(d.node);
        if (!n) return;
        d.visible ? n.show() : n.hide();
    });

    // Message diffusé à tous les visiteurs
    ATON.Photon.on("BROADCAST", (d) => {
        if (!d?.text) return;
        _toast(d.text, 5000);
    });
}

function _updateCollab() {
    const n   = ATON.Photon?.getNumUsers?.() ?? 0;
    const dot = document.getElementById("collab-dot");
    const lbl = document.getElementById("collab-label");
    if (!dot || !lbl) return;

    if (n > 1) {
        dot.style.display = "block";
        lbl.textContent = n + " utilisateur" + (n > 2 ? "s" : "") + " connecté" + (n > 2 ? "s" : "");
    } else {
        dot.style.display = "none";
        lbl.textContent = "";
    }
}

// ── Annotations sémantiques ───────────────────────────────────────────────────

function _initAnnotationEvents() {
    ATON.on("SemanticNodeHover", (nid) => {
        const s = ATON.getSemanticNode(nid);
        if (!s) return;
        _showPanel(nid, s.getDescription() || "");
    });
}

// ── Contrôles HTML ───────────────────────────────────────────────────────────

function _initHTMLControls() {
    document.getElementById("btn-enter-vr")?.addEventListener("click", () => {
        ATON.XR.toggle();
    });

    document.getElementById("btn-home")?.addEventListener("click", () => {
        ATON.Nav.requestHomePOV();
    });

    document.getElementById("info-panel-close")?.addEventListener("click", () => {
        document.getElementById("info-panel")?.classList.remove("visible");
    });
}

// ── Utilitaires UI ───────────────────────────────────────────────────────────

function _showPanel(title, html) {
    const p = document.getElementById("info-panel");
    const t = document.getElementById("info-panel-title");
    const c = document.getElementById("info-panel-content");
    if (!p) return;
    t.textContent = title;
    c.innerHTML   = html || "<em>Pas de description disponible.</em>";
    p.classList.add("visible");
}

function _toast(msg, dur = 2500) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), dur);
}
