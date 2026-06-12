"use strict";

// ── Feedback visuel temporaire sur un élément ─────────────────────────────────
// Utilisé par les boutons médiateur pour confirmer une action.
function flash(el) {
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 600);
}

// ── Mode de transition entre POVs en mode XR ──────────────────────────────────
// Partagé entre les 3 interfaces : "teleport" (instantané) ou "smooth" (progressif).
// Ne s'applique qu'en session XR ; en navigation web, getDuration() renvoie
// toujours la durée progressive standard.
const PovTransition = (() => {
    let _mode = XR_POV_TRANSITION_DEFAULT;

    function setMode(mode) {
        if (mode !== "teleport" && mode !== "smooth") return;
        _mode = mode;
    }

    function getMode() {
        return _mode;
    }

    function getDuration() {
        if (!ATON.XR.isPresenting()) return POV_TRANSITION_DURATION_SMOOTH;
        return _mode === "teleport"
            ? POV_TRANSITION_DURATION_TELEPORT
            : POV_TRANSITION_DURATION_SMOOTH;
    }

    return { setMode, getMode, getDuration };
})();

// ── Application de l'état initial des calques ────────────────────────────────
// `LAYERS[].visible` (config.js) est la source de vérité pour l'état initial,
// indépendamment du flag "show" présent dans scene.json pour chaque nœud.
function applyInitialLayerVisibility() {
    let bApplied = false;
    ATON.on("AllNodeRequestsCompleted", () => {
        if (bApplied) return;
        bApplied = true;

        LAYERS.forEach((layer) => {
            const n = ATON.getSceneNode?.(layer.node);
            if (!n) return;
            layer.visible ? n.show() : n.hide();
        });
    });
}

// ── Construction générique des lignes de calques ──────────────────────────────
// containerId : ID du conteneur <div> liste
// classes     : { row, label, toggle } — noms de classes CSS (varient par interface)
// onToggle    : function(layer, btn, visible) — logique métier propre à chaque module
//               (Photon.fire pour les médiateurs, show/hide local pour les visiteurs)
function buildLayerRows(containerId, classes, onToggle) {
    const list = document.getElementById(containerId);
    if (!list) return;

    LAYERS.forEach((layer) => {
        const row = document.createElement("div");
        row.className = classes.row;

        const lbl = document.createElement("span");
        lbl.className = classes.label;
        lbl.textContent = layer.label;

        const btn = document.createElement("button");
        btn.className = classes.toggle;
        btn.dataset.node = layer.node;
        const initialVis = layer.visible === true;
        btn.textContent = initialVis ? "ON" : "OFF";
        btn.dataset.visible = String(initialVis);
        btn.classList.toggle("active", initialVis);

        btn.addEventListener("click", () => {
            const vis = btn.dataset.visible !== "true";
            btn.dataset.visible = String(vis);
            btn.textContent = vis ? "ON" : "OFF";
            btn.classList.toggle("active", vis);
            onToggle(layer, btn, vis);
        });

        row.appendChild(lbl);
        row.appendChild(btn);
        list.appendChild(row);
    });
}
