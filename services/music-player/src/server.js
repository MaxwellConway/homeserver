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
              albumArtist: metadata.common.albumartist || metadata.common.artist || 'Unknown Artist',
              genre: metadata.common.genre ? metadata.common.genre.join(', ') : 'Unknown',
              year: metadata.common.year || null,
              track: metadata.common.track?.no || null,
              duration: metadata.format.duration || 0,
              size: (await fs.stat(fullPath)).size,
              artworkUrl: `/api/artwork/${encodeURIComponent(relativeFilePath)}`
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
              albumArtist: 'Unknown Artist',
              genre: 'Unknown',
              year: null,
              track: null,
              duration: 0,
              size: (await fs.stat(fullPath)).size,
              artworkUrl: `/api/artwork/${encodeURIComponent(relativeFilePath)}`
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

// API endpoint to get songs with pagination and search
app.get('/api/songs', async (req, res) => {
  try {
    const now = Date.now();
    
    // Ensure cache is populated
    if (songsCache.length === 0 || (now - lastScanTime) > CACHE_DURATION) {
      console.log('Scanning music directory...');
      songsCache = await scanMusicDirectory(MUSIC_DIR);
      lastScanTime = now;
      console.log(`Found ${songsCache.length} audio files`);
    }
    
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    
    // Filter songs based on search query
    let filteredSongs = songsCache;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSongs = songsCache.filter(song => 
        song.title.toLowerCase().includes(searchLower) ||
        song.artist.toLowerCase().includes(searchLower) ||
        song.album.toLowerCase().includes(searchLower) ||
        song.filename.toLowerCase().includes(searchLower)
      );
    }
    
    // Calculate pagination
    const totalSongs = filteredSongs.length;
    const totalPages = Math.ceil(totalSongs / limit);
    const offset = (page - 1) * limit;
    const paginatedSongs = filteredSongs.slice(offset, offset + limit);
    
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
      search
    });
  } catch (error) {
    console.error('Error getting songs:', error);
    res.status(500).json({ error: 'Failed to get songs' });
  }
});

// API endpoint to get total song count (for initial load)
app.get('/api/songs/count', async (req, res) => {
  try {
    const now = Date.now();
    
    // Ensure cache is populated
    if (songsCache.length === 0 || (now - lastScanTime) > CACHE_DURATION) {
      console.log('Scanning music directory for count...');
      songsCache = await scanMusicDirectory(MUSIC_DIR);
      lastScanTime = now;
      console.log(`Found ${songsCache.length} audio files`);
    }
    
    res.json({ count: songsCache.length });
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
    const now = Date.now();
    
    // Ensure cache is populated
    if (songsCache.length === 0 || (now - lastScanTime) > CACHE_DURATION) {
      console.log('Scanning music directory for albums...');
      songsCache = await scanMusicDirectory(MUSIC_DIR);
      lastScanTime = now;
    }
    
    // Group songs by album
    const albumsMap = new Map();
    songsCache.forEach(song => {
      const albumKey = `${song.albumArtist} - ${song.album}`;
      if (!albumsMap.has(albumKey)) {
        albumsMap.set(albumKey, {
          album: song.album,
          artist: song.albumArtist,
          year: song.year,
          artworkUrl: song.artworkUrl,
          songs: []
        });
      }
      albumsMap.get(albumKey).songs.push(song);
    });
    
    // Convert to array and add metadata
    const albums = Array.from(albumsMap.values()).map(album => ({
      ...album,
      songCount: album.songs.length,
      totalDuration: album.songs.reduce((sum, song) => sum + song.duration, 0)
    }));
    
    // Sort by album name
    albums.sort((a, b) => a.album.localeCompare(b.album));
    
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
    
    const now = Date.now();
    
    // Ensure cache is populated
    if (songsCache.length === 0 || (now - lastScanTime) > CACHE_DURATION) {
      console.log('Scanning music directory for album details...');
      songsCache = await scanMusicDirectory(MUSIC_DIR);
      lastScanTime = now;
    }
    
    // Find songs for this album
    const albumSongs = songsCache.filter(song => 
      song.albumArtist === decodedArtist && song.album === decodedAlbum
    );
    
    if (albumSongs.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    
    // Sort songs by track number, then by title
    albumSongs.sort((a, b) => {
      if (a.track && b.track) {
        return a.track - b.track;
      }
      return a.title.localeCompare(b.title);
    });
    
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
    
    const now = Date.now();
    
    // Ensure cache is populated
    if (songsCache.length === 0 || (now - lastScanTime) > CACHE_DURATION) {
      console.log('Scanning music directory for artist details...');
      songsCache = await scanMusicDirectory(MUSIC_DIR);
      lastScanTime = now;
    }
    
    // Find songs for this artist
    const artistSongs = songsCache.filter(song => 
      song.albumArtist === artistName
    );
    
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
    
    // Convert to array and sort albums by year, then by name
    const albums = Array.from(albumsMap.values()).map(album => {
      // Sort songs within each album by track number
      album.songs.sort((a, b) => {
        if (a.track && b.track) {
          return a.track - b.track;
        }
        return a.title.localeCompare(b.title);
      });
      
      return {
        ...album,
        songCount: album.songs.length,
        totalDuration: album.songs.reduce((sum, song) => sum + song.duration, 0)
      };
    });
    
    albums.sort((a, b) => {
      if (a.year && b.year) {
        return b.year - a.year; // Newest first
      }
      return a.album.localeCompare(b.album);
    });
    
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
    const now = Date.now();
    
    // Ensure cache is populated
    if (songsCache.length === 0 || (now - lastScanTime) > CACHE_DURATION) {
      console.log('Scanning music directory for artists...');
      songsCache = await scanMusicDirectory(MUSIC_DIR);
      lastScanTime = now;
    }
    
    // Group songs by artist
    const artistsMap = new Map();
    songsCache.forEach(song => {
      const artistKey = song.albumArtist;
      if (!artistsMap.has(artistKey)) {
        artistsMap.set(artistKey, {
          name: song.albumArtist,
          albums: new Set(),
          songs: []
        });
      }
      const artist = artistsMap.get(artistKey);
      artist.albums.add(song.album);
      artist.songs.push(song);
    });
    
    // Convert to array and add metadata
    const artists = Array.from(artistsMap.values()).map(artist => ({
      name: artist.name,
      albumCount: artist.albums.size,
      songCount: artist.songs.length,
      totalDuration: artist.songs.reduce((sum, song) => sum + song.duration, 0),
      // Use artwork from first song
      artworkUrl: artist.songs[0]?.artworkUrl
    }));
    
    // Sort by artist name
    artists.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json(artists);
  } catch (error) {
    console.error('Error getting artists:', error);
    res.status(500).json({ error: 'Failed to get artists' });
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
