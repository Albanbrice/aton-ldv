"use strict";

// ── Identifiants de session ───────────────────────────────────────────────────

const SESSION_ID = "landevennec";
const SCENE_DEFAULT = "alban/landevennec";

// ── Points de vue de la visite ────────────────────────────────────────────────
// Doivent correspondre aux IDs définis dans data/scenes/alban/landevennec/scene.json

const POVS = [
  { id: "aerien", label: "Vue générale" },
  { id: "remparts", label: "Fortifications" },
  { id: "chatelet", label: "Pont-levis" },
  { id: "eglise", label: "Eglise" },
  { id: "parvis", label: "Parvis" },
  { id: "cloitre", label: "Cloître" },
  { id: "chapitre", label: "Salle capitulaire" },
];

// ── Calques contrôlés par le médiateur ───────────────────────────────────────
// Doivent correspondre aux IDs de nœuds dans le scenegraph de la scène

const LAYERS = [
  { node: "etat-actuel",       label: "Etat actuel du site",   visible: true  },
  { node: "restitution-XIIIe", label: "Restitution XIIIe s.",  visible: false },
  { node: "archives-photo",    label: "Photos d'archives",     visible: false },
];
