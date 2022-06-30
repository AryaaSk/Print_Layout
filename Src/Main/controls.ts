const InitPaperListeners = (body: HTMLElement, paper: HTMLCanvasElement, rotateButton: HTMLInputElement, deleteButton: HTMLInputElement, duplicateButton: HTMLInputElement, distortButton: HTMLInputElement, resizeElements: { topLeftResizeElement: HTMLElement, topRightResizeElement: HTMLElement, bottomLeftResizeElement: HTMLElement, bottomRightResizeElement: HTMLElement }, taskbar: HTMLElement) => {
    let mouseDown = false;
    let [prevX, prevY] = [0, 0];

    let holdingResize: { imageIndex: number, corner: string, oppositeCorner: number[] /*[left, top]*/ } | undefined = undefined;
    let pinching = false;
    let distortMode = false;

    body.onpointerdown = ($e) => {
        [MOUSE_X, MOUSE_Y] = [$e.clientX, $e.clientY];
        if (CheckIntersectionElement(MOUSE_X, MOUSE_Y, taskbar) == true || pinching == true) {
            return;
        }

        if (holdingResize == undefined && !(CheckIntersectionElement(MOUSE_X, MOUSE_Y, rotateButton) == true || CheckIntersectionElement(MOUSE_X, MOUSE_Y, deleteButton) == true || CheckIntersectionElement(MOUSE_X, MOUSE_Y, duplicateButton) == true || CheckIntersectionElement(MOUSE_X, MOUSE_Y, distortButton) == true)) {
            const margin = TRANSFORM_OVERLAY_RESIZE_RADIUS * DPI;
            const newSelectedIndex = CheckForHover(paper, margin);

            if (newSelectedIndex != SELECTED_IMAGE_INDEX) { //doesnt do anything if it is the same element
                distortMode = false;
                distortButton.style.backgroundColor = ""; //reset distort mode for next image

                //dont select a new image if the user is just resizing the existing one
                if (newSelectedIndex != undefined && SELECTED_IMAGE_INDEX == undefined) {
                    SELECTED_IMAGE_INDEX = newSelectedIndex;
                }
                else if (newSelectedIndex == undefined && SELECTED_IMAGE_INDEX != undefined) {
                    SELECTED_IMAGE_INDEX = undefined;
                }
                else if (newSelectedIndex != undefined && CheckIntersectionImage(MOUSE_X, MOUSE_Y, paper.getBoundingClientRect(), SELECTED_IMAGE_INDEX!, margin) == false) { //only change if the selected index is not being hovered over anymore                    
                    SELECTED_IMAGE_INDEX = newSelectedIndex;
                }
            }
        }

        mouseDown = true;
        [prevX, prevY] = [$e.clientX, $e.clientY];

        if (SELECTED_IMAGE_INDEX != undefined) { //check if the user was selecting a resize counter
            const radiusPX = TRANSFORM_OVERLAY_RESIZE_RADIUS * DPI;
            const [topLeftBoundingBox, topRightBoundingBox, bottomLeftBoundingBox, bottomRightBoundingBox] = [resizeElements.topLeftResizeElement.getBoundingClientRect(), resizeElements.topRightResizeElement.getBoundingClientRect(), resizeElements.bottomLeftResizeElement.getBoundingClientRect(), resizeElements.bottomRightResizeElement.getBoundingClientRect()];
            const [topLeftResize, topRightResize, bottomLeftResize, bottomRightResize] = [[topLeftBoundingBox.left + radiusPX, topLeftBoundingBox.top + radiusPX], [topRightBoundingBox.left + radiusPX, topRightBoundingBox.top + radiusPX], [bottomLeftBoundingBox.left + radiusPX, bottomLeftBoundingBox.top + radiusPX], [bottomRightBoundingBox.left + radiusPX, bottomRightBoundingBox.top + radiusPX]];

            holdingResize = undefined;
            if (CheckIntersectionElement(MOUSE_X, MOUSE_Y, resizeElements.topLeftResizeElement) == true) {
                holdingResize = { imageIndex: SELECTED_IMAGE_INDEX, corner: "topLeft", oppositeCorner: [bottomRightResize[0] + radiusPX, bottomRightResize[1] + radiusPX] }; //calculate new distance between mouse position and bottom left, and resize based on that
            }
            else if (CheckIntersectionElement(MOUSE_X, MOUSE_Y, resizeElements.topRightResizeElement) == true) {
                holdingResize = { imageIndex: SELECTED_IMAGE_INDEX, corner: "topRight", oppositeCorner: [bottomLeftResize[0] - radiusPX, bottomLeftResize[1] + radiusPX] };
            }
            else if (CheckIntersectionElement(MOUSE_X, MOUSE_Y, resizeElements.bottomLeftResizeElement) == true) {
                holdingResize = { imageIndex: SELECTED_IMAGE_INDEX, corner: "bottomLeft", oppositeCorner: [topRightResize[0] + radiusPX, topRightResize[1] - radiusPX] };
            }
            else if (CheckIntersectionElement(MOUSE_X, MOUSE_Y, resizeElements.bottomRightResizeElement) == true) {
                holdingResize = { imageIndex: SELECTED_IMAGE_INDEX, corner: "bottomRight", oppositeCorner: [topLeftResize[0] - radiusPX, topLeftResize[1] - radiusPX] };
            }
        }
    }

    body.onpointerup = () => {
        mouseDown = false;
        holdingResize = undefined;
    }

    body.onpointermove = ($e) => {
        [MOUSE_X, MOUSE_Y] = [$e.clientX, $e.clientY];

        if (mouseDown == false || pinching == true) {
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
                img.topMM += deltaY / MM_PX_SF/ ZOOM;
                UPDATE_CANVAS = true;
            }
        }

        else { //there could be no selectedImage but still a holdingResize, because the user is not hovering over the image anymore
            const img = IMAGES[holdingResize.imageIndex];
            const oppositeCorner = holdingResize.oppositeCorner;

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

            let heightSF = newHeightMM / img.heightMM;
            let widthSF = newWidthMM / img.widthMM;
            const SF = (heightSF < widthSF) ? heightSF : widthSF;
            if (distortMode == false) {
                [heightSF, widthSF] = [SF, SF];
            }

            let [widthDifferenceMM, heightDifferenceMM] = [0, 0];
            if (holdingResize.corner == "topLeft") {
                [widthDifferenceMM, heightDifferenceMM] = [img.widthMM - (img.widthMM * widthSF), img.heightMM - (img.heightMM * heightSF)];
            }
            else if (holdingResize.corner == "topRight") {
                [widthDifferenceMM, heightDifferenceMM] = [0, img.heightMM - (img.heightMM * heightSF)];
            }
            else if (holdingResize.corner == "bottomLeft") {
                [widthDifferenceMM, heightDifferenceMM] = [img.widthMM - (img.widthMM * widthSF), 0];
            }
            else if (holdingResize.corner == "bottomRight") {
                [widthDifferenceMM, heightDifferenceMM] = [0, 0];
            }

            if (distortMode == false) {
                img.heightMM *= SF;
                img.widthMM *= SF;
            }
            else {
                img.heightMM *= heightSF;
                img.widthMM *= widthSF;
            }
            img.leftMM += widthDifferenceMM;
            img.topMM += heightDifferenceMM;
            UPDATE_CANVAS = true;
        }
    }

    //Zooming:
    if (isMobile == false) {
        body.onwheel = ($e) => {
            const damping = 1 / 400;
            const zoomFactor = $e.deltaY * damping;
            ZOOM += zoomFactor;
            limitZoom();
            SizePaper(paper); //should also change the paper's position, to make it seem like the user is actually zooming in on a point however it is quite tricky with this coordiante system
        }
    }
    else {
        let previousScale = 1;

        body.addEventListener('gesturestart', () => {
            pinching = true;
        });
        body.addEventListener('gesturechange', ($e: any) => {
            const deltaScale = $e.scale - previousScale;
            previousScale = $e.scale;
            ZOOM *= 1 + deltaScale;
            limitZoom();
            SizePaper(paper);
        });
        body.addEventListener('gestureend', () => {
            pinching = false;
            previousScale = 1;
        });
    }
    const limitZoom = () => {
        if (ZOOM < ORIGINAL_ZOOM * 0.1) {
            ZOOM = ORIGINAL_ZOOM * 0.1;
        }
        else if (ZOOM > ORIGINAL_ZOOM * 5) {
            ZOOM = ORIGINAL_ZOOM * 5;
        }
    }



    rotateButton.onclick = async () => {
        if (IMAGE_BUTTONS_DISABLED == true) {
            return; //the user has just selected the item, so we dont want to immeaditely call this
        }

        const img = IMAGES[SELECTED_IMAGE_INDEX!];
        const rotatedBase64 = await rotate90(img.src); //just rotating the raw data, so that we don't have to worry about the rotation later on
        img.src = <string>rotatedBase64;
        [img.heightMM, img.widthMM] = [img.widthMM, img.heightMM]; //swap height and width since the image is rotated 90 degrees
        UPDATE_CANVAS = true;
    }

    //No need for bring forward button since it is very rare to place images on top of each other, and user can just duplicate the image if it is required
    /*
    bringForwardButton.onclick = () => { //just shift the currently selected image to the left in the IMAGES array
        if (IMAGE_BUTTONS_DISABLED == true) {
            return;
        }

        if (SELECTED_IMAGE_INDEX == IMAGES.length - 1) {
            return; //it is already at the front
        }
        [IMAGES[SELECTED_IMAGE_INDEX!], IMAGES[SELECTED_IMAGE_INDEX! + 1]] = [IMAGES[SELECTED_IMAGE_INDEX! + 1], IMAGES[SELECTED_IMAGE_INDEX!]];
        UPDATE_CANVAS = true;
    }
    */

    deleteButton.onclick = () => {
        if (IMAGE_BUTTONS_DISABLED == true) {
            return;
        }

        IMAGES.splice(SELECTED_IMAGE_INDEX!, 1);
        SELECTED_IMAGE_INDEX = undefined; //reset selected image, since it has been deleted
        UPDATE_CANVAS = true;
    }

    duplicateButton.onclick = () => { //not working perfectly, new image goes behind for some reason
        if (IMAGE_BUTTONS_DISABLED == true) {
            return;
        }

        const newImage = JSON.parse(JSON.stringify(IMAGES[SELECTED_IMAGE_INDEX!]));
        newImage.leftMM += DEFAULT_IMAGE_OFFSET_MM;
        newImage.topMM += DEFAULT_IMAGE_OFFSET_MM;

        IMAGES.push(newImage);
        SELECTED_IMAGE_INDEX = undefined; //reset selected image, since it will go to the duplicated image.
        UPDATE_CANVAS = true;
    }

    distortButton.onclick = () => {
        distortMode = !distortMode;
        if (distortMode == true) {
            //apply some styles to the distortButton to make it clear to the user that they are in distort mode
            distortButton.style.backgroundColor = "#666666";
        }
        else {
            distortButton.style.backgroundColor = ""; //remove styles from distortButton
        }
    }

    document.onpaste = ($e) => { //paste image: https://stackoverflow.com/questions/60503912/get-image-using-paste-from-the-browser
        const dT = $e.clipboardData!;
        const files = dT.files!;
        ParseFiles(files);
    }

    //Drag and drop images: https://jsfiddle.net/zever/EcxSm/
    paper.addEventListener('dragenter', ($e: any) => { $e.stopPropagation(); $e.preventDefault() }, false);
    paper.addEventListener('dragexit', ($e: any) => { $e.stopPropagation(); $e.preventDefault() }, false);
    paper.addEventListener('dragover', ($e: any) => { $e.stopPropagation(); $e.preventDefault() }, false);
    paper.addEventListener('drop', ($e) => {
        $e.stopPropagation();
        $e.preventDefault(); 
        var files = $e.dataTransfer!.files;
        ParseFiles(files);

    }, false)
}