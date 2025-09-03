const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class ScreenshotGenerator {
    constructor(outputDir = '/tmp/screenshots') {
        this.outputDir = outputDir;
        this.ensureOutputDir();
    }

    async ensureOutputDir() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create output directory:', error);
        }
    }

    generateRandomTimestamp(durationSeconds) {
        // Skip first and last 10% to avoid credits/intros
        const skipStart = Math.floor(durationSeconds * 0.1);
        const skipEnd = Math.floor(durationSeconds * 0.9);
        const availableDuration = skipEnd - skipStart;
        
        if (availableDuration <= 0) {
            return Math.floor(durationSeconds / 2); // Fallback to middle
        }
        
        return skipStart + Math.floor(Math.random() * availableDuration);
    }

    async generateScreenshot(videoPath, durationSeconds) {
        return new Promise((resolve, reject) => {
            const timestamp = this.generateRandomTimestamp(durationSeconds);
            const filename = `screenshot_${crypto.randomBytes(8).toString('hex')}.jpg`;
            const outputPath = path.join(this.outputDir, filename);

            console.log(`Generating screenshot from ${videoPath} at ${timestamp}s`);

            ffmpeg(videoPath)
                .seekInput(timestamp)
                .frames(1)
                .size('1280x720')
                .format('image2')
                .on('end', () => {
                    console.log(`Screenshot saved: ${outputPath}`);
                    resolve({
                        path: outputPath,
                        filename: filename,
                        timestamp: timestamp
                    });
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .save(outputPath);
        });
    }

    async cleanupOldScreenshots(maxAge = 3600000) { // 1 hour default
        try {
            const files = await fs.readdir(this.outputDir);
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(this.outputDir, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`Cleaned up old screenshot: ${file}`);
                }
            }
        } catch (error) {
            console.error('Failed to cleanup old screenshots:', error);
        }
    }
}

module.exports = ScreenshotGenerator;
