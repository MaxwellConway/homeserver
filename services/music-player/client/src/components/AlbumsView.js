import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import SkeletonCard from './SkeletonCard';

function AlbumsView() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      const response = await fetch('/api/albums');
      const data = await response.json();
      setAlbums(data);
    } catch (error) {
      console.error('Failed to fetch albums:', error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleAlbumClick = (album) => {
    navigate(`/album/${encodeURIComponent(album.artist)}/${encodeURIComponent(album.album)}`);
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
        <h1 className="content-title">Albums</h1>
        <p className="content-subtitle">
          {loading ? 'Loading your music collection...' : `${albums.length} albums in your library`}
        </p>
      </div>
      
      <div className="grid">
        {loading && initialLoad ? (
          // Show skeleton cards while loading
          Array.from({ length: 12 }, (_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          albums.map((album, index) => (
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
                {album.artist} • {album.songCount} songs • {formatTime(album.totalDuration)}
              </div>
            </div>
          ))
        )}
      </div>
      
      {loading && !initialLoad && (
        <div className="loading-overlay">
          <LoadingSpinner size="small" message="Updating albums..." />
        </div>
      )}
    </div>
  );
}

export default AlbumsView;
