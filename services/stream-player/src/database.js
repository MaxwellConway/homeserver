const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class VideoDatabase {
    constructor(dbPath = '/data/videos.db') {
        this.dbPath = dbPath;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.createTables(() => {
                        console.log('Database tables created successfully');
                        resolve();
                    });
                }
            });
        });
    }

    createTables(callback) {
        const createVideosTable = `
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                file_path TEXT UNIQUE NOT NULL,
                file_name TEXT NOT NULL,
                type TEXT NOT NULL, -- 'movie' or 'tv'
                year INTEGER,
                season INTEGER,
                episode INTEGER,
                duration REAL,
                resolution TEXT,
                codec TEXT,
                audio_codec TEXT,
                file_size INTEGER,
                thumbnail_path TEXT,
                poster_url TEXT,
                backdrop_url TEXT,
                overview TEXT,
                tmdb_id INTEGER,
                vote_average REAL,
                genres TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Add columns if they don't exist (migration)
        const addGenresColumn = `
            ALTER TABLE videos ADD COLUMN genres TEXT
        `;
        
        const addAudioCodecColumn = `
            ALTER TABLE videos ADD COLUMN audio_codec TEXT
        `;

        const createGenresTable = `
            CREATE TABLE IF NOT EXISTS genres (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        `;

        const createVideoGenresTable = `
            CREATE TABLE IF NOT EXISTS video_genres (
                video_id INTEGER,
                genre_id INTEGER,
                PRIMARY KEY (video_id, genre_id),
                FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
                FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
            )
        `;

        const createScanStatusTable = `
            CREATE TABLE IF NOT EXISTS scan_status (
                id INTEGER PRIMARY KEY,
                last_scan DATETIME,
                scan_in_progress BOOLEAN DEFAULT FALSE,
                total_files INTEGER DEFAULT 0,
                processed_files INTEGER DEFAULT 0
            )
        `;

        this.db.serialize(() => {
            this.db.run(createVideosTable);
            
            // Try to add columns (will fail silently if they already exist)
            this.db.run(addGenresColumn, (err) => {
                // Ignore error if column already exists
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding genres column:', err);
                }
            });
            
            this.db.run(addAudioCodecColumn, (err) => {
                // Ignore error if column already exists
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Error adding audio_codec column:', err);
                }
            });
            
            this.db.run(createGenresTable);
            this.db.run(createVideoGenresTable);
            this.db.run(createScanStatusTable);
            
            // Initialize scan status if not exists
            this.db.run(`
                INSERT OR IGNORE INTO scan_status (id, last_scan, scan_in_progress) 
                VALUES (1, NULL, FALSE)
            `, (err) => {
                if (err) {
                    console.error('Error initializing scan status:', err);
                }
                if (callback) callback();
            });
        });
    }

    // Video operations
    async addVideo(videoData) {
        return new Promise((resolve, reject) => {
            const {
                title, filePath, fileName, type, year, season, episode,
                duration, resolution, codec, audioCodec, fileSize, thumbnailPath,
                posterUrl, backdropUrl, overview, tmdbId, voteAverage
            } = videoData;

            const sql = `
                INSERT OR REPLACE INTO videos 
                (title, file_path, file_name, type, year, season, episode, duration, resolution, codec, audio_codec, file_size, thumbnail_path, poster_url, backdrop_url, overview, tmdb_id, vote_average, genres, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            this.db.run(sql, [
                title, filePath, fileName, type, year, season, episode,
                duration, resolution, codec, audioCodec, fileSize, thumbnailPath,
                posterUrl, backdropUrl, overview, tmdbId, voteAverage, videoData.genres || null
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async getAllVideos() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM videos ORDER BY title ASC';
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getMovies() {
        return new Promise((resolve, reject) => {
            const sql = "SELECT * FROM videos WHERE type = 'movie' ORDER BY title ASC";
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getTVShows() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT title, year, COUNT(*) as episode_count, 
                       MIN(season) as first_season, MAX(season) as last_season
                FROM videos 
                WHERE type = 'tv' 
                GROUP BY title, year 
                ORDER BY title ASC
            `;
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getTVShowEpisodes(title, season = null) {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM videos WHERE type = 'tv' AND title = ?";
            let params = [title];
            
            if (season !== null) {
                sql += " AND season = ?";
                params.push(season);
            }
            
            sql += " ORDER BY season ASC, episode ASC";
            
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async searchVideos(query) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM videos 
                WHERE title LIKE ? OR filename LIKE ? OR file_path LIKE ?
                ORDER BY title ASC
            `;
            this.db.all(sql, [`%${query}%`, `%${query}%`, `%${query}%`], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getVideosByGenre(genre) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM videos 
                WHERE genres LIKE ?
                ORDER BY title ASC
            `;
            this.db.all(sql, [`%${genre}%`], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getAllGenres() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT genres FROM videos 
                WHERE genres IS NOT NULL AND genres != ''
            `;
            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse and flatten all genres
                    const allGenres = new Set();
                    rows.forEach(row => {
                        if (row.genres) {
                            try {
                                const genres = JSON.parse(row.genres);
                                genres.forEach(genre => allGenres.add(genre.name));
                            } catch (e) {
                                // Handle non-JSON genre strings
                                row.genres.split(',').forEach(genre => {
                                    allGenres.add(genre.trim());
                                });
                            }
                        }
                    });
                    resolve(Array.from(allGenres).sort());
                }
            });
        });
    }

    // Scan status operations
    async updateScanStatus(inProgress, totalFiles = null, processedFiles = null) {
        return new Promise((resolve, reject) => {
            let sql = 'UPDATE scan_status SET scan_in_progress = ?';
            let params = [inProgress];

            if (totalFiles !== null) {
                sql += ', total_files = ?';
                params.push(totalFiles);
            }

            if (processedFiles !== null) {
                sql += ', processed_files = ?';
                params.push(processedFiles);
            }

            if (!inProgress) {
                sql += ', last_scan = CURRENT_TIMESTAMP';
            }

            sql += ' WHERE id = 1';

            this.db.run(sql, params, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getScanStatus() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM scan_status WHERE id = 1';
            this.db.get(sql, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getVideoCount() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT COUNT(*) as count FROM videos';
            this.db.get(sql, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }

    async updateVideoDuration(id, duration) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE videos SET duration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            this.db.run(sql, [duration, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }
}

module.exports = VideoDatabase;
