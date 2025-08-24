import React from 'react';
import { useSearch } from '../utils/SearchContext';
import { useMusicPlayer } from '../utils/MusicPlayerContext';
import { useNavigate } from 'react-router-dom';

function SearchView() {
  const { searchResults } = useSearch();
  const { playSong } = useMusicPlayer();
  const navigate = useNavigate();

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSongClick = (song, index) => {
    playSong(song, index, searchResults.songs);
  };

  const handleAlbumClick = (album) => {
    navigate(`/album/${encodeURIComponent(album.artist)}/${encodeURIComponent(album.album)}`);
  };

  const handleArtistClick = (artist) => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`);
  };

  if (!searchResults.query && !searchResults.loading) {
    return (
      <div>
        <div className="content-header">
          <h1 className="content-title">Search</h1>
          <p className="content-subtitle">Start typing to search your music library</p>
        </div>
      </div>
    );
  }

  if (searchResults.loading) {
    return (
      <div>
        <div className="content-header">
          <h1 className="content-title">Search</h1>
          <p className="content-subtitle">Searching for "{searchResults.query}"...</p>
        </div>
        <div className="loading">Searching...</div>
      </div>
    );
  }

  const hasResults = searchResults.songs.length > 0 || 
                    searchResults.albums.length > 0 || 
                    searchResults.artists.length > 0;

  if (!hasResults) {
    return (
      <div>
        <div className="content-header">
          <h1 className="content-title">Search</h1>
          <p className="content-subtitle">No results found for "{searchResults.query}"</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="content-header">
        <h1 className="content-title">Search Results</h1>
        <p className="content-subtitle">Results for "{searchResults.query}"</p>
      </div>

      {searchResults.artists.length > 0 && (
        <div className="search-section">
          <h2 className="section-title">Artists</h2>
          <div className="grid">
            {searchResults.artists.map((artist, index) => (
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
                  {artist.albumCount} albums • {artist.songCount} songs
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchResults.albums.length > 0 && (
        <div className="search-section">
          <h2 className="section-title">Albums</h2>
          <div className="grid">
            {searchResults.albums.map((album, index) => (
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
                  {album.artist} • {album.songCount} songs
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchResults.songs.length > 0 && (
        <div className="search-section">
          <h2 className="section-title">Songs</h2>
          <div className="songs-list">
            {searchResults.songs.map((song, index) => (
              <div
                key={`${song.path}-${index}`}
                className="song-item"
                onClick={() => handleSongClick(song, index)}
              >
                <div className="song-artwork">
                  <img
                    src={song.artworkUrl}
                    alt={`${song.album} by ${song.artist}`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="card-image-placeholder" style={{ display: 'none' }}>
                    🎵
                  </div>
                </div>
                <div className="song-info">
                  <div className="song-title">{song.title}</div>
                  <div className="song-artist">{song.artist} • {song.album}</div>
                </div>
                <div className="song-duration">{formatTime(song.duration)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchView;
