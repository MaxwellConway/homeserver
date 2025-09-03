const axios = require('axios');
const crypto = require('crypto');

class JellyfinClient {
    constructor(baseUrl = 'http://jellyfin:8096', apiKey = null) {
        this.baseUrl = baseUrl;
        this.clientName = 'Screengrab Service';
        this.deviceName = 'Screengrab Web';
        this.deviceId = this.generateDeviceId();
        this.version = '1.0.0';
        this.accessToken = null;
        this.userId = null;
        this.sessionId = null;
        this.apiKey = apiKey;
    }

    generateDeviceId() {
        const hash = crypto.createHash('md5');
        hash.update(`${this.clientName}-${this.deviceName}`);
        return hash.digest('hex');
    }

    getAuthHeaders() {
        const authHeader = `MediaBrowser Client="${this.clientName}", Device="${this.deviceName}", DeviceId="${this.deviceId}", Version="${this.version}"`;
        
        const headers = {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        };

        if (this.accessToken) {
            headers['X-Emby-Token'] = this.accessToken;
        } else if (this.apiKey) {
            headers['X-Emby-Token'] = this.apiKey;
        }

        return headers;
    }

    async authenticateByName(username, password) {
        try {
            const response = await axios.post(`${this.baseUrl}/Users/AuthenticateByName`, {
                Username: username,
                Pw: password
            }, {
                headers: this.getAuthHeaders()
            });

            this.accessToken = response.data.AccessToken;
            this.userId = response.data.User.Id;
            this.sessionId = response.data.SessionInfo?.Id;

            return response.data;
        } catch (error) {
            console.error('Authentication failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async getRandomVideoItems() {
        try {
            const response = await axios.get(`${this.baseUrl}/Users/${this.userId}/Items`, {
                headers: this.getAuthHeaders(),
                params: {
                    UserId: this.userId,
                    Recursive: true,
                    IncludeItemTypes: 'Movie,Episode',
                    Fields: 'Path,MediaSources,RunTimeTicks,SeriesName,SeasonName,IndexNumber,ParentIndexNumber,ProductionYear,Overview',
                    SortBy: 'Random',
                    Limit: 50
                }
            });

            return response.data.Items || [];
        } catch (error) {
            console.error('Failed to get random video items:', error.response?.data || error.message);
            throw error;
        }
    }

    async getItemById(itemId) {
        try {
            const response = await axios.get(`${this.baseUrl}/Users/${this.userId}/Items/${itemId}`, {
                headers: this.getAuthHeaders(),
                params: {
                    Fields: 'Path,MediaSources,RunTimeTicks,SeriesName,SeasonName,IndexNumber,ParentIndexNumber,ProductionYear,Overview'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Failed to get item by ID:', error.response?.data || error.message);
            throw error;
        }
    }

    getImageUrl(itemId, imageType = 'Primary', maxWidth = 300) {
        if (!itemId) return null;
        return `${this.baseUrl}/Items/${itemId}/Images/${imageType}?maxWidth=${maxWidth}&quality=90`;
    }
}

module.exports = JellyfinClient;
