import {BinaryStream, ByteOrder} from './binary-stream.js';

const $file = Symbol('file');

export class FFArchive {
    /**
     * @param blob {ArrayBuffer}
     * @param [index] {number}
     */
    constructor(blob, index) {
        const stream = new BinaryStream(blob, index || 0, ByteOrder.littleEndian);

        this.fileType = stream.readString(4); // Should be 'MQDB'
        stream.index += 24; // jumping to 0x1C

        /** @type {FFArchiveFile[]} */ this.files = readFilesFromArchive(stream);

        console.log('File list', this.files.map(f => { return { id: f.id, name: f.name }; }));

        const indexFile = this.files.find(x => x.name === '-INDEX.OPT');
        const animFile = this.files.find(x => x.name === '-ANIMS.OPT');
        const imageFile = this.files.find(x => x.name === '-IMAGES.OPT');

        let animationFrames = {};
        if (imageFile) {
            animationFrames = readAnimationFrameRegistry(imageFile.content);
            console.log('[-IMAGES.OPT] Animation frames registry', animationFrames);
        }
        if (indexFile) {
            this.animations = readIndexRegistry(indexFile.content, this.files, animationFrames);
            console.log('[-INDEX.OPT] Index registry', this.animations);
        }

        if (animFile) {
            this.animationRegistry = readAnimationRegistry(animFile.content);
            console.log('[-ANIMS.OPT] Animations registry', this.animationRegistry);
        }
    }
}

/**
 * @param id {number}
 * @param name {string}
 * @param content {Uint8Array}
 * @constructor
 */
function FFArchiveFile(id, name, content) {
    this.id = id;
    this.name = name;
    this.content = content;
}

class ImageAnimation {
    get id() { return this[$file].id; }

    get file() { return this[$file]; }

    /**
     * @param file {FFArchiveFile}
     */
    constructor(file) {
        /** @type {FFArchiveFile} */         this[$file] = file;
        /** @type {ImageAnimationFrame[]} */ this.frames = [];
    }
}

class ImageAnimationFrame {
    /**
     * @param frameId {string}
     * @param width {number}
     * @param height {number}
     * @param regions {ImageRegion[]}
     */
    constructor(frameId, width, height, regions) {
        this.id = frameId;
        this.width = width;
        this.height = height;
        this.regions = regions;
    }

    /**
     * @param stream {BinaryStream}
     * @returns ImageAnimationFrame
     */
    static deserialize(stream) {
        const frameId = stream.readNullTermString();
        const regionCount = stream.read4();
        const width = stream.read4();
        const height = stream.read4();
        const regions = new Array(regionCount);
        for (let i = 0; i < regionCount; i++) {
            regions[i] = ImageRegion.deserialize(stream);
        }

        return new ImageAnimationFrame(frameId, width, height, regions);
    }

    /**
     * @param stream {BinaryStream}
     */
    serialize(stream) {
        stream.writeNullTermString(this.id);
        stream.write4(this.regions.length);
        stream.write4(this.width);
        stream.write4(this.height);
        for (let region of this.regions) {
            region.serialize(stream);
        }
    }
}

// class ImageAnimationSequence {
//     constructor(id, frames) {
//     }
// }

/**
 * @param stream {BinaryStream}
 * @constructor
 */
class ImageRegion {
    constructor(dx, dy, sx, sy, w, h) {
        this.destX = dx | 0;
        this.destY = dy | 0;
        this.sourceX = sx | 0;
        this.sourceY = sy | 0;
        this.width = w | 0;
        this.height = h | 0;
    }

    /**
     * @param stream {BinaryStream}
     * @returns {ImageRegion}
     */
    static deserialize(stream) {
        const
            sx = stream.read4() | 0,
            sy = stream.read4() | 0,
            dx = stream.read4() | 0,
            dy = stream.read4() | 0,
            w = stream.read4() | 0,
            h = stream.read4() | 0;
        return new ImageRegion(sx, sy, dx, dy, w, h);
    }

    /**
     * @param stream {BinaryStream}
     */
    serialize(stream) {
        stream.write4(this.destX);
        stream.write4(this.destY);
        stream.write4(this.sourceX);
        stream.write4(this.sourceY);
        stream.write4(this.width);
        stream.write4(this.height);
    }
}

/**
 * @param stream {BinaryStream}
 * @returns {{id: number, name: string}[]}
 */
function readFileList(stream) {
    const count = stream.read4();
    const files = new Array(count);
    for (let i = 0; i < count; i++) {
        const name = stream.readString(256);
        const id = stream.read4();
        files[i] = { id, name };
    }

    return files;
}

/**
 * @param stream {BinaryStream}
 * @returns {FFArchiveFile[]}
 */
function readFilesFromArchive(stream) {
    // reading chunks
    const files = [];
    let fileList = [];
    while (!stream.isComplete) {
        const chunkHeader = stream.readString(4);
        if (chunkHeader !== 'MQRC') {
            throw new Error('Invalid file format: chunk header expected');
        }

        stream.index += 4;
        const id = stream.read4();
        const size = stream.read4();
        stream.index += 12;
        // const offset = stream.index;
        if (id === 2) {
            fileList = readFileList(stream);
        }
        else {
            const binary = stream.blob.subarray(stream.index, stream.index + size);
            stream.index += size;
            files.push({ id, binary });
        }
    }

    if (!fileList.length) {
        throw new Error('Invalid archive format. Archive list chunk is missing');
    }

    return fileList.map(item => {
        const file = files.find(x => x.id === item.id);
        const content = file ? file.binary : null;
        return new FFArchiveFile(item.id, item.name, content);
    });
}

/**
 * -INDEX.OPT
 * @param indexContent {Uint8Array}
 * @param fileList {FFArchiveFile[]}
 * @param animationFrames {Object.<string, ImageAnimationFrame>}
 * @returns {Object.<string, ImageAnimation>}
 */
function readIndexRegistry(indexContent, fileList, animationFrames) {
    let stream = new BinaryStream(indexContent, 0, ByteOrder.littleEndian);
    const animationCount = stream.read4();

    const animTable = {};
    for (let i = 0; i < animationCount; i++) {
        const fileId = stream.read4();
        const frameId = stream.readNullTermString();
        stream.index += 8;

        if (!animTable.hasOwnProperty(fileId)) {
            const file = fileList.find(x => x.id === fileId);
            if (!file) {
                continue;
            }
            animTable[fileId] = new ImageAnimation(file);
        }

        const frame = animationFrames[frameId];
        animTable[fileId].frames.push(frame);
    }
    return animTable;
}

/**
 * -ANIMS.OPT
 * @param animContent {Uint8Array}
 * @returns {Array}
 */
function readAnimationRegistry(animContent) {
    const stream = new BinaryStream(animContent, 0 , ByteOrder.littleEndian);
    const animations = [];
    const count = stream.read4();
    for (let i = 0; i < count; i++) {
        const name = stream.readNullTermString();
        animations.push({ name, index: i });
    }
    let animationNumber = 0;
    while (!stream.isComplete) {
        const sequenceNumber = stream.read4();
        animations.push({
            name,
            animationNumber,
            sequenceNumber
        });
        animationNumber++;
    }

    return animations;
}

/**
 * Returns list of animation frames (with image regions)
 * @param animFrameContent {Uint8Array}
 * @returns {Object.<string, ImageAnimationFrame>}
 */
function readAnimationFrameRegistry(animFrameContent) {
    const stream = new BinaryStream(animFrameContent, 0 , ByteOrder.littleEndian);
    const frames = {};
    while (!stream.isComplete) {
        stream.index += 0x040B; // 11 + 1024 bytes
        const framesCount = stream.read4();
        for (let i = 0; i < framesCount; i++) {
            const frame = ImageAnimationFrame.deserialize(stream);
            frames[frame.id] = frame;
        }
    }

    return frames;
}