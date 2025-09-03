const https = require('https');

class MetadataService {
    constructor() {
        // TMDB API - requires API key but has free tier
        this.tmdbBaseUrl = 'https://api.themoviedb.org/3';
        this.tmdbImageBaseUrl = 'https://image.tmdb.org/t/p/w500';
        // Note: In production, this should be an environment variable
        this.tmdbApiKey = process.env.TMDB_API_KEY || null;
    }

    async searchMovie(title, year = null) {
        if (!this.tmdbApiKey) {
            console.log('TMDB API key not configured, skipping metadata fetch');
            return null;
        }

        try {
            const query = encodeURIComponent(title);
            const yearParam = year ? `&year=${year}` : '';
            const url = `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}&query=${query}${yearParam}`;
            
            const data = await this.makeRequest(url);
            
            if (data.results && data.results.length > 0) {
                const movie = data.results[0];
                return {
                    title: movie.title,
                    overview: movie.overview,
                    poster_path: movie.poster_path ? `${this.tmdbImageBaseUrl}${movie.poster_path}` : null,
                    backdrop_path: movie.backdrop_path ? `${this.tmdbImageBaseUrl}${movie.backdrop_path}` : null,
                    release_date: movie.release_date,
                    vote_average: movie.vote_average,
                    genre_ids: movie.genre_ids,
                    tmdb_id: movie.id
                };
            }
        } catch (error) {
            console.error(`Error fetching movie metadata for "${title}":`, error.message);
        }
        
        return null;
    }

    async searchTVShow(title, year = null) {
        if (!this.tmdbApiKey) {
            console.log('TMDB API key not configured, skipping metadata fetch');
            return null;
        }

        try {
            const query = encodeURIComponent(title);
            const yearParam = year ? `&first_air_date_year=${year}` : '';
            const url = `${this.tmdbBaseUrl}/search/tv?api_key=${this.tmdbApiKey}&query=${query}${yearParam}`;
            
            const data = await this.makeRequest(url);
            
            if (data.results && data.results.length > 0) {
                const show = data.results[0];
                return {
                    title: show.name,
                    overview: show.overview,
                    poster_path: show.poster_path ? `${this.tmdbImageBaseUrl}${show.poster_path}` : null,
                    backdrop_path: show.backdrop_path ? `${this.tmdbImageBaseUrl}${show.backdrop_path}` : null,
                    first_air_date: show.first_air_date,
                    vote_average: show.vote_average,
                    genre_ids: show.genre_ids,
                    tmdb_id: show.id
                };
            }
        } catch (error) {
            console.error(`Error fetching TV show metadata for "${title}":`, error.message);
        }
        
        return null;
    }

    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, (response) => {
                let data = '';
                
                response.on('data', (chunk) => {
                    data += chunk;
                });
                
                response.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        reject(new Error('Failed to parse JSON response'));
                    }
                });
            });
            
            request.on('error', (error) => {
                reject(error);
            });
            
            request.setTimeout(10000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    // Clean title for better matching
    cleanTitle(title) {
        return title
            .replace(/\([^)]*\)/g, '') // Remove anything in parentheses
            .replace(/\[[^\]]*\]/g, '') // Remove anything in brackets
            .replace(/\d{4}/, '') // Remove year
            .replace(/[._-]/g, ' ') // Replace dots, underscores, dashes with spaces
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    }
}

module.exports = MetadataService;
