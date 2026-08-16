import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import AuthView from './views/AuthView';
import DashboardView from './views/DashboardView';
import LobbyView from './views/LobbyView';
import GameView from './views/GameView';
import './App.css';

function App() {
  const { user, loading } = useAuth();
  const [activeLobbyId, setActiveLobbyId] = useState(null);
  const [inGame, setInGame] = useState(false);

  // Sync state if user details reload (handles browser refresh)
  useEffect(() => {
    if (user) {
      if (user.lobbyId) {
        setActiveLobbyId(user.lobbyId);
        // If player is in a lobby, we will let LobbyView fetch and verify the phase.
        // It will automatically trigger onGameStarted() if lobby.gameState !== 'LOBBY'.
      } else {
        setActiveLobbyId(null);
        setInGame(false);
      }
    } else {
      setActiveLobbyId(null);
      setInGame(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="spinner-large"></div>
        <span className="loading-text">Securing Briefing Channels...</span>
      </div>
    );
  }

  // Routing View Controller
  return (
    <div className="app-container">
      {!user ? (
        <AuthView />
      ) : !activeLobbyId ? (
        <DashboardView onJoinLobby={(id) => setActiveLobbyId(id)} />
      ) : !inGame ? (
        <LobbyView 
          lobbyId={activeLobbyId} 
          onLeaveLobby={() => setActiveLobbyId(null)} 
          onGameStarted={() => setInGame(true)} 
        />
      ) : (
        <GameView 
          lobbyId={activeLobbyId} 
          onGameReset={() => setInGame(false)} 
        />
      )}
    </div>
  );
}

export default App;
