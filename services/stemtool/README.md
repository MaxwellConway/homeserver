# StemTool - AI Music Stem Separation

A React web application that extracts audio from YouTube videos and separates it into individual stems (vocals, drums, bass, other) using AI-powered source separation.

## Features

- **YouTube Integration**: Extract audio from YouTube videos using yt-dlp
- **AI Stem Separation**: Separate audio into individual stems using Facebook's Demucs model
- **Web Interface**: Modern React frontend with real-time progress tracking
- **Audio Playback**: Built-in audio players for original audio and separated stems
- **Download Support**: Download original audio and individual stems as WAV files
- **Job Management**: Track multiple processing jobs with progress indicators

## Technology Stack

- **Frontend**: React 18, Axios
- **Backend**: Node.js, Express
- **Audio Processing**: yt-dlp, Demucs (Facebook AI Research)
- **Containerization**: Docker, Docker Compose
- **Reverse Proxy**: Traefik with Let's Encrypt SSL

## Quick Start

1. **Clone and navigate to the service directory**:
   ```bash
   cd /home/maxwell/homeserver/services/stemtool
   ```

2. **Build and start the service**:
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**:
   - Local: http://localhost:3001
   - Production: https://stemtool.maxconway.com

## API Endpoints

### Processing
- `POST /api/process` - Start processing a YouTube URL
- `GET /api/jobs/:jobId` - Get job status and progress
- `GET /api/jobs` - List all jobs

### File Serving
- `GET /api/files/:jobId/:filename` - Stream audio file
- `GET /api/files/:jobId/:filename?download=true` - Download audio file

### Management
- `DELETE /api/jobs/:jobId` - Delete job and associated files
- `GET /api/health` - Service health check

## How It Works

1. **Audio Extraction**: yt-dlp downloads and converts YouTube video to high-quality WAV audio
2. **Stem Separation**: Demucs AI model separates audio into 4 stems:
   - **Vocals**: Lead and backing vocals
   - **Drums**: Drum kit and percussion
   - **Bass**: Bass guitar and low-frequency instruments
   - **Other**: Everything else (guitars, keyboards, etc.)
3. **File Management**: Processed files are stored temporarily and served via HTTP
4. **Real-time Updates**: Frontend polls for job progress and updates UI accordingly

## File Structure

```
stemtool/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Component styles
│   │   ├── index.js       # React entry point
│   │   └── index.css      # Global styles
│   ├── public/
│   │   └── index.html     # HTML template
│   └── package.json       # Frontend dependencies
├── src/
│   └── server.js          # Express backend server
├── data/                  # Processing workspace (created at runtime)
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker Compose configuration
├── package.json           # Backend dependencies
└── README.md             # This file
```

## Processing Pipeline

1. **Input Validation**: Validates YouTube URL format
2. **Job Creation**: Creates unique job ID and workspace directory
3. **Audio Download**: Uses yt-dlp to extract high-quality audio
4. **Stem Separation**: Processes audio through Demucs model
5. **File Organization**: Moves separated stems to accessible location
6. **Cleanup**: Removes temporary processing files

## Configuration

The service is configured through Docker Compose with:
- **Port**: 3001 (internal), proxied through Traefik
- **Domain**: stemtool.maxconway.com
- **SSL**: Automatic Let's Encrypt certificates
- **Storage**: Persistent volume for processing workspace

## Dependencies

### System Requirements
- Docker and Docker Compose
- Sufficient disk space for audio processing
- Internet connection for YouTube access

### Key Libraries
- **yt-dlp**: YouTube video/audio extraction
- **Demucs**: AI-powered source separation
- **FFmpeg**: Audio format conversion
- **React**: Frontend framework
- **Express**: Backend web server

## Performance Notes

- Processing time varies by audio length (typically 2-5 minutes for a 3-minute song)
- Demucs requires significant CPU resources during separation
- Temporary files are cleaned up after processing
- Multiple jobs can be processed concurrently

## Troubleshooting

### Common Issues
1. **YouTube URL not working**: Ensure URL is valid and video is accessible
2. **Processing stuck**: Check Docker logs for yt-dlp or Demucs errors
3. **Audio not playing**: Verify browser supports WAV format
4. **Slow processing**: Demucs is CPU-intensive, processing time is normal

### Logs
```bash
docker-compose logs -f stemtool
```

## Development

### Local Development
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install

# Start backend (development mode)
npm run dev

# Start frontend (separate terminal)
cd client && npm start
```

### Building
```bash
# Build Docker image
docker-compose build

# Build frontend only
npm run build
```

## License

MIT License - See package.json for details
