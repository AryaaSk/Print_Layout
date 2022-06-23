let PAPER_HEIGHT_MM = 297;
let PAPER_WIDTH_MM = 210;
let MM_PX_SF = 3; //1mm = 3px
const PAPER_POSITION = { left: 0, top: 0 }; //position relative, left=x, top=y

const IMAGES: { src: string, left: number, top: number }[] = [ { src: "/Assets/test.png", left: 0, top: 0 } ]; /* Left and top are relative to paper */

const SizePaper = (paper: HTMLElement) => {
    paper.style.height = `${PAPER_HEIGHT_MM * MM_PX_SF}px`;
    paper.style.width = `${PAPER_WIDTH_MM * MM_PX_SF}px`;
}
const PositionPaper = (paper: HTMLElement) => {
    paper.style.left = `${PAPER_POSITION.left}px`;
    paper.style.top = `${PAPER_POSITION.top}px`;
}



const CheckIntersection = (x: number, y: number, element: HTMLElement) => {
    const boundingBox = element.getBoundingClientRect();
    if (x > boundingBox.left && x < boundingBox.right && y > boundingBox.top && y < boundingBox.bottom) { //for some reason top and bottom are inverted
        return true;
    }
    return false;
}
const InitMovementListeners = (body: HTMLElement, paper: HTMLElement, taskbar: HTMLElement) => {
    let pointerDown = false;
    let [prevX, prevY] = [0, 0];

    body.onpointerdown = ($e) => {
        const [x, y] = [$e.clientX, $e.clientY]; //check if pointer is above taskbar or any images, if so then doesn't count
        if (CheckIntersection(x, y, taskbar) == true) {
            return;
        }
        for (let i = 0; i != IMAGES.length; i += 1) {
            if (CheckIntersection(x, y, document.getElementById(String(i))!) == true) {
                return;
            }   
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
        const damping = 1 / 200;
        const zoomFactor = $e.deltaY * damping;
        MM_PX_SF += zoomFactor;
        SizePaper(paper); //should also change the paper's position, to make it seem like the user is actually zooming in on a point however it is quite tricky with this coordiante system

    }
}
const InitTaskbarListeners = (imagesContainer: HTMLElement, file: HTMLInputElement) => {
    const fileInput = <HTMLInputElement>document.getElementById("hiddenFile")!;
    file.onclick = () => {
        fileInput.click();
    }

    fileInput.onchange = () => {
        const fReader = new FileReader();
        fReader.readAsDataURL(fileInput.files![0]);
        fReader.onloadend = ($e) => {
            const src = <string>$e.target!.result;
            IMAGES.push(NewImageObject(src));
            UpdateImages(imagesContainer);

            /*
            img.onload = () => {
                const [height, width] = [img.naturalHeight, img.naturalWidth];
                const heightScaleFactor = 500 / height;
                const widthScaleFactor = 500 / width;
                const scaleFactor = (heightScaleFactor > widthScaleFactor) ? heightScaleFactor : widthScaleFactor;
                console.log(height, width);

                canvas.drawImage(img, 10, 10, 480, 270);
            }
            */
        }
    }
}


const NewImageObject = (src: string) => {
    return { src: src, left: 0, top: 0 };
}
const UpdateImages = (container: HTMLElement) => {
    container.innerHTML = "";
    
    let counter = 0;
    for (const imageObject of IMAGES) {
        const image = document.createElement('img');
        image.id = String(counter);
        image.className = "paperImage";

        image.src = imageObject.src;
        image.style.left = `${PAPER_POSITION.left + imageObject.left}px`;
        image.style.top = `${PAPER_POSITION.left + imageObject.top}px`;

        container.append(image);
        counter += 1;
    }
}




const Main = () => {
    const [body, paper, taskbar] = [document.body, <HTMLCanvasElement>document.getElementById("paper")!, document.getElementById("taskbar")!];
    const [file, extras, print] = [<HTMLInputElement>document.getElementById("addImage")!, document.getElementById("extrasButton")!, document.getElementById("printButton")!]
    const [imagesContainer] = [document.getElementById("images")!];

    SizePaper(paper);
    PositionPaper(paper);

    InitMovementListeners(body, paper, taskbar);
    InitTaskbarListeners(imagesContainer, file);

    UpdateImages(imagesContainer);
}

Main();