import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import VideoCard from './VideoCard';
import LoadingSpinner from './LoadingSpinner';
import SkeletonCard from './SkeletonCard';

function GenrePage() {
  const { genre } = useParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGenreVideos();
  }, [genre]);

  const fetchGenreVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/videos/genre/${encodeURIComponent(genre)}`);
      if (response.ok) {
        const data = await response.json();
        setVideos(Array.isArray(data) ? data : []);
      } else {
        console.error('Error fetching genre videos:', response.status);
        setVideos([]);
      }
    } catch (error) {
      console.error('Error fetching genre videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1>{genre} Movies & Shows</h1>
        <div className="video-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>{genre} Movies & Shows</h1>
      {videos.length === 0 ? (
        <div className="no-results">
          <p>No {genre.toLowerCase()} content found in your library.</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map(video => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

export default GenrePage;
