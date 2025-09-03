import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovieDetails();
  }, [id]);

  const fetchMovieDetails = async () => {
    try {
      const response = await fetch('/api/videos');
      const videos = await response.json();
      const foundMovie = videos.find(v => String(v.id) === String(id));
      if (foundMovie) {
        setMovie(foundMovie);
      } else {
        navigate('/movies');
      }
    } catch (error) {
      console.error('Error fetching movie details:', error);
      navigate('/movies');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    navigate(`/watch/${movie.id}`, { state: { video: movie } });
  };

  const formatRuntime = (minutesTotal) => {
    if (!minutesTotal && minutesTotal !== 0) return '';
    const hours = Math.floor(minutesTotal / 60);
    const minutes = Math.floor(minutesTotal % 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-hero skeleton">
          <div className="detail-content">
            <div className="skeleton-title" style={{ width: '400px', height: '48px', marginBottom: '20px' }}></div>
            <div className="skeleton-meta" style={{ width: '300px', height: '20px', marginBottom: '15px' }}></div>
            <div className="skeleton-meta" style={{ width: '500px', height: '60px', marginBottom: '30px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="detail-page">
        <div style={{ textAlign: 'center', padding: '40px', color: '#b3b3b3' }}>
          <p>Movie not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="detail-hero">
        <div className="detail-backdrop">
          {movie.backdrop ? (
            <img 
              src={movie.backdrop} 
              alt={movie.title}
              className="detail-backdrop-image"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="detail-backdrop-placeholder" style={{ display: movie.backdrop ? 'none' : 'flex' }}>
            🎬
          </div>
        </div>
        <div className="detail-content">
          <div className="detail-info">
            <h1 className="detail-title">{movie.title}</h1>
            <div className="detail-meta">
              {movie.year && <span className="detail-year">{movie.year}</span>}
              {movie.runtime && <span className="detail-duration">{formatRuntime(movie.runtime)}</span>}
              {movie.genres && <span className="detail-genres">{movie.genres.slice(0, 3).join(', ')}</span>}
            </div>
            <div className="detail-description">
              {movie.overview && <p>{movie.overview}</p>}
              {movie.rating && (
                <p>Rating: ⭐ {movie.rating}/10</p>
              )}
            </div>
            <div className="detail-buttons">
              <button className="btn btn-primary" onClick={handlePlay}>
                ▶️ Play Movie
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/movies')}>
                ← Back to Movies
              </button>
            </div>
          </div>
          <div className="detail-poster">
            {movie.poster ? (
              <img 
                src={movie.poster} 
                alt={movie.title}
                className="detail-poster-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="detail-poster-placeholder" style={{ display: movie.poster ? 'none' : 'flex' }}>
              🎬
            </div>
          </div>
        </div>
      </div>
      
      {(movie.runtime || movie.genres) && (
        <div className="detail-specs">
          <h3>Details</h3>
          <div className="specs-grid">
            {movie.runtime && (
              <div className="spec-item">
                <span className="spec-label">Runtime:</span>
                <span className="spec-value">{formatRuntime(movie.runtime)}</span>
              </div>
            )}
            {movie.genres && (
              <div className="spec-item">
                <span className="spec-label">Genres:</span>
                <span className="spec-value">{movie.genres.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MovieDetailPage;
