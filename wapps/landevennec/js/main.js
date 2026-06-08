"use strict";

// SESSION_ID, SCENE_DEFAULT définis dans js/config.js

let APP = ATON.App.realize();

APP.setup = () => {
    ATON.FE.realize();
    ATON.FE.addBasicLoaderEvents();
    ATON.XR.setSessionType("immersive-vr");

    const sid = APP.params.get("s") || SCENE_DEFAULT;
    ATON.FE.loadSceneID(sid);
    ATON.Photon.connect(SESSION_ID);

    UI.init();
    Network.init();
    Annotations.init();
    XRModule.init();
};

APP.update = () => {
    XRModule.update();
};
