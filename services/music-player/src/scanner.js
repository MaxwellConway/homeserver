const fs = require('fs').promises;
const path = require('path');
const { parseFile } = require('music-metadata');

class MusicScanner {
  constructor(database, musicDir) {
    this.db = database;
    this.musicDir = musicDir;
    this.isScanning = false;
    this.scanProgress = { current: 0, total: 0, status: 'idle' };
    this.audioExtensions = ['.mp3', '.flac', '.m4a', '.wav'];
  }

  async startBackgroundScan() {
    if (this.isScanning) {
      console.log('Scan already in progress');
      return;
    }

    this.isScanning = true;
    this.scanProgress = { current: 0, total: 0, status: 'scanning' };
    
    try {
      console.log('Starting background music scan...');
      await this.scanDirectory(this.musicDir);
      console.log('Background scan completed');
      this.scanProgress.status = 'completed';
    } catch (error) {
      console.error('Background scan failed:', error);
      this.scanProgress.status = 'error';
    } finally {
      this.isScanning = false;
    }
  }

  async scanDirectory(dir, relativePath = '', existingSongsCache = null) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      // First pass: count total files and load existing songs cache once
      if (relativePath === '') {
        this.scanProgress.total = await this.countAudioFiles(dir);
        console.log(`Found ${this.scanProgress.total} audio files to process`);
        // Load all songs once at the start instead of per-file
        existingSongsCache = await this.db.getAllSongs();
        console.log(`Loaded ${existingSongsCache.length} existing songs from database`);
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, relativeFilePath, existingSongsCache);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.audioExtensions.includes(ext)) {
            await this.processSongFile(fullPath, relativeFilePath, existingSongsCache);
            this.scanProgress.current++;
            
            // Log progress every 100 files
            if (this.scanProgress.current % 100 === 0) {
              console.log(`Processed ${this.scanProgress.current}/${this.scanProgress.total} files`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }

  async countAudioFiles(dir) {
    let count = 0;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          count += await this.countAudioFiles(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.audioExtensions.includes(ext)) {
            count++;
          }
        }
      }
    } catch (error) {
      console.error(`Error counting files in ${dir}:`, error.message);
    }
    
    return count;
  }

  async processSongFile(fullPath, relativeFilePath, existingSongsCache) {
    try {
      const stats = await fs.stat(fullPath);
      const lastModified = Math.floor(stats.mtime.getTime() / 1000);
      
      // Check if file already exists in database and hasn't been modified
      const existingSong = existingSongsCache?.find(song => song.path === relativeFilePath);
      
      if (existingSong && existingSong.lastModified >= lastModified) {
        // File hasn't changed, skip processing
        return;
      }

      // Parse metadata
      let metadata;
      try {
        metadata = await parseFile(fullPath);
      } catch (metadataError) {
        console.warn(`Could not parse metadata for ${fullPath}:`, metadataError.message);
        metadata = { common: {}, format: {} };
      }

      const songData = {
        filename: path.basename(relativeFilePath),
        path: relativeFilePath,
        audioUrl: `/audio/${relativeFilePath}`,
        title: metadata.common.title || path.basename(relativeFilePath, path.extname(relativeFilePath)),
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || 'Unknown Album',
        albumArtist: metadata.common.albumartist || metadata.common.artist || 'Unknown Artist',
        genre: metadata.common.genre ? metadata.common.genre.join(', ') : 'Unknown',
        year: metadata.common.year || null,
        track: metadata.common.track?.no || null,
        duration: metadata.format.duration || 0,
        size: stats.size,
        artworkUrl: `/api/artwork/${encodeURIComponent(relativeFilePath)}`,
        lastModified: lastModified
      };

      await this.db.upsertSong(songData);
    } catch (error) {
      console.error(`Error processing ${fullPath}:`, error.message);
    }
  }

  getScanProgress() {
    return this.scanProgress;
  }

  async quickScan() {
    // Quick scan to check if any new files exist
    try {
      const lastScanTime = await this.db.getLastScanTime();
      const currentTime = Math.floor(Date.now() / 1000);
      
      // If last scan was less than 5 minutes ago, skip
      if (currentTime - lastScanTime < 300) {
        return false;
      }

      // Check if music directory has been modified recently
      const stats = await fs.stat(this.musicDir);
      const dirModified = Math.floor(stats.mtime.getTime() / 1000);
      
      if (dirModified > lastScanTime) {
        console.log('Music directory modified, starting background scan...');
        this.startBackgroundScan();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Quick scan error:', error);
      return false;
    }
  }
}

module.exports = MusicScanner;
