"use strict";
const PAPER_POSITION = { left: 0, top: 0 }; //position relative, left=x, top=y
let PAPER_HEIGHT_MM = 297;
let PAPER_WIDTH_MM = 210;
const IMAGES = []; //rotation in degrees
const DEFAULT_IMAGE_OFFSET_MM = 5;
const DEFAULT_IMAGE_SIZE_MM = 200;
let UPDATE_CANVAS = false;
const MM_PX_SF = 3 * window.devicePixelRatio; //1mm = 3px * dpi
let ZOOM = 1;
let [MOUSE_X, MOUSE_Y] = [0, 0];
let SELECTED_IMAGE_INDEX = undefined;
const FormatPaper = (paper) => {
    paper.setAttribute('height', String(PAPER_HEIGHT_MM * MM_PX_SF * ZOOM));
    paper.setAttribute('width', String(PAPER_WIDTH_MM * MM_PX_SF * ZOOM));
};
const SizePaper = (paper) => {
    paper.style.height = `${PAPER_HEIGHT_MM * MM_PX_SF * ZOOM}px`;
    paper.style.width = `${PAPER_WIDTH_MM * MM_PX_SF * ZOOM}px`;
    FormatPaper(paper);
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
const InitPaperListeners = (body, paper, rotateButton, taskbar) => {
    let pointerDown = false;
    let [prevX, prevY] = [0, 0];
    body.onpointerdown = ($e) => {
        const [x, y] = [$e.clientX, $e.clientY]; //check if pointer is above taskbar or any images, if so then doesn't count
        if (CheckIntersectionElement(x, y, taskbar) == true) {
            return;
        }
        pointerDown = true;
        [prevX, prevY] = [$e.clientX, $e.clientY];
    };
    body.onpointerup = () => {
        pointerDown = false;
    };
    body.onpointermove = ($e) => {
        [MOUSE_X, MOUSE_Y] = [$e.clientX, $e.clientY];
        if (pointerDown == false) {
            return;
        }
        const [currentX, currentY] = [$e.clientX, $e.clientY];
        const [deltaX, deltaY] = [currentX - prevX, currentY - prevY];
        [prevX, prevY] = [currentX, currentY];
        if (SELECTED_IMAGE_INDEX == undefined) {
            PAPER_POSITION.left += deltaX;
            PAPER_POSITION.top += deltaY;
            PositionPaper(paper);
        }
        else {
            //check if image is being scaled, if it is at the corners (within a certain radius)
            const img = IMAGES[SELECTED_IMAGE_INDEX];
            img.leftMM += deltaX / MM_PX_SF / ZOOM; //applying the reverse to go from px -> mm
            img.topMM += deltaY / MM_PX_SF / ZOOM;
            UPDATE_CANVAS = true;
        }
    };
    rotateButton.onclick = () => {
        const img = IMAGES[SELECTED_IMAGE_INDEX];
        img.rotation += 90;
        UPDATE_CANVAS = true;
    };
    body.onwheel = ($e) => {
        const damping = 1 / 400;
        const zoomFactor = $e.deltaY * damping;
        ZOOM += zoomFactor;
        SizePaper(paper); //should also change the paper's position, to make it seem like the user is actually zooming in on a point however it is quite tricky with this coordiante system
    };
};
const InitTaskbarListeners = (file, extras, print, paper) => {
    const fileInput = document.getElementById("hiddenFile");
    file.onclick = () => {
        fileInput.click();
    };
    fileInput.onchange = () => {
        const fReader = new FileReader();
        fReader.readAsDataURL(fileInput.files[0]);
        fReader.onloadend = ($e) => {
            const src = $e.target.result;
            const image = new Image();
            image.src = src;
            image.onload = () => {
                IMAGES.push(NewImageObject(src, image.naturalHeight, image.naturalWidth));
                UPDATE_CANVAS = true;
            };
        };
    };
    extras.onclick = () => {
        console.log("Handle extra options");
    };
    print.onclick = () => {
        let width = paper.width;
        let height = paper.height;
        //set the orientation
        const pdf = (width > height) ? new jsPDF('l', 'px', [width, height]) : new jsPDF('p', 'px', [height, width]);
        //then we get the dimensions from the 'pdf' file itself
        width = pdf.internal.pageSize.getWidth();
        height = pdf.internal.pageSize.getHeight();
        pdf.addImage(paper, 'PNG', 0, 0, width, height);
        const prevZoom = ZOOM;
        ZOOM = 5;
        SizePaper(paper);
        setTimeout(() => {
            //https://github.com/parallax/jsPDF/issues/1487
            pdf.autoPrint();
            const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
            if (isSafari) {
                window.open(pdf.output('bloburl'), '_blank');
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
        }, 1000);
    };
};
const NewImageObject = (src, height, width) => {
    const heightScaleFactor = (DEFAULT_IMAGE_SIZE_MM * MM_PX_SF) / height;
    const widthScaleFactor = (DEFAULT_IMAGE_SIZE_MM * MM_PX_SF) / width;
    const scaleFactor = (heightScaleFactor < widthScaleFactor) ? heightScaleFactor : widthScaleFactor;
    return { src: src, leftMM: DEFAULT_IMAGE_OFFSET_MM, topMM: DEFAULT_IMAGE_OFFSET_MM, heightMM: height * scaleFactor / MM_PX_SF, widthMM: width * scaleFactor / MM_PX_SF, rotation: 0 };
};
const UpdateImages = (canvas) => {
    const [canvasHeight, canvasWidth] = [PAPER_HEIGHT_MM * MM_PX_SF * ZOOM, PAPER_WIDTH_MM * MM_PX_SF * ZOOM];
    //canvas.clearRect(0, 0, canvasWidth, canvasHeight);
    canvas.fillStyle = "white";
    canvas.fillRect(0, 0, canvasWidth, canvasHeight);
    for (const imageObject of IMAGES) {
        const img = new Image();
        img.src = imageObject.src;
        img.onload = () => {
            let [imageX, imageY] = [imageObject.leftMM * MM_PX_SF * ZOOM, imageObject.topMM * MM_PX_SF * ZOOM];
            const [originalImageHeight, originalImageWidth] = [img.naturalHeight, img.naturalWidth];
            let [imageHeightPXVisible, imageWidthVisible] = [imageObject.heightMM * MM_PX_SF * ZOOM, imageObject.widthMM * MM_PX_SF * ZOOM];
            const [heightScale, widthScale] = [imageHeightPXVisible / originalImageHeight, imageWidthVisible / originalImageWidth];
            drawImage(canvas, img, imageX, imageY, originalImageHeight, originalImageWidth, heightScale, widthScale, degreesToRadians(imageObject.rotation));
            //canvas.drawImage(img, imageX, imageY, imageWidth, imageHeight); //old method, before rotation
        };
    }
};
const degreesToRadians = (degrees) => {
    return degrees / (180 / Math.PI);
};
function drawImage(ctx, image, x, y, originalHeight, originalWidth, heightScale, widthScale, rotationRadians) {
    ctx.setTransform(heightScale, 0, 0, widthScale, x + originalWidth * widthScale / 2, y + originalHeight * heightScale / 2); // sets scale and origin
    ctx.rotate(rotationRadians);
    ctx.drawImage(image, -originalWidth / 2, -originalHeight / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // which is much quicker than save and restore
}
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
const CanvasLoop = (paper, canvas, transformOverlay) => {
    setInterval(() => {
        if (UPDATE_CANVAS == true) {
            UpdateImages(canvas);
            UPDATE_CANVAS = false;
        }
        SELECTED_IMAGE_INDEX = CheckForHover(paper);
        if (SELECTED_IMAGE_INDEX != undefined) { //display transform overlay over the image, it is purely for aesthetic
            const img = IMAGES[SELECTED_IMAGE_INDEX];
            const paperBoundingBox = paper.getBoundingClientRect();
            const [left, top] = [paperBoundingBox.left + img.leftMM * MM_PX_SF * ZOOM, paperBoundingBox.top + img.topMM * MM_PX_SF * ZOOM];
            const [height, width] = [img.heightMM * MM_PX_SF * ZOOM, img.widthMM * MM_PX_SF * ZOOM];
            transformOverlay.style.visibility = "visible";
            [transformOverlay.style.left, transformOverlay.style.top] = [`${left}px`, `${top}px`];
            [transformOverlay.style.height, transformOverlay.style.width] = [`${height}px`, `${width}px`];
            console.log(img.src);
        }
        else {
            transformOverlay.style.visibility = "hidden";
        }
    }, 16);
};
const Main = () => {
    const [body, paper, taskbar] = [document.body, document.getElementById("paper"), document.getElementById("taskbar")];
    const [file, extras, print] = [document.getElementById("addImage"), document.getElementById("extrasButton"), document.getElementById("printButton")];
    const [canvas, transformOverlay, rotateButton] = [paper.getContext('2d'), document.getElementById("transformOverlay"), document.getElementById("rotateButton")];
    IMAGES.push(NewImageObject("/Assets/APIs With Fetch copy.png", 112.5, 200)); //for testing
    SizePaper(paper);
    FormatPaper(paper);
    PositionPaper(paper);
    InitPaperListeners(body, paper, rotateButton, taskbar);
    InitTaskbarListeners(file, extras, print, paper);
    CanvasLoop(paper, canvas, transformOverlay);
};
Main();
