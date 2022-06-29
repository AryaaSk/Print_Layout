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
const InitPaperListeners = (body, paper, rotateButton, bringForwardButton, deleteButton, duplicateButton, resizeElements, taskbar) => {
    let mouseDown = false;
    let [prevX, prevY] = [0, 0];
    let holdingResize = undefined;
    let oppositeCorner = [0, 0]; //[left, top]
    body.onpointerdown = ($e) => {
        [MOUSE_X, MOUSE_Y] = [$e.clientX, $e.clientY];
        if (holdingResize == undefined) {
            SELECTED_IMAGE_INDEX = CheckForHover(paper, TRANSFORM_OVERLAY_RESIZE_RADIUS / 2); //dont select a new image if the user is just resizing the existing one
        }
        if (CheckIntersectionElement(MOUSE_X, MOUSE_Y, taskbar) == true) {
            return;
        }
        mouseDown = true;
        [prevX, prevY] = [$e.clientX, $e.clientY];
        if (SELECTED_IMAGE_INDEX != undefined) { //check if the user was selecting a resize counter, decided to implement
            const mousePosition = [MOUSE_X, MOUSE_Y];
            const radiusPX = TRANSFORM_OVERLAY_RESIZE_RADIUS * DPI;
            const [topLeftBoundingBox, topRightBoundingBox, bottomLeftBoundingBox, bottomRightBoundingBox] = [resizeElements.topLeftResizeElement.getBoundingClientRect(), resizeElements.topRightResizeElement.getBoundingClientRect(), resizeElements.bottomLeftResizeElement.getBoundingClientRect(), resizeElements.bottomRightResizeElement.getBoundingClientRect()];
            const [topLeftResize, topRightResize, bottomLeftResize, bottomRightResize] = [[topLeftBoundingBox.left + radiusPX, topLeftBoundingBox.top + radiusPX], [topRightBoundingBox.left + radiusPX, topRightBoundingBox.top + radiusPX], [bottomLeftBoundingBox.left + radiusPX, bottomLeftBoundingBox.top + radiusPX], [bottomRightBoundingBox.left + radiusPX, bottomRightBoundingBox.top + radiusPX]];
            holdingResize = undefined;
            if (distanceBetween(topLeftResize, mousePosition) <= radiusPX + 5) { //calculate new distance between mouse position and bottom left, and resize based on that
                holdingResize = { imageIndex: SELECTED_IMAGE_INDEX, corner: "topLeft" };
                oppositeCorner = [bottomRightResize[0] + radiusPX, bottomRightResize[1] + radiusPX];
            }
            else if (distanceBetween(topRightResize, mousePosition) <= radiusPX + 5) {
                holdingResize = { imageIndex: SELECTED_IMAGE_INDEX, corner: "topRight" };
                oppositeCorner = [bottomLeftResize[0] - radiusPX, bottomLeftResize[1] + radiusPX];
            }
            else if (distanceBetween(bottomLeftResize, mousePosition) <= radiusPX + 5) {
                holdingResize = { imageIndex: SELECTED_IMAGE_INDEX, corner: "bottomLeft" };
                oppositeCorner = [topRightResize[0] + radiusPX, topRightResize[1] - radiusPX];
            }
            else if (distanceBetween(bottomRightResize, mousePosition) <= radiusPX + 5) {
                holdingResize = { imageIndex: SELECTED_IMAGE_INDEX, corner: "bottomRight" };
                oppositeCorner = [topLeftResize[0] - radiusPX, topLeftResize[1] - radiusPX];
            }
        }
    };
    body.onpointerup = () => {
        mouseDown = false;
        holdingResize = undefined;
    };
    body.onpointermove = ($e) => {
        [MOUSE_X, MOUSE_Y] = [$e.clientX, $e.clientY];
        if (mouseDown == false) {
            return;
        }
        if (holdingResize == undefined) {
            const [deltaX, deltaY] = [MOUSE_X - prevX, MOUSE_Y - prevY];
            [prevX, prevY] = [MOUSE_X, MOUSE_Y];
            if (SELECTED_IMAGE_INDEX == undefined) {
                PAPER_POSITION.left += deltaX;
                PAPER_POSITION.top += deltaY;
                PositionPaper(paper);
            }
            else {
                const img = IMAGES[SELECTED_IMAGE_INDEX];
                img.leftMM += deltaX / MM_PX_SF / ZOOM; //applying the reverse to go from px -> mm
                img.topMM += deltaY / MM_PX_SF / ZOOM;
                UPDATE_CANVAS = true;
            }
        }
        else { //there could be no selectedImage but still a holdingResize, because the user is not hovering over the image anymore
            const img = IMAGES[holdingResize.imageIndex];
            let [newWidthPX, newHeightPX] = [0, 0];
            if (holdingResize.corner == "topLeft") {
                [newWidthPX, newHeightPX] = [oppositeCorner[0] - MOUSE_X, oppositeCorner[1] - MOUSE_Y];
            }
            if (holdingResize.corner == "topRight") {
                [newWidthPX, newHeightPX] = [MOUSE_X - oppositeCorner[0], oppositeCorner[1] - MOUSE_Y];
            }
            else if (holdingResize.corner == "bottomLeft") {
                [newWidthPX, newHeightPX] = [oppositeCorner[0] - MOUSE_X, MOUSE_Y - oppositeCorner[1]];
            }
            else if (holdingResize.corner == "bottomRight") {
                [newWidthPX, newHeightPX] = [MOUSE_X - oppositeCorner[0], MOUSE_Y - oppositeCorner[1]];
            }
            const [newWidthMM, newHeightMM] = [newWidthPX / MM_PX_SF / ZOOM, newHeightPX / MM_PX_SF / ZOOM];
            const heightSF = newHeightMM / img.heightMM;
            const widthSF = newWidthMM / img.widthMM;
            const SF = (heightSF < widthSF) ? heightSF : widthSF;
            let [widthDifferenceMM, heightDifferenceMM] = [0, 0];
            if (holdingResize.corner == "topLeft") {
                [widthDifferenceMM, heightDifferenceMM] = [img.widthMM - (img.widthMM * SF), img.heightMM - (img.heightMM * SF)];
            }
            else if (holdingResize.corner == "topRight") {
                [widthDifferenceMM, heightDifferenceMM] = [0, img.heightMM - (img.heightMM * SF)];
            }
            else if (holdingResize.corner == "bottomLeft") {
                [widthDifferenceMM, heightDifferenceMM] = [img.widthMM - (img.widthMM * SF), 0];
            }
            else if (holdingResize.corner == "bottomRight") {
                [widthDifferenceMM, heightDifferenceMM] = [0, 0];
            }
            img.heightMM *= SF;
            img.widthMM *= SF;
            img.leftMM += widthDifferenceMM;
            img.topMM += heightDifferenceMM;
            UPDATE_CANVAS = true;
        }
    };
    if (isMobile == false) {
        body.onwheel = ($e) => {
            const damping = 1 / 400;
            const zoomFactor = $e.deltaY * damping;
            ZOOM += zoomFactor;
            SizePaper(paper); //should also change the paper's position, to make it seem like the user is actually zooming in on a point however it is quite tricky with this coordiante system
        };
    }
    rotateButton.onclick = () => __awaiter(void 0, void 0, void 0, function* () {
        if (IMAGE_BUTTONS_DISABLED == true) {
            return; //the user has just selected the item, so we dont want to immeaditely call this
        }
        const img = IMAGES[SELECTED_IMAGE_INDEX];
        const rotatedBase64 = yield rotate90(img.src); //just rotating the raw data, so that we don't have to worry about the rotation later on
        img.src = rotatedBase64;
        [img.heightMM, img.widthMM] = [img.widthMM, img.heightMM]; //swap height and width since the image is rotated 90 degrees
        UPDATE_CANVAS = true;
    });
    bringForwardButton.onclick = () => {
        if (IMAGE_BUTTONS_DISABLED == true) {
            return;
        }
        if (SELECTED_IMAGE_INDEX == IMAGES.length - 1) {
            return; //it is already at the front
        }
        [IMAGES[SELECTED_IMAGE_INDEX], IMAGES[SELECTED_IMAGE_INDEX + 1]] = [IMAGES[SELECTED_IMAGE_INDEX + 1], IMAGES[SELECTED_IMAGE_INDEX]];
        UPDATE_CANVAS = true;
    };
    deleteButton.onclick = () => {
        if (IMAGE_BUTTONS_DISABLED == true) {
            return;
        }
        IMAGES.splice(SELECTED_IMAGE_INDEX, 1);
        SELECTED_IMAGE_INDEX = undefined; //reset selected image, since it has been deleted
        UPDATE_CANVAS = true;
    };
    duplicateButton.onclick = () => {
        if (IMAGE_BUTTONS_DISABLED == true) {
            return;
        }
        const newImage = JSON.parse(JSON.stringify(IMAGES[SELECTED_IMAGE_INDEX]));
        newImage.leftMM += DEFAULT_IMAGE_OFFSET_MM;
        newImage.topMM += DEFAULT_IMAGE_OFFSET_MM;
        IMAGES.push(newImage);
        SELECTED_IMAGE_INDEX = undefined; //reset selected image, since it will go to the duplicated image.
        UPDATE_CANVAS = true;
    };
    document.onpaste = ($e) => {
        const dT = $e.clipboardData;
        const files = dT.files;
        ParseFiles(files);
    };
    //Drag and drop images: https://jsfiddle.net/zever/EcxSm/
    paper.addEventListener('dragenter', ($e) => { $e.stopPropagation(); $e.preventDefault(); }, false);
    paper.addEventListener('dragexit', ($e) => { $e.stopPropagation(); $e.preventDefault(); }, false);
    paper.addEventListener('dragover', ($e) => { $e.stopPropagation(); $e.preventDefault(); }, false);
    paper.addEventListener('drop', ($e) => {
        $e.stopPropagation();
        $e.preventDefault();
        var files = $e.dataTransfer.files;
        ParseFiles(files);
    }, false);
};