"use strict";

// SESSION_ID, SCENE_DEFAULT définis dans js/config.js

let APP = ATON.App.realize();

APP.setup = () => {
    ATON.FE.realize();
    ATON.FE.addBasicLoaderEvents();
    ATON.XR.setSessionType("immersive-vr");

    // 3D Tiles LOD quality for Meta Quest 3 (online: ~75% native 2064×2208)
    // Core change needed: setXRResolution added to ATON.mres.js — re-apply after upstream pull
    ATON.MRes.setXRResolution(1600, 1700);

    const sid = APP.params.get("s") || SCENE_DEFAULT;
    ATON.FE.loadSceneID(sid);
    ATON.Photon.connect(SESSION_ID);

    UI.init();
    Network.init();
    Annotations.init();
    XRModule.init();
    Help.init(Help.VISITOR_SECTIONS);

    // Splash "toucher pour démarrer" quand lancé depuis la bibliothèque Quest (PWA)
    // requestSession() exige un geste utilisateur — on le capture via le tap sur le splash.
    const _bPWA = window.matchMedia('(display-mode: fullscreen)').matches
               || window.matchMedia('(display-mode: standalone)').matches;
    if (_bPWA) {
        ATON.on("AllNodeRequestsCompleted", () => {
            setTimeout(_showVRSplash, 300);
        });
    }
};

APP.update = () => {
    XRModule.update();
};

function _showVRSplash() {
    const splash = document.createElement("div");
    splash.id = "vr-splash";
    splash.innerHTML = `
        <div id="vr-splash-inner">
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none"
                 stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/>
                <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
            </svg>
            <p>Toucher pour démarrer la visite</p>
        </div>`;
    splash.addEventListener("click", () => {
        splash.classList.add("hiding");
        splash.addEventListener("transitionend", () => splash.remove(), { once: true });
        if (!ATON.XR.isPresenting()) ATON.XR.toggle("immersive-vr");
    });
    document.body.appendChild(splash);
}
