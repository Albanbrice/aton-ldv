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

// ── Transition entre POVs en mode XR ─────────────────────────────────────────
// "teleport" = changement de vue instantané (recommandé en VR, évite les nausées)
// "smooth"   = transition progressive (identique au mode web)
// Cette bascule n'affecte que le mode immersif (XR) ; en navigation web classique,
// la transition est toujours progressive.

const XR_POV_TRANSITION_DEFAULT = "teleport";
const POV_TRANSITION_DURATION_SMOOTH = 2.0;
const POV_TRANSITION_DURATION_TELEPORT = 0;

// ── Calques contrôlés par le médiateur ───────────────────────────────────────
// Doivent correspondre aux IDs de nœuds dans le scenegraph de la scène

const LAYERS = [
  { node: "etat-actuel", label: "Etat actuel du site", visible: true },
  {
    node: "restitution-XIIIe-transparence",
    label: "Superposition de la restitution XIIIe s.",
    visible: false,
  },
  { node: "restitution-XIIIe", label: "Restitution XIIIe s.", visible: false },
  { node: "fragments", label: "Fragments architecturaux", visible: false },
];
