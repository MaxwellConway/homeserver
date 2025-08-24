import React, { useState, useEffect, useMemo } from 'react';
import { useMusicPlayer } from '../utils/MusicPlayerContext';

function SongsView() {
  const [allSongs, setAllSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterBy, setFilterBy] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [availableArtists, setAvailableArtists] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);
  const { playSong, currentSong } = useMusicPlayer();

  useEffect(() => {
    fetchAllSongs();
  }, []);

  const fetchAllSongs = async () => {
    try {
      // Fetch all songs without pagination for better sorting/filtering
      const response = await fetch('/api/songs?limit=10000');
      const data = await response.json();
      
      setAllSongs(data.songs);
      
      // Extract unique artists and genres for filtering
      const artists = [...new Set(data.songs.map(song => song.artist))].sort();
      const genres = [...new Set(data.songs.map(song => song.genre).filter(g => g && g !== 'Unknown'))].sort();
      
      setAvailableArtists(artists);
      setAvailableGenres(genres);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoized filtered and sorted songs
  const filteredAndSortedSongs = useMemo(() => {
    let filtered = allSongs;

    // Apply filters
    if (filterBy !== 'all' && filterValue) {
      filtered = allSongs.filter(song => {
        switch (filterBy) {
          case 'artist':
            return song.artist === filterValue;
          case 'genre':
            return song.genre === filterValue;
          case 'album':
            return song.album.toLowerCase().includes(filterValue.toLowerCase());
          default:
            return true;
        }
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'artist':
          aVal = a.artist.toLowerCase();
          bVal = b.artist.toLowerCase();
          break;
        case 'album':
          aVal = a.album.toLowerCase();
          bVal = b.album.toLowerCase();
          break;
        case 'duration':
          aVal = a.duration;
          bVal = b.duration;
          break;
        case 'year':
          aVal = a.year || 0;
          bVal = b.year || 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return sorted;
  }, [allSongs, sortBy, sortOrder, filterBy, filterValue]);

  const handleSongClick = (song, index) => {
    playSong(song, index, filteredAndSortedSongs);
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const handleFilterChange = (newFilterBy) => {
    setFilterBy(newFilterBy);
    setFilterValue('');
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
          <h1 className="content-title">Songs</h1>
          <p className="content-subtitle">Loading your music collection...</p>
        </div>
        <div className="loading">Loading songs...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="content-header">
        <h1 className="content-title">Songs</h1>
        <p className="content-subtitle">{filteredAndSortedSongs.length} of {allSongs.length} songs</p>
      </div>

      {/* Controls */}
      <div className="songs-controls">
        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="album">Album</option>
            <option value="duration">Duration</option>
            <option value="year">Year</option>
          </select>
          <button 
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <div className="filter-controls">
          <label>Filter by:</label>
          <select value={filterBy} onChange={(e) => handleFilterChange(e.target.value)}>
            <option value="all">All Songs</option>
            <option value="artist">Artist</option>
            <option value="genre">Genre</option>
            <option value="album">Album</option>
          </select>
          
          {filterBy === 'artist' && (
            <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
              <option value="">Select Artist</option>
              {availableArtists.map(artist => (
                <option key={artist} value={artist}>{artist}</option>
              ))}
            </select>
          )}
          
          {filterBy === 'genre' && (
            <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
              <option value="">Select Genre</option>
              {availableGenres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          )}
          
          {filterBy === 'album' && (
            <input
              type="text"
              placeholder="Search albums..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
          )}
          
          {filterBy !== 'all' && filterValue && (
            <button 
              className="clear-filter-btn"
              onClick={() => setFilterValue('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Songs Table */}
      <div className="songs-table">
        <div className="songs-table-header">
          <div className="col-number">#</div>
          <div className="col-title" onClick={() => handleSortChange('title')}>
            Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div className="col-artist" onClick={() => handleSortChange('artist')}>
            Artist {sortBy === 'artist' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div className="col-album" onClick={() => handleSortChange('album')}>
            Album {sortBy === 'album' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div className="col-duration" onClick={() => handleSortChange('duration')}>
            ⏱️ {sortBy === 'duration' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
        </div>
        
        {filteredAndSortedSongs.map((song, index) => (
          <div
            key={`${song.path}-${index}`}
            className={`songs-table-row ${currentSong?.path === song.path ? 'playing' : ''}`}
            onClick={() => handleSongClick(song, index)}
          >
            <div className="col-number">
              {currentSong?.path === song.path ? '🔊' : index + 1}
            </div>
            <div className="col-title">
              <div className="song-title-cell">
                <img
                  src={song.artworkUrl}
                  alt={`${song.album} by ${song.artist}`}
                  className="song-artwork-small"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="song-artwork-placeholder-small" style={{ display: 'none' }}>
                  🎵
                </div>
                <div className="song-title-info">
                  <div className="song-title">{song.title}</div>
                  <div className="song-artist-small">{song.artist}</div>
                </div>
              </div>
            </div>
            <div className="col-artist">{song.artist}</div>
            <div className="col-album">{song.album}</div>
            <div className="col-duration">{formatTime(song.duration)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SongsView;
