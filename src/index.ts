import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, readFileSync } from 'fs';
import * as ffmpeg from 'fluent-ffmpeg';

// Function to convert string to binary
function stringToBinary(str: string): string {
    return str.split('').map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
}

// Function to convert binary to string
function binaryToString(binary: string): string {
    return binary.match(/.{1,8}/g)?.map(byte => {
        return String.fromCharCode(parseInt(byte, 2));
    }).join('') || '';
}

// Function to encode data into a video
function encodeDataToVideo(data: string, videoPath: string): void {
    const binaryData = stringToBinary(data);

    const imageSize = Math.ceil(Math.sqrt(binaryData.length));
    const canvas = createCanvas(imageSize, imageSize);
    const context = canvas.getContext('2d');
    console.log(imageSize)

    let index = 0;
    for (let i = 0; i < imageSize; i++) {
        for (let j = 0; j < imageSize; j++) {
            if (index < binaryData.length) {
                const color = binaryData[index] === '1' ? 255 : 0;
                context.fillStyle = `rgb(${color}, ${color}, ${color})`;
                context.fillRect(j, i, 1, 1);
                index++;
            }
        }
    }

    const buffer = canvas.toBuffer('image/png');
    writeFileSync('videos/encoded_image.png', buffer);

    const command = ffmpeg();
    for (let i = 0; i < 10; i++) {
        command.input('videos/encoded_image.png');
    }
    command.inputOptions(['-framerate 1'])
        .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
        .save(videoPath);
}

// Function to decode data from a video
function decodeDataFromVideo(videoPath: string): void {
    ffmpeg(videoPath)
        .output('videos/frame_%d.png')
        .outputOptions(['-vf fps=1'])
        .on('end', () => {
            const imageBuffer = readFileSync('videos/encoded_image.png');
            loadImage(imageBuffer).then(image => {
                const canvas = createCanvas(image.width, image.height);
                const context = canvas.getContext('2d');
                context.drawImage(image, 0, 0);

                let binaryData = '';
                for (let i = 0; i < image.width; i++) {
                    for (let j = 0; j < image.height; j++) {
                        const { data } = context.getImageData(j, i, 1, 1);
                        binaryData += data[0] === 255 ? '1' : '0';
                    }
                }

                const decodedData = binaryToString(binaryData);
                console.log('Decoded data:', decodedData);
            });
        })
        .run();
}

// Ethereum genesis block data
const genesisBlock = {
  "config": {
    "chainId": 1,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 4370000,
    "constantinopleBlock": 7280000,
    "petersburgBlock": 7280000
  },
  "nonce": "0x0000000000000042",
  "timestamp": "0x00",
  "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "extraData": "0x11bbe8db4bfmefc74d8fc2b3cbce92c82b2417094cfaea9a2b0fef9cbec8f8ee",
  "gasLimit": "0x1388",
  "difficulty": "0x400",
  "alloc": {
    "0000000000000000000000000000000000000001": { "balance": "1" },
    "0000000000000000000000000000000000000002": { "balance": "1" }
  }
}

const genesisBlockString = JSON.stringify(genesisBlock)
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/"/g, '\\"');   // Escape double quotes
const videoPath = 'videos/encoded_video.mp4';
encodeDataToVideo(genesisBlockString, videoPath);
//decodeDataFromVideo(videoPath); // Uncomment to test decoding