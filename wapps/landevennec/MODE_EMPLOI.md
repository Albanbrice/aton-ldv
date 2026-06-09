# Mode d'emploi — Visite virtuelle de l'abbaye de Landévennec

---

## Accès à l'application

| Interface         | Adresse                                  | Usage                           |
| ----------------- | ---------------------------------------- | ------------------------------- |
| Visite (visiteur) | `https://…/a/landevennec/`               | Casque VR ou navigateur desktop |
| Contrôle tablette | `https://…/a/landevennec/control.html`   | Médiateur sans vue 3D           |
| Contrôle immersif | `https://…/a/landevennec/control3d.html` | Médiateur avec vue 3D et casque |

---

## Visiteur — casque Meta Quest 3

### Regarder et se repérer

Tournez simplement la tête : la vue 3D suit naturellement votre regard. Vous pouvez aussi
vous déplacer physiquement dans votre espace réel — le casque le retranscrit dans la scène.

Quand vous ne pouvez pas ou ne voulez pas vous déplacer physiquement, nous avons prévu un certain nombre d'interactions afin que vous puissez évoluer dans la scène 3D. Ces interactions peuvent se faire à l'aide des deux manettes ou avec vos mains seules, le casque les reconnaitra automatiquement! Pensez à bien les positionner dans votre champs de vision pour que les gestes que vous ferez soient correctement analysés par l'équipement optique du casque.

---

### Avec les manettes

#### Pivoter sur place (par cran de 15°)

| Geste                              | Effet                   |
| ---------------------------------- | ----------------------- |
| Joystick gauche **vers la gauche** | Tourner à gauche de 15° |
| Joystick gauche **vers la droite** | Tourner à droite de 15° |
| Bouton **X** (manette gauche)      | Tourner à gauche de 15° |
| Bouton **Y** (manette gauche)      | Tourner à droite de 15° |

#### Monter et descendre (par cran de 2 m)

Utile pour observer la scène depuis une hauteur différente (vue en plongée, niveau des toits…).

| Geste                            | Effet            |
| -------------------------------- | ---------------- |
| Joystick gauche **vers le haut** | Monter de 2 m    |
| Joystick gauche **vers le bas**  | Descendre de 2 m |

> Le système empêche de descendre sous le niveau du sol et de monter au-delà de 30 m
> au-dessus du terrain.

Ces déplacements sont crantés à dessein : des mouvements de caméra progressifs risqueraient
de provoquer des désagréments physiologiques (nausées, perte d'équilibre).

#### Se téléporter (si activé par le médiateur)

Par défaut, la téléportation est **désactivée** pour que le groupe reste groupé.
Le médiateur peut l'activer à tout moment pour une phase de visite libre.

- Pointez avec la **manette droite** vers l'endroit où vous voulez vous rendre
- Appuyez sur la **gâchette droite** (index droit) et relâchez pour vous téléporter

#### Consulter une annotation

Certaines zones de la scène sont interactives (elles s'illuminent légèrement au passage).
Pointez-les avec votre manette : un panneau d'information apparaît avec le texte et les
images associés. Pointez ailleurs ou éloignez-vous pour le fermer.

---

### Sans les manettes (mains nues)

#### Pivoter sur place (par cran de 15°)

| Geste                                                        | Effet                   |
| ------------------------------------------------------------ | ----------------------- |
| **Balayer horizontalement** votre main gauche vers la droite | Tourner à droite de 15° |
| **Balayer horizontalement** votre main gauche vers la gauche | Tourner à gauche de 15° |

#### Monter et descendre (par cran de 2 m)

| Geste                                           | Effet            |
| ----------------------------------------------- | ---------------- |
| **Balayer vers le haut** avec votre main gauche | Monter de 2 m    |
| **Balayer vers le bas** avec votre main gauche  | Descendre de 2 m |

#### Se téléporter (si activé par le médiateur)

- Dirigez votre **main droite** vers l'endroit que vous souhaitez atteindre
- **Pincez** votre index et votre pouce pour confirmer la destination

#### Consulter une annotation

Certaines zones de la scène sont interactives (elles s'illuminent légèrement au passage).
Regardez-les ou approchez-en votre main : un panneau d'information apparaît avec le texte
et les images associés. Regardez ailleurs ou éloignez-vous pour le fermer.

---

## Visiteur — navigateur desktop (sans casque)

- **Clic gauche + glisser** : faire pivoter la vue autour de la scène
- **Clic droit + glisser** (ou deux doigts sur trackpad) : déplacer la vue latéralement
- **Molette** : zoomer / dézoomer
- **Survol d'une zone annotée** : affiche le panneau d'information

---

## Médiateur — interface tablette / smartphone

Accès : `https://…/a/landevennec/control.html`

Cette interface ne charge pas la vue 3D — elle est conçue pour être légère et utilisable
sur une tablette ou un smartphone Android pendant la visite.

### Points de vue

La rangée de boutons en haut correspond aux étapes de la visite. Appuyer sur un bouton
**emmène instantanément tous les visiteurs** vers ce point de vue.

| Bouton            | Emplacement          |
| ----------------- | -------------------- |
| Vue générale      | Vue aérienne du site |
| Fortifications    | Les remparts         |
| Pont-levis        | Le châtelet d'entrée |
| Eglise            | L'église abbatiale   |
| Parvis            | Devant l'église      |
| Cloître           | Le cloître intérieur |
| Salle capitulaire | La salle du chapitre |

### Calques

Activez ou désactivez les couches d'information visibles dans les casques des visiteurs :

| Calque                   | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| **Etat actuel du site**  | Nuage de points 3D de l'état existant (activé par défaut) |
| **Restitution XIIIe s.** | Reconstitution 3D de l'abbaye au XIIIe siècle             |
| **Photos d'archives**    | Photographies anciennes recalées dans l'espace            |

### Contrôle de la navigation

- **Visite guidée — téléportation bloquée** (état par défaut) : les visiteurs ne peuvent
  pas se déplacer librement ; ils suivent les emplacements imposés par le médiateur et peuvent observer la scène en se mouvant physiquement (rotation de la tête, mouvements du corps).
- **Visite libre — téléportation active** : les visiteurs peuvent se déplacer librement
  dans la scène avec ou sans leurs manettes.

Appuyez sur le bouton pour basculer entre les deux modes.

### Exploration des calques

Permet aux visiteurs de contrôler eux-mêmes l'affichage des calques depuis leur casque.
Désactivé par défaut — à activer pour les phases d'exploration autonome.

### Message à tous

Saisissez un texte dans le champ en bas et appuyez sur **Envoyer** (ou Entrée) :
le message s'affiche en surimpression dans les casques de tous les visiteurs.

---

## Médiateur — interface 3D immersive

Accès : `https://…/a/landevennec/control3d.html`

Cette interface offre les mêmes contrôles que l'interface tablette, **plus** une vue 3D
complète et la possibilité d'utiliser un casque VR. Le médiateur apparaît comme un avatar
dans la scène pour les autres participants.

### Spécificités

- **Téléportation toujours active** : le médiateur peut se déplacer librement dans la scène,
  indépendamment du mode de navigation des visiteurs.
- **Partager ma vue** : envoie aux visiteurs exactement le point de vue en cours
  (position et angle de caméra) — utile pour guider l'attention sur un détail précis.
- Le **panneau de contrôle** (boutons calques, POVs, navigation…) s'ouvre et se ferme
  via le bouton sur le côté droit de l'écran.

### Contrôles VR du médiateur (même casque que les visiteurs)

Identiques aux contrôles visiteur, avec une différence : les rotations snap s'accumulent
d'une téléportation à l'autre (la direction regardée est conservée entre les déplacements).
