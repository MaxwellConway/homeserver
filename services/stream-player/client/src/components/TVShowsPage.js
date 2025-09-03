import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoCard from './VideoCard';
import LoadingSpinner from './LoadingSpinner';
import SkeletonCard from './SkeletonCard';

function TVShowsPage() {
  const navigate = useNavigate();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTVShows();
  }, []);

  const fetchTVShows = async () => {
    try {
      const response = await fetch('/api/tv-shows');
      const data = await response.json();
      setShows(data);
    } catch (error) {
      console.error('Error fetching TV shows:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="section-title">TV Shows</h1>
        <div className="video-grid">
          {Array(12).fill().map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="section-title">TV Shows ({shows.length})</h1>
      {shows.length > 0 ? (
        <div className="video-grid">
          {shows.map(show => (
            <div 
              key={show.id}
              className="video-card"
              onClick={() => navigate(`/tv-show/${show.id}`)}
            >
              <div className="video-thumbnail">
                {show.poster ? (
                  <img
                    src={show.poster}
                    alt={show.title}
                    className="video-thumbnail-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="video-thumbnail-placeholder" style={{ display: show.poster ? 'none' : 'flex' }}>
                  📺
                </div>
              </div>
              <div className="video-info">
                <h3 className="video-title">{show.title}</h3>
                <div className="video-meta">
                  {show.year && <span className="video-year">{show.year}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#b3b3b3' }}>
          <p>No TV shows found. Make sure your media directory contains TV show files and try refreshing the library.</p>
        </div>
      )}
    </div>
  );
}

export default TVShowsPage;
