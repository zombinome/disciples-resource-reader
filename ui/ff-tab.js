import {FFArchive} from '../lib/ff.js';
import {addTab, hasExtension, createHexView, Tab, saveBinaryArrayAsFile} from './common.js';

let intervalHandle = null;
const animFrameInterval = 120;

class FFArchiveTab extends Tab {
    get category() { return 'ff-tabs'; }
    /**
     * @param name {string}
     * @param archive {FFArchive}
     */
    constructor(name, archive) {
        super(name);
        this.archive = archive;
        this.createContent()
    }

    createContent() {
        const content = [];
        content.push('<div class="file-list"><p>Files:</p><ul>');
        for (let index = 0; index < this.archive.files.length; index++) {
            const file = this.archive.files[index];
            content.push(`<li data-id="${index}" title="Size: ${file.content.length} byte(s)">${file.name}</li>`);
        }
        content.push('</ul></div>');
        content.push('<div class="file-content"></div>');

        this.tabElement.innerHTML = content.join('\n');

        this.tabElement.addEventListener('click', eventArgs => {
            /** @type {HTMLElement } */const element = eventArgs.target;
            if (element.tagName === 'LI') {
                eventArgs.stopPropagation();
                eventArgs.preventDefault();

                this.selectFile(element);
            }
            else if (element.tagName === 'BUTTON') {
                eventArgs.stopPropagation();
                eventArgs.preventDefault();

                const action = element.getAttribute('data-action');

                if (action === 'save-file') {
                    const fileName = element.getAttribute('data-file');
                    this.saveFileFromArchive(fileName);
                }
            }
        });
    }

    /**
     * @param fileName {string}
     */
    saveFileFromArchive(fileName) {
        const file = this.archive.files.find(f => f.name === fileName);
        if (file) {
            saveBinaryArrayAsFile(fileName, file.content);
        }
    }

    /**
     * @param fileListItemElement {HTMLElement}
     */
    selectFile(fileListItemElement) {
        stopPeriodicTasks();

        // Updating tab selection
        for (let fileItem of this.tabElement.getElementsByTagName('LI')) {
            if (fileItem === fileListItemElement) {
                fileItem.classList.add('selected');
            }
            else {
                fileItem.classList.remove('selected');
            }
        }

        const fileIndex = parseInt(fileListItemElement.getAttribute('data-id'), 10);
        const file = this.archive.files[fileIndex];
        let animation = null;
        const html = [
            `<button data-file="${file.name}" data-action="save-file">Save file</button><br/>`
        ];

        if (hasExtension(file, '.PNG')) {
            animation = this.archive.animations[file.id];

            const bytes = new Array(file.content.length);
            for (let i = 0; i < file.content.length; i ++) {
                bytes[i] = String.fromCharCode(file.content[i]);
            }
            const base64 = btoa(bytes.join(''));
            html.push('<img class="full-image" alt="" src="data:image/jpg;base64, ' + base64 + '" />');
            if (animation) {
                html.push('<canvas class="region-map"></canvas>');
                html.push('<canvas class="image-animation"></canvas>');
            }

        }
        else if (hasExtension(file, '.OPT')) {
            const rows = createHexView(file.content, 16);
            html.push('<pre>');
            html.push(...rows);
            html.push('</pre>');
        }
        else {

            html.push('<p>No preview available</p>');
        }
        const contentContainer = this.tabElement.getElementsByClassName('file-content')[0];
        contentContainer.innerHTML = html.join('\n');

        if (animation) {
            this.beginAnimationLoop(animation);
        }
    }

    /**
     * @param animation {ImageAnimation}
     */
    beginAnimationLoop(animation) {
        /** @type {HTMLCanvasElement} */
        const canvas = this.tabElement.querySelector('canvas.image-animation');
        if (!canvas) {
            console.error('Canvas element is not found');
            return;
        }

        /** @type {HTMLImageElement} */
        const imageElement = this.tabElement.querySelector('img.full-image');
        if (!imageElement) {
            console.error('Full image not found');
            return;
        }
        const ctx = canvas.getContext('2d');

        /** @type {HTMLCanvasElement} */
        const regionMap = this.tabElement.querySelector('canvas.region-map');
        const regionMapCtx = regionMap.getContext('2d');
        regionMap.width = imageElement.width;
        regionMap.height = imageElement.height;
        regionMapCtx.strokeStyle = 'green';
        regionMapCtx.lineWidth = 2;

        const boundary = getAnimationBoundary(animation.frames);
        canvas.width = boundary.w;
        canvas.height = boundary.h;

        let currentFrame = 0;
        intervalHandle = setInterval(() => {
            const frame = animation.frames[currentFrame];

            regionMapCtx.drawImage(imageElement, 0, 0);

            //window.requestAnimationFrame(_ => {
                ctx.clearRect(0, 0, boundary.w, boundary.h);
                for (let region of frame.regions) {
                    ctx.drawImage(
                        imageElement,
                        region.sourceX, region.sourceY, region.width, region.height,
                        region.destX - boundary.x, region.destY - boundary.y, region.width, region.height);

                    regionMapCtx.strokeRect(region.sourceX, region.sourceY, region.width, region.height);
                }
            //});

            currentFrame++;
            if (currentFrame >= animation.frames.length) {
                currentFrame -= animation.frames.length;
            }
        }, animFrameInterval);
    }
}

export function loadArchive(loadedData, file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = function (evt) {
        const archive = new FFArchive(reader.result);
        const archiveData = {
            archive: archive,
            fileName: file.name
        };

        loadedData.archives.push(archiveData);

        const tab = new FFArchiveTab(file.name, archive);
        addTab(tab);
    };
}

/**
 * @param frames {ImageAnimationFrame[]}
 */
function getAnimationBoundary(frames) {
    let left = Number.MAX_SAFE_INTEGER, top = Number.MAX_SAFE_INTEGER, right = 0, bottom = 0;
    for (let frame of frames) {
        for (let region of frame.regions) {

            const destLeft = region.destX,
                destTop = region.destY,
                destRight = region.destX + region.width,
                destBottom = region.destY + region.height;

            if (destLeft < left) {
                left = destLeft;
            }

            if (destTop < top) {
                top = destTop;
            }

            if (destRight > right) {
                right = destRight;
            }

            if (destBottom > bottom) {
                bottom = destBottom;
            }
        }
    }

    return {
        x: left,
        y: top,
        w: right - left,
        h: bottom - top
    };
}

function stopPeriodicTasks() {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
}