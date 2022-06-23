"use strict";
let PAPER_HEIGHT_MM = 297;
let PAPER_WIDTH_MM = 210;
let MM_PX_SF = 3; //1mm = 3px
const PAPER_POSITION = { left: 0, top: 0 }; //position relative, left=x, top=y
const SizePaper = (paper) => {
    paper.style.height = `${PAPER_HEIGHT_MM * MM_PX_SF}px`;
    paper.style.width = `${PAPER_WIDTH_MM * MM_PX_SF}px`;
};
const PositionPaper = (paper) => {
    paper.style.left = `${PAPER_POSITION.left}px`;
    paper.style.top = `${PAPER_POSITION.top}px`;
};
const InitMovementListeners = (body, paper, taskbar) => {
    let pointerDown = false;
    let [prevX, prevY] = [0, 0];
    body.onpointerdown = ($e) => {
        const [x, y] = [$e.clientX, $e.clientY]; //check if pointer is above taskbar, if so then doesn't count
        const taskBarBoundingBox = taskbar.getBoundingClientRect();
        if (x > taskBarBoundingBox.left && x < taskBarBoundingBox.right && y > taskBarBoundingBox.top && y < taskBarBoundingBox.bottom) { //for some reason top and bottom are inverted
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
const InitTaskbarListeners = (file) => {
    const fileInput = document.getElementById("hiddenFile");
    file.onclick = () => {
        fileInput.click();
    };
    fileInput.onchange = () => {
        const fReader = new FileReader();
        fReader.readAsDataURL(fileInput.files[0]);
        fReader.onloadend = ($e) => {
            const img = $e.target.result;
        };
    };
};
const Main = () => {
    const [body, paper, taskbar] = [document.body, document.getElementById("paper"), document.getElementById("taskbar")];
    const [file, extras, print] = [document.getElementById("addImage"), document.getElementById("extrasButton"), document.getElementById("printButton")];
    SizePaper(paper);
    PositionPaper(paper);
    InitMovementListeners(body, paper, taskbar);
    InitTaskbarListeners(file);
};
Main();
