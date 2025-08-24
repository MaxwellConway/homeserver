import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ArtistsView() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const response = await fetch('/api/artists');
      const data = await response.json();
      setArtists(data);
    } catch (error) {
      console.error('Failed to fetch artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArtistClick = (artist) => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div>
        <div className="content-header">
          <h1 className="content-title">Artists</h1>
          <p className="content-subtitle">Loading your music collection...</p>
        </div>
        <div className="loading">Loading artists...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="content-header">
        <h1 className="content-title">Artists</h1>
        <p className="content-subtitle">{artists.length} artists in your library</p>
      </div>
      
      <div className="grid">
        {artists.map((artist, index) => (
          <div
            key={artist.name}
            className="card"
            onClick={() => handleArtistClick(artist)}
          >
            <div className="card-image">
              <img
                src={artist.artworkUrl}
                alt={artist.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="card-image-placeholder" style={{ display: 'none' }}>
                👤
              </div>
            </div>
            <div className="card-title">{artist.name}</div>
            <div className="card-subtitle">
              {artist.albumCount} albums • {artist.songCount} songs • {formatTime(artist.totalDuration)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ArtistsView;
