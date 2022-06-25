"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const PAPER_POSITION = { left: 0, top: 0 }; //position relative, left=x, top=y
let PAPER_HEIGHT_MM = 297;
let PAPER_WIDTH_MM = 210;
const DEFAULT_PAPER_MARGIN_PX = 50;
const DPI = window.devicePixelRatio;
let MM_PX_SF = 1;
let ZOOM = 1;
const IMAGES = []; //rotation in degrees
const DEFAULT_IMAGE_OFFSET_MM = 5;
const DEFAULT_IMAGE_SIZE_MM = 200;
const TRANSFORM_OVERLAY_RESIZE_RADIUS = 15;
let [MOUSE_X, MOUSE_Y] = [0, 0];
let SELECTED_IMAGE_INDEX = undefined;
let UPDATE_CANVAS = false;
const InitHTML = (taskbar) => {
    const urlParams = new URLSearchParams(window.location.search);
    const hideTaskbar = urlParams.get('hideTaskbar');
    if (hideTaskbar == "true") {
        taskbar.style.display = "none";
    }
};
const FitToScreen = () => {
    //paper's size in mm should stay the same, however we can change the MM_PX_SF
    const heightSF = (window.innerHeight - DEFAULT_PAPER_MARGIN_PX) / PAPER_HEIGHT_MM;
    const widthSF = (window.innerWidth - DEFAULT_PAPER_MARGIN_PX) / PAPER_WIDTH_MM;
    MM_PX_SF = (heightSF < widthSF) ? heightSF : widthSF;
    UPDATE_CANVAS = true;
};
function GetCanvasBase64Encoded() {
    const paper = document.getElementById("paper");
    const base64EncodedString = paper.toDataURL();
    return base64EncodedString.slice(22, base64EncodedString.length);
}
function enlargeCanvas() {
    const body = document.body;
    const paper = document.getElementById("paper");
    const previousZoom = ZOOM;
    ZOOM = 8;
    SizePaper(paper);
    body.style.setProperty("pointer-events", "none");
    return previousZoom;
}
;
function revertCanvas(prevZoom) {
    const body = document.body;
    const paper = document.getElementById("paper");
    ZOOM = prevZoom;
    SizePaper(paper);
    body.style.setProperty("pointer-events", "all");
    console.log("reverted");
}
const SizePaper = (paper) => {
    paper.style.height = `${PAPER_HEIGHT_MM * MM_PX_SF * ZOOM}px`;
    paper.style.width = `${PAPER_WIDTH_MM * MM_PX_SF * ZOOM}px`;
    paper.setAttribute('height', String(PAPER_HEIGHT_MM * MM_PX_SF * ZOOM));
    paper.setAttribute('width', String(PAPER_WIDTH_MM * MM_PX_SF * ZOOM));
    UPDATE_CANVAS = true;
};
const PositionPaper = (paper) => {
    paper.style.left = `${PAPER_POSITION.left}px`;
    paper.style.top = `${PAPER_POSITION.top}px`;
};
const CheckIntersectionElement = (x, y, element) => {
    const boundingBox = element.getBoundingClientRect();
    if (x > boundingBox.left && x < boundingBox.right && y > boundingBox.top && y < boundingBox.bottom) { //top and bottom are inverted since in canvas coordinate system y increases as it goes down
        return true;
    }
    return false;
};
const CheckIntersectionImage = (x, y, paperBoundingBox, imageIndex) => {
    const img = IMAGES[imageIndex];
    const [left, right, top, bottom] = [paperBoundingBox.left + img.leftMM * MM_PX_SF * ZOOM, paperBoundingBox.left + img.leftMM * MM_PX_SF * ZOOM + img.widthMM * MM_PX_SF * ZOOM, paperBoundingBox.top + img.topMM * MM_PX_SF * ZOOM, paperBoundingBox.top + img.topMM * MM_PX_SF * ZOOM + img.heightMM * MM_PX_SF * ZOOM];
    if (x > left && x < right && y > top && y < bottom) {
        return true;
    }
    return false;
};
const CheckForHover = (paper) => {
    const paperBoundingBox = paper.getBoundingClientRect();
    let selectedImage = undefined;
    for (let i = 0; i != IMAGES.length; i += 1) {
        if (CheckIntersectionImage(MOUSE_X, MOUSE_Y, paperBoundingBox, i) == true) {
            selectedImage = i;
        }
    }
    return selectedImage;
};
function rotate90(src) {
    const promise = new Promise((resolve) => {
        var img = new Image();
        img.src = src;
        img.onload = function () {
            var canvas = document.createElement('canvas');
            canvas.width = img.height;
            canvas.height = img.width;
            canvas.style.position = "absolute";
            var ctx = canvas.getContext("2d");
            ctx.translate(img.height, img.width / img.height);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL());
        };
    });
    return promise;
}
const distanceBetween = (p1, p2) => {
    return Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);
};
const InitPaperListeners = (body, paper, rotateButton, bringForwardButton, deleteButton, resizeElements, taskbar) => {
    if (isMobile == false) {
        initDesktopControls(body, paper, { topLeftResizeElement: resizeElements.topLeftResizeElement, topRightResizeElement: resizeElements.topRightResizeElement, bottomLeftResizeElement: resizeElements.bottomLeftResizeElement, bottomRightResizeElement: resizeElements.bottomRightResizeElement }, taskbar);
    }
    else {
        initMobileControls(body, paper, { topLeftResizeElement: resizeElements.topLeftResizeElement, topRightResizeElement: resizeElements.topRightResizeElement, bottomLeftResizeElement: resizeElements.bottomLeftResizeElement, bottomRightResizeElement: resizeElements.bottomRightResizeElement }, taskbar);
    }
    rotateButton.onclick = () => __awaiter(void 0, void 0, void 0, function* () {
        const img = IMAGES[SELECTED_IMAGE_INDEX];
        const rotatedBase64 = yield rotate90(img.src); //just rotating the raw data, so that we don't have to worry about the rotation later on
        img.src = rotatedBase64;
        [img.heightMM, img.widthMM] = [img.widthMM, img.heightMM]; //swap height and width since the image is rotated 90 degrees
        UPDATE_CANVAS = true;
    });
    bringForwardButton.onclick = () => {
        if (SELECTED_IMAGE_INDEX == IMAGES.length - 1) {
            return; //it is already at the front
        }
        [IMAGES[SELECTED_IMAGE_INDEX], IMAGES[SELECTED_IMAGE_INDEX + 1]] = [IMAGES[SELECTED_IMAGE_INDEX + 1], IMAGES[SELECTED_IMAGE_INDEX]];
        UPDATE_CANVAS = true;
    };
    deleteButton.onclick = () => {
        IMAGES.splice(SELECTED_IMAGE_INDEX, 1);
        UPDATE_CANVAS = true;
    };
};
const InitTaskbarListeners = (body, file, extras, print, paper) => {
    const fileInput = document.getElementById("hiddenFile");
    file.onclick = () => {
        fileInput.click();
    };
    fileInput.onchange = () => {
        const files = fileInput.files;
        for (const file of files) {
            const fReader = new FileReader();
            fReader.readAsDataURL(file);
            fReader.onloadend = ($e) => {
                const src = $e.target.result;
                const image = new Image();
                image.src = src;
                image.onload = () => {
                    IMAGES.push(NewImageObject(src, image.naturalHeight, image.naturalWidth));
                    UPDATE_CANVAS = true;
                };
            };
        }
    };
    extras.onclick = () => {
        console.log("Handle extra options");
    };
    print.onclick = () => {
        PrintCanvas(body, paper);
    };
};
const NewImageObject = (src, height, width, leftMM, topMM) => {
    const [left, top] = [(leftMM == undefined) ? DEFAULT_IMAGE_OFFSET_MM : leftMM, (topMM == undefined) ? DEFAULT_IMAGE_OFFSET_MM : topMM];
    const heightScaleFactor = (DEFAULT_IMAGE_SIZE_MM * MM_PX_SF) / height;
    const widthScaleFactor = (DEFAULT_IMAGE_SIZE_MM * MM_PX_SF) / width;
    let scaleFactor = (heightScaleFactor < widthScaleFactor) ? heightScaleFactor : widthScaleFactor;
    if (scaleFactor > 1) { //don't want to enlarge images
        scaleFactor = 1;
    }
    return { src: src, leftMM: left, topMM: top, heightMM: height * scaleFactor / MM_PX_SF, widthMM: width * scaleFactor / MM_PX_SF };
};
const DrawImages = (canvas) => {
    const [canvasHeight, canvasWidth] = [PAPER_HEIGHT_MM * MM_PX_SF * ZOOM, PAPER_WIDTH_MM * MM_PX_SF * ZOOM];
    canvas.fillStyle = "white";
    canvas.fillRect(0, 0, canvasWidth, canvasHeight); //to make the background white
    for (const imageObject of IMAGES) {
        const img = new Image();
        img.src = imageObject.src;
        img.onload = () => {
            let [imageX, imageY] = [imageObject.leftMM * MM_PX_SF * ZOOM, imageObject.topMM * MM_PX_SF * ZOOM];
            let [imageHeightPX, imageWidthPX] = [imageObject.heightMM * MM_PX_SF * ZOOM, imageObject.widthMM * MM_PX_SF * ZOOM];
            canvas.drawImage(img, imageX, imageY, imageWidthPX, imageHeightPX);
        };
    }
};
const PrintCanvas = (body, paper) => {
    let width = paper.width;
    let height = paper.height;
    const pdf = (width > height) ? new jsPDF('l', 'px', [width, height]) : new jsPDF('p', 'px', [height, width]); //set the orientation
    width = pdf.internal.pageSize.getWidth(); //then we get the dimensions from the 'pdf' file itself
    height = pdf.internal.pageSize.getHeight();
    pdf.addImage(paper, 'PNG', 0, 0, width, height);
    const prevZoom = ZOOM;
    ZOOM = 8;
    SizePaper(paper);
    body.style.setProperty("pointer-events", "none");
    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
    if (isSafari == true && isMobile == true) {
        var windowReference = window.open(); //for iOS safari
    }
    setTimeout(() => {
        pdf.autoPrint();
        if (isSafari) {
            if (isMobile == false) { //desktop safari
                window.open(pdf.output('bloburl'), '_blank');
            }
            else { //mobile safari, does not allow window.open inside an async call: https://stackoverflow.com/questions/20696041/window-openurl-blank-not-working-on-imac-safari
                windowReference.location = pdf.output('bloburl');
            }
        }
        else {
            const hiddFrame = document.createElement('iframe');
            hiddFrame.style.position = 'fixed';
            hiddFrame.style.width = '1px';
            hiddFrame.style.height = '1px';
            hiddFrame.style.opacity = '0.01';
            hiddFrame.src = pdf.output('bloburl');
            document.body.appendChild(hiddFrame);
        }
        ZOOM = prevZoom;
        SizePaper(paper);
        body.style.setProperty("pointer-events", "all");
    }, 3000);
};
const CanvasLoop = (paper, canvas, transformOverlay) => {
    setInterval(() => {
        if (UPDATE_CANVAS == true) {
            DrawImages(canvas);
            UPDATE_CANVAS = false;
        }
        const newSelectedIndex = CheckForHover(paper);
        if (newSelectedIndex != undefined && SELECTED_IMAGE_INDEX == undefined) { //dont want to change the selected index to another index if the user is already selected one
            SELECTED_IMAGE_INDEX = newSelectedIndex;
        }
        else if (newSelectedIndex == undefined && SELECTED_IMAGE_INDEX != undefined) {
            SELECTED_IMAGE_INDEX = newSelectedIndex;
        }
        else if (newSelectedIndex != undefined && CheckIntersectionImage(MOUSE_X, MOUSE_Y, paper.getBoundingClientRect(), SELECTED_IMAGE_INDEX) == false) { //only change if the selected index is not being hovered over anymore
            SELECTED_IMAGE_INDEX = newSelectedIndex;
        }
        if (SELECTED_IMAGE_INDEX != undefined) { //display transform overlay over the image, it is purely for aesthetic
            const img = IMAGES[SELECTED_IMAGE_INDEX];
            const paperBoundingBox = paper.getBoundingClientRect();
            const [left, top] = [paperBoundingBox.left + img.leftMM * MM_PX_SF * ZOOM, paperBoundingBox.top + img.topMM * MM_PX_SF * ZOOM];
            const [height, width] = [img.heightMM * MM_PX_SF * ZOOM, img.widthMM * MM_PX_SF * ZOOM];
            transformOverlay.style.visibility = "visible";
            [transformOverlay.style.left, transformOverlay.style.top] = [`${left}px`, `${top}px`];
            [transformOverlay.style.height, transformOverlay.style.width] = [`${height}px`, `${width}px`];
        }
        else {
            transformOverlay.style.visibility = "hidden";
        }
    }, 16);
};
const Main = () => {
    const [body, paper, taskbar] = [document.body, document.getElementById("paper"), document.getElementById("taskbar")];
    const [file, extras, print] = [document.getElementById("addImage"), document.getElementById("extrasButton"), document.getElementById("printButton")];
    const [canvas, transformOverlay, rotateButton, bringForwardButton, deleteButton] = [paper.getContext('2d'), document.getElementById("transformOverlay"), document.getElementById("rotateButton"), document.getElementById("bringForward"), document.getElementById("delete")];
    const [topLeftResize, topRightResize, bottomLeftResize, bottomRightResize] = [document.getElementById("topLeftResize"), document.getElementById("topRightResize"), document.getElementById("bottomLeftResize"), document.getElementById("bottomRightResize")];
    IMAGES.push(NewImageObject("/Assets/APIs With Fetch copy.png", 1080, 1920)); //for testing
    body.style.setProperty("--resizeCounterRadius", `${TRANSFORM_OVERLAY_RESIZE_RADIUS}px`);
    InitHTML(taskbar);
    FitToScreen();
    SizePaper(paper);
    PositionPaper(paper);
    InitPaperListeners(body, paper, rotateButton, bringForwardButton, deleteButton, { topLeftResizeElement: topLeftResize, topRightResizeElement: topRightResize, bottomLeftResizeElement: bottomLeftResize, bottomRightResizeElement: bottomRightResize }, taskbar);
    InitTaskbarListeners(body, file, extras, print, paper);
    CanvasLoop(paper, canvas, transformOverlay);
};
Main();
