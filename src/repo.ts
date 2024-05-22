import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, readFileSync, readdirSync, statSync, unlinkSync, mkdirSync } from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';

const CHUNK_SIZE = 1024; // Adjust as needed

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

// Function to escape special characters in a string
function escapeSpecialChars(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

// Function to read all files in a directory recursively
function readFilesRecursively(dir: string): string {
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
    return result;
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

    if (!verifyFile(imagePath)) {
        throw new Error(`Failed to create image file: ${imagePath}`);
    }

    console.log(`Successfully created image: ${imagePath}`);
}

// Function to convert repository data to a single image
function repoToImage(repoPath: string, imagePath: string): void {
    const repoContents = readFilesRecursively(repoPath);
    const binaryData = stringToBinary(repoContents);
    
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

// Function to verify if a file exists and is readable
function verifyFile(filePath: string): boolean {
    try {
        const stats = statSync(filePath);
        return stats.isFile();
    } catch (error) {
        console.error(`Error verifying file: ${filePath}`, error);
        return false;
    }
}


// Function to encode a chunk into a video
function encodeChunkToVideo(imagePath: string, videoPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!verifyFile(imagePath)) {
            return reject(new Error(`File verification failed: ${imagePath}`));
        }

        console.log(`Encoding ${imagePath} to ${videoPath}`);
        ffmpeg()
            .input(imagePath)
            .inputOptions(['-framerate 1'])
            .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
            .save(videoPath)
            .on('end', () => {
                console.log(`Successfully encoded ${videoPath}`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`FFmpeg error for file: ${imagePath}`, err);
                reject(err);
            });
    });
}



// Function to decode an image to a chunk
async function decodeImageToChunk(imagePath: string): Promise<string> {
    const imageBuffer = readFileSync(imagePath);
    const image = await loadImage(imageBuffer);
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

    return binaryToString(binaryData);
}

// Function to decode a video to an image
function decodeVideoToImage(videoPath: string, imagePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`Decoding ${videoPath} to ${imagePath}`);
        ffmpeg(videoPath)
            .output(imagePath)
            .outputOptions(['-vf fps=1'])
            .on('end', () => {
                if (verifyFile(imagePath)) {
                    console.log(`Successfully decoded ${imagePath}`);
                    resolve();
                } else {
                    reject(new Error(`Failed to create image file: ${imagePath}`));
                }
            })
            .on('error', (err) => {
                console.error(`FFmpeg error for video: ${videoPath}`, err);
                reject(err);
            })
            .run();
    });
}


// Function to encode repository data to multiple video chunks
async function encodeRepoToVideos(repoPath: string, outputDir: string): Promise<void> {
    const repoContents = readFilesRecursively(repoPath);
    const chunks = chunkData(repoContents);

    for (let i = 0; i < chunks.length; i++) {
        const imagePath = path.join(outputDir, `chunk_${i}.png`);
        const videoPath = path.join(outputDir, `chunk_${i}.mp4`);
        
        encodeChunkToImage(chunks[i], imagePath);
        
        if (!verifyFile(imagePath)) {
            throw new Error(`Failed to create image file: ${imagePath}`);
        }

        await encodeChunkToVideo(imagePath, videoPath);
        unlinkSync(imagePath); // Clean up image file after encoding to video
    }
}


// Function to decode video chunks back to repository data
async function decodeVideosToRepo(videoDir: string, outputDir: string): Promise<void> {
    const videoFiles = readdirSync(videoDir).filter(file => file.endsWith('.mp4'));
    let reconstructedData = '';

    for (let i = 0; i < videoFiles.length; i++) {
        const videoPath = path.join(videoDir, `chunk_${i}.mp4`);
        const imagePath = path.join(videoDir, `chunk_${i}.png`);
        await decodeVideoToImage(videoPath, imagePath);
        reconstructedData += await decodeImageToChunk(imagePath);
        unlinkSync(imagePath); // Clean up image file after decoding from video
    }

    writeDecodedDataToFiles(reconstructedData, outputDir);
}

// Function to write decoded data back to files
function writeDecodedDataToFiles(data: string, basePath: string): void {
    const files = data.split('\n===');
    files.forEach(fileContent => {
        const [filePath, ...content] = fileContent.split('\n');
        if (filePath && content.length > 0) {
            const fullPath = path.join(basePath, filePath.trim());
            mkdirSync(path.dirname(fullPath), { recursive: true });
            writeFileSync(fullPath, content.join('\n'), 'utf-8');
        }
    });
}

// Example usage
const repoPath = './go-ethereum'; // Path to the cloned repository
const outputDir = './videos'; // Directory to store the encoded video chunks
const reconstructedDir = './reconstructed'; // Directory to store the reconstructed repository

// encodeRepoToVideos(repoPath, outputDir)
//     .then(() => {
//         console.log('Encoding completed');
//         //return decodeVideosToRepo(outputDir, reconstructedDir);
//     })
//     // .then(() => {
//     //     console.log('Decoding completed');
//     // })
//     .catch(err => {
//         console.error('Error:', err);
//     });
