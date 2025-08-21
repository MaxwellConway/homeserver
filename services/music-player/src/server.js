const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { parseFile } = require('music-metadata');

const app = express();
const PORT = 3000;
const MUSIC_DIR = '/music';

// Supported audio file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.m4a', '.wav'];

// Cache for scanned songs
let songsCache = [];
let lastScanTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve audio files directly from music directory
app.use('/audio', express.static(MUSIC_DIR));

// Recursively scan directory for audio files
async function scanMusicDirectory(dir, relativePath = '') {
  const songs = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subSongs = await scanMusicDirectory(fullPath, relativeFilePath);
        songs.push(...subSongs);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (AUDIO_EXTENSIONS.includes(ext)) {
          try {
            // Get basic metadata
            const metadata = await parseFile(fullPath);
            
            songs.push({
              filename: entry.name,
              path: relativeFilePath,
              audioUrl: `/audio/${relativeFilePath}`,
              title: metadata.common.title || entry.name,
              artist: metadata.common.artist || 'Unknown Artist',
              album: metadata.common.album || 'Unknown Album',
              duration: metadata.format.duration || 0,
              size: (await fs.stat(fullPath)).size
            });
          } catch (metadataError) {
            // If metadata parsing fails, still include the file with basic info
            console.warn(`Could not parse metadata for ${fullPath}:`, metadataError.message);
            songs.push({
              filename: entry.name,
              path: relativeFilePath,
              audioUrl: `/audio/${relativeFilePath}`,
              title: entry.name,
              artist: 'Unknown Artist',
              album: 'Unknown Album',
              duration: 0,
              size: (await fs.stat(fullPath)).size
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }
  
  return songs;
}

// API endpoint to get all songs
app.get('/api/songs', async (req, res) => {
  try {
    const now = Date.now();
    
    // Use cache if it's still fresh
    if (songsCache.length > 0 && (now - lastScanTime) < CACHE_DURATION) {
      return res.json(songsCache);
    }
    
    console.log('Scanning music directory...');
    songsCache = await scanMusicDirectory(MUSIC_DIR);
    lastScanTime = now;
    
    console.log(`Found ${songsCache.length} audio files`);
    res.json(songsCache);
  } catch (error) {
    console.error('Error scanning music directory:', error);
    res.status(500).json({ error: 'Failed to scan music directory' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the main page for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Music player server running on port ${PORT}`);
  console.log(`Music directory: ${MUSIC_DIR}`);
  
  // Initial scan on startup
  scanMusicDirectory(MUSIC_DIR)
    .then(songs => {
      songsCache = songs;
      lastScanTime = Date.now();
      console.log(`Initial scan complete: ${songs.length} audio files found`);
    })
    .catch(error => {
      console.error('Initial scan failed:', error);
    });
});
