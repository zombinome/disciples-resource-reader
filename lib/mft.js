import {BinaryStream, ByteOrder} from "./binary-stream.js";

export class MftFont {
    /**
     * @param blob {ArrayBuffer}
     * @param [index] {number}
     */
    constructor(blob, index) {
        const stream = new BinaryStream(blob, index, ByteOrder.littleEndian);

        this.header = new MftFontHeader(stream);
        /** @type {MftSymbol[]} */ this.symbols = new Array(255);
        for (let index = 0; index < this.symbols.length; index++) {
            this.symbols[index] = new MftSymbol(stream)
        }
    }

}

class MftFontHeader {
    /**
     * @param stream {BinaryStream}
     */
    constructor(stream) {
        this.fileType = stream.readString(4);
        this.version = stream.read4();

        const nameLength = stream.read4();
        this.name = stream.readString(nameLength);

        this.unknown1 = stream.read4();
        this.unknown2 = stream.read4();
        this.unknown3 = stream.read4();

        stream.index++; // end of header
    }
}

class MftSymbol {
    constructor(stream) {
        const divider = stream.read1();
        if (divider !== 0x01) {
            throw new Error('Invalid symbol block.');
        }

        this.width = stream.read4();
        this.height = stream.read4();
        this.unknown = stream.read4();
        this.bytesPerRow = stream.read4();
        this.bytes = stream.readByteArray(this.bytesPerRow * this.height);
    }

    loadMatrix() {
        const result = new Array(this.height);
        let byteIndex = 0;
        for (let row = 0; row < this.height; row++) {
            result[row] = extractBits(this.bytes, byteIndex, this.width);
            byteIndex += this.bytesPerRow;
        }

        return result;
    }
}

const bitMap = new Array(256);
for (let i = 0; i < bitMap.length; i++) {
    let mask = 0b10000000;
    bitMap[i] = new Array(8);
    for (let j = 0; j < 8; j++) {
        bitMap[i][j] = (i & mask) > 0 ? 1 : 0;
        mask = mask >> 1;
    }
}

/**
 * @param bytes {Uint8Array}
 * @param index {number}
 * @param bitWidth {number}
 * @returns {number[]}
 */
function extractBits(bytes, index, bitWidth) {
    const result = new Array(bitWidth);
    let currentBit = 0;

    let bitsLeft = bitWidth;

    //let debugstr = '';
    while(bitsLeft > 0) {
        const byte = bytes[index];
        //debugstr += ('00000000'.substr(0, 8 - byte.toString(2).length) + byte.toString(2));
        const row = bitMap[byte];
        for (let i =0; i < bitsLeft && i < 8; i++) {
            result[currentBit++] = row[i];
        }

        bitsLeft -=8;
        index++;
    }

    //console.log('Extracted bits:', debugstr, result);
    return result;
}