import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const [scanStatus, setScanStatus] = useState(null);
  const [genres, setGenres] = useState([]);
  const location = useLocation();

  useEffect(() => {
    fetchScanStatus();
    fetchGenres();
    const interval = setInterval(fetchScanStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchScanStatus = async () => {
    try {
      const response = await fetch('/api/scan-status');
      const data = await response.json();
      setScanStatus(data);
    } catch (error) {
      console.error('Error fetching scan status:', error);
    }
  };

  const fetchGenres = async () => {
    try {
      const response = await fetch('/api/genres');
      const data = await response.json();
      setGenres(data.slice(0, 8)); // Limit to first 8 genres
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const triggerScan = async () => {
    try {
      await fetch('/api/scan', { method: 'POST' });
      fetchScanStatus(); // Refresh status immediately
      fetchGenres(); // Refresh genres after scan
    } catch (error) {
      console.error('Error triggering scan:', error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3>Browse</h3>
        <ul className="sidebar-links">
          <li>
            <Link to="/" className={isActive('/') ? 'active' : ''}>
              🏠 Home
            </Link>
          </li>
          <li>
            <Link to="/movies" className={isActive('/movies') ? 'active' : ''}>
              🎬 Movies
            </Link>
          </li>
          <li>
            <Link to="/tv-shows" className={isActive('/tv-shows') ? 'active' : ''}>
              📺 TV Shows
            </Link>
          </li>
          <li>
            <Link to="/search" className={isActive('/search') ? 'active' : ''}>
              🔍 Search
            </Link>
          </li>
        </ul>
      </div>

      {scanStatus && (
        <div className="sidebar-section">
          <div className="scan-status">
            <h4>Library Status</h4>
            <div className="scan-info">
              <div>Videos: {scanStatus.video_count || 0}</div>
              {scanStatus.last_scan && (
                <div>Last scan: {new Date(scanStatus.last_scan).toLocaleDateString()}</div>
              )}
            </div>
            
            {scanStatus.is_scanning || scanStatus.scan_in_progress ? (
              <div>
                <div className="scan-progress">
                  <div 
                    className="scan-progress-bar" 
                    style={{ 
                      width: `${scanStatus.total_files > 0 ? 
                        (scanStatus.processed_files / scanStatus.total_files) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="scan-info">
                  Scanning... {scanStatus.processed_files || 0}/{scanStatus.total_files || 0}
                </div>
              </div>
            ) : (
              <button 
                onClick={triggerScan}
                className="btn btn-secondary"
                style={{ 
                  width: '100%', 
                  marginTop: '10px', 
                  padding: '8px 12px',
                  fontSize: '12px'
                }}
              >
                Refresh Library
              </button>
            )}
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <h3>Genres</h3>
        <ul className="sidebar-links">
          {genres.length > 0 ? (
            genres.map(genre => (
              <li key={genre}>
                <Link to={`/genre/${encodeURIComponent(genre)}`}>
                  {genre}
                </Link>
              </li>
            ))
          ) : (
            <>
              <li><Link to="/genre/Action">Action</Link></li>
              <li><Link to="/genre/Comedy">Comedy</Link></li>
              <li><Link to="/genre/Drama">Drama</Link></li>
              <li><Link to="/genre/Horror">Horror</Link></li>
              <li><Link to="/genre/Sci-Fi">Sci-Fi</Link></li>
              <li><Link to="/genre/Thriller">Thriller</Link></li>
            </>
          )}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
