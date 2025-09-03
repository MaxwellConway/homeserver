import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import MoviesPage from './components/MoviesPage';
import TVShowsPage from './components/TVShowsPage';
import SearchPage from './components/SearchPage';
import MovieDetailPage from './components/MovieDetailPage';
import TVShowDetailPage from './components/TVShowDetailPage';
import GenrePage from './components/GenrePage';
import VideoPlayer from './components/VideoPlayer';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <div className="app-body">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/movies" element={<MoviesPage />} />
              <Route path="/tv-shows" element={<TVShowsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/genre/:genre" element={<GenrePage />} />
              <Route path="/movie/:id" element={<MovieDetailPage />} />
              <Route path="/tv-show/:id" element={<TVShowDetailPage />} />
              <Route path="/watch/:id" element={<VideoPlayer />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
