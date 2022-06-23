"use strict";
const PAPER_POSITION = { left: 0, top: 0 }; //position relative, left=x, top=y
let PAPER_HEIGHT_MM = 297;
let PAPER_WIDTH_MM = 210;
const IMAGES = [];
const DEFAULT_IMAGE_OFFSET_MM = 5;
const DEFAULT_IMAGE_SIZE_MM = 200;
let UPDATE_CANVAS = false;
const dpi = window.devicePixelRatio;
const MM_PX_SF = 3 * dpi; //1mm = 3px * dpi
let ZOOM = 1;
const FormatPaper = (paper) => {
    paper.setAttribute('height', String(PAPER_HEIGHT_MM * MM_PX_SF * ZOOM));
    paper.setAttribute('width', String(PAPER_WIDTH_MM * MM_PX_SF * ZOOM));
};
const SizePaper = (paper, canvas) => {
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
const InitMovementListeners = (body, paper, canvas, taskbar) => {
    let pointerDown = false;
    let selectedImage = undefined;
    let [prevX, prevY] = [0, 0];
    body.onpointerdown = ($e) => {
        selectedImage = undefined;
        const [x, y] = [$e.clientX, $e.clientY]; //check if pointer is above taskbar or any images, if so then doesn't count
        if (CheckIntersectionElement(x, y, taskbar) == true) {
            return;
        }
        const paperBoundingBox = paper.getBoundingClientRect();
        for (let i = 0; i != IMAGES.length; i += 1) {
            if (CheckIntersectionImage(x, y, paperBoundingBox, i) == true) {
                selectedImage = i;
            }
        }
        pointerDown = true;
        [prevX, prevY] = [$e.clientX, $e.clientY];
    };
    body.onpointerup = () => {
        pointerDown = false;
    };
    body.onpointermove = ($e) => {
        if (pointerDown == false) {
            return;
        }
        const [currentX, currentY] = [$e.clientX, $e.clientY];
        const [deltaX, deltaY] = [currentX - prevX, currentY - prevY];
        [prevX, prevY] = [currentX, currentY];
        if (selectedImage == undefined) {
            PAPER_POSITION.left += deltaX;
            PAPER_POSITION.top += deltaY;
            PositionPaper(paper);
        }
        else {
            const img = IMAGES[selectedImage];
            img.leftMM += deltaX / MM_PX_SF / ZOOM; //applying the reverse to go from px -> mm
            img.topMM += deltaY / MM_PX_SF / ZOOM;
            UPDATE_CANVAS = true;
        }
    };
    body.onwheel = ($e) => {
        const damping = 1 / 400;
        const zoomFactor = $e.deltaY * damping;
        ZOOM += zoomFactor;
        SizePaper(paper, canvas); //should also change the paper's position, to make it seem like the user is actually zooming in on a point however it is quite tricky with this coordiante system
    };
};
const InitTaskbarListeners = (canvas, file) => {
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
};
const NewImageObject = (src, height, width) => {
    const heightScaleFactor = (DEFAULT_IMAGE_SIZE_MM * MM_PX_SF) / height;
    const widthScaleFactor = (DEFAULT_IMAGE_SIZE_MM * MM_PX_SF) / width;
    const scaleFactor = (heightScaleFactor < widthScaleFactor) ? heightScaleFactor : widthScaleFactor;
    return { src: src, leftMM: DEFAULT_IMAGE_OFFSET_MM, topMM: DEFAULT_IMAGE_OFFSET_MM, heightMM: height * scaleFactor / MM_PX_SF, widthMM: width * scaleFactor / MM_PX_SF };
};
const UpdateImages = (canvas) => {
    const [canvasHeight, canvasWidth] = [PAPER_HEIGHT_MM * MM_PX_SF * ZOOM, PAPER_WIDTH_MM * MM_PX_SF * ZOOM];
    canvas.clearRect(0, 0, canvasWidth, canvasHeight);
    for (const imageObject of IMAGES) {
        const img = new Image();
        img.src = imageObject.src;
        img.onload = () => {
            let [imageX, imageY] = [imageObject.leftMM * MM_PX_SF * ZOOM, imageObject.topMM * MM_PX_SF * ZOOM];
            let [imageHeight, imageWidth] = [imageObject.heightMM * MM_PX_SF * ZOOM, imageObject.widthMM * MM_PX_SF * ZOOM];
            canvas.drawImage(img, imageX, imageY, imageWidth, imageHeight); //image size is constant, but changes with canvas for some reason
        };
    }
};
const CanvasLoop = (canvas) => {
    setInterval(() => {
        if (UPDATE_CANVAS == true) {
            UpdateImages(canvas);
            UPDATE_CANVAS = false;
        }
    }, 16);
};
const Main = () => {
    const [body, paper, taskbar] = [document.body, document.getElementById("paper"), document.getElementById("taskbar")];
    const [file, extras, print] = [document.getElementById("addImage"), document.getElementById("extrasButton"), document.getElementById("printButton")];
    const canvas = paper.getContext('2d');
    IMAGES.push(NewImageObject("/Assets/APIs With Fetch copy.png", 112.5, 200)); //for testing
    SizePaper(paper, canvas);
    FormatPaper(paper);
    PositionPaper(paper);
    InitMovementListeners(body, paper, canvas, taskbar);
    InitTaskbarListeners(canvas, file);
    CanvasLoop(canvas);
};
Main();
