"use strict";

// ── Feedback visuel temporaire sur un élément ─────────────────────────────────
// Utilisé par les boutons médiateur pour confirmer une action.
function flash(el) {
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 600);
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
