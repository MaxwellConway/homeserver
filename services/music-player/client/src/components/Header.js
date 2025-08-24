import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSearch } from '../utils/SearchContext';

function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { performSearch, clearSearch } = useSearch();

  const tabs = [
    { id: 'albums', label: 'Albums', path: '/albums' },
    { id: 'artists', label: 'Artists', path: '/artists' },
    { id: 'songs', label: 'Songs', path: '/songs' }
  ];

  const handleTabClick = (path) => {
    navigate(path);
    if (searchQuery) {
      setSearchQuery('');
      clearSearch();
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      performSearch(query);
      navigate('/search');
    } else {
      clearSearch();
      if (location.pathname === '/search') {
        navigate('/albums');
      }
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">🎵 Music Player</div>
        <nav className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${location.pathname === tab.path ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.path)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search songs, artists, or albums..."
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>
    </header>
  );
}

export default Header;
