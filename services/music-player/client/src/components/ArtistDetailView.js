import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMusicPlayer } from '../utils/MusicPlayerContext';

function ArtistDetailView() {
  const { name } = useParams();
  const [artistData, setArtistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playSong, currentSong } = useMusicPlayer();
  const navigate = useNavigate();

  useEffect(() => {
    fetchArtistDetails();
  }, [name]);

  const fetchArtistDetails = async () => {
    try {
      const response = await fetch(`/api/artist/${encodeURIComponent(name)}`);
      if (response.ok) {
        const data = await response.json();
        setArtistData(data);
      } else {
        console.error('Artist not found');
        navigate('/artists');
      }
    } catch (error) {
      console.error('Failed to fetch artist details:', error);
      navigate('/artists');
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

  const handleSongClick = (song, index, songList) => {
    playSong(song, index, songList);
  };

  const handleAlbumClick = (album) => {
    navigate(`/album/${encodeURIComponent(album.artist)}/${encodeURIComponent(album.album)}`);
  };

  const handlePlayTopSongs = () => {
    if (artistData.topSongs && artistData.topSongs.length > 0) {
      playSong(artistData.topSongs[0], 0, artistData.topSongs);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="content-header">
          <h1 className="content-title">Loading Artist...</h1>
        </div>
        <div className="loading">Loading artist details...</div>
      </div>
    );
  }

  if (!artistData) {
    return (
      <div>
        <div className="content-header">
          <h1 className="content-title">Artist Not Found</h1>
          <p className="content-subtitle">The requested artist could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="artist-header">
        <div className="artist-artwork-large">
          <img
            src={artistData.artworkUrl}
            alt={artistData.name}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="artist-artwork-placeholder" style={{ display: 'none' }}>
            👤
          </div>
        </div>
        <div className="artist-info">
          <div className="artist-type">Artist</div>
          <h1 className="artist-title">{artistData.name}</h1>
          <div className="artist-details">
            <span>{artistData.albumCount} albums</span>
            <span> • {artistData.songCount} songs</span>
          </div>
          <button className="play-artist-btn" onClick={handlePlayTopSongs}>
            ▶️ Play Top Songs
          </button>
        </div>
      </div>

      {/* Top Songs Section */}
      <div className="artist-section">
        <h2 className="section-title">Popular Songs</h2>
        <div className="songs-list">
          {artistData.topSongs.slice(0, 5).map((song, index) => (
            <div
              key={`${song.path}-${index}`}
              className={`song-item ${currentSong && currentSong.path === song.path ? 'playing' : ''}`}
              onClick={() => handleSongClick(song, index, artistData.topSongs)}
            >
              <div className="song-artwork">
                <img
                  src={song.artworkUrl}
                  alt={`${song.album} by ${song.artist}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="card-image-placeholder" style={{ display: 'none' }}>
                  🎵
                </div>
              </div>
              <div className="song-info">
                <div className="song-title">{song.title}</div>
                <div className="song-artist">{song.album}</div>
              </div>
              <div className="song-duration">{formatTime(song.duration)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Albums Section */}
      <div className="artist-section">
        <h2 className="section-title">Albums</h2>
        <div className="grid">
          {artistData.albums.map((album, index) => (
            <div
              key={`${album.artist}-${album.album}`}
              className="card"
              onClick={() => handleAlbumClick(album)}
            >
              <div className="card-image">
                <img
                  src={album.artworkUrl}
                  alt={`${album.album} by ${album.artist}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="card-image-placeholder" style={{ display: 'none' }}>
                  💿
                </div>
              </div>
              <div className="card-title">{album.album}</div>
              <div className="card-subtitle">
                {album.year || 'Unknown Year'} • {album.songCount} songs
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ArtistDetailView;
