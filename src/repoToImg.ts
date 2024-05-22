import { createCanvas } from 'canvas';
import { writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import * as path from 'path';

const CHUNK_SIZE = 1024; // Adjust as needed

// Function to convert string to binary
function stringToBinary(str: string): string {
    return str.split('').map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
}

// Function to escape special characters in a string
function escapeSpecialChars(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

// Function to read all files in a directory recursively and in chunks
function readFilesRecursively(dir: string): string[] {
    let result = '';

    function readDirectory(directory: string): void {
        const files = readdirSync(directory);

        files.forEach(file => {
            const filePath = path.join(directory, file);
            const stat = statSync(filePath);

            if (stat.isDirectory()) {
                readDirectory(filePath);
            } else {
                const fileContents = readFileSync(filePath, 'utf-8');
                result += `\n=== ${escapeSpecialChars(filePath)} ===\n` + fileContents;
            }
        });
    }

    readDirectory(dir);
    return chunkData(result);
}

// Function to chunk data into smaller pieces
function chunkData(data: string): string[] {
    const chunks = [];
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        chunks.push(data.slice(i, i + CHUNK_SIZE));
    }
    return chunks;
}

// Function to encode a chunk into an image
function encodeChunkToImage(chunk: string, imagePath: string): void {
    const binaryData = stringToBinary(chunk);
    if (binaryData.length === 0) {
        throw new Error('Binary data length is zero');
    }
    const imageSize = Math.ceil(Math.sqrt(binaryData.length));
    const canvas = createCanvas(imageSize, imageSize);
    const context = canvas.getContext('2d');

    let index = 0;
    for (let i = 0; i < imageSize; i++) {
        for (let j = 0; j < imageSize; j++) {
            if (index < binaryData.length) {
                const color = binaryData[index] === '1' ? 255 : 0;
                context.fillStyle = `rgb(${color}, ${color}, ${color})`;
                context.fillRect(j, i, 1, 1);
                index++;
            } else {
                context.fillStyle = 'rgb(0, 0, 0)';
                context.fillRect(j, i, 1, 1);
            }
        }
    }

    const buffer = canvas.toBuffer('image/png');
    writeFileSync(imagePath, buffer);

    console.log(`Successfully created image: ${imagePath}`);
}

// Function to process repository data into multiple images
function repoToMultipleImages(repoPath: string, outputDir: string): void {
    const chunks = readFilesRecursively(repoPath);

    chunks.forEach((chunk, index) => {
        const imagePath = path.join(outputDir, `chunk_${index}.png`);
        encodeChunkToImage(chunk, imagePath);
    });

    console.log('Successfully created multiple images from repository.');
}

// Example usage
const repoPath = './go-ethereum'; // Path to the cloned repository
const outputDir = './images'; // Directory to save the generated images

repoToMultipleImages(repoPath, outputDir);
