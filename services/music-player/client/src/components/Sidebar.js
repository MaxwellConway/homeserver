import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'albums', label: 'Albums', icon: '💿', path: '/albums' },
    { id: 'artists', label: 'Artists', icon: '👤', path: '/artists' },
    { id: 'songs', label: 'Songs', icon: '🎵', path: '/songs' }
  ];

  const handleItemClick = (path) => {
    navigate(path);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-title">Library</h3>
        {menuItems.map(item => (
          <div
            key={item.id}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => handleItemClick(item.path)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
