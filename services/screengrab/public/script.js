class ScreengrabApp {
    constructor() {
        this.button = document.getElementById('newScreenshot');
        this.status = document.getElementById('status');
        this.screenshotContainer = document.getElementById('screenshotContainer');
        this.metadata = document.getElementById('metadata');
        
        this.initializeEventListeners();
        this.checkHealth();
    }

    initializeEventListeners() {
        this.button.addEventListener('click', () => this.getNewScreenshot());
    }

    async checkHealth() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (data.jellyfinConnected) {
                this.setStatus('Ready', 'success');
            } else {
                this.setStatus('Jellyfin not connected', 'error');
                this.button.disabled = true;
            }
        } catch (error) {
            this.setStatus('Service unavailable', 'error');
            this.button.disabled = true;
        }
    }

    setStatus(message, type = '') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    formatTimestamp(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    async getNewScreenshot() {
        this.button.disabled = true;
        this.setStatus('Generating screenshot...', 'loading');
        
        // Add loading spinner
        const originalText = this.button.textContent;
        this.button.innerHTML = '<span class="loading-spinner"></span> Generating...';

        try {
            const response = await fetch('/api/random-screenshot');
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate screenshot');
            }

            const data = await response.json();
            this.displayScreenshot(data);
            this.setStatus('Screenshot generated!', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            this.setStatus(`Error: ${error.message}`, 'error');
        } finally {
            this.button.disabled = false;
            this.button.textContent = originalText;
        }
    }

    displayScreenshot(data) {
        // Clear container and add screenshot
        this.screenshotContainer.innerHTML = `
            <img src="${data.screenshot}" alt="Random Screenshot" class="screenshot" />
        `;

        // Update metadata
        const meta = data.metadata;
        document.getElementById('title').textContent = meta.title;
        document.getElementById('type').textContent = meta.type;
        document.getElementById('year').textContent = meta.year || 'Unknown';
        document.getElementById('duration').textContent = this.formatDuration(meta.duration);
        document.getElementById('timestamp').textContent = this.formatTimestamp(meta.screenshotTimestamp);

        // Handle series information for episodes
        const seriesInfo = document.getElementById('seriesInfo');
        const episodeInfo = document.getElementById('episodeInfo');
        
        if (meta.type === 'Episode') {
            document.getElementById('seriesName').textContent = meta.seriesName;
            seriesInfo.style.display = 'flex';
            
            const episodeText = `S${meta.seasonNumber}E${meta.episodeNumber}`;
            document.getElementById('episodeDetails').textContent = episodeText;
            episodeInfo.style.display = 'flex';
        } else {
            seriesInfo.style.display = 'none';
            episodeInfo.style.display = 'none';
        }

        // Update overview
        const overviewElement = document.getElementById('overview');
        if (meta.overview) {
            overviewElement.textContent = meta.overview;
            overviewElement.style.display = 'block';
        } else {
            overviewElement.style.display = 'none';
        }

        // Show metadata section
        this.metadata.style.display = 'block';

        // Scroll to screenshot
        this.screenshotContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ScreengrabApp();
});
