const fs = require('fs').promises;
const path = require('path');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');
const MetadataService = require('./metadata');

class VideoScanner {
    constructor(database) {
        this.db = database;
        this.supportedExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
        this.scanning = false;
        this.metadataService = new MetadataService();
    }

    async scanDirectory(mediaPath = '/media') {
        if (this.scanning) {
            console.log('Scan already in progress');
            return;
        }

        this.scanning = true;
        console.log('Starting video library scan...');
        
        try {
            await this.db.updateScanStatus(true);
            
            const videoFiles = await this.findVideoFiles(mediaPath);
            console.log(`Found ${videoFiles.length} video files`);
            
            await this.db.updateScanStatus(true, videoFiles.length, 0);
            
            let processed = 0;
            for (const filePath of videoFiles) {
                try {
                    await this.processVideoFile(filePath);
                    processed++;
                    await this.db.updateScanStatus(true, videoFiles.length, processed);
                    
                    if (processed % 10 === 0) {
                        console.log(`Processed ${processed}/${videoFiles.length} files`);
                    }
                } catch (error) {
                    console.error(`Error processing ${filePath}:`, error.message);
                }
            }
            
            console.log(`Scan completed. Processed ${processed} files.`);
            await this.db.updateScanStatus(false);
            
        } catch (error) {
            console.error('Error during scan:', error);
            await this.db.updateScanStatus(false);
        } finally {
            this.scanning = false;
        }
    }

    async findVideoFiles(dirPath) {
        const videoFiles = [];
        
        try {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item.name);
                
                if (item.isDirectory()) {
                    // Skip hidden directories and common non-media directories
                    if (!item.name.startsWith('.') && 
                        !['lost+found', 'System Volume Information'].includes(item.name)) {
                        const subFiles = await this.findVideoFiles(fullPath);
                        videoFiles.push(...subFiles);
                    }
                } else if (item.isFile()) {
                    const ext = path.extname(item.name).toLowerCase();
                    if (this.supportedExtensions.includes(ext)) {
                        videoFiles.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error.message);
        }
        
        return videoFiles;
    }

    async processVideoFile(filePath) {
        try {
            const fileName = path.basename(filePath);
            const stats = await fs.stat(filePath);
            
            // Extract video metadata using ffprobe
            const metadata = await this.getVideoMetadata(filePath);
            
            // Parse title and type from file path and name
            const parsedInfo = this.parseVideoInfo(filePath, fileName);
            
            // Fetch metadata from TMDB if available
            let tmdbMetadata = null;
            try {
                const cleanTitle = this.metadataService.cleanTitle(parsedInfo.title);
                if (parsedInfo.type === 'movie') {
                    tmdbMetadata = await this.metadataService.searchMovie(cleanTitle, parsedInfo.year);
                } else if (parsedInfo.type === 'tv') {
                    tmdbMetadata = await this.metadataService.searchTVShow(cleanTitle, parsedInfo.year);
                }
            } catch (error) {
                console.error(`Error fetching TMDB metadata for ${parsedInfo.title}:`, error.message);
            }
            
            const videoData = {
                title: parsedInfo.title,
                filePath: filePath,
                fileName: fileName,
                type: parsedInfo.type,
                year: parsedInfo.year,
                season: parsedInfo.season,
                episode: parsedInfo.episode,
                duration: metadata.duration,
                resolution: metadata.resolution,
                codec: metadata.codec,
                audioCodec: metadata.audioCodec,
                fileSize: stats.size,
                thumbnailPath: null,
                posterUrl: tmdbMetadata?.poster_path || null,
                backdropUrl: tmdbMetadata?.backdrop_path || null,
                overview: tmdbMetadata?.overview || null,
                tmdbId: tmdbMetadata?.tmdb_id || null,
                voteAverage: tmdbMetadata?.vote_average || null
            };
            
            await this.db.addVideo(videoData);
            
        } catch (error) {
            console.error(`Error processing video file ${filePath}:`, error.message);
            throw error;
        }
    }

    async getVideoMetadata(filePath) {
        try {
            // Use direct ffprobe command to get format info including duration
            const { spawn } = require('child_process');
            
            const getDuration = () => {
                return new Promise((resolve) => {
                    const ffprobe = spawn('ffprobe', [
                        '-v', 'quiet',
                        '-show_format',
                        '-select_streams', 'v:0',
                        filePath
                    ]);
                    
                    let output = '';
                    ffprobe.stdout.on('data', (data) => {
                        output += data.toString();
                    });
                    
                    ffprobe.on('close', () => {
                        const durationMatch = output.match(/duration=([0-9.]+)/);
                        const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;
                        resolve(duration);
                    });
                    
                    ffprobe.on('error', () => resolve(0));
                });
            };
            
            const info = await ffprobe(filePath, { path: ffprobeStatic.path });
            const duration = await getDuration();
            
            const videoStream = info.streams ? info.streams.find(stream => stream.codec_type === 'video') : null;
            const audioStream = info.streams ? info.streams.find(stream => stream.codec_type === 'audio') : null;
            
            return {
                duration: duration || 0,
                resolution: videoStream && videoStream.width && videoStream.height ? 
                    `${videoStream.width}x${videoStream.height}` : 'Unknown',
                codec: videoStream && videoStream.codec_name ? videoStream.codec_name : 'Unknown',
                audioCodec: audioStream && audioStream.codec_name ? audioStream.codec_name : 'Unknown'
            };
        } catch (error) {
            console.error(`Error getting metadata for ${filePath}:`, error.message);
            return {
                duration: 0,
                resolution: 'Unknown',
                codec: 'Unknown',
                audioCodec: 'Unknown'
            };
        }
    }

    parseVideoInfo(filePath, fileName) {
        const pathParts = filePath.split(path.sep);
        const nameWithoutExt = path.parse(fileName).name;
        
        // Default values
        let title = nameWithoutExt;
        let type = 'movie';
        let year = null;
        let season = null;
        let episode = null;
        
        // Check if it's in a TV show structure (contains season/episode info)
        const tvPatterns = [
            /[Ss](\d+)[Ee](\d+)/,  // S01E01
            /[Ss]eason\s*(\d+).*[Ee]pisode\s*(\d+)/i,  // Season 1 Episode 1
            /(\d+)x(\d+)/  // 1x01
        ];
        
        for (const pattern of tvPatterns) {
            const match = nameWithoutExt.match(pattern);
            if (match) {
                type = 'tv';
                season = parseInt(match[1]);
                episode = parseInt(match[2]);
                
                // Extract show title (everything before season/episode info)
                title = nameWithoutExt.substring(0, match.index).trim();
                if (title.endsWith('.') || title.endsWith('-')) {
                    title = title.slice(0, -1).trim();
                }
                break;
            }
        }
        
        // If no season/episode found but path suggests TV show structure
        if (type === 'movie') {
            const tvKeywords = ['season', 'episode', 'series', 'show'];
            const pathLower = filePath.toLowerCase();
            
            if (tvKeywords.some(keyword => pathLower.includes(keyword))) {
                type = 'tv';
                
                // Try to extract show name from parent directories
                const relevantParts = pathParts.filter(part => 
                    part && !part.toLowerCase().includes('season') && 
                    !part.toLowerCase().includes('episode')
                );
                
                if (relevantParts.length > 1) {
                    title = relevantParts[relevantParts.length - 2] || title;
                }
            }
        }
        
        // Extract year from title or filename
        const yearMatch = nameWithoutExt.match(/\((\d{4})\)|\[(\d{4})\]|(\d{4})/);
        if (yearMatch) {
            year = parseInt(yearMatch[1] || yearMatch[2] || yearMatch[3]);
            // Remove year from title if it was extracted
            title = title.replace(/\s*\(?\d{4}\)?\s*/, '').trim();
        }
        
        // Clean up title
        title = title
            .replace(/[._-]/g, ' ')  // Replace dots, underscores, dashes with spaces
            .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
            .trim();
        
        // Capitalize title properly
        title = title.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        return { title, type, year, season, episode };
    }

    async getProgress() {
        return await this.db.getScanStatus();
    }

    isScanning() {
        return this.scanning;
    }
}

module.exports = VideoScanner;
