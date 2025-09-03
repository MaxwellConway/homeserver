import React, { useState, useEffect } from 'react';
import VideoCard from './VideoCard';
import LoadingSpinner from './LoadingSpinner';
import SkeletonCard from './SkeletonCard';

function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await fetch('/api/movies');
      const data = await response.json();
      setMovies(data);
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="section-title">Movies</h1>
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
      <h1 className="section-title">Movies ({movies.length})</h1>
      {movies.length > 0 ? (
        <div className="video-grid">
          {movies.map(movie => (
            <VideoCard key={movie.id} video={movie} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#b3b3b3' }}>
          <p>No movies found. Make sure your media directory contains movie files and try refreshing the library.</p>
        </div>
      )}
    </div>
  );
}

export default MoviesPage;
