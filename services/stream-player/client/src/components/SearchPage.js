import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoCard from './VideoCard';
import LoadingSpinner from './LoadingSpinner';
import SkeletonCard from './SkeletonCard';

function SearchPage() {
  const [searchParams] = useSearchParams();
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const query = searchParams.get('q');
    const genre = searchParams.get('genre');
    
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    } else if (genre) {
      setSearchQuery(genre);
      performGenreSearch(genre);
    }
  }, [searchParams]);

  const performSearch = async (query) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const performGenreSearch = async (genre) => {
    setLoading(true);
    try {
      // For now, do a simple title search for the genre term
      // In the future, this could be enhanced with proper genre tagging
      const response = await fetch(`/api/search?q=${encodeURIComponent(genre)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching by genre:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(searchQuery.trim())}`);
      performSearch(searchQuery.trim());
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 className="section-title">Search</h1>
        <form onSubmit={handleSearch} className="search-container" style={{ position: 'relative', maxWidth: '500px' }}>
          <input
            type="text"
            placeholder="Search movies and TV shows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            style={{ width: '100%' }}
          />
          <button type="submit" className="search-button">
            🔍
          </button>
        </form>
      </div>

      {loading ? (
        <div className="video-grid">
          {Array(8).fill().map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div>
          <h2 className="section-title">Search Results ({searchResults.length})</h2>
          <div className="video-grid">
            {searchResults.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      ) : searchQuery ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#b3b3b3' }}>
          <p>No results found for "{searchQuery}"</p>
          <p>Try searching with different keywords or check your spelling.</p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#b3b3b3' }}>
          <p>Enter a search term to find movies and TV shows in your library.</p>
        </div>
      )}
    </div>
  );
}

export default SearchPage;
