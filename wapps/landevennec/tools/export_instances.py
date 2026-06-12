"""
Export des transforms d'instances (Geometry Nodes "Instance on Points", à
partir d'un nœud "Object Info" branché sur l'entrée Instance) vers le
format JSON attendu par wapps/landevennec/js/render-instances.js (champ
`transformsUrl` d'un INSTANCE_GROUPS).

Note : les imports "bpy"/"mathutils" et les avertissements Pylance associés
sont normaux — ce script s'exécute dans l'environnement Python interne de
Blender, qui fournit ces modules.

Usage :
  - Sélectionner l'objet porteur du modificateur Geometry Nodes
    ("Instance on Points") à exporter.
  - Ouvrir ce script dans l'onglet "Scripting" de Blender 4.5 et
    l'exécuter (Alt+P ou bouton "Run Script").
  - Un fichier JSON est écrit par objet instancié (un par nœud
    "Object Info" branché sur "Instance on Points"), dans un
    sous-dossier `tmp/` créé à côté du fichier .blend.

Transform du point :
  On exporte directement `inst.matrix_world`, la transform monde de chaque
  instance telle que placée par "Instance on Points". Pour les instances
  générées par Geometry Nodes, `inst.object.matrix_world` est égal à
  `inst.matrix_world` (l'objet évalué reflète l'instance courante) : il ne
  faut donc pas le soustraire, sous peine d'obtenir une transform quasi
  identité pour chaque point.

Plusieurs objets porteurs de Geometry Nodes :
  Le script ne traite que l'objet actif (sélectionné). Pour exporter
  plusieurs setups, sélectionner chaque objet porteur et relancer le
  script — un jeu de fichiers JSON est généré à chaque exécution
  (un fichier par objet instancié sous l'objet actif).

Conversion de repère :
  Un .glb exporté normalement depuis Blender (export glTF standard) est
  déjà converti en Y-up. Les transforms d'instances récupérées ici sont en
  revanche dans le repère Blender (Z-up). On applique donc la même
  conversion que l'exporteur glTF (rotation de -90° autour de X, conjuguée
  sur chaque matrice) afin que les transforms exportées soient directement
  compatibles avec le .glb, SANS `rootTransform` dans INSTANCE_GROUPS (ou
  avec un rootTransform identité).
"""

import bpy
import json
import math
import mathutils
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────
# Nom du sous-dossier de sortie, créé à côté du fichier .blend.
OUTPUT_SUBDIR = "tmp"

# ── Conversion de repère Blender (Z-up) -> glTF/ATON (Y-up) ────────────────
# Rotation de -90° autour de X : (x, y, z) -> (x, z, -y)
_R = mathutils.Matrix.Rotation(-math.pi / 2.0, 4, "X")
_R_INV = _R.inverted()


def _convert_matrix(mat_world):
    """Convertit une matrice monde Blender (Z-up) en matrice Y-up,
    cohérente avec un .glb exporté normalement (export glTF standard,
    qui applique la même conversion à la géométrie)."""
    return _R @ mat_world @ _R_INV


def _matrix_to_transform(mat):
    loc, rot, scale = mat.decompose()
    euler = rot.to_euler("XYZ")
    return {
        "position": [loc.x, loc.y, loc.z],
        "rotation": [euler.x, euler.y, euler.z],
        "scale": [scale.x, scale.y, scale.z],
    }


def export_instances():
    carrier = bpy.context.active_object
    if carrier is None:
        print("Aucun objet sélectionné : sélectionner l'objet porteur "
              "du modificateur Geometry Nodes et relancer le script.")
        return

    blend_dir = Path(bpy.data.filepath).parent
    output_dir = blend_dir / OUTPUT_SUBDIR
    output_dir.mkdir(parents=True, exist_ok=True)

    depsgraph = bpy.context.evaluated_depsgraph_get()

    # transforms[objet_source_name] -> list[transform]
    transforms_by_object = {}

    for inst in depsgraph.object_instances:
        if not inst.is_instance:
            continue
        if inst.object is None or inst.parent is None:
            continue
        if inst.parent.original != carrier:
            continue

        # Transform du point = transform monde de l'instance, telle que
        # placée par "Instance on Points" (pour les instances générées par
        # Geometry Nodes, inst.object.matrix_world est égal à
        # inst.matrix_world : il ne faut donc PAS le soustraire).
        m_point = _convert_matrix(inst.matrix_world)

        name = inst.object.name
        transforms_by_object.setdefault(name, []).append(_matrix_to_transform(m_point))

    if not transforms_by_object:
        print(f"Aucune instance trouvée sous l'objet '{carrier.name}'.")
        return

    for name, transforms in transforms_by_object.items():
        output_path = output_dir / f"instances-{name}.json"
        with open(output_path, "w") as f:
            json.dump(transforms, f, indent=2)

        print(f"[{name}] {len(transforms)} instance(s) -> {output_path}")


export_instances()
