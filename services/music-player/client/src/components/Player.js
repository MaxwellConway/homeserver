import React from 'react';
import { useMusicPlayer } from '../utils/MusicPlayerContext';

function Player() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlayPause,
    nextSong,
    previousSong,
    seekTo,
    setVolume
  } = useMusicPlayer();

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * duration;
    seekTo(seekTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  if (!currentSong) {
    return (
      <div className="player">
        <div className="player-info">
          <div className="player-artwork">
            <div className="card-image-placeholder">🎵</div>
          </div>
          <div className="player-details">
            <div className="player-title">No song selected</div>
            <div className="player-artist">Choose a song to start playing</div>
          </div>
        </div>
        <div className="player-controls">
          <div className="control-buttons">
            <button className="control-btn" disabled>⏮️</button>
            <button className="control-btn play-btn" disabled>▶️</button>
            <button className="control-btn" disabled>⏭️</button>
          </div>
          <div className="progress-container">
            <span className="progress-time">0:00</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '0%' }}></div>
            </div>
            <span className="progress-time">0:00</span>
          </div>
        </div>
        <div className="player-volume">
          <span>🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            style={{ width: '80px' }}
          />
        </div>
      </div>
    );
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="player">
      <div className="player-info">
        <div className="player-artwork">
          <img
            src={currentSong.artworkUrl}
            alt={`${currentSong.album} by ${currentSong.artist}`}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="card-image-placeholder" style={{ display: 'none' }}>
            🎵
          </div>
        </div>
        <div className="player-details">
          <div className="player-title">{currentSong.title}</div>
          <div className="player-artist">{currentSong.artist}</div>
        </div>
      </div>

      <div className="player-controls">
        <div className="control-buttons">
          <button className="control-btn" onClick={previousSong}>
            ⏮️
          </button>
          <button className="control-btn play-btn" onClick={togglePlayPause}>
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <button className="control-btn" onClick={nextSong}>
            ⏭️
          </button>
        </div>
        
        <div className="progress-container">
          <span className="progress-time">{formatTime(currentTime)}</span>
          <div className="progress-bar" onClick={handleProgressClick}>
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="progress-time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-volume">
        <span>🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          style={{ width: '80px' }}
        />
      </div>
    </div>
  );
}

export default Player;
