import {DbfTable} from "../lib/dbf.js";
import {addTab, Tab} from "./common.js";

class TableTab extends Tab {
    get category() { return 'dbf-tabs'; }

    constructor(fileName, table) {
        super(fileName);
        this.createContent(table)
    }

    createContent(table) {
        const content = [];
        content.push('<table class="dbf-table">');
        content.push('  <thead>');
        content.push('    <tr><th>#</th><th>X</th>');
        for (let column of table.header.columns) {
            content.push('<th>', column.name, '</th>');
        }
        content.push('    </tr>');
        content.push('  </thead>');
        content.push('  <tbody>');
        for (let i = 0; i < table.records.length; i++) {
            const record = table.records[i];
            const deletedChar = record.isDeleted ? 'X' : '&nbsp;';
            content.push(`<tr><td>${i}</td><td>${deletedChar}</td>`);

            for (let column of table.header.columns) {
                content.push(`<td class="type-${column.fieldType}">${record.getField(column.name)}</td>`);
            }
        }
        content.push('  </tbody>');
        content.push('</table>');
        this.tabElement.innerHTML = content.join('\n');
    }
}

/**
 * @param table {DbfTable}
 * @return {HTMLDivElement}
 */
// function createTableTab(table) {
//     const tabElement = document.createElement('div');
//
//     const content = [];
//     content.push('<table class="dbf-table">');
//     content.push('  <thead>');
//     content.push('    <tr><th>#</th><th>X</th>');
//     for (let column of table.header.columns) {
//         content.push('<th>', column.name, '</th>');
//     }
//     content.push('    </tr>');
//     content.push('  </thead>');
//     content.push('  <tbody>');
//     for (let i = 0; i < table.records.length; i++) {
//         const record = table.records[i];
//         const deletedChar = record.isDeleted ? 'X' : '&nbsp;';
//         content.push(`<tr><td>${i}</td><td>${deletedChar}</td>`);
//
//         for (let column of table.header.columns) {
//             content.push(`<td class="type-${column.fieldType}">${record.getField(column.name)}</td>`);
//         }
//     }
//     content.push('  </tbody>');
//     content.push('</table>');
//     tabElement.innerHTML = content.join('\n');
//
//     return tabElement;
// }

/**
 * @param loadedData
 * @param file {File}
 */
export function loadTable(loadedData, file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = function (evt) {
        const table = new DbfTable(reader.result);
        const tableData = {
            table: table,
            fileName: file.name
        };

        loadedData.tables.push(tableData);

        // tableData.tabElement = createTableTab(table);
        // addTab('dbf-tabs', tableData.fileName, tableData.tabElement);
        const tableTab = new TableTab(tableData.fileName, table);
        addTab(tableTab);
    };
}