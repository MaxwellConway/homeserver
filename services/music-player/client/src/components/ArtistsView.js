import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import SkeletonCard from './SkeletonCard';

function ArtistsView() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
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
      setInitialLoad(false);
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

  return (
    <div>
      <div className="content-header">
        <h1 className="content-title">Artists</h1>
        <p className="content-subtitle">
          {loading ? 'Loading your music collection...' : `${artists.length} artists in your library`}
        </p>
      </div>
      
      <div className="grid">
        {loading && initialLoad ? (
          // Show skeleton cards while loading
          Array.from({ length: 12 }, (_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          artists.map((artist, index) => (
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
                  🎤
                </div>
              </div>
              <div className="card-title">{artist.name}</div>
              <div className="card-subtitle">
                {artist.albumCount} albums • {artist.songCount} songs • {formatTime(artist.totalDuration)}
              </div>
            </div>
          ))
        )}
      </div>
      
      {loading && !initialLoad && (
        <div className="loading-overlay">
          <LoadingSpinner size="small" message="Updating artists..." />
        </div>
      )}
    </div>
  );
}

export default ArtistsView;
