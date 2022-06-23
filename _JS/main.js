"use strict";
let PAPER_HEIGHT_MM = 297;
let PAPER_WIDTH_MM = 210;
let MM_PX_SF = 3; //1mm = 3px
const PAPER_POSITION = { left: 0, top: 0 }; //position relative, left=x, top=y
const IMAGES = [];
const ApplyPaperDPI = (paper) => {
    const dpi = window.devicePixelRatio;
    paper.setAttribute('height', String(PAPER_HEIGHT_MM * MM_PX_SF * dpi));
    paper.setAttribute('width', String(PAPER_WIDTH_MM * MM_PX_SF * dpi));
};
const SizePaper = (paper) => {
    paper.style.height = `${PAPER_HEIGHT_MM * MM_PX_SF}px`;
    paper.style.width = `${PAPER_WIDTH_MM * MM_PX_SF}px`;
};
const PositionPaper = (paper) => {
    paper.style.left = `${PAPER_POSITION.left}px`;
    paper.style.top = `${PAPER_POSITION.top}px`;
};
const CheckIntersectionElement = (x, y, element) => {
    const boundingBox = element.getBoundingClientRect();
    if (x > boundingBox.left && x < boundingBox.right && y > boundingBox.top && y < boundingBox.bottom) { //for some reason top and bottom are inverted
        return true;
    }
    return false;
};
const InitMovementListeners = (body, paper, taskbar) => {
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
        if (pointerDown == false) {
            return;
        }
        const [currentX, currentY] = [$e.clientX, $e.clientY];
        const [deltaX, deltaY] = [currentX - prevX, currentY - prevY];
        [prevX, prevY] = [currentX, currentY];
        PAPER_POSITION.left += deltaX;
        PAPER_POSITION.top += deltaY;
        PositionPaper(paper);
    };
    body.onwheel = ($e) => {
        const damping = 1 / 200;
        const zoomFactor = $e.deltaY * damping;
        MM_PX_SF += zoomFactor;
        SizePaper(paper); //should also change the paper's position, to make it seem like the user is actually zooming in on a point however it is quite tricky with this coordiante system
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
                UpdateImages(canvas);
            };
        };
    };
};
const NewImageObject = (src, height, width) => {
    const heightScaleFactor = (100 * MM_PX_SF) / height;
    const widthScaleFactor = (100 * MM_PX_SF) / width;
    const scaleFactor = (heightScaleFactor < widthScaleFactor) ? heightScaleFactor : widthScaleFactor;
    return { src: src, leftMM: 10, topMM: 10, heightMM: height * scaleFactor / MM_PX_SF, widthMM: width * scaleFactor / MM_PX_SF };
};
const UpdateImages = (canvas) => {
    const [canvasHeight, canvasWidth] = [PAPER_HEIGHT_MM * MM_PX_SF, PAPER_WIDTH_MM * MM_PX_SF];
    canvas.clearRect(0, 0, canvasWidth, canvasHeight);
    for (const imageObject of IMAGES) {
        console.log(imageObject);
        const img = new Image();
        img.src = imageObject.src;
        img.onload = () => {
            const [imageX, imageY] = [imageObject.leftMM * MM_PX_SF, imageObject.topMM * MM_PX_SF];
            const [imageHeight, imageWidth] = [imageObject.heightMM * MM_PX_SF, imageObject.widthMM * MM_PX_SF]; //these are the dimensions in px
            //we also need to change the size of the image depending on the size of the paper, which is a bit confusing
            //the constant is the imageObject.height/width, the only thing that is changing is the MM_PX_SF
            canvas.drawImage(img, imageX, imageY, imageWidth, imageHeight);
        };
    }
};
const Main = () => {
    const [body, paper, taskbar] = [document.body, document.getElementById("paper"), document.getElementById("taskbar")];
    const [file, extras, print] = [document.getElementById("addImage"), document.getElementById("extrasButton"), document.getElementById("printButton")];
    const canvas = paper.getContext('2d');
    SizePaper(paper);
    ApplyPaperDPI(paper);
    PositionPaper(paper);
    InitMovementListeners(body, paper, taskbar);
    InitTaskbarListeners(canvas, file);
};
Main();
