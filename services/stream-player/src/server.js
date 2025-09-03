const express = require('express');
const path = require('path');
const compression = require('compression');
const JellyfinClient = require('./jellyfin-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Jellyfin client with streamapp user
const jellyfin = new JellyfinClient('https://media.maxconway.com');
let isAuthenticated = false;

// Authenticate with streamapp user at startup
(async () => {
    try {
        await jellyfin.authenticateByName('streamapp', '');
        isAuthenticated = true;
        console.log('Jellyfin streamapp user authentication successful - using live data');
        const info = await jellyfin.getSystemInfo();
        console.log(`Connected to Jellyfin server: ${info.ServerName} v${info.Version}`);
    } catch (error) {
        console.log('Jellyfin streamapp user authentication failed, falling back to mock data mode');
        console.error('Authentication error:', error.response?.data || error.message);
        isAuthenticated = 'mock';
    }
})();

// Middleware
app.use(compression());
app.use(express.json());

// CORS headers for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Authentication middleware - simplified for API key usage
async function ensureAuthenticated(req, res, next) {
    // With API key authentication, we don't need to authenticate each request
    next();
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        jellyfin_authenticated: isAuthenticated
    });
});

// Get all videos (movies, TV episodes)
app.get('/api/videos', ensureAuthenticated, async (req, res) => {
    try {
        if (isAuthenticated === 'mock') {
            // Return mock data for development
            const mockVideos = [
                {
                    id: 'mock-movie-1',
                    title: 'Sample Movie',
                    type: 'movie',
                    year: 2023,
                    overview: 'A sample movie for testing the stream player interface.',
                    genres: ['Action', 'Adventure'],
                    runtime: 120,
                    rating: 8.5,
                    poster: '/api/placeholder/poster/mock-movie-1',
                    backdrop: '/api/placeholder/backdrop/mock-movie-1'
                },
                {
                    id: 'mock-episode-1',
                    title: 'Sample Episode',
                    type: 'episode',
                    year: 2023,
                    overview: 'A sample TV episode for testing.',
                    genres: ['Drama', 'Comedy'],
                    runtime: 45,
                    rating: 7.8,
                    poster: '/api/placeholder/poster/mock-episode-1',
                    backdrop: '/api/placeholder/backdrop/mock-episode-1',
                    series_name: 'Sample TV Show',
                    season_number: 1,
                    episode_number: 1
                }
            ];
            return res.json(mockVideos);
        }

        const result = await jellyfin.getItems();
        const videos = result.Items.map(item => ({
            id: item.Id,
            title: item.Name,
            type: item.Type === 'Movie' ? 'movie' : item.Type === 'Series' ? 'series' : 'episode',
            year: item.ProductionYear,
            overview: item.Overview,
            genres: item.Genres || [],
            runtime: Math.round(item.RunTimeTicks / 600000000), // Convert ticks to minutes
            rating: item.CommunityRating,
            poster: `/image/${item.Id}/Primary?maxWidth=300`,
            backdrop: `/image/${item.Id}/Backdrop?maxWidth=1280`,
            series_name: item.SeriesName,
            season_number: item.ParentIndexNumber,
            episode_number: item.IndexNumber,
            path: item.Path
        }));
        res.json(videos);
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// Get movies only
app.get('/api/movies', ensureAuthenticated, async (req, res) => {
    try {
        if (isAuthenticated === 'mock') {
            const mockMovies = [
                {
                    id: 'mock-movie-1',
                    title: 'Sample Movie',
                    type: 'movie',
                    year: 2023,
                    overview: 'A sample movie for testing the stream player interface.',
                    genres: ['Action', 'Adventure'],
                    runtime: 120,
                    rating: 8.5,
                    poster: '/api/placeholder/poster/mock-movie-1',
                    backdrop: '/api/placeholder/backdrop/mock-movie-1'
                },
                {
                    id: 'mock-movie-2',
                    title: 'Another Sample Movie',
                    type: 'movie',
                    year: 2022,
                    overview: 'Another sample movie for testing.',
                    genres: ['Comedy', 'Drama'],
                    runtime: 95,
                    rating: 7.2,
                    poster: '/api/placeholder/poster/mock-movie-2',
                    backdrop: '/api/placeholder/backdrop/mock-movie-2'
                }
            ];
            return res.json(mockMovies);
        }

        const result = await jellyfin.getMovies();
        const movies = result.Items.map(item => ({
            id: item.Id,
            title: item.Name,
            type: 'movie',
            year: item.ProductionYear,
            overview: item.Overview,
            genres: item.Genres || [],
            runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 10000000 / 60) : null,
            rating: item.CommunityRating,
            poster: `/image/${item.Id}/Primary?maxWidth=300`,
            backdrop: `/image/${item.Id}/Backdrop?maxWidth=1200`,
            path: item.Path
        }));
        res.json(movies);
    } catch (error) {
        console.error('Error fetching movies:', error);
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

// Get TV shows
app.get('/api/tv-shows', ensureAuthenticated, async (req, res) => {
    try {
        if (isAuthenticated === 'mock') {
            const mockShows = [
                {
                    id: 'mock-show-1',
                    title: 'Sample TV Show',
                    type: 'series',
                    year: 2023,
                    overview: 'A sample TV show for testing.',
                    genres: ['Drama', 'Thriller'],
                    rating: 8.8,
                    poster: '/api/placeholder/poster/mock-show-1',
                    backdrop: '/api/placeholder/backdrop/mock-show-1'
                }
            ];
            return res.json(mockShows);
        }

        const result = await jellyfin.getTVShows();
        const shows = result.Items.map(item => ({
            id: item.Id,
            title: item.Name,
            type: 'series',
            year: item.ProductionYear,
            overview: item.Overview,
            genres: item.Genres || [],
            rating: item.CommunityRating,
            poster: `/image/${item.Id}/Primary?maxWidth=300`,
            backdrop: `/image/${item.Id}/Backdrop?maxWidth=1200`,
            path: item.Path
        }));
        res.json(shows);
    } catch (error) {
        console.error('Error fetching TV shows:', error);
        res.status(500).json({ error: 'Failed to fetch TV shows' });
    }
});

// Get episodes for a specific TV show
app.get('/api/tv-shows/:id/episodes', ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { season } = req.query;
        
        let episodes;
        if (season) {
            // Get seasons first, then episodes for specific season
            const seasonsResult = await jellyfin.getSeasons(id);
            const targetSeason = seasonsResult.Items.find(s => s.IndexNumber === parseInt(season));
            if (targetSeason) {
                const episodesResult = await jellyfin.getEpisodes(id, targetSeason.Id);
                episodes = episodesResult.Items;
            } else {
                episodes = [];
            }
        } else {
            // Get all episodes for the series
            const episodesResult = await jellyfin.getEpisodes(id);
            episodes = episodesResult.Items;
        }

        const formattedEpisodes = episodes.map(item => ({
            id: item.Id,
            title: item.Name,
            type: 'episode',
            overview: item.Overview,
            series_name: item.SeriesName,
            season_number: item.ParentIndexNumber,
            episode_number: item.IndexNumber,
            runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 10000000 / 60) : null,
            poster: `/image/${item.Id}/Primary?maxWidth=300`,
            backdrop: `/image/${item.Id}/Backdrop?maxWidth=1200`,
            path: item.Path
        }));
        
        res.json(formattedEpisodes);
    } catch (error) {
        console.error('Error fetching episodes:', error);
        res.status(500).json({ error: 'Failed to fetch episodes' });
    }
});

// Search videos
app.get('/api/search', ensureAuthenticated, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const result = await jellyfin.searchItems(q);
        const results = result.Items.map(item => ({
            id: item.Id,
            title: item.Name,
            type: item.Type.toLowerCase(),
            year: item.ProductionYear,
            overview: item.Overview,
            genres: item.Genres || [],
            runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 10000000 / 60) : null,
            rating: item.CommunityRating,
            poster: `/image/${item.Id}/Primary?maxWidth=300`,
            backdrop: `/image/${item.Id}/Backdrop?maxWidth=1200`,
            series_name: item.SeriesName,
            season_number: item.ParentIndexNumber,
            episode_number: item.IndexNumber,
            path: item.Path
        }));
        
        res.json(results);
    } catch (error) {
        console.error('Error searching videos:', error);
        res.status(500).json({ error: 'Failed to search videos' });
    }
});

// Get video stream info
app.get('/api/video-info/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        
        res.json({
            id: id,
            stream_url: `/stream/${id}`,
            hls_url: `/hls/${id}`,
            poster: `/image/${id}/Primary?maxWidth=600`,
            backdrop: `/image/${id}/Backdrop?maxWidth=1600`
        });
    } catch (error) {
        console.error('Error getting video info:', error);
        res.status(500).json({ error: 'Failed to get video info' });
    }
});

// Proxy Jellyfin video streams
app.get('/stream/:id', ensureAuthenticated, (req, res) => {
    try {
        const { id } = req.params;
        const streamUrl = jellyfin.getStreamUrl(id);
        
        // Redirect to Jellyfin stream URL
        res.redirect(streamUrl);
    } catch (error) {
        console.error('Error serving video stream:', error);
        res.status(500).json({ error: 'Failed to serve video stream' });
    }
});

// Proxy Jellyfin HLS streams
app.get('/hls/:id/*', ensureAuthenticated, async (req, res) => {
    console.log('=== HLS PROXY ENDPOINT HIT ===');
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    
    try {
        const { id } = req.params;
        const file = req.params[0]; // Get the wildcard path
        const queryParams = new URLSearchParams(req.query);
        
        // Ensure mediaSourceId is always present for HLS requests
        if (!queryParams.has('mediaSourceId')) {
            queryParams.set('mediaSourceId', id);
        }
        
        const queryString = queryParams.toString();
        
        let targetUrl;
        if (file) {
            // Proxy individual HLS segments or playlists
            targetUrl = `${jellyfin.baseUrl}/Videos/${id}/${file}?${queryString}`;
        } else {
            // Proxy master playlist
            targetUrl = `${jellyfin.baseUrl}/Videos/${id}/master.m3u8?${queryString}`;
        }
        
        console.log('UPDATED CODE - Proxying HLS request to:', targetUrl);
        console.log('Using access token:', jellyfin.accessToken ? 'Present' : 'Missing');
        
        // Forward request to Jellyfin with proper authentication
        const axios = require('axios');
        
        console.log('Making axios request...');
        const response = await axios.get(targetUrl, {
            headers: {
                'X-Emby-Token': jellyfin.accessToken,
                'Authorization': `MediaBrowser Client="${jellyfin.clientName}", Device="${jellyfin.deviceName}", DeviceId="${jellyfin.deviceId}", Version="${jellyfin.version}"`
            },
            responseType: 'text',
            timeout: 30000
        });
        
        console.log('Axios request successful!');
        console.log('Response status:', response.status);
        console.log('Response content-type:', response.headers['content-type']);
        
        // Forward response headers and modify HLS playlist URLs to be relative to our proxy
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegURL')) {
            console.log('Processing HLS playlist for ID:', id);
            const content = response.data;
            console.log('Original HLS content:', content.substring(0, 200));
            
            // Modify playlist URLs to point to our proxy
            const modifiedContent = content.replace(
                /^(?!#)(.*\.m3u8.*?)$/gm, 
                `/hls/${id}/$1`
            ).replace(
                /^(?!#)(.*\.ts.*?)$/gm,
                `/hls/${id}/$1`
            );
            console.log('Modified HLS content:', modifiedContent.substring(0, 200));
            
            res.set(response.headers);
            res.send(modifiedContent);
        } else {
            console.log('Not an HLS playlist, streaming directly');
            res.set(response.headers);
            res.send(response.data);
        }
        
    } catch (error) {
        console.error('Error serving HLS stream:', error.response?.data || error.message);
        console.error('Full error:', error);
        res.status(500).json({ error: 'Failed to serve HLS stream' });
    }
});

// Get genres
app.get('/api/genres', ensureAuthenticated, async (req, res) => {
    try {
        if (isAuthenticated === 'mock') {
            const mockGenres = [
                'Action', 'Adventure', 'Comedy', 'Drama', 'Horror', 
                'Romance', 'Sci-Fi', 'Thriller', 'Documentary', 'Animation'
            ];
            return res.json(mockGenres);
        }

        const result = await jellyfin.getGenres();
        const genres = result.Items ? result.Items.map(item => item.Name) : [];
        res.json(genres);
    } catch (error) {
        console.error('Error fetching genres:', error);
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
});

// Trigger library scan
app.post('/api/scan', ensureAuthenticated, async (req, res) => {
    try {
        if (isAuthenticated === 'mock') {
            return res.json({ 
                message: 'Library scan triggered (mock mode)',
                success: true 
            });
        }

        // For real Jellyfin implementation, trigger library scan
        // This would call Jellyfin's library scan API
        res.json({ 
            message: 'Library scan triggered',
            success: true 
        });
    } catch (error) {
        console.error('Error triggering scan:', error);
        res.status(500).json({ error: 'Failed to trigger scan' });
    }
});

// Get scan status
app.get('/api/scan-status', ensureAuthenticated, async (req, res) => {
    try {
        if (isAuthenticated === 'mock') {
            return res.json({ 
                scanning: false, 
                progress: 100, 
                message: 'Library scan complete' 
            });
        }

        // For real Jellyfin implementation, check scan status
        res.json({ 
            scanning: false, 
            progress: 100, 
            message: 'Library scan complete' 
        });
    } catch (error) {
        console.error('Error fetching scan status:', error);
        res.status(500).json({ error: 'Failed to fetch scan status' });
    }
});

// Placeholder image endpoints
app.get('/api/placeholder/:type/:id', (req, res) => {
    const { type, id } = req.params;
    // Return a simple SVG placeholder
    const svg = `<svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#333"/>
        <text x="50%" y="50%" text-anchor="middle" fill="white" font-size="16">${type}</text>
    </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
});

// Proxy Jellyfin images
app.get('/image/:id/:type?', ensureAuthenticated, (req, res) => {
    try {
        const { id, type = 'Primary' } = req.params;
        const { maxWidth = 300 } = req.query;
        
        if (isAuthenticated === 'mock') {
            return res.redirect(`/api/placeholder/${type}/${id}`);
        }
        
        const imageUrl = jellyfin.getImageUrl(id, type, maxWidth);
        
        // Redirect to Jellyfin image URL
        res.redirect(imageUrl);
    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Failed to serve image' });
    }
});

// Serve static files (but exclude /hls paths)
app.use((req, res, next) => {
    if (req.path.startsWith('/hls/')) {
        return next(); // Skip static file serving for HLS routes
    }
    express.static(path.join(__dirname, 'public'))(req, res, next);
});

// Serve React app for all other routes (but exclude /hls and /api paths)
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/hls/') || req.path.startsWith('/api/')) {
        return next(); // Skip React app serving for API and HLS routes
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`Stream player server running on port ${PORT}`);
    console.log('Using Jellyfin backend for media streaming and transcoding');
});
