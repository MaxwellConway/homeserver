import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoCard from './VideoCard';

function TVShowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(null);

  useEffect(() => {
    fetchShowDetails();
  }, [id]);

  const fetchShowDetails = async () => {
    try {
      // Get show info
      const showsResponse = await fetch('/api/tv-shows');
      const shows = await showsResponse.json();
      const foundShow = shows.find(s => String(s.id) === String(id));
      
      if (foundShow) {
        setShow(foundShow);
        
        // Get episodes
        const episodesResponse = await fetch(`/api/tv-shows/${foundShow.id}/episodes`);
        const episodesData = await episodesResponse.json();
        setEpisodes(episodesData);
        
        // Set default season
        if (episodesData.length > 0) {
          setSelectedSeason(episodesData[0].season_number);
        }
      } else {
        navigate('/tv-shows');
      }
    } catch (error) {
      console.error('Error fetching show details:', error);
      navigate('/tv-shows');
    } finally {
      setLoading(false);
    }
  };

  const getSeasons = () => {
    const seasons = [...new Set(episodes.map(ep => ep.season_number))].sort((a, b) => a - b);
    return seasons;
  };

  const getEpisodesForSeason = (season) => {
    return episodes
      .filter(ep => ep.season_number === season)
      .sort((a, b) => a.episode_number - b.episode_number);
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-hero skeleton">
          <div className="detail-content">
            <div className="skeleton-title" style={{ width: '400px', height: '48px', marginBottom: '20px' }}></div>
            <div className="skeleton-meta" style={{ width: '300px', height: '20px', marginBottom: '15px' }}></div>
            <div className="skeleton-meta" style={{ width: '500px', height: '60px', marginBottom: '30px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="detail-page">
        <div style={{ textAlign: 'center', padding: '40px', color: '#b3b3b3' }}>
          <p>TV Show not found</p>
        </div>
      </div>
    );
  }

  const seasons = getSeasons();
  const currentSeasonEpisodes = selectedSeason ? getEpisodesForSeason(selectedSeason) : [];

  return (
    <div className="detail-page">
      <div className="detail-hero">
        <div className="detail-backdrop">
          {show.backdrop ? (
            <img 
              src={show.backdrop}
              alt={show.title}
              className="detail-backdrop-image"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className="detail-backdrop-placeholder" style={{ display: show?.backdrop ? 'none' : 'flex' }}>
            📺
          </div>
        </div>
        <div className="detail-content">
          <div className="detail-info">
            <h1 className="detail-title">{show.title}</h1>
            <div className="detail-meta">
              {show.year && <span className="detail-year">{show.year}</span>}
              <span className="detail-seasons">{seasons.length} season{seasons.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="detail-description">
              {show.overview && <p>{show.overview}</p>}
            </div>
            <div className="detail-buttons">
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const firstEpisode = currentSeasonEpisodes[0];
                  if (firstEpisode) {
                    navigate(`/watch/${firstEpisode.id}`, { state: { video: firstEpisode } });
                  }
                }}
                disabled={currentSeasonEpisodes.length === 0}
              >
                ▶️ Play First Episode
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/tv-shows')}>
                ← Back to TV Shows
              </button>
            </div>
          </div>
          <div className="detail-poster">
            {show.poster ? (
              <img 
                src={show.poster}
                alt={show.title}
                className="detail-poster-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="detail-poster-placeholder" style={{ display: show?.poster ? 'none' : 'flex' }}>
              📺
            </div>
          </div>
        </div>
      </div>

      <div className="detail-episodes">
        <div className="season-selector">
          <h3>Episodes</h3>
          {seasons.length > 1 && (
            <div className="season-tabs">
              {seasons.map(season => (
                <button
                  key={season}
                  className={`season-tab ${selectedSeason === season ? 'active' : ''}`}
                  onClick={() => setSelectedSeason(season)}
                >
                  Season {season}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="episodes-grid">
          {currentSeasonEpisodes.map(episode => (
            <div key={episode.id} className="episode-card">
              <div className="episode-thumbnail">
                📺
              </div>
              <div className="episode-info">
                <h4 className="episode-title">
                  Episode {episode.episode_number}: {episode.title}
                </h4>
                <div className="episode-meta">
                  <span>S{episode.season_number.toString().padStart(2, '0')}E{episode.episode_number.toString().padStart(2, '0')}</span>
                </div>
                <button 
                  className="btn btn-primary episode-play-btn"
                  onClick={() => navigate(`/watch/${episode.id}`, { state: { video: episode } })}
                >
                  ▶️ Play
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TVShowDetailPage;
