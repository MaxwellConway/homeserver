import React, { useState, useEffect } from 'react';
import VideoCard from './VideoCard';
import LoadingSpinner from './LoadingSpinner';
import SkeletonCard from './SkeletonCard';

function HomePage() {
  const [recentVideos, setRecentVideos] = useState([]);
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      const response = await fetch('/api/videos');
      const videos = await response.json();
      
      if (videos.length > 0) {
        // Set featured video as the first one
        setFeaturedVideo(videos[0]);
        // Show recent videos (limit to 12)
        setRecentVideos(videos.slice(0, 12));
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRuntime = (minutesTotal) => {
    if (!minutesTotal && minutesTotal !== 0) return '';
    const hours = Math.floor(minutesTotal / 60);
    const minutes = Math.floor(minutesTotal % 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div>
        <div className="hero-section">
          <div className="hero-background" style={{ background: '#333' }}></div>
          <div className="hero-content">
            <div className="skeleton-title" style={{ width: '300px', height: '48px', marginBottom: '15px' }}></div>
            <div className="skeleton-meta" style={{ width: '400px', height: '20px', marginBottom: '25px' }}></div>
            <div className="hero-buttons">
              <div className="skeleton-title" style={{ width: '120px', height: '44px' }}></div>
              <div className="skeleton-title" style={{ width: '120px', height: '44px' }}></div>
            </div>
          </div>
        </div>
        
        <div className="content-section">
          <h2 className="section-title">Recent Additions</h2>
          <div className="video-grid">
            {Array(8).fill().map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {featuredVideo && (
        <div className="hero-section">
          <div className="hero-background" style={{ background: 'linear-gradient(45deg, #1a1a1a, #333)' }}></div>
          <div className="hero-content">
            <h1 className="hero-title">{featuredVideo.title}</h1>
            <p className="hero-description">
              {featuredVideo.type === 'movie' ? 'Movie' : featuredVideo.type === 'series' ? 'TV Show' : 'Video'} • 
              {featuredVideo.year && ` ${featuredVideo.year} • `}
              {featuredVideo.runtime && `${formatRuntime(featuredVideo.runtime)} • `}
              {featuredVideo.genres && featuredVideo.genres.slice(0, 2).join(', ')}
            </p>
            <div className="hero-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => window.location.href = `/watch/${featuredVideo.id}`}
              >
                ▶️ Play
              </button>
              <button className="btn btn-secondary">
                ℹ️ More Info
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="content-section">
        <h2 className="section-title">Recent Additions</h2>
        {recentVideos.length > 0 ? (
          <div className="video-grid">
            {recentVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#b3b3b3' }}>
            <p>No videos found. Make sure your media directory contains video files and try refreshing the library.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
