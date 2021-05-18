export class CodePage {
    /**
     * @param codes string[]
     */
    constructor(codes) {
        this.codeMap = codes;
        this.charMap = {};
        codes.forEach((code, index) => { this.charMap[code] = index; });
    }

    charToByte(char) {
        return this.charMap[char] || null;
    }

    byteToChar(byte) {
        return this.codeMap[byte & 0xFF] || null;
    }

    /**
     * @param string {string}
     * @param [dest] {Uint8Array}
     * @returns {Uint8Array}
     */
    stringToByteArray(string, dest) {

        dest =  dest || new Uint8Array(string.length);
        for (let i = 0; i < string.length; i++) {
            dest[i] = this.charToByte(string[i]);
        }

        return dest;
    }

    /**
     * @param array {Uint8Array}
     * @param [index] {number}
     * @param [count] {number}
     * @returns {string}
     */
    byteArrayToString(array, index, count) {
        index = index || 0;
        const chars = new Array(count);
        for (let i = 0; i < count; i++) {
            chars[i] = this.byteToChar(array[index + i]);
        }

        return chars.join('');
    }
}

export const CodePages = {
    'Windows-1251': new CodePage([
        /* 00 */ '\u0000', '\u0001', '\u0002', '\u0003', '\u0004', '\u0005', '\u0006', '\u0007', '\u0008', '\u0009', '\u000a', '\u000b', '\u000c', '\u000d', '\u000e', '\u000f',
        /* 10 */ '\u0010', '\u0011', '\u0012', '\u0013', '\u0014', '\u0015', '\u0016', '\u0017', '\u0018', '\u0019', '\u001a', '\u001b', '\u001c', '\u001d', '\u001e', '\u001f',
        /* 20 */ '\u0020', '\u0021', '\u0022', '\u0023', '\u0024', '\u0025', '\u0026', '\u0027', '\u0028', '\u0029', '\u002a', '\u002b', '\u002c', '\u002d', '\u002e', '\u002f',
        /* 30 */ '\u0030', '\u0031', '\u0032', '\u0033', '\u0034', '\u0035', '\u0036', '\u0037', '\u0038', '\u0039', '\u003a', '\u003b', '\u003c', '\u003d', '\u003e', '\u003f',
        /* 40 */ '\u0040', '\u0041', '\u0042', '\u0043', '\u0044', '\u0045', '\u0046', '\u0047', '\u0048', '\u0049', '\u004a', '\u004b', '\u004c', '\u004d', '\u004e', '\u004f',
        /* 50 */ '\u0050', '\u0051', '\u0052', '\u0053', '\u0054', '\u0055', '\u0056', '\u0057', '\u0058', '\u0059', '\u005a', '\u005b', '\u005c', '\u005d', '\u005e', '\u005f',
        /* 60 */ '\u0060', '\u0061', '\u0062', '\u0063', '\u0064', '\u0065', '\u0066', '\u0067', '\u0068', '\u0069', '\u006a', '\u006b', '\u006c', '\u006d', '\u006e', '\u006f',
        /* 70 */ '\u0070', '\u0071', '\u0072', '\u0073', '\u0074', '\u0075', '\u0076', '\u0077', '\u0078', '\u0079', '\u007a', '\u007b', '\u007c', '\u007d', '\u007e', '\u007f',

        /* 80 */ '\u0402', '\u0403', '\u201A', '\u0453', '\u201E', '\u2026', '\u2020', '\u2021', '\u20AC', '\u2030', '\u0409', '\u2039', '\u040A', '\u040C', '\u040B', '\u040F',
        /* 90 */ '\u0452', '\u2018', '\u2019', '\u201C', '\u201D', '\u2022', '\u2013', '\u2014', '\u2015', '\u2122', '\u0459', '\u203A', '\u045A', '\u045C', '\u045B', '\u045F',
        /* A0 */ '\u00A0', '\u040E', '\u045E', '\u0408', '\u00A4', '\u0490', '\u00A6', '\u00A7', '\u0401', '\u00A9', '\u0404', '\u00AB', '\u00AC', '\u00AD', '\u00AE', '\u0407',
        /* B0 */ '\u00B0', '\u00B1', '\u0406', '\u0456', '\u0491', '\u00B5', '\u00B6', '\u00B7', '\u0451', '\u2116', '\u0454', '\u00BB', '\u0458', '\u0405', '\u0455', '\u0457',

        /* C0 */ '\u0410', '\u0411', '\u0412', '\u0413', '\u0414', '\u0415', '\u0416', '\u0417', '\u0418', '\u0419', '\u041A', '\u041B', '\u041C', '\u041D', '\u041E', '\u041F',
        /* D0 */ '\u0420', '\u0421', '\u0422', '\u0423', '\u0424', '\u0425', '\u0426', '\u0427', '\u0428', '\u0429', '\u042A', '\u042B', '\u042C', '\u042D', '\u042E', '\u042F',
        /* E0 */ '\u0430', '\u0431', '\u0432', '\u0433', '\u0434', '\u0435', '\u0436', '\u0437', '\u0438', '\u0439', '\u043A', '\u043B', '\u043C', '\u043D', '\u043E', '\u043F',
        /* F0 */ '\u0440', '\u0441', '\u0442', '\u0443', '\u0444', '\u0445', '\u0446', '\u0447', '\u0448', '\u0449', '\u044A', '\u044B', '\u044C', '\u044D', '\u044E', '\u044F'
    ])
};

CodePages.default = CodePages['Windows-1251'];