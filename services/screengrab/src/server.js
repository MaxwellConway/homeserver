const express = require('express');
const cors = require('cors');
const path = require('path');
const JellyfinClient = require('./jellyfin-client');
const ScreenshotGenerator = require('./screenshot-generator');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/screenshots', express.static('/tmp/screenshots'));

// Initialize services
const jellyfinClient = new JellyfinClient();
const screenshotGenerator = new ScreenshotGenerator();

// Authentication state
let isAuthenticated = false;

// Initialize Jellyfin connection
async function initializeJellyfin() {
    try {
        // Try to authenticate with streamapp user (from memory)
        await jellyfinClient.authenticateByName('streamapp', '');
        isAuthenticated = true;
        console.log('Successfully authenticated with Jellyfin');
    } catch (error) {
        console.error('Failed to authenticate with Jellyfin:', error.message);
        isAuthenticated = false;
    }
}

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        jellyfinConnected: isAuthenticated,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/random-screenshot', async (req, res) => {
    try {
        if (!isAuthenticated) {
            return res.status(503).json({ error: 'Jellyfin not connected' });
        }

        // Set a timeout for the entire operation (60 seconds)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Screenshot generation timed out after 60 seconds')), 60000)
        );

        const screenshotPromise = (async () => {
            // Get random video items from Jellyfin
            const videoItems = await jellyfinClient.getRandomVideoItems();
            
            if (videoItems.length === 0) {
                throw new Error('No video items found');
            }

            // Select a random item
            const randomItem = videoItems[Math.floor(Math.random() * videoItems.length)];
            
            // Get the video file path
            const mediaSource = randomItem.MediaSources?.[0];
            if (!mediaSource || !mediaSource.Path) {
                throw new Error('No media source found for item');
            }

            // Convert Jellyfin ticks to seconds (1 tick = 100 nanoseconds)
            const durationSeconds = Math.floor(randomItem.RunTimeTicks / 10000000);
            
            if (durationSeconds < 60) {
                throw new Error('Video too short for screenshot');
            }

            // Generate screenshot
            const screenshot = await screenshotGenerator.generateScreenshot(
                mediaSource.Path, 
                durationSeconds
            );

            // Prepare metadata
            const metadata = {
                title: randomItem.Name,
                type: randomItem.Type,
                year: randomItem.ProductionYear,
                overview: randomItem.Overview,
                duration: durationSeconds,
                screenshotTimestamp: screenshot.timestamp
            };

            // Add series info for episodes
            if (randomItem.Type === 'Episode') {
                metadata.seriesName = randomItem.SeriesName;
                metadata.seasonName = randomItem.SeasonName;
                metadata.episodeNumber = randomItem.IndexNumber;
                metadata.seasonNumber = randomItem.ParentIndexNumber;
            }

            return {
                screenshot: `/screenshots/${screenshot.filename}`,
                metadata: metadata,
                timestamp: new Date().toISOString()
            };
        })();

        const result = await Promise.race([screenshotPromise, timeoutPromise]);
        res.json(result);

    } catch (error) {
        console.error('Error generating random screenshot:', error);
        if (error.message.includes('timed out')) {
            res.status(504).json({ error: error.message });
        } else if (error.message.includes('No video items') || error.message.includes('No media source')) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('too short')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to generate screenshot' });
        }
    }
});

// Cleanup old screenshots every hour
setInterval(() => {
    screenshotGenerator.cleanupOldScreenshots();
}, 3600000);

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(port, async () => {
    console.log(`Screengrab service running on port ${port}`);
    await initializeJellyfin();
});

module.exports = app;
