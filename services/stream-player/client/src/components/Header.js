import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-left">
        <Link to="/" className="logo">
          StreamPlayer
        </Link>
        <nav>
          <ul className="nav-links">
            <li>
              <Link to="/" className={isActive('/') ? 'active' : ''}>
                Home
              </Link>
            </li>
            <li>
              <Link to="/movies" className={isActive('/movies') ? 'active' : ''}>
                Movies
              </Link>
            </li>
            <li>
              <Link to="/tv-shows" className={isActive('/tv-shows') ? 'active' : ''}>
                TV Shows
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      
      <div className="header-right">
        <form onSubmit={handleSearch} className="search-container">
          <input
            type="text"
            placeholder="Search movies and TV shows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            🔍
          </button>
        </form>
      </div>
    </header>
  );
}

export default Header;
