import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMusicPlayer } from '../utils/MusicPlayerContext';

function AlbumDetailView() {
  const { artist, album } = useParams();
  const [albumData, setAlbumData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playSong, currentSong } = useMusicPlayer();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlbumDetails();
  }, [artist, album]);

  const fetchAlbumDetails = async () => {
    try {
      const response = await fetch(`/api/album/${encodeURIComponent(artist)}/${encodeURIComponent(album)}`);
      if (response.ok) {
        const data = await response.json();
        setAlbumData(data);
      } else {
        console.error('Album not found');
        navigate('/albums');
      }
    } catch (error) {
      console.error('Failed to fetch album details:', error);
      navigate('/albums');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSongClick = (song, index) => {
    playSong(song, index, albumData.songs);
  };

  const handlePlayAlbum = () => {
    if (albumData.songs && albumData.songs.length > 0) {
      playSong(albumData.songs[0], 0, albumData.songs);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="content-header">
          <h1 className="content-title">Loading Album...</h1>
        </div>
        <div className="loading">Loading album details...</div>
      </div>
    );
  }

  if (!albumData) {
    return (
      <div>
        <div className="content-header">
          <h1 className="content-title">Album Not Found</h1>
          <p className="content-subtitle">The requested album could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="album-header">
        <div className="album-artwork-large">
          <img
            src={albumData.artworkUrl}
            alt={`${albumData.album} by ${albumData.artist}`}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="album-artwork-placeholder" style={{ display: 'none' }}>
            💿
          </div>
        </div>
        <div className="album-info">
          <div className="album-type">Album</div>
          <h1 className="album-title">{albumData.album}</h1>
          <div className="album-details">
            <span className="album-artist">{albumData.artist}</span>
            {albumData.year && <span> • {albumData.year}</span>}
            <span> • {albumData.songCount} songs</span>
            <span> • {formatTime(albumData.totalDuration)}</span>
          </div>
          <button className="play-album-btn" onClick={handlePlayAlbum}>
            ▶️ Play Album
          </button>
        </div>
      </div>

      <div className="album-tracks">
        <div className="tracks-header">
          <div className="track-number">#</div>
          <div className="track-title">Title</div>
          <div className="track-duration">⏱️</div>
        </div>
        
        {albumData.songs.map((song, index) => (
          <div
            key={`${song.path}-${index}`}
            className={`track-item ${currentSong && currentSong.path === song.path ? 'playing' : ''}`}
            onClick={() => handleSongClick(song, index)}
          >
            <div className="track-number">
              {currentSong && currentSong.path === song.path ? '🔊' : (song.track || index + 1)}
            </div>
            <div className="track-info">
              <div className="track-title">{song.title}</div>
              <div className="track-artist">{song.artist}</div>
            </div>
            <div className="track-duration">{formatTime(song.duration)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlbumDetailView;
