# Memo — wapp Landévennec / ATON

## Contexte du projet

Visite virtuelle guidée multi-utilisateurs du site abbatial de Landévennec, sur Meta Quest 3.
La scène combine un 3D Tiles de l'état existant, des GLTF de restitution (XIIIe s.) et des plans
Three.js portant des photographies d'archives recalées dans l'espace.

Déployé sur un NUC local avec router WiFi. Un médiateur (tablette ou casque) contrôle la visite ;
les visiteurs disposent de fonctionnalités restreintes (déplacement, annotations, pas de gestion
des calques).

---

## Démarrage des services

Le service principal **ne lance pas** Photon automatiquement — les deux doivent tourner séparément.

```bash
# Développement (deux terminaux)
npm start                # service principal — port 8080 / 8083
npm run start-photon     # WebSocket temps réel — port 8890 (obligatoire pour le multi-utilisateur)

# Production (recommandé) — PM2 gère les 3 services en démon
sudo npm install -g pm2  # une seule fois
npm run deploy-pm2       # démarre main + photon + webdav
pm2 save                 # persiste au redémarrage
pm2 list                 # vérifie l'état
```

> Sans Photon, la connexion socket.io échoue en 504 Gateway Timeout.
> Le service principal proxifie `/vrc` et `/svrc` vers `localhost:8890`.

---

## Build du bundle client

**Obligatoire après toute modification de `public/src/*.js`.**

```bash
npm run build-aton       # → public/dist/ATON.min.js
```

Webpack n'est pas dans les dépendances upstream — il a été ajouté en devDependency localement.
Si `webpack: not found` après un `git merge upstream` + `npm install` :

```bash
npm install --save-dev webpack webpack-cli
npm run build-aton
```

---

## Patch core ATON — à ré-appliquer après chaque `git merge upstream`

Ces modifications de `public/src/ATON.mres.js` améliorent le LOD des 3D Tiles en mode XR
(Meta Quest 3 : résolution native 2064×2208 px/œil).
Elles sont écrasées par les mises à jour upstream et doivent être ré-appliquées manuellement.

**Fichier : `public/src/ATON.mres.js`**

1. Dans `init()`, après `MRes._tseBase = 16.0;` — ajouter :
```js
MRes._xrResW = 1600;  // Quest 3 online (~75% natif 2064×2208)
MRes._xrResH = 1700;
```

2. Ajouter le setter avant `setBaseTSE` :
```js
MRes.setXRResolution = (w, h)=>{ MRes._xrResW = w; MRes._xrResH = h; };
```

3. Dans `updateTSetsCamera()`, remplacer :
```js
TS.setResolution( cam, 600,600 ); // 300
```
par :
```js
TS.setResolution( cam, MRes._xrResW, MRes._xrResH );
```

4. Dans `estimateTSErrorTarget()`, commenter :
```js
//if (ATON.XR._bPresenting) tse *= 1.2; // disabled: use setXRResolution() instead
```

5. **Rebuilder le bundle** : `npm run build-aton`

La wapp configure la résolution dans `wapps/landevennec/js/main.js` :
```js
ATON.MRes.setXRResolution(1600, 1700); // online
// ATON.MRes.setXRResolution(2064, 2208); // local LAN — pleine résolution Quest 3
```

---

## Patch Hathor — à ré-appliquer après chaque `git merge upstream`

Fondu CSS de la barre d'outils Hathor lors de la navigation (remplace le masquage instantané).
Écrasé par les mises à jour upstream — ré-appliquer manuellement.

### 1. `public/hathor/ui.js` — remplacer le handler `NavInteraction`

Chercher le bloc (dans `UI.setup`) :
```js
ATON.on("NavInteraction", b => {
    if (HATHOR.currTask) return;
    if (b){ UI.hideMainElements(); }
    else  { UI.showMainElements(); }
});
```
Le remplacer par :
```js
ATON.on("NavInteraction", (b) => {
    if (HATHOR.currTask) return;
    if (b) { UI.fadeOutMainElements(); }
    else   { UI.fadeInMainElements();  }
});
```

### 2. `public/hathor/ui.js` — ajouter les deux méthodes (n'importe où après `UI.hideMainElements`)

```js
UI.fadeOutMainElements = () => {
    [UI._elMainToolbar, UI._elBottomToolbar, UI._elUserToolbar, UI._elSidePanel]
        .forEach(el => el?.classList.add("aton-fadeout"));
};

UI.fadeInMainElements = () => {
    [UI._elMainToolbar, UI._elBottomToolbar, UI._elUserToolbar, UI._elSidePanel]
        .forEach(el => el?.classList.remove("aton-fadeout"));
};
```

### 3. `public/res/css/main.css` — ajouter la règle CSS du fondu

```css
.aton-fadeout {
    opacity: 0 !important;
    pointer-events: none !important;
    transition: opacity 0.4s ease;
}
```

> Aucun rebuild de bundle nécessaire (`public/hathor/` est servi directement, pas via webpack).

---

## Patch services/ATON.service.main.js — à ré-appliquer après chaque `git merge upstream`

`express.static` ignore par défaut les fichiers/dossiers commençant par un point (`dotfiles: 'ignore'`),
donc `public/.well-known/assetlinks.json` (Digital Asset Links, requis pour la TWA Bubblewrap)
n'était jamais servi malgré que `Core.DIR_PUBLIC` soit monté à la racine `/`.

**Fichier : `services/ATON.service.main.js`**, juste avant le montage de `Core.DIR_PUBLIC` :

```js
// dotfiles: 'allow' nécessaire pour exposer /.well-known/ (ex: assetlinks.json pour TWA)
app.use('/', express.static(Core.DIR_PUBLIC, { ...CACHING_OPT, dotfiles: 'allow' } ));
```

> Aucun rebuild de bundle nécessaire. Redémarrer le service principal (`npm start` / pm2 restart)
> pour appliquer le changement.

---

## Git

```bash
# Sauvegarder le travail wapp
git add wapps/landevennec/ data/scenes/alban/
git commit -m "description"
git push

# Intégrer les mises à jour upstream
git fetch upstream
git merge upstream/master
# → ré-appliquer le patch ATON.mres.js + npm run build-aton
# → ré-appliquer le patch Hathor fadeout (public/hathor/ui.js + public/res/css/main.css)
git push
```

---

## HTTPS

### Solution immédiate — mkcert (setup une fois par casque)

Sur le NUC :

```bash
sudo apt install libnss3-tools
curl -JLO https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v*-linux-amd64
chmod +x mkcert-* && sudo mv mkcert-* /usr/local/bin/mkcert
mkcert -install
mkcert -key-file config/certs/server.key \
       -cert-file config/certs/server.crt \
       192.168.1.18 localhost
cp "$(mkcert -CAROOT)/rootCA.pem" public/rootCA.pem
```

Sur chaque Meta Quest (une seule fois) :

1. Ouvrir `http://192.168.1.18:8080/rootCA.pem` dans le navigateur du casque
2. Paramètres → Wi-Fi & Internet → ⚙ → Certificats → Installer un certificat CA
3. Sélectionner le fichier téléchargé

### Solution pérenne — domaine + Let's Encrypt

```
DNS public :  visite.abbaye-landevennec.fr  A  192.168.1.18
```

```bash
sudo apt install certbot
sudo certbot certonly --manual --preferred-challenges dns \
  -d visite.abbaye-landevennec.fr
sudo cp /etc/letsencrypt/live/visite.abbaye-landevennec.fr/privkey.pem  config/certs/server.key
sudo cp /etc/letsencrypt/live/visite.abbaye-landevennec.fr/fullchain.pem config/certs/server.crt
```

| | mkcert | Domaine + Let's Encrypt |
|---|---|---|
| Coût | Gratuit | ~10 €/an |
| Setup initial | 5 min par casque | 30 min (une seule fois) |
| Nouveau casque | Procédure à répéter | Rien à faire |
| Aspect professionnel | Bien | Parfait |

Développement / démo interne → mkcert. Installation muséale permanente → domaine.
