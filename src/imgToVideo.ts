import * as ffmpeg from 'fluent-ffmpeg';
import { readdirSync, renameSync } from 'fs';
import * as path from 'path';

// Function to rename images sequentially
function renameImagesSequentially(imagesDir: string): void {
    const files = readdirSync(imagesDir).filter(file => file.endsWith('.png'));

    files.forEach((file, index) => {
        const oldPath = path.join(imagesDir, file);
        const newPath = path.join(imagesDir, `frame_${index.toString().padStart(5, '0')}.png`);
        renameSync(oldPath, newPath);
    });

    console.log('Images renamed sequentially.');
}

// Function to convert images to a video
function imagesToVideo(imagesDir: string, videoPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(path.join(imagesDir, 'frame_%05d.png'))
            .inputOptions(['-framerate 1000']) // Adjust the frame rate as needed
            .outputOptions([
                '-c:v libx264',
                '-pix_fmt yuv420p',
                '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2'
            ])
            .save(videoPath)
            .on('end', () => {
                console.log(`Successfully created video: ${videoPath}`);
                resolve();
            })
            .on('error', (err) => {
                console.error(`FFmpeg error: ${err.message}`);
                reject(err);
            });
    });
}

// Example usage
const imagesDir = './images'; // Directory containing the images
const videoPath = './output_video.mp4'; // Path to save the video

// renameImagesSequentially(imagesDir);

// Convert images to video
imagesToVideo(imagesDir, videoPath)
    .then(() => {
        console.log('Video creation completed.');
    })
    .catch((err) => {
        console.error('Error during video creation:', err);
    });
