declare const jsPDF: any;
declare const isMobile: boolean;

const PAPER_POSITION = { left: 0, top: 0 }; //position relative, left=x, top=y
let PAPER_HEIGHT_MM = 297;
let PAPER_WIDTH_MM = 210;
const DEFAULT_PAPER_MARGIN_PX = 50;

const DPI = window.devicePixelRatio; //used in controls to map mouse position to scene position
const MM_PX_SF = 3;
let ZOOM = 1;
let ORIGINAL_ZOOM = 1;
//If I change the PaperSize, ZOOM or MM_PX_SF, I have to make sure that the total canvas area does not exceed (16777216)px^2, otherwise the iOS app will crash

const IMAGES: { src: string, leftMM: number, topMM: number, heightMM: number, widthMM: number }[] = []; //rotation in degrees
const DEFAULT_IMAGE_OFFSET_MM = 5;
const DEFAULT_IMAGE_SIZE_MM = 200;
const TRANSFORM_OVERLAY_RESIZE_RADIUS = 15;

let [MOUSE_X, MOUSE_Y] = [0, 0];
let SELECTED_IMAGE_INDEX: number | undefined = undefined;
let IMAGE_BUTTONS_DISABLED = true;

let UPDATE_CANVAS = false;
let LOOP_COUNT = 0;
const UPDATE_CANVAS_TICK = 1; //update canvas every (tick), can leave at 1 now since I have implemented buffer canvas to avoid flickering


const InitHTML = (taskbar: HTMLElement) => {
    const urlParams = new URLSearchParams(window.location.search);
    const hideTaskbar = urlParams.get('hideTaskbar')!;
    if (hideTaskbar == "true") {
        taskbar.style.display = "none";
    }
}

const FitToScreen = () => {
    //paper's size in mm should stay the same, however we can change the ZOOM, at regular scale the A4 paper will be
    const [paperHeightPX, paperWidthPX] = [PAPER_HEIGHT_MM * MM_PX_SF, PAPER_WIDTH_MM * MM_PX_SF];

    const heightSF = (window.innerHeight - DEFAULT_PAPER_MARGIN_PX) / paperHeightPX;
    const widthSF = (window.innerWidth - DEFAULT_PAPER_MARGIN_PX) / paperWidthPX;
    ZOOM = (heightSF < widthSF) ? heightSF : widthSF;
    ORIGINAL_ZOOM = ZOOM;
    UPDATE_CANVAS = true;
}

const SizePaper = (paper: HTMLElement) => {
    paper.style.height = `${PAPER_HEIGHT_MM * MM_PX_SF * ZOOM}px`;
    paper.style.width = `${PAPER_WIDTH_MM * MM_PX_SF * ZOOM}px`;
    paper.setAttribute('height', String(PAPER_HEIGHT_MM * MM_PX_SF * ZOOM));
    paper.setAttribute('width', String(PAPER_WIDTH_MM * MM_PX_SF * ZOOM));
}

const PositionPaper = (paper: HTMLElement) => {
    paper.style.left = `${PAPER_POSITION.left}px`;
    paper.style.top = `${PAPER_POSITION.top}px`;
}



const CheckIntersectionElement = (x: number, y: number, element: HTMLElement) => {
    const boundingBox = element.getBoundingClientRect();
    if (x > boundingBox.left && x < boundingBox.right && y > boundingBox.top && y < boundingBox.bottom) { //top and bottom are inverted since in canvas coordinate system y increases as it goes down
        return true;
    }
    return false;
}
const CheckIntersectionImage = (x: number, y: number, paperBoundingBox: DOMRect, imageIndex: number, margin?: number) => {
    const imageMargin = (margin == undefined) ? 0 : margin;
    const img = IMAGES[imageIndex];
    const [left, right, top, bottom] = [paperBoundingBox.left + img.leftMM * MM_PX_SF * ZOOM - imageMargin, paperBoundingBox.left + img.leftMM * MM_PX_SF * ZOOM + img.widthMM * MM_PX_SF * ZOOM + imageMargin, paperBoundingBox.top + img.topMM * MM_PX_SF * ZOOM - imageMargin, paperBoundingBox.top + img.topMM * MM_PX_SF * ZOOM + img.heightMM * MM_PX_SF * ZOOM + imageMargin];
    if (x > left && x < right && y > top && y < bottom) {
        return true;
    }
    return false;
}
const CheckForHover = (paper: HTMLCanvasElement, margin: number) => {
    const paperBoundingBox = paper.getBoundingClientRect();
    let selectedImage: number | undefined = undefined;
    for (let i = 0; i != IMAGES.length; i += 1) {
        if (CheckIntersectionImage(MOUSE_X, MOUSE_Y, paperBoundingBox, i, margin) == true) {
            selectedImage = i;
        }
    }
    return selectedImage;
}



function rotate90(src: any){ //https://stackoverflow.com/questions/26799037/is-it-possible-to-rotate-an-image-if-you-only-have-image-data-url-using-javascri
    const promise = new Promise((resolve) => {
        var img = new Image()
        img.src = src
        img.onload = function() {
            var canvas = document.createElement('canvas')!;
            canvas.width = img.height
            canvas.height = img.width
            canvas.style.position = "absolute"
            var ctx = canvas.getContext("2d")!;
            ctx.translate(img.height, img.width / img.height)
            ctx.rotate(Math.PI / 2)
            ctx.drawImage(img, 0, 0)
            resolve(canvas.toDataURL());
        }
    })
    return promise;
}
const distanceBetween = (p1: number[], p2: number[]) => {
    return Math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2);
}



const InitTaskbarListeners = (body: HTMLElement, file: HTMLInputElement, print: HTMLInputElement, paper: HTMLCanvasElement) => {
    const fileInput = <HTMLInputElement>document.getElementById("hiddenFile")!;
    file.onclick = () => {
        fileInput.click();
    }
    fileInput.onchange = () => {
        const files = fileInput.files!;
        ParseFiles(files)
    }

    print.onclick = () => {
        PrintCanvas(body, paper);
    }
}

//SELECT 'FIT TO PAPER' OPTION, AND MAKE SURE PAPER SIZE IS A4
const PrintCanvas = (body: HTMLElement, paper: HTMLCanvasElement) => {
    let width = paper.width; 
    let height = paper.height;

    const prevZoom = ZOOM;
    ZOOM = 4;
    SizePaper(paper);
    body.style.setProperty("pointer-events", "none");
    UPDATE_CANVAS = true;

    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
    if (isSafari == true && isMobile == true) {
        var windowReference = window.open(); //for iOS safari
    }

    setTimeout(() => { //https://github.com/parallax/jsPDF/issues/1487
        const pdf = (width > height) ? new jsPDF('l', 'px', [width, height]) : new jsPDF('p', 'px', [height, width]); //set the orientation
        width = pdf.internal.pageSize.getWidth(); //then we get the dimensions from the 'pdf' file itself
        height = pdf.internal.pageSize.getHeight();
        pdf.addImage(paper, 'PNG', 0, 0,width,height);
        pdf.autoPrint();

        if (isSafari) {
            if (isMobile == false) { //desktop safari
                window.open(pdf.output('bloburl'), '_blank');
            }

            else { //mobile safari, does not allow window.open inside an async call: https://stackoverflow.com/questions/20696041/window-openurl-blank-not-working-on-imac-safari
                windowReference!.location = pdf.output('bloburl');
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
        UPDATE_CANVAS = true;
    }, 3000);
}



const NewImageObject = (src: string, heightPX: number, widthPX: number, leftMM?: number, topMM?: number) => { //height and width refer to original dimensions of image
    const [left, top] = [(leftMM == undefined) ? DEFAULT_IMAGE_OFFSET_MM : leftMM, (topMM == undefined) ? DEFAULT_IMAGE_OFFSET_MM : topMM]
    const [heightMM, widthMM] = [heightPX / MM_PX_SF, widthPX / MM_PX_SF];

    const heightScaleFactor = DEFAULT_IMAGE_SIZE_MM / heightMM;
    const widthScaleFactor = DEFAULT_IMAGE_SIZE_MM / widthMM;
    let scaleFactor = (heightScaleFactor < widthScaleFactor) ? heightScaleFactor : widthScaleFactor;
    if (scaleFactor > 1) { //don't want to enlarge images if they are already smaller than DEFAULT_IMAGE_SIZE_MM
        scaleFactor = 1;
    }

    return { src: src, leftMM: left, topMM: top, heightMM: heightMM * scaleFactor, widthMM: widthMM * scaleFactor};
}
const ParseFiles = (files: FileList) => {
    for (const file of files) {
        const fReader = new FileReader();
        fReader.readAsDataURL(file);
        fReader.onloadend = ($e) => {
            const src = <string>$e.target!.result;

            const image = new Image();
            image.src = src;
            image.onload = () => {
                IMAGES.push(NewImageObject(src, image.naturalHeight, image.naturalWidth));
                UPDATE_CANVAS = true;
            }
        }
    }
}

const DrawImages = (canvas: CanvasRenderingContext2D) => { //Need to work on speed, since currently it is very slow
    const promise = new Promise((resolve) => {
        const [canvasHeight, canvasWidth] = [PAPER_HEIGHT_MM * MM_PX_SF * ZOOM, PAPER_WIDTH_MM * MM_PX_SF * ZOOM];
    
        canvas.fillStyle = "white";
        canvas.fillRect(0, 0, canvasWidth, canvasHeight); //to make the background white

        if (IMAGES.length == 0) {
            resolve("Completed drawing images");
        }

        let counter = 0;
        for (const imageObject of IMAGES) {
            const img = new Image();
            img.src = imageObject.src;
            
            img.onload = () => {
                counter += 1;

                let [imageX, imageY] = [imageObject.leftMM * MM_PX_SF * ZOOM, imageObject.topMM * MM_PX_SF * ZOOM];
                let [imageHeightPX, imageWidthPX] = [imageObject.heightMM * MM_PX_SF * ZOOM, imageObject.widthMM * MM_PX_SF * ZOOM];
                canvas.drawImage(img, imageX, imageY, imageWidthPX, imageHeightPX);

                if (counter == IMAGES.length) { //dont -1 because we incremented counter before this
                    resolve("Completed drawing images");
                }
            }
        }
    })
    return promise;
}



const CanvasLoop = (paper: HTMLCanvasElement, canvas: CanvasRenderingContext2D, transformOverlay: HTMLElement, imageSize: HTMLElement) => { //This seems to work better than individually updating the canvas everytime there's a change, but there is still a bit of flickering
    const bufferPaper = document.createElement("canvas");
    const bufferCanvas = bufferPaper.getContext('2d')!; //draw to this canvas, and once we have finished drawing we can draw to the main canvas, to avoid flickering

    setInterval(async () => {
        if (UPDATE_CANVAS == true) {
            SizePaper(bufferPaper);
            PositionPaper(bufferPaper);
            await DrawImages(bufferCanvas); //draw data to buffer canvas first

            //Slower method
            canvas.drawImage(bufferPaper, 0, 0); //copy buffer canvas contents onto actual paper

            UPDATE_CANVAS = false;
        }

        if (SELECTED_IMAGE_INDEX != undefined) { //display transform overlay over the image
            const img = IMAGES[SELECTED_IMAGE_INDEX];
            const paperBoundingBox = paper.getBoundingClientRect();

            const [left, top] = [paperBoundingBox.left + img.leftMM * MM_PX_SF * ZOOM, paperBoundingBox.top + img.topMM * MM_PX_SF * ZOOM];
            const [height, width] = [img.heightMM * MM_PX_SF * ZOOM, img.widthMM * MM_PX_SF * ZOOM];

            transformOverlay.style.visibility = "visible";
            [transformOverlay.style.left, transformOverlay.style.top] = [`${left}px`, `${top}px`];
            [transformOverlay.style.height, transformOverlay.style.width] = [`${height}px`, `${width}px`];
            imageSize.innerText = `${Math.round(img.widthMM)}mm X ${Math.round(img.heightMM)}mm`;

            if (IMAGE_BUTTONS_DISABLED == true) {    
                setTimeout(() => {
                    IMAGE_BUTTONS_DISABLED = false; //dont want to immediately fire a button click as soon as user taps
                }, 100);
            }
        }
        else {
            transformOverlay.style.visibility = "hidden";
            IMAGE_BUTTONS_DISABLED = true;
        }
    }, 16);
}



const Main = () => {
    const [body, paper, taskbar] = [document.body, <HTMLCanvasElement>document.getElementById("paper")!, document.getElementById("taskbar")!];
    const [file, print] = [<HTMLInputElement>document.getElementById("addImage")!, <HTMLInputElement>document.getElementById("printButton")!]
    const [canvas, transformOverlay, imageSize, rotateButton, deleteButton, duplicateButton, distortButton] = [paper.getContext('2d')!, document.getElementById("transformOverlay")!, document.getElementById("imageSize")!, <HTMLInputElement>document.getElementById("rotate")!, <HTMLInputElement>document.getElementById("delete")!, <HTMLInputElement>document.getElementById("duplicate")!, <HTMLInputElement>document.getElementById("distort")!];
    const [topLeftResize, topRightResize, bottomLeftResize, bottomRightResize] = [document.getElementById("topLeftResize")!, document.getElementById("topRightResize")!, document.getElementById("bottomLeftResize")!, document.getElementById("bottomRightResize")!];

    //IMAGES.push(NewImageObject("/Assets/performanceTest.png", 1496, 1200)); //for testing

    body.style.setProperty("--resizeCounterRadius", `${TRANSFORM_OVERLAY_RESIZE_RADIUS}px`);
    InitHTML(taskbar);

    FitToScreen();
    window.onresize = () => {
        FitToScreen();
        SizePaper(paper);
        PositionPaper(paper);
        UPDATE_CANVAS = true;
    }

    SizePaper(paper);
    PositionPaper(paper);
    UPDATE_CANVAS = true;

    InitPaperListeners(body, paper, rotateButton, deleteButton, duplicateButton, distortButton, { topLeftResizeElement: topLeftResize, topRightResizeElement: topRightResize, bottomLeftResizeElement: bottomLeftResize, bottomRightResizeElement: bottomRightResize }, taskbar);
    InitTaskbarListeners(body, file, print, paper);

    CanvasLoop(paper, canvas, transformOverlay, imageSize);
}

Main();