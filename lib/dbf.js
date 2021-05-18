import { BinaryStream } from "./binary-stream.js";
import { ByteOrder } from "./binary-stream.js";

const $recordsCount = Symbol('recordsCount');
const $columns = Symbol('columns');
const $isDeleted = Symbol('isDeleted');
const $fields = Symbol('fields');
const $columnDef = Symbol('columnDef');
const $binaryValue = Symbol('binaryValue');
const $table = Symbol('table');
const $header = Symbol('header');

/**
 * DBF field types (only dBase Level 5 supported for now)
 */
export const FieldTypes = Object.freeze({
    character: 'C',
    date: 'D',
    float: 'F',
    logical: 'L',
    memo: 'M',
    numeric: 'N'
});

function DbfTableSerializeOptions() {
    this.saveDeletedRecords = true;
}

/**
 * DBF table
 */
export class DbfTable {

    get header() { return this[$header]; }
    /**
     * @param blob {ArrayBuffer}
     * @param index {number}
     */
    constructor(blob, index) {
        const stream = new BinaryStream(blob);
        this[$header] = new DbfTableHeader(stream);
        this.records = new Array(this.header.recordsCount);
        this.columnMap = {};
        this.header.columns.forEach((column, index) => this.columnMap[column.name] = index);
        for (let i = 0; i < this.records.length; i++) {
            this.records[i] = new DbfTableRecord(stream, this);
        }

        // Updating records count to be equal to actual records count
        this.header[$recordsCount] = getRecordsCount(this.records, false);
    }

    addRecord(data) {
        const record = new DbfTableRecord(null, this);
        record.push(data);
        this.header[$recordsCount]++;
    }

    getBinarySize(countDeletedRecords) {
        const recordsCount = countDeletedRecords ? this.records.length : this.header.recordsCount;
        const totalSize = DbfTableHeader.binarySize                  // Header fixed-length part
            + DbfTableColumn.binarySize * this.header.columns.length // Column definitions
            + 1                                                      // Byte-divider between header and body
            + this.header.recordSize * recordsCount;                 // Table body

        return totalSize;
    }

    /**
     * Serializes table content into binary buffer
     * @param [target] {ArrayBuffer}
     * @param [options] {DbfTableSerializeOptions|Object.<string, *>}
     */
    serialize(target, options) {
        options = options || new DbfTableSerializeOptions();

        const recordsCount = options.saveDeletedRecords
            ? this.records.length
            : this.header.recordsCount;

        target = target || new ArrayBuffer(this.getBinarySize(options.saveDeletedRecords));
        const stream = new BinaryStream(target, 0);

        const actualRecordsCount = this.header.recordsCount;
        this.header[$recordsCount] = recordsCount; // Hack for saving records marked as deleted
        this.header.serialize(stream);
        this.header[$recordsCount] = actualRecordsCount;

        for (let record of this.records) {
            if (record.isDeleted && !options.saveDeletedRecords) {
                continue;
            }

            record.serialize(stream);
        }

        return target;
    }

    /**
     * Truncates table removing all records marked as deleted
     */
    pack() {
        const packedRecords = new Array(this.header.recordsCount);
        let packedIndex = 0;
        for (let i = 0; i < this.records.length; i++) {
            /** @type {DbfTableRecord} */ const record = this.records[i];
            if (!record.isDeleted) {
                packedRecords[packedIndex] = record;
                packedIndex++;
            }
        }

        this.records = packedRecords;
    }
}

/**
 * DBF table header
 */
class DbfTableHeader {
    /**
     * Returns count of actual records in table.
     * records property may contain records marked as deleted, so it's length may be greater than records count
     * @return {number}
     */
    get recordsCount() { return this[$recordsCount]; }

    /**
     * @return {DbfTableColumn[]}
     */
    get columns() { return this[$columns]; }
    /**
     *
     * @param stream {BinaryStream}
     */
    constructor(stream) {
        const byteOrder = stream.byteOrder;
        stream.byteOrder = ByteOrder.littleEndian;

        // reading main header data
        this.versionInfo        = stream.read1();
        this.year               = stream.read1();
        this.month              = stream.read1();
        this.day                = stream.read1();
        this[$recordsCount]     = stream.read4();
        this.headerSize         = stream.read2();
        this.recordSize         = stream.read2();
        stream.index += 2;      // reserved1 02 bytes
        this.transactionFlags   = stream.read1();
        this.encription         = stream.read1();
        this.useUserEnvironment = stream.readByteArray(12);
        this.useIndex           = stream.read1();
        this.codePage           = stream.read1();
        stream.index += 2;      // reserved2 02 bytes

        // reading columns data
        const columnCount = Math.round((this.headerSize - DbfTableHeader.binarySize - 1) / DbfTableColumn.binarySize);
        this[$columns] = new Array(columnCount);
        for (let i = 0; i < columnCount; i++) {
            this[$columns][i] = new DbfTableColumn(stream);
        }

        stream.byteOrder = byteOrder;

        stream.index++; // reading last byte of header
    }

    /**
     * @param stream {BinaryStream}
     */
    serialize(stream) {
        const byteOrder = stream.byteOrder;
        stream.byteOrder = ByteOrder.littleEndian;

        stream.write1(this.versionInfo);
        stream.write1(this.year);
        stream.write1(this.month);
        stream.write1(this.day);
        stream.write4(this.recordsCount);
        stream.write2(this.headerSize);
        stream.write2(this.recordSize);
        stream.index += 2; // reserved1 02 bytes
        stream.write1(this.transactionFlags);
        stream.write1(this.encription);
        stream.writeByteArray(this.useUserEnvironment);
        stream.write1(this.useIndex);
        stream.write1(this.codePage);
        stream.index += 2; //reserved2 02 bytes;

        for (let column of this.columns) {
            column.serialize(stream);
        }

        stream.byteOrder = byteOrder;
        stream.writeChar(' ');
    }

    getVersionInfo() {
        const versionNumber = (this.versionInfo & 0x11000000) >> 6;
        return versionNumber === 3
            ? 'dBase Level 5' :
            (versionNumber === 4 ? 'dBase Level 7' : 'Unknown, code: ' + versionNumber);
    };

    static get binarySize() { return 32; }
}

/**
 * DBF table column definition
 */
class DbfTableColumn {
    static get binarySize() { return 32; }

    /**
     * @param stream {BinaryStream}
     */
    constructor(stream) {
        this.name           = stream.readString(11);
        this.fieldType      = stream.readChar();
        this.address        = stream.read4();
        this.fieldSize      = stream.read1();
        this.fractionalSize = stream.read1();
        stream.index += 2;  // reserved1 02 bytes
        this.workAreaId     = stream.read1();
        this.multiUser      = stream.read2();
        this.setFields      = stream.read1();
        stream.index += 7;  // reserved2 07 bytes
        this.mdxidIncluded  = stream.read1();
    }

    /**
     * @param stream {BinaryStream}
     */
    serialize(stream) {
        stream.writeString(this.name, 11); // 11 bytes
        stream.writeChar(this.fieldType);         // 01 byte
        stream.write4(this.address);              // 04 bytes
        stream.write1(this.fieldSize);            // 01 byte
        stream.write1(this.fractionalSize);	      // 01 byte
        stream.index += 2;                        // reserved1 02 bytes
        stream.write1(this.workAreaId);           // 01 byte
        stream.write2(this.multiUser); 	          // 02 bytes
        stream.write1(this.setFields);            // 01 byte
        stream.index += 7;                        // reserved2 07 bytes
        stream.write1(this.mdxidIncluded);        // 01 byte
    }
}

/**
 * DBF table record with data
 */
class DbfTableRecord {
    /**
     * @return {boolean}
     */
    get isDeleted() { return this[$isDeleted]; }
    set isDeleted(value) {
        value = !!value;
        const prevVal = this.isDeleted;
        if (prevVal === value) {
            return;
        }

        this[$isDeleted] = value;
        if (value) {
            this[$table].header[$recordsCount]--;
        }
        else {
            this[$table].header[$recordsCount]++;
        }
    }
    /**
     * @param stream {BinaryStream}
     * @param table {DbfTable}
     */
    constructor(stream, table) {
        this[$table] = table;
        this[$fields] = [];

        if (!stream) {
            this[$isDeleted] = false;
            return;
        }


        this[$isDeleted] = stream.read1() === 0x2A;

        const columns = table.header.columns;
        for (let i = 0; i < columns.length; i++) {
            this[$fields][i] = readFieldValue(stream, columns[i]);
        }
    }

    /**
     * @param nameOrIndex {number|string}
     * @returns {number|string|Date}
     */
    getField(nameOrIndex) {
        const index = typeof nameOrIndex === 'string'
            ? this[$table].columnMap[nameOrIndex]
            : nameOrIndex;

        if (index === undefined || index < 0 || index >= this[$table].header.columns.length) {
            throw new Error(`Invalid column "${nameOrIndex}"!`);
        }

        return this[$fields][index];
    }

    /**
     * @returns {Object.<string, number|string|Date>}
     */
    get() {
        const result = {};
        const columns = this[$table].header.columns;
        for (let i = 0; i < columns.length; i++) {
            result[columns[i].name] = this[$fields][i];
        }

        return result;
    }

    /**
     * @param nameOrIndex {number|string}
     * @param value {number|string|date}
     */
    setField(nameOrIndex, value) {
        const index = typeof nameOrIndex === 'string'
            ? this[$table].columnMap[nameOrIndex] || -1
            : nameOrIndex;

        if (index < 0 || index >= this[$table].header.columns.length) {
            throw new Error(`Invalid column "${nameOrIndex}"!`);
        }

        const column = this[$table].header.columns[index];
        if (!validateFieldValue(column, value)) {
            throw new Error(`Invalid value type. Expected: ${column.fieldType}`);
        }

        this[$fields][index] = normalizeFieldValue(column, value);
    }

    set(data) {
        const columns = this[$table].header.columns;
        for (let column of columns) {
            this.setField(column.name, data[column.name] || null);
        }
    }

    /**
     * @param stream {BinaryStream}
     */
    serialize(stream) {
        const deleteByte = this.isDeleted ? 0x2A : 0x20;
        stream.write1(deleteByte);

        const columns = this[$table].header.columns;
        for (let i = 0; i < columns.length; i++) {
            const value = this[$fields][i];
            serializeFieldValue(stream, columns[i], value);
        }
    }
}

const logicTrueChars = ['T', 't', 'Y', 'y'];
const logicFalseChars = ['F', 'f', 'N', 'n'];
const nullChars = [' ', '?'];

/**
 * @param stream {BinaryStream}
 * @param column {DbfTableColumn}
 * @returns {string|number|Date|boolean}
 */
function readFieldValue(stream, column) {
    switch (column.fieldType) {
        case FieldTypes.character:
            return stream.readString(column.fieldSize).trimRight();

        case FieldTypes.date:
            const dateStr = stream.readString(8);
            const datePart = dateStr.substr(0, 4);
            const monthPart = dateStr.substr(4, 2);
            const dayPart = dateStr.substr(6, 2);
            return new Date(parseInt(datePart, 10), parseInt(monthPart, 10), parseInt(dayPart, 10));
        case FieldTypes.logical:
            const logicVal = stream.readChar();
            if (logicTrueChars.includes(logicVal)) {
                return true;
            }
            if (logicFalseChars.includes(logicVal)) {
                return false;
            }

            return null;
        case FieldTypes.numeric:
            const numStr = stream.readString(column.fieldSize).trim();
            const intVal = parseInt(numStr, 10);
            return isNaN(intVal) ? null : intVal;
        case FieldTypes.float:
            const floatStr = stream.readString(column.fieldSize).trim();
            const floatVal = parseFloat(floatStr);
            return isNaN(floatVal) ? null : floatVal;
    }

    throw new Error(`Unsupported field type: '${column.fieldType}`);
}

function validateFieldValue(column, value) {
    if (value === null) {
        return true;
    }

    switch (column.fieldType) {
        case FieldTypes.character:
            return true;

        case FieldTypes.numeric:
        case FieldTypes.float:
            return typeof value === 'number';

        case FieldTypes.date:
            return typeof value === 'number' || value instanceof Date;

        case FieldTypes.logical:
            return typeof value === 'boolean'
                   || typeof value == 'number'
                   || (typeof value === 'string' && (logicTrueChars.includes(value) || logicFalseChars.includes(value) || nullChars.includes(value)));
    }

    return false;
}

function normalizeFieldValue(column, value) {
    if (value === null) {
        return null;
    }

    switch (column.fieldType) {
        case FieldTypes.numeric:
            return Math.round(value);

        case FieldTypes.float:
            return value;

        case FieldTypes.character:
            return value.toString();

        case FieldTypes.date:
            return typeof value === 'number' ? new Date(value) : value;

        case FieldTypes.logical:
            if (typeof value === 'boolean') {
                return value;
            }

            if (typeof value === 'number') {
                return !!value;
            }

            // value is string
            if (logicTrueChars.includes(value)) {
                return true;
            }

            if (logicFalseChars.includes(value)) {
                return false;
            }

            return null;
    }

    throw new Error(`Invalid type '${column.type}' of column '${column.name}'`);
}

/**
 * @param tableRecords {DbfTableRecord[]}
 * @param countDeletedRecords {boolean}
 * @return {number}
 */
function getRecordsCount(tableRecords, countDeletedRecords) {
    return countDeletedRecords
        ? tableRecords.length
        : tableRecords.reduce((acc, record) => record.isDeleted ? acc : acc + 1, 0);
}

/**
 * @param stream {BinaryStream}
 * @param value {string}
 * @param length {number}
 */
function padRight(stream, value, length) {
    value = value || '';
    stream.writeString(value, length);
    for (let i = value.length; i < length; i++) {
        stream.writeChar(' ');
    }
}

/**
 * @param stream {BinaryStream}
 * @param value {string}
 * @param length {number}
 * @param padChar {string}
 */
function padLeft(stream, value, length, padChar) {
    const firstCharIndex = value.length > length
        ? length - value.length
        : 0;
    const result = firstCharIndex === 0 ? value : value.substr(firstCharIndex);

    if (value.length < length) {
        for (let i = value.length; i < length; i++) stream.writeChar(padChar);
    }

    stream.writeString(result, result.length);
}

function serializeFieldValue(stream, column, value) {
    switch (column.fieldType) {
        case FieldTypes.character:
            padRight(stream, value, column.fieldSize);
            break;

        case FieldTypes.logical:
            const boolChar = value ? 'T': 'F';
            stream.writeChar(boolChar);
            break;

        case FieldTypes.date:
            const year = value.getFullYear().toString(10);
            const month = (value.getMonth() + 1).toString(10);
            const day = value.getDate().toString(10);
            padLeft(stream, year,  4, '0');
            padLeft(stream, month, 2, '0');
            padLeft(stream, day,   2, '0');
            break;
        case FieldTypes.numeric:
            padLeft(stream, value.toString(), column.fieldSize, ' ');
            break;
        case FieldTypes.float:
            const floatValue = value.toFixed(column.fractionalSize);
            padLeft(stream, floatValue, column.fieldSize, ' ');
            break;
        case FieldTypes.memo:
            stream.writeString(value, column.fieldSize); // TODO: Add support for the memo file
            break;
    }

    throw new Error(`Unsupported type ${column.fieldType} of column ${column.name}`);
}

class DbfTableIndex {

}
