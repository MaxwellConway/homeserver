import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch jobs on component mount and periodically
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/api/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/process', { url });
      console.log('Job started:', response.data);
      setUrl('');
      fetchJobs(); // Refresh jobs list
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to start processing');
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async (jobId) => {
    try {
      await axios.delete(`/api/jobs/${jobId}`);
      fetchJobs(); // Refresh jobs list
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const getFileUrl = (jobId, filename, download = false) => {
    const params = download ? '?download=true' : '';
    return `/api/files/${jobId}/${filename}${params}`;
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🎵 StemTool</h1>
          <p>AI-powered music stem separation from YouTube videos</p>
        </header>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="url">YouTube URL</label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                disabled={loading}
              />
            </div>
            
            {error && <div className="error">{error}</div>}
            
            <button type="submit" className="btn" disabled={loading || !url.trim()}>
              {loading ? '🔄 Starting...' : '🚀 Process Video'}
            </button>
          </form>
        </div>

        <div className="job-list">
          {jobs.length === 0 ? (
            <div className="loading">
              <p>No jobs yet. Submit a YouTube URL to get started!</p>
            </div>
          ) : (
            jobs.map((job) => (
              <JobItem
                key={job.id}
                job={job}
                onDelete={deleteJob}
                getFileUrl={getFileUrl}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function JobItem({ job, onDelete, getFileUrl }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'error': return 'status-error';
      default: return 'status-starting';
    }
  };

  const formatStemName = (filename) => {
    // Extract stem name from filename (e.g., "vocals.wav" -> "Vocals")
    const name = filename.replace('.wav', '').replace(/[_-]/g, ' ');
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="job-item">
      <div className="job-header">
        <div>
          <span className={`status-badge ${getStatusColor(job.status)}`}>
            {job.status}
          </span>
          <div className="job-url">{job.url}</div>
        </div>
        <button
          className="btn btn-danger btn-small"
          onClick={() => onDelete(job.id)}
        >
          🗑️ Delete
        </button>
      </div>

      {job.progress > 0 && job.status !== 'completed' && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${job.progress}%` }}
          ></div>
        </div>
      )}

      {job.error && (
        <div className="error">
          <strong>Error:</strong> {job.error}
        </div>
      )}

      {job.status === 'downloading' && (
        <p>📥 Downloading audio from YouTube...</p>
      )}

      {job.status === 'separating' && (
        <p>🎛️ Separating audio stems using AI...</p>
      )}

      {job.files?.original && (
        <div className="audio-player">
          <h4>📻 Original Audio</h4>
          <audio controls>
            <source src={getFileUrl(job.id, job.files.original)} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
          <div className="file-actions">
            <a 
              href={getFileUrl(job.id, job.files.original, true)}
              className="btn btn-secondary btn-small"
              download
            >
              💾 Download
            </a>
          </div>
        </div>
      )}

      {job.files?.stems && job.files.stems.length > 0 && (
        <div>
          <h4>🎼 Separated Stems</h4>
          <div className="stems-grid">
            {job.files.stems.map((stem, index) => (
              <div key={index} className="stem-item">
                <div className="stem-name">{formatStemName(stem)}</div>
                <audio controls>
                  <source src={getFileUrl(job.id, stem)} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
                <div className="file-actions">
                  <a 
                    href={getFileUrl(job.id, stem, true)}
                    className="btn btn-secondary btn-small"
                    download
                  >
                    💾 Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
