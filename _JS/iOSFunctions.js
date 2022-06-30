"use strict";
//IOS FUNCTIONS - DO NOT USE IN ACTUAL CODE
function GetCanvasBase64Encoded() {
    const paper = document.getElementById("paper");
    const base64EncodedString = paper.toDataURL();
    return base64EncodedString.slice(22, base64EncodedString.length);
}
function enlargeCanvas() {
    const body = document.body;
    const paper = document.getElementById("paper");
    const previousZoom = ZOOM;
    ZOOM = 4;
    SizePaper(paper);
    body.style.setProperty("pointer-events", "none");
    UPDATE_CANVAS = true;
    return previousZoom;
}
;
function revertCanvas(prevZoom) {
    const body = document.body;
    const paper = document.getElementById("paper");
    ZOOM = prevZoom;
    SizePaper(paper);
    body.style.setProperty("pointer-events", "all");
    UPDATE_CANVAS = true;
}
