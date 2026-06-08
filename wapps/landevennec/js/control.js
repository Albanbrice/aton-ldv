"use strict";

const SESSION_ID = "landevennec";

// ── Configuration de la visite ────────────────────────────────────────────────
// Adaptez ces listes aux IDs de viewpoints et de nœuds définis dans la scène.

// const POVS = [
//     { id: "vue-generale",   label: "Vue générale"   },
//     { id: "entree",         label: "Entrée du site" },
//     { id: "nef",            label: "La nef"         },
//     { id: "choeur",         label: "Le chœur"       },
//     { id: "cloitre",        label: "Le cloître"     },
//     { id: "absides",        label: "Les absides"    },
// ];
const POVS = [
  { id: "aerien", label: "Vue générale" },
  { id: "remparts", label: "Fortifications" },
  { id: "chatelet", label: "Pont-levis" },
  { id: "eglise", label: "Eglise" },
  { id: "parvis", label: "Parvis" },
  { id: "cloitre", label: "Cloître" },
  { id: "chapitre", label: "Salle capitulaire" },
];

const LAYERS = [
  { node: "restitution-XIIIe", label: "Restitution XIIIe s." },
  { node: "archives-photo", label: "Photos d'archives" },
];

// ── App initialization ────────────────────────────────────────────────────────

let APP = ATON.App.realize();

APP.setup = () => {
  // Pas de renderer 3D : le médiateur n'a pas besoin d'une vue immersive ici.
  // Le canvas Three.js est créé mais non attaché au DOM.
  ATON.realize(true);

  ATON.Photon.disableSpatiality(); // pas d'envoi de position/orientation
  ATON.Photon.setAvatarsVisibility(false);
  ATON.Photon.connect(SESSION_ID);

  ATON.on("VRC_Connected", () => _setStatus(true));
  ATON.on("VRC_Disconnected", () => _setStatus(false));
  ATON.on("VRC_UserEnter", _updateUsers);
  ATON.on("VRC_UserLeave", _updateUsers);
  ATON.on("VRC_IDassigned", _updateUsers);

  _buildUI();
  _showVisitorLink();
};

// ── Statut de connexion ───────────────────────────────────────────────────────

function _setStatus(connected) {
  const dot = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  if (!dot || !text) return;

  dot.className = "dot " + (connected ? "dot-on" : "dot-off");
  text.textContent = connected ? "Connecté" : "Déconnecté";
  _updateUsers();
}

function _updateUsers() {
  const n = ATON.Photon?.getNumUsers?.() ?? 0;
  const el = document.getElementById("user-count");
  if (!el) return;

  const visitors = Math.max(0, n - 1); // on soustrait le médiateur lui-même
  if (visitors > 0) {
    el.textContent = visitors + " visiteur" + (visitors > 1 ? "s" : "");
    el.style.display = "inline-block";
  } else {
    el.style.display = "none";
  }
}

// ── Construction de l'interface ───────────────────────────────────────────────

function _buildUI() {
  _buildPOVButtons();
  _buildLayerToggles();
  _buildMessageInput();
}

function _buildPOVButtons() {
  const grid = document.getElementById("pov-grid");
  if (!grid) return;

  POVS.forEach((pov) => {
    const btn = document.createElement("button");
    btn.className = "pov-btn";
    btn.textContent = pov.label;
    btn.addEventListener("click", () => {
      ATON.Photon.fire("GOTO_POV", { id: pov.id });
      _flash(btn);
      _toast("Vue envoyée : " + pov.label);
    });
    grid.appendChild(btn);
  });
}

function _buildLayerToggles() {
  const list = document.getElementById("layers-list");
  if (!list) return;

  LAYERS.forEach((layer) => {
    const row = document.createElement("div");
    row.className = "layer-row";

    const lbl = document.createElement("span");
    lbl.className = "layer-label";
    lbl.textContent = layer.label;

    const toggle = document.createElement("button");
    toggle.className = "layer-toggle";
    toggle.textContent = "OFF";
    toggle.dataset.visible = "false";

    toggle.addEventListener("click", () => {
      const vis = toggle.dataset.visible !== "true";
      toggle.dataset.visible = String(vis);
      toggle.textContent = vis ? "ON" : "OFF";
      toggle.classList.toggle("active", vis);
      ATON.Photon.fire("LAYER_SET", { node: layer.node, visible: vis });
      _toast((vis ? "Calque activé : " : "Calque masqué : ") + layer.label);
    });

    row.appendChild(lbl);
    row.appendChild(toggle);
    list.appendChild(row);
  });
}

function _buildMessageInput() {
  const input = document.getElementById("msg-input");
  const btn = document.getElementById("btn-send-msg");
  if (!input || !btn) return;

  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    ATON.Photon.fire("BROADCAST", { text });
    input.value = "";
    _flash(btn);
    _toast("Message envoyé");
  };

  btn.addEventListener("click", send);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") send();
  });
}

// ── Lien visiteurs ────────────────────────────────────────────────────────────

function _showVisitorLink() {
  const el = document.getElementById("visitor-url");
  if (!el) return;
  const url = window.location.origin + "/a/landevennec/";
  el.textContent = url;
}

// ── Utilitaires UI ────────────────────────────────────────────────────────────

function _flash(el) {
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 600);
}

function _toast(msg, dur = 2000) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), dur);
}
