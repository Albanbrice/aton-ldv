# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start the main service (port 8080 by default)
npm start

# Start companion services (run each in a separate terminal)
npm run start-photon    # Real-time multi-user service (port 8890)
npm run start-webdav    # WebDAV file access service (port 8081)

# Production deployment via PM2 (starts all three services in cluster mode)
npm run deploy-pm2

# Build the client-side JS bundles (required after editing public/src/*.js)
npm run build-aton      # → public/dist/ATON.min.js
npm run build-bundle    # → public/dist/THREE.bundle.js (Three.js + deps)

# Create a new web-app scaffold from template
node tools/app.js --appid myapp --title "My App" --author "Name"
```

No test suite exists. Development is done by running `npm start` and opening `http://localhost:8080`.

## Architecture

### Services (Node.js/Express back-end)

Three independent microservices, each in `services/`:

| Service | Entry point | Port | Role |
|---|---|---|---|
| **Main** | `services/ATON.service.main.js` | 8080/8083 | HTTP gateway, static files, REST API, auth |
| **Photon** | `services/photon/ATON.service.photon.js` | 8890 | WebSocket real-time collaboration (socket.io) |
| **WebDAV** | `services/webdav/ATON.service.webdav.js` | 8081 | File access via WebDAV |

The Main service proxies `/vrc` → Photon. `Core.js` is a singleton shared by all services; it owns config loading, filesystem paths, scene CRUD, and the **Maat** in-memory database.

**Maat** (`services/maat/Maat.js`) is a lazy-scanning in-memory index over `data/scenes/` and `data/collections/`. It re-scans on demand (flag-based) rather than watching the filesystem.

**Auth** (`services/Auth.js`) uses Passport.js with a local strategy. Users are stored in `config/users.json`. Sessions are file-backed (in `services/_prv/`). Passwords are stored in plain text in the config.

**REST API** lives in `services/API/`: `v1.js` is kept for backward compatibility; `v2.js` is the current API mounted at `/api/v2/`. API docs are served at `/apiv2-docs` via Swagger.

**Flares** are server-side plugins placed in `config/flares/<name>/`. Each flare has a `flare.json` manifest; server modules are loaded at startup and can register their own Express routes.

### Client-side engine (`public/src/`)

The browser-side engine is built from ES modules, each a namespace object on `window.ATON`:

| Module | Namespace | Responsibility |
|---|---|---|
| `ATON.js` | `ATON` | Entry point, Three.js renderer, scene roots, main loop |
| `ATON.scenehub.js` | `ATON.SceneHub` | Load/parse scene JSON, manage scenegraph |
| `ATON.semfactory.js` | `ATON.SemFactory` | Semantic annotations (spheres, convex shapes) |
| `ATON.nav.js` | `ATON.Nav` | Navigation modes (orbit, first-person, device orientation) |
| `ATON.xr.js` | `ATON.XR` | WebXR / immersive VR |
| `ATON.photon.js` | `ATON.Photon` | WebSocket client for real-time collaboration |
| `ATON.gs.js` | `ATON.GS` | 3D Gaussian Splatting (via `@sparkjsdev/spark`) |
| `ATON.mres.js` | `ATON.MRes` | Multi-resolution via Cesium 3D Tiles |
| `ATON.sui.js` | `ATON.SUI` | Spatial/3D UI elements (labels, buttons in XR) |
| `ATON.ui.js` | `ATON.UI` | 2D DOM-based UI components |
| `ATON.fe.js` | `ATON.FE` | Legacy front-end helpers (being deprecated, prefer `ATON.UI`) |
| `ATON.mathub.js` | `ATON.MatHub` | Material/shader management |
| `ATON.eventhub.js` | `ATON.EventHub` | Event bus (`ATON.fire()` / `ATON.on()`) |
| `ATON.xpf.js` | `ATON.XPF` | 360 panoramas and virtual tours |
| `ATON.audiohub.js` | `ATON.AudioHub` | Spatial audio |

The client is built into `public/dist/ATON.min.js` by webpack (`tools/webpack.aton.js`). Three.js and heavy deps are bundled separately into `public/dist/THREE.bundle.js`. During development, apps can load the raw ES modules directly via `<script type="module" src="/src/ATON.js">` (see `wapps/emviq/index.html`).

### Hathor (official front-end)

`public/hathor/` is the built-in scene viewer and editor:
- `main.js` — initializes the `HATHOR` app, loads scene from `?s=<sid>` URL param
- `editor.js` — scene editing tools (add models, annotations, viewpoints)
- `ui.js` / `sui.js` — Hathor-specific UI components

### Web-apps (`wapps/`)

Custom applications placed in `wapps/<appid>/` are served at `/a/<appid>/`. Each is a self-contained HTML app that imports ATON. The `app_template/` folder is the scaffold used by `node tools/app.js`. Currently active apps: **emviq** (Extended Matrix Visual Inspector) and **landevennec**.

### Data model

**Scenes** live in `data/scenes/<user>/<scene-name>/scene.json`. A scene JSON has:
- `scenegraph` — nodes (with `urls` pointing to 3D assets) and `edges` (parent→children hierarchy, root is `"."`)
- `semanticgraph` — named semantic annotations with volumetric shapes (`spheres`, `convexshapes`) and HTML descriptions
- `viewpoints` — named camera positions/targets
- `environment` — IBL, light probes
- `visibility` — access control (0 = public)

**Collections** live in `data/collections/<user>/` with sub-folders `models/`, `pano/`, `media/`. Each user gets their own collection folder created automatically on user creation.

### Configuration

`config/main.json` — server-wide settings (ports, service addresses).  
`config/users.json` — user list with plaintext passwords and `admin` flag.  
`config/flares/` — server-side plugins.  
`config/certs/` — SSL certificates (`server.crt`, `server.key`) for HTTPS on port 8083.