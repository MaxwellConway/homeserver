import React, { createContext, useContext, useState, useCallback } from 'react';

const SearchContext = createContext();

export function SearchProvider({ children }) {
  const [searchResults, setSearchResults] = useState({
    songs: [],
    albums: [],
    artists: [],
    loading: false,
    query: ''
  });

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults({
        songs: [],
        albums: [],
        artists: [],
        loading: false,
        query: ''
      });
      return;
    }

    setSearchResults(prev => ({ ...prev, loading: true, query }));

    try {
      // Search songs
      const songsResponse = await fetch(`/api/songs?search=${encodeURIComponent(query)}&limit=20`);
      const songsData = await songsResponse.json();

      // Search albums
      const albumsResponse = await fetch('/api/albums');
      const albumsData = await albumsResponse.json();
      const filteredAlbums = albumsData.filter(album => 
        album.album.toLowerCase().includes(query.toLowerCase()) ||
        album.artist.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);

      // Search artists
      const artistsResponse = await fetch('/api/artists');
      const artistsData = await artistsResponse.json();
      const filteredArtists = artistsData.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);

      setSearchResults({
        songs: songsData.songs || [],
        albums: filteredAlbums,
        artists: filteredArtists,
        loading: false,
        query
      });
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults(prev => ({ ...prev, loading: false }));
    }
  };

  const debouncedSearch = useCallback(debounce(performSearch, 300), []);

  const clearSearch = () => {
    setSearchResults({
      songs: [],
      albums: [],
      artists: [],
      loading: false,
      query: ''
    });
  };

  const value = {
    searchResults,
    performSearch: debouncedSearch,
    clearSearch
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
