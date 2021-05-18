import { loadedData, allTabs, hasExtension } from "./ui/common.js";
import {loadTable} from "./ui/table-tab.js";
import {loadFont} from "./ui/font-tab.js";
import {loadArchive} from "./ui/ff-tab.js";


window.data = loadedData;

/** Load files on select if in file input */
document.getElementById('files').addEventListener('change', eventArgs => {
    eventArgs.preventDefault();
    eventArgs.stopPropagation();

    const files = document.getElementById('files');
    const totalFiles = files.files.length;
    const startedAt = new Date();
    let loadedFiles = 0;
    for (let i = 0; i < totalFiles; i++) {
        const index = i;
        const file = files.files.item(i);
        if (hasExtension(file, '.DBF')) {
            loadTable(loadedData, file);
        }
        else if (hasExtension(file, '.MFT')) {
            loadFont(loadedData, file);
        }
        else if (hasExtension(file, '.FF')) {
            loadArchive(loadedData, file);
        }
    }
});

/** Selection of tab, show correct tab content */
document.querySelector('.tabs-section').addEventListener('click', eventArgs => {
    /** @type {HTMLElement} */ const target = eventArgs.target;
    if (target.tagName !== 'LI') {
        return;
    }

    eventArgs.preventDefault();
    eventArgs.stopPropagation();

    const id = target.id;
    const classSelected = 'selected';
    allTabs.forEach(tab => {
        if (tab.tabHeaderElement.id === target.id) {
            tab.tabHeaderElement.classList.add(classSelected);
            tab.tabElement.classList.add(classSelected);
            tab.onAfterShow();
        }
        else {
            if (tab.tabHeaderElement.classList.contains(classSelected)) {
                tab.onBeforeClose();

                tab.tabElement.classList.remove(classSelected);
                tab.tabHeaderElement.classList.remove(classSelected);
            }
        }
    });
});
