import React from 'react';
import { useNavigate } from 'react-router-dom';

function VideoCard({ video }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (video.type === 'movie') {
      navigate(`/movie/${video.id}`);
    } else if (video.type === 'series') {
      navigate(`/tv-show/${video.id}`);
    } else if (video.type === 'episode') {
      navigate(`/watch/${video.id}`, { state: { video } });
    } else {
      navigate(`/watch/${video.id}`, { state: { video } });
    }
  };

  const formatRuntime = (minutesTotal) => {
    if (!minutesTotal && minutesTotal !== 0) return '';
    const hours = Math.floor(minutesTotal / 60);
    const minutes = Math.floor(minutesTotal % 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getVideoIcon = () => {
    if (video.type === 'movie') return '🎬';
    if (video.type === 'series') return '📺';
    if (video.type === 'episode') return '📺';
    return '🎞️';
  };

  return (
    <div className="video-card" onClick={handleClick}>
      <div className="video-thumbnail">
        {video.poster ? (
          <img 
            src={video.poster} 
            alt={video.title}
            className="video-thumbnail-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className="video-thumbnail-placeholder" style={{ display: video.poster ? 'none' : 'flex' }}>
          {getVideoIcon()}
        </div>
      </div>
      <div className="video-info">
        <h3 className="video-title">{video.title}</h3>
        <div className="video-meta">
          {video.runtime && <span>{formatRuntime(video.runtime)}</span>}
          {video.year && <span className="video-year">{video.year}</span>}
        </div>
        {video.type === 'episode' && video.season_number && video.episode_number && (
          <div className="video-meta">
            <span>S{video.season_number.toString().padStart(2, '0')}E{video.episode_number.toString().padStart(2, '0')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoCard;
