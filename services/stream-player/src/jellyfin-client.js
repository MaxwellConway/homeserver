const axios = require('axios');
const crypto = require('crypto');

class JellyfinClient {
    constructor(baseUrl = 'http://jellyfin:8096', apiKey = null) {
        this.baseUrl = baseUrl;
        this.clientName = 'Stream Player';
        this.deviceName = 'Stream Player Web';
        this.deviceId = this.generateDeviceId();
        this.version = '1.0.0';
        this.accessToken = null;
        this.userId = null;
        this.sessionId = null;
        this.apiKey = apiKey;
        
        // User ID will be set during authentication
    }

    generateDeviceId() {
        // Generate a consistent device ID based on the client info
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

    async getSystemInfo() {
        try {
            const response = await axios.get(`${this.baseUrl}/System/Info`, {
                headers: this.getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get system info:', error.response?.data || error.message);
            throw error;
        }
    }

    async getPublicUsers() {
        try {
            const response = await axios.get(`${this.baseUrl}/Users/Public`, {
                headers: this.getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get public users:', error.response?.data || error.message);
            throw error;
        }
    }

    async getItems(params = {}) {
        try {
            const defaultParams = {
                UserId: this.userId,
                Recursive: true,
                IncludeItemTypes: 'Movie,Episode',
                Fields: 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Status,EndDate,CommunityRating,DateCreated,MediaStreams,Overview,Genres,Studios,ParentId,PresentationUniqueKey,InheritedParentalRatingValue,ExternalUrls,People,ProviderIds,LocalTrailerCount,PlayAccess,RemoteTrailers,SortName,ForcedSortName,RunTimeTicks,OfficialRating,CriticRating,IndexNumber,ParentIndexNumber,SeriesName,SeasonName,Path,MediaSources'
            };

            const queryParams = { ...defaultParams, ...params };
            const queryString = new URLSearchParams(queryParams).toString();

            const response = await axios.get(`${this.baseUrl}/Users/${this.userId}/Items?${queryString}`, {
                headers: this.getAuthHeaders()
            });

            return response.data;
        } catch (error) {
            console.error('Failed to get items:', error.response?.data || error.message);
            throw error;
        }
    }

    async getMovies() {
        return this.getItems({
            IncludeItemTypes: 'Movie',
            SortBy: 'SortName',
            SortOrder: 'Ascending'
        });
    }

    async getTVShows() {
        return this.getItems({
            IncludeItemTypes: 'Series',
            SortBy: 'SortName',
            SortOrder: 'Ascending'
        });
    }

    async getSeasons(seriesId) {
        return this.getItems({
            ParentId: seriesId,
            IncludeItemTypes: 'Season'
        });
    }

    async getEpisodes(seriesId, seasonId = null) {
        const params = {
            ParentId: seasonId || seriesId,
            IncludeItemTypes: 'Episode',
            SortBy: 'ParentIndexNumber,IndexNumber',
            SortOrder: 'Ascending'
        };

        if (!seasonId) {
            params.ParentId = seriesId;
        }

        return this.getItems(params);
    }

    async searchItems(searchTerm) {
        return this.getItems({
            SearchTerm: searchTerm,
            Limit: 50
        });
    }

    async getGenres() {
        try {
            const response = await axios.get(`${this.baseUrl}/Genres`, {
                headers: this.getAuthHeaders(),
                params: {
                    UserId: this.userId,
                    Recursive: true
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get genres:', error.response?.data || error.message);
            throw error;
        }
    }

    getImageUrl(itemId, imageType = 'Primary', maxWidth = 300) {
        if (!itemId) return null;
        return `${this.baseUrl}/Items/${itemId}/Images/${imageType}?maxWidth=${maxWidth}&quality=90`;
    }

    getStreamUrl(itemId, params = {}) {
        const defaultParams = {
            UserId: this.userId,
            DeviceId: this.deviceId,
            MaxStreamingBitrate: 120000000,
            Container: 'mp4,m4v',
            TranscodingMaxAudioChannels: 2,
            TranscodingProtocol: 'http',
            AudioCodec: 'aac',
            PlaySessionId: this.generatePlaySessionId()
        };

        const streamParams = { ...defaultParams, ...params };
        const queryString = new URLSearchParams(streamParams).toString();

        return `${this.baseUrl}/Videos/${itemId}/stream?${queryString}&X-Emby-Token=${this.accessToken}`;
    }

    getHlsStreamUrl(itemId, params = {}) {
        const defaultParams = {
            UserId: this.userId,
            DeviceId: this.deviceId,
            MaxStreamingBitrate: 120000000,
            Container: 'ts',
            TranscodingMaxAudioChannels: 2,
            TranscodingProtocol: 'hls',
            AudioCodec: 'aac',
            VideoCodec: 'h264',
            PlaySessionId: this.generatePlaySessionId(),
            mediaSourceId: itemId
        };

        const streamParams = { ...defaultParams, ...params };
        const queryString = new URLSearchParams(streamParams).toString();

        // Use proxy endpoint to handle authentication properly
        return `/hls/${itemId}?${queryString}`;
    }

    generatePlaySessionId() {
        return crypto.randomBytes(16).toString('hex');
    }

    async reportPlaybackStart(itemId, playSessionId) {
        try {
            await axios.post(`${this.baseUrl}/Sessions/Playing`, {
                ItemId: itemId,
                PlaySessionId: playSessionId,
                MediaSourceId: itemId,
                CanSeek: true
            }, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error('Failed to report playback start:', error.response?.data || error.message);
        }
    }

    async reportPlaybackProgress(itemId, playSessionId, positionTicks) {
        try {
            await axios.post(`${this.baseUrl}/Sessions/Playing/Progress`, {
                ItemId: itemId,
                PlaySessionId: playSessionId,
                MediaSourceId: itemId,
                PositionTicks: positionTicks,
                CanSeek: true,
                IsPaused: false
            }, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error('Failed to report playback progress:', error.response?.data || error.message);
        }
    }

    async reportPlaybackStop(itemId, playSessionId, positionTicks) {
        try {
            await axios.post(`${this.baseUrl}/Sessions/Playing/Stopped`, {
                ItemId: itemId,
                PlaySessionId: playSessionId,
                MediaSourceId: itemId,
                PositionTicks: positionTicks
            }, {
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error('Failed to report playback stop:', error.response?.data || error.message);
        }
    }
}

module.exports = JellyfinClient;
