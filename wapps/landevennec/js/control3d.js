"use strict";

// SESSION_ID, SCENE_DEFAULT, POVS, LAYERS viennent de js/config.js

let APP = ATON.App.realize();

APP.setup = () => {
    ATON.FE.realize();
    ATON.FE.addBasicLoaderEvents();
    ATON.XR.setSessionType("immersive-vr");

    const sid = APP.params.get("s") || SCENE_DEFAULT;
    ATON.FE.loadSceneID(sid);
    ATON.Photon.connect(SESSION_ID);

    // Modules communs avec l'app visiteur
    UI.init();
    Annotations.init();
    XRModule.init();

    // Le médiateur navigue toujours librement et conserve sa rotation snap entre téléportations
    XRModule.setTeleportEnabled(true);
    XRModule.setResetRotationOnTeleport(false);

    _initPhoton();
    _buildMediatorPanel();
};

APP.update = () => {
    XRModule.update();
};

// ── Événements Photon (médiateur observe + applique les états scène) ──────────

function _initPhoton() {
    // Présence
    ATON.on("VRC_Connected",    () => _setStatus(true));
    ATON.on("VRC_Disconnected", () => _setStatus(false));
    ATON.on("VRC_UserEnter",    _updateUsers);
    ATON.on("VRC_UserLeave",    _updateUsers);
    ATON.on("VRC_IDassigned",   _updateUsers);

    // Appliquer les calques pour rester en phase avec ce que voient les visiteurs
    ATON.Photon.on("LAYER_SET", (d) => {
        if (!d?.node) return;
        const n = ATON.getSceneNode(d.node);
        if (!n) return;
        d.visible ? n.show() : n.hide();
        _syncLayerToggle(d.node, d.visible);
    });

    // Synchroniser le bouton nav si un autre médiateur a modifié l'état
    ATON.Photon.on("NAV_TOGGLE", (d) => {
        if (d?.enabled === undefined) return;
        _syncNavToggle(d.enabled);
    });

    // Message reçu
    ATON.Photon.on("BROADCAST", (d) => {
        if (!d?.text) return;
        UI.toast(d.text, 5000);
    });
}

// ── Statut de connexion ───────────────────────────────────────────────────────

function _setStatus(connected) {
    const dot  = document.getElementById("med-status-dot");
    const text = document.getElementById("med-status-text");
    if (!dot || !text) return;
    dot.className  = "med-dot " + (connected ? "med-dot-on" : "med-dot-off");
    text.textContent = connected ? "Connecté" : "Déconnecté";
    _updateUsers();
}

function _updateUsers() {
    const n  = ATON.Photon?.getNumUsers?.() ?? 0;
    const el = document.getElementById("med-user-count");
    if (!el) return;
    const visitors = Math.max(0, n - 1);
    el.textContent  = visitors > 0
        ? visitors + " visiteur" + (visitors > 1 ? "s" : "")
        : "";
    el.style.display = visitors > 0 ? "inline-block" : "none";
}

// ── Construction du panneau médiateur ─────────────────────────────────────────

function _buildMediatorPanel() {
    _buildPOVButtons();
    _buildLayerToggles();
    _buildSharePOV();
    _buildNavToggle();
    _buildLayersUnlockToggle();
    _buildMessageInput();
    _buildPanelToggle();
}

function _buildPOVButtons() {
    const grid = document.getElementById("med-pov-grid");
    if (!grid) return;
    POVS.forEach((pov) => {
        const btn = document.createElement("button");
        btn.className   = "med-pov-btn";
        btn.textContent = pov.label;
        btn.addEventListener("click", () => {
            ATON.Photon.fire("GOTO_POV", { id: pov.id });
            ATON.Nav.requestPOVbyID(pov.id, 2.0); // médiateur suit aussi
            flash(btn);
            UI.toast("Vue : " + pov.label);
        });
        grid.appendChild(btn);
    });
}

function _buildLayerToggles() {
    buildLayerRows(
        "med-layers-list",
        { row: "med-layer-row", label: "med-layer-label", toggle: "med-layer-toggle" },
        (layer, _btn, vis) => {
            const n = ATON.getSceneNode(layer.node);
            if (n) vis ? n.show() : n.hide();
            ATON.Photon.fire("LAYER_SET", { node: layer.node, visible: vis });
            UI.toast((vis ? "Calque activé : " : "Calque masqué : ") + layer.label);
        }
    );
}

function _syncLayerToggle(nodeId, visible) {
    const btn = document.querySelector(`[data-node="${nodeId}"]`);
    if (!btn) return;
    btn.dataset.visible = String(visible);
    btn.textContent     = visible ? "ON" : "OFF";
    btn.classList.toggle("active", visible);
    const n = ATON.getSceneNode(nodeId);
    if (n) visible ? n.show() : n.hide();
}

function _buildSharePOV() {
    const btn = document.getElementById("btn-share-pov");
    if (!btn) return;
    btn.addEventListener("click", () => {
        const pov = ATON.Nav.copyCurrentPOV();
        ATON.Photon.fire("GOTO_POV_RAW", {
            pos:    pov.pos.toArray(),
            target: pov.target.toArray(),
            fov:    pov.fov,
        });
        flash(btn);
        UI.toast("Vue partagée avec les visiteurs");
    });
}

function _buildNavToggle() {
    const btn = document.getElementById("btn-med-nav-toggle");
    if (!btn) return;
    let _freeNav = false;
    btn.addEventListener("click", () => {
        _freeNav = !_freeNav;
        ATON.Photon.fire("NAV_TOGGLE", { enabled: _freeNav });
        _syncNavToggle(_freeNav);
        flash(btn);
    });
}

function _syncNavToggle(enabled) {
    const btn = document.getElementById("btn-med-nav-toggle");
    if (!btn) return;
    if (enabled) {
        btn.textContent = "🔓 Visite libre — téléportation active";
        btn.classList.add("free");
    } else {
        btn.textContent = "🔒 Visite guidée — téléportation bloquée";
        btn.classList.remove("free");
    }
}

function _buildLayersUnlockToggle() {
    const btn = document.getElementById("btn-med-layers-unlock");
    if (!btn) return;

    // Synchronisation si un autre médiateur change l'état
    ATON.Photon.on("LAYERS_UNLOCK", (d) => {
        if (d?.enabled === undefined) return;
        _syncLayersUnlock(d.enabled);
    });

    let _enabled = false;
    btn.addEventListener("click", () => {
        _enabled = !_enabled;
        ATON.Photon.fire("LAYERS_UNLOCK", { enabled: _enabled });
        _syncLayersUnlock(_enabled);
        flash(btn);
    });
}

function _syncLayersUnlock(enabled) {
    const btn = document.getElementById("btn-med-layers-unlock");
    if (!btn) return;
    btn.textContent = enabled
        ? "🔓 Exploration calques — activée"
        : "🔒 Exploration calques — désactivée";
    btn.classList.toggle("unlocked", enabled);
}

function _buildMessageInput() {
    const input = document.getElementById("med-msg-input");
    const btn   = document.getElementById("btn-med-send-msg");
    if (!input || !btn) return;
    const send = () => {
        const text = input.value.trim();
        if (!text) return;
        ATON.Photon.fire("BROADCAST", { text });
        input.value = "";
        flash(btn);
        UI.toast("Message envoyé");
    };
    btn.addEventListener("click", send);
    input.addEventListener("keypress", (e) => { if (e.key === "Enter") send(); });
}

function _buildPanelToggle() {
    const toggleBtn = document.getElementById("btn-mediator-toggle");
    const panel     = document.getElementById("mediator-panel");
    if (!toggleBtn || !panel) return;
    toggleBtn.addEventListener("click", () => {
        const open = panel.classList.toggle("open");
        toggleBtn.classList.toggle("open", open);
        toggleBtn.title = open ? "Fermer le panneau médiateur" : "Ouvrir le panneau médiateur";
    });
}

// ── Utilitaires ───────────────────────────────────────────────────────────────
