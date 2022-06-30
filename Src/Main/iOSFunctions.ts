//IOS FUNCTIONS - DO NOT USE IN ACTUAL CODE
function GetCanvasBase64Encoded() { //for iOS, which is why it is using the global variables instead of taking them in as HTMLElements
    const paper = <HTMLCanvasElement>document.getElementById("paper")!;

    const base64EncodedString = paper.toDataURL();
    return base64EncodedString.slice(22, base64EncodedString.length);
}
function enlargeCanvas() { //again made for iOS app, not to be used in normal web app
    const body = document.body;
    const paper = <HTMLCanvasElement>document.getElementById("paper")!;

    const previousZoom = ZOOM;
    ZOOM = 4;
    SizePaper(paper);
    body.style.setProperty("pointer-events", "none");
    UPDATE_CANVAS = true;
    return previousZoom;
};
function revertCanvas(prevZoom: number) { //also made for iOS app
    const body = document.body;
    const paper = <HTMLCanvasElement>document.getElementById("paper")!;

    ZOOM = prevZoom;
    SizePaper(paper);
    body.style.setProperty("pointer-events", "all");
    UPDATE_CANVAS = true;
}