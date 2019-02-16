'use strict';

/*
Configures.
 */
const BIT_FOR_DATA_PART = 4;

/*
Constants.
 */
const BIT_FOR_BYTE = 8;
const START_OF_TEXT = '\u0002';
const END_OF_TEXT = '\u0003';

/*
Modules.
 */
const Jimp = require('jimp');

const [ENGINE, THIS_FILE, MODE, INPUT_FILE, OUTPUT_FILE, MESSAGE] = process.argv;

const Color = class {
    constructor(colorInt, pixel, colorName) {
        this.colorInt = colorInt;
        this.pixel = pixel;
        this.colorName = colorName;
        this.BIT_FOR_COLOR = 8;
    }

    fillData(data, bitForDataPart) {
        this.colorInt &= (2 ** bitForDataPart - 1) << (this.BIT_FOR_COLOR - bitForDataPart);// Clean space for data.
        this.colorInt += data;
        this.pixel.picture.setPixelColor(Jimp.rgbaToInt(this.pixel.red.colorInt, this.pixel.green.colorInt, this.pixel.blue.colorInt, 255), this.pixel.x, this.pixel.y);
    }

    getData(bitForDataPart) {
        return this.colorInt & (2 ** bitForDataPart - 1);
    }
};

const Pixel = class {
    constructor(picture, x, y) {
        this.picture = picture;
        this.x = x;
        this.y = y;
        this.allColorInt = picture.getPixelColor(this.x, this.y);

        {
            const colorRGBA = Jimp.intToRGBA(this.allColorInt);
            this.red = new Color(colorRGBA.r, this, 'red');
            this.green = new Color(colorRGBA.g, this, 'green');
            this.blue = new Color(colorRGBA.b, this, 'blue');
        }
    }

    * [Symbol.iterator]() {
        yield this.red;
        yield this.green;
        yield this.blue;
    }
};

const Picture = class {
    constructor(path) {
        return (async () => {
            this.picture = await Jimp.read(path);
            this.pixelMatrix = [];

            const {height, width} = this.picture.bitmap;
            for (let currentHeight = 0; currentHeight < height; currentHeight++) {
                const row = [];
                for (let currentWidth = 0; currentWidth < width; currentWidth++) {
                    row.push(new Pixel(this.picture, currentWidth, currentHeight));
                }
                this.pixelMatrix.push(row);
            }
            return this;
        })();
    }

    getPixel(x, y) {
        return this.pixelMatrix[x][y];
    }

    async save(path) {
        await this.picture.quality(100).writeAsync(path);
    }

    clone() {
        return this.picture.clone();
    }

    * [Symbol.iterator]() {
        for (const row of this.pixelMatrix) {
            for (const pixel of row) {
                yield pixel;
            }
        }
    }
};

const Message = class {
    /**
     * @param {String|Buffer} stringOrBuffer
     */
    constructor(stringOrBuffer) {
        if (typeof stringOrBuffer === 'string') {
            this.message = stringOrBuffer;
            this.buffer = Buffer.from(this.message, 'utf8');
        } else if (Buffer.isBuffer(stringOrBuffer)) {
            this.buffer = stringOrBuffer;
            this.message = this.buffer.toString('utf8');
        } else {
            throw(new Error('stringOrBuffer should be String of Buffer.'));
        }

        this.bitArray = (() => {
            const bitArray = [];
            for (const byte of this.buffer) {
                for (let bitCount = BIT_FOR_BYTE; bitCount > 0; bitCount--) {
                    const powerfulNumber = bitCount - 1;
                    bitArray.push(((2 ** powerfulNumber) & byte) >> powerfulNumber);
                }
            }
            return bitArray;
        })();
    }

    splitByBits(bitForDataPart) {
        if (BIT_FOR_BYTE % bitForDataPart !== 0) {
            throw(new Error(`bitPerPart should be one of divisors of ${BIT_FOR_BYTE}.`));
        }

        return (() => {
            const dataArray = [];

            const bitGroupArray = (() => {
                const bitGroupArray = [];
                let cache = [];
                for (const bit of this.bitArray) {
                    cache.push(bit);
                    if (cache.length === bitForDataPart) {
                        bitGroupArray.push(cache);
                        cache = [];
                    }
                }
                return bitGroupArray;
            })();

            for (const bitGroup of bitGroupArray) {
                let data = 0;
                for (let bitCount = 0; bitCount < bitGroup.length; bitCount++) {
                    data += (2 ** (bitForDataPart - bitCount - 1)) * bitGroup[bitCount];
                }
                dataArray.push(data);
            }

            return dataArray;
        })();
    }

    static joinByBits(bitForDataPart, dataArray) {
        const bitGroupArray = (() => {
            const bitGroupArray = [];
            for (const data of dataArray) {
                let cache = [];
                for (let bitCount = bitForDataPart; bitCount > 0; bitCount--) {
                    cache.push((data & (2 ** (bitCount - 1))) >> (bitCount - 1));
                }
                bitGroupArray.push(cache);
            }
            return bitGroupArray;
        })();

        const bitArray = (() => {
            const bitArray = [];
            for (const bitGroup of bitGroupArray) {
                bitArray.push(...bitGroup);
            }
            return bitArray;
        })();

        const buffer = Buffer.from((() => {
            const byteArray = [];
            let data = 0;
            for (let bitIndex = 0; bitIndex < bitArray.length; bitIndex++) {
                data += bitArray[bitIndex] << (BIT_FOR_BYTE - (bitIndex % 8) - 1);
                {
                    const bitCount = bitIndex + 1;
                    if (bitCount % 8 === 0) {
                        byteArray.push(data);
                        data = 0;
                    }
                }
            }
            return byteArray;
        })());

        return new Message(buffer);
    }

    getMessage() {
        return this.message;
    }
};

const Encoder = class {
    constructor(sourcePicturePath, message) {
        return (async () => {
            this.sourcePicture = await (new Picture(sourcePicturePath));
            this.message = new Message(message);
            return this;
        })();
    }

    async encode(bitForDataPart, outputPath) {
        const bitArray = this.message.splitByBits(bitForDataPart);
        let bitArrayIndex = 0;

        for (const pixel of this.sourcePicture) {
            for (const color of pixel) {
                let data = (() => {
                    if (bitArrayIndex < bitArray.length) {
                        return bitArray[bitArrayIndex];
                    } else {
                        return 0;
                    }
                })();

                color.fillData(data, bitForDataPart);
                bitArrayIndex++;
            }
        }

        await this.sourcePicture.save(outputPath);
    }
};

const Decoder = class {
    constructor(pictureToBeDecodePath) {
        return (async () => {
            this.pictureToBeDecode = await (new Picture(pictureToBeDecodePath));
            return this;
        })();
    }

    decode(bitForDataPart) {
        const dataArray = [];
        for (const pixel of this.pictureToBeDecode) {
            for (const color of pixel) {
                dataArray.push(color.getData(bitForDataPart));
            }
        }
        const message = Message.joinByBits(bitForDataPart, dataArray);

        console.log(message.getMessage());
    }
};

(async () => {
    switch (MODE) {
        case 'e':
            const encoder = await (new Encoder(INPUT_FILE, MESSAGE));
            encoder.encode(BIT_FOR_DATA_PART, OUTPUT_FILE);
            break;
        case 'd':
            const decoder = await (new Decoder(INPUT_FILE));
            decoder.decode(BIT_FOR_DATA_PART);
            break;
    }
})();
