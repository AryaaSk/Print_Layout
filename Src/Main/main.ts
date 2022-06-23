const PAPER_POSITION = { left: 0, top: 0 }; //position relative, left=x, top=y
let PAPER_HEIGHT_MM = 297;
let PAPER_WIDTH_MM = 210;

const IMAGES: { src: string, leftMM: number, topMM: number, heightMM: number, widthMM: number }[] = [];
const DEFAULT_IMAGE_OFFSET = 5;
const DEFAULT_IMAGE_SIZE = 200;

const MM_PX_SF = 3; //1mm = 3px
let ZOOM = 1;

const FormatPaper = (paper: HTMLElement) => { //to fix blurry lines, only called once
    const dpi = window.devicePixelRatio;
    paper.setAttribute('height', String(PAPER_HEIGHT_MM * MM_PX_SF * dpi));
    paper.setAttribute('width', String(PAPER_WIDTH_MM * MM_PX_SF * dpi));
}
const SizePaper = (paper: HTMLElement, canvas: CanvasRenderingContext2D) => {
    paper.style.height = `${PAPER_HEIGHT_MM * MM_PX_SF * ZOOM}px`;
    paper.style.width = `${PAPER_WIDTH_MM * MM_PX_SF * ZOOM}px`;
    FormatPaper(paper);
    UpdateImages(canvas);
}
const PositionPaper = (paper: HTMLElement) => {
    paper.style.left = `${PAPER_POSITION.left}px`;
    paper.style.top = `${PAPER_POSITION.top}px`;
}



const CheckIntersectionElement = (x: number, y: number, element: HTMLElement) => {
    const boundingBox = element.getBoundingClientRect();
    if (x > boundingBox.left && x < boundingBox.right && y > boundingBox.top && y < boundingBox.bottom) { //for some reason top and bottom are inverted
        return true;
    }
    return false;
}
const InitMovementListeners = (body: HTMLElement, paper: HTMLElement, canvas: CanvasRenderingContext2D, taskbar: HTMLElement) => {
    let pointerDown = false;
    let [prevX, prevY] = [0, 0];

    body.onpointerdown = ($e) => {
        const [x, y] = [$e.clientX, $e.clientY]; //check if pointer is above taskbar or any images, if so then doesn't count
        if (CheckIntersectionElement(x, y, taskbar) == true) {
            return;
        }

        pointerDown = true;
        [prevX, prevY] = [$e.clientX, $e.clientY];
    }
    body.onpointerup = () => {
        pointerDown = false;
    }

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
    }

    body.onwheel = ($e) => {
        const damping = 1 / 400;
        const zoomFactor = $e.deltaY * damping;
        ZOOM += zoomFactor;
        SizePaper(paper, canvas); //should also change the paper's position, to make it seem like the user is actually zooming in on a point however it is quite tricky with this coordiante system
    }
}
const InitTaskbarListeners = (canvas: CanvasRenderingContext2D, file: HTMLInputElement) => {
    const fileInput = <HTMLInputElement>document.getElementById("hiddenFile")!;
    file.onclick = () => {
        fileInput.click();
    }

    fileInput.onchange = () => {
        const fReader = new FileReader();
        fReader.readAsDataURL(fileInput.files![0]);
        fReader.onloadend = ($e) => {
            const src = <string>$e.target!.result;

            const image = new Image();
            image.src = src;
            image.onload = () => {
                IMAGES.push(NewImageObject(src, image.naturalHeight, image.naturalWidth));
                UpdateImages(canvas);
            }
        }
    }
}


const NewImageObject = (src: string, height: number, width: number) => {
    const heightScaleFactor = (DEFAULT_IMAGE_SIZE * MM_PX_SF) / height;
    const widthScaleFactor = (DEFAULT_IMAGE_SIZE * MM_PX_SF) / width;
    const scaleFactor = (heightScaleFactor < widthScaleFactor) ? heightScaleFactor : widthScaleFactor;
    return { src: src, leftMM: DEFAULT_IMAGE_OFFSET, topMM: DEFAULT_IMAGE_OFFSET, heightMM: height * scaleFactor / MM_PX_SF, widthMM: width * scaleFactor / MM_PX_SF };
}
const UpdateImages = (canvas: CanvasRenderingContext2D) => {
    const [canvasHeight, canvasWidth] = [PAPER_HEIGHT_MM * MM_PX_SF, PAPER_WIDTH_MM * MM_PX_SF];
    canvas.clearRect(0, 0, canvasWidth, canvasHeight);

    for (const imageObject of IMAGES) {
        const img = new Image();
        img.src = imageObject.src;
        
        img.onload = () => {
            let [imageX, imageY] = [imageObject.leftMM * MM_PX_SF, imageObject.topMM * MM_PX_SF];
            let [imageHeight, imageWidth] = [imageObject.heightMM * MM_PX_SF, imageObject.widthMM * MM_PX_SF];

            canvas.drawImage(img, imageX, imageY, imageWidth, imageHeight); //image size is constant, but changes with canvas for some reason
        }
    }
}




const Main = () => {
    const [body, paper, taskbar] = [document.body, <HTMLCanvasElement>document.getElementById("paper")!, document.getElementById("taskbar")!];
    const [file, extras, print] = [<HTMLInputElement>document.getElementById("addImage")!, document.getElementById("extrasButton")!, document.getElementById("printButton")!]
    const canvas = paper.getContext('2d')!;

    SizePaper(paper, canvas);
    FormatPaper(paper);
    PositionPaper(paper);

    InitMovementListeners(body, paper, canvas, taskbar);
    InitTaskbarListeners(canvas, file);
}

Main();