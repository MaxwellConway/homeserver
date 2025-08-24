import React, { createContext, useContext, useReducer, useRef } from 'react';

const MusicPlayerContext = createContext();

const initialState = {
  currentSong: null,
  currentIndex: -1,
  isPlaying: false,
  queue: [],
  volume: 1,
  currentTime: 0,
  duration: 0,
  isLoading: false
};

function musicPlayerReducer(state, action) {
  switch (action.type) {
    case 'SET_CURRENT_SONG':
      return {
        ...state,
        currentSong: action.payload.song,
        currentIndex: action.payload.index,
        queue: action.payload.queue || state.queue
      };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'NEXT_SONG':
      if (state.currentIndex < state.queue.length - 1) {
        const nextIndex = state.currentIndex + 1;
        return {
          ...state,
          currentSong: state.queue[nextIndex],
          currentIndex: nextIndex
        };
      }
      return state;
    case 'PREVIOUS_SONG':
      if (state.currentIndex > 0) {
        const prevIndex = state.currentIndex - 1;
        return {
          ...state,
          currentSong: state.queue[prevIndex],
          currentIndex: prevIndex
        };
      }
      return state;
    default:
      return state;
  }
}

export function MusicPlayerProvider({ children }) {
  const [state, dispatch] = useReducer(musicPlayerReducer, initialState);
  const audioRef = useRef(null);

  const playSong = (song, index, queue) => {
    dispatch({
      type: 'SET_CURRENT_SONG',
      payload: { song, index, queue }
    });
    
    if (audioRef.current) {
      audioRef.current.src = song.audioUrl;
      audioRef.current.load();
      audioRef.current.play().then(() => {
        dispatch({ type: 'SET_PLAYING', payload: true });
      }).catch(console.error);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !state.currentSong) return;

    if (state.isPlaying) {
      audioRef.current.pause();
      dispatch({ type: 'SET_PLAYING', payload: false });
    } else {
      audioRef.current.play().then(() => {
        dispatch({ type: 'SET_PLAYING', payload: true });
      }).catch(console.error);
    }
  };

  const nextSong = () => {
    if (state.currentIndex < state.queue.length - 1) {
      const nextIndex = state.currentIndex + 1;
      const nextSongData = state.queue[nextIndex];
      
      dispatch({
        type: 'SET_CURRENT_SONG',
        payload: { song: nextSongData, index: nextIndex, queue: state.queue }
      });
      
      if (audioRef.current && nextSongData) {
        audioRef.current.src = nextSongData.audioUrl;
        audioRef.current.load();
        if (state.isPlaying) {
          audioRef.current.play().then(() => {
            dispatch({ type: 'SET_PLAYING', payload: true });
          }).catch(console.error);
        }
      }
    }
  };

  const previousSong = () => {
    if (state.currentIndex > 0) {
      const prevIndex = state.currentIndex - 1;
      const prevSongData = state.queue[prevIndex];
      
      dispatch({
        type: 'SET_CURRENT_SONG',
        payload: { song: prevSongData, index: prevIndex, queue: state.queue }
      });
      
      if (audioRef.current && prevSongData) {
        audioRef.current.src = prevSongData.audioUrl;
        audioRef.current.load();
        if (state.isPlaying) {
          audioRef.current.play().then(() => {
            dispatch({ type: 'SET_PLAYING', payload: true });
          }).catch(console.error);
        }
      }
    }
  };

  const seekTo = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const setVolume = (volume) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      dispatch({ type: 'SET_VOLUME', payload: volume });
    }
  };

  const value = {
    ...state,
    audioRef,
    playSong,
    togglePlayPause,
    nextSong,
    previousSong,
    seekTo,
    setVolume,
    dispatch
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            dispatch({ type: 'SET_TIME', payload: audioRef.current.currentTime });
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            dispatch({ type: 'SET_DURATION', payload: audioRef.current.duration });
          }
        }}
        onEnded={nextSong}
        preload="none"
      />
    </MusicPlayerContext.Provider>
  );
}

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};
