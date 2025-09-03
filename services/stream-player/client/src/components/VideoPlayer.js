import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';

function VideoPlayer() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  const [video, setVideo] = useState(location.state?.video || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playInfo, setPlayInfo] = useState(null); // { hls_url, stream_url, poster, backdrop }

  useEffect(() => {
    if (!video) {
      fetchVideoData();
    }
    fetchPlaybackInfo();
  }, [id, video]);

  useEffect(() => {
    // Auto-play video when it loads
    if (videoRef.current && video) {
      const playVideo = async () => {
        try {
          await videoRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.log('Autoplay prevented by browser:', error);
        }
      };
      playVideo();
    }
  }, [video]);

  useEffect(() => {
    let timeout;
    if (showControls) {
      timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

  const fetchVideoData = async () => {
    try {
      const response = await fetch('/api/videos');
      const videos = await response.json();
      const foundVideo = videos.find(v => String(v.id) === String(id));
      if (foundVideo) {
        setVideo(foundVideo);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching video data:', error);
      navigate('/');
    }
  };

  const fetchPlaybackInfo = async () => {
    try {
      const res = await fetch(`/api/video-info/${id}`);
      const info = await res.json();
      setPlayInfo(info);
    } catch (e) {
      console.error('Error fetching playback info:', e);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const goBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !playInfo?.hls_url) return;

    if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = playInfo.hls_url;
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(playInfo.hls_url);
      hls.attachMedia(v);
      return () => {
        hls.destroy();
      };
    } else {
      // Fallback to direct stream
      v.src = playInfo.stream_url;
    }
  }, [playInfo]);

  if (!video || !playInfo) {
    return (
      <div className="video-player-container">
        <div style={{ color: 'white', textAlign: 'center' }}>
          Loading video...
        </div>
      </div>
    );
  }

  return (
    <div 
      className="video-player-container"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="video-player"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        controls={false}
        playsInline
        preload="metadata"
        muted={isMuted}
      />
      
      {showControls && (
        <div className="player-controls">
          <button className="control-button" onClick={goBack}>
            ←
          </button>
          
          <button className="control-button" onClick={togglePlay}>
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <div className="progress-container" onClick={handleProgressClick}>
            <div 
              className="progress-bar" 
              style={{ width: `${duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0}%` }}
            ></div>
          </div>
          
          <div className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          
          <button className="control-button" onClick={toggleMute}>
            {isMuted ? '🔇' : '🔊'}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            style={{ width: '80px', marginLeft: '10px' }}
            disabled={isMuted}
          />
          
          <button className="control-button" onClick={toggleFullscreen}>
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      )}
      
      {showControls && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.7)',
          padding: '10px 15px',
          borderRadius: '4px',
          color: 'white'
        }}>
          <h3>{video.title}</h3>
          {video.type === 'episode' && video.season_number && video.episode_number && (
            <p>Season {video.season_number}, Episode {video.episode_number}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
