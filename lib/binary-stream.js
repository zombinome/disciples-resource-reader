import { CodePages } from "./code-pages.js";

export const ByteOrder = Object.freeze({
    littleEndian: 1,
    bigEndian: 2
});

export class BinaryStream {
    /**
     * @param blob {ArrayBuffer|Uint8Array}
     * @param [initialIndex] {number}
     * @param [byteOrder] {number}
     * @param [codePage] {string}
     */
    constructor(blob, initialIndex, byteOrder, codePage) {

        this.blob = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
        this.index = initialIndex || 0;
        this.byteOrder = byteOrder || ByteOrder.bigEndian;

        this.codePage = CodePages[codePage] || CodePages.default;
    }

    get isComplete() { return this.index >= this.blob.length; }

    /**
     * @returns {number}
     */
    read1() {
        return this.blob[this.index++];
    }

    /**
     * @returns {number}
     */
    read2() {
        return this.byteOrder === ByteOrder.littleEndian
            ? this.read1() + (this.read1() << 8)
            : (this.read1() << 8) + this.read1();
    }

    /**
     * @returns {number}
     */
    read4() {
        let result = 0;
        if (this.byteOrder === ByteOrder.littleEndian) {
            result = this.read1() + (this.read1() << 8) + (this.read1() << 16) + (this.read1() << 24);
        }
        else {
            result = (this.read1() << 24) + (this.read1() << 16) + (this.read1() << 8) + this.read1();
        }

        return result;
    }

    /**
     * @param byteCount {number}
     * @returns {Uint8Array}
     */
    readByteArray(byteCount) {
        const result = new Uint8Array(byteCount);
        for (let i = 0; i < byteCount; i++) {
            result[i] = this.read1();
        }
        return result;
    }

    /**
     * @returns {string}
     */
    readChar() {
        const value = this.read1();
        return this.codePage.byteToChar(value);
    }

    /**
     * @param byteCount {number}
     * @return {string}
     */
    readString(byteCount) {
        let stringLength = 0;
        while (this.blob[this.index + stringLength] !== 0 && stringLength < byteCount) stringLength++;
        const result = this.codePage.byteArrayToString(this.blob, this.index, stringLength);
        this.index += byteCount;
        return result;
    }

    readNullTermString() {
        let stringLength = 0;
        const maxLength = this.blob.length - this.index;
        while (this.blob[this.index + stringLength] !== 0 && stringLength < maxLength) stringLength++;
        const result = this.codePage.byteArrayToString(this.blob, this.index, stringLength);
        this.index += (stringLength + 1); // string + '\0' symbol
        return result;
    }

    /**
     * @param value {number}
     */
    write1(value) {
        this.blob[this.index++] = value && 0xFF;
    }

    /**
     * @param value {number}
     */
    write2(value) {
        if (this.byteOrder === ByteOrder.littleEndian) {
            this.write1(value & 0x00FF);
            this.write1((value & 0xFF00) >> 8);
        }
        else {
            this.write1((value & 0xFF00) >> 8);
            this.write1(value & 0x00FF);
        }
    }

    /**
     * @param value {number}
     */
    write4(value) {
        if (this.byteOrder === ByteOrder.littleEndian) {
            this.write1(value & 0x000000FF);
            this.write1((value & 0x0000FF00) >> 8);
            this.write1((value & 0x00FF0000) >> 16);
            this.write1((value & 0xFF000000) >> 24);
        }
        else {
            this.write1((value & 0xFF000000) >> 24);
            this.write1((value & 0x00FF0000) >> 16);
            this.write1((value & 0x0000FF00) >> 8);
            this.write1(value & 0x000000FF);
        }
    }

    /**
     * @param value {Uint8Array}
     */
    writeByteArray(value) {
        for (let i = 0; i < value.length; i++) {
            this.blob[this.index++] = value[i];
        }
    }

    /**
     * @param value {string}
     */
    writeChar(value) {
        const charCode = this.codePage.charToByte(value);
        this.write1(charCode);
    }

    /**
     * @param value {string}
     * @param length {number}
     */
    writeString(value, length) {
        let i = 0;
        for (; i < value.length && i < length; i++) {
            const charCode = this.codePage.charToByte(value[i]) || 0;
            this.write1(charCode);
        }

        for (; i < length; i++) {
            this.write1(0);
        }
    }

    writeNullTermString(value) {
        let i = 0;
        const maxLength = this.blob.length - this.index - 1;
        for (; i < value.length && i < maxLength; i++) {
            const charCode = this.codePage.charToByte(value[i]) || 0;
            this.write1(charCode);
        }

        this.write1(0x00); // \0 symbol
    }
}