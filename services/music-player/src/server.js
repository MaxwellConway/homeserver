const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs').promises;
const { parseFile } = require('music-metadata');
const MusicDatabase = require('./database');
const MusicScanner = require('./scanner');

const app = express();
const PORT = 3000;
const MUSIC_DIR = '/music';

// Initialize database and scanner
const db = new MusicDatabase();
const scanner = new MusicScanner(db, MUSIC_DIR);

// Enable compression for all responses
app.use(compression());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve audio files directly from music directory
app.use('/audio', express.static(MUSIC_DIR));

// Cache control middleware for API responses
app.use('/api', (req, res, next) => {
  // Cache API responses for 5 minutes
  res.set('Cache-Control', 'public, max-age=300');
  next();
});

// API endpoint to get songs with pagination and search
app.get('/api/songs', async (req, res) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    
    let songs;
    if (search) {
      // Use database search for better performance
      songs = await db.getSongsBySearch(search, limit * 10); // Get more for pagination
    } else {
      // Get all songs from database
      songs = await db.getAllSongs();
    }
    
    // Calculate pagination
    const totalSongs = songs.length;
    const totalPages = Math.ceil(totalSongs / limit);
    const offset = (page - 1) * limit;
    const paginatedSongs = songs.slice(offset, offset + limit);
    
    res.json({
      songs: paginatedSongs,
      pagination: {
        page,
        limit,
        totalSongs,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      search,
      scanProgress: scanner.getScanProgress()
    });
  } catch (error) {
    console.error('Error getting songs:', error);
    res.status(500).json({ error: 'Failed to get songs' });
  }
});

// API endpoint to get total song count (for initial load)
app.get('/api/songs/count', async (req, res) => {
  try {
    const songs = await db.getAllSongs();
    res.json({ 
      count: songs.length,
      scanProgress: scanner.getScanProgress()
    });
  } catch (error) {
    console.error('Error getting song count:', error);
    res.status(500).json({ error: 'Failed to get song count' });
  }
});

// API endpoint to get artwork from music files
app.get('/api/artwork/:filePath(*)', async (req, res) => {
  try {
    const filePath = decodeURIComponent(req.params.filePath);
    const fullPath = path.join(MUSIC_DIR, filePath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Try to extract artwork
    try {
      const metadata = await parseFile(fullPath);
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        res.set('Content-Type', picture.format);
        res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        return res.send(picture.data);
      }
    } catch (error) {
      console.warn(`Could not extract artwork from ${fullPath}:`, error.message);
    }
    
    // Return default placeholder
    res.status(404).json({ error: 'No artwork found' });
  } catch (error) {
    console.error('Error serving artwork:', error);
    res.status(500).json({ error: 'Failed to serve artwork' });
  }
});

// API endpoint to get albums with artwork
app.get('/api/albums', async (req, res) => {
  try {
    const albums = await db.getAlbums();
    res.json(albums);
  } catch (error) {
    console.error('Error getting albums:', error);
    res.status(500).json({ error: 'Failed to get albums' });
  }
});

// API endpoint to get specific album details
app.get('/api/album/:artist/:album', async (req, res) => {
  try {
    const { artist, album } = req.params;
    const decodedArtist = decodeURIComponent(artist);
    const decodedAlbum = decodeURIComponent(album);
    
    const albumSongs = await db.getAlbumDetails(decodedArtist, decodedAlbum);
    
    if (albumSongs.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    // Create album info
    const albumInfo = {
      album: decodedAlbum,
      artist: decodedArtist,
      year: albumSongs[0].year,
      artworkUrl: albumSongs[0].artworkUrl,
      songCount: albumSongs.length,
      totalDuration: albumSongs.reduce((sum, song) => sum + song.duration, 0),
      songs: albumSongs
    };
    
    res.json(albumInfo);
  } catch (error) {
    console.error('Error getting album details:', error);
    res.status(500).json({ error: 'Failed to get album details' });
  }
});

// API endpoint to get specific artist details
app.get('/api/artist/:name', async (req, res) => {
  try {
    const artistName = decodeURIComponent(req.params.name);
    
    const artistSongs = await db.getArtistDetails(artistName);
    
    if (artistSongs.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }
    
    // Group songs by album
    const albumsMap = new Map();
    artistSongs.forEach(song => {
      if (!albumsMap.has(song.album)) {
        albumsMap.set(song.album, {
          album: song.album,
          artist: song.albumArtist,
          year: song.year,
          artworkUrl: song.artworkUrl,
          songs: []
        });
      }
      albumsMap.get(song.album).songs.push(song);
    });
    
    // Convert to array and add metadata
    const albums = Array.from(albumsMap.values()).map(album => ({
      ...album,
      songCount: album.songs.length,
      totalDuration: album.songs.reduce((sum, song) => sum + song.duration, 0)
    }));
    
    // Create artist info
    const artistInfo = {
      name: artistName,
      albumCount: albums.length,
      songCount: artistSongs.length,
      totalDuration: artistSongs.reduce((sum, song) => sum + song.duration, 0),
      artworkUrl: artistSongs[0]?.artworkUrl,
      albums: albums,
      topSongs: artistSongs
        .sort((a, b) => b.duration - a.duration) // Sort by duration as a proxy for popularity
        .slice(0, 10) // Top 10 songs
    };
    
    res.json(artistInfo);
  } catch (error) {
    console.error('Error getting artist details:', error);
    res.status(500).json({ error: 'Failed to get artist details' });
  }
});

// API endpoint to get artists
app.get('/api/artists', async (req, res) => {
  try {
    const artists = await db.getArtists();
    res.json(artists);
  } catch (error) {
    console.error('Error getting artists:', error);
    res.status(500).json({ error: 'Failed to get artists' });
  }
});

// Periodic quick scan check every 10 minutes (non-blocking)
setInterval(() => {
  scanner.quickScan().catch(console.error);
}, 600000);

// API endpoint to get scan progress
app.get('/api/scan/progress', (req, res) => {
  res.json(scanner.getScanProgress());
});

// API endpoint to trigger manual scan
app.post('/api/scan/start', (req, res) => {
  if (scanner.isScanning) {
    return res.json({ message: 'Scan already in progress', progress: scanner.getScanProgress() });
  }
  
  scanner.startBackgroundScan();
  res.json({ message: 'Background scan started', progress: scanner.getScanProgress() });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    scanProgress: scanner.getScanProgress()
  });
});

// Serve the main page for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await db.init();
    
    console.log('Starting server...');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Music player server running on port ${PORT}`);
      console.log(`Music directory: ${MUSIC_DIR}`);
      
      // Check if we need an initial scan
      db.getAllSongs().then(songs => {
        if (songs.length === 0) {
          console.log('No songs in database, starting initial scan...');
          scanner.startBackgroundScan();
        } else {
          console.log(`Database contains ${songs.length} songs`);
          // Trigger a quick scan to check for new files
          scanner.quickScan();
        }
      }).catch(error => {
        console.error('Error checking database:', error);
        console.log('Starting initial scan...');
        scanner.startBackgroundScan();
      });
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down gracefully...');
      await db.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
