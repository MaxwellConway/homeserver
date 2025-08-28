const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class MusicDatabase {
  constructor(dbPath = '/data/music.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  async init() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createSongsTable = `
        CREATE TABLE IF NOT EXISTS songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          path TEXT UNIQUE NOT NULL,
          audioUrl TEXT NOT NULL,
          title TEXT,
          artist TEXT,
          album TEXT,
          albumArtist TEXT,
          genre TEXT,
          year INTEGER,
          track INTEGER,
          duration REAL,
          size INTEGER,
          artworkUrl TEXT,
          lastModified INTEGER,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')),
          updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `;

      const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist)',
        'CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album)',
        'CREATE INDEX IF NOT EXISTS idx_songs_albumArtist ON songs(albumArtist)',
        'CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre)',
        'CREATE INDEX IF NOT EXISTS idx_songs_year ON songs(year)',
        'CREATE INDEX IF NOT EXISTS idx_songs_path ON songs(path)',
        'CREATE INDEX IF NOT EXISTS idx_songs_lastModified ON songs(lastModified)'
      ];

      this.db.run(createSongsTable, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create indexes
        let indexCount = 0;
        const totalIndexes = createIndexes.length;

        createIndexes.forEach(indexSql => {
          this.db.run(indexSql, (err) => {
            if (err) {
              console.warn('Index creation warning:', err.message);
            }
            indexCount++;
            if (indexCount === totalIndexes) {
              resolve();
            }
          });
        });

        if (totalIndexes === 0) {
          resolve();
        }
      });
    });
  }

  async getAllSongs() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM songs ORDER BY artist, album, track, title', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getSongsBySearch(searchTerm, limit = 50) {
    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM songs 
        WHERE LOWER(title) LIKE ? 
           OR LOWER(artist) LIKE ? 
           OR LOWER(album) LIKE ? 
           OR LOWER(filename) LIKE ?
        ORDER BY artist, album, track, title
        LIMIT ?
      `;
      
      this.db.all(sql, [searchPattern, searchPattern, searchPattern, searchPattern, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getAlbums() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          album,
          albumArtist as artist,
          year,
          MIN(artworkUrl) as artworkUrl,
          COUNT(*) as songCount,
          SUM(duration) as totalDuration
        FROM songs 
        GROUP BY albumArtist, album
        ORDER BY album
      `;
      
      this.db.all(sql, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getArtists() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          albumArtist as name,
          COUNT(DISTINCT album) as albumCount,
          COUNT(*) as songCount,
          SUM(duration) as totalDuration,
          MIN(artworkUrl) as artworkUrl
        FROM songs 
        GROUP BY albumArtist
        ORDER BY albumArtist
      `;
      
      this.db.all(sql, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getAlbumDetails(artist, album) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM songs 
        WHERE albumArtist = ? AND album = ?
        ORDER BY track, title
      `;
      
      this.db.all(sql, [artist, album], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getArtistDetails(artistName) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM songs 
        WHERE albumArtist = ?
        ORDER BY year DESC, album, track, title
      `;
      
      this.db.all(sql, [artistName], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async upsertSong(songData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO songs (
          filename, path, audioUrl, title, artist, album, albumArtist,
          genre, year, track, duration, size, artworkUrl, lastModified, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `;
      
      const params = [
        songData.filename,
        songData.path,
        songData.audioUrl,
        songData.title,
        songData.artist,
        songData.album,
        songData.albumArtist,
        songData.genre,
        songData.year,
        songData.track,
        songData.duration,
        songData.size,
        songData.artworkUrl,
        songData.lastModified
      ];
      
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async deleteSong(path) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM songs WHERE path = ?', [path], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async getLastScanTime() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT MAX(updatedAt) as lastScan FROM songs', (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row?.lastScan || 0);
        }
      });
    });
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      });
    }
  }
}

module.exports = MusicDatabase;
