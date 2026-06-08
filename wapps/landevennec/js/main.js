"use strict";

const SESSION_ID    = "landevennec";
const SCENE_DEFAULT = "alban/landevennec";

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
