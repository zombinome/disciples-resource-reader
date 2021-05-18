import { MftFont } from "../lib/mft.js";
import {addTab, Tab} from "./common.js";

let canvas = document.getElementById('test-canvas'); // document.createElement('canvas');
let canvasContext = canvas.getContext('2d', {alpha: true});
canvasContext.imageSmoothingEnabled = false;
const cw = 24, ch = 24;
const pixel = canvasContext.createImageData(1,1);
{
    pixel.data[0] = 0;   // r
    pixel.data[1] = 0;   // g
    pixel.data[2] = 0;   // b
    pixel.data[3] = 255; // a
}

class FontTab extends Tab {
    get category() { return 'mft-tabs'; }

    /**
     * @param name {string}
     * @param matrices {number[][]}
     */
    constructor(name, matrices) {
        super(name);
        this.matrices = matrices;
        this.createContent(this.matrices);
    }

    createContent(matrices) {
        const html = [];
        html.push('<div class="font-symbol-preview"></div>');
        html.push('<table><tbody>');
        let idx = 0;
        for (let i = 0; i < 16; i++) {
            html.push('<tr>');
            for (let j = 0; j < 16; j++) {
                if (idx === 255) {
                    html.push('<td></td>');
                    continue;
                }
                const matrix = matrices[idx];
                const height = canvas.height = matrix.length;
                const width = canvas.width = matrix.length > 0 ? matrix[0].length : 0;
                canvasContext.clearRect(0, 0, cw, ch);

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if (matrix[y][x] > 0) {
                            canvasContext.putImageData(pixel, x, y);
                        }
                    }
                }
                html.push(`<td><img class="mft-symbol-icon" data-index="${idx}" alt="" src="${canvas.toDataURL()}" /></td>`);
                idx++;
            }
            html.push('</tr>');
        }
        html.push('</tbody></table>');


        this.tabElement.innerHTML = html.join('\n');

        this.tabElement.addEventListener('click', eventArgs => {
            /** @type {HTMLElement}*/ const target = eventArgs.target;
            if (target.tagName !== 'IMG') {
                return;
            }

            eventArgs.stopPropagation();
            eventArgs.preventDefault();

            this.onSymbolClick(target);
        });
    }

    /**
     * @param target {HTMLImageElement}
     */
    onSymbolClick(target) {
        const glyphId = parseInt(target.getAttribute('data-index'));
        const matrix = this.matrices[glyphId];
        const html = ['<table><tbody>'];
        for (let y = 0; y < matrix.length; y++) {
            html.push('<tr>');
            for (let x = 0; x < matrix[0].length; x++) {
                if (matrix[y][x] > 0) {
                    html.push('<td class="black-pixel"></td>');
                }
                else {
                    html.push('<td class="white-pixel">');
                }
            }
            html.push('</tr>');
        }
        html.push('</tbody></table>');

        const previewPane = this.tabElement.getElementsByClassName('font-symbol-preview')[0];
        previewPane.innerHTML = html.join('');
    }
}

/**
 * @param font {MftFont}
 * @param matrices {number[][]}
 * @return {HTMLDivElement}
 */
function createFontTab(font, matrices) {
    const tabElement = document.createElement('div');

    const html = [];
    html.push('<div class="font-symbol-preview"></div>');
    html.push('<table><tbody>');
    let idx = 0;
    for (let i = 0; i < 16; i++) {
        html.push('<tr>');
        for (let j = 0; j < 16; j++) {
            if (idx === 255) {
                html.push('<td></td>');
                continue;
            }
            const matrix = matrices[idx];
            const height = canvas.height = matrix.length;
            const width = canvas.width = matrix.length > 0 ? matrix[0].length : 0;
            canvasContext.clearRect(0, 0, cw, ch);

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (matrix[y][x] > 0) {
                        canvasContext.putImageData(pixel, x, y);
                    }
                }
            }
            html.push(`<td><img class="mft-symbol-icon" data-index="${idx}" alt="" src="${canvas.toDataURL()}" /></td>`);
            idx++;
        }
        html.push('</tr>');
    }
    html.push('</tbody></table>');


    tabElement.innerHTML = html.join('\n');

    tabElement.addEventListener('click', eventArgs => {
        /** @type {HTMLElement}*/ const target = eventArgs.target;
        if (target.tagName !== 'IMG') {
            return;
        }

        eventArgs.stopPropagation();
        eventArgs.preventDefault();

        const glyphId = parseInt(target.getAttribute('data-index'));
        const matrix = matrices[glyphId];
        const html = ['<table><tbody>'];
        for (let y = 0; y < matrix.length; y++) {
            html.push('<tr>');
            for (let x = 0; x < matrix[0].length; x++) {
                if (matrix[y][x] > 0) {
                    html.push('<td class="black-pixel"></td>');
                }
                else {
                    html.push('<td class="white-pixel">');
                }
            }
            html.push('</tr>');
        }
        html.push('</tbody></table>');

        const previewPane = tabElement.getElementsByClassName('font-symbol-preview')[0];
        previewPane.innerHTML = html.join('');
    });
    return tabElement
}

export function loadFont(loadedData, file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = function (evt) {
        const font = new MftFont(reader.result);
        const fontData = {
            font: font,
            fileName: file.name,
            fontName: font.header.name,
            matrices: new Array(256)
        };

        for (let i = 0; i < 255; i++) {
            fontData.matrices[i] = font.symbols[i].loadMatrix();
        }

        loadedData.fonts.push(fontData);

        // fontData.tabElement = createFontTab(font, fontData.matrices);
        // addTab('mft-tabs', fontData.fileName, fontData.tabElement);
        const tab = new FontTab(fontData.fileName, fontData.matrices);
        addTab(tab);
    };
}