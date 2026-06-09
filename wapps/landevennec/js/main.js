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

    // Auto-enter VR when launched as installed PWA (Quest launcher)
    if (window.matchMedia('(display-mode: fullscreen)').matches
     || window.matchMedia('(display-mode: standalone)').matches) {
        let _autoVRdone = false;
        ATON.on("AllNodeRequestsCompleted", () => {
            if (_autoVRdone) return;
            _autoVRdone = true;
            setTimeout(() => { if (!ATON.XR.isPresenting()) ATON.XR.toggle("immersive-vr"); }, 500);
        });
    }
};

APP.update = () => {
    XRModule.update();
};
