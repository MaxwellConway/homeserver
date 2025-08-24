import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AlbumsView from './components/AlbumsView';
import ArtistsView from './components/ArtistsView';
import SongsView from './components/SongsView';
import SearchView from './components/SearchView';
import AlbumDetailView from './components/AlbumDetailView';
import ArtistDetailView from './components/ArtistDetailView';
import Player from './components/Player';
import { MusicPlayerProvider } from './utils/MusicPlayerContext';
import { SearchProvider } from './utils/SearchContext';

function App() {
  return (
    <MusicPlayerProvider>
      <SearchProvider>
        <Router>
          <div className="app">
            <Header />
            <div className="main-layout">
              <Sidebar />
              <main className="content">
                <Routes>
                  <Route path="/" element={<Navigate to="/albums" replace />} />
                  <Route path="/albums" element={<AlbumsView />} />
                  <Route path="/artists" element={<ArtistsView />} />
                  <Route path="/songs" element={<SongsView />} />
                  <Route path="/search" element={<SearchView />} />
                  <Route path="/album/:artist/:album" element={<AlbumDetailView />} />
                  <Route path="/artist/:name" element={<ArtistDetailView />} />
                </Routes>
              </main>
            </div>
            <Player />
          </div>
        </Router>
      </SearchProvider>
    </MusicPlayerProvider>
  );
}

export default App;
