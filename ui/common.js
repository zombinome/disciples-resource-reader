import {CodePages} from '../lib/code-pages.js';

export const loadedData = {
    tables: [],
    fonts: [],
    archives: []
};

let tabCounter = 0;

/** @type {Tab[]} */
export const allTabs = [];

export class Tab {
    /**
     * @returns {string}
     */
    get category() { return 'tab-other'; }

    constructor(name) {
        /** @type {number} */         this.id = tabCounter++;
        /** @type {string} */         this.name = name;
        /** @type {HTMLDivElement} */ this.tabElement = document.createElement('div');

        this.tabElement.id = 'tab-' + this.id;
        this.tabHeaderElement = document.createElement('li');
        this.tabHeaderElement.id = 'header-' + this.tabElement.id;
        this.tabHeaderElement.innerText = name;
    }

    onAfterShow() { }
    onBeforeClose() { }
}

/**
 * @param file {File|FFArchiveFile}
 * @param ext {string}
 * @return {boolean}
 */
export function hasExtension(file, ext) {
    const extLength = ext.length;
    if (file.name.length < ext.length) {
        return false;
    }

    const fileNameEnd = file.name.substring(file.name.length - extLength).toUpperCase();
    return fileNameEnd === ext.toUpperCase();
}

/**
 * @param tab {Tab}
 */
export function addTab(tab) {
    const parent = document.getElementById(tab.category);
    parent.appendChild(tab.tabHeaderElement);

    const tabContainer = document.getElementById('tab-container');
    tabContainer.appendChild(tab.tabElement);

    allTabs.push(tab);
}

// export function addTab2(category, name, tabElement) {
//     const parent = document.getElementById(category);
//     const tabContainer = document.getElementById('tab-container');
//
//     tabElement.id = 'tab-' + tabCounter++;
//
//     const element = document.createElement('li');
//     element.innerText = name;
//     element.id = 'head-' + tabElement.id;
//     parent.appendChild(element);
//     tabContainer.appendChild(tabElement);
//
//     allTabs.push(element);
// }

/**
 * @param val {number}
 * @returns {string}
 */
function padHex(val) {
    return val < 0x10 ? '0' + val.toString(16) : val.toString(16);
}

const addressPrefix = '00000000';
/**
 * @param address {number}
 * @returns {string}
 */
function padAddress(address) {
    const addressStr = address.toString(16);
    return addressPrefix.substring(addressStr.length) + addressStr;
}

/**
 * @param val {number}
 * @returns string
 */
function normalizeChar(val) {
    return val < 0x20 ? '.' : CodePages.default.byteToChar(val);
}

/**
 * @param binaryData {Uint8Array}
 * @param width {number}
 * @returns {string[]}
 */
export function createHexView(binaryData, width) {
    const groupWidth = 4;
    let groupIndex = 0;
    let row = ['          '];
    for (let i = 0; i < width; i++) {
        row.push(padHex(i), ' ');
        groupIndex++;
        if (groupIndex >= groupWidth) {
            groupIndex -= groupWidth;
            row.push(' ');
        }
    }

    const content = [row.join('')];

    let address = 0;
    row = [padAddress(address), ': '];
    let rowStr = ['  |'];
    let rowWidth = 0;
    for (let i = 0; i < binaryData.length; i++) {
            const val = padHex(binaryData[i]);
        row.push(val, ' ');
        rowStr.push(normalizeChar(binaryData[i]));
        rowWidth++;


        groupIndex++;
        if (groupIndex >= groupWidth) {
            groupIndex -= groupWidth;
            row.push(' ');
        }

        if (rowWidth >= width) {
            row.push(rowStr.join(''));
            content.push(row.join(''));
            address += width;
            row = [padAddress(address), ': '];
            rowStr = ['  |'];
            rowWidth -= width;
        }
    }

    if (row.length) {

        const rowFullStr = row.join('');
        const delta = content[0].length - rowFullStr.length;
        row = [rowFullStr];
        for (let i = 0; i < delta; i++) {
            row.push(' ');
        }

        row.push(rowStr.join(''));
        content.push(row.join(''));

    }

    return content;
}

/**
 * @param fileName {String}
 * @param binary {Uint8Array}
 */
export function saveBinaryArrayAsFile(fileName, binary) {
    const anchor = document.createElement('a');
    document.body.appendChild(anchor);
    anchor.style.display = 'none';

    const blob = new Blob([binary]),
        url = window.URL.createObjectURL(blob);

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
    anchor.remove();
}